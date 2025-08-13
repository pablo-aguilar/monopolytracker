// #index
// - //#imports: libraries and app modules
// - //#local-state: GM inputs and UI selections
// - //#derived: last drawn cards for quick reference
// - //#handlers: core GM actions (evaluate, move, buy, money adjust, rent/tax, mortgage, build/sell, draw)
// - //#render: layout with HUD, player turn cards, inputs/actions, cards preview, advisories, and event log

// //#imports
import React, { useMemo, useState, useRef } from 'react';
import type { DieRoll, SpecialDieFace, GameEvent } from '@/types/monopoly-schema';
import { evaluateRollAdvisories } from '@/features/rules/advisories';
import EventLog from '@/components/molecules/EventLog';
import { useDispatch, useSelector } from 'react-redux';
import { appendEvent } from '@/features/events/eventsSlice';
import { BOARD_TILES, getTileByIndex, passedGo } from '@/data/board';
import { assignOwner, setMortgaged, buyHouse, sellHouse } from '@/features/properties/propertiesSlice';
import { drawCard } from '@/features/cards/cardsSlice';
import { adjustPlayerMoney, setPlayerPosition } from '@/features/players/playersSlice';
import type { RootState } from '@/app/store';
import { computeRent } from '@/features/selectors/rent';
import AvatarToken from '@/components/atoms/AvatarToken';
import { AVATARS } from '@/data/avatars';
import { AnimatePresence, motion } from 'framer-motion';
import { advanceTurn, setRacePotWinner } from '@/features/session/sessionSlice';

export default function PlayConsole(): JSX.Element {
  const dispatch = useDispatch();
  const players = useSelector((s: RootState) => s.players.players);
  const cardsState = useSelector((s: RootState) => s.cards);
  const propsState = useSelector((s: RootState) => s.properties);
  const racePot = useSelector((s: RootState) => s.session.racePot);
  const turnIndexRaw = useSelector((s: RootState) => (s as any).session?.turnIndex);
  const turnIndex: number = typeof turnIndexRaw === 'number' && turnIndexRaw >= 0 ? turnIndexRaw : 0;

  // //#local-state
  const [currentIndex, setCurrentIndex] = useState<number>(0);
  const [d6A, setD6A] = useState<number | null>(null);
  const [d6B, setD6B] = useState<number | null>(null);
  const [special, setSpecial] = useState<SpecialDieFace | null>(null);
  const [rollConfirmed, setRollConfirmed] = useState<boolean>(false);
  const [activeStep, setActiveStep] = useState<0 | 1 | 2>(0); // 0=pre,1=roll,2=post
  const [advice, setAdvice] = useState<string[]>([]);
  const [ownerId, setOwnerId] = useState<string>('');
  const [moneyDelta, setMoneyDelta] = useState<number>(0);
  const [moneyPlayerId, setMoneyPlayerId] = useState<string>('');
  const [preAction, setPreAction] = useState<string>('None');
  const [postAction, setPostAction] = useState<string>('None');
  const [highestStep, setHighestStep] = useState<0 | 1 | 2>(0);

  // hold-to-confirm for End Turn
  const [holdProgress, setHoldProgress] = useState<number>(0);
  const holdTimerRef = useRef<number | null>(null);
  const holdIntervalRef = useRef<number | null>(null);

  // Sync currentIndex and reset roll per active player
  const activePlayer = players[turnIndex] ?? players[0];
  React.useEffect(() => {
    const idx = activePlayer?.positionIndex ?? 0;
    setCurrentIndex(idx);
    // reset roll selections for new active player
    setD6A(null);
    setD6B(null);
    setSpecial(null);
    setRollConfirmed(false);
    setActiveStep(0);
    setHoldProgress(0);
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
    setPreAction('None');
    setPostAction('None');
    setHighestStep(0);
  }, [turnIndex, players, activePlayer?.positionIndex]);

  // Reset confirmation if any die changes
  React.useEffect(() => {
    setRollConfirmed(false);
  }, [d6A, d6B, special]);

  // //#derived
  const lastChance = cardsState.decks.chance.discardPile[0];
  const lastCommunity = cardsState.decks.community.discardPile[0];
  const lastBus = cardsState.decks.bus.discardPile[0];

  const specialNumeric: number = useMemo(() => {
    if (special === '+1') return 1;
    if (special === '-1') return -1;
    if (typeof special === 'number') return special;
    return 0;
  }, [special]);

  const hasRoll = d6A !== null && d6B !== null; 
  const hasFullNumericRoll = d6A !== null && d6B !== null && typeof special === 'number';
  const rollTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;

  const rollForEval: DieRoll | null = useMemo(() => {
    if (!hasRoll) return null;
    const sp: SpecialDieFace = (special ?? 1) as SpecialDieFace; // fallback only for typing
    return {
      d6A: d6A as number,
      d6B: d6B as number,
      special: sp,
      isDouble: (d6A as number) === (d6B as number),
      isTriple: (d6A as number) === (d6B as number) && (typeof sp === 'number' ? sp === (d6A as number) : false),
      isTripleOnes: (d6A as number) === 1 && (d6B as number) === 1 && sp === 1,
    };
  }, [d6A, d6B, special, hasRoll]);

  const bankUnownedCount = useMemo(() => {
    return Object.values(propsState.byTileId).filter((ps) => ps && ps.ownerId === null).length;
  }, [propsState.byTileId]);

  // //#handlers
  const onEvaluate = (): void => {
    if (!rollForEval) return;
    const result = evaluateRollAdvisories(rollForEval, {
      currentIndex,
      isOwned: () => false,
      isOwnedByOther: () => false,
    });
    setAdvice(result.map((r) => r.message));
  };

  const onApplyMove = (playerId?: string): void => {
    if (!hasRoll) return;
    const pid = playerId ?? (players[turnIndex]?.id || players[0]?.id);
    if (!pid) return;
    const fromIndex = players.find((p) => p.id === pid)?.positionIndex ?? 0;
    const moveSteps = (d6A as number) + (d6B as number) + specialNumeric;
    const toIndex = (fromIndex + moveSteps) % BOARD_TILES.length;
    const tile = getTileByIndex(toIndex);
    const ev: GameEvent = {
      id: crypto.randomUUID(),
      gameId: 'local',
      type: 'MOVE',
      payload: { playerId: pid, from: fromIndex, to: toIndex, steps: moveSteps, message: `Moved to ${tile.name}` },
      createdAt: new Date().toISOString(),
    };
    dispatch(appendEvent(ev));

    const passed = passedGo(fromIndex, toIndex);
    if (passed) {
      dispatch(
        appendEvent({
          id: crypto.randomUUID(),
          gameId: 'local',
          type: 'PASSED_GO',
          payload: { playerId: pid, amount: 200, message: '+$200 for passing GO' },
          moneyDelta: +200,
          createdAt: new Date().toISOString(),
        })
      );
      dispatch(adjustPlayerMoney({ id: pid, delta: +200 }));

      // Race pot auto-award if applicable
      if (racePot.active && !racePot.winnerId && racePot.participants.includes(pid)) {
        dispatch(setRacePotWinner(pid));
        if (racePot.amount > 0) {
          dispatch(adjustPlayerMoney({ id: pid, delta: racePot.amount }));
          dispatch(
            appendEvent({
              id: crypto.randomUUID(),
              gameId: 'local',
              type: 'MONEY_ADJUST',
              payload: { playerId: pid, amount: racePot.amount, message: 'Race pot winner' },
              moneyDelta: racePot.amount,
              createdAt: new Date().toISOString(),
            })
          );
        }
      }
    }

    dispatch(setPlayerPosition({ id: pid, index: toIndex }));
    setCurrentIndex(toIndex);
    setRollConfirmed(false);

    // Tile-aware prompt suggestion (basic): set advisory messages
    const suggestions: string[] = [];
    const t = tile;
    if (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') {
      const owner = propsState.byTileId[t.id]?.ownerId as string | null;
      if (owner && owner !== pid) suggestions.push('Consider: Pay Rent');
      else if (!owner) suggestions.push('Consider: Buy Property');
    } else if (t.type === 'tax') {
      suggestions.push('Consider: Pay Tax');
    } else if (t.type === 'chance' || t.type === 'community') {
      suggestions.push(`Consider: Draw ${t.type === 'community' ? 'Community Chest' : 'Chance'} card`);
    } else if (t.type === 'goToJail') {
      suggestions.push('Go to Jail');
    }
    setAdvice(suggestions);

    // Advance turn after applying move
    dispatch(advanceTurn({ playerCount: players.length }));
  };

  const onEndTurnHoldStart = (pid: string): void => {
    if (!hasRoll || !rollConfirmed) return;
    setHoldProgress(0);
    const start = Date.now();
    const duration = 3000;
    holdIntervalRef.current = window.setInterval(() => {
      const elapsed = Date.now() - start;
      const progress = Math.min(100, Math.round((elapsed / duration) * 100));
      setHoldProgress(progress);
    }, 50) as unknown as number;
    holdTimerRef.current = window.setTimeout(() => {
      // Confirmed
      if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
      setHoldProgress(100);
      onApplyMove(pid);
    }, duration) as unknown as number;
  };

  const onEndTurnHoldCancel = (): void => {
    if (holdTimerRef.current) window.clearTimeout(holdTimerRef.current);
    if (holdIntervalRef.current) window.clearInterval(holdIntervalRef.current);
    setHoldProgress(0);
  };

  const onBuyProperty = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (!(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) return;
    if (!ownerId) return;
    dispatch(assignOwner({ tileId: tile.id, ownerId }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'PURCHASE',
        payload: { tileId: tile.id, ownerId, message: `Purchased ${tile.name}` },
        createdAt: new Date().toISOString(),
      })
    );
  };

  const onAdjustMoney = (): void => {
    if (!moneyPlayerId || !Number.isFinite(moneyDelta) || moneyDelta === 0) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: moneyDelta }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'MONEY_ADJUST',
        payload: { playerId: moneyPlayerId, amount: moneyDelta, message: `${moneyDelta > 0 ? '+' : ''}${moneyDelta}` },
        moneyDelta,
        createdAt: new Date().toISOString(),
      })
    );
    setMoneyDelta(0);
  };

  const onDrawCard = (deck: 'chance' | 'community' | 'bus'): void => {
    dispatch(drawCard(deck));
    dispatch(
      appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'CARD', payload: { deck, message: `Drew from ${deck}` }, createdAt: new Date().toISOString() })
    );
  };

  const onPayRent = (): void => {
    const tile = getTileByIndex(currentIndex);
    const state = (window as any).__store__?.getState?.() as RootState | undefined;
    const diceTotal = (d6A ?? 0) + (d6B ?? 0) + specialNumeric;
    const rent = computeRent({ ...(state as any), properties: propsState } as RootState, tile.id, diceTotal);
    const ownerIdForTile = propsState.byTileId[tile.id]?.ownerId as string | null;
    if (!moneyPlayerId || !ownerIdForTile || rent <= 0) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -rent }));
    dispatch(adjustPlayerMoney({ id: ownerIdForTile, delta: +rent }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'RENT',
        payload: { tileId: tile.id, from: moneyPlayerId, to: ownerIdForTile, amount: rent, message: `Rent ${rent}` },
        moneyDelta: -rent,
        createdAt: new Date().toISOString(),
      })
    );
  };

  const onPayTax = (): void => {
    const tile = getTileByIndex(currentIndex);
    if (tile.type !== 'tax' || !tile.taxAmount || !moneyPlayerId) return;
    dispatch(adjustPlayerMoney({ id: moneyPlayerId, delta: -tile.taxAmount }));
    dispatch(
      appendEvent({
        id: crypto.randomUUID(),
        gameId: 'local',
        type: 'FEE',
        payload: { tileId: tile.id, from: moneyPlayerId, amount: tile.taxAmount, message: `Tax ${tile.taxAmount}` },
        moneyDelta: -tile.taxAmount,
        createdAt: new Date().toISOString(),
      })
    );
  };

  const onMortgageToggle = (mortgaged: boolean): void => {
    const tile = getTileByIndex(currentIndex);
    if (!(tile.type === 'property' || tile.type === 'railroad' || tile.type === 'utility')) return;
    dispatch(setMortgaged({ tileId: tile.id, mortgaged }));
    dispatch(appendEvent({ id: crypto.randomUUID(), gameId: 'local', type: 'MONEY_ADJUST', payload: { tileId: tile.id, mortgaged }, createdAt: new Date().toISOString() }));
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

  const currentTileName = getTileByIndex(currentIndex)?.name ?? '—';

  const getToggleBtnClass = (selected: boolean): string =>
    `${selected ? 'bg-emerald-600 text-white border-emerald-600' : 'bg-white text-neutral-800 border-neutral-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700'} inline-flex items-center justify-center rounded-md border px-2 py-1 text-sm font-medium shadow-sm`;

  const pageVariants = {
    initial: { opacity: 0, x: 20 },
    enter: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
  };

  const rollSummary = hasRoll ? `${d6A}+${d6B}${special ? ` + ${String(special)}` : ''} = ${rollTotal}` : '—';

  const canGoNext = (step: 0 | 1 | 2): boolean => {
    if (step === 0) return true;
    if (step === 1) return hasFullNumericRoll; // Next confirms the roll when all three dice are numeric
    return false;
  };

  const goNext = (): void => {
    if (activeStep === 0) {
      setActiveStep(1);
      setHighestStep(1);
    } else if (activeStep === 1 && canGoNext(1)) {
      setRollConfirmed(true);
      setActiveStep(2);
      setHighestStep(2);
    }
  };

  // helper for nav button styles
  const nextBtnDisabled = (): boolean => activeStep >= 2 || (activeStep === 1 && !hasFullNumericRoll);

  const stepItems = [
    { id: 0 as const, title: 'Pre Action', desc: preAction || 'None' },
    { id: 1 as const, title: 'Roll', desc: rollSummary },
    { id: 2 as const, title: 'Post-action', desc: postAction || 'None' },
  ];

  // //#render
  return (
    <div className="w-full max-w-5xl space-y-6">
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold flex items-center gap-3">
          GM Console
          {racePot.active && (
            <span data-qa="badge-race-pot" className="inline-flex items-center gap-2 rounded-full bg-emerald-600 text-white text-xs font-semibold px-3 py-1">
              <span role="img" aria-label="Race pot">🏃‍➡️💰</span>
              ${racePot.amount} · {racePot.participants.length} players
            </span>
          )}
        </h1>
        {/* HUD summary */}
        <div data-qa="hud-bank" className="flex flex-wrap items-center gap-3 text-sm">
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
            Houses: <strong>{propsState.housesRemaining}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
            Hotels: <strong>{propsState.hotelsRemaining}</strong>
          </span>
          <span className="inline-flex items-center gap-1 rounded-md bg-neutral-100 dark:bg-neutral-800 px-2 py-1">
            Bank props: <strong>{bankUnownedCount}</strong>
          </span>
        </div>
      </div>

      {/* Player turn cards */}
      <div data-qa="turn-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {players.map((p, idx) => {
          const isActive = idx === turnIndex;
          const emoji = AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂';
          return (
            <div key={p.id} className={`rounded-lg border ${isActive ? 'border-emerald-400' : 'border-neutral-200 dark:border-neutral-700'} p-3 bg-white dark:bg-neutral-900`}> 
              <div className="flex items-center gap-3">
                <div className="font-semibold">{idx + 1}</div>
                <div style={{ ['--player-color' as any]: p.color } as React.CSSProperties}>
                  <AvatarToken emoji={emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={36} />
                </div>
                <div className="font-semibold"> {p.nickname}</div>
                <div className="ml-auto text-sm opacity-80">${p.money}</div>
              </div>
              {isActive && (
                <div className="mt-3 space-y-4">
                  {/* Stepper navigation */}
                  <div className="pb-2">
                    <div className="flex items-center">
                      {stepItems.map((s, i) => {
                        const status = s.id < activeStep ? 'done' : s.id === activeStep ? 'current' : 'upcoming';
                        const clickable = s.id <= highestStep || s.id === activeStep;
                        return (
                          <div key={s.id} className="flex-1 flex flex-col items-center text-center">
                            {/* top label */}
                            <div className="text-xs font-medium mb-1">{s.title}</div>
                            {/* circle */}
                            <button
                              type="button"
                              disabled={!clickable}
                              onClick={() => clickable && setActiveStep(s.id)}
                              className={`relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-full border transition-colors ${
                                status === 'done'
                                  ? 'bg-emerald-600 border-emerald-600 text-white'
                                  : status === 'current'
                                  ? 'bg-white dark:bg-neutral-900 border-emerald-500 text-emerald-600'
                                  : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-400'
                              } ${!clickable ? 'opacity-60 cursor-not-allowed' : ''}`}
                            >
                              {status === 'done' ? '✓' : s.id + 1}
                            </button>
                            {/* connector line */}
                            {i < stepItems.length - 1 && (
                              <div className={`h-1 w-full -mt-4 ${i < activeStep ? 'bg-emerald-500' : 'bg-neutral-200 dark:bg-neutral-800'}`} aria-hidden />
                            )}
                            {/* desc */}
                            <div className="text-[11px] opacity-70 mt-2 min-h-4 px-1">{s.desc}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  <AnimatePresence mode="wait">
                    {activeStep === 0 && (
                      <motion.div key="pre" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2">
                        <div className="text-xs font-medium">Pre-actions</div>
                        <div>
                          <select className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700" value={preAction} onChange={(e) => setPreAction(e.target.value)}>
                            <option>None</option>
                            <option>Mortgage</option>
                            <option>Unmortgage</option>
                            <option>Build</option>
                            <option>Sell</option>
                            <option>Money Adjust</option>
                          </select>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 1 && (
                      <motion.div key="roll" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2">
                        <div className="text-xs font-medium flex items-center gap-2">
                          <span>Roll</span>
                          {hasRoll && <span className="inline-flex items-center rounded bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 text-[11px]">Total: {rollTotal}</span>}
                        </div>
                        <div className="space-y-2">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs opacity-80 w-12">D6 A:</span>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <button key={`a-${n}`} type="button" className={getToggleBtnClass(d6A === n)} onClick={() => setD6A(n)}>
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs opacity-80 w-12">D6 B:</span>
                            {[1, 2, 3, 4, 5, 6].map((n) => (
                              <button key={`b-${n}`} type="button" className={getToggleBtnClass(d6B === n)} onClick={() => setD6B(n)}>
                                {n}
                              </button>
                            ))}
                          </div>
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-xs opacity-80 w-12">Special:</span>
                            {(['1', '2', '3', '+1', '-1', 'Bus'] as const).map((label) => (
                              <button
                                key={`s-${label}`}
                                type="button"
                                className={getToggleBtnClass(String(special ?? '') === label)}
                                onClick={() => setSpecial((isNaN(Number(label)) ? (label as SpecialDieFace) : (Number(label) as SpecialDieFace)))}
                              >
                                {label}
                              </button>
                            ))}
                          </div>
                        </div>
                      </motion.div>
                    )}

                    {activeStep === 2 && (
                      <motion.div key="post" variants={pageVariants} initial="initial" animate="enter" exit="exit" className="space-y-2">
                        <div className="text-xs font-medium">Post-actions</div>
                        <div>
                          <select className="w-full rounded-md border border-neutral-300 bg-white px-2 py-1 text-sm dark:bg-neutral-900 dark:border-neutral-700" value={postAction} onChange={(e) => setPostAction(e.target.value)}>
                            <option>None</option>
                            <option>Pay Rent</option>
                            <option>Pay Tax</option>
                            <option>Draw Card</option>
                          </select>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>

                  {/* Navigation */}
                  <div className="flex items-center justify-between pt-1">
                    {activeStep < 2 ? (
                      <button
                        type="button"
                        className={`inline-flex items-center justify-center rounded-md px-3 py-1.5 text-sm font-medium border bg-transparent ${
                          nextBtnDisabled()
                            ? 'text-neutral-400 dark:text-neutral-500 border-neutral-200 dark:border-neutral-800 opacity-50 cursor-not-allowed'
                            : 'text-neutral-800 dark:text-neutral-100 border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                        }`}
                        disabled={nextBtnDisabled()}
                        onClick={goNext}
                      >
                        Next
                      </button>
                    ) : (
                      <button
                        type="button"
                        className="relative inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 text-white text-sm font-semibold shadow select-none"
                        disabled={!hasFullNumericRoll || !rollConfirmed}
                        onMouseDown={() => onEndTurnHoldStart(p.id)}
                        onMouseUp={onEndTurnHoldCancel}
                        onMouseLeave={onEndTurnHoldCancel}
                        onTouchStart={() => onEndTurnHoldStart(p.id)}
                        onTouchEnd={onEndTurnHoldCancel}
                      >
                        End Turn
                        <span className="absolute left-0 top-0 h-full rounded-md bg-emerald-500/40" style={{ width: `${holdProgress}%` }} aria-hidden />
                      </button>
                    )}
                    <div className="text-xs opacity-70">Step {activeStep + 1} of 3</div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Existing GM controls for power users (keep for now) */}
      <div className="w-full max-w-3xl space-y-6">
        {/* //#gm-inputs: dice/current index inputs */}
        <div data-qa="gm-inputs" className="grid grid-cols-1 gap-4">
          <div className="space-y-2">
            <label className="block text-sm font-medium">Current Tile: {currentTileName} ({currentIndex})</label>
            <input data-qa="current-index" type="number" value={currentIndex} onChange={(e) => setCurrentIndex(parseInt(e.target.value || '0', 10))} className="w-full rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
          </div>
        </div>

        {/* //#gm-actions: record board interactions and finances */}
        <div data-qa="gm-actions" className="flex flex-wrap gap-3">
          <button data-qa="btn-evaluate" onClick={onEvaluate} disabled={!hasRoll} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-blue-600 disabled:bg-blue-300 text-white font-semibold shadow hover:enabled:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-blue-400">Evaluate Roll</button>
          <button data-qa="btn-apply-move" onClick={() => onApplyMove()} disabled={!hasRoll} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-emerald-600 disabled:bg-emerald-300 text-white font-semibold shadow hover:enabled:bg-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-400">Apply Move</button>
          <div className="inline-flex items-center gap-2">
            <select data-qa="owner-picker" value={ownerId} onChange={(e) => setOwnerId(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <option value="">Select owner</option>
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <button data-qa="btn-buy-property" onClick={onBuyProperty} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-amber-600 text-white font-semibold shadow hover:bg-amber-700 focus:outline-none focus:ring-2 focus:ring-amber-400">Buy Property</button>
          </div>
          <div className="inline-flex items-center gap-2">
            <select data-qa="money-player" value={moneyPlayerId} onChange={(e) => setMoneyPlayerId(e.target.value)} className="rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700">
              <option value="">Select player</option>
              {players.map((p) => (
                <option value={p.id} key={p.id}>
                  {p.nickname}
                </option>
              ))}
            </select>
            <input data-qa="money-delta" type="number" value={moneyDelta} onChange={(e) => setMoneyDelta(parseInt(e.target.value || '0', 10))} className="w-28 rounded-md border border-neutral-300 bg-white px-3 py-2 text-sm text-neutral-900 shadow-sm focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-300 dark:bg-neutral-900 dark:text-neutral-100 dark:border-neutral-700" />
            <button data-qa="btn-apply-money" onClick={onAdjustMoney} className="inline-flex items-center justify-center rounded-md px-3 py-2 bg-slate-700 text-white font-semibold shadow hover:bg-slate-800 focus:outline-none focus:ring-2 focus:ring-slate-400">Apply Money</button>
          </div>
          <button data-qa="btn-pay-rent" onClick={onPayRent} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-rose-600 text-white font-semibold shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400">Pay Rent</button>
          <button data-qa="btn-pay-tax" onClick={onPayTax} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-orange-600 text-white font-semibold shadow hover:bg-orange-700 focus:outline-none focus:ring-2 focus:ring-orange-400">Pay Tax</button>
          <button data-qa="btn-mortgage" onClick={() => onMortgageToggle(true)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-600 text-white font-semibold shadow hover:bg-zinc-700 focus:outline-none focus:ring-2 focus:ring-zinc-400">Mortgage</button>
          <button data-qa="btn-unmortgage" onClick={() => onMortgageToggle(false)} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-zinc-500 text-white font-semibold shadow hover:bg-zinc-600 focus:outline-none focus:ring-2 focus:ring-zinc-300">Unmortgage</button>
          <button data-qa="btn-build" onClick={onBuild} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-green-700 text-white font-semibold shadow hover:bg-green-800 focus:outline-none focus:ring-2 focus:ring-green-500">Build</button>
          <button data-qa="btn-sell" onClick={onSell} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-yellow-700 text-white font-semibold shadow hover:bg-yellow-800 focus:outline-none focus:ring-2 focus:ring-yellow-500">Sell</button>
          <button data-qa="btn-draw-chance" onClick={() => onDrawCard('chance')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-purple-600 text-white font-semibold shadow hover:bg-purple-700 focus:outline-none focus:ring-2 focus:ring-purple-400">Draw Chance</button>
          <button data-qa="btn-draw-community" onClick={() => onDrawCard('community')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-fuchsia-600 text-white font-semibold shadow hover:bg-fuchsia-700 focus:outline-none focus:ring-2 focus:ring-fuchsia-400">Draw Community</button>
          <button data-qa="btn-draw-bus" onClick={() => onDrawCard('bus')} className="inline-flex items-center justify-center rounded-md px-4 py-2 bg-cyan-600 text-white font-semibold shadow hover:bg-cyan-700 focus:outline-none focus:ring-2 focus:ring-cyan-400">Draw Bus</button>
        </div>
      </div>

      {/* //#cards-last: quick reference of last drawn cards for GM */}
      <div data-qa="cards-last" className="grid grid-cols-1 md:grid-cols-3 gap-4">
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

      {/* //#advisories: human-readable suggestions before committing actions */}
      <div data-qa="advisories" className="space-y-2">
        <h2 className="text-lg font-medium">Advisories</h2>
        <ul className="list-disc pl-5 space-y-1 text-sm opacity-90">
          {advice.map((msg, i) => (
            <li key={i}>{msg}</li>
          ))}
        </ul>
      </div>

      {/* //#event-log: chronological record of GM actions for spectators and undo later */}
      <EventLog />
    </div>
  );
}
