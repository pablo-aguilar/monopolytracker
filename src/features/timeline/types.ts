import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayersState } from '@/features/players/playersSlice';
import type { PropertiesState } from '@/features/properties/propertiesSlice';
import type { SessionState } from '@/features/session/sessionSlice';
import type { CardsState } from '@/features/cards/cardsSlice';
import type { TradePassesState } from '@/features/tradePasses/tradePassesSlice';

/** Full persisted gameplay state after a specific log event (inclusive). */
export type TimelineSnapshot = {
  afterEventId: string;
  players: PlayersState;
  properties: PropertiesState;
  session: SessionState;
  cards: CardsState;
  tradePasses: TradePassesState;
  events: GameEvent[];
};
