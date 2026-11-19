import React, { useEffect, useState } from 'react';
import { CardDefinition, CardSide } from '../types/game';
import { CAMPAIGN_MAP_BACKGROUND } from '../data/backgrounds';
import {
  CampaignStageConfig,
  getActiveUncompletedStageId,
  isCampaignStageUnlocked,
  resolveCampaignCards,
} from '../data/campaign';
import { GameButton } from './GameButton';
import { CornerRivets, LedCounter, RiftDivider } from './TacticalChrome';
import {
  BookOpen,
  Check,
  Lock,
  RotateCcw,
  Shield,
  Skull,
  Swords,
  Volume2,
  VolumeX,
  Info,
} from 'lucide-react';

interface CampaignMapProps {
  side: CardSide;
  stages: CampaignStageConfig[];
  completedStageIds: number[];
  isMuted: boolean;
  onToggleMute: () => void;
  onStartStage: (stage: CampaignStageConfig) => void;
  onInspectCard: (card: CardDefinition, ownerLabel: string) => void;
  onBackToFactions: () => void;
  onBackToMenu: () => void;
  onOpenRules: () => void;
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  side,
  stages,
  completedStageIds,
  isMuted,
  onToggleMute,
  onStartStage,
  onInspectCard,
  onBackToFactions,
  onBackToMenu,
  onOpenRules,
}) => {
  const activeStageId = getActiveUncompletedStageId(stages, completedStageIds);

  const [selectedStageId, setSelectedStageId] = useState<number>(() => {
    if (activeStageId !== null) return activeStageId;
    return stages[stages.length - 1]?.id ?? 1;
  });

  // Sync default focus to the newly unlocked active stage when progress advances
  useEffect(() => {
    if (activeStageId !== null) {
      setSelectedStageId(activeStageId);
    }
  }, [activeStageId]);

  const selectedStage =
    stages.find((s) => s.id === selectedStageId) ?? stages[0];
  const isSelectedCompleted = selectedStage
    ? completedStageIds.includes(selectedStage.id)
    : false;
  const isSelectedActive = selectedStage
    ? selectedStage.id === activeStageId
    : false;

  const playerCards = selectedStage
    ? resolveCampaignCards(selectedStage.playerCardIds)
    : [];
  const enemyCards = selectedStage
    ? resolveCampaignCards(selectedStage.enemyCardIds)
    : [];

  const allCompleted =
    stages.length > 0 && completedStageIds.length >= stages.length;

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#090b0e] text-[#e6dac9] flex flex-col select-none">
      {/* Top Brushed-Steel Command Header */}
      <header className="h-11 px-3 sm:px-4 steel-bar border-x-0 border-t-0 border-b-[#343d47] flex items-center justify-between gap-2 z-30 shrink-0">
        <div className="flex items-center gap-1.5 sm:gap-2.5 min-w-0">
          <GameButton variant="secondary" size="xs" onClick={onBackToFactions}>
            ← Стороны
          </GameButton>
          <GameButton
            variant="secondary"
            size="xs"
            onClick={onBackToMenu}
            className="hidden sm:inline-flex"
          >
            Меню
          </GameButton>
          <div className="h-4 w-px bg-[#38414b] shrink-0" />
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="font-display text-xs sm:text-sm font-semibold text-[#efe5d7] uppercase tracking-[0.09em] truncate">
              Кампания · {side === 'resistance' ? 'Сопротивление' : 'Тёмная сторона'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <div className="flex items-center gap-1.5 text-[11px] text-[#b4bec8] mr-1">
            <span className="hidden sm:inline font-display uppercase tracking-[0.08em]">
              {allCompleted ? 'Все пройдены' : 'Пройдено'}
            </span>
            <LedCounter
              value={`${completedStageIds.length}/${stages.length}`}
              size="xs"
            />
          </div>

          <GameButton
            variant="secondary"
            size="xs"
            onClick={onToggleMute}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-[#8a94a0]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#84d2ea]" />
            )}
          </GameButton>

          <GameButton variant="secondary" size="xs" onClick={onOpenRules}>
            <BookOpen className="w-3.5 h-3.5 text-[#d9c9b4]" />
            <span className="hidden sm:inline">Правила</span>
          </GameButton>
        </div>
      </header>

      {/* Main Layout: Full-Bleed Tactical Map + Docked Stage Briefing */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col lg:block overflow-hidden">
        {/* Interactive Map Canvas */}
        <div className="relative flex-1 lg:h-full w-full min-h-0 overflow-hidden">
          {/* Map Background Image */}
          <div
            aria-hidden="true"
            style={{ backgroundImage: `url(${CAMPAIGN_MAP_BACKGROUND})` }}
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          />

          {/* Subtle Perimeter Vignette preserving vivid battlefield terrain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,14,0.06)_38%,rgba(6,8,11,0.68)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#07090d]/70 to-transparent"
          />

          {/* Top-Left Compact Campaign Status Plaque */}
          <div className="absolute top-3 left-3 sm:top-4 sm:left-4 z-20 pointer-events-none">
            <div className="steel-bar rounded-[4px] px-3 py-1.5 flex items-center gap-2.5 text-xs">
              <Shield className="w-4 h-4 text-[#84d2ea] shrink-0" />
              <div className="leading-tight">
                <div className="font-display font-semibold uppercase tracking-[0.08em] text-[#efe5d7]">
                  Карта боевых действий
                </div>
                <div className="text-[11px] text-[#a7b3bf]">
                  {activeStageId !== null
                    ? `Активный этап: ${activeStageId} · Пройденные этапы можно переиграть`
                    : 'Все этапы пройдены · Выберите любой этап для повтора'}
                </div>
              </div>
            </div>
          </div>

          {/* SVG Tactical Route Connecting Stages 1 -> 2 -> 3 -> 4 */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 w-full h-full z-10"
          >
            <defs>
              <filter id="routeGlow" x="-20%" y="-20%" width="140%" height="140%">
                <feGaussianBlur stdDeviation="0.6" result="blur" />
                <feMerge>
                  <feMergeNode in="blur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>
            {stages.slice(0, -1).map((stage, idx) => {
              const nextStage = stages[idx + 1];
              const x1 = stage.mapPosition.x;
              const y1 = stage.mapPosition.y;
              const x2 = nextStage.mapPosition.x;
              const y2 = nextStage.mapPosition.y;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2 - (idx % 2 === 0 ? 4 : -4);
              const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

              const isSegmentCompleted =
                completedStageIds.includes(stage.id) &&
                completedStageIds.includes(nextStage.id);
              const isSegmentLeadingToActive =
                completedStageIds.includes(stage.id) &&
                nextStage.id === activeStageId;

              return (
                <g key={`route-${stage.id}-${nextStage.id}`}>
                  {/* Dark tactical under-stroke for terrain separation */}
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(6,8,12,0.85)"
                    strokeWidth="1.25"
                    vectorEffect="non-scaling-stroke"
                  />
                  {/* Main styled route stroke */}
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      isSegmentCompleted
                        ? '#67c2de'
                        : isSegmentLeadingToActive
                        ? '#4ade80'
                        : 'rgba(130,144,158,0.45)'
                    }
                    strokeWidth={
                      isSegmentCompleted || isSegmentLeadingToActive ? '0.6' : '0.45'
                    }
                    strokeDasharray={
                      isSegmentCompleted ? undefined : '2.2 1.8'
                    }
                    vectorEffect="non-scaling-stroke"
                    filter={
                      isSegmentCompleted || isSegmentLeadingToActive
                        ? 'url(#routeGlow)'
                        : undefined
                    }
                  />
                </g>
              );
            })}
          </svg>

          {/* 4 Interactive Campaign Stage Nodes */}
          {stages.map((stage) => {
            const unlocked = isCampaignStageUnlocked(
              stage.id,
              completedStageIds
            );
            const completed = completedStageIds.includes(stage.id);
            const isActiveUncompleted = stage.id === activeStageId;
            const isSelected = stage.id === selectedStageId;

            const statusText = isActiveUncompleted
              ? 'Активен'
              : completed
              ? 'Пройден'
              : 'Закрыт';

            return (
              <div
                key={stage.id}
                style={{
                  left: `${stage.mapPosition.x}%`,
                  top: `${stage.mapPosition.y}%`,
                }}
                className="absolute -translate-x-1/2 -translate-y-1/2 z-20 flex flex-col items-center"
              >
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) {
                      setSelectedStageId(stage.id);
                    }
                  }}
                  onDoubleClick={() => {
                    if (unlocked) {
                      onStartStage(stage);
                    }
                  }}
                  title={
                    unlocked
                      ? `Этап ${stage.id}: ${stage.title}`
                      : `Сначала пройдите этап ${stage.id - 1}`
                  }
                  aria-label={`Этап ${stage.id}: ${stage.title} (${statusText})`}
                  aria-pressed={isSelected}
                  className={`group relative flex items-center justify-center w-14 h-14 sm:w-16 sm:h-16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] rounded-full transition-transform duration-150 ${
                    unlocked
                      ? 'cursor-pointer hover:scale-105 active:scale-95'
                      : 'cursor-not-allowed opacity-70'
                  }`}
                >
                  {/* Bright Green Pulsing Rings for Active Uncompleted Stage */}
                  {isActiveUncompleted && (
                    <>
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#4ade80] bg-[#22c55e]/25 animate-stage-beacon-ring"
                      />
                      <span
                        aria-hidden="true"
                        style={{ animationDelay: '900ms' }}
                        className="pointer-events-none absolute inset-0 rounded-full border-2 border-[#86efac] bg-[#22c55e]/15 animate-stage-beacon-ring"
                      />
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute -inset-2 rounded-full bg-[#22c55e]/35 blur-md animate-stage-beacon-pulse"
                      />
                    </>
                  )}

                  {/* Selected Targeting Halo */}
                  {isSelected && unlocked && !isActiveUncompleted && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-[#8ad1ea]/90 shadow-[0_0_18px_rgba(103,194,222,0.55)]"
                    />
                  )}
                  {isSelected && isActiveUncompleted && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-[#bbf7d0] shadow-[0_0_24px_rgba(74,222,128,0.85)]"
                    />
                  )}

                  {/* Forged Octagonal Stage Medallion */}
                  <span
                    className={`relative z-10 w-12 h-12 sm:w-14 sm:h-14 btn-chamfer p-[2px] block shadow-[0_8px_22px_rgba(0,0,0,0.88)] ${
                      isActiveUncompleted
                        ? 'bg-gradient-to-b from-[#bbf7d0] via-[#22c55e] to-[#14532d]'
                        : completed
                        ? 'bg-gradient-to-b from-[#a7e6f7] via-[#3f97b0] to-[#153945]'
                        : 'bg-gradient-to-b from-[#525b66] via-[#2d333b] to-[#14171c]'
                    }`}
                  >
                    <span
                      className={`w-full h-full btn-chamfer flex flex-col items-center justify-center relative overflow-hidden ${
                        isActiveUncompleted
                          ? 'bg-gradient-to-b from-[#166534] via-[#15803d] to-[#0a381d] text-[#f0fdf4]'
                          : completed
                          ? 'bg-gradient-to-b from-[#1c4757] via-[#13323e] to-[#0b1f27] text-[#e7f8fc]'
                          : 'bg-gradient-to-b from-[#232830] via-[#171b20] to-[#0f1216] text-[#7a8490]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1.5 top-0 h-px bg-white/30"
                      />
                      {unlocked ? (
                        <span className="font-display text-xl sm:text-2xl font-bold leading-none drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          {stage.id}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-0.5">
                          <Lock className="w-4 h-4 text-[#89939f]" />
                          <span className="font-led text-[10px] font-bold leading-none text-[#7b8591]">
                            {stage.id}
                          </span>
                        </div>
                      )}
                    </span>
                  </span>

                  {/* Completed Check Medallion */}
                  {completed && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 z-20 w-5 h-5 rounded-full bg-[#15803d] border border-[#86efac] text-[#f0fdf4] flex items-center justify-center shadow-[0_2px_8px_rgba(0,0,0,0.85)]"
                    >
                      <Check className="w-3 h-3 stroke-[3]" />
                    </span>
                  )}
                </button>

                {/* Stage Map Plaque */}
                <div
                  className={`mt-1.5 px-2.5 py-1 rounded-[3px] text-center whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.9)] border ${
                    isActiveUncompleted
                      ? 'bg-[#091c11]/92 border-[#22c55e]/80'
                      : completed
                      ? 'bg-[#0c1a21]/92 border-[#49879c]/75'
                      : 'bg-[#0d1014]/88 border-[#303740]/80'
                  }`}
                >
                  <div className="font-display text-[11px] sm:text-xs font-semibold uppercase tracking-[0.07em] text-[#f2e8da] leading-tight">
                    Этап {stage.id}
                  </div>
                  <div
                    className={`font-led text-[9px] sm:text-[10px] uppercase tracking-[0.08em] leading-tight mt-0.5 ${
                      isActiveUncompleted
                        ? 'text-[#4ade80] font-bold'
                        : completed
                        ? 'text-[#8ad1ea]'
                        : 'text-[#848e9a]'
                    }`}
                  >
                    {statusText}
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Selected Stage Tactical Briefing Panel (bottom-right on desktop, docked bottom on mobile) */}
        {selectedStage && (
          <aside className="relative z-30 w-full lg:w-[430px] lg:absolute lg:bottom-5 lg:right-5 shrink-0 p-2 sm:p-3 lg:p-0 bg-[#080a0e]/95 lg:bg-transparent border-t border-[#2c343e] lg:border-0 max-h-[44dvh] lg:max-h-[calc(100%-2.5rem)] flex flex-col">
            <div className="relative steel-plate rounded-[6px] p-4 flex flex-col min-h-0 overflow-hidden">
              <CornerRivets
                inset="sm"
                tone={isSelectedActive ? 'rift' : 'steel'}
              />

              {/* Stage Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#303842] shrink-0">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-[11px] font-led uppercase tracking-[0.12em]">
                    <span className="text-[#9aa5b2]">Этап {selectedStage.id} из {stages.length}</span>
                    <span aria-hidden="true" className="text-[#56606c]">·</span>
                    <span
                      className={
                        isSelectedActive
                          ? 'text-[#4ade80] font-bold'
                          : isSelectedCompleted
                          ? 'text-[#8ad1ea]'
                          : 'text-[#9aa5b2]'
                      }
                    >
                      {isSelectedActive
                        ? 'Активный этап'
                        : isSelectedCompleted
                        ? 'Пройден'
                        : 'Доступен'}
                    </span>
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-[0.07em] text-[#f5ece0] truncate mt-0.5">
                    {selectedStage.title}
                  </h2>
                </div>
                <LedCounter
                  value={`${playerCards.length}v${enemyCards.length}`}
                  size="sm"
                />
              </div>

              {/* Scrollable Briefing Content */}
              <div className="py-3 space-y-3 overflow-y-auto steel-scrollbar min-h-0">
                <p className="text-xs text-[#c5ced7] leading-relaxed">
                  {selectedStage.subtitle}
                </p>

                {selectedStage.specialNote && (
                  <div className="p-2.5 rounded-[4px] steel-recessed flex items-start gap-2 text-[11px] text-[#d9cfb8] leading-snug">
                    <Info className="w-3.5 h-3.5 text-[#4ade80] shrink-0 mt-0.5" />
                    <span>{selectedStage.specialNote}</span>
                  </div>
                )}

                {/* Squad Comparison Grids */}
                <div className="space-y-2.5">
                  {/* Player Squad */}
                  <div className="p-2.5 rounded-[4px] steel-recessed space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-display uppercase tracking-[0.08em] text-[#84d2ea] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Ваш отряд (Сопротивление)</span>
                      </span>
                      <span className="font-led text-[#a7b3bf]">
                        {playerCards.length} карт
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {playerCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            onInspectCard(card, 'Ваш отряд (Сопротивление)')
                          }
                          className="group flex items-center gap-1.5 pr-2 pl-1 py-0.5 rounded-[3px] bg-[#14222a]/90 hover:bg-[#1c333f] border border-[#305060]/80 text-[11px] text-[#deeff5] transition-colors cursor-pointer"
                        >
                          <img
                            src={card.image}
                            alt={card.name}
                            referrerPolicy="no-referrer"
                            className="w-4 h-5 object-cover rounded-[2px] shrink-0"
                          />
                          <span className="whitespace-nowrap">{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enemy Squad */}
                  <div className="p-2.5 rounded-[4px] steel-recessed space-y-1.5">
                    <div className="flex items-center justify-between text-[11px]">
                      <span className="font-display uppercase tracking-[0.08em] text-[#ea7565] flex items-center gap-1.5">
                        <Skull className="w-3.5 h-3.5" />
                        <span>Противник ({selectedStage.enemyName})</span>
                      </span>
                      <span className="font-led text-[#a7b3bf]">
                        {enemyCards.length} карт
                      </span>
                    </div>
                    <div className="flex flex-wrap gap-1.5">
                      {enemyCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            onInspectCard(
                              card,
                              `Противник (${selectedStage.enemyName})`
                            )
                          }
                          className="group flex items-center gap-1.5 pr-2 pl-1 py-0.5 rounded-[3px] bg-[#261417]/90 hover:bg-[#381c21] border border-[#612d33]/80 text-[11px] text-[#f4dedb] transition-colors cursor-pointer"
                        >
                          <img
                            src={card.image}
                            alt={card.name}
                            referrerPolicy="no-referrer"
                            className="w-4 h-5 object-cover rounded-[2px] shrink-0"
                          />
                          <span className="whitespace-nowrap">{card.name}</span>
                        </button>
                      ))}
                    </div>
                  </div>
                </div>
              </div>

              <RiftDivider className="w-full my-2 shrink-0" />

              {/* Launch Action */}
              <div className="pt-1 shrink-0">
                <GameButton
                  variant={isSelectedCompleted ? 'primary' : 'emerald'}
                  size="lg"
                  fullWidth
                  withOrnaments
                  onClick={() => onStartStage(selectedStage)}
                >
                  {isSelectedCompleted ? (
                    <>
                      <RotateCcw className="w-4 h-4" />
                      <span>Переиграть этап {selectedStage.id}</span>
                    </>
                  ) : (
                    <>
                      <Swords className="w-4 h-4" />
                      <span>Начать этап {selectedStage.id}</span>
                    </>
                  )}
                </GameButton>
              </div>
            </div>
          </aside>
        )}
      </div>
    </div>
  );
};
