import type { GameSummary, LobbyParticipant } from '@/services/contracts/types';

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
}
