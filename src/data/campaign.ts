import { CardDefinition, CardSide } from '../types/game';
import { getCardById, getCardsBySide } from './cards';

export interface CampaignStageConfig {
  id: number;
  side: CardSide;
  title: string;
  subtitle: string;
  enemyName: string;
  playerCardIds: string[];
  enemyCardIds: string[];
  /**
   * Optional scripted opening trio for the enemy bot on Round 1.
   */
  firstRoundBotCardIds?: string[];
  /**
   * Percentage position (0..100) on background_maps_v1.jpg.
   */
  mapPosition: {
    x: number;
    y: number;
  };
  /**
   * Extra tactical hint displayed in briefing if relevant.
   */
  specialNote?: string;
}

export interface CampaignProgress {
  completedStages: Record<CardSide, number[]>;
}

const CAMPAIGN_PROGRESS_STORAGE_KEY = 'card_game_campaign_progress_v1';

const ALL_RESISTANCE_IDS = getCardsBySide('resistance').map((c) => c.id);
const ALL_DARK_SIDE_IDS = getCardsBySide('dark_side').map((c) => c.id);

export const RESISTANCE_CAMPAIGN_STAGES: CampaignStageConfig[] = [
  {
    id: 1,
    side: 'resistance',
    title: 'Передовой рубеж',
    subtitle: 'Разведгруппа Сопротивления сдерживает первую волну сил Тьмы у разлома.',
    enemyName: 'Авангард Тьмы',
    playerCardIds: ['engineer', 'sniper', 'policeman', 'evacuation'],
    enemyCardIds: [
      'zombie',
      'terrible_disease',
      'necromancer',
      'old_wizard',
      'natural_disaster',
    ],
    firstRoundBotCardIds: ['zombie', 'old_wizard', 'terrible_disease'],
    mapPosition: { x: 17, y: 63 },
    specialNote:
      'В первом бою противник всегда начинает комбинацией: Зомби, Старый колдун и Страшная болезнь.',
  },
  {
    id: 2,
    side: 'resistance',
    title: 'Линия разлома',
    subtitle: 'Армия и учёные прибывают на подкрепление против ночных хищников и чумы.',
    enemyName: 'Ночной натиск',
    playerCardIds: [
      'engineer',
      'sniper',
      'policeman',
      'evacuation',
      'army',
      'scientist',
    ],
    enemyCardIds: [
      'zombie',
      'necromancer',
      'old_wizard',
      'natural_disaster',
      'vampire',
      'plague',
      'rabid_dogs',
    ],
    mapPosition: { x: 38, y: 48 },
  },
  {
    id: 3,
    side: 'resistance',
    title: 'Огненный плацдарм',
    subtitle: 'Поле охвачено пламенем. Священник и Артиллерист вступают в сражение против Призрака.',
    enemyName: 'Призрачный легион',
    playerCardIds: [
      'engineer',
      'sniper',
      'policeman',
      'evacuation',
      'army',
      'scientist',
      'priest',
      'seer',
    ],
    enemyCardIds: [
      'zombie',
      'necromancer',
      'old_wizard',
      'natural_disaster',
      'vampire',
      'plague',
      'rabid_dogs',
      'ghost',
    ],
    mapPosition: { x: 60, y: 37 },
    specialNote:
      'Артиллерист на своём ходу активирует скрытое заклинание «Артиллерия».',
  },
  {
    id: 4,
    side: 'resistance',
    title: 'Цитадель Тьмы',
    subtitle: 'Решающее столкновение полными колодами: все 12 карт Сопротивления против всех сил Тьмы.',
    enemyName: 'Владыки Бездны',
    playerCardIds: ALL_RESISTANCE_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    mapPosition: { x: 82, y: 22 },
    specialNote:
      'Полные колоды (12 против 12). Заклинание «Артиллерия» скрыто и активируется Артиллеристом.',
  },
];

export function getCampaignStagesBySide(side: CardSide): CampaignStageConfig[] {
  if (side === 'resistance') {
    return RESISTANCE_CAMPAIGN_STAGES;
  }
  return [];
}

export function getCampaignStage(
  side: CardSide,
  stageId: number
): CampaignStageConfig | undefined {
  return getCampaignStagesBySide(side).find((s) => s.id === stageId);
}

export function resolveCampaignCards(cardIds: string[]): CardDefinition[] {
  return cardIds
    .map((id) => getCardById(id))
    .filter((c): c is CardDefinition => Boolean(c));
}

export function loadCampaignProgress(): CampaignProgress {
  const empty: CampaignProgress = {
    completedStages: {
      resistance: [],
      dark_side: [],
    },
  };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const resistance = Array.isArray(parsed?.completedStages?.resistance)
      ? parsed.completedStages.resistance.filter((n: unknown) => typeof n === 'number')
      : [];
    const darkSide = Array.isArray(parsed?.completedStages?.dark_side)
      ? parsed.completedStages.dark_side.filter((n: unknown) => typeof n === 'number')
      : [];
    return {
      completedStages: {
        resistance,
        dark_side: darkSide,
      },
    };
  } catch {
    return empty;
  }
}

export function saveCampaignProgress(progress: CampaignProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(CAMPAIGN_PROGRESS_STORAGE_KEY, JSON.stringify(progress));
  } catch {
    // ignore storage quota errors
  }
}

export function isCampaignStageUnlocked(
  stageId: number,
  completedStageIds: number[]
): boolean {
  if (stageId <= 1) return true;
  return completedStageIds.includes(stageId - 1);
}

export function getActiveUncompletedStageId(
  stages: CampaignStageConfig[],
  completedStageIds: number[]
): number | null {
  for (const stage of stages) {
    if (
      isCampaignStageUnlocked(stage.id, completedStageIds) &&
      !completedStageIds.includes(stage.id)
    ) {
      return stage.id;
    }
  }
  return null;
}
