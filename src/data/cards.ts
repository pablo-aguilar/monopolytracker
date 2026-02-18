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
// Classic Monopoly has 16 Chance and 16 Community Chest cards. Bus deck (Mega Monopoly) set to 16 tickets for parity.
export const COMMUNITY_CHEST: CardDefinition[] = [
  { id: 'c1', deck: 'community', text: 'Advance to GO (Collect $200)', effect: { type: 'moveTo', tileId: 'go', awardGoIfPassed: true } },
  { id: 'c2', deck: 'community', text: 'Bank error in your favor. Collect $200', effect: { type: 'receiveBank', amount: 200 } },
  { id: 'c3', deck: 'community', text: 'Doctor’s fees. Pay $50', effect: { type: 'payBank', amount: 50 } },
  { id: 'c4', deck: 'community', text: 'Get Out of Jail Free', effect: { type: 'getOutOfJail' } },
  { id: 'c5', deck: 'community', text: 'Go to Jail. Do not pass GO, do not collect $200', effect: { type: 'goToJail' } },
  { id: 'c6', deck: 'community', text: 'From sale of stock you get $50', effect: { type: 'receiveBank', amount: 50 } },
  { id: 'c7', deck: 'community', text: 'Holiday fund matures. Receive $100', effect: { type: 'receiveBank', amount: 100 } },
  { id: 'c8', deck: 'community', text: 'Pay hospital fees of $100', effect: { type: 'payBank', amount: 100 } },
  { id: 'c9', deck: 'community', text: 'Pay school fees of $50', effect: { type: 'payBank', amount: 50 } },
  { id: 'c10', deck: 'community', text: 'Receive $25 consultancy fee', effect: { type: 'receiveBank', amount: 25 } },
  { id: 'c11', deck: 'community', text: 'You have won second prize in a beauty contest. Collect $10', effect: { type: 'receiveBank', amount: 10 } },
  { id: 'c12', deck: 'community', text: 'You inherit $100', effect: { type: 'receiveBank', amount: 100 } },
  { id: 'c13', deck: 'community', text: 'Life insurance matures. Collect $100', effect: { type: 'receiveBank', amount: 100 } },
  { id: 'c14', deck: 'community', text: 'Income tax refund. Collect $20', effect: { type: 'receiveBank', amount: 20 } },
  { id: 'c15', deck: 'community', text: 'Pay each player $50', effect: { type: 'payEachPlayer', amountPerPlayer: 50 } },
  { id: 'c16', deck: 'community', text: 'Collect $50 from every player', effect: { type: 'receiveFromPlayers', amountPerPlayer: 50 } },
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
  { id: 'h9', deck: 'chance', text: 'Advance token to nearest Railroad', effect: { type: 'moveTo', tileId: 'reading-railroad', awardGoIfPassed: true } },
  { id: 'h10', deck: 'chance', text: 'Your building loan matures. Receive $150', effect: { type: 'receiveBank', amount: 150 } },
  { id: 'h11', deck: 'chance', text: 'Make general repairs on all your property. Pay $25 per house, $100 per hotel', effect: { type: 'payBank', amount: 0 } },
  { id: 'h12', deck: 'chance', text: 'Speeding fine $15', effect: { type: 'payBank', amount: 15 } },
  { id: 'h13', deck: 'chance', text: 'Advance to Boardwalk', effect: { type: 'moveTo', tileId: 'boardwalk', awardGoIfPassed: true } },
  { id: 'h14', deck: 'chance', text: 'Take a trip to Reading Railroad', effect: { type: 'moveTo', tileId: 'reading-railroad', awardGoIfPassed: true } },
  { id: 'h15', deck: 'chance', text: 'Go back 3 spaces', effect: { type: 'moveSteps', steps: -3, awardGoIfPassed: false } },
  { id: 'h16', deck: 'chance', text: 'Advance to the nearest Railroad', effect: { type: 'moveTo', tileId: 'pennsylvania-railroad', awardGoIfPassed: true } },
];

export const BUS: CardDefinition[] = [
  // 13 normal tickets
  { id: 'b1', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b2', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b3', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b4', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b5', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b6', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b7', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b8', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b9', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b10', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b11', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b12', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  { id: 'b13', deck: 'bus', text: 'Bus Ticket: Choose any unvisited property in current or next set', effect: { type: 'busTicket' } },
  // 3 Big Bus cards
  { id: 'bb1', deck: 'bus', text: 'Big Bus: All other players lose all Bus tickets', effect: { type: 'busTicket' } },
  { id: 'bb2', deck: 'bus', text: 'Big Bus: All other players lose all Bus tickets', effect: { type: 'busTicket' } },
  { id: 'bb3', deck: 'bus', text: 'Big Bus: All other players lose all Bus tickets', effect: { type: 'busTicket' } },
];

//#helpers
import { seededShuffle } from '@/lib/rng';

export function buildShuffledDeck(deck: 'chance' | 'community' | 'bus', seed: number | string): CardDefinition[] {
  const base = deck === 'chance' ? CHANCE : deck === 'community' ? COMMUNITY_CHEST : BUS;
  return seededShuffle(base, seed);
}
