import { createSlice, PayloadAction } from '@reduxjs/toolkit';
import type { CardDefinition, CardDeck } from '@/data/cards';
import { buildShuffledDeck } from '@/data/cards';

export interface DeckState {
  drawPile: CardDefinition[];
  discardPile: CardDefinition[];
}

export interface CardsState {
  seed: number | string;
  decks: Record<CardDeck, DeckState>;
}

const DEFAULT_SEED: number | string = 'monopoly';

function initDeck(baseSeed: number | string, deck: CardDeck): DeckState {
  return {
    drawPile: buildShuffledDeck(deck, `${baseSeed}:${deck}:0`),
    discardPile: [],
  };
}

const initialState: CardsState = {
  seed: DEFAULT_SEED,
  decks: {
    chance: initDeck(DEFAULT_SEED, 'chance'),
    community: initDeck(DEFAULT_SEED, 'community'),
    bus: initDeck(DEFAULT_SEED, 'bus'),
  },
};

const cardsSlice = createSlice({
  name: 'cards',
  initialState,
  reducers: {
    setSeed(state, action: PayloadAction<number | string>) {
      state.seed = action.payload;
      state.decks.chance = initDeck(state.seed, 'chance');
      state.decks.community = initDeck(state.seed, 'community');
      state.decks.bus = initDeck(state.seed, 'bus');
    },
    drawCard(state, action: PayloadAction<CardDeck>) {
      const deckKey = action.payload;
      const deck = state.decks[deckKey];
      if (deck.drawPile.length === 0) {
        const reshuffled = buildShuffledDeck(deckKey, `${state.seed}:${deckKey}:r${deck.discardPile.length}`);
        deck.drawPile = reshuffled;
        deck.discardPile = [];
      }
      const card = deck.drawPile.shift();
      if (card) {
        deck.discardPile.unshift(card);
      }
    },
    putCardOnBottom(state, action: PayloadAction<{ deck: CardDeck; cardId: string }>) {
      const { deck: deckKey, cardId } = action.payload;
      const deck = state.decks[deckKey];
      const idx = deck.discardPile.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        const [card] = deck.discardPile.splice(idx, 1);
        deck.drawPile.push(card);
      }
    },
    reshuffleIfEmpty(state, action: PayloadAction<{ deck: CardDeck; heldExcludedIds?: string[] }>) {
      const { deck: deckKey, heldExcludedIds = [] } = action.payload;
      const deck = state.decks[deckKey];
      if (deck.drawPile.length === 0) {
        // Combine discard + current draw (should be empty) minus excluded held cards
        const pool = deck.discardPile.filter((c) => !heldExcludedIds.includes(c.id));
        const reshuffled = buildShuffledDeck(deckKey, `${state.seed}:${deckKey}:manual-${Date.now()}`);
        // Replace with reshuffled from base generator but preserve excluded behavior by ensuring pool length > 0
        deck.drawPile = pool.length > 0 ? pool : reshuffled;
        deck.discardPile = [];
      }
    },
    drawBusCardByType(state, action: PayloadAction<'regular' | 'big'>) {
      const deck = state.decks.bus;
      const isBig = (id: string) => id.startsWith('bb');
      const wantBig = action.payload === 'big';

      const idx = deck.drawPile.findIndex((c) => isBig(c.id) === wantBig);
      if (idx < 0) return;

      for (let i = 0; i < idx; i++) {
        const card = deck.drawPile.shift()!;
        deck.drawPile.push(card);
      }
      const card = deck.drawPile.shift();
      if (card) deck.discardPile.unshift(card);
    },
    hydrateFromTimeline(_state, action: PayloadAction<CardsState>) {
      return action.payload;
    },
  },
});

export const selectLastDrawnCard = (state: CardsState, deck: CardDeck): CardDefinition | null => {
  const d = state.decks[deck];
  return d.discardPile.length > 0 ? d.discardPile[0] : null;
};

export const { setSeed, drawCard, putCardOnBottom, reshuffleIfEmpty, drawBusCardByType, hydrateFromTimeline } = cardsSlice.actions;
export default cardsSlice.reducer;
