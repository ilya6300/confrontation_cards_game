import { CampaignSpeakerId } from '../data/campaign';
import { sound } from './sound';

export type VoiceTone = 'resistance' | 'dark' | 'warning';
export type VoicePlaybackStatus = 'idle' | 'loading' | 'playing' | 'error';

export interface VoiceLineRequest {
  speaker: CampaignSpeakerId;
  text: string;
  tone?: VoiceTone;
}

const MAX_CLIENT_AUDIO_CACHE = 120;

function makeCacheKey(req: VoiceLineRequest): string {
  return `${req.speaker}|${req.tone ?? 'resistance'}|${req.text.trim()}`;
}

function base64ToArrayBuffer(base64: string): ArrayBuffer {
  const binaryStr = window.atob(base64);
  const len = binaryStr.length;
  const bytes = new Uint8Array(len);
  for (let i = 0; i < len; i++) {
    bytes[i] = binaryStr.charCodeAt(i);
  }
  return bytes.buffer;
}

class CampaignVoiceService {
  private audioCache = new Map<string, ArrayBuffer>();
  private inFlightFetches = new Map<string, Promise<ArrayBuffer>>();

  private activeSource: AudioBufferSourceNode | null = null;
  private activeHtmlAudio: HTMLAudioElement | null = null;
  private activeAbort: AbortController | null = null;
  private activeRequestId = 0;
  private activeKey: string | null = null;
  private activeStatusCallback:
    | ((status: VoicePlaybackStatus, error?: string) => void)
    | null = null;

  constructor() {
    // Immediately stop voice playback if user mutes master or disables voice channel
    sound.subscribe((settings) => {
      if ((settings.isMuted || !settings.voiceEnabled) && this.activeKey) {
        this.stop();
      }
    });
  }

  public getActiveKey(): string | null {
    return this.activeKey;
  }

  private setCache(key: string, buffer: ArrayBuffer): void {
    if (this.audioCache.has(key)) {
      this.audioCache.delete(key);
    } else if (this.audioCache.size >= MAX_CLIENT_AUDIO_CACHE) {
      const oldest = this.audioCache.keys().next().value;
      if (oldest !== undefined) {
        this.audioCache.delete(oldest);
      }
    }
    this.audioCache.set(key, buffer);
  }

  private async fetchAudioBytes(
    req: VoiceLineRequest,
    signal?: AbortSignal
  ): Promise<ArrayBuffer> {
    const key = makeCacheKey(req);
    const cached = this.audioCache.get(key);
    if (cached) {
      return cached;
    }

    const existingPromise = this.inFlightFetches.get(key);
    if (existingPromise) {
      return existingPromise;
    }

    const fetchPromise = (async () => {
      const response = await fetch('/api/tts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          speaker: req.speaker,
          text: req.text.trim(),
          tone: req.tone ?? 'resistance',
        }),
        signal,
      });

      const payload = (await response.json().catch(() => null)) as {
        audioBase64?: string;
        mimeType?: string;
        error?: string;
      } | null;

      if (!response.ok || !payload?.audioBase64) {
        throw new Error(
          payload?.error || `Ошибка синтеза речи (HTTP ${response.status})`
        );
      }

      const wavBytes = base64ToArrayBuffer(payload.audioBase64);
      this.setCache(key, wavBytes);
      return wavBytes;
    })().finally(() => {
      this.inFlightFetches.delete(key);
    });

    this.inFlightFetches.set(key, fetchPromise);
    return fetchPromise;
  }

  /**
   * Pre-warms the next campaign dialogue line in the background for seamless transitions.
   */
  public prefetch(req: VoiceLineRequest | null | undefined): void {
    if (!req || !req.text.trim()) return;
    const settings = sound.getSettings();
    if (settings.isMuted || !settings.voiceEnabled) return;

    const key = makeCacheKey(req);
    if (this.audioCache.has(key) || this.inFlightFetches.has(key)) return;

    void this.fetchAudioBytes(req).catch(() => {
      // Prefetch failures are silently ignored until line is actually played
    });
  }

  public stop(): void {
    this.activeRequestId += 1;

    if (this.activeAbort) {
      this.activeAbort.abort();
      this.activeAbort = null;
    }

    if (this.activeSource) {
      try {
        this.activeSource.onended = null;
        this.activeSource.stop();
        this.activeSource.disconnect();
      } catch {
        // already stopped
      }
      this.activeSource = null;
    }

    if (this.activeHtmlAudio) {
      try {
        this.activeHtmlAudio.pause();
        this.activeHtmlAudio.src = '';
      } catch {
        // ignore
      }
      this.activeHtmlAudio = null;
    }

    sound.setVoiceDucking(false);

    const prevCb = this.activeStatusCallback;
    this.activeStatusCallback = null;
    this.activeKey = null;
    prevCb?.('idle');
  }

  /**
   * Speaks a campaign dialogue line via server-side Gemini 3.8 TTS with character acoustic processing.
   */
  public async speak(
    req: VoiceLineRequest,
    onStateChange?: (status: VoicePlaybackStatus, error?: string) => void
  ): Promise<void> {
    this.stop();

    const trimmed = req.text.trim();
    if (!trimmed) return;

    const settings = sound.getSettings();
    if (settings.isMuted || !settings.voiceEnabled || settings.voiceVolume <= 0.005) {
      onStateChange?.('idle');
      return;
    }

    const requestId = this.activeRequestId;
    const key = makeCacheKey(req);
    this.activeKey = key;
    this.activeStatusCallback = onStateChange ?? null;

    const controller = new AbortController();
    this.activeAbort = controller;

    onStateChange?.('loading');

    try {
      const wavBytes = await this.fetchAudioBytes(req, controller.signal);
      if (this.activeRequestId !== requestId) return;

      const ctx = sound.getAudioContext();
      const voiceBus = sound.getVoiceOutputNode();

      if (ctx && voiceBus) {
        if (ctx.state === 'suspended') {
          await ctx.resume().catch(() => {});
        }
        if (this.activeRequestId !== requestId) return;

        // Decode a fresh copy because decodeAudioData detaches the passed ArrayBuffer
        const decoded = await ctx.decodeAudioData(wavBytes.slice(0));
        if (this.activeRequestId !== requestId) return;

        const source = ctx.createBufferSource();
        source.buffer = decoded;

        // Character-specific subtle spatial acoustic processing
        const reverb = sound.getReverbNode();
        if (req.speaker === 'officer') {
          // Crisp military tactical radio presence
          const hp = ctx.createBiquadFilter();
          hp.type = 'highpass';
          hp.frequency.setValueAtTime(165, ctx.currentTime);

          const presence = ctx.createBiquadFilter();
          presence.type = 'peaking';
          presence.frequency.setValueAtTime(2200, ctx.currentTime);
          presence.Q.setValueAtTime(1.1, ctx.currentTime);
          presence.gain.setValueAtTime(3.2, ctx.currentTime);

          source.connect(hp);
          hp.connect(presence);
          presence.connect(voiceBus);

          sound.playCommsBeep('open');
        } else if (req.speaker === 'vampire') {
          // Cold aristocratic chamber echo
          source.connect(voiceBus);
          if (reverb) {
            const revSend = ctx.createGain();
            revSend.gain.setValueAtTime(0.22, ctx.currentTime);
            source.connect(revSend);
            revSend.connect(reverb);
          }
        } else {
          // Demon: deep warm sub-presence + abyssal cavern reverb
          const lowBoost = ctx.createBiquadFilter();
          lowBoost.type = 'lowshelf';
          lowBoost.frequency.setValueAtTime(155, ctx.currentTime);
          lowBoost.gain.setValueAtTime(4.2, ctx.currentTime);

          source.connect(lowBoost);
          lowBoost.connect(voiceBus);
          if (reverb) {
            const revSend = ctx.createGain();
            revSend.gain.setValueAtTime(0.36, ctx.currentTime);
            lowBoost.connect(revSend);
            revSend.connect(reverb);
          }
        }

        this.activeSource = source;
        sound.setVoiceDucking(true);
        onStateChange?.('playing');

        source.onended = () => {
          if (this.activeRequestId !== requestId) return;
          this.activeSource = null;
          this.activeKey = null;
          sound.setVoiceDucking(false);
          if (req.speaker === 'officer') {
            sound.playCommsBeep('close');
          }
          onStateChange?.('idle');
        };

        source.start(0);
        return;
      }

      // Fallback HTMLAudio playback if Web Audio context is unavailable
      const blob = new Blob([wavBytes], { type: 'audio/wav' });
      const url = URL.createObjectURL(blob);
      const audio = new Audio(url);
      audio.volume = settings.voiceVolume;
      this.activeHtmlAudio = audio;
      sound.setVoiceDucking(true);
      onStateChange?.('playing');

      audio.onended = () => {
        URL.revokeObjectURL(url);
        if (this.activeRequestId !== requestId) return;
        this.activeHtmlAudio = null;
        this.activeKey = null;
        sound.setVoiceDucking(false);
        onStateChange?.('idle');
      };
      audio.onerror = () => {
        URL.revokeObjectURL(url);
        if (this.activeRequestId !== requestId) return;
        this.activeHtmlAudio = null;
        this.activeKey = null;
        sound.setVoiceDucking(false);
        onStateChange?.('error', 'Не удалось воспроизвести аудио озвучки.');
      };
      await audio.play();
    } catch (err: unknown) {
      if (controller.signal.aborted || this.activeRequestId !== requestId) {
        return;
      }
      this.activeKey = null;
      sound.setVoiceDucking(false);
      const msg =
        err instanceof Error && err.message
          ? err.message
          : 'Ошибка загрузки озвучки.';
      onStateChange?.('error', msg);
    }
  }
}

export const voiceService = new CampaignVoiceService();
export { makeCacheKey as getVoiceCacheKey };
