import type { AppDispatch } from '@/app/store';
import type { PlayerLite } from '@/features/players/playersSlice';
import { hydrateFromTimeline as hydratePlayersFromTimeline } from '@/features/players/playersSlice';
import { resetEvents } from '@/features/events/eventsSlice';
import { resetTradePasses } from '@/features/tradePasses/tradePassesSlice';
import { clearSnapshots } from '@/features/timeline/timelineSlice';
import { sessionInitialState, hydrateFromTimeline as hydrateSessionFromTimeline } from '@/features/session/sessionSlice';
import { cardsInitialState, hydrateFromTimeline as hydrateCardsFromTimeline } from '@/features/cards/cardsSlice';
import { propertiesInitialState, hydrateFromTimeline as hydratePropertiesFromTimeline } from '@/features/properties/propertiesSlice';
import { AVATARS } from '@/data/avatars';
import type { LobbyParticipant } from '@/services/contracts/types';

const ROSTER_COLORS = ['#ef4444', '#22c55e', '#3b82f6', '#eab308', '#a855f7', '#06b6d4', '#f97316'];

/**
 * Maps Supabase lobby roster → in-memory players. Uses `game_players.id` as Redux player id
 * so host snapshots match roster identity.
 */
export function playersLiteFromLobbyRoster(participants: LobbyParticipant[]): PlayerLite[] {
  const sorted = [...participants].sort((a, b) => a.seatOrder - b.seatOrder);
  return sorted.map((lp, i) => {
    const nickname = (lp.guestName && lp.guestName.trim()) || `Player ${i + 1}`;
    const avatarKey = (lp.guestAvatarKey ?? AVATARS[i % AVATARS.length].key) as string;
    const base: PlayerLite = {
      id: lp.participantId,
      nickname,
      color: ROSTER_COLORS[i % ROSTER_COLORS.length],
      avatarKey,
      money: 1500,
      properties: [],
      positionIndex: 0,
      racePotOptIn: false,
      busTickets: 0,
      gojfChance: 0,
      gojfCommunity: 0,
      hasPassedGo: false,
      inJail: false,
      jailAttempts: 0,
    };
    return base;
  });
}

/** Fresh board + event log + roster from lobby (host start). */
export function bootstrapOnlinePlayFromRoster(dispatch: AppDispatch, participants: LobbyParticipant[]): void {
  const players = playersLiteFromLobbyRoster(participants);
  dispatch(resetEvents());
  dispatch(resetTradePasses());
  dispatch(clearSnapshots());
  dispatch(hydrateSessionFromTimeline(sessionInitialState));
  dispatch(hydrateCardsFromTimeline(cardsInitialState));
  dispatch(hydratePropertiesFromTimeline(propertiesInitialState));
  dispatch(hydratePlayersFromTimeline({ players }));
}
