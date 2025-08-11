import React, { useMemo, useState } from 'react';
import type { DieRoll, SpecialDieFace, GameEvent } from '@/types/monopoly-schema';
import { evaluateRollAdvisories } from '@/features/rules/advisories';
import EventLog from '@/components/EventLog';
import { useDispatch, useSelector } from 'react-redux';
import { appendEvent } from '@/features/events/eventsSlice';
import { BOARD_TILES, getTileByIndex, passedGo } from '@/data/board';
import { assignOwner, setMortgaged, buyHouse, sellHouse } from '@/features/properties/propertiesSlice';
import { drawCard } from '@/features/cards/cardsSlice';
import { adjustPlayerMoney } from '@/features/players/playersSlice';
import type { RootState } from '@/app/store';
import { computeRent } from '@/features/selectors/rent';

export default function Play(): JSX.Element {
  const dispatch = useDispatch();
  const players = useSelector((s: RootState) => s.players.players);
  const cardsState = useSelector((s: RootState) => s.cards);
  const propsState = useSelector((s: RootState) => s.properties);
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [d6A, setD6A] = useState<number>(1);
  const [d6B, setD6B] = useState<number>(1);
  const [special, setSpecial] = useState<SpecialDieFace>(1);
  const [advice, setAdvice] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>('');
  const [moneyDelta, setMoneyDelta] = useState<number>(0);
  const [moneyPlayerId, setMoneyPlayerId] = useState<string>('');

  const lastChance = cardsState.decks.chance.discardPile[0];
  const lastCommunity = cardsState.decks.community.discardPile[0];
  const lastBus = cardsState.decks.bus.discardPile[0];

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

  const onApplyMove = (): void => {
    const moveSteps = d6A + d6B + (typeof special === 'number' ? special : 0);
    const toIndex = (currentIndex + moveSteps) % BOARD_TILES.length;
    const tile = getTileByIndex(toIndex);
    const ev: GameEvent = {
      id: crypto.randomUUID(),
      gameId: 'local',
      type: 'MOVE',
      payload: { from: currentIndex, to: toIndex, steps: moveSteps, message: `Moved to ${tile.name}` },
      createdAt: new Date().toISOString(),
    };
    dispatch(appendEvent(ev));
    if (passedGo(currentIndex, toIndex)) {
      dispatch(
        appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'PASSED_GO', payload: { amount: 200, message: '+$200 for passing GO' }, moneyDelta: +200, createdAt: new Date().toISOString() })
      );
    }
    setCurrentIndex(toIndex);
  };

  const onBuyProperty = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (!(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) return;
    if (!ownerId) return;
    dispatch(assignOwner({ tileId: tile.id, ownerId }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'PURCHASE', payload: { tileId: tile.id, ownerId, message: `Purchased ${tile.name}` }, createdAt: new Date().toISOString() })
    );
  };

  const onAdjustMoney = (): void => {
    if (!moneyPlayerId || !Number.isFinite(moneyDelta) || moneyDelta === 0) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: moneyDelta }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', payload: { playerId: moneyPlayerId, amount: moneyDelta, message: `${moneyDelta > 0 ? '+' : ''}${moneyDelta}` }, moneyDelta, createdAt: new Date().toISOString() })
    );
    setMoneyDelta(0);
  };

  const onPayRent = (): void => {
    const tile = getTileByIndex(currentIndex);
    const state = (window as any).__store__?.getState?.() as RootState | undefined; // optional global for future
    const diceTotal = d6A + d6B + (typeof special === 'number' ? special : 0);
    const rent = computeRent({ ...(state as any), properties: propsState } as RootState, tile.id, diceTotal);
    // For MVP, take from selected moneyPlayerId and credit to tile owner if set
    const ownerIdForTile = propsState.byTileId[tile.id]?.ownerId as string | null;
    if (!moneyPlayerId || !ownerIdForTile || rent <= 0) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -rent }));
    dispatch(adjustPlayerMoney({ id: ownerIdForTile, delta: +rent }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'RENT', payload: { tileId: tile.id, from: moneyPlayerId, to: ownerIdForTile, amount: rent, message: `Rent ${rent}` }, moneyDelta: -rent, createdAt: new Date().toISOString() })
    );
  };

  const onPayTax = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'tax' || !tile.taxAmount || !moneyPlayerId) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -tile.taxAmount }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'FEE', payload: { tileId: tile.id, from: moneyPlayerId, amount: tile.taxAmount, message: `Tax ${tile.taxAmount}` }, moneyDelta: -tile.taxAmount, createdAt: new Date().toISOString() })
    );
  };

  const onMortgageToggle = (mortgaged: boolean): void => {
    const tile = getTileByIndex(currentIndex);
    if (!(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) return;
    dispatch(setMortgaged({ tileId: tile.id, mortgaged }));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', payload: { tileId: tile.id, mortgaged }, createdAt: new Date().toISOString() })
    );
  };

  const onBuild = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'property') return;
    dispatch(buyHouse({ tileId: tile.id, ownerId: ownerId || (propsState.byTileId[tile.id]?.ownerId as string) }));
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', payload: { tileId: tile.id, message: 'Build' }, createdAt: new Date().toISOString() }));
  };

  const onSell = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'property') return;
    dispatch(sellHouse({ tileId: tile.id }));
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', payload: { tileId: tile.id, message: 'Sell' }, createdAt: new Date().toISOString() }));
  };

  const onDrawCard = (deck: 'chance' | 'community' | 'bus'): void => {
    dispatch(drawCard(deck));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'CARD', payload: { deck, message: `Drew from ${deck}` }, createdAt: new Date().toISOString() })
    );
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
        <div className="flex flex-wrap gap-3">
          <button onClick={onEvaluate} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 text-white font-semibold shadow hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">Evaluate Roll</button>
          <button onClick={onApplyMove} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white font-semibold shadow hover:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">Apply Move</button>
          <div className="inline-flex items-center gap-2">
            <select value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <option value="">Select owner</option>
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <button onClick={onBuyProperty} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-amber-600 text-white font-semibold shadow hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400">Buy Property</button>
          </div>
          <div className="inline-flex items-center gap-2">
            <select value={moneyPlayerId} onChange={(e) => setMoneyPlayerId(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <option value="">Select player</option>
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <input type="number" value={moneyDelta} onChange={(e) => setMoneyDelta(parseInt(e.target.value || '0', 10))} className="w-28 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
            <button onClick={onAdjustMoney} className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-slate-700 text-white font-semibold shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400">Apply Money</button>
          </div>
          <button onClick={onPayRent} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400">Pay Rent</button>
          <button onClick={onPayTax} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400">Pay Tax</button>
          <button onClick={() => onMortgageToggle(true)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-600 text-white font-semibold shadow hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400">Mortgage</button>
          <button onClick={() => onMortgageToggle(false)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-500 text-white font-semibold shadow hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300">Unmortgage</button>
          <button onClick={onBuild} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-green-700 text-white font-semibold shadow hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500">Build</button>
          <button onClick={onSell} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-yellow-700 text-white font-semibold shadow hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500">Sell</button>
          <button onClick={() => onDrawCard('chance')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400">Draw Chance</button>
          <button onClick={() => onDrawCard('community')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-fuchsia-600 text-white font-semibold shadow hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400">Draw Community</button>
          <button onClick={() => onDrawCard('bus')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">Draw Bus</button>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm">
            <div className="font-semibold mb-1">Last Chance</div>
            <div className="opacity-80 min-h-10">{lastChance ? lastChance.text : '—'}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm">
            <div className="font-semibold mb-1">Last Community Chest</div>
            <div className="opacity-80 min-h-10">{lastCommunity ? lastCommunity.text : '—'}</div>
          </div>
          <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 p-3 text-sm">
            <div className="font-semibold mb-1">Last Bus</div>
            <div className="opacity-80 min-h-10">{lastBus ? lastBus.text : '—'}</div>
          </div>
        </div>
        <div className="space-y-2">
          <h2 className="text-lg font-medium">Advisories</h2>
          <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
            {advice.map((msg, i) => (
              <li key={i}>{msg}</li>
            ))}
          </ul>
        </div>
        <EventLog />
      </div>
    </div>
  );
} 