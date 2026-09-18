import React, { useState } from 'react';
import { Users, Play, Copy, Check, Sparkles, Shield, MessageSquare, Vote, ArrowLeft, Settings, Sliders } from 'lucide-react';
import { useGameSocket } from '../../context/GameSocketContext.js';
import { Avatar } from '../common/Avatar.js';
import { GAME_CONSTANTS } from '@duodeceit/shared';
import { copyToClipboard } from '../../utils/clipboard.js';
import { SettingsModal } from './SettingsModal.js';

export const LobbyView: React.FC = () => {
  const { roomState, myPlayerId, isHost, startGame, leaveRoom } = useGameSocket();
  const [copied, setCopied] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [isSettingsOpen, setIsSettingsOpen] = useState(false);

  if (!roomState) return null;

  const playerCount = roomState.players.length;
  const canStart = playerCount >= GAME_CONSTANTS.MIN_PLAYERS;
  const joinUrl = `${window.location.origin}/join/${roomState.roomId}`;

  const handleCopyLink = async () => {
    const ok = await copyToClipboard(joinUrl);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    }
  };

  const handleLeave = () => {
    leaveRoom();
    window.history.pushState(null, '', '/');
  };

  const handleStartGame = async () => {
    if (!canStart || isStarting) return;
    setIsStarting(true);
    const res = await startGame();
    if (!res.success) {
      setIsStarting(false);
    }
  };

  return (
    <div className="w-full max-w-2xl mx-auto px-4 py-6 space-y-6">
      {/* Lobby Hero Card */}
      <div className="glass-card-glow rounded-3xl p-6 sm:p-8 text-center relative overflow-hidden">
        <div className="absolute -top-16 -right-16 w-36 h-36 bg-mystery-violet/20 rounded-full blur-3xl pointer-events-none" />
        <div className="absolute -bottom-16 -left-16 w-36 h-36 bg-mystery-cyan/20 rounded-full blur-3xl pointer-events-none" />

        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-white/5 border border-white/10 text-xs font-semibold text-mystery-cyan mb-3">
          <Sparkles className="w-3.5 h-3.5" />
          <span>ROOM LOBBY</span>
        </div>

        <h2 className="text-3xl sm:text-4xl font-extrabold tracking-wider font-mono text-white mb-2">
          {roomState.roomId}
        </h2>
        <p className="text-sm text-slate-300 max-w-md mx-auto mb-5">
          Share this code or link with friends in the same room. No apps to install!
        </p>

        {/* Shareable Link Box */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-2.5 max-w-lg mx-auto">
          <div className="w-full sm:flex-1 bg-dark-950/80 border border-white/10 rounded-2xl px-3.5 py-2.5 text-xs font-mono text-slate-300 truncate text-left select-all">
            {joinUrl}
          </div>
          <button
            onClick={handleCopyLink}
            className="w-full sm:w-auto flex items-center justify-center gap-2 px-5 py-2.5 rounded-2xl bg-mystery-violet hover:bg-mystery-violet/90 text-white text-xs font-bold transition-transform active:scale-95 shadow-lg shadow-mystery-violet/25"
          >
            {copied ? (
              <>
                <Check className="w-4 h-4 text-emerald-300" />
                <span>COPIED!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>COPY LINK</span>
              </>
            )}
          </button>
        </div>
      </div>

      {/* Game Settings Banner Card */}
      <div className="glass-card rounded-3xl p-4 sm:p-5 border border-white/10 bg-dark-900/40">
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sliders className="w-4 h-4 text-mystery-violet" />
              <span className="text-xs font-bold uppercase tracking-wider text-slate-200">
                Game Rules & Word Pool
              </span>
              {roomState.settings?.isCustomWordPack && (
                <span className="text-[10px] uppercase font-bold px-2 py-0.5 rounded-full bg-emerald-500/20 text-emerald-300 border border-emerald-500/30 animate-pulse">
                  Custom Pack: {roomState.settings.customPackName || 'Loaded'}
                </span>
              )}
            </div>
            <div className="flex flex-wrap items-center gap-2 text-xs text-slate-400">
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                📂 {roomState.settings?.category === 'ALL' || !roomState.settings?.category ? 'All Categories' : roomState.settings.category}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                🎯 Difficulty: {(roomState.settings?.difficulty || 'ALL').toUpperCase()}
              </span>
              <span className="px-2 py-0.5 rounded-md bg-white/5 border border-white/10 text-slate-300">
                ⏱️ {roomState.settings?.discussionDuration || 120}s Debate
              </span>
              <span className="px-2 py-0.5 rounded-md bg-mystery-cyan/10 border border-mystery-cyan/20 text-mystery-cyan font-mono font-medium">
                📚 {roomState.settings?.totalAvailablePairs || 0} pairs ready
              </span>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setIsSettingsOpen(true)}
            className="w-full sm:w-auto inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-white/5 hover:bg-white/10 border border-white/15 text-xs font-bold text-white transition-all active:scale-95 cursor-pointer shadow-sm hover:border-mystery-violet/40"
          >
            <Settings className="w-3.5 h-3.5 text-mystery-violet" />
            <span>{isHost ? '⚙️ Game Settings' : '⚙️ View Settings'}</span>
          </button>
        </div>
      </div>

      {/* Players Section */}
      <div className="glass-card rounded-3xl p-6 space-y-4">
        <div className="flex items-center justify-between border-b border-white/10 pb-4">
          <div className="flex items-center gap-2">
            <Users className="w-5 h-5 text-mystery-cyan" />
            <h3 className="text-base font-bold text-white uppercase tracking-wider">
              Players Joined
            </h3>
          </div>
          <span className="px-3 py-1 rounded-full bg-dark-800 border border-white/10 text-xs font-mono font-bold text-mystery-cyan">
            {playerCount} / {roomState.maxPlayers}
          </span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
          {roomState.players.map((p) => {
            const isMe = p.id === myPlayerId;
            return (
              <div
                key={p.id}
                className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                  isMe
                    ? 'bg-mystery-violet/10 border-mystery-violet/40 shadow-sm'
                    : 'bg-dark-900/60 border-white/5'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Avatar
                    username={p.username}
                    avatarColor={p.avatarColor}
                    isHost={p.isHost}
                    isConnected={p.connected}
                    size="md"
                  />
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-bold text-sm text-slate-100">{p.username}</span>
                      {isMe && (
                        <span className="text-[10px] uppercase font-bold px-1.5 py-0.5 rounded bg-mystery-cyan/20 text-mystery-cyan border border-mystery-cyan/30">
                          YOU
                        </span>
                      )}
                    </div>
                    <span className="text-xs text-slate-400">
                      {p.isHost ? '👑 Room Host' : 'Player'}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-1.5 text-xs">
                  <span
                    className={`w-2 h-2 rounded-full ${
                      p.connected ? 'bg-emerald-400' : 'bg-rose-500'
                    }`}
                  />
                  <span className="text-slate-400 text-[11px]">
                    {p.connected ? 'Ready' : 'Offline'}
                  </span>
                </div>
              </div>
            );
          })}
        </div>

        {/* Start Game / Waiting Banner */}
        <div className="pt-4">
          {isHost ? (
            <div className="space-y-2">
              <button
                onClick={handleStartGame}
                disabled={!canStart || isStarting}
                className={`w-full py-4 px-6 rounded-2xl font-black text-base uppercase tracking-wider flex items-center justify-center gap-3 transition-all duration-200 ${
                  canStart
                    ? 'bg-gradient-to-r from-mystery-violet to-mystery-cyan text-white shadow-xl shadow-mystery-violet/30 hover:brightness-110 active:scale-98 cursor-pointer'
                    : 'bg-dark-800 text-slate-500 border border-white/5 cursor-not-allowed'
                }`}
              >
                <Play className="w-5 h-5 fill-current" />
                <span>{isStarting ? 'STARTING GAME...' : 'START GAME'}</span>
              </button>
              {!canStart && (
                <p className="text-xs text-center text-amber-400/90 font-medium">
                  Need at least {GAME_CONSTANTS.MIN_PLAYERS} players to start (need{' '}
                  {GAME_CONSTANTS.MIN_PLAYERS - playerCount} more)
                </p>
              )}
            </div>
          ) : (
            <div className="p-4 rounded-2xl bg-dark-900/80 border border-white/5 text-center">
              <div className="inline-flex items-center gap-2 text-xs font-semibold text-slate-300">
                <span className="w-2 h-2 rounded-full bg-mystery-cyan animate-ping" />
                <span>Waiting for host to start the game...</span>
              </div>
            </div>
          )}

          <div className="pt-2 text-center">
            <button
              onClick={handleLeave}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-400 hover:text-rose-400 transition-colors py-1.5 px-3 rounded-xl hover:bg-white/5"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Leave Room & Return Home</span>
            </button>
          </div>
        </div>
      </div>

      {/* How It Works Mini-Guide */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="p-4 rounded-2xl bg-dark-900/50 border border-white/5 flex items-start gap-3">
          <Shield className="w-5 h-5 text-mystery-violet shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase mb-0.5">1. Secret Words</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Everyone gets a word. One person gets a slightly different one!
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/50 border border-white/5 flex items-start gap-3">
          <MessageSquare className="w-5 h-5 text-mystery-cyan shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase mb-0.5">2. Give Clues</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Speak a clue out loud on your turn. Listen for subtle oddities.
            </p>
          </div>
        </div>

        <div className="p-4 rounded-2xl bg-dark-900/50 border border-white/5 flex items-start gap-3">
          <Vote className="w-5 h-5 text-mystery-pink shrink-0 mt-0.5" />
          <div>
            <h4 className="text-xs font-bold text-white uppercase mb-0.5">3. Vote Out</h4>
            <p className="text-[11px] text-slate-400 leading-relaxed">
              Debate in the room, then secretly vote who has the different word!
            </p>
          </div>
        </div>
      </div>

      {/* Settings Modal */}
      <SettingsModal
        isOpen={isSettingsOpen}
        onClose={() => setIsSettingsOpen(false)}
      />
    </div>
  );
};
