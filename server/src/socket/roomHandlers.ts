import { Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@duodeceit/shared';
import { RoomManager } from '../rooms/RoomManager.js';
import { v4 as uuidv4 } from 'uuid';

export function registerRoomHandlers(
  socket: Socket<ClientToServerEvents, ServerToClientEvents>,
  roomManager: RoomManager
): void {
  // CREATE ROOM
  socket.on(SOCKET_EVENTS.CLIENT_CREATE_ROOM, ({ username }, callback) => {
    const trimmed = username?.trim();
    if (!trimmed) {
      return callback({ success: false, error: 'Username is required.' });
    }
    if (trimmed.length > 20) {
      return callback({
        success: false,
        error: 'Username must be 20 characters or fewer.',
      });
    }

    const room = roomManager.createRoom();
    const playerId = uuidv4();
    const sessionToken = roomManager.createSession(room.roomId, playerId);

    room.addPlayer(playerId, trimmed, sessionToken, socket, true);

    callback({
      success: true,
      roomId: room.roomId,
      playerId,
      sessionToken,
    });

    room.broadcastState();
  });

  // JOIN ROOM
  socket.on(SOCKET_EVENTS.CLIENT_JOIN_ROOM, ({ roomId, username }, callback) => {
    const roomCode = roomId?.trim().toUpperCase();
    const trimmed = username?.trim();

    if (!roomCode) {
      return callback({ success: false, error: 'Room code is required.' });
    }
    if (!trimmed) {
      return callback({ success: false, error: 'Username is required.' });
    }
    if (trimmed.length > 20) {
      return callback({
        success: false,
        error: 'Username must be 20 characters or fewer.',
      });
    }

    const room = roomManager.getRoom(roomCode);
    if (!room) {
      return callback({ success: false, error: 'Room not found. Please check the code.' });
    }

    // Check if player with this username already exists
    const existingPlayer = Array.from(room.engine.players.values()).find(
      (p) => p.username.toLowerCase() === trimmed.toLowerCase()
    );

    // If existing player exists and is disconnected, let them reclaim their slot!
    if (existingPlayer) {
      if (!existingPlayer.connected) {
        const sessionToken = roomManager.createSession(room.roomId, existingPlayer.id);
        existingPlayer.sessionToken = sessionToken;
        room.associateSocket(existingPlayer.id, socket);

        callback({
          success: true,
          roomId: room.roomId,
          playerId: existingPlayer.id,
          sessionToken,
        });

        room.broadcastState();
        return;
      }

      return callback({
        success: false,
        error: 'That username is already active in this room. Please choose another.',
      });
    }

    if (room.engine.phase !== 'LOBBY') {
      return callback({
        success: false,
        error: 'This game has already started and cannot be joined right now.',
      });
    }

    if (room.engine.players.size >= room.engine.maxPlayers) {
      return callback({ success: false, error: 'This room is currently full.' });
    }

    const playerId = uuidv4();
    const sessionToken = roomManager.createSession(room.roomId, playerId);

    room.addPlayer(playerId, trimmed, sessionToken, socket, false);

    callback({
      success: true,
      roomId: room.roomId,
      playerId,
      sessionToken,
    });

    room.broadcastState();
  });

  // RECONNECT
  socket.on(
    SOCKET_EVENTS.CLIENT_RECONNECT,
    ({ roomId, playerId, sessionToken }, callback) => {
      const roomCode = roomId?.trim().toUpperCase();
      const room = roomManager.getRoom(roomCode);
      if (!room) {
        return callback({
          success: false,
          error: 'Room no longer exists.',
        });
      }

      const player = room.engine.players.get(playerId);
      if (!player) {
        return callback({
          success: false,
          error: 'Player not found in room.',
        });
      }

      const session = roomManager.getSession(sessionToken);
      const isValidToken =
        (session && session.roomId === roomCode && session.playerId === playerId) ||
        (player.sessionToken && player.sessionToken === sessionToken);

      if (!isValidToken) {
        return callback({
          success: false,
          error: 'Session expired or invalid.',
        });
      }

      room.associateSocket(playerId, socket);

      callback({
        success: true,
        roomId: room.roomId,
        playerId,
        roomState: room.engine.getSanitizedState(),
        privateData: room.engine.getPrivatePlayerData(playerId),
      });

      room.broadcastState();
    }
  );

  // LEAVE ROOM
  socket.on(SOCKET_EVENTS.CLIENT_LEAVE_ROOM, (callback) => {
    roomManager.handleSocketDisconnect(socket.id);
    if (callback) callback();
  });
}
