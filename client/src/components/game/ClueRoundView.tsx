import React, { useState } from 'react';
import { Mic, Volume2, Sparkles, ChevronRight, Eye, EyeOff, Send } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { Avatar } from '../common/Avatar.js';
import { ClueBoard } from './ClueBoard.js';

export const ClueRoundView: React.FC = () => {
  const { roomState, privateData, myPlayerId, completeTurn } = useGameSocket();
  const [clueInput, setClueInput] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSecretPill, setShowSecretPill] = useState(false);

  if (!roomState) return null;

  const currentSpeakerId = roomState.currentSpeakerId;
  const currentSpeaker = roomState.players.find((p) => p.id === currentSpeakerId);
  const isMyTurn = currentSpeakerId === myPlayerId;
  const roundNumber = roomState.clueRoundNumber || 1;

  const handleTurnDone = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!isMyTurn || isSubmitting) return;

    setIsSubmitting(true);
    await completeTurn(clueInput.trim());
    setClueInput('');
    setIsSubmitting(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-5">
      {/* Secret Word Floating Reminder Pill */}
      {privateData?.secretWord && (
        <div className="flex items-center justify-center">
          <button
            onClick={() => setShowSecretPill(!showSecretPill)}
            className="flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-dark-900 border border-white/10 text-xs font-semibold text-slate-300 hover:text-white transition-all shadow-md active:scale-95"
          >
            <span className="text-slate-400 font-normal">Your word:</span>
            <span className="font-mono text-mystery-cyan font-bold tracking-wide">
              {showSecretPill ? privateData.secretWord : '••••••'}
            </span>
            {showSecretPill ? (
              <EyeOff className="w-3.5 h-3.5 text-slate-400" />
            ) : (
              <Eye className="w-3.5 h-3.5 text-mystery-cyan" />
            )}
          </button>
        </div>
      )}

      {/* Round Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mystery-cyan/10 border border-mystery-cyan/30 text-xs font-bold text-mystery-cyan uppercase tracking-wider">
          <Sparkles className="w-3.5 h-3.5" />
          <span>CLUE ROUND {roundNumber} OF 2</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Give Your Clue
        </h2>
        <p className="text-xs text-slate-400">
          Describe your secret word subtly. Both speak in the room and type your clue below!
        </p>
      </div>

      {/* Clockwise Speaker Queue Carousel */}
      <div className="glass-card rounded-2xl p-3">
        <div className="flex items-center justify-center gap-2 overflow-x-auto py-1">
          {roomState.speakerOrder.map((id, index) => {
            const player = roomState.players.find((p) => p.id === id);
            if (!player) return null;
            const isCurrent = id === currentSpeakerId;
            const isPast = roomState.speakerOrder.indexOf(currentSpeakerId || '') > index;

            return (
              <React.Fragment key={id}>
                {index > 0 && <ChevronRight className="w-3.5 h-3.5 text-slate-600 shrink-0" />}
                <div
                  className={`flex flex-col items-center gap-1 shrink-0 p-1.5 rounded-xl transition-all ${
                    isCurrent
                      ? 'bg-mystery-cyan/15 ring-2 ring-mystery-cyan/80 scale-105'
                      : isPast
                      ? 'opacity-40'
                      : 'opacity-70'
                  }`}
                >
                  <Avatar
                    username={player.username}
                    avatarColor={player.avatarColor}
                    size="sm"
                  />
                  <span className="text-[10px] font-bold text-slate-300 max-w-[50px] truncate">
                    {player.username}
                  </span>
                </div>
              </React.Fragment>
            );
          })}
        </div>
      </div>

      {/* Active Speaker Spotlight Card */}
      <div
        className={`glass-card-glow rounded-3xl p-6 sm:p-8 text-center space-y-5 relative overflow-hidden transition-all ${
          isMyTurn ? 'border-mystery-cyan ring-4 ring-mystery-cyan/20' : 'border-white/10'
        }`}
      >
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-dark-900 border border-white/10 text-xs font-semibold text-slate-300">
          <Mic className={`w-3.5 h-3.5 ${isMyTurn ? 'text-rose-400 animate-pulse' : 'text-mystery-cyan'}`} />
          <span>{isMyTurn ? 'YOU ARE SPEAKING' : 'CURRENT SPEAKER'}</span>
        </div>

        <div className="flex flex-col items-center justify-center space-y-3">
          <Avatar
            username={currentSpeaker?.username || '?'}
            avatarColor={currentSpeaker?.avatarColor || '#ec4899'}
            size="xl"
            pulse={isMyTurn}
          />
          <div>
            <h3 className="text-2xl sm:text-3xl font-black text-white">
              {currentSpeaker?.username}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              {isMyTurn ? '(That’s you!)' : 'Speaking out loud and typing clue...'}
            </p>
          </div>
        </div>

        {/* Dynamic Instruction */}
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 space-y-1">
          {isMyTurn ? (
            <>
              <p className="text-sm font-bold text-mystery-cyan">
                Say your clue out loud and type it for everyone to see!
              </p>
              <p className="text-xs text-slate-400">
                Be specific enough to prove you belong, but subtle enough to not give it away.
              </p>
            </>
          ) : (
            <>
              <p className="text-sm font-bold text-slate-200">
                Listening to {currentSpeaker?.username}'s clue...
              </p>
              <p className="text-xs text-slate-400">
                Their typed clue will appear on the Clue Board below as soon as they submit!
              </p>
            </>
          )}
        </div>

        {/* Typed Input Form for Active Speaker */}
        {isMyTurn ? (
          <form onSubmit={handleTurnDone} className="space-y-3 text-left">
            <div className="space-y-1.5">
              <label htmlFor="clue-input-field" className="block text-xs font-bold uppercase tracking-wider text-slate-300">
                Type Your Clue:
              </label>
              <input
                id="clue-input-field"
                type="text"
                value={clueInput}
                onChange={(e) => setClueInput(e.target.value)}
                placeholder="e.g. Sweet, breakfast, round, morning..."
                maxLength={60}
                autoFocus
                className="w-full px-4 py-3.5 rounded-2xl bg-dark-950/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mystery-cyan focus:ring-2 focus:ring-mystery-cyan/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-cyan to-blue-500 hover:from-mystery-cyan/90 hover:to-blue-400 text-dark-950 font-black text-base uppercase tracking-wider shadow-xl shadow-mystery-cyan/30 active:scale-98 transition-transform cursor-pointer"
            >
              <div className="flex items-center justify-center gap-2">
                <Send className="w-5 h-5 stroke-[2.5]" />
                <span>{isSubmitting ? 'SUBMITTING...' : 'SUBMIT CLUE & PASS TURN'}</span>
              </div>
            </button>
          </form>
        ) : (
          <div className="py-3 text-xs text-slate-500 flex items-center justify-center gap-2">
            <Volume2 className="w-4 h-4 animate-pulse text-mystery-violet" />
            <span>Waiting for {currentSpeaker?.username} to submit clue...</span>
          </div>
        )}
      </div>

      {/* Synchronized Clue Board */}
      <ClueBoard title="Clues Given So Far" />
    </div>
  );
};
