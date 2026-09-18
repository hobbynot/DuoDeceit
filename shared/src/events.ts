import {
  SanitizedRoomState,
  PrivatePlayerData,
  CreateRoomResponse,
  JoinRoomResponse,
  ReconnectResponse,
  VoteResult,
  GameSettings,
  WordPair,
} from './types.js';

export const SOCKET_EVENTS = {
  // Client to Server
  CLIENT_CREATE_ROOM: 'room:create',
  CLIENT_JOIN_ROOM: 'room:join',
  CLIENT_LEAVE_ROOM: 'room:leave',
  CLIENT_RECONNECT: 'room:reconnect',
  CLIENT_UPDATE_SETTINGS: 'room:update-settings',
  CLIENT_START_GAME: 'game:start',
  CLIENT_CONFIRM_WORD: 'game:confirm-word',
  CLIENT_TURN_DONE: 'game:turn-done',
  CLIENT_SKIP_DISCUSSION: 'game:skip-discussion',
  CLIENT_SUBMIT_VOTE: 'game:submit-vote',
  CLIENT_PROCEED_NEXT_ROUND: 'game:proceed-next-round',
  CLIENT_PLAY_AGAIN: 'game:play-again',
  CLIENT_RETURN_TO_LOBBY: 'game:return-to-lobby',

  // Server to Client
  SERVER_ROOM_STATE: 'room:state',
  SERVER_PRIVATE_DATA: 'player:private-data',
  SERVER_ERROR: 'server:error',
  SERVER_TOAST: 'server:toast',
  SERVER_HOST_CHANGED: 'server:host-changed',
  SERVER_VOTE_RESULT: 'game:vote-result',
  SERVER_PHASE_CHANGE: 'game:phase-change',
} as const;

export interface ClientToServerEvents {
  [SOCKET_EVENTS.CLIENT_CREATE_ROOM]: (
    payload: { username: string },
    callback: (res: CreateRoomResponse) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_JOIN_ROOM]: (
    payload: { roomId: string; username: string },
    callback: (res: JoinRoomResponse) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_LEAVE_ROOM]: (
    callback?: () => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_RECONNECT]: (
    payload: { roomId: string; playerId: string; sessionToken: string },
    callback: (res: ReconnectResponse) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_UPDATE_SETTINGS]: (
    payload: { settings: Partial<GameSettings>; customWordPairs?: WordPair[] },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_START_GAME]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_CONFIRM_WORD]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_TURN_DONE]: (
    payload?: { clueText?: string } | ((res: { success: boolean; error?: string }) => void),
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_SKIP_DISCUSSION]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_SUBMIT_VOTE]: (
    payload: { targetPlayerId: string },
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_PROCEED_NEXT_ROUND]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_PLAY_AGAIN]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
  [SOCKET_EVENTS.CLIENT_RETURN_TO_LOBBY]: (
    callback?: (res: { success: boolean; error?: string }) => void
  ) => void;
}

export interface ServerToClientEvents {
  [SOCKET_EVENTS.SERVER_ROOM_STATE]: (state: SanitizedRoomState) => void;
  [SOCKET_EVENTS.SERVER_PRIVATE_DATA]: (data: PrivatePlayerData | null) => void;
  [SOCKET_EVENTS.SERVER_ERROR]: (payload: { message: string }) => void;
  [SOCKET_EVENTS.SERVER_TOAST]: (payload: { message: string; type?: 'info' | 'success' | 'warning' | 'error' }) => void;
  [SOCKET_EVENTS.SERVER_HOST_CHANGED]: (payload: { newHostId: string; newHostName: string }) => void;
  [SOCKET_EVENTS.SERVER_VOTE_RESULT]: (result: VoteResult) => void;
  [SOCKET_EVENTS.SERVER_PHASE_CHANGE]: (payload: { phase: string }) => void;
}
