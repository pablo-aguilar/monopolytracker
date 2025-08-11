// #index
// - //#types: tile and economics types
// - //#constants: board constants and indices
// - //#data: tiles array with metadata and economics
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
  skyscraper?: number; // Mega Monopoly extension (optional seed for now)
}

export interface PropertyEconomics {
  purchasePrice: number;
  mortgageValue: number;
  houseCost: number;
  hotelCost?: number; // often equal to houseCost in classic rules
  skyscraperCost?: number; // Mega Monopoly extension
  rent: PropertyRentSchedule;
}

export interface RailroadEconomics {
  purchasePrice: number;
  mortgageValue: number;
  rent1: number; // rent with 1 railroad owned
  rent2: number;
  rent3: number;
  rent4: number;
}

export interface UtilityEconomics {
  purchasePrice: number;
  mortgageValue: number;
  rentMultiplier1: number; // dice total * multiplier if 1 utility owned
  rentMultiplier2: number; // dice total * multiplier if 2 utilities owned
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
export const BOARD_SIZE = 40;
export const GO_INDEX = 0;
export const JAIL_INDEX = 10;
export const FREE_PARKING_INDEX = 20;
export const GO_TO_JAIL_INDEX = 30;

//#data
// Standard Monopoly board order with classic rents and prices.
// Skyscraper values left undefined (Mega Monopoly extension to be finalized).
export const BOARD_TILES: BoardTileData[] = [
  { id: 'go', index: 0, name: 'GO', type: 'go' },
  {
    id: 'mediterranean-ave',
    index: 1,
    name: 'Mediterranean Avenue',
    type: 'property',
    group: 'brown',
    property: {
      purchasePrice: 60,
      mortgageValue: 30,
      houseCost: 50,
      hotelCost: 50,
      rent: { base: 2, house1: 10, house2: 30, house3: 90, house4: 160, hotel: 250 },
    },
  },
  { id: 'community-1', index: 2, name: 'Community Chest', type: 'community' },
  {
    id: 'baltic-ave',
    index: 3,
    name: 'Baltic Avenue',
    type: 'property',
    group: 'brown',
    property: {
      purchasePrice: 60,
      mortgageValue: 30,
      houseCost: 50,
      hotelCost: 50,
      rent: { base: 4, house1: 20, house2: 60, house3: 180, house4: 320, hotel: 450 },
    },
  },
  { id: 'income-tax', index: 4, name: 'Income Tax', type: 'tax', taxAmount: 200 },
  {
    id: 'reading-railroad',
    index: 5,
    name: 'Reading Railroad',
    type: 'railroad',
    railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200 },
  },
  {
    id: 'oriental-ave',
    index: 6,
    name: 'Oriental Avenue',
    type: 'property',
    group: 'lightBlue',
    property: {
      purchasePrice: 100,
      mortgageValue: 50,
      houseCost: 50,
      hotelCost: 50,
      rent: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550 },
    },
  },
  { id: 'chance-1', index: 7, name: 'Chance', type: 'chance' },
  {
    id: 'vermont-ave',
    index: 8,
    name: 'Vermont Avenue',
    type: 'property',
    group: 'lightBlue',
    property: {
      purchasePrice: 100,
      mortgageValue: 50,
      houseCost: 50,
      hotelCost: 50,
      rent: { base: 6, house1: 30, house2: 90, house3: 270, house4: 400, hotel: 550 },
    },
  },
  {
    id: 'connecticut-ave',
    index: 9,
    name: 'Connecticut Avenue',
    type: 'property',
    group: 'lightBlue',
    property: {
      purchasePrice: 120,
      mortgageValue: 60,
      houseCost: 50,
      hotelCost: 50,
      rent: { base: 8, house1: 40, house2: 100, house3: 300, house4: 450, hotel: 600 },
    },
  },
  { id: 'jail', index: 10, name: 'Jail / Just Visiting', type: 'jail' },
  {
    id: 'st-charles-place',
    index: 11,
    name: 'St. Charles Place',
    type: 'property',
    group: 'pink',
    property: {
      purchasePrice: 140,
      mortgageValue: 70,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750 },
    },
  },
  { id: 'electric-company', index: 12, name: 'Electric Company', type: 'utility', utility: { purchasePrice: 150, mortgageValue: 75, rentMultiplier1: 4, rentMultiplier2: 10 } },
  {
    id: 'states-ave',
    index: 13,
    name: 'States Avenue',
    type: 'property',
    group: 'pink',
    property: {
      purchasePrice: 140,
      mortgageValue: 70,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 10, house1: 50, house2: 150, house3: 450, house4: 625, hotel: 750 },
    },
  },
  {
    id: 'virginia-ave',
    index: 14,
    name: 'Virginia Avenue',
    type: 'property',
    group: 'pink',
    property: {
      purchasePrice: 160,
      mortgageValue: 80,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 12, house1: 60, house2: 180, house3: 500, house4: 700, hotel: 900 },
    },
  },
  { id: 'pennsylvania-railroad', index: 15, name: 'Pennsylvania Railroad', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200 } },
  {
    id: 'st-james-place',
    index: 16,
    name: 'St. James Place',
    type: 'property',
    group: 'orange',
    property: {
      purchasePrice: 180,
      mortgageValue: 90,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950 },
    },
  },
  { id: 'community-2', index: 17, name: 'Community Chest', type: 'community' },
  {
    id: 'tennessee-ave',
    index: 18,
    name: 'Tennessee Avenue',
    type: 'property',
    group: 'orange',
    property: {
      purchasePrice: 180,
      mortgageValue: 90,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 14, house1: 70, house2: 200, house3: 550, house4: 750, hotel: 950 },
    },
  },
  {
    id: 'new-york-ave',
    index: 19,
    name: 'New York Avenue',
    type: 'property',
    group: 'orange',
    property: {
      purchasePrice: 200,
      mortgageValue: 100,
      houseCost: 100,
      hotelCost: 100,
      rent: { base: 16, house1: 80, house2: 220, house3: 600, house4: 800, hotel: 1000 },
    },
  },
  { id: 'free-parking', index: 20, name: 'Free Parking', type: 'freeParking' },
  {
    id: 'kentucky-ave',
    index: 21,
    name: 'Kentucky Avenue',
    type: 'property',
    group: 'red',
    property: {
      purchasePrice: 220,
      mortgageValue: 110,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050 },
    },
  },
  { id: 'chance-2', index: 22, name: 'Chance', type: 'chance' },
  {
    id: 'indiana-ave',
    index: 23,
    name: 'Indiana Avenue',
    type: 'property',
    group: 'red',
    property: {
      purchasePrice: 220,
      mortgageValue: 110,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 18, house1: 90, house2: 250, house3: 700, house4: 875, hotel: 1050 },
    },
  },
  {
    id: 'illinois-ave',
    index: 24,
    name: 'Illinois Avenue',
    type: 'property',
    group: 'red',
    property: {
      purchasePrice: 240,
      mortgageValue: 120,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 20, house1: 100, house2: 300, house3: 750, house4: 925, hotel: 1100 },
    },
  },
  { id: 'bno-railroad', index: 25, name: 'B. & O. Railroad', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200 } },
  {
    id: 'atlantic-ave',
    index: 26,
    name: 'Atlantic Avenue',
    type: 'property',
    group: 'yellow',
    property: {
      purchasePrice: 260,
      mortgageValue: 130,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150 },
    },
  },
  {
    id: 'ventnor-ave',
    index: 27,
    name: 'Ventnor Avenue',
    type: 'property',
    group: 'yellow',
    property: {
      purchasePrice: 260,
      mortgageValue: 130,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 22, house1: 110, house2: 330, house3: 800, house4: 975, hotel: 1150 },
    },
  },
  { id: 'water-works', index: 28, name: 'Water Works', type: 'utility', utility: { purchasePrice: 150, mortgageValue: 75, rentMultiplier1: 4, rentMultiplier2: 10 } },
  {
    id: 'marvin-gardens',
    index: 29,
    name: 'Marvin Gardens',
    type: 'property',
    group: 'yellow',
    property: {
      purchasePrice: 280,
      mortgageValue: 140,
      houseCost: 150,
      hotelCost: 150,
      rent: { base: 24, house1: 120, house2: 360, house3: 850, house4: 1025, hotel: 1200 },
    },
  },
  { id: 'go-to-jail', index: 30, name: 'Go To Jail', type: 'goToJail' },
  {
    id: 'pacific-ave',
    index: 31,
    name: 'Pacific Avenue',
    type: 'property',
    group: 'green',
    property: {
      purchasePrice: 300,
      mortgageValue: 150,
      houseCost: 200,
      hotelCost: 200,
      rent: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275 },
    },
  },
  {
    id: 'north-carolina-ave',
    index: 32,
    name: 'North Carolina Avenue',
    type: 'property',
    group: 'green',
    property: {
      purchasePrice: 300,
      mortgageValue: 150,
      houseCost: 200,
      hotelCost: 200,
      rent: { base: 26, house1: 130, house2: 390, house3: 900, house4: 1100, hotel: 1275 },
    },
  },
  { id: 'community-3', index: 33, name: 'Community Chest', type: 'community' },
  {
    id: 'pennsylvania-ave',
    index: 34,
    name: 'Pennsylvania Avenue',
    type: 'property',
    group: 'green',
    property: {
      purchasePrice: 320,
      mortgageValue: 160,
      houseCost: 200,
      hotelCost: 200,
      rent: { base: 28, house1: 150, house2: 450, house3: 1000, house4: 1200, hotel: 1400 },
    },
  },
  { id: 'short-line', index: 35, name: 'Short Line', type: 'railroad', railroad: { purchasePrice: 200, mortgageValue: 100, rent1: 25, rent2: 50, rent3: 100, rent4: 200 } },
  { id: 'chance-3', index: 36, name: 'Chance', type: 'chance' },
  {
    id: 'park-place',
    index: 37,
    name: 'Park Place',
    type: 'property',
    group: 'darkBlue',
    property: {
      purchasePrice: 350,
      mortgageValue: 175,
      houseCost: 200,
      hotelCost: 200,
      rent: { base: 35, house1: 175, house2: 500, house3: 1100, house4: 1300, hotel: 1500 },
    },
  },
  { id: 'luxury-tax', index: 38, name: 'Luxury Tax', type: 'tax', taxAmount: 100 },
  {
    id: 'boardwalk',
    index: 39,
    name: 'Boardwalk',
    type: 'property',
    group: 'darkBlue',
    property: {
      purchasePrice: 400,
      mortgageValue: 200,
      houseCost: 200,
      hotelCost: 200,
      rent: { base: 50, house1: 200, house2: 600, house3: 1400, house4: 1700, hotel: 2000 },
    },
  },
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

export function getForwardDistance(fromIndex: number, toIndex: number): number {
  return wrapIndex(toIndex - fromIndex);
}

export function passedGo(fromIndex: number, toIndex: number): boolean {
  const from = wrapIndex(fromIndex);
  const to = wrapIndex(toIndex);
  return to < from;
}
