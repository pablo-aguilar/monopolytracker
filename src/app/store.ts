import { configureStore } from '@reduxjs/toolkit';
import sessionReducer from '@/features/session/sessionSlice';
import playersReducer from '@/features/players/playersSlice';
import eventsReducer from '@/features/events/eventsSlice';
import cardsReducer from '@/features/cards/cardsSlice';

export const store = configureStore({
  reducer: {
    session: sessionReducer,
    players: playersReducer,
    events: eventsReducer,
    cards: cardsReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch; 