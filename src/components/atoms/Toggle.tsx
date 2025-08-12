// #index
// - //#component: accessible toggle switch (green when on)

import React from 'react';

export type ToggleProps = {
  checked: boolean;
  onChange: (next: boolean) => void;
  qa?: string;
};

export default function Toggle({ checked, onChange, qa }: ToggleProps): JSX.Element {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      data-qa={qa}
      onClick={() => onChange(!checked)}
      className={`${checked ? 'bg-teal-500 justify-end' : 'bg-neutral-400 justify-start'} relative inline-flex h-6 w-10 items-center rounded-full transition-all focus:outline-none focus:ring-2 focus:ring-teal-300`}
      title={checked ? 'On' : 'Off'}
    >
      <span className="mx-0.5 inline-block h-5 w-5 rounded-full bg-white shadow transition-transform" />
    </button>
  );
}
