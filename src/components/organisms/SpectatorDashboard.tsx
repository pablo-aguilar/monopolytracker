// #index
// - //#imports: hooks and selectors for spectator data
// - //#render: spectator dashboard (players, bank, unowned, most landed, groups)

// //#imports
import React from 'react';
import { useSelector } from 'react-redux';
import { selectSpectatorSummary, selectBankBuildingCounts, selectPlayerPropertyDetails, selectUnownedProperties, selectColorGroupOwnership, selectMostLandedTile } from '@/features/selectors/stats';

export default function SpectatorDashboard(): JSX.Element {
  const players = useSelector(selectSpectatorSummary);
  const playerDetails = useSelector(selectPlayerPropertyDetails);
  const bank = useSelector(selectBankBuildingCounts);
  const unowned = useSelector(selectUnownedProperties);
  const groupOwnership = useSelector(selectColorGroupOwnership);
  const mostLanded = useSelector(selectMostLandedTile);

  // //#render
  return (
    <div className="w-full max-w-6xl space-y-6">
      {/* //#spectate-players: money and owned properties preview per player */}
      <section data-qa="spectate-players" className="space-y-3">
        <h2 className="text-lg font-medium">Players</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {players.map((p) => {
            const detail = playerDetails.find((d) => d.playerId === p.id);
            return (
              <div key={p.id} className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold">{p.nickname}</div>
                  <div className="text-sm">${p.money}</div>
                </div>
                <div className="mt-2 text-sm space-y-1">
                  <div className="opacity-70">Owns {p.properties.length} properties</div>
                  <ul className="list-disc pl-5">
                    {detail?.properties.slice(0, 6).map((prop) => (
                      <li key={prop.id} data-qa={`prop-${prop.id}`}>
                        {prop.name}
                        {prop.mortgaged ? ' (M)' : ''}
                        {prop.improvements > 0 ? ` (+${prop.improvements >= 5 ? 'Hotel' : prop.improvements})` : ''}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            );
          })}
        </div>
      </section>

      {/* //#spectate-panels: bank status, unowned properties, most landed */}
      <section className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div data-qa="spectate-bank" className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <h2 className="text-lg font-medium">Bank</h2>
          <div className="text-sm grid grid-cols-2 gap-2">
            <div>Houses left: {bank.houses}</div>
            <div>Hotels left: {bank.hotels}</div>
          </div>
        </div>
        <div data-qa="spectate-unowned" className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <h2 className="text-lg font-medium">Unowned</h2>
          <ul className="text-sm max-h-40 overflow-auto space-y-1">
            {unowned.map((t) => (
              <li key={t.id}>{t.name}</li>
            ))}
          </ul>
        </div>
        <div data-qa="spectate-most-landed" className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
          <h2 className="text-lg font-medium">Most Landed</h2>
          <div className="text-sm">{mostLanded ? `${mostLanded.name} (${mostLanded.count})` : '—'}</div>
        </div>
      </section>

      {/* //#spectate-groups: color set ownership summary */}
      <section data-qa="spectate-groups" className="space-y-3 rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
        <h2 className="text-lg font-medium">Color Group Ownership</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
          {Object.entries(groupOwnership).map(([group, info]) => (
            <div key={group} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-3">
              <div className="font-semibold mb-1">{group}</div>
              <div>Total: {info.total}</div>
              <div className="mt-2">
                Owners:
                <ul className="list-disc pl-5">
                  {Object.entries(info.owners).map(([ownerId, count]) => (
                    <li key={ownerId}>
                      {ownerId}: {count}
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
