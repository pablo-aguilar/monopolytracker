// #index
// - //#imports: PlayConsole organism wrapper

import React from 'react';
import PlayConsole from '@/components/organisms/PlayConsole';
import SettingsGear from '@/components/molecules/SettingsGear';

export default function Play(): JSX.Element {
  return (
    <div data-qa="play-page" className="relative min-h-dvh flex items-center justify-center p-6 bg-surface-0 text-fg">
      <SettingsGear className="absolute top-4 right-4" />
      <PlayConsole />
    </div>
  );
} 