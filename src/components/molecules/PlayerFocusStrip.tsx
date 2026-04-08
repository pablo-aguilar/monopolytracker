import React, { useMemo, useState } from 'react';
import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayerLite } from '@/features/players/playersSlice';
import type { PropertiesState } from '@/features/properties/propertiesSlice';
import type { TimelineSnapshot } from '@/features/timeline/types';
import { BOARD_TILES } from '@/data/board';
import { CHANCE, COMMUNITY_CHEST } from '@/data/cards';
import { AVATARS } from '@/data/avatars';
import AvatarToken from '@/components/atoms/AvatarToken';
import AnimatedNumber from '@/components/atoms/AnimatedNumber';
import HudBadge from '@/components/atoms/HudBadge';
import { BsCashStack } from 'react-icons/bs';
import { TbBuildings } from 'react-icons/tb';
import { FaBusAlt } from 'react-icons/fa';
import CloseIconButton from '@/components/atoms/CloseIconButton';
import SectionCard from '@/components/molecules/SectionCard';

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
function abbreviateTileNameForHud(name: string): string {
  return name.replace(/\bAvenue\b/g, 'Ave');
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
  const statsById = useMemo(
    () => computePlayerStats(players, properties, events, snapshots),
    [players, properties, events, snapshots],
  );
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

  if (players.length === 0) return null;

  return (
    <>
      <div data-cmp="m/PlayerFocusStrip" className={`relative z-10 w-full border-b border-neutral-200/80 bg-surface-0 px-2.5 py-2 sm:px-6 dark:border-neutral-700/80 ${className}`}>
        <div className="overflow-x-auto sm:hidden">
          <div className="flex min-w-max gap-2">
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
          className="fixed inset-0 z-[120] flex items-center justify-center bg-black/55 p-3 sm:p-6"
          role="dialog"
          aria-modal="true"
          aria-label={`Player stats for ${openPlayer.nickname}`}
          onClick={() => setOpenPlayerId(null)}
        >
          <div
            className="w-full max-w-lg rounded-2xl border border-neutral-300 dark:border-neutral-700 bg-surface-0 p-3 shadow-2xl sm:p-4"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3">
              <div className="rounded-3xl border-2 border-neutral-200 dark:border-neutral-700 bg-surface-2">
                <div className="pl-2 py-1 pr-2 gap-2 relative bg-surface-1 flex flex-col rounded-t-3xl rounded-b-3xl">
                  <div className="absolute right-1.5 top-1.5 z-[1]">
                    <CloseIconButton onClick={() => setOpenPlayerId(null)} />
                  </div>
                  <div className="flex items-center gap-3 relative pr-8">
                    <div style={{ ['--player-color' as string]: openPlayer.color } as React.CSSProperties}>
                      <AvatarToken
                        emoji={AVATARS.find((a) => a.key === openPlayer.avatarKey)?.emoji ?? '🙂'}
                        borderColorClass="border-[color:var(--player-color)]"
                        ring
                        ringColorClass="ring-[color:var(--player-color)]"
                        size={36}
                      />
                    </div>
                    <div className="font-semibold flex flex-col text-fg">
                      <span>{openPlayer.nickname}</span>
                      <span className="text-sm font-normal text-muted">
                        {abbreviateTileNameForHud(BOARD_TILES[openPlayer.positionIndex]?.name ?? '—')} <span className=" text-subtle">{openPlayer.positionIndex}</span>
                      </span>
                    </div>
                    <div className="ml-auto inline-flex items-center gap-2 text-sm font-bold text-fg bg-surface-0 border border-surface-strong rounded-full px-3 py-2">
                      <span className="inline-flex items-center gap-1">
                        <BsCashStack className="h-4 w-4 text-emerald-600" aria-hidden />
                        <AnimatedNumber value={openPlayer.money} prefix="$" />
                      </span>
                      {(liquidationPotentialById[openPlayer.id] ?? 0) > 0 ? (
                        <span className="inline-flex items-center gap-1">
                          <TbBuildings className="h-4 w-4 text-sky-600" aria-hidden />
                          <AnimatedNumber value={liquidationPotentialById[openPlayer.id] ?? 0} prefix="$" />
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <div className="flex items-center gap-3 px-1 pb-1 text-sm text-muted">
                    <div className="flex shrink-0 items-center gap-3">
                      {((openPlayer.gojfChance ?? 0) + (openPlayer.gojfCommunity ?? 0) > 0) ? (
                        <HudBadge title="Get Out of Jail Free" icon={<span>⛓️‍💥</span>} count={(openPlayer.gojfChance ?? 0) + (openPlayer.gojfCommunity ?? 0)} />
                      ) : null}
                    </div>
                    <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                      {(openPlayer.busTickets ?? 0) > 0 ? (
                        <HudBadge title="Bus tickets" icon={<FaBusAlt className="h-3.5 w-3.5 text-game-bus" aria-hidden />} count={openPlayer.busTickets ?? 0} />
                      ) : null}
                      {(['brown', 'lightBlue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkBlue'] as const).map((g) => {
                        const owned = BOARD_TILES.filter((t) => t.type === 'property' && t.group === g && properties.byTileId[t.id]?.ownerId === openPlayer.id).length;
                        if (owned <= 0) return null;
                        return <HudBadge key={g} icon={<span>🏠</span>} count={owned} variant="pill" borderClassName="border-white" />;
                      })}
                      {(() => {
                        const rr = BOARD_TILES.filter((t) => t.type === 'railroad' && properties.byTileId[t.id]?.ownerId === openPlayer.id).length;
                        return rr > 0 ? <HudBadge title="Railroads owned" icon={<span>🚂</span>} count={rr} variant="pill" borderClassName="border-white" /> : null;
                      })()}
                      {(() => {
                        const util = BOARD_TILES.filter((t) => t.type === 'utility' && properties.byTileId[t.id]?.ownerId === openPlayer.id).length;
                        return util > 0 ? <HudBadge title="Utilities owned" icon={<span>🛠️</span>} count={util} variant="pill" borderClassName="border-white" /> : null;
                      })()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <SectionCard className="p-3">
              <div className="grid grid-cols-2 gap-2 text-sm">
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Highest Cash</div><div className="font-semibold">{currency(openStats.highestCash)}</div></div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Highest Overall Value</div><div className="font-semibold">{currency(openStats.highestOverall)}</div></div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Distance Traveled</div><div className="font-semibold">{openStats.distanceTraveled.toLocaleString()}</div></div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Times Around Board</div><div className="font-semibold">{openStats.passesGo.toLocaleString()}</div></div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Spent Building</div><div className="font-semibold">{currency(openStats.spentBuilding)}</div></div>
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5"><div className="text-[11px] text-subtle">Spent Rent</div><div className="font-semibold">{currency(openStats.spentRent)}</div></div>
                <div className="col-span-2 rounded-md border border-neutral-200 dark:border-neutral-700 bg-surface-1 px-2 py-1.5">
                  <div className="text-[11px] text-subtle">Spent Paying Fees</div>
                  <div className="font-semibold">{currency(openStats.spentFees)}</div>
                </div>
              </div>
            </SectionCard>
          </div>
        </div>
      ) : null}
    </>
  );
}
