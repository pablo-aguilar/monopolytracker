import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { motion } from 'framer-motion';

export interface SlidingSegmentOption<T extends string> {
  value: T;
  label: React.ReactNode;
}

export interface SlidingSegmentedControlProps<T extends string> {
  value: T;
  onChange: (v: T) => void;
  options: SlidingSegmentOption<T>[];
  /** Visually compact row (e.g. modal header). */
  dense?: boolean;
  className?: string;
  /** Stable `id` for each tab button (e.g. for `aria-labelledby` on tab panels). */
  tabIdForValue?: (value: T) => string;
}

/** Segmented control with a sliding pill: dark fill + light border (same family as Roll step chips). */
export default function SlidingSegmentedControl<T extends string>({
  value,
  onChange,
  options,
  dense,
  className = '',
  tabIdForValue,
}: SlidingSegmentedControlProps<T>): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null);
  const [indicator, setIndicator] = useState({ left: 0, width: 0 });

  const updateIndicator = useCallback(() => {
    const container = containerRef.current;
    if (!container) return;
    const idx = options.findIndex((o) => o.value === value);
    if (idx < 0) return;
    const btn = container.querySelector<HTMLButtonElement>(`[data-sliding-seg="${idx}"]`);
    if (!btn) return;
    const cr = container.getBoundingClientRect();
    const br = btn.getBoundingClientRect();
    setIndicator({ left: br.left - cr.left, width: br.width });
  }, [value, options]);

  useLayoutEffect(() => {
    updateIndicator();
  }, [updateIndicator]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => updateIndicator());
    ro.observe(el);
    return () => ro.disconnect();
  }, [updateIndicator]);

  return (
    <div
      ref={containerRef}
      data-cmp="m/SlidingSegmentedControl"
      className={`relative inline-flex min-w-0 rounded-lg border border-neutral-200 bg-neutral-100/90 p-0.5 dark:border-white/15 dark:bg-neutral-900/80 ${className}`}
      role="tablist"
    >
      <motion.div
        aria-hidden
        className="pointer-events-none absolute rounded-md border border-white/35 bg-neutral-950 shadow-sm dark:border-white/30 dark:bg-neutral-950"
        style={{
          top: dense ? 2 : 4,
          bottom: dense ? 2 : 4,
        }}
        initial={false}
        animate={{ left: indicator.left, width: indicator.width }}
        transition={{ type: 'spring', stiffness: 380, damping: 28 }}
      />
      {options.map((opt, i) => {
        const active = opt.value === value;
        return (
          <button
            key={opt.value}
            type="button"
            role="tab"
            id={tabIdForValue ? tabIdForValue(opt.value) : undefined}
            aria-selected={active}
            data-sliding-seg={i}
            onClick={() => onChange(opt.value)}
            className={`relative z-10 min-w-0 flex-1 rounded-md font-semibold transition-colors ${
              dense ? 'px-2 py-1 text-xs sm:px-3' : 'px-3 py-1.5 text-sm'
            } ${active ? 'text-white' : 'text-neutral-600 hover:text-neutral-900 dark:text-neutral-400 dark:hover:text-neutral-200'}`}
          >
            {opt.label}
          </button>
        );
      })}
    </div>
  );
}
