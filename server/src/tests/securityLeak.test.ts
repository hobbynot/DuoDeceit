import { describe, it, expect } from 'vitest';
import { GameEngine } from '../game/GameEngine.js';
import { WordManager } from '../words/wordManager.js';

describe('Security & Anti-Leak Safeguards', () => {
  it('never leaks secret words or minority player identity in public sanitized state', () => {
    const engine = new GameEngine('SECR01');
    const wordManager = new WordManager();

    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);

    const sanitized = engine.getSanitizedState();
    const serialized = JSON.stringify(sanitized);

    // Ensure secretWord is not present in any player object
    for (const p of sanitized.players) {
      expect((p as any).secretWord).toBeUndefined();
    }

    // Ensure minorityWord and majorityWord are not in sanitized state
    expect((sanitized as any).minorityWord).toBeUndefined();
    expect((sanitized as any).majorityWord).toBeUndefined();
    expect((sanitized as any).minorityPlayerId).toBeUndefined();

    // Verify neither word string appears anywhere in the serialized public state
    expect(serialized).not.toContain(engine.minorityWord!);
    expect(serialized).not.toContain(engine.majorityWord!);
  });

  it('only returns private word to authorized player query', () => {
    const engine = new GameEngine('SECR02');
    const wordManager = new WordManager();

    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);

    const aliceData = engine.getPrivatePlayerData('p1');
    const bobData = engine.getPrivatePlayerData('p2');
    const unknownData = engine.getPrivatePlayerData('nonexistent');

    expect(aliceData).not.toBeNull();
    expect(bobData).not.toBeNull();
    expect(unknownData).toBeNull();

    expect(aliceData?.playerId).toBe('p1');
    expect(bobData?.playerId).toBe('p2');
    expect(aliceData?.secretWord).toBe(engine.players.get('p1')?.secretWord);
  });
});
