import React from 'react';
import { motion } from 'framer-motion';
import { FaCheck } from 'react-icons/fa';

type Variant = 'rose' | 'orange' | 'emerald' | 'blue' | 'bus' | 'slate';

export interface TogglePillButtonProps {
  label: React.ReactNode;
  active: boolean;
  onToggle: () => void;
  disabled?: boolean;
  variant?: Variant;
  shake?: boolean;
}

function classesFor(variant: Variant, active: boolean): string {
  // Light shadow only — active states use tint + border (not solid fills) so they don’t read like primary footer CTAs.
  const base = 'inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-semibold shadow-sm select-none w-full';
  if (active) {
    switch (variant) {
      case 'rose':
        return `${base} border border-rose-500/70 bg-rose-100 text-rose-900 dark:border-rose-400/50 dark:bg-rose-950/40 dark:text-rose-100`;
      case 'orange':
        return `${base} border border-orange-500/70 bg-orange-100 text-orange-900 dark:border-orange-400/55 dark:bg-orange-950/40 dark:text-orange-100`;
      case 'emerald':
        return `${base} border border-emerald-600/50 bg-emerald-50 text-emerald-900 dark:border-emerald-400/45 dark:bg-emerald-950/35 dark:text-emerald-100`;
      case 'blue':
        return `${base} border border-blue-500/70 bg-blue-100 text-blue-900 dark:border-blue-400/50 dark:bg-blue-950/40 dark:text-blue-100`;
      case 'bus':
        return `${base} border border-game-bus bg-violet-100 text-violet-900 dark:bg-violet-950/45 dark:text-violet-100`;
      default:
        return `${base} border border-slate-500/70 bg-slate-200 text-slate-900 dark:border-slate-400/50 dark:bg-slate-800 dark:text-slate-100`;
    }
  }
  switch (variant) {
    case 'rose':
      return `${base} bg-transparent border border-rose-500 text-rose-700 dark:text-rose-300 hover:bg-rose-50 dark:hover:bg-rose-900/30`;
    case 'orange':
      return `${base} bg-transparent border border-orange-500 text-orange-700 dark:text-orange-300 hover:bg-orange-50 dark:hover:bg-orange-900/30`;
    case 'emerald':
      return `${base} bg-transparent border border-emerald-500 text-emerald-700 dark:text-emerald-300 hover:bg-emerald-50 dark:hover:bg-emerald-900/30`;
    case 'blue':
      return `${base} bg-transparent border border-blue-500 text-blue-700 dark:text-blue-300 hover:bg-blue-50 dark:hover:bg-blue-900/30`;
    case 'bus':
      return `${base} bg-transparent border border-game-bus text-game-bus hover:bg-violet-50 dark:hover:bg-violet-950/40`;
    default:
      return `${base} bg-transparent border border-slate-500 text-slate-700 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-900/30`;
  }
}

export default function TogglePillButton({ label, active, onToggle, disabled, variant = 'slate', shake }: TogglePillButtonProps): JSX.Element {
  return (
    <motion.button
      type="button"
      data-cmp="a/TogglePillButton"
      disabled={disabled}
      onClick={onToggle}
      className={classesFor(variant, active)}
      animate={shake ? { x: [-4, 4, -3, 3, -2, 2, -1, 1, 0] } : undefined}
      transition={{ duration: 0.35 }}
    >
      {active && <FaCheck className="mr-1 h-3 w-3 shrink-0" aria-hidden />}
      {label}
    </motion.button>
  );
}


