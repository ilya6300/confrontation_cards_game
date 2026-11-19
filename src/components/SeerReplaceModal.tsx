import React from 'react';
import { CardDefinition } from '../types/game';
import { CardView } from './CardView';
import { GameButton } from './GameButton';
import { CornerRivets } from './TacticalChrome';
import { Sparkles, ArrowRightLeft } from 'lucide-react';

interface CardSwapModalProps {
  isOpen: boolean;
  title: string;
  description: string;
  cards: CardDefinition[];
  onSelectCard: (card?: CardDefinition) => void;
  skipButtonText?: string;
}

export const CardSwapModal: React.FC<CardSwapModalProps> = ({
  isOpen,
  title,
  description,
  cards,
  onSelectCard,
  skipButtonText = 'Оставить без замены',
}) => {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-[#05070a]/88 backdrop-blur-md flex items-center justify-center p-4">
      <div className="relative w-full max-w-2xl steel-plate border-[#584566] rounded-[6px] p-5 sm:p-6 flex flex-col items-center text-center">
        <CornerRivets tone="dark" />

        <div className="w-11 h-11 btn-chamfer-sm steel-recessed border-[#7a4b94] flex items-center justify-center text-[#c780e8] mb-3 shadow-lg">
          <Sparkles className="w-5 h-5" />
        </div>

        <h2 className="font-display text-lg sm:text-xl font-semibold text-[#efe5d7] uppercase tracking-[0.08em] mb-1">
          {title}
        </h2>
        <p className="text-xs text-[#bcc5cf] max-w-md mb-4 leading-relaxed">
          {description}
        </p>

        {cards.length === 0 ? (
          <div className="w-full steel-recessed rounded-[4px] py-6 text-xs text-[#838d98] italic">
            Нет доступных карт для выбора.
          </div>
        ) : (
          <div className="w-full">
            <div className="text-[11px] font-display font-semibold text-[#9ea8b4] uppercase tracking-[0.12em] mb-2">
              Выберите карту
            </div>
            <div className="steel-recessed steel-scrollbar rounded-[4px] flex flex-wrap gap-3 justify-center max-h-[52vh] overflow-y-auto p-3.5">
              {cards.map((card) => (
                <div
                  key={card.id}
                  className="transform hover:scale-105 transition-transform"
                >
                  <CardView
                    card={card}
                    size="sm"
                    onClick={() => onSelectCard(card)}
                  />
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="mt-5 flex gap-3">
          <GameButton
            variant="secondary"
            size="md"
            onClick={() => onSelectCard(undefined)}
          >
            <ArrowRightLeft className="w-3.5 h-3.5" />
            <span>{skipButtonText}</span>
          </GameButton>
        </div>
      </div>
    </div>
  );
};
