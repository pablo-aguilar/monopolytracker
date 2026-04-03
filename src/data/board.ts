import type { CSSProperties } from 'react';

// #index
// - //#types: tile and economics types
// - //#constants: board constants and indices
// - //#data: tiles array with metadata and economics (Winning Moves USA Mega Edition layout approximation)
// - //#selectors: helper functions for lookups and movement

//#types
export type TileType =
  | 'go'
  | 'property'
  | 'railroad'
  | 'utility'
  | 'tax'
  | 'chance'
  | 'community'
  | 'freeParking'
  | 'jail'
  | 'goToJail'
  | 'auction'
  | 'busStop'
  | 'other';

export type ColorGroup =
  | 'brown'
  | 'lightBlue'
  | 'pink'
  | 'orange'
  | 'red'
  | 'yellow'
  | 'green'
  | 'darkBlue';

export interface PropertyRentSchedule {
  base: number;
  house1: number;
  house2: number;
  house3: number;
  house4: number;
  hotel: number;
  skyscraper?: number; // Mega Monopoly skyscraper level
}

export interface PropertyEconomics {
  purchasePrice: number;
  mortgageValue: number;
  houseCost: number;
  hotelCost?: number;
  skyscraperCost?: number; // Mega Monopoly extension
  rent: PropertyRentSchedule;
}

export interface RailroadEconomics {
  purchasePrice: number;
  mortgageValue: number;
  rent1: number;
  rent2: number;
  rent3: number;
  rent4: number;
  hasDepot?: boolean; // depot doubles rent
}

export interface UtilityEconomics {
  purchasePrice: number;
  mortgageValue: number;
  rentMultiplier1: number;
  rentMultiplier2: number;
  rentMultiplier3?: number; // Mega: three utilities
}

export interface BoardTileData {
  id: string;
  index: number;
  name: string;
  type: TileType;
  group?: ColorGroup;
  property?: PropertyEconomics;
  railroad?: RailroadEconomics;
  utility?: UtilityEconomics;
  taxAmount?: number;
}

//#constants
export const BOARD_SIZE = 52; // Mega Edition (12 extra spaces)
export const GO_INDEX = 0;
export const JAIL_INDEX = 13; // Mega board shifts; approximation
export const FREE_PARKING_INDEX = 26;
export const GO_TO_JAIL_INDEX = 39;

//#data
// Note: Economics are approximations based on classic values with modest scaling
// to provide functional rents. Can be tuned later to exact Winning Moves schedule.
export const BOARD_TILES: BoardTileData[] = [
  { id: 'go', index: 0, name: 'GO', type: 'go' },
  // Brown set
  { id: 'mediterranean-ave', index: 1, name: 'Mediterranean Ave', type: 'property', group: 'brown', property: { purchasePrice: 60, mortgageValue: 30, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 2, house1: 10, house2: 30, house3: 90, house4: 160, hotel: 250, skyscraper: 750 } } },
  { id: 'community-1', index: 2, name: 'Community Chest', type: 'community' },
  { id: 'baltic-ave', index: 3, name: 'Baltic Ave', type: 'property', group: 'brown', property: { purchasePrice: 60, mortgageValue: 30, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 4, house1: 20, house2: 60, house3: 180, house4: 320, hotel: 450, skyscraper: 950 } } },
  { id: 'arctic-ave', index: 4, name: 'Arctic Ave', type: 'property', group: 'brown', property: { purchasePrice: 80, mortgageValue: 40, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 5, house1: 30, house2: 80, house3: 240, house4: 360, hotel: 500, skyscraper: 950 } } },
  { id: 'income-tax', index: 5, name: 'Income Tax', type: 'tax', taxAmount: 200 },
  { id: 'reading-railroad', index: 6, name: 'Reading Railroad', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200, hasDepot: true } },
  // Light Blue set
  { id: 'massachusetts-ave', index: 7, name: 'Massachusetts Ave', type: 'property', group: 'lightBlue', property: { purchasePrice: 100, mortgageValue: 50, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550, skyscraper: 1050 } } },
  { id: 'oriental-ave', index: 8, name: 'Oriental Ave', type: 'property', group: 'lightBlue', property: { purchasePrice: 100, mortgageValue: 50, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550, skyscraper: 1050 } } },
  { id: 'chance-1', index: 9, name: 'Chance', type: 'chance' },
  { id: 'gas-company', index: 10, name: 'Gas Company', type: 'utility', utility: { purchasePrice: 150, mortgageValue: 75, rentMultiplier1: 4, rentMultiplier2: 10, rentMultiplier3: 20 } },
  { id: 'vermont-ave', index: 11, name: 'Vermont Ave', type: 'property', group: 'lightBlue', property: { purchasePrice: 100, mortgageValue: 50, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550, skyscraper: 1050 } } },
  { id: 'connecticut-ave', index: 12, name: 'Connecticut Ave', type: 'property', group: 'lightBlue', property: { purchasePrice: 120, mortgageValue: 60, houseCost: 50, hotelCost: 50, skyscraperCost: 100, rent: { base: 8, house1: 40, house2: 100, house3: 300, house4: 450, hotel: 600, skyscraper: 1100 } } },
  { id: 'jail', index: 13, name: 'Jail / Just Visiting', type: 'jail' },
  // Pink set
  { id: 'auction-1', index: 14, name: 'Auction', type: 'auction' },
  { id: 'maryland-ave', index: 15, name: 'Maryland Ave', type: 'property', group: 'pink', property: { purchasePrice: 140, mortgageValue: 70, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750, skyscraper: 1250 } } },
  { id: 'st-charles-place', index: 16, name: 'St. Charles Place', type: 'property', group: 'pink', property: { purchasePrice: 140, mortgageValue: 70, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750, skyscraper: 1250 } } },
  { id: 'electric-company', index: 17, name: 'Electric Company', type: 'utility', utility: { purchasePrice: 150, mortgageValue: 75, rentMultiplier1: 4, rentMultiplier2: 10, rentMultiplier3: 20 } },
  { id: 'states-ave', index: 18, name: 'States Ave', type: 'property', group: 'pink', property: { purchasePrice: 140, mortgageValue: 70, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750, skyscraper: 1250 } } },
  { id: 'virginia-ave', index: 19, name: 'Virginia Ave', type: 'property', group: 'pink', property: { purchasePrice: 160, mortgageValue: 80, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 12, house1: 60, house2: 180, house3: 500, house4: 700, hotel: 900, skyscraper: 1400 } } },
  { id: 'pennsylvania-railroad', index: 20, name: 'Pennsylvania Railroad', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200, hasDepot: true } },
  // Orange set
  { id: 'st-james-place', index: 21, name: 'St. James Place', type: 'property', group: 'orange', property: { purchasePrice: 180, mortgageValue: 90, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950, skyscraper: 1450 } } },
  { id: 'community-2', index: 22, name: 'Community Chest', type: 'community' },
  { id: 'tennessee-ave', index: 23, name: 'Tennessee Ave', type: 'property', group: 'orange', property: { purchasePrice: 180, mortgageValue: 90, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950, skyscraper: 1450 } } },
  { id: 'new-york-ave', index: 24, name: 'New York Ave', type: 'property', group: 'orange', property: { purchasePrice: 200, mortgageValue: 100, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 16, house1: 80, house2: 220, house3: 600, house4: 800, hotel: 1000, skyscraper: 1500 } } },
  { id: 'new-jersey-ave', index: 25, name: 'New Jersey Ave', type: 'property', group: 'orange', property: { purchasePrice: 200, mortgageValue: 100, houseCost: 100, hotelCost: 100, skyscraperCost: 200, rent: { base: 16, house1: 80, house2: 220, house3: 600, house4: 800, hotel: 1000, skyscraper: 1500 } } },
  // Red set and corners
  { id: 'free-parking', index: 26, name: 'Free Parking', type: 'freeParking' },
  { id: 'kentucky-ave', index: 27, name: 'Kentucky Ave', type: 'property', group: 'red', property: { purchasePrice: 220, mortgageValue: 110, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050, skyscraper: 2050 } } },
  { id: 'chance-2', index: 28, name: 'Chance', type: 'chance' },
  { id: 'indiana-ave', index: 29, name: 'Indiana Ave', type: 'property', group: 'red', property: { purchasePrice: 220, mortgageValue: 110, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050, skyscraper: 2050 } } },
  { id: 'illinois-ave', index: 30, name: 'Illinois Ave', type: 'property', group: 'red', property: { purchasePrice: 240, mortgageValue: 120, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 20, house1: 100, house2: 300, house3: 750, house4: 925, hotel: 1100, skyscraper: 2100 } } },
  { id: 'michigan-ave', index: 31, name: 'Michigan Ave', type: 'property', group: 'red', property: { purchasePrice: 240, mortgageValue: 120, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 20, house1: 100, house2: 300, house3: 750, house4: 925, hotel: 1100, skyscraper: 2100 } } },
  { id: 'bus-stop-2', index: 32, name: 'Bus Ticket', type: 'busStop' },
  { id: 'bno-railroad', index: 33, name: 'B. & O. Railroad', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200, hasDepot: true } },
  // Yellow set
  { id: 'atlantic-ave', index: 34, name: 'Atlantic Ave', type: 'property', group: 'yellow', property: { purchasePrice: 260, mortgageValue: 130, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150, skyscraper: 2150 } } },
  { id: 'ventnor-ave', index: 35, name: 'Ventnor Ave', type: 'property', group: 'yellow', property: { purchasePrice: 260, mortgageValue: 130, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150, skyscraper: 2150 } } },
  { id: 'water-works', index: 36, name: 'Water Works', type: 'utility', utility: { purchasePrice: 150, mortgageValue: 75, rentMultiplier1: 4, rentMultiplier2: 10, rentMultiplier3: 20 } },
  { id: 'marvin-gardens', index: 37, name: 'Marvin Gardens', type: 'property', group: 'yellow', property: { purchasePrice: 280, mortgageValue: 140, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 24, house1: 120, house2: 360, house3: 850, house4: 1025, hotel: 1200, skyscraper: 2200 } } },
  { id: 'california-ave', index: 38, name: 'California Ave', type: 'property', group: 'yellow', property: { purchasePrice: 280, mortgageValue: 140, houseCost: 150, hotelCost: 150, skyscraperCost: 300, rent: { base: 24, house1: 120, house2: 360, house3: 850, house4: 1025, hotel: 1200, skyscraper: 2200 } } },
  // Go To Jail corner
  { id: 'go-to-jail', index: 39, name: 'Go To Jail', type: 'goToJail' },
  // Green set
  { id: 'pacific-ave', index: 40, name: 'Pacific Ave', type: 'property', group: 'green', property: { purchasePrice: 300, mortgageValue: 150, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275, skyscraper: 2275 } } },
  { id: 'south-carolina-ave', index: 41, name: 'South Carolina Ave', type: 'property', group: 'green', property: { purchasePrice: 300, mortgageValue: 150, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275, skyscraper: 2275 } } },
  { id: 'north-carolina-ave', index: 42, name: 'North Carolina Ave', type: 'property', group: 'green', property: { purchasePrice: 300, mortgageValue: 150, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275, skyscraper: 2275 } } },
  { id: 'community-3', index: 43, name: 'Community Chest', type: 'community' },
  { id: 'pennsylvania-ave', index: 44, name: 'Pennsylvania Ave', type: 'property', group: 'green', property: { purchasePrice: 320, mortgageValue: 160, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 28, house1: 150, house2: 450, house3: 1000, house4: 1200, hotel: 1400, skyscraper: 2400 } } },
  { id: 'short-line', index: 45, name: 'Short Line', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200, hasDepot: true } },
  { id: 'chance-3', index: 46, name: 'Chance', type: 'chance' },
  { id: 'birthday-gift', index: 47, name: 'Birthday Gift', type: 'other' },
  // Dark Blue set
  { id: 'florida-ave', index: 48, name: 'Florida Ave', type: 'property', group: 'darkBlue', property: { purchasePrice: 350, mortgageValue: 175, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 35, house1: 175, house2: 500, house3: 1100, house4: 1300, hotel: 1500, skyscraper: 2500 } } },
  { id: 'park-place', index: 49, name: 'Park Place', type: 'property', group: 'darkBlue', property: { purchasePrice: 350, mortgageValue: 175, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 35, house1: 175, house2: 500, house3: 1100, house4: 1300, hotel: 1500, skyscraper: 2500 } } },
  { id: 'luxury-tax', index: 50, name: 'Luxury Tax', type: 'tax', taxAmount: 100 },
  { id: 'boardwalk', index: 51, name: 'Boardwalk', type: 'property', group: 'darkBlue', property: { purchasePrice: 400, mortgageValue: 200, houseCost: 200, hotelCost: 200, skyscraperCost: 400, rent: { base: 50, house1: 200, house2: 600, house3: 1400, house4: 1700, hotel: 2000, skyscraper: 3000 } } },
];

//#selectors
export function wrapIndex(index: number): number {
  return ((index % BOARD_SIZE) + BOARD_SIZE) % BOARD_SIZE;
}

export function getTileByIndex(index: number): BoardTileData {
  const wrapped = wrapIndex(index);
  const tile = BOARD_TILES[wrapped];
  if (!tile) throw new Error(`No tile at index ${wrapped}`);
  return tile;
}

export function getTileById(id: string): BoardTileData {
  const tile = BOARD_TILES.find((t) => t.id === id);
  if (!tile) throw new Error(`No tile with id ${id}`);
  return tile;
}

/** Yellow/black hazard stripes — matches BuildSell railroad group wrapper. */
export const BOARD_TILE_RAILROAD_STRIPE_STYLE: CSSProperties = {
  backgroundColor: '#facc15',
  backgroundImage: 'repeating-linear-gradient(135deg, #facc15 0 15px, #0a0a0a 15px 19px)',
};

/** Zinc field with diagonal hatch — matches BuildSell utilities group wrapper. */
export const BOARD_TILE_UTILITY_STRIPE_STYLE: CSSProperties = {
  backgroundColor: 'var(--color-zinc-400)',
  backgroundImage:
    'repeating-linear-gradient(45deg, rgba(0,0,0,0.5) 0px, rgba(0,0,0,0.5) 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 12px)',
};

/** Vertical amber bars — Chance (semantic: --game-chance / --game-chance-muted). */
export const BOARD_TILE_CHANCE_STRIPE_STYLE: CSSProperties = {
  backgroundColor: 'var(--game-chance)',
  backgroundImage:
    'repeating-linear-gradient(90deg, var(--game-chance) 0 6px, var(--game-chance-muted) 6px 12px)',
};

/** Vertical cyan bars — Community Chest (semantic: --game-community / --game-community-muted). */
export const BOARD_TILE_COMMUNITY_STRIPE_STYLE: CSSProperties = {
  backgroundColor: 'var(--game-community)',
  backgroundImage:
    'repeating-linear-gradient(90deg, var(--game-community) 0 6px, var(--game-community-muted) 6px 12px)',
};

export function getBoardTileStripeStyle(tile: BoardTileData): CSSProperties | undefined {
  if (tile.type === 'chance') return BOARD_TILE_CHANCE_STRIPE_STYLE;
  if (tile.type === 'community') return BOARD_TILE_COMMUNITY_STRIPE_STYLE;
  if (tile.type === 'railroad') return BOARD_TILE_RAILROAD_STRIPE_STYLE;
  if (tile.type === 'utility') return BOARD_TILE_UTILITY_STRIPE_STYLE;
  return undefined;
}

export function getTileHeaderBgClass(tile: BoardTileData): string {
  if (tile.type === 'property') {
    switch (tile.group) {
      case 'brown':
        return 'bg-amber-800';
      case 'lightBlue':
        return 'bg-sky-300';
      case 'pink':
        return 'bg-pink-400';
      case 'orange':
        return 'bg-orange-400';
      case 'red':
        return 'bg-red-600';
      case 'yellow':
        return 'bg-yellow-400';
      case 'green':
        return 'bg-green-600';
      case 'darkBlue':
        return 'bg-blue-900';
      default:
        return 'bg-neutral-200';
    }
  }
  if (tile.type === 'railroad' || tile.type === 'utility' || tile.type === 'chance' || tile.type === 'community') return '';
  if (tile.type === 'busStop' || tile.id === 'birthday-gift') return 'bg-game-bus';
  return 'bg-neutral-200';
}

export function getTileHeaderTextClass(tile: BoardTileData): string {
  if (tile.type === 'property') {
    switch (tile.group) {
      case 'brown':
      case 'red':
      case 'green':
      case 'darkBlue':
        return 'text-white';
      default:
        return 'text-neutral-900';
    }
  }
  return 'text-neutral-900';
}

export function getForwardDistance(fromIndex: number, toIndex: number): number {
  return wrapIndex(toIndex - fromIndex);
}

export function passedGo(fromIndex: number, toIndex: number): boolean {
  const from = wrapIndex(fromIndex);
  const to = wrapIndex(toIndex);
  return to < from;
}
