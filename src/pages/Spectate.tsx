// #index
// - //#imports: Play-like board + strip for spectators; lobby status when waiting

import React, { useCallback, useEffect, useLayoutEffect, useMemo, useState } from 'react';
import { useParams } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import BoardFrame from '@/components/organisms/BoardFrame';
import TileDetailsOverlay from '@/components/molecules/TileDetailsOverlay';
import PlayerFocusStrip from '@/components/molecules/PlayerFocusStrip';
import { supabaseLobbyService } from '@/services/supabase';
import type { GameSummary, LobbyParticipant } from '@/services/contracts';
import { AVATARS } from '@/data/avatars';
import { getSupabaseClient } from '@/lib/supabase';
import { applyPersistedGameState, prepareSpectatorView } from '@/lib/spectator-hydrate';
import AccountMenu from '@/components/molecules/AccountMenu';
import type { AppDispatch, RootState } from '@/app/store';

export default function Spectate(): JSX.Element {
  const { shareCode } = useParams<{ shareCode: string }>();
  const dispatch = useDispatch<AppDispatch>();
  const [game, setGame] = useState<GameSummary | null>(null);
  const [participants, setParticipants] = useState<LobbyParticipant[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [snapshotReady, setSnapshotReady] = useState(false);

  const rimPlayers = useSelector((s: RootState) => s.players.players);
  const properties = useSelector((s: RootState) => s.properties);
  const events = useSelector((s: RootState) => s.events.events);
  const snapshots = useSelector((s: RootState) => s.timeline.snapshots);
  const turnIndexRaw = useSelector((s: RootState) => s.session?.turnIndex);
  const turnIndex = typeof turnIndexRaw === 'number' && turnIndexRaw >= 0 ? turnIndexRaw : 0;

  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);

  useLayoutEffect(() => {
    prepareSpectatorView(dispatch);
  }, [dispatch]);

  useEffect(() => {
    sessionStorage.setItem('mt_active_role', 'spectator');
    if (shareCode) sessionStorage.setItem('mt_active_invite', shareCode);
  }, [shareCode]);

  const hydrateFromRemote = useCallback(async (): Promise<boolean> => {
    if (!shareCode) return false;
    const snap = await supabaseLobbyService.fetchLiveSnapshotByInvite(shareCode);
    if (snap) {
      applyPersistedGameState(dispatch, snap);
      setSnapshotReady(true);
      return true;
    }
    return false;
  }, [shareCode, dispatch]);

  useEffect(() => {
    if (!shareCode) return;
    let cancelled = false;
    async function loadGame(): Promise<void> {
      if (!shareCode) return;
      setError(null);
      try {
        const foundGame = await supabaseLobbyService.getGameByInviteCode(shareCode);
        if (cancelled) return;
        setGame(foundGame);
        if (!foundGame) return;
        try {
          setParticipants(await supabaseLobbyService.listParticipants(foundGame.id));
        } catch {
          setParticipants([]);
        }
      } catch (err) {
        if (!cancelled) {
          setError(err instanceof Error ? err.message : 'Unable to load spectator data.');
        }
      }
    }
    void loadGame();
    return () => {
      cancelled = true;
    };
  }, [shareCode]);

  useEffect(() => {
    if (!shareCode || !game?.id) return;
    let cancelled = false;
    void (async () => {
      await hydrateFromRemote();
    })();

    const supabase = getSupabaseClient();
    const channel = supabase
      .channel(`game_live_snapshots:${game.id}`)
      .on(
        'postgres_changes',
        {
          event: '*',
          schema: 'public',
          table: 'game_live_snapshots',
          filter: `game_id=eq.${game.id}`,
        },
        () => {
          void hydrateFromRemote();
        },
      )
      .subscribe();

    const pollId = window.setInterval(() => {
      void hydrateFromRemote();
    }, 45_000);

    return () => {
      cancelled = true;
      void supabase.removeChannel(channel);
      window.clearInterval(pollId);
    };
  }, [shareCode, game?.id, hydrateFromRemote]);

  const ownerColorByTileId = useMemo(() => {
    const colorByTileId: Record<string, string | null> = {};
    for (const [tileId, ps] of Object.entries(properties.byTileId)) {
      if (!ps?.ownerId) {
        colorByTileId[tileId] = null;
        continue;
      }
      const owner = rimPlayers.find((p) => p.id === ps.ownerId);
      colorByTileId[tileId] = owner?.color ?? null;
    }
    return colorByTileId;
  }, [properties.byTileId, rimPlayers]);

  const improvementsByTileId = useMemo(() => {
    const byId: Record<string, number | undefined> = {};
    for (const [tileId, ps] of Object.entries(properties.byTileId)) {
      if (ps && ps.improvements > 0) byId[tileId] = ps.improvements;
    }
    return byId;
  }, [properties.byTileId]);

  const rimPlayersLite = useMemo(
    () => rimPlayers.map((p) => ({ id: p.id, positionIndex: p.positionIndex, color: p.color })),
    [rimPlayers],
  );

  const showLobbyPanel = game?.status === 'lobby';
  const waitingForSync = game?.status === 'in_progress' && !snapshotReady && rimPlayers.length === 0;

  return (
    <div data-qa="spectate-page" className="relative flex min-h-dvh flex-col bg-surface-0 text-fg">
      <header className="relative z-10 w-full shrink-0 border-b border-surface-strong bg-surface-0 px-2.5 pt-2 pb-2 sm:px-6">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h1 className="text-lg font-semibold">Spectating</h1>
          <div className="flex flex-wrap items-center gap-2 sm:gap-3">
            <div className="flex flex-wrap items-center gap-3 text-xs uppercase tracking-wide text-muted">
              <span>Code: {shareCode}</span>
              <span>{game?.status ?? '—'}</span>
            </div>
            <AccountMenu />
          </div>
        </div>
        {error ? <p className="mt-2 text-sm text-red-600">{error}</p> : null}
        {waitingForSync ? (
          <p className="mt-2 text-sm text-muted">Waiting for the host to sync the board…</p>
        ) : null}
      </header>

      {showLobbyPanel ? (
        <div className="border-b border-surface-strong px-2.5 py-3 sm:px-6">
          <div className="text-sm font-medium">Lobby</div>
          <div className="mt-2 space-y-2">
            {participants.map((p) => {
              const avatarKey = p.guestAvatarKey ?? 'hat';
              const avatar = AVATARS.find((a) => a.key === avatarKey);
              return (
                <div key={p.participantId} className="flex items-center justify-between text-sm">
                  <span className="inline-flex items-center gap-2">
                    <span>{avatar?.emoji ?? '🎲'}</span>
                    <span>{p.guestName ?? p.profileId ?? 'Player'}</span>
                  </span>
                  <span className={p.isReady ? 'text-emerald-600' : 'text-amber-600'}>
                    {p.isReady ? 'Ready' : 'Waiting'}
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      ) : null}

      <PlayerFocusStrip
        players={rimPlayers}
        properties={properties}
        events={events}
        snapshots={snapshots}
        activePlayerId={rimPlayers[turnIndex]?.id ?? rimPlayers[0]?.id ?? null}
      />
      <BoardFrame
        size="sm"
        className="min-h-0 flex-1"
        rimPlayers={rimPlayersLite}
        activeRimPlayerId={rimPlayers[turnIndex]?.id ?? rimPlayers[0]?.id ?? null}
        onTileClick={(tileIndex) => setSelectedTileIndex(tileIndex)}
        ownerColorByTileId={ownerColorByTileId}
        improvementsByTileId={improvementsByTileId}
      >
        <div
          className="flex min-h-[min(50dvh,420px)] flex-col items-center justify-center gap-2 p-4 text-center text-sm text-muted"
          aria-hidden
        >
          <p className="font-medium text-fg">Spectator view</p>
          <p className="max-w-md">Dice and game-master controls stay on the host&apos;s device.</p>
        </div>
      </BoardFrame>
      <TileDetailsOverlay
        open={selectedTileIndex != null}
        tileIndex={selectedTileIndex}
        onClose={() => setSelectedTileIndex(null)}
        players={rimPlayers}
        properties={properties}
        events={events}
      />
    </div>
  );
}
