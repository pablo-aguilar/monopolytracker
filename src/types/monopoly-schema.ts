// #index
// - //#types-dice: Special die faces and roll metadata
// - //#types-events: Event types and event record for event-sourced modeling
// - Existing interfaces kept for compatibility (Game, Player, Turn, Action)

export type SpecialDieFace = 1 | 2 | 3 | '+1' | '-1' | 'Bus';

// //#types-dice
export interface DieRoll {
  d6A: number;
  d6B: number;
  special: SpecialDieFace;
  isDouble: boolean; // true when d6A === d6B
  isTriple: boolean; // true when d6A === d6B and special is numeric and equals d6A
  isTripleOnes: boolean; // convenience flag for 1-1-1
}

// Specific reasons for JAIL events to make rule precedence explicit
export type JailReason =
  | 'THREE_DOUBLES'
  | 'DOUBLE_DOUBLE_TRIPLE'
  | 'TRIPLE_ONES_NEAR_JAIL'
  | 'GO_TO_JAIL_TILE'
  | 'CARD';

// //#types-events
export type EventType =
  | 'ROLL'
  | 'JACKPOT_111' // +$1000 bonus for triple ones
  | 'TELEPORT' // move anywhere; steps=0; may pass GO and earn +200 if wrapped
  | 'MOVE' // standard movement by steps including +1/-1, Bus choice resolution
  | 'PASSED_GO'
  | 'PURCHASE'
  | 'RENT'
  | 'FEE'
  | 'CARD'
  | 'FREE_PARKING_WIN'
  | 'BET_WIN'
  | 'BUS_PASS_USED'
  | 'JAIL' // payload.reason should be JailReason
  | 'DECLARE_WINNER'
  | 'REVERT_TO';

export interface GameEvent {
  id: string;
  gameId: string;
  type: EventType;
  actorPlayerId?: string; // player who initiated the event (if applicable)
  payload: Record<string, any>; // structured per event type
  moneyDelta?: number; // positive for income, negative for payouts
  createdAt: string; // ISO string
  seq?: number; // optional server ordering
  clientId?: string; // client/session identifier for idempotency
  clientEventId?: string; // client-side id for deduplication
  revertedByEventId?: string; // if this event was reverted
}

export interface GameSettings {
  freeParkingSeed: number;
  taxToParking: boolean;
  customDiceEnabled: boolean;
  betEnabled: boolean;
}

export interface BoardTile {
  id: string;
  name: string;
  type: 'property' | 'chance' | 'community' | 'tax' | 'freeParking' | 'go' | 'jail' | 'railroad' | 'utility' | 'goToJail' | 'other';
  price?: number;
  group?: string;
}

export interface Action {
  type:
    | 'purchase'
    | 'rent'
    | 'fee'
    | 'card'
    | 'freeParkingWin'
    | 'betWin'
    | 'busPassUsed'
    | 'jail'
    | 'mortgage'
    | 'unmortgage'
    | 'buyHouse'
    | 'sellHouse';
  amount: number;
  from: string;
  to: string;
  details?: Record<string, any>;
}

export interface Turn {
  id: string;
  gameId: string;
  playerId: string;
  round: number;
  turnOrder: number;
  dice1: number;
  dice2: number;
  specialDie: SpecialDieFace;
  totalMovement: number;
  newPosition: number;
  passedGo: boolean;
  landedTile: string;
  actions: Action[];
}

export interface Player {
  id: string;
  name: string;
  color: string;
  money: number;
  position: number;
  properties: string[];
  inJail: boolean;
  betOptIn: boolean;
  hasWonBet: boolean;
  // Optional MVP+ fields
  nickname?: string;
  avatarKey?: string; // constrained set of image keys
  profileId?: string | null; // device-bound profile id (added post-MVP)
}

export interface Game {
  id: string;
  name: string;
  dateStarted: string;
  roundNumber: number;
  freeParkingPot: number;
  betPot: number;
  players: Player[];
  turns: Turn[];
  settings: GameSettings;
  // Optional MVP+ fields
  shareCode?: string; // public read-only share token
  winnerPlayerId?: string | null;
}