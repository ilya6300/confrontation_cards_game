import {
  BattleCard,
  CardDefinition,
  CardEffect,
  CardType,
  LogEntry,
  PlayerState,
  TargetFilter,
} from '../types/game';
import { getCardById } from '../data/cards';

let logCounter = 0;
export function createLogEntry(
  type: LogEntry['type'],
  message: string,
  source?: BattleCard,
  target?: BattleCard | CardDefinition
): LogEntry {
  logCounter += 1;
  return {
    id: `log-${Date.now()}-${logCounter}`,
    type,
    message,
    timestamp: Date.now(),
    sourceCard: source
      ? {
          name: source.card.name,
          side: source.card.side,
          type: source.card.type,
        }
      : undefined,
    targetCard: target
      ? 'card' in target
        ? {
            name: target.card.name,
            side: target.card.side,
            type: target.card.type,
          }
        : {
            name: target.name,
            side: target.side,
            type: target.type,
          }
      : undefined,
  };
}

/**
 * Check if a battle card matches the filter criteria
 */
export function matchesFilter(
  target: BattleCard,
  filter: TargetFilter,
  source: BattleCard
): boolean {
  // Already destroyed or evacuated cards cannot be targeted on the field
  if (target.isDestroyed || target.isEvacuated) {
    return false;
  }

  // Side filter
  if (filter.side === 'ally' && target.owner !== source.owner) return false;
  if (filter.side === 'enemy' && target.owner === source.owner) return false;
  if (filter.side === 'self' && target.instanceId !== source.instanceId) return false;

  // Type filter
  if (filter.types && filter.types.length > 0) {
    if (!filter.types.includes(target.card.type)) return false;
  }
  if (filter.excludeTypes && filter.excludeTypes.length > 0) {
    if (filter.excludeTypes.includes(target.card.type)) return false;
  }

  // Rank filters (using currentRank which can be modified during battle)
  if (filter.maxRank !== undefined && target.currentRank > filter.maxRank) {
    return false;
  }
  if (filter.minRank !== undefined && target.currentRank < filter.minRank) {
    return false;
  }
  if (filter.exactRank !== undefined && target.currentRank !== filter.exactRank) {
    return false;
  }

  // Card ID filters
  if (filter.cardIds && filter.cardIds.length > 0) {
    if (!filter.cardIds.includes(target.card.id)) return false;
  }
  if (filter.excludeCardIds && filter.excludeCardIds.length > 0) {
    if (filter.excludeCardIds.includes(target.card.id)) return false;
  }

  return true;
}

/**
 * Check if a card is protected from a threat
 */
export function isProtectedFromThreat(
  target: BattleCard,
  threatType: CardType,
  ignoreProtection = false
): boolean {
  if (ignoreProtection) {
    return false;
  }
  return target.protectedAgainst.includes(threatType);
}

export interface StepResolutionResult {
  queue: BattleCard[];
  logs: LogEntry[];
  battleEndedEarly: boolean;
  player1Hand: CardDefinition[];
  player1Discard: CardDefinition[];
  player2Hand: CardDefinition[];
  player2Discard: CardDefinition[];
  seerReplaced?: {
    replacedId: string;
    newCard: CardDefinition;
  };
}

/**
 * Execute a single card's turn in the initiative queue
 */
export function executeCardTurn(
  currentCardIndex: number,
  queue: BattleCard[],
  player1: PlayerState,
  player2: PlayerState,
  replacementCard?: CardDefinition, // If Seer / Artillerist / Old Wizard is being replaced
  chosenReviveCard?: CardDefinition | null, // If Necromancer is reviving a chosen creature (null = skip)
  chosenEvacuateCard?: CardDefinition | null // If Evacuation is returning a chosen card from battlefield to hand (null = skip)
): StepResolutionResult {
  const newQueue: BattleCard[] = queue.map((c) => ({
    ...c,
    protectedAgainst: [...c.protectedAgainst],
  }));

  const logs: LogEntry[] = [];
  let battleEndedEarly = false;
  const p1Hand = [...player1.hand];
  const p1Discard = [...player1.discard];
  const p2Hand = [...player2.hand];
  const p2Discard = [...player2.discard];
  let seerReplacedInfo: { replacedId: string; newCard: CardDefinition } | undefined;

  const current = newQueue[currentCardIndex];
  if (!current) {
    return {
      queue: newQueue,
      logs,
      battleEndedEarly: false,
      player1Hand: p1Hand,
      player1Discard: p1Discard,
      player2Hand: p2Hand,
      player2Discard: p2Discard,
    };
  }

  // 1. If destroyed or evacuated before turn, cannot act
  if (current.isDestroyed || current.isEvacuated) {
    logs.push(
      createLogEntry(
        'info',
        current.isEvacuated
          ? `Карта «${current.card.name}» эвакуирована с поля боя в руку и не участвует в дальнейшем бою.`
          : `Карта «${current.card.name}» уничтожена до своего хода и не может действовать.`,
        current
      )
    );
    current.hasActed = true;
    return {
      queue: newQueue,
      logs,
      battleEndedEarly: false,
      player1Hand: p1Hand,
      player1Discard: p1Discard,
      player2Hand: p2Hand,
      player2Discard: p2Discard,
    };
  }

  // 2. If disabled before turn, skips turn
  if (current.isDisabled) {
    logs.push(
      createLogEntry(
        'disable',
        `Карта «${current.card.name}» отключена и пропускает своё действие!`,
        current
      )
    );
    current.hasActed = true;
    return {
      queue: newQueue,
      logs,
      battleEndedEarly: false,
      player1Hand: p1Hand,
      player1Discard: p1Discard,
      player2Hand: p2Hand,
      player2Discard: p2Discard,
    };
  }

  // 2.5. If ability cancelled before turn (e.g. Demon or Old Wizard blocked by Battle Church / Sniper)
  if (current.isCancelled) {
    logs.push(
      createLogEntry(
        'cancel',
        `Способность карты «${current.card.name}» заблокирована и не срабатывает!`,
        current
      )
    );
    current.hasActed = true;
    return {
      queue: newQueue,
      logs,
      battleEndedEarly: false,
      player1Hand: p1Hand,
      player1Discard: p1Discard,
      player2Hand: p2Hand,
      player2Discard: p2Discard,
    };
  }

  // 3. Card activates
  logs.push(
    createLogEntry(
      'activate',
      `Ход карты «${current.card.name}» (Инициатива: ${current.currentInitiative}, Ранг: ${current.currentRank}).`,
      current
    )
  );

  // Execute each effect in order
  // If replacementCard was provided (e.g. Old Wizard swapped for a spell), execute that spell's effects instead of Wizard's!
  const effectsToRun =
    replacementCard && current.card.id === 'old_wizard'
      ? current.card.effects // applyEffect will handle the swap and then trigger new effects
      : current.card.effects;

  for (const effect of effectsToRun) {
    applyEffect(
      effect,
      current,
      newQueue,
      logs,
      p1Hand,
      p1Discard,
      p2Hand,
      p2Discard,
      replacementCard,
      (ended) => {
        battleEndedEarly = ended;
      },
      (rep) => {
        seerReplacedInfo = rep;
      },
      chosenReviveCard,
      chosenEvacuateCard
    );

    if (battleEndedEarly) {
      break;
    }
  }

  current.hasActed = true;

  return {
    queue: newQueue,
    logs,
    battleEndedEarly,
    player1Hand: p1Hand,
    player1Discard: p1Discard,
    player2Hand: p2Hand,
    player2Discard: p2Discard,
    seerReplaced: seerReplacedInfo,
  };
}

/**
 * Apply a specific effect of a card
 */
function applyEffect(
  effect: CardEffect,
  source: BattleCard,
  queue: BattleCard[],
  logs: LogEntry[],
  p1Hand: CardDefinition[],
  p1Discard: CardDefinition[],
  p2Hand: CardDefinition[],
  p2Discard: CardDefinition[],
  replacementCard: CardDefinition | undefined,
  setBattleEnded: (ended: boolean) => void,
  setSeerReplaced: (info: { replacedId: string; newCard: CardDefinition }) => void,
  chosenReviveCard?: CardDefinition | null,
  chosenEvacuateCard?: CardDefinition | null
) {
  switch (effect.action) {
    case 'cancel_ability': {
      // Prevents specific card (e.g. Demon, Old Wizard) from activating ability
      if (effect.cancelCardId) {
        let found = false;
        for (const target of queue) {
          if (target.card.id === effect.cancelCardId && !target.isDestroyed && !target.isEvacuated) {
            target.isCancelled = true;
            found = true;
            logs.push(
              createLogEntry(
                'cancel',
                `«${source.card.name}» блокирует способность карты «${target.card.name}»!`,
                source,
                target
              )
            );
          }
        }
        if (!found) {
          const targetCardDef = queue.find((c) => c.card.id === effect.cancelCardId)?.card;
          const targetName = targetCardDef ? targetCardDef.name : effect.cancelCardId === 'demon' ? 'Демона' : 'Старого колдуна';
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}» накладывает блокировку на ${targetName} (${targetName} нет на поле).`,
              source
            )
          );
        }
      }
      break;
    }

    case 'protect': {
      // Grants protection against specific threats (e.g. phenomenon, disease, virus)
      if (effect.target && effect.protectAgainst) {
        const targets = queue.filter((c) => matchesFilter(c, effect.target!, source));
        if (targets.length === 0) {
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}»: нет подходящих союзных карт для защиты.`,
              source
            )
          );
        } else {
          for (const target of targets) {
            for (const threat of effect.protectAgainst) {
              if (!target.protectedAgainst.includes(threat)) {
                target.protectedAgainst.push(threat);
              }
            }
            const threatNames = effect.protectAgainst.map(getThreatRuName).join(', ');
            logs.push(
              createLogEntry(
                'protect',
                `«${source.card.name}» накладывает защиту на «${target.card.name}» от: ${threatNames}.`,
                source,
                target
              )
            );
          }
        }
      }
      break;
    }

    case 'disable': {
      // Disables matching cards
      if (effect.target) {
        const targets = queue.filter((c) => matchesFilter(c, effect.target!, source));
        if (targets.length === 0) {
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}»: нет подходящих карт для отключения.`,
              source
            )
          );
        } else {
          for (const target of targets) {
            target.isDisabled = true;
            logs.push(
              createLogEntry(
                'disable',
                `«${source.card.name}» отключает карту «${target.card.name}»!`,
                source,
                target
              )
            );
          }
        }
      }
      break;
    }

    case 'reduce_rank': {
      // Reduces rank of matching cards
      if (effect.target && effect.amount) {
        const targets = queue.filter((c) => matchesFilter(c, effect.target!, source));
        if (targets.length === 0) {
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}»: нет подходящих карт для снижения ранга.`,
              source
            )
          );
        } else {
          for (const target of targets) {
            const oldRank = target.currentRank;
            target.currentRank = Math.max(0, target.currentRank - effect.amount);
            logs.push(
              createLogEntry(
                'reduce_rank',
                `«${source.card.name}» снижает ранг «${target.card.name}» с ${oldRank} до ${target.currentRank}.`,
                source,
                target
              )
            );
          }
        }
      }
      break;
    }

    case 'destroy': {
      if (effect.target) {
        let targets = queue.filter((c) => matchesFilter(c, effect.target!, source));

        // Limit & priority
        if (effect.target.priority === 'highest_rank') {
          targets = targets.sort((a, b) => b.currentRank - a.currentRank);
        }
        if (effect.target.limit !== undefined && targets.length > effect.target.limit) {
          targets = targets.slice(0, effect.target.limit);
        }

        if (targets.length === 0) {
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}»: нет целей, подходящих под условия уничтожения.`,
              source
            )
          );
        } else {
          for (const target of targets) {
            // Check protection from source type
            if (isProtectedFromThreat(target, source.card.type, effect.ignoreProtection)) {
              logs.push(
                createLogEntry(
                  'protect',
                  `«${target.card.name}» защищена от угрозы типа «${getThreatRuName(source.card.type)}» и не уничтожена!`,
                  source,
                  target
                )
              );
            } else {
              target.isDestroyed = true;
              const bonusNote = effect.ignoreProtection ? ' (игнорируя защиту)' : '';
              logs.push(
                createLogEntry(
                  'destroy',
                  `«${source.card.name}» уничтожает карту «${target.card.name}»${bonusNote}!`,
                  source,
                  target
                )
              );
            }
          }
        }
      }
      break;
    }

    case 'revive': {
      // Necromancer: only sacrifices himself if there is an eligible creature (rank <= 6) in discard to return to hand
      const discardPile = source.owner === 'player1' ? p1Discard : p2Discard;
      const handPile = source.owner === 'player1' ? p1Hand : p2Hand;
      const maxReviveRank = effect.reviveFilter?.maxRank ?? 6;

      if (chosenReviveCard === null) {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: отказ от жертвоприношения — карта остаётся на поле.`,
            source
          )
        );
        break;
      }

      // Find the chosen eligible creature (or first eligible if undefined)
      let eligibleIdx = -1;
      if (chosenReviveCard) {
        eligibleIdx = discardPile.findIndex(
          (c) =>
            c.id === chosenReviveCard.id &&
            c.type === 'creature' &&
            c.rank <= maxReviveRank &&
            c.id !== source.card.id
        );
      }
      if (eligibleIdx === -1 && chosenReviveCard === undefined) {
        eligibleIdx = discardPile.findIndex(
          (c) =>
            c.type === 'creature' &&
            c.rank <= maxReviveRank &&
            c.id !== source.card.id
        );
      }

      if (eligibleIdx !== -1) {
        if (effect.destroySelf) {
          source.isDestroyed = true;
          logs.push(
            createLogEntry(
              'destroy',
              `«${source.card.name}» приносит себя в жертву и отправляется в сброс!`,
              source,
              source
            )
          );
        }

        const [revivedCard] = discardPile.splice(eligibleIdx, 1);
        handPile.push(revivedCard);
        logs.push(
          createLogEntry(
            'revive',
            `«${source.card.name}» воскрешает существо «${revivedCard.name}» (ранг ${revivedCard.rank}) из сброса обратно в руку!`,
            source,
            revivedCard
          )
        );
      } else {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: в сбросе нет подходящих существ (ранг ≤ ${maxReviveRank}) — жертвоприношение отменено, карта остаётся в живых.`,
            source
          )
        );
      }
      break;
    }

    case 'evacuate': {
      // Evacuation: returns one allied creature or technology from battlefield to hand, or does nothing
      const handPile = source.owner === 'player1' ? p1Hand : p2Hand;
      const eligibleTargets = queue.filter(
        (c) =>
          c.instanceId !== source.instanceId &&
          !c.isDestroyed &&
          !c.isEvacuated &&
          (effect.target ? matchesFilter(c, effect.target, source) : true)
      );

      if (chosenEvacuateCard === null || eligibleTargets.length === 0) {
        logs.push(
          createLogEntry(
            'info',
            `Эвакуация спит - работа идёт!`,
            source
          )
        );
        break;
      }

      const targetCard = chosenEvacuateCard
        ? eligibleTargets.find((c) => c.card.id === chosenEvacuateCard.id)
        : undefined;

      if (targetCard) {
        targetCard.isEvacuated = true;
        handPile.push(targetCard.card);
        logs.push(
          createLogEntry(
            'revive',
            `«${source.card.name}» эвакуирует карту «${targetCard.card.name}» с поля боя обратно в руку!`,
            source,
            targetCard
          )
        );
      } else {
        logs.push(
          createLogEntry(
            'info',
            `Эвакуация спит - работа идёт!`,
            source
          )
        );
      }
      break;
    }

    case 'rewind': {
      // Old Wizard: returns all cards to hands and ends battle
      if (source.isCancelled) {
        logs.push(
          createLogEntry(
            'fail',
            `Способность «${source.card.name}» не сработала: магия заблокирована (Боевая церковь / Снайпер)!`,
            source
          )
        );
      } else {
        logs.push(
          createLogEntry(
            'rewind',
            `«${source.card.name}» обращает время вспять! Все карты с поля возвращаются в руки владельцев, бой завершён!`,
            source
          )
        );
        setBattleEnded(true);
      }
      break;
    }

    case 'reveal': {
      // Seer: reveals opponent's 2nd card (slot index 1)
      const enemyCards = queue.filter((c) => c.owner !== source.owner);
      if (enemyCards.length >= 2) {
        const secondCard = enemyCards[1];
        secondCard.revealed = true;
        logs.push(
          createLogEntry(
            'reveal',
            `«${source.card.name}» раскрывает 2-ю карту противника: «${secondCard.card.name}» (Ранг: ${secondCard.currentRank}, Инициатива: ${secondCard.currentInitiative})!`,
            source,
            secondCard
          )
        );
      } else if (enemyCards.length === 1) {
        enemyCards[0].revealed = true;
        logs.push(
          createLogEntry(
            'reveal',
            `«${source.card.name}» раскрывает карту противника: «${enemyCards[0].card.name}»!`,
            source,
            enemyCards[0]
          )
        );
      } else {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: у противника нет карт на поле для раскрытия.`,
            source
          )
        );
      }
      break;
    }

    case 'replace': {
      // Artillerist (transforms into hidden Artillery) or Old Wizard / Seer (swaps with card from hand)
      let activeReplacement = replacementCard;

      // If source is Artillerist (id: 'seer' or 'artillerist'), automatically fetch Artillery hidden spell
      if (!activeReplacement && (source.card.id === 'seer' || source.card.id === 'artillerist')) {
        activeReplacement = getCardById('artillery');
      }

      if (activeReplacement) {
        const hand = source.owner === 'player1' ? p1Hand : p2Hand;
        const repIdx = hand.findIndex((c) => c.id === activeReplacement!.id);

        if (repIdx !== -1) {
          // Normal swap from hand: remove chosen card from hand, return old card to hand
          hand.splice(repIdx, 1);
          hand.push(source.card);
        } else {
          // Summoned or hidden spell (e.g. Artillery summoned by Artillerist)
          // Artillerist is replaced by Artillery on the battlefield directly
        }

        // Transform source battle card into the replacement card
        const oldName = source.card.name;
        source.card = activeReplacement;
        source.currentRank = activeReplacement.rank;
        source.currentInitiative = activeReplacement.initiative;

        logs.push(
          createLogEntry(
            'replace',
            `«${oldName}» превращается в «${activeReplacement.name}» (Инициатива: ${activeReplacement.initiative}, Ранг: ${activeReplacement.rank})!`,
            source,
            activeReplacement
          )
        );

        setSeerReplaced({
          replacedId: source.instanceId,
          newCard: activeReplacement,
        });

        // Immediately execute the replacement card's effects!
        for (const newEffect of activeReplacement.effects) {
          applyEffect(
            newEffect,
            source,
            queue,
            logs,
            p1Hand,
            p1Discard,
            p2Hand,
            p2Discard,
            undefined,
            setBattleEnded,
            setSeerReplaced
          );
          if (source.isDestroyed) break;
        }
      } else {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}» остаётся на поле боя без замены.`,
            source
          )
        );
      }
      break;
    }
  }
}

function getThreatRuName(type: CardType): string {
  switch (type) {
    case 'technology':
      return 'Техника';
    case 'creature':
      return 'Существо';
    case 'incorporeal':
      return 'Бесплотное';
    case 'magic':
      return 'Заклинание';
    case 'virus':
      return 'Вирус';
  }
}

/**
 * Initialize battle cards from chosen player selections
 * and sort by initiative descending (with random tie-breaks)
 */
export function initializeBattleQueue(
  player1Cards: CardDefinition[],
  player2Cards: CardDefinition[]
): BattleCard[] {
  const queue: BattleCard[] = [];

  player1Cards.forEach((card, index) => {
    queue.push({
      instanceId: `p1-${card.id}-${index}-${Date.now()}`,
      slotIndex: index,
      card,
      owner: 'player1',
      currentRank: card.rank,
      currentInitiative: card.initiative,
      isDestroyed: false,
      isDisabled: false,
      isCancelled: false,
      protectedAgainst: [],
      hasActed: false,
      revealed: true,
    });
  });

  player2Cards.forEach((card, index) => {
    queue.push({
      instanceId: `p2-${card.id}-${index}-${Date.now()}`,
      slotIndex: index,
      card,
      owner: 'player2',
      currentRank: card.rank,
      currentInitiative: card.initiative,
      isDestroyed: false,
      isDisabled: false,
      isCancelled: false,
      protectedAgainst: [],
      hasActed: false,
      revealed: true,
    });
  });

  // Sort by initiative descending. If equal, randomized tie-break
  return queue.sort((a, b) => {
    if (b.currentInitiative !== a.currentInitiative) {
      return b.currentInitiative - a.currentInitiative;
    }
    return Math.random() - 0.5;
  });
}

/**
 * Finalize battle: return surviving cards to hand, send destroyed cards to discard
 */
export function finalizeBattle(
  queue: BattleCard[],
  player1: PlayerState,
  player2: PlayerState,
  rewoundEarly = false
): {
  p1Hand: CardDefinition[];
  p1Discard: CardDefinition[];
  p2Hand: CardDefinition[];
  p2Discard: CardDefinition[];
  survivors: CardDefinition[];
  destroyed: CardDefinition[];
  singleUseConsumed: CardDefinition[];
} {
  const p1Hand = [...player1.hand];
  const p1Discard = [...player1.discard];
  const p2Hand = [...player2.hand];
  const p2Discard = [...player2.discard];
  const survivors: CardDefinition[] = [];
  const destroyed: CardDefinition[] = [];
  const singleUseConsumed: CardDefinition[] = [];

  for (const bCard of queue) {
    if (bCard.isEvacuated) {
      // Already evacuated back to hand during battle
      continue;
    }
    if (bCard.isDestroyed) {
      destroyed.push(bCard.card);
      if (bCard.owner === 'player1') {
        p1Discard.push(bCard.card);
      } else {
        p2Discard.push(bCard.card);
      }
    } else {
      // If Old Wizard rewound time, all remaining cards on field return to hands
      if (rewoundEarly) {
        survivors.push(bCard.card);
        if (bCard.owner === 'player1') {
          p1Hand.push(bCard.card);
        } else {
          p2Hand.push(bCard.card);
        }
      } else if (bCard.card.isSingleUse) {
        // Single-use cards go to discard after battle
        singleUseConsumed.push(bCard.card);
        if (bCard.owner === 'player1') {
          p1Discard.push(bCard.card);
        } else {
          p2Discard.push(bCard.card);
        }
      } else {
        // Survived! Returns to hand
        survivors.push(bCard.card);
        if (bCard.owner === 'player1') {
          p1Hand.push(bCard.card);
        } else {
          p2Hand.push(bCard.card);
        }
      }
    }
  }

  return {
    p1Hand,
    p1Discard,
    p2Hand,
    p2Discard,
    survivors,
    destroyed,
    singleUseConsumed,
  };
}
