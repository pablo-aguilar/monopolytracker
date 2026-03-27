import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GameEvent } from '@/types/monopoly-schema';

type EventsState = {
  events: GameEvent[];
};

const initialState: EventsState = {
  events: [],
};

const eventsSlice = createSlice({
  name: 'events',
  initialState,
  reducers: {
    appendEvent(state, action: PayloadAction<GameEvent>) {
      state.events.push(action.payload);
    },
    resetEvents(state) {
      state.events = [];
    },
    hydrateFromTimeline(_state, action: PayloadAction<{ events: GameEvent[] }>) {
      return action.payload;
    },
  },
});

export const { appendEvent, resetEvents, hydrateFromTimeline } = eventsSlice.actions;
export default eventsSlice.reducer; 