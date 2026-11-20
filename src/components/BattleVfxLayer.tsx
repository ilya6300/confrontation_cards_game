import React from 'react';
import { CardDefinition } from '../types/game';

export type VfxArchetype =
  | 'sniper_tracer'
  | 'lightning'
  | 'toxic'
  | 'artillery'
  | 'shield_dome'
  | 'holy_purge'
  | 'arcane_ritual'
  | 'melee_strike';

export type EffectTheme = 'fire' | 'emerald' | 'arcane' | 'toxic' | 'sky' | 'crimson';

export interface VfxPoint {
  x: number;
  y: number;
}

export interface ActiveVfxData {
  id: string;
  archetype: VfxArchetype;
  theme: EffectTheme;
  sourcePoint: VfxPoint;
  targetPoints: VfxPoint[];
  centerPoint: VfxPoint;
  containerWidth: number;
  containerHeight: number;
}

export const VFX_THEME_PALETTE: Record<
  EffectTheme,
  { primary: string; secondary: string; core: string; glow: string }
> = {
  fire: {
    primary: '#f97316',
    secondary: '#ef4444',
    core: '#fef08a',
    glow: 'rgba(249, 115, 22, 0.5)',
  },
  emerald: {
    primary: '#10b981',
    secondary: '#34d399',
    core: '#d1fae5',
    glow: 'rgba(16, 185, 129, 0.45)',
  },
  arcane: {
    primary: '#a855f7',
    secondary: '#ec4899',
    core: '#f3e8ff',
    glow: 'rgba(168, 85, 247, 0.5)',
  },
  toxic: {
    primary: '#84cc16',
    secondary: '#a3e635',
    core: '#ecfccb',
    glow: 'rgba(132, 204, 22, 0.48)',
  },
  sky: {
    primary: '#38bdf8',
    secondary: '#06b6d4',
    core: '#e0f2fe',
    glow: 'rgba(56, 189, 248, 0.5)',
  },
  crimson: {
    primary: '#ef4444',
    secondary: '#f43f5e',
    core: '#fecdd3',
    glow: 'rgba(239, 68, 68, 0.5)',
  },
};

export function getVfxArchetypeForCard(card: CardDefinition): VfxArchetype {
  switch (card.id) {
    case 'sniper':
    case 'army':
    case 'policeman':
    case 'war_machines':
    case 'war_robots':
    case 'drone_squad':
    case 'reserves':
      return 'sniper_tracer';
    case 'abnormal_lightning':
    case 'ball_lightning':
      return 'lightning';
    case 'plague':
    case 'terrible_disease':
    case 'hidden_virus':
    case 'parasite':
      return 'toxic';
    case 'artillery':
    case 'seer':
    case 'artillerist':
    case 'natural_disaster':
    case 'dark_sapper':
      return 'artillery';
    case 'engineer':
    case 'scientist':
    case 'progressive_science':
    case 'evacuation':
    case 'call_reserves':
    case 'cold_calculation':
    case 'medic':
      return 'shield_dome';
    case 'priest':
    case 'prayer':
    case 'battle_church':
      return 'holy_purge';
    case 'old_wizard':
    case 'necromancer':
    case 'conjurer':
    case 'demon':
    case 'ghost':
    case 'evil_spirit':
      return 'arcane_ritual';
    default:
      return 'melee_strike';
  }
}

export function isHeavyShakeCard(card: CardDefinition): boolean {
  return (
    card.id === 'artillery' ||
    card.id === 'seer' ||
    card.id === 'artillerist' ||
    card.id === 'natural_disaster' ||
    card.id === 'demon' ||
    card.id === 'war_robots' ||
    card.id === 'plague' ||
    card.id === 'abnormal_lightning'
  );
}

/**
 * Generates a jagged electric bolt path between two points.
 */
function buildLightningPath(from: VfxPoint, to: VfxPoint, seed: number): string {
  const segments = 6;
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const dist = Math.hypot(dx, dy) || 1;
  const nx = -dy / dist;
  const ny = dx / dist;
  const pts: string[] = [`M ${from.x.toFixed(1)} ${from.y.toFixed(1)}`];

  for (let i = 1; i < segments; i++) {
    const t = i / segments;
    const jitterDir = (i + seed) % 2 === 0 ? 1 : -1;
    const jitterAmp = (14 + ((i * 7 + seed * 11) % 16)) * jitterDir;
    const px = from.x + dx * t + nx * jitterAmp;
    const py = from.y + dy * t + ny * jitterAmp;
    pts.push(`L ${px.toFixed(1)} ${py.toFixed(1)}`);
  }
  pts.push(`L ${to.x.toFixed(1)} ${to.y.toFixed(1)}`);
  return pts.join(' ');
}

interface BattleVfxLayerProps {
  vfx: ActiveVfxData | null;
}

/**
 * Arena-wide SVG trajectory & impact VFX overlay synchronized with real card DOM bounds.
 */
export const BattleVfxLayer: React.FC<BattleVfxLayerProps> = ({ vfx }) => {
  if (!vfx) return null;

  const palette = VFX_THEME_PALETTE[vfx.theme];
  const { sourcePoint, targetPoints, centerPoint, containerWidth, containerHeight, archetype } =
    vfx;
  const effectiveTargets = targetPoints.length > 0 ? targetPoints : [centerPoint];

  return (
    <svg
      key={vfx.id}
      aria-hidden="true"
      width={containerWidth}
      height={containerHeight}
      viewBox={`0 0 ${Math.max(1, containerWidth)} ${Math.max(1, containerHeight)}`}
      className="pointer-events-none absolute inset-0 z-40 overflow-visible"
    >
      <defs>
        <filter id="vfxGlowSoft" x="-30%" y="-30%" width="160%" height="160%">
          <feGaussianBlur stdDeviation="3.5" result="blur" />
          <feMerge>
            <feMergeNode in="blur" />
            <feMergeNode in="SourceGraphic" />
          </feMerge>
        </filter>
        <radialGradient id="toxicMistGrad">
          <stop offset="0%" stopColor={palette.core} stopOpacity="0.6" />
          <stop offset="55%" stopColor={palette.primary} stopOpacity="0.35" />
          <stop offset="100%" stopColor={palette.primary} stopOpacity="0" />
        </radialGradient>
        <radialGradient id="blastGrad">
          <stop offset="0%" stopColor={palette.core} stopOpacity="0.9" />
          <stop offset="45%" stopColor={palette.primary} stopOpacity="0.5" />
          <stop offset="100%" stopColor={palette.secondary} stopOpacity="0" />
        </radialGradient>
      </defs>

      {/* 1. SNIPER / BALLISTIC TRACER: precision laser sight + bright bullet streaks + target crosshairs */}
      {archetype === 'sniper_tracer' && (
        <g filter="url(#vfxGlowSoft)">
          {effectiveTargets.map((tgt, idx) => (
            <g key={`tracer-${idx}`}>
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={palette.primary}
                strokeWidth="4"
                strokeLinecap="round"
                strokeDasharray="100%"
                className="animate-vfx-beam"
                opacity="0.85"
              />
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={palette.core}
                strokeWidth="1.6"
                strokeLinecap="round"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <g
                style={{
                  transformOrigin: `${tgt.x}px ${tgt.y}px`,
                }}
                className="animate-vfx-burst"
              >
                <circle
                  cx={tgt.x}
                  cy={tgt.y}
                  r="24"
                  fill="none"
                  stroke={palette.primary}
                  strokeWidth="2"
                  strokeDasharray="6 4"
                />
                <line x1={tgt.x - 32} y1={tgt.y} x2={tgt.x - 14} y2={tgt.y} stroke={palette.core} strokeWidth="2" />
                <line x1={tgt.x + 14} y1={tgt.y} x2={tgt.x + 32} y2={tgt.y} stroke={palette.core} strokeWidth="2" />
                <line x1={tgt.x} y1={tgt.y - 32} x2={tgt.x} y2={tgt.y - 14} stroke={palette.core} strokeWidth="2" />
                <line x1={tgt.x} y1={tgt.y + 14} x2={tgt.x} y2={tgt.y + 32} stroke={palette.core} strokeWidth="2" />
                <circle cx={tgt.x} cy={tgt.y} r="8" fill={palette.core} opacity="0.9" />
              </g>
            </g>
          ))}
        </g>
      )}

      {/* 2. LIGHTNING: branched jagged electric arcs */}
      {archetype === 'lightning' && (
        <g filter="url(#vfxGlowSoft)" className="animate-vfx-lightning">
          {effectiveTargets.map((tgt, idx) => (
            <g key={`bolt-${idx}`}>
              <path
                d={buildLightningPath(sourcePoint, tgt, idx + 1)}
                fill="none"
                stroke={palette.primary}
                strokeWidth="5.5"
                strokeLinejoin="round"
                strokeLinecap="round"
                opacity="0.82"
              />
              <path
                d={buildLightningPath(sourcePoint, tgt, idx + 1)}
                fill="none"
                stroke="#ffffff"
                strokeWidth="2"
                strokeLinejoin="round"
                strokeLinecap="round"
              />
              <path
                d={buildLightningPath(sourcePoint, tgt, idx + 4)}
                fill="none"
                stroke={palette.secondary}
                strokeWidth="2"
                strokeLinejoin="round"
                opacity="0.7"
              />
              <circle cx={tgt.x} cy={tgt.y} r="28" fill="url(#blastGrad)" />
            </g>
          ))}
        </g>
      )}

      {/* 3. TOXIC / VIRUS: billowing corrosive wave + target bio-rings */}
      {archetype === 'toxic' && (
        <g>
          <circle
            cx={centerPoint.x}
            cy={centerPoint.y}
            r="125"
            fill="url(#toxicMistGrad)"
            style={{ transformOrigin: `${centerPoint.x}px ${centerPoint.y}px` }}
            className="animate-toxic-wave"
          />
          {effectiveTargets.map((tgt, idx) => (
            <g key={`tox-${idx}`}>
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke={palette.primary}
                strokeWidth="2.5"
                strokeDasharray="8 6"
                opacity="0.7"
                className="animate-vfx-beam"
              />
              <circle
                cx={tgt.x}
                cy={tgt.y}
                r="52"
                fill="url(#toxicMistGrad)"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-toxic-wave"
              />
              <circle
                cx={tgt.x}
                cy={tgt.y}
                r="26"
                fill="none"
                stroke={palette.primary}
                strokeWidth="2"
                strokeDasharray="4 4"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              />
            </g>
          ))}
        </g>
      )}

      {/* 4. ARTILLERY / DISASTER: fiery barrage arcs + ground shockwaves */}
      {archetype === 'artillery' && (
        <g filter="url(#vfxGlowSoft)">
          <circle
            cx={centerPoint.x}
            cy={centerPoint.y}
            r="115"
            fill="url(#blastGrad)"
            style={{ transformOrigin: `${centerPoint.x}px ${centerPoint.y}px` }}
            className="animate-shockwave"
          />
          {effectiveTargets.map((tgt, idx) => (
            <g key={`art-${idx}`}>
              <line
                x1={tgt.x - 45}
                y1={Math.max(0, tgt.y - 140)}
                x2={tgt.x}
                y2={tgt.y}
                stroke={palette.core}
                strokeWidth="3.5"
                strokeLinecap="round"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <circle
                cx={tgt.x}
                cy={tgt.y}
                r="56"
                fill="url(#blastGrad)"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              />
              <circle
                cx={tgt.x}
                cy={tgt.y}
                r="34"
                fill="none"
                stroke={palette.core}
                strokeWidth="2.5"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              />
            </g>
          ))}
        </g>
      )}

      {/* 5. SHIELD DOME / SUPPORT / EXTRACTION: luminous energy links + hex barriers */}
      {archetype === 'shield_dome' && (
        <g filter="url(#vfxGlowSoft)">
          {effectiveTargets.map((tgt, idx) => (
            <g key={`shield-${idx}`}>
              <path
                d={`M ${sourcePoint.x} ${sourcePoint.y} Q ${(sourcePoint.x + tgt.x) / 2} ${
                  Math.min(sourcePoint.y, tgt.y) - 42
                } ${tgt.x} ${tgt.y}`}
                fill="none"
                stroke={palette.primary}
                strokeWidth="3"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <polygon
                points={`${tgt.x},${tgt.y - 34} ${tgt.x + 30},${tgt.y - 17} ${tgt.x + 30},${
                  tgt.y + 17
                } ${tgt.x},${tgt.y + 34} ${tgt.x - 30},${tgt.y + 17} ${tgt.x - 30},${tgt.y - 17}`}
                fill={palette.glow}
                stroke={palette.core}
                strokeWidth="2"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              />
            </g>
          ))}
        </g>
      )}

      {/* 6. HOLY PURGE (Priest / Prayer / Battle Church): golden radiant beams */}
      {archetype === 'holy_purge' && (
        <g filter="url(#vfxGlowSoft)">
          {effectiveTargets.map((tgt, idx) => (
            <g key={`holy-${idx}`}>
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="#fbbf24"
                strokeWidth="4.5"
                strokeLinecap="round"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <line
                x1={sourcePoint.x}
                y1={sourcePoint.y}
                x2={tgt.x}
                y2={tgt.y}
                stroke="#fef9c3"
                strokeWidth="1.8"
                strokeLinecap="round"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <g
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              >
                <line x1={tgt.x} y1={tgt.y - 36} x2={tgt.x} y2={tgt.y + 36} stroke="#fef08a" strokeWidth="3" />
                <line x1={tgt.x - 28} y1={tgt.y} x2={tgt.x + 28} y2={tgt.y} stroke="#fef08a" strokeWidth="3" />
                <circle cx={tgt.x} cy={tgt.y} r="22" fill="none" stroke="#f59e0b" strokeWidth="2.5" />
              </g>
            </g>
          ))}
        </g>
      )}

      {/* 7. ARCANE RITUAL / DEMON / UNDEAD: curved sigil tethers + runic burst */}
      {archetype === 'arcane_ritual' && (
        <g filter="url(#vfxGlowSoft)">
          <circle
            cx={centerPoint.x}
            cy={centerPoint.y}
            r="68"
            fill="none"
            stroke={palette.primary}
            strokeWidth="2.5"
            strokeDasharray="10 6"
            style={{ transformOrigin: `${centerPoint.x}px ${centerPoint.y}px` }}
            className="animate-rays-burst"
          />
          {effectiveTargets.map((tgt, idx) => (
            <g key={`arc-${idx}`}>
              <path
                d={`M ${sourcePoint.x} ${sourcePoint.y} Q ${(sourcePoint.x + tgt.x) / 2 + (idx % 2 === 0 ? 34 : -34)} ${
                  (sourcePoint.y + tgt.y) / 2
                } ${tgt.x} ${tgt.y}`}
                fill="none"
                stroke={palette.primary}
                strokeWidth="3.5"
                strokeDasharray="100%"
                className="animate-vfx-beam"
              />
              <circle
                cx={tgt.x}
                cy={tgt.y}
                r="38"
                fill="url(#blastGrad)"
                style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
                className="animate-vfx-burst"
              />
            </g>
          ))}
        </g>
      )}

      {/* 8. MELEE STRIKE (Vampire, Zombie, Rabid Dogs, Gargoyle): crimson claw vector */}
      {archetype === 'melee_strike' && (
        <g filter="url(#vfxGlowSoft)">
          {effectiveTargets.map((tgt, idx) => (
            <g
              key={`melee-${idx}`}
              style={{ transformOrigin: `${tgt.x}px ${tgt.y}px` }}
              className="animate-vfx-burst"
            >
              <line x1={tgt.x - 32} y1={tgt.y - 26} x2={tgt.x + 28} y2={tgt.y + 24} stroke={palette.primary} strokeWidth="4.5" strokeLinecap="round" />
              <line x1={tgt.x - 20} y1={tgt.y - 34} x2={tgt.x + 36} y2={tgt.y + 14} stroke={palette.core} strokeWidth="2.5" strokeLinecap="round" />
              <line x1={tgt.x - 38} y1={tgt.y - 14} x2={tgt.x + 18} y2={tgt.y + 34} stroke={palette.secondary} strokeWidth="3" strokeLinecap="round" />
            </g>
          ))}
        </g>
      )}
    </svg>
  );
};

interface BattlefieldAmbientLayerProps {
  flipped?: boolean;
}

const AMBIENT_EMBERS = [
  { left: '12%', bottom: '44%', size: 3, dur: '6.4s', delay: '-1.2s', drift: '14px', cyan: true },
  { left: '22%', bottom: '46%', size: 2.5, dur: '7.8s', delay: '-3.5s', drift: '-12px', cyan: true },
  { left: '34%', bottom: '43%', size: 3.5, dur: '6.9s', delay: '-0.5s', drift: '18px', cyan: true },
  { left: '43%', bottom: '47%', size: 2, dur: '8.2s', delay: '-4.1s', drift: '-8px', cyan: true },
  { left: '54%', bottom: '45%', size: 3, dur: '6.2s', delay: '-2.0s', drift: '16px', cyan: false },
  { left: '63%', bottom: '42%', size: 3.5, dur: '7.4s', delay: '-5.2s', drift: '-15px', cyan: false },
  { left: '72%', bottom: '46%', size: 2.5, dur: '5.9s', delay: '-0.9s', drift: '20px', cyan: false },
  { left: '81%', bottom: '43%', size: 3, dur: '8.0s', delay: '-3.0s', drift: '-18px', cyan: false },
  { left: '89%', bottom: '45%', size: 2, dur: '6.6s', delay: '-4.7s', drift: '10px', cyan: false },
  { left: '28%', bottom: '48%', size: 2, dur: '9.1s', delay: '-6.2s', drift: '12px', cyan: true },
  { left: '68%', bottom: '48%', size: 2.5, dur: '7.1s', delay: '-2.4s', drift: '-10px', cyan: false },
];

/**
 * Subtle atmospheric breathing rift glow + drifting embers over the battlefield fissure.
 */
export const BattlefieldAmbientLayer: React.FC<BattlefieldAmbientLayerProps> = ({
  flipped = false,
}) => {
  return (
    <div
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 overflow-hidden z-[2] ${
        flipped ? 'rotate-180' : ''
      }`}
    >
      {/* Left Cyan Rift Breath */}
      <div className="absolute left-[4%] top-[44%] w-[46%] h-20 rounded-full bg-[#4fc4e8]/18 blur-3xl animate-rift-breath" />
      {/* Right Ember Rift Breath */}
      <div
        className="absolute right-[4%] top-[45%] w-[48%] h-20 rounded-full bg-[#ea682a]/20 blur-3xl animate-rift-breath"
        style={{ animationDelay: '-3.1s' }}
      />
      {/* Slow Floating Sparks & Mist Motes */}
      {AMBIENT_EMBERS.map((mote, i) => (
        <span
          key={i}
          className="absolute rounded-full animate-ember-float"
          style={
            {
              left: mote.left,
              bottom: mote.bottom,
              width: `${mote.size}px`,
              height: `${mote.size}px`,
              backgroundColor: mote.cyan ? '#9be7ff' : '#ff9a52',
              boxShadow: mote.cyan
                ? '0 0 8px rgba(103, 212, 240, 0.9)'
                : '0 0 8px rgba(249, 115, 22, 0.9)',
              '--ember-dur': mote.dur,
              '--ember-delay': mote.delay,
              '--drift-x': mote.drift,
            } as React.CSSProperties
          }
        />
      ))}
    </div>
  );
};
