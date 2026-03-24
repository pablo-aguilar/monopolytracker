import React from 'react';
import Tooltip from '@/components/atoms/Tooltip';

export interface StatPillProps {
  label: React.ReactNode;
  value?: React.ReactNode;
  title?: string;
  /** Hover / tap (touch) shows this full value when the displayed value is abbreviated */
  valueTooltip?: React.ReactNode;
}

export default function StatPill({ label, value, title, valueTooltip }: StatPillProps): JSX.Element {
  const valueEl =
    value !== undefined ? (
      <strong className="font-normal" aria-label={typeof valueTooltip === 'string' ? valueTooltip : undefined}>
        {value}
      </strong>
    ) : null;

  return (
    <span data-cmp="a/StatPill" title={title} className="inline-flex items-center gap-1 rounded-full bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
      {label}
      {valueEl != null &&
        (valueTooltip != null ? <Tooltip content={valueTooltip}>{valueEl}</Tooltip> : valueEl)}
    </span>
  );
}


