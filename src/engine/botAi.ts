import { BattleCard, CardDefinition, PlayerState } from '../types/game';

/**
 * Intelligent Bot card selector for Dark Side or Resistance
 */
export function selectBotCards(
  bot: PlayerState,
  enemy: PlayerState,
  forcedCardIds?: string[]
): string[] {
  const hand = bot.hand;
  if (hand.length === 0) return [];

  // Respect scripted opening moves (e.g., Campaign Level 1 Round 1)
  if (forcedCardIds && forcedCardIds.length > 0) {
    const handIds = new Set(hand.map((c) => c.id));
    const availableForced = forcedCardIds.filter((id) => handIds.has(id));
    if (availableForced.length >= Math.min(3, hand.length)) {
      return availableForced.slice(0, Math.min(3, hand.length));
    }
  }

  // If 3 or fewer cards, must select all available
  if (hand.length <= 3) {
    return hand.map((c) => c.id);
  }

  // Score each card based on game state
  const scores = hand.map((card) => {
    let score = 50;

    // Initiative weighting (higher initiative acts faster, very valuable)
    score += (card.initiative / 300) * 20;

    // Rank weighting
    score += card.rank * 2;

    // Special card considerations:
    if (card.id === 'necromancer') {
      const hasRevivableCreature = bot.discard.some(
        (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
      );
      if (hasRevivableCreature) {
        score += 35; // Great value to revive
      } else {
        score -= 40; // Don't suicide if nothing to revive!
      }
    }

    if (card.id === 'old_wizard') {
      // If bot has fewer cards than enemy, rewind is a great comeback tool
      if (bot.hand.length < enemy.hand.length) {
        score += 30;
      } else {
        score -= 10;
      }
    }

    if (card.id === 'abnormal_lightning') {
      score += 25;
    }

    if (card.id === 'hidden_virus') {
      const enemyHasWarRobots = enemy.hand.some((c) => c.id === 'war_robots');
      if (enemyHasWarRobots) {
        score += 25;
      } else {
        score -= 35;
      }
    }

    if (card.id === 'evacuation') {
      score += 10;
    }

    if (card.id === 'rabid_dogs') {
      // High initiative, ignores protection, snipes human
      score += 30;
    }

    if (card.id === 'sniper' || card.id === 'battle_church') {
      // Anti-wizard and powerful destroyers
      score += 30;
    }

    if (card.id === 'engineer' || card.id === 'progressive_science') {
      // Powerful team shield
      score += 25;
    }

    if (card.id === 'plague' || card.id === 'natural_disaster' || card.id === 'army') {
      // Sweepers
      score += 20;
    }

    // Add small random jitter for variety
    score += (Math.random() - 0.5) * 8;

    return { card, score };
  });

  // Sort descending by score and pick top 3
  scores.sort((a, b) => b.score - a.score);
  return scores.slice(0, 3).map((item) => item.card.id);
}

/**
 * If Bot plays a card that triggers general replacement, pick best card from hand
 */
export function selectBotReplacementCard(botHand: CardDefinition[]): CardDefinition | undefined {
  if (botHand.length === 0) return undefined;
  // Pick highest initiative/rank card from hand
  const sorted = [...botHand].sort((a, b) => b.rank + b.initiative / 50 - (a.rank + a.initiative / 50));
  return sorted[0];
}

/**
 * If Bot plays Old Wizard, pick best spell from hand
 */
export function selectBotSpellCard(botHand: CardDefinition[]): CardDefinition | undefined {
  const spells = botHand.filter((c) => c.type === 'magic');
  if (spells.length === 0) return undefined;
  // Prioritize plague, disaster, lightning, disease
  const sorted = [...spells].sort((a, b) => b.rank + b.initiative / 50 - (a.rank + a.initiative / 50));
  return sorted[0];
}

/**
 * If Bot plays Necromancer, pick strongest creature (rank <= 6) from discard
 */
export function selectBotReviveCard(botDiscard: CardDefinition[]): CardDefinition | undefined {
  const eligible = botDiscard.filter(
    (c) => c.type === 'creature' && c.rank <= 6 && c.id !== 'necromancer'
  );
  if (eligible.length === 0) return undefined;
  const sorted = [...eligible].sort(
    (a, b) => b.rank + b.initiative / 100 - (a.rank + a.initiative / 100)
  );
  return sorted[0];
}

/**
 * If Bot plays Evacuation, evacuate an allied creature/tech that already acted (to protect it from later sweepers)
 * or is threatened by unacted enemy sweepers, otherwise do nothing
 */
export function selectBotEvacuateCard(
  queue: BattleCard[],
  botOwner: 'player1' | 'player2'
): CardDefinition | undefined {
  const alliedTargets = queue.filter(
    (c) =>
      c.owner === botOwner &&
      !c.isDestroyed &&
      !c.isEvacuated &&
      c.card.id !== 'evacuation' &&
      (c.card.type === 'creature' || c.card.type === 'technology')
  );
  if (alliedTargets.length === 0) return undefined;

  const actedAllies = alliedTargets.filter((c) => c.hasActed);
  if (actedAllies.length > 0) {
    actedAllies.sort((a, b) => b.currentRank - a.currentRank);
    return actedAllies[0].card;
  }

  return undefined;
}
