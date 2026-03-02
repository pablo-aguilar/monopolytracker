import React from 'react';

export interface TurnSegment {
  roll: number;
  d6A: number | null;
  d6B: number | null;
  special: string | number | null;
  busUsed: boolean;
  from: number;
  to: number;
  tileName: string;
  at: string; // ISO timestamp when the segment was recorded
}

export interface TurnRibbonProps {
  segments: TurnSegment[];
  currentDraft?: Partial<TurnSegment> & { roll: number };
  maxRolls?: 3 | 2 | 1;
}

export default function TurnRibbon({ segments, currentDraft, maxRolls = 3 }: TurnRibbonProps): JSX.Element {
  const items: Array<{ status: 'done' | 'current' | 'upcoming'; seg?: TurnSegment; draft?: Partial<TurnSegment> & { roll: number }; idx: number }>
    = [];
  const currentRoll = currentDraft?.roll ?? (segments[segments.length - 1]?.roll ?? 1);
  for (let r = 1; r <= maxRolls; r += 1) {
    if (segments.find((s) => s.roll === r)) {
      items.push({ status: 'done', seg: segments.find((s) => s.roll === r), idx: r });
    } else if (r === currentRoll) {
      items.push({ status: 'current', draft: currentDraft, idx: r });
    } else {
      items.push({ status: 'upcoming', idx: r });
    }
  }

  const chip = (it: (typeof items)[number]) => {
    const cl = it.status === 'done'
      ? 'bg-emerald-600 text-white border-emerald-600'
      : it.status === 'current'
      ? 'bg-white dark:bg-neutral-900 text-emerald-700 border-emerald-500'
      : 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-300 dark:border-neutral-700';
    const label = () => {
      if (it.seg) {
        const { d6A, d6B, special, busUsed } = it.seg;
        return (
          <span className="flex items-center gap-1">
            <span className="font-semibold">{it.idx}</span>
            <span className="opacity-80 text-xs">{d6A != null && d6B != null ? `${d6A}+${d6B}${special != null ? `+${String(special)}` : ''}` : '—'}</span>
            {busUsed && <span title="Bus used">🚌</span>}
          </span>
        );
      }
      if (it.draft) {
        const { d6A, d6B, special } = it.draft;
        return (
          <span className="flex items-center gap-1">
            <span className="font-semibold">{it.idx}</span>
            <span className="opacity-80 text-xs">{d6A != null && d6B != null ? `${d6A}+${d6B}${special != null ? `+${String(special)}` : ''}` : '—'}</span>
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1">
          <span className="font-semibold">{it.idx}</span>
          <span className="opacity-60 text-sm">—</span>
        </span>
      );
    };
    return (
      <div key={it.idx} className={`flex items-center ${it.idx < maxRolls? 'w-full':''}`}>

        <div className={`relative z-10 inline-flex items-center justify-center h-7 rounded-full border px-2 ${cl}`}>
          {label()}
        </div>
        {it.idx < maxRolls && <div className={`flex w-full h-1 min-w-[80px] ${segments.find(s=>s.roll>=it.idx) ? 'bg-emerald-600' : 'bg-neutral-200 dark:bg-neutral-800'}`} aria-hidden />}
      </div>
    );
  };

  return (
    <div data-cmp="m/TurnRibbon" className="w-full flex  gap-2">
      <div className='text-sm text-neutral-400 max-w-[50px] leading-tight'>Rolled Doubles</div>
      <div className="flex items-center justify-center flex-1">
        {items.map(chip)}
      </div>
      
    </div>
  );
}


