import type { GameSummary } from '@/services/contracts/types';

type DbGameRow = {
  id: string;
  host_profile_id: string;
  status: 'lobby' | 'in_progress' | 'finished';
  invite_code: string;
  started_at: string | null;
  ended_at: string | null;
  winner_profile_id: string | null;
};

export function mapDbGameToDomain(row: DbGameRow): GameSummary {
  return {
    id: row.id,
    hostProfileId: row.host_profile_id,
    status: row.status,
    inviteCode: row.invite_code,
    startedAt: row.started_at,
    endedAt: row.ended_at,
    winnerProfileId: row.winner_profile_id,
  };
}
