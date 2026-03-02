import React from 'react';

export interface FromToIndicatorProps {
  from: string;
  to: string;
  subtleTo?: boolean;
  alert?: boolean;
  className?: string;
}

export default function FromToIndicator({ from, to, subtleTo = true, alert = false, className = '' }: FromToIndicatorProps): JSX.Element {
  return (
    <div data-cmp="a/FromToIndicator" className={`text-sm ${className}`}>
      <span>{from}</span>
      <span className="mx-1">→</span>
      <span className={`${alert ? 'text-rose-600' : ''} ${subtleTo ? 'opacity-70' : ''}`.trim()}>{to}</span>
    </div>
  );
}


