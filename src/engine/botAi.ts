import {
  BattleCard,
  BotMemory,
  CardDefinition,
  CardSide,
  PlayerState,
} from '../types/game';
import {
  executeCardTurn,
  finalizeBattle,
  getAvailableSummonOptions,
  initializeBattleQueue,
} from './effectProcessor';

export interface BotSelectionOptions {
  roundNumber?: number;
  maxRounds?: number;
  memory?: BotMemory;
  forcedCardIds?: string[];
  preferredSchemes?: string[];
}

export interface BotSelectionDecision {
  cardIds: string[];
  schemeId?: string;
}

interface BotDecisionContext {
  bot: PlayerState;
  enemy: PlayerState;
  roundNumber: number;
  maxRounds: number;
  memory: BotMemory;
  botHandIds: Set<string>;
  botDiscardIds: Set<string>;
  enemyHandIds: Set<string>;
  enemyDiscardIds: Set<string>;
  enemyCreatureCount: number;
  enemyTechCount: number;
  enemyIncorporealCount: number;
  enemyMagicCount: number;
  enemyMagicShieldCount: number;
  enemyHighRankCount: number; // creatures with rank >= 6
  enemyLowMidCreatureCount: number; // creatures with rank <= 4
  botSpellCount: number;
  botRevivableCount: number;
  enemyRecentIds: Set<string>;
}

interface TacticalScheme {
  id: string;
  side: CardSide;
  name: string;
  /**
   * Ordered priority lists for each of the 3 tactical slots.
   * Multiple fallbacks per slot allow every scheme to work cleanly
   * both with full 17-card decks and partial campaign hands.
   */
  slots: string[][];
  minMatchedSlots: number;
  evaluate: (ctx: BotDecisionContext) => number;
}

interface CandidateTrio {
  cardIds: string[];
  schemeId: string;
  schemeScore: number;
  synergyScore: number;
  simScore: number;
  totalScore: number;
}

const DEFAULT_MAX_ROUNDS = 10;

export function createInitialBotMemory(): BotMemory {
  return {
    lastSchemeId: undefined,
    recentSchemeIds: [],
    lastBotCardIds: [],
    enemyPlayedCounts: {},
    enemyRecentRounds: [],
  };
}

export function recordBotDecision(
  memory: BotMemory | undefined,
  decision: BotSelectionDecision
): BotMemory {
  const base = memory ?? createInitialBotMemory();
  const nextRecentSchemes = decision.schemeId
    ? [...base.recentSchemeIds, decision.schemeId].slice(-3)
    : base.recentSchemeIds;
  return {
    ...base,
    lastSchemeId: decision.schemeId ?? base.lastSchemeId,
    recentSchemeIds: nextRecentSchemes,
    lastBotCardIds: [...decision.cardIds],
  };
}

export function recordEnemyPlayedCards(
  memory: BotMemory | undefined,
  enemyPlayedCardIds: string[]
): BotMemory {
  const base = memory ?? createInitialBotMemory();
  const nextCounts: Record<string, number> = { ...base.enemyPlayedCounts };
  for (const id of enemyPlayedCardIds) {
    nextCounts[id] = (nextCounts[id] ?? 0) + 1;
  }
  const nextRecentRounds = [...base.enemyRecentRounds, [...enemyPlayedCardIds]].slice(-3);
  return {
    ...base,
    enemyPlayedCounts: nextCounts,
    enemyRecentRounds: nextRecentRounds,
  };
}

// ============================================================================
// Context & Card Valuation Helpers
// ============================================================================

function buildContext(
  bot: PlayerState,
  enemy: PlayerState,
  options?: BotSelectionOptions
): BotDecisionContext {
  const memory = options?.memory ?? createInitialBotMemory();
  const botHandIds = new Set(bot.hand.map((c) => c.id));
  const botDiscardIds = new Set(bot.discard.map((c) => c.id));
  const enemyHandIds = new Set(enemy.hand.map((c) => c.id));
  const enemyDiscardIds = new Set(enemy.discard.map((c) => c.id));

  const enemyCreatures = enemy.hand.filter((c) => c.type === 'creature');
  const enemyTech = enemy.hand.filter((c) => c.type === 'technology');
  const enemyIncorporeal = enemy.hand.filter(
    (c) => c.type === 'incorporeal' || c.id === 'conjurer'
  );
  const enemyMagic = enemy.hand.filter((c) => c.type === 'magic');
  const enemyMagicShieldCount = enemy.hand.filter(
    (c) => c.id === 'engineer' || c.id === 'progressive_science' || c.id === 'scientist'
  ).length;
  const enemyHighRankCount = enemyCreatures.filter((c) => c.rank >= 6).length;
  const enemyLowMidCreatureCount = enemyCreatures.filter((c) => c.rank <= 4).length;

  const botSpellCount = bot.hand.filter((c) => c.type === 'magic').length;
  const botRevivableCount = bot.discard.filter(
    (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
  ).length;

  const enemyRecentIds = new Set<string>();
  for (const roundIds of memory.enemyRecentRounds.slice(-2)) {
    for (const id of roundIds) {
      enemyRecentIds.add(id);
    }
  }

  return {
    bot,
    enemy,
    roundNumber: options?.roundNumber ?? 1,
    maxRounds: options?.maxRounds ?? DEFAULT_MAX_ROUNDS,
    memory,
    botHandIds,
    botDiscardIds,
    enemyHandIds,
    enemyDiscardIds,
    enemyCreatureCount: enemyCreatures.length,
    enemyTechCount: enemyTech.length,
    enemyIncorporealCount: enemyIncorporeal.length,
    enemyMagicCount: enemyMagic.length,
    enemyMagicShieldCount,
    enemyHighRankCount,
    enemyLowMidCreatureCount,
    botSpellCount,
    botRevivableCount,
    enemyRecentIds,
  };
}

function getEnemyPlayFrequency(memory: BotMemory, cardIds: string[]): number {
  return cardIds.reduce((sum, id) => sum + (memory.enemyPlayedCounts[id] ?? 0), 0);
}

/**
 * Strategic retention value of a card (used in battle lookahead scoring & tie-breaking).
 * Higher value means the card is more precious to keep alive / more rewarding to destroy.
 */
function getCardStrategicValue(
  card: CardDefinition,
  opponentHand: CardDefinition[],
  roundNumber = 1,
  maxRounds = DEFAULT_MAX_ROUNDS
): number {
  const oppHasTech = opponentHand.some((c) => c.type === 'technology');
  const oppHasWarRobots = opponentHand.some((c) => c.id === 'war_robots');
  const oppHasIncorporeal = opponentHand.some(
    (c) => c.type === 'incorporeal' || c.id === 'conjurer'
  );
  const oppHasCreatures = opponentHand.some((c) => c.type === 'creature');
  const oppHasMagic = opponentHand.some((c) => c.type === 'magic' || c.id === 'old_wizard');

  // Late game puts heavy emphasis on raw remaining card count (10-round tiebreak rule)
  const lateGameCardBonus = roundNumber >= maxRounds - 2 ? 7 : roundNumber >= maxRounds - 4 ? 3 : 0;

  let base = card.isSingleUse ? 10 : 15;
  base += card.rank * 0.75 + (card.initiative / 300) * 3;

  switch (card.id) {
    // Dark Side aces & specialists
    case 'demon':
      base = 24;
      break;
    case 'vampire':
      base = 21;
      break;
    case 'gargoyle':
    case 'rabid_dogs':
      base = 18;
      break;
    case 'parasite':
      base = oppHasCreatures ? 19 : 9;
      break;
    case 'ghost':
      base = oppHasCreatures ? 20 : 10;
      break;
    case 'conjurer':
      base = 19;
      break;
    case 'necromancer':
      base = 18;
      break;
    case 'dark_sapper':
      base = oppHasTech ? 19 : 9;
      break;
    case 'old_wizard':
      base = 16;
      break;
    case 'plague':
      base = oppHasCreatures ? 16 : 7;
      break;
    case 'natural_disaster':
      base = oppHasCreatures || oppHasTech ? 14 : 7;
      break;
    case 'abnormal_lightning':
      base = oppHasTech ? 14 : 6;
      break;
    case 'hidden_virus':
      base = oppHasWarRobots ? 15 : 5;
      break;
    case 'ball_lightning':
      base = oppHasTech ? 12 : 5;
      break;
    case 'terrible_disease':
      base = oppHasCreatures ? 11 : 6;
      break;
    case 'zombie':
      base = 14;
      break;
    case 'imp':
    case 'evil_spirit':
      base = 13;
      break;

    // Resistance aces & specialists
    case 'battle_church':
      base = 25;
      break;
    case 'war_robots':
      base = 23;
      break;
    case 'sniper':
      base = 22;
      break;
    case 'war_machines':
      base = 20;
      break;
    case 'army':
      base = 19;
      break;
    case 'engineer':
      base = oppHasMagic ? 18 : 11;
      break;
    case 'scientist':
      base = oppHasMagic ? 16 : 10;
      break;
    case 'priest':
      base = oppHasIncorporeal ? 18 : 10;
      break;
    case 'medic':
      base = 17;
      break;
    case 'evacuation':
      base = 16;
      break;
    case 'seer':
      base = 18;
      break;
    case 'policeman':
      base = 15;
      break;
    case 'reserves':
      base = 17;
      break;
    case 'progressive_science':
      base = oppHasMagic ? 15 : 7;
      break;
    case 'cold_calculation':
      base = 15;
      break;
    case 'call_reserves':
      base = 16;
      break;
    case 'drone_squad':
      base = oppHasCreatures ? 13 : 6;
      break;
    case 'prayer':
      base = oppHasIncorporeal ? 13 : 5;
      break;
    default:
      break;
  }

  return base + lateGameCardBonus;
}

// ============================================================================
// Tactical Schemes (6 for Dark Side, 6 for Resistance)
// ============================================================================

const DARK_SIDE_SCHEMES: TacticalScheme[] = [
  {
    id: 'ds_blitz',
    side: 'dark_side',
    name: 'Блицкриг',
    slots: [
      ['parasite', 'rabid_dogs', 'gargoyle'],
      ['gargoyle', 'rabid_dogs', 'vampire'],
      ['vampire', 'ghost', 'conjurer', 'rabid_dogs', 'zombie'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      let score = 56;
      if (ctx.enemyLowMidCreatureCount >= 2) score += 16;
      if (ctx.enemyHandIds.has('sniper')) score += 10;
      if (ctx.enemyHandIds.has('engineer') || ctx.enemyHandIds.has('scientist')) score += 8;
      if (ctx.enemyHandIds.has('seer') || ctx.enemyHandIds.has('priest')) score += 6;
      if (ctx.roundNumber <= 3) score += 8;
      // Less effective if enemy is heavily skewed to rank 7-8 + tech
      if (ctx.enemyLowMidCreatureCount === 0 && ctx.enemyTechCount > 0) score -= 24;
      if (getEnemyPlayFrequency(ctx.memory, ['sniper', 'engineer', 'priest', 'seer']) >= 2) {
        score += 9;
      }
      return score;
    },
  },
  {
    id: 'ds_epidemic',
    side: 'dark_side',
    name: 'Эпидемия и пробой рангов',
    slots: [
      ['terrible_disease'],
      // Finishers that act AFTER Terrible Disease (init 145) and gain critical rank thresholds!
      ['ghost', 'natural_disaster', 'zombie', 'conjurer'],
      ['gargoyle', 'rabid_dogs', 'parasite', 'old_wizard', 'vampire'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('terrible_disease')) return -100;
      const hasPostDiseaseFinisher =
        ctx.botHandIds.has('ghost') ||
        ctx.botHandIds.has('natural_disaster') ||
        ctx.botHandIds.has('zombie') ||
        ctx.botHandIds.has('conjurer');
      if (!hasPostDiseaseFinisher) return -100;

      let score = 54;
      // Threshold breakpoints created by -1 rank:
      // Army (7 -> 6, killed by Natural Disaster), Sniper (6 -> 5, killed by Ghost),
      // Reserves (5 -> 4, killed by Zombie), Policeman (4 -> 3, killed by Imp)
      if (ctx.enemyHandIds.has('army') && ctx.botHandIds.has('natural_disaster')) score += 18;
      if (ctx.enemyHandIds.has('sniper') && ctx.botHandIds.has('ghost')) score += 15;
      if (ctx.enemyHandIds.has('policeman')) score += 8;
      if (ctx.enemyHandIds.has('reserves') && ctx.botHandIds.has('zombie')) score += 10;
      if (ctx.enemyCreatureCount >= 4) score += 8;
      if (ctx.enemyCreatureCount <= 1) score -= 26;
      if (ctx.roundNumber >= ctx.maxRounds - 1) score -= 12; // conserve single-use unless lethal
      return score;
    },
  },
  {
    id: 'ds_demon_push',
    side: 'dark_side',
    name: 'Прорыв Демона',
    slots: [
      ['demon'],
      ['dark_sapper', 'hidden_virus', 'parasite', 'abnormal_lightning', 'gargoyle'],
      ['ghost', 'vampire', 'gargoyle', 'rabid_dogs', 'conjurer', 'necromancer'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('demon')) return -100;
      let score = 60;
      // Huge timing window when Battle Church is dead or absent!
      if (!ctx.enemyHandIds.has('battle_church')) {
        score += 24;
      } else if (ctx.enemyRecentIds.has('battle_church')) {
        // Player likes using Battle Church; be a bit more cautious unless Parasite/Plague threatens
        score -= 10;
      }
      if (ctx.enemyHandIds.has('army') || ctx.enemyHandIds.has('war_machines')) score += 14;
      if (ctx.enemyCreatureCount >= 3) score += 10;
      if (ctx.enemyHandIds.has('war_robots') && (ctx.botHandIds.has('dark_sapper') || ctx.botHandIds.has('hidden_virus'))) {
        score += 10;
      }
      if (ctx.enemyHandIds.has('seer') && ctx.enemyRecentIds.has('seer')) {
        score -= 6;
      }
      return score;
    },
  },
  {
    id: 'ds_anti_tech',
    side: 'dark_side',
    name: 'Охота на железо',
    slots: [
      ['dark_sapper', 'hidden_virus', 'abnormal_lightning', 'ball_lightning'],
      ['hidden_virus', 'dark_sapper', 'abnormal_lightning', 'demon', 'ball_lightning'],
      ['vampire', 'ghost', 'gargoyle', 'parasite', 'conjurer', 'rabid_dogs'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (ctx.enemyTechCount === 0) return -100;
      let score = 52 + ctx.enemyTechCount * 14;
      if (ctx.enemyHandIds.has('war_robots')) score += 12;
      if (getEnemyPlayFrequency(ctx.memory, ['war_robots', 'war_machines']) >= 1) {
        score += 16;
      }
      if (ctx.enemyRecentIds.has('war_robots') || ctx.enemyRecentIds.has('war_machines')) {
        score += 10;
      }
      // If enemy still has magic shields, virus & sapper shine even more
      if (
        ctx.enemyMagicShieldCount > 0 &&
        (ctx.botHandIds.has('hidden_virus') || ctx.botHandIds.has('dark_sapper'))
      ) {
        score += 10;
      }
      return score;
    },
  },
  {
    id: 'ds_shadow_value',
    side: 'dark_side',
    name: 'Теневой контроль',
    slots: [
      ['conjurer', 'necromancer', 'old_wizard'],
      ['necromancer', 'old_wizard', 'ghost', 'conjurer'],
      ['ghost', 'vampire', 'parasite', 'zombie', 'rabid_dogs', 'gargoyle'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      let score = 50;
      const impAvailable = !ctx.botDiscardIds.has('imp') && !ctx.botHandIds.has('imp');
      const spiritAvailable =
        !ctx.botDiscardIds.has('evil_spirit') && !ctx.botHandIds.has('evil_spirit');

      if (ctx.botHandIds.has('conjurer') && (impAvailable || spiritAvailable)) {
        score += 16;
      }
      if (ctx.botHandIds.has('necromancer') && ctx.botRevivableCount > 0) {
        score += 22;
      }
      if (ctx.botHandIds.has('old_wizard') && ctx.botSpellCount >= 2) {
        score += 12;
        if (!ctx.enemyHandIds.has('sniper') && !ctx.enemyHandIds.has('battle_church')) {
          score += 12;
        }
      }
      if (ctx.botHandIds.has('ghost') && !ctx.enemyHandIds.has('priest') && !ctx.enemyHandIds.has('battle_church')) {
        score += 14;
      }
      // Value & card advantage shines in mid and late game
      if (ctx.roundNumber >= 4) score += 12;
      if (ctx.bot.hand.length <= ctx.enemy.hand.length) score += 8;
      return score;
    },
  },
  {
    id: 'ds_plague_wipe',
    side: 'dark_side',
    name: 'Чумная зачистка',
    slots: [
      ['plague', 'natural_disaster'],
      ['gargoyle', 'rabid_dogs', 'parasite', 'vampire'],
      ['ghost', 'vampire', 'dark_sapper', 'ball_lightning', 'zombie', 'conjurer'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('plague') && !ctx.botHandIds.has('natural_disaster')) {
        return -100;
      }
      let score = 52;
      if (ctx.enemyHighRankCount >= 2) score += 16; // Battle Church / Army / Sniper
      if (ctx.enemyHandIds.has('battle_church') && ctx.botHandIds.has('plague')) score += 14;
      if (ctx.enemyCreatureCount >= 4) score += 10;
      // Huge opening when Progressive Science is already gone!
      if (!ctx.enemyHandIds.has('progressive_science')) {
        score += 16;
      } else if (ctx.enemyRecentIds.has('progressive_science')) {
        score -= 8;
      }
      // If enemy spams Engineer/Scientist, Gargoyle/Dogs/Parasite break the shield before Plague!
      if (
        (ctx.enemyHandIds.has('engineer') || ctx.enemyHandIds.has('scientist')) &&
        (ctx.botHandIds.has('gargoyle') || ctx.botHandIds.has('rabid_dogs') || ctx.botHandIds.has('parasite'))
      ) {
        score += 10;
      }
      if (ctx.enemyCreatureCount <= 1) score -= 28;
      return score;
    },
  },
];

const RESISTANCE_SCHEMES: TacticalScheme[] = [
  {
    id: 'res_armored_tech',
    side: 'resistance',
    name: 'Бронекулак под прикрытием',
    slots: [
      ['progressive_science', 'engineer'],
      ['war_machines', 'war_robots'],
      ['war_robots', 'war_machines', 'sniper', 'battle_church', 'army'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('war_machines') && !ctx.botHandIds.has('war_robots')) {
        return -100;
      }
      let score = 58;
      if (ctx.enemyCreatureCount >= 4) score += 14;
      if (ctx.enemyHandIds.has('demon') && ctx.botHandIds.has('war_robots')) score += 14;
      if (ctx.enemyHandIds.has('vampire') && ctx.botHandIds.has('war_machines')) score += 10;
      // Safer when Dark Side has already spent anti-tech cards
      if (!ctx.enemyHandIds.has('hidden_virus')) score += 10;
      if (!ctx.enemyHandIds.has('abnormal_lightning')) score += 8;
      if (!ctx.enemyHandIds.has('dark_sapper')) score += 10;
      // If enemy holds magic anti-tech, having shield boosts this scheme
      if (
        (ctx.enemyHandIds.has('abnormal_lightning') || ctx.enemyHandIds.has('ball_lightning')) &&
        (ctx.botHandIds.has('progressive_science') || ctx.botHandIds.has('engineer'))
      ) {
        score += 10;
      }
      if (getEnemyPlayFrequency(ctx.memory, ['hidden_virus', 'dark_sapper']) >= 2) {
        score -= 10;
      }
      return score;
    },
  },
  {
    id: 'res_sacred_bastion',
    side: 'resistance',
    name: 'Священный бастион',
    slots: [
      ['battle_church', 'priest'],
      ['progressive_science', 'scientist', 'engineer'],
      ['sniper', 'army', 'medic', 'war_robots', 'priest', 'policeman'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('battle_church') && !ctx.botHandIds.has('priest')) {
        return -100;
      }
      let score = 56;
      if (ctx.enemyHandIds.has('demon')) score += 16;
      if (ctx.enemyHandIds.has('ghost') || ctx.enemyHandIds.has('conjurer')) score += 12;
      if (ctx.enemyHandIds.has('old_wizard')) score += 8;
      if (ctx.enemyHandIds.has('plague')) score += 10;
      if (getEnemyPlayFrequency(ctx.memory, ['demon', 'ghost', 'plague', 'old_wizard']) >= 2) {
        score += 12;
      }
      return score;
    },
  },
  {
    id: 'res_hit_and_run',
    side: 'resistance',
    name: 'Удар и эвакуация',
    slots: [
      ['evacuation'],
      ['sniper', 'priest', 'engineer', 'scientist'],
      ['priest', 'drone_squad', 'war_machines', 'sniper', 'army', 'policeman'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('evacuation')) return -100;
      const hasFastAlly =
        ctx.botHandIds.has('sniper') ||
        ctx.botHandIds.has('priest') ||
        ctx.botHandIds.has('engineer') ||
        ctx.botHandIds.has('scientist');
      if (!hasFastAlly) return -100;

      let score = 62;
      if (ctx.botHandIds.has('sniper')) score += 16;
      if (ctx.enemyHandIds.has('demon') || ctx.enemyHandIds.has('plague') || ctx.enemyHandIds.has('vampire')) {
        score += 14;
      }
      if (ctx.roundNumber >= 3) score += 8;
      if (ctx.bot.hand.length <= 6) score += 6;
      return score;
    },
  },
  {
    id: 'res_cold_ambush',
    side: 'resistance',
    name: 'Засада (Холодный расчёт)',
    slots: [
      ['cold_calculation'],
      ['sniper', 'army', 'battle_church', 'war_machines', 'policeman'],
      ['medic', 'engineer', 'priest', 'drone_squad', 'call_reserves', 'policeman'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('cold_calculation')) return -100;
      const reserveUnits = ctx.bot.hand.filter(
        (c) => (c.type === 'creature' || c.type === 'technology') && c.id !== 'evacuation'
      ).length;
      if (reserveUnits < 3) return -100;

      let score = 60;
      if (reserveUnits >= 6) score += 14;
      if (ctx.botHandIds.has('war_robots') || ctx.botHandIds.has('battle_church') || ctx.botHandIds.has('seer')) {
        score += 10;
      }
      if (ctx.roundNumber <= 6) score += 6;
      return score;
    },
  },
  {
    id: 'res_scorched_earth',
    side: 'resistance',
    name: 'Выжженная земля (Артиллерия)',
    slots: [
      ['seer'],
      ['call_reserves', 'prayer', 'drone_squad', 'evacuation'],
      ['prayer', 'drone_squad', 'call_reserves', 'evacuation', 'policeman'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      if (!ctx.botHandIds.has('seer')) return -100;
      let score = 52;
      // Huge synergy with Call Reserves (summons Reserves at init 31 AFTER Artillery at 104!)
      if (ctx.botHandIds.has('call_reserves')) score += 20;
      if (ctx.enemyHandIds.has('demon') || ctx.enemyHandIds.has('vampire')) score += 14;
      if (ctx.enemyCreatureCount >= 5) score += 10;
      // Careful if enemy spams fast Gargoyle/Dogs (285-286) that snipe Artillerist (r3) before 104
      if (getEnemyPlayFrequency(ctx.memory, ['gargoyle', 'rabid_dogs']) >= 2) {
        score -= 8;
      }
      if (ctx.enemyIncorporealCount >= 2 && !ctx.botHandIds.has('prayer')) {
        score -= 10; // Artillery doesn't hit Ghost/Evil Spirit
      }
      return score;
    },
  },
  {
    id: 'res_attrition_wave',
    side: 'resistance',
    name: 'Волна истощения и реанимация',
    slots: [
      ['call_reserves', 'reserves', 'medic'],
      ['army', 'reserves', 'policeman', 'war_robots', 'battle_church'],
      ['medic', 'policeman', 'sniper', 'drone_squad', 'call_reserves', 'priest'],
    ],
    minMatchedSlots: 2,
    evaluate: (ctx) => {
      let score = 60;
      if (ctx.botHandIds.has('call_reserves')) score += 18;
      if (ctx.botHandIds.has('reserves')) score += 12;
      if (ctx.botHandIds.has('medic')) score += 10;
      if (ctx.roundNumber >= 4) score += 12;
      if (ctx.bot.hand.length <= ctx.enemy.hand.length) score += 10;
      if (ctx.enemyCreatureCount >= 3) score += 8;
      return score;
    },
  },
];

function getSchemesForSide(side: CardSide): TacticalScheme[] {
  return side === 'dark_side' ? DARK_SIDE_SCHEMES : RESISTANCE_SCHEMES;
}

// ============================================================================
// Trio Synergy & Anti-Synergy Evaluation
// ============================================================================

function evaluateTrioSynergy(
  trioCards: CardDefinition[],
  ctx: BotDecisionContext
): number {
  const ids = new Set(trioCards.map((c) => c.id));
  let bonus = 0;

  // --- Resistance synergies & anti-synergies ---
  const magicShieldsInTrio = trioCards.filter(
    (c) => c.id === 'engineer' || c.id === 'progressive_science' || c.id === 'scientist'
  ).length;
  if (magicShieldsInTrio >= 2) {
    bonus -= 34; // Never waste two magic shields in the same round
  }

  const antiIncorporealInTrio = trioCards.filter(
    (c) => c.id === 'priest' || c.id === 'prayer' || c.id === 'battle_church'
  ).length;
  if (antiIncorporealInTrio >= 2 && ids.has('prayer') && ctx.enemyIncorporealCount <= 1) {
    bonus -= 24;
  }

  if (ids.has('seer')) {
    // Artillerist explodes all creatures & tech on the field at init 104!
    if (ids.has('call_reserves')) bonus += 26; // Summons AFTER explosion (init 31)
    if (ids.has('prayer')) bonus += 12; // Clears Ghost (immune to Artillery) right before 104
    if (ids.has('drone_squad')) bonus += 10;
    if (ids.has('evacuation')) bonus += 14; // Can save a fast ally before 104
    const collateralAllies = trioCards.filter(
      (c) =>
        c.id !== 'seer' &&
        c.id !== 'evacuation' &&
        (c.type === 'creature' || c.type === 'technology')
    );
    for (const ally of collateralAllies) {
      // Heavy penalty for blowing up our own Battle Church / War Robots / Sniper!
      const isSavedByEvac = ids.has('evacuation') && collateralAllies.length === 1;
      if (!isSavedByEvac) {
        bonus -= ally.rank >= 6 || ally.type === 'technology' ? 32 : 18;
      }
    }
  }

  if (ids.has('evacuation')) {
    const evacTargets = trioCards.filter(
      (c) => c.id !== 'evacuation' && (c.type === 'creature' || c.type === 'technology')
    );
    if (evacTargets.length === 0) {
      bonus -= 30;
    } else if (evacTargets.some((c) => c.initiative > 138)) {
      bonus += 14; // Fast ally acts before Evacuation (138), then safely retreats
    }
  }

  if (ids.has('medic')) {
    const allyCreatures = trioCards.filter((c) => c.id !== 'medic' && c.type === 'creature');
    if (allyCreatures.length === 0) {
      bonus -= 28; // Medic only reanimates allied creatures
    } else if (allyCreatures.some((c) => c.rank >= 5)) {
      bonus += 10;
    }
  }

  if (ids.has('cold_calculation')) {
    // Keep high-impact creatures/tech IN HAND for Cold Calculation to swap into!
    const remainingUnitsInHand = ctx.bot.hand.filter(
      (c) =>
        !ids.has(c.id) &&
        (c.type === 'creature' || c.type === 'technology') &&
        c.id !== 'evacuation'
    ).length;
    if (remainingUnitsInHand === 0) {
      bonus -= 38;
    } else if (remainingUnitsInHand >= 3) {
      bonus += 12;
    }
  }

  if (
    (ids.has('war_robots') || ids.has('war_machines')) &&
    (ids.has('progressive_science') || ids.has('engineer')) &&
    (ctx.enemyHandIds.has('abnormal_lightning') || ctx.enemyHandIds.has('ball_lightning'))
  ) {
    bonus += 16;
  }

  if (
    (ids.has('battle_church') || ids.has('army')) &&
    magicShieldsInTrio === 1 &&
    (ctx.enemyHandIds.has('plague') || ctx.enemyHandIds.has('natural_disaster'))
  ) {
    bonus += 14;
  }

  // --- Dark Side synergies & anti-synergies ---
  if (ids.has('old_wizard')) {
    const remainingSpellsInHand = ctx.bot.hand.filter(
      (c) => !ids.has(c.id) && c.type === 'magic'
    ).length;
    if (remainingSpellsInHand === 0) {
      bonus -= 42; // Old Wizard with 0 spells left in hand does nothing
    } else if (remainingSpellsInHand >= 2) {
      bonus += 12;
    }
  }

  if (ids.has('terrible_disease')) {
    const rankComboPartners = trioCards.filter(
      (c) =>
        c.id === 'ghost' ||
        c.id === 'natural_disaster' ||
        c.id === 'zombie' ||
        c.id === 'conjurer'
    );
    if (rankComboPartners.length > 0) {
      bonus += 16;
    } else {
      bonus -= 22; // Don't throw Terrible Disease without a post-145 rank-capped follow-up
    }
  }

  if (ids.has('necromancer') && ctx.botRevivableCount === 0) {
    bonus -= 32;
  }

  if (ids.has('conjurer')) {
    const canSummon =
      (!ctx.botDiscardIds.has('imp') && !ids.has('imp')) ||
      (!ctx.botDiscardIds.has('evil_spirit') && !ids.has('evil_spirit'));
    if (!canSummon) bonus -= 34;
  }

  if (
    (ids.has('plague') || ids.has('natural_disaster')) &&
    (ids.has('gargoyle') || ids.has('rabid_dogs') || ids.has('parasite')) &&
    (ctx.enemyHandIds.has('engineer') || ctx.enemyHandIds.has('scientist'))
  ) {
    bonus += 14; // Kills/blocks creature shield before mass spell resolves
  }

  if (
    ids.has('demon') &&
    (ids.has('dark_sapper') || ids.has('hidden_virus')) &&
    ctx.enemyHandIds.has('war_robots')
  ) {
    bonus += 16;
  }

  // Don't stack 3 single-use spells in one round unless enemy is nearly dead
  const singleUseCount = trioCards.filter((c) => c.isSingleUse).length;
  if (singleUseCount === 3 && ctx.enemy.hand.length > 3) {
    bonus -= 22;
  } else if (singleUseCount >= 2 && ctx.roundNumber >= ctx.maxRounds - 2) {
    bonus -= 14; // Preserve card count in final rounds
  }

  // Avoid completely dead anti-tech / anti-incorporeal / anti-robot cards
  if (ids.has('hidden_virus') && !ctx.enemyHandIds.has('war_robots')) bonus -= 35;
  if (
    (ids.has('abnormal_lightning') || ids.has('ball_lightning') || ids.has('dark_sapper')) &&
    ctx.enemyTechCount === 0
  ) {
    bonus -= 32;
  }
  if ((ids.has('prayer') || ids.has('priest')) && ctx.enemyIncorporealCount === 0) {
    bonus -= 30;
  }

  return bonus;
}

/**
 * Fallback single-card utility score used when completing a partial scheme slot.
 */
function scoreFillerCard(
  card: CardDefinition,
  chosenSoFar: CardDefinition[],
  ctx: BotDecisionContext
): number {
  let score = getCardStrategicValue(card, ctx.enemy.hand, ctx.roundNumber, ctx.maxRounds);

  // Small situational adjustments
  if (card.id === 'necromancer') {
    score += ctx.botRevivableCount > 0 ? 18 : -25;
  }
  if (card.id === 'old_wizard') {
    const spellsLeft = ctx.bot.hand.filter(
      (c) => c.type === 'magic' && c.id !== card.id && !chosenSoFar.some((s) => s.id === c.id)
    ).length;
    score += spellsLeft > 0 ? 6 : -30;
  }
  if (card.id === 'conjurer') {
    const hasSummon = !ctx.botDiscardIds.has('imp') || !ctx.botDiscardIds.has('evil_spirit');
    score += hasSummon ? 10 : -28;
  }

  // Evaluate incremental synergy delta with already selected cards
  const before = chosenSoFar.length > 0 ? evaluateTrioSynergy(chosenSoFar, ctx) : 0;
  const after = evaluateTrioSynergy([...chosenSoFar, card], ctx);
  score += (after - before) * 0.7;

  // Mild anti-repeat nudge for filler cards
  if (ctx.memory.lastBotCardIds.includes(card.id)) {
    score -= 4;
  }

  return score;
}

// ============================================================================
// Fast Lookahead Battle Simulator (Pure, Side-Effect Free)
// ============================================================================

/**
 * Lightweight heuristic choice inside nested simulations (prevents recursive blowup).
 */
function pickFastSimulatedSpell(
  hand: CardDefinition[],
  queue: BattleCard[],
  owner: 'player1' | 'player2'
): CardDefinition | undefined {
  const spells = hand.filter((c) => c.type === 'magic');
  if (spells.length === 0) return undefined;

  const enemies = queue.filter((c) => c.owner !== owner && !c.isDestroyed && !c.isEvacuated);
  const unprotectedEnemies = enemies.filter((c) => !c.protectedAgainst.includes('magic'));
  if (unprotectedEnemies.length === 0) return undefined;

  const hasEnemyTech = unprotectedEnemies.some((c) => c.card.type === 'technology');
  const hasEnemyTechR1 = unprotectedEnemies.some(
    (c) => c.card.type === 'technology' && c.currentRank === 1
  );
  const hasHighCreature = unprotectedEnemies.some(
    (c) => c.card.type === 'creature' && c.currentRank >= 7
  );
  const hasMidCreature = unprotectedEnemies.some(
    (c) => c.card.type === 'creature' && c.currentRank <= 6
  );

  let bestSpell: CardDefinition | undefined;
  let bestScore = 0;

  for (const spell of spells) {
    let s = 0;
    if (spell.id === 'plague') {
      const kills = unprotectedEnemies.filter((c) => c.card.type === 'creature').length;
      s = kills * 12 + (hasHighCreature ? 8 : 0);
    } else if (spell.id === 'natural_disaster') {
      const kills =
        unprotectedEnemies.filter((c) => c.card.type === 'creature' && c.currentRank <= 6).length +
        (hasEnemyTechR1 ? 1 : 0);
      s = kills * 11;
    } else if (spell.id === 'abnormal_lightning') {
      const kills = unprotectedEnemies.filter((c) => c.card.type === 'technology').length;
      s = kills * 14;
    } else if (spell.id === 'ball_lightning') {
      s = hasEnemyTech ? 12 : 0;
    } else if (spell.id === 'terrible_disease') {
      s = hasMidCreature || hasHighCreature ? 6 : 0;
    }
    if (s > bestScore) {
      bestScore = s;
      bestSpell = spell;
    }
  }
  return bestSpell;
}

function pickFastSimulatedColdCalc(
  hand: CardDefinition[],
  queue: BattleCard[],
  owner: 'player1' | 'player2'
): CardDefinition | undefined {
  const units = hand.filter(
    (c) => (c.type === 'creature' || c.type === 'technology') && c.id !== 'evacuation'
  );
  if (units.length === 0) return undefined;

  const enemies = queue.filter((c) => c.owner !== owner && !c.isDestroyed && !c.isEvacuated);
  const hasDemonOrWizard = enemies.some(
    (c) => c.card.id === 'demon' || c.card.id === 'old_wizard'
  );
  const hasIncorporeal = enemies.some((c) => c.card.type === 'incorporeal');
  const hasBigMagic = enemies.some(
    (c) => !c.hasActed && (c.card.id === 'plague' || c.card.id === 'natural_disaster' || c.card.id === 'abnormal_lightning')
  );
  const hasAntiTech = enemies.some(
    (c) =>
      !c.hasActed &&
      (c.card.id === 'hidden_virus' ||
        c.card.id === 'dark_sapper' ||
        c.card.id === 'ball_lightning' ||
        c.card.id === 'abnormal_lightning')
  );

  let best: CardDefinition | undefined;
  let bestScore = -999;

  for (const unit of units) {
    let s = unit.rank * 2 + (unit.type === 'technology' ? 8 : 0);
    if (unit.id === 'battle_church' && (hasDemonOrWizard || hasIncorporeal)) s += 26;
    if (unit.id === 'priest' && hasIncorporeal) s += 20;
    if (unit.id === 'war_robots') s += hasAntiTech ? -10 : 22;
    if (unit.id === 'war_machines') s += hasAntiTech ? -8 : 16;
    if ((unit.id === 'engineer' || unit.id === 'scientist') && hasBigMagic) s += 18;
    if (unit.id === 'seer') s -= 6;
    if (s > bestScore) {
      bestScore = s;
      best = unit;
    }
  }
  return best;
}

function pickFastSimulatedConjurer(
  availableSummons: CardDefinition[],
  queue: BattleCard[],
  owner: 'player1' | 'player2'
): CardDefinition | undefined {
  if (availableSummons.length <= 1) return availableSummons[0];
  const imp = availableSummons.find((c) => c.id === 'imp');
  const evilSpirit = availableSummons.find((c) => c.id === 'evil_spirit');
  if (!imp || !evilSpirit) return availableSummons[0];

  const enemies = queue.filter((c) => c.owner !== owner && !c.isDestroyed && !c.isEvacuated);
  const impThreatened = enemies.some(
    (c) =>
      !c.hasActed &&
      !c.isCancelled &&
      !c.isDisabled &&
      c.currentInitiative > imp.initiative &&
      (c.card.id === 'army' ||
        c.card.id === 'policeman' ||
        c.card.id === 'war_robots' ||
        c.card.id === 'war_machines' ||
        c.card.id === 'battle_church')
  );
  if (impThreatened) return evilSpirit;

  const hasRank3Enemy = enemies.some((c) => c.card.type === 'creature' && c.currentRank === 3);
  return hasRank3Enemy ? imp : evilSpirit;
}

function pickFastSimulatedEvacuate(
  queue: BattleCard[],
  owner: 'player1' | 'player2',
  sourceInstanceId: string
): CardDefinition | null {
  const allies = queue.filter(
    (c) =>
      c.owner === owner &&
      c.instanceId !== sourceInstanceId &&
      !c.isDestroyed &&
      !c.isEvacuated &&
      (c.card.type === 'creature' || c.card.type === 'technology')
  );
  if (allies.length === 0) return null;

  const unactedEnemies = queue.filter(
    (c) =>
      c.owner !== owner &&
      !c.isDestroyed &&
      !c.isEvacuated &&
      !c.hasActed &&
      !c.isCancelled &&
      !c.isDisabled
  );
  if (unactedEnemies.length === 0) return null;

  const actedAllies = allies.filter((c) => c.hasActed);
  if (actedAllies.length > 0) {
    actedAllies.sort((a, b) => b.currentRank - a.currentRank);
    return actedAllies[0].card;
  }
  return null;
}

function pickFastSimulatedRevive(
  discard: CardDefinition[],
  enemyHand: CardDefinition[]
): CardDefinition | undefined {
  const eligible = discard.filter(
    (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
  );
  if (eligible.length === 0) return undefined;
  const sorted = [...eligible].sort(
    (a, b) =>
      getCardStrategicValue(b, enemyHand) - getCardStrategicValue(a, enemyHand)
  );
  return sorted[0];
}

/**
 * Steps a battle queue from `startIndex` to completion and evaluates the net strategic delta
 * for `perspectiveOwner`.
 */
function runBattleSimulationFromIndex(
  startIndex: number,
  initialQueue: BattleCard[],
  initialP1: PlayerState,
  initialP2: PlayerState,
  perspectiveOwner: 'player1' | 'player2',
  firstStepOverrides?: {
    replacementCard?: CardDefinition;
    chosenReviveCard?: CardDefinition | null;
    chosenEvacuateCard?: CardDefinition | null;
    chosenSummonCard?: CardDefinition | null;
  },
  roundNumber = 1,
  maxRounds = DEFAULT_MAX_ROUNDS
): number {
  let queue: BattleCard[] = initialQueue.map((c) => ({
    ...c,
    protectedAgainst: [...c.protectedAgainst],
    protectionSources: c.protectionSources ? c.protectionSources.map((s) => ({ ...s })) : [],
    cancelSources: c.cancelSources ? c.cancelSources.map((s) => ({ ...s })) : [],
  }));

  let p1: PlayerState = {
    ...initialP1,
    hand: [...initialP1.hand],
    discard: [...initialP1.discard],
  };
  let p2: PlayerState = {
    ...initialP2,
    hand: [...initialP2.hand],
    discard: [...initialP2.discard],
  };

  // Capture initial total hand+field value so we can compute exact net swing
  const initialP1TotalCards = [
    ...p1.hand,
    ...queue.filter((c) => c.owner === 'player1' && !c.isDestroyed && !c.isEvacuated).map((c) => c.card),
  ];
  const initialP2TotalCards = [
    ...p2.hand,
    ...queue.filter((c) => c.owner === 'player2' && !c.isDestroyed && !c.isEvacuated).map((c) => c.card),
  ];

  const evalCards = (cards: CardDefinition[], oppCards: CardDefinition[]) =>
    cards.reduce((sum, c) => sum + getCardStrategicValue(c, oppCards, roundNumber, maxRounds), 0);

  const initialBotScore =
    perspectiveOwner === 'player1'
      ? evalCards(initialP1TotalCards, initialP2TotalCards)
      : evalCards(initialP2TotalCards, initialP1TotalCards);
  const initialEnemyScore =
    perspectiveOwner === 'player1'
      ? evalCards(initialP2TotalCards, initialP1TotalCards)
      : evalCards(initialP1TotalCards, initialP2TotalCards);

  let idx = startIndex;
  let endedEarly = false;
  let steps = 0;
  const MAX_SIM_STEPS = 24;

  while (!endedEarly && idx < queue.length && steps < MAX_SIM_STEPS) {
    steps += 1;
    const actor = queue[idx];
    if (!actor) break;

    let rep: CardDefinition | undefined;
    let rev: CardDefinition | null | undefined;
    let evac: CardDefinition | null | undefined;
    let sum: CardDefinition | null | undefined;

    if (steps === 1 && firstStepOverrides) {
      rep = firstStepOverrides.replacementCard;
      rev = firstStepOverrides.chosenReviveCard;
      evac = firstStepOverrides.chosenEvacuateCard;
      sum = firstStepOverrides.chosenSummonCard;
    } else if (!actor.isDestroyed && !actor.isDisabled && !actor.isCancelled && !actor.isEvacuated) {
      const ownerState = actor.owner === 'player1' ? p1 : p2;
      const oppState = actor.owner === 'player1' ? p2 : p1;

      if (actor.card.id === 'old_wizard') {
        rep = pickFastSimulatedSpell(ownerState.hand, queue, actor.owner);
      } else if (actor.card.id === 'cold_calculation') {
        rep = pickFastSimulatedColdCalc(ownerState.hand, queue, actor.owner);
      } else if (actor.card.id === 'necromancer') {
        rev = pickFastSimulatedRevive(ownerState.discard, oppState.hand) ?? null;
      } else if (actor.card.id === 'evacuation') {
        evac = pickFastSimulatedEvacuate(queue, actor.owner, actor.instanceId);
      } else if (actor.card.id === 'conjurer') {
        const opts = getAvailableSummonOptions(
          ['imp', 'evil_spirit'],
          actor.owner,
          queue,
          ownerState.discard
        );
        sum = pickFastSimulatedConjurer(opts, queue, actor.owner) ?? null;
      }
    }

    const res = executeCardTurn(idx, queue, p1, p2, rep, rev, evac, sum);
    queue = res.queue;
    p1 = { ...p1, hand: res.player1Hand, discard: res.player1Discard };
    p2 = { ...p2, hand: res.player2Hand, discard: res.player2Discard };
    endedEarly = res.battleEndedEarly;

    if (!res.queueReorderedStayAtIndex) {
      idx += 1;
    }
  }

  const finalRes = finalizeBattle(queue, p1, p2, endedEarly);
  const finalBotHand = perspectiveOwner === 'player1' ? finalRes.p1Hand : finalRes.p2Hand;
  const finalEnemyHand = perspectiveOwner === 'player1' ? finalRes.p2Hand : finalRes.p1Hand;

  const finalBotScore = evalCards(finalBotHand, finalEnemyHand);
  const finalEnemyScore = evalCards(finalEnemyHand, finalBotHand);

  const botDelta = finalBotScore - initialBotScore;
  const enemyLoss = initialEnemyScore - finalEnemyScore;

  // Massive bonus for winning immediately (emptying enemy hand) / huge penalty for losing
  let terminalBonus = 0;
  if (finalEnemyHand.length === 0 && finalBotHand.length > 0) terminalBonus += 120;
  if (finalBotHand.length === 0 && finalEnemyHand.length > 0) terminalBonus -= 140;

  return enemyLoss * 1.15 + botDelta + terminalBonus;
}

/**
 * Simulates a full round between a candidate bot trio and a plausible enemy trio.
 */
function simulateTrioMatchup(
  bot: PlayerState,
  enemy: PlayerState,
  botTrioIds: string[],
  enemyTrioIds: string[],
  roundNumber: number,
  maxRounds: number
): number {
  const botTrio = botTrioIds
    .map((id) => bot.hand.find((c) => c.id === id))
    .filter((c): c is CardDefinition => Boolean(c));
  const enemyTrio = enemyTrioIds
    .map((id) => enemy.hand.find((c) => c.id === id))
    .filter((c): c is CardDefinition => Boolean(c));

  const botRemainingHand = bot.hand.filter((c) => !botTrioIds.includes(c.id));
  const enemyRemainingHand = enemy.hand.filter((c) => !enemyTrioIds.includes(c.id));

  const botSimState: PlayerState = {
    ...bot,
    hand: botRemainingHand,
    discard: [...bot.discard],
  };
  const enemySimState: PlayerState = {
    ...enemy,
    hand: enemyRemainingHand,
    discard: [...enemy.discard],
  };

  // In App.tsx, player1 is human and player2 is bot, but support either owner cleanly
  const isBotP1 = bot.id === 'player1';
  const p1Cards = isBotP1 ? botTrio : enemyTrio;
  const p2Cards = isBotP1 ? enemyTrio : botTrio;
  const p1State = isBotP1 ? botSimState : enemySimState;
  const p2State = isBotP1 ? enemySimState : botSimState;

  const queue = initializeBattleQueue(p1Cards, p2Cards);
  return runBattleSimulationFromIndex(
    0,
    queue,
    p1State,
    p2State,
    bot.id,
    undefined,
    roundNumber,
    maxRounds
  );
}

// ============================================================================
// Plausible Enemy Trio Generator (100% Fair — Never Peeks at enemy.selectedCardIds)
// ============================================================================

function buildPlausibleEnemyTrios(ctx: BotDecisionContext): string[][] {
  const hand = ctx.enemy.hand;
  const pickCount = Math.min(3, hand.length);
  if (pickCount === 0) return [];
  if (hand.length <= 3) return [hand.map((c) => c.id)];

  const trios: string[][] = [];
  const seen = new Set<string>();
  const addTrio = (ids: string[]) => {
    if (ids.length !== pickCount) return;
    const key = [...ids].sort().join('|');
    if (!seen.has(key)) {
      seen.add(key);
      trios.push(ids);
    }
  };

  // 1. Player's most recently played trio (if still in hand) — models repeat habits
  if (ctx.memory.enemyRecentRounds.length > 0) {
    const lastRound = ctx.memory.enemyRecentRounds[ctx.memory.enemyRecentRounds.length - 1];
    const availableLast = lastRound.filter((id) => ctx.enemyHandIds.has(id));
    if (availableLast.length === pickCount) {
      addTrio(availableLast);
    }
  }

  // 2. Player's historically most-played cards (from past battles)
  const byHistory = [...hand].sort((a, b) => {
    const freqDiff =
      (ctx.memory.enemyPlayedCounts[b.id] ?? 0) - (ctx.memory.enemyPlayedCounts[a.id] ?? 0);
    if (freqDiff !== 0) return freqDiff;
    return getCardStrategicValue(b, ctx.bot.hand) - getCardStrategicValue(a, ctx.bot.hand);
  });
  addTrio(byHistory.slice(0, pickCount).map((c) => c.id));

  // 3. Enemy's highest-value power trio
  const byValue = [...hand].sort(
    (a, b) =>
      getCardStrategicValue(b, ctx.bot.hand, ctx.roundNumber, ctx.maxRounds) -
      getCardStrategicValue(a, ctx.bot.hand, ctx.roundNumber, ctx.maxRounds)
  );
  addTrio(byValue.slice(0, pickCount).map((c) => c.id));

  // 4. Enemy's fastest initiative trio (tempo rush)
  const bySpeed = [...hand].sort((a, b) => b.initiative - a.initiative);
  addTrio(bySpeed.slice(0, pickCount).map((c) => c.id));

  // 5. Enemy's faction-typical counter schemes (using our own scheme definitions for the enemy side!)
  const enemySchemes = getSchemesForSide(ctx.enemy.side);
  for (const scheme of enemySchemes) {
    if (trios.length >= 6) break;
    const built: string[] = [];
    for (const slot of scheme.slots) {
      const found = slot.find((id) => ctx.enemyHandIds.has(id) && !built.includes(id));
      if (found) built.push(found);
    }
    if (built.length === pickCount) {
      addTrio(built);
    }
  }

  // 6. Ensure at least 5 diverse sample trios by sampling weighted random hands
  let attempts = 0;
  while (trios.length < 5 && attempts < 12) {
    attempts += 1;
    const pool = [...hand];
    const chosen: string[] = [];
    while (chosen.length < pickCount && pool.length > 0) {
      const idx = Math.floor(Math.random() * pool.length);
      chosen.push(pool[idx].id);
      pool.splice(idx, 1);
    }
    addTrio(chosen);
  }

  return trios.slice(0, 6);
}

// ============================================================================
// Candidate Trio Construction (Schemes + Variations + Partial-Deck Combinations)
// ============================================================================

function isSituationallyUsableInSlot(
  cardId: string,
  chosenIds: Set<string>,
  ctx: BotDecisionContext
): boolean {
  if (cardId === 'necromancer' && ctx.botRevivableCount === 0) return false;
  if (cardId === 'conjurer') {
    const canSummon =
      (!ctx.botDiscardIds.has('imp') && !ctx.botHandIds.has('imp')) ||
      (!ctx.botDiscardIds.has('evil_spirit') && !ctx.botHandIds.has('evil_spirit'));
    if (!canSummon) return false;
  }
  if (cardId === 'old_wizard') {
    const remainingSpells = ctx.bot.hand.filter(
      (c) => c.type === 'magic' && !chosenIds.has(c.id)
    ).length;
    if (remainingSpells === 0) return false;
  }
  if (cardId === 'hidden_virus' && !ctx.enemyHandIds.has('war_robots')) return false;
  if (
    (cardId === 'abnormal_lightning' || cardId === 'ball_lightning' || cardId === 'dark_sapper') &&
    ctx.enemyTechCount === 0
  ) {
    return false;
  }
  if ((cardId === 'prayer' || cardId === 'priest') && ctx.enemyIncorporealCount === 0) {
    return false;
  }
  return true;
}

function buildTrioFromScheme(
  scheme: TacticalScheme,
  ctx: BotDecisionContext,
  useVariantSlotOrder: boolean
): { cardIds: string[]; matchedSlots: number } | null {
  const chosenCards: CardDefinition[] = [];
  const chosenIds = new Set<string>();
  let matchedSlots = 0;

  for (const slotCandidates of scheme.slots) {
    const available = slotCandidates
      .filter(
        (id) =>
          ctx.botHandIds.has(id) &&
          !chosenIds.has(id) &&
          isSituationallyUsableInSlot(id, chosenIds, ctx)
      )
      .map((id) => ctx.bot.hand.find((c) => c.id === id)!)
      .filter(Boolean);

    if (available.length === 0) continue;

    // Pick top slot candidate, or 2nd candidate on variant pass to keep even the same scheme fresh!
    let picked = available[0];
    if (useVariantSlotOrder && available.length >= 2) {
      // Prefer a candidate that wasn't just played last round
      const freshAlt = available.slice(1).find((c) => !ctx.memory.lastBotCardIds.includes(c.id));
      picked = freshAlt ?? available[1];
    } else if (
      available.length >= 2 &&
      ctx.memory.lastBotCardIds.includes(available[0].id) &&
      !ctx.memory.lastBotCardIds.includes(available[1].id) &&
      Math.random() < 0.5
    ) {
      picked = available[1];
    }

    chosenCards.push(picked);
    chosenIds.add(picked.id);
    matchedSlots += 1;
  }

  if (matchedSlots < scheme.minMatchedSlots) {
    return null;
  }

  // Fill remaining slots (common in partial campaign decks or depleted hands) using synergy-aware filler
  const targetSize = Math.min(3, ctx.bot.hand.length);
  while (chosenCards.length < targetSize) {
    const remaining = ctx.bot.hand.filter((c) => !chosenIds.has(c.id));
    if (remaining.length === 0) break;
    remaining.sort(
      (a, b) => scoreFillerCard(b, chosenCards, ctx) - scoreFillerCard(a, chosenCards, ctx)
    );
    chosenCards.push(remaining[0]);
    chosenIds.add(remaining[0].id);
  }

  if (chosenCards.length < targetSize) return null;

  return {
    cardIds: chosenCards.map((c) => c.id),
    matchedSlots,
  };
}

function generateSmallHandCombinations(hand: CardDefinition[]): CardDefinition[][] {
  const combos: CardDefinition[][] = [];
  const n = hand.length;
  for (let i = 0; i < n; i += 1) {
    for (let j = i + 1; j < n; j += 1) {
      for (let k = j + 1; k < n; k += 1) {
        combos.push([hand[i], hand[j], hand[k]]);
      }
    }
  }
  return combos;
}

// ============================================================================
// Main Bot Card Selection Entry Point
// ============================================================================

export function selectBotDecision(
  bot: PlayerState,
  enemy: PlayerState,
  options?: BotSelectionOptions
): BotSelectionDecision {
  const hand = bot.hand;
  if (hand.length === 0) {
    return { cardIds: [] };
  }

  // 1. Respect scripted opening moves (e.g., Campaign Stage 1 Round 1)
  if (options?.forcedCardIds && options.forcedCardIds.length > 0) {
    const handIds = new Set(hand.map((c) => c.id));
    const availableForced = options.forcedCardIds.filter((id) => handIds.has(id));
    const needed = Math.min(3, hand.length);
    if (availableForced.length >= needed) {
      return {
        cardIds: availableForced.slice(0, needed),
        schemeId: 'scripted_opener',
      };
    }
  }

  // 2. If 3 or fewer cards remain, must play all of them
  if (hand.length <= 3) {
    return {
      cardIds: hand.map((c) => c.id),
      schemeId: 'all_in',
    };
  }

  const ctx = buildContext(bot, enemy, options);
  const schemes = getSchemesForSide(bot.side);
  const preferredSet = new Set(options?.preferredSchemes ?? []);

  // Build candidate trios from all viable schemes (primary + 1 variant per scheme)
  const candidateMap = new Map<string, CandidateTrio>();

  const registerCandidate = (
    cardIds: string[],
    schemeId: string,
    schemeScore: number
  ) => {
    const key = [...cardIds].sort().join('|');
    const cards = cardIds
      .map((id) => hand.find((c) => c.id === id))
      .filter((c): c is CardDefinition => Boolean(c));
    if (cards.length !== 3) return;

    const synergyScore = evaluateTrioSynergy(cards, ctx);
    const existing = candidateMap.get(key);
    if (!existing || schemeScore > existing.schemeScore) {
      candidateMap.set(key, {
        cardIds,
        schemeId,
        schemeScore,
        synergyScore,
        simScore: 0,
        totalScore: 0,
      });
    }
  };

  for (const scheme of schemes) {
    const baseEval = scheme.evaluate(ctx);
    if (baseEval <= -50) continue;

    const primary = buildTrioFromScheme(scheme, ctx, false);
    if (primary) {
      const slotCompletenessBonus = primary.matchedSlots === 3 ? 6 : 0;
      registerCandidate(primary.cardIds, scheme.id, baseEval + slotCompletenessBonus);
    }

    const variant = buildTrioFromScheme(scheme, ctx, true);
    if (variant) {
      const slotCompletenessBonus = variant.matchedSlots === 3 ? 4 : -2;
      registerCandidate(variant.cardIds, scheme.id, baseEval + slotCompletenessBonus);
    }
  }

  // For partial decks (Campaign Stages 1-3) or mid/late depleted hands (<= 7 cards),
  // also inspect all synergy-sound 3-card combos so the bot is never restricted on small pools!
  if (hand.length <= 7 || candidateMap.size < 4) {
    const combos =
      hand.length <= 7
        ? generateSmallHandCombinations(hand)
        : generateSmallHandCombinations(
            [...hand]
              .sort(
                (a, b) =>
                  getCardStrategicValue(b, enemy.hand, ctx.roundNumber, ctx.maxRounds) -
                  getCardStrategicValue(a, enemy.hand, ctx.roundNumber, ctx.maxRounds)
              )
              .slice(0, 7)
          );

    const scoredCombos = combos
      .map((combo) => {
        const syn = evaluateTrioSynergy(combo, ctx);
        const rawVal = combo.reduce(
          (sum, c) => sum + getCardStrategicValue(c, enemy.hand, ctx.roundNumber, ctx.maxRounds),
          0
        );
        return { combo, preScore: rawVal + syn };
      })
      .sort((a, b) => b.preScore - a.preScore)
      .slice(0, 8);

    for (const item of scoredCombos) {
      registerCandidate(
        item.combo.map((c) => c.id),
        'adaptive_combo',
        56
      );
    }
  }

  const candidates = Array.from(candidateMap.values());
  if (candidates.length === 0) {
    // Ultimate safety fallback
    const top3 = [...hand]
      .sort((a, b) => getCardStrategicValue(b, enemy.hand) - getCardStrategicValue(a, enemy.hand))
      .slice(0, 3)
      .map((c) => c.id);
    return { cardIds: top3, schemeId: 'fallback' };
  }

  // Build plausible enemy trios and run fast lookahead battle simulations
  const enemyTrios = buildPlausibleEnemyTrios(ctx);

  // Limit lookahead pool to top 10 pre-ranked candidates for guaranteed <2ms latency
  candidates.sort(
    (a, b) => b.schemeScore + b.synergyScore - (a.schemeScore + a.synergyScore)
  );
  const finalists = candidates.slice(0, 10);

  const smallHandFactor = hand.length <= 5 ? 0.45 : hand.length <= 7 ? 0.7 : 1.0;

  for (const cand of finalists) {
    let simTotal = 0;
    if (enemyTrios.length > 0) {
      for (const eTrio of enemyTrios) {
        simTotal += simulateTrioMatchup(
          bot,
          enemy,
          cand.cardIds,
          eTrio,
          ctx.roundNumber,
          ctx.maxRounds
        );
      }
      cand.simScore = simTotal / enemyTrios.length;
    }

    // Soft preference bonus for thematic campaign stages (never overrides strong tactics)
    const campaignBonus = preferredSet.has(cand.schemeId) ? 7 : 0;

    // Anti-repetition penalties so the bot rotates schemes and avoids A-B-A-B loops
    let repeatPenalty = 0;
    if (cand.schemeId !== 'adaptive_combo') {
      if (ctx.memory.lastSchemeId === cand.schemeId) {
        repeatPenalty += 22 * smallHandFactor;
      } else if (ctx.memory.recentSchemeIds.includes(cand.schemeId)) {
        repeatPenalty += 14 * smallHandFactor;
      }
    }

    const overlapCount = cand.cardIds.filter((id) =>
      ctx.memory.lastBotCardIds.includes(id)
    ).length;
    repeatPenalty += overlapCount * 6.5 * smallHandFactor;
    if (overlapCount === 3) {
      repeatPenalty += 10 * smallHandFactor; // Extra deterrent against exact 3/3 replay
    }

    cand.totalScore =
      cand.schemeScore * 0.45 +
      cand.simScore * 1.2 +
      cand.synergyScore * 0.45 +
      campaignBonus -
      repeatPenalty;
  }

  // Sort descending and pick via temperature-scaled softmax over top viable schemes
  finalists.sort((a, b) => b.totalScore - a.totalScore);
  const bestScore = finalists[0].totalScore;
  const isEndgame = ctx.roundNumber >= ctx.maxRounds - 1 || hand.length <= 4;
  const scoreWindow = isEndgame ? 11 : 21;
  const temperature = isEndgame ? 5.0 : 9.5;

  const topPool = finalists
    .filter((c) => bestScore - c.totalScore <= scoreWindow)
    .slice(0, 5);

  const weights = topPool.map((c) => Math.exp((c.totalScore - bestScore) / temperature));
  const weightSum = weights.reduce((s, w) => s + w, 0);

  let roll = Math.random() * weightSum;
  let selected = topPool[0];
  for (let i = 0; i < topPool.length; i += 1) {
    roll -= weights[i];
    if (roll <= 0) {
      selected = topPool[i];
      break;
    }
  }

  return {
    cardIds: selected.cardIds,
    schemeId: selected.schemeId,
  };
}

/**
 * Backwards-compatible wrapper returning only the chosen card IDs.
 */
export function selectBotCards(
  bot: PlayerState,
  enemy: PlayerState,
  forcedCardIds?: string[],
  options?: Omit<BotSelectionOptions, 'forcedCardIds'>
): string[] {
  return selectBotDecision(bot, enemy, {
    ...options,
    forcedCardIds,
  }).cardIds;
}

// ============================================================================
// Live Battlefield Micro-AI (Exact Forward Simulation on Revealed Board!)
// ============================================================================

function buildSimulationPlayers(
  botOwner: 'player1' | 'player2',
  botState?: PlayerState,
  enemyState?: PlayerState,
  fallbackBotHand: CardDefinition[] = []
): { p1: PlayerState; p2: PlayerState } {
  const safeBot: PlayerState = botState ?? {
    id: botOwner,
    name: 'Bot',
    side: fallbackBotHand[0]?.side ?? 'dark_side',
    isBot: true,
    hand: fallbackBotHand,
    discard: [],
    selectedCardIds: [],
  };
  const safeEnemy: PlayerState = enemyState ?? {
    id: botOwner === 'player1' ? 'player2' : 'player1',
    name: 'Enemy',
    side: safeBot.side === 'dark_side' ? 'resistance' : 'dark_side',
    isBot: false,
    hand: [],
    discard: [],
    selectedCardIds: [],
  };
  return botOwner === 'player1'
    ? { p1: safeBot, p2: safeEnemy }
    : { p1: safeEnemy, p2: safeBot };
}

/**
 * General fallback replacement selector
 */
export function selectBotReplacementCard(botHand: CardDefinition[]): CardDefinition | undefined {
  if (botHand.length === 0) return undefined;
  const sorted = [...botHand].sort(
    (a, b) => b.rank + b.initiative / 50 - (a.rank + a.initiative / 50)
  );
  return sorted[0];
}

/**
 * Old Wizard (Старый колдун): simulates every spell in hand against the live battlefield
 * and picks the spell with the strongest battle swing — or keeps spells in hand if all are wasted.
 */
export function selectBotSpellCard(
  botHand: CardDefinition[],
  queue?: BattleCard[],
  currentCard?: BattleCard,
  botState?: PlayerState,
  enemyState?: PlayerState
): CardDefinition | undefined {
  const spells = botHand.filter((c) => c.type === 'magic');
  if (spells.length === 0) return undefined;

  if (!queue || !currentCard) {
    const sorted = [...spells].sort(
      (a, b) => b.rank + b.initiative / 50 - (a.rank + a.initiative / 50)
    );
    return sorted[0];
  }

  const currentIdx = queue.findIndex((c) => c.instanceId === currentCard.instanceId);
  if (currentIdx === -1) return spells[0];

  const { p1, p2 } = buildSimulationPlayers(currentCard.owner, botState, enemyState, botHand);

  // Baseline: do NOT swap (save spells in hand)
  const skipScore = runBattleSimulationFromIndex(
    currentIdx,
    queue,
    p1,
    p2,
    currentCard.owner,
    { replacementCard: undefined }
  );

  let bestSpell: CardDefinition | undefined = undefined;
  let bestScore = skipScore + 1.5; // Require genuine advantage over skipping to burn a single-use spell

  for (const spell of spells) {
    const score = runBattleSimulationFromIndex(
      currentIdx,
      queue,
      p1,
      p2,
      currentCard.owner,
      { replacementCard: spell }
    );
    if (score > bestScore) {
      bestScore = score;
      bestSpell = spell;
    }
  }

  return bestSpell;
}

/**
 * Cold Calculation (Холодный расчёт): simulates every creature/technology in hand
 * entering the revealed battlefield at init 169 and picks the highest-impact counter (or skips).
 */
export function selectBotColdCalculationCard(
  botHand: CardDefinition[],
  queue?: BattleCard[],
  currentCard?: BattleCard,
  botState?: PlayerState,
  enemyState?: PlayerState
): CardDefinition | undefined {
  const eligible = botHand.filter(
    (c) => c.type === 'creature' || c.type === 'technology'
  );
  if (eligible.length === 0) return undefined;

  if (!queue || !currentCard) {
    const pool = eligible.filter((c) => c.id !== 'evacuation' && c.id !== 'medic');
    const finalPool = pool.length > 0 ? pool : eligible;
    const sorted = [...finalPool].sort((a, b) => {
      const scoreA =
        a.rank * 3 +
        (a.type === 'technology' ? 14 : 0) +
        (a.id === 'war_robots' || a.id === 'battle_church' || a.id === 'army' ? 10 : 0) +
        a.initiative / 80;
      const scoreB =
        b.rank * 3 +
        (b.type === 'technology' ? 14 : 0) +
        (b.id === 'war_robots' || b.id === 'battle_church' || b.id === 'army' ? 10 : 0) +
        b.initiative / 80;
      return scoreB - scoreA;
    });
    return sorted[0];
  }

  const currentIdx = queue.findIndex((c) => c.instanceId === currentCard.instanceId);
  if (currentIdx === -1) return eligible[0];

  const { p1, p2 } = buildSimulationPlayers(currentCard.owner, botState, enemyState, botHand);

  // Baseline: Cold Calculation does nothing (still consumed as single-use, but avoids risking a unit)
  const skipScore = runBattleSimulationFromIndex(
    currentIdx,
    queue,
    p1,
    p2,
    currentCard.owner,
    { replacementCard: undefined }
  );

  let bestUnit: CardDefinition | undefined = undefined;
  let bestScore = skipScore;

  for (const unit of eligible) {
    const score = runBattleSimulationFromIndex(
      currentIdx,
      queue,
      p1,
      p2,
      currentCard.owner,
      { replacementCard: unit }
    );
    if (score > bestScore) {
      bestScore = score;
      bestUnit = unit;
    }
  }

  return bestUnit;
}

/**
 * Conjurer (Заклинатель): simulates Imp vs Evil Spirit on the live battlefield
 * to maximize enemy kills while keeping the summon alive to join hand.
 */
export function selectBotConjurerSummon(
  availableSummons: CardDefinition[],
  queue: BattleCard[],
  botOwner: 'player1' | 'player2',
  botState?: PlayerState,
  enemyState?: PlayerState
): CardDefinition | undefined {
  if (availableSummons.length === 0) return undefined;
  if (availableSummons.length === 1) return availableSummons[0];

  const conjurerIdx = queue.findIndex(
    (c) =>
      c.owner === botOwner &&
      c.card.id === 'conjurer' &&
      !c.hasActed &&
      !c.isDestroyed &&
      !c.isEvacuated
  );

  if (conjurerIdx !== -1) {
    const { p1, p2 } = buildSimulationPlayers(botOwner, botState, enemyState);
    let bestSummon = availableSummons[0];
    let bestScore = -Infinity;

    for (const summon of availableSummons) {
      const score = runBattleSimulationFromIndex(
        conjurerIdx,
        queue,
        p1,
        p2,
        botOwner,
        { chosenSummonCard: summon }
      );
      if (score > bestScore) {
        bestScore = score;
        bestSummon = summon;
      }
    }
    return bestSummon;
  }

  return pickFastSimulatedConjurer(availableSummons, queue, botOwner);
}

/**
 * Necromancer (Некромант): revives the creature (rank <= 6) from discard that best counters
 * the opponent's remaining hand (rather than blindly sorting by rank).
 */
export function selectBotReviveCard(
  botDiscard: CardDefinition[],
  botHand: CardDefinition[] = [],
  enemyState?: PlayerState
): CardDefinition | undefined {
  const eligible = botDiscard.filter(
    (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
  );
  if (eligible.length === 0) return undefined;

  const enemyHand = enemyState?.hand ?? [];
  const enemyHasTech = enemyHand.some((c) => c.type === 'technology');
  const enemyHasWarRobots = enemyHand.some((c) => c.id === 'war_robots');
  const enemyHasFastKey = enemyHand.some(
    (c) => c.id === 'sniper' || c.id === 'engineer' || c.id === 'priest' || c.id === 'battle_church'
  );
  const botHasSpells = botHand.some((c) => c.type === 'magic');
  const summonsAvailable =
    !botDiscard.some((c) => c.id === 'imp') || !botDiscard.some((c) => c.id === 'evil_spirit');

  const scored = eligible.map((card) => {
    let score = getCardStrategicValue(card, enemyHand);
    if (card.id === 'dark_sapper' && enemyHasTech) score += enemyHasWarRobots ? 12 : 8;
    if (card.id === 'vampire' && enemyHand.some((c) => c.type === 'creature' && c.rank <= 6)) {
      score += 8;
    }
    if (card.id === 'parasite' && enemyHasFastKey) score += 7;
    if (card.id === 'old_wizard' && !botHasSpells) score -= 12;
    if (card.id === 'conjurer' && !summonsAvailable) score -= 14;
    return { card, score };
  });

  scored.sort((a, b) => b.score - a.score);
  return scored[0].card;
}

/**
 * Evacuation (Эвакуация): simulates evacuating each allied unit vs doing nothing.
 * Saves allies threatened by unacted enemy sweepers (whether already acted or about to die before acting)
 * and skips when no ally is in real danger!
 */
export function selectBotEvacuateCard(
  queue: BattleCard[],
  botOwner: 'player1' | 'player2',
  sourceInstanceId?: string,
  botState?: PlayerState,
  enemyState?: PlayerState
): CardDefinition | undefined {
  const alliedTargets = queue.filter(
    (c) =>
      c.owner === botOwner &&
      !c.isDestroyed &&
      !c.isEvacuated &&
      c.card.id !== 'evacuation' &&
      c.instanceId !== sourceInstanceId &&
      (c.card.type === 'creature' || c.card.type === 'technology')
  );
  if (alliedTargets.length === 0) return undefined;

  const evacIdx = queue.findIndex((c) =>
    sourceInstanceId
      ? c.instanceId === sourceInstanceId
      : c.owner === botOwner && c.card.id === 'evacuation' && !c.hasActed
  );

  if (evacIdx !== -1) {
    const { p1, p2 } = buildSimulationPlayers(botOwner, botState, enemyState);
    const skipScore = runBattleSimulationFromIndex(
      evacIdx,
      queue,
      p1,
      p2,
      botOwner,
      { chosenEvacuateCard: null }
    );

    let bestTarget: CardDefinition | undefined = undefined;
    // Slight preference for skipping if outcome is identical (avoid pointless evacuations)
    let bestScore = skipScore + 0.5;

    for (const ally of alliedTargets) {
      const score = runBattleSimulationFromIndex(
        evacIdx,
        queue,
        p1,
        p2,
        botOwner,
        { chosenEvacuateCard: ally.card }
      );
      if (score > bestScore) {
        bestScore = score;
        bestTarget = ally.card;
      }
    }

    return bestTarget;
  }

  // Fallback if index not found
  const actedAllies = alliedTargets.filter((c) => c.hasActed);
  if (actedAllies.length > 0) {
    actedAllies.sort((a, b) => b.currentRank - a.currentRank);
    return actedAllies[0].card;
  }
  return undefined;
}
