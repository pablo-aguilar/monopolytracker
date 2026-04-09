import type { LobbyParticipant } from '@/services/contracts/types';

type DbGamePlayerRow = {
  id: string;
  game_id: string;
  participant_type: 'account' | 'guest';
  profile_id: string | null;
  guest_name: string | null;
  guest_avatar_key: string | null;
  is_ready: boolean;
  seat_order: number;
};

export function mapDbGamePlayerToDomain(row: DbGamePlayerRow): LobbyParticipant {
  return {
    participantId: row.id,
    gameId: row.game_id,
    participantType: row.participant_type,
    profileId: row.profile_id,
    guestName: row.guest_name,
    guestAvatarKey: row.guest_avatar_key,
    isReady: row.is_ready,
    seatOrder: row.seat_order,
  };
}
