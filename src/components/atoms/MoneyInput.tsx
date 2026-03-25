import React from 'react';

export interface MoneyInputProps {
  value: number;
  onChange: (next: number) => void;
  min?: number;
  max?: number;
  quickSteps?: number[];
  inputClassName?: string;
}

function clampInt(value: number, min: number, max: number): number {
  if (!Number.isFinite(value)) return min;
  return Math.max(min, Math.min(max, Math.floor(value)));
}

export default function MoneyInput({
  value,
  onChange,
  min = 0,
  max = Number.MAX_SAFE_INTEGER,
  quickSteps = [5, 25, 100],
  inputClassName = 'min-w-0 flex-1 border-0 bg-transparent text-sm px-2 py-1 focus:outline-none',
}: MoneyInputProps): JSX.Element {
  const [menu, setMenu] = React.useState<null | 'minus' | 'plus'>(null);
  const minusButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const plusButtonRef = React.useRef<HTMLButtonElement | null>(null);
  const minusMenuRef = React.useRef<HTMLDivElement | null>(null);
  const plusMenuRef = React.useRef<HTMLDivElement | null>(null);

  React.useEffect(() => {
    if (!menu) return;
    const onMouseDown = (e: MouseEvent) => {
      const target = e.target as Node;
      const activeMenuRef = menu === 'minus' ? minusMenuRef : plusMenuRef;
      if (activeMenuRef.current?.contains(target)) return;
      if (minusButtonRef.current?.contains(target)) return;
      if (plusButtonRef.current?.contains(target)) return;
      setMenu(null);
    };
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenu(null);
    };
    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('keydown', onKeyDown);
    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('keydown', onKeyDown);
    };
  }, [menu]);

  const applyDelta = (delta: number): void => {
    const next = clampInt(value + delta, min, max);
    onChange(next);
  };

  const minusEnabled = value > min;
  const plusEnabled = value < max;

  return (
    <div className="flex items-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 overflow-visible relative">
      <div className="relative">
        <button
          ref={minusButtonRef}
          type="button"
          disabled={!minusEnabled}
          onClick={() => setMenu((m) => (m === 'minus' ? null : 'minus'))}
          className={`px-2 py-1 text-sm border-r border-neutral-300 dark:border-neutral-700 ${
            minusEnabled ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : 'opacity-40 cursor-not-allowed'
          }`}
          aria-label="Decrease amount options"
        >
          -
        </button>
        {menu === 'minus' && (
          <div ref={minusMenuRef} className="absolute bottom-full mb-1 left-0 z-20 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-1 flex flex-col gap-1">
            {[...quickSteps].sort((a, b) => b - a).map((step) => (
              <button
                key={`minus-${step}`}
                type="button"
                disabled={!minusEnabled}
                className={`rounded px-2 py-1 text-xs text-left ${
                  minusEnabled ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : 'opacity-40 cursor-not-allowed'
                }`}
                onClick={() => applyDelta(-step)}
              >
                -{step}
              </button>
            ))}
          </div>
        )}
      </div>

      <span className="px-2 text-sm text-subtle">$</span>
      <input
        type="number"
        min={min}
        max={max}
        value={value}
        onFocus={(e) => e.currentTarget.select()}
        onClick={(e) => e.currentTarget.select()}
        onChange={(e) => onChange(clampInt(Number(e.target.value || 0), min, max))}
        className={`flex w-full text-center ${inputClassName}`}
      />

      <div className="relative">
        <button
          ref={plusButtonRef}
          type="button"
          disabled={!plusEnabled}
          onClick={() => setMenu((m) => (m === 'plus' ? null : 'plus'))}
          className={`px-2 py-1 text-sm border-l border-neutral-300 dark:border-neutral-700 ${
            plusEnabled ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : 'opacity-40 cursor-not-allowed'
          }`}
          aria-label="Increase amount options"
        >
          +
        </button>
        {menu === 'plus' && (
          <div ref={plusMenuRef} className="absolute bottom-full mb-1 right-0 z-20 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 shadow-lg p-1 flex flex-col gap-1">
            {[...quickSteps].sort((a, b) => b - a).map((step) => (
              <button
                key={`plus-${step}`}
                type="button"
                disabled={!plusEnabled}
                className={`rounded px-2 py-1 text-xs text-left ${
                  plusEnabled ? 'hover:bg-neutral-50 dark:hover:bg-neutral-800' : 'opacity-40 cursor-not-allowed'
                }`}
                onClick={() => applyDelta(step)}
              >
                +{step}
              </button>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
