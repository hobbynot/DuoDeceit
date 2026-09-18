import { describe, it, expect, beforeAll, afterAll } from 'vitest';
import { io as ClientSocket, Socket } from 'socket.io-client';
import { createServer } from 'http';
import express from 'express';
import { Server } from 'socket.io';
import {
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
  SanitizedRoomState,
  PrivatePlayerData,
  VoteResult,
} from '@duodeceit/shared';
import { WordManager } from '../words/wordManager.js';
import { RoomManager } from '../rooms/RoomManager.js';
import { registerRoomHandlers } from '../socket/roomHandlers.js';
import { registerGameHandlers } from '../socket/gameHandlers.js';

describe('End-to-End Real-Time Multiplayer Flow', () => {
  let httpServer: any;
  let ioServer: Server;
  let serverPort: number;

  beforeAll(async () => {
    const app = express();
    httpServer = createServer(app);
    ioServer = new Server<ClientToServerEvents, ServerToClientEvents>(httpServer);
    const wordManager = new WordManager();
    const roomManager = new RoomManager(ioServer, wordManager);

    ioServer.on('connection', (socket) => {
      registerRoomHandlers(socket, roomManager);
      registerGameHandlers(socket, roomManager);
      socket.on('disconnect', () => {
        roomManager.handleSocketDisconnect(socket.id);
      });
    });

    await new Promise<void>((resolve) => {
      httpServer.listen(0, () => {
        serverPort = httpServer.address().port;
        resolve();
      });
    });
  });

  afterAll(async () => {
    ioServer.close();
    await new Promise<void>((resolve) => httpServer.close(resolve));
  });

  const createClient = (): Socket<ServerToClientEvents, ClientToServerEvents> => {
    return ClientSocket(`http://localhost:${serverPort}`, {
      transports: ['websocket'],
      autoConnect: true,
    });
  };

  it('runs complete 4-player game lifecycle smoothly', async () => {
    const client1 = createClient();
    const client2 = createClient();
    const client3 = createClient();
    const client4 = createClient();

    let latestState: any = null;
    client1.on(SOCKET_EVENTS.SERVER_ROOM_STATE, (state: any) => {
      latestState = state;
    });

    const privateWords: Map<string, string> = new Map();
    client1.on(SOCKET_EVENTS.SERVER_PRIVATE_DATA, (d: any) => d && privateWords.set('Rahul', d.secretWord));
    client2.on(SOCKET_EVENTS.SERVER_PRIVATE_DATA, (d: any) => d && privateWords.set('Amit', d.secretWord));
    client3.on(SOCKET_EVENTS.SERVER_PRIVATE_DATA, (d: any) => d && privateWords.set('Priya', d.secretWord));
    client4.on(SOCKET_EVENTS.SERVER_PRIVATE_DATA, (d: any) => d && privateWords.set('Neha', d.secretWord));

    // 1. Host creates room
    let roomId = '';
    await new Promise<void>((resolve) => {
      client1.emit(SOCKET_EVENTS.CLIENT_CREATE_ROOM, { username: 'Rahul' }, (res) => {
        expect(res.success).toBe(true);
        expect(res.roomId).toBeTruthy();
        roomId = res.roomId!;
        resolve();
      });
    });

    // 2. Players 2, 3, 4 join
    await Promise.all([
      new Promise<void>((resolve) => {
        client2.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOM, { roomId, username: 'Amit' }, (res) => {
          expect(res.success).toBe(true);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        client3.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOM, { roomId, username: 'Priya' }, (res) => {
          expect(res.success).toBe(true);
          resolve();
        });
      }),
      new Promise<void>((resolve) => {
        client4.emit(SOCKET_EVENTS.CLIENT_JOIN_ROOM, { roomId, username: 'Neha' }, (res) => {
          expect(res.success).toBe(true);
          resolve();
        });
      }),
    ]);

    // 3. Verify lobby has 4 players
    await new Promise((r) => setTimeout(r, 100));
    expect(latestState?.players.length).toBe(4);
    expect(latestState?.phase).toBe('LOBBY');

    // 4. Host starts game

    await new Promise<void>((resolve) => {
      client1.emit(SOCKET_EVENTS.CLIENT_START_GAME, (res) => {
        expect(res?.success).toBe(true);
        resolve();
      });
    });

    await new Promise((r) => setTimeout(r, 50));
    expect(latestState?.phase).toBe('WORD_REVEAL');
    expect(privateWords.size).toBe(4);

    // Verify word assignment: exactly 1 minority word
    const words = Array.from(privateWords.values());
    const uniqueWords = Array.from(new Set(words));
    expect(uniqueWords.length).toBe(2);
    const countA = words.filter((w) => w === uniqueWords[0]).length;
    const countB = words.filter((w) => w === uniqueWords[1]).length;
    expect([countA, countB].sort()).toEqual([1, 3]);

    // 5. All 4 players confirm their words
    await Promise.all([
      new Promise<void>((resolve) => client1.emit(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, () => resolve())),
      new Promise<void>((resolve) => client2.emit(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, () => resolve())),
      new Promise<void>((resolve) => client3.emit(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, () => resolve())),
      new Promise<void>((resolve) => client4.emit(SOCKET_EVENTS.CLIENT_CONFIRM_WORD, () => resolve())),
    ]);

    await new Promise((r) => setTimeout(r, 50));
    expect(latestState?.phase).toBe('CLUE_ROUND_1');
    expect(latestState?.speakerOrder.length).toBe(4);

    // 6. Complete Round 1 turns
    const clientMap: Record<string, Socket> = {};
    for (const p of latestState?.players || []) {
      if (p.username === 'Rahul') clientMap[p.id] = client1;
      if (p.username === 'Amit') clientMap[p.id] = client2;
      if (p.username === 'Priya') clientMap[p.id] = client3;
      if (p.username === 'Neha') clientMap[p.id] = client4;
    }

    for (const speakerId of latestState?.speakerOrder || []) {
      const activeClient = clientMap[speakerId];
      await new Promise<void>((resolve) => {
        activeClient.emit(SOCKET_EVENTS.CLIENT_TURN_DONE, { clueText: 'Round 1 clue' }, () => resolve());
      });
      await new Promise((r) => setTimeout(r, 10));
    }

    expect(latestState?.phase).toBe('CLUE_ROUND_2');
    expect(latestState?.clues.length).toBe(4);

    // 7. Complete Round 2 turns
    for (const speakerId of latestState?.speakerOrder || []) {
      const activeClient = clientMap[speakerId];
      await new Promise<void>((resolve) => {
        activeClient.emit(SOCKET_EVENTS.CLIENT_TURN_DONE, { clueText: 'Round 2 clue' }, () => resolve());
      });
      await new Promise((r) => setTimeout(r, 10));
    }

    expect(latestState?.phase).toBe('DISCUSSION');
    expect(latestState?.clues.length).toBe(8);

    // 8. Skip discussion to voting
    await new Promise<void>((resolve) => {
      client1.emit(SOCKET_EVENTS.CLIENT_SKIP_DISCUSSION, () => resolve());
    });
    await new Promise((r) => setTimeout(r, 50));
    expect(latestState?.phase).toBe('VOTING');

    // 9. Submit votes: client1, 2, 3 vote for client4's player; client4 votes for client1's player
    const rahulId = latestState?.players.find((p: any) => p.username === 'Rahul')?.id!;
    const nehaId = latestState?.players.find((p: any) => p.username === 'Neha')?.id!;

    let voteResult: any = null;
    client1.on(SOCKET_EVENTS.SERVER_VOTE_RESULT, (res: any) => {
      voteResult = res;
    });

    await Promise.all([
      new Promise<void>((resolve) => client1.emit(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, { targetPlayerId: nehaId }, () => resolve())),
      new Promise<void>((resolve) => client2.emit(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, { targetPlayerId: nehaId }, () => resolve())),
      new Promise<void>((resolve) => client3.emit(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, { targetPlayerId: nehaId }, () => resolve())),
      new Promise<void>((resolve) => client4.emit(SOCKET_EVENTS.CLIENT_SUBMIT_VOTE, { targetPlayerId: rahulId }, () => resolve())),
    ]);

    await new Promise((r) => setTimeout(r, 50));
    expect(voteResult).toBeDefined();
    expect(voteResult?.eliminatedPlayerId).toBe(nehaId);
    expect(voteResult?.eliminatedPlayerWord).toBe(privateWords.get('Neha'));

    client1.disconnect();
    client2.disconnect();
    client3.disconnect();
    client4.disconnect();
  });
});
