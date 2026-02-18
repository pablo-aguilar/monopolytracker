import { createSlice, PayloadAction } from '@reduxjs/toolkit';

type RacePotState = {
  active: boolean;
  amount: number;
  participants: string[]; // player ids
  winnerId: string | null;
};

type SessionState = {
  currentGameId: string | null;
  racePot: RacePotState;
  turnIndex: number; // index into players array
  freeParkingPot: number;
};

const defaultRacePot = (): RacePotState => ({ active: false, amount: 0, participants: [], winnerId: null });

const initialState: SessionState = {
  currentGameId: null,
  racePot: defaultRacePot(),
  turnIndex: 0,
  freeParkingPot: 1000,
};

const sessionSlice = createSlice({
  name: 'session',
  initialState,
  reducers: {
    setCurrentGameId(state, action: PayloadAction<string | null>) {
      state.currentGameId = action.payload;
    },
    initializeRacePot(state, action: PayloadAction<{ participants: string[]; amountPerPlayer: number }>) {
      // Backfill for persisted sessions that predate racePot
      if (!state.racePot) state.racePot = defaultRacePot();
      const { participants, amountPerPlayer } = action.payload;
      if (participants.length < 2 || state.racePot.active) return;
      state.racePot.active = true;
      state.racePot.participants = participants;
      state.racePot.amount = participants.length * amountPerPlayer;
      state.racePot.winnerId = null;
    },
    resetRacePot(state) {
      state.racePot = defaultRacePot();
    },
    setRacePotWinner(state, action: PayloadAction<string>) {
      if (!state.racePot) state.racePot = defaultRacePot();
      if (!state.racePot.active || state.racePot.winnerId) return;
      state.racePot.winnerId = action.payload;
    },
    setTurnIndex(state, action: PayloadAction<number>) {
      state.turnIndex = Math.max(0, action.payload);
    },
    advanceTurn(state, action: PayloadAction<{ playerCount: number }>) {
      const n = action.payload.playerCount;
      if (n <= 0) {
        state.turnIndex = 0;
      } else {
        state.turnIndex = (state.turnIndex + 1) % n;
      }
    },
    addToFreeParking(state, action: PayloadAction<number>) {
      state.freeParkingPot += action.payload;
      if (state.freeParkingPot < 0) state.freeParkingPot = 0;
    },
    resetFreeParking(state) {
      state.freeParkingPot = 0;
    },
  },
});

export const { setCurrentGameId, initializeRacePot, resetRacePot, setRacePotWinner, setTurnIndex, advanceTurn, addToFreeParking, resetFreeParking } = sessionSlice.actions;
export default sessionSlice.reducer; 