import React, { useEffect, useRef, useState } from 'react';
import { AudioSettings, sound } from '../utils/sound';
import { GameButton } from './GameButton';
import { CornerRivets } from './TacticalChrome';
import {
  Mic,
  MicOff,
  Music,
  Swords,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface AudioControlsButtonProps {
  className?: string;
  align?: 'right' | 'left';
  showLabel?: boolean;
}

export const AudioControlsButton: React.FC<AudioControlsButtonProps> = ({
  className = '',
  align = 'right',
  showLabel = false,
}) => {
  const [settings, setSettings] = useState<AudioSettings>(() =>
    sound.getSettings()
  );
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    return sound.subscribe(setSettings);
  }, []);

  useEffect(() => {
    if (!isOpen) return;
    const onPointerDown = (e: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(e.target as Node)
      ) {
        setIsOpen(false);
      }
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    };
    window.addEventListener('mousedown', onPointerDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onPointerDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [isOpen]);

  const allChannelsOff =
    settings.isMuted ||
    (!settings.musicEnabled && !settings.sfxEnabled && !settings.voiceEnabled);

  const handleToggleButton = (e: React.MouseEvent) => {
    if (e.shiftKey) {
      sound.toggleMute();
      return;
    }
    sound.playUiClick();
    setIsOpen((prev) => !prev);
  };

  const handleContextQuickMute = (e: React.MouseEvent) => {
    e.preventDefault();
    sound.toggleMute();
  };

  return (
    <div ref={containerRef} className={`relative ${className}`}>
      <GameButton
        variant="secondary"
        size="xs"
        onClick={handleToggleButton}
        onContextMenu={handleContextQuickMute}
        title="Настройки звука, атмосферы и озвучки (ПКМ — быстрый mute)"
        aria-expanded={isOpen}
        aria-haspopup="dialog"
      >
        {allChannelsOff ? (
          <VolumeX className="w-3.5 h-3.5 text-[#8a94a0]" />
        ) : (
          <Volume2 className="w-3.5 h-3.5 text-[#84d2ea]" />
        )}
        {showLabel && (
          <span className="hidden sm:inline">
            {allChannelsOff ? 'Без звука' : 'Звук'}
          </span>
        )}
      </GameButton>

      {isOpen && (
        <div
          role="dialog"
          aria-label="Настройки аудио"
          className={`absolute top-full mt-2 z-50 w-72 rounded-[6px] steel-plate p-3.5 shadow-[0_20px_48px_rgba(0,0,0,0.92)] ${
            align === 'right' ? 'right-0' : 'left-0'
          }`}
        >
          <CornerRivets inset="sm" tone="rift" />

          <div className="flex items-center justify-between gap-2 pb-2.5 border-b border-[#2f3843]">
            <span className="font-display text-xs font-semibold uppercase tracking-[0.1em] text-[#f2e8da]">
              Аудио-пульт
            </span>
            <button
              type="button"
              onClick={() => sound.toggleMute()}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium border transition-colors cursor-pointer ${
                settings.isMuted
                  ? 'bg-[#2a1518] border-[#7a333b] text-[#f08b82]'
                  : 'bg-[#122630] border-[#386a7d] text-[#84d2ea]'
              }`}
            >
              {settings.isMuted ? 'Звук выкл' : 'Звук вкл'}
            </button>
          </div>

          <div
            className={`mt-3 space-y-3 transition-opacity ${
              settings.isMuted ? 'opacity-45' : 'opacity-100'
            }`}
          >
            {/* Channel 1: Atmospheric Music */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sound.updateSettings({
                      musicEnabled: !settings.musicEnabled,
                      isMuted: false,
                    });
                    sound.playUiClick();
                  }}
                  className="flex items-center gap-1.5 text-left cursor-pointer group"
                >
                  <Music
                    className={`w-3.5 h-3.5 ${
                      settings.musicEnabled ? 'text-[#84d2ea]' : 'text-[#6c7682]'
                    }`}
                  />
                  <span
                    className={
                      settings.musicEnabled
                        ? 'text-[#ebe3d6] group-hover:text-white'
                        : 'text-[#828d99] line-through'
                    }
                  >
                    Атмосфера и музыка
                  </span>
                </button>
                <span className="font-led text-[10px] text-[#98a6b5] tabular-nums">
                  {settings.musicEnabled
                    ? `${Math.round(settings.musicVolume * 100)}%`
                    : 'ВЫКЛ'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.musicVolume * 100)}
                onChange={(e) =>
                  sound.updateSettings({
                    musicVolume: Number(e.target.value) / 100,
                    musicEnabled: Number(e.target.value) > 0,
                    isMuted: false,
                  })
                }
                aria-label="Громкость музыки и атмосферы"
                className="w-full h-1.5 rounded-[2px] appearance-none bg-[#10151b] border border-[#2b3440] accent-[#63bcd8] cursor-pointer"
              />
            </div>

            {/* Channel 2: Combat & UI SFX */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    const next = !settings.sfxEnabled;
                    sound.updateSettings({
                      sfxEnabled: next,
                      isMuted: false,
                    });
                    if (next) sound.playCardStage();
                  }}
                  className="flex items-center gap-1.5 text-left cursor-pointer group"
                >
                  <Swords
                    className={`w-3.5 h-3.5 ${
                      settings.sfxEnabled ? 'text-[#f09e6c]' : 'text-[#6c7682]'
                    }`}
                  />
                  <span
                    className={
                      settings.sfxEnabled
                        ? 'text-[#ebe3d6] group-hover:text-white'
                        : 'text-[#828d99] line-through'
                    }
                  >
                    Эффекты боя
                  </span>
                </button>
                <span className="font-led text-[10px] text-[#98a6b5] tabular-nums">
                  {settings.sfxEnabled
                    ? `${Math.round(settings.sfxVolume * 100)}%`
                    : 'ВЫКЛ'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.sfxVolume * 100)}
                onChange={(e) =>
                  sound.updateSettings({
                    sfxVolume: Number(e.target.value) / 100,
                    sfxEnabled: Number(e.target.value) > 0,
                    isMuted: false,
                  })
                }
                aria-label="Громкость эффектов боя"
                className="w-full h-1.5 rounded-[2px] appearance-none bg-[#10151b] border border-[#2b3440] accent-[#e38a54] cursor-pointer"
              />
            </div>

            {/* Channel 3: Campaign Voice Acting */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between gap-2 text-xs">
                <button
                  type="button"
                  onClick={() => {
                    sound.updateSettings({
                      voiceEnabled: !settings.voiceEnabled,
                      isMuted: false,
                    });
                    sound.playUiClick();
                  }}
                  className="flex items-center gap-1.5 text-left cursor-pointer group"
                >
                  {settings.voiceEnabled ? (
                    <Mic className="w-3.5 h-3.5 text-[#4ade80]" />
                  ) : (
                    <MicOff className="w-3.5 h-3.5 text-[#6c7682]" />
                  )}
                  <span
                    className={
                      settings.voiceEnabled
                        ? 'text-[#ebe3d6] group-hover:text-white'
                        : 'text-[#828d99] line-through'
                    }
                  >
                    Озвучка кампании
                  </span>
                </button>
                <span className="font-led text-[10px] text-[#98a6b5] tabular-nums">
                  {settings.voiceEnabled
                    ? `${Math.round(settings.voiceVolume * 100)}%`
                    : 'ВЫКЛ'}
                </span>
              </div>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(settings.voiceVolume * 100)}
                onChange={(e) =>
                  sound.updateSettings({
                    voiceVolume: Number(e.target.value) / 100,
                    voiceEnabled: Number(e.target.value) > 0,
                    isMuted: false,
                  })
                }
                aria-label="Громкость озвучки диалогов"
                className="w-full h-1.5 rounded-[2px] appearance-none bg-[#10151b] border border-[#2b3440] accent-[#4ade80] cursor-pointer"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
