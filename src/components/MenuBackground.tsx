import React from 'react';
import { START_MENU_BACKGROUND } from '../data/backgrounds';

interface MenuBackgroundProps {
  /**
   * 'bright' — vivid brightened start menu backdrop
   * 'dim' — medium atmospheric scrim for faction select
   * 'catalog' — deeper tactical scrim so card artwork pops cleanly
   */
  tone?: 'bright' | 'dim' | 'catalog';
}

export const MenuBackground: React.FC<MenuBackgroundProps> = ({
  tone = 'bright',
}) => {
  const imgToneClass =
    tone === 'bright'
      ? 'brightness-[1.14] contrast-[1.04]'
      : tone === 'dim'
      ? 'brightness-[1.04] contrast-[1.03]'
      : 'brightness-[0.9] contrast-[1.04]';

  return (
    <>
      {/* 3-axis coprime sinusoidal GPU drift (X, Y, subtle breathing zoom) with zero corner stops */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -inset-6 overflow-hidden select-none"
      >
        <div className="w-full h-full animate-menu-bg-x">
          <div className="w-full h-full animate-menu-bg-y">
            <img
              src={START_MENU_BACKGROUND}
              alt=""
              referrerPolicy="no-referrer"
              draggable={false}
              className={`w-full h-full object-cover object-center block select-none animate-menu-bg-scale ${imgToneClass}`}
            />
          </div>
        </div>
      </div>

      {tone === 'bright' && (
        <>
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,14,0.14)_0%,rgba(7,9,13,0.32)_66%,rgba(5,6,9,0.58)_100%)]"
          />
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-gradient-to-b from-[#07090d]/42 via-transparent to-[#06080b]/58"
          />
        </>
      )}

      {tone === 'dim' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(8,10,14,0.42)_0%,rgba(6,8,12,0.68)_72%,rgba(4,5,7,0.82)_100%)]"
        />
      )}

      {tone === 'catalog' && (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_center,rgba(7,9,13,0.62)_0%,rgba(6,8,11,0.8)_68%,rgba(4,5,7,0.92)_100%)]"
        />
      )}
    </>
  );
};
