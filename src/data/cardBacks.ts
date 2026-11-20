import { CardSide } from '../types/game';
import resistanceCardBack from '../assets/images/resistance_card_back_seamless_1795180642698.jpg';
import darkSideCardBack from '../assets/images/dark_side_card_back_seamless_1795180642859.jpg';

export const RESISTANCE_CARD_BACK = resistanceCardBack;
export const DARK_SIDE_CARD_BACK = darkSideCardBack;

export function getCardBackBySide(side: CardSide): string {
  return side === 'resistance' ? RESISTANCE_CARD_BACK : DARK_SIDE_CARD_BACK;
}
