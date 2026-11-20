// Atmospheric Adaptive Web Audio Engine & Tactical Combat SFX Synthesizer

export type AmbientScene =
  | 'menu'
  | 'campaign_map'
  | 'cutscene'
  | 'battle_prep'
  | 'battle_combat'
  | 'battle_intense';

export type CombatArchetype =
  | 'sniper_tracer'
  | 'lightning'
  | 'toxic'
  | 'artillery'
  | 'shield_dome'
  | 'holy_purge'
  | 'arcane_ritual'
  | 'melee_strike';

export type CombatStatusSoundKind =
  | 'destroy'
  | 'reduce_rank'
  | 'cancel'
  | 'disable'
  | 'protect'
  | 'revive'
  | 'evacuate';

export interface AudioSettings {
  isMuted: boolean;
  musicEnabled: boolean;
  sfxEnabled: boolean;
  voiceEnabled: boolean;
  musicVolume: number;
  sfxVolume: number;
  voiceVolume: number;
}

const AUDIO_STORAGE_KEY = 'card_game_audio_settings_v1';

const DEFAULT_AUDIO_SETTINGS: AudioSettings = {
  isMuted: false,
  musicEnabled: true,
  sfxEnabled: true,
  voiceEnabled: true,
  musicVolume: 0.62,
  sfxVolume: 0.85,
  voiceVolume: 0.95,
};

function clamp01(val: number): number {
  if (!Number.isFinite(val)) return 0.5;
  return Math.max(0, Math.min(1, val));
}

function loadAudioSettings(): AudioSettings {
  try {
    const raw = localStorage.getItem(AUDIO_STORAGE_KEY);
    if (!raw) return { ...DEFAULT_AUDIO_SETTINGS };
    const parsed = JSON.parse(raw) as Partial<AudioSettings>;
    return {
      isMuted: typeof parsed.isMuted === 'boolean' ? parsed.isMuted : DEFAULT_AUDIO_SETTINGS.isMuted,
      musicEnabled:
        typeof parsed.musicEnabled === 'boolean'
          ? parsed.musicEnabled
          : DEFAULT_AUDIO_SETTINGS.musicEnabled,
      sfxEnabled:
        typeof parsed.sfxEnabled === 'boolean'
          ? parsed.sfxEnabled
          : DEFAULT_AUDIO_SETTINGS.sfxEnabled,
      voiceEnabled:
        typeof parsed.voiceEnabled === 'boolean'
          ? parsed.voiceEnabled
          : DEFAULT_AUDIO_SETTINGS.voiceEnabled,
      musicVolume:
        typeof parsed.musicVolume === 'number'
          ? clamp01(parsed.musicVolume)
          : DEFAULT_AUDIO_SETTINGS.musicVolume,
      sfxVolume:
        typeof parsed.sfxVolume === 'number'
          ? clamp01(parsed.sfxVolume)
          : DEFAULT_AUDIO_SETTINGS.sfxVolume,
      voiceVolume:
        typeof parsed.voiceVolume === 'number'
          ? clamp01(parsed.voiceVolume)
          : DEFAULT_AUDIO_SETTINGS.voiceVolume,
    };
  } catch {
    return { ...DEFAULT_AUDIO_SETTINGS };
  }
}

function saveAudioSettings(settings: AudioSettings): void {
  try {
    localStorage.setItem(AUDIO_STORAGE_KEY, JSON.stringify(settings));
  } catch {
    // ignore storage errors
  }
}

// D-minor / Phrygian dark cinematic chord voicings (Hz)
const DARK_PAD_CHORDS: number[][] = [
  [73.42, 110.0, 174.61, 220.0], // Dm (D2 A2 F3 A3)
  [58.27, 116.54, 174.61, 220.0], // Bbmaj7 (Bb1 Bb2 F3 A3)
  [65.41, 130.81, 155.56, 196.0], // Cm / G-tension
  [55.0, 110.0, 164.81, 185.0], // A7sus/Phrygian dark pull
];

const BATTLE_BASS_PATTERN = [
  73.42, // D2
  73.42,
  77.78, // Eb2 (Phrygian dark tension)
  73.42,
  87.31, // F2
  73.42,
  65.41, // C2
  55.0, // A1
];

type SettingsListener = (settings: AudioSettings) => void;

class AtmosphericSoundEngine {
  private ctx: AudioContext | null = null;
  private masterGain: GainNode | null = null;
  private compressor: DynamicsCompressorNode | null = null;
  private musicBus: GainNode | null = null;
  private musicDuckGain: GainNode | null = null;
  private sfxBus: GainNode | null = null;
  private voiceBus: GainNode | null = null;
  private reverbNode: ConvolverNode | null = null;
  private reverbReturnGain: GainNode | null = null;

  private whiteNoiseBuffer: AudioBuffer | null = null;
  private pinkNoiseBuffer: AudioBuffer | null = null;

  // Continuous ambient bed nodes
  private ambientActive = false;
  private droneOsc1: OscillatorNode | null = null;
  private droneOsc2: OscillatorNode | null = null;
  private droneFilter: BiquadFilterNode | null = null;
  private droneLfo: OscillatorNode | null = null;
  private droneGain: GainNode | null = null;
  private windSource: AudioBufferSourceNode | null = null;
  private windFilter: BiquadFilterNode | null = null;
  private windLfo: OscillatorNode | null = null;
  private windGain: GainNode | null = null;

  private schedulerTimer: ReturnType<typeof setInterval> | null = null;
  private stepCount = 0;
  private lastPadTime = 0;
  private lastAccentTime = 0;
  private lastHoverTime = 0;

  private currentScene: AmbientScene = 'menu';
  private isVoiceDucked = false;
  private settings: AudioSettings = loadAudioSettings();
  private listeners = new Set<SettingsListener>();
  private unlockBound = false;

  constructor() {
    this.bindFirstGestureUnlock();
  }

  private bindFirstGestureUnlock(): void {
    if (typeof window === 'undefined' || this.unlockBound) return;
    this.unlockBound = true;

    const unlock = () => {
      const ctx = this.ensureContext();
      if (ctx) {
        if (ctx.state === 'suspended') {
          ctx.resume().then(() => {
            this.syncAmbientPlayback();
          }).catch(() => {});
        } else {
          this.syncAmbientPlayback();
        }
      }
      window.removeEventListener('pointerdown', unlock, true);
      window.removeEventListener('keydown', unlock, true);
    };

    window.addEventListener('pointerdown', unlock, true);
    window.addEventListener('keydown', unlock, true);
  }

  private createNoiseBuffers(ctx: AudioContext): void {
    const sampleRate = ctx.sampleRate;
    const length = sampleRate * 2;

    // White noise buffer
    const white = ctx.createBuffer(1, length, sampleRate);
    const whiteData = white.getChannelData(0);
    for (let i = 0; i < length; i++) {
      whiteData[i] = Math.random() * 2 - 1;
    }
    this.whiteNoiseBuffer = white;

    // Stereo pink-ish noise buffer (Paul Kellet filter) for warm atmospheric wind & thunder
    const pink = ctx.createBuffer(2, length, sampleRate);
    for (let ch = 0; ch < 2; ch++) {
      const data = pink.getChannelData(ch);
      let b0 = 0;
      let b1 = 0;
      let b2 = 0;
      let b3 = 0;
      let b4 = 0;
      let b5 = 0;
      let b6 = 0;
      for (let i = 0; i < length; i++) {
        const w = Math.random() * 2 - 1;
        b0 = 0.99886 * b0 + w * 0.0555179;
        b1 = 0.99332 * b1 + w * 0.0750759;
        b2 = 0.969 * b2 + w * 0.153852;
        b3 = 0.8665 * b3 + w * 0.3104856;
        b4 = 0.55 * b4 + w * 0.5329522;
        b5 = -0.7616 * b5 - w * 0.016898;
        data[i] = (b0 + b1 + b2 + b3 + b4 + b5 + b6 + w * 0.5362) * 0.11;
        b6 = w * 0.115926;
      }
    }
    this.pinkNoiseBuffer = pink;
  }

  private createReverbImpulse(ctx: AudioContext): AudioBuffer {
    const sampleRate = ctx.sampleRate;
    const duration = 2.05;
    const length = Math.floor(sampleRate * duration);
    const impulse = ctx.createBuffer(2, length, sampleRate);

    for (let ch = 0; ch < 2; ch++) {
      const channelData = impulse.getChannelData(ch);
      let prev = 0;
      for (let i = 0; i < length; i++) {
        const t = i / length;
        // Dark industrial cavern decay curve (steeper high-frequency rolloff)
        const env = Math.pow(1 - t, 2.75);
        const raw = (Math.random() * 2 - 1) * env;
        prev = prev * 0.62 + raw * 0.38;
        channelData[i] = prev * 0.85;
      }
    }
    return impulse;
  }

  private ensureContext(): AudioContext | null {
    if (typeof window === 'undefined') return null;

    if (!this.ctx) {
      const AudioCtx =
        window.AudioContext ||
        (window as unknown as { webkitAudioContext: typeof AudioContext }).webkitAudioContext;
      if (!AudioCtx) return null;

      try {
        const ctx = new AudioCtx();
        this.ctx = ctx;

        // Master output limiter/compressor so stacked explosions & chords stay clean
        const compressor = ctx.createDynamicsCompressor();
        compressor.threshold.setValueAtTime(-14, ctx.currentTime);
        compressor.knee.setValueAtTime(18, ctx.currentTime);
        compressor.ratio.setValueAtTime(6, ctx.currentTime);
        compressor.attack.setValueAtTime(0.004, ctx.currentTime);
        compressor.release.setValueAtTime(0.22, ctx.currentTime);

        const master = ctx.createGain();
        master.gain.setValueAtTime(this.settings.isMuted ? 0 : 0.92, ctx.currentTime);

        const musicBus = ctx.createGain();
        musicBus.gain.setValueAtTime(
          this.settings.musicEnabled ? this.settings.musicVolume * 0.56 : 0,
          ctx.currentTime
        );

        const musicDuck = ctx.createGain();
        musicDuck.gain.setValueAtTime(this.isVoiceDucked ? 0.24 : 1, ctx.currentTime);

        const sfxBus = ctx.createGain();
        sfxBus.gain.setValueAtTime(
          this.settings.sfxEnabled ? this.settings.sfxVolume * 0.88 : 0,
          ctx.currentTime
        );

        const voiceBus = ctx.createGain();
        voiceBus.gain.setValueAtTime(
          this.settings.voiceEnabled ? this.settings.voiceVolume : 0,
          ctx.currentTime
        );

        const reverb = ctx.createConvolver();
        reverb.buffer = this.createReverbImpulse(ctx);
        const reverbReturn = ctx.createGain();
        reverbReturn.gain.setValueAtTime(0.42, ctx.currentTime);

        musicBus.connect(musicDuck);
        musicDuck.connect(master);
        sfxBus.connect(master);
        voiceBus.connect(master);
        reverb.connect(reverbReturn);
        reverbReturn.connect(master);

        master.connect(compressor);
        compressor.connect(ctx.destination);

        this.compressor = compressor;
        this.masterGain = master;
        this.musicBus = musicBus;
        this.musicDuckGain = musicDuck;
        this.sfxBus = sfxBus;
        this.voiceBus = voiceBus;
        this.reverbNode = reverb;
        this.reverbReturnGain = reverbReturn;

        this.createNoiseBuffers(ctx);
      } catch {
        return null;
      }
    }

    if (this.ctx.state === 'suspended') {
      this.ctx.resume().catch(() => {});
    }

    return this.ctx;
  }

  public getAudioContext(): AudioContext | null {
    return this.ensureContext();
  }

  public getVoiceOutputNode(): GainNode | null {
    this.ensureContext();
    return this.voiceBus;
  }

  public getReverbNode(): ConvolverNode | null {
    this.ensureContext();
    return this.reverbNode;
  }

  public getSettings(): AudioSettings {
    return { ...this.settings };
  }

  public subscribe(listener: SettingsListener): () => void {
    this.listeners.add(listener);
    listener(this.getSettings());
    return () => {
      this.listeners.delete(listener);
    };
  }

  private emitSettings(): void {
    const snap = this.getSettings();
    saveAudioSettings(snap);
    this.applyGainLevels();
    this.syncAmbientPlayback();
    this.listeners.forEach((fn) => fn(snap));
  }

  private applyGainLevels(): void {
    if (!this.ctx) return;
    const now = this.ctx.currentTime;
    if (this.masterGain) {
      this.masterGain.gain.setTargetAtTime(this.settings.isMuted ? 0 : 0.92, now, 0.04);
    }
    if (this.musicBus) {
      const targetMusic = this.settings.musicEnabled ? this.settings.musicVolume * 0.56 : 0;
      this.musicBus.gain.setTargetAtTime(targetMusic, now, 0.14);
    }
    if (this.sfxBus) {
      const targetSfx = this.settings.sfxEnabled ? this.settings.sfxVolume * 0.88 : 0;
      this.sfxBus.gain.setTargetAtTime(targetSfx, now, 0.03);
    }
    if (this.voiceBus) {
      const targetVoice = this.settings.voiceEnabled ? this.settings.voiceVolume : 0;
      this.voiceBus.gain.setTargetAtTime(targetVoice, now, 0.03);
    }
  }

  public updateSettings(patch: Partial<AudioSettings>): AudioSettings {
    this.ensureContext();
    this.settings = {
      ...this.settings,
      ...patch,
      musicVolume:
        patch.musicVolume !== undefined ? clamp01(patch.musicVolume) : this.settings.musicVolume,
      sfxVolume:
        patch.sfxVolume !== undefined ? clamp01(patch.sfxVolume) : this.settings.sfxVolume,
      voiceVolume:
        patch.voiceVolume !== undefined ? clamp01(patch.voiceVolume) : this.settings.voiceVolume,
    };
    this.emitSettings();
    return this.getSettings();
  }

  public toggleMute(): boolean {
    this.updateSettings({ isMuted: !this.settings.isMuted });
    return this.settings.isMuted;
  }

  public getMuted(): boolean {
    return this.settings.isMuted;
  }

  /**
   * Smoothly ducks ambient soundtrack while campaign voice acting speaks.
   */
  public setVoiceDucking(ducked: boolean): void {
    this.isVoiceDucked = ducked;
    if (!this.ctx || !this.musicDuckGain) return;
    const now = this.ctx.currentTime;
    this.musicDuckGain.gain.setTargetAtTime(ducked ? 0.24 : 1.0, now, ducked ? 0.16 : 0.48);
  }

  /**
   * Switches the adaptive ambient soundtrack scene with smooth filter & rhythmic transitions.
   */
  public setScene(scene: AmbientScene): void {
    if (this.currentScene === scene) return;
    this.currentScene = scene;
    this.stepCount = 0;

    if (this.ctx && this.ambientActive) {
      this.applySceneBedTuning();
      this.restartSceneScheduler();
    }
  }

  private applySceneBedTuning(): void {
    if (!this.ctx || !this.droneGain || !this.droneFilter || !this.windGain || !this.windFilter) {
      return;
    }
    const now = this.ctx.currentTime;

    switch (this.currentScene) {
      case 'menu':
        this.droneGain.gain.setTargetAtTime(0.28, now, 0.65);
        this.droneFilter.frequency.setTargetAtTime(165, now, 0.65);
        this.windGain.gain.setTargetAtTime(0.16, now, 0.65);
        this.windFilter.frequency.setTargetAtTime(340, now, 0.65);
        break;
      case 'campaign_map':
        this.droneGain.gain.setTargetAtTime(0.24, now, 0.6);
        this.droneFilter.frequency.setTargetAtTime(140, now, 0.6);
        this.windGain.gain.setTargetAtTime(0.11, now, 0.6);
        this.windFilter.frequency.setTargetAtTime(480, now, 0.6);
        break;
      case 'cutscene':
        this.droneGain.gain.setTargetAtTime(0.22, now, 0.45);
        this.droneFilter.frequency.setTargetAtTime(125, now, 0.45);
        this.windGain.gain.setTargetAtTime(0.08, now, 0.45);
        this.windFilter.frequency.setTargetAtTime(260, now, 0.45);
        break;
      case 'battle_prep':
        this.droneGain.gain.setTargetAtTime(0.26, now, 0.45);
        this.droneFilter.frequency.setTargetAtTime(175, now, 0.45);
        this.windGain.gain.setTargetAtTime(0.13, now, 0.45);
        this.windFilter.frequency.setTargetAtTime(400, now, 0.45);
        break;
      case 'battle_combat':
        this.droneGain.gain.setTargetAtTime(0.3, now, 0.35);
        this.droneFilter.frequency.setTargetAtTime(235, now, 0.35);
        this.windGain.gain.setTargetAtTime(0.14, now, 0.35);
        this.windFilter.frequency.setTargetAtTime(520, now, 0.35);
        break;
      case 'battle_intense':
        this.droneGain.gain.setTargetAtTime(0.34, now, 0.3);
        this.droneFilter.frequency.setTargetAtTime(300, now, 0.3);
        this.windGain.gain.setTargetAtTime(0.18, now, 0.3);
        this.windFilter.frequency.setTargetAtTime(640, now, 0.3);
        break;
    }
  }

  private syncAmbientPlayback(): void {
    const shouldPlay =
      !this.settings.isMuted &&
      this.settings.musicEnabled &&
      this.settings.musicVolume > 0.005 &&
      this.ctx !== null &&
      this.ctx.state === 'running';

    if (shouldPlay && !this.ambientActive) {
      this.startAmbientBed();
    } else if (!shouldPlay && this.ambientActive) {
      this.stopAmbientBed();
    }
  }

  private startAmbientBed(): void {
    if (!this.ctx || !this.musicBus || !this.pinkNoiseBuffer || this.ambientActive) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    // 1. Sub-rift foundation drone (D1 + A1 detuned low-pass oscillators)
    const droneFilter = ctx.createBiquadFilter();
    droneFilter.type = 'lowpass';
    droneFilter.frequency.setValueAtTime(160, now);
    droneFilter.Q.setValueAtTime(2.4, now);

    const droneGain = ctx.createGain();
    droneGain.gain.setValueAtTime(0.0001, now);

    const osc1 = ctx.createOscillator();
    osc1.type = 'sawtooth';
    osc1.frequency.setValueAtTime(36.71, now); // D1
    const osc1SubGain = ctx.createGain();
    osc1SubGain.gain.setValueAtTime(0.55, now);

    const osc2 = ctx.createOscillator();
    osc2.type = 'triangle';
    osc2.frequency.setValueAtTime(55.12, now); // A1 subtly detuned
    const osc2SubGain = ctx.createGain();
    osc2SubGain.gain.setValueAtTime(0.45, now);

    const droneLfo = ctx.createOscillator();
    droneLfo.type = 'sine';
    droneLfo.frequency.setValueAtTime(0.065, now);
    const droneLfoGain = ctx.createGain();
    droneLfoGain.gain.setValueAtTime(48, now);
    droneLfo.connect(droneLfoGain);
    droneLfoGain.connect(droneFilter.frequency);

    osc1.connect(osc1SubGain);
    osc2.connect(osc2SubGain);
    osc1SubGain.connect(droneFilter);
    osc2SubGain.connect(droneFilter);
    droneFilter.connect(droneGain);
    droneGain.connect(this.musicBus);

    // 2. Continuous stereo atmospheric warzone wind / dimensional haze
    const windSource = ctx.createBufferSource();
    windSource.buffer = this.pinkNoiseBuffer;
    windSource.loop = true;

    const windFilter = ctx.createBiquadFilter();
    windFilter.type = 'bandpass';
    windFilter.frequency.setValueAtTime(360, now);
    windFilter.Q.setValueAtTime(1.15, now);

    const windLfo = ctx.createOscillator();
    windLfo.type = 'sine';
    windLfo.frequency.setValueAtTime(0.09, now);
    const windLfoGain = ctx.createGain();
    windLfoGain.gain.setValueAtTime(155, now);
    windLfo.connect(windLfoGain);
    windLfoGain.connect(windFilter.frequency);

    const windGain = ctx.createGain();
    windGain.gain.setValueAtTime(0.0001, now);

    windSource.connect(windFilter);
    windFilter.connect(windGain);
    windGain.connect(this.musicBus);
    if (this.reverbNode) {
      const windRevSend = ctx.createGain();
      windRevSend.gain.setValueAtTime(0.25, now);
      windGain.connect(windRevSend);
      windRevSend.connect(this.reverbNode);
    }

    osc1.start(now);
    osc2.start(now);
    droneLfo.start(now);
    windSource.start(now);
    windLfo.start(now);

    this.droneOsc1 = osc1;
    this.droneOsc2 = osc2;
    this.droneFilter = droneFilter;
    this.droneLfo = droneLfo;
    this.droneGain = droneGain;
    this.windSource = windSource;
    this.windFilter = windFilter;
    this.windLfo = windLfo;
    this.windGain = windGain;
    this.ambientActive = true;
    this.lastPadTime = 0;
    this.lastAccentTime = now;

    this.applySceneBedTuning();
    this.restartSceneScheduler();
  }

  private stopAmbientBed(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }

    const safeStop = (node: AudioScheduledSourceNode | null) => {
      if (!node) return;
      try {
        node.stop();
        node.disconnect();
      } catch {
        // already stopped
      }
    };

    safeStop(this.droneOsc1);
    safeStop(this.droneOsc2);
    safeStop(this.droneLfo);
    safeStop(this.windSource);
    safeStop(this.windLfo);

    this.droneOsc1 = null;
    this.droneOsc2 = null;
    this.droneFilter = null;
    this.droneLfo = null;
    this.droneGain = null;
    this.windSource = null;
    this.windFilter = null;
    this.windLfo = null;
    this.windGain = null;
    this.ambientActive = false;
  }

  private restartSceneScheduler(): void {
    if (this.schedulerTimer) {
      clearInterval(this.schedulerTimer);
      this.schedulerTimer = null;
    }
    if (!this.ambientActive) return;

    const tickMs =
      this.currentScene === 'battle_intense'
        ? 258
        : this.currentScene === 'battle_combat'
        ? 305
        : this.currentScene === 'battle_prep'
        ? 350
        : 650;

    // Trigger an initial dark pad immediately if quiet
    this.onAmbientTick();
    this.schedulerTimer = setInterval(() => this.onAmbientTick(), tickMs);
  }

  private onAmbientTick(): void {
    if (
      !this.ctx ||
      !this.musicBus ||
      !this.ambientActive ||
      this.settings.isMuted ||
      !this.settings.musicEnabled
    ) {
      return;
    }

    const ctx = this.ctx;
    const now = ctx.currentTime;
    const step = this.stepCount++;

    // Evolving dark orchestral-industrial pad chords across all scenes
    const padInterval =
      this.currentScene === 'cutscene'
        ? 7.2
        : this.currentScene === 'battle_intense'
        ? 4.6
        : 6.0;

    if (now - this.lastPadTime >= padInterval) {
      this.lastPadTime = now;
      const chordIdx = Math.floor(now / padInterval) % DARK_PAD_CHORDS.length;
      const chord = DARK_PAD_CHORDS[chordIdx];
      const padGain =
        this.currentScene === 'cutscene'
          ? 0.075
          : this.currentScene === 'menu'
          ? 0.115
          : 0.095;
      this.playAmbientPadChord(chord, padInterval + 1.4, padGain);
    }

    // Scene-specific rhythmic & atmospheric motifs
    if (this.currentScene === 'menu') {
      if (now - this.lastAccentTime >= 9.5) {
        this.lastAccentTime = now;
        this.playDistantSteelChime(step % 2 === 0 ? 587.33 : 659.25); // D5 / E5
      }
    } else if (this.currentScene === 'campaign_map') {
      if (now - this.lastAccentTime >= 4.8) {
        this.lastAccentTime = now;
        this.playTacticalSonarPing();
      }
    } else if (this.currentScene === 'battle_prep') {
      // Tactical heartbeat double-thump + clockwork pulse
      const beat = step % 8;
      if (beat === 0 || beat === 1) {
        this.playWarDrumKick(beat === 0 ? 0.24 : 0.14, beat === 0 ? 58 : 48);
      }
      if (beat === 4) {
        this.playIndustrialTick(0.055, 1650);
      }
    } else if (this.currentScene === 'battle_combat') {
      const beat = step % 8;
      if (beat === 0 || beat === 3 || beat === 4) {
        this.playWarDrumKick(beat === 0 ? 0.34 : 0.22, 62);
      }
      if (beat === 2 || beat === 6) {
        this.playMetallicSnare(0.11);
      }
      if (beat % 2 === 1) {
        this.playIndustrialTick(0.045, 2200);
      }
      this.playOstinatoBass(BATTLE_BASS_PATTERN[beat], 0.24, 0.13);
    } else if (this.currentScene === 'battle_intense') {
      const beat = step % 8;
      if (beat === 0 || beat === 2 || beat === 3 || beat === 5) {
        this.playWarDrumKick(beat === 0 ? 0.42 : 0.28, 66);
      }
      if (beat === 2 || beat === 6 || beat === 7) {
        this.playMetallicSnare(beat === 7 ? 0.08 : 0.16);
      }
      this.playIndustrialTick(beat % 2 === 0 ? 0.07 : 0.04, beat % 2 === 0 ? 2900 : 2100);
      this.playOstinatoBass(BATTLE_BASS_PATTERN[beat], 0.21, 0.18);
    }
  }

  private playAmbientPadChord(freqs: number[], duration: number, level: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(520, now);
    filter.frequency.linearRampToValueAtTime(840, now + duration * 0.45);
    filter.frequency.linearRampToValueAtTime(420, now + duration);

    const env = ctx.createGain();
    env.gain.setValueAtTime(0.0001, now);
    env.gain.linearRampToValueAtTime(level, now + duration * 0.32);
    env.gain.setValueAtTime(level * 0.85, now + duration * 0.68);
    env.gain.exponentialRampToValueAtTime(0.0001, now + duration);

    filter.connect(env);
    env.connect(this.musicBus);
    if (this.reverbNode) {
      const revSend = ctx.createGain();
      revSend.gain.setValueAtTime(0.45, now);
      env.connect(revSend);
      revSend.connect(this.reverbNode);
    }

    freqs.forEach((f, idx) => {
      const osc = ctx.createOscillator();
      osc.type = idx === 0 ? 'triangle' : 'sawtooth';
      osc.frequency.setValueAtTime(f, now);
      osc.detune.setValueAtTime((idx % 2 === 0 ? -1 : 1) * (4 + idx * 2), now);
      const voiceGain = ctx.createGain();
      voiceGain.gain.setValueAtTime(idx === 0 ? 0.34 : 0.16, now);
      osc.connect(voiceGain);
      voiceGain.connect(filter);
      osc.start(now);
      osc.stop(now + duration + 0.08);
    });
  }

  private playDistantSteelChime(freq: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    [1, 2.756].forEach((ratio, idx) => {
      const osc = ctx.createOscillator();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(freq * ratio, now);
      const g = ctx.createGain();
      g.gain.setValueAtTime(0.0001, now);
      g.gain.linearRampToValueAtTime(idx === 0 ? 0.055 : 0.02, now + 0.03);
      g.gain.exponentialRampToValueAtTime(0.0001, now + (idx === 0 ? 3.2 : 1.5));
      osc.connect(g);
      g.connect(this.musicBus!);
      if (this.reverbNode) {
        g.connect(this.reverbNode);
      }
      osc.start(now);
      osc.stop(now + 3.4);
    });
  }

  private playTacticalSonarPing(): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(1174.66, now); // D6 tactical ping

    const filter = ctx.createBiquadFilter();
    filter.type = 'bandpass';
    filter.frequency.setValueAtTime(1175, now);
    filter.Q.setValueAtTime(8, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(0.055, now + 0.012);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.65);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    if (this.reverbNode) {
      const revSend = ctx.createGain();
      revSend.gain.setValueAtTime(0.6, now);
      g.connect(revSend);
      revSend.connect(this.reverbNode);
    }

    osc.start(now);
    osc.stop(now + 0.7);
  }

  private playWarDrumKick(gainLevel: number, startFreq: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sine';
    osc.frequency.setValueAtTime(startFreq * 2.1, now);
    osc.frequency.exponentialRampToValueAtTime(startFreq * 0.58, now + 0.18);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainLevel, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.26);

    osc.connect(g);
    g.connect(this.musicBus);
    osc.start(now);
    osc.stop(now + 0.28);
  }

  private playMetallicSnare(gainLevel: number): void {
    if (!this.ctx || !this.musicBus || !this.whiteNoiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const bp = ctx.createBiquadFilter();
    bp.type = 'bandpass';
    bp.frequency.setValueAtTime(1350, now);
    bp.Q.setValueAtTime(1.8, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainLevel, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.14);

    noise.connect(bp);
    bp.connect(g);
    g.connect(this.musicBus);
    if (this.reverbNode) {
      const rev = ctx.createGain();
      rev.gain.setValueAtTime(0.35, now);
      g.connect(rev);
      rev.connect(this.reverbNode);
    }

    noise.start(now);
    noise.stop(now + 0.16);
  }

  private playIndustrialTick(gainLevel: number, freq: number): void {
    if (!this.ctx || !this.musicBus || !this.whiteNoiseBuffer) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const noise = ctx.createBufferSource();
    noise.buffer = this.whiteNoiseBuffer;

    const hp = ctx.createBiquadFilter();
    hp.type = 'highpass';
    hp.frequency.setValueAtTime(freq, now);

    const g = ctx.createGain();
    g.gain.setValueAtTime(gainLevel, now);
    g.gain.exponentialRampToValueAtTime(0.0001, now + 0.045);

    noise.connect(hp);
    hp.connect(g);
    g.connect(this.musicBus);
    noise.start(now);
    noise.stop(now + 0.05);
  }

  private playOstinatoBass(freq: number, dur: number, level: number): void {
    if (!this.ctx || !this.musicBus) return;
    const ctx = this.ctx;
    const now = ctx.currentTime;

    const osc = ctx.createOscillator();
    osc.type = 'sawtooth';
    osc.frequency.setValueAtTime(freq, now);

    const filter = ctx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.setValueAtTime(340, now);
    filter.frequency.exponentialRampToValueAtTime(115, now + dur);

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, now);
    g.gain.linearRampToValueAtTime(level, now + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, now + dur);

    osc.connect(filter);
    filter.connect(g);
    g.connect(this.musicBus);
    osc.start(now);
    osc.stop(now + dur + 0.03);
  }

  // =========================================================================
  // UTILITY HELPERS FOR SFX SYNTHESIS
  // =========================================================================

  private canPlaySfx(): boolean {
    if (this.settings.isMuted || !this.settings.sfxEnabled || this.settings.sfxVolume <= 0.005) {
      return false;
    }
    const ctx = this.ensureContext();
    return Boolean(ctx && this.sfxBus);
  }

  private triggerNoiseBurst(opts: {
    duration: number;
    delay?: number;
    gain: number;
    filterType: BiquadFilterType;
    freqStart: number;
    freqEnd?: number;
    q?: number;
    pink?: boolean;
    reverbSend?: number;
  }): void {
    if (!this.ctx || !this.sfxBus) return;
    const buf = opts.pink ? this.pinkNoiseBuffer : this.whiteNoiseBuffer;
    if (!buf) return;

    const ctx = this.ctx;
    const start = ctx.currentTime + (opts.delay ?? 0);

    const src = ctx.createBufferSource();
    src.buffer = buf;
    const maxOffset = Math.max(0, buf.duration - opts.duration - 0.05);
    const offset = maxOffset > 0 ? Math.random() * maxOffset : 0;

    const filter = ctx.createBiquadFilter();
    filter.type = opts.filterType;
    filter.frequency.setValueAtTime(opts.freqStart, start);
    if (opts.freqEnd !== undefined) {
      filter.frequency.exponentialRampToValueAtTime(
        Math.max(20, opts.freqEnd),
        start + opts.duration
      );
    }
    if (opts.q !== undefined) {
      filter.Q.setValueAtTime(opts.q, start);
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(opts.gain, start + Math.min(0.018, opts.duration * 0.2));
    g.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

    src.connect(filter);
    filter.connect(g);
    g.connect(this.sfxBus);

    if (opts.reverbSend && this.reverbNode) {
      const send = ctx.createGain();
      send.gain.setValueAtTime(opts.reverbSend, start);
      g.connect(send);
      send.connect(this.reverbNode);
    }

    src.start(start, offset, opts.duration + 0.04);
    src.stop(start + opts.duration + 0.04);
  }

  private triggerTone(opts: {
    type: OscillatorType;
    freqStart: number;
    freqEnd?: number;
    duration: number;
    delay?: number;
    gain: number;
    attack?: number;
    reverbSend?: number;
    filterCutoff?: number;
  }): void {
    if (!this.ctx || !this.sfxBus) return;
    const ctx = this.ctx;
    const start = ctx.currentTime + (opts.delay ?? 0);
    const attack = opts.attack ?? 0.008;

    const osc = ctx.createOscillator();
    osc.type = opts.type;
    osc.frequency.setValueAtTime(Math.max(20, opts.freqStart), start);
    if (opts.freqEnd !== undefined) {
      osc.frequency.exponentialRampToValueAtTime(
        Math.max(20, opts.freqEnd),
        start + opts.duration
      );
    }

    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, start);
    g.gain.linearRampToValueAtTime(opts.gain, start + attack);
    g.gain.exponentialRampToValueAtTime(0.0001, start + opts.duration);

    if (opts.filterCutoff) {
      const lp = ctx.createBiquadFilter();
      lp.type = 'lowpass';
      lp.frequency.setValueAtTime(opts.filterCutoff, start);
      osc.connect(lp);
      lp.connect(g);
    } else {
      osc.connect(g);
    }

    g.connect(this.sfxBus);

    if (opts.reverbSend && this.reverbNode) {
      const send = ctx.createGain();
      send.gain.setValueAtTime(opts.reverbSend, start);
      g.connect(send);
      send.connect(this.reverbNode);
    }

    osc.start(start);
    osc.stop(start + opts.duration + 0.04);
  }

  // =========================================================================
  // UI & CARD FOLEY
  // =========================================================================

  /** Tactile gunmetal button click (replaces thin sine blip) */
  public playSelect(): void {
    if (!this.canPlaySfx()) return;
    this.triggerNoiseBurst({
      duration: 0.032,
      gain: 0.14,
      filterType: 'bandpass',
      freqStart: 2400,
      freqEnd: 1100,
      q: 2.2,
    });
    this.triggerTone({
      type: 'triangle',
      freqStart: 520,
      freqEnd: 290,
      duration: 0.055,
      gain: 0.12,
      attack: 0.003,
    });
  }

  public playUiClick(): void {
    this.playSelect();
  }

  /** Weighted steel-slot card staging lock-in */
  public playCardStage(): void {
    if (!this.canPlaySfx()) return;
    this.triggerNoiseBurst({
      duration: 0.06,
      gain: 0.22,
      filterType: 'bandpass',
      freqStart: 1200,
      freqEnd: 650,
      q: 1.4,
    });
    this.triggerTone({
      type: 'triangle',
      freqStart: 190,
      freqEnd: 95,
      duration: 0.09,
      gain: 0.22,
      attack: 0.004,
    });
    this.triggerTone({
      type: 'sine',
      freqStart: 587.33,
      freqEnd: 783.99,
      duration: 0.11,
      delay: 0.025,
      gain: 0.11,
      reverbSend: 0.25,
    });
  }

  /** Soft unlatch when returning a staged card to hand */
  public playCardUnstage(): void {
    if (!this.canPlaySfx()) return;
    this.triggerNoiseBurst({
      duration: 0.055,
      gain: 0.15,
      filterType: 'bandpass',
      freqStart: 1600,
      freqEnd: 700,
      q: 1.5,
    });
    this.triggerTone({
      type: 'triangle',
      freqStart: 420,
      freqEnd: 230,
      duration: 0.085,
      gain: 0.13,
      attack: 0.004,
    });
  }

  /** Ultra-subtle throttled card hover rustle */
  public playCardHover(): void {
    if (!this.canPlaySfx()) return;
    const now = performance.now();
    if (now - this.lastHoverTime < 68) return;
    this.lastHoverTime = now;

    this.triggerNoiseBurst({
      duration: 0.038,
      gain: 0.048,
      filterType: 'bandpass',
      freqStart: 2800 + Math.random() * 500,
      freqEnd: 1500,
      q: 2.0,
    });
  }

  /** Crisp 3D armored card flip whoosh & snap */
  public playCardFlip(staggerIndex = 0): void {
    if (!this.canPlaySfx()) return;
    const delay = staggerIndex * 0.068;
    const pitchShift = 1 + staggerIndex * 0.04;

    this.triggerNoiseBurst({
      duration: 0.14,
      delay,
      gain: 0.2,
      filterType: 'bandpass',
      freqStart: 520 * pitchShift,
      freqEnd: 2400 * pitchShift,
      q: 1.3,
      reverbSend: 0.2,
    });
    this.triggerTone({
      type: 'triangle',
      freqStart: 220 * pitchShift,
      freqEnd: 120,
      duration: 0.075,
      delay: delay + 0.08,
      gain: 0.18,
      attack: 0.003,
    });
  }

  /** Authentic tactical comms squelch beep for Intelligence Officer transmissions */
  public playCommsBeep(type: 'open' | 'close'): void {
    if (!this.canPlaySfx()) return;
    if (type === 'open') {
      this.triggerNoiseBurst({
        duration: 0.045,
        gain: 0.075,
        filterType: 'bandpass',
        freqStart: 2300,
        q: 3.0,
      });
      this.triggerTone({
        type: 'sine',
        freqStart: 1320,
        freqEnd: 1760,
        duration: 0.065,
        gain: 0.07,
        attack: 0.004,
      });
    } else {
      this.triggerTone({
        type: 'sine',
        freqStart: 1480,
        freqEnd: 980,
        duration: 0.06,
        gain: 0.055,
        attack: 0.004,
      });
      this.triggerNoiseBurst({
        duration: 0.04,
        delay: 0.02,
        gain: 0.06,
        filterType: 'bandpass',
        freqStart: 1900,
        q: 2.8,
      });
    }
  }

  /** Dramatic war-horn & heavy lock impact when battle begins */
  public playBattleStart(): void {
    if (!this.canPlaySfx()) return;
    // Deep sub-impact
    this.triggerTone({
      type: 'sine',
      freqStart: 115,
      freqEnd: 34,
      duration: 0.45,
      gain: 0.42,
      attack: 0.005,
      reverbSend: 0.3,
    });
    // Dark industrial brass fifth (D2 + A2)
    this.triggerTone({
      type: 'sawtooth',
      freqStart: 73.42,
      freqEnd: 71.5,
      duration: 0.62,
      gain: 0.18,
      attack: 0.04,
      filterCutoff: 420,
      reverbSend: 0.55,
    });
    this.triggerTone({
      type: 'sawtooth',
      freqStart: 110.0,
      freqEnd: 108.5,
      duration: 0.58,
      delay: 0.04,
      gain: 0.15,
      attack: 0.04,
      filterCutoff: 560,
      reverbSend: 0.55,
    });
    // Metallic clash
    this.triggerNoiseBurst({
      duration: 0.18,
      gain: 0.22,
      filterType: 'bandpass',
      freqStart: 1800,
      freqEnd: 520,
      q: 1.5,
      reverbSend: 0.4,
    });
  }

  // =========================================================================
  // ARCHETYPE-MATCHED COMBAT SFX (SYNCED WITH BattleVfxLayer)
  // =========================================================================

  public playCombatArchetype(
    archetype: CombatArchetype,
    phase: 'cast' | 'impact'
  ): void {
    if (!this.canPlaySfx()) return;

    switch (archetype) {
      case 'sniper_tracer':
        if (phase === 'cast') {
          // Precision laser target-lock chirp + metallic bolt slide
          this.triggerTone({
            type: 'sine',
            freqStart: 1560,
            freqEnd: 1980,
            duration: 0.06,
            gain: 0.09,
            attack: 0.003,
          });
          this.triggerNoiseBurst({
            duration: 0.045,
            delay: 0.05,
            gain: 0.12,
            filterType: 'highpass',
            freqStart: 2600,
          });
        } else {
          // Supersonic rifle crack + kinetic punch + metallic ricochet
          this.triggerNoiseBurst({
            duration: 0.11,
            gain: 0.42,
            filterType: 'bandpass',
            freqStart: 3200,
            freqEnd: 750,
            q: 0.9,
            reverbSend: 0.45,
          });
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 880,
            freqEnd: 95,
            duration: 0.14,
            gain: 0.28,
            attack: 0.002,
            filterCutoff: 1400,
          });
          this.triggerTone({
            type: 'sine',
            freqStart: 2750,
            freqEnd: 1620,
            duration: 0.18,
            delay: 0.04,
            gain: 0.08,
            reverbSend: 0.5,
          });
        }
        break;

      case 'lightning':
        if (phase === 'cast') {
          // High-voltage charge crackle
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 240,
            freqEnd: 1420,
            duration: 0.2,
            gain: 0.13,
            filterCutoff: 2400,
          });
          this.triggerNoiseBurst({
            duration: 0.14,
            delay: 0.04,
            gain: 0.14,
            filterType: 'highpass',
            freqStart: 3600,
          });
        } else {
          // Jagged electric arc snaps + thunderclap rumble
          for (let i = 0; i < 3; i++) {
            this.triggerNoiseBurst({
              duration: 0.065,
              delay: i * 0.055,
              gain: 0.34 - i * 0.06,
              filterType: 'bandpass',
              freqStart: 4200 - i * 800,
              freqEnd: 900,
              q: 1.4,
              reverbSend: 0.55,
            });
          }
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 135,
            freqEnd: 46,
            duration: 0.34,
            gain: 0.24,
            filterCutoff: 480,
            reverbSend: 0.5,
          });
          this.triggerNoiseBurst({
            duration: 0.58,
            delay: 0.05,
            gain: 0.36,
            filterType: 'lowpass',
            freqStart: 420,
            freqEnd: 80,
            pink: true,
            reverbSend: 0.65,
          });
        }
        break;

      case 'toxic':
        if (phase === 'cast') {
          // Pressurized bio-hazard hiss
          this.triggerNoiseBurst({
            duration: 0.22,
            gain: 0.18,
            filterType: 'bandpass',
            freqStart: 2600,
            freqEnd: 880,
            q: 2.2,
            reverbSend: 0.3,
          });
        } else {
          // Corrosive acid sizzle + bubbling resonant sweeps + ominous bio-drone
          this.triggerNoiseBurst({
            duration: 0.48,
            gain: 0.28,
            filterType: 'highpass',
            freqStart: 2900,
            freqEnd: 1600,
            reverbSend: 0.35,
          });
          [0, 0.08, 0.17, 0.26].forEach((d, idx) => {
            this.triggerTone({
              type: 'sine',
              freqStart: 340 + idx * 120,
              freqEnd: 780 + (idx % 2) * 320,
              duration: 0.085,
              delay: d,
              gain: 0.11,
              attack: 0.01,
              reverbSend: 0.25,
            });
          });
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 92,
            freqEnd: 68,
            duration: 0.45,
            gain: 0.16,
            filterCutoff: 290,
          });
        }
        break;

      case 'artillery':
        if (phase === 'cast') {
          // Iconic incoming artillery shell whistle
          this.triggerTone({
            type: 'sine',
            freqStart: 1420,
            freqEnd: 310,
            duration: 0.23,
            gain: 0.15,
            attack: 0.015,
            reverbSend: 0.35,
          });
          this.triggerNoiseBurst({
            duration: 0.22,
            gain: 0.12,
            filterType: 'bandpass',
            freqStart: 1700,
            freqEnd: 460,
            q: 2.6,
          });
        } else {
          // Massive artillery detonation: transient crack + sub shockwave + debris roar
          this.triggerTone({
            type: 'sine',
            freqStart: 130,
            freqEnd: 24,
            duration: 0.65,
            gain: 0.55,
            attack: 0.003,
            reverbSend: 0.35,
          });
          this.triggerNoiseBurst({
            duration: 0.12,
            gain: 0.46,
            filterType: 'bandpass',
            freqStart: 1600,
            freqEnd: 320,
            q: 0.8,
            reverbSend: 0.5,
          });
          this.triggerNoiseBurst({
            duration: 0.78,
            delay: 0.02,
            gain: 0.48,
            filterType: 'lowpass',
            freqStart: 680,
            freqEnd: 75,
            pink: true,
            reverbSend: 0.72,
          });
        }
        break;

      case 'shield_dome':
        if (phase === 'cast') {
          // Tech energy barrier charge
          this.triggerTone({
            type: 'triangle',
            freqStart: 240,
            freqEnd: 620,
            duration: 0.2,
            gain: 0.15,
            reverbSend: 0.3,
          });
        } else {
          // Crystalline harmonic hex-shield activation
          [587.33, 880.0, 1174.66].forEach((freq, idx) => {
            this.triggerTone({
              type: idx === 0 ? 'triangle' : 'sine',
              freqStart: freq,
              freqEnd: freq * 1.015,
              duration: 0.38 - idx * 0.05,
              delay: idx * 0.032,
              gain: 0.16 - idx * 0.03,
              attack: 0.012,
              reverbSend: 0.52,
            });
          });
        }
        break;

      case 'holy_purge':
        if (phase === 'cast') {
          // Radiant cathedral fifth swell
          this.triggerTone({
            type: 'triangle',
            freqStart: 293.66,
            freqEnd: 440.0,
            duration: 0.22,
            gain: 0.14,
            reverbSend: 0.5,
          });
        } else {
          // Purifying golden bell & shimmering choir chord
          [587.33, 739.99, 880.0, 1479.98].forEach((freq, idx) => {
            this.triggerTone({
              type: 'sine',
              freqStart: freq,
              duration: 0.62 - idx * 0.08,
              delay: idx * 0.025,
              gain: idx === 0 ? 0.2 : 0.12,
              attack: 0.015,
              reverbSend: 0.68,
            });
          });
          this.triggerNoiseBurst({
            duration: 0.28,
            gain: 0.12,
            filterType: 'highpass',
            freqStart: 4200,
            reverbSend: 0.6,
          });
        }
        break;

      case 'arcane_ritual':
        if (phase === 'cast') {
          // Eerie occult rising whisper & tritone shimmer
          this.triggerNoiseBurst({
            duration: 0.24,
            gain: 0.15,
            filterType: 'bandpass',
            freqStart: 450,
            freqEnd: 2200,
            q: 3.2,
            pink: true,
            reverbSend: 0.55,
          });
          this.triggerTone({
            type: 'sine',
            freqStart: 311.13,
            freqEnd: 440.0,
            duration: 0.22,
            gain: 0.11,
            reverbSend: 0.5,
          });
        } else {
          // Deep abyssal pulse + dissonant arcane overtone
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 104,
            freqEnd: 36,
            duration: 0.5,
            gain: 0.34,
            attack: 0.008,
            filterCutoff: 360,
            reverbSend: 0.62,
          });
          this.triggerTone({
            type: 'triangle',
            freqStart: 311.13, // Eb4 dark tritone
            freqEnd: 293.66,
            duration: 0.44,
            delay: 0.03,
            gain: 0.14,
            reverbSend: 0.65,
          });
          this.triggerNoiseBurst({
            duration: 0.36,
            gain: 0.22,
            filterType: 'bandpass',
            freqStart: 950,
            freqEnd: 220,
            q: 1.8,
            pink: true,
            reverbSend: 0.6,
          });
        }
        break;

      case 'melee_strike':
        if (phase === 'cast') {
          // Savage blade / claw slash through air
          this.triggerNoiseBurst({
            duration: 0.16,
            gain: 0.22,
            filterType: 'bandpass',
            freqStart: 420,
            freqEnd: 2500,
            q: 1.4,
          });
        } else {
          // Visceral kinetic clash + meaty low impact + metallic rip
          this.triggerTone({
            type: 'sawtooth',
            freqStart: 240,
            freqEnd: 48,
            duration: 0.22,
            gain: 0.36,
            attack: 0.003,
            filterCutoff: 620,
            reverbSend: 0.3,
          });
          this.triggerNoiseBurst({
            duration: 0.15,
            gain: 0.34,
            filterType: 'bandpass',
            freqStart: 2200,
            freqEnd: 520,
            q: 1.1,
            reverbSend: 0.35,
          });
        }
        break;
    }
  }

  /**
   * Secondary outcome cue layered cleanly for specific game rule effects.
   */
  public playStatusEffect(kind: CombatStatusSoundKind): void {
    if (!this.canPlaySfx()) return;

    switch (kind) {
      case 'destroy':
        // Heavy armor shatter & lethal drop
        this.triggerTone({
          type: 'sine',
          freqStart: 110,
          freqEnd: 32,
          duration: 0.32,
          delay: 0.04,
          gain: 0.3,
          reverbSend: 0.35,
        });
        this.triggerNoiseBurst({
          duration: 0.18,
          delay: 0.03,
          gain: 0.22,
          filterType: 'highpass',
          freqStart: 1900,
          reverbSend: 0.4,
        });
        break;

      case 'reduce_rank':
        this.triggerTone({
          type: 'sawtooth',
          freqStart: 480,
          freqEnd: 160,
          duration: 0.26,
          gain: 0.15,
          filterCutoff: 900,
          reverbSend: 0.3,
        });
        break;

      case 'cancel':
      case 'disable':
        // EMP static lock / arcane seal
        this.triggerNoiseBurst({
          duration: 0.14,
          gain: 0.22,
          filterType: 'bandpass',
          freqStart: 2800,
          freqEnd: 620,
          q: 2.5,
        });
        this.triggerTone({
          type: 'square',
          freqStart: 620,
          freqEnd: 195,
          duration: 0.18,
          gain: 0.11,
          filterCutoff: 1100,
        });
        break;

      case 'protect':
        this.triggerTone({
          type: 'sine',
          freqStart: 783.99,
          freqEnd: 1174.66,
          duration: 0.22,
          gain: 0.15,
          reverbSend: 0.45,
        });
        break;

      case 'revive':
        // Ethereal ascending revival arpeggio
        [293.66, 349.23, 440.0, 587.33].forEach((f, idx) => {
          this.triggerTone({
            type: 'triangle',
            freqStart: f,
            duration: 0.35,
            delay: idx * 0.055,
            gain: 0.14,
            attack: 0.02,
            reverbSend: 0.62,
          });
        });
        break;

      case 'evacuate':
        // Jet extraction whoosh upward
        this.triggerNoiseBurst({
          duration: 0.36,
          gain: 0.24,
          filterType: 'bandpass',
          freqStart: 260,
          freqEnd: 2400,
          q: 1.6,
          reverbSend: 0.45,
        });
        this.triggerTone({
          type: 'sine',
          freqStart: 320,
          freqEnd: 960,
          duration: 0.3,
          gain: 0.14,
          reverbSend: 0.4,
        });
        break;
    }
  }

  // Legacy aliases routed to rich combat foley
  public playHit(): void {
    this.playCombatArchetype('melee_strike', 'impact');
  }

  public playShield(): void {
    this.playCombatArchetype('shield_dome', 'impact');
  }

  /** Triumphant dark-heroic orchestral victory fanfare */
  public playVictory(): void {
    if (!this.canPlaySfx()) return;
    // Timpani roll impact
    this.triggerTone({
      type: 'sine',
      freqStart: 120,
      freqEnd: 46,
      duration: 0.42,
      gain: 0.35,
      reverbSend: 0.45,
    });
    // Heroic D-major brass/strings resolution (D4 -> A4 -> D5 -> F#5 -> A5)
    const notes = [
      { f: 293.66, d: 0.0, dur: 0.55, g: 0.18 },
      { f: 440.0, d: 0.12, dur: 0.55, g: 0.18 },
      { f: 587.33, d: 0.25, dur: 0.72, g: 0.2 },
      { f: 739.99, d: 0.4, dur: 0.95, g: 0.2 },
      { f: 880.0, d: 0.42, dur: 1.05, g: 0.15 },
    ];
    notes.forEach((n) => {
      this.triggerTone({
        type: 'triangle',
        freqStart: n.f,
        duration: n.dur,
        delay: n.d,
        gain: n.g,
        attack: 0.025,
        reverbSend: 0.65,
      });
      this.triggerTone({
        type: 'sawtooth',
        freqStart: n.f * 0.5,
        duration: n.dur,
        delay: n.d,
        gain: n.g * 0.45,
        attack: 0.03,
        filterCutoff: 850,
        reverbSend: 0.55,
      });
    });
  }

  /** Heavy somber defeat brass & deep resonant sub-gong */
  public playDefeat(): void {
    if (!this.canPlaySfx()) return;
    this.triggerTone({
      type: 'sine',
      freqStart: 98,
      freqEnd: 30,
      duration: 0.95,
      gain: 0.42,
      reverbSend: 0.65,
    });
    const notes = [
      { f: 146.83, d: 0.0, dur: 0.48 }, // D3
      { f: 130.81, d: 0.22, dur: 0.48 }, // C3
      { f: 116.54, d: 0.46, dur: 0.6 }, // Bb2
      { f: 110.0, d: 0.72, dur: 1.15 }, // A2
    ];
    notes.forEach((n) => {
      this.triggerTone({
        type: 'sawtooth',
        freqStart: n.f,
        freqEnd: n.f * 0.97,
        duration: n.dur,
        delay: n.d,
        gain: 0.16,
        attack: 0.035,
        filterCutoff: 420,
        reverbSend: 0.65,
      });
    });
  }
}

export const sound = new AtmosphericSoundEngine();
