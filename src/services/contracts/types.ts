export type ParticipantType = 'account' | 'guest';

export interface PlayerProfile {
  id: string;
  displayName: string;
  avatarKey: string;
}

export interface LobbyParticipant {
  gameId: string;
  participantId: string;
  participantType: ParticipantType;
  profileId: string | null;
  guestName: string | null;
  guestAvatarKey: string | null;
  isReady: boolean;
  seatOrder: number;
}

export interface GameSummary {
  id: string;
  hostProfileId: string;
  status: 'lobby' | 'in_progress' | 'finished';
  inviteCode: string;
  startedAt: string | null;
  endedAt: string | null;
  winnerProfileId: string | null;
}

export interface PlayerLifetimeStats {
  profileId: string;
  gamesPlayed: number;
  wins: number;
  averagePlacement: number | null;
}
