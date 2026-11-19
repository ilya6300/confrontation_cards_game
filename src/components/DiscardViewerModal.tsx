import React from 'react';
import { CardDefinition } from '../types/game';
import { CardView } from './CardView';
import { GameButton } from './GameButton';
import { CornerRivets, LedCounter } from './TacticalChrome';
import { X, Trash2 } from 'lucide-react';

interface DiscardViewerModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  cards: CardDefinition[];
  onInspectCard?: (card: CardDefinition) => void;
}

export const DiscardViewerModal: React.FC<DiscardViewerModalProps> = ({
  isOpen,
  onClose,
  title,
  cards,
  onInspectCard,
}) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#05070a]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl steel-plate rounded-[6px] overflow-hidden flex flex-col max-h-[85vh]"
      >
        <CornerRivets />

        <div className="px-5 py-3.5 bg-gradient-to-b from-[#232931] via-[#181c22] to-[#12161b] border-b border-[#343c46] flex items-center justify-between gap-2 shrink-0">
          <div className="flex items-center gap-2.5 min-w-0">
            <Trash2 className="w-4 h-4 text-[#e3655b] shrink-0" />
            <h2 className="font-display text-base font-semibold text-[#efe5d7] uppercase tracking-[0.08em] truncate">
              {title}
            </h2>
            <LedCounter value={cards.length} size="xs" minDigits={2} />
          </div>
          <GameButton
            variant="secondary"
            size="xs"
            onClick={onClose}
            title="Закрыть сброс"
          >
            <X className="w-4 h-4" />
          </GameButton>
        </div>

        <div className="p-3 sm:p-4 flex-1 min-h-0 flex flex-col">
          <div className="steel-recessed steel-scrollbar rounded-[4px] overflow-y-auto flex-1 p-3 sm:p-4">
            {cards.length === 0 ? (
              <div className="text-center py-12 text-xs text-[#838d98] italic">
                Сброс пуст. В этом матче пока не было уничтожено ни одной карты.
              </div>
            ) : (
              <div className="flex flex-wrap gap-3 justify-center">
                {cards.map((card, idx) => (
                  <CardView
                    key={`${card.id}-${idx}`}
                    card={card}
                    size="sm"
                    onClick={onInspectCard ? () => onInspectCard(card) : undefined}
                  />
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
