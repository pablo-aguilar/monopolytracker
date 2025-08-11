import React, { useMemo, useState } from 'react';
import type { DieRoll, SpecialDieFace } from '@/types/monopoly-schema';
import { evaluateRollAdvisories } from '@/features/rules/advisories';

export default function Play(): JSX.Element {
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [d6A, setD6A] = useState<number>(1);
  const [d6B, setD6B] = useState<number>(1);
  const [special, setSpecial] = useState<SpecialDieFace>(1);
  const [advice, setAdvice] = useState<string[]>([]);

  const roll: DieRoll = useMemo(
    () => ({ d6A, d6B, special, isDouble: d6A === d6B, isTriple: d6A === d6B && typeof special === 'number' && special === d6A, isTripleOnes: d6A === 1 && d6B === 1 && special === 1 }),
    [d6A, d6B, special]
  );

  const onEvaluate = (): void => {
    const result = evaluateRollAdvisories(roll, {
      currentIndex,
      isOwned: () => false,
      isOwnedByOther: () => false,
    });
    setAdvice(result.map((r) => r.message));
  };

  return (
    <div className="min-h-dvh flex items-center justify-center p-6 bg-neutral-50 text-neutral-900 dark:bg-neutral-950 dark:text-neutral-50">
      <div className="w-full max-w-3xl space-y-6">
        <h1 className="text-2xl font-semibold">GM Console</h1>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Current Tile Index</label>
            <input type="number" value={currentIndex} onChange={(e) => setCurrentIndex(parseInt(e.target.value || '0', 10))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">D6 A</label>
            <input type="number" min={1} max={6} value={d6A} onChange={(e) => setD6A(Math.max(1, Math.min(6, parseInt(e.target.value || '1', 10))))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
          <div className="space-y-2">
            <label className="block text-sm font-medium">D6 B</label>
            <input type="number" min={1} max={6} value={d6B} onChange={(e) => setD6B(Math.max(1, Math.min(6, parseInt(e.target.value || '1', 10))))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
          <div className="space-y-2 md:col-span-3">
            <label className="block text-sm font-medium">Special Die</label>
            <select value={String(special)} onChange={(e) => setSpecial((isNaN(Number(e.target.value)) ? (e.target.value as SpecialDieFace) : (Number(e.target.value) as SpecialDieFace)))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <option value="1">1</option>
              <option value="2">2</option>
              <option value="3">3</option>
              <option value="+1">+1</option>
              <option value="-1">-1</option>
              <option value="Bus">Bus</option>
            </select>
          </div>
        </div>
        <div className="flex gap-3">
          <button onClick={onEvaluate} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">
            Evaluate Roll
          </button>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Advisories</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
            {advice.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
      </div>
    </div>
  );
} 