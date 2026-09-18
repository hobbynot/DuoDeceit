export type GamePhase =
  | 'LOBBY'
  | 'WORD_REVEAL'
  | 'CLUE_ROUND_1'
  | 'CLUE_ROUND_2'
  | 'DISCUSSION'
  | 'VOTING'
  | 'VOTE_RESULT'
  | 'ELIMINATION'
  | 'GAME_OVER';

export type DifficultyLevel = 'easy' | 'medium' | 'hard';

export interface WordPair {
  id?: string;
  word1: string;
  word2: string;
  category: string;
  difficulty?: DifficultyLevel;
}

export interface GameSettings {
  selectedCategory: string; // 'ALL' or category name
  difficulty: 'ALL' | DifficultyLevel | 'all';
  discussionDurationSeconds: number;
  customWordPairsCount: number;
  totalAvailablePairs: number;
  category?: string;
  discussionDuration?: number;
  isCustomWordPack?: boolean;
  customPackName?: string;
}

export interface PublicPlayer {
  id: string;
  username: string;
  isHost: boolean;
  connected: boolean;
  eliminated: boolean;
  hasConfirmedWord: boolean;
  hasVoted: boolean;
  avatarColor: string;
}

export interface VoteTally {
  targetPlayerId: string;
  targetUsername: string;
  voteCount: number;
}

export interface VoteResult {
  tallies: VoteTally[];
  isTie: boolean;
  tiedPlayerIds?: string[];
  eliminatedPlayerId?: string;
  eliminatedPlayerName?: string;
  eliminatedPlayerWord?: string;
  wasMinorityWord?: boolean;
}

export interface ClueEntry {
  id: string;
  playerId: string;
  username: string;
  clueText: string;
  roundNumber: 1 | 2;
  timestamp: number;
}

export interface GameOverSummary {
  winner: 'MAJORITY' | 'MINORITY';
  majorityWord: string;
  minorityWord: string;
  minorityPlayerId: string;
  minorityPlayerName: string;
  eliminatedPlayers: Array<{ id: string; name: string; word: string }>;
  roundsPlayed: number;
}

export interface SanitizedRoomState {
  roomId: string;
  phase: GamePhase;
  roundNumber: number;
  players: PublicPlayer[];
  hostPlayerId: string;
  maxPlayers: number;
  currentSpeakerId: string | null;
  speakerOrder: string[];
  clueRoundNumber: 1 | 2 | null;
  clues: ClueEntry[];
  settings: GameSettings;
  availableCategories: string[];
  phaseStartedAt: number | null;
  phaseEndsAt: number | null;
  discussionDurationSeconds: number;
  eligibleVoterIds: string[];
  eligibleCandidateIds: string[];
  lastVoteResult: VoteResult | null;
  gameOverSummary: GameOverSummary | null;
}

export interface PrivatePlayerData {
  playerId: string;
  secretWord: string;
  category: string;
}

export interface CreateRoomResponse {
  success: boolean;
  roomId?: string;
  playerId?: string;
  sessionToken?: string;
  error?: string;
}

export interface JoinRoomResponse {
  success: boolean;
  roomId?: string;
  playerId?: string;
  sessionToken?: string;
  error?: string;
}

export interface ReconnectResponse {
  success: boolean;
  roomId?: string;
  playerId?: string;
  roomState?: SanitizedRoomState;
  privateData?: PrivatePlayerData | null;
  error?: string;
}
