import React from 'react';

export interface JailAttemptRibbonProps {
  attemptsCompleted: number; // 0..3
  maxAttempts?: 3 | 2 | 1;
}

export default function JailAttemptRibbon({ attemptsCompleted, maxAttempts = 3 }: JailAttemptRibbonProps): JSX.Element {
  const items = Array.from({ length: maxAttempts }, (_, i) => i + 1);
  const chip = (idx: number) => {
    const status: 'done' | 'current' | 'upcoming' = idx <= attemptsCompleted ? 'done' : idx === attemptsCompleted + 1 ? 'current' : 'upcoming';
    const cl = status === 'done'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : status === 'current'
      ? 'bg-white dark:bg-neutral-900 text-emerald-700 border-emerald-500'
      : 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-300 dark:border-neutral-700';
    return (
      <div key={idx} className="relative flex-1 flex items-center">
        {idx > 1 && (
          <div className={`absolute left-0 right-1/2 h-1 ${status !== 'upcoming' ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} aria-hidden />
        )}
        <div className={`relative z-10 inline-flex items-center justify-center h-7 rounded-full border px-2 ${cl}`}>
          {status === 'done' ? '✓' : idx}
        </div>
        {idx < maxAttempts && (
          <div className={`absolute left-1/2 right-0 h-1 ${idx <= attemptsCompleted ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} aria-hidden />
        )}
      </div>
    );
  };
  return (
    <div className="w-full">
      <div className="flex items-center gap-2">
        {items.map(chip)}
      </div>
    </div>
  );
}


