import React from 'react';
import { motion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

export interface StepItem {
  id: 0 | 1 | 2 | 3;
  title: string;
  desc: React.ReactNode;
}

export interface StepNavigatorProps {
  items: StepItem[];
  activeStep: 0 | 1 | 2 | 3;
  highestStep: 0 | 1 | 2 | 3;
  onSelect: (step: 0 | 1 | 2 | 3) => void;
}

export default function StepNavigator({ items, activeStep, highestStep, onSelect }: StepNavigatorProps): JSX.Element {
  return (
    <div data-cmp="m/StepNavigator" className="  p-4">
      <div className="flex min-w-0 items-baseline px-2">
        {items.map((s, i) => {
          const status = s.id < activeStep ? 'done' : s.id === activeStep ? 'current' : 'upcoming';
          const clickable = s.id <= highestStep || s.id === activeStep;
          const isFirst = i === 0;
          const isLast = i === items.length - 1;
          const align = isFirst ? 'items-start text-left' : isLast ? 'items-end text-right' : 'items-center text-center';
          const justify = isFirst ? 'justify-start' : isLast ? 'justify-end' : 'justify-center';
          const midLeft = isFirst ? 'left-[16px]' : 'left-1/2';
          const midRight = isLast ? 'right-[16px]' : 'right-1/2';
          const isCardReveal = s.id === 3 && items.length === 4;
          return (
            <motion.div
              key={s.id}
              layout
              className={`min-w-0 flex-1 flex flex-col ${align}`}
              initial={isCardReveal ? { opacity: 0, scale: 0.82 } : false}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 26 }}
            >
              <div className="text-sm text-subtle w-[32px] text-center font-medium mb-1.5 ">{s.title}</div>
              <div className={`relative w-full h-8 flex items-center text-lg ${justify}`}>
                {/* Baseline connectors (neutral) */}
                {i > 0 && (
                  <div className={`absolute left-0 ${midRight} h-1 bg-surface-1`} aria-hidden />
                )}
                {i < items.length - 1 && (
                  <div className={`absolute ${midLeft} right-0 h-1 bg-surface-1`} aria-hidden />
                )}
                {/* Progress connectors up to current step edge */}
                {i > 0 && i <= activeStep && (
                  <div className={`absolute left-0 ${midRight} h-1 bg-neutral-500/55 dark:bg-white/35`} aria-hidden />
                )}
                {i < activeStep && (
                  <div className={`absolute ${midLeft} right-0 h-1 bg-neutral-500/55 dark:bg-white/35`} aria-hidden />
                )}
                <button
                  type="button"
                  disabled={!clickable}
                  onClick={() => clickable && onSelect(s.id)}
                  className={`relative z-10 inline-flex h-8 w-8 items-center font-bold justify-center rounded-full border-2 border-tint bg-surface-0 transition-colors ${
                    status === 'done'
                      ? '!border-white/75 !bg-neutral-950 !text-white dark:!border-white/80'
                      : status === 'current'
                      ? '!border-white !bg-neutral-950 !text-white ring-1 ring-white/35 ring-offset-2 ring-offset-white dark:!bg-neutral-950 dark:!border-white/90 dark:ring-white/25 dark:ring-offset-neutral-950'
                      : 'text-subtle'
                  } ${!clickable ? 'opacity-60 cursor-not-allowed' : ''}`}
                >
                  {status === 'done' ? <FaCheck className="h-3.5 w-3.5" aria-hidden /> : s.id + 1}
                </button>
              </div>
              <div className="text-base text-muted mt-2 min-h-4 px-1">{s.desc}</div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
}


