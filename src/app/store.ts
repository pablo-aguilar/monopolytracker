import { configureStore, combineReducers, createListenerMiddleware } from '@reduxjs/toolkit';
import sessionReducer from '@/features/session/sessionSlice';
import playersReducer from '@/features/players/playersSlice';
import eventsReducer, { appendEvent } from '@/features/events/eventsSlice';
import cardsReducer from '@/features/cards/cardsSlice';
import propertiesReducer from '@/features/properties/propertiesSlice';
import tradePassesReducer from '@/features/tradePasses/tradePassesSlice';
import timelineReducer, { pushSnapshot } from '@/features/timeline/timelineSlice';
import type { TimelineSnapshot } from '@/features/timeline/types';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import localForage from 'localforage';
import { enrichAppendEventMiddleware } from '@/app/enrichAppendEventMiddleware';

const timelineListenerMiddleware = createListenerMiddleware();

const persistConfig = {
  key: 'monopolytracker',
  storage: localForage,
  version: 1,
  whitelist: ['players', 'events', 'cards', 'properties', 'session', 'tradePasses', 'timeline'],
};

const rootReducer = combineReducers({
  session: sessionReducer,
  players: playersReducer,
  events: eventsReducer,
  cards: cardsReducer,
  properties: propertiesReducer,
  tradePasses: tradePassesReducer,
  timeline: timelineReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    })
      .prepend(timelineListenerMiddleware.middleware)
      .prepend(enrichAppendEventMiddleware),
});

export const persistor = persistStore(store);

timelineListenerMiddleware.startListening({
  actionCreator: appendEvent,
  effect: (action, listenerApi) => {
    if (action.payload.type === 'REVERT_TO') return;
    const root = listenerApi.getState() as ReturnType<typeof store.getState>;
    const events = root.events.events;
    const last = events[events.length - 1];
    if (!last || last.id !== action.payload.id) return;

    const snap: TimelineSnapshot = {
      afterEventId: last.id,
      players: structuredClone(root.players),
      properties: structuredClone(root.properties),
      session: structuredClone(root.session),
      cards: structuredClone(root.cards),
      tradePasses: structuredClone(root.tradePasses),
      events: structuredClone(events),
    };
    listenerApi.dispatch(pushSnapshot(snap));
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 