import { createSlice, PayloadAction } from '@reduxjs/toolkit';

export type TradePassScopeType = 'railroad' | 'utility' | 'color';

export interface TradePassEntry {
  holderPlayerId: string;
  issuerPlayerId: string;
  scopeType: TradePassScopeType;
  scopeKey: string;
  remaining: number; // 0..2
}

export type TradePassesState = {
  entries: TradePassEntry[];
};

const initialState: TradePassesState = {
  entries: [],
};

function samePass(a: TradePassEntry, b: Omit<TradePassEntry, 'remaining'>): boolean {
  return (
    a.holderPlayerId === b.holderPlayerId &&
    a.issuerPlayerId === b.issuerPlayerId &&
    a.scopeType === b.scopeType &&
    a.scopeKey === b.scopeKey
  );
}

const tradePassesSlice = createSlice({
  name: 'tradePasses',
  initialState,
  reducers: {
    grantTradePass(
      state,
      action: PayloadAction<{ holderPlayerId: string; issuerPlayerId: string; scopeType: TradePassScopeType; scopeKey: string; amount?: number }>
    ) {
      const amount = Math.max(0, Math.min(2, action.payload.amount ?? 2));
      if (amount <= 0) return;
      const identity = {
        holderPlayerId: action.payload.holderPlayerId,
        issuerPlayerId: action.payload.issuerPlayerId,
        scopeType: action.payload.scopeType,
        scopeKey: action.payload.scopeKey,
      };
      const existing = state.entries.find((e) => samePass(e, identity));
      if (existing) {
        // Non-stacking rule: refresh/replace up to max rather than add.
        existing.remaining = Math.max(existing.remaining, amount);
      } else {
        state.entries.push({ ...identity, remaining: amount });
      }
    },
    consumeTradePass(
      state,
      action: PayloadAction<{ holderPlayerId: string; issuerPlayerId: string; scopeType: TradePassScopeType; scopeKey: string }>
    ) {
      const idx = state.entries.findIndex((e) => samePass(e, action.payload));
      if (idx < 0) return;
      state.entries[idx].remaining = Math.max(0, state.entries[idx].remaining - 1);
      if (state.entries[idx].remaining <= 0) state.entries.splice(idx, 1);
    },
    setTradePasses(state, action: PayloadAction<TradePassEntry[]>) {
      state.entries = action.payload.filter((e) => e.remaining > 0);
    },
    resetTradePasses(state) {
      state.entries = [];
    },
    hydrateFromTimeline(_state, action: PayloadAction<TradePassesState>) {
      return action.payload;
    },
  },
});

export const { grantTradePass, consumeTradePass, setTradePasses, resetTradePasses, hydrateFromTimeline } = tradePassesSlice.actions;
export default tradePassesSlice.reducer;
