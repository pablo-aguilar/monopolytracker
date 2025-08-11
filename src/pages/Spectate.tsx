import React from 'react';
import { useParams } from 'react-router-dom';

export default function Spectate(): JSX.Element {
  const { shareCode } = useParams<{ shareCode: string }>();
  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-3xl space-y-4">
        <h1 className="text-2xl font-semibold">Spectate</h1>
        <p className="text-sm opacity-80">Share code: {shareCode}</p>
        <p className="text-sm opacity-80">Milestone 5: Live spectator view – placeholder</p>
      </div>
    </div>
  );
} 