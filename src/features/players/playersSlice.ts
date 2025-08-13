import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type PlayerLite = {
  id: string;
  nickname: string;
  color: string;
  avatarKey: string;
  money: number;
  properties: string[]; // board tile ids
  racePotOptIn?: boolean; // MVP: player opts into race pot
  positionIndex: number; // board index position
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
    addPlayer(state, action: PayloadAction<Omit<PlayerLite, 'positionIndex'>>) {
      state.players.push({ positionIndex: 0, racePotOptIn: false, ...action.payload });
    },
    removePlayer(state, action: PayloadAction<string>) {
      state.players = state.players.filter((p) => p.id !== action.payload);
    },
    resetPlayers(state) {
      state.players = [];
    },
    setPlayerMoney(state, action: PayloadAction<{ id: string; money: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.money = action.payload.money;
    },
    adjustPlayerMoney(state, action: PayloadAction<{ id: string; delta: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.money += action.payload.delta;
    },
    setPlayerPosition(state, action: PayloadAction<{ id: string; index: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.positionIndex = action.payload.index;
    },
    assignProperty(state, action: PayloadAction<{ id: string; tileId: string }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p && !p.properties.includes(action.payload.tileId)) p.properties.push(action.payload.tileId);
    },
    unassignProperty(state, action: PayloadAction<{ id: string; tileId: string }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.properties = p.properties.filter((t) => t !== action.payload.tileId);
    },
    reorderPlayers(state, action: PayloadAction<string[]>) {
      const idOrder = action.payload;
      const idToPlayer = new Map(state.players.map((pl) => [pl.id, pl] as const));
      state.players = idOrder.map((id) => idToPlayer.get(id)!).filter(Boolean);
    },
    setRacePotOptIn(state, action: PayloadAction<{ id: string; optIn: boolean }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.racePotOptIn = action.payload.optIn;
    },
  },
});

export const { addPlayer, removePlayer, resetPlayers, setPlayerMoney, adjustPlayerMoney, setPlayerPosition, assignProperty, unassignProperty, reorderPlayers, setRacePotOptIn } = playersSlice.actions;
export default playersSlice.reducer; 