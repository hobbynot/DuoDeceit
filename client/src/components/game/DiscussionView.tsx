import React, { useState, useEffect } from 'react';
import { FastForward, Users, MessageCircle, Eye, EyeOff } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { sound } from '../../utils/sound.js';
import { ClueBoard } from './ClueBoard.js';

export const DiscussionView: React.FC = () => {
  const { roomState, privateData, isHost, skipDiscussion } = useGameSocket();
  const [secondsRemaining, setSecondsRemaining] = useState<number>(60);
  const [showSecretPill, setShowSecretPill] = useState(false);
  const [isSkipping, setIsSkipping] = useState(false);

  useEffect(() => {
    if (!roomState?.phaseEndsAt) return;

    const interval = setInterval(() => {
      const diff = Math.max(0, Math.ceil((roomState.phaseEndsAt! - Date.now()) / 1000));
      setSecondsRemaining(diff);

      // Play soft tick in last 5 seconds
      if (diff <= 5 && diff > 0) {
        sound.playTick();
      }
    }, 500);

    return () => clearInterval(interval);
  }, [roomState?.phaseEndsAt]);

  if (!roomState) return null;

  const minutes = Math.floor(secondsRemaining / 60);
  const seconds = secondsRemaining % 60;
  const formattedTime = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
  const totalDuration = roomState.discussionDurationSeconds || 60;
  const progressPercent = Math.max(0, Math.min(100, (secondsRemaining / totalDuration) * 100));

  const handleSkip = async () => {
    if (isSkipping) return;
    setIsSkipping(true);
    await skipDiscussion();
    setIsSkipping(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-6 space-y-6">
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

      {/* Header */}
      <div className="text-center space-y-1">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-mystery-pink/10 border border-mystery-pink/30 text-xs font-bold text-mystery-pink uppercase tracking-wider">
          <MessageCircle className="w-3.5 h-3.5" />
          <span>PHASE 2: OPEN DEBATE</span>
        </div>
        <h2 className="text-2xl sm:text-3xl font-extrabold text-white">
          Face-to-Face Discussion
        </h2>
        <p className="text-xs text-slate-400">
          Talk out loud in the room! Who seemed confused, nervous, or gave a weird clue?
        </p>
      </div>

      {/* Timer Display Card */}
      <div className="glass-card-glow rounded-3xl p-8 text-center space-y-6 relative overflow-hidden">
        {/* Radial Countdown Indicator */}
        <div className="relative w-44 h-44 mx-auto flex items-center justify-center">
          <svg className="w-full h-full -rotate-90 transform" viewBox="0 0 100 100">
            {/* Background track */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className="stroke-dark-800"
              strokeWidth="6"
              fill="transparent"
            />
            {/* Animated progress ring */}
            <circle
              cx="50"
              cy="50"
              r="44"
              className={`transition-all duration-500 ${
                secondsRemaining <= 10
                  ? 'stroke-rose-500 animate-pulse'
                  : 'stroke-mystery-cyan'
              }`}
              strokeWidth="6"
              strokeDasharray="276.46"
              strokeDashoffset={276.46 * (1 - progressPercent / 100)}
              strokeLinecap="round"
              fill="transparent"
            />
          </svg>

          {/* Center Time Digits */}
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <span
              className={`text-4xl font-mono font-black tracking-wider ${
                secondsRemaining <= 10 ? 'text-rose-400 animate-bounce' : 'text-white'
              }`}
            >
              {formattedTime}
            </span>
            <span className="text-[10px] uppercase font-bold text-slate-400 tracking-widest mt-1">
              REMAINING
            </span>
          </div>
        </div>

        {/* Discussion Guidance */}
        <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 space-y-2 text-left">
          <div className="flex items-center gap-2 text-xs font-bold text-mystery-cyan">
            <Users className="w-4 h-4" />
            <span>DISCUSSION TIPS</span>
          </div>
          <ul className="text-xs text-slate-400 space-y-1 list-disc list-inside">
            <li>Ask someone to clarify why they gave that specific clue.</li>
            <li>Remember: the deceiver doesn't know they are different!</li>
            <li>When the timer expires, private voting will immediately begin.</li>
          </ul>
        </div>

        {/* Host Early Skip Button */}
        {isHost && (
          <button
            onClick={handleSkip}
            disabled={isSkipping}
            className="w-full py-3 px-4 rounded-xl bg-dark-800 hover:bg-dark-700 border border-white/10 text-slate-200 hover:text-white text-xs font-bold uppercase tracking-wider flex items-center justify-center gap-2 transition-all active:scale-98 cursor-pointer"
          >
            <FastForward className="w-4 h-4 text-mystery-cyan" />
            <span>Ready to vote? Skip countdown (Host only)</span>
          </button>
        )}
      </div>

      {/* Synchronized Clue Board for Discussion */}
      <ClueBoard title="Review Given Clues" collapsible={false} defaultExpanded={true} />
    </div>
  );
};
