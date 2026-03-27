// #index
// - //#component: event list for recent actions (turn-grouped vertical timeline)

import React, { useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { IoMdMore } from 'react-icons/io';
import type { RootState } from '@/app/store';
import type { GameEvent } from '@/types/monopoly-schema';
import AvatarToken from '@/components/atoms/AvatarToken';
import Tooltip from '@/components/atoms/Tooltip';
import { AVATARS } from '@/data/avatars';

/** Shown in the timeline rail (local 24h, no seconds; hour never zero-padded, minutes always two digits). */
function formatTurnTimeShort(iso: string): string {
  const d = new Date(iso);
  const h = d.getHours();
  const m = d.getMinutes();
  return `${h}:${m.toString().padStart(2, '0')}`;
}

/** Full date + time for tooltip / screen readers. */
function formatTurnTimeFull(iso: string): string {
  return new Date(iso).toLocaleString(undefined, {
    weekday: 'long',
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
    second: '2-digit',
  });
}

export type EventLogProps = {
  /** Event ids that have a stored timeline snapshot (restore available). */
  restorableEventIds?: ReadonlySet<string>;
  onRequestRestore?: (eventId: string) => void;
  /** When true, grow to fill a flex parent and scroll the list (e.g. event log modal). */
  useFlexibleHeight?: boolean;
};

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

/** Same turn if both have turnSeq and they match; else legacy consecutive same turn owner heuristic. */
function sameTurnBoundary(prev: GameEvent, next: GameEvent): boolean {
  if (prev.turnSeq !== undefined && next.turnSeq !== undefined) {
    return prev.turnSeq === next.turnSeq;
  }
  if (prev.turnSeq !== undefined || next.turnSeq !== undefined) {
    return false;
  }
  const a = prev.turnPlayerId ?? resolveActorId(prev);
  const b = next.turnPlayerId ?? resolveActorId(next);
  return a !== undefined && a === b;
}

type TurnGroup = {
  key: string;
  events: GameEvent[];
  headerPlayerId?: string;
  startTimeIso: string;
};

function groupEventsIntoTurns(events: GameEvent[]): TurnGroup[] {
  const groups: TurnGroup[] = [];
  for (let i = 0; i < events.length; i++) {
    const ev = events[i];
    const prev = groups[groups.length - 1];
    if (prev && prev.events.length > 0 && sameTurnBoundary(prev.events[prev.events.length - 1], ev)) {
      prev.events.push(ev);
    } else {
      groups.push({
        key: ev.id,
        events: [ev],
        headerPlayerId: ev.turnPlayerId ?? resolveActorId(ev),
        startTimeIso: ev.createdAt,
      });
    }
  }
  return groups.map((g, idx) => ({
    ...g,
    key: `${g.key}-${idx}`,
  }));
}

function TurnRestoreMoreMenu({ events, onRequestRestore }: { events: GameEvent[]; onRequestRestore: (eventId: string) => void }): JSX.Element {
  const [open, setOpen] = useState(false);
  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-end',
    middleware: [offset(8), flip({ padding: 8 }), shift({ padding: 8 })],
    whileElementsMounted: autoUpdate,
  });
  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'dialog' });
  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  return (
    <>
      <button
        type="button"
        ref={refs.setReference}
        {...getReferenceProps()}
        className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-neutral-200 text-neutral-600 hover:bg-neutral-100 dark:border-neutral-600 dark:text-neutral-300 dark:hover:bg-neutral-800"
        aria-label="Restore and other actions for this turn"
      >
        <IoMdMore className="h-5 w-5" aria-hidden />
      </button>
      {open && (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            {...getFloatingProps()}
            className="z-[100] w-max max-w-[min(18rem,calc(100vw-2rem))] rounded-md border border-neutral-200 bg-neutral-900 p-2 text-white shadow-lg dark:border-neutral-600"
          >
            <p className="mb-2 border-b border-white/10 pb-1.5 text-[10px] font-semibold uppercase tracking-wide text-white/70">Restore</p>
            <ul className="flex flex-col gap-1" role="list">
              {events.map((ev) => (
                <li key={ev.id}>
                  <button
                    type="button"
                    className="w-full rounded px-2 py-1.5 text-left text-[11px] font-semibold text-amber-200 hover:bg-white/10"
                    onClick={() => {
                      onRequestRestore(ev.id);
                      setOpen(false);
                    }}
                  >
                    Restore to here
                    <span className="mt-0.5 block font-normal text-white/70">{ev.type}</span>
                  </button>
                </li>
              ))}
            </ul>
          </div>
        </FloatingPortal>
      )}
    </>
  );
}

export default function EventLog({ restorableEventIds, onRequestRestore, useFlexibleHeight }: EventLogProps = {}): JSX.Element {
  const events = useSelector((s: RootState) => s.events.events);
  const players = useSelector((s: RootState) => s.players.players);

  const playerById = useMemo(() => new Map(players.map((p) => [p.id, p])), [players]);

  const turnGroups = useMemo(() => groupEventsIntoTurns(events), [events]);

  const renderPlayerChip = (playerId?: string, size: 18 | 22 = 18) => {
    if (!playerId) {
      return <span className="inline-flex items-center rounded-full border border-fg-subtle px-2 py-0.5 text-sm text-fg-subtle">Game</span>;
    }
    const p = playerById.get(playerId);
    if (!p) {
      return <span className="inline-flex items-center rounded-full border border-fg-subtle px-2 py-0.5 text-[11px] text-neutral-600 dark:text-neutral-300">{playerId}</span>;
    }
    const emoji = AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂';
    return (
      <div className="flex w-full items-center gap-4">
        <span style={{ ['--player-color' as any]: p.color } as React.CSSProperties}>
          <AvatarToken emoji={emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={size} />
        </span>
        <span className={`font-medium ${size >= 22 ? 'text-sm' : 'text-[11px]'}`}>{p.nickname ?? 'Player'}</span>
      </div>
    );
  };

  const renderTurnHeader = (headerPlayerId?: string) => {
    if (!headerPlayerId) {
      return <span className="text-sm font-semibold text-fg">Game</span>;
    }
    return <div className="flex items-center gap-2">{renderPlayerChip(headerPlayerId, 22)}</div>;
  };

  const listClass = useFlexibleHeight ? 'min-h-0 min-w-0 flex-1 overflow-y-auto overscroll-contain' : 'max-h-60 overflow-auto';
  const listShellClass = useFlexibleHeight ? 'flex min-h-0 min-w-0 flex-1 flex-col' : 'flex flex-col';

  return (
    <div
      data-qa="event-log"
      data-cmp="m/EventLog"
      className={`p-4 ${useFlexibleHeight ? 'flex min-h-0 min-w-0 flex-1 flex-col' : ''}`}
    >
      <div className={listShellClass}>
        {events.length > 0 && (
          <div className="flex shrink-0 gap-10">
            <div className="flex w-[3.25rem] shrink-0 justify-end sm:w-[3.5rem]">
              <span className="text-sm font-semibold uppercase tracking-wide text-subtle -mr-[18px] pb-2">
                Turn
              </span>
            </div>
            <div className="min-w-0 flex-1" />
          </div>
        )}
        <ol className={`text-sm ${listClass} ${useFlexibleHeight ? 'min-h-0 min-w-0' : ''}`} role="list">
          {events.length === 0 && <li className="opacity-70">No events yet.</li>}
          {turnGroups.map((group, gi) => {
            const isFirst = gi === 0;
            const isLast = gi === turnGroups.length - 1;
            const restorableInTurn =
              onRequestRestore != null
                ? group.events.filter((ev) => restorableEventIds?.has(ev.id) && ev.type !== 'REVERT_TO')
                : [];
            const turnSeq = group.events[0]?.turnSeq;
            const turnNumberLabel =
              turnSeq !== undefined ? String(turnSeq + 1) : String(gi + 1);
            const timeAria = `Turn ${turnNumberLabel}, ${formatTurnTimeFull(group.startTimeIso)}`;
            return (
              <li key={group.key} className="flex gap-1" role="listitem">
                <div className="flex w-[3.25rem] shrink-0 flex-col items-end justify-start pt-1 text-right text-[11px] leading-tight tabular-nums text-neutral-500 dark:text-neutral-400 sm:w-[3.5rem]">
                  <Tooltip
                    content={`Turn ${turnNumberLabel}\n${formatTurnTimeFull(group.startTimeIso)}`}
                    tapToShowMs={5000}
                  >
                    <time
                      dateTime={group.startTimeIso}
                      className="flex cursor-default flex-col items-end gap-0.5"
                      aria-label={timeAria}
                    >
                      <span className="text-xs font-semibold text-neutral-700 dark:text-neutral-200">{turnNumberLabel}</span>
                      <span>{formatTurnTimeShort(group.startTimeIso)}</span>
                    </time>
                  </Tooltip>
                </div>
                <div className="relative mt-1.5 flex w-5 shrink-0 flex-col items-center">
                  {!isFirst && (
                    <div
                      className="absolute left-1/2 top-0 h-4 w-px -translate-x-1/2 bg-neutral-200 dark:bg-neutral-700"
                      aria-hidden
                    />
                  )}
                  <div
                    className="relative z-10 my-0.5 h-2.5 w-2.5 shrink-0 rounded-full border-2 border-neutral-400 bg-white dark:border-neutral-500 dark:bg-neutral-900"
                    aria-hidden
                  />
                  {!isLast && (
                    <div
                      className="absolute left-1/2 top-[calc(0.25rem+10px)] bottom-0 w-px -translate-x-1/2 bg-neutral-200 dark:bg-neutral-700"
                      aria-hidden
                    />
                  )}
                </div>
                <div className="min-w-0 mb-4 flex flex-col bg-surface-1 rounded-lg">
                  <div data-qa="turn-header" className="mb-2 flex shrink-0 items-center  bg-surface-2 rounded-md pl-2 pr-1 py-1.5 m-1">
                    <div className="min-w-0 flex-1">{renderTurnHeader(group.headerPlayerId)}</div>
                    {restorableInTurn.length > 0 && onRequestRestore && (
                      <TurnRestoreMoreMenu events={restorableInTurn} onRequestRestore={onRequestRestore} />
                    )}
                  </div>
                  <ul className="space-y-2 p-2" role="list">
                    {group.events.map((ev) => {
                      const p = ev.payload ?? {};
                      const fromId = p.from as string | undefined;
                      const toId = p.to as string | undefined;
                      const showFromTo = ev.type === 'RENT' && fromId && toId;
                      return (
                        <li key={ev.id} data-qa={`event-${ev.type}`} className="min-w-0">
                          <div className="flex flex-wrap items-center gap-2">
                            {showFromTo && (
                              <>
                                {renderPlayerChip(fromId)}
                                <span className="opacity-50">→</span>
                                {renderPlayerChip(toId)}
                              </>
                            )}
                            <span className="font-medium">{ev.type}</span>
                            {typeof ev.moneyDelta === 'number' && ev.moneyDelta !== 0 && (
                              <span
                                className={`tabular-nums text-[11px] ${ev.moneyDelta > 0 ? 'text-emerald-700 dark:text-emerald-300' : 'text-rose-700 dark:text-rose-300'}`}
                              >
                                {ev.moneyDelta > 0 ? `+$${ev.moneyDelta}` : `-$${Math.abs(ev.moneyDelta)}`}
                              </span>
                            )}
                          </div>
                          <div className="mt-0.5 opacity-80 break-words">{String(p?.message ?? '')}</div>
                        </li>
                      );
                    })}
                  </ul>
                </div>
              </li>
            );
          })}
        </ol>
      </div>
    </div>
  );
}
