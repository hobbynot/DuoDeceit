import { Server, Socket } from 'socket.io';
import {
  SOCKET_EVENTS,
  ClientToServerEvents,
  ServerToClientEvents,
} from '@duodeceit/shared';
import { GameEngine, ServerPlayer } from '../game/GameEngine.js';
import { WordManager } from '../words/wordManager.js';

export class Room {
  public engine: GameEngine;
  public wordManager: WordManager;
  public io: Server<ClientToServerEvents, ServerToClientEvents>;

  // Socket mapping: playerId -> socketId, socketId -> playerId
  private playerSockets: Map<string, string> = new Map();
  private socketToPlayer: Map<string, string> = new Map();

  // Active timers
  private activeTimer: NodeJS.Timeout | null = null;
  private emptyRoomTimeout: NodeJS.Timeout | null = null;

  constructor(
    roomId: string,
    io: Server<ClientToServerEvents, ServerToClientEvents>,
    _wordManager: WordManager,
    maxPlayers?: number
  ) {
    this.engine = new GameEngine(roomId, maxPlayers);
    this.io = io;
    this.wordManager = new WordManager();
    this.engine.availableCategories = this.wordManager.getAvailableCategories();
    this.engine.settings.totalAvailablePairs = this.wordManager.getMatchingPairsCount();
  }

  public updateSettings(
    newSettings: any,
    customPairs?: any[]
  ): void {
    this.engine.updateSettings(newSettings, customPairs, this.wordManager);
    this.broadcastState();
  }

  public get roomId(): string {
    return this.engine.roomId;
  }

  public addPlayer(
    id: string,
    username: string,
    sessionToken: string,
    socket: Socket,
    isHost: boolean = false
  ): ServerPlayer {
    const player = this.engine.addPlayer(id, username, sessionToken, isHost);
    this.associateSocket(player.id, socket);

    // Cancel empty room cleanup if someone joined
    if (this.emptyRoomTimeout) {
      clearTimeout(this.emptyRoomTimeout);
      this.emptyRoomTimeout = null;
    }

    return player;
  }

  public associateSocket(playerId: string, socket: Socket): void {
    const prevSocketId = this.playerSockets.get(playerId);
    if (prevSocketId) {
      this.socketToPlayer.delete(prevSocketId);
    }
    this.playerSockets.set(playerId, socket.id);
    this.socketToPlayer.set(socket.id, playerId);

    socket.join(this.roomId);
    this.engine.setPlayerConnected(playerId, true);
  }

  public handleSocketDisconnect(socketId: string): {
    playerId?: string;
    isHostDemoted?: boolean;
    allDisconnected?: boolean;
  } {
    const playerId = this.socketToPlayer.get(socketId);
    if (!playerId) return {};

    this.socketToPlayer.delete(socketId);
    this.playerSockets.delete(playerId);

    const player = this.engine.players.get(playerId);
    if (!player) return {};

    player.connected = false;

    // Check if host disconnected
    if (player.isHost) {
      const newHostId = this.engine.migrateHost();
      if (newHostId) {
        const newHost = this.engine.players.get(newHostId);
        if (newHost) {
          this.io.to(this.roomId).emit(SOCKET_EVENTS.SERVER_HOST_CHANGED, {
            newHostId: newHost.id,
            newHostName: newHost.username,
          });
        }
      }
    }

    // Check if any connected players remain
    const hasConnected = Array.from(this.engine.players.values()).some((p) => p.connected);

    return {
      playerId,
      allDisconnected: !hasConnected,
    };
  }

  public broadcastState(): void {
    const sanitized = this.engine.getSanitizedState();

    // Broadcast sanitized state to all players in the room
    this.io.to(this.roomId).emit(SOCKET_EVENTS.SERVER_ROOM_STATE, sanitized);

    // Send private data to each connected player
    for (const [playerId, socketId] of this.playerSockets.entries()) {
      const privateData = this.engine.getPrivatePlayerData(playerId);
      this.io.to(socketId).emit(SOCKET_EVENTS.SERVER_PRIVATE_DATA, privateData);
    }
  }

  public startGame(): { success: boolean; error?: string } {
    const result = this.engine.startGame(this.wordManager);
    if (result.success) {
      this.clearPhaseTimer();
      // Auto timer for word reveal
      this.setPhaseTimer(
        this.engine.phaseEndsAt! - Date.now(),
        () => {
          if (this.engine.phase === 'WORD_REVEAL') {
            this.engine.startClueRound(1);
            this.broadcastState();
          }
        }
      );
      this.broadcastState();
    }
    return result;
  }

  public confirmWord(playerId: string): { success: boolean; error?: string } {
    const result = this.engine.confirmWord(playerId);
    if (result.success) {
      // If phase moved to CLUE_ROUND_1, clear word reveal timer
      if (this.engine.phase === 'CLUE_ROUND_1') {
        this.clearPhaseTimer();
      }
      this.broadcastState();
    }
    return result;
  }

  public completeTurn(playerId: string, clueText?: string): { success: boolean; error?: string } {
    const result = this.engine.completeTurn(playerId, clueText);
    if (result.success) {
      if (this.engine.phase === 'DISCUSSION') {
        this.clearPhaseTimer();
        // Start discussion timer countdown
        this.setPhaseTimer(
          this.engine.discussionDurationSeconds * 1000,
          () => {
            if (this.engine.phase === 'DISCUSSION') {
              this.engine.startVoting();
              this.broadcastState();
              this.setupVotingTimer();
            }
          }
        );
      }
      this.broadcastState();
    }
    return result;
  }

  public skipDiscussion(): { success: boolean; error?: string } {
    if (this.engine.phase !== 'DISCUSSION') {
      return { success: false, error: 'Discussion is not currently active.' };
    }
    this.clearPhaseTimer();
    this.engine.startVoting();
    this.setupVotingTimer();
    this.broadcastState();
    return { success: true };
  }

  private setupVotingTimer(): void {
    this.clearPhaseTimer();
    const remainingMs = Math.max(1000, (this.engine.phaseEndsAt || Date.now()) - Date.now());
    this.setPhaseTimer(remainingMs, () => {
      if (this.engine.phase === 'VOTING') {
        this.finishVoting();
      }
    });
  }

  public submitVote(voterId: string, targetId: string): {
    success: boolean;
    error?: string;
  } {
    const res = this.engine.submitVote(voterId, targetId);
    if (!res.success) {
      return { success: false, error: res.error };
    }

    if (res.allVoted) {
      this.clearPhaseTimer();
      this.finishVoting();
    } else {
      this.broadcastState();
    }

    return { success: true };
  }

  private finishVoting(): void {
    const result = this.engine.calculateVotesAndProgress();
    this.io.to(this.roomId).emit(SOCKET_EVENTS.SERVER_VOTE_RESULT, result);

    if (this.engine.phase === 'VOTING') {
      // Tie revote triggered: restart voting timer
      this.setupVotingTimer();
    }

    this.broadcastState();
  }

  public proceedToNextRound(): { success: boolean; error?: string } {
    const res = this.engine.proceedToNextRound();
    if (res.success) {
      this.broadcastState();
    }
    return res;
  }

  public playAgain(): { success: boolean; error?: string } {
    const res = this.engine.startGame(this.wordManager);
    if (res.success) {
      this.clearPhaseTimer();
      this.broadcastState();
    }
    return res;
  }

  public returnToLobby(): { success: boolean; error?: string } {
    this.clearPhaseTimer();
    this.engine.returnToLobby();
    this.broadcastState();
    return { success: true };
  }

  private setPhaseTimer(delayMs: number, callback: () => void): void {
    this.clearPhaseTimer();
    this.activeTimer = setTimeout(() => {
      callback();
    }, delayMs);
  }

  private clearPhaseTimer(): void {
    if (this.activeTimer) {
      clearTimeout(this.activeTimer);
      this.activeTimer = null;
    }
  }

  public scheduleEmptyCleanup(callback: () => void): void {
    if (this.emptyRoomTimeout) clearTimeout(this.emptyRoomTimeout);
    // Keep room alive for 10 minutes so users can reconnect
    this.emptyRoomTimeout = setTimeout(callback, 10 * 60 * 1000);
  }

  public destroy(): void {
    this.clearPhaseTimer();
    if (this.emptyRoomTimeout) {
      clearTimeout(this.emptyRoomTimeout);
      this.emptyRoomTimeout = null;
    }
  }
}
