import type { StatsService } from '@/services/contracts/stats-service';
import type { PlayerLifetimeStats } from '@/services/contracts/types';
import { getSupabaseClient } from '@/lib/supabase';

type AggregateRow = {
  profile_id: string | null;
  games_played: number | null;
  wins: number | null;
  average_placement: number | null;
};

export const supabaseStatsService: StatsService = {
  async getLifetimeStats(profileId: string): Promise<PlayerLifetimeStats | null> {
    const supabase = getSupabaseClient();

    // Prefer a DB-provided aggregate view if present.
    const { data: aggregate, error: aggregateError } = await supabase
      .from('player_aggregates')
      .select('profile_id, games_played, wins, average_placement')
      .eq('profile_id', profileId)
      .maybeSingle<AggregateRow>();

    if (!aggregateError && aggregate) {
      return {
        profileId: aggregate.profile_id ?? profileId,
        gamesPlayed: Number(aggregate.games_played ?? 0),
        wins: Number(aggregate.wins ?? 0),
        averagePlacement: aggregate.average_placement,
      };
    }

    // Fallback: compute minimal stats from game_players + games.
    const { data: rows, error } = await supabase
      .from('game_players')
      .select('final_place, game_id')
      .eq('profile_id', profileId)
      .not('final_place', 'is', null);
    if (error) throw error;

    const placements = (rows ?? []).map((r) => Number(r.final_place)).filter((n) => Number.isFinite(n));
    if (placements.length === 0) {
      return {
        profileId,
        gamesPlayed: 0,
        wins: 0,
        averagePlacement: null,
      };
    }

    const gamesPlayed = placements.length;
    const wins = placements.filter((place) => place === 1).length;
    const averagePlacement = placements.reduce((sum, place) => sum + place, 0) / gamesPlayed;
    return {
      profileId,
      gamesPlayed,
      wins,
      averagePlacement,
    };
  },
};
