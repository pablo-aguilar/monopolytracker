import React from 'react';
import { Link } from 'react-router-dom';
import SlidingSegmentedControl from '@/components/molecules/SlidingSegmentedControl';
import AccountMenu from '@/components/molecules/AccountMenu';
import { supabaseAdminService } from '@/services/supabase';
import type { AdminGameRecord, AdminProfileRecord } from '@/services/contracts';

type AdminTab = 'games' | 'players';

function fmtDateTime(value: string | null): string {
  if (!value) return '—';
  const d = new Date(value);
  if (Number.isNaN(d.getTime())) return '—';
  return d.toLocaleString();
}

export default function Admin(): JSX.Element {
  const [tab, setTab] = React.useState<AdminTab>('games');
  const [isAdmin, setIsAdmin] = React.useState<boolean | null>(null);
  const [includeTrashed, setIncludeTrashed] = React.useState(false);
  const [games, setGames] = React.useState<AdminGameRecord[]>([]);
  const [profiles, setProfiles] = React.useState<AdminProfileRecord[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);
  const [busyKey, setBusyKey] = React.useState<string | null>(null);

  const refresh = React.useCallback(async (): Promise<void> => {
    setLoading(true);
    setError(null);
    try {
      const admin = await supabaseAdminService.isCurrentUserAdmin();
      setIsAdmin(admin);
      if (!admin) {
        setGames([]);
        setProfiles([]);
        return;
      }
      const [g, p] = await Promise.all([
        supabaseAdminService.listGames(includeTrashed, 400),
        supabaseAdminService.listProfiles(includeTrashed, 400),
      ]);
      setGames(g);
      setProfiles(p);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to load admin data.');
    } finally {
      setLoading(false);
    }
  }, [includeTrashed]);

  React.useEffect(() => {
    void refresh();
  }, [refresh]);

  async function runAction(actionKey: string, fn: () => Promise<void>): Promise<void> {
    setBusyKey(actionKey);
    setError(null);
    try {
      await fn();
      await refresh();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Admin action failed.');
    } finally {
      setBusyKey(null);
    }
  }

  const canAct = isAdmin === true && !loading;

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
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h1 className="text-3xl font-bold">Admin</h1>
            <p className="mt-1 text-sm text-muted">Moderate games and player profiles with soft-trash and restore actions.</p>
          </div>
          <label className="inline-flex items-center gap-2 rounded-md border border-surface-strong bg-surface-1 px-3 py-2 text-sm">
            <input
              type="checkbox"
              checked={includeTrashed}
              onChange={(e) => setIncludeTrashed(e.target.checked)}
              className="h-4 w-4"
            />
            Include trashed
          </label>
        </div>

        <SlidingSegmentedControl<AdminTab>
          className="w-full max-w-xs"
          dense
          value={tab}
          onChange={setTab}
          options={[
            { value: 'games', label: 'Games' },
            { value: 'players', label: 'Players' },
          ]}
        />

        {loading ? (
          <div className="rounded-xl border border-surface-strong bg-surface-1 p-4 text-sm text-muted">Loading admin data...</div>
        ) : null}
        {error ? (
          <div className="rounded-xl border border-red-300 bg-red-50 p-4 text-sm text-red-700 dark:border-red-900/60 dark:bg-red-950/40 dark:text-red-300">
            {error}
          </div>
        ) : null}

        {isAdmin === false ? (
          <div className="rounded-xl border border-amber-300 bg-amber-50 p-4 text-sm text-amber-800 dark:border-amber-800/70 dark:bg-amber-950/40 dark:text-amber-300">
            You are not an admin for this environment.
          </div>
        ) : null}

        {isAdmin && tab === 'games' ? (
          <section className="overflow-hidden rounded-xl border border-surface-strong bg-surface-1">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-surface-strong bg-surface-0/70 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Trashed</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {games.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-muted" colSpan={5}>
                        No games found.
                      </td>
                    </tr>
                  ) : (
                    games.map((g) => {
                      const keyBase = `game:${g.id}`;
                      const trashed = Boolean(g.trashedAt);
                      return (
                        <tr key={g.id} className={`border-b border-surface-strong/80 last:border-b-0 ${trashed ? 'bg-amber-500/5' : ''}`}>
                          <td className="px-4 py-3 font-semibold">{g.inviteCode}</td>
                          <td className="px-4 py-3">{g.status}</td>
                          <td className="px-4 py-3">{fmtDateTime(g.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div>{fmtDateTime(g.trashedAt)}</div>
                            {g.trashReason ? <div className="text-xs text-muted">{g.trashReason}</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {!trashed ? (
                                <button
                                  type="button"
                                  disabled={!canAct || busyKey === `${keyBase}:trash`}
                                  onClick={() => {
                                    const reason = window.prompt('Reason for trashing this game (optional):') ?? '';
                                    void runAction(`${keyBase}:trash`, () =>
                                      supabaseAdminService.trashGame(g.id, reason.trim() || undefined),
                                    );
                                  }}
                                  className="rounded-md border border-amber-500/60 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50 dark:text-amber-300"
                                >
                                  Move to Trash
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={!canAct || busyKey === `${keyBase}:restore`}
                                    onClick={() =>
                                      void runAction(`${keyBase}:restore`, () => supabaseAdminService.restoreGame(g.id))
                                    }
                                    className="rounded-md border border-emerald-500/60 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canAct || busyKey === `${keyBase}:delete`}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `Permanently delete game ${g.inviteCode}? This cannot be undone.`,
                                      );
                                      if (!confirmed) return;
                                      void runAction(`${keyBase}:delete`, () =>
                                        supabaseAdminService.deleteGamePermanently(g.id),
                                      );
                                    }}
                                    className="rounded-md border border-red-500/70 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-300"
                                  >
                                    Delete Permanently
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}

        {isAdmin && tab === 'players' ? (
          <section className="overflow-hidden rounded-xl border border-surface-strong bg-surface-1">
            <div className="overflow-x-auto">
              <table className="min-w-full text-left text-sm">
                <thead className="border-b border-surface-strong bg-surface-0/70 text-xs uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Player</th>
                    <th className="px-4 py-3">Avatar</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Trashed</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {profiles.length === 0 ? (
                    <tr>
                      <td className="px-4 py-4 text-muted" colSpan={5}>
                        No players found.
                      </td>
                    </tr>
                  ) : (
                    profiles.map((p) => {
                      const keyBase = `profile:${p.id}`;
                      const trashed = Boolean(p.trashedAt);
                      return (
                        <tr key={p.id} className={`border-b border-surface-strong/80 last:border-b-0 ${trashed ? 'bg-amber-500/5' : ''}`}>
                          <td className="px-4 py-3">
                            <div className="font-semibold">{p.displayName}</div>
                            <div className="text-xs text-muted">{p.id}</div>
                          </td>
                          <td className="px-4 py-3">{p.avatarKey}</td>
                          <td className="px-4 py-3">{fmtDateTime(p.createdAt)}</td>
                          <td className="px-4 py-3">
                            <div>{fmtDateTime(p.trashedAt)}</div>
                            {p.trashReason ? <div className="text-xs text-muted">{p.trashReason}</div> : null}
                          </td>
                          <td className="px-4 py-3">
                            <div className="flex flex-wrap gap-2">
                              {!trashed ? (
                                <button
                                  type="button"
                                  disabled={!canAct || busyKey === `${keyBase}:trash`}
                                  onClick={() => {
                                    const reason = window.prompt('Reason for trashing this player (optional):') ?? '';
                                    void runAction(`${keyBase}:trash`, () =>
                                      supabaseAdminService.trashProfile(p.id, reason.trim() || undefined),
                                    );
                                  }}
                                  className="rounded-md border border-amber-500/60 px-2 py-1 text-xs font-semibold text-amber-700 disabled:opacity-50 dark:text-amber-300"
                                >
                                  Move to Trash
                                </button>
                              ) : (
                                <>
                                  <button
                                    type="button"
                                    disabled={!canAct || busyKey === `${keyBase}:restore`}
                                    onClick={() =>
                                      void runAction(`${keyBase}:restore`, () => supabaseAdminService.restoreProfile(p.id))
                                    }
                                    className="rounded-md border border-emerald-500/60 px-2 py-1 text-xs font-semibold text-emerald-700 disabled:opacity-50 dark:text-emerald-300"
                                  >
                                    Restore
                                  </button>
                                  <button
                                    type="button"
                                    disabled={!canAct || busyKey === `${keyBase}:delete`}
                                    onClick={() => {
                                      const confirmed = window.confirm(
                                        `Permanently delete player "${p.displayName}"? This cannot be undone.`,
                                      );
                                      if (!confirmed) return;
                                      void runAction(`${keyBase}:delete`, () =>
                                        supabaseAdminService.deleteProfilePermanently(p.id),
                                      );
                                    }}
                                    className="rounded-md border border-red-500/70 px-2 py-1 text-xs font-semibold text-red-700 disabled:opacity-50 dark:text-red-300"
                                  >
                                    Delete Permanently
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      );
                    })
                  )}
                </tbody>
              </table>
            </div>
          </section>
        ) : null}
      </div>
    </div>
  );
}
