import React, { useEffect } from 'react';
import { CardDefinition, CardType } from '../types/game';
import { getCardById } from '../data/cards';
import { GameButton } from './GameButton';
import { CornerRivets, LedCounter } from './TacticalChrome';
import {
  Check,
  X,
  Shield,
  ZapOff,
  Ban,
  Skull,
  LogOut,
  ArrowDown,
} from 'lucide-react';

export interface InspectBattleStatus {
  currentRank: number;
  isDestroyed: boolean;
  isDisabled: boolean;
  isCancelled: boolean;
  isEvacuated?: boolean;
  protectedAgainst: CardType[];
}

export interface CardInspectModalState {
  card: CardDefinition;
  mode: 'hand_select' | 'inspect';
  ownerId?: 'player1' | 'player2';
  ownerLabel?: string;
  battleStatus?: InspectBattleStatus;
}

interface CardInspectModalProps {
  inspectState: CardInspectModalState | null;
  isSelected?: boolean;
  selectedCount?: number;
  maxSelectable?: number;
  onConfirmSelect?: () => void;
  onClose: () => void;
}

const THREAT_LABELS: Record<CardType, string> = {
  magic: 'Заклинаний',
  virus: 'Вируса',
  technology: 'Техники',
  incorporeal: 'Бесплотных',
  creature: 'Существ',
};

export const CardInspectModal: React.FC<CardInspectModalProps> = ({
  inspectState,
  isSelected = false,
  selectedCount = 0,
  maxSelectable = 3,
  onConfirmSelect,
  onClose,
}) => {
  useEffect(() => {
    if (!inspectState) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [inspectState, onClose]);

  if (!inspectState) return null;

  const { card, mode, ownerLabel, battleStatus } = inspectState;
  const frontImage = getCardById(card.id)?.image ?? card.image;
  const isHandSelect = mode === 'hand_select';
  const limitReached = !isSelected && selectedCount >= maxSelectable;
  const isRankReduced =
    battleStatus !== undefined && battleStatus.currentRank < card.rank;

  const hasBattleBadges = Boolean(
    battleStatus &&
      (isRankReduced ||
        battleStatus.protectedAgainst.length > 0 ||
        battleStatus.isDisabled ||
        battleStatus.isCancelled ||
        battleStatus.isDestroyed ||
        battleStatus.isEvacuated)
  );

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={card.name}
      onClick={onClose}
      className="fixed inset-0 z-[60] bg-[#06080b]/90 backdrop-blur-md flex flex-col items-center justify-center p-3 sm:p-5 gap-3 sm:gap-4"
    >
      {/* Top-right Quick Close Button */}
      <div className="fixed top-3 right-3 sm:top-5 sm:right-5 z-20">
        <GameButton
          variant="secondary"
          size="sm"
          onClick={onClose}
          title="Закрыть просмотр"
        >
          <X className="w-4 h-4" />
        </GameButton>
      </div>

      {/* Main Content Container (stops backdrop click propagation) */}
      <div
        onClick={(e) => e.stopPropagation()}
        className="flex flex-col items-center justify-center gap-3 sm:gap-4 max-w-full max-h-full animate-card-inspect"
      >
        {/* Owner & Live Battlefield Status Strip (when inspecting a card on the clash table) */}
        {(ownerLabel || hasBattleBadges) && (
          <div className="flex flex-wrap items-center justify-center gap-1.5 sm:gap-2 max-w-[92vw] text-xs">
            {ownerLabel && (
              <span className="px-3 py-1 rounded-[3px] steel-bar font-display font-semibold uppercase tracking-[0.08em] text-[11px] sm:text-xs text-[#ece2d3]">
                {ownerLabel}
              </span>
            )}
            {battleStatus && isRankReduced && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] led-readout border-[#ff5247] font-led text-[11px] font-bold">
                <ArrowDown className="w-3 h-3" />
                Ранг снижен: {battleStatus.currentRank} (был {card.rank})
              </span>
            )}
            {battleStatus?.protectedAgainst.map((threat, idx) => (
              <span
                key={`${threat}-${idx}`}
                className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#0e2228]/95 border border-[#5cb9c7] text-[#d2eff3] text-[11px] font-semibold"
              >
                <Shield className="w-3 h-3 text-[#7ad4e2]" />
                Защита от {THREAT_LABELS[threat]}
              </span>
            ))}
            {battleStatus?.isDisabled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#271810]/95 border border-[#d67a3e] text-[#f0d5be] text-[11px] font-semibold">
                <ZapOff className="w-3 h-3 text-[#e89458]" />
                Отключена
              </span>
            )}
            {battleStatus?.isCancelled && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#221229]/95 border border-[#b464d6] text-[#ead5f2] text-[11px] font-semibold">
                <Ban className="w-3 h-3 text-[#cc82eb]" />
                Способность заблокирована
              </span>
            )}
            {battleStatus?.isDestroyed && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#1d0a0c]/95 border border-[#c9383b] text-[#f0b4b0] font-display font-semibold uppercase tracking-[0.1em] text-[11px]">
                <Skull className="w-3.5 h-3.5 text-[#eb5757]" />
                Уничтожено
              </span>
            )}
            {battleStatus && !battleStatus.isDestroyed && battleStatus.isEvacuated && (
              <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-[3px] bg-[#0d1f29]/95 border border-[#5cb9d6] text-[#cdeef8] font-display font-semibold uppercase tracking-[0.1em] text-[11px]">
                <LogOut className="w-3.5 h-3.5 text-[#7cd0eb]" />
                Эвакуирована
              </span>
            )}
          </div>
        )}

        {/* Full-Screen Card Artwork (exact native proportions, zero distortion) */}
        <div className="relative flex items-center justify-center">
          <img
            src={frontImage}
            alt={card.name}
            referrerPolicy="no-referrer"
            draggable={false}
            className={`${
              isHandSelect
                ? 'max-h-[64dvh] sm:max-h-[70dvh] max-w-[90vw]'
                : 'max-h-[76dvh] sm:max-h-[82dvh] max-w-[92vw]'
            } w-auto h-auto object-contain block select-none pointer-events-none ${
              isHandSelect && isSelected
                ? 'drop-shadow-[0_0_26px_rgba(92,199,212,0.75)]'
                : 'drop-shadow-[0_24px_50px_rgba(0,0,0,0.95)]'
            }`}
          />
          {isHandSelect && isSelected && (
            <div className="absolute -top-2.5 -left-2.5 btn-chamfer-sm bg-gradient-to-b from-[#2f7d87] to-[#17424a] text-[#effbfc] font-bold w-8 h-8 flex items-center justify-center text-sm shadow-xl border border-[#8ad8e3]">
              ✓
            </div>
          )}
        </div>

        {/* Bottom Prompt / Action Buttons — Bolted Gunmetal Console */}
        {isHandSelect ? (
          <div className="relative w-full max-w-md px-5 py-3.5 rounded-[6px] steel-plate flex flex-col items-center gap-2.5 text-center">
            <CornerRivets inset="sm" />
            <div className="space-y-1">
              <div className="font-display text-base sm:text-lg font-semibold uppercase text-[#efe5d7] tracking-[0.07em]">
                {isSelected ? 'Убрать эту карту из выбора?' : 'Выбрать эту карту?'}
              </div>
              {limitReached && (
                <div className="text-[11px] sm:text-xs text-[#e89c6a]">
                  Уже выбрано максимум карт ({selectedCount}/{maxSelectable}). Сначала отмените одну из выбранных.
                </div>
              )}
              {isSelected && (
                <div className="flex items-center justify-center gap-2 text-[11px] text-[#9eb0bc]">
                  <span className="uppercase tracking-wider font-display">Выбрано карт</span>
                  <LedCounter value={`${selectedCount}/${maxSelectable}`} size="xs" />
                </div>
              )}
            </div>

            <div className="flex items-center justify-center gap-3 w-full pt-0.5">
              <GameButton
                variant={isSelected ? 'crimson' : 'emerald'}
                size="lg"
                withOrnaments
                disabled={limitReached}
                onClick={onConfirmSelect}
                className="flex-1 max-w-[195px]"
              >
                <Check className="w-4 h-4" />
                <span>Подтвердить</span>
              </GameButton>

              <GameButton
                variant="secondary"
                size="lg"
                onClick={onClose}
                className="flex-1 max-w-[145px]"
              >
                <X className="w-4 h-4" />
                <span>Нет</span>
              </GameButton>
            </div>
          </div>
        ) : (
          <GameButton variant="secondary" size="md" onClick={onClose}>
            <X className="w-4 h-4" />
            <span>Закрыть</span>
          </GameButton>
        )}
      </div>
    </div>
  );
};
