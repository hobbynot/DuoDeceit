import React, { createContext, useContext, useEffect, useState, useCallback, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import {
  SanitizedRoomState,
  PrivatePlayerData,
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
  PublicPlayer,
  GAME_CONSTANTS,
  VoteResult,
  ReconnectResponse,
  GameSettings,
  WordPair,
} from '@duodeceit/shared';
import { sound } from '../utils/sound.js';

interface StoredSession {
  roomId: string;
  playerId: string;
  sessionToken: string;
}

interface GameSocketContextValue {
  isConnected: boolean;
  isReconnecting: boolean;
  roomState: SanitizedRoomState | null;
  privateData: PrivatePlayerData | null;
  myPlayerId: string | null;
  myPlayer: PublicPlayer | null;
  isHost: boolean;
  error: string | null;
  toast: { message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null;
  createRoom: (username: string) => Promise<{ success: boolean; error?: string }>;
  joinRoom: (roomId: string, username: string) => Promise<{ success: boolean; error?: string }>;
  leaveRoom: () => void;
  updateSettings: (
    settings: Partial<GameSettings>,
    customWordPairs?: WordPair[]
  ) => Promise<{ success: boolean; error?: string }>;
  startGame: () => Promise<{ success: boolean; error?: string }>;
  confirmWord: () => Promise<{ success: boolean; error?: string }>;
  completeTurn: (clueText?: string) => Promise<{ success: boolean; error?: string }>;
  skipDiscussion: () => Promise<{ success: boolean; error?: string }>;
  submitVote: (targetPlayerId: string) => Promise<{ success: boolean; error?: string }>;
  proceedNextRound: () => Promise<{ success: boolean; error?: string }>;
  playAgain: () => Promise<{ success: boolean; error?: string }>;
  returnToLobby: () => Promise<{ success: boolean; error?: string }>;
  clearError: () => void;
}

const GameSocketContext = createContext<GameSocketContextValue | null>(null);

export const GameSocketProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const [isConnected, setIsConnected] = useState<boolean>(false);
  const [isReconnecting, setIsReconnecting] = useState<boolean>(() => {
    return Boolean(localStorage.getItem(GAME_CONSTANTS.SESSION_TOKEN_KEY));
  });
  const [roomState, setRoomState] = useState<SanitizedRoomState | null>(null);
  const [privateData, setPrivateData] = useState<PrivatePlayerData | null>(null);
  const [myPlayerId, setMyPlayerId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [toast, setToast] = useState<{ message: string; type?: 'info' | 'success' | 'warning' | 'error' } | null>(null);

  // Initialize socket connection
  useEffect(() => {
    const socketUrl =
      (import.meta as any).env?.VITE_SERVER_URL ||
      (window.location.hostname === 'localhost' ? 'http://localhost:3001' : window.location.origin);
    const socket = io(socketUrl, {
      transports: ['websocket', 'polling'],
      autoConnect: true,
      reconnection: true,
      reconnectionAttempts: 10,
      reconnectionDelay: 1000,
    });

    socketRef.current = socket;

    socket.on('connect', () => {
      setIsConnected(true);

      // Attempt reconnection if session in local storage
      const stored = localStorage.getItem(GAME_CONSTANTS.SESSION_TOKEN_KEY);
      if (stored) {
        try {
          const session: StoredSession = JSON.parse(stored);
          socket.emit(
            SOCKET_EVENTS.CLIENT_RECONNECT,
            {
              roomId: session.roomId,
              playerId: session.playerId,
              sessionToken: session.sessionToken,
            },
            (res: ReconnectResponse) => {
              setIsReconnecting(false);
              if (res.success && res.roomState) {
                setRoomState(res.roomState);
                setMyPlayerId(session.playerId);
                if (res.privateData) {
                  setPrivateData(res.privateData);
                }
                // Ensure URL reflects the current room
                if (!window.location.pathname.startsWith('/room/')) {
                  window.history.replaceState(null, '', `/room/${session.roomId}`);
                }
              } else {
                localStorage.removeItem(GAME_CONSTANTS.SESSION_TOKEN_KEY);
              }
            }
          );
        } catch {
          setIsReconnecting(false);
          localStorage.removeItem(GAME_CONSTANTS.SESSION_TOKEN_KEY);
        }
      } else {
        setIsReconnecting(false);
      }
    });

    socket.on('disconnect', () => {
      setIsConnected(false);
    });

    socket.on(SOCKET_EVENTS.SERVER_ROOM_STATE, (state) => {
      setRoomState(state);
    });

    socket.on(SOCKET_EVENTS.SERVER_PRIVATE_DATA, (data) => {
      setPrivateData(data);
    });

    socket.on(SOCKET_EVENTS.SERVER_HOST_CHANGED, ({ newHostName }) => {
      setToast({ message: `Host left. ${newHostName} is now the host!`, type: 'info' });
    });

    socket.on(SOCKET_EVENTS.SERVER_TOAST, (payload) => {
      setToast(payload);
    });

    socket.on(SOCKET_EVENTS.SERVER_ERROR, ({ message }) => {
      setError(message);
    });

    socket.on(SOCKET_EVENTS.SERVER_VOTE_RESULT, (_result: VoteResult) => {
      sound.playElimination();
    });

    return () => {
      socket.disconnect();
    };
  }, []);

  // Clear toast after 4s
  useEffect(() => {
    if (toast) {
      const timer = setTimeout(() => setToast(null), 4000);
      return () => clearTimeout(timer);
    }
  }, [toast]);

  const myPlayer = roomState?.players.find((p) => p.id === myPlayerId) || null;
  const isHost = myPlayer?.isHost || false;

  const createRoom = useCallback(
    (username: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
        setError(null);

        socketRef.current.emit(SOCKET_EVENTS.CLIENT_CREATE_ROOM, { username }, (res) => {
          if (res.success && res.roomId && res.playerId && res.sessionToken) {
            setMyPlayerId(res.playerId);
            localStorage.setItem(
              GAME_CONSTANTS.SESSION_TOKEN_KEY,
              JSON.stringify({
                roomId: res.roomId,
                playerId: res.playerId,
                sessionToken: res.sessionToken,
              })
            );
            window.history.pushState(null, '', `/room/${res.roomId}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            resolve({ success: true });
          } else {
            setError(res.error || 'Failed to create room');
            resolve({ success: false, error: res.error });
          }
        });
      });
    },
    []
  );

  const joinRoom = useCallback(
    (roomId: string, username: string): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'Socket not connected' });
        setError(null);

        socketRef.current.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOM, { roomId, username }, (res) => {
          if (res.success && res.roomId && res.playerId && res.sessionToken) {
            setMyPlayerId(res.playerId);
            localStorage.setItem(
              GAME_CONSTANTS.SESSION_TOKEN_KEY,
              JSON.stringify({
                roomId: res.roomId,
                playerId: res.playerId,
                sessionToken: res.sessionToken,
              })
            );
            window.history.pushState(null, '', `/room/${res.roomId}`);
            window.dispatchEvent(new PopStateEvent('popstate'));
            resolve({ success: true });
          } else {
            setError(res.error || 'Failed to join room');
            resolve({ success: false, error: res.error });
          }
        });
      });
    },
    []
  );

  const leaveRoom = useCallback(() => {
    if (socketRef.current) {
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_LEAVE_ROOM);
    }
    localStorage.removeItem(GAME_CONSTANTS.SESSION_TOKEN_KEY);
    setRoomState(null);
    setPrivateData(null);
    setMyPlayerId(null);
    window.history.pushState(null, '', '/');
    window.dispatchEvent(new PopStateEvent('popstate'));
  }, []);

  const updateSettings = useCallback(
    (
      settings: Partial<GameSettings>,
      customWordPairs?: WordPair[]
    ): Promise<{ success: boolean; error?: string }> => {
      return new Promise((resolve) => {
        if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
        socketRef.current.emit(
          SOCKET_EVENTS.CLIENT_UPDATE_SETTINGS,
          { settings, customWordPairs },
          (res) => {
            if (res && !res.success) {
              setError(res.error || 'Failed to update settings');
            }
            resolve(res || { success: true });
          }
        );
      });
    },
    []
  );

  const startGame = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_START_GAME, (res) => {
        if (!res.success) setError(res.error || 'Failed to start game');
        resolve(res);
      });
    });
  }, []);

  const confirmWord = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      sound.playChime();
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, (res) => {
        if (!res.success) setError(res.error || 'Failed to confirm word');
        resolve(res);
      });
    });
  }, []);

  const completeTurn = useCallback((clueText?: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      sound.playChime();
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_TURN_DONE, { clueText }, (res: any) => {
        if (!res?.success) setError(res?.error || 'Failed to complete turn');
        resolve(res || { success: true });
      });
    });
  }, []);

  const skipDiscussion = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_SKIP_DISCUSSION, (res) => {
        resolve(res);
      });
    });
  }, []);

  const submitVote = useCallback((targetPlayerId: string): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      sound.playVote();
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, { targetPlayerId }, (res) => {
        if (!res.success) setError(res.error || 'Failed to submit vote');
        resolve(res);
      });
    });
  }, []);

  const proceedNextRound = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_PROCEED_NEXT_ROUND, (res) => {
        resolve(res);
      });
    });
  }, []);

  const playAgain = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_PLAY_AGAIN, (res) => {
        resolve(res);
      });
    });
  }, []);

  const returnToLobby = useCallback((): Promise<{ success: boolean; error?: string }> => {
    return new Promise((resolve) => {
      if (!socketRef.current) return resolve({ success: false, error: 'Not connected' });
      socketRef.current.emit(SOCKET_EVENTS.CLIENT_RETURN_TO_LOBBY, (res) => {
        resolve(res);
      });
    });
  }, []);

  const clearError = useCallback(() => setError(null), []);

  return (
    <GameSocketContext.Provider
      value={{
        isConnected,
        isReconnecting,
        roomState,
        privateData,
        myPlayerId,
        myPlayer,
        isHost,
        error,
        toast,
        createRoom,
        joinRoom,
        leaveRoom,
        updateSettings,
        startGame,
        confirmWord,
        completeTurn,
        skipDiscussion,
        submitVote,
        proceedNextRound,
        playAgain,
        returnToLobby,
        clearError,
      }}
    >
      {children}
    </GameSocketContext.Provider>
  );
};

export const useGameSocket = (): GameSocketContextValue => {
  const context = useContext(GameSocketContext);
  if (!context) {
    throw new Error('useGameSocket must be used within a GameSocketProvider');
  }
  return context;
};
