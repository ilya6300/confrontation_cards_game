import React from 'react';
import { EyeOff, ArrowRight } from 'lucide-react';
import { GameButton } from './GameButton';
import { CornerRivets, RiftDivider } from './TacticalChrome';
import { DEFAULT_GAME_BACKGROUND } from '../data/backgrounds';

interface PassDeviceScreenProps {
  nextPlayerName: string;
  nextPlayerSide: 'resistance' | 'dark_side';
  flipBackground?: boolean;
  onContinue: () => void;
}

export const PassDeviceScreen: React.FC<PassDeviceScreenProps> = ({
  nextPlayerName,
  nextPlayerSide,
  flipBackground = false,
  onContinue,
}) => {
  const isDarkSide = nextPlayerSide === 'dark_side';

  return (
    <div className="relative h-dvh w-full flex items-center justify-center p-4 overflow-hidden bg-[#090b0e] text-[#e6dac9]">
      <div
        aria-hidden="true"
        style={{ backgroundImage: `url(${DEFAULT_GAME_BACKGROUND})` }}
        className={`pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat ${
          flipBackground ? 'rotate-180' : ''
        }`}
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[#07090d]/88 backdrop-blur-sm"
      />

      <div
        className={`relative z-10 w-full max-w-md p-6 rounded-[6px] steel-plate flex flex-col items-center text-center space-y-5 ${
          isDarkSide ? 'border-[#733238]' : 'border-[#487585]'
        }`}
      >
        <CornerRivets tone={isDarkSide ? 'dark' : 'rift'} />

        <div
          className={`w-14 h-14 btn-chamfer steel-recessed flex items-center justify-center ${
            isDarkSide
              ? 'border-[#b84644] text-[#eb6e65]'
              : 'border-[#5eb9d6] text-[#84d2ea]'
          }`}
        >
          <EyeOff className="w-7 h-7" />
        </div>

        <div className="space-y-2 w-full">
          <div className="font-led text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#98a3af]">
            Скрытый выбор сделан
          </div>
          <h2 className="font-display text-xl sm:text-2xl font-semibold uppercase tracking-[0.08em] text-[#efe5d7]">
            Передайте устройство
          </h2>
          <RiftDivider className="w-44 mx-auto my-2" />
          <div className="p-3 rounded-[4px] steel-recessed">
            <span className="text-[11px] text-[#98a3af] block mb-0.5 uppercase tracking-wider font-display">
              Ход делает
            </span>
            <span
              className={`font-display font-semibold text-base uppercase tracking-[0.08em] ${
                isDarkSide ? 'text-[#eb6e65]' : 'text-[#84d2ea]'
              }`}
            >
              {nextPlayerName}
            </span>
          </div>
        </div>

        <p className="text-xs text-[#a9b3be] leading-relaxed max-w-xs">
          Выбор первого игрока надёжно скрыт. Нажмите кнопку ниже только тогда, когда устройство находится в руках нужного игрока.
        </p>

        <GameButton
          variant={isDarkSide ? 'crimson' : 'emerald'}
          size="lg"
          fullWidth
          withOrnaments
          onClick={onContinue}
        >
          <span>Я готов, показать карты</span>
          <ArrowRight className="w-4 h-4" />
        </GameButton>
      </div>
    </div>
  );
};
