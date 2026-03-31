import React from 'react';
import { FaCheck } from 'react-icons/fa';

export interface JailAttemptRibbonProps {
  attemptsCompleted: number; // 0..3
  maxAttempts?: 3 | 2 | 1;
}

export default function JailAttemptRibbon({ attemptsCompleted, maxAttempts = 3 }: JailAttemptRibbonProps): JSX.Element {
  const slots = Array.from({ length: maxAttempts }, (_, i) => i + 1);

  return (
    <div
      data-cmp="m/JailAttemptRibbon"
      className="grid w-full min-w-0 grid-cols-[1fr_minmax(0,66.666%)_1fr] items-center gap-x-2 p-2 pb-0"
    >
      <div className="min-w-0" aria-hidden />
      <div className="relative flex min-w-0 items-center justify-center gap-2">
        <div className="absolute -left-[30px] top-[8px] inline-flex shrink-0 items-center text-[14px] text-subtle leading-none">Jail</div>
        <div className="flex min-w-0 flex-1 items-center">
          {slots.map((idx) => {
            const status: 'done' | 'current' | 'upcoming' =
              idx <= attemptsCompleted ? 'done' : idx === attemptsCompleted + 1 ? 'current' : 'upcoming';

            const chipCl =
              status === 'done' || status === 'current'
                ? status === 'current'
                  ? 'bg-game-jail text-white dark:text-slate-900 border-game-jail ring-1 ring-[var(--game-jail)] ring-offset-3 ring-offset-white dark:ring-offset-neutral-900'
                  : 'bg-game-jail text-white dark:text-slate-900 border-game-jail'
                : 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-300 dark:border-neutral-700';

            const barAfterFilled = attemptsCompleted >= idx;

            return (
              <div
                key={idx}
                className={idx < maxAttempts ? 'flex min-w-0 flex-1 items-center' : 'flex shrink-0 items-center'}
              >
                <div
                  className={`relative z-10 inline-flex h-7 shrink-0 items-center justify-center rounded-full border px-2 ${chipCl}`}
                >
                  {status === 'done' ? <FaCheck className="h-3.5 w-3.5" aria-hidden /> : <span className="tabular-nums font-semibold">{idx}</span>}
                </div>
                {idx < maxAttempts && (
                  <div
                    className={`h-1 min-w-0 flex-1 ${barAfterFilled ? 'bg-game-jail' : 'bg-neutral-200 dark:bg-neutral-800'}`}
                    aria-hidden
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>
      <div className="min-w-0" aria-hidden />
    </div>
  );
}
