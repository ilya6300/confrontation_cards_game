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
  queueReorderedStayAtIndex?: boolean;
}

/**
 * Return available summonable cards from a card's summonCardIds pool.
 * Prevents duplicating a card that is already on the owner's battlefield
 * or already destroyed (in owner's discard).
 */
export function getAvailableSummonOptions(
  summonCardIds: string[],
  owner: 'player1' | 'player2',
  queue: BattleCard[],
  ownerDiscard: CardDefinition[]
): CardDefinition[] {
  const result: CardDefinition[] = [];
  for (const id of summonCardIds) {
    const cardDef = getCardById(id);
    if (!cardDef) continue;
    const alreadyOnField = queue.some(
      (c) => c.owner === owner && c.card.id === id
    );
    if (alreadyOnField) continue;
    const alreadyInDiscard = ownerDiscard.some((c) => c.id === id);
    if (alreadyInDiscard) continue;
    result.push(cardDef);
  }
  return result;
}

function sortTargetsByPriority(
  targets: BattleCard[],
  priority?: TargetFilter['priority']
): BattleCard[] {
  if (priority === 'highest_rank') {
    return [...targets].sort((a, b) => b.currentRank - a.currentRank);
  }
  if (priority === 'lowest_rank') {
    return [...targets].sort((a, b) => a.currentRank - b.currentRank);
  }
  if (priority === 'highest_initiative') {
    return [...targets].sort((a, b) => {
      if (b.currentInitiative !== a.currentInitiative) {
        return b.currentInitiative - a.currentInitiative;
      }
      return b.currentRank - a.currentRank;
    });
  }
  return targets;
}

/**
 * Execute a single card's turn in the initiative queue
 */
export function executeCardTurn(
  currentCardIndex: number,
  queue: BattleCard[],
  player1: PlayerState,
  player2: PlayerState,
  replacementCard?: CardDefinition, // If Seer / Artillerist / Old Wizard / Cold Calculation is being replaced
  chosenReviveCard?: CardDefinition | null, // If Necromancer is reviving a chosen creature (null = skip)
  chosenEvacuateCard?: CardDefinition | null, // If Evacuation is returning a chosen card from battlefield to hand (null = skip)
  chosenSummonCard?: CardDefinition | null // If Conjurer / Call Reserves is summoning a hidden card (null = skip)
): StepResolutionResult {
  const newQueue: BattleCard[] = queue.map((c) => ({
    ...c,
    protectedAgainst: [...c.protectedAgainst],
    protectionSources: c.protectionSources ? c.protectionSources.map((s) => ({ ...s })) : [],
    cancelSources: c.cancelSources ? c.cancelSources.map((s) => ({ ...s })) : [],
  }));

  const logs: LogEntry[] = [];
  let battleEndedEarly = false;
  let stayAtCurrentIndex = false;
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

  // 2.5. If ability cancelled before turn (e.g. Demon, Old Wizard, or Parasite target)
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

  const effectsToRun = current.card.effects;

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
      (stay) => {
        stayAtCurrentIndex = stay;
      },
      chosenReviveCard,
      chosenEvacuateCard,
      chosenSummonCard
    );

    if (battleEndedEarly || stayAtCurrentIndex) {
      break;
    }
  }

  if (!stayAtCurrentIndex) {
    current.hasActed = true;
  }

  return {
    queue: newQueue,
    logs,
    battleEndedEarly,
    player1Hand: p1Hand,
    player1Discard: p1Discard,
    player2Hand: p2Hand,
    player2Discard: p2Discard,
    seerReplaced: seerReplacedInfo,
    queueReorderedStayAtIndex: stayAtCurrentIndex,
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
  setStayAtCurrentIndex: (stay: boolean) => void,
  chosenReviveCard?: CardDefinition | null,
  chosenEvacuateCard?: CardDefinition | null,
  chosenSummonCard?: CardDefinition | null
) {
  switch (effect.action) {
    case 'cancel_ability': {
      // Prevents specific card (e.g. Demon, Old Wizard) or filtered target (e.g. Parasite -> highest initiative enemy creature)
      const sourceIsCreature = source.card.type === 'creature';
      const applyCancelToTarget = (target: BattleCard) => {
        if (!target.cancelSources) target.cancelSources = [];
        const alreadyRecorded = target.cancelSources.some(
          (s) => s.sourceInstanceId === source.instanceId
        );
        if (!alreadyRecorded) {
          target.cancelSources.push({
            sourceInstanceId: source.instanceId,
            sourceCardName: source.card.name,
            sourceIsCreature,
          });
        }
        target.isCancelled = true;
      };

      if (effect.cancelCardId) {
        let found = false;
        for (const target of queue) {
          if (target.card.id === effect.cancelCardId && !target.isDestroyed && !target.isEvacuated) {
            applyCancelToTarget(target);
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
      } else if (effect.target) {
        let targets = queue.filter((c) => matchesFilter(c, effect.target!, source));
        targets = sortTargetsByPriority(targets, effect.target.priority);
        if (effect.target.limit !== undefined && targets.length > effect.target.limit) {
          targets = targets.slice(0, effect.target.limit);
        }

        if (targets.length === 0) {
          logs.push(
            createLogEntry(
              'info',
              `«${source.card.name}»: на поле боя нет подходящих существ противника для блокировки.`,
              source
            )
          );
        } else {
          for (const target of targets) {
            if (isProtectedFromThreat(target, source.card.type, effect.ignoreProtection)) {
              logs.push(
                createLogEntry(
                  'protect',
                  `«${target.card.name}» защищена от угрозы типа «${getThreatRuName(source.card.type)}» и не заблокирована!`,
                  source,
                  target
                )
              );
            } else {
              applyCancelToTarget(target);
              logs.push(
                createLogEntry(
                  'cancel',
                  `«${source.card.name}» блокирует способность существа «${target.card.name}» (Инициатива: ${target.currentInitiative})!`,
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

    case 'protect': {
      // Grants protection against specific threats (e.g. magic)
      if (effect.target && effect.protectAgainst) {
        const sourceIsCreature = source.card.type === 'creature';
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
            if (!target.protectionSources) target.protectionSources = [];
            for (const threat of effect.protectAgainst) {
              const alreadyFromSource = target.protectionSources.some(
                (s) => s.threat === threat && s.sourceInstanceId === source.instanceId
              );
              if (!alreadyFromSource) {
                target.protectionSources.push({
                  threat,
                  sourceInstanceId: source.instanceId,
                  sourceCardName: source.card.name,
                  sourceIsCreature,
                });
              }
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
        targets = sortTargetsByPriority(targets, effect.target.priority);
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
              // If a creature maintaining protection or ability blocks dies, those effects expire immediately
              cleanupEffectsFromDeadCreature(target, queue, logs);
            }
          }
        }
      }
      break;
    }

    case 'revive': {
      // Necromancer: returns an eligible creature (rank <= 6) from discard to hand (surviving unless destroySelf is true)
      const discardPile = source.owner === 'player1' ? p1Discard : p2Discard;
      const handPile = source.owner === 'player1' ? p1Hand : p2Hand;
      const maxReviveRank = effect.reviveFilter?.maxRank ?? 6;

      if (chosenReviveCard === null) {
        logs.push(
          createLogEntry(
            'info',
            effect.destroySelf
              ? `«${source.card.name}»: отказ от жертвоприношения — карта остаётся на поле.`
              : `«${source.card.name}»: воскрешение отменено — карта остаётся на поле.`,
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
          cleanupEffectsFromDeadCreature(source, queue, logs);
        }

        const [revivedCard] = discardPile.splice(eligibleIdx, 1);
        handPile.push(revivedCard);
        logs.push(
          createLogEntry(
            'revive',
            effect.destroySelf
              ? `«${source.card.name}» воскрешает существо «${revivedCard.name}» (ранг ${revivedCard.rank}) из сброса обратно в руку!`
              : `«${source.card.name}» воскрешает существо «${revivedCard.name}» (ранг ${revivedCard.rank}) из сброса обратно в руку и остаётся в живых!`,
            source,
            revivedCard
          )
        );
      } else {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: в сбросе нет подходящих существ (ранг ≤ ${maxReviveRank}) — способность не срабатывает.`,
            source
          )
        );
      }
      break;
    }

    case 'reanimate_battle': {
      // Medic: reanimates a random allied creature destroyed during the current battle
      const deadAllies = queue.filter((c) => {
        if (!c.isDestroyed || c.isEvacuated) return false;
        if (c.instanceId === source.instanceId) return false;
        if (effect.target?.side === 'ally' && c.owner !== source.owner) return false;
        if (effect.target?.types && !effect.target.types.includes(c.card.type)) return false;
        return true;
      });

      if (deadAllies.length === 0) {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: в текущем бою нет уничтоженных союзных существ для реанимации.`,
            source
          )
        );
      } else {
        const chosen = deadAllies[Math.floor(Math.random() * deadAllies.length)];
        chosen.isDestroyed = false;
        logs.push(
          createLogEntry(
            'revive',
            `«${source.card.name}» реанимирует союзное существо «${chosen.card.name}» прямо на поле боя!`,
            source,
            chosen
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
      // Artillerist (transforms into hidden Artillery), Old Wizard (swaps with spell from hand),
      // or Cold Calculation (single-use spell swaps itself with creature/tech from hand)
      let activeReplacement = replacementCard;

      // If source is Artillerist (id: 'seer' or 'artillerist'), automatically fetch Artillery hidden spell
      if (!activeReplacement && (source.card.id === 'seer' || source.card.id === 'artillerist')) {
        activeReplacement = getCardById('artillery');
      }

      if (activeReplacement) {
        const hand = source.owner === 'player1' ? p1Hand : p2Hand;
        const discard = source.owner === 'player1' ? p1Discard : p2Discard;
        const repIdx = hand.findIndex((c) => c.id === activeReplacement!.id);
        const oldCard = source.card;

        if (repIdx !== -1) {
          // Swap from hand: remove chosen card from hand
          hand.splice(repIdx, 1);
          if (oldCard.isSingleUse) {
            // Single-use replacement spell (e.g. Cold Calculation) is consumed into discard
            discard.push(oldCard);
          } else {
            // Reusable creature (e.g. Old Wizard) returns to hand
            hand.push(oldCard);
          }
        }

        // Transform source battle card into the replacement card
        source.card = activeReplacement;
        source.currentRank = activeReplacement.rank;
        source.currentInitiative = activeReplacement.initiative;

        logs.push(
          createLogEntry(
            'replace',
            oldCard.isSingleUse
              ? `«${oldCard.name}» подменяет себя на «${activeReplacement.name}» (Инициатива: ${activeReplacement.initiative}, Ранг: ${activeReplacement.rank}) и уходит в сброс!`
              : `«${oldCard.name}» превращается в «${activeReplacement.name}» (Инициатива: ${activeReplacement.initiative}, Ранг: ${activeReplacement.rank})!`,
            source,
            activeReplacement
          )
        );

        setSeerReplaced({
          replacedId: source.instanceId,
          newCard: activeReplacement,
        });

        // If swapped-in card requires interactive target selection (Evacuation), let it take its turn immediately next
        if (activeReplacement.id === 'evacuation') {
          source.hasActed = false;
          setStayAtCurrentIndex(true);
          break;
        }

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
            setSeerReplaced,
            setStayAtCurrentIndex
          );
          if (source.isDestroyed) break;
        }
      } else {
        logs.push(
          createLogEntry(
            'info',
            source.card.isSingleUse
              ? `«${source.card.name}» ничего не делает и уйдёт в сброс после боя.`
              : `«${source.card.name}» остаётся на поле боя без замены.`,
            source
          )
        );
      }
      break;
    }

    case 'summon': {
      // Call Reserves (summons Reserves, spell goes to discard) or Conjurer (summons Imp / Evil Spirit, returns to hand)
      const hand = source.owner === 'player1' ? p1Hand : p2Hand;
      const discard = source.owner === 'player1' ? p1Discard : p2Discard;
      const poolIds = effect.summonCardIds ?? [];

      if (chosenSummonCard === null) {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}» никого не призывает и остаётся на поле боя.`,
            source
          )
        );
        break;
      }

      const availableOptions = getAvailableSummonOptions(
        poolIds,
        source.owner,
        queue,
        discard
      );

      let summonedDef: CardDefinition | undefined;
      if (chosenSummonCard) {
        summonedDef = availableOptions.find((c) => c.id === chosenSummonCard.id);
      } else if (availableOptions.length > 0) {
        summonedDef = availableOptions[0];
      }

      if (!summonedDef) {
        logs.push(
          createLogEntry(
            'info',
            `«${source.card.name}»: нет доступных карт для призыва (уже на поле или уничтожены).`,
            source
          )
        );
        break;
      }

      // If the summoned card was already in hand from a previous round, move it from hand (never duplicate!)
      const existingHandIdx = hand.findIndex((c) => c.id === summonedDef!.id);
      if (existingHandIdx !== -1) {
        hand.splice(existingHandIdx, 1);
      }

      const oldCard = source.card;
      if (effect.returnSelfToHand) {
        if (!hand.some((c) => c.id === oldCard.id)) {
          hand.push(oldCard);
        }
      } else if (oldCard.isSingleUse) {
        discard.push(oldCard);
      }

      // Place summoned card into the summoner's battlefield slot
      source.card = summonedDef;
      source.currentRank = summonedDef.rank;
      source.currentInitiative = summonedDef.initiative;
      source.protectedAgainst = [];
      source.protectionSources = [];
      source.cancelSources = [];
      source.isDestroyed = false;
      source.isDisabled = false;
      source.isCancelled = false;
      source.hasActed = false;

      logs.push(
        createLogEntry(
          'replace',
          effect.returnSelfToHand
            ? `«${oldCard.name}» призывает на поле боя «${summonedDef.name}» (Инициатива: ${summonedDef.initiative}, Ранг: ${summonedDef.rank}) и возвращается в руку!`
            : `«${oldCard.name}» вызывает на поле боя отряд «${summonedDef.name}» (Инициатива: ${summonedDef.initiative}, Ранг: ${summonedDef.rank}) — отряд вступает в бой!`,
          source,
          summonedDef
        )
      );

      setSeerReplaced({
        replacedId: source.instanceId,
        newCard: summonedDef,
      });

      // Schedule summoned unit into the remaining initiative queue so it acts at its own initiative
      const currentIdx = queue.indexOf(source);
      if (currentIdx !== -1) {
        queue.splice(currentIdx, 1);
        let insertIdx = currentIdx;
        while (
          insertIdx < queue.length &&
          queue[insertIdx].currentInitiative > source.currentInitiative
        ) {
          insertIdx += 1;
        }
        queue.splice(insertIdx, 0, source);
        setStayAtCurrentIndex(true);
      }
      break;
    }
  }
}

/**
 * Remove any active protection buffs or ability blocks applied by a creature
 * immediately when that creature is destroyed.
 * Non-creature sources (e.g. Progressive Science spell) remain active.
 */
function cleanupEffectsFromDeadCreature(
  deadCard: BattleCard,
  queue: BattleCard[],
  logs: LogEntry[]
): void {
  if (deadCard.card.type !== 'creature') {
    return;
  }

  const unshieldedCards: BattleCard[] = [];

  for (const unit of queue) {
    // 1. Check creature-linked protections
    if (unit.protectionSources && unit.protectionSources.length > 0) {
      const hadFromDead = unit.protectionSources.some(
        (s) => s.sourceInstanceId === deadCard.instanceId && s.sourceIsCreature
      );
      if (hadFromDead) {
        const previousThreats = new Set(unit.protectedAgainst);
        unit.protectionSources = unit.protectionSources.filter(
          (s) => !(s.sourceInstanceId === deadCard.instanceId && s.sourceIsCreature)
        );
        unit.protectedAgainst = Array.from(
          new Set(unit.protectionSources.map((s) => s.threat))
        );
        const lostAnyThreat = Array.from(previousThreats).some(
          (t) => !unit.protectedAgainst.includes(t)
        );
        if (lostAnyThreat && !unit.isDestroyed && !unit.isEvacuated) {
          unshieldedCards.push(unit);
        }
      }
    }

    // 2. Check creature-linked ability blocks (cancel_ability)
    if (unit.cancelSources && unit.cancelSources.length > 0) {
      const hadBlockFromDead = unit.cancelSources.some(
        (s) => s.sourceInstanceId === deadCard.instanceId && s.sourceIsCreature
      );
      if (hadBlockFromDead) {
        const wasCancelled = unit.isCancelled;
        unit.cancelSources = unit.cancelSources.filter(
          (s) => !(s.sourceInstanceId === deadCard.instanceId && s.sourceIsCreature)
        );
        unit.isCancelled = unit.cancelSources.length > 0;
        if (wasCancelled && !unit.isCancelled && !unit.isDestroyed && !unit.isEvacuated) {
          logs.push(
            createLogEntry(
              'info',
              unit.hasActed
                ? `«${deadCard.card.name}» уничтожен — блокировка с карты «${unit.card.name}» снята.`
                : `«${deadCard.card.name}» уничтожен — блокировка с карты «${unit.card.name}» снята, она сможет действовать на своей инициативе!`,
              deadCard,
              unit
            )
          );
        }
      }
    }
  }

  if (unshieldedCards.length > 0) {
    const names = unshieldedCards.map((u) => `«${u.card.name}»`).join(', ');
    logs.push(
      createLogEntry(
        'info',
        `«${deadCard.card.name}» уничтожен — защита снята с карт: ${names}.`,
        deadCard
      )
    );
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
      protectionSources: [],
      cancelSources: [],
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
      protectionSources: [],
      cancelSources: [],
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
