import React from 'react';
import { CardSide, DefeatReason } from '../types/game';
import { GameButton } from './GameButton';
import { CornerRivets, LedCounter, RiftDivider } from './TacticalChrome';
import { Trophy, Skull, RotateCcw, Home, ArrowRight, Map as MapIcon } from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winnerSide: CardSide;
  winnerName: string;
  loserName: string;
  roundsCount: number;
  defeatReason?: DefeatReason;
  isCampaign?: boolean;
  campaignStageId?: number;
  isPlayer1Winner?: boolean;
  hasNextCampaignStage?: boolean;
  onNextStage?: () => void;
  onReturnToMap?: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerSide,
  winnerName,
  loserName,
  roundsCount,
  defeatReason = 'empty_hand',
  isCampaign = false,
  campaignStageId,
  isPlayer1Winner = false,
  hasNextCampaignStage = false,
  onNextStage,
  onReturnToMap,
  onRestart,
  onHome,
}) => {
  if (!isOpen) return null;

  const isTurnLimitDefeat = defeatReason === 'turn_limit';
  const isSurrenderDefeat = defeatReason === 'surrender';
  const showVictoryVisual =
    !isTurnLimitDefeat &&
    !isSurrenderDefeat &&
    (isCampaign ? isPlayer1Winner : winnerSide === 'resistance');

  const kickerLabel = isTurnLimitDefeat
    ? isCampaign
      ? `Этап ${campaignStageId} · Лимит ходов`
      : 'Лимит 10 ходов исчерпан'
    : isSurrenderDefeat
    ? isCampaign
      ? `Этап ${campaignStageId} · Выход из боя`
      : 'Досрочное завершение'
    : isCampaign
    ? isPlayer1Winner
      ? hasNextCampaignStage
        ? `Этап ${campaignStageId} пройден`
        : 'Кампания завершена'
      : `Этап ${campaignStageId} · Поражение`
    : 'Битва завершена';

  const headlineText = isTurnLimitDefeat
    ? 'Поражение по лимиту ходов'
    : isSurrenderDefeat
    ? 'Вы сдались'
    : isCampaign
    ? isPlayer1Winner
      ? hasNextCampaignStage
        ? `Этап ${campaignStageId} взят!`
        : 'Победа в кампании!'
      : 'Отряд разгромлен'
    : `${winnerName} побеждает!`;

  return (
    <div className="fixed inset-0 z-50 bg-[#05070a]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`relative w-full max-w-md steel-plate rounded-[6px] p-6 flex flex-col items-center text-center overflow-hidden ${
          showVictoryVisual ? 'border-[#497b8c]' : 'border-[#7a3136]'
        }`}
      >
        <CornerRivets tone={showVictoryVisual ? 'rift' : 'dark'} />

        {/* Subtle Faction Backlight Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl opacity-25 ${
            showVictoryVisual ? 'bg-[#5dbad9]' : 'bg-[#d94136]'
          }`}
        />

        {/* Forged Emblem Crest */}
        <div
          className={`relative z-10 w-16 h-16 btn-chamfer steel-recessed flex items-center justify-center mb-4 shadow-xl ${
            showVictoryVisual
              ? 'border-[#67c2de] text-[#8ad6ee]'
              : 'border-[#c9423f] text-[#eb6a61]'
          }`}
        >
          {showVictoryVisual ? (
            <Trophy className="w-8 h-8" />
          ) : (
            <Skull className="w-8 h-8" />
          )}
        </div>

        {/* Title */}
        <div className="relative z-10 w-full flex flex-col items-center mb-4">
          <div className="font-led text-[10px] sm:text-[11px] uppercase tracking-[0.22em] text-[#98a3af] mb-1">
            {kickerLabel}
          </div>
          <h2
            className={`font-display text-2xl sm:text-3xl font-bold uppercase tracking-[0.07em] ${
              showVictoryVisual
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#edf8fc] via-[#a7dfef] to-[#5eaac4]'
                : 'text-transparent bg-clip-text bg-gradient-to-b from-[#faeae6] via-[#eb8b75] to-[#c44339]'
            } drop-shadow-[0_3px_10px_rgba(0,0,0,0.95)]`}
          >
            {headlineText}
          </h2>
          <RiftDivider className="w-52 mt-2.5" />
        </div>

        {/* Summary Readout */}
        <div className="relative z-10 p-3.5 rounded-[4px] steel-recessed text-xs text-[#c8d0d8] space-y-2.5 w-full mb-6">
          {isTurnLimitDefeat ? (
            <p className="leading-relaxed">
              За <span className="font-semibold text-[#eb6e65]">10 ходов</span> победитель не выявлен. По правилам боя игрок потерпел поражение.
            </p>
          ) : isSurrenderDefeat ? (
            <p className="leading-relaxed">
              Сторона <span className="font-semibold text-[#eb6e65]">{loserName}</span> сдалась и покинула поле боя.
            </p>
          ) : (
            <p className="leading-relaxed">
              У стороны{' '}
              <span className="font-semibold text-[#eb6e65]">{loserName}</span>{' '}
              закончились все карты в руке перед началом нового боя.
            </p>
          )}
          {isCampaign && isPlayer1Winner && hasNextCampaignStage && (
            <p className="text-[#86efac] font-medium">
              Открыт следующий этап кампании: Этап {(campaignStageId ?? 1) + 1}!
            </p>
          )}
          <div className="flex items-center justify-center gap-2 pt-2 border-t border-[#252c35]">
            <span className="font-display text-[11px] uppercase tracking-[0.1em] text-[#98a3af]">
              Проведено ходов
            </span>
            <LedCounter value={`${String(roundsCount).padStart(2, '0')}/10`} size="sm" />
          </div>
        </div>

        {/* Actions */}
        <div className="relative z-10 w-full space-y-2.5">
          {isCampaign ? (
            <>
              {isPlayer1Winner && hasNextCampaignStage && onNextStage && (
                <GameButton
                  variant="emerald"
                  size="lg"
                  fullWidth
                  withOrnaments
                  onClick={onNextStage}
                >
                  <span>Следующий этап</span>
                  <ArrowRight className="w-4 h-4" />
                </GameButton>
              )}

              {!isPlayer1Winner && (
                <GameButton
                  variant="primary"
                  size="lg"
                  fullWidth
                  withOrnaments
                  onClick={onRestart}
                >
                  <RotateCcw className="w-4 h-4" />
                  <span>Попробовать снова</span>
                </GameButton>
              )}

              {onReturnToMap && (
                <GameButton
                  variant={
                    isPlayer1Winner && !hasNextCampaignStage
                      ? 'emerald'
                      : 'secondary'
                  }
                  size={isPlayer1Winner && !hasNextCampaignStage ? 'lg' : 'md'}
                  fullWidth
                  withOrnaments={isPlayer1Winner && !hasNextCampaignStage}
                  onClick={onReturnToMap}
                >
                  <MapIcon className="w-4 h-4 text-[#8ad1ea]" />
                  <span>На карту кампании</span>
                </GameButton>
              )}

              {isPlayer1Winner && (
                <GameButton
                  variant="secondary"
                  size="md"
                  fullWidth
                  onClick={onRestart}
                >
                  <RotateCcw className="w-4 h-4 text-[#9ea8b4]" />
                  <span>Переиграть этап</span>
                </GameButton>
              )}
            </>
          ) : (
            <>
              <GameButton
                variant={showVictoryVisual ? 'emerald' : 'primary'}
                size="lg"
                fullWidth
                withOrnaments
                onClick={onRestart}
              >
                <RotateCcw className="w-4 h-4" />
                <span>Сыграть реванш</span>
              </GameButton>

              <GameButton
                variant="secondary"
                size="md"
                fullWidth
                onClick={onHome}
              >
                <Home className="w-4 h-4 text-[#9ea8b4]" />
                <span>В главное меню</span>
              </GameButton>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
