import { describe, it, expect } from 'vitest';
import { RoomManager } from '../rooms/RoomManager.js';
import { WordManager } from '../words/wordManager.js';

describe('RoomManager & Host Migration', () => {
  const dummyIo = {
    to: () => ({ emit: () => {} }),
  } as any;

  it('generates unique 6-character alphanumeric room codes', () => {
    const wm = new WordManager();
    const rm = new RoomManager(dummyIo, wm);

    const code1 = rm.generateRoomCode();
    const code2 = rm.generateRoomCode();

    expect(code1.length).toBe(6);
    expect(code2.length).toBe(6);
    expect(code1).toMatch(/^[A-Z0-9]{6}$/);
    expect(code1).not.toBe(code2);
  });

  it('creates and tracks session tokens', () => {
    const wm = new WordManager();
    const rm = new RoomManager(dummyIo, wm);

    const token = rm.createSession('ROOM01', 'player123');
    expect(token).toBeTruthy();

    const session = rm.getSession(token);
    expect(session).toBeDefined();
    expect(session?.roomId).toBe('ROOM01');
    expect(session?.playerId).toBe('player123');
  });

  it('migrates host when host disconnects', () => {
    const wm = new WordManager();
    const rm = new RoomManager(dummyIo, wm);
    const room = rm.createRoom();

    const mockSocket1 = { id: 'sock1', join: () => {} } as any;
    const mockSocket2 = { id: 'sock2', join: () => {} } as any;

    const p1 = room.addPlayer('p1', 'Alice', 'tok1', mockSocket1, true);
    const p2 = room.addPlayer('p2', 'Bob', 'tok2', mockSocket2, false);

    expect(room.engine.hostPlayerId).toBe('p1');
    expect(p1.isHost).toBe(true);
    expect(p2.isHost).toBe(false);

    // Disconnect Alice
    room.handleSocketDisconnect('sock1');

    expect(room.engine.hostPlayerId).toBe('p2');
    expect(p2.isHost).toBe(true);
  });
});
