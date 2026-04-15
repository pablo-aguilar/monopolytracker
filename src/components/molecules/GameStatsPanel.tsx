import React, { useMemo } from 'react';
import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayerLite } from '@/features/players/playersSlice';
import { computeGameStats, formatRollTopStats } from '@/features/stats/computeGameStats';

export interface GameStatsPanelProps {
  events: GameEvent[];
  players: PlayerLite[];
  useFlexibleHeight?: boolean;
}

function StatBlock({ title, children }: { title: string; children: React.ReactNode }): JSX.Element {
  return (
    <section className="rounded-lg border border-neutral-200 bg-surface-1 p-3 dark:border-neutral-700">
      <h3 className="mb-2 text-xs font-bold uppercase tracking-wide text-subtle">{title}</h3>
      <div className="space-y-1.5 text-sm">{children}</div>
    </section>
  );
}

function Row({ label, value }: { label: string; value: React.ReactNode }): JSX.Element {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-x-2 gap-y-0.5">
      <span className="text-neutral-600 dark:text-neutral-400">{label}</span>
      <span className="text-right font-medium tabular-nums text-fg">{value}</span>
    </div>
  );
}

export default function GameStatsPanel({ events, players, useFlexibleHeight }: GameStatsPanelProps): JSX.Element {
  const refs = useMemo(() => players.map((p) => ({ id: p.id, nickname: p.nickname })), [players]);
  const stats = useMemo(() => computeGameStats(events, refs), [events, refs]);

  const listClass = useFlexibleHeight ? 'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4' : 'max-h-60 overflow-auto p-4';

  return (
    <div data-cmp="m/GameStatsPanel" className={useFlexibleHeight ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'flex flex-col'}>
      <div className={listClass}>
        <div className="space-y-3">
            <StatBlock title="Dice & movement">
              <Row label="Top roll totals (all dice)" value={formatRollTopStats(stats.gameTopRollTotals)} />
              <p className="text-[11px] opacity-70">Most common sums of one roll (value×how often). New games log each roll in the timeline.</p>
              <Row label="Table rounds (turn cycles)" value={stats.tableRounds} />
            </StatBlock>
            <StatBlock title="Money & rent">
              <Row label="Total rent paid (tracked)" value={`$${stats.totalRentPaid.toLocaleString()}`} />
              <Row
                label="Bank / Free Parking / jackpot / +card cash"
                value={`$${stats.moneyWonBankParkingJackpotCards.toLocaleString()}`}
              />
              <p className="text-[11px] opacity-70">PASSED_GO, FREE_PARKING_WIN, JACKPOT_111, and CARD events with positive cash.</p>
            </StatBlock>
            <StatBlock title="Landings">
              <Row
                label="Hot tiles (MOVE arrivals)"
                value={
                  stats.topLandedTiles.length ? (
                    <span className="block max-w-[16rem] text-right text-xs leading-snug">
                      {stats.topLandedTiles.map((t) => `${t.name} (${t.count})`).join(' · ')}
                    </span>
                  ) : (
                    '—'
                  )
                }
              />
            </StatBlock>
            <StatBlock title="Bus tickets">
              {stats.busTicketsUsedByPlayer.length === 0 ? (
                <p className="text-xs opacity-70">No bus ticket uses logged yet (teleport consumes a ticket and logs here).</p>
              ) : (
                stats.busTicketsUsedByPlayer.map((u) => (
                  <Row key={u.playerId} label={u.name} value={u.count} />
                ))
              )}
            </StatBlock>
        </div>
      </div>
    </div>
  );
}
