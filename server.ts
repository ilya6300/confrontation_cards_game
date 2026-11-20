import 'dotenv/config';
import express, { Request, Response } from 'express';
import path from 'path';
import { fileURLToPath } from 'url';
import { GoogleGenAI } from '@google/genai';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

type CampaignSpeaker = 'officer' | 'vampire' | 'demon';
type DialogueTone = 'resistance' | 'dark' | 'warning';

interface TtsCacheEntry {
  audioBase64: string;
  mimeType: string;
}

interface SpeakerVoiceProfile {
  voiceName: string;
  getStyle: (tone: DialogueTone) => string;
}

const SPEAKER_PROFILES: Record<CampaignSpeaker, SpeakerVoiceProfile> = {
  officer: {
    voiceName: 'Kore',
    getStyle: (tone) =>
      tone === 'warning'
        ? 'Urgent Russian military radio alert. Resolute female intelligence officer speaking crisply and intently over tactical comms with controlled tension and clear Russian articulation.'
        : 'Russian tactical military briefing. Confident, composed female intelligence officer speaking clearly with steady strategic authority and natural Russian cadence.',
  },
  vampire: {
    voiceName: 'Charon',
    getStyle: () =>
      'Cold, aristocratic, softly menacing Russian vampire lord. Low poised male voice, deliberate theatrical pacing, icy mockery and ancient dark elegance in natural Russian.',
  },
  demon: {
    voiceName: 'Fenrir',
    getStyle: () =>
      'Deep, booming, wrathful Russian abyssal demon warlord. Heavy intimidating bass voice, ominous slow cadence, dark fury and crushing authority in natural Russian.',
  },
};

const VALID_SPEAKERS = new Set<string>(['officer', 'vampire', 'demon']);
const VALID_TONES = new Set<string>(['resistance', 'dark', 'warning']);

const MAX_CACHE_ENTRIES = 120;
const ttsCache = new Map<string, TtsCacheEntry>();
const inFlightTts = new Map<string, Promise<TtsCacheEntry>>();

function getCache(key: string): TtsCacheEntry | undefined {
  const entry = ttsCache.get(key);
  if (!entry) return undefined;
  // Refresh LRU recency
  ttsCache.delete(key);
  ttsCache.set(key, entry);
  return entry;
}

function setCache(key: string, entry: TtsCacheEntry): void {
  if (ttsCache.has(key)) {
    ttsCache.delete(key);
  } else if (ttsCache.size >= MAX_CACHE_ENTRIES) {
    const oldestKey = ttsCache.keys().next().value;
    if (oldestKey !== undefined) {
      ttsCache.delete(oldestKey);
    }
  }
  ttsCache.set(key, entry);
}

let cachedAiClient: GoogleGenAI | null = null;
let cachedApiKey: string | undefined;

function getAiClient(): GoogleGenAI {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey || apiKey === 'MY_GEMINI_API_KEY') {
    const err = new Error(
      'Сервер озвучки не настроен: отсутствует ключ GEMINI_API_KEY.'
    ) as Error & { status?: number };
    err.status = 503;
    throw err;
  }
  if (!cachedAiClient || cachedApiKey !== apiKey) {
    cachedAiClient = new GoogleGenAI({
      apiKey,
      apiVersion: 'v1beta',
      httpOptions: {
        headers: {
          'User-Agent': 'aistudio-build',
        },
      },
    });
    cachedApiKey = apiKey;
  }
  return cachedAiClient;
}

/**
 * Wraps headerless 24kHz mono 16-bit LE PCM in a standard 44-byte RIFF/WAVE header.
 * Only used if the API ever returns raw PCM instead of unary WAV.
 */
function wrapPcmAsWav(pcmBuffer: Buffer, sampleRate = 24000): Buffer {
  const numChannels = 1;
  const bitsPerSample = 16;
  const byteRate = sampleRate * numChannels * (bitsPerSample / 8);
  const blockAlign = numChannels * (bitsPerSample / 8);
  const dataSize = pcmBuffer.length;

  const header = Buffer.alloc(44);
  header.write('RIFF', 0, 'ascii');
  header.writeUInt32LE(36 + dataSize, 4);
  header.write('WAVE', 8, 'ascii');
  header.write('fmt ', 12, 'ascii');
  header.writeUInt32LE(16, 16); // PCM chunk size
  header.writeUInt16LE(1, 20); // PCM format
  header.writeUInt16LE(numChannels, 22);
  header.writeUInt32LE(sampleRate, 24);
  header.writeUInt32LE(byteRate, 28);
  header.writeUInt16LE(blockAlign, 32);
  header.writeUInt16LE(bitsPerSample, 34);
  header.write('data', 36, 'ascii');
  header.writeUInt32LE(dataSize, 40);

  return Buffer.concat([header, pcmBuffer]);
}

function isRetryableError(err: unknown): boolean {
  const status =
    typeof err === 'object' && err !== null && 'status' in err
      ? Number((err as { status?: unknown }).status)
      : NaN;
  if (status === 429 || (status >= 500 && status <= 599)) {
    return true;
  }
  const msg = err instanceof Error ? err.message.toLowerCase() : '';
  return (
    msg.includes('503') ||
    msg.includes('unavailable') ||
    msg.includes('timeout') ||
    msg.includes('econnreset')
  );
}

async function synthesizeSpeech(
  text: string,
  speaker: CampaignSpeaker,
  tone: DialogueTone
): Promise<TtsCacheEntry> {
  const ai = getAiClient();
  const profile = SPEAKER_PROFILES[speaker];
  const style = profile.getStyle(tone);

  let lastError: unknown;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const response = await ai.models.generateContent({
        model: 'gemini-3.8-flash-lite-tts',
        contents: [
          {
            role: 'user',
            parts: [
              {
                text,
                speechMetadata: {
                  style,
                },
              },
            ],
          },
        ],
        config: {
          responseModalities: ['AUDIO'],
          speechConfig: {
            voiceConfig: {
              prebuiltVoiceConfig: {
                voiceName: profile.voiceName,
              },
            },
          },
        },
      });

      const inlineData =
        response.candidates?.[0]?.content?.parts?.[0]?.inlineData;
      const base64Audio = inlineData?.data;

      if (!base64Audio) {
        throw new Error('Модель синтеза речи не вернула аудиоданные.');
      }

      const rawBytes = Buffer.from(base64Audio, 'base64');
      const incomingMime = (inlineData?.mimeType || '').toLowerCase();

      // Unary Gemini 3.8 TTS returns a complete RIFF WAV file directly.
      // Only wrap with a WAV header if the payload is raw headerless PCM.
      const hasRiffHeader =
        rawBytes.length >= 4 && rawBytes.subarray(0, 4).toString('ascii') === 'RIFF';

      if (hasRiffHeader) {
        return {
          audioBase64: base64Audio,
          mimeType: 'audio/wav',
        };
      }

      if (incomingMime.includes('l16') || incomingMime.includes('pcm')) {
        const wavBuffer = wrapPcmAsWav(rawBytes, 24000);
        return {
          audioBase64: wavBuffer.toString('base64'),
          mimeType: 'audio/wav',
        };
      }

      return {
        audioBase64: base64Audio,
        mimeType: incomingMime || 'audio/wav',
      };
    } catch (err) {
      lastError = err;
      if (attempt === 0 && isRetryableError(err)) {
        await new Promise((resolve) => setTimeout(resolve, 650));
        continue;
      }
      throw err;
    }
  }

  throw lastError;
}

async function startServer(): Promise<void> {
  const app = express();
  app.use(express.json({ limit: '128kb' }));

  // Campaign dialogue & briefing speech synthesis endpoint (server-side Gemini TTS)
  app.post('/api/tts', async (req: Request, res: Response) => {
    try {
      const rawText = typeof req.body?.text === 'string' ? req.body.text.trim() : '';
      const rawSpeaker =
        typeof req.body?.speaker === 'string' ? req.body.speaker.trim() : 'officer';
      const rawTone =
        typeof req.body?.tone === 'string' ? req.body.tone.trim() : 'resistance';

      if (!rawText) {
        res.status(400).json({ error: 'Текст для озвучки не может быть пустым.' });
        return;
      }

      if (rawText.length > 1000) {
        res.status(400).json({ error: 'Реплика слишком длинная для озвучки.' });
        return;
      }

      const speaker: CampaignSpeaker = VALID_SPEAKERS.has(rawSpeaker)
        ? (rawSpeaker as CampaignSpeaker)
        : 'officer';
      const tone: DialogueTone = VALID_TONES.has(rawTone)
        ? (rawTone as DialogueTone)
        : 'resistance';

      const cacheKey = `${speaker}|${tone}|${rawText}`;
      const cached = getCache(cacheKey);
      if (cached) {
        res.json({
          audioBase64: cached.audioBase64,
          mimeType: cached.mimeType,
          cached: true,
        });
        return;
      }

      let pending = inFlightTts.get(cacheKey);
      if (!pending) {
        pending = synthesizeSpeech(rawText, speaker, tone)
          .then((result) => {
            setCache(cacheKey, result);
            return result;
          })
          .finally(() => {
            inFlightTts.delete(cacheKey);
          });
        inFlightTts.set(cacheKey, pending);
      }

      const result = await pending;
      res.json({
        audioBase64: result.audioBase64,
        mimeType: result.mimeType,
        cached: false,
      });
    } catch (err: unknown) {
      const status =
        typeof err === 'object' && err !== null && 'status' in err
          ? Number((err as { status?: unknown }).status)
          : 500;
      const safeStatus =
        Number.isInteger(status) && status >= 400 && status <= 599 ? status : 500;
      const message =
        err instanceof Error && err.message
          ? err.message
          : 'Не удалось озвучить реплику. Попробуйте повторить.';

      console.error('[TTS API error]', safeStatus, message);
      res.status(safeStatus).json({ error: message });
    }
  });

  app.get('/api/health', (_req: Request, res: Response) => {
    res.json({ ok: true });
  });

  const isProduction = process.env.NODE_ENV === 'production';

  if (!isProduction) {
    const { createServer: createViteServer } = await import('vite');
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distDir = path.resolve(__dirname, 'dist');
    app.use(express.static(distDir));
    app.get('*', (_req: Request, res: Response) => {
      res.sendFile(path.join(distDir, 'index.html'));
    });
  }

  const port = Number(process.env.PORT) || 3000;
  app.listen(port, '0.0.0.0', () => {
    console.log(`Server listening on http://0.0.0.0:${port}`);
  });
}

startServer().catch((err) => {
  console.error('Failed to start server:', err);
  process.exit(1);
});
