import React from 'react';
import { BsDice1Fill, BsDice2Fill, BsDice3Fill, BsDice4Fill, BsDice5Fill, BsDice6Fill } from 'react-icons/bs';
import { FaBusAlt } from 'react-icons/fa';

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
  const visibleRolls = segments.length >= 2 ? 3 : 2;
  const currentRoll = currentDraft?.roll ?? (segments[segments.length - 1]?.roll ?? 1);
  for (let r = 1; r <= visibleRolls; r += 1) {
    if (segments.find((s) => s.roll === r)) {
      items.push({ status: 'done', seg: segments.find((s) => s.roll === r), idx: r });
    } else if (r === currentRoll) {
      items.push({ status: 'current', draft: currentDraft, idx: r });
    } else {
      items.push({ status: 'upcoming', idx: r });
    }
  }

  const chip = (it: (typeof items)[number]) => {
    const rollDiceIcons = [BsDice1Fill, BsDice2Fill, BsDice3Fill, BsDice4Fill, BsDice5Fill, BsDice6Fill] as const;
    const rollFace = (n: number, cls: string): React.ReactNode => {
      const Icon = rollDiceIcons[n - 1];
      return Icon ? <Icon className={cls} aria-hidden /> : <span className={cls}>{n}</span>;
    };
    const rollTokenClass = 'inline-block align-middle h-3.5 w-3.5 shrink-0';
    const rollTokenNegativeClass = 'inline-block align-middle h-3.5 w-3.5 shrink-0 text-rose-500 dark:text-rose-300';
    const renderRollPreview = (d6A: number | null, d6B: number | null, special: string | number | null): React.ReactNode => {
      if (d6A == null || d6B == null) return '—';
      return (
        <span className="inline-flex items-center gap-0.5 whitespace-nowrap text-[12px]">
          {rollFace(d6A, rollTokenClass)}
          {rollFace(d6B, rollTokenClass)}
          {special != null && (
            <>
              {special === 'Bus' ? (
                <FaBusAlt className={rollTokenClass} aria-hidden />
              ) : special === '-1' ? (
                rollFace(1, rollTokenNegativeClass)
              ) : special === '+1' ? (
                rollFace(1, rollTokenClass)
              ) : typeof special === 'number' ? (
                rollFace(special, rollTokenClass)
              ) : (
                <span>{String(special)}</span>
              )}
            </>
          )}
        </span>
      );
    };
    const cl = it.status === 'done'
      ? 'bg-game-doubles text-white border-game-doubles'
      : it.status === 'current'
      ? 'bg-game-doubles text-white border-game-doubles ring-1 ring-[var(--game-doubles)] ring-offset-3 ring-offset-white dark:ring-offset-neutral-900'
      : 'bg-white dark:bg-neutral-900 text-neutral-400 border-neutral-300 dark:border-neutral-700';
    const label = () => {
      if (it.seg) {
        const { d6A, d6B, special, busUsed } = it.seg;
        return (
          <span className="flex items-center gap-1">
            <span className="opacity-90">{renderRollPreview(d6A, d6B, special)}</span>
            {busUsed && <span title="Bus used">🚌</span>}
          </span>
        );
      }
      if (it.draft) {
        const { d6A, d6B, special } = it.draft;
        return (
          <span className="flex items-center gap-1">
            <span className="opacity-90">{renderRollPreview(d6A ?? null, d6B ?? null, special ?? null)}</span>
          </span>
        );
      }
      return (
        <span className="flex items-center gap-1">
          <span className="opacity-60 text-[14px]">—</span>
        </span>
      );
    };
    return (
      <div key={it.idx} className="flex min-w-0 flex-1 items-center">

        <div className={`relative z-10 inline-flex items-center justify-center h-7 rounded-full border px-2 ${cl}`}>
          {label()}
        </div>
        {it.idx < visibleRolls && <div className={`h-1 flex-1 min-w-0 ${segments.find(s=>s.roll>=it.idx) ? 'bg-game-doubles' : 'bg-neutral-200 dark:bg-neutral-800'}`} aria-hidden />}
      </div>
    );
  };

  return (
    <div data-cmp="m/TurnRibbon" className={`w-full flex gap-2 p-2 pb-0 ${visibleRolls === 2 ? 'max-w-[75%] mx-auto' : ''}`}>
      <div className="inline-flex items-center text-[14px] text-subtle leading-none">Doubles</div>
      <div className="flex min-w-0 items-center justify-center flex-1">
        {items.map(chip)}
      </div>
      
    </div>
  );
}


