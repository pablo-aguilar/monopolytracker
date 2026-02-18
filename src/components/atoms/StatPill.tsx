import React from 'react';

export interface StatPillProps {
  label: React.ReactNode;
  value?: React.ReactNode;
  title?: string;
}

export default function StatPill({ label, value, title }: StatPillProps): JSX.Element {
  return (
    <span title={title} className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
      {label}{value !== undefined && (<strong>{value}</strong>)}
    </span>
  );
}


