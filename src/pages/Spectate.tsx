// #index
// - //#imports: SpectatorDashboard wrapper page with share code header

import React from 'react';
import { useParams } from 'react-router-dom';
import SpectatorDashboard from '@/components/organisms/SpectatorDashboard';

export default function Spectate(): JSX.Element {
  const { shareCode } = useParams<{ shareCode: string }>();
  return (
    <div data-qa="spectate-page" className="min-h-dvh flex items-start justify-center p-6 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-6xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Spectator View</h1>
          <div className="text-sm opacity-80">Share code: {shareCode}</div>
        </div>
        <SpectatorDashboard />
      </div>
    </div>
  );
} 