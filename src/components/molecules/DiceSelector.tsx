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
    <div data-cmp="m/DiceSelector" className="space-y-2">
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
        <div className="space-y-2">
          <div className="text-xs font-bold text-subtle px-1 border-b-4 pb-1 mb-1 border-tint ">D6 A</div>
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={`a-${n}`} type="button" className={btnClass(d6A === n)} onClick={() => onSelectA(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        <div className="space-y-2">
          <div className="text-xs font-bold text-subtle px-1  border-b-4 pb-1 mb-1 border-tint">D6 B</div>
          <div className="grid grid-cols-3 gap-0.5">
            {[1, 2, 3, 4, 5, 6].map((n) => (
              <button key={`b-${n}`} type="button" className={btnClass(d6B === n)} onClick={() => onSelectB(n)}>
                {n}
              </button>
            ))}
          </div>
        </div>

        {showSpecial ? (
          <div className="space-y-2">
            <div className="text-xs font-bold text-subtle px-1  border-b-4 pb-1 mb-1 border-tint">Special</div>
            <div className="grid grid-cols-3 gap-0.5">
              {[1, 2, 3].map((n) => (
                <button key={`s-${n}`} type="button" className={btnClass(special === n)} onClick={() => onSelectSpecial(n)}>
                  {n}
                </button>
              ))}
              <button key="s--1" type="button" className={btnClass(String(special ?? '') === '-1')} onClick={() => onSelectSpecial('-1')}>
                -1
              </button>
              <button key="s--2" type="button" className={btnClass(String(special ?? '') === '-2')} onClick={() => onSelectSpecial('-2')}>
                -2
              </button>
              <button key="s-bus" type="button" className={btnClass(String(special ?? '') === 'Bus')} onClick={() => onSelectSpecial('Bus')}>
                Bus
              </button>
            </div>
          </div>
        ) : (
          <div />
        )}
      </div>
      {showSpecial && (
        <div className="hidden" />
      )}
    </div>
  );
}


