// #index
// - //#imports: PlayConsole organism wrapper

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import BoardFrame from '@/components/organisms/BoardFrame';
import PlayConsole from '@/components/organisms/PlayConsole';

export default function Play(): JSX.Element {
  const [playMountKey, setPlayMountKey] = useState(0);
  const rimPlayers = useSelector((s: RootState) => s.players.players);
  const rimPlayersLite = useMemo(
    () => rimPlayers.map((p) => ({ id: p.id, positionIndex: p.positionIndex, color: p.color })),
    [rimPlayers],
  );
  return (
    <div data-qa="play-page" className="relative flex min-h-dvh flex-col bg-surface-0 text-fg">
      <BoardFrame size="sm" className="min-h-dvh flex-1" rimPlayers={rimPlayersLite}>
        <PlayConsole
          key={playMountKey}
          onTimelineRestored={() => setPlayMountKey((k) => k + 1)}
        />
      </BoardFrame>
    </div>
  );
} 