import React from 'react';

interface CardIconProps {
  name: string;
  className?: string;
  color?: string;
}

export const CardIcon: React.FC<CardIconProps> = ({ name, className = 'w-16 h-16', color = 'currentColor' }) => {
  switch (name) {
    case 'disaster':
    case 'natural_disaster':
      // Stylized tornado/vortex exactly like in the user's picture "Стихийное бедствие"
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <path d="M12 24 C 28 20, 72 20, 88 24 C 74 27, 26 27, 12 24 Z" />
          <path d="M18 33 C 32 30, 68 30, 82 33 C 70 36, 30 36, 18 33 Z" />
          <path d="M25 43 C 36 40, 64 40, 75 43 C 65 46, 35 46, 25 43 Z" />
          <path d="M31 53 C 40 51, 60 51, 69 53 C 62 56, 38 56, 31 53 Z" />
          <path d="M38 63 C 44 61, 56 61, 62 63 C 57 66, 43 66, 38 63 Z" />
          <path d="M44 73 C 48 72, 52 72, 56 73 C 53 76, 47 76, 44 73 Z" />
          <path d="M47 82 L 53 82 L 50 88 Z" />
        </svg>
      );

    case 'war_robots':
      // Bipedal combat mech walker matching the user's "Боевые роботы" image
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Main torso */}
          <polygon points="32,28 68,28 76,46 62,56 38,56 24,46" />
          {/* Cockpit visor */}
          <polygon points="40,36 60,36 56,44 44,44" fill="#ef4444" />
          {/* Left cannon arm */}
          <polygon points="18,40 26,42 22,62 14,60" />
          <rect x="12" y="60" width="8" height="14" rx="2" />
          {/* Right weapon arm */}
          <polygon points="82,40 74,42 78,62 86,60" />
          <rect x="80" y="60" width="8" height="14" rx="2" />
          {/* Left leg hydraulic */}
          <polygon points="34,56 42,56 32,74 22,70" />
          <polygon points="32,74 44,88 28,94 18,88" />
          {/* Right leg hydraulic */}
          <polygon points="66,56 58,56 68,74 78,70" />
          <polygon points="68,74 56,88 72,94 82,88" />
        </svg>
      );

    case 'army':
      // 3 rifle rounds / cartridges on military crest
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Left bullet */}
          <path d="M28 20 C 31 10, 35 10, 38 20 L 38 72 L 28 72 Z" />
          <rect x="27" y="74" width="12" height="4" rx="1" />
          {/* Center bullet */}
          <path d="M45 14 C 48 4, 52 4, 55 14 L 55 72 L 45 72 Z" />
          <rect x="44" y="74" width="12" height="4" rx="1" />
          {/* Right bullet */}
          <path d="M62 20 C 65 10, 69 10, 72 20 L 72 72 L 62 72 Z" />
          <rect x="61" y="74" width="12" height="4" rx="1" />
          {/* Chevron base */}
          <polygon points="20,84 50,94 80,84 80,88 50,98 20,88" />
        </svg>
      );

    case 'church':
    case 'battle_church':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Fortified Gothic Cathedral Cross */}
          <polygon points="50,12 36,36 44,36 44,48 24,48 24,56 44,56 44,90 56,90 56,56 76,56 76,48 56,48 56,36 64,36" />
          <circle cx="50" cy="52" r="16" fill="none" stroke={color} strokeWidth="4" />
        </svg>
      );

    case 'war_machines':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Armored tank / mobile battery */}
          <polygon points="15,48 50,38 75,48 85,60 10,60" />
          <rect x="45" y="30" width="48" height="6" rx="2" />
          {/* Treads */}
          <rect x="12" y="62" width="76" height="20" rx="8" />
          <circle cx="24" cy="72" r="6" fill="#1e293b" />
          <circle cx="40" cy="72" r="6" fill="#1e293b" />
          <circle cx="60" cy="72" r="6" fill="#1e293b" />
          <circle cx="76" cy="72" r="6" fill="#1e293b" />
        </svg>
      );

    case 'engineer':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Massive tactical gear & wrench */}
          <path d="M50 20 L55 28 L65 26 L68 36 L78 38 L76 48 L84 54 L78 62 L82 72 L72 76 L70 86 L60 84 L54 92 L46 92 L40 84 L30 86 L28 76 L18 72 L22 62 L16 54 L24 48 L22 38 L32 36 L35 26 L45 28 Z" fill="none" stroke={color} strokeWidth="5" />
          <circle cx="50" cy="56" r="14" fill="none" stroke={color} strokeWidth="5" />
          <polygon points="35,15 45,25 65,15 55,5" fill="#f59e0b" />
        </svg>
      );

    case 'evacuation':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Evacuation shield & upward extraction arrow */}
          <path d="M50 12 C 75 12, 85 24, 85 52 C 85 76, 50 90, 50 90 C 50 90, 15 76, 15 52 C 15 24, 25 12, 50 12 Z" fill="none" stroke={color} strokeWidth="4" />
          <polygon points="50,24 68,46 56,46 56,72 44,72 44,46 32,46" fill="#0ea5e9" />
        </svg>
      );

    case 'medicine':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Medical Red Cross within shield */}
          <path d="M50 12 C 75 12, 85 24, 85 52 C 85 76, 50 90, 50 90 C 50 90, 15 76, 15 52 C 15 24, 25 12, 50 12 Z" fill="none" stroke={color} strokeWidth="4" />
          <rect x="44" y="30" width="12" height="40" rx="2" fill="#ef4444" />
          <rect x="30" y="44" width="40" height="12" rx="2" fill="#ef4444" />
        </svg>
      );

    case 'policeman':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* 7-point tactical star badge */}
          <polygon points="50,15 58,32 76,28 72,46 88,56 74,68 80,86 62,82 50,96 38,82 20,86 26,68 12,56 28,46 24,28 42,32" />
          <circle cx="50" cy="56" r="14" fill="#0f172a" />
        </svg>
      );

    case 'science':
    case 'progressive_science':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Atomic orbital rings */}
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke={color} strokeWidth="4" transform="rotate(0 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke={color} strokeWidth="4" transform="rotate(60 50 50)" />
          <ellipse cx="50" cy="50" rx="42" ry="16" fill="none" stroke={color} strokeWidth="4" transform="rotate(120 50 50)" />
          <circle cx="50" cy="50" r="10" fill="#38bdf8" />
        </svg>
      );

    case 'priest':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Holy radiating halo & cross */}
          <line x1="50" y1="12" x2="50" y2="88" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <line x1="22" y1="38" x2="78" y2="38" stroke={color} strokeWidth="8" strokeLinecap="round" />
          <circle cx="50" cy="38" r="28" fill="none" stroke="#f59e0b" strokeWidth="3" strokeDasharray="6,4" />
        </svg>
      );

    case 'sniper':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Sniper target reticle with bullet mark */}
          <circle cx="50" cy="50" r="38" fill="none" stroke="#ef4444" strokeWidth="4" />
          <circle cx="50" cy="50" r="24" fill="none" stroke="#ef4444" strokeWidth="2" />
          <circle cx="50" cy="50" r="10" fill="none" stroke="#ef4444" strokeWidth="2" />
          <line x1="50" y1="6" x2="50" y2="94" stroke="#ef4444" strokeWidth="3" />
          <line x1="6" y1="50" x2="94" y2="50" stroke="#ef4444" strokeWidth="3" />
          <circle cx="50" cy="50" r="4" fill="#ef4444" />
        </svg>
      );

    case 'scientist':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Laboratory flask with bubbling compound */}
          <path d="M42 16 L58 16 L58 36 L78 74 C 82 82, 76 90, 68 90 L32 90 C 24 90, 18 82, 22 74 L42 36 Z" fill="none" stroke={color} strokeWidth="4" />
          <path d="M26 78 C 34 72, 48 76, 56 70 C 64 66, 72 74, 74 78 L70 84 L30 84 Z" fill="#10b981" />
          <circle cx="44" cy="62" r="3" fill="#10b981" />
          <circle cx="56" cy="54" r="4" fill="#10b981" />
        </svg>
      );

    case 'artillerist':
    case 'seer':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Heavy Artillery officer crest with binoculars & shell */}
          <circle cx="50" cy="50" r="36" fill="none" stroke="#ea580c" strokeWidth="4" />
          <path d="M26 68 L42 34 L58 34 L74 68 Z" fill={color} />
          <circle cx="38" cy="46" r="6" fill="#38bdf8" />
          <circle cx="62" cy="46" r="6" fill="#38bdf8" />
          <rect x="44" y="44" width="12" height="4" fill="#ea580c" />
          <line x1="50" y1="14" x2="50" y2="28" stroke="#ef4444" strokeWidth="3" />
        </svg>
      );

    case 'artillery':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Massive artillery cannon barrage with explosive blast */}
          <polygon points="18,78 38,78 32,86 14,86" fill={color} />
          <circle cx="28" cy="82" r="8" fill="none" stroke={color} strokeWidth="3" />
          <polygon points="26,76 72,32 78,38 32,82" fill="#ef4444" />
          <rect x="68" y="26" width="16" height="8" transform="rotate(-45 76 30)" fill="#f97316" />
          {/* Explosion / barrage fire */}
          <path d="M72 24 C 84 12, 94 28, 88 38 C 96 46, 82 56, 76 48 Z" fill="#fbbf24" />
        </svg>
      );

    case 'lightning':
    case 'abnormal_lightning':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Violent lightning strike */}
          <polygon points="56,8 24,52 48,52 38,94 76,44 52,44" fill="#c084fc" />
          <polygon points="52,14 28,50 46,50 38,86 70,44 50,44" fill="#ffffff" />
        </svg>
      );

    case 'dogs':
    case 'rabid_dogs':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Snarling rabid beast / wolf jaws */}
          <path d="M20 32 L36 20 L50 36 L68 18 L76 34 L88 44 L80 62 L88 78 L72 88 L60 76 L40 76 L26 86 L14 74 L24 58 Z" />
          {/* Eyes */}
          <polygon points="38,42 46,44 40,48" fill="#ef4444" />
          <polygon points="62,42 54,44 60,48" fill="#ef4444" />
          {/* Fangs */}
          <polygon points="42,66 48,66 45,76" fill="#ffffff" />
          <polygon points="52,66 58,66 55,76" fill="#ffffff" />
        </svg>
      );

    case 'vampire':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Vampire bat skull / wing mantle */}
          <path d="M50 20 C 58 35, 80 20, 92 38 C 84 56, 70 52, 66 70 C 60 76, 50 92, 50 92 C 50 92, 40 76, 34 70 C 30 52, 16 56, 8 38 C 20 20, 42 35, 50 20 Z" />
          <circle cx="42" cy="48" r="4" fill="#ef4444" />
          <circle cx="58" cy="48" r="4" fill="#ef4444" />
          <polygon points="44,60 47,60 45,68" fill="#ffffff" />
          <polygon points="53,60 56,60 55,68" fill="#ffffff" />
        </svg>
      );

    case 'demon':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Horned demonic skull */}
          <path d="M22 18 C 30 32, 28 46, 34 52 C 34 72, 44 86, 50 90 C 56 86, 66 72, 66 52 C 72 46, 70 32, 78 18 C 66 22, 58 36, 50 36 C 42 36, 34 22, 22 18 Z" />
          <circle cx="40" cy="52" r="5" fill="#f97316" />
          <circle cx="60" cy="52" r="5" fill="#f97316" />
        </svg>
      );

    case 'zombie':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Rotting undead skull with cracks */}
          <path d="M28 40 C 28 22, 72 22, 72 40 C 72 58, 66 72, 62 82 L38 82 C 34 72, 28 58, 28 40 Z" />
          <circle cx="40" cy="46" r="6" fill="#1e293b" />
          <circle cx="60" cy="48" r="4" fill="#22c55e" />
          <polygon points="46,58 54,58 50,66" fill="#1e293b" />
        </svg>
      );

    case 'necromancer':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Necromancy skull-staff with green soul flames */}
          <circle cx="50" cy="34" r="18" fill="none" stroke={color} strokeWidth="5" />
          <circle cx="44" cy="32" r="3" fill="#22c55e" />
          <circle cx="56" cy="32" r="3" fill="#22c55e" />
          <rect x="46" y="52" width="8" height="42" rx="2" fill={color} />
          <path d="M30 30 C 26 18, 38 12, 38 22 C 38 14, 46 10, 44 24" fill="none" stroke="#22c55e" strokeWidth="3" />
        </svg>
      );

    case 'ghost':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Ethereal flowing phantom */}
          <path d="M50 14 C 28 14, 24 38, 24 58 C 24 74, 18 84, 28 86 C 36 88, 40 78, 48 86 C 54 92, 60 84, 68 86 C 76 88, 76 74, 76 58 C 76 38, 72 14, 50 14 Z" />
          <circle cx="42" cy="40" r="5" fill="#0f172a" />
          <circle cx="58" cy="40" r="5" fill="#0f172a" />
        </svg>
      );

    case 'virus':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Spiked virion particle */}
          <circle cx="50" cy="50" r="22" />
          <line x1="50" y1="12" x2="50" y2="88" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="12" y1="50" x2="88" y2="50" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="23" y1="23" x2="77" y2="77" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <line x1="23" y1="77" x2="77" y2="23" stroke={color} strokeWidth="5" strokeLinecap="round" />
        </svg>
      );

    case 'wizard':
    case 'old_wizard':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Ancient hooded sorcerer silhouette */}
          <polygon points="50,10 32,46 68,46" />
          <path d="M26 50 C 38 48, 62 48, 74 50 L 82 90 L 18 90 Z" />
          <circle cx="50" cy="52" r="4" fill="#a855f7" />
          {/* Time hourglass emblem */}
          <polygon points="46,64 54,64 46,76 54,76" fill="#facc15" />
        </svg>
      );

    case 'disease':
    case 'terrible_disease':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Bubbling toxic droplet / corruption */}
          <path d="M50 12 C 50 12, 22 52, 22 68 C 22 84, 34 92, 50 92 C 66 92, 78 84, 78 68 C 78 52, 50 12, 50 12 Z" />
          <circle cx="42" cy="62" r="5" fill="#84cc16" />
          <circle cx="56" cy="74" r="7" fill="#84cc16" />
        </svg>
      );

    case 'plague':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          {/* Medieval Plague Doctor Beak Mask */}
          <path d="M60 22 C 40 22, 34 36, 34 50 C 34 62, 10 74, 10 74 C 28 78, 50 78, 66 74 C 78 70, 84 56, 84 46 C 84 32, 76 22, 60 22 Z" />
          <circle cx="58" cy="42" r="8" fill="#ef4444" stroke="#ffffff" strokeWidth="2" />
        </svg>
      );

    case 'drone_squad':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <rect x="40" y="42" width="20" height="16" rx="4" />
          <line x1="22" y1="30" x2="78" y2="70" stroke={color} strokeWidth="5" />
          <line x1="78" y1="30" x2="22" y2="70" stroke={color} strokeWidth="5" />
          <circle cx="22" cy="30" r="10" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="78" cy="30" r="10" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="22" cy="70" r="10" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="78" cy="70" r="10" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <circle cx="50" cy="50" r="4" fill="#ef4444" />
        </svg>
      );

    case 'reserves':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <polygon points="50,14 82,28 82,58 50,86 18,58 18,28" fill="none" stroke={color} strokeWidth="5" />
          <polygon points="32,46 50,32 68,46 68,56 50,42 32,56" fill="#38bdf8" />
          <polygon points="32,60 50,46 68,60 68,70 50,56 32,70" fill="#38bdf8" />
        </svg>
      );

    case 'call_reserves':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <rect x="44" y="48" width="12" height="38" rx="3" />
          <circle cx="50" cy="38" r="8" fill="#38bdf8" />
          <path d="M32 28 C 22 36, 22 50, 32 58" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <path d="M68 28 C 78 36, 78 50, 68 58" fill="none" stroke="#38bdf8" strokeWidth="4" strokeLinecap="round" />
          <path d="M22 20 C 10 32, 10 54, 22 66" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
          <path d="M78 20 C 90 32, 90 54, 78 66" fill="none" stroke="#f59e0b" strokeWidth="3" strokeLinecap="round" />
        </svg>
      );

    case 'cold_calculation':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="50" cy="50" r="34" fill="none" stroke="#38bdf8" strokeWidth="4" />
          <polygon points="50,22 64,46 50,42 36,46" fill="#38bdf8" />
          <path d="M28 62 L50 76 L72 62" fill="none" stroke={color} strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
          <circle cx="50" cy="50" r="5" fill="#e0f2fe" />
        </svg>
      );

    case 'medic':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <path d="M50 12 C 75 12, 85 24, 85 52 C 85 76, 50 90, 50 90 C 50 90, 15 76, 15 52 C 15 24, 25 12, 50 12 Z" fill="none" stroke={color} strokeWidth="4" />
          <rect x="44" y="30" width="12" height="40" rx="2" fill="#10b981" />
          <rect x="30" y="44" width="40" height="12" rx="2" fill="#10b981" />
        </svg>
      );

    case 'prayer':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="50" cy="40" r="22" fill="none" stroke="#fbbf24" strokeWidth="4" />
          <line x1="50" y1="10" x2="50" y2="88" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" />
          <line x1="26" y1="40" x2="74" y2="40" stroke="#fef08a" strokeWidth="6" strokeLinecap="round" />
        </svg>
      );

    case 'parasite':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <ellipse cx="50" cy="50" rx="22" ry="28" />
          <path d="M28 40 L12 28 M28 52 L10 52 M28 64 L14 78 M72 40 L88 28 M72 52 L90 52 M72 64 L86 78" stroke={color} strokeWidth="5" strokeLinecap="round" />
          <circle cx="42" cy="40" r="4" fill="#ef4444" />
          <circle cx="58" cy="40" r="4" fill="#ef4444" />
          <circle cx="50" cy="32" r="3" fill="#84cc16" />
        </svg>
      );

    case 'imp':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <path d="M26 24 L38 40 L62 40 L74 24 L70 52 C 70 72, 58 84, 50 88 C 42 84, 30 72, 30 52 Z" />
          <polygon points="38,52 46,56 38,60" fill="#f97316" />
          <polygon points="62,52 54,56 62,60" fill="#f97316" />
        </svg>
      );

    case 'evil_spirit':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <path d="M50 14 C 30 14, 22 36, 26 58 C 28 72, 20 82, 34 86 C 44 88, 52 76, 62 84 C 74 90, 78 72, 74 54 C 72 34, 68 14, 50 14 Z" />
          <circle cx="40" cy="42" r="5" fill="#ec4899" />
          <circle cx="60" cy="42" r="5" fill="#ec4899" />
          <path d="M40 58 Q 50 68, 60 58" fill="none" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'conjurer':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="50" cy="50" r="34" fill="none" stroke="#a855f7" strokeWidth="4" strokeDasharray="8 5" />
          <polygon points="50,18 68,52 50,82 32,52" fill="none" stroke={color} strokeWidth="4" />
          <circle cx="50" cy="50" r="10" fill="#ec4899" />
        </svg>
      );

    case 'dark_sapper':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="48" cy="58" r="24" />
          <rect x="42" y="26" width="12" height="12" rx="2" />
          <path d="M54 28 C 66 22, 72 16, 78 22" fill="none" stroke="#f97316" strokeWidth="4" strokeLinecap="round" />
          <circle cx="80" cy="24" r="6" fill="#ef4444" />
        </svg>
      );

    case 'ball_lightning':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="50" cy="50" r="24" fill="#a855f7" />
          <circle cx="50" cy="50" r="12" fill="#f3e8ff" />
          <path d="M50 10 L46 24 M50 90 L54 76 M10 50 L24 46 M90 50 L76 54 M20 20 L32 32 M80 80 L68 68 M80 20 L68 32 M20 80 L32 68" stroke="#ec4899" strokeWidth="4" strokeLinecap="round" />
        </svg>
      );

    case 'gargoyle':
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <path d="M50 32 L14 18 L24 54 L40 50 L50 86 L60 50 L76 54 L86 18 Z" />
          <circle cx="44" cy="44" r="3.5" fill="#ef4444" />
          <circle cx="56" cy="44" r="3.5" fill="#ef4444" />
        </svg>
      );

    default:
      return (
        <svg viewBox="0 0 100 100" className={className} fill={color}>
          <circle cx="50" cy="50" r="36" />
        </svg>
      );
  }
};
