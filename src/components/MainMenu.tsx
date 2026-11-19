import React, { useState } from 'react';
import { GameMode, CardSide } from '../types/game';
import { GameButton } from './GameButton';
import { CornerRivets, RiftDivider } from './TacticalChrome';
import { START_MENU_BACKGROUND } from '../data/backgrounds';
import {
  Skull,
  Swords,
  Users,
  Bot,
  BookOpen,
  Play,
  Shield,
  Map as MapIcon,
} from 'lucide-react';

interface MainMenuProps {
  hasSavedGame: boolean;
  savedGameLabel?: string;
  campaignCompletedCount: number;
  campaignTotalStages: number;
  onOpenCampaign: () => void;
  onNewGame: (mode: GameMode, playerSide: CardSide) => void;
  onResumeGame: () => void;
  onOpenRules: () => void;
}

export const MainMenu: React.FC<MainMenuProps> = ({
  hasSavedGame,
  savedGameLabel,
  campaignCompletedCount,
  campaignTotalStages,
  onOpenCampaign,
  onNewGame,
  onResumeGame,
  onOpenRules,
}) => {
  const [showBattleSetup, setShowBattleSetup] = useState(false);
  const [selectedSide, setSelectedSide] = useState<CardSide>('resistance');

  return (
    <div className="relative h-dvh w-full flex flex-col items-center justify-center p-3 sm:p-4 overflow-hidden bg-[#090b0e] text-[#e6dac9]">
      {/* Start Menu Artwork Background — brightened with subtle multi-directional drift */}
      <div
        aria-hidden="true"
        style={{ backgroundImage: `url(${START_MENU_BACKGROUND})` }}
        className="pointer-events-none absolute -inset-4 bg-cover bg-center bg-no-repeat brightness-[1.14] contrast-[1.04] animate-menu-bg-drift"
      />

      {/* Light atmospheric edge scrim keeping the artwork bright and vivid while preserving text legibility */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,14,0.14)_0%,rgba(7,9,13,0.32)_66%,rgba(5,6,9,0.58)_100%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07090d]/42 via-transparent to-[#06080b]/58"
      />

      {/* Main Container */}
      <div className="relative z-10 w-full max-w-lg flex flex-col items-center text-center">
        {/* Title Lockup */}
        <div className="mb-6 sm:mb-7 w-full flex flex-col items-center">
          <div className="flex items-center justify-center gap-3 w-full max-w-xs mb-2">
            <span className="h-px flex-1 bg-gradient-to-r from-transparent to-[#6e7b88]/70" />
            <span className="font-led text-[10px] sm:text-[11px] font-semibold tracking-[0.22em] text-[#c5ced8] uppercase drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
              Карточная стратегия
            </span>
            <span className="h-px flex-1 bg-gradient-to-l from-transparent to-[#a85534]/70" />
          </div>

          <h1 className="font-display text-4xl sm:text-5xl md:text-6xl font-bold tracking-[0.11em] uppercase text-transparent bg-clip-text bg-gradient-to-b from-[#f8f0e4] via-[#dfd0bc] to-[#988a7a] drop-shadow-[0_4px_18px_rgba(0,0,0,0.98)]">
            ПРОТИВОСТОЯНИЕ
          </h1>

          <RiftDivider className="w-64 sm:w-80 my-2.5" />

          <p className="font-display text-xs sm:text-sm tracking-[0.18em] uppercase drop-shadow-[0_2px_8px_rgba(0,0,0,0.98)]">
            <span className="text-[#8ad1ea]">Сопротивление</span>
            <span className="text-[#b3bcc5] mx-2">против</span>
            <span className="text-[#ee7b5c]">Тёмной стороны</span>
          </p>
        </div>

        {/* Mode Selection or Battle Setup */}
        {!showBattleSetup ? (
          <div className="relative steel-plate rounded-[6px] p-4 sm:p-5 w-full max-w-sm space-y-3 text-left">
            <CornerRivets inset="sm" />

            {hasSavedGame && (
              <div className="pb-1">
                <GameButton
                  variant="emerald"
                  size="lg"
                  fullWidth
                  withOrnaments
                  onClick={onResumeGame}
                >
                  <Play className="w-4 h-4 fill-current" />
                  <span>
                    Продолжить{savedGameLabel ? ` · ${savedGameLabel}` : ''}
                  </span>
                </GameButton>
              </div>
            )}

            {/* Mode 1: Кампания */}
            <button
              type="button"
              onClick={onOpenCampaign}
              className="w-full group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80]/80"
            >
              <span className="btn-chamfer block p-[1.5px] bg-gradient-to-b from-[#e4a67d] via-[#9e4724] to-[#3b190d] group-hover:from-[#f0ba94] group-hover:via-[#b8552d] group-hover:to-[#4a2011] transition-all">
                <span className="btn-chamfer relative overflow-hidden p-3.5 bg-gradient-to-b from-[#312018] via-[#211613] to-[#140e0d] group-hover:from-[#3d261c] group-hover:via-[#291a16] group-hover:to-[#18100e] flex items-center justify-between gap-3 transition-colors">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[#f5ebe0]/22"
                  />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 btn-chamfer-sm steel-recessed border-[#8a4527] flex items-center justify-center text-[#f09e6c] shrink-0">
                      <MapIcon className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base text-[#f6ece0] uppercase tracking-[0.08em]">
                        Кампания
                      </div>
                      <div className="text-[11px] text-[#c5b9aa] leading-snug">
                        Карта этапов · Пройдено {campaignCompletedCount} из{' '}
                        {campaignTotalStages}
                      </div>
                    </div>
                  </div>
                  <span className="font-display text-xs text-[#f09e6c] font-semibold uppercase tracking-[0.1em] shrink-0 whitespace-nowrap">
                    Карта →
                  </span>
                </span>
              </span>
            </button>

            {/* Mode 2: Битва */}
            <button
              type="button"
              onClick={() => setShowBattleSetup(true)}
              className="w-full group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c6e0]/80"
            >
              <span className="btn-chamfer block p-[1.5px] bg-gradient-to-b from-[#8bd2de] via-[#347c87] to-[#122e33] group-hover:from-[#a8e2ec] group-hover:via-[#4295a1] group-hover:to-[#183d44] transition-all">
                <span className="btn-chamfer relative overflow-hidden p-3.5 bg-gradient-to-b from-[#172c34] via-[#112026] to-[#0b151a] group-hover:from-[#1d3741] group-hover:via-[#152830] group-hover:to-[#0e1b21] flex items-center justify-between gap-3 transition-colors">
                  <span
                    aria-hidden="true"
                    className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[#f5ebe0]/22"
                  />
                  <div className="flex items-center gap-3 min-w-0">
                    <div className="w-10 h-10 btn-chamfer-sm steel-recessed border-[#3c7382] flex items-center justify-center text-[#84d2ea] shrink-0">
                      <Swords className="w-5 h-5" />
                    </div>
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-base text-[#eef8fb] uppercase tracking-[0.08em]">
                        Битва
                      </div>
                      <div className="text-[11px] text-[#a7bec7] leading-snug">
                        Свободный бой · Бот или 2 игрока
                      </div>
                    </div>
                  </div>
                  <span className="font-display text-xs text-[#84d2ea] font-semibold uppercase tracking-[0.1em] shrink-0 whitespace-nowrap">
                    Выбрать →
                  </span>
                </span>
              </span>
            </button>

            <div className="pt-1">
              <GameButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={onOpenRules}
              >
                <BookOpen className="w-4 h-4 text-[#8ad1ea]" />
                <span>Правила игры</span>
              </GameButton>
            </div>
          </div>
        ) : (
          /* Battle Setup Screen — Bolted Gunmetal Command Panel */
          <div className="relative w-full max-w-md p-5 rounded-[6px] steel-plate space-y-4 text-left">
            <CornerRivets />

            <div className="flex items-center justify-between border-b border-[#323a44] pb-3">
              <h2 className="font-display text-base sm:text-lg font-semibold text-[#ece2d3] uppercase tracking-[0.09em]">
                Параметры битвы
              </h2>
              <GameButton
                variant="secondary"
                size="xs"
                onClick={() => setShowBattleSetup(false)}
              >
                ← Назад
              </GameButton>
            </div>

            {/* Side selection */}
            <div className="space-y-2">
              <label className="text-[11px] font-semibold text-[#9aa4b0] uppercase tracking-[0.12em] block">
                Сторона первого игрока
              </label>
              <div className="grid grid-cols-2 gap-2.5">
                <button
                  type="button"
                  onClick={() => setSelectedSide('resistance')}
                  className="group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c6e0]/80"
                >
                  <span
                    className={`btn-chamfer-sm block p-[1.5px] bg-gradient-to-b transition-all ${
                      selectedSide === 'resistance'
                        ? 'from-[#94d9ef] via-[#438ea8] to-[#17323d]'
                        : 'from-[#56606c] via-[#343b43] to-[#15181d] group-hover:from-[#79bed6]/75 group-hover:to-[#1a2830]'
                    }`}
                  >
                    <span
                      className={`btn-chamfer-sm block p-3 transition-colors ${
                        selectedSide === 'resistance'
                          ? 'bg-gradient-to-b from-[#1a333e] via-[#132229] to-[#0c1419] text-[#eaf7fb]'
                          : 'bg-gradient-to-b from-[#1d2228] via-[#14181d] to-[#0e1014] text-[#9ea7b2] group-hover:text-[#e2d6c5]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Shield
                          className={`w-3.5 h-3.5 shrink-0 ${
                            selectedSide === 'resistance'
                              ? 'text-[#7fd0ea]'
                              : 'text-[#6c7885]'
                          }`}
                        />
                        <span className="font-display font-semibold text-xs uppercase tracking-[0.06em]">
                          Сопротивление
                        </span>
                      </div>
                      <div className="text-[10px] leading-snug text-[#9ba5b0]">
                        12 карт людей, техники и науки
                      </div>
                    </span>
                  </span>
                </button>

                <button
                  type="button"
                  onClick={() => setSelectedSide('dark_side')}
                  className="group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.985] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df6d52]/80"
                >
                  <span
                    className={`btn-chamfer-sm block p-[1.5px] bg-gradient-to-b transition-all ${
                      selectedSide === 'dark_side'
                        ? 'from-[#e89179] via-[#9e312d] to-[#361013]'
                        : 'from-[#56606c] via-[#343b43] to-[#15181d] group-hover:from-[#c75447]/75 group-hover:to-[#291316]'
                    }`}
                  >
                    <span
                      className={`btn-chamfer-sm block p-3 transition-colors ${
                        selectedSide === 'dark_side'
                          ? 'bg-gradient-to-b from-[#34161a] via-[#221014] to-[#140a0d] text-[#f9ebe6]'
                          : 'bg-gradient-to-b from-[#1d2228] via-[#14181d] to-[#0e1014] text-[#9ea7b2] group-hover:text-[#e2d6c5]'
                      }`}
                    >
                      <div className="flex items-center gap-1.5 mb-1">
                        <Skull
                          className={`w-3.5 h-3.5 shrink-0 ${
                            selectedSide === 'dark_side'
                              ? 'text-[#ea6b54]'
                              : 'text-[#6c7885]'
                          }`}
                        />
                        <span className="font-display font-semibold text-xs uppercase tracking-[0.06em]">
                          Тёмная сторона
                        </span>
                      </div>
                      <div className="text-[10px] leading-snug text-[#9ba5b0]">
                        12 карт созданий, магии и бедствий
                      </div>
                    </span>
                  </span>
                </button>
              </div>
            </div>

            {/* Game mode choice */}
            <div className="space-y-2.5 pt-0.5">
              <label className="text-[11px] font-semibold text-[#9aa4b0] uppercase tracking-[0.12em] block">
                Формат битвы
              </label>

              <button
                type="button"
                onClick={() => onNewGame('bot', selectedSide)}
                className="w-full group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#e08b5c]/80"
              >
                <span className="btn-chamfer block p-[1.5px] bg-gradient-to-b from-[#66707c] via-[#3b424b] to-[#181c21] group-hover:from-[#e6a47a] group-hover:via-[#9d4623] group-hover:to-[#3c190d] transition-all">
                  <span className="btn-chamfer relative overflow-hidden p-3.5 bg-gradient-to-b from-[#1f242b] via-[#15191e] to-[#0e1115] group-hover:from-[#2b1f1a] group-hover:via-[#1a1617] group-hover:to-[#110f11] flex items-center justify-between transition-colors">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[#f5ebe0]/18"
                    />
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 btn-chamfer-sm steel-recessed border-[#4a5a68] flex items-center justify-center text-[#7fd0ea] group-hover:text-[#ec9a6c] shrink-0 transition-colors">
                        <Bot className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-sm text-[#ece2d3] uppercase tracking-[0.06em] group-hover:text-[#f6ece0]">
                          Игра против бота
                        </div>
                        <div className="text-[11px] text-[#9ba5b0]">
                          Быстрая тактическая партия против ИИ
                        </div>
                      </div>
                    </div>
                    <span className="font-display text-xs text-[#e08a58] font-semibold uppercase tracking-[0.1em] shrink-0 ml-2 whitespace-nowrap">
                      В бой →
                    </span>
                  </span>
                </span>
              </button>

              <button
                type="button"
                onClick={() => onNewGame('pvp_local', selectedSide)}
                className="w-full group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#d9534f]/80"
              >
                <span className="btn-chamfer block p-[1.5px] bg-gradient-to-b from-[#66707c] via-[#3b424b] to-[#181c21] group-hover:from-[#e08686] group-hover:via-[#8f242b] group-hover:to-[#320b0e] transition-all">
                  <span className="btn-chamfer relative overflow-hidden p-3.5 bg-gradient-to-b from-[#1f242b] via-[#15191e] to-[#0e1115] group-hover:from-[#2c171b] group-hover:via-[#1a1316] group-hover:to-[#110d10] flex items-center justify-between transition-colors">
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-3 top-0 h-px bg-[#f5ebe0]/18"
                    />
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-9 h-9 btn-chamfer-sm steel-recessed border-[#5a3438] flex items-center justify-center text-[#e06d67] shrink-0">
                        <Users className="w-5 h-5" />
                      </div>
                      <div className="min-w-0">
                        <div className="font-display font-semibold text-sm text-[#ece2d3] uppercase tracking-[0.06em] group-hover:text-[#f7e9e7]">
                          Два игрока за одним экраном
                        </div>
                        <div className="text-[11px] text-[#9ba5b0]">
                          Скрытый выбор при передаче устройства (Hotseat)
                        </div>
                      </div>
                    </div>
                    <span className="font-display text-xs text-[#e06d67] font-semibold uppercase tracking-[0.1em] shrink-0 ml-2 whitespace-nowrap">
                      В бой →
                    </span>
                  </span>
                </span>
              </button>
            </div>
          </div>
        )}

        {/* Footer info */}
        <div className="mt-7 px-3.5 py-1.5 rounded-[4px] bg-[#090c11]/55 backdrop-blur-[2px] text-[11px] text-[#e1e6ec] drop-shadow-[0_1px_6px_rgba(0,0,0,0.98)] space-y-0.5">
          <div>Цель: истощить руку противника не более чем за 10 ходов.</div>
          <div className="text-[#b8c2cc]">Прогресс кампании и текущей партии сохраняется автоматически.</div>
        </div>
      </div>
    </div>
  );
};
