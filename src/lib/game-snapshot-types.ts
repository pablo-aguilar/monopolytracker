import type { RootState } from '@/app/store';

/** Subset of Redux persisted in `game_live_snapshots.payload` (matches redux-persist whitelist). */
export type PersistedGameState = Pick<
  RootState,
  'session' | 'players' | 'events' | 'cards' | 'properties' | 'tradePasses' | 'timeline'
>;

export function isPersistedGameState(x: unknown): x is PersistedGameState {
  if (!x || typeof x !== 'object') return false;
  const o = x as Record<string, unknown>;
  return (
    typeof o.session === 'object' &&
    o.session != null &&
    typeof o.players === 'object' &&
    o.players != null &&
    typeof o.events === 'object' &&
    o.events != null &&
    typeof o.cards === 'object' &&
    o.cards != null &&
    typeof o.properties === 'object' &&
    o.properties != null &&
    typeof o.tradePasses === 'object' &&
    o.tradePasses != null &&
    typeof o.timeline === 'object' &&
    o.timeline != null
  );
}
