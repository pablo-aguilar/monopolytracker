import React from 'react';

export interface HudBadgeProps {
  title?: string;
  icon: React.ReactNode;
  count: number;
  variant?: 'inline' | 'pill';
  borderClassName?: string; // used for pill
  className?: string;
  iconClassName?: string;
}

export default function HudBadge({ title, icon, count, variant = 'inline', borderClassName = 'border-white', className, iconClassName }: HudBadgeProps): JSX.Element {
  if (variant === 'pill') {
    return (
      <span data-cmp="a/HudBadge" title={title} className={`inline-flex items-center justify-center rounded-full border-2 h-5 px-2 py-3 ${borderClassName} ${className ?? ''}`}>
        <span className={`pointer-events-none text-sm ${iconClassName ?? ''}`}>{icon}</span>
        <span className="ml-0.5 text-base font-bold pointer-events-none">{count}</span>
      </span>
    );
  }
  return (
    <span data-cmp="a/HudBadge" title={title} className={`inline-flex items-center gap-1 ${className ?? ''}`}>
      <span className={`text-sm ${iconClassName ?? ''}`}>{icon}</span>
      <span className="ml-0.5 text-base font-bold">{count}</span>
    </span>
  );
}


