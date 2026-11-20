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
  CampaignDialogueLine,
  CampaignProgress,
  CampaignStageConfig,
  RESISTANCE_FINALE_DIALOGUE,
  RESISTANCE_PROLOGUE_DIALOGUE,
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
  getAvailableSummonOptions,
} from './engine/effectProcessor';
import {
  selectBotDecision,
  createInitialBotMemory,
  recordBotDecision,
  recordEnemyPlayedCards,
  selectBotSpellCard,
  selectBotColdCalculationCard,
  selectBotConjurerSummon,
  selectBotReviveCard,
  selectBotEvacuateCard,
} from './engine/botAi';
import { CardView, CombatCallout } from './components/CardView';
import {
  BattleVfxLayer,
  BattlefieldAmbientLayer,
  ActiveVfxData,
  EffectTheme,
  VFX_THEME_PALETTE,
  getVfxArchetypeForCard,
  isHeavyShakeCard,
} from './components/BattleVfxLayer';
import { BattleLog } from './components/BattleLog';
import { MainMenu } from './components/MainMenu';
import { CardsCatalog } from './components/CardsCatalog';
import { CampaignFactionSelect } from './components/CampaignFactionSelect';
import { CampaignMap } from './components/CampaignMap';
import { CampaignCutsceneOverlay } from './components/CampaignCutsceneOverlay';
import { RulesModal } from './components/RulesModal';
import { GameOverModal } from './components/GameOverModal';
import { PassDeviceScreen } from './components/PassDeviceScreen';
import { CardSwapModal } from './components/SeerReplaceModal';
import { DiscardViewerModal } from './components/DiscardViewerModal';
import { CardInspectModal, CardInspectModalState } from './components/CardInspectModal';
import { HandZone } from './components/HandZone';
import { GameButton } from './components/GameButton';
import { AudioControlsButton } from './components/AudioControlsButton';
import { CornerRivets, LedCounter, RiftDivider } from './components/TacticalChrome';
import { AmbientScene, sound } from './utils/sound';
import { voiceService } from './utils/voiceService';
import {
  Swords,
  Play,
  RotateCcw,
  BookOpen,
  FastForward,
  ScrollText,
  Flag,
  X,
  Gauge,
} from 'lucide-react';

const LOCAL_STORAGE_KEY = 'card_game_state_save_v4';
const MAX_BATTLE_ROUNDS = 10;

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
  'drone_squad',
  'call_reserves',
  'cold_calculation',
  'medic',
  'prayer',
  'conjurer',
  'ball_lightning',
]);

function getEffectThemeForCard(card: CardDefinition): EffectTheme {
  switch (card.id) {
    case 'engineer':
    case 'scientist':
    case 'progressive_science':
    case 'medic':
      return 'emerald';
    case 'seer':
    case 'artillerist':
    case 'artillery':
    case 'natural_disaster':
    case 'prayer':
      return 'fire';
    case 'evacuation':
    case 'abnormal_lightning':
    case 'drone_squad':
    case 'call_reserves':
    case 'cold_calculation':
      return 'sky';
    case 'hidden_virus':
    case 'terrible_disease':
    case 'plague':
    case 'parasite':
      return 'toxic';
    case 'old_wizard':
    case 'necromancer':
    case 'conjurer':
    case 'ball_lightning':
    case 'evil_spirit':
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

type ActiveCampaignCutscene =
  | {
      kind: 'prologue';
      lines: CampaignDialogueLine[];
    }
  | {
      kind: 'pre_battle';
      stage: CampaignStageConfig;
      lines: CampaignDialogueLine[];
    }
  | {
      kind: 'finale';
      lines: CampaignDialogueLine[];
    };

function hydrateSavedState(saved: GameState): GameState {
  const refreshCard = (c: CardDefinition): CardDefinition => {
    const fresh = getCardById(c.id);
    return fresh ? { ...fresh } : c;
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
    botMemory: saved.botMemory ?? createInitialBotMemory(),
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
  const [campaignCutscene, setCampaignCutscene] =
    useState<ActiveCampaignCutscene | null>(null);
  const [hasSavedSession, setHasSavedSession] = useState<boolean>(false);
  const [savedGameLabel, setSavedGameLabel] = useState<string | undefined>(
    undefined
  );
  const [isRulesOpen, setIsRulesOpen] = useState<boolean>(false);
  const [mobileLogOpen, setMobileLogOpen] = useState<boolean>(false);
  const [autoPlay, setAutoPlay] = useState<boolean>(false);
  const [battleSpeed, setBattleSpeed] = useState<1 | 2>(1);
  const [isFlippingReveal, setIsFlippingReveal] = useState<boolean>(false);
  const [activeVfx, setActiveVfx] = useState<ActiveVfxData | null>(null);
  const [battlefieldShaking, setBattlefieldShaking] = useState<boolean>(false);
  const [cardCallouts, setCardCallouts] = useState<Record<string, CombatCallout>>({});
  const [wizardModalOpen, setWizardModalOpen] = useState<boolean>(false);
  const [necromancerModalOpen, setNecromancerModalOpen] = useState<boolean>(false);
  const [evacuationModalOpen, setEvacuationModalOpen] = useState<boolean>(false);
  const [coldCalcModalOpen, setColdCalcModalOpen] = useState<boolean>(false);
  const [conjurerModalOpen, setConjurerModalOpen] = useState<boolean>(false);
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
  const arenaRef = useRef<HTMLDivElement | null>(null);
  const battlefieldCenterRef = useRef<HTMLDivElement | null>(null);
  const animTimersRef = useRef<ReturnType<typeof setTimeout>[]>([]);
  const bannerTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const flipTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const calloutTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const shakeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastAnnouncedTurnRef = useRef<string>('');

  const clearAnimationTimers = () => {
    animTimersRef.current.forEach((t) => clearTimeout(t));
    animTimersRef.current = [];
    if (flipTimerRef.current) {
      clearTimeout(flipTimerRef.current);
      flipTimerRef.current = null;
    }
    if (calloutTimerRef.current) {
      clearTimeout(calloutTimerRef.current);
      calloutTimerRef.current = null;
    }
    if (shakeTimerRef.current) {
      clearTimeout(shakeTimerRef.current);
      shakeTimerRef.current = null;
    }
  };

  useEffect(() => {
    return () => {
      clearAnimationTimers();
      if (bannerTimerRef.current) clearTimeout(bannerTimerRef.current);
      voiceService.stop();
    };
  }, []);

  // Synchronize adaptive atmospheric soundtrack with the active game phase, cutscene, and battle tension
  useEffect(() => {
    let targetScene: AmbientScene = 'menu';

    if (campaignCutscene) {
      targetScene = 'cutscene';
    } else if (
      gameState.phase === 'menu' ||
      gameState.phase === 'cards_catalog' ||
      gameState.phase === 'campaign_select' ||
      gameState.phase === 'game_over'
    ) {
      targetScene = 'menu';
    } else if (gameState.phase === 'campaign_map') {
      targetScene = 'campaign_map';
    } else if (
      gameState.phase === 'p1_select' ||
      gameState.phase === 'pass_device' ||
      gameState.phase === 'p2_select' ||
      gameState.phase === 'ready_to_battle'
    ) {
      targetScene = 'battle_prep';
    } else if (
      gameState.phase === 'battle_resolving' ||
      gameState.phase === 'battle_ended'
    ) {
      const stageMeta = gameState.campaign
        ? getCampaignStage(gameState.campaign.side, gameState.campaign.stageId)
        : undefined;
      const isBossStage =
        stageMeta?.milestoneTag === 'boss' || stageMeta?.milestoneTag === 'demon';
      const isLateRound = gameState.roundNumber >= MAX_BATTLE_ROUNDS - 2;
      targetScene = isBossStage || isLateRound ? 'battle_intense' : 'battle_combat';
    }

    sound.setScene(targetScene);
  }, [
    campaignCutscene,
    gameState.phase,
    gameState.roundNumber,
    gameState.campaign,
  ]);

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
        const key = `${gameState.roundNumber}-battle-${gameState.currentTurnIndex}-${actor.instanceId}-${actor.card.id}`;
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
      }, 900);
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
      botMemory: createInitialBotMemory(),
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
      botMemory: createInitialBotMemory(),
    };
  }

  const resetBattleTransientUi = () => {
    clearAnimationTimers();
    setActiveAnimation(null);
    setActiveVfx(null);
    setBattlefieldShaking(false);
    setCardCallouts({});
    setIsFlippingReveal(false);
    setInspectModal(null);
    lastAnnouncedTurnRef.current = '';
    setTurnBanner(null);
    setMobileLogOpen(false);
    setAutoPlay(false);
    setWizardModalOpen(false);
    setNecromancerModalOpen(false);
    setEvacuationModalOpen(false);
    setColdCalcModalOpen(false);
    setConjurerModalOpen(false);
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
    setCampaignCutscene(null);
    setSelectedCampaignSide(stage.side);
    setGameState(createCampaignGameState(stage));
  };

  const handleRequestCampaignStage = (stage: CampaignStageConfig) => {
    sound.playSelect();
    setSelectedCampaignSide(stage.side);
    if (stage.preBattleDialogue && stage.preBattleDialogue.length > 0) {
      setCampaignCutscene({
        kind: 'pre_battle',
        stage,
        lines: stage.preBattleDialogue,
      });
    } else {
      handleStartCampaignStage(stage);
    }
  };

  const handleOpenPrologueCutscene = () => {
    sound.playSelect();
    setCampaignCutscene({
      kind: 'prologue',
      lines: RESISTANCE_PROLOGUE_DIALOGUE,
    });
  };

  const handleOpenFinaleCutscene = () => {
    sound.playSelect();
    setCampaignCutscene({
      kind: 'finale',
      lines: RESISTANCE_FINALE_DIALOGUE,
    });
  };

  const markPrologueSeen = () => {
    setCampaignProgress((prev) => {
      if (prev.hasSeenResistancePrologue) return prev;
      const updated: CampaignProgress = {
        ...prev,
        hasSeenResistancePrologue: true,
      };
      saveCampaignProgress(updated);
      return updated;
    });
  };

  const handleOpenCampaign = () => {
    sound.playSelect();
    resetBattleTransientUi();
    setCampaignCutscene(null);
    setGameState((prev) => ({
      ...prev,
      phase: 'campaign_select',
    }));
  };

  const handleOpenCardsCatalog = () => {
    sound.playSelect();
    resetBattleTransientUi();
    setCampaignCutscene(null);
    setGameState((prev) => ({
      ...prev,
      phase: 'cards_catalog',
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
    if (!campaignProgress.hasSeenResistancePrologue) {
      setCampaignCutscene({
        kind: 'prologue',
        lines: RESISTANCE_PROLOGUE_DIALOGUE,
      });
    }
  };

  const handleReturnToCampaignMap = () => {
    sound.playSelect();
    resetBattleTransientUi();
    setCampaignCutscene(null);
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

  // Card selection in hand
  const toggleCardSelect = (playerId: 'player1' | 'player2', cardId: string) => {
    const currentPlayer =
      playerId === 'player1' ? gameState.player1 : gameState.player2;
    const alreadySelected = currentPlayer.selectedCardIds.includes(cardId);
    const maxSelectableNow = Math.min(3, currentPlayer.hand.length);

    if (alreadySelected) {
      sound.playCardUnstage();
    } else if (currentPlayer.selectedCardIds.length < maxSelectableNow) {
      sound.playCardStage();
    } else {
      sound.playUiClick();
    }

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
        const campaignStage = prev.campaign
          ? getCampaignStage(prev.campaign.side, prev.campaign.stageId)
          : undefined;
        // Check if current campaign stage has a scripted Round 1 opening combo
        const forcedBotCardIds =
          prev.roundNumber === 1 ? campaignStage?.firstRoundBotCardIds : undefined;
        // Bot selects cards using faction schemes, lookahead simulation & anti-repetition memory
        const botDecision = selectBotDecision(prev.player2, prev.player1, {
          roundNumber: prev.roundNumber,
          maxRounds: MAX_BATTLE_ROUNDS,
          memory: prev.botMemory,
          forcedCardIds: forcedBotCardIds,
          preferredSchemes: campaignStage?.preferredBotSchemes,
        });
        const updatedP2: PlayerState = {
          ...prev.player2,
          selectedCardIds: botDecision.cardIds,
        };

        return {
          ...prev,
          player2: updatedP2,
          botMemory: recordBotDecision(prev.botMemory, botDecision),
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
    const totalFlippedCards =
      gameState.player1.selectedCardIds.length +
      gameState.player2.selectedCardIds.length;
    for (let i = 0; i < Math.min(6, totalFlippedCards); i++) {
      sound.playCardFlip(i);
    }
    setInspectModal(null);
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (!prefersReducedMotion) {
      setIsFlippingReveal(true);
      if (flipTimerRef.current) clearTimeout(flipTimerRef.current);
      flipTimerRef.current = setTimeout(() => {
        setIsFlippingReveal(false);
      }, 760);
    }
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
      const nextBotMemory =
        prev.mode === 'bot'
          ? recordEnemyPlayedCards(
              prev.botMemory,
              p1Cards.map((c) => c.id)
            )
          : prev.botMemory;

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
        botMemory: nextBotMemory,
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
    chosenEvacuateCard?: CardDefinition | null,
    chosenSummonCard?: CardDefinition | null,
    audioAlreadyTriggered = false
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
        chosenEvacuateCard,
        chosenSummonCard
      );

      let workingQueue = stepResult.queue;
      let workingLogs = [...prev.battleLog, ...stepResult.logs];
      let workingP1Hand = stepResult.player1Hand;
      let workingP1Discard = stepResult.player1Discard;
      let workingP2Hand = stepResult.player2Hand;
      let workingP2Discard = stepResult.player2Discard;
      let endedEarly = stepResult.battleEndedEarly;

      // Fallback sound triggers when reduced motion or direct modal skip bypasses runAnimatedStep
      if (!audioAlreadyTriggered) {
        const actingCard =
          replacementForSeer ?? prev.activeBattleQueue[prev.currentTurnIndex]?.card;
        if (actingCard) {
          sound.playCombatArchetype(getVfxArchetypeForCard(actingCard), 'impact');
        }
        const hasDestruction = stepResult.logs.some((l) => l.type === 'destroy');
        const hasProtection = stepResult.logs.some((l) => l.type === 'protect');
        const hasCancel = stepResult.logs.some((l) => l.type === 'cancel');
        if (hasDestruction) {
          sound.playStatusEffect('destroy');
        } else if (hasProtection) {
          sound.playStatusEffect('protect');
        } else if (hasCancel) {
          sound.playStatusEffect('cancel');
        }
      }

      // Automatically advance past any subsequent destroyed, disabled, cancelled, or evacuated cards
      let nextTurnIndex = stepResult.queueReorderedStayAtIndex
        ? prev.currentTurnIndex
        : prev.currentTurnIndex + 1;
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
        } else if (eff.target.priority === 'lowest_rank') {
          candidates = [...candidates].sort((a, b) => a.currentRank - b.currentRank);
        } else if (eff.target.priority === 'highest_initiative') {
          candidates = [...candidates].sort((a, b) =>
            b.currentInitiative !== a.currentInitiative
              ? b.currentInitiative - a.currentInitiative
              : b.currentRank - a.currentRank
          );
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
      } else if (eff.action === 'cancel_ability' && eff.target) {
        let candidates = queue.filter((c) => matchesFilter(c, eff.target!, sourceCard));
        if (eff.target.priority === 'highest_initiative') {
          candidates = [...candidates].sort((a, b) =>
            b.currentInitiative !== a.currentInitiative
              ? b.currentInitiative - a.currentInitiative
              : b.currentRank - a.currentRank
          );
        } else if (eff.target.priority === 'highest_rank') {
          candidates = [...candidates].sort((a, b) => b.currentRank - a.currentRank);
        } else if (eff.target.priority === 'lowest_rank') {
          candidates = [...candidates].sort((a, b) => a.currentRank - b.currentRank);
        }
        if (eff.target.limit !== undefined) {
          candidates = candidates.slice(0, eff.target.limit);
        }
        candidates.forEach((cand) => {
          const isProtected =
            !eff.ignoreProtection && cand.protectedAgainst.includes(effectiveCard.type);
          if (!isProtected) {
            impactSet.add(cand.instanceId);
          }
        });
      } else if (eff.action === 'protect' && eff.target) {
        queue
          .filter((c) => matchesFilter(c, eff.target!, sourceCard))
          .forEach((cand) => shieldSet.add(cand.instanceId));
      } else if (eff.action === 'reanimate_battle') {
        queue
          .filter(
            (c) =>
              c.isDestroyed &&
              !c.isEvacuated &&
              c.instanceId !== sourceCard.instanceId &&
              c.owner === sourceCard.owner &&
              (!eff.target?.types || eff.target.types.includes(c.card.type))
          )
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
    const effectiveCard = effectiveCardOverride ?? sourceCard.card;
    const prefersReducedMotion =
      typeof window !== 'undefined' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    if (prefersReducedMotion) {
      sound.playCombatArchetype(getVfxArchetypeForCard(effectiveCard), 'impact');
      onImpactResolve();
      return;
    }

    clearAnimationTimers();
    setTurnBanner(null);
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
    const speedFactor = battleSpeed === 2 ? 0.55 : 1;

    // Measure arena-relative coordinates for targeted SVG trajectory VFX
    const arenaRect = arenaRef.current?.getBoundingClientRect();
    const toLocalPoint = (rect: DOMRect | undefined) => {
      if (!arenaRect || !rect) return null;
      return {
        x: rect.left + rect.width / 2 - arenaRect.left,
        y: rect.top + rect.height / 2 - arenaRect.top,
      };
    };

    const allVfxTargetIds =
      impactTargetIds.length > 0 ? impactTargetIds : shieldTargetIds;
    const centerRectNow = battlefieldCenterRef.current?.getBoundingClientRect();
    const fallbackCenter = arenaRect
      ? { x: arenaRect.width / 2, y: arenaRect.height / 2 }
      : { x: 240, y: 180 };
    const localCenter = toLocalPoint(centerRectNow) ?? fallbackCenter;
    const localSource = toLocalPoint(srcRect) ?? localCenter;
    const localTargets = allVfxTargetIds
      .map((id) => toLocalPoint(cardRefs.current[id]?.getBoundingClientRect()))
      .filter((p): p is { x: number; y: number } => Boolean(p));

    const vfxArchetype = getVfxArchetypeForCard(effectiveCard);

    const vfxPayload: ActiveVfxData | null = arenaRect
      ? {
          id: `${sourceCard.instanceId}-${Date.now()}`,
          archetype: vfxArchetype,
          theme: effectTheme,
          sourcePoint: mode === 'center_cast' ? localCenter : localSource,
          targetPoints: localTargets,
          centerPoint: localCenter,
          containerWidth: arenaRect.width,
          containerHeight: arenaRect.height,
        }
      : null;

    // Trigger opening cast / launch combat SFX synchronized with card arc/cast movement
    sound.playCombatArchetype(vfxArchetype, 'cast');

    // Build floating combat callout badges for affected targets
    const buildImpactCallouts = (): Record<string, CombatCallout> => {
      const next: Record<string, CombatCallout> = {};
      const stamp = Date.now();
      const hasDestroy = effectiveCard.effects.some((e) => e.action === 'destroy');
      const hasReduceRank = effectiveCard.effects.some((e) => e.action === 'reduce_rank');
      const hasCancel = effectiveCard.effects.some((e) => e.action === 'cancel_ability');
      const hasDisable = effectiveCard.effects.some((e) => e.action === 'disable');
      const hasProtect = effectiveCard.effects.some((e) => e.action === 'protect');
      const hasRevive = effectiveCard.effects.some((e) => e.action === 'reanimate_battle');

      impactTargetIds.forEach((id) => {
        if (hasReduceRank && !hasDestroy) {
          next[id] = { key: `${id}-${stamp}`, text: '-1 РАНГ', tone: 'debuff' };
        } else if (hasCancel && !hasDestroy) {
          next[id] = { key: `${id}-${stamp}`, text: 'БЛОК', tone: 'debuff' };
        } else if (hasDisable && !hasDestroy) {
          next[id] = { key: `${id}-${stamp}`, text: 'ОТКЛ.', tone: 'debuff' };
        } else if (hasDestroy) {
          next[id] = { key: `${id}-${stamp}`, text: 'УНИЧТОЖЕН', tone: 'danger' };
        }
      });

      shieldTargetIds.forEach((id) => {
        if (effectiveCard.id === 'evacuation' || extraShieldCardId) {
          next[id] = { key: `${id}-${stamp}`, text: 'ЭВАКУАЦИЯ', tone: 'info' };
        } else if (hasRevive) {
          next[id] = { key: `${id}-${stamp}`, text: 'ВОСКРЕШЁН', tone: 'revive' };
        } else if (hasProtect) {
          next[id] = { key: `${id}-${stamp}`, text: 'ЗАЩИТА', tone: 'shield' };
        }
      });

      return next;
    };

    const shouldShake =
      isHeavyShakeCard(effectiveCard) &&
      (impactTargetIds.length > 0 || mode === 'center_cast');

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
      if (vfxPayload) {
        setActiveVfx(vfxPayload);
      }

      // Synchronized archetype impact + contextual tactical status audio
      sound.playCombatArchetype(vfxArchetype, 'impact');
      const hasDestroy = effectiveCard.effects.some((e) => e.action === 'destroy');
      const hasReduceRank = effectiveCard.effects.some((e) => e.action === 'reduce_rank');
      const hasCancel = effectiveCard.effects.some(
        (e) => e.action === 'cancel_ability' || e.action === 'disable'
      );
      const hasRevive = effectiveCard.effects.some(
        (e) => e.action === 'reanimate_battle' || e.action === 'revive'
      );

      if (effectiveCard.id === 'evacuation' || extraShieldCardId) {
        sound.playStatusEffect('evacuate');
      } else if (hasRevive) {
        sound.playStatusEffect('revive');
      } else if (impactTargetIds.length > 0) {
        if (hasDestroy) {
          sound.playStatusEffect('destroy');
        } else if (hasReduceRank) {
          sound.playStatusEffect('reduce_rank');
        } else if (hasCancel) {
          sound.playStatusEffect('cancel');
        }
      } else if (shieldTargetIds.length > 0) {
        sound.playStatusEffect('protect');
      }

      const nextCallouts = buildImpactCallouts();
      if (Object.keys(nextCallouts).length > 0) {
        setCardCallouts(nextCallouts);
        if (calloutTimerRef.current) clearTimeout(calloutTimerRef.current);
        calloutTimerRef.current = setTimeout(() => {
          setCardCallouts({});
        }, Math.round(980 * speedFactor));
      }
      if (shouldShake) {
        setBattlefieldShaking(true);
        if (shakeTimerRef.current) clearTimeout(shakeTimerRef.current);
        shakeTimerRef.current = setTimeout(() => {
          setBattlefieldShaking(false);
        }, 250);
      }
    }, Math.round(240 * speedFactor));

    const tResolve = setTimeout(() => {
      onImpactResolve();
    }, Math.round(350 * speedFactor));

    const duration = Math.round((mode === 'center_cast' ? 820 : 760) * speedFactor);
    const tDone = setTimeout(() => {
      setActiveAnimation(null);
      setActiveVfx(null);
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
          () => handleStepResolution(artilleryCard, undefined, undefined, undefined, true),
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
      const enemyState =
        currentCard.owner === 'player1' ? gameState.player2 : gameState.player1;

      // Spells currently available in owner's hand
      const availableSpells = ownerState.hand.filter((c) => c.type === 'magic');

      if (!ownerState.isBot && availableSpells.length > 0) {
        // Prompt human player to choose which spell to swap with
        setWizardModalOpen(true);
        return;
      } else if (ownerState.isBot && availableSpells.length > 0) {
        // Bot simulates spells on the live battlefield and chooses the best swing (or saves spells)
        const botSpell = selectBotSpellCard(
          ownerState.hand,
          gameState.activeBattleQueue,
          currentCard,
          ownerState,
          enemyState
        );
        runAnimatedStep(
          currentCard,
          () => handleStepResolution(botSpell, undefined, undefined, undefined, true),
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
      const enemyState =
        currentCard.owner === 'player1' ? gameState.player2 : gameState.player1;
      const eligibleCreatures = ownerState.discard.filter(
        (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
      );

      if (!ownerState.isBot && eligibleCreatures.length > 0) {
        setNecromancerModalOpen(true);
        return;
      } else if (ownerState.isBot && eligibleCreatures.length > 0) {
        const botRevive = selectBotReviveCard(
          ownerState.discard,
          ownerState.hand,
          enemyState
        );
        runAnimatedStep(currentCard, () =>
          handleStepResolution(undefined, botRevive, undefined, undefined, true)
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
      const enemyState =
        currentCard.owner === 'player1' ? gameState.player2 : gameState.player1;
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
          currentCard.owner,
          currentCard.instanceId,
          ownerState,
          enemyState
        );
        runAnimatedStep(
          currentCard,
          () =>
            handleStepResolution(
              undefined,
              undefined,
              botEvacuate ?? null,
              undefined,
              true
            ),
          undefined,
          botEvacuate?.id
        );
        return;
      }
    }

    // 5. Холодный расчёт (cold_calculation): может подменить себя на любое существо или технику из руки, или ничего не делать
    if (
      currentCard.card.id === 'cold_calculation' &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled &&
      !currentCard.isEvacuated
    ) {
      const ownerState =
        currentCard.owner === 'player1' ? gameState.player1 : gameState.player2;
      const enemyState =
        currentCard.owner === 'player1' ? gameState.player2 : gameState.player1;
      const eligibleUnits = ownerState.hand.filter(
        (c) => c.type === 'creature' || c.type === 'technology'
      );

      if (!ownerState.isBot && eligibleUnits.length > 0) {
        setColdCalcModalOpen(true);
        return;
      } else if (ownerState.isBot && eligibleUnits.length > 0) {
        const botUnit = selectBotColdCalculationCard(
          ownerState.hand,
          gameState.activeBattleQueue,
          currentCard,
          ownerState,
          enemyState
        );
        if (botUnit) {
          runAnimatedStep(
            currentCard,
            () => handleStepResolution(botUnit, undefined, undefined, undefined, true),
            botUnit
          );
          return;
        }
      }
    }

    // 6. Заклинатель (conjurer): призывает Беса или Злого духа вместо себя и возвращается в руку
    if (
      currentCard.card.id === 'conjurer' &&
      !currentCard.isDestroyed &&
      !currentCard.isDisabled &&
      !currentCard.isCancelled &&
      !currentCard.isEvacuated
    ) {
      const ownerState =
        currentCard.owner === 'player1' ? gameState.player1 : gameState.player2;
      const enemyState =
        currentCard.owner === 'player1' ? gameState.player2 : gameState.player1;
      const availableSummons = getAvailableSummonOptions(
        ['imp', 'evil_spirit'],
        currentCard.owner,
        gameState.activeBattleQueue,
        ownerState.discard
      );

      if (!ownerState.isBot && availableSummons.length > 0) {
        setConjurerModalOpen(true);
        return;
      } else if (ownerState.isBot && availableSummons.length > 0) {
        const botSummon = selectBotConjurerSummon(
          availableSummons,
          gameState.activeBattleQueue,
          currentCard.owner,
          ownerState,
          enemyState
        );
        if (botSummon) {
          runAnimatedStep(currentCard, () =>
            handleStepResolution(undefined, undefined, undefined, botSummon, true)
          );
          return;
        }
      }
    }

    // Normal step
    runAnimatedStep(currentCard, () =>
      handleStepResolution(undefined, undefined, undefined, undefined, true)
    );
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
      !coldCalcModalOpen &&
      !conjurerModalOpen &&
      !surrenderModalOpen &&
      !inspectModal
    ) {
      autoPlayTimeoutRef.current = setTimeout(() => {
        triggerNextTurn();
      }, battleSpeed === 2 ? 180 : 380);
    }
    return () => {
      if (autoPlayTimeoutRef.current) {
        clearTimeout(autoPlayTimeoutRef.current);
      }
    };
  }, [
    autoPlay,
    battleSpeed,
    activeAnimation,
    gameState.phase,
    gameState.currentTurnIndex,
    gameState.activeBattleQueue,
    wizardModalOpen,
    necromancerModalOpen,
    evacuationModalOpen,
    coldCalcModalOpen,
    conjurerModalOpen,
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
        () => handleStepResolution(repCard, undefined, undefined, undefined, true),
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
        handleStepResolution(undefined, reviveCard, undefined, undefined, true)
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
        () =>
          handleStepResolution(undefined, undefined, evacuateCard, undefined, true),
        undefined,
        evacuateCard.id
      );
    } else {
      handleStepResolution(undefined, undefined, evacuateCard ?? null);
    }
  };

  // Cold Calculation modal replacement confirmed
  const handleColdCalcChoice = (repCard?: CardDefinition) => {
    setColdCalcModalOpen(false);
    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (currentCard && repCard) {
      runAnimatedStep(
        currentCard,
        () => handleStepResolution(repCard, undefined, undefined, undefined, true),
        repCard
      );
    } else {
      handleStepResolution(undefined);
    }
  };

  // Conjurer modal summon choice confirmed
  const handleConjurerChoice = (summonCard?: CardDefinition) => {
    setConjurerModalOpen(false);
    const currentCard = gameState.activeBattleQueue[gameState.currentTurnIndex];
    if (currentCard && summonCard) {
      runAnimatedStep(currentCard, () =>
        handleStepResolution(undefined, undefined, undefined, summonCard, true)
      );
    } else {
      handleStepResolution(undefined, undefined, undefined, null);
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

  // Unlock next campaign stage upon player victory (and trigger Stage 20 finale cutscene)
  const recordCampaignStageVictory = () => {
    if (!gameState.campaign) return;
    const { side, stageId } = gameState.campaign;
    setCampaignProgress((prevProgress) => {
      const existing = prevProgress.completedStages[side] ?? [];
      if (existing.includes(stageId)) {
        return prevProgress;
      }
      const updated: CampaignProgress = {
        ...prevProgress,
        completedStages: {
          ...prevProgress.completedStages,
          [side]: [...existing, stageId].sort((a, b) => a - b),
        },
      };
      saveCampaignProgress(updated);
      return updated;
    });

    const sideStages = getCampaignStagesBySide(side);
    const finalStageId = sideStages[sideStages.length - 1]?.id;
    if (side === 'resistance' && finalStageId !== undefined && stageId === finalStageId) {
      setCampaignCutscene({
        kind: 'finale',
        lines: RESISTANCE_FINALE_DIALOGUE,
      });
    }
  };

  // Next round transition & defeat/turn-limit verification
  const handleNextRound = () => {
    sound.playSelect();
    clearAnimationTimers();
    setActiveAnimation(null);
    setActiveVfx(null);
    setBattlefieldShaking(false);
    setCardCallouts({});
    setIsFlippingReveal(false);
    setInspectModal(null);
    setAutoPlay(false);

    // At battle_ended, surviving battlefield cards have already returned to hand via finalizeBattle.
    const p1Remaining = gameState.player1.hand.length;
    const p2Remaining = gameState.player2.hand.length;
    const p1Empty = p1Remaining === 0;
    const p2Empty = p2Remaining === 0;

    if (p1Empty && p2Empty) {
      sound.playDefeat();
      setGameState((prev) => ({
        ...prev,
        phase: 'game_over',
        winner: null,
        defeatReason: 'empty_hand',
        finalCardCounts: { player1: 0, player2: 0 },
        battleLog: [
          ...prev.battleLog,
          createLogEntry('info', 'У обеих сторон одновременно закончились карты — ничья!'),
        ],
      }));
      return;
    }

    if (p1Empty || p2Empty) {
      const winner: 'player1' | 'player2' = p1Empty ? 'player2' : 'player1';
      if (winner === 'player1' || gameState.mode === 'pvp_local') {
        sound.playVictory();
      } else {
        sound.playDefeat();
      }

      if (winner === 'player1') {
        recordCampaignStageVictory();
      }

      setGameState((prev) => ({
        ...prev,
        phase: 'game_over',
        winner,
        defeatReason: 'empty_hand',
        finalCardCounts: { player1: p1Remaining, player2: p2Remaining },
      }));
      return;
    }

    // Turn limit rule: after 10 rounds, whoever has more remaining cards (hand + surviving field) wins
    if (gameState.roundNumber >= MAX_BATTLE_ROUNDS) {
      if (p1Remaining > p2Remaining) {
        sound.playVictory();
        recordCampaignStageVictory();
        setGameState((prev) => ({
          ...prev,
          phase: 'game_over',
          winner: 'player1',
          defeatReason: 'turn_limit',
          finalCardCounts: { player1: p1Remaining, player2: p2Remaining },
          battleLog: [
            ...prev.battleLog,
            createLogEntry(
              'info',
              `Итоги ${MAX_BATTLE_ROUNDS} ходов: ${prev.player1.name} (${p1Remaining} карт) побеждает ${prev.player2.name} (${p2Remaining} карт)!`
            ),
          ],
        }));
      } else if (p2Remaining > p1Remaining) {
        if (gameState.mode === 'pvp_local') {
          sound.playVictory();
        } else {
          sound.playDefeat();
        }
        setGameState((prev) => ({
          ...prev,
          phase: 'game_over',
          winner: 'player2',
          defeatReason: 'turn_limit',
          finalCardCounts: { player1: p1Remaining, player2: p2Remaining },
          battleLog: [
            ...prev.battleLog,
            createLogEntry(
              'fail',
              `Итоги ${MAX_BATTLE_ROUNDS} ходов: ${prev.player2.name} (${p2Remaining} карт) побеждает ${prev.player1.name} (${p1Remaining} карт)!`
            ),
          ],
        }));
      } else {
        sound.playDefeat();
        setGameState((prev) => ({
          ...prev,
          phase: 'game_over',
          winner: null,
          defeatReason: 'turn_limit',
          finalCardCounts: { player1: p1Remaining, player2: p2Remaining },
          battleLog: [
            ...prev.battleLog,
            createLogEntry(
              'info',
              `Итоги ${MAX_BATTLE_ROUNDS} ходов: у обеих сторон поровну карт (${p1Remaining} : ${p2Remaining}) — ничья!`
            ),
          ],
        }));
      }
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
          onOpenCardsCatalog={handleOpenCardsCatalog}
          onNewGame={handleStartNewGame}
          onResumeGame={handleResumeGame}
          onOpenRules={() => setIsRulesOpen(true)}
        />
        <RulesModal isOpen={isRulesOpen} onClose={() => setIsRulesOpen(false)} />
      </>
    );
  }

  // Render Race Cards Encyclopedia
  if (gameState.phase === 'cards_catalog') {
    return (
      <>
        <CardsCatalog
          onInspectCard={(card, ownerLabel) => {
            sound.playSelect();
            setInspectModal({
              card,
              mode: 'inspect',
              ownerLabel,
              showRuleDetails: true,
            });
          }}
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

  // Render Campaign Faction Selection
  if (gameState.phase === 'campaign_select') {
    return (
      <>
        <CampaignFactionSelect
          resistanceCompletedCount={resistanceCompletedIds.length}
          resistanceTotalStages={resistanceStages.length}
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
          onStartStage={handleRequestCampaignStage}
          onOpenPrologue={
            selectedCampaignSide === 'resistance'
              ? handleOpenPrologueCutscene
              : undefined
          }
          onOpenFinale={
            selectedCampaignSide === 'resistance'
              ? handleOpenFinaleCutscene
              : undefined
          }
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
        {campaignCutscene && (
          <CampaignCutsceneOverlay
            lines={campaignCutscene.lines}
            headerKicker={
              campaignCutscene.kind === 'prologue'
                ? 'Пролог · Кампания Сопротивления'
                : campaignCutscene.kind === 'finale'
                ? 'Финал кампании · Победа Сопротивления'
                : `${campaignCutscene.stage.actTitle} · Этап ${campaignCutscene.stage.id}`
            }
            headerTitle={
              campaignCutscene.kind === 'prologue'
                ? 'Нападение на лагерь Сопротивления'
                : campaignCutscene.kind === 'finale'
                ? 'Демон повержен'
                : campaignCutscene.stage.title
            }
            finalActionLabel={
              campaignCutscene.kind === 'prologue'
                ? 'На карту боевых действий'
                : campaignCutscene.kind === 'finale'
                ? 'Вернуться на карту'
                : 'В бой!'
            }
            finalActionVariant={
              campaignCutscene.kind === 'pre_battle' ? 'emerald' : 'primary'
            }
            finalActionIcon={
              campaignCutscene.kind === 'pre_battle'
                ? 'battle'
                : campaignCutscene.kind === 'finale'
                ? 'trophy'
                : 'continue'
            }
            cancelLabel={
              campaignCutscene.kind === 'pre_battle' ? 'К карте' : undefined
            }
            onCancel={
              campaignCutscene.kind === 'pre_battle'
                ? () => {
                    sound.playSelect();
                    setCampaignCutscene(null);
                  }
                : undefined
            }
            onComplete={() => {
              sound.playSelect();
              if (campaignCutscene.kind === 'prologue') {
                markPrologueSeen();
                setCampaignCutscene(null);
              } else if (campaignCutscene.kind === 'finale') {
                setCampaignCutscene(null);
              } else {
                handleStartCampaignStage(campaignCutscene.stage);
              }
            }}
          />
        )}
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
  const coldCalcEligibleHand = actingOwnerHand.filter(
    (c) => c.type === 'creature' || c.type === 'technology'
  );
  const conjurerAvailableSummons = currentCardActing
    ? getAvailableSummonOptions(
        ['imp', 'evil_spirit'],
        currentCardActing.owner,
        gameState.activeBattleQueue,
        actingOwnerDiscard
      )
    : [];
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

  // Live Force Balance counter for top header
  const activeP1FieldCount = isResolving
    ? gameState.activeBattleQueue.filter(
        (c) => c.owner === 'player1' && !c.isDestroyed && !c.isEvacuated
      ).length
    : 0;
  const activeP2FieldCount = isResolving
    ? gameState.activeBattleQueue.filter(
        (c) => c.owner === 'player2' && !c.isDestroyed && !c.isEvacuated
      ).length
    : 0;
  const p1LiveForces = gameState.player1.hand.length + activeP1FieldCount;
  const p2LiveForces = gameState.player2.hand.length + activeP2FieldCount;
  const totalLiveForces = Math.max(1, p1LiveForces + p2LiveForces);
  const p1ForcePct = Math.round((p1LiveForces / totalLiveForces) * 100);
  const isP1Resistance = gameState.player1.side === 'resistance';

  // Round-end summary counts
  const p1RoundLosses = isEnded
    ? player1BattleCards.filter(
        (c) => c.isDestroyed || (!c.isEvacuated && c.card.isSingleUse)
      ).length
    : 0;
  const p2RoundLosses = isEnded
    ? player2BattleCards.filter(
        (c) => c.isDestroyed || (!c.isEvacuated && c.card.isSingleUse)
      ).length
    : 0;

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
                gameState.roundNumber >= MAX_BATTLE_ROUNDS - 2
                  ? 'border-[#d64a42] shadow-[0_0_10px_rgba(232,68,58,0.45)]'
                  : ''
              }
            />
          </div>
          <span className="text-[11px] font-led text-[#99a6b3] hidden xl:inline shrink-0 uppercase tracking-wider">
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

        {/* Center Live Force Balance Gauge */}
        <div
          title={`Соотношение оставшихся карт: Вы (${p1LiveForces}) против противника (${p2LiveForces})`}
          className="hidden md:flex items-center gap-2.5 px-2.5 py-1 rounded-[4px] bg-[#0c1015]/90 border border-[#2a333d] shrink-0"
        >
          <div className="flex items-center gap-1.5 text-xs">
            <span
              className={`font-display uppercase tracking-[0.06em] ${
                isP1Resistance ? 'text-[#84d2ea]' : 'text-[#ef7c6b]'
              }`}
            >
              Вы
            </span>
            <span className="font-led font-bold text-[#f2eae0] tabular-nums">
              {p1LiveForces}
            </span>
          </div>

          <div className="w-24 xl:w-32 h-2 rounded-[2px] bg-[#161b22] overflow-hidden flex border border-[#323c47]">
            <div
              style={{ width: `${p1ForcePct}%` }}
              className={`h-full transition-all duration-300 ${
                isP1Resistance
                  ? 'bg-gradient-to-r from-[#2c7d96] to-[#6cd2ee]'
                  : 'bg-gradient-to-r from-[#8f2924] to-[#e66155]'
              }`}
            />
            <div
              className={`h-full flex-1 transition-all duration-300 ${
                isP1Resistance
                  ? 'bg-gradient-to-l from-[#8f2924] to-[#e66155]'
                  : 'bg-gradient-to-l from-[#2c7d96] to-[#6cd2ee]'
              }`}
            />
          </div>

          <div className="flex items-center gap-1.5 text-xs">
            <span className="font-led font-bold text-[#f2eae0] tabular-nums">
              {p2LiveForces}
            </span>
            <span
              className={`font-display uppercase tracking-[0.06em] ${
                isP1Resistance ? 'text-[#ef7c6b]' : 'text-[#84d2ea]'
              }`}
            >
              Враг
            </span>
          </div>
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

          <AudioControlsButton />

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
        <div
          style={
            {
              '--battle-speed': battleSpeed === 2 ? '0.55' : '1',
            } as React.CSSProperties
          }
          className={`relative h-full min-h-0 w-full flex flex-col justify-between overflow-hidden px-2 sm:px-5 py-1.5 bg-[#090b0e] ${
            battlefieldShaking ? 'animate-battlefield-shake' : ''
          }`}
        >
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

          {/* Living Battlefield Rift Glow & Floating Embers */}
          <BattlefieldAmbientLayer
            flipped={gameState.player1.side === 'dark_side'}
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
            onToggleSelect={(card) => toggleCardSelect('player2', card.id)}
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
            discardCards={gameState.player2.discard}
            onOpenDiscard={() =>
              setDiscardModal({
                isOpen: true,
                title: `Потери (${gameState.player2.name})`,
                cards: gameState.player2.discard,
              })
            }
            isBot={gameState.player2.isBot}
            isOpponent={gameState.mode === 'bot' || !isP2Turn}
            isCompactBattle={isReady || isResolving || isEnded}
            hideSelectedFromFan={isP2Turn && !gameState.player2.isBot}
          />

          {/* CENTER ARENA: Open Table Felt / Opposing Battle Lines + Trajectory VFX */}
          <div
            ref={arenaRef}
            className="flex-1 min-h-0 w-full flex flex-col items-center justify-center relative overflow-visible py-1"
          >
            {/* Non-Blocking Slim Top-Center Turn Ticker (never obscures cards or staging slots) */}
            {turnBanner && (
              <div
                key={turnBanner.key}
                className="pointer-events-none absolute top-0.5 left-1/2 -translate-x-1/2 z-50 px-3"
              >
                <div
                  className={`animate-turn-ticker flex items-center gap-2 px-3.5 py-1 rounded-[4px] bg-[#0d1218]/94 border backdrop-blur-sm shadow-[0_6px_22px_rgba(0,0,0,0.85)] whitespace-nowrap ${
                    turnBanner.side === 'dark_side'
                      ? 'border-[#cf4d42]/80'
                      : 'border-[#5fbcd9]/80'
                  }`}
                >
                  <span
                    className={`font-display text-xs sm:text-sm font-bold uppercase tracking-[0.09em] ${
                      turnBanner.side === 'dark_side'
                        ? 'text-[#f59082]'
                        : 'text-[#8ad9f2]'
                    }`}
                  >
                    {turnBanner.title}
                  </span>
                  {turnBanner.subtitle && (
                    <>
                      <span aria-hidden="true" className="text-[#5a6674]">
                        ·
                      </span>
                      <span className="text-xs text-[#dde4ec] font-medium">
                        {turnBanner.subtitle}
                      </span>
                    </>
                  )}
                </div>
              </div>
            )}

            {/* Archetype Source-to-Target Trajectory VFX SVG Layer */}
            <BattleVfxLayer vfx={activeVfx} />

            {isReady ? (
              <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(256px,1fr)] items-center gap-y-2.5 lg:gap-y-0 relative overflow-visible">
                <RiftDivider
                  direction="full"
                  className="hidden lg:block pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 z-0 opacity-90"
                />
                <div aria-hidden="true" className="hidden lg:block" />

                {/* Center Stage: Hidden Opposing Cards */}
                <div className="flex flex-col items-center justify-center gap-2 sm:gap-3.5 relative z-10 overflow-visible">
                  {/* Top Line: Player 2 Hidden Cards (Left to Right) */}
                  <div className="flex flex-col items-center gap-1">
                    <span
                      className={`px-3 py-0.5 rounded-[3px] steel-bar text-[11px] font-display font-semibold uppercase tracking-[0.09em] ${
                        gameState.player2.side === 'resistance'
                          ? 'text-[#9bdcf0] border-[#3a687a]'
                          : 'text-[#f29d94] border-[#6e3136]'
                      }`}
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

                  {/* Clean Unobstructed Center Rift Seam */}
                  <div className="w-full min-w-[240px] sm:min-w-[420px] flex items-center justify-center py-0.5 sm:py-1">
                    <RiftDivider className="w-full lg:opacity-0" />
                  </div>

                  {/* Bottom Line: Player 1 Hidden Cards (Left to Right) */}
                  <div className="flex flex-col items-center gap-1">
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
                      className={`px-3 py-0.5 rounded-[3px] steel-bar text-[11px] font-display font-semibold uppercase tracking-[0.09em] ${
                        gameState.player1.side === 'resistance'
                          ? 'text-[#9bdcf0] border-[#3a687a]'
                          : 'text-[#f29d94] border-[#6e3136]'
                      }`}
                    >
                      {gameState.player1.name} (Вы)
                    </span>
                  </div>
                </div>

                {/* Right Battlefield Command Flank: Reveal Button */}
                <div className="flex items-center justify-center lg:justify-start lg:pl-5 xl:pl-10 z-30">
                  <GameButton
                    variant="primary"
                    size="lg"
                    withOrnaments
                    onClick={handleStartBattle}
                    className="min-w-[216px]"
                  >
                    <Swords className="w-4 h-4" />
                    <span>Вскрыть карты</span>
                  </GameButton>
                </div>
              </div>
            ) : isResolving || isEnded ? (
              <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(256px,1fr)] items-center gap-y-2.5 lg:gap-y-0 relative overflow-visible">
                <RiftDivider
                  direction="full"
                  className="hidden lg:block pointer-events-none absolute inset-x-4 top-1/2 -translate-y-1/2 z-0 opacity-90"
                />
                <div aria-hidden="true" className="hidden lg:block" />

                {/* Center Stage: Unobstructed Opposing Battle Lines */}
                <div className="flex flex-col items-center justify-center gap-2 sm:gap-3 relative z-10 overflow-visible">
                  {/* Top Line: Player 2 Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-0.5 sm:gap-1 overflow-visible">
                  <span
                    className={`px-3 py-0.5 rounded-[3px] steel-bar text-[11px] font-display font-semibold uppercase tracking-[0.09em] ${
                      gameState.player2.side === 'resistance'
                        ? 'text-[#9bdcf0] border-[#3a687a]'
                        : 'text-[#f29d94] border-[#6e3136]'
                    }`}
                  >
                    {gameState.player2.name}
                  </span>
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center items-center overflow-visible">
                    {player2BattleCards.map((bCard, idx) => {
                      const queueIdx = gameState.activeBattleQueue.findIndex(
                        (c) => c.instanceId === bCard.instanceId
                      );
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
                      const roundEndFate = isEnded
                        ? bCard.isDestroyed
                          ? undefined
                          : bCard.isEvacuated
                          ? 'evacuated'
                          : bCard.card.isSingleUse
                          ? 'discard'
                          : 'survive'
                        : undefined;

                      return (
                        <div
                          key={bCard.instanceId}
                          ref={(el) => {
                            cardRefs.current[bCard.instanceId] = el;
                          }}
                          className={`overflow-visible ${
                            isFlippingReveal ? '' : 'animate-card-deal'
                          } ${isThisAnimating ? 'relative z-50' : 'relative z-10'}`}
                        >
                          <CardView
                            card={bCard.card}
                            size="battle"
                            isFlippingReveal={isFlippingReveal}
                            flipDelayMs={idx * 70}
                            isCurrentActor={isActing}
                            turnDirection="down"
                            turnOrderNumber={queueIdx >= 0 ? queueIdx + 1 : undefined}
                            isTurnCompleted={
                              isEnded ||
                              (queueIdx >= 0 && queueIdx < gameState.currentTurnIndex)
                            }
                            roundEndFate={roundEndFate}
                            activeAnimationClass={animClass}
                            activeAnimationStyle={
                              isThisAnimating ? activeAnimation.style : undefined
                            }
                            isImpactTarget={isImpact}
                            isShieldTarget={isShield}
                            combatCallout={cardCallouts[bCard.instanceId]}
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

                {/* Center Line: Clean Cast Core Anchor & Rift Seam (unobstructed by buttons) */}
                <div
                  ref={battlefieldCenterRef}
                  className="w-full min-w-[240px] sm:min-w-[440px] flex items-center justify-center py-1 sm:py-2 relative overflow-visible"
                >
                  {/* Subtle Core Shockwave synced with BattleVfxLayer during Center Cast */}
                  {activeAnimation?.mode === 'center_cast' && (() => {
                    const theme = VFX_THEME_PALETTE[activeAnimation.effectTheme];
                    return (
                      <div className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 z-30 flex items-center justify-center">
                        <div
                          className="w-44 h-44 rounded-full blur-2xl animate-shockwave"
                          style={{ backgroundColor: theme.glow }}
                        />
                        <div
                          className="absolute w-32 h-32 rounded-full border-2 animate-shockwave"
                          style={{
                            borderColor: theme.primary,
                            boxShadow: `0 0 24px ${theme.glow}`,
                          }}
                        />
                      </div>
                    );
                  })()}

                  <RiftDivider className="w-full lg:opacity-0" />
                </div>

                {/* Bottom Line: Player 1 Cards (Left to Right) */}
                <div className="w-full flex flex-col items-center gap-0.5 sm:gap-1 overflow-visible">
                  <div className="flex flex-nowrap sm:flex-wrap gap-1.5 sm:gap-4 justify-center items-center overflow-visible">
                    {player1BattleCards.map((bCard, idx) => {
                      const queueIdx = gameState.activeBattleQueue.findIndex(
                        (c) => c.instanceId === bCard.instanceId
                      );
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
                      const roundEndFate = isEnded
                        ? bCard.isDestroyed
                          ? undefined
                          : bCard.isEvacuated
                          ? 'evacuated'
                          : bCard.card.isSingleUse
                          ? 'discard'
                          : 'survive'
                        : undefined;

                      return (
                        <div
                          key={bCard.instanceId}
                          ref={(el) => {
                            cardRefs.current[bCard.instanceId] = el;
                          }}
                          className={`overflow-visible ${
                            isFlippingReveal ? '' : 'animate-card-deal'
                          } ${isThisAnimating ? 'relative z-50' : 'relative z-10'}`}
                        >
                          <CardView
                            card={bCard.card}
                            size="battle"
                            isFlippingReveal={isFlippingReveal}
                            flipDelayMs={(player2BattleCards.length + idx) * 65}
                            isCurrentActor={isActing}
                            turnDirection="up"
                            turnOrderNumber={queueIdx >= 0 ? queueIdx + 1 : undefined}
                            isTurnCompleted={
                              isEnded ||
                              (queueIdx >= 0 && queueIdx < gameState.currentTurnIndex)
                            }
                            roundEndFate={roundEndFate}
                            activeAnimationClass={animClass}
                            activeAnimationStyle={
                              isThisAnimating ? activeAnimation.style : undefined
                            }
                            isImpactTarget={isImpact}
                            isShieldTarget={isShield}
                            combatCallout={cardCallouts[bCard.instanceId]}
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
                    className={`px-3 py-0.5 rounded-[3px] steel-bar text-[11px] font-display font-semibold uppercase tracking-[0.09em] ${
                      gameState.player1.side === 'resistance'
                        ? 'text-[#9bdcf0] border-[#3a687a]'
                        : 'text-[#f29d94] border-[#6e3136]'
                    }`}
                  >
                    {gameState.player1.name} (Вы)
                  </span>
                </div>
                </div>

                {/* Right Battlefield Command Flank: Combat Step, Auto-Battle, Speed & Round Advance */}
                <div className="flex flex-col items-center lg:items-start justify-center lg:pl-5 xl:pl-10 z-30">
                  {isResolving && (
                    <div className="flex flex-row flex-wrap lg:flex-col items-center lg:items-stretch justify-center gap-2 w-auto lg:w-[236px]">
                      <div className="lg:w-full">
                        <GameButton
                          variant="primary"
                          size="md"
                          withOrnaments
                          fullWidth
                          onClick={triggerNextTurn}
                          disabled={Boolean(activeAnimation)}
                        >
                          <Play className="w-3.5 h-3.5 fill-current" />
                          <span>Следующий ход</span>
                        </GameButton>
                      </div>

                      <div className="flex items-center gap-2 lg:w-full">
                        <div className="lg:flex-1">
                          <GameButton
                            variant={autoPlay ? 'emerald' : 'secondary'}
                            size="sm"
                            fullWidth
                            onClick={() => {
                              sound.playUiClick();
                              setAutoPlay(!autoPlay);
                            }}
                          >
                            <FastForward className="w-3.5 h-3.5" />
                            <span>{autoPlay ? 'Авто: ВКЛ' : 'Авто-бой'}</span>
                          </GameButton>
                        </div>

                        <GameButton
                          variant={battleSpeed === 2 ? 'primary' : 'secondary'}
                          size="sm"
                          onClick={() => {
                            sound.playUiClick();
                            setBattleSpeed((prev) => (prev === 1 ? 2 : 1));
                          }}
                          title="Переключить скорость анимаций боя (1× / 2×)"
                        >
                          <Gauge className="w-3.5 h-3.5" />
                          <span className="font-led tabular-nums">
                            {battleSpeed}×
                          </span>
                        </GameButton>
                      </div>
                    </div>
                  )}

                  {isEnded && (() => {
                    const willEndMatch =
                      gameState.player1.hand.length === 0 ||
                      gameState.player2.hand.length === 0 ||
                      gameState.roundNumber >= MAX_BATTLE_ROUNDS;

                    return (
                      <div className="flex flex-row flex-wrap lg:flex-col items-center lg:items-stretch justify-center gap-2 lg:w-[236px]">
                        <div className="flex items-center justify-center gap-2 px-3 py-1.5 rounded-[4px] bg-[#0e131a]/92 border border-[#323d4a] text-xs">
                          <span className="font-display uppercase tracking-[0.06em] text-[#aebac6]">
                            Потери:
                          </span>
                          <span className="font-led text-[#8ad1ea] tabular-nums">
                            Вы −{p1RoundLosses}
                          </span>
                          <span className="text-[#566370]">·</span>
                          <span className="font-led text-[#f07c6d] tabular-nums">
                            Враг −{p2RoundLosses}
                          </span>
                        </div>
                        <div className="lg:w-full">
                          <GameButton
                            variant={willEndMatch ? 'primary' : 'emerald'}
                            size="lg"
                            withOrnaments
                            fullWidth
                            onClick={handleNextRound}
                          >
                            <RotateCcw className="w-4 h-4" />
                            <span>
                              {willEndMatch ? 'Итог битвы' : 'Следующий бой'}
                            </span>
                          </GameButton>
                        </div>
                      </div>
                    );
                  })()}
                </div>
              </div>
            ) : (() => {
              const activePlayerId: 'player1' | 'player2' | null = isP1Turn
                ? 'player1'
                : isP2Turn && !gameState.player2.isBot
                ? 'player2'
                : null;
              const activePlayer =
                activePlayerId === 'player1'
                  ? gameState.player1
                  : activePlayerId === 'player2'
                  ? gameState.player2
                  : null;
              const activeMaxSelect =
                activePlayerId === 'player1' ? maxSelectP1 : maxSelectP2;
              const stagedCards = activePlayer
                ? activePlayer.selectedCardIds
                    .map((id) => activePlayer.hand.find((c) => c.id === id))
                    .filter((c): c is CardDefinition => Boolean(c))
                : [];
              const emptySlotCount = Math.max(0, activeMaxSelect - stagedCards.length);
              const isActiveResistance = activePlayer?.side === 'resistance';

              const renderStagingLine = () => {
                if (!activePlayer || !activePlayerId) return null;
                return (
                  <div className="w-full flex flex-col items-center gap-1.5 sm:gap-2 overflow-visible">
                    <span
                      className={`px-3 py-0.5 rounded-[3px] steel-bar text-[11px] font-display font-semibold uppercase tracking-[0.08em] ${
                        isActiveResistance
                          ? 'text-[#a3e0f2] border-[#3a687a]'
                          : 'text-[#f2a096] border-[#6e3136]'
                      }`}
                    >
                      {stagedCards.length > 0
                        ? `Готовы к бою · ${stagedCards.length} / ${activeMaxSelect}`
                        : `Клик по карте в руке — в слот (до ${activeMaxSelect}) · ПКМ — осмотр`}
                    </span>

                    <div className="flex flex-nowrap sm:flex-wrap gap-2 sm:gap-4 justify-center items-center overflow-visible">
                      {stagedCards.map((card, slotIdx) => (
                        <div
                          key={`staged-${activePlayerId}-${card.id}`}
                          className="relative animate-card-deal group overflow-visible"
                        >
                          <CardView
                            card={card}
                            size="battle"
                            isFaceDown={false}
                            isRevealed={true}
                            onClick={() =>
                              openHandCardInspect(activePlayerId, card, true)
                            }
                            onContextMenu={(e) => {
                              e.preventDefault();
                              toggleCardSelect(activePlayerId, card.id);
                            }}
                            className={
                              isActiveResistance
                                ? 'drop-shadow-[0_0_18px_rgba(103,194,222,0.58)]'
                                : 'drop-shadow-[0_0_18px_rgba(229,77,56,0.58)]'
                            }
                          />
                          <div className="pointer-events-none absolute -top-2 -left-2 btn-chamfer-sm bg-[#121921]/95 border border-[#67c2de]/80 text-[#e6f7fc] font-led font-bold w-5 h-5 sm:w-6 sm:h-6 flex items-center justify-center text-[10px] sm:text-[11px] shadow-md z-40">
                            {slotIdx + 1}
                          </div>
                          <button
                            type="button"
                            onClick={(e) => {
                              e.stopPropagation();
                              toggleCardSelect(activePlayerId, card.id);
                            }}
                            title="Вернуть карту в руку"
                            aria-label={`Убрать карту ${card.name} из выбора`}
                            className="absolute -top-2 -right-2 z-50 w-6 h-6 btn-chamfer-sm bg-[#2c1215]/95 hover:bg-[#4a1a1f] border border-[#d65752] text-[#fce8e6] flex items-center justify-center shadow-[0_4px_12px_rgba(0,0,0,0.85)] cursor-pointer transition-transform hover:scale-110 active:scale-95"
                          >
                            <X className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      ))}

                      {Array.from({ length: emptySlotCount }).map((_, idx) => (
                        <div
                          key={`empty-slot-${idx}`}
                          className={`[--card-h:clamp(124px,19.5dvh,152px)] sm:[--card-h:clamp(148px,21.5dvh,244px)] h-[var(--card-h)] w-[calc(var(--card-h)*811/1142)] rounded-xl border border-dashed ${
                            isActiveResistance
                              ? 'border-[#5aaec9]/38 bg-[#0c1820]/35 text-[#7cc3da]/60'
                              : 'border-[#c2544a]/38 bg-[#1e0f12]/35 text-[#d47b72]/60'
                          } backdrop-blur-[1px] flex flex-col items-center justify-center gap-1 select-none pointer-events-none shrink-0`}
                        >
                          <span className="font-led text-xs sm:text-sm font-bold tracking-widest opacity-85">
                            0{stagedCards.length + idx + 1}
                          </span>
                          <span className="font-display text-[10px] uppercase tracking-[0.12em] opacity-75 text-center px-1">
                            Слот боя
                          </span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              };

              const renderConfirmButton = () => (
                <div className="flex items-center justify-center lg:justify-start lg:pl-5 xl:pl-10 z-30">
                  {isP1Turn ? (
                    <GameButton
                      variant="primary"
                      size="lg"
                      withOrnaments
                      disabled={!canConfirmP1}
                      onClick={handleP1Confirm}
                      className="min-w-[216px]"
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
                      className="min-w-[216px]"
                    >
                      <Swords className="w-4 h-4" />
                      <span>
                        В бой ({gameState.player2.selectedCardIds.length}/{maxSelectP2})
                      </span>
                    </GameButton>
                  ) : null}
                </div>
              );

              return (
                <div className="w-full grid grid-cols-1 lg:grid-cols-[minmax(0,1fr)_auto_minmax(256px,1fr)] items-center gap-y-3 lg:gap-y-0 overflow-visible">
                  <div aria-hidden="true" className="hidden lg:block" />
                  {renderStagingLine()}
                  {renderConfirmButton()}
                </div>
              );
            })()}
          </div>

          {/* BOTTOM HAND: PLAYER 1 */}
          <HandZone
            cards={gameState.player1.hand}
            selectedCardIds={gameState.player1.selectedCardIds}
            isSelectable={isP1Turn}
            onToggleSelect={(card) => toggleCardSelect('player1', card.id)}
            onInspectCard={(card) =>
              openHandCardInspect('player1', card, isP1Turn)
            }
            playerName={`${gameState.player1.name} (Вы)`}
            playerSide={gameState.player1.side}
            discardCount={gameState.player1.discard.length}
            discardCards={gameState.player1.discard}
            onOpenDiscard={() =>
              setDiscardModal({
                isOpen: true,
                title: `Потери (${gameState.player1.name})`,
                cards: gameState.player1.discard,
              })
            }
            isOpponent={gameState.mode === 'pvp_local' && isP2Turn}
            isCompactBattle={isReady || isResolving || isEnded}
            hideSelectedFromFan={isP1Turn}
          />
          </div>
        </div>
      </main>

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
          <>
            <GameOverModal
              isOpen={gameState.phase === 'game_over' && !campaignCutscene}
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
              player1Name={gameState.player1.name}
              player2Name={gameState.player2.name}
              roundsCount={gameState.historyRoundsCount}
              defeatReason={gameState.defeatReason}
              isDraw={gameState.winner === null}
              isBotMode={gameState.mode === 'bot'}
              finalCardCounts={gameState.finalCardCounts}
              isCampaign={Boolean(gameState.campaign)}
              campaignStageId={gameState.campaign?.stageId}
              isPlayer1Winner={gameState.winner === 'player1'}
              hasNextCampaignStage={Boolean(nextCampaignStage)}
              onNextStage={
                nextCampaignStage
                  ? () => handleRequestCampaignStage(nextCampaignStage)
                  : undefined
              }
              onViewFinale={
                gameState.campaign?.side === 'resistance' && !nextCampaignStage
                  ? handleOpenFinaleCutscene
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

            {campaignCutscene && (
              <CampaignCutsceneOverlay
                lines={campaignCutscene.lines}
                headerKicker={
                  campaignCutscene.kind === 'finale'
                    ? 'Финал кампании · Победа Сопротивления'
                    : campaignCutscene.kind === 'pre_battle'
                    ? `${campaignCutscene.stage.actTitle} · Этап ${campaignCutscene.stage.id}`
                    : 'Пролог · Кампания Сопротивления'
                }
                headerTitle={
                  campaignCutscene.kind === 'finale'
                    ? 'Демон повержен'
                    : campaignCutscene.kind === 'pre_battle'
                    ? campaignCutscene.stage.title
                    : 'Нападение на лагерь Сопротивления'
                }
                finalActionLabel={
                  campaignCutscene.kind === 'finale'
                    ? 'К итогам победы'
                    : campaignCutscene.kind === 'pre_battle'
                    ? 'В бой!'
                    : 'Продолжить'
                }
                finalActionVariant={
                  campaignCutscene.kind === 'pre_battle' ? 'emerald' : 'primary'
                }
                finalActionIcon={
                  campaignCutscene.kind === 'pre_battle'
                    ? 'battle'
                    : campaignCutscene.kind === 'finale'
                    ? 'trophy'
                    : 'continue'
                }
                cancelLabel={
                  campaignCutscene.kind === 'pre_battle' ? 'Отмена' : undefined
                }
                onCancel={
                  campaignCutscene.kind === 'pre_battle'
                    ? () => {
                        sound.playSelect();
                        setCampaignCutscene(null);
                      }
                    : undefined
                }
                onComplete={() => {
                  sound.playSelect();
                  if (campaignCutscene.kind === 'pre_battle') {
                    handleStartCampaignStage(campaignCutscene.stage);
                  } else {
                    setCampaignCutscene(null);
                  }
                }}
              />
            )}
          </>
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
        description="Выберите существо с рангом 6 и ниже из вашего сброса, чтобы вернуть его в руку. После воскрешения Некромант не погибает и остаётся на поле."
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

      <CardSwapModal
        isOpen={coldCalcModalOpen}
        title="Способность карты «Холодный расчёт»"
        description="Выберите любое существо или технику из вашей руки, чтобы подменить «Холодный расчёт» прямо в бою, либо ничего не делайте. Заклинание одноразовое."
        cards={coldCalcEligibleHand}
        onSelectCard={handleColdCalcChoice}
        skipButtonText="Ничего не делать"
      />

      <CardSwapModal
        isOpen={conjurerModalOpen}
        title="Способность Заклинателя"
        description="Выберите, кого призвать на поле боя вместо Заклинателя — Беса или Злого духа. Заклинатель вернётся в руку, а призванный юнит вступит в бой по своей инициативе."
        cards={conjurerAvailableSummons}
        onSelectCard={handleConjurerChoice}
        skipButtonText="Никого не призывать"
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
