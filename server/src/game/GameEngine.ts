import {
  GamePhase,
  PublicPlayer,
  SanitizedRoomState,
  PrivatePlayerData,
  VoteResult,
  VoteTally,
  GameOverSummary,
  WordPair,
  ClueEntry,
  GameSettings,
  GAME_CONSTANTS,
} from '@duodeceit/shared';
import { WordManager } from '../words/wordManager.js';

export interface ServerPlayer {
  id: string;
  username: string;
  isHost: boolean;
  connected: boolean;
  eliminated: boolean;
  hasConfirmedWord: boolean;
  hasVoted: boolean;
  avatarColor: string;
  sessionToken: string;
  secretWord: string;
}

const AVATAR_COLORS = [
  '#ec4899', // pink
  '#8b5cf6', // purple
  '#3b82f6', // blue
  '#06b6d4', // cyan
  '#10b981', // emerald
  '#f59e0b', // amber
  '#ef4444', // red
  '#14b8a6', // teal
  '#6366f1', // indigo
  '#84cc16', // lime
];

export class GameEngine {
  public roomId: string;
  public phase: GamePhase = 'LOBBY';
  public roundNumber: number = 0;
  public players: Map<string, ServerPlayer> = new Map();
  public hostPlayerId: string = '';
  public maxPlayers: number = GAME_CONSTANTS.MAX_PLAYERS_DEFAULT;

  public wordPair: WordPair | null = null;
  public majorityWord: string | null = null;
  public minorityWord: string | null = null;
  public minorityPlayerId: string | null = null;

  public clueRoundNumber: 1 | 2 | null = null;
  public speakerOrder: string[] = [];
  public currentSpeakerIndex: number = 0;
  public clues: ClueEntry[] = [];

  public phaseStartedAt: number | null = null;
  public phaseEndsAt: number | null = null;
  public discussionDurationSeconds: number = GAME_CONSTANTS.DISCUSSION_DURATION_SECONDS;

  public settings: GameSettings = {
    selectedCategory: 'all',
    difficulty: 'all',
    discussionDurationSeconds: GAME_CONSTANTS.DISCUSSION_DURATION_SECONDS,
    customWordPairsCount: 0,
    totalAvailablePairs: 0,
  };
  public availableCategories: string[] = [];

  // Voting & ties
  public votes: Map<string, string> = new Map(); // voterId -> targetId
  public eligibleVoterIds: string[] = [];
  public eligibleCandidateIds: string[] = [];
  public isRevote: boolean = false;
  public lastVoteResult: VoteResult | null = null;
  public gameOverSummary: GameOverSummary | null = null;
  public eliminatedHistory: Array<{ id: string; name: string; word: string }> = [];

  constructor(roomId: string, maxPlayers?: number) {
    this.roomId = roomId;
    if (maxPlayers) {
      this.maxPlayers = maxPlayers;
    }
  }

  public addPlayer(
    id: string,
    username: string,
    sessionToken: string,
    isHost: boolean = false
  ): ServerPlayer {
    const colorIndex = this.players.size % AVATAR_COLORS.length;
    const player: ServerPlayer = {
      id,
      username,
      isHost,
      connected: true,
      eliminated: false,
      hasConfirmedWord: false,
      hasVoted: false,
      avatarColor: AVATAR_COLORS[colorIndex],
      sessionToken,
      secretWord: '',
    };

    this.players.set(id, player);
    if (isHost || !this.hostPlayerId) {
      this.hostPlayerId = id;
      player.isHost = true;
    }
    return player;
  }

  public removePlayer(playerId: string): void {
    this.players.delete(playerId);
    if (this.hostPlayerId === playerId) {
      this.migrateHost();
    }
  }

  public setPlayerConnected(playerId: string, connected: boolean): void {
    const player = this.players.get(playerId);
    if (player) {
      player.connected = connected;
      if (!connected && player.isHost) {
        this.migrateHost();
      }
    }
  }

  public migrateHost(): string | null {
    // Find next connected player
    for (const player of this.players.values()) {
      if (player.connected && player.id !== this.hostPlayerId) {
        // Demote previous host
        const oldHost = this.players.get(this.hostPlayerId);
        if (oldHost) oldHost.isHost = false;

        // Promote new host
        player.isHost = true;
        this.hostPlayerId = player.id;
        return player.id;
      }
    }

    // Fallback: if no other connected, take any other player
    for (const player of this.players.values()) {
      if (player.id !== this.hostPlayerId) {
        const oldHost = this.players.get(this.hostPlayerId);
        if (oldHost) oldHost.isHost = false;
        player.isHost = true;
        this.hostPlayerId = player.id;
        return player.id;
      }
    }
    return null;
  }

  public updateSettings(
    newSettings: Partial<GameSettings>,
    customPairs?: WordPair[],
    wordManager?: WordManager
  ): void {
    const category = newSettings.selectedCategory ?? newSettings.category;
    if (category !== undefined) {
      this.settings.selectedCategory = category;
      this.settings.category = category;
    }

    if (newSettings.difficulty !== undefined) {
      this.settings.difficulty = newSettings.difficulty;
    }

    const duration =
      newSettings.discussionDurationSeconds ?? newSettings.discussionDuration;
    if (duration !== undefined) {
      this.settings.discussionDurationSeconds = duration;
      this.settings.discussionDuration = duration;
      this.discussionDurationSeconds = duration;
    }

    if (newSettings.isCustomWordPack !== undefined) {
      this.settings.isCustomWordPack = newSettings.isCustomWordPack;
    }
    if (newSettings.customPackName !== undefined) {
      this.settings.customPackName = newSettings.customPackName;
    }

    if (customPairs && wordManager) {
      wordManager.setCustomPairs(customPairs);
      this.settings.customWordPairsCount = customPairs.length;
      this.settings.isCustomWordPack = true;
    } else if (newSettings.isCustomWordPack === false && wordManager) {
      wordManager.setCustomPairs([]);
      this.settings.customWordPairsCount = 0;
      this.settings.isCustomWordPack = false;
      this.settings.customPackName = undefined;
    }

    if (wordManager) {
      this.availableCategories = wordManager.getAvailableCategories();
      this.settings.totalAvailablePairs = wordManager.getMatchingPairsCount(
        this.settings.selectedCategory,
        this.settings.difficulty
      );
    }
  }

  public startGame(wordManager: WordManager): { success: boolean; error?: string } {
    const activePlayers = Array.from(this.players.values()).filter((p) => p.connected);
    if (activePlayers.length < GAME_CONSTANTS.MIN_PLAYERS) {
      return {
        success: false,
        error: `At least ${GAME_CONSTANTS.MIN_PLAYERS} players are required to start the game.`,
      };
    }

    // Reset game state
    this.roundNumber = 1;
    this.eliminatedHistory = [];
    this.lastVoteResult = null;
    this.gameOverSummary = null;
    this.votes.clear();
    this.clues = [];

    // Reset all players
    for (const player of this.players.values()) {
      player.eliminated = false;
      player.hasConfirmedWord = false;
      player.hasVoted = false;
      player.secretWord = '';
    }

    // 1. Assign words using selected category and difficulty
    const assignment = wordManager.getRandomAssignment(
      [],
      this.settings.selectedCategory,
      this.settings.difficulty
    );
    this.wordPair = assignment.pair;
    this.majorityWord = assignment.majorityWord;
    this.minorityWord = assignment.minorityWord;

    // Pick 1 minority player at random among active players
    const minorityIndex = Math.floor(Math.random() * activePlayers.length);
    const chosenMinorityPlayer = activePlayers[minorityIndex];
    this.minorityPlayerId = chosenMinorityPlayer.id;

    // Assign words to each player
    for (const player of activePlayers) {
      if (player.id === this.minorityPlayerId) {
        player.secretWord = this.minorityWord;
      } else {
        player.secretWord = this.majorityWord;
      }
    }

    // 2. Set phase to WORD_REVEAL
    this.phase = 'WORD_REVEAL';
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = Date.now() + GAME_CONSTANTS.WORD_REVEAL_TIMEOUT_SECONDS * 1000;

    return { success: true };
  }

  public confirmWord(playerId: string): { success: boolean; error?: string } {
    if (this.phase !== 'WORD_REVEAL') {
      return { success: false, error: 'Not in word reveal phase.' };
    }

    const player = this.players.get(playerId);
    if (!player) {
      return { success: false, error: 'Player not found.' };
    }

    player.hasConfirmedWord = true;

    // Check if all active non-eliminated players have confirmed
    const activePlayers = Array.from(this.players.values()).filter(
      (p) => p.connected && !p.eliminated
    );
    const allConfirmed = activePlayers.every((p) => p.hasConfirmedWord);

    if (allConfirmed) {
      this.startClueRound(1);
    }

    return { success: true };
  }

  public startClueRound(roundNum: 1 | 2): void {
    this.clueRoundNumber = roundNum;
    this.phase = roundNum === 1 ? 'CLUE_ROUND_1' : 'CLUE_ROUND_2';

    if (roundNum === 1) {
      // Build speaker order of active alive players
      const alivePlayers = Array.from(this.players.values()).filter(
        (p) => !p.eliminated && p.connected
      );
      // Random starting index
      const startIndex = Math.floor(Math.random() * alivePlayers.length);
      const ordered = [
        ...alivePlayers.slice(startIndex),
        ...alivePlayers.slice(0, startIndex),
      ];
      this.speakerOrder = ordered.map((p) => p.id);
    }
    // Round 2 uses the same speaker order (alive players only)
    this.currentSpeakerIndex = 0;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = null;
  }

  public getCurrentSpeakerId(): string | null {
    if (
      (this.phase === 'CLUE_ROUND_1' || this.phase === 'CLUE_ROUND_2') &&
      this.speakerOrder.length > 0 &&
      this.currentSpeakerIndex < this.speakerOrder.length
    ) {
      return this.speakerOrder[this.currentSpeakerIndex];
    }
    return null;
  }

  public completeTurn(playerId: string, clueText?: string): { success: boolean; error?: string } {
    if (this.phase !== 'CLUE_ROUND_1' && this.phase !== 'CLUE_ROUND_2') {
      return { success: false, error: 'Not in a clue round phase.' };
    }

    const currentSpeakerId = this.getCurrentSpeakerId();
    if (playerId !== currentSpeakerId) {
      return { success: false, error: 'It is not your turn to speak.' };
    }

    // Record clue if provided
    const speaker = this.players.get(playerId);
    if (speaker && clueText && clueText.trim()) {
      this.clues.push({
        id: Math.random().toString(36).substring(2, 9),
        playerId,
        username: speaker.username,
        clueText: clueText.trim().substring(0, 80),
        roundNumber: this.clueRoundNumber || 1,
        timestamp: Date.now(),
      });
    }

    this.currentSpeakerIndex++;

    if (this.currentSpeakerIndex >= this.speakerOrder.length) {
      if (this.clueRoundNumber === 1) {
        // Move to Round 2
        this.startClueRound(2);
      } else {
        // Both rounds complete -> Discussion
        this.startDiscussion();
      }
    }

    return { success: true };
  }

  public startDiscussion(): void {
    this.phase = 'DISCUSSION';
    this.clueRoundNumber = null;
    this.currentSpeakerIndex = 0;
    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = Date.now() + this.discussionDurationSeconds * 1000;
  }

  public startVoting(isTieRevote: boolean = false, tiedPlayerIds: string[] = []): void {
    this.phase = 'VOTING';
    this.votes.clear();
    this.isRevote = isTieRevote;

    const alivePlayers = Array.from(this.players.values()).filter(
      (p) => !p.eliminated && p.connected
    );

    // Reset hasVoted
    for (const p of this.players.values()) {
      p.hasVoted = false;
    }

    this.eligibleVoterIds = alivePlayers.map((p) => p.id);

    if (isTieRevote && tiedPlayerIds.length > 0) {
      this.eligibleCandidateIds = tiedPlayerIds;
    } else {
      this.eligibleCandidateIds = alivePlayers.map((p) => p.id);
    }

    this.phaseStartedAt = Date.now();
    this.phaseEndsAt = Date.now() + GAME_CONSTANTS.VOTING_DURATION_SECONDS * 1000;
  }

  public submitVote(voterId: string, targetId: string): {
    success: boolean;
    error?: string;
    allVoted?: boolean;
  } {
    if (this.phase !== 'VOTING') {
      return { success: false, error: 'Voting is not currently active.' };
    }

    if (!this.eligibleVoterIds.includes(voterId)) {
      return { success: false, error: 'You are not eligible to vote in this round.' };
    }

    if (voterId === targetId) {
      return { success: false, error: 'You cannot vote for yourself.' };
    }

    if (!this.eligibleCandidateIds.includes(targetId)) {
      return { success: false, error: 'Invalid candidate selection.' };
    }

    const voter = this.players.get(voterId);
    if (!voter || voter.hasVoted) {
      return { success: false, error: 'You have already voted.' };
    }

    this.votes.set(voterId, targetId);
    voter.hasVoted = true;

    // Check if all eligible voters have voted
    const allVoted = this.eligibleVoterIds.every((id) => this.votes.has(id));
    return { success: true, allVoted };
  }

  public calculateVotesAndProgress(): VoteResult {
    // 1. Tally votes
    const counts = new Map<string, number>();
    for (const candidateId of this.eligibleCandidateIds) {
      counts.set(candidateId, 0);
    }

    for (const targetId of this.votes.values()) {
      counts.set(targetId, (counts.get(targetId) || 0) + 1);
    }

    const tallies: VoteTally[] = [];
    for (const [candidateId, voteCount] of counts.entries()) {
      const candidate = this.players.get(candidateId);
      tallies.push({
        targetPlayerId: candidateId,
        targetUsername: candidate ? candidate.username : 'Unknown',
        voteCount,
      });
    }

    // Sort descending by votes
    tallies.sort((a, b) => b.voteCount - a.voteCount);

    const highestVote = tallies[0]?.voteCount || 0;
    const tiedCandidates = tallies.filter((t) => t.voteCount === highestVote);

    // 2. Check for tie
    if (tiedCandidates.length > 1 && highestVote > 0) {
      const tiedPlayerIds = tiedCandidates.map((t) => t.targetPlayerId);

      if (!this.isRevote) {
        // First tie: start tie revote
        const result: VoteResult = {
          tallies,
          isTie: true,
          tiedPlayerIds,
        };
        this.lastVoteResult = result;
        this.startVoting(true, tiedPlayerIds);
        return result;
      } else {
        // Second tie: Stalemate rule -> No elimination, proceed to next round!
        const result: VoteResult = {
          tallies,
          isTie: true,
          tiedPlayerIds,
        };
        this.lastVoteResult = result;
        this.phase = 'VOTE_RESULT';
        return result;
      }
    }

    // 3. Single highest vote -> Elimination
    const eliminatedId = tallies[0].targetPlayerId;
    const eliminatedPlayer = this.players.get(eliminatedId);

    if (eliminatedPlayer) {
      eliminatedPlayer.eliminated = true;
      const wasMinority = eliminatedPlayer.id === this.minorityPlayerId;

      this.eliminatedHistory.push({
        id: eliminatedPlayer.id,
        name: eliminatedPlayer.username,
        word: eliminatedPlayer.secretWord,
      });

      const result: VoteResult = {
        tallies,
        isTie: false,
        eliminatedPlayerId: eliminatedPlayer.id,
        eliminatedPlayerName: eliminatedPlayer.username,
        eliminatedPlayerWord: eliminatedPlayer.secretWord,
        wasMinorityWord: wasMinority,
      };

      this.lastVoteResult = result;
      this.phase = 'VOTE_RESULT';

      // Check win condition
      if (wasMinority) {
        // Majority wins! Minority was eliminated
        this.endGame('MAJORITY');
      } else {
        // Check if alive players <= 2 or reached MAX_ROUNDS
        const remainingAlive = Array.from(this.players.values()).filter(
          (p) => !p.eliminated && p.connected
        );
        if (remainingAlive.length <= 2 || this.roundNumber >= GAME_CONSTANTS.MAX_ROUNDS) {
          // Minority survives! Minority wins
          this.endGame('MINORITY');
        }
      }

      return result;
    }

    // Fallback empty result
    const fallbackResult: VoteResult = {
      tallies,
      isTie: false,
    };
    this.lastVoteResult = fallbackResult;
    return fallbackResult;
  }

  public proceedToNextRound(): { success: boolean; error?: string } {
    if (this.phase === 'GAME_OVER') {
      return { success: false, error: 'Game is already over.' };
    }

    this.roundNumber++;
    this.startClueRound(1);
    return { success: true };
  }

  public endGame(winner: 'MAJORITY' | 'MINORITY'): void {
    this.phase = 'GAME_OVER';
    const minorityPlayer = this.minorityPlayerId
      ? this.players.get(this.minorityPlayerId)
      : null;

    this.gameOverSummary = {
      winner,
      majorityWord: this.majorityWord || '',
      minorityWord: this.minorityWord || '',
      minorityPlayerId: this.minorityPlayerId || '',
      minorityPlayerName: minorityPlayer ? minorityPlayer.username : 'Unknown',
      eliminatedPlayers: [...this.eliminatedHistory],
      roundsPlayed: this.roundNumber,
    };
  }

  public returnToLobby(): void {
    this.phase = 'LOBBY';
    this.roundNumber = 0;
    this.clueRoundNumber = null;
    this.speakerOrder = [];
    this.currentSpeakerIndex = 0;
    this.wordPair = null;
    this.majorityWord = null;
    this.minorityWord = null;
    this.minorityPlayerId = null;
    this.votes.clear();
    this.eligibleVoterIds = [];
    this.eligibleCandidateIds = [];
    this.lastVoteResult = null;
    this.gameOverSummary = null;
    this.eliminatedHistory = [];
    this.clues = [];

    for (const player of this.players.values()) {
      player.eliminated = false;
      player.hasConfirmedWord = false;
      player.hasVoted = false;
      player.secretWord = '';
    }
  }

  public getSanitizedState(): SanitizedRoomState {
    const publicPlayers: PublicPlayer[] = Array.from(this.players.values()).map(
      (p) => ({
        id: p.id,
        username: p.username,
        isHost: p.isHost,
        connected: p.connected,
        eliminated: p.eliminated,
        hasConfirmedWord: p.hasConfirmedWord,
        hasVoted: p.hasVoted,
        avatarColor: p.avatarColor,
      })
    );

    return {
      roomId: this.roomId,
      phase: this.phase,
      roundNumber: this.roundNumber,
      players: publicPlayers,
      hostPlayerId: this.hostPlayerId,
      maxPlayers: this.maxPlayers,
      currentSpeakerId: this.getCurrentSpeakerId(),
      speakerOrder: [...this.speakerOrder],
      clueRoundNumber: this.clueRoundNumber,
      clues: [...this.clues],
      settings: { ...this.settings },
      availableCategories: [...this.availableCategories],
      phaseStartedAt: this.phaseStartedAt,
      phaseEndsAt: this.phaseEndsAt,
      discussionDurationSeconds: this.discussionDurationSeconds,
      eligibleVoterIds: [...this.eligibleVoterIds],
      eligibleCandidateIds: [...this.eligibleCandidateIds],
      lastVoteResult: this.lastVoteResult,
      gameOverSummary: this.gameOverSummary,
    };
  }

  public getPrivatePlayerData(playerId: string): PrivatePlayerData | null {
    const player = this.players.get(playerId);
    if (!player || !player.secretWord || !this.wordPair) {
      return null;
    }
    return {
      playerId: player.id,
      secretWord: player.secretWord,
      category: this.wordPair.category,
    };
  }
}
