import type { GameSummary, LobbyParticipant } from '@/services/contracts/types';

export interface GameDetail extends GameSummary {
  participants: LobbyParticipant[];
}

export interface GameHistoryService {
  listGamesForProfile(profileId: string): Promise<GameSummary[]>;
  listGamesForLeaderboard(limit?: number): Promise<GameSummary[]>;
  getGameDetail(gameId: string): Promise<GameDetail | null>;
}
