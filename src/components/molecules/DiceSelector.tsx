import React from 'react';

export interface DiceSelectorProps {
  d6A: number | null;
  d6B: number | null;
  special: string | number | null;
  onSelectA: (n: number) => void;
  onSelectB: (n: number) => void;
  onSelectSpecial: (v: string | number) => void;
  showSpecial?: boolean;
}

function btnClass(active: boolean): string {
  return `inline-flex items-center justify-center h-8 min-w-8 rounded-md border px-2 text-sm font-medium ${
    active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800'
  }`;
}

export default function DiceSelector({ d6A, d6B, special, onSelectA, onSelectB, onSelectSpecial, showSpecial = true }: DiceSelectorProps): JSX.Element {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs opacity-80 w-12">D6 A:</span>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={`a-${n}`} type="button" className={btnClass(d6A === n)} onClick={() => onSelectA(n)}>
            {n}
          </button>
        ))}
      </div>
      <div className="flex items-center gap-2 flex-wrap">
        <span className="text-xs opacity-80 w-12">D6 B:</span>
        {[1, 2, 3, 4, 5, 6].map((n) => (
          <button key={`b-${n}`} type="button" className={btnClass(d6B === n)} onClick={() => onSelectB(n)}>
            {n}
          </button>
        ))}
      </div>
      {showSpecial && (
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-xs opacity-80 w-12">Special:</span>
          {(['1', '2', '3', '+1', '-1', 'Bus'] as const).map((label) => (
            <button
              key={`s-${label}`}
              type="button"
              className={btnClass(String(special ?? '') === label)}
              onClick={() => {
                if (label === 'Bus' || label === '+1' || label === '-1') {
                  onSelectSpecial(label);
                } else {
                  onSelectSpecial(Number(label));
                }
              }}
            >
              {label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}


