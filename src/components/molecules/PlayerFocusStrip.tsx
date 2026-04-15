import React, { useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { LayoutGroup, motion, useReducedMotion } from 'framer-motion';
import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayerLite } from '@/features/players/playersSlice';
import type { PropertiesState } from '@/features/properties/propertiesSlice';
import type { TimelineSnapshot } from '@/features/timeline/types';
import { computeGameStats, formatRollTopStats } from '@/features/stats/computeGameStats';
import { computeBusTicketEconomy } from '@/features/stats/busTicketStats';
import { BOARD_TILES } from '@/data/board';
import { CHANCE, COMMUNITY_CHEST } from '@/data/cards';
import { AVATARS } from '@/data/avatars';
import AvatarToken from '@/components/atoms/AvatarToken';
import SectionCard from '@/components/molecules/SectionCard';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import PlayerSnapshotCard from '@/components/molecules/PlayerSnapshotCard';

type PlayerStats = {
  highestCash: number;
  highestOverall: number;
  distanceTraveled: number;
  passesGo: number;
  spentBuilding: number;
  spentRent: number;
  spentFees: number;
};

function tilePurchasePrice(tileId: string): number {
  const t = BOARD_TILES.find((x) => x.id === tileId);
  return t?.property?.purchasePrice ?? t?.railroad?.purchasePrice ?? t?.utility?.purchasePrice ?? 0;
}

function propertyValueForOwner(byTileId: PropertiesState['byTileId'], ownerId: string): number {
  let total = 0;
  for (const t of BOARD_TILES) {
    if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
    if (byTileId[t.id]?.ownerId !== ownerId) continue;
    total += tilePurchasePrice(t.id);
  }
  return total;
}

function currency(n: number): string {
  return `$${Math.round(n).toLocaleString()}`;
}

function ModalStatBlock({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-neutral-200 bg-surface-1 p-3 dark:border-neutral-700">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">{title}</h3>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

function ModalRow({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

function computePlayerStats(
  players: PlayerLite[],
  properties: PropertiesState,
  events: GameEvent[],
  snapshots: TimelineSnapshot[],
): Record<string, PlayerStats> {
  const byId: Record<string, PlayerStats> = {};
  for (const p of players) {
    const prop = propertyValueForOwner(properties.byTileId, p.id);
    byId[p.id] = {
      highestCash: p.money,
      highestOverall: p.money + prop,
      distanceTraveled: 0,
      passesGo: 0,
      spentBuilding: 0,
      spentRent: 0,
      spentFees: 0,
    };
  }

  // Peaks from persisted timeline snapshots.
  for (const snap of snapshots) {
    for (const p of snap.players.players) {
      if (!byId[p.id]) continue;
      const prop = propertyValueForOwner(snap.properties.byTileId, p.id);
      byId[p.id].highestCash = Math.max(byId[p.id].highestCash, p.money);
      byId[p.id].highestOverall = Math.max(byId[p.id].highestOverall, p.money + prop);
    }
  }

  // Spending on building from property-state deltas between snapshots.
  for (let i = 1; i < snapshots.length; i += 1) {
    const prev = snapshots[i - 1]!;
    const cur = snapshots[i]!;
    for (const t of BOARD_TILES) {
      if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
      const before = prev.properties.byTileId[t.id];
      const after = cur.properties.byTileId[t.id];
      if (!before || !after) continue;
      if (!after.ownerId || after.ownerId !== before.ownerId) continue;
      const ownerId = after.ownerId;
      if (!byId[ownerId]) continue;
      if (t.type === 'property' && (after.improvements ?? 0) > (before.improvements ?? 0)) {
        const inc = (after.improvements ?? 0) - (before.improvements ?? 0);
        byId[ownerId].spentBuilding += inc * (t.property?.houseCost ?? 0);
      }
      if (t.type === 'railroad' && before.depotInstalled !== true && after.depotInstalled === true) {
        byId[ownerId].spentBuilding += 100;
      }
    }
  }

  const cardById = new Map([...CHANCE, ...COMMUNITY_CHEST].map((c) => [c.id, c]));
  const snapshotByEventId = new Map(snapshots.map((s) => [s.afterEventId, s]));

  for (const ev of events) {
    const actor = ev.actorPlayerId;
    if (!actor || !byId[actor]) continue;

    if (ev.type === 'MOVE') {
      const dist = Number(ev.payload?.distance ?? 0);
      if (Number.isFinite(dist) && dist > 0) byId[actor].distanceTraveled += dist;
    } else if (ev.type === 'PASSED_GO') {
      const pid = (ev.payload?.playerId as string | undefined) ?? actor;
      if (byId[pid]) byId[pid].passesGo += 1;
    } else if (ev.type === 'RENT') {
      const from = ev.payload?.from as string | undefined;
      const amount = Number(ev.payload?.amount ?? 0);
      if (from && byId[from] && Number.isFinite(amount) && amount > 0) byId[from].spentRent += amount;
    } else if (ev.type === 'FEE') {
      const from = ev.payload?.from as string | undefined;
      const amount = Number(ev.payload?.amount ?? 0);
      if (from && byId[from] && Number.isFinite(amount) && amount > 0) byId[from].spentFees += amount;
    } else if (ev.type === 'CARD') {
      const cardId = ev.payload?.cardId as string | undefined;
      if (!cardId) continue;
      const def = cardById.get(cardId);
      if (!def) continue;
      if (def.effect.type === 'payBank') {
        byId[actor].spentFees += def.effect.amount;
      } else if (def.effect.type === 'payEachPlayer') {
        const snap = snapshotByEventId.get(ev.id);
        const playerCount = snap?.players.players.length ?? players.length;
        byId[actor].spentFees += def.effect.amountPerPlayer * Math.max(0, playerCount - 1);
      }
    }
  }

  return byId;
}

export interface PlayerFocusStripProps {
  players: PlayerLite[];
  properties: PropertiesState;
  events: GameEvent[];
  snapshots: TimelineSnapshot[];
  activePlayerId?: string | null;
  className?: string;
}

export default function PlayerFocusStrip({
  players,
  properties,
  events,
  snapshots,
  activePlayerId = null,
  className = '',
}: PlayerFocusStripProps): JSX.Element | null {
  const [openPlayerId, setOpenPlayerId] = useState<string | null>(null);
  const carouselRef = useRef<HTMLDivElement>(null);
  const suppressCarouselLayoutSyncRef = useRef(false);
  const scrollSyncTimerRef = useRef<number | null>(null);
  const snapshotHeaderElsRef = useRef(new Map<string, HTMLDivElement>());
  const [snapshotHeaderMinPx, setSnapshotHeaderMinPx] = useState(0);
  const reduceMotion = useReducedMotion();

  const setSnapshotHeaderMeasureRef = useCallback((playerId: string) => (node: HTMLDivElement | null) => {
    const m = snapshotHeaderElsRef.current;
    if (node) m.set(playerId, node);
    else m.delete(playerId);
  }, []);

  const recomputeSnapshotHeaderMinHeight = useCallback(() => {
    if (players.length < 2 || !openPlayerId) {
      setSnapshotHeaderMinPx(0);
      return;
    }
    let max = 0;
    for (const p of players) {
      const el = snapshotHeaderElsRef.current.get(p.id);
      if (el) max = Math.max(max, Math.ceil(el.getBoundingClientRect().height));
    }
    if (max > 0) setSnapshotHeaderMinPx(max);
  }, [players, openPlayerId]);

  const statsById = useMemo(
    () => computePlayerStats(players, properties, events, snapshots),
    [players, properties, events, snapshots],
  );
  const playerRefs = useMemo(() => players.map((p) => ({ id: p.id, nickname: p.nickname })), [players]);
  const gameStats = useMemo(() => computeGameStats(events, playerRefs), [events, playerRefs]);
  const liquidationPotentialById = useMemo(() => {
    const out: Record<string, number> = {};
    for (const p of players) out[p.id] = 0;
    for (const t of BOARD_TILES) {
      if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
      const ps = properties.byTileId[t.id];
      const owner = ps?.ownerId;
      if (!owner || out[owner] == null) continue;
      const base = t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0;
      const improvRefund = t.type === 'property' ? (ps?.improvements ?? 0) * ((t.property?.houseCost ?? 0) / 2) : 0;
      out[owner] += base + improvRefund;
    }
    return out;
  }, [players, properties.byTileId]);

  const openPlayer = players.find((p) => p.id === openPlayerId) ?? null;
  const openStats = openPlayer ? statsById[openPlayer.id] : null;
  const busEconomyByPlayerId = useMemo(() => {
    const o: Record<string, ReturnType<typeof computeBusTicketEconomy>> = {};
    for (const p of players) {
      o[p.id] = computeBusTicketEconomy(p.id, events, p.busTickets ?? 0);
    }
    return o;
  }, [players, events]);

  useLayoutEffect(() => {
    recomputeSnapshotHeaderMinHeight();
  }, [recomputeSnapshotHeaderMinHeight, properties.byTileId, players]);

  useEffect(() => {
    if (players.length < 2 || !openPlayerId) return;
    const ro = new ResizeObserver(() => {
      recomputeSnapshotHeaderMinHeight();
    });
    for (const p of players) {
      const el = snapshotHeaderElsRef.current.get(p.id);
      if (el) ro.observe(el);
    }
    return () => ro.disconnect();
  }, [players, openPlayerId, recomputeSnapshotHeaderMinHeight]);

  useEffect(() => {
    if (!openPlayerId) setSnapshotHeaderMinPx(0);
  }, [openPlayerId]);

  const goPrevPlayer = useCallback(() => {
    if (players.length < 2 || !openPlayerId) return;
    const i = players.findIndex((p) => p.id === openPlayerId);
    if (i < 0) return;
    const ni = (i - 1 + players.length) % players.length;
    const el = carouselRef.current;
    if (el) {
      suppressCarouselLayoutSyncRef.current = true;
      el.scrollTo({ left: ni * el.clientWidth, behavior: 'smooth' });
    }
    setOpenPlayerId(players[ni]!.id);
  }, [players, openPlayerId]);

  const goNextPlayer = useCallback(() => {
    if (players.length < 2 || !openPlayerId) return;
    const i = players.findIndex((p) => p.id === openPlayerId);
    if (i < 0) return;
    const ni = (i + 1) % players.length;
    const el = carouselRef.current;
    if (el) {
      suppressCarouselLayoutSyncRef.current = true;
      el.scrollTo({ left: ni * el.clientWidth, behavior: 'smooth' });
    }
    setOpenPlayerId(players[ni]!.id);
  }, [players, openPlayerId]);

  const goToPlayerIndex = useCallback(
    (i: number) => {
      const el = carouselRef.current;
      if (players.length > 1 && el) {
        suppressCarouselLayoutSyncRef.current = true;
        el.scrollTo({ left: i * el.clientWidth, behavior: 'smooth' });
      }
      const p = players[i];
      if (p) setOpenPlayerId(p.id);
    },
    [players],
  );

  useLayoutEffect(() => {
    if (suppressCarouselLayoutSyncRef.current) {
      suppressCarouselLayoutSyncRef.current = false;
      return;
    }
    const el = carouselRef.current;
    if (!el || players.length < 2 || !openPlayerId) return;
    const idx = players.findIndex((p) => p.id === openPlayerId);
    if (idx < 0) return;
    const w = el.clientWidth;
    if (w === 0) return;
    const target = idx * w;
    if (Math.abs(el.scrollLeft - target) > 2) {
      el.scrollTo({ left: target, behavior: 'instant' });
    }
  }, [openPlayerId, players]);

  const syncOpenPlayerFromScroll = useCallback(() => {
    const el = carouselRef.current;
    if (!el || players.length < 2) return;
    const w = el.clientWidth;
    if (!w) return;
    const idx = Math.max(0, Math.min(players.length - 1, Math.round(el.scrollLeft / w)));
    const p = players[idx];
    if (!p || p.id === openPlayerId) return;
    suppressCarouselLayoutSyncRef.current = true;
    setOpenPlayerId(p.id);
  }, [players, openPlayerId]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || players.length < 2) return;
    const onScroll = () => {
      if (scrollSyncTimerRef.current != null) window.clearTimeout(scrollSyncTimerRef.current);
      scrollSyncTimerRef.current = window.setTimeout(() => syncOpenPlayerFromScroll(), 60);
    };
    const onScrollEnd = () => syncOpenPlayerFromScroll();
    el.addEventListener('scroll', onScroll, { passive: true });
    el.addEventListener('scrollend', onScrollEnd as EventListener);
    return () => {
      if (scrollSyncTimerRef.current != null) window.clearTimeout(scrollSyncTimerRef.current);
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd as EventListener);
    };
  }, [players.length, syncOpenPlayerFromScroll, openPlayerId]);

  useEffect(() => {
    const el = carouselRef.current;
    if (!el || players.length < 2 || !openPlayerId) return;
    const ro = new ResizeObserver(() => {
      const idx = players.findIndex((p) => p.id === openPlayerId);
      if (idx < 0 || !carouselRef.current) return;
      suppressCarouselLayoutSyncRef.current = true;
      carouselRef.current.scrollTo({ left: idx * carouselRef.current.clientWidth, behavior: 'instant' });
    });
    ro.observe(el);
    return () => ro.disconnect();
  }, [openPlayerId, players]);

  useEffect(() => {
    if (!openPlayerId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'ArrowLeft') {
        e.preventDefault();
        goPrevPlayer();
      } else if (e.key === 'ArrowRight') {
        e.preventDefault();
        goNextPlayer();
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [openPlayerId, goPrevPlayer, goNextPlayer]);

  const closeStatsModal = useCallback(() => {
    setOpenPlayerId(null);
  }, []);

  const renderPlayerStatsSections = (p: PlayerLite) => {
    const s = statsById[p.id];
    const personal = gameStats.byPlayer[p.id];
    const busEco = busEconomyByPlayerId[p.id];
    if (!s) return null;
    return (
      <>
        <SectionCard className="p-3">
          <div className="grid grid-cols-2 gap-2 text-sm">
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Highest Cash</div>
              <div className="font-semibold">{currency(s.highestCash)}</div>
            </div>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Highest Overall Value</div>
              <div className="font-semibold">{currency(s.highestOverall)}</div>
            </div>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Distance Traveled</div>
              <div className="font-semibold">{s.distanceTraveled.toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Passed GO</div>
              <div className="font-semibold">{s.passesGo.toLocaleString()}</div>
            </div>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Spent Building</div>
              <div className="font-semibold">{currency(s.spentBuilding)}</div>
            </div>
            <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Spent Rent</div>
              <div className="font-semibold">{currency(s.spentRent)}</div>
            </div>
            <div className="col-span-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
              <div className="text-[11px] text-subtle">Spent Paying Fees</div>
              <div className="font-semibold">{currency(s.spentFees)}</div>
            </div>
          </div>
        </SectionCard>

        {personal && busEco ? (
          <>
            <ModalStatBlock title="Dice">
              <ModalRow label="Top roll totals" value={formatRollTopStats(personal.topRollTotals)} />
              <ModalRow label="Doubles (d6)" value={personal.doubles} />
              <ModalRow label="Triples (three match)" value={personal.triples} />
              <ModalRow label="1-1-1 jackpot rolls" value={personal.tripleOnes} />
            </ModalStatBlock>

            <ModalStatBlock title="Rent">
              <ModalRow
                label="Paid most to"
                value={
                  personal.paidMostTo
                    ? `${personal.paidMostTo.name} ($${personal.paidMostTo.amount.toLocaleString()})`
                    : '—'
                }
              />
              <ModalRow
                label="Received most from"
                value={
                  personal.receivedMostFrom
                    ? `${personal.receivedMostFrom.name} ($${personal.receivedMostFrom.amount.toLocaleString()})`
                    : '—'
                }
              />
            </ModalStatBlock>

            <ModalStatBlock title="Cards drawn">
              <ModalRow label="Chance" value={personal.cardsChance} />
              <ModalRow label="Community Chest" value={personal.cardsCommunity} />
              <ModalRow label="Bus deck" value={personal.cardsBus} />
            </ModalStatBlock>

            <ModalStatBlock title="Bus tickets">
              <div className="grid grid-cols-3 gap-2">
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-0 px-2 py-2 text-center dark:border-neutral-600">
                  <div className="text-[11px] text-subtle">Total</div>
                  <div className="font-semibold tabular-nums">{busEco.totalAcquired}</div>
                </div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-0 px-2 py-2 text-center dark:border-neutral-600">
                  <div className="text-[11px] text-subtle">Used</div>
                  <div className="font-semibold tabular-nums">{busEco.used}</div>
                </div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-0 px-2 py-2 text-center dark:border-neutral-600">
                  <div className="text-[11px] text-subtle">Lost</div>
                  <div className="font-semibold tabular-nums">{busEco.lostBigBus}</div>
                </div>
              </div>
              <p className="text-[11px] text-subtle pt-1">
                Total = held + used + lost (lifetime acquired). Used = teleports + tickets traded away. Lost = cleared
                when another player played Big Bus (logged in new games).
              </p>
            </ModalStatBlock>
          </>
        ) : null}
      </>
    );
  };

  if (players.length === 0) return null;

  return (
    <>
      <div data-cmp="m/PlayerFocusStrip" className={`relative z-10 w-full bg-surface-0 py-2 ${className}`}>
        <div className="overflow-x-auto sm:hidden">
          <div className="flex min-w-max gap-2 px-2">
            {players.map((p) => {
              const avatar = AVATARS.find((a) => a.key === p.avatarKey);
              const active = p.id === activePlayerId;
              return (
                <button
                  key={p.id}
                  type="button"
                  onClick={() => setOpenPlayerId(p.id)}
                  className={`w-[112px] shrink-0 rounded-xl border px-2 py-2 text-left transition ${
                    active
                      ? 'border-emerald-400/80 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.35),0_0_14px_rgba(16,185,129,0.2)] dark:border-emerald-400/60 dark:bg-emerald-900/20'
                      : 'border-neutral-200/80 bg-surface-1/80 opacity-90 dark:border-neutral-700/80'
                  }`}
                >
                  <div style={{ ['--player-color' as string]: p.color } as React.CSSProperties} className="flex justify-center pb-1">
                    <AvatarToken emoji={avatar?.emoji ?? '🙂'} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={40} />
                  </div>
                  <div className="truncate text-center text-xs font-semibold">{p.nickname}</div>
                  <div className="pt-0.5 text-center text-xs text-muted">{currency(p.money)}</div>
                </button>
              );
            })}
          </div>
        </div>

        <div className="hidden gap-2 sm:grid" style={{ gridTemplateColumns: `repeat(${Math.min(8, Math.max(1, players.length))}, minmax(0, 1fr))` }}>
          {players.map((p) => {
            const avatar = AVATARS.find((a) => a.key === p.avatarKey);
            const active = p.id === activePlayerId;
            return (
              <button
                key={p.id}
                type="button"
                onClick={() => setOpenPlayerId(p.id)}
                className={`rounded-xl border px-2 py-2 text-left transition ${
                  active
                    ? 'border-emerald-400/80 bg-emerald-50/60 shadow-[0_0_0_1px_rgba(16,185,129,0.3),0_0_12px_rgba(16,185,129,0.18)] dark:border-emerald-400/60 dark:bg-emerald-900/20'
                    : 'border-neutral-200/80 bg-surface-1/80 opacity-90 dark:border-neutral-700/80'
                }`}
              >
                <div style={{ ['--player-color' as string]: p.color } as React.CSSProperties} className="flex justify-center pb-1">
                  <AvatarToken emoji={avatar?.emoji ?? '🙂'} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={40} />
                </div>
                <div className="truncate text-center text-xs font-semibold">{p.nickname}</div>
                <div className="pt-0.5 text-center text-xs text-muted">{currency(p.money)}</div>
              </button>
            );
          })}
        </div>
      </div>

      {openPlayer && openStats ? (
        <div
          className="fixed inset-0 z-[120] flex min-h-0 items-center justify-center bg-black/55 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={openPlayer ? `Player stats for ${openPlayer.nickname}` : 'Player stats'}
          onClick={closeStatsModal}
        >
          <div
            className="relative flex h-[min(85vh,760px)] w-full max-w-lg min-h-0 flex-col overflow-hidden rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-surface-0 shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            <OverlayHeader
              title={openPlayer ? `${openPlayer.nickname} stats` : 'Player stats'}
              onClose={closeStatsModal}
              className="shrink-0 px-3 py-2 sm:px-4"
            />

            {players.length > 1 ? (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden">
                <div className="relative flex min-h-0 flex-1 flex-col overflow-hidden">
                  <div
                    ref={carouselRef}
                    data-qa="player-stats-carousel"
                    className="flex min-h-0 min-w-0 w-full flex-1 flex-row overflow-x-auto overflow-y-hidden overscroll-x-contain scroll-smooth snap-x snap-mandatory [-webkit-overflow-scrolling:touch] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
                  >
                    {players.map((p) => (
                      <div
                        key={p.id}
                        className="flex h-full min-h-0 min-w-full shrink-0 grow-0 basis-full snap-start snap-always flex-col overflow-hidden px-2"
                      >
                        <div
                          ref={setSnapshotHeaderMeasureRef(p.id)}
                          className="mb-1 flex min-h-0 shrink-0 flex-col px-0 pt-0 sm:px-0 sm:pt-0"
                          style={snapshotHeaderMinPx > 0 ? { minHeight: snapshotHeaderMinPx } : undefined}
                        >
                          <PlayerSnapshotCard
                            player={p}
                            properties={properties}
                            liquidationPotential={liquidationPotentialById[p.id] ?? 0}
                            showClose={false}
                            fillHeight={players.length >= 2}
                            className="min-h-0 flex-1"
                            onClose={closeStatsModal}
                          />
                        </div>
                        <div className="min-h-0 w-full min-w-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-y-contain [-webkit-overflow-scrolling:touch] pb-3 pt-2 sm:pb-4">
                          <div className="space-y-3">{renderPlayerStatsSections(p)}</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
                <LayoutGroup id="player-stats-carousel-dots">
                  <div
                    className="flex shrink-0 items-center justify-center gap-1.5 px-2 py-2"
                    role="tablist"
                    aria-label="Choose player"
                  >
                    {players.map((p, i) => {
                      const active = p.id === openPlayerId;
                      return (
                        <motion.button
                          key={p.id}
                          type="button"
                          role="tab"
                          aria-label={`Show stats for ${p.nickname}`}
                          aria-selected={active}
                          initial={false}
                          animate={{
                            width: active ? 24 : 8,
                            opacity: active ? 1 : 0.45,
                          }}
                          transition={
                            reduceMotion
                              ? { duration: 0.15, ease: 'easeOut' }
                              : { type: 'spring', stiffness: 380, damping: 28 }
                          }
                          whileTap={reduceMotion ? undefined : { scale: 0.88 }}
                          className={`h-2 shrink-0 rounded-full focus:outline-none focus-visible:ring-2 focus-visible:ring-fg/35 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-0 ${
                            active
                              ? 'bg-dot-active '
                              : ' bg-dot-inactive'
                          }`}
                          onClick={(e) => {
                            e.stopPropagation();
                            if (p.id === openPlayerId) return;
                            goToPlayerIndex(i);
                          }}
                        />
                      );
                    })}
                  </div>
                </LayoutGroup>
              </div>
            ) : (
              <div className="flex min-h-0 flex-1 flex-col overflow-hidden px-3 pb-3 pt-2 sm:px-4 sm:pb-4">
                {players[0] ? (
                  <>
                    <div className="shrink-0 pb-2">
                      <PlayerSnapshotCard
                        player={players[0]}
                        properties={properties}
                        liquidationPotential={liquidationPotentialById[players[0].id] ?? 0}
                        showClose={false}
                        onClose={closeStatsModal}
                      />
                    </div>
                    <div className="min-h-0 flex-1 basis-0 touch-pan-y overflow-y-auto overscroll-contain [-webkit-overflow-scrolling:touch]">
                      <div className="space-y-3">{renderPlayerStatsSections(players[0])}</div>
                    </div>
                  </>
                ) : null}
              </div>
            )}
          </div>
        </div>
      ) : null}
    </>
  );
}
