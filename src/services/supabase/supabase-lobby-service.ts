import type { LobbyService, CreateGameInput, JoinGameInput } from '@/services/contracts/lobby-service';
import type { GameSummary, LobbyParticipant } from '@/services/contracts/types';
import { getSupabaseClient } from '@/lib/supabase';
import { isPersistedGameState } from '@/lib/game-snapshot-types';
import { mapDbGameToDomain } from '@/services/mappers/game-mapper';
import { mapDbGamePlayerToDomain } from '@/services/mappers/lobby-participant-mapper';

type DbGameRow = {
  id: string;
  host_profile_id: string;
  status: 'lobby' | 'in_progress' | 'finished';
  invite_code: string;
  started_at: string | null;
  ended_at: string | null;
  winner_profile_id: string | null;
};

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

function generateInviteCode(length = 6): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  let value = '';
  for (let i = 0; i < length; i += 1) {
    value += chars[Math.floor(Math.random() * chars.length)];
  }
  return value;
}

async function nextSeatOrder(gameId: string): Promise<number> {
  const supabase = getSupabaseClient();
  const { data, error } = await supabase
    .from('game_players')
    .select('seat_order')
    .eq('game_id', gameId)
    .order('seat_order', { ascending: false })
    .limit(1);
  if (error) throw error;
  const highest = data?.[0]?.seat_order ?? 0;
  return highest + 1;
}

export const supabaseLobbyService: LobbyService = {
  async createGame(input: CreateGameInput): Promise<GameSummary> {
    const supabase = getSupabaseClient();
    const row = {
      host_profile_id: input.hostProfileId,
      invite_code: generateInviteCode(),
      status: 'lobby' as const,
    };
    const { data, error } = await supabase
      .from('games')
      .insert(row)
      .select('id, host_profile_id, status, invite_code, started_at, ended_at, winner_profile_id')
      .single<DbGameRow>();
    if (error) throw error;
    return mapDbGameToDomain(data);
  },

  async getGameByInviteCode(inviteCode: string): Promise<GameSummary | null> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('fetch_game_by_invite_code', {
      p_invite_code: inviteCode,
    });
    if (error) throw error;
    const rows = data as DbGameRow[] | null;
    if (!rows || rows.length === 0) return null;
    return mapDbGameToDomain(rows[0]);
  },

  async fetchLiveSnapshotByInvite(inviteCode: string) {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase.rpc('fetch_live_snapshot_by_invite', {
      p_invite_code: inviteCode,
    });
    if (error) throw error;
    if (data == null) return null;
    return isPersistedGameState(data) ? data : null;
  },

  async listParticipants(gameId: string): Promise<LobbyParticipant[]> {
    const supabase = getSupabaseClient();
    const { data, error } = await supabase
      .from('game_players')
      .select('id, game_id, participant_type, profile_id, guest_name, guest_avatar_key, is_ready, seat_order')
      .eq('game_id', gameId)
      .order('seat_order', { ascending: true });
    if (error) throw error;
    return (data as DbGamePlayerRow[]).map(mapDbGamePlayerToDomain);
  },

  async joinGame(input: JoinGameInput): Promise<LobbyParticipant> {
    const supabase = getSupabaseClient();
    const game = await this.getGameByInviteCode(input.inviteCode);
    if (!game) throw new Error('Game not found for invite code.');

    const seatOrder = await nextSeatOrder(game.id);
    const participantType = input.profileId ? 'account' : 'guest';
    if (participantType === 'guest' && (!input.guestName || !input.guestAvatarKey)) {
      throw new Error('Guest join requires name and avatar.');
    }

    const { data, error } = await supabase
      .from('game_players')
      .insert({
        game_id: game.id,
        participant_type: participantType,
        profile_id: participantType === 'account' ? input.profileId ?? null : null,
        guest_name: participantType === 'guest' ? input.guestName ?? null : null,
        guest_avatar_key: participantType === 'guest' ? input.guestAvatarKey ?? null : null,
        seat_order: seatOrder,
      })
      .select('id, game_id, participant_type, profile_id, guest_name, guest_avatar_key, is_ready, seat_order')
      .single<DbGamePlayerRow>();
    if (error) throw error;
    return mapDbGamePlayerToDomain(data);
  },

  async setReady(gameId: string, participantId: string, ready: boolean): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('game_players')
      .update({ is_ready: ready })
      .eq('game_id', gameId)
      .eq('id', participantId);
    if (error) throw error;
  },

  async startGame(gameId: string): Promise<void> {
    const supabase = getSupabaseClient();
    const { error } = await supabase
      .from('games')
      .update({ status: 'in_progress', started_at: new Date().toISOString() })
      .eq('id', gameId);
    if (error) throw error;
  },
};
