import React from 'react';

export interface MortgageButtonProps {
  label: React.ReactNode;
  onClick: () => void;
  danger?: boolean; // use for Unmortgage emphasis
  disabled?: boolean;
  className?: string;
}

export default function MortgageButton({ label, onClick, danger = false, disabled = false, className }: MortgageButtonProps): JSX.Element {
  const base = 'rounded-md border px-2 py-1 text-xs text-fg bg-surface-tint-2';
  const variant = danger ? 'border-rose-500 text-rose-600' : 'border-zinc-300 text-zinc-700 dark:text-zinc-300';
  const disabledCls = disabled ? 'opacity-50 cursor-not-allowed' : '';
  return (
    <button data-cmp="a/MortgageButton" type="button" className={`${base} ${variant} ${disabledCls} ${className ?? ''}`} onClick={onClick} disabled={disabled}>
      {label}
    </button>
  );
}


