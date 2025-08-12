// #index
// - //#imports: PlayConsole organism wrapper

import React from 'react';
import PlayConsole from '@/components/organisms/PlayConsole';

export default function Play(): JSX.Element {
  return (
    <div data-qa="play-page" className="min-h-dvh flex items-center justify-center p-6 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <PlayConsole />
    </div>
  );
} 