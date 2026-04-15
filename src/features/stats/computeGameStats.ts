import { getTileByIndex } from '@/data/board';
import type { GameEvent } from '@/types/monopoly-schema';

export type PlayerRef = { id: string; nickname: string };

function tileLabelAtIndex(idx: unknown): string {
  if (typeof idx !== 'number' || !Number.isFinite(idx)) return '—';
  try {
    return getTileByIndex(idx).name;
  } catch {
    return `Space ${idx}`;
  }
}

function topKFrequencyCounts(map: Map<number, number>, k: number): { total: number; count: number }[] {
  return [...map.entries()]
    .map(([total, count]) => ({ total, count }))
    .sort((a, b) => b.count - a.count || b.total - a.total)
    .slice(0, k);
}

/** Format roll histogram rows for UI (e.g. `6×3, 8×2`). */
export function formatRollTopStats(rows: { total: number; count: number }[]): string {
  if (rows.length === 0) return '—';
  return rows.map((r) => `${r.total}×${r.count}`).join(', ');
}

function topKTileCounts(map: Map<string, number>, k: number): { name: string; count: number }[] {
  return [...map.entries()]
    .map(([name, count]) => ({ name, count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name))
    .slice(0, k);
}

function maxPayEdge(edges: Map<string, number>): { playerId: string; amount: number } | null {
  let best: { playerId: string; amount: number } | null = null;
  for (const [playerId, amount] of edges) {
    if (!best || amount > best.amount || (amount === best.amount && playerId < best.playerId)) {
      best = { playerId, amount };
    }
  }
  return best;
}

function playerName(players: readonly PlayerRef[], id: string): string {
  return players.find((p) => p.id === id)?.nickname ?? id;
}

export interface PersonalStatsRow {
  topRollTotals: { total: number; count: number }[];
  paidMostTo: { playerId: string; name: string; amount: number } | null;
  receivedMostFrom: { playerId: string; name: string; amount: number } | null;
  passedGo: number;
  doubles: number;
  triples: number;
  tripleOnes: number;
  cardsChance: number;
  cardsCommunity: number;
  cardsBus: number;
  busTicketsUsed: number;
}

export interface GameStatsSnapshot {
  playerCount: number;
  /** Completed turn cycles ≈ max(turnSeq) / playerCount (from event metadata). */
  tableRounds: number;
  gameTopRollTotals: { total: number; count: number }[];
  totalRentPaid: number;
  /** PASSED_GO + FREE_PARKING_WIN + JACKPOT_111 + net positive CARD moneyDelta (when present). */
  moneyWonBankParkingJackpotCards: number;
  topLandedTiles: { name: string; count: number }[];
  busTicketsUsedByPlayer: { playerId: string; name: string; count: number }[];
  byPlayer: Record<string, PersonalStatsRow>;
}

const emptyPersonal = (): PersonalStatsRow => ({
  topRollTotals: [],
  paidMostTo: null,
  receivedMostFrom: null,
  passedGo: 0,
  doubles: 0,
  triples: 0,
  tripleOnes: 0,
  cardsChance: 0,
  cardsCommunity: 0,
  cardsBus: 0,
  busTicketsUsed: 0,
});

export function computeGameStats(events: readonly GameEvent[], players: readonly PlayerRef[]): GameStatsSnapshot {
  const playerCount = Math.max(1, players.length);
  const byId: Record<string, PersonalStatsRow> = {};
  for (const p of players) byId[p.id] = emptyPersonal();

  const gameRollTotals = new Map<number, number>();
  const landings = new Map<string, number>();
  let totalRentPaid = 0;
  let moneyWonBankParkingJackpotCards = 0;
  let maxTurnSeq = 0;
  const busUsedBy = new Map<string, number>();

  const paidByPayer = new Map<string, Map<string, number>>();
  const receivedByPayee = new Map<string, Map<string, number>>();
  const rollTotalsByPlayer = new Map<string, Map<number, number>>();

  const ensureEdge = (root: Map<string, Map<string, number>>, a: string): Map<string, number> => {
    let m = root.get(a);
    if (!m) {
      m = new Map();
      root.set(a, m);
    }
    return m;
  };

  for (const ev of events) {
    if (typeof ev.turnSeq === 'number' && ev.turnSeq > maxTurnSeq) maxTurnSeq = ev.turnSeq;

    const actor = ev.actorPlayerId ?? ev.turnPlayerId;

    if (ev.type === 'ROLL' && ev.payload && typeof ev.payload.total === 'number') {
      const t = ev.payload.total as number;
      gameRollTotals.set(t, (gameRollTotals.get(t) ?? 0) + 1);
      if (actor && byId[actor]) {
        let pm = rollTotalsByPlayer.get(actor);
        if (!pm) {
          pm = new Map();
          rollTotalsByPlayer.set(actor, pm);
        }
        pm.set(t, (pm.get(t) ?? 0) + 1);
      }
      if (typeof ev.payload.isDouble === 'boolean' && ev.payload.isDouble && actor && byId[actor]) {
        byId[actor]!.doubles += 1;
      }
      if (typeof ev.payload.isTriple === 'boolean' && ev.payload.isTriple && actor && byId[actor]) {
        byId[actor]!.triples += 1;
      }
      if (typeof ev.payload.isTripleOnes === 'boolean' && ev.payload.isTripleOnes && actor && byId[actor]) {
        byId[actor]!.tripleOnes += 1;
      }
    }

    if (ev.type === 'MOVE' && ev.payload && typeof ev.payload.to === 'number') {
      const name = tileLabelAtIndex(ev.payload.to);
      landings.set(name, (landings.get(name) ?? 0) + 1);
    }

    if (ev.type === 'RENT') {
      const p = ev.payload ?? {};
      const amt = typeof p.amount === 'number' ? p.amount : Math.abs(typeof ev.moneyDelta === 'number' ? ev.moneyDelta : 0);
      const from = p.from as string | undefined;
      const to = p.to as string | undefined;
      if (amt > 0) totalRentPaid += amt;
      if (from && to && amt > 0) {
        const m1 = ensureEdge(paidByPayer, from);
        m1.set(to, (m1.get(to) ?? 0) + amt);
        const m2 = ensureEdge(receivedByPayee, to);
        m2.set(from, (m2.get(from) ?? 0) + amt);
      }
    }

    if (ev.type === 'PASSED_GO' || ev.type === 'FREE_PARKING_WIN' || ev.type === 'JACKPOT_111') {
      const d = typeof ev.moneyDelta === 'number' && ev.moneyDelta > 0 ? ev.moneyDelta : 0;
      moneyWonBankParkingJackpotCards += d;
    }
    if (ev.type === 'CARD' && typeof ev.moneyDelta === 'number' && ev.moneyDelta > 0) {
      moneyWonBankParkingJackpotCards += ev.moneyDelta;
    }

    if (ev.type === 'PASSED_GO') {
      const pid = (ev.payload?.playerId as string | undefined) ?? actor;
      if (pid && byId[pid]) byId[pid]!.passedGo += 1;
    }

    if (ev.type === 'CARD') {
      const deck = ev.payload?.deck as string | undefined;
      if (actor && byId[actor]) {
        if (deck === 'chance') byId[actor]!.cardsChance += 1;
        else if (deck === 'community') byId[actor]!.cardsCommunity += 1;
        else if (deck === 'bus') byId[actor]!.cardsBus += 1;
      }
    }

    if (ev.type === 'BUS_PASS_USED') {
      const uid = (ev.payload?.playerId as string | undefined) ?? actor;
      if (uid) {
        busUsedBy.set(uid, (busUsedBy.get(uid) ?? 0) + 1);
        if (byId[uid]) byId[uid]!.busTicketsUsed += 1;
      }
    }
  }

  for (const p of players) {
    const pm = rollTotalsByPlayer.get(p.id);
    if (pm) byId[p.id]!.topRollTotals = topKFrequencyCounts(pm, 5);

    const paid = paidByPayer.get(p.id);
    const topPaid = paid ? maxPayEdge(paid) : null;
    byId[p.id]!.paidMostTo =
      topPaid && topPaid.amount > 0 ? { playerId: topPaid.playerId, name: playerName(players, topPaid.playerId), amount: topPaid.amount } : null;

    const rec = receivedByPayee.get(p.id);
    const topRec = rec ? maxPayEdge(rec) : null;
    byId[p.id]!.receivedMostFrom =
      topRec && topRec.amount > 0 ? { playerId: topRec.playerId, name: playerName(players, topRec.playerId), amount: topRec.amount } : null;
  }

  const tableRounds = Math.floor(maxTurnSeq / playerCount);

  const busTicketsUsedByPlayer = [...busUsedBy.entries()]
    .map(([playerId, count]) => ({ playerId, name: playerName(players, playerId), count }))
    .sort((a, b) => b.count - a.count || a.name.localeCompare(b.name));

  return {
    playerCount,
    tableRounds,
    gameTopRollTotals: topKFrequencyCounts(gameRollTotals, 3),
    totalRentPaid,
    moneyWonBankParkingJackpotCards,
    topLandedTiles: topKTileCounts(landings, 5),
    busTicketsUsedByPlayer,
    byPlayer: byId,
  };
}
