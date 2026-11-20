import React, { useMemo, useState } from 'react';
import { CardDefinition, CardSide, CardType } from '../types/game';
import { CARD_TYPE_NAMES, getAllCardsBySide } from '../data/cards';
import { CardView } from './CardView';
import { GameButton } from './GameButton';
import { AudioControlsButton } from './AudioControlsButton';
import { MenuBackground } from './MenuBackground';
import { LedCounter, RiftDivider } from './TacticalChrome';
import { sound } from '../utils/sound';
import {
  Shield,
  Skull,
  BookOpen,
  ArrowUpDown,
  Sparkles,
  Flame,
} from 'lucide-react';

type SortKey = 'initiative' | 'rank' | 'name';

interface CardsCatalogProps {
  onInspectCard: (card: CardDefinition, ownerLabel: string) => void;
  onBackToMenu: () => void;
  onOpenRules: () => void;
}

export const CardsCatalog: React.FC<CardsCatalogProps> = ({
  onInspectCard,
  onBackToMenu,
  onOpenRules,
}) => {
  const [activeSide, setActiveSide] = useState<CardSide>('resistance');
  const [selectedType, setSelectedType] = useState<CardType | 'all'>('all');
  const [sortBy, setSortBy] = useState<SortKey>('initiative');

  const resistanceCards = useMemo(() => getAllCardsBySide('resistance'), []);
  const darkSideCards = useMemo(() => getAllCardsBySide('dark_side'), []);

  const resistanceStartingCount = useMemo(
    () => resistanceCards.filter((c) => !c.isHiddenSpell).length,
    [resistanceCards]
  );
  const resistanceHiddenCount = resistanceCards.length - resistanceStartingCount;

  const darkSideStartingCount = useMemo(
    () => darkSideCards.filter((c) => !c.isHiddenSpell).length,
    [darkSideCards]
  );
  const darkSideHiddenCount = darkSideCards.length - darkSideStartingCount;

  const factionCards =
    activeSide === 'resistance' ? resistanceCards : darkSideCards;

  const availableTypes = useMemo(() => {
    const order: CardType[] = [
      'creature',
      'technology',
      'incorporeal',
      'magic',
      'virus',
    ];
    const present = new Set(factionCards.map((c) => c.type));
    return order.filter((t) => present.has(t));
  }, [factionCards]);

  const handleChangeSide = (side: CardSide) => {
    sound.playUiClick();
    setActiveSide(side);
    setSelectedType('all');
  };

  const displayedCards = useMemo(() => {
    const filtered =
      selectedType === 'all'
        ? factionCards
        : factionCards.filter((c) => c.type === selectedType);

    return [...filtered].sort((a, b) => {
      if (sortBy === 'initiative') {
        if (b.initiative !== a.initiative) return b.initiative - a.initiative;
        return b.rank - a.rank;
      }
      if (sortBy === 'rank') {
        if (b.rank !== a.rank) return b.rank - a.rank;
        return b.initiative - a.initiative;
      }
      return a.name.localeCompare(b.name, 'ru');
    });
  }, [factionCards, selectedType, sortBy]);

  const isResistance = activeSide === 'resistance';
  const factionTitle = isResistance ? 'Сопротивление' : 'Тёмная сторона';

  return (
    <div className="relative h-dvh w-screen overflow-hidden bg-[#090b0e] text-[#e6dac9] flex flex-col select-none">
      <MenuBackground tone="catalog" />

      {/* Slim Brushed-Steel Command Bar */}
      <header className="relative z-20 h-11 px-3 sm:px-4 steel-bar border-x-0 border-t-0 border-b-[#343d47] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 sm:gap-3 min-w-0">
          <GameButton variant="secondary" size="xs" onClick={onBackToMenu}>
            ← Меню
          </GameButton>
          <div className="h-4 w-px bg-[#38414b] shrink-0" />
          <h1 className="font-display text-xs sm:text-sm font-semibold text-[#efe5d7] uppercase tracking-[0.1em] truncate">
            Энциклопедия карт рас
          </h1>
        </div>

        <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
          <AudioControlsButton />
          <GameButton variant="secondary" size="xs" onClick={onOpenRules}>
            <BookOpen className="w-3.5 h-3.5 text-[#d9c9b4]" />
            <span className="hidden sm:inline">Правила</span>
          </GameButton>
        </div>
      </header>

      {/* Top Controls Deck: Faction Selector + Filters */}
      <div className="relative z-10 px-3 sm:px-6 pt-3 sm:pt-4 pb-2 shrink-0">
        <div className="max-w-7xl mx-auto space-y-2.5">
          {/* Faction Tabs */}
          <div className="grid grid-cols-2 gap-2.5 sm:gap-3 max-w-2xl mx-auto">
            <button
              type="button"
              onClick={() => handleChangeSide('resistance')}
              className="group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#74c6e0]/80"
            >
              <span
                className={`btn-chamfer-sm block p-[1.5px] bg-gradient-to-b transition-all ${
                  isResistance
                    ? 'from-[#94d9ef] via-[#438ea8] to-[#17323d]'
                    : 'from-[#56606c] via-[#343b43] to-[#15181d] group-hover:from-[#79bed6]/75 group-hover:to-[#1a2830]'
                }`}
              >
                <span
                  className={`btn-chamfer-sm flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 transition-colors ${
                    isResistance
                      ? 'bg-gradient-to-b from-[#1a333e] via-[#132229] to-[#0c1419] text-[#eef8fb]'
                      : 'bg-gradient-to-b from-[#1d2228] via-[#14181d] to-[#0e1014] text-[#9ea7b2] group-hover:text-[#e2d6c5]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Shield
                      className={`w-4 h-4 shrink-0 ${
                        isResistance ? 'text-[#84d2ea]' : 'text-[#6c7885]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-xs sm:text-sm uppercase tracking-[0.08em] truncate">
                        Сопротивление
                      </div>
                      <div className="text-[11px] text-[#a7bec9] truncate hidden sm:block">
                        Люди, техника, наука · {resistanceStartingCount} +{' '}
                        {resistanceHiddenCount} скрытые
                      </div>
                    </div>
                  </div>
                  <LedCounter value={resistanceCards.length} size="xs" />
                </span>
              </span>
            </button>

            <button
              type="button"
              onClick={() => handleChangeSide('dark_side')}
              className="group cursor-pointer text-left transition-transform duration-150 hover:-translate-y-[1px] active:scale-[0.99] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#df6d52]/80"
            >
              <span
                className={`btn-chamfer-sm block p-[1.5px] bg-gradient-to-b transition-all ${
                  !isResistance
                    ? 'from-[#e89179] via-[#9e312d] to-[#361013]'
                    : 'from-[#56606c] via-[#343b43] to-[#15181d] group-hover:from-[#c75447]/75 group-hover:to-[#291316]'
                }`}
              >
                <span
                  className={`btn-chamfer-sm flex items-center justify-between gap-2 px-3 sm:px-4 py-2.5 transition-colors ${
                    !isResistance
                      ? 'bg-gradient-to-b from-[#34161a] via-[#221014] to-[#140a0d] text-[#f9ebe6]'
                      : 'bg-gradient-to-b from-[#1d2228] via-[#14181d] to-[#0e1014] text-[#9ea7b2] group-hover:text-[#e2d6c5]'
                  }`}
                >
                  <div className="flex items-center gap-2 min-w-0">
                    <Skull
                      className={`w-4 h-4 shrink-0 ${
                        !isResistance ? 'text-[#eb6b54]' : 'text-[#6c7885]'
                      }`}
                    />
                    <div className="min-w-0">
                      <div className="font-display font-semibold text-xs sm:text-sm uppercase tracking-[0.08em] truncate">
                        Тёмная сторона
                      </div>
                      <div className="text-[11px] text-[#cba7a0] truncate hidden sm:block">
                        Нежить, магия, вирус · {darkSideStartingCount} +{' '}
                        {darkSideHiddenCount} скрытые
                      </div>
                    </div>
                  </div>
                  <LedCounter value={darkSideCards.length} size="xs" />
                </span>
              </span>
            </button>
          </div>

          {/* Filter & Sort Strip */}
          <div className="steel-recessed rounded-[4px] px-3 py-2 flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-1.5">
              <button
                type="button"
                onClick={() => setSelectedType('all')}
                className={`px-2.5 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer border ${
                  selectedType === 'all'
                    ? isResistance
                      ? 'bg-[#17333d] border-[#59b6cf] text-[#ebf9fc]'
                      : 'bg-[#33161a] border-[#c74e46] text-[#fcebe8]'
                    : 'bg-[#12161c] border-[#2e3640] text-[#a5b0bc] hover:text-[#e2d8ca] hover:border-[#4b5664]'
                }`}
              >
                Все ({factionCards.length})
              </button>
              {availableTypes.map((typeKey) => {
                const count = factionCards.filter((c) => c.type === typeKey).length;
                const isActive = selectedType === typeKey;
                return (
                  <button
                    key={typeKey}
                    type="button"
                    onClick={() => setSelectedType(typeKey)}
                    className={`px-2.5 py-1 rounded-[3px] text-xs font-medium transition-colors cursor-pointer border ${
                      isActive
                        ? isResistance
                          ? 'bg-[#17333d] border-[#59b6cf] text-[#ebf9fc]'
                          : 'bg-[#33161a] border-[#c74e46] text-[#fcebe8]'
                        : 'bg-[#12161c] border-[#2e3640] text-[#a5b0bc] hover:text-[#e2d8ca] hover:border-[#4b5664]'
                    }`}
                  >
                    {CARD_TYPE_NAMES[typeKey]} ({count})
                  </button>
                );
              })}
            </div>

            <div className="flex items-center gap-1.5 text-xs">
              <ArrowUpDown className="w-3.5 h-3.5 text-[#8a94a0] shrink-0" />
              <span className="text-[#99a5b2] hidden sm:inline">Сортировка:</span>
              {(
                [
                  { id: 'initiative', label: 'Инициатива' },
                  { id: 'rank', label: 'Ранг' },
                  { id: 'name', label: 'Имя' },
                ] as const
              ).map((opt) => (
                <button
                  key={opt.id}
                  type="button"
                  onClick={() => setSortBy(opt.id)}
                  className={`px-2 py-1 rounded-[3px] font-medium transition-colors cursor-pointer border ${
                    sortBy === opt.id
                      ? 'bg-[#222933] border-[#6a7785] text-[#f4eadc]'
                      : 'bg-[#11151a] border-[#282f38] text-[#95a0ac] hover:text-[#dad0c2]'
                  }`}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex items-center justify-between gap-3 px-0.5 text-xs text-[#aeb9c4]">
            <span>
              {isResistance
                ? `Арсенал Сопротивления: ${resistanceStartingCount} основных карт и ${resistanceHiddenCount} скрытые («Артиллерия» и «Резервы»).`
                : `Силы Тёмной стороны: ${darkSideStartingCount} основных карт и ${darkSideHiddenCount} скрытые («Бес» и «Злой дух», призываются Заклинателем).`}
            </span>
            <span className="hidden md:inline text-[#8d97a3] shrink-0">
              Клик по карте — подробный просмотр
            </span>
          </div>
        </div>
      </div>

      {/* Scrollable Clean Frameless Card Gallery (no card-inside-card double framing) */}
      <main className="relative z-10 flex-1 min-h-0 overflow-y-auto steel-scrollbar px-3 sm:px-6 pb-8 pt-1">
        <div className="max-w-7xl mx-auto">
          <RiftDivider className="mb-5 opacity-70" />

          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-x-4 gap-y-7 justify-items-center">
            {displayedCards.map((card) => (
              <div
                key={card.id}
                onClick={() => onInspectCard(card, factionTitle)}
                role="button"
                tabIndex={0}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    onInspectCard(card, factionTitle);
                  }
                }}
                className={`group flex flex-col items-center text-center cursor-pointer transition-transform duration-200 hover:-translate-y-1.5 focus-visible:outline-none focus-visible:ring-2 rounded-[10px] p-1 ${
                  isResistance
                    ? 'focus-visible:ring-[#74c6e0]/80'
                    : 'focus-visible:ring-[#df6d52]/80'
                }`}
              >
                <div
                  className={`transition-[filter] duration-200 ${
                    isResistance
                      ? 'group-hover:drop-shadow-[0_14px_24px_rgba(94,196,226,0.28)]'
                      : 'group-hover:drop-shadow-[0_14px_24px_rgba(226,84,68,0.3)]'
                  }`}
                >
                  <CardView card={card} size="md" />
                </div>

                {/* Clean Unboxed Metadata Directly Under Card */}
                <div className="mt-2.5 space-y-0.5 max-w-[210px]">
                  <h3 className="font-display text-sm sm:text-[15px] font-semibold uppercase tracking-[0.06em] text-[#f3eadc] group-hover:text-white transition-colors truncate">
                    {card.name}
                  </h3>
                  <div className="font-led text-[11px] text-[#a5b5c2] tabular-nums">
                    {CARD_TYPE_NAMES[card.type]} · Ранг {card.rank} · ⚡{card.initiative}
                  </div>

                  {(card.isHiddenSpell || card.isSingleUse) && (
                    <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-0.5 pt-0.5 text-[11px] font-medium">
                      {card.isHiddenSpell && (
                        <span className="inline-flex items-center gap-1 text-[#f0a573]">
                          <Sparkles className="w-3 h-3 shrink-0" />
                          <span>{card.hiddenSummonNote ?? 'Скрытая карта'}</span>
                        </span>
                      )}
                      {card.isSingleUse && (
                        <span className="inline-flex items-center gap-1 text-[#ef7c73]">
                          <Flame className="w-3 h-3 shrink-0" />
                          <span>Одноразовая</span>
                        </span>
                      )}
                    </div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </main>
    </div>
  );
};
