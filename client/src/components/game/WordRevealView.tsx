import React, { useState } from 'react';
import { Eye, EyeOff, Check, Lock, Sparkles, HelpCircle } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';

export const WordRevealView: React.FC = () => {
  const { roomState, privateData, myPlayer, confirmWord } = useGameSocket();
  const [isRevealed, setIsRevealed] = useState(true);
  const [isConfirming, setIsConfirming] = useState(false);

  if (!roomState) return null;

  const hasConfirmed = myPlayer?.hasConfirmedWord || false;
  const activePlayers = roomState.players.filter((p) => p.connected && !p.eliminated);
  const confirmedCount = activePlayers.filter((p) => p.hasConfirmedWord).length;

  const handleConfirm = async () => {
    if (hasConfirmed || isConfirming) return;
    setIsConfirming(true);
    await confirmWord();
    setIsConfirming(false);
  };

  const secretWord = privateData?.secretWord || '••••••••';
  const category = privateData?.category || 'General';

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Top Banner */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-mystery-violet/20 border border-mystery-violet/40 text-xs font-bold text-mystery-violet uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>PHASE 1: SECRET WORD</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Memorize Your Word
        </h2>
        <p className="text-xs sm:text-sm text-slate-400 max-w-sm mx-auto">
          Keep your screen private. Do not let anyone standing nearby see your word!
        </p>
      </div>

      {/* Secret Card */}
      <div className="relative">
        <div
          onClick={() => setIsRevealed(!isRevealed)}
          className={`glass-card-glow rounded-3xl p-8 sm:p-10 text-center cursor-pointer transition-all duration-300 relative select-none ${
            isRevealed ? 'border-mystery-cyan/50' : 'border-white/10'
          }`}
        >
          <div className="flex items-center justify-between text-xs text-slate-400 mb-6">
            <span className="font-semibold uppercase tracking-wider text-slate-500">
              CATEGORY: <strong className="text-slate-300">{category}</strong>
            </span>
            <span className="flex items-center gap-1 text-[11px] text-mystery-cyan">
              {isRevealed ? (
                <>
                  <EyeOff className="w-3.5 h-3.5" /> Tap to Hide
                </>
              ) : (
                <>
                  <Eye className="w-3.5 h-3.5" /> Tap to Peek
                </>
              )}
            </span>
          </div>

          <div className="py-6 sm:py-8 space-y-2">
            <p className="text-xs uppercase tracking-widest font-mono text-slate-400">
              YOUR SECRET WORD
            </p>

            {isRevealed ? (
              <div className="animate-in fade-in zoom-in-95 duration-200">
                <span className="text-4xl sm:text-5xl font-black tracking-wide text-transparent bg-clip-text bg-gradient-to-r from-mystery-cyan via-white to-mystery-violet drop-shadow-md">
                  {secretWord}
                </span>
              </div>
            ) : (
              <div className="py-2 flex items-center justify-center gap-2 text-slate-600">
                <Lock className="w-6 h-6 text-slate-500 animate-pulse" />
                <span className="font-mono text-2xl tracking-widest">HIDDEN</span>
              </div>
            )}
          </div>

          <p className="text-xs text-slate-400 mt-4 leading-relaxed">
            Remember this word. During clue rounds, give subtle hints about it without saying it out loud.
          </p>
        </div>
      </div>

      {/* Confirmation Action */}
      <div className="space-y-4">
        {!hasConfirmed ? (
          <button
            onClick={handleConfirm}
            disabled={isConfirming}
            className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 text-dark-950 font-black text-base uppercase tracking-wider shadow-lg shadow-emerald-500/20 active:scale-98 transition-transform cursor-pointer"
          >
            <div className="flex items-center justify-center gap-2">
              <Check className="w-5 h-5 stroke-[3]" />
              <span>{isConfirming ? 'CONFIRMING...' : 'I REMEMBER THIS WORD'}</span>
            </div>
          </button>
        ) : (
          <div className="p-4 rounded-2xl bg-emerald-950/40 border border-emerald-500/30 text-center space-y-2">
            <div className="flex items-center justify-center gap-2 text-emerald-400 font-bold text-sm">
              <Check className="w-4 h-4" />
              <span>Word confirmed! Waiting for others...</span>
            </div>
            <p className="text-xs text-slate-400">
              {confirmedCount} of {activePlayers.length} players ready
            </p>
          </div>
        )}

        {/* Players Readiness Grid */}
        <div className="glass-card rounded-2xl p-4 space-y-2.5">
          <div className="flex items-center justify-between text-xs font-bold text-slate-300 uppercase tracking-wider">
            <span>Ready Status</span>
            <span className="font-mono text-mystery-cyan">
              {confirmedCount}/{activePlayers.length}
            </span>
          </div>

          <div className="flex flex-wrap gap-2 pt-1">
            {activePlayers.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border transition-colors ${
                  p.hasConfirmedWord
                    ? 'bg-emerald-950/60 border-emerald-500/40 text-emerald-300'
                    : 'bg-dark-900 border-white/10 text-slate-400'
                }`}
              >
                <span
                  className={`w-2 h-2 rounded-full ${
                    p.hasConfirmedWord ? 'bg-emerald-400' : 'bg-slate-600 animate-pulse'
                  }`}
                />
                <span>{p.username}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Helpful Tip */}
        <div className="p-3.5 rounded-2xl bg-dark-900/40 border border-white/5 flex items-start gap-2.5 text-xs text-slate-400">
          <HelpCircle className="w-4 h-4 text-mystery-cyan shrink-0 mt-0.5" />
          <p>
            One person in the room has a subtly different word. They do NOT know they are the different one! Pay close attention to everyone's clues.
          </p>
        </div>
      </div>
    </div>
  );
};
