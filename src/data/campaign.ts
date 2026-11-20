import { CardDefinition, CardSide } from '../types/game';
import { getCardById, getCardsBySide } from './cards';

import campaignIntroDemonImg from '../assets/images/campaign_intro_demon_1795176357695.jpg';
import campaignOfficerPortraitImg from '../assets/images/campaign_officer_portrait_1795176356525.jpg';
import campaignVampirePortraitImg from '../assets/images/campaign_vampire_portrait_1795176356500.jpg';
import campaignDemonPortraitImg from '../assets/images/campaign_demon_portrait_1795176356891.jpg';
import campaignVictoryFinaleImg from '../assets/images/campaign_victory_finale_1795176358585.jpg';

export const CAMPAIGN_INTRO_IMAGE = campaignIntroDemonImg;
export const CAMPAIGN_OFFICER_PORTRAIT = campaignOfficerPortraitImg;
export const CAMPAIGN_VAMPIRE_PORTRAIT = campaignVampirePortraitImg;
export const CAMPAIGN_DEMON_PORTRAIT = campaignDemonPortraitImg;
export const CAMPAIGN_VICTORY_IMAGE = campaignVictoryFinaleImg;

export type CampaignSpeakerId = 'officer' | 'vampire' | 'demon';

export interface CampaignDialogueLine {
  speaker: CampaignSpeakerId;
  speakerName: string;
  speakerRole: string;
  text: string;
  portraitImage: string;
  sceneImage?: string;
  tone: 'resistance' | 'dark' | 'warning';
}

export type CampaignMilestoneTag =
  | 'vampire'
  | 'ghost'
  | 'demon'
  | 'stealth'
  | 'boss';

export interface CampaignStageConfig {
  id: number;
  side: CardSide;
  actTitle: string;
  title: string;
  subtitle: string;
  enemyName: string;
  /**
   * Briefing message delivered by the Resistance intelligence officer before the stage.
   */
  officerBriefing: string;
  /**
   * Scripted pre-battle narrative dialogue lines (may include enemy appearances).
   */
  preBattleDialogue: CampaignDialogueLine[];
  playerCardIds: string[];
  enemyCardIds: string[];
  /**
   * Optional scripted opening trio for the enemy bot on Round 1.
   */
  firstRoundBotCardIds?: string[];
  /**
   * Optional soft preference for specific bot tactical schemes (for thematic campaign opponents).
   */
  preferredBotSchemes?: string[];
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
  /**
   * Visual milestone highlight on the campaign map.
   */
  milestoneTag?: CampaignMilestoneTag;
}

export interface CampaignProgress {
  completedStages: Record<CardSide, number[]>;
  hasSeenResistancePrologue?: boolean;
}

const CAMPAIGN_PROGRESS_STORAGE_KEY = 'card_game_campaign_progress_v2';

const ALL_RESISTANCE_IDS = getCardsBySide('resistance').map((c) => c.id);
const ALL_DARK_SIDE_IDS = getCardsBySide('dark_side').map((c) => c.id);

// Helper factories for consistent narrative dialogue lines
function officerLine(
  text: string,
  options?: { sceneImage?: string; tone?: 'resistance' | 'warning' }
): CampaignDialogueLine {
  return {
    speaker: 'officer',
    speakerName: 'Офицер разведки',
    speakerRole: 'Штаб Сопротивления',
    text,
    portraitImage: CAMPAIGN_OFFICER_PORTRAIT,
    sceneImage: options?.sceneImage,
    tone: options?.tone ?? 'resistance',
  };
}

function vampireLine(text: string): CampaignDialogueLine {
  return {
    speaker: 'vampire',
    speakerName: 'Вампир',
    speakerRole: 'Порождение Ночи · Тёмная сторона',
    text,
    portraitImage: CAMPAIGN_VAMPIRE_PORTRAIT,
    tone: 'dark',
  };
}

function demonLine(text: string): CampaignDialogueLine {
  return {
    speaker: 'demon',
    speakerName: 'Демон',
    speakerRole: 'Повелитель Бездны · Тёмная сторона',
    text,
    portraitImage: CAMPAIGN_DEMON_PORTRAIT,
    tone: 'dark',
  };
}

export const RESISTANCE_PROLOGUE_DIALOGUE: CampaignDialogueLine[] = [
  officerLine(
    'Командир, ещё один лагерь сопротивления подвергся нападению! Если мы не остановим силы тьмы, человечеству придёт конец!',
    { sceneImage: CAMPAIGN_INTRO_IMAGE, tone: 'warning' }
  ),
];

export const RESISTANCE_FINALE_DIALOGUE: CampaignDialogueLine[] = [
  officerLine(
    'Командир, мы сделали это! Демон повержен на выжженной земле, боевые роботы сокрушили его легион, а армия ликует! Разлом закрыт — человечество спасено!',
    { sceneImage: CAMPAIGN_VICTORY_IMAGE, tone: 'resistance' }
  ),
];

// Covert 12-card strike squad for Stages 18-19 (No War Robots, WITH Artillerist & Battle Church)
// Designed so a skilled Commander can defeat the full 17-card Dark Side army (including Demon) in minority.
const RIFT_STEALTH_12_IDS = [
  'seer', // Артиллерист (инициатива 104 > Демона 100, уничтожает Демона и всю вражескую линию)
  'battle_church', // Блокирует Демона и Старого колдуна, бьёт Призрака и существ ≤ 5
  'war_machines', // Техника: бьёт Вампира и всех существ ≤ 6, неуязвима к Чуме
  'sniper', // Инициатива 290: перехватывает Вампира, Гаргулью, Бешеных псов, блокирует Колдуна
  'army', // Ранг 7: переживает Вампира и Бедствие, зачищает существ ≤ 5
  'priest', // Инициатива 170: уничтожает Призрака и Злого духа до их хода
  'engineer', // Инициатива 205: прикрывает весь отряд от тёмных заклинаний
  'scientist', // Вторая линия защиты существ от магии
  'medic', // Реанимирует павших союзников в бою, сохраняя численность отряда
  'evacuation', // Эвакуирует ключевую карту в руку от гибели
  'call_reserves', // Призывает многоразовые «Резервы» (ранг 5) — усиливает численность
  'policeman', // Многоразовый зачистчик Некроманта, Зомби, Паразита, Подрывника и Бесов
];

// Stage 20 Finale 12-card strike squad (War Robots arrive alongside Artillerist!)
const RIFT_FINALE_12_IDS = [
  'war_robots', // Боевые роботы: уничтожают абсолютно всех существ, включая Демона!
  'seer', // Артиллерист: сокрушительный артудар по вражескому строю
  'battle_church', // Блокирует Демона и Колдуна, зачищает бесплотных
  'war_machines', // Техника против Вампира и средних существ
  'sniper', // Сверхбыстрый точечный перехват
  'army', // Прочная пехота 7-го ранга
  'priest', // Очищает поле от Призрака и Злого духа
  'engineer', // Защищает Боевых роботов и технику от Аномальных и Шаровых молний
  'scientist', // Защита существ от Чумы и Бедствия
  'medic', // Реанимация павших бойцов
  'evacuation', // Спасение Боевых роботов или ключевых карт от Скрытого вируса и угроз
  'call_reserves', // Подкрепление «Резервов» на поле боя
];

export const RESISTANCE_CAMPAIGN_STAGES: CampaignStageConfig[] = [
  // =========================================================================
  // ГЛАВА I: ОБОРОНА ЛАГЕРЕЙ (Этапы 1–3) — 6..8 карт, без Вампира/Призрака/Демона
  // =========================================================================
  {
    id: 1,
    side: 'resistance',
    actTitle: 'Глава I · Оборона лагерей',
    title: 'Передовой рубеж',
    subtitle:
      'Первая волна нежити и тёмной магии атакует внешний периметр лагеря.',
    enemyName: 'Авангард Тьмы',
    officerBriefing:
      'Командир, на внешнем блокпосте замечены зомби, некромант и старый колдун с болезнями. Прикройте отряд Инженером и Учёным от магии, а Снайпером и Полицейским выбейте существ!',
    preBattleDialogue: [
      officerLine(
        'Командир, первый удар пришёлся по передовому рубежу. Противник бросил в бой зомби, некроманта, паразита и тёмные заклинания. Инженер и Учёный защитят наших от магии, а Снайпер и Полицейский легко справятся с нежитью.'
      ),
    ],
    playerCardIds: [
      'policeman',
      'sniper',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'zombie',
      'necromancer',
      'old_wizard',
      'parasite',
      'terrible_disease',
      'natural_disaster',
    ],
    firstRoundBotCardIds: ['zombie', 'old_wizard', 'terrible_disease'],
    preferredBotSchemes: ['ds_epidemic', 'ds_shadow_value'],
    mapPosition: { x: 10, y: 84 },
    specialNote:
      'Противник открывает бой тройкой: Зомби, Старый колдун и Страшная болезнь.',
  },
  {
    id: 2,
    side: 'resistance',
    actTitle: 'Глава I · Оборона лагерей',
    title: 'Выжженная дорога',
    subtitle:
      'Бешеные псы и смертельная Чума перекрыли путь эвакуации колонны.',
    enemyName: 'Ночная стая',
    officerBriefing:
      'На трассе к эвакуационному пункту рыщут Бешеные псы, а колдуны готовят Чуму. На подмогу прибыла регулярная Армия — держите её под защитой от заклинаний!',
    preBattleDialogue: [
      officerLine(
        'Командир, дорогу на север перекрыла ночная стая: в рядах врага появились быстрые Бешеные псы и смертельная Чума. К нам присоединилась Армия — она переживёт укус псов и сметет врагов, если прикрыть её от магии.'
      ),
    ],
    playerCardIds: [
      'army',
      'sniper',
      'policeman',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'rabid_dogs',
      'zombie',
      'necromancer',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_blitz', 'ds_plague_wipe'],
    mapPosition: { x: 23, y: 78 },
  },
  {
    id: 3,
    side: 'resistance',
    actTitle: 'Глава I · Оборона лагерей',
    title: 'Огненный плацдарм',
    subtitle:
      'В небе над развалинами кружат стремительные Гаргульи в связке с Паразитом.',
    enemyName: 'Крылья пепла',
    officerBriefing:
      'Внимание, командир! В этом секторе замечены каменные Гаргульи — они атакуют почти так же быстро, как наш Снайпер. Штаб выделил Беспилотный отряд для точечной поддержки!',
    preBattleDialogue: [
      officerLine(
        'Командир, разведка докладывает об изменении состава врага: на огненном плацдарме нас ждут быстрые Гаргульи, Бешеные псы и Паразит. Не дайте Паразиту заблокировать Снайпера — используйте Армию и Беспилотный отряд!'
      ),
    ],
    playerCardIds: [
      'army',
      'sniper',
      'policeman',
      'drone_squad',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'gargoyle',
      'rabid_dogs',
      'zombie',
      'necromancer',
      'old_wizard',
      'parasite',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_blitz', 'ds_shadow_value', 'ds_plague_wipe'],
    mapPosition: { x: 36, y: 85 },
  },

  // =========================================================================
  // ГЛАВА II: КРОВАВАЯ ОХОТА (Этапы 4–7) — Появление Вампира! 8..11 карт
  // =========================================================================
  {
    id: 4,
    side: 'resistance',
    actTitle: 'Глава II · Кровавая охота',
    title: 'Кровавая луна',
    subtitle:
      'Древний Вампир лично вышел на охоту. Против него направлены Боевые машины.',
    enemyName: 'Клан Вампира',
    officerBriefing:
      'Командир, это вампир, очень опасная тварь! Осторожнее, пожалуйста! Против существ 6-го ранга обычная Армия бессильна — бейте его Снайпером и новыми Боевыми машинами.',
    preBattleDialogue: [
      vampireLine(
        'Люди, вы всегда были наивными! То, что мертво, умереть не может! В отличие от Вас!'
      ),
      officerLine(
        'Командир, это вампир, очень опасная тварь! Осторожнее, пожалуйста!',
        { tone: 'warning' }
      ),
    ],
    playerCardIds: [
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'rabid_dogs',
      'zombie',
      'necromancer',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_blitz', 'ds_plague_wipe', 'ds_shadow_value'],
    mapPosition: { x: 50, y: 77 },
    specialNote:
      'Первое появление Вампира (ранг 6). Снайпер (инициатива 290) и Боевые машины надёжно его уничтожают.',
    milestoneTag: 'vampire',
  },
  {
    id: 5,
    side: 'resistance',
    actTitle: 'Глава II · Кровавая охота',
    title: 'Разрушенный завод',
    subtitle:
      'Тёмные подрывники и Шаровые молнии охотятся за нашей бронетехникой.',
    enemyName: 'Грозовые налётчики',
    officerBriefing:
      'Враг заметил наши Боевые машины и прислал Тёмного подрывника с Шаровой молнией. Прогрессивная наука и Инженер прикроют технику от молний, а сами машины бьют быстрее подрывника!',
    preBattleDialogue: [
      officerLine(
        'Командир, на территории завода силы Тьмы подготовили ловушку для нашей техники: здесь действуют Тёмный подрывник и Шаровая молния, а прикрывают их Вампир и Гаргулья. Используйте Прогрессивную науку и Инженера!'
      ),
    ],
    playerCardIds: [
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'engineer',
      'scientist',
      'progressive_science',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'gargoyle',
      'dark_sapper',
      'zombie',
      'necromancer',
      'old_wizard',
      'ball_lightning',
      'terrible_disease',
      'plague',
    ],
    preferredBotSchemes: ['ds_anti_tech', 'ds_blitz', 'ds_epidemic'],
    mapPosition: { x: 64, y: 84 },
  },
  {
    id: 6,
    side: 'resistance',
    actTitle: 'Глава II · Кровавая охота',
    title: 'Чумной квартал',
    subtitle:
      'Смертельные эпидемии и стаи хищников грозят истощить наш отряд.',
    enemyName: 'Вестники мора',
    officerBriefing:
      'Квартал охвачен Чумой, Бедствием и Страшной болезнью, а Вампир и Гаргульи добивают ослабленных. Штаб разрешил Вызов резервов — это поможет удержать численность отряда!',
    preBattleDialogue: [
      officerLine(
        'Командир, впереди Чумной квартал. Противник собрал все тёмные болезни и быстрых хищников — Вампира, Гаргулью, Бешеных псов и Паразита. Мы открыли канал для Вызова резервов: свежий отряд переломит затяжной бой!'
      ),
    ],
    playerCardIds: [
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'drone_squad',
      'call_reserves',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'gargoyle',
      'rabid_dogs',
      'parasite',
      'dark_sapper',
      'necromancer',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_epidemic', 'ds_plague_wipe', 'ds_blitz'],
    mapPosition: { x: 78, y: 77 },
  },
  {
    id: 7,
    side: 'resistance',
    actTitle: 'Глава II · Кровавая охота',
    title: 'Осада моста',
    subtitle:
      'Штормовые Аномальные молнии бьют по переправе. Артиллерист выходит на позицию.',
    enemyName: 'Штормовой авангард',
    officerBriefing:
      'Мост под прицелом Аномальных молний, которые бьют быстрее техники — берегите Инженера! К нам присоединился Артиллерист: его залп сметает всё на поле, даже самых сильных чудовищ.',
    preBattleDialogue: [
      officerLine(
        'Командир, чтобы перейти реку, нужно прорвать плотный заслон с Аномальными молниями, Вампиром и Гаргульями. На ваш участок прибыл Артиллерист и доступен Холодный расчёт — удар артиллерии сметёт любую засаду!'
      ),
    ],
    playerCardIds: [
      'seer',
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'drone_squad',
      'call_reserves',
      'cold_calculation',
      'engineer',
      'scientist',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'gargoyle',
      'rabid_dogs',
      'zombie',
      'parasite',
      'dark_sapper',
      'necromancer',
      'old_wizard',
      'abnormal_lightning',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_anti_tech', 'ds_blitz', 'ds_shadow_value'],
    mapPosition: { x: 90, y: 67 },
    specialNote:
      'Первое появление Артиллериста. Инженер (инициатива 205) успевает прикрыть технику от Аномальных молний (201).',
  },

  // =========================================================================
  // ГЛАВА III: ТЕНИ И СВЯЩЕННАЯ СТАЛЬ (Этапы 8–14) — Призрак + Заклинатель / Священник + Боевая церковь! 9..12 карт
  // =========================================================================
  {
    id: 8,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Забытый собор',
    subtitle:
      'Над руинами сгустился туман: впервые замечены Призраки и тёмный Заклинатель.',
    enemyName: 'Призрачный ковен',
    officerBriefing:
      'Командир, разведка сообщает: здесь видели призраков и Заклинателя, призывающего духов! Обычное оружие их не берёт, поэтому в наш отряд вступают Священник и Боевая церковь!',
    preBattleDialogue: [
      officerLine(
        'Командир, тревожные вести с передовой: в развалинах собора видели призраков! Рядом с ними замечен тёмный Заклинатель, способный призывать Бесов и Злых духов.',
        { tone: 'warning' }
      ),
      officerLine(
        'Обычные пули против бесплотных тварей бессильны, поэтому штаб срочно прикомандировал к вам Священника и Боевую церковь — раньше их не было в нашем строю. Берегите их, они единственная защита от призраков!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'sniper',
      'army',
      'policeman',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'ghost',
      'conjurer',
      'rabid_dogs',
      'zombie',
      'necromancer',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_shadow_value', 'ds_epidemic', 'ds_plague_wipe'],
    mapPosition: { x: 79, y: 53 },
    specialNote:
      'Дебют Призрака и Заклинателя у врага. В ваш отряд впервые добавлены Священник и Боевая церковь!',
    milestoneTag: 'ghost',
  },
  {
    id: 9,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Туманное кладбище',
    subtitle:
      'Вампир объединил силы с Призраками и Заклинателем под покровом мглы.',
    enemyName: 'Легион теней',
    officerBriefing:
      'На кладбище одновременно действуют Вампир, Призрак и Заклинатель. В помощь Священнику и Боевой церкви мы подготовили Молитву, а Боевые машины и Снайпер разберутся с Вампиром.',
    preBattleDialogue: [
      officerLine(
        'Командир, на туманном кладбище силы Тьмы объединили вампирский клан с призраками и Заклинателем. В арсенале появилась Молитва против бесплотных, а Боевые машины вернулись в строй для борьбы с Вампиром.'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'prayer',
      'war_machines',
      'sniper',
      'army',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'ghost',
      'conjurer',
      'zombie',
      'necromancer',
      'old_wizard',
      'parasite',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_shadow_value', 'ds_blitz', 'ds_plague_wipe'],
    mapPosition: { x: 65, y: 58 },
  },
  {
    id: 10,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Электрический шторм',
    subtitle:
      'Молнии и диверсанты прикрывают вылазку Призраков и Гаргулий.',
    enemyName: 'Молнии бездны',
    officerBriefing:
      'В этом секторе бушуют Аномальные и Шаровые молнии, а под их прикрытием бьют Призрак и Гаргулья. Прогрессивная наука и Холодный расчёт помогут перехватить инициативу!',
    preBattleDialogue: [
      officerLine(
        'Командир, впереди зона электрических аномалий. Противник делает ставку на молнии, Тёмного подрывника, Гаргулью и бесплотных тварей. Прикройте Боевые машины Инженером и Прогрессивной наукой!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'war_machines',
      'sniper',
      'army',
      'drone_squad',
      'cold_calculation',
      'engineer',
      'progressive_science',
      'medic',
    ],
    enemyCardIds: [
      'ghost',
      'conjurer',
      'gargoyle',
      'dark_sapper',
      'old_wizard',
      'parasite',
      'abnormal_lightning',
      'ball_lightning',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_anti_tech', 'ds_shadow_value', 'ds_plague_wipe'],
    mapPosition: { x: 51, y: 50 },
  },
  {
    id: 11,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Кровавый склеп',
    subtitle:
      'Элитный отряд нежити под предводительством Вампира и Некроманта.',
    enemyName: 'Свита Ночи',
    officerBriefing:
      'В склепе засели Вампир, Гаргулья, Бешеные псы, Призрак и Некромант, постоянно воскрешающий павших. Выбивайте Некроманта в первых раундах и подтягивайте Резервы!',
    preBattleDialogue: [
      officerLine(
        'Командир, перед нами Кровавый склеп — укреплённое логово Вампира, Призраков и Некроманта. Если оставить Некроманта в живых, он будет возвращать сильных тварей из сброса. Бейте точно и используйте Резервы!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'call_reserves',
      'engineer',
      'scientist',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'ghost',
      'conjurer',
      'gargoyle',
      'rabid_dogs',
      'necromancer',
      'zombie',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_blitz', 'ds_epidemic', 'ds_shadow_value'],
    mapPosition: { x: 37, y: 57 },
  },
  {
    id: 12,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Подземный бункер',
    subtitle:
      'Диверсанты Тьмы минируют тоннели под прикрытием молний и духов.',
    enemyName: 'Диверсанты Тьмы',
    officerBriefing:
      'В тоннелях бункера полно ловушек: Паразит, Подрывник, молнии, Вампир и Призрак. Артиллерист снова в строю — используйте его залп, когда враг выставит самые опасные карты!',
    preBattleDialogue: [
      officerLine(
        'Командир, нужно зачистить подземный бункер от диверсантов Тьмы. У противника сразу две молнии, Подрывник, Вампир и Призраки. Мы выделили Артиллериста и Прогрессивную науку — проломите их оборону!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'seer',
      'war_machines',
      'sniper',
      'army',
      'drone_squad',
      'engineer',
      'progressive_science',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'ghost',
      'conjurer',
      'dark_sapper',
      'parasite',
      'rabid_dogs',
      'necromancer',
      'old_wizard',
      'abnormal_lightning',
      'ball_lightning',
      'plague',
    ],
    preferredBotSchemes: ['ds_anti_tech', 'ds_shadow_value', 'ds_blitz'],
    mapPosition: { x: 23, y: 49 },
  },
  {
    id: 13,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Долина пепла',
    subtitle:
      'Двенадцать отборных карт Тьмы держат перевал к центральной цитадели.',
    enemyName: 'Огненный культ',
    officerBriefing:
      'Мы подобрались к Долине пепла — враг выставил 12 карт без слабых мест. Сочетайте Боевую церковь, Священника, Боевые машины и Резервы, чтобы переиграть культистов по темпу.',
    preBattleDialogue: [
      officerLine(
        'Командир, Долина пепла — предпоследний заслон перед цитаделью Тьмы. Противник собрал 12 сильных карт: от Вампира и Гаргулий до Призраков, Заклинателя и Чумы. Наш сводный отряд из 12 карт готов к равному бою!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'prayer',
      'seer',
      'war_machines',
      'sniper',
      'army',
      'policeman',
      'call_reserves',
      'engineer',
      'scientist',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'ghost',
      'conjurer',
      'gargoyle',
      'rabid_dogs',
      'dark_sapper',
      'parasite',
      'necromancer',
      'old_wizard',
      'terrible_disease',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_epidemic', 'ds_shadow_value', 'ds_plague_wipe'],
    mapPosition: { x: 10, y: 41 },
  },
  {
    id: 14,
    side: 'resistance',
    actTitle: 'Глава III · Тени и Священная сталь',
    title: 'Преддверие Цитадели',
    subtitle:
      'Элитная гвардия Бездны охраняет подступы к логову самого Демона.',
    enemyName: 'Гвардия Бездны',
    officerBriefing:
      'За этими воротами чувствуется чудовищная энергия, но сначала нужно пробить Гвардию Бездны. Здесь 12 сильнейших карт врага — сохраняйте хладнокровие и берегите ключевых бойцов!',
    preBattleDialogue: [
      officerLine(
        'Командир, мы у самых ворот Цитадели. Датчики зашкаливают — впереди что-то куда страшнее вампиров, но путь преграждает Гвардия Бездны из 12 отборных карт. Прорвите этот рубеж!'
      ),
    ],
    playerCardIds: [
      'battle_church',
      'priest',
      'seer',
      'war_machines',
      'sniper',
      'army',
      'drone_squad',
      'call_reserves',
      'cold_calculation',
      'engineer',
      'evacuation',
      'medic',
    ],
    enemyCardIds: [
      'vampire',
      'ghost',
      'conjurer',
      'gargoyle',
      'rabid_dogs',
      'dark_sapper',
      'parasite',
      'necromancer',
      'old_wizard',
      'abnormal_lightning',
      'natural_disaster',
      'plague',
    ],
    preferredBotSchemes: ['ds_blitz', 'ds_anti_tech', 'ds_plague_wipe'],
    mapPosition: { x: 20, y: 26 },
  },

  // =========================================================================
  // ГЛАВА IV: ВТОРЖЕНИЕ ДЕМОНА И БОЕВЫЕ РОБОТЫ (Этапы 15–17) — Полный равный состав 17 vs 17!
  // =========================================================================
  {
    id: 15,
    side: 'resistance',
    actTitle: 'Глава IV · Вторжение Демона',
    title: 'Пробуждение Демона',
    subtitle:
      'Сам Демон выходит на поле боя! На подмогу прибывают тяжёлые Боевые роботы.',
    enemyName: 'Легион Демона',
    officerBriefing:
      'Мы раньше никогда не встречались с такой силой, командир. Сейчас подойдут боевые роботы, будьте осторожнее! Берегите роботов от Скрытого вируса и молний!',
    preBattleDialogue: [
      demonLine(
        'Глупцы, вы пришли ко мне сами, ха-ха-ха. Готовьтесь примкнуть к рядам мертвецов!'
      ),
      officerLine(
        'Мы раньше никогда не встречались с такой силой, командир. Сейчас подойдут боевые роботы, будьте осторожнее!',
        { tone: 'warning' }
      ),
    ],
    playerCardIds: ALL_RESISTANCE_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    preferredBotSchemes: ['ds_demon_push', 'ds_shadow_value', 'ds_blitz'],
    mapPosition: { x: 33, y: 31 },
    specialNote:
      'Первое появление Демона и Боевых роботов! Полные колоды (17 против 17). Боевые роботы и Артиллерист уничтожают Демона, Боевая церковь его блокирует.',
    milestoneTag: 'demon',
  },
  {
    id: 16,
    side: 'resistance',
    actTitle: 'Глава IV · Вторжение Демона',
    title: 'Железный штурм',
    subtitle:
      'Полномасштабное столкновение армий: враг охотится за нашими Боевыми роботами.',
    enemyName: 'Грозовой фронт Тьмы',
    officerBriefing:
      'Демон бросил вперёд антитехнические отряды — Скрытый вирус, Подрывника и обе молнии. Прикрывайте Боевых роботов Инженером и Эвакуацией, пока пехота и церковь давят фланг!',
    preBattleDialogue: [
      officerLine(
        'Командир, силы Тьмы перегруппировались после первого удара наших роботов. В этом секторе враг делает ставку на Скрытый вирус, молнии и Подрывника, пытаясь лишить нас техники. В бой идут полные составы!'
      ),
    ],
    playerCardIds: ALL_RESISTANCE_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    preferredBotSchemes: ['ds_anti_tech', 'ds_demon_push', 'ds_plague_wipe'],
    mapPosition: { x: 46, y: 21 },
  },
  {
    id: 17,
    side: 'resistance',
    actTitle: 'Глава IV · Вторжение Демона',
    title: 'Бастион проклятых',
    subtitle:
      'Последнее крупное укрепление Тьмы перед самим Разломом Бездны.',
    enemyName: 'Стражи Разлома',
    officerBriefing:
      'За этим бастионом лежит сам Разлом! Враг применяет эпидемии, призраков и мощь Демона в полную силу. Прорвите линию полным составом Сопротивления!',
    preBattleDialogue: [
      officerLine(
        'Командир, перед нами Бастион проклятых — последний рубеж перед Разломом. Стражи бросают в бой весь арсенал: Демона, Чуму, Призраков и Некроманта. Сокрушите их полным составом Сопротивления!'
      ),
    ],
    playerCardIds: ALL_RESISTANCE_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    preferredBotSchemes: ['ds_epidemic', 'ds_demon_push', 'ds_shadow_value'],
    mapPosition: { x: 59, y: 28 },
  },

  // =========================================================================
  // ГЛАВА V: ШТУРМ РАЗЛОМА (Этапы 18–20) — Ограниченный отряд (12 карт) против всей орды Тьмы!
  // =========================================================================
  {
    id: 18,
    side: 'resistance',
    actTitle: 'Глава V · Штурм Разлома',
    title: 'Тропа к Разлому',
    subtitle:
      'Скрытный прорыв в меньшинстве: 12 бойцов без роботов против всей орды Тьмы.',
    enemyName: 'Дозор Разлома',
    officerBriefing:
      'Командир, мы подошли к разлому — двигаемся аккуратно, чтобы застать их врасплох! Наш отряд ограничен 12 картами без роботов, а врагов намного больше. Полагайтесь на Артиллериста и Боевую церковь!',
    preBattleDialogue: [
      officerLine(
        'Командир, Сопротивление вплотную подошло к разлому. Здесь нельзя идти напролом — нужно двигаться предельно аккуратно, чтобы застать силы тьмы врасплох. Поэтому наш отряд ограничен 12 картами, а тяжёлые боевые роботы остались позади.',
        { tone: 'warning' }
      ),
      officerLine(
        'Противник значительно превосходит нас числом, и среди них может оказаться Демон. Но с нами Артиллерист, Боевая церковь, Снайпер и Медик — бейте точно, берегите каждого бойца, и мы победим даже в меньшинстве!'
      ),
    ],
    playerCardIds: RIFT_STEALTH_12_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    preferredBotSchemes: ['ds_shadow_value', 'ds_blitz', 'ds_anti_tech'],
    mapPosition: { x: 71, y: 19 },
    specialNote:
      'Бой в меньшинстве (12 против 17, без Боевых роботов). Артиллерист (инициатива 104) уничтожает Демона и всю линию, а Боевая церковь (105) блокирует его.',
    milestoneTag: 'stealth',
  },
  {
    id: 19,
    side: 'resistance',
    actTitle: 'Глава V · Штурм Разлома',
    title: 'Край Бездны',
    subtitle:
      'Последний тихий бросок к ядру Разлома под огнём Демона и всей нежити.',
    enemyName: 'Гвардия Разлома',
    officerBriefing:
      'Мы почти у цели, командир! Продолжаем скрытный манёвр отрядом из 12 карт без роботов. Выманите одноразовые заклинания врага под щит Инженера и накройте Демона Артиллеристом!',
    preBattleDialogue: [
      officerLine(
        'Командир, мы на самом краю бездны. Скрытность всё ещё жизненно важна — боевые роботы пока не могут подойти, поэтому снова идём ограниченной группой из 12 карт против полной армии Тьмы.',
        { tone: 'warning' }
      ),
      officerLine(
        'Перехватите их засаду Снайпером и Инженером, возвращайте раненых Медиком и Эвакуацией, а Артиллериста приберегите для самого Демона!'
      ),
    ],
    playerCardIds: RIFT_STEALTH_12_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    firstRoundBotCardIds: ['vampire', 'gargoyle', 'parasite'],
    preferredBotSchemes: ['ds_demon_push', 'ds_plague_wipe', 'ds_epidemic'],
    mapPosition: { x: 82, y: 27 },
    specialNote:
      'Бой в меньшинстве (12 против 17, без Боевых роботов). Противник начинает засадой: Вампир, Гаргулья и Паразит.',
    milestoneTag: 'stealth',
  },
  {
    id: 20,
    side: 'resistance',
    actTitle: 'Глава V · Штурм Разлома',
    title: 'Врата Бездны',
    subtitle:
      'Решающая битва у самого Разлома: Боевые роботы прорвались к ударному отряду!',
    enemyName: 'Повелитель Разлома',
    officerBriefing:
      'Скрываться больше не нужно, командир! К нашему отряду из 12 лучших карт прорвались Боевые роботы! Сокрушите Демона и закройте Разлом навсегда!',
    preBattleDialogue: [
      demonLine(
        'Вы осмелились дойти до самих Врат Бездны?! Жалкая горстка смертных! Здесь ваша надежда обратится в пепел!'
      ),
      officerLine(
        'Командир, мы застали их у самого ядра разлома, и на помощь нашему ударному отряду из 12 карт наконец прорвались Боевые роботы! Всё решается сейчас — уничтожьте Демона и спасите человечество!',
        { tone: 'resistance' }
      ),
    ],
    playerCardIds: RIFT_FINALE_12_IDS,
    enemyCardIds: ALL_DARK_SIDE_IDS,
    firstRoundBotCardIds: ['demon', 'vampire', 'old_wizard'],
    preferredBotSchemes: ['ds_demon_push', 'ds_anti_tech', 'ds_plague_wipe'],
    mapPosition: { x: 91, y: 15 },
    specialNote:
      'Финальный штурм (12 против 17, с Боевыми роботами и Артиллеристом!). В первом раунде Демон лично выходит с Вампиром и Старым колдуном.',
    milestoneTag: 'boss',
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
    hasSeenResistancePrologue: false,
  };

  if (typeof window === 'undefined') return empty;

  try {
    const raw = localStorage.getItem(CAMPAIGN_PROGRESS_STORAGE_KEY);
    if (!raw) return empty;
    const parsed = JSON.parse(raw);
    const resistance = Array.isArray(parsed?.completedStages?.resistance)
      ? parsed.completedStages.resistance.filter(
          (n: unknown) => typeof n === 'number'
        )
      : [];
    const darkSide = Array.isArray(parsed?.completedStages?.dark_side)
      ? parsed.completedStages.dark_side.filter(
          (n: unknown) => typeof n === 'number'
        )
      : [];
    return {
      completedStages: {
        resistance,
        dark_side: darkSide,
      },
      hasSeenResistancePrologue: Boolean(parsed?.hasSeenResistancePrologue),
    };
  } catch {
    return empty;
  }
}

export function saveCampaignProgress(progress: CampaignProgress): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(
      CAMPAIGN_PROGRESS_STORAGE_KEY,
      JSON.stringify(progress)
    );
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
