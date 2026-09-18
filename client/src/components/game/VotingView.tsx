import React, { useState } from 'react';
import { Vote, Check, Users, AlertCircle } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { Avatar } from '../common/Avatar.js';
import { ClueBoard } from './ClueBoard.js';

export const VotingView: React.FC = () => {
  const { roomState, myPlayerId, myPlayer, submitVote } = useGameSocket();
  const [selectedTargetId, setSelectedTargetId] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

  if (!roomState) return null;

  const hasVoted = myPlayer?.hasVoted || false;
  const isEliminated = myPlayer?.eliminated || false;
  const isRevote = roomState.eligibleCandidateIds.length < roomState.players.filter((p) => !p.eliminated).length;

  const eligibleCandidates = roomState.players.filter((p) =>
    roomState.eligibleCandidateIds.includes(p.id)
  );

  const eligibleVoters = roomState.players.filter((p) =>
    roomState.eligibleVoterIds.includes(p.id)
  );
  const votedCount = eligibleVoters.filter((p) => p.hasVoted).length;

  const handleVote = async () => {
    if (!selectedTargetId || hasVoted || isSubmitting) return;
    setIsSubmitting(true);
    await submitVote(selectedTargetId);
    setIsSubmitting(false);
  };

  const selectedPlayer = eligibleCandidates.find((p) => p.id === selectedTargetId);

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mystery-pink/20 border border-mystery-pink/40 text-xs font-bold text-mystery-pink uppercase tracking-wider">
          <Vote className="w-3.5 h-3.5" />
          <span>{isRevote ? 'TIE-BREAKER REVOTE' : 'SECRET BALLOT'}</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Who Has The Different Word?
        </h2>
        <p className="text-xs text-slate-400">
          Cast your vote secretly. Votes will be tallied after all players submit.
        </p>
      </div>

      {/* Revote Alert Banner */}
      {isRevote && (
        <div className="p-3.5 rounded-2xl bg-amber-950/60 border border-amber-500/40 flex items-center gap-3 text-amber-200 text-xs">
          <AlertCircle className="w-5 h-5 text-amber-400 shrink-0" />
          <span>
            <strong>Previous vote was a tie!</strong> Please cast a revote between the tied candidates below.
          </span>
        </div>
      )}

      {/* Main Voting Interface */}
      {!hasVoted && !isEliminated ? (
        <div className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
            {eligibleCandidates.map((candidate) => {
              const isMe = candidate.id === myPlayerId;
              const isSelected = candidate.id === selectedTargetId;

              return (
                <button
                  key={candidate.id}
                  disabled={isMe}
                  onClick={() => setSelectedTargetId(candidate.id)}
                  className={`p-4 rounded-2xl border text-left flex items-center justify-between transition-all duration-200 ${
                    isMe
                      ? 'bg-dark-950/40 border-white/5 opacity-40 cursor-not-allowed'
                      : isSelected
                      ? 'bg-mystery-pink/20 border-mystery-pink ring-2 ring-mystery-pink/40 scale-[1.02] shadow-lg shadow-mystery-pink/20'
                      : 'bg-dark-900/80 border-white/10 hover:border-white/20 active:scale-98 cursor-pointer'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <Avatar
                      username={candidate.username}
                      avatarColor={candidate.avatarColor}
                      size="md"
                    />
                    <div>
                      <span className="font-bold text-sm text-slate-100 block">
                        {candidate.username}
                      </span>
                      <span className="text-[11px] text-slate-400">
                        {isMe ? '(You — Cannot vote for self)' : 'Candidate'}
                      </span>
                    </div>
                  </div>

                  {isSelected && (
                    <div className="w-6 h-6 rounded-full bg-mystery-pink text-white flex items-center justify-center">
                      <Check className="w-4 h-4 stroke-[3]" />
                    </div>
                  )}
                </button>
              );
            })}
          </div>

          {/* Confirm Vote Button */}
          <button
            onClick={handleVote}
            disabled={!selectedTargetId || isSubmitting}
            className={`w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider shadow-lg transition-all ${
              selectedTargetId
                ? 'bg-gradient-to-r from-mystery-pink to-rose-500 hover:brightness-110 text-white shadow-mystery-pink/30 active:scale-98 cursor-pointer'
                : 'bg-dark-800 text-slate-500 border border-white/5 cursor-not-allowed'
            }`}
          >
            {isSubmitting ? (
              'LOCKING IN VOTE...'
            ) : selectedPlayer ? (
              `CONFIRM VOTE FOR ${selectedPlayer.username.toUpperCase()}`
            ) : (
              'SELECT A CANDIDATE ABOVE'
            )}
          </button>
        </div>
      ) : (
        /* Voted / Spectator State */
        <div className="glass-card-glow rounded-3xl p-8 text-center space-y-5">
          <div className="w-14 h-14 rounded-full bg-emerald-950/60 border border-emerald-500/40 text-emerald-400 flex items-center justify-center mx-auto">
            <Check className="w-7 h-7 stroke-[2.5]" />
          </div>

          <div>
            <h3 className="text-xl font-bold text-white">
              {isEliminated ? 'You are a Spectator' : 'Your Vote is Locked!'}
            </h3>
            <p className="text-xs text-slate-400 mt-1">
              Waiting for all players to finish voting in secret...
            </p>
          </div>

          {/* Live Voter Count Pill */}
          <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-dark-900 border border-white/10 text-xs font-mono font-bold text-mystery-cyan">
            <Users className="w-4 h-4 text-mystery-cyan" />
            <span>
              {votedCount} OF {eligibleVoters.length} VOTES SUBMITTED
            </span>
          </div>

          {/* Voter Chips */}
          <div className="flex flex-wrap items-center justify-center gap-2 pt-2">
            {eligibleVoters.map((p) => (
              <div
                key={p.id}
                className={`flex items-center gap-1.5 px-3 py-1 rounded-xl text-xs font-medium border ${
                  p.hasVoted
                    ? 'bg-emerald-950/60 border-emerald-500/30 text-emerald-300'
                    : 'bg-dark-900 border-white/5 text-slate-400'
                }`}
              >
                <span
                  className={`w-1.5 h-1.5 rounded-full ${
                    p.hasVoted ? 'bg-emerald-400' : 'bg-slate-600 animate-pulse'
                  }`}
                />
                <span>{p.username}</span>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Clue Board Reference */}
      <ClueBoard title="Review Clues Before Voting" collapsible={true} defaultExpanded={false} />
    </div>
  );
};
