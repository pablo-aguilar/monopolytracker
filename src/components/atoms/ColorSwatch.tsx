// #index
// - //#component: a single clickable color swatch with taken/selected states

import React from 'react';

export type ColorSwatchProps = {
  color: string;
  selected?: boolean;
  taken?: boolean;
  qa?: string; // data-qa override if needed
  onClick?: () => void;
};

export default function ColorSwatch({ color, selected = false, taken = false, qa, onClick }: ColorSwatchProps): JSX.Element {
  // //#component
  // WHY: atom used by color pickers and badges; disables interaction when taken (unless selected)
  return (
    <button
      type="button"
      data-qa={qa}
      disabled={taken && !selected}
      onClick={onClick}
      className={`h-10 w-full rounded-md border ${selected ? 'ring-2 ring-teal-300 border-teal-500' : 'border-neutral-300 dark:border-neutral-700'} ${taken && !selected ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}`}
      style={{ backgroundColor: color }}
      aria-pressed={selected}
      aria-label={`Color ${color}${taken && !selected ? ' (taken)' : ''}`}
    />
  );
}
