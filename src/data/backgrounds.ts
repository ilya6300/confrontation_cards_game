import background1 from '../assets/background/background_1.jpg';
import backgroundStartMenu from '../assets/background/background_start_menu.jpg';
import backgroundMapsV1 from '../assets/background/background_maps_v1.jpg';

export interface GameBackground {
  id: string;
  name: string;
  image: string;
}

export const GAME_BACKGROUNDS: GameBackground[] = [
  {
    id: 'background_1',
    name: 'Рубеж обороны',
    image: background1,
  },
];

export const DEFAULT_GAME_BACKGROUND = GAME_BACKGROUNDS[0].image;
export const START_MENU_BACKGROUND = backgroundStartMenu;
export const CAMPAIGN_MAP_BACKGROUND = backgroundMapsV1;
