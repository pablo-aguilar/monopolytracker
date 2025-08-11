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

const initialState: CardsState = {
  seed: 0,
  decks: {
    chance: { drawPile: [], discardPile: [] },
    community: { drawPile: [], discardPile: [] },
    bus: { drawPile: [], discardPile: [] },
  },
};

function initDeck(baseSeed: number | string, deck: CardDeck): DeckState {
  return {
    drawPile: buildShuffledDeck(deck, `${baseSeed}:${deck}:0`),
    discardPile: [],
  };
}

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
        // reshuffle discard into draw with a new shuffle seed derived from discard length
        const reshuffled = buildShuffledDeck(deckKey, `${state.seed}:${deckKey}:r${deck.discardPile.length}`);
        deck.drawPile = reshuffled;
        deck.discardPile = [];
      }
      // move top of draw pile to discard pile
      const card = deck.drawPile.shift();
      if (card) {
        deck.discardPile.unshift(card);
      }
    },
    putCardOnBottom(state, action: PayloadAction<{ deck: CardDeck; cardId: string }>) {
      const { deck: deckKey, cardId } = action.payload;
      const deck = state.decks[deckKey];
      // remove from discard if present
      const idx = deck.discardPile.findIndex((c) => c.id === cardId);
      if (idx >= 0) {
        const [card] = deck.discardPile.splice(idx, 1);
        deck.drawPile.push(card);
      }
    },
  },
});

export const { setSeed, drawCard, putCardOnBottom } = cardsSlice.actions;
export default cardsSlice.reducer;
