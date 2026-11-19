import React from 'react';

export type GameButtonVariant = 'primary' | 'crimson' | 'emerald' | 'secondary';
export type GameButtonSize = 'xs' | 'sm' | 'md' | 'lg';

interface GameButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: GameButtonVariant;
  size?: GameButtonSize;
  fullWidth?: boolean;
  withOrnaments?: boolean;
  children: React.ReactNode;
}

const FRAME_GRADIENTS: Record<GameButtonVariant, string> = {
  // Oxidized ember-iron plate harmonizing with volcanic rift & card rust weathering
  primary:
    'from-[#e4a67d] via-[#9e4724] to-[#3b190d] group-hover:from-[#f0ba94] group-hover:via-[#b8552d] group-hover:to-[#4a2011]',
  // Charred crimson forged steel for Dark Side / cancel / destructive actions
  crimson:
    'from-[#df8888] via-[#8f242b] to-[#320b0e] group-hover:from-[#eca1a1] group-hover:via-[#ab2d35] group-hover:to-[#421014]',
  // Tactical bunker-cyan / rift-teal armored steel for Confirm / Continue / Active Auto
  emerald:
    'from-[#8bd2de] via-[#347c87] to-[#122e33] group-hover:from-[#a8e2ec] group-hover:via-[#4295a1] group-hover:to-[#183d44]',
  // Weathered brushed gunmetal plate matching card outer frames
  secondary:
    'from-[#737e8a] via-[#404852] to-[#171b20] group-hover:from-[#9aa6b3] group-hover:via-[#56606c] group-hover:to-[#21262d]',
};

const FACE_STYLES: Record<GameButtonVariant, string> = {
  primary:
    'bg-gradient-to-b from-[#a84925] via-[#7f3016] to-[#4e1b0c] text-[#f6ece0] group-hover:from-[#bc552d] group-hover:via-[#92391b] group-hover:to-[#5e210f]',
  crimson:
    'bg-gradient-to-b from-[#96232a] via-[#6e161d] to-[#410b10] text-[#f7e9e7] group-hover:from-[#ad2b33] group-hover:via-[#821c24] group-hover:to-[#520f15]',
  emerald:
    'bg-gradient-to-b from-[#286c75] via-[#1c4f57] to-[#103036] text-[#e7f5f7] group-hover:from-[#317e88] group-hover:via-[#225f69] group-hover:to-[#143c43]',
  secondary:
    'bg-gradient-to-b from-[#2c323a] via-[#1d2127] to-[#121519] text-[#ddd1c0] group-hover:from-[#373f48] group-hover:via-[#252b32] group-hover:to-[#171b20] group-hover:text-[#f2e8da]',
};

const WRAPPER_GLOW: Record<GameButtonVariant, string> = {
  primary:
    'drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)] hover:drop-shadow-[0_5px_16px_rgba(217,96,45,0.38)]',
  crimson:
    'drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)] hover:drop-shadow-[0_5px_16px_rgba(194,45,54,0.4)]',
  emerald:
    'drop-shadow-[0_4px_12px_rgba(0,0,0,0.75)] hover:drop-shadow-[0_5px_16px_rgba(88,187,207,0.36)]',
  secondary:
    'drop-shadow-[0_3px_8px_rgba(0,0,0,0.7)] hover:drop-shadow-[0_4px_12px_rgba(120,145,165,0.2)]',
};

const SIZE_CLASSES: Record<GameButtonSize, string> = {
  xs: 'px-2.5 py-1 text-[11px] sm:text-xs tracking-[0.07em]',
  sm: 'px-3 sm:px-3.5 py-1.5 text-xs tracking-[0.08em]',
  md: 'px-4 sm:px-6 py-2 text-xs sm:text-[13px] tracking-[0.1em]',
  lg: 'px-6 sm:px-8 py-2.5 sm:py-3 text-[13px] sm:text-sm tracking-[0.12em]',
};

export const GameButton: React.FC<GameButtonProps> = ({
  variant = 'primary',
  size = 'md',
  fullWidth = false,
  withOrnaments = false,
  disabled = false,
  className = '',
  children,
  ...rest
}) => {
  const chamferClass = size === 'xs' || size === 'sm' ? 'btn-chamfer-sm' : 'btn-chamfer';

  return (
    <button
      disabled={disabled}
      className={`group relative inline-flex items-center justify-center transition-all duration-150 select-none whitespace-nowrap focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#76cae3]/75 focus-visible:ring-offset-1 focus-visible:ring-offset-[#0c0e11] ${
        fullWidth ? 'w-full' : ''
      } ${
        disabled
          ? 'opacity-45 cursor-not-allowed'
          : `cursor-pointer hover:-translate-y-[1px] active:translate-y-[1px] active:scale-[0.985] ${WRAPPER_GLOW[variant]}`
      } ${className}`}
      {...rest}
    >
      {/* Chamfered Forged Steel Outer Bevel */}
      <span
        className={`${chamferClass} p-[1.5px] bg-gradient-to-b ${
          disabled
            ? 'from-[#464e57] via-[#2d333a] to-[#16191d]'
            : FRAME_GRADIENTS[variant]
        } ${fullWidth ? 'w-full' : ''} block transition-colors duration-150`}
      >
        {/* Chamfered Brushed Metal Inner Plate */}
        <span
          className={`${chamferClass} relative flex items-center justify-center font-display font-semibold uppercase ${
            SIZE_CLASSES[size]
          } ${
            disabled
              ? 'bg-gradient-to-b from-[#202429] via-[#171a1e] to-[#0f1215] text-[#6d7681]'
              : FACE_STYLES[variant]
          } ${fullWidth ? 'w-full' : ''} overflow-hidden transition-all duration-150`}
        >
          {/* Top Brushed Specular Edge */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2.5 top-0 h-px bg-[#f5ebe0]/25"
          />

          {/* Bottom Machined Shadow Seam */}
          <span
            aria-hidden="true"
            className="pointer-events-none absolute inset-x-2.5 bottom-0 h-px bg-black/55"
          />

          {/* Subtle Brushed Steel Sheen on Hover */}
          {!disabled && (
            <span
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 -translate-x-full group-hover:translate-x-full transition-transform duration-500 bg-gradient-to-r from-transparent via-white/15 to-transparent skew-x-[-18deg]"
            />
          )}

          {/* Flanking Recessed Metallic Rivets */}
          {withOrnaments && (
            <span
              aria-hidden="true"
              className="relative z-10 w-1.5 h-1.5 rounded-full bg-current opacity-55 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] mr-2.5 shrink-0"
            />
          )}

          <span className="relative z-10 inline-flex items-center justify-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.85)]">
            {children}
          </span>

          {withOrnaments && (
            <span
              aria-hidden="true"
              className="relative z-10 w-1.5 h-1.5 rounded-full bg-current opacity-55 shadow-[inset_0_1px_1px_rgba(0,0,0,0.8)] ml-2.5 shrink-0"
            />
          )}
        </span>
      </span>
    </button>
  );
};
