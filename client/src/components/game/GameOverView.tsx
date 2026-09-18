import React, { useEffect, useState } from 'react';
import confetti from 'canvas-confetti';
import { Trophy, RefreshCw, Home, Skull } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { sound } from '../../utils/sound.js';

export const GameOverView: React.FC = () => {
  const { roomState, isHost, playAgain, returnToLobby } = useGameSocket();
  const [isRestarting, setIsRestarting] = useState(false);
  const [isLobbying, setIsLobbying] = useState(false);

  const summary = roomState?.gameOverSummary;

  useEffect(() => {
    sound.playVictory();
    // Confetti burst
    try {
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.6 },
        colors: ['#9d4edd', '#00f2fe', '#f72585', '#10b981'],
      });
    } catch {
      // safe fallback
    }
  }, []);

  if (!roomState || !summary) return null;

  const isMajorityWinner = summary.winner === 'MAJORITY';

  const handlePlayAgain = async () => {
    if (isRestarting) return;
    setIsRestarting(true);
    await playAgain();
    setIsRestarting(false);
  };

  const handleReturnToLobby = async () => {
    if (isLobbying) return;
    setIsLobbying(true);
    await returnToLobby();
    setIsLobbying(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Victory Banner */}
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-4 relative overflow-hidden">
        <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-400 to-amber-600 text-dark-950 flex items-center justify-center mx-auto shadow-lg shadow-amber-500/20">
          <Trophy className="w-8 h-8 stroke-[2.5]" />
        </div>

        <div className="space-y-1">
          <span className="text-xs font-mono font-bold uppercase tracking-widest text-mystery-cyan">
            GAME OVER
          </span>
          <h2 className="text-3xl sm:text-4xl font-black text-white">
            {isMajorityWinner ? 'MAJORITY WON!' : 'THE DECEIVER WON!'}
          </h2>
          <p className="text-xs text-slate-300">
            {isMajorityWinner
              ? 'The different-word player was discovered and eliminated.'
              : 'The deceiver survived all rounds without being caught!'}
          </p>
        </div>

        {/* Word Pair Reveal Card */}
        <div className="grid grid-cols-2 gap-3 pt-3">
          <div className="p-4 rounded-2xl bg-dark-950/80 border border-white/10 space-y-1">
            <span className="text-[10px] uppercase font-mono text-slate-400 block">
              MAJORITY WORD
            </span>
            <span className="text-xl sm:text-2xl font-black text-slate-200 block">
              {summary.majorityWord}
            </span>
          </div>

          <div className="p-4 rounded-2xl bg-mystery-violet/20 border border-mystery-violet/40 space-y-1">
            <span className="text-[10px] uppercase font-mono text-mystery-violet block">
              DIFFERENT WORD
            </span>
            <span className="text-xl sm:text-2xl font-black text-mystery-cyan block">
              {summary.minorityWord}
            </span>
          </div>
        </div>

        {/* Minority Player Identity */}
        <div className="p-3 rounded-xl bg-dark-900/60 border border-white/5 text-xs text-slate-300">
          Player who had the different word:{' '}
          <strong className="text-mystery-cyan font-bold">
            {summary.minorityPlayerName}
          </strong>
        </div>

        {/* Eliminated History */}
        {summary.eliminatedPlayers.length > 0 && (
          <div className="text-left pt-2">
            <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider block mb-2">
              Eliminated in this game:
            </span>
            <div className="space-y-1.5">
              {summary.eliminatedPlayers.map((p) => (
                <div
                  key={p.id}
                  className="flex items-center justify-between px-3 py-2 rounded-xl bg-dark-900/60 text-xs border border-white/5"
                >
                  <div className="flex items-center gap-2 text-slate-300">
                    <Skull className="w-3.5 h-3.5 text-rose-400" />
                    <span>{p.name}</span>
                  </div>
                  <span className="font-mono text-slate-400 text-[11px]">{p.word}</span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Host Controls */}
      <div className="space-y-3">
        {isHost ? (
          <div className="space-y-2.5">
            <button
              onClick={handlePlayAgain}
              disabled={isRestarting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-violet to-mystery-cyan hover:brightness-110 text-white font-black text-base uppercase tracking-wider shadow-xl shadow-mystery-violet/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <RefreshCw className={`w-5 h-5 ${isRestarting ? 'animate-spin' : ''}`} />
              <span>{isRestarting ? 'STARTING...' : 'PLAY AGAIN (SAME PLAYERS)'}</span>
            </button>

            <button
              onClick={handleReturnToLobby}
              disabled={isLobbying}
              className="w-full py-3.5 px-6 rounded-2xl bg-dark-800 hover:bg-dark-700 border border-white/10 text-slate-300 hover:text-white font-bold text-xs uppercase tracking-wider active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Home className="w-4 h-4" />
              <span>RETURN TO LOBBY</span>
            </button>
          </div>
        ) : (
          <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 text-center">
            <p className="text-xs text-slate-400 animate-pulse">
              Waiting for host to start another game or return to lobby...
            </p>
          </div>
        )}
      </div>
    </div>
  );
};
