import React from 'react';

export interface StepItem {
  id: 0 | 1 | 2;
  title: string;
  desc: string;
}

export interface StepNavigatorProps {
  items: StepItem[];
  activeStep: 0 | 1 | 2;
  highestStep: 0 | 1 | 2;
  onSelect: (step: 0 | 1 | 2) => void;
}

export default function StepNavigator({ items, activeStep, highestStep, onSelect }: StepNavigatorProps): JSX.Element {
  return (
    <div className="pb-2">
      <div className="flex items-center">
        {items.map((s, i) => {
          const status = s.id < activeStep ? 'done' : s.id === activeStep ? 'current' : 'upcoming';
          const clickable = s.id <= highestStep || s.id === activeStep;
          return (
            <div key={s.id} className="flex-1 flex flex-col items-center text-center">
              <div className="text-xs font-medium mb-1">{s.title}</div>
              <div className="relative w-full h-8 flex items-center justify-center">
                {/* Baseline connectors (neutral) */}
                {i > 0 && (
                  <div className="absolute left-0 right-1/2 h-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                )}
                {i < items.length - 1 && (
                  <div className="absolute left-1/2 right-0 h-1 bg-neutral-200 dark:bg-neutral-800" aria-hidden />
                )}
                {/* Progress connectors (green) up to current step edge */}
                {i > 0 && i <= activeStep && (
                  <div className="absolute left-0 right-1/2 h-1 bg-emerald-500" aria-hidden />
                )}
                {i < activeStep && (
                  <div className="absolute left-1/2 right-0 h-1 bg-emerald-500" aria-hidden />
                )}
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onSelect(s.id)}
                  className={`relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                    status === 'done'
                      ? 'bg-emerald-600 border-emerald-600 text-white'
                      : status === 'current'
                      ? 'bg-white dark:bg-neutral-900 border-emerald-500 text-emerald-600'
                      : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-400'
                  } ${!clickable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {status === 'done' ? '✓' : s.id + 1}
                </button>
              </div>
              <div className="text-[11px] opacity-70 mt-2 min-h-4 px-1">{s.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


