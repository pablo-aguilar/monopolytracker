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
  busTickets?: number; // count of held bus tickets
  gojfChance?: number; // Get Out of Jail Free from Chance
  gojfCommunity?: number; // from Community
  hasPassedGo?: boolean; // locks buying until true
  inJail?: boolean;
  jailAttempts?: number; // 0..3
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
      state.players.push({ positionIndex: 0, racePotOptIn: false, busTickets: 0, gojfChance: 0, gojfCommunity: 0, hasPassedGo: false, inJail: false, jailAttempts: 0, ...action.payload });
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
    setHasPassedGo(state, action: PayloadAction<{ id: string; value: boolean }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.hasPassedGo = action.payload.value;
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
    grantBusTicket(state, action: PayloadAction<{ id: string; count?: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      const n = action.payload.count ?? 1;
      if (p) p.busTickets = Math.max(0, (p.busTickets ?? 0) + n);
    },
    clearBusTicketsExcept(state, action: PayloadAction<{ winnerId: string }>) {
      state.players.forEach((pl) => {
        if (pl.id !== action.payload.winnerId) pl.busTickets = 0;
      });
    },
    consumeBusTicket(state, action: PayloadAction<{ id: string; count?: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      const n = action.payload.count ?? 1;
      if (p) p.busTickets = Math.max(0, (p.busTickets ?? 0) - n);
    },
    grantGetOutOfJail(state, action: PayloadAction<{ id: string; deck: 'chance' | 'community'; count?: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (!p) return;
      const n = action.payload.count ?? 1;
      if (action.payload.deck === 'chance') p.gojfChance = Math.max(0, (p.gojfChance ?? 0) + n);
      else p.gojfCommunity = Math.max(0, (p.gojfCommunity ?? 0) + n);
    },
    consumeGetOutOfJail(state, action: PayloadAction<{ id: string; deck: 'chance' | 'community'; count?: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (!p) return;
      const n = action.payload.count ?? 1;
      if (action.payload.deck === 'chance') p.gojfChance = Math.max(0, (p.gojfChance ?? 0) - n);
      else p.gojfCommunity = Math.max(0, (p.gojfCommunity ?? 0) - n);
    },
    transferPlayerSpecialAssets(state, action: PayloadAction<{ fromId: string; toId: string }>) {
      const { fromId, toId } = action.payload;
      if (!fromId || !toId || fromId === toId) return;
      const from = state.players.find((x) => x.id === fromId);
      const to = state.players.find((x) => x.id === toId);
      if (!from || !to) return;
      const bus = Math.max(0, from.busTickets ?? 0);
      const gojfChance = Math.max(0, from.gojfChance ?? 0);
      const gojfCommunity = Math.max(0, from.gojfCommunity ?? 0);
      if (bus > 0) {
        to.busTickets = Math.max(0, (to.busTickets ?? 0) + bus);
        from.busTickets = 0;
      }
      if (gojfChance > 0) {
        to.gojfChance = Math.max(0, (to.gojfChance ?? 0) + gojfChance);
        from.gojfChance = 0;
      }
      if (gojfCommunity > 0) {
        to.gojfCommunity = Math.max(0, (to.gojfCommunity ?? 0) + gojfCommunity);
        from.gojfCommunity = 0;
      }
    },
    setInJail(state, action: PayloadAction<{ id: string; value: boolean }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.inJail = action.payload.value;
    },
    setJailAttempts(state, action: PayloadAction<{ id: string; attempts: number }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.jailAttempts = Math.max(0, action.payload.attempts);
    },
    incrementJailAttempts(state, action: PayloadAction<{ id: string }>) {
      const p = state.players.find((x) => x.id === action.payload.id);
      if (p) p.jailAttempts = Math.min(3, (p.jailAttempts ?? 0) + 1);
    },
  },
});

export const { addPlayer, removePlayer, resetPlayers, setPlayerMoney, adjustPlayerMoney, setPlayerPosition, assignProperty, unassignProperty, reorderPlayers, setRacePotOptIn, grantBusTicket, clearBusTicketsExcept, consumeBusTicket, grantGetOutOfJail, consumeGetOutOfJail, transferPlayerSpecialAssets, setInJail, setJailAttempts, incrementJailAttempts } = playersSlice.actions;
export default playersSlice.reducer; 