import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { BOARD_TILES } from '@/data/board';

export const selectPlayers = (state: RootState) => state.players.players;
export const selectProperties = (state: RootState) => state.properties;
export const selectEvents = (state: RootState) => state.events.events;

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

export const selectPlayerPropertyDetails = createSelector(selectPlayers, selectProperties, (players, props) => {
  return players.map((p) => {
    const details = p.properties
      .map((id) => {
        const tile = BOARD_TILES.find((t) => t.id === id);
        const ps = props.byTileId[id];
        if (!tile || !ps) return null;
        return { id, name: tile.name, type: tile.type, improvements: ps.improvements, mortgaged: ps.mortgaged };
      })
      .filter(Boolean) as { id: string; name: string; type: string; improvements: number; mortgaged: boolean }[];
    return { playerId: p.id, nickname: p.nickname, properties: details };
  });
});

export const selectColorGroupOwnership = createSelector(selectProperties, () => {
  const groups: Record<string, { total: number; owners: Record<string, number> }> = {};
  for (const tile of BOARD_TILES) {
    if (tile.type === 'property' && tile.group) {
      if (!groups[tile.group]) groups[tile.group] = { total: 0, owners: {} };
      groups[tile.group].total += 1;
      const ownerId = (window as any).__store__?.getState?.()?.properties?.byTileId?.[tile.id]?.ownerId as string | null;
      if (ownerId) {
        groups[tile.group].owners[ownerId] = (groups[tile.group].owners[ownerId] || 0) + 1;
      }
    }
  }
  return groups;
});

export const selectMostLandedProperty = createSelector(selectEvents, () => {
  const counts: Record<string, number> = {};
  for (const ev of (selectEvents as any).source?.events ?? []) {
    // placeholder
  }
  return null;
});

export const selectMostLandedTile = createSelector(selectEvents, (events) => {
  const counts: Record<string, number> = {};
  for (const ev of events) {
    if (ev.type === 'MOVE' && typeof ev.payload?.to === 'number') {
      const tile = BOARD_TILES[ev.payload.to];
      if (tile && tile.type === 'property') counts[tile.id] = (counts[tile.id] || 0) + 1;
    }
  }
  let topId: string | null = null;
  let topCount = 0;
  for (const [id, c] of Object.entries(counts)) {
    if (c > topCount) {
      topCount = c;
      topId = id;
    }
  }
  if (!topId) return null;
  const t = BOARD_TILES.find((x) => x.id === topId);
  return t ? { id: topId, name: t.name, count: topCount } : null;
});
