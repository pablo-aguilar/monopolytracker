// #index
// - //#imports: PlayConsole organism wrapper

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { Navigate } from 'react-router-dom';
import type { RootState } from '@/app/store';
import BoardFrame from '@/components/organisms/BoardFrame';
import PlayConsole from '@/components/organisms/PlayConsole';
import TileDetailsOverlay from '@/components/molecules/TileDetailsOverlay';
import PlayerFocusStrip from '@/components/molecules/PlayerFocusStrip';

export default function Play(): JSX.Element {
  const activeRole = sessionStorage.getItem('mt_active_role');
  const activeInviteCode = sessionStorage.getItem('mt_active_invite');
  if (activeRole === 'spectator') {
    return <Navigate to={activeInviteCode ? `/g/${activeInviteCode}` : '/setup'} replace />;
  }
  const [playMountKey, setPlayMountKey] = useState(0);
  const [playChromeHost, setPlayChromeHost] = useState<HTMLDivElement | null>(null);
  const [selectedTileIndex, setSelectedTileIndex] = useState<number | null>(null);
  const rimPlayers = useSelector((s: RootState) => s.players.players);
  const properties = useSelector((s: RootState) => s.properties);
  const events = useSelector((s: RootState) => s.events.events);
  const snapshots = useSelector((s: RootState) => s.timeline.snapshots);
  const turnIndexRaw = useSelector((s: RootState) => (s as any).session?.turnIndex);
  const turnIndex = typeof turnIndexRaw === 'number' && turnIndexRaw >= 0 ? turnIndexRaw : 0;
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
  return (
    <div data-qa="play-page" className="relative flex min-h-dvh flex-col bg-surface-0 text-fg">
      <div
        role="region"
        aria-label="Game summary"
        ref={setPlayChromeHost}
        className="relative z-10 w-full shrink-0 bg-surface-0 px-2.5 pt-2 pb-1 sm:px-6"
      />
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
        <PlayConsole
          key={playMountKey}
          playChromeHost={playChromeHost}
          onTimelineRestored={() => setPlayMountKey((k) => k + 1)}
        />
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