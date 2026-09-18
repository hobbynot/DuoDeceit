import { Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@duodeceit/shared';
import { RoomManager } from '../rooms/RoomManager.js';
import { Room } from '../rooms/Room.js';

function getPlayerAndRoom(
  socket: Socket,
  roomManager: RoomManager
): { room?: Room; playerId?: string; error?: string } {
  // Find room that contains this socket
  const socketRooms = Array.from(socket.rooms);
  // socket.rooms contains socket.id and joined roomIds
  for (const rId of socketRooms) {
    if (rId !== socket.id) {
      const room = roomManager.getRoom(rId);
      if (room) {
        // Find which playerId owns this socket
        for (const [pId, sId] of (room as any).playerSockets.entries()) {
          if (sId === socket.id) {
            return { room, playerId: pId };
          }
        }
      }
    }
  }
  return { error: 'You are not in an active room.' };
}

export function registerGameHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
): void {
  // UPDATE SETTINGS (Host only, Lobby only)
  socket.on(
    SOCKET_EVENTS.CLIENT_UPDATE_SETTINGS,
    ({ settings, customWordPairs }, callback) => {
      const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
      if (error || !room || !playerId) {
        return callback?.({ success: false, error: error || 'Room error' });
      }

      if (room.engine.hostPlayerId !== playerId) {
        return callback?.({
          success: false,
          error: 'Only the host can modify game settings.',
        });
      }

      if (room.engine.phase !== 'LOBBY') {
        return callback?.({
          success: false,
          error: 'Settings can only be updated in the lobby.',
        });
      }

      try {
        room.updateSettings(settings, customWordPairs);
        callback?.({ success: true });
      } catch (err: any) {
        callback?.({
          success: false,
          error: err.message || 'Failed to update settings.',
        });
      }
    }
  );

  // START GAME (Host only)
  socket.on(SOCKET_EVENTS.CLIENT_START_GAME, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    if (room.engine.hostPlayerId !== playerId) {
      return callback?.({
        success: false,
        error: 'Only the host can start the game.',
      });
    }

    const result = room.startGame();
    callback?.(result);
  });

  // CONFIRM SECRET WORD
  socket.on(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    const result = room.confirmWord(playerId);
    callback?.(result);
  });

  // FINISH CLUE TURN (with optional clueText)
  socket.on(SOCKET_EVENTS.CLIENT_TURN_DONE, (arg1: any, arg2?: any) => {
    let clueText: string | undefined;
    let callback: ((res: { success: boolean; error?: string }) => void) | undefined;

    if (typeof arg1 === 'function') {
      callback = arg1;
    } else if (arg1 && typeof arg1 === 'object') {
      clueText = arg1.clueText;
      if (typeof arg2 === 'function') {
        callback = arg2;
      }
    }

    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    const result = room.completeTurn(playerId, clueText);
    callback?.(result);
  });

  // SKIP DISCUSSION (Host only)
  socket.on(SOCKET_EVENTS.CLIENT_SKIP_DISCUSSION, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    if (room.engine.hostPlayerId !== playerId) {
      return callback?.({
        success: false,
        error: 'Only the host can skip the discussion timer.',
      });
    }

    const result = room.skipDiscussion();
    callback?.(result);
  });

  // SUBMIT VOTE
  socket.on(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, ({ targetPlayerId }, callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    const result = room.submitVote(playerId, targetPlayerId);
    callback?.(result);
  });

  // PROCEED TO NEXT ROUND (Host only, when wrong player eliminated)
  socket.on(SOCKET_EVENTS.CLIENT_PROCEED_NEXT_ROUND, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    if (room.engine.hostPlayerId !== playerId) {
      return callback?.({
        success: false,
        error: 'Only the host can proceed to the next round.',
      });
    }

    const result = room.proceedToNextRound();
    callback?.(result);
  });

  // PLAY AGAIN (Host only)
  socket.on(SOCKET_EVENTS.CLIENT_PLAY_AGAIN, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    if (room.engine.hostPlayerId !== playerId) {
      return callback?.({
        success: false,
        error: 'Only the host can start a new game.',
      });
    }

    const result = room.playAgain();
    callback?.(result);
  });

  // RETURN TO LOBBY (Host only)
  socket.on(SOCKET_EVENTS.CLIENT_RETURN_TO_LOBBY, (callback) => {
    const { room, playerId, error } = getPlayerAndRoom(socket, roomManager);
    if (error || !room || !playerId) {
      return callback?.({ success: false, error: error || 'Room error' });
    }

    if (room.engine.hostPlayerId !== playerId) {
      return callback?.({
        success: false,
        error: 'Only the host can return to the lobby.',
      });
    }

    const result = room.returnToLobby();
    callback?.(result);
  });
}
