import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { CampaignDialogueLine } from '../data/campaign';
import { CAMPAIGN_MAP_BACKGROUND } from '../data/backgrounds';
import { GameButton } from './GameButton';
import { AudioControlsButton } from './AudioControlsButton';
import { CornerRivets, RiftDivider } from './TacticalChrome';
import { AudioSettings, sound } from '../utils/sound';
import { voiceService, VoicePlaybackStatus } from '../utils/voiceService';
import {
  AlertCircle,
  ArrowRight,
  ChevronLeft,
  Loader2,
  Radio,
  RotateCcw,
  Shield,
  Skull,
  Square,
  Swords,
  Trophy,
  Volume2,
} from 'lucide-react';

interface CampaignCutsceneOverlayProps {
  lines: CampaignDialogueLine[];
  headerKicker: string;
  headerTitle: string;
  finalActionLabel: string;
  finalActionVariant?: 'emerald' | 'primary';
  finalActionIcon?: 'battle' | 'continue' | 'trophy';
  cancelLabel?: string;
  onComplete: () => void;
  onCancel?: () => void;
}

export const CampaignCutsceneOverlay: React.FC<CampaignCutsceneOverlayProps> = ({
  lines,
  headerKicker,
  headerTitle,
  finalActionLabel,
  finalActionVariant = 'emerald',
  finalActionIcon = 'continue',
  cancelLabel,
  onComplete,
  onCancel,
}) => {
  const [stepIndex, setStepIndex] = useState(0);
  const [sceneFailed, setSceneFailed] = useState(false);
  const [failedPortraits, setFailedPortraits] = useState<Record<string, boolean>>({});
  const [audioSettings, setAudioSettings] = useState<AudioSettings>(() =>
    sound.getSettings()
  );
  const [voiceStatus, setVoiceStatus] = useState<VoicePlaybackStatus>('idle');
  const [voiceError, setVoiceError] = useState<string | null>(null);

  const safeIndex = Math.min(stepIndex, Math.max(0, lines.length - 1));
  const currentLine = lines[safeIndex];
  const nextLine = lines[safeIndex + 1];
  const isLastStep = safeIndex >= lines.length - 1;
  const isVoiceActiveSetting =
    !audioSettings.isMuted &&
    audioSettings.voiceEnabled &&
    audioSettings.voiceVolume > 0.005;

  useEffect(() => {
    return sound.subscribe(setAudioSettings);
  }, []);

  // Detect whether this dialogue involves both Resistance and Dark Side speakers for dual-portrait staging
  const conversationCast = useMemo(() => {
    const resistanceSpeaker = lines.find((l) => l.tone !== 'dark');
    const darkSpeaker = lines.find((l) => l.tone === 'dark');
    return {
      resistanceSpeaker,
      darkSpeaker,
      isDualConversation: Boolean(resistanceSpeaker && darkSpeaker),
    };
  }, [lines]);

  useEffect(() => {
    setStepIndex(0);
    setFailedPortraits({});
  }, [lines]);

  useEffect(() => {
    setSceneFailed(false);
  }, [currentLine?.sceneImage]);

  const playCurrentLineVoice = useCallback(() => {
    if (!currentLine) return;
    setVoiceError(null);
    void voiceService.speak(
      {
        speaker: currentLine.speaker,
        text: currentLine.text,
        tone: currentLine.tone,
      },
      (status, errorMsg) => {
        setVoiceStatus(status);
        setVoiceError(status === 'error' ? errorMsg ?? 'Ошибка озвучки' : null);
      }
    );
  }, [currentLine]);

  // Automatically narrate each dialogue line and prefetch the next line for zero-gap transitions
  useEffect(() => {
    if (!currentLine) return;

    if (!isVoiceActiveSetting) {
      voiceService.stop();
      setVoiceStatus('idle');
      setVoiceError(null);
      return;
    }

    playCurrentLineVoice();

    if (nextLine) {
      voiceService.prefetch({
        speaker: nextLine.speaker,
        text: nextLine.text,
        tone: nextLine.tone,
      });
    }

    return () => {
      voiceService.stop();
    };
  }, [
    currentLine,
    nextLine,
    isVoiceActiveSetting,
    playCurrentLineVoice,
  ]);

  const handleAdvance = useCallback(() => {
    voiceService.stop();
    if (!isLastStep) {
      sound.playUiClick();
      setStepIndex((prev) => prev + 1);
    } else {
      onComplete();
    }
  }, [isLastStep, onComplete]);

  const handleSkip = useCallback(() => {
    voiceService.stop();
    onComplete();
  }, [onComplete]);

  const handleCancel = useCallback(() => {
    voiceService.stop();
    onCancel?.();
  }, [onCancel]);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Enter' || e.key === ' ') {
        e.preventDefault();
        handleAdvance();
      } else if (e.key === 'Escape' && onCancel) {
        e.preventDefault();
        handleCancel();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [handleAdvance, handleCancel, onCancel]);

  if (!currentLine) return null;

  const isFullScene = Boolean(currentLine.sceneImage);
  const isDarkSpeaker = currentLine.tone === 'dark';
  const isWarning = currentLine.tone === 'warning';

  const frameBorderClass = isDarkSpeaker
    ? 'border-[#9e3338]'
    : isWarning
    ? 'border-[#c47a3b]'
    : 'border-[#4d8da3]';

  const speakerNameClass = isDarkSpeaker
    ? 'text-[#f27b72]'
    : isWarning
    ? 'text-[#f5be78]'
    : 'text-[#86d4ec]';

  const markPortraitFailed = (src: string) => {
    setFailedPortraits((prev) => ({ ...prev, [src]: true }));
  };

  const renderFinalIcon = () => {
    if (finalActionIcon === 'battle') return <Swords className="w-4 h-4" />;
    if (finalActionIcon === 'trophy') return <Trophy className="w-4 h-4" />;
    return <ArrowRight className="w-4 h-4" />;
  };

  const renderPortraitCard = (
    speakerLine: CampaignDialogueLine,
    isActive: boolean,
    sideVariant: 'resistance' | 'dark'
  ) => {
    const isFailed = failedPortraits[speakerLine.portraitImage];
    const isDark = sideVariant === 'dark';
    const activeBorder = isDark
      ? 'border-[#c4454a] shadow-[0_24px_56px_rgba(158,36,42,0.45)]'
      : 'border-[#63b9d4] shadow-[0_24px_56px_rgba(68,156,184,0.38)]';
    const inactiveBorder = 'border-[#2c343e] shadow-[0_14px_30px_rgba(0,0,0,0.85)]';

    return (
      <div
        className={`relative h-full max-h-[390px] aspect-[3/4] max-w-[44vw] sm:max-w-[300px] rounded-[6px] p-[2px] bg-gradient-to-b from-[#667380] via-[#2b333c] to-[#11151b] transition-all duration-300 ease-out ${
          isActive
            ? `scale-100 brightness-100 opacity-100 z-20 ${activeBorder}`
            : `scale-[0.9] brightness-[0.46] saturate-75 opacity-80 z-10 ${inactiveBorder}`
        }`}
      >
        <div
          className={`relative w-full h-full rounded-[5px] overflow-hidden border bg-[#0b0e13] ${
            isActive
              ? isDark
                ? 'border-[#c4454a]'
                : 'border-[#63b9d4]'
              : 'border-[#2b323b]'
          }`}
        >
          {!isFailed ? (
            <img
              src={speakerLine.portraitImage}
              alt={speakerLine.speakerName}
              referrerPolicy="no-referrer"
              onError={() => markPortraitFailed(speakerLine.portraitImage)}
              className="w-full h-full object-cover object-top"
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center gap-2 text-[#8d99a6] bg-[#12161d]">
              {isDark ? (
                <Skull className="w-12 h-12 text-[#d65a54]" />
              ) : (
                <Shield className="w-12 h-12 text-[#77cde6]" />
              )}
              <span className="font-display text-sm uppercase tracking-widest">
                {speakerLine.speakerName}
              </span>
            </div>
          )}

          {/* Subtle bottom inner vignette inside portrait */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-20 bg-gradient-to-t from-[#07090d]/92 via-[#07090d]/40 to-transparent"
          />
          <div className="absolute bottom-2.5 inset-x-3 flex items-center justify-between gap-2">
            <span
              className={`font-display text-xs sm:text-base font-bold uppercase tracking-[0.08em] drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] truncate ${
                isDark ? 'text-[#f27b72]' : 'text-[#86d4ec]'
              }`}
            >
              {speakerLine.speakerName}
            </span>
            <span className="font-led text-[10px] uppercase tracking-[0.1em] text-[#c4cdd6] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)] shrink-0">
              {isDark ? 'Угроза' : 'Связь'}
            </span>
          </div>
        </div>
      </div>
    );
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={headerTitle}
      className="fixed inset-0 z-50 bg-[#05070a] text-[#efe6d8] flex flex-col justify-between overflow-hidden select-none"
    >
      {/* Background Layer */}
      {isFullScene ? (
        <>
          {!sceneFailed ? (
            <img
              key={currentLine.sceneImage}
              src={currentLine.sceneImage}
              alt={headerTitle}
              referrerPolicy="no-referrer"
              onError={() => setSceneFailed(true)}
              className="pointer-events-none absolute inset-0 w-full h-full object-cover object-center animate-cutscene-ken-burns"
            />
          ) : (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,#2d1514_0%,#090b0f_75%)]"
            />
          )}
          {/* Measured contrast scrims preserving full-bleed center art */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#05070a]/85 via-[#05070a]/45 to-transparent"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 bottom-0 h-[55%] bg-gradient-to-t from-[#05070a] via-[#05070a]/82 to-transparent"
          />
        </>
      ) : (
        <>
          <div
            aria-hidden="true"
            style={{ backgroundImage: `url(${CAMPAIGN_MAP_BACKGROUND})` }}
            className="pointer-events-none absolute inset-0 bg-cover bg-center scale-105 opacity-28 blur-[2px]"
          />
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-0 transition-colors duration-300 ${
              isDarkSpeaker
                ? 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(138,28,34,0.36)_0%,rgba(6,8,12,0.92)_68%)]'
                : 'bg-[radial-gradient(ellipse_at_50%_35%,rgba(52,118,140,0.28)_0%,rgba(6,8,12,0.94)_68%)]'
            }`}
          />
        </>
      )}

      {/* Top Slim Cinematic Header Bar */}
      <header className="relative z-20 px-4 sm:px-6 pt-3 sm:pt-4 flex items-center justify-between gap-4 shrink-0">
        <div className="min-w-0">
          <div className="font-led text-[11px] uppercase tracking-[0.16em] text-[#a7b4c2]">
            {headerKicker}
          </div>
          <h2 className="font-display text-lg sm:text-2xl font-bold uppercase tracking-[0.08em] text-[#f7efe3] drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)] truncate">
            {headerTitle}
          </h2>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          <AudioControlsButton />
          {onCancel && cancelLabel && (
            <GameButton variant="secondary" size="xs" onClick={handleCancel}>
              <ChevronLeft className="w-3.5 h-3.5" />
              <span>{cancelLabel}</span>
            </GameButton>
          )}
          {lines.length > 1 && !isLastStep && (
            <GameButton variant="secondary" size="xs" onClick={handleSkip}>
              <span>Пропустить</span>
            </GameButton>
          )}
        </div>
      </header>

      {/* Center Stage: Dual-Portrait Conversation OR Single Speaker Spotlight */}
      {!isFullScene && (
        <div className="relative z-10 flex-1 min-h-0 flex items-center justify-center gap-3 sm:gap-8 px-4 py-2 sm:py-4">
          {conversationCast.isDualConversation &&
          conversationCast.resistanceSpeaker &&
          conversationCast.darkSpeaker ? (
            <>
              {renderPortraitCard(
                !isDarkSpeaker ? currentLine : conversationCast.resistanceSpeaker,
                !isDarkSpeaker,
                'resistance'
              )}
              {renderPortraitCard(
                isDarkSpeaker ? currentLine : conversationCast.darkSpeaker,
                isDarkSpeaker,
                'dark'
              )}
            </>
          ) : (
            renderPortraitCard(
              currentLine,
              true,
              isDarkSpeaker ? 'dark' : 'resistance'
            )
          )}
        </div>
      )}

      {/* Spacer when full-screen scene is shown so dialogue stays cleanly anchored at bottom */}
      {isFullScene && <div className="flex-1 min-h-0" />}

      {/* Bottom Docked Dialogue Console (Outer shell stays steady — zero box bounce between lines) */}
      <div className="relative z-20 w-full max-w-4xl mx-auto px-3 sm:px-6 pb-4 sm:pb-6 shrink-0">
        <div
          className={`relative steel-plate rounded-[6px] transition-colors duration-200 ${frameBorderClass} p-3.5 sm:p-5`}
        >
          <CornerRivets
            inset="sm"
            tone={isDarkSpeaker ? 'dark' : 'rift'}
          />

          <div className="flex items-start gap-3.5 sm:gap-5">
            {/* Character Portrait Thumbnail in full-scene mode */}
            {isFullScene && (
              <div
                className={`relative w-20 h-24 sm:w-28 sm:h-36 rounded-[4px] overflow-hidden border transition-colors duration-200 ${frameBorderClass} bg-[#0c1016] shrink-0 shadow-[0_10px_26px_rgba(0,0,0,0.85)] -mt-7 sm:-mt-12`}
              >
                {!failedPortraits[currentLine.portraitImage] ? (
                  <img
                    src={currentLine.portraitImage}
                    alt={currentLine.speakerName}
                    referrerPolicy="no-referrer"
                    onError={() => markPortraitFailed(currentLine.portraitImage)}
                    className="w-full h-full object-cover object-top"
                  />
                ) : (
                  <div className="w-full h-full flex items-center justify-center bg-[#121820]">
                    <Shield className="w-8 h-8 text-[#77cde6]" />
                  </div>
                )}
              </div>
            )}

            {/* Spoken Text Column */}
            <div className="flex-1 min-w-0 flex flex-col">
              <div
                key={`line-${safeIndex}`}
                className="animate-dialogue-text"
              >
                <div className="flex flex-wrap items-center justify-between gap-2 pb-2 border-b border-[#2c343e]">
                  <div className="flex items-center gap-2 text-xs sm:text-sm min-w-0">
                    {isDarkSpeaker ? (
                      <Skull className="w-4 h-4 text-[#eb6a61] shrink-0" />
                    ) : (
                      <Radio className="w-4 h-4 text-[#7fd0ea] shrink-0" />
                    )}
                    <span
                      className={`font-display font-bold uppercase tracking-[0.08em] truncate ${speakerNameClass}`}
                    >
                      {currentLine.speakerName}
                    </span>
                    <span aria-hidden="true" className="text-[#5d6773]">
                      ·
                    </span>
                    <span className="text-xs text-[#a8b4c0] truncate">
                      {currentLine.speakerRole}
                    </span>

                    {/* Live Voice Activity Indicator */}
                    {voiceStatus === 'loading' && (
                      <span className="inline-flex items-center gap-1 text-[11px] font-led text-[#9fb0c0] shrink-0 ml-1">
                        <Loader2 className="w-3 h-3 animate-spin" />
                        <span className="hidden sm:inline">Голос…</span>
                      </span>
                    )}
                    {voiceStatus === 'playing' && (
                      <span
                        aria-label="Идёт озвучка реплики"
                        className="inline-flex items-end gap-[2px] h-3.5 ml-1 shrink-0"
                      >
                        {[0, 140, 280, 420].map((delayMs) => (
                          <span
                            key={delayMs}
                            style={{ animationDelay: `${delayMs}ms` }}
                            className={`w-[2.5px] h-full rounded-[1px] animate-voice-bar ${
                              isDarkSpeaker
                                ? 'bg-[#eb6a61]'
                                : isWarning
                                ? 'bg-[#f5be78]'
                                : 'bg-[#7fd0ea]'
                            }`}
                          />
                        ))}
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2 shrink-0">
                    {voiceStatus === 'playing' ? (
                      <button
                        type="button"
                        onClick={() => voiceService.stop()}
                        title="Остановить озвучку реплики"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-[#3a4552] bg-[#131820] hover:border-[#627385] text-[11px] text-[#cfd8e2] hover:text-white transition-colors cursor-pointer"
                      >
                        <Square className="w-2.5 h-2.5 fill-current" />
                        <span className="hidden sm:inline">Стоп</span>
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={() => {
                          if (!isVoiceActiveSetting) {
                            sound.updateSettings({
                              isMuted: false,
                              voiceEnabled: true,
                            });
                          }
                          playCurrentLineVoice();
                        }}
                        disabled={voiceStatus === 'loading'}
                        title="Озвучить реплику снова"
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border border-[#36424f] bg-[#12171f] hover:border-[#64b6d1] text-[11px] text-[#b8c6d4] hover:text-white disabled:opacity-50 transition-colors cursor-pointer"
                      >
                        {voiceStatus === 'error' ? (
                          <RotateCcw className="w-3 h-3 text-[#f09e6c]" />
                        ) : (
                          <Volume2 className="w-3 h-3 text-[#84d2ea]" />
                        )}
                        <span className="hidden sm:inline">
                          {voiceStatus === 'error' ? 'Повторить' : 'Озвучить'}
                        </span>
                      </button>
                    )}

                    {lines.length > 1 && (
                      <span className="font-led text-[11px] text-[#9aa6b4] tabular-nums shrink-0">
                        {safeIndex + 1} / {lines.length}
                      </span>
                    )}
                  </div>
                </div>

                <p className="mt-2.5 sm:mt-3 text-sm sm:text-base md:text-[17px] text-[#f4ede2] leading-relaxed font-normal min-h-[3.2rem]">
                  «{currentLine.text}»
                </p>

                {voiceStatus === 'error' && voiceError && (
                  <div className="mt-2 flex items-center gap-1.5 text-xs text-[#f08b82]">
                    <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                    <span className="truncate">{voiceError}</span>
                  </div>
                )}
              </div>

              <RiftDivider className="w-full my-3" />

              <div className="flex items-center justify-between gap-3">
                <span className="hidden sm:inline text-xs text-[#8d99a6]">
                  Нажмите Enter или кнопку справа, чтобы продолжить
                </span>

                <div className="ml-auto flex items-center gap-2">
                  {!isLastStep ? (
                    <GameButton
                      variant="primary"
                      size="md"
                      withOrnaments
                      onClick={handleAdvance}
                    >
                      <span>Далее</span>
                      <ArrowRight className="w-4 h-4" />
                    </GameButton>
                  ) : (
                    <GameButton
                      variant={finalActionVariant}
                      size="md"
                      withOrnaments
                      onClick={handleAdvance}
                    >
                      {renderFinalIcon()}
                      <span>{finalActionLabel}</span>
                    </GameButton>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
