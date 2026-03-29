import React, { useMemo, useState } from 'react';
import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayerLite } from '@/features/players/playersSlice';
import { computeGameStats } from '@/features/stats/computeGameStats';
import SegmentedControl from '@/components/molecules/SegmentedControl';

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

function formatRollTop(rows: { total: number; count: number }[]): string {
  if (rows.length === 0) return '—';
  return rows.map((r) => `${r.total}×${r.count}`).join(', ');
}

export default function GameStatsPanel({ events, players, useFlexibleHeight }: GameStatsPanelProps): JSX.Element {
  const [scope, setScope] = useState<'game' | 'personal'>('game');
  const [playerId, setPlayerId] = useState<string>(() => players[0]?.id ?? '');

  const refs = useMemo(() => players.map((p) => ({ id: p.id, nickname: p.nickname })), [players]);
  const stats = useMemo(() => computeGameStats(events, refs), [events, refs]);

  React.useEffect(() => {
    if (playerId && !players.some((p) => p.id === playerId)) {
      setPlayerId(players[0]?.id ?? '');
    }
  }, [players, playerId]);

  const personal = playerId ? stats.byPlayer[playerId] : null;
  const listClass = useFlexibleHeight ? 'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain p-4' : 'max-h-60 overflow-auto p-4';

  return (
    <div data-cmp="m/GameStatsPanel" className={useFlexibleHeight ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'flex flex-col'}>
      <div className="flex shrink-0 flex-wrap items-center gap-2 border-b border-neutral-200 px-4 py-2 dark:border-neutral-700">
        <SegmentedControl
          dense
          value={scope}
          onChange={setScope}
          options={[
            { value: 'game', label: 'Whole game' },
            { value: 'personal', label: 'Player' },
          ]}
        />
        {scope === 'personal' && (
          <select
            className="rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:border-neutral-600 dark:bg-neutral-900"
            value={playerId}
            onChange={(e) => setPlayerId(e.target.value)}
          >
            {players.map((p) => (
              <option key={p.id} value={p.id}>
                {p.nickname}
              </option>
            ))}
          </select>
        )}
      </div>

      <div className={listClass}>
        {scope === 'game' && (
          <div className="space-y-3">
            <StatBlock title="Dice & movement">
              <Row label="Top roll totals (all dice)" value={formatRollTop(stats.gameTopRollTotals)} />
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
        )}

        {scope === 'personal' && personal && (
          <div className="space-y-3">
            <StatBlock title="Dice">
              <Row label="Top roll totals" value={formatRollTop(personal.topRollTotals)} />
              <Row label="Doubles (d6)" value={personal.doubles} />
              <Row label="Triples (three match)" value={personal.triples} />
              <Row label="1-1-1 jackpot rolls" value={personal.tripleOnes} />
            </StatBlock>
            <StatBlock title="Board">
              <Row label="Passed GO" value={personal.passedGo} />
            </StatBlock>
            <StatBlock title="Rent">
              <Row
                label="Paid most to"
                value={
                  personal.paidMostTo ? `${personal.paidMostTo.name} ($${personal.paidMostTo.amount.toLocaleString()})` : '—'
                }
              />
              <Row
                label="Received most from"
                value={
                  personal.receivedMostFrom
                    ? `${personal.receivedMostFrom.name} ($${personal.receivedMostFrom.amount.toLocaleString()})`
                    : '—'
                }
              />
            </StatBlock>
            <StatBlock title="Cards drawn">
              <Row label="Chance" value={personal.cardsChance} />
              <Row label="Community Chest" value={personal.cardsCommunity} />
              <Row label="Bus deck" value={personal.cardsBus} />
            </StatBlock>
            <StatBlock title="Bus">
              <Row label="Tickets used (teleport)" value={personal.busTicketsUsed} />
            </StatBlock>
          </div>
        )}

        {scope === 'personal' && !personal && <p className="text-sm opacity-70">Select a player.</p>}
      </div>
    </div>
  );
}
