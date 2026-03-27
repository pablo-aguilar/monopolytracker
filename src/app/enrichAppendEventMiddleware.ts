// Enriches appendEvent with turn context (Option A): analytics + future timeline-by-turn UI.
// turnSeq lives on session and increments in advanceTurn; turnPlayerId is players[turnIndex] at log time.
// Avoid importing RootState from store.ts (circular dependency).

import type { Middleware } from '@reduxjs/toolkit';
import { appendEvent } from '@/features/events/eventsSlice';

type EnrichRootSlice = {
  session: { turnIndex: number; turnSeq?: number };
  players: { players: { id: string }[] };
};

export const enrichAppendEventMiddleware: Middleware = (store) => (next) => (action) => {
  if (!appendEvent.match(action)) return next(action);

  const ev = action.payload;
  const state = store.getState() as EnrichRootSlice;
  const turnSeq = ev.turnSeq ?? state.session.turnSeq ?? 0;
  const turnPlayerId = ev.turnPlayerId ?? state.players.players[state.session.turnIndex]?.id;

  if (ev.turnSeq === turnSeq && ev.turnPlayerId === turnPlayerId) {
    return next(action);
  }

  return next(
    appendEvent({
      ...ev,
      turnSeq,
      ...(turnPlayerId !== undefined ? { turnPlayerId } : {}),
    })
  );
};
