import React from 'react';
import { CardSide, DefeatReason } from '../types/game';
import { GameButton } from './GameButton';
import { CornerRivets, LedCounter, RiftDivider } from './TacticalChrome';
import {
  Trophy,
  Skull,
  Scale,
  RotateCcw,
  Home,
  ArrowRight,
  Map as MapIcon,
} from 'lucide-react';

interface GameOverModalProps {
  isOpen: boolean;
  winnerSide: CardSide;
  winnerName: string;
  loserName: string;
  player1Name?: string;
  player2Name?: string;
  roundsCount: number;
  defeatReason?: DefeatReason;
  isDraw?: boolean;
  isBotMode?: boolean;
  finalCardCounts?: {
    player1: number;
    player2: number;
  };
  isCampaign?: boolean;
  campaignStageId?: number;
  isPlayer1Winner?: boolean;
  hasNextCampaignStage?: boolean;
  onNextStage?: () => void;
  onViewFinale?: () => void;
  onReturnToMap?: () => void;
  onRestart: () => void;
  onHome: () => void;
}

export const GameOverModal: React.FC<GameOverModalProps> = ({
  isOpen,
  winnerSide,
  winnerName,
  loserName,
  player1Name = 'Игрок 1',
  player2Name = 'Противник',
  roundsCount,
  defeatReason = 'empty_hand',
  isDraw = false,
  isBotMode = false,
  finalCardCounts,
  isCampaign = false,
  campaignStageId,
  isPlayer1Winner = false,
  hasNextCampaignStage = false,
  onNextStage,
  onViewFinale,
  onReturnToMap,
  onRestart,
  onHome,
}) => {
  if (!isOpen) return null;

  const isTurnLimit = defeatReason === 'turn_limit';
  const isSurrender = defeatReason === 'surrender';

  const isVictoryVisual =
    !isDraw &&
    !isSurrender &&
    (isCampaign || isBotMode ? isPlayer1Winner : true);

  const toneIsBlue =
    !isDraw &&
    !isSurrender &&
    (isCampaign || isBotMode ? isPlayer1Winner : winnerSide === 'resistance');

  const kickerLabel = isDraw
    ? isCampaign
      ? `Этап ${campaignStageId} · Ничья`
      : isTurnLimit
      ? 'Итог 10 ходов · Ничья'
      : 'Бой завершён · Ничья'
    : isSurrender
    ? isCampaign
      ? `Этап ${campaignStageId} · Выход из боя`
      : 'Досрочное завершение'
    : isTurnLimit
    ? isCampaign
      ? isPlayer1Winner
        ? `Этап ${campaignStageId} · Итог 10 ходов`
        : `Этап ${campaignStageId} · Поражение по картам`
      : 'Итог 10 ходов · Подсчёт карт'
    : isCampaign
    ? isPlayer1Winner
      ? hasNextCampaignStage
        ? `Этап ${campaignStageId} пройден`
        : 'Кампания завершена'
      : `Этап ${campaignStageId} · Поражение`
    : 'Битва завершена';

  const headlineText = isDraw
    ? 'Ничья по итогам боя'
    : isSurrender
    ? isBotMode || isCampaign
      ? 'Вы сдались'
      : `${loserName} сдаётся`
    : isCampaign
    ? isPlayer1Winner
      ? hasNextCampaignStage
        ? `Этап ${campaignStageId} взят!`
        : 'Победа в кампании!'
      : isTurnLimit
      ? 'Поражение по картам'
      : 'Отряд разгромлен'
    : isBotMode
    ? isPlayer1Winner
      ? isTurnLimit
        ? 'Победа по картам!'
        : 'Победа!'
      : isTurnLimit
      ? 'Поражение по картам'
      : 'Поражение'
    : `${winnerName} побеждает!`;

  const winnerCardCount = finalCardCounts
    ? isPlayer1Winner
      ? finalCardCounts.player1
      : finalCardCounts.player2
    : undefined;
  const loserCardCount = finalCardCounts
    ? isPlayer1Winner
      ? finalCardCounts.player2
      : finalCardCounts.player1
    : undefined;

  return (
    <div className="fixed inset-0 z-50 bg-[#05070a]/90 backdrop-blur-md flex items-center justify-center p-4">
      <div
        className={`relative w-full max-w-md steel-plate rounded-[6px] p-6 flex flex-col items-center text-center overflow-hidden ${
          isDraw
            ? 'border-[#8a6d3b]'
            : toneIsBlue
            ? 'border-[#497b8c]'
            : 'border-[#7a3136]'
        }`}
      >
        <CornerRivets tone={toneIsBlue ? 'rift' : 'dark'} />

        {/* Subtle Faction Backlight Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-48 rounded-full blur-3xl opacity-25 ${
            isDraw
              ? 'bg-[#e3a349]'
              : toneIsBlue
              ? 'bg-[#5dbad9]'
              : 'bg-[#d94136]'
          }`}
        />

        {/* Forged Emblem Crest */}
        <div
          className={`relative z-10 w-16 h-16 btn-chamfer steel-recessed flex items-center justify-center mb-4 shadow-xl ${
            isDraw
              ? 'border-[#d49a4c] text-[#f0ba73]'
              : toneIsBlue
              ? 'border-[#67c2de] text-[#8ad6ee]'
              : 'border-[#c9423f] text-[#eb6a61]'
          }`}
        >
          {isDraw ? (
            <Scale className="w-8 h-8" />
          ) : isVictoryVisual ? (
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
              isDraw
                ? 'text-transparent bg-clip-text bg-gradient-to-b from-[#fdf3e0] via-[#efc57f] to-[#b8823c]'
                : toneIsBlue
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
          {isDraw ? (
            <p className="leading-relaxed">
              {isTurnLimit
                ? `По истечении 10 ходов у обеих сторон осталось одинаковое количество карт (${finalCardCounts?.player1 ?? 0} : ${finalCardCounts?.player2 ?? 0}).`
                : 'У обеих сторон одновременно закончились все карты в руке.'}
            </p>
          ) : isSurrender ? (
            <p className="leading-relaxed">
              Сторона <span className="font-semibold text-[#eb6e65]">{loserName}</span> сдалась и покинула поле боя.
            </p>
          ) : isTurnLimit ? (
            <p className="leading-relaxed">
              По истечении <span className="font-semibold text-[#efe5d7]">10 ходов</span> победила сторона{' '}
              <span className="font-semibold text-[#8ad6ee]">{winnerName}</span>, сохранив больше карт
              {winnerCardCount !== undefined && loserCardCount !== undefined
                ? ` (${winnerCardCount} против ${loserCardCount})`
                : ''}
              .
            </p>
          ) : (
            <p className="leading-relaxed">
              У стороны{' '}
              <span className="font-semibold text-[#eb6e65]">{loserName}</span>{' '}
              закончились все карты в руке перед началом нового боя.
            </p>
          )}

          {isTurnLimit && finalCardCounts && (
            <div className="pt-2 border-t border-[#252c35] space-y-1.5">
              <div className="font-display text-[10px] uppercase tracking-[0.12em] text-[#8d98a5]">
                Осталось карт (рука + поле боя)
              </div>
              <div className="grid grid-cols-2 gap-2 text-left">
                <div className="px-2.5 py-1.5 rounded-[3px] bg-[#11151b] border border-[#2a323c] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#cfd8e0] truncate">
                    {player1Name}
                  </span>
                  <LedCounter value={finalCardCounts.player1} size="xs" />
                </div>
                <div className="px-2.5 py-1.5 rounded-[3px] bg-[#11151b] border border-[#2a323c] flex items-center justify-between gap-2">
                  <span className="text-[11px] text-[#cfd8e0] truncate">
                    {player2Name}
                  </span>
                  <LedCounter value={finalCardCounts.player2} size="xs" />
                </div>
              </div>
            </div>
          )}

          {isCampaign && isPlayer1Winner && !isDraw && hasNextCampaignStage && (
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
              {isPlayer1Winner && !isDraw && hasNextCampaignStage && onNextStage && (
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

              {(!isPlayer1Winner || isDraw) && (
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

              {isPlayer1Winner &&
                !isDraw &&
                !hasNextCampaignStage &&
                onViewFinale && (
                  <GameButton
                    variant="emerald"
                    size="lg"
                    fullWidth
                    withOrnaments
                    onClick={onViewFinale}
                  >
                    <Trophy className="w-4 h-4" />
                    <span>Посмотреть финал кампании</span>
                  </GameButton>
                )}

              {onReturnToMap && (
                <GameButton
                  variant={
                    isPlayer1Winner && !isDraw && !hasNextCampaignStage
                      ? 'emerald'
                      : 'secondary'
                  }
                  size={isPlayer1Winner && !isDraw && !hasNextCampaignStage ? 'lg' : 'md'}
                  fullWidth
                  withOrnaments={isPlayer1Winner && !isDraw && !hasNextCampaignStage}
                  onClick={onReturnToMap}
                >
                  <MapIcon className="w-4 h-4 text-[#8ad1ea]" />
                  <span>На карту кампании</span>
                </GameButton>
              )}

              {isPlayer1Winner && !isDraw && (
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
                variant={isVictoryVisual ? 'emerald' : 'primary'}
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
