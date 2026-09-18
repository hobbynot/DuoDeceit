import React from 'react';
import { MessageSquare, Sparkles } from 'lucide-react';
import { ClueEntry } from '@duodeceit/shared';
import { Avatar } from '../common/Avatar.js';
import { useGameSocket } from '../../context/GameSocketContext.js';

interface ClueBoardProps {
  title?: string;
  collapsible?: boolean;
  defaultExpanded?: boolean;
}

export const ClueBoard: React.FC<ClueBoardProps> = ({
  title = 'Clue Board',
  collapsible = false,
  defaultExpanded = true,
}) => {
  const { roomState } = useGameSocket();
  const [isExpanded, setIsExpanded] = React.useState(defaultExpanded);

  if (!roomState) return null;

  const clues: ClueEntry[] = roomState.clues || [];

  return (
    <div className="glass-card rounded-2xl p-4 space-y-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <MessageSquare className="w-4 h-4 text-mystery-cyan" />
          <h4 className="text-xs font-bold uppercase tracking-wider text-white">
            {title} ({clues.length})
          </h4>
        </div>

        {collapsible && (
          <button
            type="button"
            onClick={() => setIsExpanded(!isExpanded)}
            className="text-[11px] font-semibold text-mystery-cyan hover:underline"
          >
            {isExpanded ? 'Hide' : 'Show'}
          </button>
        )}
      </div>

      {(!collapsible || isExpanded) && (
        <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
          {clues.length === 0 ? (
            <div className="p-4 rounded-xl bg-dark-900/60 border border-white/5 text-center text-xs text-slate-500 flex items-center justify-center gap-2">
              <Sparkles className="w-3.5 h-3.5 text-slate-600" />
              <span>No clues recorded yet.</span>
            </div>
          ) : (
            clues.map((clue) => {
              const player = roomState.players.find((p) => p.id === clue.playerId);
              const avatarColor = player?.avatarColor || '#ec4899';

              return (
                <div
                  key={clue.id}
                  className="flex items-start gap-3 p-2.5 rounded-xl bg-dark-900/80 border border-white/5 hover:border-white/10 transition-colors"
                >
                  <Avatar
                    username={clue.username}
                    avatarColor={avatarColor}
                    size="sm"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-bold text-xs text-slate-200 truncate">
                        {clue.username}
                      </span>
                      <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-dark-950 text-mystery-cyan border border-mystery-cyan/20 shrink-0">
                        R{clue.roundNumber}
                      </span>
                    </div>
                    <p className="text-xs text-slate-300 font-medium mt-0.5 break-words bg-dark-950/60 p-2 rounded-lg border border-white/5">
                      "{clue.clueText}"
                    </p>
                  </div>
                </div>
              );
            })
          )}
        </div>
      )}
    </div>
  );
};
