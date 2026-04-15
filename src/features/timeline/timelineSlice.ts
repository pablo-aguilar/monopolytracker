import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { GameEvent } from '@/types/monopoly-schema';
import type { TimelineSnapshot } from '@/features/timeline/types';

export const TIMELINE_SNAPSHOT_CAP = 250;

type TimelineState = {
  snapshots: TimelineSnapshot[];
};

const initialState: TimelineState = {
  snapshots: [],
};

const timelineSlice = createSlice({
  name: 'timeline',
  initialState,
  reducers: {
    pushSnapshot(state, action: PayloadAction<TimelineSnapshot>) {
      state.snapshots.push(action.payload);
      while (state.snapshots.length > TIMELINE_SNAPSHOT_CAP) {
        state.snapshots.shift();
      }
    },
    clearSnapshots(state) {
      state.snapshots = [];
    },
    replaceSnapshots(state, action: PayloadAction<TimelineSnapshot[]>) {
      state.snapshots = action.payload.slice(-TIMELINE_SNAPSHOT_CAP);
    },
    /** After a restore, drop snapshots that are not prefixes of the new event log. */
    pruneSnapshotsToEventPrefix(state, action: PayloadAction<GameEvent[]>) {
      const target = action.payload;
      state.snapshots = state.snapshots.filter((s) => {
        if (s.events.length > target.length) return false;
        return s.events.every((ev, i) => target[i]?.id === ev.id);
      });
    },
  },
});

export const { pushSnapshot, clearSnapshots, pruneSnapshotsToEventPrefix, replaceSnapshots } = timelineSlice.actions;
export default timelineSlice.reducer;
