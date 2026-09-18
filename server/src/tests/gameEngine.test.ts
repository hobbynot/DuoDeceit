import { describe, it, expect, beforeEach } from 'vitest';
import { GameEngine } from '../game/GameEngine.js';
import { WordManager } from '../words/wordManager.js';

describe('GameEngine Core Logic', () => {
  let engine: GameEngine;
  let wordManager: WordManager;

  beforeEach(() => {
    engine = new GameEngine('TEST01');
    wordManager = new WordManager();
  });

  it('requires minimum 3 players to start', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');

    const result = engine.startGame(wordManager);
    expect(result.success).toBe(false);
    expect(result.error).toMatch(/3 players are required/);
  });

  it('assigns exactly one minority word and N-1 majority words for 3, 4, and 10 players', () => {
    for (const count of [3, 4, 10]) {
      const g = new GameEngine(`TEST_${count}`);
      for (let i = 0; i < count; i++) {
        g.addPlayer(`p${i}`, `Player${i}`, `tok${i}`, i === 0);
      }

      const res = g.startGame(wordManager);
      expect(res.success).toBe(true);
      expect(g.phase).toBe('WORD_REVEAL');
      expect(g.minorityPlayerId).toBeTruthy();

      const players = Array.from(g.players.values());
      const minorityPlayers = players.filter((p) => p.secretWord === g.minorityWord);
      const majorityPlayers = players.filter((p) => p.secretWord === g.majorityWord);

      expect(minorityPlayers.length).toBe(1);
      expect(majorityPlayers.length).toBe(count - 1);
      expect(g.minorityWord).not.toBe(g.majorityWord);
      expect(minorityPlayers[0].id).toBe(g.minorityPlayerId);
    }
  });

  it('progresses through word confirmation into Clue Round 1', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);

    expect(engine.phase).toBe('WORD_REVEAL');

    engine.confirmWord('p1');
    expect(engine.phase).toBe('WORD_REVEAL');

    engine.confirmWord('p2');
    expect(engine.phase).toBe('WORD_REVEAL');

    engine.confirmWord('p3');
    expect(engine.phase).toBe('CLUE_ROUND_1');
    expect(engine.clueRoundNumber).toBe(1);
    expect(engine.speakerOrder.length).toBe(3);
  });

  it('handles two clue rounds in order, then discussion', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);
    engine.confirmWord('p1');
    engine.confirmWord('p2');
    engine.confirmWord('p3');

    expect(engine.phase).toBe('CLUE_ROUND_1');

    // Round 1 turns
    for (let i = 0; i < engine.speakerOrder.length; i++) {
      const currentSpeaker = engine.getCurrentSpeakerId();
      expect(currentSpeaker).toBe(engine.speakerOrder[i]);

      // Reject non-speaker turn completion
      const wrongSpeaker = engine.speakerOrder[(i + 1) % 3];
      const fail = engine.completeTurn(wrongSpeaker);
      expect(fail.success).toBe(false);

      const pass = engine.completeTurn(currentSpeaker!);
      expect(pass.success).toBe(true);
    }

    // Now in Round 2
    expect(engine.phase).toBe('CLUE_ROUND_2');
    expect(engine.clueRoundNumber).toBe(2);

    // Round 2 turns
    for (let i = 0; i < engine.speakerOrder.length; i++) {
      const currentSpeaker = engine.getCurrentSpeakerId();
      const pass = engine.completeTurn(currentSpeaker!);
      expect(pass.success).toBe(true);
    }

    // Discussion phase
    expect(engine.phase).toBe('DISCUSSION');
  });

  it('records and returns clues in sanitized room state', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);
    engine.confirmWord('p1');
    engine.confirmWord('p2');
    engine.confirmWord('p3');

    const speaker1 = engine.getCurrentSpeakerId()!;
    engine.completeTurn(speaker1, 'Delicious fruit');

    expect(engine.clues.length).toBe(1);
    expect(engine.clues[0].clueText).toBe('Delicious fruit');
    expect(engine.clues[0].playerId).toBe(speaker1);
    expect(engine.getSanitizedState().clues.length).toBe(1);
  });

  it('prevents self-voting and calculates vote results', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);

    engine.startVoting();
    expect(engine.phase).toBe('VOTING');

    // Alice tries to vote for herself -> must fail
    const selfVote = engine.submitVote('p1', 'p1');
    expect(selfVote.success).toBe(false);
    expect(selfVote.error).toMatch(/cannot vote for yourself/);

    // Valid votes
    engine.submitVote('p1', 'p2');
    engine.submitVote('p2', 'p3');
    const lastVote = engine.submitVote('p3', 'p2');
    expect(lastVote.allVoted).toBe(true);

    const result = engine.calculateVotesAndProgress();
    expect(result.isTie).toBe(false);
    expect(result.eliminatedPlayerId).toBe('p2');
    expect(engine.players.get('p2')?.eliminated).toBe(true);
  });

  it('handles tie votes with a revote', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.addPlayer('p4', 'Dave', 'tok4');
    engine.startGame(wordManager);

    engine.startVoting();

    // p1 & p2 vote for p3; p3 & p4 vote for p1
    engine.submitVote('p1', 'p3');
    engine.submitVote('p2', 'p3');
    engine.submitVote('p3', 'p1');
    engine.submitVote('p4', 'p1');

    const result = engine.calculateVotesAndProgress();
    expect(result.isTie).toBe(true);
    expect(result.tiedPlayerIds).toContain('p1');
    expect(result.tiedPlayerIds).toContain('p3');
    expect(engine.phase).toBe('VOTING');
    expect(engine.isRevote).toBe(true);
    expect(engine.eligibleCandidateIds).toEqual(expect.arrayContaining(['p1', 'p3']));
  });

  it('declares Majority win when minority player is eliminated', () => {
    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');
    engine.startGame(wordManager);

    const minorityId = engine.minorityPlayerId!;
    const otherPlayers = ['p1', 'p2', 'p3'].filter((id) => id !== minorityId);

    engine.startVoting();
    // Both other players vote for minority
    engine.submitVote(otherPlayers[0], minorityId);
    engine.submitVote(otherPlayers[1], minorityId);
    engine.submitVote(minorityId, otherPlayers[0]);

    const result = engine.calculateVotesAndProgress();
    expect(result.eliminatedPlayerId).toBe(minorityId);
    expect(result.wasMinorityWord).toBe(true);
    expect(engine.phase).toBe('GAME_OVER');
    expect(engine.gameOverSummary?.winner).toBe('MAJORITY');
  });

  it('updates game settings and filters word pairs by category & difficulty', () => {
    engine.updateSettings(
      {
        category: 'Food & Drinks',
        difficulty: 'easy',
        discussionDuration: 90,
      },
      undefined,
      wordManager
    );

    expect(engine.settings.category).toBe('Food & Drinks');
    expect(engine.settings.difficulty).toBe('easy');
    expect(engine.settings.discussionDuration).toBe(90);
    expect(engine.settings.totalAvailablePairs).toBeGreaterThan(0);

    const sanitized = engine.getSanitizedState();
    expect(sanitized.settings?.category).toBe('Food & Drinks');
    expect(sanitized.settings?.difficulty).toBe('easy');
    expect(sanitized.settings?.discussionDuration).toBe(90);
  });

  it('supports uploading and playing with custom word pairs', () => {
    const customList = [
      { word1: 'CustomAlpha', word2: 'CustomBeta', category: 'Testing', difficulty: 'hard' as const },
      { word1: 'Gamma', word2: 'Delta', category: 'Testing', difficulty: 'easy' as const },
    ];

    engine.updateSettings(
      {
        isCustomWordPack: true,
        customPackName: 'my_custom_pairs.json',
      },
      customList,
      wordManager
    );

    expect(engine.settings.isCustomWordPack).toBe(true);
    expect(engine.settings.customPackName).toBe('my_custom_pairs.json');
    expect(engine.settings.totalAvailablePairs).toBe(2);

    engine.addPlayer('p1', 'Alice', 'tok1', true);
    engine.addPlayer('p2', 'Bob', 'tok2');
    engine.addPlayer('p3', 'Charlie', 'tok3');

    const startRes = engine.startGame(wordManager);
    expect(startRes.success).toBe(true);

    const words = [engine.majorityWord, engine.minorityWord].sort();
    const isValidPair =
      (words.includes('CustomAlpha') && words.includes('CustomBeta')) ||
      (words.includes('Delta') && words.includes('Gamma'));

    expect(isValidPair).toBe(true);
  });
});
