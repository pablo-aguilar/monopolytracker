import React, { useEffect, useState } from 'react';
import { FaBusAlt } from 'react-icons/fa';
import { GiDiceFire } from 'react-icons/gi';
import { IoDiceSharp } from 'react-icons/io5';

export interface DiceSelectorProps {
  d6A: number | null;
  d6B: number | null;
  special: string | number | null;
  onSelectA: (n: number) => void;
  onSelectB: (n: number) => void;
  onSelectSpecial: (v: string | number) => void;
  showSpecial?: boolean;
}

type TabId = 'a' | 'b' | 'special';

function btnClass(active: boolean): string {
  return `inline-flex items-center justify-center h-10 min-w-8 rounded-md border px-2 text-base font-medium ${
    active ? 'bg-emerald-600 border-emerald-600 text-white' : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800'
  }`;
}

function formatSpecialShort(s: string | number | null): string {
  if (s === null) return '';
  if (s === 'Bus') return 'Bus';
  return String(s);
}

function specialFaceActive(special: string | number | null, v: string | number): boolean {
  if (v === '-1' || v === '-2') return String(special ?? '') === v;
  return special === v;
}

export default function DiceSelector({ d6A, d6B, special, onSelectA, onSelectB, onSelectSpecial, showSpecial = true }: DiceSelectorProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('a');

  useEffect(() => {
    if (d6A === null && d6B === null && (!showSpecial || special === null)) {
      setActiveTab('a');
    }
  }, [d6A, d6B, special, showSpecial]);

  useEffect(() => {
    if (!showSpecial && activeTab === 'special') {
      setActiveTab('b');
    }
  }, [showSpecial, activeTab]);

  const handleSelectA = (n: number): void => {
    onSelectA(n);
    setActiveTab('b');
  };

  const handleSelectB = (n: number): void => {
    onSelectB(n);
    if (showSpecial) setActiveTab('special');
  };

  const handleSelectSpecial = (v: string | number): void => {
    onSelectSpecial(v);
  };

  const tabClass = (id: TabId): string => {
    const on = activeTab === id;
    return `flex flex-1 flex-col items-center justify-center gap-1 rounded-full border px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm ${
      on
        ? 'relative z-[1] mb-[-1px] border-emerald-500  bg-emerald-50 text-emerald-900 dark:border-emerald-600 dark:bg-emerald-950/50 dark:text-emerald-100'
        : 'border-transparent bg-transparent text-neutral-500 hover:text-neutral-800 dark:text-neutral-400 dark:hover:text-neutral-200'
    }`;
  };

  return (
    <div data-cmp="m/DiceSelector" className="space-y-3">
      <div role="tablist" aria-label="Dice to set" className="flex gap-0.5 border-b py-1 px-2 border-tint bg-surface-0 rounded-full">
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'a'}
          aria-label={d6A != null ? `Die A, value ${d6A}` : 'Die A'}
          id="dice-tab-a"
          aria-controls="dice-panel-a"
          className={tabClass('a')}
          onClick={() => setActiveTab('a')}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <IoDiceSharp className="h-5 w-5 shrink-0" aria-hidden />
                  </span>
        </button>
        <button
          type="button"
          role="tab"
          aria-selected={activeTab === 'b'}
          aria-label={d6B != null ? `Die B, value ${d6B}` : 'Die B'}
          id="dice-tab-b"
          aria-controls="dice-panel-b"
          className={tabClass('b')}
          onClick={() => setActiveTab('b')}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <IoDiceSharp className="h-5 w-5 shrink-0" aria-hidden />
           
          </span>
        </button>
        {showSpecial && (
          <button
            type="button"
            role="tab"
            aria-selected={activeTab === 'special'}
            aria-label={
              special != null ? `Special die, ${formatSpecialShort(special)}` : 'Special die'
            }
            id="dice-tab-special"
            aria-controls="dice-panel-special"
            className={tabClass('special')}
            onClick={() => setActiveTab('special')}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <GiDiceFire className="h-6 w-6 shrink-0" aria-hidden />
            </span>

          </button>
        )}
      </div>

      <div className="">
        <div
          id="dice-panel-a"
          role="tabpanel"
          aria-labelledby="dice-tab-a"
          hidden={activeTab !== 'a'}
          className="grid grid-cols-3 gap-1.5 "
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={`a-${n}`} type="button" className={btnClass(d6A === n)} onClick={() => handleSelectA(n)}>
              {n}
            </button>
          ))}
        </div>

        <div
          id="dice-panel-b"
          role="tabpanel"
          aria-labelledby="dice-tab-b"
          hidden={activeTab !== 'b'}
          className="grid grid-cols-3 gap-1.5 "
        >
          {[1, 2, 3, 4, 5, 6].map((n) => (
            <button key={`b-${n}`} type="button" className={btnClass(d6B === n)} onClick={() => handleSelectB(n)}>
              {n}
            </button>
          ))}
        </div>

        {showSpecial && (
          <div
            id="dice-panel-special"
            role="tabpanel"
            aria-labelledby="dice-tab-special"
            hidden={activeTab !== 'special'}
            className="grid grid-cols-3 gap-1.5  "
          >
            {[1, 2, 3].map((n) => (
              <button key={`s-${n}`} type="button" className={btnClass(special === n)} onClick={() => handleSelectSpecial(n)}>
                {n}
              </button>
            ))}
            <button type="button" className={btnClass(specialFaceActive(special, '-1'))} onClick={() => handleSelectSpecial('-1')}>
              -1
            </button>
            <button type="button" className={btnClass(specialFaceActive(special, '-2'))} onClick={() => handleSelectSpecial('-2')}>
              -2
            </button>
            <button type="button" className={btnClass(specialFaceActive(special, 'Bus'))} onClick={() => handleSelectSpecial('Bus')}>
              <span className="inline-flex items-center gap-1.5">
                <FaBusAlt className="inline-block h-[14px] w-[14px] shrink-0 text-fg" aria-hidden />
                Bus
              </span>
            </button>
          </div>
        )}
      </div>
    </div>
  );
}
