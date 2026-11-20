import React, { useEffect, useState } from 'react';
import { CardDefinition, CardSide } from '../types/game';
import { CAMPAIGN_MAP_BACKGROUND } from '../data/backgrounds';
import {
  CAMPAIGN_OFFICER_PORTRAIT,
  CampaignMilestoneTag,
  CampaignStageConfig,
  getActiveUncompletedStageId,
  isCampaignStageUnlocked,
  resolveCampaignCards,
} from '../data/campaign';
import { GameButton } from './GameButton';
import { AudioControlsButton } from './AudioControlsButton';
import { CornerRivets, LedCounter, RiftDivider } from './TacticalChrome';
import { sound } from '../utils/sound';
import {
  getVoiceCacheKey,
  VoicePlaybackStatus,
  voiceService,
} from '../utils/voiceService';
import {
  BookOpen,
  Check,
  ChevronLeft,
  ChevronRight,
  Crown,
  EyeOff,
  Film,
  Flame,
  Ghost,
  Info,
  Loader2,
  Lock,
  Radio,
  RotateCcw,
  Shield,
  Skull,
  Square,
  Swords,
  Trophy,
  Volume2,
} from 'lucide-react';

interface CampaignMapProps {
  side: CardSide;
  stages: CampaignStageConfig[];
  completedStageIds: number[];
  onStartStage: (stage: CampaignStageConfig) => void;
  onOpenPrologue?: () => void;
  onOpenFinale?: () => void;
  onInspectCard: (card: CardDefinition, ownerLabel: string) => void;
  onBackToFactions: () => void;
  onBackToMenu: () => void;
  onOpenRules: () => void;
}

const CHAPTER_ZONES: {
  id: string;
  label: string;
  unlockStageId: number;
  x: number;
  y: number;
  tone: 'rift' | 'ember' | 'abyss';
}[] = [
  { id: 'ch1', label: 'I · Периметр обороны', unlockStageId: 1, x: 18, y: 92, tone: 'rift' },
  { id: 'ch2', label: 'II · Промзона и мост', unlockStageId: 4, x: 74, y: 90, tone: 'rift' },
  { id: 'ch3', label: 'III · Линия Разлома', unlockStageId: 8, x: 46, y: 56, tone: 'ember' },
  { id: 'ch4', label: 'IV · Высоты подступов', unlockStageId: 15, x: 35, y: 12, tone: 'ember' },
  { id: 'ch5', label: 'V · Цитадель Бездны', unlockStageId: 18, x: 82, y: 7, tone: 'abyss' },
];

function getMilestoneMeta(tag?: CampaignMilestoneTag): {
  label: string;
  accentBorder: string;
  badgeBg: string;
  textClass: string;
} | null {
  switch (tag) {
    case 'vampire':
      return {
        label: 'Вампир',
        accentBorder: 'border-[#c9424b]',
        badgeBg: 'bg-[#7d1922] border-[#f0757d] text-[#ffecee]',
        textClass: 'text-[#f2858c]',
      };
    case 'ghost':
      return {
        label: 'Призраки',
        accentBorder: 'border-[#9668d6]',
        badgeBg: 'bg-[#432373] border-[#c49ef7] text-[#f3eaff]',
        textClass: 'text-[#cba6ff]',
      };
    case 'demon':
      return {
        label: 'Демон',
        accentBorder: 'border-[#e0562f]',
        badgeBg: 'bg-[#8a2310] border-[#ff9a6b] text-[#fff0e8]',
        textClass: 'text-[#ff9c6e]',
      };
    case 'stealth':
      return {
        label: 'Меньшинство',
        accentBorder: 'border-[#d4973b]',
        badgeBg: 'bg-[#69440d] border-[#f5c470] text-[#fff6e3]',
        textClass: 'text-[#f5c470]',
      };
    case 'boss':
      return {
        label: 'Финал',
        accentBorder: 'border-[#e84b3c]',
        badgeBg: 'bg-[#941914] border-[#ffb085] text-[#fff3eb]',
        textClass: 'text-[#ff8f75]',
      };
    default:
      return null;
  }
}

export const CampaignMap: React.FC<CampaignMapProps> = ({
  side,
  stages,
  completedStageIds,
  onStartStage,
  onOpenPrologue,
  onOpenFinale,
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
  const [officerImgError, setOfficerImgError] = useState(false);
  const [briefingVoiceStatus, setBriefingVoiceStatus] =
    useState<VoicePlaybackStatus>('idle');
  const [briefingVoiceError, setBriefingVoiceError] = useState<string | null>(
    null
  );

  // Sync default focus to the newly unlocked active stage when progress advances
  useEffect(() => {
    if (activeStageId !== null) {
      setSelectedStageId(activeStageId);
    }
  }, [activeStageId]);

  // Stop officer briefing audio whenever user switches stage or exits campaign map
  useEffect(() => {
    voiceService.stop();
    setBriefingVoiceStatus('idle');
    setBriefingVoiceError(null);
    return () => {
      voiceService.stop();
    };
  }, [selectedStageId]);

  const selectedStage =
    stages.find((s) => s.id === selectedStageId) ?? stages[0];

  const handleToggleBriefingVoice = () => {
    if (!selectedStage) return;
    const req = {
      speaker: 'officer' as const,
      text: selectedStage.officerBriefing,
      tone: 'resistance' as const,
    };
    const key = getVoiceCacheKey(req);
    if (
      voiceService.getActiveKey() === key &&
      (briefingVoiceStatus === 'playing' || briefingVoiceStatus === 'loading')
    ) {
      voiceService.stop();
      setBriefingVoiceStatus('idle');
      setBriefingVoiceError(null);
      return;
    }

    // Ensure voice channel is enabled if user explicitly clicks play
    const cur = sound.getSettings();
    if (cur.isMuted || !cur.voiceEnabled) {
      sound.updateSettings({ isMuted: false, voiceEnabled: true });
    }

    setBriefingVoiceError(null);
    void voiceService.speak(req, (status, err) => {
      setBriefingVoiceStatus(status);
      setBriefingVoiceError(status === 'error' ? err ?? 'Ошибка озвучки' : null);
    });
  };
  const isSelectedCompleted = selectedStage
    ? completedStageIds.includes(selectedStage.id)
    : false;
  const isSelectedActive = selectedStage
    ? selectedStage.id === activeStageId
    : false;

  const unlockedStages = stages.filter((s) =>
    isCampaignStageUnlocked(s.id, completedStageIds)
  );
  const currentUnlockedIndex = unlockedStages.findIndex(
    (s) => s.id === selectedStage?.id
  );
  const canStepPrev = currentUnlockedIndex > 0;
  const canStepNext =
    currentUnlockedIndex >= 0 &&
    currentUnlockedIndex < unlockedStages.length - 1;

  const playerCards = selectedStage
    ? resolveCampaignCards(selectedStage.playerCardIds)
    : [];
  const enemyCards = selectedStage
    ? resolveCampaignCards(selectedStage.enemyCardIds)
    : [];

  const allCompleted =
    stages.length > 0 && completedStageIds.length >= stages.length;

  const finalStageId = stages[stages.length - 1]?.id;
  const hasCompletedFinale =
    finalStageId !== undefined && completedStageIds.includes(finalStageId);

  const selectedMilestone = getMilestoneMeta(selectedStage?.milestoneTag);

  // Progressive Fog-of-War veil clearing as player unlocks deeper chapters
  const maxUnlockedStageId = unlockedStages.reduce(
    (max, s) => Math.max(max, s.id),
    1
  );
  const fogGradient =
    maxUnlockedStageId >= 18
      ? 'none'
      : maxUnlockedStageId >= 15
      ? 'radial-gradient(ellipse at 86% 18%, rgba(6,8,12,0.58) 0%, rgba(6,8,12,0.28) 28%, transparent 55%)'
      : maxUnlockedStageId >= 8
      ? 'linear-gradient(195deg, rgba(6,8,12,0.7) 0%, rgba(6,8,12,0.42) 34%, transparent 62%)'
      : 'linear-gradient(195deg, rgba(6,8,12,0.78) 0%, rgba(6,8,12,0.52) 48%, rgba(6,8,12,0.12) 74%, transparent 90%)';

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
              Кампания ·{' '}
              {side === 'resistance' ? 'Сопротивление' : 'Тёмная сторона'}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {onOpenPrologue && (
            <GameButton
              variant="secondary"
              size="xs"
              onClick={onOpenPrologue}
              title="Посмотреть пролог кампании"
            >
              <Film className="w-3.5 h-3.5 text-[#f09e6c]" />
              <span className="hidden md:inline">Пролог</span>
            </GameButton>
          )}

          {hasCompletedFinale && onOpenFinale && (
            <GameButton
              variant="secondary"
              size="xs"
              onClick={onOpenFinale}
              title="Посмотреть финал кампании"
            >
              <Trophy className="w-3.5 h-3.5 text-[#4ade80]" />
              <span className="hidden md:inline">Финал</span>
            </GameButton>
          )}

          <div className="flex items-center gap-1.5 text-xs text-[#b4bec8]">
            <span className="hidden sm:inline font-display uppercase tracking-[0.08em]">
              {allCompleted ? 'Все пройдены' : 'Пройдено'}
            </span>
            <LedCounter
              value={`${completedStageIds.length}/${stages.length}`}
              size="xs"
            />
          </div>

          <AudioControlsButton />

          <GameButton variant="secondary" size="xs" onClick={onOpenRules}>
            <BookOpen className="w-3.5 h-3.5 text-[#d9c9b4]" />
            <span className="hidden sm:inline">Правила</span>
          </GameButton>
        </div>
      </header>

      {/* Main Split Layout: Seamless 20-Stage Tactical Map + Docked Stage Briefing */}
      <div className="relative flex-1 min-h-0 w-full flex flex-col lg:flex-row overflow-hidden">
        {/* Interactive Map Canvas */}
        <div className="relative flex-1 min-h-[260px] lg:min-h-0 w-full overflow-hidden">
          {/* Unified Seamless Tactical Map Artwork */}
          <div
            aria-hidden="true"
            style={{ backgroundImage: `url(${CAMPAIGN_MAP_BACKGROUND})` }}
            className="pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat"
          />

          {/* Progressive Fog-of-War Veil over Locked Upper Sectors */}
          {fogGradient !== 'none' && (
            <div
              aria-hidden="true"
              style={{ backgroundImage: fogGradient }}
              className="pointer-events-none absolute inset-0 transition-opacity duration-500"
            />
          )}

          {/* Subtle Perimeter Vignette preserving vivid battlefield terrain */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,14,0.08)_38%,rgba(6,8,11,0.68)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-0 top-0 h-16 bg-gradient-to-b from-[#07090d]/72 to-transparent"
          />

          {/* Diegetic Subtle Chapter Territory Labels */}
          {CHAPTER_ZONES.map((zone) => {
            const isZoneUnlocked = maxUnlockedStageId >= zone.unlockStageId;
            const toneClass =
              zone.tone === 'abyss'
                ? 'text-[#f2957e]'
                : zone.tone === 'ember'
                ? 'text-[#f0c08a]'
                : 'text-[#9bdcf0]';
            return (
              <div
                key={zone.id}
                aria-hidden="true"
                style={{ left: `${zone.x}%`, top: `${zone.y}%` }}
                className={`pointer-events-none hidden sm:block absolute -translate-x-1/2 -translate-y-1/2 z-[12] px-2 py-0.5 rounded-[3px] bg-[#070a0f]/68 backdrop-blur-[1px] border border-white/10 font-display text-[10px] uppercase tracking-[0.14em] whitespace-nowrap transition-opacity ${
                  isZoneUnlocked
                    ? `${toneClass} opacity-90`
                    : 'text-[#8793a0] opacity-55'
                }`}
              >
                {zone.label}
              </div>
            );
          })}

          {/* Top-Left Compact Campaign Status Plaque */}
          <div className="absolute top-2.5 left-2.5 sm:top-3.5 sm:left-3.5 z-20 pointer-events-none max-w-[calc(100%-1.5rem)]">
            <div className="steel-bar rounded-[4px] px-2.5 py-1.5 flex items-center gap-2 text-xs">
              <Shield className="w-4 h-4 text-[#84d2ea] shrink-0" />
              <div className="leading-tight min-w-0">
                <div className="font-display font-semibold uppercase tracking-[0.08em] text-[#efe5d7] truncate">
                  {selectedStage?.actTitle ?? 'Карта боевых действий'}
                </div>
                <div className="text-[11px] text-[#aeb9c5] truncate">
                  {activeStageId !== null
                    ? `Текущая цель: Этап ${activeStageId} из ${stages.length}`
                    : `Все ${stages.length} этапов пройдены`}
                </div>
              </div>
            </div>
          </div>

          {/* Bottom-Left Compact Map Legend */}
          <div className="hidden md:flex absolute bottom-3 left-3.5 z-20 pointer-events-none items-center gap-3 px-2.5 py-1.5 rounded-[4px] bg-[#080b10]/85 border border-[#2c3642] backdrop-blur-xs text-[11px] text-[#bfc9d3]">
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#22c55e] shadow-[0_0_8px_rgba(74,222,128,0.8)]" />
              Активный
            </span>
            <span className="flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-[#4da8c4]" />
              Пройден
            </span>
            <span className="flex items-center gap-1.5">
              <Flame className="w-3 h-3 text-[#f07d63]" />
              Особый бой
            </span>
            <span className="flex items-center gap-1.5">
              <Lock className="w-3 h-3 text-[#7e8996]" />
              Закрыт
            </span>
          </div>

          {/* SVG Tactical Route Connecting All 20 Stages */}
          <svg
            aria-hidden="true"
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            className="pointer-events-none absolute inset-0 w-full h-full z-10"
          >
            <defs>
              <filter
                id="routeGlow"
                x="-20%"
                y="-20%"
                width="140%"
                height="140%"
              >
                <feGaussianBlur stdDeviation="0.55" result="blur" />
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
              const dx = x2 - x1;
              const dy = y2 - y1;
              const curveOffset =
                Math.abs(dy) > 10 ? (dx >= 0 ? 3.5 : -3.5) : idx % 2 === 0 ? -2.4 : 2.4;
              const cx = (x1 + x2) / 2;
              const cy = (y1 + y2) / 2 + curveOffset;
              const d = `M ${x1} ${y1} Q ${cx} ${cy} ${x2} ${y2}`;

              const isSegmentCompleted =
                completedStageIds.includes(stage.id) &&
                completedStageIds.includes(nextStage.id);
              const isSegmentLeadingToActive =
                completedStageIds.includes(stage.id) &&
                nextStage.id === activeStageId;

              return (
                <g key={`route-${stage.id}-${nextStage.id}`}>
                  <path
                    d={d}
                    fill="none"
                    stroke="rgba(6,8,12,0.88)"
                    strokeWidth="4.5"
                    strokeLinecap="round"
                    vectorEffect="non-scaling-stroke"
                  />
                  <path
                    d={d}
                    fill="none"
                    stroke={
                      isSegmentCompleted
                        ? '#67c2de'
                        : isSegmentLeadingToActive
                        ? '#4ade80'
                        : 'rgba(138,152,166,0.42)'
                    }
                    strokeWidth={
                      isSegmentCompleted
                        ? '2.2'
                        : isSegmentLeadingToActive
                        ? '2.6'
                        : '1.6'
                    }
                    strokeLinecap="round"
                    strokeDasharray={
                      isSegmentCompleted
                        ? undefined
                        : isSegmentLeadingToActive
                        ? '8 6'
                        : '5 5'
                    }
                    vectorEffect="non-scaling-stroke"
                    className={
                      isSegmentLeadingToActive ? 'animate-route-flow' : undefined
                    }
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

          {/* 20 Interactive Campaign Stage Beacons */}
          {stages.map((stage) => {
            const unlocked = isCampaignStageUnlocked(
              stage.id,
              completedStageIds
            );
            const completed = completedStageIds.includes(stage.id);
            const isActiveUncompleted = stage.id === activeStageId;
            const isSelected = stage.id === selectedStageId;
            const milestone = getMilestoneMeta(stage.milestoneTag);

            const statusText = isActiveUncompleted
              ? 'Активен'
              : completed
              ? 'Пройден'
              : 'Закрыт';

            const renderMilestoneIcon = () => {
              switch (stage.milestoneTag) {
                case 'vampire':
                  return <Skull className="w-2.5 h-2.5" />;
                case 'ghost':
                  return <Ghost className="w-2.5 h-2.5" />;
                case 'demon':
                  return <Flame className="w-2.5 h-2.5" />;
                case 'stealth':
                  return <EyeOff className="w-2.5 h-2.5" />;
                case 'boss':
                  return <Crown className="w-2.5 h-2.5" />;
                default:
                  return null;
              }
            };

            return (
              <div
                key={stage.id}
                style={{
                  left: `${stage.mapPosition.x}%`,
                  top: `${stage.mapPosition.y}%`,
                }}
                className={`absolute -translate-x-1/2 -translate-y-1/2 flex flex-col items-center ${
                  isSelected
                    ? 'z-30'
                    : isActiveUncompleted
                    ? 'z-25'
                    : 'z-20'
                }`}
              >
                <button
                  type="button"
                  disabled={!unlocked}
                  onClick={() => {
                    if (unlocked) {
                      sound.playUiClick();
                      setSelectedStageId(stage.id);
                    }
                  }}
                  onDoubleClick={() => {
                    if (unlocked) {
                      voiceService.stop();
                      onStartStage(stage);
                    }
                  }}
                  title={
                    unlocked
                      ? `Этап ${stage.id}: ${stage.title}`
                      : `Этап ${stage.id}: ${stage.title} (сначала пройдите этап ${stage.id - 1})`
                  }
                  aria-label={`Этап ${stage.id}: ${stage.title} (${statusText})`}
                  aria-pressed={isSelected}
                  className={`group relative flex items-center justify-center w-9 h-9 sm:w-11 sm:h-11 xl:w-12 xl:h-12 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#4ade80] rounded-full transition-transform duration-150 ${
                    unlocked
                      ? 'cursor-pointer hover:scale-110 active:scale-95'
                      : 'cursor-not-allowed opacity-75'
                  }`}
                >
                  {/* Active Uncompleted Pulsing Green Beacon */}
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
                        className="pointer-events-none absolute -inset-1.5 rounded-full bg-[#22c55e]/35 blur-md animate-stage-beacon-pulse"
                      />
                    </>
                  )}

                  {/* Selected Targeting Halo */}
                  {isSelected && unlocked && !isActiveUncompleted && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-[#8ad1ea]/95 shadow-[0_0_16px_rgba(103,194,222,0.65)]"
                    />
                  )}
                  {isSelected && isActiveUncompleted && (
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute -inset-1.5 rounded-full border-2 border-[#bbf7d0] shadow-[0_0_22px_rgba(74,222,128,0.88)]"
                    />
                  )}

                  {/* Forged Octagonal Stage Medallion */}
                  <span
                    className={`relative z-10 w-8 h-8 sm:w-10 sm:h-10 xl:w-11 xl:h-11 btn-chamfer-sm p-[1.5px] block shadow-[0_6px_18px_rgba(0,0,0,0.9)] ${
                      isActiveUncompleted
                        ? 'bg-gradient-to-b from-[#bbf7d0] via-[#22c55e] to-[#14532d]'
                        : completed
                        ? 'bg-gradient-to-b from-[#a7e6f7] via-[#3f97b0] to-[#153945]'
                        : milestone
                        ? 'bg-gradient-to-b from-[#9c5a5a] via-[#4a2629] to-[#1a0e10]'
                        : 'bg-gradient-to-b from-[#525b66] via-[#2d333b] to-[#14171c]'
                    }`}
                  >
                    <span
                      className={`w-full h-full btn-chamfer-sm flex flex-col items-center justify-center relative overflow-hidden ${
                        isActiveUncompleted
                          ? 'bg-gradient-to-b from-[#166534] via-[#15803d] to-[#0a381d] text-[#f0fdf4]'
                          : completed
                          ? 'bg-gradient-to-b from-[#1c4757] via-[#13323e] to-[#0b1f27] text-[#e7f8fc]'
                          : 'bg-gradient-to-b from-[#232830] via-[#171b20] to-[#0f1216] text-[#838d99]'
                      }`}
                    >
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1 top-0 h-px bg-white/30"
                      />
                      {unlocked ? (
                        <span className="font-display text-sm sm:text-base xl:text-lg font-bold leading-none tabular-nums drop-shadow-[0_2px_4px_rgba(0,0,0,0.9)]">
                          {stage.id}
                        </span>
                      ) : (
                        <div className="flex flex-col items-center justify-center">
                          <Lock className="w-2.5 h-2.5 sm:w-3 sm:h-3 text-[#8a94a0]" />
                          <span className="font-led text-[8px] sm:text-[9px] font-bold leading-none text-[#7b8591] mt-0.5 tabular-nums">
                            {stage.id}
                          </span>
                        </div>
                      )}
                    </span>
                  </span>

                  {/* Completed Check Corner Medallion */}
                  {completed && (
                    <span
                      aria-hidden="true"
                      className="absolute -top-0.5 -right-0.5 z-20 w-4 h-4 rounded-full bg-[#15803d] border border-[#86efac] text-[#f0fdf4] flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.85)]"
                    >
                      <Check className="w-2.5 h-2.5 stroke-[3]" />
                    </span>
                  )}

                  {/* Story Milestone Corner Emblem */}
                  {milestone && !completed && (
                    <span
                      aria-hidden="true"
                      className={`absolute -top-1 -left-1 z-20 w-4 h-4 rounded-full border flex items-center justify-center shadow-[0_2px_6px_rgba(0,0,0,0.9)] ${milestone.badgeBg}`}
                    >
                      {renderMilestoneIcon()}
                    </span>
                  )}
                </button>

                {/* Focused Label for Selected or Active Stage */}
                {(isSelected || isActiveUncompleted) && (
                  <div
                    className={`pointer-events-none mt-1 px-2 py-0.5 rounded-[3px] text-center whitespace-nowrap shadow-[0_4px_12px_rgba(0,0,0,0.92)] border ${
                      isActiveUncompleted
                        ? 'bg-[#091c11]/95 border-[#22c55e]/85'
                        : 'bg-[#0c1a21]/95 border-[#49879c]/85'
                    }`}
                  >
                    <div className="font-display text-[10px] sm:text-[11px] font-semibold uppercase tracking-[0.06em] text-[#f4eadc] leading-tight">
                      {stage.id}. {stage.title}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>

        {/* Right Docked Tactical Briefing Sidebar */}
        {selectedStage && (
          <aside className="relative z-30 w-full lg:w-[420px] xl:w-[445px] shrink-0 bg-[#0b0e12] border-t lg:border-t-0 lg:border-l border-[#2c343e] max-h-[50dvh] lg:max-h-full flex flex-col overflow-hidden p-2.5 sm:p-3.5">
            <div className="relative steel-plate rounded-[6px] p-3.5 sm:p-4 flex flex-col flex-1 min-h-0 overflow-hidden">
              <CornerRivets
                inset="sm"
                tone={
                  isSelectedActive
                    ? 'rift'
                    : selectedStage.milestoneTag === 'boss' ||
                      selectedStage.milestoneTag === 'demon' ||
                      selectedStage.milestoneTag === 'vampire'
                    ? 'dark'
                    : 'steel'
                }
              />

              {/* Stage Navigation & Header */}
              <div className="flex items-start justify-between gap-2 pb-2.5 border-b border-[#303842] shrink-0">
                <div className="min-w-0">
                  <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5 text-[11px] font-led uppercase tracking-[0.09em]">
                    <span className="text-[#9aa5b2] tabular-nums">
                      Этап {selectedStage.id} / {stages.length}
                    </span>
                    <span aria-hidden="true" className="text-[#56606c]">
                      ·
                    </span>
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
                        ? 'Активный'
                        : isSelectedCompleted
                        ? 'Пройден'
                        : 'Доступен'}
                    </span>
                    {selectedMilestone && (
                      <>
                        <span aria-hidden="true" className="text-[#56606c]">
                          ·
                        </span>
                        <span className={selectedMilestone.textClass}>
                          {selectedMilestone.label}
                        </span>
                      </>
                    )}
                  </div>
                  <h2 className="font-display text-lg sm:text-xl font-bold uppercase tracking-[0.07em] text-[#f5ece0] truncate mt-0.5">
                    {selectedStage.title}
                  </h2>
                </div>

                <div className="flex items-center gap-1.5 shrink-0">
                  {unlockedStages.length > 1 && (
                    <div className="flex items-center gap-1">
                      <button
                        type="button"
                        disabled={!canStepPrev}
                        onClick={() => {
                          if (canStepPrev) {
                            sound.playUiClick();
                            setSelectedStageId(
                              unlockedStages[currentUnlockedIndex - 1].id
                            );
                          }
                        }}
                        aria-label="Предыдущий этап"
                        className="w-7 h-7 rounded-[3px] steel-recessed flex items-center justify-center text-[#c5cfd9] hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronLeft className="w-4 h-4" />
                      </button>
                      <button
                        type="button"
                        disabled={!canStepNext}
                        onClick={() => {
                          if (canStepNext) {
                            sound.playUiClick();
                            setSelectedStageId(
                              unlockedStages[currentUnlockedIndex + 1].id
                            );
                          }
                        }}
                        aria-label="Следующий этап"
                        className="w-7 h-7 rounded-[3px] steel-recessed flex items-center justify-center text-[#c5cfd9] hover:text-white disabled:opacity-35 disabled:cursor-not-allowed cursor-pointer"
                      >
                        <ChevronRight className="w-4 h-4" />
                      </button>
                    </div>
                  )}
                  <LedCounter
                    value={`${playerCards.length}v${enemyCards.length}`}
                    size="sm"
                  />
                </div>
              </div>

              {/* Scrollable Briefing Body */}
              <div className="py-3 space-y-3 overflow-y-auto steel-scrollbar min-h-0 flex-1">
                {/* Female Military Officer Intel Message */}
                <div className="p-2.5 rounded-[4px] steel-recessed border-[#33505e] flex items-start gap-2.5">
                  <div className="w-12 h-16 rounded-[3px] overflow-hidden border border-[#4f8499] bg-[#0e151c] shrink-0 shadow-[0_4px_12px_rgba(0,0,0,0.8)]">
                    {!officerImgError ? (
                      <img
                        src={CAMPAIGN_OFFICER_PORTRAIT}
                        alt="Офицер разведки Сопротивления"
                        referrerPolicy="no-referrer"
                        onError={() => setOfficerImgError(true)}
                        className="w-full h-full object-cover object-top"
                      />
                    ) : (
                      <div className="w-full h-full flex items-center justify-center">
                        <Radio className="w-5 h-5 text-[#7fd0ea]" />
                      </div>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-2">
                      <div className="flex items-center gap-1.5 text-[11px] font-display uppercase tracking-[0.08em] text-[#84d2ea]">
                        <Radio className="w-3 h-3 shrink-0" />
                        <span>Доклад разведки</span>
                        {briefingVoiceStatus === 'playing' && (
                          <span
                            aria-hidden="true"
                            className="inline-flex items-end gap-[2px] h-3 ml-1"
                          >
                            <span className="w-[2px] h-full bg-[#7fd0ea] animate-voice-bar" />
                            <span
                              style={{ animationDelay: '160ms' }}
                              className="w-[2px] h-full bg-[#7fd0ea] animate-voice-bar"
                            />
                            <span
                              style={{ animationDelay: '320ms' }}
                              className="w-[2px] h-full bg-[#7fd0ea] animate-voice-bar"
                            />
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={handleToggleBriefingVoice}
                        title={
                          briefingVoiceStatus === 'playing'
                            ? 'Остановить озвучку доклада'
                            : 'Прослушать доклад офицера разведки'
                        }
                        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-[3px] border text-[11px] font-medium transition-colors cursor-pointer shrink-0 ${
                          briefingVoiceStatus === 'playing'
                            ? 'bg-[#133240] border-[#63bcd8] text-[#dff6fc]'
                            : 'bg-[#121a22] border-[#334957] text-[#9ad5e8] hover:border-[#63bcd8] hover:text-white'
                        }`}
                      >
                        {briefingVoiceStatus === 'loading' ? (
                          <>
                            <Loader2 className="w-3 h-3 animate-spin" />
                            <span>Голос…</span>
                          </>
                        ) : briefingVoiceStatus === 'playing' ? (
                          <>
                            <Square className="w-2.5 h-2.5 fill-current" />
                            <span>Стоп</span>
                          </>
                        ) : (
                          <>
                            <Volume2 className="w-3 h-3" />
                            <span>Озвучить</span>
                          </>
                        )}
                      </button>
                    </div>
                    <p className="mt-1 text-xs text-[#dfd7ca] leading-relaxed">
                      «{selectedStage.officerBriefing}»
                    </p>
                    {briefingVoiceError && (
                      <div className="mt-1.5 text-[11px] text-[#f08b82] leading-snug">
                        {briefingVoiceError}
                      </div>
                    )}
                  </div>
                </div>

                {selectedStage.specialNote && (
                  <div className="p-2.5 rounded-[4px] steel-recessed flex items-start gap-2 text-xs text-[#e2d4bc] leading-snug">
                    <Info className="w-4 h-4 text-[#4ade80] shrink-0 mt-0.5" />
                    <span>{selectedStage.specialNote}</span>
                  </div>
                )}

                {/* Squad Comparison Rosters with Cropped Unit Portraits */}
                <div className="space-y-3">
                  {/* Player Squad */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs px-0.5">
                      <span className="font-display uppercase tracking-[0.07em] text-[#84d2ea] flex items-center gap-1.5">
                        <Shield className="w-3.5 h-3.5" />
                        <span>Ваш отряд</span>
                      </span>
                      <span className="font-led text-[11px] text-[#a7b3bf] tabular-nums">
                        {playerCards.length} карт
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
                      {playerCards.map((card) => (
                        <button
                          key={card.id}
                          type="button"
                          onClick={() =>
                            onInspectCard(card, 'Ваш отряд (Сопротивление)')
                          }
                          className="group flex items-center gap-2 p-1.5 rounded-[4px] bg-[#101c24]/90 hover:bg-[#182c38] border border-[#2d4c5c]/80 hover:border-[#62bcd9] text-left transition-colors cursor-pointer min-w-0"
                        >
                          <span className="w-8 h-8 rounded-[3px] overflow-hidden border border-[#3d6478]/80 bg-[#090d12] shrink-0">
                            <img
                              src={card.image}
                              alt={card.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-[50%_38%] scale-[1.55] pointer-events-none"
                            />
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block text-xs font-medium text-[#e4f3f8] group-hover:text-white truncate">
                              {card.name}
                            </span>
                            <span className="block font-led text-[10px] text-[#8fb4c4] tabular-nums mt-0.5">
                              Р:{card.rank} · ⚡{card.initiative}
                            </span>
                          </span>
                        </button>
                      ))}
                    </div>
                  </div>

                  {/* Enemy Squad */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs px-0.5">
                      <span className="font-display uppercase tracking-[0.07em] text-[#ea7565] flex items-center gap-1.5 min-w-0">
                        <Skull className="w-3.5 h-3.5 shrink-0" />
                        <span className="truncate">
                          Противник ({selectedStage.enemyName})
                        </span>
                      </span>
                      <span className="font-led text-[11px] text-[#a7b3bf] tabular-nums shrink-0 ml-2">
                        {enemyCards.length} карт
                      </span>
                    </div>
                    <div className="grid grid-cols-2 gap-1.5">
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
                          className="group flex items-center gap-2 p-1.5 rounded-[4px] bg-[#211215]/90 hover:bg-[#321a1e] border border-[#5a2c32]/80 hover:border-[#cf5a4e] text-left transition-colors cursor-pointer min-w-0"
                        >
                          <span className="w-8 h-8 rounded-[3px] overflow-hidden border border-[#73373d]/80 bg-[#0d0809] shrink-0">
                            <img
                              src={card.image}
                              alt={card.name}
                              referrerPolicy="no-referrer"
                              className="w-full h-full object-cover object-[50%_38%] scale-[1.55] pointer-events-none"
                            />
                          </span>
                          <span className="min-w-0 flex-1 leading-tight">
                            <span className="block text-xs font-medium text-[#f5e1de] group-hover:text-white truncate">
                              {card.name}
                            </span>
                            <span className="block font-led text-[10px] text-[#c79994] tabular-nums mt-0.5">
                              Р:{card.rank} · ⚡{card.initiative}
                            </span>
                          </span>
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
                  onClick={() => {
                    voiceService.stop();
                    onStartStage(selectedStage);
                  }}
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
