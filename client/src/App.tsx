import React, { useState, useEffect } from 'react';
import { GameSocketProvider, useGameSocket } from './context/GameSocketContext.js';
import { Header } from './components/common/Header.js';
import { Toast } from './components/common/Toast.js';
import { HomePage } from './pages/HomePage.js';
import { JoinPage } from './pages/JoinPage.js';
import { LobbyView } from './components/lobby/LobbyView.js';
import { WordRevealView } from './components/game/WordRevealView.js';
import { ClueRoundView } from './components/game/ClueRoundView.js';
import { DiscussionView } from './components/game/DiscussionView.js';
import { VotingView } from './components/game/VotingView.js';
import { VoteResultView } from './components/game/VoteResultView.js';
import { GameOverView } from './components/game/GameOverView.js';

import { Loader2 } from 'lucide-react';

const MainContent: React.FC = () => {
  const { roomState, isReconnecting, leaveRoom } = useGameSocket();
  const [urlPath, setUrlPath] = useState(window.location.pathname);

  useEffect(() => {
    const handleLocation = () => {
      const current = window.location.pathname;
      setUrlPath(current);
      // If user hit browser back button all the way to root '/' while in roomState:
      if (current === '/' && roomState) {
        leaveRoom();
      }
    };
    window.addEventListener('popstate', handleLocation);
    return () => window.removeEventListener('popstate', handleLocation);
  }, [roomState, leaveRoom]);

  // Check if URL is /join/:code or /room/:code
  const joinMatch = urlPath.match(/^\/(?:join|room)\/([A-Za-z0-9]+)/i);
  const directRoomCode = joinMatch ? joinMatch[1].toUpperCase() : null;

  // If reconnecting from saved session on refresh, show seamless loader
  if (!roomState && isReconnecting) {
    return (
      <main className="flex-1 flex flex-col items-center justify-center py-12 px-4">
        <div className="glass-card-glow rounded-3xl p-8 text-center space-y-4 max-w-sm w-full">
          <Loader2 className="w-8 h-8 text-mystery-cyan animate-spin mx-auto" />
          <div className="space-y-1">
            <h3 className="text-lg font-bold text-white">Reconnecting to Game...</h3>
            <p className="text-xs text-slate-400">
              Recovering your seat, secret word, and room state...
            </p>
          </div>
        </div>
      </main>
    );
  }

  // If in a room, render the authoritative state machine phase
  if (roomState) {
    return (
      <main className="flex-1 flex flex-col justify-center py-4">
        {roomState.phase === 'LOBBY' && <LobbyView />}
        {roomState.phase === 'WORD_REVEAL' && <WordRevealView />}
        {(roomState.phase === 'CLUE_ROUND_1' || roomState.phase === 'CLUE_ROUND_2') && <ClueRoundView />}
        {roomState.phase === 'DISCUSSION' && <DiscussionView />}
        {roomState.phase === 'VOTING' && <VotingView />}
        {roomState.phase === 'VOTE_RESULT' && <VoteResultView />}
        {roomState.phase === 'ELIMINATION' && <VoteResultView />}
        {roomState.phase === 'GAME_OVER' && <GameOverView />}
      </main>
    );
  }

  // Not in a room: render join or home
  return (
    <main className="flex-1 flex flex-col justify-center py-4">
      {directRoomCode ? (
        <JoinPage roomCode={directRoomCode} />
      ) : (
        <HomePage />
      )}
    </main>
  );
};

export const App: React.FC = () => {
  return (
    <GameSocketProvider>
      <div className="min-h-screen flex flex-col bg-dark-950 text-slate-100 selection:bg-mystery-violet selection:text-white">
        <Header />
        <MainContent />
        <Toast />

        <footer className="w-full py-4 text-center border-t border-white/5 text-[11px] text-slate-500 font-medium">
          DuoDeceit • Physical Party Social Deduction Game • No Voice or Text Logs Stored
        </footer>
      </div>
    </GameSocketProvider>
  );
};
