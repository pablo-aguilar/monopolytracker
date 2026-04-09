import type { GameHistoryService, GameDetail } from '@/services/contracts/game-history-service';
import type { GameSummary } from '@/services/contracts/types';
import { getSupabaseClient } from '@/lib/supabase';
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

export const supabaseGameHistoryService: GameHistoryService = {
  async listGamesForProfile(profileId: string): Promise<GameSummary[]> {
    const supabase = getSupabaseClient();

    const { data: participants, error: participantsError } = await supabase
      .from('game_players')
      .select('game_id')
      .eq('profile_id', profileId);
    if (participantsError) throw participantsError;
    const gameIds = Array.from(new Set((participants ?? []).map((r) => r.game_id)));
    if (gameIds.length === 0) return [];

    const { data: games, error: gamesError } = await supabase
      .from('games')
      .select('id, host_profile_id, status, invite_code, started_at, ended_at, winner_profile_id')
      .in('id', gameIds)
      .order('created_at', { ascending: false });
    if (gamesError) throw gamesError;
    return (games as DbGameRow[]).map(mapDbGameToDomain);
  },

  async getGameDetail(gameId: string): Promise<GameDetail | null> {
    const supabase = getSupabaseClient();
    const { data: game, error: gameError } = await supabase
      .from('games')
      .select('id, host_profile_id, status, invite_code, started_at, ended_at, winner_profile_id')
      .eq('id', gameId)
      .maybeSingle<DbGameRow>();
    if (gameError) throw gameError;
    if (!game) return null;

    const { data: participants, error: participantsError } = await supabase
      .from('game_players')
      .select('id, game_id, participant_type, profile_id, guest_name, guest_avatar_key, is_ready, seat_order')
      .eq('game_id', gameId)
      .order('seat_order', { ascending: true });
    if (participantsError) throw participantsError;

    return {
      ...mapDbGameToDomain(game),
      participants: (participants as DbGamePlayerRow[]).map(mapDbGamePlayerToDomain),
    };
  },
};
