// #index
// - //#imports: PlayConsole organism wrapper

import React from 'react';
import PlayConsole from '@/components/organisms/PlayConsole';

export default function Play(): JSX.Element {
  return (
    <div data-qa="play-page" className="relative min-h-dvh flex items-center justify-center p-6 bg-surface-0 text-fg">
      <PlayConsole />
    </div>
  );
} 