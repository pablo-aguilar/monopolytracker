import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { BOARD_TILES } from '@/data/board';

export const selectPlayers = (state: RootState) => state.players.players;

export const selectOwnedPropertyIds = createSelector(selectPlayers, (players) => {
  const set = new Set<string>();
  for (const p of players) for (const id of p.properties) set.add(id);
  return set;
});

export const selectUnownedProperties = createSelector(selectOwnedPropertyIds, () => {
  return BOARD_TILES.filter((t) => t.type === 'property' || t.type === 'railroad' || t.type === 'utility').filter((t) => true);
});

export const selectBankBuildingCounts = () => ({ houses: 32, hotels: 12 }); // placeholder until buildings implemented

export const selectSpectatorSummary = createSelector(selectPlayers, (players) => {
  return players.map((p) => ({ id: p.id, nickname: p.nickname, money: p.money, properties: p.properties }));
});
