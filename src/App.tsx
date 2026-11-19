/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  CardDefinition,
  CardSide,
  GameMode,
  GamePhase,
  GameState,
  PlayerState,
  BattleCard,
} from './types/game';
import { getCardsBySide, getCardById } from './data/cards';
import { DEFAULT_GAME_BACKGROUND } from './data/backgrounds';
import {
  CampaignProgress,
  CampaignStageConfig,
  getCampaignStage,
  getCampaignStagesBySide,
  loadCampaignProgress,
  resolveCampaignCards,
  saveCampaignProgress,
} from './data/campaign';
import {
  initializeBattleQueue,
  executeCardTurn,
  finalizeBattle,
  createLogEntry,
  matchesFilter,
} from './engine/effectProcessor';
import {
  selectBotCards,
  selectBotSpellCard,
  selectBotReviveCard,
  selectBotEvacuateCard,
} from './engine/botAi';
import { CardView } from './components/CardView';
import { BattleLog } from './components/BattleLog';
import { MainMenu } from './components/MainMenu';
import { CampaignFactionSelect } from './components/CampaignFactionSelect';
import { CampaignMap } from './components/CampaignMap';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { PassDeviceScreen } from './components/PassDeviceScreen';
import { CardSwapModal } from './components/SeerReplaceModal';
import { DiscardViewerModal } from './components/DiscardViewerModal';
import { CardInspectModal, CardInspectModalState } from './components/CardInspectModal';
import { HandZone } from './components/HandZone';
import { GameButton } from './components/GameButton';
import { CornerRivets, LedCounter, RiftDivider } from './components/TacticalChrome';
import { sound } from './utils/sound';
import {
  Swords,
  Play,
  RotateCcw,
  Volume2,
  VolumeX,
  BookOpen,
  FastForward,
  ScrollText,
  Flag,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'card_game_state_save_v4';
const MAX_BATTLE_ROUNDS = 10;

type EffectTheme = 'fire' | 'emerald' | 'arcane' | 'toxic' | 'sky' | 'crimson';

interface ActiveTurnAnimation {
  instanceId: string;
  mode: 'arc_attack' | 'center_cast';
  style: React.CSSProperties;
  effectTheme: EffectTheme;
  impactTargetIds: string[];
  shieldTargetIds: string[];
  showImpactOverlay: boolean;
}

const CENTER_CAST_CARD_IDS = new Set([
  'engineer',
  'scientist',
  'evacuation',
  'necromancer',
  'old_wizard',
  'seer',
  'artillerist',
  'hidden_virus',
  'progressive_science',
  'artillery',
  'abnormal_lightning',
  'natural_disaster',
  'terrible_disease',
  'plague',
]);

const THEME_COLORS: Record<
  EffectTheme,
  { primary: string; secondary: string; core: string; glow: string }
> = {
  fire: {
    primary: '#f97316',
    secondary: '#ef4444',
    core: '#fef08a',
    glow: 'rgba(249, 115, 22, 0.55)',
  },
  emerald: {
    primary: '#10b981',
    secondary: '#34d399',
    core: '#d1fae5',
    glow: 'rgba(16, 185, 129, 0.5)',
  },
  arcane: {
    primary: '#a855f7',
    secondary: '#ec4899',
    core: '#f3e8ff',
    glow: 'rgba(168, 85, 247, 0.55)',
  },
  toxic: {
    primary: '#84cc16',
    secondary: '#a855f7',
    core: '#ecfccb',
    glow: 'rgba(132, 204, 22, 0.5)',
  },
  sky: {
    primary: '#06b6d4',
    secondary: '#38bdf8',
    core: '#e0f2fe',
    glow: 'rgba(56, 189, 248, 0.55)',
  },
  crimson: {
    primary: '#ef4444',
    secondary: '#f43f5e',
    core: '#fecdd3',
    glow: 'rgba(239, 68, 68, 0.55)',
  },
};

function getEffectThemeForCard(card: CardDefinition): EffectTheme {
  switch (card.id) {
    case 'engineer':
    case 'scientist':
    case 'progressive_science':
      return 'emerald';
    case 'seer':
    case 'artillerist':
    case 'artillery':
    case 'natural_disaster':
      return 'fire';
    case 'evacuation':
    case 'abnormal_lightning':
      return 'sky';
    case 'hidden_virus':
    case 'terrible_disease':
    case 'plague':
      return 'toxic';
    case 'old_wizard':
    case 'necromancer':
      return 'arcane';
    default:
      return 'crimson';
  }
}

interface TurnBannerState {
  key: string;
  title: string;
  subtitle?: string;
  side: CardSide | 'neutral';
}

function hydrateSavedState(saved: GameState): GameState {
  const refreshCard = (c: CardDefinition): CardDefinition => {
    const fresh = getCardById(c.id);
    return fresh ? { ...c, image: fresh.image } : c;
  };
  return {
    ...saved,
    player1: {
      ...saved.player1,
      hand: saved.player1.hand.map(refreshCard),
      discard: saved.player1.discard.map(refreshCard),
    },
    player2: {
      ...saved.player2,
      hand: saved.player2.hand.map(refreshCard),
      discard: saved.player2.discard.map(refreshCard),
    },
    activeBattleQueue: saved.activeBattleQueue.map((bc) => ({
      ...bc,
      card: refreshCard(bc.card),
    })),
  };
}

function isActiveBattlePhase(phase: GamePhase): boolean {
  return (
    phase === 'p1_select' ||
    phase === 'pass_device' ||
    phase === 'p2_select' ||
    phase === 'ready_to_battle' ||
    phase === 'battle_resolving' ||
    phase === 'battle_ended'
  );
}

export default function App() {
  const [gameState, setGameState] = useState<GameState>(() =>
    createInitialGameState('bot', 'resistance')
  );

  const [campaignProgress, setCampaignProgress] = useState<CampaignProgress>(() =>
    loadCampaignProgress()
  );
  const [selectedCampaignSide, setSelectedCampaignSide] =
    useState<CardSide>('resistance');
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
  const [savedGameLabel, setSavedGameLabel] = useState<string | undefined>(
    undefined
  );
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [mobileLogOpen, setMobileLogOpen] = useState<boolean>(false);
  const [isMuted, setIsMuted] = useState<boolean>(sound.getMuted());
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [wizardModalOpen, setWizardModalOpen] = useState<boolean>(false);
  const [necromancerModalOpen, setNecromancerModalOpen] = useState<boolean>(false);
  const [evacuationModalOpen, setEvacuationModalOpen] = useState<boolean>(false);
  const [surrenderModalOpen, setSurrenderModalOpen] = useState<boolean>(false);
  const [activeAnimation, setActiveAnimation] = useState<ActiveTurnAnimation | null>(null);
  const [turnBanner, setTurnBanner] = useState<TurnBannerState | null>(null);
  const [inspectModal, setInspectModal] = useState<CardInspectModalState | null>(null);
  const [discardModal, setDiscardModal] = useState<{
    isOpen: boolean;
    title: string;
    cards: CardDefinition[];
  }>({
    isOpen: false,
    title: '',
    cards: [],
  });

  const autoPlayTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const cardRefs = useRef<Record<string, HTMLDivElement | null>>({});
  const battlefieldCenterRef = useRef<HTMLDivElement | null>(null);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedTurnRef = useRef<string>('');

  const clearAnimationTimers = () => {
    animTimersRef.current.forEach((t) => clearTimeout(t));
    animTimersRef.current = [];
  };

  useEffect(() => {
    return () => {
      clearAnimationTimers();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
    };
  }, []);

  // Announce whose turn it is in the center of the screen at the start of each turn
  useEffect(() => {
    if (
      gameState.phase !== 'p1_select' &&
      gameState.phase !== 'p2_select' &&
      gameState.phase !== 'battle_resolving'
    ) {
      return;
    }

    if (gameState.phase === 'battle_resolving' && activeAnimation) {
      return;
    }

    let nextBanner: TurnBannerState | null = null;

    if (gameState.phase === 'p1_select') {
      const key = `${gameState.roundNumber}-p1_select`;
      if (lastAnnouncedTurnRef.current !== key) {
        nextBanner = {
          key,
          title: gameState.mode === 'bot' ? 'Ваш ход' : 'Ход Игрока 1',
          subtitle: `Бой #${gameState.roundNumber} · Выберите до ${Math.min(
            3,
            gameState.player1.hand.length
          )} карт`,
          side: gameState.player1.side,
        };
      }
    } else if (gameState.phase === 'p2_select') {
      const key = `${gameState.roundNumber}-p2_select`;
      if (lastAnnouncedTurnRef.current !== key) {
        nextBanner = {
          key,
          title: 'Ход Игрока 2',
          subtitle: `Бой #${gameState.roundNumber} · Выберите до ${Math.min(
            3,
            gameState.player2.hand.length
          )} карт`,
          side: gameState.player2.side,
        };
      }
    } else if (gameState.phase === 'battle_resolving') {
      const actor = gameState.activeBattleQueue[gameState.currentTurnIndex];
      if (actor) {
        const key = `${gameState.roundNumber}-battle-${gameState.currentTurnIndex}`;
        if (lastAnnouncedTurnRef.current !== key) {
          const ownerTitle =
            actor.owner === 'player1'
              ? gameState.mode === 'bot'
                ? 'Ваш ход'
                : 'Ход Игрока 1'
              : gameState.mode === 'bot'
              ? 'Ход Бота'
              : 'Ход Игрока 2';
          nextBanner = {
            key,
            title: ownerTitle,
            subtitle: `«${actor.card.name}» · ⚡${actor.currentInitiative}`,
            side: actor.card.side,
          };
        }
      }
    }

    if (nextBanner) {
      lastAnnouncedTurnRef.current = nextBanner.key;
      setTurnBanner(nextBanner);
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      bannerTimerRef.current = setTimeout(() => {
        setTurnBanner(null);
      }, 1500);
    }
  }, [
    gameState.phase,
    gameState.roundNumber,
    gameState.currentTurnIndex,
    gameState.mode,
    gameState.player1.side,
    gameState.player1.hand.length,
    gameState.player2.side,
    gameState.player2.hand.length,
    gameState.activeBattleQueue,
    activeAnimation,
  ]);

  // Check saved game on mount
  useEffect(() => {
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed: GameState = JSON.parse(saved);
        if (isActiveBattlePhase(parsed.phase)) {
          setHasSavedSession(true);
          setSavedGameLabel(
            parsed.campaign ? `Этап ${parsed.campaign.stageId}` : 'Битва'
          );
        }
      }
    } catch {
      // ignore
    }
  }, []);

  // Save active battle progress to localStorage whenever state updates
  useEffect(() => {
    try {
      if (isActiveBattlePhase(gameState.phase)) {
        localStorage.setItem(LOCAL_STORAGE_KEY, JSON.stringify(gameState));
        setHasSavedSession(true);
        setSavedGameLabel(
          gameState.campaign ? `Этап ${gameState.campaign.stageId}` : 'Битва'
        );
      } else if (gameState.phase === 'game_over') {
        localStorage.removeItem(LOCAL_STORAGE_KEY);
        setHasSavedSession(false);
        setSavedGameLabel(undefined);
      }
    } catch {
      // ignore
    }
  }, [gameState]);

  function createInitialGameState(mode: GameMode, playerSide: CardSide): GameState {
    const isP1Resistance = playerSide === 'resistance';

    const p1Cards = getCardsBySide(playerSide);
    const p2Side: CardSide = isP1Resistance ? 'dark_side' : 'resistance';
    const p2Cards = getCardsBySide(p2Side);

    const player1: PlayerState = {
      id: 'player1',
      name: isP1Resistance ? 'Игрок 1 (Сопротивление)' : 'Игрок 1 (Тёмная сторона)',
      side: playerSide,
      isBot: false,
      hand: p1Cards,
      discard: [],
      selectedCardIds: [],
    };

    const player2: PlayerState = {
      id: 'player2',
      name:
        mode === 'bot'
          ? isP1Resistance
            ? 'Бот (Тёмная сторона)'
            : 'Бот (Сопротивление)'
          : isP1Resistance
          ? 'Игрок 2 (Тёмная сторона)'
          : 'Игрок 2 (Сопротивление)',
      side: p2Side,
      isBot: mode === 'bot',
      hand: p2Cards,
      discard: [],
      selectedCardIds: [],
    };

    return {
      mode,
      phase: 'menu',
      roundNumber: 1,
      player1,
      player2,
      activeBattleQueue: [],
      currentTurnIndex: 0,
      battleLog: [
        createLogEntry(
          'info',
          `Игра начата. Раунд 1. Цель — истощить руку соперника!`
        ),
      ],
      winner: null,
      historyRoundsCount: 0,
    };
  }

  function createCampaignGameState(stage: CampaignStageConfig): GameState {
    const isP1Resistance = stage.side === 'resistance';
    const p2Side: CardSide = isP1Resistance ? 'dark_side' : 'resistance';
    const p1Cards = resolveCampaignCards(stage.playerCardIds);
    const p2Cards = resolveCampaignCards(stage.enemyCardIds);

    const player1: PlayerState = {
      id: 'player1',
      name: isP1Resistance ? 'Сопротивление' : 'Тёмная сторона',
      side: stage.side,
      isBot: false,
      hand: p1Cards,
      discard: [],
      selectedCardIds: [],
    };

    const player2: PlayerState = {
      id: 'player2',
      name: stage.enemyName,
      side: p2Side,
      isBot: true,
      hand: p2Cards,
      discard: [],
      selectedCardIds: [],
    };

    return {
      mode: 'bot',
      phase: 'p1_select',
      roundNumber: 1,
      player1,
      player2,
      activeBattleQueue: [],
      currentTurnIndex: 0,
      battleLog: [
        createLogEntry(
          'info',
          `Кампания · Этап ${stage.id}: «${stage.title}». Раунд 1. Цель — истощить руку соперника!`
        ),
      ],
      winner: null,
      historyRoundsCount: 0,
      campaign: {
        side: stage.side,
        stageId: stage.id,
      },
    };
  }

  const resetBattleTransientUi = () => {
    clearAnimationTimers();
    setActiveAnimation(null);
    setInspectModal(null);
    lastAnnouncedTurnRef.current = '';
    setTurnBanner(null);
    setMobileLogOpen(false);
    setAutoPlay(false);
    setWizardModalOpen(false);
    setNecromancerModalOpen(false);
    setEvacuationModalOpen(false);
    setSurrenderModalOpen(false);
  };

  const handleStartNewGame = (mode: GameMode, playerSide: CardSide) => {
    sound.playSelect();
    resetBattleTransientUi();
    const freshState = createInitialGameState(mode, playerSide);
    freshState.phase = 'p1_select';
    setGameState(freshState);
  };

  const handleStartCampaignStage = (stage: CampaignStageConfig) => {
    sound.playSelect();
    resetBattleTransientUi();
    setSelectedCampaignSide(stage.side);
    setGameState(createCampaignGameState(stage));
  };

  const handleOpenCampaign = () => {
    sound.playSelect();
    resetBattleTransientUi();
    setGameState((prev) => ({
      ...prev,
      phase: 'campaign_select',
    }));
  };

  const handleSelectCampaignFaction = (side: CardSide) => {
    if (side !== 'resistance') return;
    sound.playSelect();
    resetBattleTransientUi();
    setSelectedCampaignSide(side);
    setGameState((prev) => ({
      ...prev,
      phase: 'campaign_map',
    }));
  };

  const handleReturnToCampaignMap = () => {
    sound.playSelect();
    resetBattleTransientUi();
    if (gameState.campaign) {
      setSelectedCampaignSide(gameState.campaign.side);
    }
    setGameState((prev) => ({
      ...prev,
      phase: 'campaign_map',
    }));
  };

  const handleResumeGame = () => {
    sound.playSelect();
    resetBattleTransientUi();
    try {
      const saved = localStorage.getItem(LOCAL_STORAGE_KEY);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (isActiveBattlePhase(parsed.phase)) {
          setGameState(hydrateSavedState(parsed));
        }
      }
    } catch {
      // ignore
    }
  };

  const handleQuitToMenu = () => {
    sound.playSelect();
    resetBattleTransientUi();
    setGameState((prev) => ({
      ...prev,
      phase: 'menu',
    }));
  };

  const toggleMute = () => {
    const next = sound.toggleMute();
    setIsMuted(next);
  };

  // Card selection in hand
  const toggleCardSelect = (playerId: 'player1' | 'player2', cardId: string) => {
    sound.playSelect();
    setGameState((prev) => {
      const player = playerId === 'player1' ? prev.player1 : prev.player2;
      const isSelected = player.selectedCardIds.includes(cardId);

      let nextSelected: string[];
      if (isSelected) {
        nextSelected = player.selectedCardIds.filter((id) => id !== cardId);
      } else {
        const maxSelectable = Math.min(3, player.hand.length);
        if (player.selectedCardIds.length >= maxSelectable) {
          // Replace or ignore if already reached limit
          return prev;
        }
        nextSelected = [...player.selectedCardIds, cardId];
      }

      const updatedPlayer = {
        ...player,
        selectedCardIds: nextSelected,
      };

      return {
        ...prev,
        [playerId]: updatedPlayer,
      };
    });
  };

  const openHandCardInspect = (
    playerId: 'player1' | 'player2',
    card: CardDefinition,
    canSelect: boolean
  ) => {
    sound.playSelect();
    setInspectModal({
      card,
      mode: canSelect ? 'hand_select' : 'inspect',
      ownerId: playerId,
    });
  };

  const openBattleCardInspect = (bCard: BattleCard, ownerLabel: string) => {
    sound.playSelect();
    setInspectModal({
      card: bCard.card,
      mode: 'inspect',
      ownerLabel,
      battleStatus: {
        currentRank: bCard.currentRank,
        isDestroyed: bCard.isDestroyed,
        isDisabled: bCard.isDisabled,
        isCancelled: bCard.isCancelled,
        isEvacuated: bCard.isEvacuated,
        protectedAgainst: bCard.protectedAgainst,
      },
    });
  };

  const handleConfirmInspectSelection = () => {
    if (!inspectModal || inspectModal.mode !== 'hand_select' || !inspectModal.ownerId) {
      setInspectModal(null);
      return;
    }
    toggleCardSelect(inspectModal.ownerId, inspectModal.card.id);
    setInspectModal(null);
  };

  // Confirm selection for Player 1
  const handleP1Confirm = () => {
    sound.playSelect();
    setInspectModal(null);
    setGameState((prev) => {
      if (prev.mode === 'bot') {
        // Check if current campaign stage has a scripted Round 1 opening combo
        const forcedBotCardIds =
          prev.campaign && prev.roundNumber === 1
            ? getCampaignStage(prev.campaign.side, prev.campaign.stageId)
                ?.firstRoundBotCardIds
            : undefined;
        // Bot automatically selects
        const botChosenIds = selectBotCards(
          prev.player2,
          prev.player1,
          forcedBotCardIds
        );
        const updatedP2: PlayerState = {
          ...prev.player2,
          selectedCardIds: botChosenIds,
        };

        return {
          ...prev,
          player2: updatedP2,
          phase: 'ready_to_battle',
          battleLog: [
            ...prev.battleLog,
            createLogEntry('info', `Игроки выбрали карты. Готовы к бою!`),
          ],
        };
      } else {
        // PvP local: Pass device to Player 2
        return {
          ...prev,
          phase: 'pass_device',
        };
      }
    });
  };

  // Confirm selection for Player 2 (in PvP local)
  const handleP2Confirm = () => {
    sound.playSelect();
    setInspectModal(null);
    setGameState((prev) => ({
      ...prev,
      phase: 'ready_to_battle',
      battleLog: [
        ...prev.battleLog,
        createLogEntry('info', `Оба игрока подтвердили выбор. Готовы к бою!`),
      ],
    }));
  };

  // Start Battle
  const handleStartBattle = () => {
    sound.playBattleStart();
    setInspectModal(null);
    setGameState((prev) => {
      // Find cards by selected IDs
      const p1Cards = prev.player1.selectedCardIds
        .map((id) => prev.player1.hand.find((c) => c.id === id)!)
        .filter(Boolean);

      const p2Cards = prev.player2.selectedCardIds
        .map((id) => prev.player2.hand.find((c) => c.id === id)!)
        .filter(Boolean);

      // Remove selected cards from hands temporarily (they are on battlefield)
      const newP1Hand = prev.player1.hand.filter(
        (c) => !prev.player1.selectedCardIds.includes(c.id)
      );
      const newP2Hand = prev.player2.hand.filter(
        (c) => !prev.player2.selectedCardIds.includes(c.id)
      );

      const queue = initializeBattleQueue(p1Cards, p2Cards);

      return {
        ...prev,
        phase: 'battle_resolving',
        player1: {
          ...prev.player1,
          hand: newP1Hand,
        },
        player2: {
          ...prev.player2,
          hand: newP2Hand,
        },
        activeBattleQueue: queue,
        currentTurnIndex: 0,
        battleLog: [
          ...prev.battleLog,
          createLogEntry(
            'info',
            `--- БОЙ #${prev.roundNumber} НАЧАЛСЯ: Открыто карт: ${queue.length}. Сортировка по инициативе ⚡ ---`
          ),
        ],
      };
    });
  };

  const isNonActingCard = (c: BattleCard | undefined): boolean =>
    Boolean(c && (c.isDestroyed || c.isDisabled || c.isCancelled || c.isEvacuated));

  // Step resolution
  const handleStepResolution = (
    replacementForSeer?: CardDefinition,
    chosenReviveCard?: CardDefinition | null,
    chosenEvacuateCard?: CardDefinition | null
  ) => {
    setGameState((prev) => {
      if (prev.phase !== 'battle_resolving') return prev;

      const stepResult = executeCardTurn(
        prev.currentTurnIndex,
        prev.activeBattleQueue,
        prev.player1,
        prev.player2,
        replacementForSeer,
        chosenReviveCard,
        chosenEvacuateCard
      );

      let workingQueue = stepResult.queue;
      let workingLogs = [...prev.battleLog, ...stepResult.logs];
      let workingP1Hand = stepResult.player1Hand;
      let workingP1Discard = stepResult.player1Discard;
      let workingP2Hand = stepResult.player2Hand;
      let workingP2Discard = stepResult.player2Discard;
      let endedEarly = stepResult.battleEndedEarly;

      // Sound trigger for the acting card
      const hasDestruction = stepResult.logs.some((l) => l.type === 'destroy');
      const hasProtection = stepResult.logs.some((l) => l.type === 'protect');
      if (hasDestruction) {
        sound.playHit();
      } else if (hasProtection) {
        sound.playShield();
      } else {
        sound.playSelect();
      }

      // Automatically advance past any subsequent destroyed, disabled, cancelled, or evacuated cards
      let nextTurnIndex = prev.currentTurnIndex + 1;
      while (
        !endedEarly &&
        nextTurnIndex < workingQueue.length &&
        isNonActingCard(workingQueue[nextTurnIndex])
      ) {
        const skipResult = executeCardTurn(
          nextTurnIndex,
          workingQueue,
          { ...prev.player1, hand: workingP1Hand, discard: workingP1Discard },
          { ...prev.player2, hand: workingP2Hand, discard: workingP2Discard }
        );
        workingQueue = skipResult.queue;
        workingLogs = [...workingLogs, ...skipResult.logs];
        workingP1Hand = skipResult.player1Hand;
        workingP1Discard = skipResult.player1Discard;
        workingP2Hand = skipResult.player2Hand;
        workingP2Discard = skipResult.player2Discard;
        endedEarly = skipResult.battleEndedEarly;
        nextTurnIndex += 1;
      }

      const isFinished = endedEarly || nextTurnIndex >= workingQueue.length;

      let nextPhase: GamePhase = 'battle_resolving';
      let finalP1Hand = workingP1Hand;
      let finalP1Discard = workingP1Discard;
      let finalP2Hand = workingP2Hand;
      let finalP2Discard = workingP2Discard;
      const finalLogs = [...workingLogs];

      if (isFinished) {
        // Battle is complete! Finalize surviving cards returning to hand, destroyed to discard
        const result = finalizeBattle(
          workingQueue,
          { ...prev.player1, hand: workingP1Hand, discard: workingP1Discard },
          { ...prev.player2, hand: workingP2Hand, discard: workingP2Discard },
          endedEarly
        );

        finalP1Hand = result.p1Hand;
        finalP1Discard = result.p1Discard;
        finalP2Hand = result.p2Hand;
        finalP2Discard = result.p2Discard;
        nextPhase = 'battle_ended';

        let summaryMsg = `Бой завершён! Выжившие карты (${result.survivors.length}) возвращаются в руку, уничтоженные (${result.destroyed.length}) отправлены в сброс.`;
        if (result.singleUseConsumed && result.singleUseConsumed.length > 0) {
          const names = result.singleUseConsumed.map((c) => `«${c.name}»`).join(', ');
          summaryMsg += ` Одноразовые карты ${names} отправлены в сброс.`;
        }
        finalLogs.push(createLogEntry('info', summaryMsg));
      }

      return {
        ...prev,
        phase: nextPhase,
        activeBattleQueue: workingQueue,
        currentTurnIndex: nextTurnIndex,
        player1: {
          ...prev.player1,
          hand: finalP1Hand,
          discard: finalP1Discard,
        },
        player2: {
          ...prev.player2,
          hand: finalP2Hand,
          discard: finalP2Discard,
        },
        battleLog: finalLogs,
        historyRoundsCount: isFinished
          ? prev.historyRoundsCount + 1
          : prev.historyRoundsCount,
      };
    });
  };

  // Compute visual choreography targets & trajectories for the acting card
  const getCardAnimationTargets = (
    sourceCard: BattleCard,
    effectiveCard: CardDefinition
  ): { impactTargetIds: string[]; shieldTargetIds: string[] } => {
    const queue = gameState.activeBattleQueue;
    const impactSet = new Set<string>();
    const shieldSet = new Set<string>();

    for (const eff of effectiveCard.effects) {
      if (eff.action === 'destroy' && eff.target) {
        let candidates = queue.filter((c) => matchesFilter(c, eff.target!, sourceCard));
        if (eff.target.priority === 'highest_rank') {
          candidates = [...candidates].sort((a, b) => b.currentRank - a.currentRank);
        }
        if (eff.target.limit !== undefined) {
          candidates = candidates.slice(0, eff.target.limit);
        }
        const ignoreProt =
          Boolean(eff.ignoreProtection) || effectiveCard.type === 'virus';
        candidates.forEach((cand) => {
          const isProtected =
            !ignoreProt && cand.protectedAgainst.includes(effectiveCard.type);
          if (!isProtected) {
            impactSet.add(cand.instanceId);
          }
        });
      } else if (eff.action === 'reduce_rank' && eff.target) {
        queue
          .filter((c) => matchesFilter(c, eff.target!, sourceCard))
          .forEach((cand) => {
            const isProtected = cand.protectedAgainst.includes(effectiveCard.type);
            if (!isProtected) {
              impactSet.add(cand.instanceId);
            }
          });
      } else if (eff.action === 'cancel_ability' && eff.cancelCardId) {
        queue
          .filter(
            (c) =>
              !c.isDestroyed &&
              !c.isEvacuated &&
              c.owner !== sourceCard.owner &&
              c.card.id === eff.cancelCardId
          )
          .forEach((cand) => impactSet.add(cand.instanceId));
      } else if (eff.action === 'protect' && eff.target) {
        queue
          .filter((c) => matchesFilter(c, eff.target!, sourceCard))
          .forEach((cand) => shieldSet.add(cand.instanceId));
      }
    }

    return {
      impactTargetIds: Array.from(impactSet),
      shieldTargetIds: Array.from(shieldSet),
    };
  };

  const runAnimatedStep = (
    sourceCard: BattleCard,
    onImpactResolve: () => void,
    effectiveCardOverride?: CardDefinition,
    extraShieldCardId?: string
  ) => {
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      onImpactResolve();
      return;
    }

    clearAnimationTimers();
    setTurnBanner(null);

    const effectiveCard = effectiveCardOverride ?? sourceCard.card;
    const isCenterCast =
      effectiveCard.type === 'magic' ||
      CENTER_CAST_CARD_IDS.has(effectiveCard.id) ||
      CENTER_CAST_CARD_IDS.has(sourceCard.card.id);

    const mode: 'arc_attack' | 'center_cast' = isCenterCast
      ? 'center_cast'
      : 'arc_attack';

    const { impactTargetIds, shieldTargetIds } = getCardAnimationTargets(
      sourceCard,
      effectiveCard
    );

    if (extraShieldCardId) {
      const allyTarget = gameState.activeBattleQueue.find(
        (c) =>
          c.owner === sourceCard.owner &&
          !c.isDestroyed &&
          !c.isEvacuated &&
          c.card.id === extraShieldCardId
      );
      if (allyTarget && !shieldTargetIds.includes(allyTarget.instanceId)) {
        shieldTargetIds.push(allyTarget.instanceId);
      }
    }

    const srcEl = cardRefs.current[sourceCard.instanceId];
    const srcRect = srcEl?.getBoundingClientRect();
    let style: React.CSSProperties = {};

    if (mode === 'center_cast') {
      const centerRect = battlefieldCenterRef.current?.getBoundingClientRect();
      let centerX = 0;
      let centerY = sourceCard.owner === 'player1' ? -135 : 135;
      if (srcRect && centerRect) {
        centerX =
          centerRect.left +
          centerRect.width / 2 -
          (srcRect.left + srcRect.width / 2);
        centerY =
          centerRect.top +
          centerRect.height / 2 -
          (srcRect.top + srcRect.height / 2);
      }
      style = {
        '--center-x': `${Math.round(centerX)}px`,
        '--center-y': `${Math.round(centerY)}px`,
      } as React.CSSProperties;
    } else {
      const activeEnemies = gameState.activeBattleQueue.filter(
        (c) => c.owner !== sourceCard.owner && !c.isDestroyed && !c.isEvacuated
      );

      let chosenTarget: BattleCard | undefined;
      if (impactTargetIds.length > 0) {
        const impactEnemies = activeEnemies.filter((c) =>
          impactTargetIds.includes(c.instanceId)
        );
        chosenTarget = impactEnemies.sort(
          (a, b) =>
            Math.abs((a.slotIndex ?? 0) - (sourceCard.slotIndex ?? 0)) -
            Math.abs((b.slotIndex ?? 0) - (sourceCard.slotIndex ?? 0))
        )[0];
      }
      if (!chosenTarget) {
        chosenTarget =
          activeEnemies.find(
            (c) => (c.slotIndex ?? 0) === (sourceCard.slotIndex ?? 0)
          ) ?? activeEnemies[0];
      }

      const tgtRect = chosenTarget
        ? cardRefs.current[chosenTarget.instanceId]?.getBoundingClientRect()
        : undefined;

      let dx = 0;
      let dy = sourceCard.owner === 'player1' ? -160 : 160;
      if (srcRect && tgtRect) {
        dx =
          tgtRect.left +
          tgtRect.width / 2 -
          (srcRect.left + srcRect.width / 2);
        dy =
          tgtRect.top +
          tgtRect.height / 2 -
          (srcRect.top + srcRect.height / 2);
      }

      const dist = Math.hypot(dx, dy) || 1;
      const perpX = -dy / dist;
      const perpY = dx / dist;
      const curveDir = dx >= 0 ? -1 : 1;
      const arcMag = Math.min(72, Math.max(46, dist * 0.25)) * curveDir;

      const arcX = Math.round(dx * 0.34 + perpX * arcMag);
      const arcY = Math.round(dy * 0.44 + perpY * arcMag);
      const strikeX = Math.round(dx * 0.72);
      const strikeY = Math.round(dy * 0.72);
      const arcTilt = curveDir > 0 ? '8deg' : '-8deg';

      style = {
        '--arc-x': `${arcX}px`,
        '--arc-y': `${arcY}px`,
        '--strike-x': `${strikeX}px`,
        '--strike-y': `${strikeY}px`,
        '--arc-tilt': arcTilt,
      } as React.CSSProperties;
    }

    const effectTheme = getEffectThemeForCard(effectiveCard);

    setActiveAnimation({
      instanceId: sourceCard.instanceId,
      mode,
      style,
      effectTheme,
      impactTargetIds,
      shieldTargetIds,
      showImpactOverlay: false,
    });

    const tOverlay = setTimeout(() => {
      setActiveAnimation((prev) =>
        prev && prev.instanceId === sourceCard.instanceId
          ? { ...prev, showImpactOverlay: true }
          : prev
      );
    }, 260);

    const tResolve = setTimeout(() => {
      onImpactResolve();
    }, 360);

    const duration = mode === 'center_cast' ? 820 : 760;
    const tDone = setTimeout(() => {
      setActiveAnimation(null);
    }, duration);

    animTimersRef.current = [tOverlay, tResolve, tDone];
  };

  // Check if current card is Artillerist or Old Wizard before stepping
  const triggerNextTurn = () => {
    if (gameState.phase !== 'battle_resolving' || activeAnimation) return;

    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (!currentCard) {
      return;
    }

    // 1. Артиллерист (seer): доходит очередь -> заменяется на скрытое заклинание «Артиллерия»
    if (
      (currentCard.card.id === 'seer' || currentCard.card.id === 'artillerist') &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled
    ) {
      const artilleryCard = getCardById('artillery');
      if (artilleryCard) {
        runAnimatedStep(
          currentCard,
          () => handleStepResolution(artilleryCard),
          artilleryCard
        );
        return;
      }
    }

    // 2. Старый колдун (old_wizard): меняет себя на любое заклинание из руки на выбор
    if (
      currentCard.card.id === 'old_wizard' &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled
    ) {
      const ownerState =
        currentCard.owner === 'player1' ? gameState.player1 : gameState.player2;

      // Spells currently available in owner's hand
      const availableSpells = ownerState.hand.filter((c) => c.type === 'magic');

      if (!ownerState.isBot && availableSpells.length > 0) {
        // Prompt human player to choose which spell to swap with
        setWizardModalOpen(true);
        return;
      } else if (ownerState.isBot && availableSpells.length > 0) {
        // Bot automatically chooses best available spell from hand
        const botSpell = selectBotSpellCard(ownerState.hand);
        runAnimatedStep(
          currentCard,
          () => handleStepResolution(botSpell),
          botSpell
        );
        return;
      }
    }

    // 3. Некромант (necromancer): выбирает существо с рангом <= 6 из сброса для возвращения в руку
    if (
      currentCard.card.id === 'necromancer' &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled
    ) {
      const ownerState =
        currentCard.owner === 'player1' ? gameState.player1 : gameState.player2;
      const eligibleCreatures = ownerState.discard.filter(
        (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
      );

      if (!ownerState.isBot && eligibleCreatures.length > 0) {
        setNecromancerModalOpen(true);
        return;
      } else if (ownerState.isBot && eligibleCreatures.length > 0) {
        const botRevive = selectBotReviveCard(ownerState.discard);
        runAnimatedStep(currentCard, () =>
          handleStepResolution(undefined, botRevive)
        );
        return;
      }
    }

    // 4. Эвакуация (evacuation): возвращает одно союзное существо или технику с поля боя в руку (или ничего не делает)
    if (
      currentCard.card.id === 'evacuation' &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled &&
      !currentCard.isEvacuated
    ) {
      const ownerState =
        currentCard.owner === 'player1' ? gameState.player1 : gameState.player2;
      const eligibleBattleTargets = gameState.activeBattleQueue.filter(
        (c) =>
          c.owner === currentCard.owner &&
          !c.isDestroyed &&
          !c.isEvacuated &&
          c.instanceId !== currentCard.instanceId &&
          (c.card.type === 'creature' || c.card.type === 'technology')
      );

      if (!ownerState.isBot && eligibleBattleTargets.length > 0) {
        setEvacuationModalOpen(true);
        return;
      } else if (ownerState.isBot && eligibleBattleTargets.length > 0) {
        const botEvacuate = selectBotEvacuateCard(
          gameState.activeBattleQueue,
          currentCard.owner
        );
        runAnimatedStep(
          currentCard,
          () => handleStepResolution(undefined, undefined, botEvacuate ?? null),
          undefined,
          botEvacuate?.id
        );
        return;
      }
    }

    // Normal step
    runAnimatedStep(currentCard, () => handleStepResolution());
  };

  // Auto-play effect
  useEffect(() => {
    if (
      autoPlay &&
      gameState.phase === 'battle_resolving' &&
      !activeAnimation &&
      !wizardModalOpen &&
      !necromancerModalOpen &&
      !evacuationModalOpen &&
      !surrenderModalOpen &&
      !inspectModal
    ) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        triggerNextTurn();
      }, 380);
    }
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [
    autoPlay,
    activeAnimation,
    gameState.phase,
    gameState.currentTurnIndex,
    wizardModalOpen,
    necromancerModalOpen,
    evacuationModalOpen,
    surrenderModalOpen,
    inspectModal,
  ]);

  // Wizard modal replacement confirmed
  const handleWizardChoice = (repCard?: CardDefinition) => {
    setWizardModalOpen(false);
    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (currentCard && repCard) {
      runAnimatedStep(
        currentCard,
        () => handleStepResolution(repCard),
        repCard
      );
    } else {
      handleStepResolution(repCard);
    }
  };

  // Necromancer modal revival confirmed
  const handleNecromancerChoice = (reviveCard?: CardDefinition) => {
    setNecromancerModalOpen(false);
    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (currentCard && reviveCard) {
      runAnimatedStep(currentCard, () =>
        handleStepResolution(undefined, reviveCard)
      );
    } else {
      handleStepResolution(undefined, reviveCard ?? null);
    }
  };

  // Evacuation modal target confirmed
  const handleEvacuationChoice = (evacuateCard?: CardDefinition) => {
    setEvacuationModalOpen(false);
    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (currentCard && evacuateCard) {
      runAnimatedStep(
        currentCard,
        () => handleStepResolution(undefined, undefined, evacuateCard),
        undefined,
        evacuateCard.id
      );
    } else {
      handleStepResolution(undefined, undefined, evacuateCard ?? null);
    }
  };

  // Surrender battle immediately
  const handleConfirmSurrender = () => {
    sound.playDefeat();
    resetBattleTransientUi();

    const surrenderingPlayer =
      gameState.mode === 'pvp_local' && gameState.phase === 'p2_select'
        ? 'player2'
        : 'player1';
    const winner: 'player1' | 'player2' =
      surrenderingPlayer === 'player1' ? 'player2' : 'player1';
    const surrenderingName =
      surrenderingPlayer === 'player1'
        ? gameState.player1.name
        : gameState.player2.name;

    setGameState((prev) => ({
      ...prev,
      phase: 'game_over',
      winner,
      defeatReason: 'surrender',
      historyRoundsCount: Math.max(prev.historyRoundsCount, prev.roundNumber),
      battleLog: [
        ...prev.battleLog,
        createLogEntry('fail', `${surrenderingName} сдаётся — бой завершён досрочно.`),
      ],
    }));
  };

  // Next round transition & defeat verification
  const handleNextRound = () => {
    sound.playSelect();
    clearAnimationTimers();
    setActiveAnimation(null);
    setInspectModal(null);
    setAutoPlay(false);

    // Rule: Player loses if out of cards at start of next battle OR no winner after 10 rounds
    const p1Empty = gameState.player1.hand.length === 0;
    const p2Empty = gameState.player2.hand.length === 0;

    if (p1Empty || p2Empty) {
      const winner: 'player1' | 'player2' = p1Empty ? 'player2' : 'player1';
      if (winner === 'player1' || gameState.mode === 'pvp_local') {
        sound.playVictory();
      } else {
        sound.playDefeat();
      }

      // Unlock next campaign stage upon player victory
      if (winner === 'player1' && gameState.campaign) {
        const { side, stageId } = gameState.campaign;
        setCampaignProgress((prevProgress) => {
          const existing = prevProgress.completedStages[side] ?? [];
          if (existing.includes(stageId)) {
            return prevProgress;
          }
          const updated: CampaignProgress = {
            completedStages: {
              ...prevProgress.completedStages,
              [side]: [...existing, stageId].sort((a, b) => a - b),
            },
          };
          saveCampaignProgress(updated);
          return updated;
        });
      }

      setGameState((prev) => ({
        ...prev,
        phase: 'game_over',
        winner,
        defeatReason: 'empty_hand',
      }));
      return;
    }

    // Turn limit rule: if no winner after 10 rounds, player loses
    if (gameState.roundNumber >= MAX_BATTLE_ROUNDS) {
      sound.playDefeat();
      setGameState((prev) => ({
        ...prev,
        phase: 'game_over',
        winner: 'player2',
        defeatReason: 'turn_limit',
        battleLog: [
          ...prev.battleLog,
          createLogEntry(
            'fail',
            `За ${MAX_BATTLE_ROUNDS} ходов победитель не выявлен — игрок потерпел поражение!`
          ),
        ],
      }));
      return;
    }

    // Start next round
    setGameState((prev) => ({
      ...prev,
      phase: 'p1_select',
      roundNumber: prev.roundNumber + 1,
      activeBattleQueue: [],
      currentTurnIndex: 0,
      player1: {
        ...prev.player1,
        selectedCardIds: [],
      },
      player2: {
        ...prev.player2,
        selectedCardIds: [],
      },
      battleLog: [
        ...prev.battleLog,
        createLogEntry(
          'info',
          `=== НАЧАЛО ХОДА #${prev.roundNumber + 1} из ${MAX_BATTLE_ROUNDS} === Выберите карты для нового противостояния.`
        ),
      ],
    }));
  };

  const resistanceStages = getCampaignStagesBySide('resistance');
  const resistanceCompletedIds =
    campaignProgress.completedStages.resistance ?? [];

  // Render Main Menu
  if (gameState.phase === 'menu') {
    return (
      <>
        <MainMenu
          hasSavedGame={hasSavedSession}
          savedGameLabel={savedGameLabel}
          campaignCompletedCount={resistanceCompletedIds.length}
          campaignTotalStages={resistanceStages.length}
          onOpenCampaign={handleOpenCampaign}
          onNewGame={handleStartNewGame}
          onResumeGame={handleResumeGame}
          onOpenRules={() => setIsRulesOpen(true)}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </>
    );
  }

  // Render Campaign Faction Selection
  if (gameState.phase === 'campaign_select') {
    return (
      <>
        <CampaignFactionSelect
          resistanceCompletedCount={resistanceCompletedIds.length}
          resistanceTotalStages={resistanceStages.length}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onSelectFaction={handleSelectCampaignFaction}
          onBackToMenu={handleQuitToMenu}
          onOpenRules={() => setIsRulesOpen(true)}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </>
    );
  }

  // Render Campaign Map
  if (gameState.phase === 'campaign_map') {
    const mapStages = getCampaignStagesBySide(selectedCampaignSide);
    const completedForSide =
      campaignProgress.completedStages[selectedCampaignSide] ?? [];

    return (
      <>
        <CampaignMap
          side={selectedCampaignSide}
          stages={mapStages}
          completedStageIds={completedForSide}
          isMuted={isMuted}
          onToggleMute={toggleMute}
          onStartStage={handleStartCampaignStage}
          onInspectCard={(card, ownerLabel) => {
            sound.playSelect();
            setInspectModal({
              card,
              mode: 'inspect',
              ownerLabel,
            });
          }}
          onBackToFactions={handleOpenCampaign}
          onBackToMenu={handleQuitToMenu}
          onOpenRules={() => setIsRulesOpen(true)}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
        <CardInspectModal
          inspectState={inspectModal}
          isSelected={false}
          selectedCount={0}
          maxSelectable={3}
          onConfirmSelect={() => setInspectModal(null)}
          onClose={() => setInspectModal(null)}
        />
      </>
    );
  }

  // Render Pass Device screen for Hotseat PvP
  if (gameState.phase === 'pass_device') {
    return (
      <PassDeviceScreen
        nextPlayerName={gameState.player2.name}
        nextPlayerSide={gameState.player2.side}
        flipBackground={gameState.player1.side === 'dark_side'}
        onContinue={() => {
          sound.playSelect();
          setGameState((prev) => ({ ...prev, phase: 'p2_select' }));
        }}
      />
    );
  }

  // Active Game Screen
  const isP1Turn = gameState.phase === 'p1_select';
  const isP2Turn = gameState.phase === 'p2_select';
  const isResolving = gameState.phase === 'battle_resolving';
  const isEnded = gameState.phase === 'battle_ended';
  const isReady = gameState.phase === 'ready_to_battle';

  const maxSelectP1 = Math.min(3, gameState.player1.hand.length);
  const maxSelectP2 = Math.min(3, gameState.player2.hand.length);

  const canConfirmP1 =
    isP1Turn &&
    gameState.player1.selectedCardIds.length > 0 &&
    gameState.player1.selectedCardIds.length <= maxSelectP1;

  const canConfirmP2 =
    isP2Turn &&
    gameState.player2.selectedCardIds.length > 0 &&
    gameState.player2.selectedCardIds.length <= maxSelectP2;

  // Available Spells for Old Wizard Modal & Eligible Discard Creatures for Necromancer Modal
  const currentCardActing = gameState.activeBattleQueue[gameState.currentTurnIndex];
  const actingOwnerHand =
    currentCardActing?.owner === 'player1'
      ? gameState.player1.hand
      : gameState.player2.hand;
  const actingOwnerDiscard =
    currentCardActing?.owner === 'player1'
      ? gameState.player1.discard
      : gameState.player2.discard;
  const wizardSpellsHand = actingOwnerHand.filter((c) => c.type === 'magic');
  const necromancerEligibleDiscard = actingOwnerDiscard.filter(
    (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
  );
  const evacuationEligibleCards = currentCardActing
    ? gameState.activeBattleQueue
        .filter(
          (c) =>
            c.owner === currentCardActing.owner &&
            !c.isDestroyed &&
            !c.isEvacuated &&
            c.instanceId !== currentCardActing.instanceId &&
            (c.card.type === 'creature' || c.card.type === 'technology')
        )
        .map((c) => c.card)
    : [];

  // Opposing battlefield rows arranged left-to-right by slotIndex
  const player2BattleCards = gameState.activeBattleQueue
    .filter((c) => c.owner === 'player2')
    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));
  const player1BattleCards = gameState.activeBattleQueue
    .filter((c) => c.owner === 'player1')
    .sort((a, b) => (a.slotIndex ?? 0) - (b.slotIndex ?? 0));

  return (
    <div className="h-dvh w-screen overflow-hidden bg-[#090b0e] text-[#e6dac9] flex flex-col font-sans select-none">
      {/* Slim Fixed Brushed-Steel Command Header Bar */}
      <header className="h-10 sm:h-11 px-3 sm:px-4 steel-bar border-x-0 border-t-0 border-b-[#343d47] flex items-center justify-between gap-2 z-40 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <GameButton
            variant="secondary"
            size="xs"
            onClick={
              gameState.campaign ? handleReturnToCampaignMap : handleQuitToMenu
            }
            className="shrink-0"
          >
            {gameState.campaign ? '← Карта' : '← Меню'}
          </GameButton>
          <div className="h-4 w-px bg-[#38414b] shrink-0" />
          <div className="flex items-center gap-1.5 sm:gap-2 min-w-0">
            <h1 className="font-display text-xs sm:text-sm font-semibold text-[#efe5d7] uppercase tracking-[0.1em] truncate">
              {gameState.campaign
                ? `Этап ${gameState.campaign.stageId} · Ход`
                : 'Ход'}
            </h1>
            <LedCounter
              value={`${String(gameState.roundNumber).padStart(2, '0')}/${MAX_BATTLE_ROUNDS}`}
              size="xs"
              className={
                gameState.roundNumber >= MAX_BATTLE_ROUNDS - 1
                  ? 'border-[#b84039]'
                  : ''
              }
            />
          </div>
          <span className="text-[11px] font-led text-[#8e9aa7] hidden sm:inline shrink-0 uppercase tracking-wider">
            ·{' '}
            {gameState.campaign
              ? getCampaignStage(
                  gameState.campaign.side,
                  gameState.campaign.stageId
                )?.title ?? 'Кампания'
              : gameState.mode === 'bot'
              ? 'Против бота'
              : '2 игрока'}
          </span>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          {gameState.phase !== 'game_over' && (
            <GameButton
              variant="crimson"
              size="xs"
              onClick={() => {
                sound.playSelect();
                setAutoPlay(false);
                setSurrenderModalOpen(true);
              }}
              title="Сдаться и выйти из боя"
            >
              <Flag className="w-3.5 h-3.5" />
              <span>Сдаться</span>
            </GameButton>
          )}

          <GameButton
            variant="secondary"
            size="xs"
            onClick={() => setMobileLogOpen(true)}
            className="lg:hidden"
          >
            <ScrollText className="w-3.5 h-3.5 text-[#d4c3ad]" />
            <span>Журнал</span>
            <span className="led-readout font-led px-1 rounded-[2px] text-[10px] font-bold leading-tight">
              {gameState.battleLog.length}
            </span>
          </GameButton>

          <GameButton
            variant="secondary"
            size="xs"
            onClick={toggleMute}
            title={isMuted ? 'Включить звук' : 'Выключить звук'}
          >
            {isMuted ? (
              <VolumeX className="w-3.5 h-3.5 text-[#8a94a0]" />
            ) : (
              <Volume2 className="w-3.5 h-3.5 text-[#84d2ea]" />
            )}
          </GameButton>

          <GameButton
            variant="secondary"
            size="xs"
            onClick={() => setIsRulesOpen(true)}
          >
            <BookOpen className="w-3.5 h-3.5 text-[#d9c9b4]" />
            <span className="hidden sm:inline">Правила</span>
          </GameButton>
        </div>
      </header>

      {/* Fixed-Viewport Play Area: Left Battle Log Sidebar (desktop) + Unified Seamless Table */}
      <main className="flex-1 min-h-0 w-full grid grid-cols-1 lg:grid-cols-[310px_1fr] xl:grid-cols-[350px_1fr] overflow-hidden">
        {/* LEFT SIDEBAR: BATTLE EVENT LOG (Only element that scrolls) */}
        <aside className="hidden lg:flex flex-col min-h-0 p-2.5 bg-[#0c0f13]/95 border-r border-[#2b333d] z-10">
          <BattleLog
            logs={gameState.battleLog}
            maxHeight=""
            className="h-full min-h-0"
          />
        </aside>

        {/* UNIFIED SEAMLESS GAME TABLE (Zero boxed zones, zero page scroll) */}
        <div className="relative h-full min-h-0 w-full flex flex-col justify-between overflow-hidden px-2 sm:px-5 py-1.5 bg-[#090b0e]">
          {/* Battlefield background artwork — flipped 180° when Player 1 plays Dark Side */}
          <div
            aria-hidden="true"
            style={{
              backgroundImage: `url(${DEFAULT_GAME_BACKGROUND})`,
            }}
            className={`pointer-events-none absolute inset-0 bg-cover bg-center bg-no-repeat ${
              gameState.player1.side === 'dark_side' ? 'rotate-180' : ''
            }`}
          />

          {/* Subtle top/bottom atmospheric vignette keeping the central rift vivid */}
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#080a0e]/58 via-transparent to-[#080a0e]/64"
          />

          <div className="relative z-10 flex-1 min-h-0 w-full flex flex-col justify-between overflow-visible">
          {/* TOP HAND: PLAYER 2 */}
          <HandZone
            cards={gameState.player2.hand}
            selectedCardIds={gameState.player2.selectedCardIds}
            isSelectable={isP2Turn && !gameState.player2.isBot}
            onInspectCard={(card) =>
              openHandCardInspect(
                'player2',
                card,
                isP2Turn && !gameState.player2.isBot
              )
            }
            playerName={gameState.player2.name}
            playerSide={gameState.player2.side}
            discardCount={gameState.player2.discard.length}
            onOpenDiscard={() =>
              setDiscardModal({
                isOpen: true,
                title: `Сброс (${gameState.player2.name})`,
                cards: gameState.player2.discard,
              })
            }
            isBot={gameState.player2.isBot}
            isOpponent={gameState.mode === 'bot' || !isP2Turn}
            isCompactBattle={isReady || isResolving || isEnded}
          />

          {/* CENTER ARENA: Open Table Felt / Opposing Battle Lines (No boxed zone, no center idle description) */}
          <div className="flex-1 min-h-0 w-full flex flex-col items-center justify-center relative overflow-visible py-1">
            {isReady ? (
              <div className="w-full flex flex-col items-center justify-center gap-1.5 sm:gap-3">
                {/* Top Line: Player 2 Hidden Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-1">
                  <span
                    className={`px-2.5 py-0.5 rounded-[3px] steel-bar border-l-2 ${
                      gameState.player2.side === 'resistance'
                        ? 'border-l-[#67c2de] text-[#d9eff7]'
                        : 'border-l-[#d94b3b] text-[#f0d9d5]'
                    } text-[10px] sm:text-[11px] font-display font-semibold uppercase tracking-[0.09em]`}
                  >
                    {gameState.player2.name}
                  </span>
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center">
                    {gameState.player2.selectedCardIds.map((id, idx) => (
                      <div key={`p2-ready-${idx}`} className="animate-card-deal">
                        <CardView
                          card={gameState.player2.hand.find((c) => c.id === id)!}
                          size="battle"
                          isFaceDown={true}
                          isRevealed={false}
                        />
                      </div>
                    ))}
                  </div>
                </div>

                {/* Center VS Divider + Reveal Button */}
                <div className="w-full flex items-center justify-center gap-3 py-0.5">
                  <RiftDivider direction="left" className="flex-1" />
                  <GameButton
                    variant="primary"
                    size="lg"
                    withOrnaments
                    onClick={handleStartBattle}
                  >
                    <Swords className="w-4 h-4" />
                    <span>Вскрыть карты</span>
                  </GameButton>
                  <RiftDivider direction="right" className="flex-1" />
                </div>

                {/* Bottom Line: Player 1 Hidden Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-1">
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center">
                    {gameState.player1.selectedCardIds.map((id, idx) => (
                      <div key={`p1-ready-${idx}`} className="animate-card-deal">
                        <CardView
                          card={gameState.player1.hand.find((c) => c.id === id)!}
                          size="battle"
                          isFaceDown={true}
                          isRevealed={false}
                        />
                      </div>
                    ))}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-[3px] steel-bar border-l-2 ${
                      gameState.player1.side === 'resistance'
                        ? 'border-l-[#67c2de] text-[#d9eff7]'
                        : 'border-l-[#d94b3b] text-[#f0d9d5]'
                    } text-[10px] sm:text-[11px] font-display font-semibold uppercase tracking-[0.09em]`}
                  >
                    {gameState.player1.name} (Вы)
                  </span>
                </div>
              </div>
            ) : isResolving || isEnded ? (
              <div className="w-full flex flex-col items-center justify-center gap-1.5 sm:gap-2.5 relative overflow-visible">
                {/* Top Line: Player 2 Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-0.5 sm:gap-1 overflow-visible">
                  <span
                    className={`px-2.5 py-0.5 rounded-[3px] steel-bar border-l-2 ${
                      gameState.player2.side === 'resistance'
                        ? 'border-l-[#67c2de] text-[#d9eff7]'
                        : 'border-l-[#d94b3b] text-[#f0d9d5]'
                    } text-[10px] sm:text-[11px] font-display font-semibold uppercase tracking-[0.09em]`}
                  >
                    {gameState.player2.name}
                  </span>
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center items-center overflow-visible">
                    {player2BattleCards.map((bCard) => {
                      const isActing =
                        isResolving &&
                        !activeAnimation &&
                        bCard.instanceId === currentCardActing?.instanceId;
                      const isThisAnimating =
                        activeAnimation?.instanceId === bCard.instanceId;
                      const animClass = isThisAnimating
                        ? activeAnimation.mode === 'arc_attack'
                          ? 'animate-arc-attack'
                          : 'animate-center-cast'
                        : '';
                      const isImpact = Boolean(
                        activeAnimation?.showImpactOverlay &&
                          activeAnimation.impactTargetIds.includes(bCard.instanceId)
                      );
                      const isShield = Boolean(
                        activeAnimation?.showImpactOverlay &&
                          activeAnimation.shieldTargetIds.includes(bCard.instanceId)
                      );

                      return (
                        <div
                          key={bCard.instanceId}
                          ref={(el) => {
                            cardRefs.current[bCard.instanceId] = el;
                          }}
                          className={`animate-card-deal overflow-visible ${
                            isThisAnimating ? 'relative z-50' : 'relative z-10'
                          }`}
                        >
                          <CardView
                            card={bCard.card}
                            size="battle"
                            isCurrentActor={isActing}
                            turnDirection="down"
                            activeAnimationClass={animClass}
                            activeAnimationStyle={
                              isThisAnimating ? activeAnimation.style : undefined
                            }
                            isImpactTarget={isImpact}
                            isShieldTarget={isShield}
                            isDestroyed={bCard.isDestroyed}
                            isDisabled={bCard.isDisabled}
                            isCancelled={bCard.isCancelled}
                            isEvacuated={bCard.isEvacuated}
                            currentRank={bCard.currentRank}
                            currentInitiative={bCard.currentInitiative}
                            protectedAgainst={bCard.protectedAgainst}
                            onClick={() =>
                              openBattleCardInspect(bCard, gameState.player2.name)
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Center Line: Combat Controls + Center-Stage Radial Burst Anchor */}
                <div
                  ref={battlefieldCenterRef}
                  className="w-full flex items-center justify-center gap-2 sm:gap-3 py-0.5 relative overflow-visible"
                >
                  {/* Radial Energy Beams & Shockwaves during Center Cast */}
                  {activeAnimation?.mode === 'center_cast' && (() => {
                    const theme = THEME_COLORS[activeAnimation.effectTheme];
                    const rayAngles = Array.from({ length: 12 }, (_, i) => i * 30);
                    const needleAngles = Array.from({ length: 12 }, (_, i) => i * 30 + 15);
                    return (
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center">
                        <div
                          className="w-56 h-56 rounded-full blur-2xl animate-shockwave"
                          style={{ backgroundColor: theme.glow }}
                        />
                        <div
                          className="absolute w-44 h-44 rounded-full border-2 animate-shockwave"
                          style={{
                            borderColor: theme.primary,
                            boxShadow: `0 0 28px ${theme.glow}`,
                          }}
                        />
                        <div
                          className="absolute w-32 h-32 rounded-full border animate-shockwave"
                          style={{
                            borderColor: theme.core,
                            animationDelay: '130ms',
                          }}
                        />
                        <svg
                          viewBox="-220 -220 440 440"
                          className="absolute w-[320px] h-[320px] sm:w-[440px] sm:h-[440px] animate-rays-burst overflow-visible"
                          style={{
                            filter: `drop-shadow(0 0 12px ${theme.primary})`,
                          }}
                        >
                          <circle
                            cx="0"
                            cy="0"
                            r="54"
                            fill="none"
                            stroke={theme.core}
                            strokeWidth="2.5"
                            strokeDasharray="10 8"
                            opacity="0.85"
                          />
                          {rayAngles.map((deg) => (
                            <g key={`ray-${deg}`} transform={`rotate(${deg})`}>
                              <polygon
                                points="-5,38 5,38 1.5,205 -1.5,205"
                                fill={theme.primary}
                                opacity="0.85"
                              />
                              <line
                                x1="0"
                                y1="42"
                                x2="0"
                                y2="195"
                                stroke={theme.core}
                                strokeWidth="1.8"
                                strokeLinecap="round"
                                opacity="0.95"
                              />
                            </g>
                          ))}
                          {needleAngles.map((deg) => (
                            <line
                              key={`needle-${deg}`}
                              x1="0"
                              y1="52"
                              x2="0"
                              y2="165"
                              transform={`rotate(${deg})`}
                              stroke={theme.secondary}
                              strokeWidth="2"
                              strokeLinecap="round"
                              opacity="0.78"
                            />
                          ))}
                        </svg>
                      </div>
                    );
                  })()}

                  <RiftDivider direction="left" className="flex-1" />
                  <div
                    className={`flex items-center justify-center gap-2 shrink-0 z-20 transition-opacity duration-200 ${
                      activeAnimation ? 'opacity-20 pointer-events-none' : 'opacity-100'
                    }`}
                  >
                    {isResolving && (
                      <>
                        <GameButton
                          variant="primary"
                          size="md"
                          withOrnaments
                          onClick={triggerNextTurn}
                          disabled={Boolean(activeAnimation)}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Следующий ход</span>
                        </GameButton>

                        <GameButton
                          variant={autoPlay ? 'emerald' : 'secondary'}
                          size="md"
                          onClick={() => setAutoPlay(!autoPlay)}
                        >
                          <FastForward className="w-3.5 h-3.5" />
                          <span>{autoPlay ? 'Авто: ВКЛ' : 'Авто-бой'}</span>
                        </GameButton>
                      </>
                    )}

                    {isEnded && (() => {
                      const willEndMatch =
                        gameState.player1.hand.length === 0 ||
                        gameState.player2.hand.length === 0 ||
                        gameState.roundNumber >= MAX_BATTLE_ROUNDS;

                      return (
                        <GameButton
                          variant={willEndMatch ? 'primary' : 'emerald'}
                          size="lg"
                          withOrnaments
                          onClick={handleNextRound}
                        >
                          <RotateCcw className="w-4 h-4" />
                          <span>
                            {willEndMatch ? 'Итог битвы' : 'Следующий бой'}
                          </span>
                        </GameButton>
                      );
                    })()}
                  </div>
                  <RiftDivider direction="right" className="flex-1" />
                </div>

                {/* Bottom Line: Player 1 Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-0.5 sm:gap-1 overflow-visible">
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center items-center overflow-visible">
                    {player1BattleCards.map((bCard) => {
                      const isActing =
                        isResolving &&
                        !activeAnimation &&
                        bCard.instanceId === currentCardActing?.instanceId;
                      const isThisAnimating =
                        activeAnimation?.instanceId === bCard.instanceId;
                      const animClass = isThisAnimating
                        ? activeAnimation.mode === 'arc_attack'
                          ? 'animate-arc-attack'
                          : 'animate-center-cast'
                        : '';
                      const isImpact = Boolean(
                        activeAnimation?.showImpactOverlay &&
                          activeAnimation.impactTargetIds.includes(bCard.instanceId)
                      );
                      const isShield = Boolean(
                        activeAnimation?.showImpactOverlay &&
                          activeAnimation.shieldTargetIds.includes(bCard.instanceId)
                      );

                      return (
                        <div
                          key={bCard.instanceId}
                          ref={(el) => {
                            cardRefs.current[bCard.instanceId] = el;
                          }}
                          className={`animate-card-deal overflow-visible ${
                            isThisAnimating ? 'relative z-50' : 'relative z-10'
                          }`}
                        >
                          <CardView
                            card={bCard.card}
                            size="battle"
                            isCurrentActor={isActing}
                            turnDirection="up"
                            activeAnimationClass={animClass}
                            activeAnimationStyle={
                              isThisAnimating ? activeAnimation.style : undefined
                            }
                            isImpactTarget={isImpact}
                            isShieldTarget={isShield}
                            isDestroyed={bCard.isDestroyed}
                            isDisabled={bCard.isDisabled}
                            isCancelled={bCard.isCancelled}
                            isEvacuated={bCard.isEvacuated}
                            currentRank={bCard.currentRank}
                            currentInitiative={bCard.currentInitiative}
                            protectedAgainst={bCard.protectedAgainst}
                            onClick={() =>
                              openBattleCardInspect(
                                bCard,
                                `${gameState.player1.name} (Вы)`
                              )
                            }
                          />
                        </div>
                      );
                    })}
                  </div>
                  <span
                    className={`px-2.5 py-0.5 rounded-[3px] steel-bar border-l-2 ${
                      gameState.player1.side === 'resistance'
                        ? 'border-l-[#67c2de] text-[#d9eff7]'
                        : 'border-l-[#d94b3b] text-[#f0d9d5]'
                    } text-[10px] sm:text-[11px] font-display font-semibold uppercase tracking-[0.09em]`}
                  >
                    {gameState.player1.name} (Вы)
                  </span>
                </div>
              </div>
            ) : (
              /* Center Selection Confirm Line */
              <div
                className={`w-full flex items-center justify-center gap-3 transition-opacity duration-200 ${
                  turnBanner ? 'opacity-25' : 'opacity-100'
                }`}
              >
                <RiftDivider direction="left" className="flex-1" />
                {isP1Turn ? (
                  <GameButton
                    variant="primary"
                    size="lg"
                    withOrnaments
                    disabled={!canConfirmP1}
                    onClick={handleP1Confirm}
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      В бой ({gameState.player1.selectedCardIds.length}/{maxSelectP1})
                    </span>
                  </GameButton>
                ) : isP2Turn && !gameState.player2.isBot ? (
                  <GameButton
                    variant="crimson"
                    size="lg"
                    withOrnaments
                    disabled={!canConfirmP2}
                    onClick={handleP2Confirm}
                  >
                    <Swords className="w-4 h-4" />
                    <span>
                      В бой ({gameState.player2.selectedCardIds.length}/{maxSelectP2})
                    </span>
                  </GameButton>
                ) : null}
                <RiftDivider direction="right" className="flex-1" />
              </div>
            )}
          </div>

          {/* BOTTOM HAND: PLAYER 1 */}
          <HandZone
            cards={gameState.player1.hand}
            selectedCardIds={gameState.player1.selectedCardIds}
            isSelectable={isP1Turn}
            onInspectCard={(card) =>
              openHandCardInspect('player1', card, isP1Turn)
            }
            playerName={`${gameState.player1.name} (Вы)`}
            playerSide={gameState.player1.side}
            discardCount={gameState.player1.discard.length}
            onOpenDiscard={() =>
              setDiscardModal({
                isOpen: true,
                title: `Сброс (${gameState.player1.name})`,
                cards: gameState.player1.discard,
              })
            }
            isOpponent={gameState.mode === 'pvp_local' && isP2Turn}
            isCompactBattle={isReady || isResolving || isEnded}
          />
          </div>
        </div>
      </main>

      {/* Center-Screen Armored Turn Announcement Banner */}
      {turnBanner && (
        <div
          key={turnBanner.key}
          className="fixed inset-0 flex items-center justify-center pointer-events-none z-40 px-4"
        >
          <div className="animate-turn-banner relative w-full max-w-md py-3 sm:py-4 px-6 flex flex-col items-center justify-center text-center bg-gradient-to-r from-transparent via-[#12161c]/95 to-transparent">
            <div
              className={`absolute top-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent ${
                turnBanner.side === 'dark_side'
                  ? 'via-[#e05246]/90'
                  : 'via-[#67c2de]/90'
              } to-transparent`}
            />
            <div
              className={`font-display text-2xl sm:text-3xl font-bold uppercase tracking-[0.14em] drop-shadow-[0_3px_12px_rgba(0,0,0,0.95)] ${
                turnBanner.side === 'dark_side'
                  ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#faeae6] via-[#eb8a73] to-[#cc463b]'
                  : 'text-transparent bg-clip-text bg-gradient-to-b from-[#f3efe8] via-[#b8dfec] to-[#68b6d1]'
              }`}
            >
              {turnBanner.title}
            </div>
            {turnBanner.subtitle && (
              <div className="mt-0.5 text-xs sm:text-sm font-medium text-[#d8cec0] drop-shadow-[0_1px_4px_rgba(0,0,0,0.95)]">
                {turnBanner.subtitle}
              </div>
            )}
            <div
              className={`absolute bottom-0 inset-x-0 h-[1.5px] bg-gradient-to-r from-transparent ${
                turnBanner.side === 'dark_side'
                  ? 'via-[#e05246]/90'
                  : 'via-[#67c2de]/90'
              } to-transparent`}
            />
          </div>
        </div>
      )}

      {/* Mobile Battle Log Drawer (only scrollable area on mobile) */}
      {mobileLogOpen && (
        <div
          onClick={() => setMobileLogOpen(false)}
          className="lg:hidden fixed inset-0 z-50 bg-[#05070a]/85 backdrop-blur-sm flex items-center justify-center p-3"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-md h-[82dvh] flex flex-col"
          >
            <BattleLog
              logs={gameState.battleLog}
              maxHeight=""
              className="h-full min-h-0"
              onClose={() => setMobileLogOpen(false)}
            />
          </div>
        </div>
      )}

      {/* Modals */}
      <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />

      {/* Surrender Confirmation Modal */}
      {surrenderModalOpen && (
        <div
          onClick={() => setSurrenderModalOpen(false)}
          className="fixed inset-0 z-50 bg-[#05070a]/85 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="relative w-full max-w-sm steel-plate border-[#7a3136] rounded-[6px] p-5 flex flex-col items-center text-center overflow-hidden"
          >
            <CornerRivets tone="dark" />
            <div className="w-12 h-12 btn-chamfer steel-recessed border-[#c9423f] text-[#eb6a61] flex items-center justify-center mb-3">
              <Flag className="w-6 h-6" />
            </div>
            <h2 className="font-display text-xl font-bold uppercase tracking-[0.07em] text-[#f6eae6]">
              Сдаться и выйти из боя?
            </h2>
            <RiftDivider className="w-40 my-2.5" />
            <p className="text-xs text-[#c5ced7] leading-relaxed mb-5">
              Текущий бой будет немедленно завершён поражением, а незавершённая партия сброшена.
            </p>
            <div className="w-full grid grid-cols-2 gap-2.5">
              <GameButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={() => setSurrenderModalOpen(false)}
              >
                Отмена
              </GameButton>
              <GameButton
                variant="crimson"
                size="md"
                fullWidth
                onClick={handleConfirmSurrender}
              >
                <Flag className="w-3.5 h-3.5" />
                <span>Сдаться</span>
              </GameButton>
            </div>
          </div>
        </div>
      )}

      {(() => {
        const currentCampaignStage = gameState.campaign
          ? getCampaignStage(gameState.campaign.side, gameState.campaign.stageId)
          : undefined;
        const nextCampaignStage = gameState.campaign
          ? getCampaignStage(
              gameState.campaign.side,
              gameState.campaign.stageId + 1
            )
          : undefined;

        return (
          <GameOverModal
            isOpen={gameState.phase === 'game_over'}
            winnerSide={
              gameState.winner === 'player1'
                ? gameState.player1.side
                : gameState.player2.side
            }
            winnerName={
              gameState.winner === 'player1'
                ? gameState.player1.name
                : gameState.player2.name
            }
            loserName={
              gameState.winner === 'player1'
                ? gameState.player2.name
                : gameState.player1.name
            }
            roundsCount={gameState.historyRoundsCount}
            defeatReason={gameState.defeatReason}
            isCampaign={Boolean(gameState.campaign)}
            campaignStageId={gameState.campaign?.stageId}
            isPlayer1Winner={gameState.winner === 'player1'}
            hasNextCampaignStage={Boolean(nextCampaignStage)}
            onNextStage={
              nextCampaignStage
                ? () => handleStartCampaignStage(nextCampaignStage)
                : undefined
            }
            onReturnToMap={
              gameState.campaign ? handleReturnToCampaignMap : undefined
            }
            onRestart={() => {
              if (currentCampaignStage) {
                handleStartCampaignStage(currentCampaignStage);
              } else {
                handleStartNewGame(gameState.mode, gameState.player1.side);
              }
            }}
            onHome={handleQuitToMenu}
          />
        );
      })()}

      <CardSwapModal
        isOpen={wizardModalOpen}
        title="Способность Старого колдуна"
        description="Старый колдун может заменить себя на любое заклинание из вашей руки. Новое заклинание займёт его место на поле и сразу вступит в бой!"
        cards={wizardSpellsHand}
        onSelectCard={handleWizardChoice}
        skipButtonText="Оставить Старого колдуна на поле"
      />

      <CardSwapModal
        isOpen={necromancerModalOpen}
        title="Способность Некроманта"
        description="Некромант приносит себя в жертву и уходит в сброс. Выберите существо с рангом 6 и ниже из вашего сброса, чтобы вернуть его в руку."
        cards={necromancerEligibleDiscard}
        onSelectCard={handleNecromancerChoice}
        skipButtonText="Не воскрешать существо"
      />

      <CardSwapModal
        isOpen={evacuationModalOpen}
        title="Способность карты «Эвакуация»"
        description="Выберите одно союзное существо или технику на поле боя, чтобы вернуть его обратно в руку, либо откажитесь от эвакуации."
        cards={evacuationEligibleCards}
        onSelectCard={handleEvacuationChoice}
        skipButtonText="Ничего не делать"
      />

      <DiscardViewerModal
        isOpen={discardModal.isOpen}
        onClose={() => setDiscardModal({ ...discardModal, isOpen: false })}
        title={discardModal.title}
        cards={discardModal.cards}
        onInspectCard={(card) => {
          sound.playSelect();
          setInspectModal({
            card,
            mode: 'inspect',
            ownerLabel: discardModal.title,
          });
        }}
      />

      <CardInspectModal
        inspectState={inspectModal}
        isSelected={
          inspectModal?.mode === 'hand_select' && inspectModal.ownerId
            ? (inspectModal.ownerId === 'player1'
                ? gameState.player1.selectedCardIds
                : gameState.player2.selectedCardIds
              ).includes(inspectModal.card.id)
            : false
        }
        selectedCount={
          inspectModal?.ownerId === 'player2'
            ? gameState.player2.selectedCardIds.length
            : gameState.player1.selectedCardIds.length
        }
        maxSelectable={
          inspectModal?.ownerId === 'player2' ? maxSelectP2 : maxSelectP1
        }
        onConfirmSelect={handleConfirmInspectSelection}
        onClose={() => setInspectModal(null)}
      />
    </div>
  );
}
