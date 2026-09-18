import React, { useState } from 'react';
import { Skull, AlertTriangle, ArrowRight, ShieldCheck, HelpCircle } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';

export const VoteResultView: React.FC = () => {
  const { roomState, isHost, proceedNextRound } = useGameSocket();
  const [isProceeding, setIsProceeding] = useState(false);

  if (!roomState || !roomState.lastVoteResult) return null;

  const result = roomState.lastVoteResult;
  const isTie = result.isTie;
  const eliminatedPlayer = result.eliminatedPlayerName;
  const eliminatedWord = result.eliminatedPlayerWord;
  const wasMinority = result.wasMinorityWord;

  const handleProceed = async () => {
    if (isProceeding) return;
    setIsProceeding(true);
    await proceedNextRound();
    setIsProceeding(false);
  };

  const totalVotes = result.tallies.reduce((sum, t) => sum + t.voteCount, 0);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-500/20 border border-rose-500/40 text-xs font-bold text-rose-400 uppercase tracking-wider">
          <Skull className="w-3.5 h-3.5" />
          <span>VOTING TALLY</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          The Ballots Are In
        </h2>
      </div>

      {/* Vote Breakdown Bars */}
      <div className="glass-card rounded-3xl p-6 space-y-3">
        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-2">
          Vote Distribution
        </h3>

        {result.tallies.map((tally) => {
          const percent = totalVotes > 0 ? (tally.voteCount / totalVotes) * 100 : 0;
          const isHighest = tally.targetPlayerId === result.eliminatedPlayerId;

          return (
            <div key={tally.targetPlayerId} className="space-y-1">
              <div className="flex items-center justify-between text-xs">
                <span
                  className={`font-bold ${
                    isHighest ? 'text-rose-400 font-extrabold' : 'text-slate-300'
                  }`}
                >
                  {tally.targetUsername}
                </span>
                <span className="font-mono text-slate-400">
                  {tally.voteCount} {tally.voteCount === 1 ? 'vote' : 'votes'}
                </span>
              </div>
              <div className="w-full h-2.5 rounded-full bg-dark-950 overflow-hidden">
                <div
                  className={`h-full rounded-full transition-all duration-700 ${
                    isHighest ? 'bg-rose-500' : 'bg-mystery-cyan/60'
                  }`}
                  style={{ width: `${percent}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>

      {/* Elimination & Word Reveal Card */}
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-5">
        {isTie ? (
          <div className="space-y-3">
            <div className="w-14 h-14 rounded-full bg-amber-950/60 border border-amber-500/40 text-amber-400 flex items-center justify-center mx-auto">
              <AlertTriangle className="w-7 h-7" />
            </div>
            <h3 className="text-2xl font-black text-amber-300 uppercase">
              TIE VOTE UNBROKEN
            </h3>
            <p className="text-xs text-slate-300 max-w-sm mx-auto">
              The revote remained tied! As per game rules, no one is eliminated this round.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="w-14 h-14 rounded-full bg-rose-950/60 border border-rose-500/40 text-rose-400 flex items-center justify-center mx-auto">
              <Skull className="w-7 h-7" />
            </div>

            <div>
              <p className="text-xs font-mono uppercase tracking-widest text-slate-400">
                ELIMINATED PLAYER
              </p>
              <h3 className="text-3xl font-black text-rose-400 mt-1">
                {eliminatedPlayer}
              </h3>
            </div>

            {/* Secret Word Reveal */}
            <div className="p-4 rounded-2xl bg-dark-950/80 border border-white/10 space-y-1">
              <p className="text-[11px] font-mono uppercase text-slate-400">
                {eliminatedPlayer}'S SECRET WORD WAS:
              </p>
              <p className="text-3xl font-black text-white tracking-wide">
                {eliminatedWord}
              </p>
            </div>

            {/* Status Announcement */}
            {wasMinority ? (
              <div className="p-3 rounded-xl bg-emerald-950/60 border border-emerald-500/30 text-emerald-300 text-xs font-bold flex items-center justify-center gap-2">
                <ShieldCheck className="w-4 h-4 text-emerald-400" />
                <span>THE DIFFERENT WORD WAS FOUND!</span>
              </div>
            ) : (
              <div className="p-3 rounded-xl bg-rose-950/60 border border-rose-500/30 text-rose-300 text-xs font-bold flex items-center justify-center gap-2">
                <HelpCircle className="w-4 h-4 text-rose-400" />
                <span>THE DIFFERENT WORD IS STILL IN THE GAME!</span>
              </div>
            )}
          </div>
        )}

        {/* Continue to Next Round (Host only) */}
        {!wasMinority && (
          <div className="pt-2">
            {isHost ? (
              <button
                onClick={handleProceed}
                disabled={isProceeding}
                className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-violet to-mystery-cyan hover:brightness-110 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-mystery-violet/25 flex items-center justify-center gap-2 active:scale-98 transition-transform cursor-pointer"
              >
                <span>{isProceeding ? 'STARTING NEXT ROUND...' : 'CONTINUE TO NEXT ROUND'}</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            ) : (
              <p className="text-xs text-slate-400 animate-pulse">
                Waiting for host to proceed to next round...
              </p>
            )}
          </div>
        )}
      </div>
    </div>
  );
};
