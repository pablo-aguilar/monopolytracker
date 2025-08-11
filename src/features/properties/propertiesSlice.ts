import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import { BOARD_TILES } from '@/data/board';

export type OwnerId = string | null;

export interface PropertyState {
  ownerId: OwnerId;
  mortgaged: boolean;
  improvements: number; // 0..4 houses, 5 = hotel
}

export interface PropertiesState {
  byTileId: Record<string, PropertyState | undefined>;
  housesRemaining: number; // start 32
  hotelsRemaining: number; // start 12
}

const initialState: PropertiesState = {
  byTileId: Object.fromEntries(
    BOARD_TILES.filter((t) => t.type === 'property' || t.type === 'railroad' || t.type === 'utility').map((t) => [t.id, { ownerId: null, mortgaged: false, improvements: 0 }])
  ),
  housesRemaining: 32,
  hotelsRemaining: 12,
};

function getGroupTileIds(tileId: string): string[] {
  const tile = BOARD_TILES.find((t) => t.id === tileId);
  if (!tile) return [];
  if (tile.type !== 'property' || !tile.group) return [tileId];
  return BOARD_TILES.filter((t) => t.type === 'property' && t.group === tile.group).map((t) => t.id);
}

function canEvenBuild(state: PropertiesState, tileId: string, ownerId: string): boolean {
  const group = getGroupTileIds(tileId);
  // If not a color group (railroad/utility), allow without even rule
  if (group.length <= 1) return true;
  // Must own full set and none mortgaged
  for (const id of group) {
    const ps = state.byTileId[id]!;
    if (ps.ownerId !== ownerId || ps.mortgaged) return false;
  }
  const levels = group.map((id) => state.byTileId[id]!.improvements);
  const minLevel = Math.min(...levels);
  const targetLevel = state.byTileId[tileId]!.improvements;
  // Can only build on properties at current min level
  return targetLevel === minLevel;
}

function canEvenSell(state: PropertiesState, tileId: string): boolean {
  const group = getGroupTileIds(tileId);
  if (group.length <= 1) return true;
  const levels = group.map((id) => state.byTileId[id]!.improvements);
  const maxLevel = Math.max(...levels);
  const targetLevel = state.byTileId[tileId]!.improvements;
  // Can only sell from properties at current max level
  return targetLevel === maxLevel && targetLevel > 0;
}

const propertiesSlice = createSlice({
  name: 'properties',
  initialState,
  reducers: {
    assignOwner(state, action: PayloadAction<{ tileId: string; ownerId: OwnerId }>) {
      const ps = state.byTileId[action.payload.tileId];
      if (!ps) return;
      ps.ownerId = action.payload.ownerId;
      ps.mortgaged = false;
      ps.improvements = 0;
    },
    setMortgaged(state, action: PayloadAction<{ tileId: string; mortgaged: boolean }>) {
      const ps = state.byTileId[action.payload.tileId];
      if (!ps) return;
      if (action.payload.mortgaged) {
        // cannot mortgage with improvements
        if (ps.improvements > 0) return;
        ps.mortgaged = true;
      } else {
        ps.mortgaged = false;
      }
    },
    buyHouse(state, action: PayloadAction<{ tileId: string; ownerId: string }>) {
      const { tileId, ownerId } = action.payload;
      const ps = state.byTileId[tileId];
      if (!ps) return;
      if (ps.ownerId !== ownerId || ps.mortgaged) return;
      // Only for property tiles
      const boardTile = BOARD_TILES.find((t) => t.id === tileId);
      if (!boardTile || boardTile.type !== 'property') return;

      // Enforce even-building
      if (!canEvenBuild(state, tileId, ownerId)) return;

      if (ps.improvements >= 5) return; // already hotel

      if (ps.improvements < 4) {
        // buy a house
        if (state.housesRemaining <= 0) return;
        ps.improvements += 1;
        state.housesRemaining -= 1;
      } else if (ps.improvements === 4) {
        // upgrade to hotel
        if (state.hotelsRemaining <= 0) return;
        ps.improvements = 5;
        state.hotelsRemaining -= 1;
        state.housesRemaining += 4; // return four houses to bank
      }
    },
    sellHouse(state, action: PayloadAction<{ tileId: string }>) {
      const { tileId } = action.payload;
      const ps = state.byTileId[tileId];
      if (!ps) return;
      // Only property tiles
      const boardTile = BOARD_TILES.find((t) => t.id === tileId);
      if (!boardTile || boardTile.type !== 'property') return;
      if (ps.improvements <= 0) return;

      // Enforce even-selling
      if (!canEvenSell(state, tileId)) return;

      if (ps.improvements === 5) {
        // downgrade hotel to 4 houses
        ps.improvements = 4;
        state.hotelsRemaining += 1;
        state.housesRemaining -= 4; // take 4 houses from bank
        if (state.housesRemaining < 0) state.housesRemaining = 0; // safety
      } else {
        // sell a house
        ps.improvements -= 1;
        state.housesRemaining += 1;
      }
    },
  },
});

export const { assignOwner, setMortgaged, buyHouse, sellHouse } = propertiesSlice.actions;
export default propertiesSlice.reducer;
