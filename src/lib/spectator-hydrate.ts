import type { AppDispatch } from '@/app/store';
import { resetPlayers, hydrateFromTimeline as hydratePlayersFromTimeline } from '@/features/players/playersSlice';
import { resetEvents, hydrateFromTimeline as hydrateEventsFromTimeline } from '@/features/events/eventsSlice';
import { resetTradePasses, hydrateFromTimeline as hydrateTradePassesFromTimeline } from '@/features/tradePasses/tradePassesSlice';
import { clearSnapshots, replaceSnapshots } from '@/features/timeline/timelineSlice';
import { sessionInitialState, hydrateFromTimeline as hydrateSessionFromTimeline } from '@/features/session/sessionSlice';
import { cardsInitialState, hydrateFromTimeline as hydrateCardsFromTimeline } from '@/features/cards/cardsSlice';
import { propertiesInitialState, hydrateFromTimeline as hydratePropertiesFromTimeline } from '@/features/properties/propertiesSlice';
import type { PersistedGameState } from '@/lib/game-snapshot-types';

/** Clears local offline game state so a stale board is not shown before the first remote snapshot. */
export function prepareSpectatorView(dispatch: AppDispatch): void {
  dispatch(resetPlayers());
  dispatch(resetEvents());
  dispatch(resetTradePasses());
  dispatch(clearSnapshots());
  dispatch(hydrateSessionFromTimeline(sessionInitialState));
  dispatch(hydrateCardsFromTimeline(cardsInitialState));
  dispatch(hydratePropertiesFromTimeline(propertiesInitialState));
}

/** Applies a remote host snapshot into the Redux store (spectator route). */
export function applyPersistedGameState(dispatch: AppDispatch, payload: PersistedGameState): void {
  dispatch(hydratePlayersFromTimeline(payload.players));
  dispatch(hydratePropertiesFromTimeline(payload.properties));
  dispatch(hydrateSessionFromTimeline(payload.session));
  dispatch(hydrateCardsFromTimeline(payload.cards));
  dispatch(hydrateTradePassesFromTimeline(payload.tradePasses));
  dispatch(hydrateEventsFromTimeline(payload.events));
  dispatch(replaceSnapshots(payload.timeline.snapshots));
}
