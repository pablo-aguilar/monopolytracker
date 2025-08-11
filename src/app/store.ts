import { configureStore, combineReducers } from '@reduxjs/toolkit';
import sessionReducer from '@/features/session/sessionSlice';
import playersReducer from '@/features/players/playersSlice';
import eventsReducer from '@/features/events/eventsSlice';
import cardsReducer from '@/features/cards/cardsSlice';
import propertiesReducer from '@/features/properties/propertiesSlice';
import { persistStore, persistReducer, FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER } from 'redux-persist';
import localForage from 'localforage';

const persistConfig = {
  key: 'monopolytracker',
  storage: localForage,
  version: 1,
  whitelist: ['players', 'events', 'cards', 'properties', 'session'],
};

const rootReducer = combineReducers({
  session: sessionReducer,
  players: playersReducer,
  events: eventsReducer,
  cards: cardsReducer,
  properties: propertiesReducer,
});

const persistedReducer = persistReducer(persistConfig, rootReducer);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
});

export const persistor = persistStore(store);

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 