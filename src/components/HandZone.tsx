import React, { useState, useEffect, useRef, useMemo } from 'react';
import { CardDefinition, CardSide, CardType } from '../types/game';
import { getCardById } from '../data/cards';
import { CardView } from './CardView';
import { GameButton } from './GameButton';
import { LedCounter } from './TacticalChrome';
import { Skull, Eye, ArrowUpDown } from 'lucide-react';
import { RESISTANCE_CARD_BACK, DARK_SIDE_CARD_BACK } from '../data/cardBacks';
import { sound } from '../utils/sound';

interface HandZoneProps {
  cards: CardDefinition[];
  selectedCardIds: string[];
  isSelectable: boolean;
  onToggleSelect?: (card: CardDefinition) => void;
  onInspectCard: (card: CardDefinition) => void;
  playerName: string;
  playerSide: CardSide;
  discardCount: number;
  discardCards?: CardDefinition[];
  onOpenDiscard: () => void;
  isBot?: boolean;
  isOpponent?: boolean;
  isCompactBattle?: boolean;
  hideSelectedFromFan?: boolean;
}

type HandSortMode = 'default' | 'initiative' | 'rank';

const FILTER_LABELS: Record<CardType | 'all', string> = {
  all: 'Все',
  creature: 'Сущ.',
  technology: 'Техн.',
  incorporeal: 'Беспл.',
  magic: 'Закл.',
  virus: 'Вирус',
};

export const HandZone: React.FC<HandZoneProps> = ({
  cards,
  selectedCardIds,
  isSelectable,
  onToggleSelect,
  onInspectCard,
  playerName,
  playerSide,
  discardCount,
  discardCards = [],
  onOpenDiscard,
  isBot = false,
  isOpponent = false,
  isCompactBattle = false,
  hideSelectedFromFan = false,
}) => {
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
  const [typeFilter, setTypeFilter] = useState<CardType | 'all'>('all');
  const [sortMode, setSortMode] = useState<HandSortMode>('default');
  const fanContainerRef = useRef<HTMLDivElement>(null);
  const [containerWidth, setContainerWidth] = useState<number>(960);
  const [viewportSize, setViewportSize] = useState<{ width: number; height: number }>({
    width: typeof window !== 'undefined' ? window.innerWidth : 1024,
    height: typeof window !== 'undefined' ? window.innerHeight : 768,
  });

  useEffect(() => {
    const el = fanContainerRef.current;
    if (!el) return;

    const updateSize = () => {
      setContainerWidth(el.clientWidth);
      setViewportSize({
        width: window.innerWidth,
        height: window.innerHeight,
      });
    };

    updateSize();

    const observer = new ResizeObserver(() => {
      updateSize();
    });
    observer.observe(el);
    window.addEventListener('resize', updateSize);

    return () => {
      observer.disconnect();
      window.removeEventListener('resize', updateSize);
    };
  }, []);

  // Reset filter if filtered group becomes empty
  const availableTypes = useMemo(() => {
    const order: CardType[] = ['creature', 'technology', 'incorporeal', 'magic', 'virus'];
    const present = new Set(cards.map((c) => c.type));
    return order.filter((t) => present.has(t));
  }, [cards]);

  useEffect(() => {
    if (typeFilter !== 'all' && !availableTypes.includes(typeFilter)) {
      setTypeFilter('all');
    }
  }, [typeFilter, availableTypes]);

  const isResistance = playerSide === 'resistance';
  const viewportWidth = viewportSize.width;
  const viewportHeight = viewportSize.height;

  const handleCardClick = (card: CardDefinition) => {
    if (isOpponent) return;
    setInspectedCardId(null);
    if (isSelectable && onToggleSelect) {
      onToggleSelect(card);
    } else {
      onInspectCard(card);
    }
  };

  const handleCardContextMenu = (e: React.MouseEvent, card: CardDefinition) => {
    if (isOpponent) return;
    e.preventDefault();
    setInspectedCardId(null);
    onInspectCard(card);
  };

  // Match actual rendered proportional CardView width (exact 811/1142 for both front & back)
  const getCardWidth = () => {
    const clampVal = (min: number, val: number, max: number) =>
      Math.max(min, Math.min(max, val));
    const CARD_RATIO = 811 / 1142;

    if (isOpponent) {
      const h = isCompactBattle
        ? viewportWidth >= 640
          ? 70
          : 54
        : viewportWidth >= 640
        ? 88
        : 64;
      return Math.round(h * CARD_RATIO);
    }

    if (isCompactBattle) {
      const h =
        viewportWidth >= 640
          ? clampVal(104, viewportHeight * 0.14, 160)
          : clampVal(98, viewportHeight * 0.145, 124);
      return Math.round(h * CARD_RATIO);
    }

    const h =
      viewportWidth >= 1024
        ? clampVal(200, viewportHeight * 0.3, 290)
        : viewportWidth >= 640
        ? clampVal(182, viewportHeight * 0.28, 258)
        : clampVal(138, viewportHeight * 0.225, 176);
    return Math.round(h * CARD_RATIO);
  };

  const fanCards = useMemo(() => {
    const base =
      !isOpponent && hideSelectedFromFan
        ? cards.filter((c) => !selectedCardIds.includes(c.id))
        : cards;

    if (isOpponent) return base;

    const filtered =
      typeFilter === 'all' ? base : base.filter((c) => c.type === typeFilter);

    if (sortMode === 'initiative') {
      return [...filtered].sort((a, b) =>
        b.initiative !== a.initiative ? b.initiative - a.initiative : b.rank - a.rank
      );
    }
    if (sortMode === 'rank') {
      return [...filtered].sort((a, b) =>
        b.rank !== a.rank ? b.rank - a.rank : b.initiative - a.initiative
      );
    }
    return filtered;
  }, [cards, selectedCardIds, isOpponent, hideSelectedFromFan, typeFilter, sortMode]);

  const cardWidth = getCardWidth();
  const total = fanCards.length;
  const usableWidth = Math.max(200, containerWidth - 28);
  const inspectedIndex = inspectedCardId
    ? fanCards.findIndex((c) => c.id === inspectedCardId)
    : -1;

  // Dynamic horizontal step so ALL cards fit cleanly inside viewport width without horizontal scroll
  const getStepMarginPx = (index: number): number => {
    if (index === 0 || total <= 1) return 0;

    const maxFittingStep = (usableWidth - 16 - cardWidth) / (total - 1);
    const desiredStep = isOpponent
      ? cardWidth * 0.72
      : total <= 3
      ? cardWidth + 10
      : total <= 5
      ? cardWidth * 0.88
      : cardWidth * 0.76;

    const actualStep = Math.max(14, Math.min(desiredStep, maxFittingStep));
    return Math.round(actualStep - cardWidth);
  };

  // Curved parabolic arc fan + neighbor-push fisheye spread on hover when cards overlap
  const getFanTransform = (index: number, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 'translate3d(0, -18px, 0) rotate(0deg)';
    }

    const half = (total - 1) / 2;
    const t = total > 1 && half > 0 ? (index - half) / half : 0;
    const maxAngle = isOpponent ? 7 : total >= 9 ? 11 : total >= 5 ? 8 : 4;
    const maxDrop = isOpponent ? 7 : total >= 8 ? 16 : total >= 4 ? 9 : 3;

    const angle = total <= 1 ? 0 : Number((t * maxAngle).toFixed(2));
    const arcY = total <= 1 ? 0 : Math.round(t * t * maxDrop);

    // Neighbor-push spread when hovering a card in a crowded player hand
    let pushX = 0;
    if (!isOpponent && inspectedIndex >= 0 && inspectedIndex !== index && total >= 5) {
      const dist = Math.abs(index - inspectedIndex);
      const basePush = viewportWidth >= 640 ? 34 : 18;
      const decay = dist === 1 ? 1 : dist === 2 ? 0.58 : 0.32;
      pushX = Math.round(basePush * decay) * (index < inspectedIndex ? -1 : 1);
    }

    if (isOpponent) {
      return `translate3d(0, ${-arcY}px, 0) rotate(${-angle}deg)`;
    }
    return `translate3d(${pushX}px, ${arcY}px, 0) rotate(${angle}deg)`;
  };

  const inspectedCard = inspectedCardId
    ? cards.find((c) => c.id === inspectedCardId)
    : undefined;

  const lastDiscardedCard =
    discardCards.length > 0 ? discardCards[discardCards.length - 1] : undefined;
  const lastDiscardedImg = lastDiscardedCard
    ? getCardById(lastDiscardedCard.id)?.image ?? lastDiscardedCard.image
    : undefined;

  const topFactionHairline = isResistance
    ? 'bg-gradient-to-r from-transparent via-[#67c2de]/70 to-transparent'
    : 'bg-gradient-to-r from-transparent via-[#df5a47]/70 to-transparent';

  const cycleSort = () => {
    sound.playUiClick();
    setSortMode((prev) =>
      prev === 'default' ? 'initiative' : prev === 'initiative' ? 'rank' : 'default'
    );
  };

  const sortLabel =
    sortMode === 'initiative' ? '⚡ Иниц.' : sortMode === 'rank' ? 'Ранг' : 'Порядок';

  const renderLossesButton = () => (
    <GameButton
      variant="secondary"
      size="xs"
      onClick={onOpenDiscard}
      title="Открыть список выбывших карт (сброс)"
    >
      {lastDiscardedImg ? (
        <span className="w-3.5 h-4 rounded-[2px] overflow-hidden border border-[#d66a60]/70 shrink-0">
          <img
            src={lastDiscardedImg}
            alt=""
            referrerPolicy="no-referrer"
            className="w-full h-full object-cover object-[50%_38%] scale-[1.55]"
          />
        </span>
      ) : (
        <Skull className="w-3.5 h-3.5 text-[#e36b62]" />
      )}
      <span>Потери: {discardCount}</span>
    </GameButton>
  );

  // OPPONENT COMPACT TOP HAND (classic CCG peeking card backs, exact 811/1142 aspect)
  if (isOpponent) {
    const backImg = isResistance ? RESISTANCE_CARD_BACK : DARK_SIDE_CARD_BACK;
    return (
      <div className="w-full shrink-0 flex flex-col items-center overflow-visible">
        <div className="relative w-full steel-bar rounded-[4px] flex items-center justify-between gap-2 px-3 py-1.5 text-xs overflow-hidden">
          <span
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] ${topFactionHairline}`}
          />
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-semibold uppercase tracking-[0.06em] text-[#f0e7da] truncate">
              {playerName}
            </span>
            {isBot && (
              <span className="text-[11px] font-led text-[#99a5b3] shrink-0">· ИИ</span>
            )}
          </div>

          <div className="flex items-center gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-[#c5cfd9]">
              <span className="hidden sm:inline text-xs font-medium">В руке</span>
              <LedCounter value={cards.length} size="xs" minDigits={2} />
            </div>
            {renderLossesButton()}
          </div>
        </div>

        {/* Peeking Card Backs */}
        <div
          ref={fanContainerRef}
          className={`w-full overflow-hidden flex items-start justify-center px-2 ${
            isCompactBattle ? 'h-[30px] sm:h-[38px]' : 'h-[36px] sm:h-[52px]'
          }`}
        >
          <div className="flex items-start justify-center -mt-3 sm:-mt-5">
            {cards.map((card, idx) => {
              const marginLeftPx = getStepMarginPx(idx);
              return (
                <div
                  key={card.id}
                  style={{
                    zIndex: idx + 1,
                    marginLeft: idx === 0 ? 0 : `${marginLeftPx}px`,
                    transform: getFanTransform(idx, false),
                    transformOrigin: 'top center',
                  }}
                  className={`relative ${
                    isCompactBattle
                      ? '[--back-h:54px] sm:[--back-h:70px]'
                      : '[--back-h:64px] sm:[--back-h:88px]'
                  } h-[var(--back-h)] w-[calc(var(--back-h)*811/1142)] rounded-[7px] shadow-[0_8px_18px_rgba(0,0,0,0.85)] overflow-hidden shrink-0`}
                >
                  <img
                    src={backImg}
                    alt="Карта противника"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-cover block pointer-events-none select-none"
                    draggable={false}
                  />
                  <span
                    aria-hidden="true"
                    className={`pointer-events-none absolute inset-0 rounded-[7px] ring-1 ring-inset ${
                      isResistance ? 'ring-[#7dcbe0]/35' : 'ring-[#b8464c]/40'
                    }`}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  const showToolbarFilters = !isCompactBattle && cards.length > 4;

  // ACTIVE PLAYER BOTTOM HAND (Seamless over battlefield, 1-click staging + fisheye spread)
  return (
    <div className="w-full shrink-0 relative overflow-visible flex flex-col">
      {/* Slim Non-Shifting Card Quick-View Strip docked right above hand status bar */}
      {inspectedCard && (
        <div className="pointer-events-none absolute -top-9 left-1/2 -translate-x-1/2 z-50 max-w-[94vw] sm:max-w-2xl px-3 py-1 rounded-[4px] bg-[#10151c]/95 border border-[#3d4a59] shadow-[0_8px_24px_rgba(0,0,0,0.9)] flex items-center gap-2 text-xs text-[#e3d9ca] whitespace-nowrap overflow-hidden">
          <Eye className="w-3.5 h-3.5 text-[#7ccce6] shrink-0" />
          <span className="font-display font-semibold uppercase tracking-[0.05em] text-[#f5ede0] shrink-0">
            {inspectedCard.name}
          </span>
          <span className="font-led text-[11px] text-[#ff665c] font-bold shrink-0 tabular-nums">
            Р:{inspectedCard.rank} · ⚡{inspectedCard.initiative}
          </span>
          <span className="text-[#bcc6d1] truncate hidden sm:inline">
            {inspectedCard.description}
          </span>
          {isSelectable && (
            <span className="hidden md:inline text-[11px] text-[#7ccce6] shrink-0">
              · ЛКМ: в бой · ПКМ: осмотр
            </span>
          )}
        </div>
      )}

      {/* Slim Brushed Steel Player Status Bar + Optional Hand Filters */}
      <div className="relative steel-bar rounded-[4px] flex flex-wrap sm:flex-nowrap items-center justify-between gap-2 px-3 py-1.5 text-xs shrink-0 overflow-hidden">
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-x-0 top-0 h-[1.5px] ${topFactionHairline}`}
        />

        <div className="flex items-center gap-2.5 min-w-0">
          <span className="font-display font-semibold uppercase tracking-[0.06em] text-[#f0e7da] truncate">
            {playerName}
          </span>
          {hideSelectedFromFan && selectedCardIds.length > 0 && (
            <span className="text-xs text-[#8fd9ef] font-medium whitespace-nowrap">
              · В слотах: {selectedCardIds.length}
            </span>
          )}
        </div>

        {/* Interactive Hand Filter & Sort Controls (during selection phase with >4 cards) */}
        {showToolbarFilters && (
          <div className="hidden md:flex items-center gap-1 bg-[#0b0e13]/90 border border-[#2a333d] rounded-[4px] p-0.5 shrink-0">
            <button
              type="button"
              onClick={() => {
                sound.playUiClick();
                setTypeFilter('all');
              }}
              className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                typeFilter === 'all'
                  ? isResistance
                    ? 'bg-[#1a3946] text-[#eef9fc]'
                    : 'bg-[#3b181d] text-[#fcebe8]'
                  : 'text-[#9aa6b3] hover:text-[#e6edf5]'
              }`}
            >
              Все
            </button>
            {availableTypes.map((typeKey) => (
              <button
                key={typeKey}
                type="button"
                onClick={() => {
                  sound.playUiClick();
                  setTypeFilter(typeKey);
                }}
                className={`px-2 py-0.5 rounded-[3px] text-[11px] font-medium transition-colors cursor-pointer whitespace-nowrap ${
                  typeFilter === typeKey
                    ? isResistance
                      ? 'bg-[#1a3946] text-[#eef9fc]'
                      : 'bg-[#3b181d] text-[#fcebe8]'
                    : 'text-[#9aa6b3] hover:text-[#e6edf5]'
                }`}
              >
                {FILTER_LABELS[typeKey]}
              </button>
            ))}
            <span aria-hidden="true" className="w-px h-3.5 bg-[#2f3944] mx-0.5" />
            <button
              type="button"
              onClick={cycleSort}
              title="Переключить сортировку карт в руке"
              className="px-2 py-0.5 rounded-[3px] text-[11px] font-medium text-[#c5d0dc] hover:text-white hover:bg-[#1b222c] transition-colors cursor-pointer flex items-center gap-1 whitespace-nowrap"
            >
              <ArrowUpDown className="w-3 h-3 text-[#7ccce6]" />
              <span>{sortLabel}</span>
            </button>
          </div>
        )}

        <div className="flex items-center gap-2.5 shrink-0">
          <div className="flex items-center gap-1.5 text-[#c5cfd9]">
            <span className="hidden sm:inline text-xs font-medium">В руке</span>
            <LedCounter value={cards.length} size="xs" minDigits={2} />
          </div>
          {renderLossesButton()}
        </div>
      </div>

      {/* Adaptive Curved Card Fan Container (Fits 100% of cards on screen, fisheye spread on hover) */}
      <div
        ref={fanContainerRef}
        className={`w-full overflow-visible px-1 ${
          isCompactBattle ? 'pt-1.5 pb-1' : 'pt-3.5 pb-2.5 sm:pt-4 sm:pb-3.5'
        }`}
      >
        {fanCards.length === 0 && hideSelectedFromFan && selectedCardIds.length > 0 && typeFilter === 'all' ? (
          <div className="h-[88px] sm:h-[112px] flex items-center justify-center">
            <span className="px-3.5 py-1.5 rounded-[4px] steel-recessed text-xs font-medium text-[#a9c2cf]">
              Все доступные карты выставлены к бою
            </span>
          </div>
        ) : fanCards.length === 0 ? (
          <div className="h-[88px] sm:h-[112px] flex items-center justify-center gap-2">
            <span className="text-xs text-[#9aa6b3]">
              В выбранной категории нет оставшихся карт
            </span>
            <button
              type="button"
              onClick={() => setTypeFilter('all')}
              className="text-xs font-medium text-[#7ccce6] hover:underline cursor-pointer"
            >
              Показать все
            </button>
          </div>
        ) : (
          <div className="flex items-center justify-center w-full overflow-visible">
            {fanCards.map((card, idx) => {
              const isSelected = selectedCardIds.includes(card.id);
              const isInspected = inspectedCardId === card.id;
              const marginLeftPx = getStepMarginPx(idx);
              const isHighlighted = isInspected || isSelected;

              const zIndex = isInspected ? 50 : isSelected ? 40 : idx + 1;

              return (
                <div
                  key={card.id}
                  style={{
                    zIndex,
                    marginLeft: idx === 0 ? 0 : `${marginLeftPx}px`,
                    transform: getFanTransform(idx, isHighlighted),
                    transformOrigin: 'bottom center',
                  }}
                  className="relative transition-transform duration-200 ease-out shrink-0"
                  onMouseEnter={() => {
                    if (inspectedCardId !== card.id) {
                      sound.playCardHover();
                    }
                    setInspectedCardId(card.id);
                  }}
                  onMouseLeave={() => {
                    if (inspectedCardId === card.id) {
                      setInspectedCardId(null);
                    }
                  }}
                >
                  <CardView
                    card={card}
                    size={isCompactBattle ? 'hand_compact' : 'hand'}
                    isFaceDown={false}
                    isRevealed={true}
                    isSelected={isSelected}
                    isInspected={isInspected}
                    onClick={() => handleCardClick(card)}
                    onContextMenu={(e) => handleCardContextMenu(e, card)}
                    onQuickInspect={
                      isSelectable ? () => onInspectCard(card) : undefined
                    }
                  />
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
