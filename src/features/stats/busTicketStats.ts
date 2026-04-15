import type { GameEvent } from '@/types/monopoly-schema';

export type BusTicketEconomy = {
  /** Teleports (consumes a ticket). */
  teleportUses: number;
  /** Bus tickets voluntarily sent away in trades (outgoing per trade). */
  tradeOut: number;
  /** Tickets removed when another player resolved Big Bus (from event payload). */
  lostBigBus: number;
  /** Teleport + trade out (per product spec). */
  used: number;
  /** heldNow + used + lostBigBus — lifetime acquired. */
  totalAcquired: number;
};

/**
 * Bus ticket accounting: Used = teleports + trade-outs; Lost = Big Bus clears (logged on CARD).
 * Total acquired = held + used + lost.
 */
export function computeBusTicketEconomy(
  playerId: string,
  events: readonly GameEvent[],
  heldNow: number,
): BusTicketEconomy {
  let teleportUses = 0;
  let tradeOut = 0;
  let lostBigBus = 0;

  for (const ev of events) {
    const actor = ev.actorPlayerId ?? ev.turnPlayerId;

    if (ev.type === 'BUS_PASS_USED') {
      const uid = (ev.payload?.playerId as string | undefined) ?? actor;
      if (uid === playerId) teleportUses += 1;
    }

    if (ev.type === 'TRADE') {
      const p = ev.payload ?? {};
      const fromId = p.fromPlayerId as string | undefined;
      const toId = p.toPlayerId as string | undefined;
      const fromOffer = p.fromOffer as { busTicketsCount?: number } | undefined;
      const toOffer = p.toOffer as { busTicketsCount?: number } | undefined;
      if (fromId === playerId) tradeOut += Math.max(0, fromOffer?.busTicketsCount ?? 0);
      if (toId === playerId) tradeOut += Math.max(0, toOffer?.busTicketsCount ?? 0);
    }

    if (ev.type === 'CARD') {
      const cleared = ev.payload?.bigBusClearedByPlayerId as Record<string, number> | undefined;
      if (cleared && typeof cleared[playerId] === 'number') {
        lostBigBus += Math.max(0, cleared[playerId]!);
      }
    }
  }

  const used = teleportUses + tradeOut;
  const totalAcquired = heldNow + used + lostBigBus;

  return {
    teleportUses,
    tradeOut,
    lostBigBus,
    used,
    totalAcquired,
  };
}
