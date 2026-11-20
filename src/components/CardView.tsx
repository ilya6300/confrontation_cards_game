import React from 'react';
import { CardDefinition } from '../types/game';
import { getCardById } from '../data/cards';
import {
  Shield,
  ZapOff,
  Ban,
  Skull,
  LogOut,
  ArrowDown,
  Eye,
  ChevronUp,
  ChevronDown,
  RotateCcw,
} from 'lucide-react';
import { RESISTANCE_CARD_BACK, DARK_SIDE_CARD_BACK } from '../data/cardBacks';

export interface CombatCallout {
  key: string;
  text: string;
  tone: 'danger' | 'shield' | 'debuff' | 'revive' | 'info';
}

interface CardViewProps {
  card: CardDefinition;
  isFaceDown?: boolean;
  isFlippingReveal?: boolean;
  flipDelayMs?: number;
  isSelected?: boolean;
  isDestroyed?: boolean;
  isDisabled?: boolean;
  isCancelled?: boolean;
  isEvacuated?: boolean;
  isCurrentActor?: boolean;
  turnDirection?: 'up' | 'down';
  turnOrderNumber?: number;
  isTurnCompleted?: boolean;
  roundEndFate?: 'survive' | 'discard' | 'evacuated';
  activeAnimationClass?: string;
  activeAnimationStyle?: React.CSSProperties;
  isImpactTarget?: boolean;
  isShieldTarget?: boolean;
  combatCallout?: CombatCallout;
  isRevealed?: boolean;
  isInspected?: boolean;
  currentRank?: number;
  currentInitiative?: number;
  protectedAgainst?: string[];
  onClick?: () => void;
  onContextMenu?: (e: React.MouseEvent) => void;
  onQuickInspect?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hand' | 'hand_compact' | 'battle';
  showDetailsTooltip?: boolean;
  className?: string;
}

const THREAT_SHORT: Record<string, string> = {
  magic: 'Закл.',
  virus: 'Вирус',
  technology: 'Техн.',
  incorporeal: 'Беспл.',
  creature: 'Сущ.',
};

const THREAT_FULL: Record<string, string> = {
  magic: 'Защита от заклинаний',
  virus: 'Защита от вируса',
  technology: 'Защита от техники',
  incorporeal: 'Защита от бесплотных',
  creature: 'Защита от существ',
};

const CALLOUT_STYLES: Record<CombatCallout['tone'], string> = {
  danger: 'bg-[#2a0c10]/95 border-[#ef5350] text-[#ffd6d4] shadow-[0_0_16px_rgba(239,68,68,0.65)]',
  shield: 'bg-[#0b252e]/95 border-[#5fd0e3] text-[#d6f8ff] shadow-[0_0_16px_rgba(56,189,248,0.6)]',
  debuff: 'bg-[#29172e]/95 border-[#c06ee8] text-[#f2dbff] shadow-[0_0_16px_rgba(168,85,247,0.6)]',
  revive: 'bg-[#0c2618]/95 border-[#4ade80] text-[#dcfce7] shadow-[0_0_16px_rgba(34,197,94,0.6)]',
  info: 'bg-[#18212b]/95 border-[#7fb6cc] text-[#e5f3f8] shadow-[0_0_14px_rgba(125,211,252,0.5)]',
};

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isFlippingReveal = false,
  flipDelayMs = 0,
  isSelected = false,
  isDestroyed = false,
  isDisabled = false,
  isCancelled = false,
  isEvacuated = false,
  isCurrentActor = false,
  turnDirection,
  turnOrderNumber,
  isTurnCompleted = false,
  roundEndFate,
  activeAnimationClass = '',
  activeAnimationStyle,
  isImpactTarget = false,
  isShieldTarget = false,
  combatCallout,
  isRevealed = false,
  isInspected = false,
  currentRank,
  protectedAgainst = [],
  onClick,
  onContextMenu,
  onQuickInspect,
  onMouseEnter,
  onMouseLeave,
  size = 'md',
  className = '',
}) => {
  const displayRank = currentRank !== undefined ? currentRank : card.rank;
  const isRankReduced = currentRank !== undefined && currentRank < card.rank;
  const isResistance = card.side === 'resistance';
  const backImg = isResistance ? RESISTANCE_CARD_BACK : DARK_SIDE_CARD_BACK;
  const frontImage = getCardById(card.id)?.image ?? card.image;

  // Unified height-driven responsive sizing; exact 811/1142 aspect ratio for BOTH fronts and backs (zero jump on flip)
  const heightVarClasses: Record<NonNullable<CardViewProps['size']>, string> = {
    sm: '[--card-h:196px] sm:[--card-h:224px]',
    md: '[--card-h:236px] sm:[--card-h:272px]',
    lg: '[--card-h:310px] sm:[--card-h:360px]',
    hand: '[--card-h:clamp(138px,22.5dvh,176px)] sm:[--card-h:clamp(182px,28dvh,258px)] lg:[--card-h:clamp(200px,30dvh,290px)]',
    hand_compact:
      '[--card-h:clamp(98px,14.5dvh,124px)] sm:[--card-h:clamp(104px,14dvh,160px)]',
    battle:
      '[--card-h:clamp(124px,19.5dvh,152px)] sm:[--card-h:clamp(148px,21.5dvh,244px)]',
  };

  const sizeHeightVar = heightVarClasses[size];
  const cardDimClass = `${sizeHeightVar} h-[var(--card-h)] w-[calc(var(--card-h)*811/1142)]`;

  // Face-down card back (seamless edge-to-edge armor matching exact front aspect ratio & silhouette)
  if (isFaceDown && !isRevealed) {
    return (
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative ${cardDimClass} shrink-0 select-none cursor-pointer transition-transform duration-200 ease-out rounded-[10px] sm:rounded-[12px] overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.85)] ${
          isInspected
            ? 'z-50 -translate-y-4 scale-105'
            : isSelected
            ? 'ring-2 ring-[#69c9d6] scale-105 z-30 -translate-y-2'
            : 'hover:z-40 hover:-translate-y-1.5 hover:scale-[1.03]'
        } ${className}`}
      >
        <img
          src={backImg}
          alt={isResistance ? 'Рубашка Сопротивления' : 'Рубашка Тёмной стороны'}
          referrerPolicy="no-referrer"
          className="absolute inset-0 w-full h-full object-cover block pointer-events-none select-none"
          draggable={false}
        />
        <span
          aria-hidden="true"
          className={`pointer-events-none absolute inset-0 rounded-[10px] sm:rounded-[12px] ring-1 ring-inset ${
            isResistance ? 'ring-[#7dcbe0]/35' : 'ring-[#b8464c]/40'
          }`}
        />
        {isSelected && (
          <div className="absolute top-1.5 left-1.5 btn-chamfer-sm bg-[#21636b] border border-[#8bd8e2] text-[#effbfc] font-bold w-5 h-5 flex items-center justify-center text-[11px] shadow-md z-30">
            ✓
          </div>
        )}
      </div>
    );
  }

  const isActivelyAnimating = Boolean(activeAnimationClass);
  const hitAnimationClass = !isActivelyAnimating && isDestroyed ? 'animate-card-hit' : '';

  const roundFateDropShadow =
    roundEndFate === 'survive'
      ? 'drop-shadow-[0_0_16px_rgba(74,222,128,0.45)]'
      : roundEndFate === 'discard'
      ? 'opacity-70 saturate-50'
      : '';

  const stateHighlightClass = isActivelyAnimating
    ? `z-50 drop-shadow-[0_18px_30px_rgba(0,0,0,0.94)] ${activeAnimationClass}`
    : isCurrentActor
    ? isResistance
      ? 'z-30 -translate-y-1.5 scale-[1.05] drop-shadow-[0_0_20px_rgba(103,194,222,0.92)]'
      : 'z-30 -translate-y-1.5 scale-[1.05] drop-shadow-[0_0_20px_rgba(232,84,65,0.92)]'
    : isInspected
    ? 'z-50 scale-[1.1] drop-shadow-[0_18px_28px_rgba(0,0,0,0.92)]'
    : isSelected
    ? 'z-30 scale-[1.04] drop-shadow-[0_0_16px_rgba(92,199,212,0.9)]'
    : size === 'battle'
    ? `hover:z-40 hover:scale-[1.08] drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)] ${roundFateDropShadow}`
    : 'hover:z-40 hover:scale-[1.05] drop-shadow-[0_8px_16px_rgba(0,0,0,0.82)]';

  const hasShield = protectedAgainst.length > 0 && !isDestroyed && !isEvacuated;

  const frontFaceContent = (
    <>
      {/* Full-Card PNG Artwork (native aspect ratio preserved without distortion) */}
      <img
        src={frontImage}
        alt={card.name}
        referrerPolicy="no-referrer"
        draggable={false}
        className={`absolute inset-0 w-full h-full object-contain block pointer-events-none select-none transition-[filter,opacity] duration-200 ${
          isDestroyed || isEvacuated
            ? 'opacity-55 grayscale-[78%] contrast-90'
            : isTurnCompleted && !isCurrentActor && !roundEndFate && size === 'battle'
            ? 'brightness-[0.86]'
            : ''
        }`}
      />

      {/* Subtle Brushed Metallic Sheen on Hover (hand / catalog / battle cards) */}
      {!isDestroyed && !isEvacuated && (
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2%] rounded-[9px] overflow-hidden z-10"
        >
          <span className="absolute inset-0 -translate-x-[130%] group-hover/card:translate-x-[130%] transition-transform duration-500 ease-out bg-gradient-to-r from-transparent via-white/14 to-transparent skew-x-[-20deg]" />
        </span>
      )}

      {/* Protective Energy Perimeter Glow when Shielded */}
      {hasShield && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[1px] rounded-[11px] ring-2 ring-[#5ed2e6]/80 shadow-[inset_0_0_16px_rgba(94,210,230,0.28),0_0_14px_rgba(94,210,230,0.45)] z-15"
        />
      )}

      {/* EMP Interference Overlay when Disabled */}
      {isDisabled && !isDestroyed && !isEvacuated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] rounded-[10px] z-15 opacity-55"
          style={{
            backgroundImage:
              'repeating-linear-gradient(0deg, rgba(234,136,58,0.16) 0px, rgba(234,136,58,0.16) 2px, transparent 2px, transparent 6px)',
            boxShadow: 'inset 0 0 18px rgba(234, 136, 58, 0.35)',
          }}
        />
      )}

      {/* Arcane Seal Shimmer when Cancelled */}
      {isCancelled && !isDestroyed && !isEvacuated && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-[2px] rounded-[10px] z-15 ring-1 ring-inset ring-[#c472eb]/70 shadow-[inset_0_0_20px_rgba(168,85,247,0.35)]"
        />
      )}

      {/* Live Reduced Rank Indicator (recessed glowing LED override) */}
      {isRankReduced && (
        <div
          title={`Текущий ранг снижен: ${displayRank} (базовый ${card.rank})`}
          className="absolute top-[3.5%] left-[5%] z-30 flex items-center justify-center gap-0.5 rounded-[3px] led-readout border-[#ff5247] font-led font-extrabold px-1.5 py-0.5 text-[10px] sm:text-xs shadow-[0_0_12px_rgba(255,59,48,0.85)] pointer-events-none"
        >
          <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
          <span className="tabular-nums">{displayRank}</span>
        </div>
      )}

      {/* Battle Initiative Order Badge (#1..#6) */}
      {turnOrderNumber !== undefined && size === 'battle' && (
        <div
          title={`Порядок хода в бою: #${turnOrderNumber}`}
          className={`pointer-events-none absolute -top-2 -left-2 z-40 w-5 h-5 sm:w-6 sm:h-6 btn-chamfer-sm flex items-center justify-center font-led font-extrabold text-[10px] sm:text-[11px] tabular-nums shadow-[0_4px_10px_rgba(0,0,0,0.9)] border ${
            isCurrentActor
              ? isResistance
                ? 'bg-[#174657] border-[#8ce2fa] text-[#effcff]'
                : 'bg-[#5c161c] border-[#ff897a] text-[#fff1ef]'
              : isDestroyed || isEvacuated
              ? 'bg-[#14171c] border-[#38404a] text-[#7c8591]'
              : isTurnCompleted
              ? 'bg-[#141a21] border-[#43505e] text-[#95a4b3]'
              : 'bg-[#10151c] border-[#5d6c7c] text-[#e6edf5]'
          }`}
        >
          {turnOrderNumber}
        </div>
      )}

      {/* Active Turn Direction Chevron pointing toward enemy line */}
      {isCurrentActor && turnDirection && !isActivelyAnimating && (
        <div
          aria-hidden="true"
          style={
            {
              '--arrow-dir': turnDirection === 'up' ? '-4px' : '4px',
            } as React.CSSProperties
          }
          className={`pointer-events-none absolute left-1/2 -translate-x-1/2 z-40 flex items-center justify-center animate-actor-arrow ${
            turnDirection === 'up' ? '-top-4 sm:-top-5' : '-bottom-4 sm:-bottom-5'
          }`}
        >
          <span
            className={`px-1.5 py-0.5 rounded-[3px] border flex items-center gap-0.5 text-[10px] font-display uppercase tracking-wider shadow-[0_4px_12px_rgba(0,0,0,0.9)] ${
              isResistance
                ? 'bg-[#0e2d38]/95 border-[#7cd6f0] text-[#c7f3ff]'
                : 'bg-[#361116]/95 border-[#f06e5e] text-[#ffdcd6]'
            }`}
          >
            {turnDirection === 'up' ? (
              <ChevronUp className="w-3.5 h-3.5 stroke-[2.75]" />
            ) : (
              <ChevronDown className="w-3.5 h-3.5 stroke-[2.75]" />
            )}
          </span>
        </div>
      )}

      {/* Non-Obstructive Right-Edge Tactical Status Rail (never covers bottom description text) */}
      {(protectedAgainst.length > 0 || isDisabled || isCancelled) &&
        !isDestroyed &&
        !isEvacuated && (
          <div className="absolute -right-1.5 top-[22%] flex flex-col gap-1 z-30 pointer-events-none">
            {protectedAgainst.map((threat, idx) => (
              <span
                key={`${threat}-${idx}`}
                title={THREAT_FULL[threat] ?? 'Защита'}
                className="bg-[#0b232b]/95 text-[#cdeef2] border border-[#5cb9c7] rounded-[3px] px-1 py-0.5 text-[9px] flex items-center gap-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.9)] font-semibold leading-none"
              >
                <Shield className="w-2.5 h-2.5 text-[#7ad4e2] shrink-0" />
                <span className="hidden sm:inline">{THREAT_SHORT[threat] ?? 'Щит'}</span>
              </span>
            ))}
            {isDisabled && (
              <span
                title="Карта отключена — пропустит ход"
                className="bg-[#29170d]/95 text-[#f7dec6] border border-[#e08241] rounded-[3px] px-1 py-0.5 text-[9px] flex items-center gap-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.9)] font-semibold leading-none"
              >
                <ZapOff className="w-2.5 h-2.5 text-[#f09a59] shrink-0" />
                <span className="hidden sm:inline">Откл.</span>
              </span>
            )}
            {isCancelled && (
              <span
                title="Способность заблокирована"
                className="bg-[#24112c]/95 text-[#efdcf7] border border-[#be6ce0] rounded-[3px] px-1 py-0.5 text-[9px] flex items-center gap-0.5 shadow-[0_3px_10px_rgba(0,0,0,0.9)] font-semibold leading-none"
              >
                <Ban className="w-2.5 h-2.5 text-[#d48bf2] shrink-0" />
                <span className="hidden sm:inline">Блок</span>
              </span>
            )}
          </div>
        )}

      {/* Quick Inspect Button (visible on hover in hand for 1-click staging mode) */}
      {onQuickInspect && (
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onQuickInspect();
          }}
          title="Подробный просмотр карты (или ПКМ)"
          aria-label={`Осмотреть карту ${card.name}`}
          className="opacity-0 group-hover/card:opacity-100 focus-visible:opacity-100 absolute top-1.5 right-1.5 z-40 w-6 h-6 btn-chamfer-sm bg-[#0f151c]/92 hover:bg-[#1b2e3a] border border-[#649fb5]/80 text-[#d8f1fa] flex items-center justify-center shadow-[0_4px_10px_rgba(0,0,0,0.9)] transition-opacity duration-150 cursor-pointer"
        >
          <Eye className="w-3.5 h-3.5" />
        </button>
      )}

      {/* Impact Slash Overlay when struck during combat */}
      {isImpactTarget && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <svg
            viewBox="0 0 120 120"
            className="w-24 h-24 sm:w-28 sm:h-28 animate-impact-slash drop-shadow-[0_0_14px_rgba(239,68,68,0.95)]"
          >
            <path d="M14 98 L106 18 L92 40 L26 106 Z" fill="#ef4444" opacity="0.92" />
            <path d="M22 92 L98 24" stroke="#fef08a" strokeWidth="4" strokeLinecap="round" />
            <circle cx="60" cy="60" r="34" fill="none" stroke="#f87171" strokeWidth="3" opacity="0.7" />
          </svg>
        </div>
      )}

      {/* Shield Pulse Overlay when protected */}
      {isShieldTarget && (
        <div className="absolute inset-0.5 rounded-xl border-2 border-[#6dd0e0] bg-[#5bc4d6]/20 pointer-events-none z-40 animate-shield-pulse" />
      )}

      {/* Floating Combat Callout Label (-1 РАНГ / ЗАЩИТА / БЛОК / УНИЧТОЖЕН / ВОСКРЕШЁН) */}
      {combatCallout && (
        <div
          key={combatCallout.key}
          className={`pointer-events-none absolute -top-3 left-1/2 z-[60] px-2.5 py-0.5 rounded-[4px] border font-display text-[11px] sm:text-xs font-bold uppercase tracking-[0.08em] whitespace-nowrap animate-combat-callout ${CALLOUT_STYLES[combatCallout.tone]}`}
        >
          {combatCallout.text}
        </div>
      )}

      {/* Round-End Fate Mini Tag (surviving card returning to hand vs single-use going to discard) */}
      {roundEndFate === 'survive' && !isDestroyed && !isEvacuated && (
        <div className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-2 py-[2px] rounded-[3px] bg-[#0c2418]/95 border border-[#4ade80]/80 text-[#bbf7d0] font-display text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shadow-md flex items-center gap-1">
          <RotateCcw className="w-2.5 h-2.5" />
          <span>В руку</span>
        </div>
      )}
      {roundEndFate === 'discard' && !isDestroyed && !isEvacuated && (
        <div className="pointer-events-none absolute -bottom-2 left-1/2 -translate-x-1/2 z-30 px-2 py-[2px] rounded-[3px] bg-[#241514]/95 border border-[#c96f55]/80 text-[#f5d4c9] font-display text-[10px] font-semibold uppercase tracking-[0.06em] whitespace-nowrap shadow-md">
          В сброс
        </div>
      )}

      {/* Destroyed Industrial Stencil Stamp */}
      {isDestroyed && (
        <div className="absolute inset-0 bg-[#090708]/58 backdrop-blur-[1px] rounded-[11px] flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="border-2 border-[#c9383b] bg-[#1d0a0c]/95 text-[#f4c0bc] font-display font-bold uppercase tracking-[0.12em] px-2.5 py-1 rotate-[-12deg] text-[10px] sm:text-xs shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center gap-1">
            <Skull className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#eb5757]" />
            Уничтожено
          </div>
        </div>
      )}

      {/* Evacuated Tactical Stencil Stamp */}
      {!isDestroyed && isEvacuated && (
        <div className="absolute inset-0 bg-[#080d12]/58 backdrop-blur-[1px] rounded-[11px] flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="border-2 border-[#5cb9d6] bg-[#0d1f29]/95 text-[#d4f2fb] font-display font-bold uppercase tracking-[0.12em] px-2.5 py-1 rotate-[-12deg] text-[10px] sm:text-xs shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center gap-1">
            <LogOut className="w-3.5 h-3.5 text-[#7cd0eb]" />
            Эвакуация
          </div>
        </div>
      )}

      {/* Tactical Selection Checkmark Badge */}
      {isSelected && (
        <div className="absolute -top-2 -left-2 btn-chamfer-sm bg-gradient-to-b from-[#2f7d87] to-[#17424a] text-[#effbfc] font-bold w-6 h-6 flex items-center justify-center text-xs shadow-[0_4px_12px_rgba(0,0,0,0.85)] border border-[#8ad8e3] z-40">
          ✓
        </div>
      )}
    </>
  );

  // 3D Flip Reveal Wrapper when transitioning from face-down ready cards to revealed battle cards
  if (isFlippingReveal) {
    return (
      <div
        onClick={onClick}
        onContextMenu={onContextMenu}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        style={activeAnimationStyle}
        className={`group/card card-perspective relative ${cardDimClass} shrink-0 select-none cursor-pointer overflow-visible ${stateHighlightClass} ${className}`}
      >
        <div
          style={{ animationDelay: `${flipDelayMs}ms` }}
          className="relative w-full h-full card-flip-inner animate-card-flip-reveal"
        >
          {/* Front side */}
          <div className="absolute inset-0 card-face-hidden">
            {frontFaceContent}
          </div>
          {/* Back side (rotated 180deg, visible during first half of flip) */}
          <div
            style={{ transform: 'rotateY(180deg)' }}
            className="absolute inset-0 card-face-hidden rounded-[10px] sm:rounded-[12px] overflow-hidden shadow-[0_12px_24px_rgba(0,0,0,0.85)]"
          >
            <img
              src={backImg}
              alt=""
              referrerPolicy="no-referrer"
              className="w-full h-full object-cover block pointer-events-none select-none"
              draggable={false}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      onClick={onClick}
      onContextMenu={onContextMenu}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={activeAnimationStyle}
      className={`group/card relative ${cardDimClass} shrink-0 select-none cursor-pointer transition-transform duration-200 ease-out overflow-visible ${stateHighlightClass} ${hitAnimationClass} ${className}`}
    >
      {frontFaceContent}
    </div>
  );
};
