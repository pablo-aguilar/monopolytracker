import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type SessionState = {
  currentGameId: string | null;
};

const initialState: SessionState = {
  currentGameId: null,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setCurrentGameId(state, action: PayloadAction<string | null>) {
      state.currentGameId = action.payload;
    },
  },
});

export const { setCurrentGameId } = sessionSlice.actions;
export default sessionSlice.reducer; 