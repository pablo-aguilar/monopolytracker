// #index
// - //#types: card types and effect payloads
// - //#data: base decks (text + effect payload)
// - //#helpers: build shuffled decks by seed

//#types
export type CardDeck = 'chance' | 'community' | 'bus';

export type CardEffect =
  | { type: 'moveTo'; tileId: string; awardGoIfPassed?: boolean }
  | { type: 'moveSteps'; steps: number; awardGoIfPassed?: boolean }
  | { type: 'goToJail' }
  | { type: 'getOutOfJail' }
  | { type: 'payBank'; amount: number }
  | { type: 'receiveBank'; amount: number }
  | { type: 'receiveFromPlayers'; amountPerPlayer: number }
  | { type: 'payEachPlayer'; amountPerPlayer: number }
  | { type: 'busTicket' };

export interface CardDefinition {
  id: string;
  deck: CardDeck;
  text: string;
  effect: CardEffect;
}

//#data
// Representative subsets; can be expanded later. IDs are stable for replay.
export const COMMUNITY_CHEST: CardDefinition[] = [
  { id: 'c1', deck: 'community', text: 'Advance to GO (Collect $200)', effect: { type: 'moveTo', tileId: 'go', awardGoIfPassed: true } },
  { id: 'c2', deck: 'community', text: 'Bank error in your favor. Collect $200', effect: { type: 'receiveBank', amount: 200 } },
  { id: 'c3', deck: 'community', text: 'Doctor’s fees. Pay $50', effect: { type: 'payBank', amount: 50 } },
  { id: 'c4', deck: 'community', text: 'Get Out of Jail Free', effect: { type: 'getOutOfJail' } },
  { id: 'c5', deck: 'community', text: 'Go to Jail. Do not pass GO, do not collect $200', effect: { type: 'goToJail' } },
  { id: 'c6', deck: 'community', text: 'From sale of stock you get $50', effect: { type: 'receiveBank', amount: 50 } },
  { id: 'c7', deck: 'community', text: 'Holiday fund matures. Receive $100', effect: { type: 'receiveBank', amount: 100 } },
  { id: 'c8', deck: 'community', text: 'Pay hospital fees of $100', effect: { type: 'payBank', amount: 100 } },
];

export const CHANCE: CardDefinition[] = [
  { id: 'h1', deck: 'chance', text: 'Advance to GO (Collect $200)', effect: { type: 'moveTo', tileId: 'go', awardGoIfPassed: true } },
  { id: 'h2', deck: 'chance', text: 'Advance to Illinois Avenue', effect: { type: 'moveTo', tileId: 'illinois-ave', awardGoIfPassed: true } },
  { id: 'h3', deck: 'chance', text: 'Advance to St. Charles Place', effect: { type: 'moveTo', tileId: 'st-charles-place', awardGoIfPassed: true } },
  { id: 'h4', deck: 'chance', text: 'Go to Jail. Do not pass GO', effect: { type: 'goToJail' } },
  { id: 'h5', deck: 'chance', text: 'Bank pays you dividend of $50', effect: { type: 'receiveBank', amount: 50 } },
  { id: 'h6', deck: 'chance', text: 'Pay poor tax of $15', effect: { type: 'payBank', amount: 15 } },
  { id: 'h7', deck: 'chance', text: 'Get Out of Jail Free', effect: { type: 'getOutOfJail' } },
  { id: 'h8', deck: 'chance', text: 'Advance token to nearest Utility', effect: { type: 'moveTo', tileId: 'electric-company', awardGoIfPassed: true } },
];

export const BUS: CardDefinition[] = [
  { id: 'b1', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b2', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b3', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
];

//#helpers
import { seededShuffle } from '@/lib/rng';

export function buildShuffledDeck(deck: 'chance' | 'community' | 'bus', seed: number | string): CardDefinition[] {
  const base = deck === 'chance' ? CHANCE : deck === 'community' ? COMMUNITY_CHEST : BUS;
  return seededShuffle(base, seed);
}
