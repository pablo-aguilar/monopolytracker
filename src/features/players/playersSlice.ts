import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PlayerLite = {
  id: string;
  nickname: string;
  color: string;
  avatarKey: string;
};

type PlayersState = {
  players: PlayerLite[];
};

const initialState: PlayersState = {
  players: [],
};

const playersSlice = createSlice({
  name: 'players',
  initialState,
  reducers: {
    addPlayer(state, action: PayloadAction<PlayerLite>) {
      state.players.push(action.payload);
    },
    removePlayer(state, action: PayloadAction<string>) {
      state.players = state.players.filter((p) => p.id !== action.payload);
    },
    resetPlayers(state) {
      state.players = [];
    },
  },
});

export const { addPlayer, removePlayer, resetPlayers } = playersSlice.actions;
export default playersSlice.reducer; 