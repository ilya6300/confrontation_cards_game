import React from 'react';

interface CornerRivetsProps {
  inset?: 'sm' | 'md';
  tone?: 'steel' | 'dark' | 'rift';
}

/**
 * Four recessed metallic corner rivets echoing the bolted armor plates on the game cards.
 */
export const CornerRivets: React.FC<CornerRivetsProps> = ({
  inset = 'md',
  tone = 'steel',
}) => {
  const pos = inset === 'sm' ? '1.5' : '2.5';
  const rivetClasses =
    tone === 'dark'
      ? 'bg-[radial-gradient(circle_at_35%_35%,#73666c_0%,#2d2428_55%,#0e0b0d_100%)] border-[#1b1417]'
      : tone === 'rift'
      ? 'bg-[radial-gradient(circle_at_35%_35%,#8fb6c4_0%,#394b54_55%,#12191d_100%)] border-[#202d34]'
      : 'bg-[radial-gradient(circle_at_35%_35%,#8a949e_0%,#3b424a_55%,#13161a_100%)] border-[#1f242a]';

  const base = `pointer-events-none absolute w-[7px] h-[7px] rounded-full border shadow-[0_1px_2px_rgba(0,0,0,0.85),inset_0_1px_0.5px_rgba(255,255,255,0.28)] z-20 ${rivetClasses}`;

  return (
    <>
      <span
        aria-hidden="true"
        className={base}
        style={{ top: pos === '1.5' ? '6px' : '10px', left: pos === '1.5' ? '6px' : '10px' }}
      />
      <span
        aria-hidden="true"
        className={base}
        style={{ top: pos === '1.5' ? '6px' : '10px', right: pos === '1.5' ? '6px' : '10px' }}
      />
      <span
        aria-hidden="true"
        className={base}
        style={{ bottom: pos === '1.5' ? '6px' : '10px', left: pos === '1.5' ? '6px' : '10px' }}
      />
      <span
        aria-hidden="true"
        className={base}
        style={{ bottom: pos === '1.5' ? '6px' : '10px', right: pos === '1.5' ? '6px' : '10px' }}
      />
    </>
  );
};

interface LedCounterProps {
  value: number | string;
  size?: 'xs' | 'sm' | 'md';
  minDigits?: number;
  className?: string;
}

/**
 * Compact smoked-glass red LED digital display matching the card Rank & Initiative readouts.
 */
export const LedCounter: React.FC<LedCounterProps> = ({
  value,
  size = 'sm',
  minDigits,
  className = '',
}) => {
  const formatted =
    typeof value === 'number' && minDigits
      ? String(value).padStart(minDigits, '0')
      : String(value);

  const sizeClass =
    size === 'xs'
      ? 'px-1.5 py-[1px] text-[11px] min-w-[24px]'
      : size === 'md'
      ? 'px-2.5 py-0.5 text-sm min-w-[36px]'
      : 'px-2 py-[2px] text-xs min-w-[28px]';

  return (
    <span
      className={`led-readout font-led inline-flex items-center justify-center rounded-[3px] font-extrabold leading-tight tracking-wider select-none ${sizeClass} ${className}`}
    >
      {formatted}
    </span>
  );
};

interface RiftDividerProps {
  direction?: 'left' | 'right' | 'full';
  className?: string;
}

/**
 * Battlefield hairline echoing the cold cyan-blue to burning ember fissure on the table art.
 */
export const RiftDivider: React.FC<RiftDividerProps> = ({
  direction = 'full',
  className = '',
}) => {
  const gradient =
    direction === 'left'
      ? 'bg-gradient-to-r from-transparent via-[#55b2d4]/45 to-[#84d5f0]/75'
      : direction === 'right'
      ? 'bg-gradient-to-l from-transparent via-[#d45c2b]/45 to-[#eb7b44]/75'
      : 'bg-gradient-to-r from-transparent via-[#5dbad9]/65 via-50% to-[#df602e]/65';

  return <div aria-hidden="true" className={`h-px ${gradient} ${className}`} />;
};
