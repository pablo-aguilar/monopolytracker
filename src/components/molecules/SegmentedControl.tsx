import React from 'react';

export interface SegmentedOption<T extends string> {
  value: T;
  label: string;
}

export interface SegmentedControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SegmentedOption<T>[];
  /** Visually compact row (e.g. inside modal header area). */
  dense?: boolean;
}

export default function SegmentedControl<T extends string>({
  value,
  onChange,
  options,
  dense,
}: SegmentedControlProps<T>): JSX.Element {
  return (
    <div
      data-cmp="m/SegmentedControl"
      className={`inline-flex rounded-lg border border-neutral-200 bg-surface-1 p-0.5 dark:border-neutral-600 ${dense ? 'gap-0' : 'gap-0.5'}`}
      role="tablist"
    >
      {options.map((opt) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => onChange(opt.value)}
            className={`rounded-md px-3 font-semibold transition-colors ${
              dense ? 'py-1 text-xs' : 'py-1.5 text-sm'
            } ${
              active
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-neutral-600 hover:bg-surface-2 dark:text-neutral-300 dark:hover:bg-neutral-800'
            }`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
