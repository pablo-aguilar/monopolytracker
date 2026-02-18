// #index
// - //#component: grid of avatars with uniqueness enforcement

import React, { useLayoutEffect, useMemo, useRef, useState } from 'react';
import AvatarToken from '@/components/atoms/AvatarToken';

export type AvatarOption = { key: string; label: string; emoji: string };

export type AvatarPickerProps = {
  options: AvatarOption[];
  used: Set<string>;
  value: string; // selected key
  onChange: (key: string) => void;
  selectedColor?: string;
  colorPopoverOpen?: boolean;
  onSelectedClick?: () => void; // called when tapping the already-selected avatar
  colorPopoverContent?: React.ReactNode;
};

function tintColor(color?: string): string | undefined {
  if (!color) return undefined;
  // Use 8-digit hex for translucency when possible (#rrggbbaa)
  if (color.startsWith('#') && color.length === 7) return `${color}22`;
  return color;
}

export default function AvatarPicker({
  options,
  used,
  value,
  onChange,
  selectedColor,
  colorPopoverOpen = false,
  onSelectedClick,
  colorPopoverContent,
}: AvatarPickerProps): JSX.Element {
  // //#component
  const selectedBtnRef = useRef<HTMLButtonElement | null>(null);
  const popoverRef = useRef<HTMLDivElement | null>(null);
  const [popoverStyle, setPopoverStyle] = useState<React.CSSProperties | undefined>(undefined);

  const isPopoverOpen = useMemo(
    () => Boolean(colorPopoverOpen && colorPopoverContent && value),
    [colorPopoverOpen, colorPopoverContent, value]
  );

  useLayoutEffect(() => {
    if (!isPopoverOpen) return;

    const reposition = () => {
      const btn = selectedBtnRef.current;
      const pop = popoverRef.current;
      if (!btn || !pop) return;

      const btnRect = btn.getBoundingClientRect();
      const popRect = pop.getBoundingClientRect();

      const margin = 8;
      const vw = window.innerWidth;
      const vh = window.innerHeight;

      // Prefer below the button; if it would go off-screen, place above.
      const belowTop = btnRect.bottom + margin;
      const aboveTop = btnRect.top - margin - popRect.height;
      const top =
        belowTop + popRect.height <= vh - margin
          ? belowTop
          : Math.max(margin, aboveTop);

      // Center on button, clamp within viewport.
      const idealLeft = btnRect.left + btnRect.width / 2 - popRect.width / 2;
      const left = Math.min(Math.max(margin, idealLeft), vw - margin - popRect.width);

      setPopoverStyle({
        position: 'fixed',
        top,
        left,
        zIndex: 50,
        width: popRect.width, // keep measured width
        maxWidth: `calc(100vw - ${margin * 2}px)`,
      });
    };

    reposition();
    window.addEventListener('resize', reposition);
    window.addEventListener('scroll', reposition, { passive: true });
    return () => {
      window.removeEventListener('resize', reposition);
      window.removeEventListener('scroll', reposition);
    };
  }, [isPopoverOpen, value]);

  return (
    <div className="grid grid-cols-6 gap-2">
      {options.map((a) => {
        const taken = used.has(a.key);
        const selected = value === a.key;
        return (
          <div key={a.key} className="relative">
            <button
              type="button"
              data-qa={selected ? 'avatar-selected' : `avatar-${a.key}`}
              ref={selected ? selectedBtnRef : undefined}
              disabled={taken && !selected}
              onClick={() => {
                if (selected && onSelectedClick) {
                  onSelectedClick();
                  return;
                }
                onChange(a.key);
              }}
              style={
                selected
                  ? ({ backgroundColor: tintColor(selectedColor), ['--sel-color' as any]: selectedColor } as React.CSSProperties)
                  : undefined
              }
              className={`rounded-md border px-3 py-2 flex items-center justify-center ${
                selected
                  ? 'border-[color:var(--sel-color)] ring-2 ring-[color:var(--sel-color)]'
                  : 'border-neutral-300 dark:border-neutral-700'
              } ${taken && !selected ? 'opacity-40 cursor-not-allowed' : 'hover:opacity-90'}`}
              aria-pressed={selected}
              aria-label={`${a.label}${taken && !selected ? ' (taken)' : ''}`}
              title={selected ? `${a.label} (tap again to change color)` : a.label}
            >
              <AvatarToken emoji={a.emoji} borderColorClass={selected ? 'border-teal-500' : 'border-neutral-300 dark:border-neutral-700'} size={40} ring={false} />
            </button>
            {selected && colorPopoverOpen && !!colorPopoverContent && (
              <div
                ref={popoverRef}
                data-qa="color-popover"
                style={popoverStyle}
                className="rounded-xl border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 p-3 shadow-2xl w-72"
              >
                {colorPopoverContent}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}
