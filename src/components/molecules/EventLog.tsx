// #index
// - //#component: event list for recent actions

import React, { useMemo } from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';
import type { GameEvent } from '@/types/monopoly-schema';
import AvatarToken from '@/components/atoms/AvatarToken';
import { AVATARS } from '@/data/avatars';

function resolveActorId(ev: GameEvent): string | undefined {
  const p = ev.payload ?? {};
  return (
    ev.actorPlayerId ||
    p.playerId ||
    p.ownerId ||
    p.from ||
    undefined
  );
}

export default function EventLog(): JSX.Element {
  const events = useSelector((s: RootState) => s.events.events);
  const players = useSelector((s: RootState) => s.players.players);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const renderPlayerChip = (playerId?: string) => {
    if (!playerId) {
      return <span className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">GM</span>;
    }
    const p = playerById.get(playerId);
    if (!p) {
      return <span className="inline-flex items-center rounded-full border border-neutral-300 dark:border-neutral-700 px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">{playerId}</span>;
    }
    const emoji = AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂';
    return (
      <span className="inline-flex items-center gap-1.5">
        <span style={{ ['--player-color' as any]: p.color } as React.CSSProperties}>
          <AvatarToken emoji={emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={18} />
        </span>
        <span className="text-[11px] font-medium">{p.nickname ?? 'Player'}</span>
      </span>
    );
  };

  return (
    <div data-qa="event-log" data-cmp="m/EventLog" className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-base font-semibold mb-2">Event Log</h3>
      <ol className="space-y-2 text-sm max-h-60 overflow-auto">
        {events.length === 0 && <li className="opacity-70">No events yet.</li>}
        {events.map((ev) => {
          const p = ev.payload ?? {};
          const actorId = resolveActorId(ev);
          const fromId = p.from as string | undefined;
          const toId = p.to as string | undefined;
          const showFromTo = ev.type === 'RENT' && fromId && toId;
          return (
            <li key={ev.id} data-qa={`event-${ev.type}`} className="flex items-start gap-3">
              <span className="opacity-60 tabular-nums shrink-0">{new Date(ev.createdAt).toLocaleTimeString()}</span>
              <div className="min-w-0 flex-1">
                <div className="flex items-center gap-2 flex-wrap">
                  {showFromTo ? (
                    <>
                      {renderPlayerChip(fromId)}
                      <span className="opacity-50">→</span>
                      {renderPlayerChip(toId)}
                    </>
                  ) : (
                    renderPlayerChip(actorId)
                  )}
                  <span className="font-medium">{ev.type}</span>
                  {typeof ev.moneyDelta === 'number' && ev.moneyDelta !== 0 && (
                    <span className={`tabular-nums text-[11px] ${ev.moneyDelta > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}>
                      {ev.moneyDelta > 0 ? `+$${ev.moneyDelta}` : `-$${Math.abs(ev.moneyDelta)}`}
                    </span>
                  )}
                </div>
                <div className="opacity-80 break-words">{String(p?.message ?? '')}</div>
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
