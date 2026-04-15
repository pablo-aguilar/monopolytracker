import type { GameSummary, LobbyParticipant } from '@/services/contracts/types';
import type { PersistedGameState } from '@/lib/game-snapshot-types';

export interface CreateGameInput {
  hostProfileId: string;
}

export interface JoinGameInput {
  inviteCode: string;
  profileId?: string;
  guestName?: string;
  guestAvatarKey?: string;
}

export interface LobbyService {
  createGame(input: CreateGameInput): Promise<GameSummary>;
  getGameByInviteCode(inviteCode: string): Promise<GameSummary | null>;
  listParticipants(gameId: string): Promise<LobbyParticipant[]>;
  joinGame(input: JoinGameInput): Promise<LobbyParticipant>;
  setReady(gameId: string, participantId: string, ready: boolean): Promise<void>;
  startGame(gameId: string): Promise<void>;
  /** Invite-code capability read (works for in_progress without being a roster row). */
  fetchLiveSnapshotByInvite(inviteCode: string): Promise<PersistedGameState | null>;
}
