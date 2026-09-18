import React, { useState } from 'react';
import { PlusCircle, LogIn, HelpCircle, Sparkles, ArrowRight } from 'lucide-react';
import { useGameSocket } from '../context/GameSocketContext.js';

interface HomePageProps {
  initialRoomCode?: string;
}

export const HomePage: React.FC<HomePageProps> = ({ initialRoomCode = '' }) => {
  const { createRoom, joinRoom, clearError } = useGameSocket();
  const [tab, setTab] = useState<'create' | 'join'>(initialRoomCode ? 'join' : 'create');
  const [username, setUsername] = useState('');
  const [roomCode, setRoomCode] = useState(initialRoomCode);
  const [isLoading, setIsLoading] = useState(false);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = username.trim();
    if (!trimmed || isLoading) return;

    setIsLoading(true);
    await createRoom(trimmed);
    setIsLoading(false);
  };

  const handleJoin = async (e: React.FormEvent) => {
    e.preventDefault();
    const trimmedUser = username.trim();
    const trimmedCode = roomCode.trim().toUpperCase();
    if (!trimmedUser || !trimmedCode || isLoading) return;

    setIsLoading(true);
    await joinRoom(trimmedCode, trimmedUser);
    setIsLoading(false);
  };

  return (
    <div className="w-full max-w-lg mx-auto px-4 py-8 space-y-8">
      {/* Brand Hero */}
      <div className="text-center space-y-3">
        <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-mystery-violet/15 border border-mystery-violet/30 text-xs font-bold text-mystery-cyan shadow-sm">
          <Sparkles className="w-3.5 h-3.5" />
          <span>REAL-WORLD SOCIAL DEDUCTION</span>
        </div>

        <h1 className="text-4xl sm:text-5xl font-black tracking-tight text-white">
          DUO<span className="text-transparent bg-clip-text bg-gradient-to-r from-mystery-cyan via-mystery-violet to-mystery-pink">DECEIT</span>
        </h1>

        <p className="text-sm text-slate-400 max-w-sm mx-auto leading-relaxed">
          One room. Related secret words. Exactly one player has a different word—and even they don’t know it!
        </p>
      </div>

      {/* Main Card */}
      <div className="glass-card-glow rounded-3xl p-6 sm:p-8 space-y-6">
        {/* Mode Switcher */}
        <div className="grid grid-cols-2 p-1 rounded-2xl bg-dark-950/80 border border-white/10">
          <button
            type="button"
            onClick={() => {
              setTab('create');
              clearError();
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              tab === 'create'
                ? 'bg-mystery-violet text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <PlusCircle className="w-4 h-4" />
            <span>Create Room</span>
          </button>

          <button
            type="button"
            onClick={() => {
              setTab('join');
              clearError();
            }}
            className={`py-2.5 px-4 rounded-xl text-xs font-bold uppercase tracking-wider transition-all flex items-center justify-center gap-2 ${
              tab === 'join'
                ? 'bg-mystery-violet text-white shadow-md'
                : 'text-slate-400 hover:text-slate-200'
            }`}
          >
            <LogIn className="w-4 h-4" />
            <span>Join Room</span>
          </button>
        </div>

        {/* Form */}
        {tab === 'create' ? (
          <form onSubmit={handleCreate} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="host-username" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Your Player Name
              </label>
              <input
                id="host-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Rahul, Alex, Maya..."
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl bg-dark-950/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mystery-cyan focus:ring-2 focus:ring-mystery-cyan/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim()}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-violet to-mystery-cyan hover:brightness-110 disabled:opacity-50 text-white font-black text-sm uppercase tracking-wider shadow-lg shadow-mystery-violet/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'CREATING...' : 'CREATE PRIVATE ROOM'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className="space-y-4">
            <div className="space-y-1.5">
              <label htmlFor="join-room-code" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                6-Letter Room Code
              </label>
              <input
                id="join-room-code"
                type="text"
                value={roomCode}
                onChange={(e) => setRoomCode(e.target.value.toUpperCase())}
                placeholder="e.g. ABCD12"
                maxLength={6}
                required
                className="w-full px-4 py-3 rounded-2xl bg-dark-950/90 border border-white/10 text-white font-mono uppercase tracking-wider text-base placeholder-slate-500 focus:outline-none focus:border-mystery-cyan focus:ring-2 focus:ring-mystery-cyan/20 transition-all"
              />
            </div>

            <div className="space-y-1.5">
              <label htmlFor="join-username" className="block text-xs font-bold text-slate-300 uppercase tracking-wider">
                Your Player Name
              </label>
              <input
                id="join-username"
                type="text"
                value={username}
                onChange={(e) => setUsername(e.target.value)}
                placeholder="e.g. Priya, Amit, Jordan..."
                maxLength={20}
                required
                className="w-full px-4 py-3 rounded-2xl bg-dark-950/90 border border-white/10 text-white placeholder-slate-500 text-sm focus:outline-none focus:border-mystery-cyan focus:ring-2 focus:ring-mystery-cyan/20 transition-all"
              />
            </div>

            <button
              type="submit"
              disabled={isLoading || !username.trim() || !roomCode.trim()}
              className="w-full py-4 px-6 rounded-2xl bg-gradient-to-r from-mystery-cyan to-blue-500 hover:brightness-110 disabled:opacity-50 text-dark-950 font-black text-sm uppercase tracking-wider shadow-lg shadow-mystery-cyan/30 active:scale-98 transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <span>{isLoading ? 'JOINING...' : 'ENTER GAME LOBBY'}</span>
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>
        )}
      </div>

      {/* Game Rules Card */}
      <div className="glass-card rounded-3xl p-6 space-y-3 text-xs text-slate-400">
        <div className="flex items-center gap-2 text-white font-bold text-sm uppercase tracking-wider">
          <HelpCircle className="w-4 h-4 text-mystery-cyan" />
          <span>How To Play In 3 Steps</span>
        </div>
        <p className="leading-relaxed">
          <strong>1. Secret Assignment:</strong> In a 6-player room, 5 players receive "APPLE" and 1 player receives "ORANGE". The app will NEVER label who is the deceiver.
        </p>
        <p className="leading-relaxed">
          <strong>2. Clockwise Clues:</strong> Players take turns physically speaking a one-word or short clue aloud in the room. Everyone listens carefully.
        </p>
        <p className="leading-relaxed">
          <strong>3. Debate & Vote:</strong> After 2 clue rounds, a 60-second discussion timer starts. Talk face-to-face, then vote on your phones to eliminate the odd one out!
        </p>
      </div>
    </div>
  );
};
