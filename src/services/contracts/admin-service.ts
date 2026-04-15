export interface AdminGameRecord {
  id: string;
  hostProfileId: string;
  status: 'lobby' | 'in_progress' | 'finished';
  inviteCode: string;
  startedAt: string | null;
  endedAt: string | null;
  winnerProfileId: string | null;
  createdAt: string;
  trashedAt: string | null;
  trashReason: string | null;
}

export interface AdminProfileRecord {
  id: string;
  displayName: string;
  avatarKey: string;
  createdAt: string;
  trashedAt: string | null;
  trashReason: string | null;
}

export interface AdminService {
  isCurrentUserAdmin(): Promise<boolean>;
  listGames(includeTrashed: boolean, limit?: number): Promise<AdminGameRecord[]>;
  listProfiles(includeTrashed: boolean, limit?: number): Promise<AdminProfileRecord[]>;
  trashGame(gameId: string, reason?: string): Promise<void>;
  restoreGame(gameId: string): Promise<void>;
  deleteGamePermanently(gameId: string): Promise<void>;
  trashProfile(profileId: string, reason?: string): Promise<void>;
  restoreProfile(profileId: string): Promise<void>;
  deleteProfilePermanently(profileId: string): Promise<void>;
}
