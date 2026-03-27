// #index
// - //#imports: PlayConsole organism wrapper

import React, { useState } from 'react';
import PlayConsole from '@/components/organisms/PlayConsole';

export default function Play(): JSX.Element {
  const [playMountKey, setPlayMountKey] = useState(0);
  return (
    <div data-qa="play-page" className="relative min-h-dvh flex items-center justify-center p-2.5 sm:p-6 bg-surface-0 text-fg">
      <PlayConsole
        key={playMountKey}
        onTimelineRestored={() => setPlayMountKey((k) => k + 1)}
      />
    </div>
  );
} 