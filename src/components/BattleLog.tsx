import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types/game';
import { CornerRivets, LedCounter } from './TacticalChrome';
import {
  Skull,
  Shield,
  ZapOff,
  Sparkles,
  RotateCcw,
  Eye,
  RefreshCw,
  Ban,
  Swords,
  ScrollText,
  X,
} from 'lucide-react';
import { GameButton } from './GameButton';

interface BattleLogProps {
  logs: LogEntry[];
  title?: string;
  maxHeight?: string;
  className?: string;
  onClose?: () => void;
}

function isRoundBannerLog(message: string): boolean {
  return (
    message.startsWith('=== НАЧАЛО ХОДА') ||
    message.startsWith('--- БОЙ #')
  );
}

function formatRoundBanner(message: string): string {
  return message
    .replace(/^===\s*/, '')
    .replace(/\s*===.*$/, '')
    .replace(/^---\s*/, '')
    .replace(/\s*---$/, '')
    .trim();
}

export const BattleLog: React.FC<BattleLogProps> = ({
  logs,
  title = 'Журнал боя',
  maxHeight = 'max-h-64',
  className = '',
  onClose,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (containerRef.current) {
      containerRef.current.scrollTop = containerRef.current.scrollHeight;
    }
  }, [logs]);

  const getLogAccent = (type: LogEntry['type']) => {
    switch (type) {
      case 'destroy':
        return {
          icon: <Skull className="w-3.5 h-3.5 text-[#f06760] shrink-0 mt-0.5" />,
          textClass: 'text-[#f6d5d2]',
          bgClass: 'bg-[#211013]/55',
          indent: true,
        };
      case 'protect':
        return {
          icon: <Shield className="w-3.5 h-3.5 text-[#67cfe0] shrink-0 mt-0.5" />,
          textClass: 'text-[#d8f1f5]',
          bgClass: 'bg-[#0f2026]/50',
          indent: true,
        };
      case 'disable':
        return {
          icon: <ZapOff className="w-3.5 h-3.5 text-[#e89854] shrink-0 mt-0.5" />,
          textClass: 'text-[#f5e1ce]',
          bgClass: 'bg-[#21160f]/50',
          indent: true,
        };
      case 'revive':
        return {
          icon: <Sparkles className="w-3.5 h-3.5 text-[#cf84f0] shrink-0 mt-0.5" />,
          textClass: 'text-[#efdcf7]',
          bgClass: 'bg-[#1c1224]/50',
          indent: true,
        };
      case 'rewind':
        return {
          icon: <RotateCcw className="w-3.5 h-3.5 text-[#e0b266] shrink-0 mt-0.5" />,
          textClass: 'text-[#f2e6d0]',
          bgClass: '',
          indent: true,
        };
      case 'reveal':
        return {
          icon: <Eye className="w-3.5 h-3.5 text-[#8ccae6] shrink-0 mt-0.5" />,
          textClass: 'text-[#dcecf5]',
          bgClass: '',
          indent: true,
        };
      case 'replace':
        return {
          icon: <RefreshCw className="w-3.5 h-3.5 text-[#7cc2de] shrink-0 mt-0.5" />,
          textClass: 'text-[#dcecf5]',
          bgClass: '',
          indent: true,
        };
      case 'cancel':
      case 'fail':
        return {
          icon: <Ban className="w-3.5 h-3.5 text-[#e36976] shrink-0 mt-0.5" />,
          textClass: 'text-[#f2d8dc]',
          bgClass: 'bg-[#1f1116]/45',
          indent: true,
        };
      case 'activate':
        return {
          icon: <Swords className="w-3.5 h-3.5 text-[#e8874d] shrink-0 mt-0.5" />,
          textClass: 'text-[#f5ecdf] font-medium',
          bgClass: '',
          indent: false,
        };
      default:
        return {
          icon: null,
          textClass: 'text-[#a9b4c0]',
          bgClass: '',
          indent: false,
        };
    }
  };

  return (
    <div
      className={`relative w-full rounded-[6px] steel-plate overflow-hidden flex flex-col ${className}`}
    >
      <CornerRivets inset="sm" />

      {/* Header Plate */}
      <div className="px-4 py-2.5 bg-gradient-to-b from-[#232931] via-[#181c22] to-[#12161b] border-b border-[#343c46] flex items-center justify-between gap-2 shrink-0">
        <div className="flex items-center gap-2 min-w-0">
          <ScrollText className="w-4 h-4 text-[#d4c3ad] shrink-0" />
          <span className="font-display text-xs sm:text-[13px] font-semibold tracking-[0.08em] text-[#efe5d7] uppercase truncate">
            {title}
          </span>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <LedCounter value={logs.length} size="xs" minDigits={2} />
          {onClose && (
            <GameButton
              variant="secondary"
              size="xs"
              onClick={onClose}
              title="Закрыть журнал"
            >
              <X className="w-3.5 h-3.5" />
            </GameButton>
          )}
        </div>
      </div>

      {/* Unified Tactical Terminal Feed (zero nested box clutter) */}
      <div
        ref={containerRef}
        className={`bg-[#0a0d11]/95 steel-scrollbar px-3 py-2.5 overflow-y-auto flex-1 font-sans text-xs scroll-smooth ${maxHeight}`}
      >
        {logs.length === 0 ? (
          <div className="text-center py-8 text-[#8793a0] text-xs">
            Ожидание начала боя. Выберите карты для противостояния.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.05]">
            {logs.map((entry) => {
              if (entry.type === 'info' && isRoundBannerLog(entry.message)) {
                return (
                  <div
                    key={entry.id}
                    className="py-2.5 flex items-center gap-2 border-none"
                  >
                    <span className="h-px flex-1 bg-gradient-to-r from-transparent via-[#3d4a57] to-[#4f6273]" />
                    <span className="font-display text-[11px] font-semibold uppercase tracking-[0.09em] text-[#8fd4ea] text-center">
                      {formatRoundBanner(entry.message)}
                    </span>
                    <span className="h-px flex-1 bg-gradient-to-l from-transparent via-[#3d4a57] to-[#4f6273]" />
                  </div>
                );
              }

              const accent = getLogAccent(entry.type);

              return (
                <div
                  key={entry.id}
                  className={`py-2 px-2 flex items-start gap-2 text-[12px] leading-relaxed rounded-[3px] ${
                    accent.bgClass
                  } ${accent.indent ? 'pl-4' : ''}`}
                >
                  {accent.icon}
                  <div className={`flex-1 min-w-0 ${accent.textClass}`}>
                    {entry.message}
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};
