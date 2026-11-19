import React from 'react';
import { CardDefinition } from '../types/game';
import { getCardById } from '../data/cards';
import { Shield, ZapOff, Ban, Skull, LogOut, ArrowDown } from 'lucide-react';
import humanBackCard from '../assets/human_back_card.png';
import darkBackCard from '../assets/dark_back_card.png';

interface CardViewProps {
  card: CardDefinition;
  isFaceDown?: boolean;
  isSelected?: boolean;
  isDestroyed?: boolean;
  isDisabled?: boolean;
  isCancelled?: boolean;
  isEvacuated?: boolean;
  isCurrentActor?: boolean;
  turnDirection?: 'up' | 'down';
  activeAnimationClass?: string;
  activeAnimationStyle?: React.CSSProperties;
  isImpactTarget?: boolean;
  isShieldTarget?: boolean;
  isRevealed?: boolean;
  isInspected?: boolean;
  currentRank?: number;
  currentInitiative?: number;
  protectedAgainst?: string[];
  onClick?: () => void;
  onMouseEnter?: () => void;
  onMouseLeave?: () => void;
  size?: 'sm' | 'md' | 'lg' | 'hand' | 'hand_compact' | 'battle';
  showDetailsTooltip?: boolean;
  className?: string;
}

export const CardView: React.FC<CardViewProps> = ({
  card,
  isFaceDown = false,
  isSelected = false,
  isDestroyed = false,
  isDisabled = false,
  isCancelled = false,
  isEvacuated = false,
  isCurrentActor = false,
  activeAnimationClass = '',
  activeAnimationStyle,
  isImpactTarget = false,
  isShieldTarget = false,
  isRevealed = false,
  isInspected = false,
  currentRank,
  protectedAgainst = [],
  onClick,
  onMouseEnter,
  onMouseLeave,
  size = 'md',
  className = '',
}) => {
  const displayRank = currentRank !== undefined ? currentRank : card.rank;
  const isRankReduced = currentRank !== undefined && currentRank < card.rank;
  const isResistance = card.side === 'resistance';

  // Height-driven responsive sizing; width is derived via exact ratio calc() so proportions are never distorted
  const heightVarClasses: Record<NonNullable<CardViewProps['size']>, string> = {
    sm: '[--card-h:196px] sm:[--card-h:224px]',
    md: '[--card-h:230px] sm:[--card-h:260px]',
    lg: '[--card-h:310px] sm:[--card-h:360px]',
    hand: '[--card-h:clamp(136px,22dvh,172px)] sm:[--card-h:clamp(180px,28dvh,256px)] lg:[--card-h:clamp(200px,30dvh,290px)]',
    hand_compact:
      '[--card-h:clamp(100px,15dvh,128px)] sm:[--card-h:clamp(106px,14.5dvh,168px)]',
    battle:
      '[--card-h:clamp(128px,20.5dvh,156px)] sm:[--card-h:clamp(152px,22.5dvh,256px)]',
  };

  const sizeHeightVar = heightVarClasses[size];

  // Face-down card back (native aspect ratio 768x1122, zero cropping or stretching)
  if (isFaceDown && !isRevealed) {
    const backImg = isResistance ? humanBackCard : darkBackCard;
    return (
      <div
        onClick={onClick}
        onMouseEnter={onMouseEnter}
        onMouseLeave={onMouseLeave}
        className={`relative ${sizeHeightVar} h-[var(--card-h)] w-[calc(var(--card-h)*768/1122)] shrink-0 select-none cursor-pointer transition-transform duration-200 ease-out rounded-xl overflow-hidden border ${
          isResistance
            ? 'border-[#5a6c7a]/65 shadow-[0_10px_22px_rgba(0,0,0,0.78)]'
            : 'border-[#542228]/80 shadow-[0_10px_24px_rgba(0,0,0,0.88)]'
        } ${
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
          className="absolute inset-0 w-full h-full object-contain block pointer-events-none select-none"
          draggable={false}
        />
        {isSelected && (
          <div className="absolute top-1.5 left-1.5 btn-chamfer-sm bg-[#21636b] border border-[#8bd8e2] text-[#effbfc] font-bold w-5 h-5 flex items-center justify-center text-[11px] shadow-md z-30">
            ✓
          </div>
        )}
      </div>
    );
  }

  // Resolve front artwork from live ALL_CARDS first (ensures saved localStorage sessions always get valid URLs)
  const frontImage = getCardById(card.id)?.image ?? card.image;
  const isActivelyAnimating = Boolean(activeAnimationClass);
  const hitAnimationClass = !isActivelyAnimating && isDestroyed ? 'animate-card-hit' : '';

  const stateHighlightClass = isActivelyAnimating
    ? `z-50 drop-shadow-[0_18px_28px_rgba(0,0,0,0.92)] ${activeAnimationClass}`
    : isCurrentActor
    ? isResistance
      ? 'z-30 -translate-y-1.5 scale-[1.04] drop-shadow-[0_0_18px_rgba(103,194,222,0.85)]'
      : 'z-30 -translate-y-1.5 scale-[1.04] drop-shadow-[0_0_18px_rgba(229,77,56,0.88)]'
    : isInspected
    ? 'z-50 scale-[1.12] drop-shadow-[0_18px_28px_rgba(0,0,0,0.92)]'
    : isSelected
    ? 'z-30 scale-[1.04] drop-shadow-[0_0_16px_rgba(92,199,212,0.9)]'
    : size === 'battle'
    ? 'hover:z-40 hover:scale-[1.12] drop-shadow-[0_10px_18px_rgba(0,0,0,0.85)]'
    : 'hover:z-40 hover:scale-[1.06] drop-shadow-[0_8px_16px_rgba(0,0,0,0.82)]';

  return (
    <div
      onClick={onClick}
      onMouseEnter={onMouseEnter}
      onMouseLeave={onMouseLeave}
      style={activeAnimationStyle}
      className={`relative ${sizeHeightVar} h-[var(--card-h)] w-[calc(var(--card-h)*811/1142)] shrink-0 select-none cursor-pointer transition-transform duration-200 ease-out overflow-visible ${stateHighlightClass} ${hitAnimationClass} ${className}`}
    >
      {/* Full-Card PNG Artwork (native aspect ratio preserved without distortion) */}
      <img
        src={frontImage}
        alt={card.name}
        referrerPolicy="no-referrer"
        draggable={false}
        className={`absolute inset-0 w-full h-full object-contain block pointer-events-none select-none transition-[filter,opacity] duration-200 ${
          isDestroyed || isEvacuated ? 'opacity-55 grayscale-[75%] contrast-90' : ''
        }`}
      />

      {/* Live Reduced Rank Indicator (styled as a recessed glowing LED override) */}
      {isRankReduced && (
        <div
          title={`Текущий ранг снижен: ${displayRank} (базовый ${card.rank})`}
          className="absolute top-[3.5%] left-[5%] z-30 flex items-center justify-center gap-0.5 rounded-[3px] led-readout border-[#ff5247] font-led font-extrabold px-1.5 py-0.5 text-[10px] sm:text-xs shadow-[0_0_12px_rgba(255,59,48,0.8)] pointer-events-none"
        >
          <ArrowDown className="w-2.5 h-2.5 sm:w-3 sm:h-3 stroke-[3]" />
          <span className="tabular-nums">{displayRank}</span>
        </div>
      )}

      {/* Impact Slash Overlay when struck during combat */}
      {isImpactTarget && (
        <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-50">
          <svg
            viewBox="0 0 120 120"
            className="w-28 h-28 animate-impact-slash drop-shadow-[0_0_14px_rgba(239,68,68,0.95)]"
          >
            <path
              d="M14 98 L106 18 L92 40 L26 106 Z"
              fill="#ef4444"
              opacity="0.95"
            />
            <path
              d="M22 92 L98 24"
              stroke="#fef08a"
              strokeWidth="4"
              strokeLinecap="round"
            />
            <circle cx="60" cy="60" r="36" fill="none" stroke="#f87171" strokeWidth="3" opacity="0.7" />
          </svg>
        </div>
      )}

      {/* Shield Pulse Overlay when protected */}
      {isShieldTarget && (
        <div className="absolute inset-0.5 rounded-xl border-2 border-[#6dd0e0] bg-[#5bc4d6]/20 pointer-events-none z-40 animate-shield-pulse" />
      )}

      {/* Combat Status Indicators (Shield, Disabled, Cancelled) */}
      {(protectedAgainst.length > 0 || isDisabled || isCancelled) && (
        <div className="absolute inset-x-1.5 bottom-1.5 flex flex-wrap gap-1 justify-center z-20 pointer-events-none">
          {protectedAgainst.map((threat, idx) => (
            <span
              key={idx}
              className="bg-[#0e2228]/95 text-[#cdeef2] border border-[#5cb9c7] rounded-[3px] px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 shadow-md font-semibold uppercase tracking-wide"
            >
              <Shield className="w-2.5 h-2.5 text-[#7ad4e2]" />
              {threat === 'magic'
                ? 'Закл'
                : threat === 'virus'
                ? 'Вирус'
                : threat === 'technology'
                ? 'Техн'
                : threat === 'incorporeal'
                ? 'Беспл'
                : 'Сущ'}
            </span>
          ))}
          {isDisabled && (
            <span className="bg-[#271810]/95 text-[#f0d5be] border border-[#d67a3e] rounded-[3px] px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 shadow-md font-semibold uppercase tracking-wide">
              <ZapOff className="w-2.5 h-2.5 text-[#e89458]" />
              Откл
            </span>
          )}
          {isCancelled && (
            <span className="bg-[#221229]/95 text-[#ead5f2] border border-[#b464d6] rounded-[3px] px-1.5 py-0.5 text-[9px] flex items-center gap-0.5 shadow-md font-semibold uppercase tracking-wide">
              <Ban className="w-2.5 h-2.5 text-[#cc82eb]" />
              Блок
            </span>
          )}
        </div>
      )}

      {/* Destroyed Industrial Stencil Stamp */}
      {isDestroyed && (
        <div className="absolute inset-0 bg-[#090708]/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="border-2 border-[#c9383b] bg-[#1d0a0c]/95 text-[#f0b4b0] font-display font-bold uppercase tracking-[0.14em] px-2.5 py-1 rotate-[-12deg] text-[10px] sm:text-xs shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center gap-1">
            <Skull className="w-3.5 h-3.5 sm:w-4 sm:h-4 text-[#eb5757]" />
            Уничтожено
          </div>
        </div>
      )}

      {/* Evacuated Tactical Stencil Stamp */}
      {!isDestroyed && isEvacuated && (
        <div className="absolute inset-0 bg-[#080d12]/60 backdrop-blur-[1px] rounded-xl flex flex-col items-center justify-center z-30 pointer-events-none">
          <div className="border-2 border-[#5cb9d6] bg-[#0d1f29]/95 text-[#cdeef8] font-display font-bold uppercase tracking-[0.14em] px-2.5 py-1 rotate-[-12deg] text-[10px] sm:text-xs shadow-[0_6px_18px_rgba(0,0,0,0.9)] flex items-center gap-1">
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
    </div>
  );
};
