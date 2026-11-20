import React from 'react';
import { CardSide } from '../types/game';
import { GameButton } from './GameButton';
import { AudioControlsButton } from './AudioControlsButton';
import { MenuBackground } from './MenuBackground';
import { CornerRivets, LedCounter, RiftDivider } from './TacticalChrome';
import { RESISTANCE_CARD_BACK, DARK_SIDE_CARD_BACK } from '../data/cardBacks';
import {
  Shield,
  Skull,
  Lock,
  ArrowRight,
  BookOpen,
} from 'lucide-react';

interface CampaignFactionSelectProps {
  resistanceCompletedCount: number;
  resistanceTotalStages: number;
  onSelectFaction: (side: CardSide) => void;
  onBackToMenu: () => void;
  onOpenRules: () => void;
}

export const CampaignFactionSelect: React.FC<CampaignFactionSelectProps> = ({
  resistanceCompletedCount,
  resistanceTotalStages,
  onSelectFaction,
  onBackToMenu,
  onOpenRules,
}) => {
  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#090b0e] text-[#e6dac9] flex flex-col select-none">
      {/* Background artwork */}
      <MenuBackground tone="dim" />

      {/* Slim Brushed-Steel Command Bar */}
      <header className="relative z-20 h-11 px-3 sm:px-4 steel-bar border-x-0 border-t-0 border-b-[#343d47] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <GameButton variant="secondary" size="xs" onClick={onBackToMenu}>
            ← Меню
          </GameButton>
          <div className="h-4 w-px bg-[#38414b] shrink-0" />
          <h1 className="font-display text-xs sm:text-sm font-semibold text-[#efe5d7] uppercase tracking-[0.1em] truncate">
            Кампания · Выбор стороны
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <AudioControlsButton />
          <GameButton variant="secondary" size="xs" onClick={onOpenRules}>
            <BookOpen className="w-3.5 h-3.5 text-[#d9c9b4]" />
            <span className="hidden sm:inline">Правила</span>
          </GameButton>
        </div>
      </header>

      {/* Main Faction Selection Grid */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto steel-scrollbar flex flex-col items-center justify-center p-4 sm:p-6">
        <div className="w-full max-w-3xl flex flex-col items-center">
          <div className="text-center mb-6 sm:mb-8">
            <div className="font-led text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#98a3af] mb-1.5">
              Режим кампании
            </div>
            <h2 className="font-display text-2xl sm:text-4xl font-bold uppercase tracking-[0.09em] text-[#f4eadc] drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)]">
              Выберите сторону конфликта
            </h2>
            <RiftDivider className="w-60 sm:w-80 mx-auto my-2.5" />
            <p className="text-xs sm:text-sm text-[#b7c0ca] max-w-lg mx-auto">
              Проходите последовательные этапы на карте сражений с уникальными составами отрядов и нарастающей сложностью.
            </p>
          </div>

          <div className="w-full grid grid-cols-1 md:grid-cols-2 gap-4 sm:gap-5 items-stretch">
            {/* Resistance Faction (Playable) */}
            <div className="relative steel-plate rounded-[6px] border-[#4b8194] p-5 flex flex-col justify-between overflow-hidden group transition-transform duration-150 hover:-translate-y-[2px]">
              <CornerRivets tone="rift" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-14 w-56 h-56 rounded-full bg-[#4cb5d6]/15 blur-3xl"
              />

              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 btn-chamfer steel-recessed border-[#5bb8d6] flex items-center justify-center text-[#84d2ea] shrink-0">
                      <Shield className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="text-[11px] font-led uppercase tracking-[0.14em] text-[#84d2ea]">
                        Доступно
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-[0.07em] text-[#eef8fb]">
                        Сопротивление
                      </h3>
                    </div>
                  </div>
                  <img
                    src={RESISTANCE_CARD_BACK}
                    alt="Рубашка карт Сопротивления"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-12 h-[72px] object-cover rounded-[4px] border border-[#5a8699]/80 shadow-[0_6px_14px_rgba(0,0,0,0.75)] shrink-0"
                  />
                </div>

                <p className="text-xs sm:text-sm text-[#c4cfd9] leading-relaxed">
                  Сюжетная кампания из {resistanceTotalStages} этапов: от нападения Демона на лагерь Сопротивления через встречу с Вампиром и призраками до скрытного прорыва к Разлому и финальной битвы с Боевыми роботами.
                </p>

                <div className="p-3 rounded-[4px] steel-recessed flex items-center justify-between gap-2 text-xs">
                  <span className="font-display uppercase tracking-[0.08em] text-[#9eb0bd]">
                    Пройдено этапов
                  </span>
                  <div className="flex items-center gap-1.5">
                    <LedCounter
                      value={`${resistanceCompletedCount}/${resistanceTotalStages}`}
                      size="sm"
                    />
                  </div>
                </div>
              </div>

              <div className="relative z-10 pt-5">
                <GameButton
                  variant="emerald"
                  size="lg"
                  fullWidth
                  withOrnaments
                  onClick={() => onSelectFaction('resistance')}
                >
                  <span>Открыть карту</span>
                  <ArrowRight className="w-4 h-4" />
                </GameButton>
              </div>
            </div>

            {/* Dark Side Faction (In Development) */}
            <div className="relative steel-plate rounded-[6px] border-[#4d2f33] p-5 flex flex-col justify-between overflow-hidden opacity-80">
              <CornerRivets tone="dark" />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute -top-20 -right-14 w-56 h-56 rounded-full bg-[#b8362e]/10 blur-3xl"
              />

              <div className="relative z-10 space-y-4">
                <div className="flex items-start justify-between gap-3">
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 btn-chamfer steel-recessed border-[#633439] flex items-center justify-center text-[#b35c55] shrink-0">
                      <Skull className="w-6 h-6" />
                    </div>
                    <div>
                      <div className="flex items-center gap-1.5 text-[11px] font-led uppercase tracking-[0.14em] text-[#d48b78]">
                        <Lock className="w-3 h-3" />
                        <span>В разработке</span>
                      </div>
                      <h3 className="font-display text-xl sm:text-2xl font-bold uppercase tracking-[0.07em] text-[#c7b9b5]">
                        Тёмная сторона
                      </h3>
                    </div>
                  </div>
                  <img
                    src={DARK_SIDE_CARD_BACK}
                    alt="Рубашка карт Тёмной стороны"
                    referrerPolicy="no-referrer"
                    draggable={false}
                    className="w-12 h-[72px] object-cover rounded-[4px] border border-[#6e2d35]/70 shadow-[0_6px_14px_rgba(0,0,0,0.75)] grayscale opacity-65 shrink-0"
                  />
                </div>

                <p className="text-xs sm:text-sm text-[#989ea6] leading-relaxed">
                  Сюжетная кампания за нежить, тёмную магию, болезни и Демона сейчас находится в разработке. Пока силы Тьмы доступны в режиме «Битва».
                </p>

                <div className="p-3 rounded-[4px] steel-recessed flex items-center justify-between gap-2 text-xs text-[#88919b]">
                  <span className="font-display uppercase tracking-[0.08em]">
                    Статус кампании
                  </span>
                  <span className="font-led text-[11px] uppercase tracking-wider text-[#d48b78]">
                    В разработке
                  </span>
                </div>
              </div>

              <div className="relative z-10 pt-5">
                <GameButton
                  variant="secondary"
                  size="lg"
                  fullWidth
                  disabled
                >
                  <Lock className="w-4 h-4" />
                  <span>В разработке</span>
                </GameButton>
              </div>
            </div>
          </div>
        </div>
      </main>
    </div>
  );
};
