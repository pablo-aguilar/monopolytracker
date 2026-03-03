import { createSelector } from '@reduxjs/toolkit';
import type { RootState } from '@/app/store';
import { BOARD_TILES } from '@/data/board';

export const selectPropertiesState = (s: RootState) => s.properties;

export const selectOwnerIdForTile = (tileId: string) =>
  createSelector(selectPropertiesState, (props) => props.byTileId[tileId]?.ownerId ?? null);

export function getBoardTile(tileId: string) {
  const t = BOARD_TILES.find((x) => x.id === tileId);
  if (!t) throw new Error(`Unknown tile: ${tileId}`);
  return t;
}

export function countGroupOwned(state: RootState, tileId: string, ownerId: string): { owned: number; total: number } {
  const tile = getBoardTile(tileId);
  if (tile.type !== 'property' || !tile.group) return { owned: 0, total: 0 };
  const ids = BOARD_TILES.filter((t) => t.type === 'property' && t.group === tile.group).map((t) => t.id);
  let owned = 0;
  for (const id of ids) {
    const ps = state.properties.byTileId[id];
    if (ps && ps.ownerId === ownerId && !ps.mortgaged) owned += 1;
  }
  return { owned, total: ids.length };
}

export function countRailroadsOwned(state: RootState, ownerId: string): number {
  return BOARD_TILES.filter((t) => t.type === 'railroad').reduce((acc, t) => (state.properties.byTileId[t.id]?.ownerId === ownerId ? acc + 1 : acc), 0);
}

export function countUtilitiesOwned(state: RootState, ownerId: string): number {
  return BOARD_TILES.filter((t) => t.type === 'utility').reduce((acc, t) => (state.properties.byTileId[t.id]?.ownerId === ownerId ? acc + 1 : acc), 0);
}

export function computeRent(state: RootState, tileId: string, diceTotalForUtility = 0): number {
  const tile = getBoardTile(tileId);
  const ps = state.properties.byTileId[tileId];
  if (!ps || !ps.ownerId) return 0;
  if (ps.mortgaged) return 0;

  if (tile.type === 'property' && tile.property) {
    const imp = ps.improvements;
    if (imp === 0) {
      const base = tile.property.rent.base;
      const { owned, total } = countGroupOwned(state, tileId, ps.ownerId);
      if (owned >= total && total > 0) return base * 3; // complete set
      if (total > 1 && owned === total - 1) return base * 2; // all minus 1
      return base;
    }
    if (imp === 1) return tile.property.rent.house1;
    if (imp === 2) return tile.property.rent.house2;
    if (imp === 3) return tile.property.rent.house3;
    if (imp === 4) return tile.property.rent.house4;
    if (imp === 5) return tile.property.rent.hotel;
    if (imp >= 6) return tile.property.rent.skyscraper ?? tile.property.rent.hotel;
    return tile.property.rent.base;
  }

  if (tile.type === 'railroad' && tile.railroad) {
    const owned = countRailroadsOwned(state, ps.ownerId);
    let base = tile.railroad.rent1;
    if (owned === 2) base = tile.railroad.rent2;
    else if (owned === 3) base = tile.railroad.rent3;
    else if (owned >= 4) base = tile.railroad.rent4;
    const depot = state.properties.byTileId[tileId]?.depotInstalled === true;
    return depot ? base * 2 : base;
  }

  if (tile.type === 'utility' && tile.utility) {
    const owned = countUtilitiesOwned(state, ps.ownerId);
    if (owned >= 3 && (tile.utility as any).rentMultiplier3) {
      return diceTotalForUtility * (tile.utility as any).rentMultiplier3;
    }
    const mult = owned >= 2 ? tile.utility.rentMultiplier2 : tile.utility.rentMultiplier1;
    return diceTotalForUtility * mult;
  }

  return 0;
}
