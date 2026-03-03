import React from 'react';
import { IoClose } from 'react-icons/io5';

export interface CloseIconButtonProps {
  onClick: () => void;
  ariaLabel?: string;
  className?: string;
}

export default function CloseIconButton({ onClick, ariaLabel = 'Close', className }: CloseIconButtonProps): JSX.Element {
  return (
    <button
      data-cmp="a/CloseIconButton"
      type="button"
      aria-label={ariaLabel}
      title={ariaLabel}
      onClick={onClick}
      className={`inline-flex items-center justify-center rounded-md p-1.5 text-neutral-700 dark:text-neutral-200 opacity-70 hover:opacity-100 hover:bg-neutral-100 dark:hover:bg-neutral-800 focus:outline-none focus:ring-2 focus:ring-emerald-400/50 ${className ?? ''}`}
    >
      <IoClose className="h-5 w-5" />
    </button>
  );
}

