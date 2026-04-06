// #index
// - //#imports: PlayConsole organism wrapper

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import BoardFrame from '@/components/organisms/BoardFrame';
import PlayConsole from '@/components/organisms/PlayConsole';

export default function Play(): JSX.Element {
  const [playMountKey, setPlayMountKey] = useState(0);
  const [playChromeHost, setPlayChromeHost] = useState<HTMLDivElement | null>(null);
  const rimPlayers = useSelector((s: RootState) => s.players.players);
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
        className="relative z-10 w-full shrink-0 border-b border-neutral-200/80 bg-surface-0 px-2.5 py-3 sm:px-6 dark:border-neutral-700/80"
      />
      <BoardFrame size="sm" className="min-h-0 flex-1" rimPlayers={rimPlayersLite}>
        <PlayConsole
          key={playMountKey}
          playChromeHost={playChromeHost}
          onTimelineRestored={() => setPlayMountKey((k) => k + 1)}
        />
      </BoardFrame>
    </div>
  );
} 