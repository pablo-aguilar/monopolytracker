import React from 'react';

export interface DrawnUndoButtonProps {
  onClick: () => void;
  /** Describes undo for screen readers (e.g. return card to deck). */
  'aria-label': string;
}

/** 40×40 circular control with a green check; tap returns to “draw” state. */
export default function DrawnUndoButton({ onClick, 'aria-label': ariaLabel }: DrawnUndoButtonProps): JSX.Element {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={ariaLabel}
      className="inline-flex absolute -top-1 -right-1 pl-1 h-[40px] w-[40px] shrink-0 items-center justify-center rounded-bl-full bg-emerald-600 text-white shadow-sm transition-colors hover:bg-emerald-700 focus:outline-none focus-visible:ring-2 focus-visible:ring-emerald-400 focus-visible:ring-offset-2 focus-visible:ring-offset-surface-2 dark:focus-visible:ring-offset-neutral-900"
    >
      <span className="text-xl font-semibold leading-none" aria-hidden>
        ✓
      </span>
    </button>
  );
}
