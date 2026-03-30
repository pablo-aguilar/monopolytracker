import React from 'react';
import { FaCheck } from 'react-icons/fa';

export interface StepItem {
  id: 0 | 1 | 2;
  title: string;
  desc: React.ReactNode;
}

export interface StepNavigatorProps {
  items: StepItem[];
  activeStep: 0 | 1 | 2;
  highestStep: 0 | 1 | 2;
  onSelect: (step: 0 | 1 | 2) => void;
}

export default function StepNavigator({ items, activeStep, highestStep, onSelect }: StepNavigatorProps): JSX.Element {
  return (
    <div data-cmp="m/StepNavigator" className="  p-4">
      <div className="flex items-baseline px-2">
        {items.map((s, i) => {
          const status = s.id < activeStep ? 'done' : s.id === activeStep ? 'current' : 'upcoming';
          const clickable = s.id <= highestStep || s.id === activeStep;
          const isFirst = i === 0;
          const isLast = i === items.length - 1;
          const align = isFirst ? 'items-start text-left' : isLast ? 'items-end text-right' : 'items-center text-center';
          const justify = isFirst ? 'justify-start' : isLast ? 'justify-end' : 'justify-center';
          const midLeft = isFirst ? 'left-[16px]' : 'left-1/2';
          const midRight = isLast ? 'right-[16px]' : 'right-1/2';
          return (
            <div key={s.id} className={`flex-1 flex flex-col ${align}`}>
              <div className="text-sm text-subtle w-[32px] text-center font-medium mb-1.5 ">{s.title}</div>
              <div className={`relative w-full h-8 flex items-center text-lg ${justify}`}>
                {/* Baseline connectors (neutral) */}
                {i > 0 && (
                  <div className={`absolute left-0 ${midRight} h-1 bg-surface-1`} aria-hidden />
                )}
                {i < items.length - 1 && (
                  <div className={`absolute ${midLeft} right-0 h-1 bg-surface-1`} aria-hidden />
                )}
                {/* Progress connectors (green) up to current step edge */}
                {i > 0 && i <= activeStep && (
                  <div className={`absolute left-0 ${midRight} h-1 bg-emerald-500`} aria-hidden />
                )}
                {i < activeStep && (
                  <div className={`absolute ${midLeft} right-0 h-1 bg-emerald-500`} aria-hidden />
                )}
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onSelect(s.id)}
                  className={`relative z-10 inline-flex h-8 w-8 bg-surface-0 items-center font-bold justify-center rounded-full border-3 border-tint transition-colors ${
                    status === 'done'
                      ? 'bg-emerald-600! border-emerald-600! text-emerald-50'
                      : status === 'current'
                      ? 'bg-emerald-600! border-emerald-600! text-white ring-1 ring-emerald-500 ring-offset-3 ring-offset-white dark:ring-offset-neutral-900'
                      : 'text-subtle'
                  } ${!clickable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {status === 'done' ? <FaCheck className="h-3.5 w-3.5" aria-hidden /> : s.id + 1}
                </button>
              </div>
              <div className="text-base text-muted mt-2 min-h-4 px-1">{s.desc}</div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


