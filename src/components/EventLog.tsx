import React from 'react';
import { useSelector } from 'react-redux';
import type { RootState } from '@/app/store';

export default function EventLog(): JSX.Element {
  const events = useSelector((s: RootState) => s.events.events);
  return (
    <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-4">
      <h3 className="text-base font-semibold mb-2">Event Log</h3>
      <ol className="space-y-1 text-sm max-h-60 overflow-auto">
        {events.length === 0 && <li className="opacity-70">No events yet.</li>}
        {events.map((ev) => (
          <li key={ev.id} className="flex items-start gap-2">
            <span className="opacity-60 tabular-nums">{new Date(ev.createdAt).toLocaleTimeString()}</span>
            <span className="font-medium">{ev.type}</span>
            <span className="opacity-80">{String(ev.payload?.message ?? '')}</span>
          </li>
        ))}
      </ol>
    </div>
  );
}
