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
  Info,
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

export const BattleLog: React.FC<BattleLogProps> = ({
  logs,
  title = 'Журнал событий боя',
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

  const getLogIcon = (type: LogEntry['type']) => {
    switch (type) {
      case 'destroy':
        return <Skull className="w-3.5 h-3.5 text-[#eb5f57] shrink-0 mt-0.5" />;
      case 'protect':
        return <Shield className="w-3.5 h-3.5 text-[#6ec9d4] shrink-0 mt-0.5" />;
      case 'disable':
        return <ZapOff className="w-3.5 h-3.5 text-[#e29356] shrink-0 mt-0.5" />;
      case 'revive':
        return <Sparkles className="w-3.5 h-3.5 text-[#c77de6] shrink-0 mt-0.5" />;
      case 'rewind':
        return <RotateCcw className="w-3.5 h-3.5 text-[#d9ab66] shrink-0 mt-0.5" />;
      case 'reveal':
        return <Eye className="w-3.5 h-3.5 text-[#8ccae6] shrink-0 mt-0.5" />;
      case 'replace':
        return <RefreshCw className="w-3.5 h-3.5 text-[#7cc2de] shrink-0 mt-0.5" />;
      case 'cancel':
      case 'fail':
        return <Ban className="w-3.5 h-3.5 text-[#d9626c] shrink-0 mt-0.5" />;
      case 'activate':
        return <Swords className="w-3.5 h-3.5 text-[#df7c47] shrink-0 mt-0.5" />;
      default:
        return <Info className="w-3.5 h-3.5 text-[#8c96a3] shrink-0 mt-0.5" />;
    }
  };

  const getLogStyle = (type: LogEntry['type']) => {
    switch (type) {
      case 'destroy':
        return 'border-[#3e2226] border-l-[#d64545] bg-[#1e1013]/85 text-[#f0d8d5]';
      case 'protect':
        return 'border-[#233c44] border-l-[#59b8c7] bg-[#101e23]/85 text-[#d6edf0]';
      case 'disable':
        return 'border-[#442d1f] border-l-[#d97b38] bg-[#1e1510]/85 text-[#f0dfd0]';
      case 'revive':
        return 'border-[#3a2444] border-l-[#b867db] bg-[#1a1120]/85 text-[#ebd8f2]';
      case 'rewind':
        return 'border-[#3f3422] border-l-[#c99b52] bg-[#1b1710]/85 text-[#ede3cf]';
      case 'reveal':
      case 'replace':
        return 'border-[#243747] border-l-[#6bb4d6] bg-[#101922]/85 text-[#d8e8f2]';
      case 'cancel':
      case 'fail':
        return 'border-[#40232b] border-l-[#c95360] bg-[#1d1115]/85 text-[#eed6db]';
      case 'activate':
        return 'border-[#3b302b] border-l-[#d46936] bg-[#191718]/90 text-[#ebe0d1]';
      default:
        return 'border-[#293038] border-l-[#596470] bg-[#12161b]/80 text-[#c3cad2]';
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
          <span className="font-display text-xs sm:text-[13px] font-semibold tracking-[0.09em] text-[#e8ddd0] uppercase truncate">
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

      {/* Recessed Iron Log Console */}
      <div className="p-2 flex-1 min-h-0 flex flex-col">
        <div
          ref={containerRef}
          className={`steel-recessed steel-scrollbar rounded-[4px] p-2.5 overflow-y-auto flex-1 space-y-1.5 font-sans text-xs scroll-smooth ${maxHeight}`}
        >
          {logs.length === 0 ? (
            <div className="text-center py-8 text-[#7a8490] text-xs italic">
              Ожидание начала боя... Выберите карты для противостояния.
            </div>
          ) : (
            logs.map((entry) => (
              <div
                key={entry.id}
                className={`px-2.5 py-2 rounded-[3px] border border-l-2 flex items-start gap-2 text-[11.5px] leading-relaxed transition-colors ${getLogStyle(
                  entry.type
                )}`}
              >
                {getLogIcon(entry.type)}
                <div className="flex-1 min-w-0">
                  <span>{entry.message}</span>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </div>
  );
};
