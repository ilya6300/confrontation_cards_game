/**
 * Card Game Core Type Definitions
 */

export type CardSide = 'resistance' | 'dark_side';

export type CardType =
  | 'technology'   // Техника (роботы, боевые машины)
  | 'creature'     // Существо (люди, животные, зомби, вампиры)
  | 'incorporeal'  // Бесплотное (духи, призраки)
  | 'magic'        // Заклинание (магия, наука, болезни, явления)
  | 'virus';       // Вирус (не блокируется защитой от заклинаний)

export type EffectAction =
  | 'destroy'
  | 'protect'
  | 'disable'
  | 'reduce_rank'
  | 'revive'
  | 'evacuate'
  | 'rewind'
  | 'reveal'
  | 'replace'
  | 'cancel_ability';

export interface TargetFilter {
  side?: 'ally' | 'enemy' | 'all' | 'self';
  types?: CardType[];
  excludeTypes?: CardType[];
  maxRank?: number;
  minRank?: number;
  exactRank?: number;
  cardIds?: string[];
  excludeCardIds?: string[];
  limit?: number; // e.g. 1
  priority?: 'highest_rank' | 'lowest_rank' | 'first';
}

export interface CardEffect {
  action: EffectAction;
  target?: TargetFilter;
  protectAgainst?: CardType[];
  amount?: number;
  ignoreProtection?: boolean;
  cancelCardId?: string;
  reviveFilter?: TargetFilter;
  destroySelf?: boolean;
  allowSelfReplace?: boolean;
  description: string;
}

export interface CardDefinition {
  id: string;
  name: string;
  side: CardSide;
  type: CardType;
  rank: number;
  initiative: number;
  description: string;
  effects: CardEffect[];
  icon: string; // SVG icon identifier
  image: string; // Card front artwork PNG
  isSingleUse?: boolean;
  isHiddenSpell?: boolean; // If true, never placed into starting hand; summoned/swapped dynamically
}

export interface BattleCard {
  instanceId: string;
  slotIndex?: number;
  card: CardDefinition;
  owner: 'player1' | 'player2';
  currentRank: number;
  currentInitiative: number;
  isDestroyed: boolean;
  isDisabled: boolean;
  isCancelled: boolean;
  isEvacuated?: boolean;
  protectedAgainst: CardType[];
  hasActed: boolean;
  revealed: boolean;
}

export interface LogEntry {
  id: string;
  type: 'info' | 'activate' | 'destroy' | 'protect' | 'disable' | 'reduce_rank' | 'revive' | 'rewind' | 'reveal' | 'replace' | 'cancel' | 'fail';
  sourceCard?: {
    name: string;
    side: CardSide;
    type: CardType;
  };
  targetCard?: {
    name: string;
    side: CardSide;
    type: CardType;
  };
  message: string;
  timestamp: number;
}

export type GameMode = 'bot' | 'pvp_local';

export type GamePhase =
  | 'menu'
  | 'campaign_select'
  | 'campaign_map'
  | 'p1_select'
  | 'pass_device'
  | 'p2_select'
  | 'ready_to_battle'
  | 'battle_resolving'
  | 'battle_ended'
  | 'game_over';

export interface CampaignContext {
  side: CardSide;
  stageId: number;
}

export interface PlayerState {
  id: 'player1' | 'player2';
  name: string;
  side: CardSide;
  isBot: boolean;
  hand: CardDefinition[];
  discard: CardDefinition[];
  selectedCardIds: string[];
}

export type DefeatReason = 'empty_hand' | 'turn_limit' | 'surrender';

export interface GameState {
  mode: GameMode;
  phase: GamePhase;
  roundNumber: number;
  player1: PlayerState;
  player2: PlayerState;
  activeBattleQueue: BattleCard[];
  currentTurnIndex: number;
  battleLog: LogEntry[];
  winner: 'player1' | 'player2' | null;
  defeatReason?: DefeatReason;
  historyRoundsCount: number;
  campaign?: CampaignContext;
}
