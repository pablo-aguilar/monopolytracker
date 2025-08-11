import React from 'react';
import { useParams } from 'react-router-dom';
import { useSelector } from 'react-redux';
import { selectSpectatorSummary, selectBankBuildingCounts } from '@/features/selectors/stats';

export default function Spectate(): JSX.Element {
  const { shareCode } = useParams<{ shareCode: string }>();
  const players = useSelector(selectSpectatorSummary);
  const bank = selectBankBuildingCounts();

  return (
    <div className="min-h-dvh flex items-start justify-center p-6 bg-white text-neutral-900 dark:bg-neutral-900 dark:text-neutral-100">
      <div className="w-full max-w-5xl space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-2xl font-semibold">Spectator View</h1>
          <div className="text-sm opacity-80">Share code: {shareCode}</div>
        </div>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Players</h2>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {players.map((p) => (
              <div key={p.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.nickname}</div>
                  <div className="text-sm">${p.money}</div>
                </div>
                <div className="mt-2 text-sm">
                  <div className="opacity-70">Owns {p.properties.length} properties</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="space-y-3">
          <h2 className="text-lg font-medium">Bank</h2>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4 text-sm grid grid-cols-2 gap-2">
            <div>Houses left: {bank.houses}</div>
            <div>Hotels left: {bank.hotels}</div>
          </div>
        </section>
      </div>
    </div>
  );
} 