import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { BOARD_TILES } from '@/data/board';

export const selectPlayers = (state: RootState) => state.players.players;
export const selectProperties = (state: RootState) => state.properties;

export const selectOwnedPropertyIds = createSelector(selectProperties, (props) => {
  const set = new Set<string>();
  for (const [tileId, ps] of Object.entries(props.byTileId)) {
    if (ps && ps.ownerId) set.add(tileId);
  }
  return set;
});

export const selectUnownedProperties = createSelector(selectOwnedPropertyIds, (owned) => {
  return BOARD_TILES.filter((t) => (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') && !owned.has(t.id));
});

export const selectBankBuildingCounts = createSelector(selectProperties, (props) => ({ houses: props.housesRemaining, hotels: props.hotelsRemaining }));

export const selectSpectatorSummary = createSelector(selectPlayers, (players) => {
  return players.map((p) => ({ id: p.id, nickname: p.nickname, money: p.money, properties: p.properties }));
});
