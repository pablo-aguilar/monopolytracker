import React from 'react';
import { Link } from 'react-router-dom';
import SlidingSegmentedControl from '@/components/molecules/SlidingSegmentedControl';
import AccountMenu from '@/components/molecules/AccountMenu';
import { supabaseAuthService, supabaseGameHistoryService, supabaseStatsService } from '@/services/supabase';
import type { GameSummary } from '@/services/contracts';
import type { PlayerProfile } from '@/services/contracts/types';
import { getSupabaseClient } from '@/lib/supabase';

type LeaderboardTab = 'live' | 'past' | 'players';

type AggregateRow = {
  profile_id: string | null;
  display_name: string | null;
  games_played: number | null;
  wins: number | null;
  average_placement: number | null;
};

type PlayerLeaderboardRow = {
  profileId: string;
  displayName: string;
  gamesPlayed: number;
  wins: number;
  averagePlacement: number | null;
};

function parseDate(value: string | null): Date | null {
  if (!value) return null;
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? null : d;
}

function formatDateTime(value: string | null): string {
  const date = parseDate(value);
  if (!date) return '—';
  return date.toLocaleString();
}

function formatDuration(startedAt: string | null, endedAt: string | null): string {
  const start = parseDate(startedAt);
  const end = parseDate(endedAt);
  if (!start || !end) return '—';
  const totalMinutes = Math.max(0, Math.round((end.getTime() - start.getTime()) / 60000));
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h <= 0) return `${m}m`;
  return `${h}h ${m}m`;
}

function sortByRecent(games: GameSummary[]): GameSummary[] {
  const getRank = (g: GameSummary): number => {
    const ended = parseDate(g.endedAt)?.getTime() ?? 0;
    const started = parseDate(g.startedAt)?.getTime() ?? 0;
    return Math.max(ended, started);
  };
  return [...games].sort((a, b) => getRank(b) - getRank(a));
}

export default function Leaderboard(): JSX.Element {
  const [tab, setTab] = React.useState<LeaderboardTab>('live');
  const [profile, setProfile] = React.useState<PlayerProfile | null>(null);
  const [games, setGames] = React.useState<GameSummary[]>([]);
  const [players, setPlayers] = React.useState<PlayerLeaderboardRow[]>([]);
  const [myLifetimeStats, setMyLifetimeStats] = React.useState<{
    gamesPlayed: number;
    wins: number;
    averagePlacement: number | null;
  } | null>(null);
  const [loading, setLoading] = React.useState(true);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    let cancelled = false;
    async function load(): Promise<void> {
      setLoading(true);
      setError(null);
      try {
        const me = await supabaseAuthService.getProfile();
        if (!me) throw new Error('Profile not found.');
        if (cancelled) return;
        setProfile(me);

        const [gameList, lifetime] = await Promise.all([
          supabaseGameHistoryService.listGamesForLeaderboard(250),
          supabaseStatsService.getLifetimeStats(me.id),
        ]);
        if (cancelled) return;
        setGames(sortByRecent(gameList));
        setMyLifetimeStats(
          lifetime
            ? {
                gamesPlayed: lifetime.gamesPlayed,
                wins: lifetime.wins,
                averagePlacement: lifetime.averagePlacement,
              }
            : null,
        );

        const supabase = getSupabaseClient();
        const { data: aggregates, error: aggregateError } = await supabase.rpc(
          'list_player_aggregates_for_leaderboard',
          { p_limit: 50 },
        );
        if (aggregateError) throw aggregateError;

        const rows = (aggregates ?? []) as AggregateRow[];

        if (cancelled) return;
        setPlayers(
          rows
            .filter((row) => !!row.profile_id)
            .map((row) => {
              const pid = row.profile_id as string;
              return {
                profileId: pid,
                displayName: row.display_name?.trim() ? row.display_name : `Player ${pid.slice(0, 6)}`,
                gamesPlayed: Number(row.games_played ?? 0),
                wins: Number(row.wins ?? 0),
                averagePlacement: row.average_placement ?? null,
              };
            }),
        );
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load leaderboard.');
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    void load();
    return () => {
      cancelled = true;
    };
  }, []);

  const liveGames = React.useMemo(
    () => games.filter((g) => g.status === 'in_progress' || g.status === 'lobby'),
    [games],
  );
  const pastGames = React.useMemo(() => games.filter((g) => g.status === 'finished'), [games]);

  return (
    <div className="relative min-h-dvh bg-surface-0 p-6 text-fg">
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <Link
          to="/setup"
          className="inline-flex items-center rounded-full border border-neutral-200 bg-white/90 px-3 py-2 text-xs font-semibold text-neutral-700 shadow-sm hover:bg-neutral-50 dark:border-neutral-700 dark:bg-neutral-900/90 dark:text-neutral-200 dark:hover:bg-neutral-800"
        >
          Back to setup
        </Link>
        <AccountMenu />
      </div>

      <div className="mx-auto w-full max-w-6xl space-y-4 pt-10 sm:pt-4">
        <div>
          <h1 className="text-3xl font-bold">Leaderboard</h1>
          <p className="mt-1 text-sm text-muted">Live games, past games, and player performance at a glance.</p>
        </div>

        <SlidingSegmentedControl<LeaderboardTab>
          className="w-full max-w-sm"
          value={tab}
          onChange={setTab}
          options={[
            { value: 'live', label: 'Live' },
            { value: 'past', label: 'Past' },
            { value: 'players', label: 'Players' },
          ]}
        />

        {loading ? (
          <div className="rounded-xl border border-surface-strong bg-surface-1 p-4 text-sm text-muted">Loading leaderboard...</div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {!loading && !error && tab === 'live' ? (
          <section className="space-y-3">
            {liveGames.length === 0 ? (
              <div className="rounded-xl border border-surface-strong bg-surface-1 p-4 text-sm text-muted">
                No live games right now.
              </div>
            ) : (
              <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                {liveGames.map((game) => (
                  <article key={game.id} className="rounded-xl border border-surface-strong bg-surface-1 p-4">
                    <div className="flex items-center justify-between gap-2">
                      <span className="text-sm font-semibold uppercase tracking-wide text-muted">{game.status === 'in_progress' ? 'In Progress' : 'Lobby'}</span>
                      <span className="rounded-full border border-surface-strong bg-surface-0 px-2 py-1 text-xs font-semibold">
                        {game.inviteCode}
                      </span>
                    </div>
                    <div className="mt-3 space-y-1 text-sm">
                      <p>Started: {formatDateTime(game.startedAt)}</p>
                      <p>Ended: {formatDateTime(game.endedAt)}</p>
                    </div>
                    <div className="mt-4 flex gap-2">
                      <Link
                        to={`/g/${game.inviteCode}`}
                        className="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white hover:bg-blue-700"
                      >
                        Spectate
                      </Link>
                      <Link
                        to={`/lobby/${game.inviteCode}`}
                        className="inline-flex items-center rounded-md border border-surface-strong px-3 py-2 text-sm font-medium"
                      >
                        Open Lobby
                      </Link>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        ) : null}

        {!loading && !error && tab === 'past' ? (
          <section className="overflow-hidden rounded-xl border border-surface-strong bg-surface-1">
            {pastGames.length === 0 ? (
              <div className="p-4 text-sm text-muted">No completed games found yet.</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="min-w-full text-left text-sm">
                  <thead className="border-b border-surface-strong bg-surface-0/70 text-xs uppercase tracking-wide text-muted">
                    <tr>
                      <th className="px-4 py-3">Code</th>
                      <th className="px-4 py-3">Ended</th>
                      <th className="px-4 py-3">Duration</th>
                      <th className="px-4 py-3">Winner</th>
                    </tr>
                  </thead>
                  <tbody>
                    {pastGames.map((game) => {
                      const isMeWinner = Boolean(profile && game.winnerProfileId === profile.id);
                      return (
                        <tr key={game.id} className="border-b border-surface-strong/80 last:border-b-0">
                          <td className="px-4 py-3 font-semibold">{game.inviteCode}</td>
                          <td className="px-4 py-3">{formatDateTime(game.endedAt)}</td>
                          <td className="px-4 py-3">{formatDuration(game.startedAt, game.endedAt)}</td>
                          <td className="px-4 py-3">{isMeWinner ? 'You' : game.winnerProfileId ? `Player ${game.winnerProfileId.slice(0, 6)}` : '—'}</td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </section>
        ) : null}

        {!loading && !error && tab === 'players' ? (
          <section className="space-y-3">
            <div className="rounded-xl border border-surface-strong bg-surface-1 p-4">
              <h2 className="text-sm font-semibold uppercase tracking-wide text-muted">Your lifetime stats</h2>
              <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-3">
                <div className="rounded-lg border border-surface-strong bg-surface-0 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted">Games</div>
                  <div className="mt-1 text-2xl font-bold">{myLifetimeStats?.gamesPlayed ?? 0}</div>
                </div>
                <div className="rounded-lg border border-surface-strong bg-surface-0 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted">Wins</div>
                  <div className="mt-1 text-2xl font-bold">{myLifetimeStats?.wins ?? 0}</div>
                </div>
                <div className="rounded-lg border border-surface-strong bg-surface-0 p-3">
                  <div className="text-xs uppercase tracking-wide text-muted">Avg placement</div>
                  <div className="mt-1 text-2xl font-bold">
                    {myLifetimeStats?.averagePlacement != null ? myLifetimeStats.averagePlacement.toFixed(2) : '—'}
                  </div>
                </div>
              </div>
            </div>

            <div className="overflow-hidden rounded-xl border border-surface-strong bg-surface-1">
              {players.length === 0 ? (
                <div className="p-4 text-sm text-muted">No player aggregates available yet.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="min-w-full text-left text-sm">
                    <thead className="border-b border-surface-strong bg-surface-0/70 text-xs uppercase tracking-wide text-muted">
                      <tr>
                        <th className="px-4 py-3">#</th>
                        <th className="px-4 py-3">Player</th>
                        <th className="px-4 py-3">Games</th>
                        <th className="px-4 py-3">Wins</th>
                        <th className="px-4 py-3">Win rate</th>
                        <th className="px-4 py-3">Avg placement</th>
                      </tr>
                    </thead>
                    <tbody>
                      {players.map((row, idx) => {
                        const winRate = row.gamesPlayed > 0 ? (row.wins / row.gamesPlayed) * 100 : 0;
                        const isMe = profile?.id === row.profileId;
                        return (
                          <tr key={row.profileId} className={`border-b border-surface-strong/80 last:border-b-0 ${isMe ? 'bg-blue-500/5' : ''}`}>
                            <td className="px-4 py-3 font-semibold">{idx + 1}</td>
                            <td className="px-4 py-3">
                              <span className={isMe ? 'font-semibold text-blue-700 dark:text-blue-300' : ''}>
                                {isMe ? `${row.displayName} (You)` : row.displayName}
                              </span>
                            </td>
                            <td className="px-4 py-3">{row.gamesPlayed}</td>
                            <td className="px-4 py-3">{row.wins}</td>
                            <td className="px-4 py-3">{winRate.toFixed(1)}%</td>
                            <td className="px-4 py-3">{row.averagePlacement != null ? row.averagePlacement.toFixed(2) : '—'}</td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
