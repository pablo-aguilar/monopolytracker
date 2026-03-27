import { createAsyncThunk } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { persistor } from '@/app/store';
import { appendEvent } from '@/features/events/eventsSlice';
import { hydrateFromTimeline as hydratePlayersFromTimeline } from '@/features/players/playersSlice';
import { hydrateFromTimeline as hydratePropertiesFromTimeline } from '@/features/properties/propertiesSlice';
import { hydrateFromTimeline as hydrateSessionFromTimeline } from '@/features/session/sessionSlice';
import { hydrateFromTimeline as hydrateCardsFromTimeline } from '@/features/cards/cardsSlice';
import { hydrateFromTimeline as hydrateTradePassesFromTimeline } from '@/features/tradePasses/tradePassesSlice';
import { hydrateFromTimeline as hydrateEventsFromTimeline } from '@/features/events/eventsSlice';
import { pruneSnapshotsToEventPrefix } from '@/features/timeline/timelineSlice';

export const restoreToEventId = createAsyncThunk<
  { removed: number },
  string,
  { state: RootState; rejectValue: 'missing_snapshot' }
>('timeline/restoreToEventId', async (eventId, { getState, dispatch, rejectWithValue }) => {
  const root = getState();
  const snap = root.timeline.snapshots.find((s) => s.afterEventId === eventId);
  if (!snap) return rejectWithValue('missing_snapshot');

  const removed = Math.max(0, root.events.events.length - snap.events.length);

  dispatch(hydratePlayersFromTimeline(snap.players));
  dispatch(hydratePropertiesFromTimeline(snap.properties));
  dispatch(hydrateSessionFromTimeline(snap.session));
  dispatch(hydrateCardsFromTimeline(snap.cards));
  dispatch(hydrateTradePassesFromTimeline(snap.tradePasses));
  dispatch(hydrateEventsFromTimeline({ events: snap.events }));

  dispatch(pruneSnapshotsToEventPrefix(snap.events));

  dispatch(
    appendEvent({
      id: crypto.randomUUID(),
      gameId: 'local',
      type: 'REVERT_TO',
      payload: {
        message: `Timeline restored (${removed} later log entries removed).`,
        restoredAfterEventId: eventId,
        removedEventCount: removed,
      },
      createdAt: new Date().toISOString(),
    })
  );

  await persistor.flush();
  return { removed };
});
