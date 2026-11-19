import { CardDefinition, CardType, CardSide } from '../types/game';

// Resistance card artwork
import armyImg from '../assets/cards/Resistance/army.png';
import artilleryImg from '../assets/cards/Resistance/artillery.png';
import battleChurchImg from '../assets/cards/Resistance/battle_church.png';
import engineerImg from '../assets/cards/Resistance/engineer.png';
import evacuationImg from '../assets/cards/Resistance/evacuation.png';
import policemanImg from '../assets/cards/Resistance/policeman.png';
import priestImg from '../assets/cards/Resistance/priest.png';
import progressiveScienceImg from '../assets/cards/Resistance/progressive_science.png';
import scientistImg from '../assets/cards/Resistance/scientist.png';
import seerImg from '../assets/cards/Resistance/seer.png';
import sniperImg from '../assets/cards/Resistance/sniper.png';
import warMachinesImg from '../assets/cards/Resistance/war_machines.png';
import warRobotsImg from '../assets/cards/Resistance/war_robots.png';

// Dark Side card artwork
import abnormalLightningImg from '../assets/cards/Dark_Side/abnormal_lightning.png';
import demonImg from '../assets/cards/Dark_Side/demon.png';
import ghostImg from '../assets/cards/Dark_Side/ghost.png';
import hiddenVirusImg from '../assets/cards/Dark_Side/hidden_virus.png';
import naturalDisasterImg from '../assets/cards/Dark_Side/natural_disaster.png';
import necromancerImg from '../assets/cards/Dark_Side/necromancer.png';
import oldWizardImg from '../assets/cards/Dark_Side/old_wizard.png';
import plagueImg from '../assets/cards/Dark_Side/plague.png';
import rabidDogsImg from '../assets/cards/Dark_Side/rabid_dogs.png';
import terribleDiseaseImg from '../assets/cards/Dark_Side/terrible_disease.png';
import vampireImg from '../assets/cards/Dark_Side/vampire.png';
import zombieImg from '../assets/cards/Dark_Side/zombie.png';

export type { CardDefinition, CardType, CardSide };

export const CARD_TYPE_NAMES: Record<CardType, string> = {
  technology: 'Техника',
  creature: 'Существо',
  incorporeal: 'Бесплотное',
  magic: 'Заклинание',
  virus: 'Вирус',
};

export const ALL_CARDS: CardDefinition[] = [
  // -------------------------------------------------------------
  // СОПРОТИВЛЕНИЕ (Resistance) - 12 карт в колоде + 1 скрытое заклинание
  // -------------------------------------------------------------
  {
    id: 'army',
    name: 'Армия',
    side: 'resistance',
    type: 'creature',
    rank: 7,
    initiative: 90,
    description: 'Уничтожает всех существ противника с рангом 5 и ниже.',
    icon: 'army',
    image: armyImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 5,
        },
        description: 'Уничтожает всех существ противника с рангом ≤ 5',
      },
    ],
  },
  {
    id: 'battle_church',
    name: 'Боевая церковь',
    side: 'resistance',
    type: 'creature',
    rank: 8,
    initiative: 105,
    description: 'Уничтожает всех бесплотных и существ противника с рангом 5 и ниже. Блокирует Старого колдуна и Демона.',
    icon: 'church',
    image: battleChurchImg,
    effects: [
      {
        action: 'cancel_ability',
        cancelCardId: 'old_wizard',
        description: 'Блокирует Старого колдуна',
      },
      {
        action: 'cancel_ability',
        cancelCardId: 'demon',
        description: 'Блокирует Демона',
      },
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['incorporeal'],
        },
        description: 'Уничтожает всех бесплотных существ противника',
      },
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 5,
        },
        description: 'Уничтожает всех существ противника с рангом ≤ 5',
      },
    ],
  },
  {
    id: 'war_machines',
    name: 'Боевые машины',
    side: 'resistance',
    type: 'technology',
    rank: 1,
    initiative: 130,
    description: 'Уничтожает всех существ противника с рангом 6 и ниже.',
    icon: 'war_machines',
    image: warMachinesImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 6,
        },
        description: 'Уничтожает всех существ противника с рангом ≤ 6',
      },
    ],
  },
  {
    id: 'war_robots',
    name: 'Боевые роботы',
    side: 'resistance',
    type: 'technology',
    rank: 2,
    initiative: 75,
    description: 'Уничтожает всех существ противника.',
    icon: 'war_robots',
    image: warRobotsImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
        },
        description: 'Уничтожает всех существ противника',
      },
    ],
  },
  {
    id: 'engineer',
    name: 'Инженер',
    side: 'resistance',
    type: 'creature',
    rank: 1,
    initiative: 205,
    description: 'Защищает все союзные карты от заклинаний.',
    icon: 'engineer',
    image: engineerImg,
    effects: [
      {
        action: 'protect',
        target: {
          side: 'ally',
        },
        protectAgainst: ['magic'],
        description: 'Защищает все союзные карты от заклинаний',
      },
    ],
  },
  {
    id: 'evacuation',
    name: 'Эвакуация',
    side: 'resistance',
    type: 'creature',
    rank: 1,
    initiative: 138,
    description: 'Может эвакуировать одно союзное существо или технику с поля боя обратно в руку, либо ничего не делать.',
    icon: 'evacuation',
    image: evacuationImg,
    effects: [
      {
        action: 'evacuate',
        target: {
          side: 'ally',
          types: ['creature', 'technology'],
        },
        description: 'Эвакуирует одно союзное существо или технику с поля боя в руку',
      },
    ],
  },
  {
    id: 'policeman',
    name: 'Полицейский',
    side: 'resistance',
    type: 'creature',
    rank: 4,
    initiative: 80,
    description: 'Уничтожает всех существ противника с рангом 3 и ниже.',
    icon: 'policeman',
    image: policemanImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 3,
        },
        description: 'Уничтожает существ противника с рангом ≤ 3',
      },
    ],
  },
  {
    id: 'progressive_science',
    name: 'Прогрессивная наука',
    side: 'resistance',
    type: 'magic',
    rank: 2,
    initiative: 250,
    description: 'Защищает все союзные карты от заклинаний. Одноразово.',
    icon: 'science',
    image: progressiveScienceImg,
    isSingleUse: true,
    effects: [
      {
        action: 'protect',
        target: {
          side: 'ally',
        },
        protectAgainst: ['magic'],
        description: 'Защищает все карты Сопротивления от заклинаний',
      },
    ],
  },
  {
    id: 'priest',
    name: 'Священник',
    side: 'resistance',
    type: 'creature',
    rank: 2,
    initiative: 170,
    description: 'Уничтожает всех бесплотных существ противника.',
    icon: 'priest',
    image: priestImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['incorporeal'],
        },
        description: 'Уничтожает всех бесплотных существ противника',
      },
    ],
  },
  {
    id: 'sniper',
    name: 'Снайпер',
    side: 'resistance',
    type: 'creature',
    rank: 6,
    initiative: 290,
    description: 'Уничтожает одно существо противника с рангом 6 и ниже. Блокирует Старого колдуна.',
    icon: 'sniper',
    image: sniperImg,
    effects: [
      {
        action: 'cancel_ability',
        cancelCardId: 'old_wizard',
        description: 'Блокирует Старого колдуна',
      },
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 6,
          limit: 1,
          priority: 'highest_rank',
        },
        description: 'Уничтожает 1 существо противника с рангом ≤ 6',
      },
    ],
  },
  {
    id: 'scientist',
    name: 'Учёный',
    side: 'resistance',
    type: 'creature',
    rank: 1,
    initiative: 189,
    description: 'Защищает союзных существ от заклинаний.',
    icon: 'scientist',
    image: scientistImg,
    effects: [
      {
        action: 'protect',
        target: {
          side: 'ally',
          types: ['creature'],
        },
        protectAgainst: ['magic'],
        description: 'Защищает союзных существ от заклинаний',
      },
    ],
  },
  {
    id: 'seer', // ID сохранён для совместимости
    name: 'Артиллерист',
    side: 'resistance',
    type: 'creature',
    rank: 3,
    initiative: 104, // Больше чем у демона (100)
    description: 'На своём ходу заменяется на скрытое заклинание «Артиллерия» и сразу активирует его.',
    icon: 'artillerist',
    image: seerImg,
    effects: [
      {
        action: 'replace',
        allowSelfReplace: true,
        description: 'Заменяется на скрытое заклинание «Артиллерия»',
      },
    ],
  },
  // Скрытое заклинание Сопротивления (не сдаётся в руку, призывается Артиллеристом)
  {
    id: 'artillery',
    name: 'Артиллерия',
    side: 'resistance',
    type: 'magic',
    rank: 3,
    initiative: 104,
    description: 'Уничтожает всех существ и всю технику на поле (своих и врагов), игнорируя защиту. Одноразово.',
    icon: 'artillery',
    image: artilleryImg,
    isSingleUse: true,
    isHiddenSpell: true,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'all',
          types: ['creature'],
        },
        ignoreProtection: true,
        description: 'Уничтожает абсолютно всех существ (своих и чужих)',
      },
      {
        action: 'destroy',
        target: {
          side: 'all',
          types: ['technology'],
        },
        ignoreProtection: true,
        description: 'Уничтожает абсолютно всю технику (свою и чужую)',
      },
    ],
  },

  // -------------------------------------------------------------
  // ТЁМНАЯ СТОРОНА (Dark Side) - 12 карт
  // -------------------------------------------------------------
  {
    id: 'abnormal_lightning',
    name: 'Аномальные молнии',
    side: 'dark_side',
    type: 'magic',
    rank: 2,
    initiative: 201,
    description: 'Уничтожает всю технику противника. Одноразово.',
    icon: 'lightning',
    image: abnormalLightningImg,
    isSingleUse: true,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['technology'],
        },
        description: 'Уничтожает любую технику противника',
      },
    ],
  },
  {
    id: 'rabid_dogs',
    name: 'Бешеные псы',
    side: 'dark_side',
    type: 'creature',
    rank: 4,
    initiative: 285,
    description: 'Уничтожают одно существо противника с рангом 4 и ниже, игнорируя защиту.',
    icon: 'dogs',
    image: rabidDogsImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 4,
          limit: 1,
          priority: 'highest_rank',
        },
        ignoreProtection: true,
        description: 'Уничтожает 1 существо противника с рангом ≤ 4, игнорируя защиту',
      },
    ],
  },
  {
    id: 'vampire',
    name: 'Вампир',
    side: 'dark_side',
    type: 'creature',
    rank: 6,
    initiative: 155,
    description: 'Уничтожает всех существ противника с рангом 6 и ниже.',
    icon: 'vampire',
    image: vampireImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 6,
        },
        description: 'Уничтожает всех существ противника с рангом ≤ 6',
      },
    ],
  },
  {
    id: 'demon',
    name: 'Демон',
    side: 'dark_side',
    type: 'creature',
    rank: 8,
    initiative: 100,
    description: 'Уничтожает всех существ противника любого ранга и технику противника 1-го ранга.',
    icon: 'demon',
    image: demonImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
        },
        description: 'Уничтожает всех существ противника любого ранга',
      },
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['technology'],
          exactRank: 1,
        },
        description: 'Уничтожает технику противника 1-го ранга',
      },
    ],
  },
  {
    id: 'zombie',
    name: 'Зомби',
    side: 'dark_side',
    type: 'creature',
    rank: 3,
    initiative: 15,
    description: 'Уничтожает всех существ противника с рангом 4 и ниже.',
    icon: 'zombie',
    image: zombieImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 4,
        },
        description: 'Уничтожает всех существ противника с рангом ≤ 4',
      },
    ],
  },
  {
    id: 'necromancer',
    name: 'Некромант',
    side: 'dark_side',
    type: 'creature',
    rank: 2,
    initiative: 80,
    description: 'Уничтожает себя и возвращает выбранное существо (ранг ≤ 6) из сброса в руку. Без целей не погибает.',
    icon: 'necromancer',
    image: necromancerImg,
    effects: [
      {
        action: 'revive',
        destroySelf: true,
        reviveFilter: {
          side: 'ally',
          types: ['creature'],
          maxRank: 6,
        },
        description: 'Уничтожает себя и воскрешает выбранное существо с рангом ≤ 6 из сброса в руку',
      },
    ],
  },
  {
    id: 'ghost',
    name: 'Призрак',
    side: 'dark_side',
    type: 'incorporeal',
    rank: 0,
    initiative: 111,
    description: 'Уничтожает существ противника с рангом 5 и ниже, кроме Священника и Боевой церкви.',
    icon: 'ghost',
    image: ghostImg,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 5,
          excludeCardIds: ['priest', 'battle_church'],
        },
        description: 'Уничтожает существ противника с рангом ≤ 5 (кроме Священника и Боевой церкви)',
      },
    ],
  },
  {
    id: 'hidden_virus',
    name: 'Скрытый вирус',
    side: 'dark_side',
    type: 'virus',
    rank: 0,
    initiative: 80,
    description: 'Уничтожает боевых роботов противника. Не блокируется защитой от заклинаний. Одноразово.',
    icon: 'virus',
    image: hiddenVirusImg,
    isSingleUse: true,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          cardIds: ['war_robots'],
        },
        description: 'Уничтожает боевых роботов противника',
      },
    ],
  },
  {
    id: 'old_wizard',
    name: 'Старый колдун',
    side: 'dark_side',
    type: 'creature',
    rank: 1,
    initiative: 100,
    description: 'В бою меняет себя на любое заклинание из руки на выбор. Блокируется Боевой церковью и Снайпером.',
    icon: 'wizard',
    image: oldWizardImg,
    effects: [
      {
        action: 'replace',
        allowSelfReplace: true,
        description: 'Меняет себя на любое доступное заклинание из руки',
      },
    ],
  },
  {
    id: 'natural_disaster',
    name: 'Стихийное бедствие',
    side: 'dark_side',
    type: 'magic',
    rank: 1,
    initiative: 40,
    description: 'Уничтожает существ противника с рангом 6 и ниже и технику противника 1-го ранга. Одноразово.',
    icon: 'disaster',
    image: naturalDisasterImg,
    isSingleUse: true,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
          maxRank: 6,
        },
        description: 'Уничтожает существ противника с рангом ≤ 6',
      },
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['technology'],
          exactRank: 1,
        },
        description: 'Уничтожает технику противника 1-го ранга',
      },
    ],
  },
  {
    id: 'terrible_disease',
    name: 'Страшная болезнь',
    side: 'dark_side',
    type: 'magic',
    rank: 1,
    initiative: 145,
    description: 'Уменьшает ранг всех существ противника на 1. Одноразово.',
    icon: 'disease',
    image: terribleDiseaseImg,
    isSingleUse: true,
    effects: [
      {
        action: 'reduce_rank',
        amount: 1,
        target: {
          side: 'enemy',
          types: ['creature'],
        },
        description: 'Уменьшает ранг всех вражеских существ на 1',
      },
    ],
  },
  {
    id: 'plague',
    name: 'Чума',
    side: 'dark_side',
    type: 'magic',
    rank: 2,
    initiative: 20,
    description: 'Уничтожает всех существ противника. Одноразово.',
    icon: 'plague',
    image: plagueImg,
    isSingleUse: true,
    effects: [
      {
        action: 'destroy',
        target: {
          side: 'enemy',
          types: ['creature'],
        },
        description: 'Уничтожает всех существ противника',
      },
    ],
  },
];

export function getCardsBySide(side: 'resistance' | 'dark_side'): CardDefinition[] {
  // Returns starting hand cards (excluding hidden spells)
  return ALL_CARDS.filter((c) => c.side === side && !c.isHiddenSpell);
}

export function getCardById(id: string): CardDefinition | undefined {
  return ALL_CARDS.find((c) => c.id === id);
}
