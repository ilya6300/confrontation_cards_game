import React, { useState, useEffect, useRef } from 'react';
import { CardDefinition, CardSide } from '../types/game';
import { CardView } from './CardView';
import { GameButton } from './GameButton';
import { LedCounter } from './TacticalChrome';
import { Trash2, Eye } from 'lucide-react';
import humanBackCard from '../assets/human_back_card.png';
import darkBackCard from '../assets/dark_back_card.png';

interface HandZoneProps {
  cards: CardDefinition[];
  selectedCardIds: string[];
  isSelectable: boolean;
  onInspectCard: (card: CardDefinition) => void;
  playerName: string;
  playerSide: CardSide;
  discardCount: number;
  onOpenDiscard: () => void;
  isBot?: boolean;
  isOpponent?: boolean;
  isCompactBattle?: boolean;
}

export const HandZone: React.FC<HandZoneProps> = ({
  cards,
  selectedCardIds,
  onInspectCard,
  playerName,
  playerSide,
  discardCount,
  onOpenDiscard,
  isBot = false,
  isOpponent = false,
  isCompactBattle = false,
}) => {
  const [inspectedCardId, setInspectedCardId] = useState<string | null>(null);
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

  const isResistance = playerSide === 'resistance';
  const viewportWidth = viewportSize.width;
  const viewportHeight = viewportSize.height;

  const handleCardClick = (card: CardDefinition) => {
    if (isOpponent) {
      return;
    }
    setInspectedCardId(null);
    onInspectCard(card);
  };

  // Match actual rendered proportional CardView width per mode & viewport dimensions
  const getCardWidth = () => {
    const clampVal = (min: number, val: number, max: number) =>
      Math.max(min, Math.min(max, val));
    const FRONT_RATIO = 811 / 1142;
    const BACK_RATIO = 768 / 1122;

    if (isOpponent) {
      const h = isCompactBattle
        ? viewportWidth >= 640
          ? 74
          : 58
        : viewportWidth >= 640
        ? 92
        : 66;
      return Math.round(h * BACK_RATIO);
    }

    if (isCompactBattle) {
      const h =
        viewportWidth >= 640
          ? clampVal(106, viewportHeight * 0.145, 168)
          : clampVal(100, viewportHeight * 0.15, 128);
      return Math.round(h * FRONT_RATIO);
    }

    const h =
      viewportWidth >= 1024
        ? clampVal(200, viewportHeight * 0.3, 290)
        : viewportWidth >= 640
        ? clampVal(180, viewportHeight * 0.28, 256)
        : clampVal(136, viewportHeight * 0.22, 172);
    return Math.round(h * FRONT_RATIO);
  };

  const cardWidth = getCardWidth();
  const total = cards.length;
  const usableWidth = Math.max(200, containerWidth - 20);

  // Compute dynamic horizontal step so ALL cards in hand fit within viewport width without horizontal scroll
  const getStepMarginPx = (index: number): number => {
    if (index === 0 || total <= 1) return 0;

    const maxFittingStep = (usableWidth - 16 - cardWidth) / (total - 1);
    const desiredStep = isOpponent
      ? cardWidth * 0.72
      : total <= 3
      ? cardWidth + 8
      : total <= 5
      ? cardWidth * 0.88
      : cardWidth * 0.76;

    const actualStep = Math.max(12, Math.min(desiredStep, maxFittingStep));
    return Math.round(actualStep - cardWidth);
  };

  // Curved parabolic arc fan
  const getFanTransform = (index: number, isHighlighted: boolean) => {
    if (isHighlighted) {
      return 'translateY(-16px) rotate(0deg)';
    }

    if (total <= 1) return 'none';

    const half = (total - 1) / 2;
    const t = half > 0 ? (index - half) / half : 0; // [-1 .. +1]
    const maxAngle = isOpponent
      ? 8
      : total >= 9
      ? 12
      : total >= 5
      ? 9
      : 5;
    const maxDrop = isOpponent
      ? 8
      : total >= 8
      ? 18
      : total >= 4
      ? 10
      : 4;

    const angle = Number((t * maxAngle).toFixed(2));
    const arcY = Math.round(t * t * maxDrop);

    if (isOpponent) {
      return `translateY(${-arcY}px) rotate(${-angle}deg)`;
    }
    return `translateY(${arcY}px) rotate(${angle}deg)`;
  };

  const inspectedCard = inspectedCardId
    ? cards.find((c) => c.id === inspectedCardId)
    : undefined;

  const statusBarAccent = isResistance
    ? 'border-l-[3px] border-l-[#67c2de]'
    : 'border-l-[3px] border-l-[#d94b3b]';

  // OPPONENT COMPACT TOP HAND (classic CCG peeking card backs, no boxed frame)
  if (isOpponent) {
    const backImg = isResistance ? humanBackCard : darkBackCard;
    return (
      <div className="w-full shrink-0 flex flex-col items-center overflow-visible">
        <div
          className={`w-full steel-bar rounded-[4px] ${statusBarAccent} flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs`}
        >
          <div className="flex items-center gap-2 min-w-0">
            <span className="font-display font-semibold uppercase tracking-[0.07em] text-[#ece2d3] truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
              {playerName}
            </span>
            {isBot && (
              <span className="text-[10px] font-led text-[#8e9aa7] shrink-0 uppercase">
                · ИИ
              </span>
            )}
          </div>

          <div className="flex items-center gap-2 sm:gap-2.5 shrink-0">
            <div className="flex items-center gap-1.5 text-[#b7c0ca]">
              <span className="hidden xs:inline sm:inline text-[11px] uppercase tracking-wider font-display">
                Рука
              </span>
              <LedCounter value={cards.length} size="xs" minDigits={2} />
            </div>
            <GameButton variant="secondary" size="xs" onClick={onOpenDiscard}>
              <Trash2 className="w-3 h-3 text-[#e3655b]" />
              <span>Сброс: {discardCount}</span>
            </GameButton>
          </div>
        </div>

        {/* Peeking Card Backs (native 768x1122 proportions preserved) */}
        <div
          ref={fanContainerRef}
          className={`w-full overflow-hidden flex items-start justify-center px-2 ${
            isCompactBattle ? 'h-[34px] sm:h-[44px]' : 'h-[40px] sm:h-[58px]'
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
                      ? '[--back-h:58px] sm:[--back-h:74px]'
                      : '[--back-h:66px] sm:[--back-h:92px]'
                  } h-[var(--back-h)] w-[calc(var(--back-h)*768/1122)] rounded-lg border ${
                    isResistance ? 'border-[#5a6b78]/65' : 'border-[#4d2026]/80'
                  } shadow-[0_8px_18px_rgba(0,0,0,0.8)] overflow-hidden shrink-0`}
                >
                  <img
                    src={backImg}
                    alt="Карта противника"
                    referrerPolicy="no-referrer"
                    className="absolute inset-0 w-full h-full object-contain block pointer-events-none select-none"
                    draggable={false}
                  />
                </div>
              );
            })}
          </div>
        </div>
      </div>
    );
  }

  // ACTIVE PLAYER BOTTOM HAND (Seamless over battlefield, zero boxed zone)
  return (
    <div className="w-full shrink-0 relative overflow-visible flex flex-col">
      {/* Floating Non-Shifting Card Quick-View Tactical Strip on hover */}
      {inspectedCard && (
        <div className="pointer-events-none absolute -top-11 left-1/2 -translate-x-1/2 z-50 max-w-[92vw] sm:max-w-xl px-3 py-1 rounded-[4px] steel-bar flex items-center gap-2 text-[11px] text-[#ded3c3] whitespace-nowrap overflow-hidden">
          <Eye className="w-3.5 h-3.5 text-[#7ccce6] shrink-0" />
          <span className="font-display font-semibold uppercase tracking-[0.06em] text-[#f0e5d6] shrink-0">
            {inspectedCard.name}
          </span>
          <span className="led-readout font-led px-1.5 py-[1px] rounded-[2px] text-[10px] font-bold shrink-0">
            Р:{inspectedCard.rank} · ⚡{inspectedCard.initiative}
          </span>
          <span className="text-[#aeb7c2] truncate hidden sm:inline">
            {inspectedCard.description}
          </span>
        </div>
      )}

      {/* Slim Bolted Gunmetal Player Status Bar */}
      <div
        className={`steel-bar rounded-[4px] ${statusBarAccent} flex items-center justify-between gap-2 px-2.5 sm:px-3 py-1 text-[11px] sm:text-xs shrink-0`}
      >
        <div className="flex items-center gap-2 min-w-0">
          <span className="font-display font-semibold uppercase tracking-[0.07em] text-[#ece2d3] truncate drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
            {playerName}
          </span>
        </div>

        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <div className="flex items-center gap-1.5 text-[#b7c0ca]">
            <span className="hidden xs:inline sm:inline text-[11px] uppercase tracking-wider font-display">
              Рука
            </span>
            <LedCounter value={cards.length} size="xs" minDigits={2} />
          </div>
          <GameButton variant="secondary" size="xs" onClick={onOpenDiscard}>
            <Trash2 className="w-3 h-3 text-[#e3655b]" />
            <span>Сброс: {discardCount}</span>
          </GameButton>
        </div>
      </div>

      {/* Adaptive Curved Card Fan Container (Fits 100% of cards on screen) */}
      <div
        ref={fanContainerRef}
        className={`w-full overflow-visible px-1 ${
          isCompactBattle ? 'pt-2 pb-1' : 'pt-4 pb-3 sm:pt-5 sm:pb-4'
        }`}
      >
        <div className="flex items-center justify-center w-full overflow-visible">
          {cards.map((card, idx) => {
            const isSelected = selectedCardIds.includes(card.id);
            const isInspected = inspectedCardId === card.id;
            const marginLeftPx = getStepMarginPx(idx);
            const isHighlighted = isInspected || isSelected;

            const zIndex = isInspected
              ? 50
              : isSelected
              ? 40
              : idx + 1;

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
                onMouseEnter={() => setInspectedCardId(card.id)}
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
                />
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
};
