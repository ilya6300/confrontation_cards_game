import React from 'react';
import { X, ShieldAlert, Swords, Zap, RefreshCw, Skull } from 'lucide-react';
import { CARD_TYPE_NAMES } from '../data/cards';
import { GameButton } from './GameButton';
import { CornerRivets } from './TacticalChrome';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const RulesModal: React.FC<RulesModalProps> = ({ isOpen, onClose }) => {
  if (!isOpen) return null;

  return (
    <div
      onClick={onClose}
      className="fixed inset-0 z-50 bg-[#05070a]/85 backdrop-blur-sm flex items-center justify-center p-3 sm:p-6 overflow-y-auto"
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="relative w-full max-w-2xl steel-plate rounded-[6px] overflow-hidden flex flex-col max-h-[90vh]"
      >
        <CornerRivets />

        {/* Header */}
        <div className="px-5 py-3.5 bg-gradient-to-b from-[#232931] via-[#181c22] to-[#12161b] border-b border-[#343c46] flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2.5">
            <ShieldAlert className="w-5 h-5 text-[#e3655b]" />
            <h2 className="font-display text-lg font-semibold text-[#efe5d7] tracking-[0.08em] uppercase">
              Правила игры
            </h2>
          </div>
          <GameButton
            variant="secondary"
            size="xs"
            onClick={onClose}
            title="Закрыть правила"
          >
            <X className="w-4 h-4" />
          </GameButton>
        </div>

        {/* Content */}
        <div className="p-5 overflow-y-auto steel-scrollbar space-y-5 text-sm text-[#c8d0d8] leading-relaxed font-sans">
          {/* Main Objective */}
          <div className="p-3.5 rounded-[4px] steel-recessed border-l-2 border-l-[#d64545]">
            <h3 className="font-display font-semibold text-[#eb7067] text-sm mb-1 uppercase tracking-[0.07em] flex items-center gap-2">
              <Skull className="w-4 h-4 text-[#eb5757]" />
              Цель игры
            </h3>
            <p className="text-[#d6cec2]">
              Истощить руку противника!{' '}
              <strong className="text-[#f2e8da]">
                Игрок проигрывает, если в начале нового хода у него не осталось ни одной карты в руке, либо если за 10 ходов победитель не определён.
              </strong>{' '}
              В любой момент боя можно нажать «Сдаться», чтобы досрочно завершить партию.
            </p>
          </div>

          {/* Turn Flow */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#efe5d7] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#e08552]" />
              Как проходит бой
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#c8d0d8] text-xs sm:text-sm">
              <li>
                Каждый игрок тайно выбирает <strong className="text-[#efe5d7]">до 3 карт</strong> из своей руки (если осталось меньше 3, можно выставить все).
              </li>
              <li>Карты открываются одновременно на поле боя.</li>
              <li>
                Все карты сортируются строго по <strong className="text-[#ff594f]">инициативе ⚡</strong> от большей к меньшей. При равной инициативе порядок определяется случайно.
              </li>
              <li>Карты активируют способности по очереди.</li>
              <li>
                <strong className="text-[#eb6b63]">Уничтоженная</strong> карта выбывает и больше не может действовать.
              </li>
              <li>
                <strong className="text-[#e39659]">Отключённая</strong> карта пропускает действие на своём ходу.
              </li>
              <li>
                <strong className="text-[#7cd0e0]">Выжившие карты</strong> возвращаются обратно в руку владельца и могут использоваться в следующих боях.
              </li>
              <li>
                Уничтоженные карты отправляются в <strong className="text-[#efe5d7]">сброс</strong>.
              </li>
            </ol>
          </div>

          {/* Card Types */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#efe5d7] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#74c6e0]" />
              5 базовых типов карт
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {Object.entries(CARD_TYPE_NAMES).map(([typeKey, ruName]) => (
                <div
                  key={typeKey}
                  className="p-2.5 rounded-[4px] steel-recessed flex flex-col justify-between gap-0.5"
                >
                  <span className="font-semibold text-[#ebe0d1]">{ruName}</span>
                  <span className="font-led text-[10px] text-[#7c8794] uppercase">
                    {typeKey}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Key Abilities and Nuances */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#efe5d7] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#c37ee0]" />
              Особые механики
            </h3>
            <div className="p-3.5 rounded-[4px] steel-recessed">
              <ul className="space-y-2 text-xs text-[#c8d0d8]">
                <li>
                  <strong className="text-[#8ad1ea]">Одноразовые карты:</strong> Заклинания («Прогрессивная наука», «Аномальные молнии», «Стихийное бедствие», «Страшная болезнь», «Чума», «Артиллерия») и «Скрытый вирус» можно сыграть только один раз за партию! После завершения боя они уходят в сброс.
                </li>
                <li>
                  <strong className="text-[#e68e55]">Артиллерист и скрытое заклинание «Артиллерия»:</strong> Артиллерист (ранг 3, инициатива 104) на своём ходу превращается в скрытое заклинание «Артиллерия» — единственную карту, которая уничтожает вообще всех существ и всю технику на поле (и своих, и чужих), игнорируя защиту. Все остальные карты уничтожают только вражеские цели!
                </li>
                <li>
                  <strong className="text-[#7ccce6]">Эвакуация:</strong> Существо (инициатива 138), которое может вернуть одно союзное существо или технику с поля боя обратно в руку, либо ничего не делать.
                </li>
                <li>
                  <strong className="text-[#ca85e8]">Скрытый вирус:</strong> Карта категории «Вирус» (инициатива 80). Уничтожает боевых роботов противника и не блокируется защитой от заклинаний.
                </li>
                <li>
                  <strong className="text-[#88c2de]">Боевые роботы:</strong> Уничтожают всех существ противника.
                </li>
                <li>
                  <strong className="text-[#d9b57c]">Старый колдун:</strong> Во время боя меняет себя на любое доступное заклинание из руки владельца на выбор. Блокируется Снайпером и Боевой церковью.
                </li>
                <li>
                  <strong className="text-[#e0c8a4]">Боевая церковь:</strong> Блокирует способности Старого колдуна и Демона, а также уничтожает всех бесплотных и существ противника с рангом ≤ 5.
                </li>
                <li>
                  <strong className="text-[#eb6b63]">Демон и Призрак:</strong> Демон уничтожает всех существ противника и технику противника 1-го ранга. Призрак уничтожает существ противника с рангом ≤ 5 (кроме Священника и Боевой церкви).
                </li>
                <li>
                  <strong className="text-[#7cd0d6]">Защита от заклинаний:</strong> Инженер, Прогрессивная наука и Учёный защищают союзные карты от вражеских заклинаний (но не от категории «Вирус»).
                </li>
                <li>
                  <strong className="text-[#eb6b63]">Бешеные псы:</strong> Игнорируют защиту и уничтожают 1 существо противника с рангом ≤ 4.
                </li>
                <li>
                  <strong className="text-[#c581e3]">Некромант:</strong> Приносит себя в жертву и позволяет игроку выбрать одно существо с рангом ≤ 6 из своего сброса, чтобы вернуть его обратно в руку. Если в сбросе нет подходящих существ (или жертвоприношение отменено), Некромант не погибает.
                </li>
                <li>
                  <strong className="text-[#e67373]">Снижение ранга:</strong> Страшная болезнь снижает ранг всех существ противника на 1, что сразу влияет на все последующие проверки ранга в этом же бою.
                </li>
              </ul>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="px-5 py-3 bg-[#101318] border-t border-[#2f3741] flex justify-end shrink-0">
          <GameButton
            variant="primary"
            size="md"
            withOrnaments
            onClick={onClose}
          >
            Понятно
          </GameButton>
        </div>
      </div>
    </div>
  );
};
