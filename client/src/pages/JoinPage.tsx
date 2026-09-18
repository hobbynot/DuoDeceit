import React, { useState } from 'react';
import { LogIn, ArrowRight, ShieldCheck, ArrowLeft } from 'lucide-react';
import { useGameSocket } from '../context/GameSocketContext.js';

interface JoinPageProps {
  roomCode: string;
}

export const JoinPage: React.FC<JoinPageProps> = ({ roomCode }) => {
  const { joinRoom } = useGameSocket();
  const [username, setUsername] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    await joinRoom(roomCode.toUpperCase(), trimmed);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-md mx-auto px-4 py-12 space-y-6">
      <div className="text-center space-y-2">
        <div className="w-12 h-12 rounded-2xl bg-mystery-violet/20 border border-mystery-violet/40 text-mystery-cyan flex items-center justify-center mx-auto shadow-lg">
          <LogIn className="w-6 h-6" />
        </div>
        <h2 className="text-3xl font-black text-white">Join Private Game</h2>
        <p className="text-xs text-slate-400">
          You've been invited to play DuoDeceit!
        </p>
      </div>

      <div className="glass-card-glow rounded-3xl p-6 sm:p-8 space-y-5">
        <div className="p-4 rounded-2xl bg-dark-950/80 border border-white/10 text-center">
          <span className="text-[10px] font-mono uppercase tracking-widest text-slate-400 block mb-1">
            ROOM CODE
          </span>
          <span className="text-3xl font-black font-mono tracking-widest text-mystery-cyan">
            {roomCode.toUpperCase()}
          </span>
        </div>

        <form onSubmit={handleJoin} className="space-y-4">
          <div className="space-y-1.5">
            <label htmlFor="direct-username" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
              Enter Your Username
            </label>
            <input
              id="direct-username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              placeholder="e.g. Alex, Sam, Jordan..."
              maxLength={20}
              autoFocus
              required
              className="w-full px-4 py-3.5 rounded-2xl bg-dark-950/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mystery-cyan focus:ring-2 focus:ring-mystery-cyan/20 transition-all"
            />
          </div>

          <button
            type="submit"
            disabled={isLoading || !username.trim()}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-violet to-mystery-cyan hover:brightness-110 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-mystery-violet/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
          >
            <span>{isLoading ? 'ENTERING LOBBY...' : 'JOIN ROOM'}</span>
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="pt-1 flex flex-col items-center gap-3">
          <button
            type="button"
            onClick={() => {
              window.history.pushState(null, '', '/');
              window.dispatchEvent(new PopStateEvent('popstate'));
            }}
            className="inline-flex items-center gap-1.5 text-xs text-slate-400 hover:text-white transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Home</span>
          </button>

          <div className="flex items-center justify-center gap-1.5 text-[11px] text-slate-500">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
            <span>Real-time sync • No audio or text logs recorded</span>
          </div>
        </div>
      </div>
    </div>
  );
};
