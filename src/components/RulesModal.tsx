import React from 'react';
import { X, ShieldAlert, Swords, Zap, RefreshCw, Skull } from 'lucide-react';
import { CARD_TYPE_NAMES } from '../data/cards';
import { CardType } from '../types/game';
import { GameButton } from './GameButton';
import { CornerRivets } from './TacticalChrome';

interface RulesModalProps {
  isOpen: boolean;
  onClose: () => void;
}

const CARD_TYPE_HINTS: Record<CardType, string> = {
  creature: 'Живые бойцы и монстры',
  technology: 'Броня, машины и роботы',
  incorporeal: 'Призраки и злые духи',
  magic: 'Заклинания и приказы',
  virus: 'Пробивает защиту',
};

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
            <h2 className="font-display text-lg font-semibold text-[#f2e8da] tracking-[0.07em] uppercase">
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
        <div className="p-5 overflow-y-auto steel-scrollbar space-y-5 text-sm text-[#d2dae2] leading-relaxed font-sans">
          {/* Main Objective */}
          <div className="p-4 rounded-[4px] bg-[#191114] border border-[#542c32]">
            <h3 className="font-display font-semibold text-[#f27c74] text-sm mb-1.5 uppercase tracking-[0.07em] flex items-center gap-2">
              <Skull className="w-4 h-4 text-[#eb5757]" />
              Цель игры
            </h3>
            <p className="text-[#e2dad0]">
              Истощить руку противника!{' '}
              <strong className="text-[#f7efe4]">
                Игрок проигрывает, если в начале нового хода у него не осталось ни одной карты в руке.
              </strong>{' '}
              Если бой доходит до конца 10-го хода, побеждает сторона, у которой осталось больше карт (в руке + выжившие на поле боя); при равенстве объявляется ничья. В любой момент боя можно нажать «Сдаться», чтобы досрочно завершить партию.
            </p>
          </div>

          {/* Turn Flow */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#f2e8da] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <Swords className="w-4 h-4 text-[#e08552]" />
              Как проходит бой
            </h3>
            <ol className="list-decimal list-inside space-y-1.5 pl-1 text-[#d2dae2] text-xs sm:text-sm">
              <li>
                Каждый игрок тайно выбирает <strong className="text-[#f5ede0]">до 3 карт</strong> из своей руки (клик ЛКМ выставляет карту сразу, ПКМ или кнопка глаза открывают крупный просмотр).
              </li>
              <li>Карты одновременно вскрываются на поле боя.</li>
              <li>
                Все карты сортируются строго по <strong className="text-[#ff6459]">инициативе ⚡</strong> от большей к меньшей. При равной инициативе порядок определяется случайно.
              </li>
              <li>Карты активируют способности по очереди — порядок всегда виден в ленте очереди над полем боя.</li>
              <li>
                <strong className="text-[#f0736b]">Уничтоженная</strong> карта выбывает и больше не может действовать.
              </li>
              <li>
                <strong className="text-[#eba05e]">Отключённая</strong> карта пропускает действие на своём ходу.
              </li>
              <li>
                <strong className="text-[#7cd0e0]">Выжившие карты</strong> возвращаются обратно в руку владельца и могут использоваться в следующих боях.
              </li>
              <li>
                Уничтоженные и одноразовые карты отправляются в <strong className="text-[#f5ede0]">сброс (потери)</strong>.
              </li>
            </ol>
          </div>

          {/* Card Types (clean Russian subtitles, zero raw code keys) */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#f2e8da] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <Zap className="w-4 h-4 text-[#74c6e0]" />
              5 базовых типов карт
            </h3>
            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2 text-xs">
              {(Object.entries(CARD_TYPE_NAMES) as [CardType, string][]).map(
                ([typeKey, ruName]) => (
                  <div
                    key={typeKey}
                    className="p-2.5 rounded-[4px] steel-recessed flex flex-col justify-between gap-1"
                  >
                    <span className="font-semibold text-[#f2e8da]">{ruName}</span>
                    <span className="text-[11px] text-[#9aa7b5] leading-snug">
                      {CARD_TYPE_HINTS[typeKey]}
                    </span>
                  </div>
                )
              )}
            </div>
          </div>

          {/* Key Abilities and Nuances */}
          <div className="space-y-2">
            <h3 className="font-display font-semibold text-[#f2e8da] text-sm uppercase tracking-[0.07em] flex items-center gap-2">
              <RefreshCw className="w-4 h-4 text-[#c37ee0]" />
              Особые механики
            </h3>
            <div className="p-3.5 rounded-[4px] steel-recessed">
              <ul className="space-y-2 text-xs sm:text-[13px] text-[#cfd7e0]">
                <li>
                  <strong className="text-[#8ad1ea]">Одноразовые карты:</strong> Заклинания («Прогрессивная наука», «Артиллерия», «Беспилотный отряд», «Вызвать резервы», «Холодный расчёт», «Молитва», «Аномальные молнии», «Стихийное бедствие», «Страшная болезнь», «Чума», «Шаровая молния») и «Скрытый вирус» можно сыграть только один раз за партию! После завершения боя они уходят в сброс.
                </li>
                <li>
                  <strong className="text-[#f0c06c]">Снятие защиты и блокировки при гибели существа:</strong> Если активная защита от заклинаний (Инженер, Учёный) или блокировка способности (Снайпер, Боевая церковь, Паразит) была наложена существом и это существо погибает в бою, то баф/дебаф сразу спадает. Если инициатива разблокированной карты ещё не прошла, она ходит в этом бою. Защита от заклинаний (например, «Прогрессивная наука») остаётся активной.
                </li>
                <li>
                  <strong className="text-[#e68e55]">Артиллерист и скрытое заклинание «Артиллерия»:</strong> Артиллерист (ранг 3, инициатива 104) на своём ходу превращается в скрытое заклинание «Артиллерия» — единственную карту, которая уничтожает вообще всех существ и всю технику на поле (и своих, и чужих), игнорируя защиту. Все остальные карты уничтожают только вражеские цели!
                </li>
                <li>
                  <strong className="text-[#7ccce6]">Вызвать резервы и «Резервы»:</strong> Заклинание «Вызвать резервы» (инициатива 31, одноразовое) призывает на поле боя скрытое существо «Резервы» (ранг 5, инициатива 18), которое сразу вступает в бой и уничтожает существ противника с рангом ≤ 5. Если «Резервы» выживают в бою, они попадают в руку и могут быть сыграны снова.
                </li>
                <li>
                  <strong className="text-[#7ccce6]">Холодный расчёт и Медик:</strong> «Холодный расчёт» (инициатива 169, одноразовое) может подменить себя на любое существо или технику из руки (либо ничего не делать). «Медик» (ранг 2, инициатива 77) реанимирует случайное союзное существо, уничтоженное в текущем бою.
                </li>
                <li>
                  <strong className="text-[#f0c06c]">Беспилотный отряд и Молитва:</strong> «Беспилотный отряд» (инициатива 188) уничтожает 1 существо противника с рангом ≤ 5. «Молитва» (инициатива 107) уничтожает всех бесплотных существ противника. Обе карты одноразовые.
                </li>
                <li>
                  <strong className="text-[#7ccce6]">Эвакуация:</strong> Существо (инициатива 138), которое может вернуть одно союзное существо или технику с поля боя обратно в руку, либо ничего не делать.
                </li>
                <li>
                  <strong className="text-[#a3e635]">Паразит:</strong> Самое быстрое существо (ранг 1, инициатива 301) — блокирует способность существа противника с самой большой инициативой.
                </li>
                <li>
                  <strong className="text-[#c581e3]">Заклинатель, Бес и Злой дух:</strong> «Заклинатель» (ранг 4, инициатива 103) призывает на поле боя вместо себя скрытого «Беса» (существо, ранг 2, инициатива 74, уничтожает существ ≤ 3) или «Злого духа» (бесплотное, ранг 0, инициатива 34, уничтожает существ ≤ 2), после чего возвращается в руку. Выживший в бою призыв также попадает в руку.
                </li>
                <li>
                  <strong className="text-[#eb6b63]">Тёмный подрывник, Шаровая молния и Гаргулья:</strong> «Тёмный подрывник» (существо, ранг 2, инициатива 82) и одноразовое заклинание «Шаровая молния» (инициатива 18) уничтожают 1 технику противника любого ранга. «Гаргулья» (ранг 5, инициатива 286) уничтожает 1 существо противника с рангом ≤ 4.
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
                  <strong className="text-[#c581e3]">Некромант:</strong> Позволяет игроку выбрать одно существо с рангом ≤ 6 из своего сброса и вернуть его обратно в руку. После воскрешения существа Некромант не погибает и остаётся в строю.
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
          <GameButton variant="primary" size="md" withOrnaments onClick={onClose}>
            Понятно
          </GameButton>
        </div>
      </div>
    </div>
  );
};
