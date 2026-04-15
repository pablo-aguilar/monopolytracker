import type { RootState } from '@/app/store';
import { getSupabaseClient } from '@/lib/supabase';
import type { PersistedGameState } from '@/lib/game-snapshot-types';

export function collectPersistableGameState(state: RootState): PersistedGameState {
  return {
    session: state.session,
    players: state.players,
    events: state.events,
    cards: state.cards,
    properties: state.properties,
    tradePasses: state.tradePasses,
    timeline: state.timeline,
  };
}

/** Host-only: upserts live JSON for online games when `mt_active_game_id` is set. */
export async function publishHostGameSnapshot(state: RootState): Promise<void> {
  const gameId = typeof sessionStorage !== 'undefined' ? sessionStorage.getItem('mt_active_game_id') : null;
  if (!gameId) return;
  const payload = collectPersistableGameState(state);
  const supabase = getSupabaseClient();
  const { error } = await supabase.from('game_live_snapshots').upsert(
    {
      game_id: gameId,
      payload,
      updated_at: new Date().toISOString(),
    },
    { onConflict: 'game_id' },
  );
  if (error) {
    console.error('[host-game-snapshot] upsert failed', error);
  }
}
