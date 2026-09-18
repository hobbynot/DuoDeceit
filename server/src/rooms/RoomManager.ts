import { Server } from 'socket.io';
import {
  ClientToServerEvents,
  ServerToClientEvents,
  GAME_CONSTANTS,
} from '@duodeceit/shared';
import { Room } from './Room.js';
import { WordManager } from '../words/wordManager.js';
import { v4 as uuidv4 } from 'uuid';

export interface SessionInfo {
  roomId: string;
  playerId: string;
  createdAt: number;
}

export class RoomManager {
  private rooms: Map<string, Room> = new Map();
  private sessions: Map<string, SessionInfo> = new Map();
  private io: Server<ClientToServerEvents, ServerToClientEvents>;
  private wordManager: WordManager;

  constructor(
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    wordManager: WordManager
  ) {
    this.io = io;
    this.wordManager = wordManager;
  }

  public generateRoomCode(): string {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'; // Excluded confusing chars like I, O, 1, 0
    let code = '';
    for (let i = 0; i < GAME_CONSTANTS.ROOM_CODE_LENGTH; i++) {
      code += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    // Ensure uniqueness
    if (this.rooms.has(code)) {
      return this.generateRoomCode();
    }
    return code;
  }

  public createRoom(maxPlayers?: number): Room {
    const roomId = this.generateRoomCode();
    const room = new Room(roomId, this.io, this.wordManager, maxPlayers);
    this.rooms.set(roomId, room);
    return room;
  }

  public getRoom(roomId: string): Room | undefined {
    return this.rooms.get(roomId.toUpperCase());
  }

  public createSession(roomId: string, playerId: string): string {
    const token = uuidv4();
    this.sessions.set(token, {
      roomId,
      playerId,
      createdAt: Date.now(),
    });
    return token;
  }

  public getSession(sessionToken: string): SessionInfo | undefined {
    return this.sessions.get(sessionToken);
  }

  public removeSession(sessionToken: string): void {
    this.sessions.delete(sessionToken);
  }

  public deleteRoom(roomId: string): void {
    const room = this.rooms.get(roomId);
    if (room) {
      room.destroy();
      this.rooms.delete(roomId);
    }
  }

  public handleSocketDisconnect(socketId: string): void {
    for (const [roomId, room] of this.rooms.entries()) {
      const { allDisconnected } = room.handleSocketDisconnect(socketId);
      if (allDisconnected) {
        // Schedule cleanup after 10 min
        room.scheduleEmptyCleanup(() => {
          this.deleteRoom(roomId);
        });
      }
      room.broadcastState();
    }
  }
}
