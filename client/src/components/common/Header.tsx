import React, { useState } from 'react';
import { Volume2, VolumeX, Copy, Check, ArrowLeft, Radio } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { sound } from '../../utils/sound.js';
import { copyToClipboard } from '../../utils/clipboard.js';

export const Header: React.FC = () => {
  const { roomState, leaveRoom, isConnected } = useGameSocket();
  const [muted, setMuted] = useState(sound.isMuted());
  const [copied, setCopied] = useState(false);

  const handleToggleSound = () => {
    const isNowMuted = sound.toggleMute();
    setMuted(isNowMuted);
    if (!isNowMuted) {
      sound.playChime();
    }
  };

  const handleCopyLink = async () => {
    if (!roomState?.roomId) return;
    const url = `${window.location.origin}/join/${roomState.roomId}`;
    const ok = await copyToClipboard(url);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLeave = () => {
    if (roomState?.phase && roomState.phase !== 'LOBBY' && roomState.phase !== 'GAME_OVER') {
      if (!window.confirm('Are you sure you want to leave the active game?')) {
        return;
      }
    }
    leaveRoom();
    window.history.pushState(null, '', '/');
  };

  return (
    <header className="w-full bg-dark-900/80 backdrop-blur-md border-b border-white/5 sticky top-0 z-40 px-4 py-3">
      <div className="max-w-4xl mx-auto flex items-center justify-between">
        {/* Brand */}
        <div className="flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-mystery-violet to-mystery-cyan flex items-center justify-center shadow-lg shadow-mystery-violet/20">
            <span className="text-xl">🎭</span>
          </div>
          <div>
            <h1 className="text-lg font-black tracking-wider bg-gradient-to-r from-white via-slate-200 to-mystery-cyan bg-clip-text text-transparent">
              DUODECEIT
            </h1>
            <div className="flex items-center gap-1.5 text-[10px] text-slate-400">
              <span className={`w-1.5 h-1.5 rounded-full ${isConnected ? 'bg-emerald-400 shadow-sm shadow-emerald-400' : 'bg-rose-500'}`} />
              <span>{isConnected ? 'ONLINE' : 'CONNECTING...'}</span>
            </div>
          </div>
        </div>

        {/* Room & Actions */}
        <div className="flex items-center gap-2 sm:gap-3">
          {roomState?.roomId && (
            <button
              onClick={handleCopyLink}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-dark-800 hover:bg-dark-700 border border-white/10 text-xs font-semibold text-slate-200 transition-colors shadow-sm"
              title="Copy shareable room link"
            >
              <Radio className="w-3.5 h-3.5 text-mystery-cyan animate-pulse" />
              <span className="font-mono tracking-wider text-mystery-cyan font-bold">{roomState.roomId}</span>
              {copied ? (
                <span className="flex items-center gap-1 text-emerald-400 font-medium">
                  <Check className="w-3.5 h-3.5" />
                  <span className="hidden sm:inline">Copied!</span>
                </span>
              ) : (
                <Copy className="w-3.5 h-3.5 text-slate-400" />
              )}
            </button>
          )}

          <button
            onClick={handleToggleSound}
            className="w-9 h-9 rounded-xl bg-dark-800 hover:bg-dark-700 border border-white/10 flex items-center justify-center text-slate-300 transition-colors"
            title={muted ? 'Unmute audio' : 'Mute audio'}
            aria-label={muted ? 'Unmute sound' : 'Mute sound'}
          >
            {muted ? <VolumeX className="w-4 h-4 text-slate-500" /> : <Volume2 className="w-4 h-4 text-mystery-cyan" />}
          </button>

          {roomState && (
            <button
              onClick={handleLeave}
              className="px-2.5 py-1.5 rounded-xl bg-dark-800 hover:bg-rose-950/40 border border-white/10 hover:border-rose-500/30 flex items-center gap-1.5 text-xs text-slate-400 hover:text-rose-400 transition-colors shadow-sm cursor-pointer"
              title="Leave Room / Return Home"
              aria-label="Leave room"
            >
              <ArrowLeft className="w-4 h-4" />
              <span className="hidden sm:inline font-semibold">Exit</span>
            </button>
          )}
        </div>
      </div>
    </header>
  );
};
