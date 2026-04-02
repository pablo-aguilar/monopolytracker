import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
import { FaBusAlt } from 'react-icons/fa';
import { GiDiceFire, GiTeleport } from 'react-icons/gi';
import { IoClose } from 'react-icons/io5';
import { IoDiceSharp } from 'react-icons/io5';

export interface DiceSelectorProps {
  d6A: number | null;
  d6B: number | null;
  special: string | number | null;
  onSelectA: (n: number) => void;
  onSelectB: (n: number) => void;
  onSelectSpecial: (v: string | number) => void;
  showSpecial?: boolean;
  /** Fourth tab: triple teleport (parent derives from `isTriple`). */
  showTeleportTab?: boolean;
  tripleTeleportTo?: number | null;
  /** Shown after a tile is chosen, e.g. abbreviated name + optional +1k. */
  teleportDestinationLabel?: string;
  onOpenTeleport?: () => void;
  onClearTeleport?: () => void;
  /** Styling for triple-ones jackpot path. */
  isTripleOnesStyle?: boolean;
}

type TabId = 'a' | 'b' | 'special' | 'teleport';

function btnClass(active: boolean): string {
  return `inline-flex items-center justify-center h-10 min-w-8 rounded-md border px-2 text-base font-medium ${
    active
      ? 'border-slate-800 bg-slate-100 font-semibold text-slate-900 shadow-sm dark:border-slate-300 dark:bg-slate-800 dark:text-slate-50'
      : 'bg-white dark:bg-neutral-900 border-neutral-300 dark:border-neutral-700 text-neutral-800 dark:text-neutral-100 hover:bg-neutral-50 dark:hover:bg-neutral-800'
  }`;
}

function formatSpecialShort(s: string | number | null): string {
  if (s === null) return '';
  if (s === 'Bus') return 'Bus';
  return String(s);
}

function specialFaceActive(special: string | number | null, v: string | number): boolean {
  if (v === '-1') return String(special ?? '') === v;
  return special === v;
}

function tabIdsFor(showSpecial: boolean, showTeleport: boolean): TabId[] {
  const base: TabId[] = showSpecial ? ['a', 'b', 'special'] : ['a', 'b'];
  return showTeleport ? [...base, 'teleport'] : base;
}

const PILL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 36 };
const DRAG_SETTLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DRAG_SETTLE_TWEEN = { type: 'tween' as const, duration: 0.38, ease: DRAG_SETTLE_EASE };

const TELEPORT_INTRO_MS = 420;

export default function DiceSelector({
  d6A,
  d6B,
  special,
  onSelectA,
  onSelectB,
  onSelectSpecial,
  showSpecial = true,
  showTeleportTab = false,
  tripleTeleportTo = null,
  teleportDestinationLabel = '',
  onOpenTeleport = () => {},
  onClearTeleport = () => {},
  isTripleOnesStyle = false,
}: DiceSelectorProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('a');
  const [pill, setPill] = useState({ left: 0, width: 0 });
  const [dragConstraintsPx, setDragConstraintsPx] = useState({ left: 0, right: 0 });
  const [pillLayoutTransition, setPillLayoutTransition] = useState<typeof PILL_SPRING | { duration: 0 }>(PILL_SPRING);

  const stripRef = useRef<HTMLDivElement>(null);
  const pillRef = useRef<HTMLDivElement | null>(null);
  const tabBtnRefs = useRef<(HTMLButtonElement | null)[]>([]);
  const scrollRef = useRef<HTMLDivElement>(null);
  const programmaticScrollRef = useRef(false);
  const activeTabRef = useRef(activeTab);
  activeTabRef.current = activeTab;

  const dragX = useMotionValue(0);
  const draggingRef = useRef(false);
  const dragJustEndedRef = useRef(false);
  const pointerDownRef = useRef<{ x: number; y: number } | null>(null);
  const settleAnimRef = useRef<ReturnType<typeof animate> | null>(null);
  const teleportAutoNavTimerRef = useRef<number | null>(null);
  const teleportIntroGenerationRef = useRef(0);

  const tabToIndex = useCallback(
    (t: TabId): number => {
      const ids = tabIdsFor(showSpecial, showTeleportTab);
      const i = ids.indexOf(t);
      return i >= 0 ? i : 0;
    },
    [showSpecial, showTeleportTab]
  );

  const measurePill = useCallback(() => {
    if (draggingRef.current) return;
    const strip = stripRef.current;
    const idx = tabToIndex(activeTab);
    const btn = tabBtnRefs.current[idx];
    if (!strip || !btn) return;
    const s = strip.getBoundingClientRect();
    const b = btn.getBoundingClientRect();
    setPill({ left: b.left - s.left, width: b.width });
  }, [activeTab, tabToIndex]);

  useLayoutEffect(() => {
    measurePill();
  }, [measurePill, showSpecial, showTeleportTab]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || pill.width <= 0) {
      setDragConstraintsPx({ left: 0, right: 0 });
      return;
    }
    const S = strip.clientWidth;
    const { left: L, width: W } = pill;
    setDragConstraintsPx({ left: -L, right: Math.max(0, S - L - W) });
  }, [pill, showSpecial, showTeleportTab]);

  useEffect(() => {
    const strip = stripRef.current;
    if (!strip || typeof ResizeObserver === 'undefined') return;
    const ro = new ResizeObserver(() => measurePill());
    ro.observe(strip);
    return () => ro.disconnect();
  }, [measurePill]);

  const syncActiveFromScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el || programmaticScrollRef.current) return;
    const w = el.clientWidth;
    if (w <= 0) return;
    const ids = tabIdsFor(showSpecial, showTeleportTab);
    const i = Math.min(ids.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
    const next = ids[i]!;
    if (next !== activeTabRef.current) {
      setActiveTab(next);
    }
  }, [showSpecial, showTeleportTab]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    let debounce: number;
    const onScroll = (): void => {
      if (programmaticScrollRef.current) return;
      window.clearTimeout(debounce);
      debounce = window.setTimeout(syncActiveFromScroll, 48);
    };
    el.addEventListener('scroll', onScroll, { passive: true });
    const onScrollEnd = (): void => {
      programmaticScrollRef.current = false;
      syncActiveFromScroll();
    };
    el.addEventListener('scrollend', onScrollEnd);
    return () => {
      el.removeEventListener('scroll', onScroll);
      el.removeEventListener('scrollend', onScrollEnd);
      window.clearTimeout(debounce);
    };
  }, [syncActiveFromScroll]);

  useEffect(() => {
    const el = scrollRef.current;
    if (!el) return;
    const idx = tabToIndex(activeTab);
    const w = el.clientWidth;
    const target = idx * w;
    if (Math.abs(el.scrollLeft - target) < 4) return;
    programmaticScrollRef.current = true;
    el.scrollTo({ left: target, behavior: 'smooth' });
    const t = window.setTimeout(() => {
      programmaticScrollRef.current = false;
    }, 380);
    return () => window.clearTimeout(t);
  }, [activeTab, showSpecial, showTeleportTab, tabToIndex]);

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

  useEffect(() => {
    if (!showTeleportTab && activeTab === 'teleport') {
      setActiveTab(showSpecial ? 'special' : 'b');
    }
  }, [showTeleportTab, activeTab, showSpecial]);

  /** When triple appears: show 4th tab, then auto-navigate to Teleport panel after a short beat. */
  useEffect(() => {
    if (teleportAutoNavTimerRef.current != null) {
      window.clearTimeout(teleportAutoNavTimerRef.current);
      teleportAutoNavTimerRef.current = null;
    }
    if (!showTeleportTab) {
      teleportIntroGenerationRef.current += 1;
      return;
    }
    const gen = ++teleportIntroGenerationRef.current;
    teleportAutoNavTimerRef.current = window.setTimeout(() => {
      teleportAutoNavTimerRef.current = null;
      if (gen !== teleportIntroGenerationRef.current) return;
      setActiveTab('teleport');
    }, TELEPORT_INTRO_MS);
    return () => {
      if (teleportAutoNavTimerRef.current != null) {
        window.clearTimeout(teleportAutoNavTimerRef.current);
        teleportAutoNavTimerRef.current = null;
      }
    };
  }, [showTeleportTab]);

  const hitTestTabIndex = useCallback(
    (clientX: number): number => {
      const ids = tabIdsFor(showSpecial, showTeleportTab);
      let best = 0;
      let bestDist = Number.POSITIVE_INFINITY;
      for (let i = 0; i < ids.length; i++) {
        const btn = tabBtnRefs.current[i];
        if (!btn) continue;
        const r = btn.getBoundingClientRect();
        const mx = r.left + r.width / 2;
        const d = Math.abs(clientX - mx);
        if (d < bestDist) {
          bestDist = d;
          best = i;
        }
      }
      return best;
    },
    [showSpecial, showTeleportTab]
  );

  const snapPillAfterDrag = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const s = strip.getBoundingClientRect();
    const ids = tabIdsFor(showSpecial, showTeleportTab);
    const curIdx = tabToIndex(activeTabRef.current);
    const curBtn = tabBtnRefs.current[curIdx];
    const pillEl = pillRef.current;
    if (!curBtn || !pillEl) return;

    const rect = pillEl.getBoundingClientRect();
    const cx = rect.left + rect.width / 2;
    let best = 0;
    let bestDist = Number.POSITIVE_INFINITY;
    for (let i = 0; i < ids.length; i++) {
      const btn = tabBtnRefs.current[i];
      if (!btn) continue;
      const r = btn.getBoundingClientRect();
      const mx = r.left + r.width / 2;
      const d = Math.abs(cx - mx);
      if (d < bestDist) {
        bestDist = d;
        best = i;
      }
    }

    const nextBtn = tabBtnRefs.current[best];
    if (!nextBtn) return;

    const La = curBtn.getBoundingClientRect().left - s.left;
    const Lc = nextBtn.getBoundingClientRect().left - s.left;
    const dx = dragX.get();

    settleAnimRef.current?.stop();
    setPillLayoutTransition({ duration: 0 });
    dragX.set(La + dx - Lc);
    setActiveTab(ids[best]!);
    dragJustEndedRef.current = true;

    requestAnimationFrame(() => {
      settleAnimRef.current = animate(dragX, 0, DRAG_SETTLE_TWEEN);
      void settleAnimRef.current.then(() => {
        settleAnimRef.current = null;
        setPillLayoutTransition(PILL_SPRING);
      });
    });
  }, [dragX, showSpecial, showTeleportTab, tabToIndex]);

  const onStripPointerDown = (e: React.PointerEvent): void => {
    if ((e.target as HTMLElement).closest('[data-dice-pill]')) return;
    pointerDownRef.current = { x: e.clientX, y: e.clientY };
  };

  const onStripPointerUp = (e: React.PointerEvent): void => {
    if ((e.target as HTMLElement).closest('[data-dice-pill]')) {
      pointerDownRef.current = null;
      return;
    }
    if (dragJustEndedRef.current) {
      dragJustEndedRef.current = false;
      pointerDownRef.current = null;
      return;
    }
    const start = pointerDownRef.current;
    pointerDownRef.current = null;
    if (!start) return;
    const dx = e.clientX - start.x;
    const dy = e.clientY - start.y;
    if (Math.hypot(dx, dy) > 12) return;
    const ids = tabIdsFor(showSpecial, showTeleportTab);
    const idx = hitTestTabIndex(e.clientX);
    setActiveTab(ids[idx]!);
  };

  const onTabListKeyDown = (e: React.KeyboardEvent): void => {
    const ids = tabIdsFor(showSpecial, showTeleportTab);
    const cur = tabToIndex(activeTab);
    if (e.key === 'ArrowRight') {
      e.preventDefault();
      setActiveTab(ids[Math.min(ids.length - 1, cur + 1)]!);
    } else if (e.key === 'ArrowLeft') {
      e.preventDefault();
      setActiveTab(ids[Math.max(0, cur - 1)]!);
    } else if (e.key === 'Home') {
      e.preventDefault();
      setActiveTab(ids[0]!);
    } else if (e.key === 'End') {
      e.preventDefault();
      setActiveTab(ids[ids.length - 1]!);
    }
  };

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

  const setTabBtnRefFor = useCallback(
    (id: TabId) => (el: HTMLButtonElement | null): void => {
      const list = tabIdsFor(showSpecial, showTeleportTab);
      const idx = list.indexOf(id);
      if (idx >= 0) tabBtnRefs.current[idx] = el;
    },
    [showSpecial, showTeleportTab]
  );

  const tabLabelClass = (id: TabId): string => {
    const on = activeTab === id;
    return `relative z-[2] flex flex-1 flex-col items-center justify-center gap-1 rounded-full border border-transparent px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm pointer-events-none ${
      on ? 'text-slate-900 dark:text-slate-100' : 'text-neutral-500 dark:text-neutral-400'
    }`;
  };

  const teleportPanelClass = isTripleOnesStyle
    ? 'border-amber-500/60 bg-amber-50/80 dark:bg-amber-950/30'
    : 'border-indigo-500/60 bg-indigo-50/80 dark:bg-indigo-950/30';

  const teleportBtnClass = isTripleOnesStyle
    ? 'border-amber-500 text-amber-800 dark:text-amber-200 hover:bg-amber-100 dark:hover:bg-amber-900/40'
    : 'border-indigo-500 text-indigo-700 dark:text-indigo-200 hover:bg-indigo-100 dark:hover:bg-indigo-900/40';

  const teleportChosenClass = isTripleOnesStyle
    ? 'border-amber-500 text-amber-900 dark:text-amber-100 bg-amber-50 dark:bg-amber-900/40'
    : 'border-indigo-500 text-indigo-800 dark:text-indigo-100 bg-indigo-50 dark:bg-indigo-900/40';

  return (
    <div data-cmp="m/DiceSelector" className="space-y-3">
      <div
        ref={stripRef}
        role="tablist"
        aria-label="Dice to set"
        tabIndex={0}
        onKeyDown={onTabListKeyDown}
        onPointerDown={onStripPointerDown}
        onPointerUp={onStripPointerUp}
        className="relative flex h-11 items-center gap-0.5 border-b border-tint bg-surface-0 py-0 pl-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-neutral-400 focus-visible:ring-offset-2 dark:border-neutral-600 dark:focus-visible:ring-neutral-500 dark:focus-visible:ring-offset-neutral-900 rounded-full"
      >
        <motion.div
          ref={pillRef}
          data-dice-pill
          aria-hidden
          drag="x"
          dragConstraints={dragConstraintsPx}
          dragElastic={0}
          dragMomentum={false}
          dragTransition={{ bounceStiffness: 100, bounceDamping: 18 }}
          style={{ x: dragX, touchAction: 'none' }}
          className="absolute top-1 bottom-1 z-[3] cursor-grab rounded-full border border-slate-800 bg-slate-800/10 shadow-sm active:cursor-grabbing dark:border-slate-300 dark:bg-slate-300/10 dark:shadow-black/25"
          initial={false}
          animate={{ left: pill.left, width: Math.max(0, pill.width) }}
          transition={pillLayoutTransition}
          onDragStart={() => {
            settleAnimRef.current?.stop();
            settleAnimRef.current = null;
            draggingRef.current = true;
          }}
          onDragEnd={() => {
            draggingRef.current = false;
            snapPillAfterDrag();
          }}
          whileTap={{ scale: 0.985 }}
        />
        <button
          ref={setTabBtnRefFor('a')}
          type="button"
          role="tab"
          tabIndex={-1}
          aria-selected={activeTab === 'a'}
          aria-label={d6A != null ? `Die A, value ${d6A}` : 'Die A'}
          id="dice-tab-a"
          aria-controls="dice-panels"
          className={tabLabelClass('a')}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <IoDiceSharp className="h-5 w-5 shrink-0" aria-hidden />
          </span>
        </button>
        <button
          ref={setTabBtnRefFor('b')}
          type="button"
          role="tab"
          tabIndex={-1}
          aria-selected={activeTab === 'b'}
          aria-label={d6B != null ? `Die B, value ${d6B}` : 'Die B'}
          id="dice-tab-b"
          aria-controls="dice-panels"
          className={tabLabelClass('b')}
        >
          <span className="inline-flex items-center justify-center gap-1">
            <IoDiceSharp className="h-5 w-5 shrink-0" aria-hidden />
          </span>
        </button>
        {showSpecial && (
          <button
            ref={setTabBtnRefFor('special')}
            type="button"
            role="tab"
            tabIndex={-1}
            aria-selected={activeTab === 'special'}
            aria-label={special != null ? `Special die, ${formatSpecialShort(special)}` : 'Special die'}
            id="dice-tab-special"
            aria-controls="dice-panels"
            className={tabLabelClass('special')}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <GiDiceFire className="h-6 w-6 shrink-0" aria-hidden />
            </span>
          </button>
        )}
        {showTeleportTab && (
          <motion.button
            ref={setTabBtnRefFor('teleport')}
            type="button"
            role="tab"
            tabIndex={-1}
            aria-selected={activeTab === 'teleport'}
            aria-label="Teleport"
            id="dice-tab-teleport"
            aria-controls="dice-panels"
            className={tabLabelClass('teleport')}
            initial={{ opacity: 0, scale: 0.82 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ type: 'spring', stiffness: 420, damping: 28 }}
          >
            <span className="inline-flex items-center justify-center gap-1">
              <GiTeleport className="h-6 w-6 shrink-0" aria-hidden />
            </span>
          </motion.button>
        )}
      </div>

      <div className="w-full overflow-hidden rounded-md">
        <div
          ref={scrollRef}
          id="dice-panels"
          className="flex snap-x snap-mandatory overflow-x-auto scroll-smooth [-ms-overflow-style:none] [scrollbar-width:none] [&::-webkit-scrollbar]:hidden"
        >
          <section
            id="dice-panel-a"
            role="tabpanel"
            aria-labelledby="dice-tab-a"
            aria-hidden={activeTab !== 'a'}
            className="w-full shrink-0 snap-start snap-always px-0.5"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={`a-${n}`} type="button" className={btnClass(d6A === n)} onClick={() => handleSelectA(n)}>
                  {n}
                </button>
              ))}
            </div>
          </section>

          <section
            id="dice-panel-b"
            role="tabpanel"
            aria-labelledby="dice-tab-b"
            aria-hidden={activeTab !== 'b'}
            className="w-full shrink-0 snap-start snap-always px-0.5"
          >
            <div className="grid grid-cols-3 gap-1.5">
              {[1, 2, 3, 4, 5, 6].map((n) => (
                <button key={`b-${n}`} type="button" className={btnClass(d6B === n)} onClick={() => handleSelectB(n)}>
                  {n}
                </button>
              ))}
            </div>
          </section>

          {showSpecial && (
            <section
              id="dice-panel-special"
              role="tabpanel"
              aria-labelledby="dice-tab-special"
              aria-hidden={activeTab !== 'special'}
              className="w-full shrink-0 snap-start snap-always px-0.5"
            >
              <div className="grid grid-cols-3 gap-1.5">
                {[1, 2, 3].map((n) => (
                  <button key={`s-${n}`} type="button" className={btnClass(special === n)} onClick={() => handleSelectSpecial(n)}>
                    {n}
                  </button>
                ))}
                <button type="button" className={btnClass(specialFaceActive(special, '-1'))} onClick={() => handleSelectSpecial('-1')}>
                  -1
                </button>
                <button type="button" className={btnClass(specialFaceActive(special, '+1'))} onClick={() => handleSelectSpecial('+1')}>
                  <span aria-hidden>+</span>1
                </button>
                <button type="button" className={btnClass(specialFaceActive(special, 'Bus'))} onClick={() => handleSelectSpecial('Bus')}>
                  <span className="inline-flex items-center gap-1.5">
                    <FaBusAlt className="inline-block h-[14px] w-[14px] shrink-0 text-fg" aria-hidden />
                    Bus
                  </span>
                </button>
              </div>
            </section>
          )}

          {showTeleportTab && (
            <section
              id="dice-panel-teleport"
              role="tabpanel"
              aria-labelledby="dice-tab-teleport"
              aria-hidden={activeTab !== 'teleport'}
              className="w-full shrink-0 snap-start snap-always px-0.5"
            >
              <div className={`rounded-lg border p-3 ${teleportPanelClass}`}>
                <p className="mb-3 text-center text-xs leading-snug text-neutral-700 dark:text-neutral-300 sm:text-sm">
                  Triples — choose your space on the board.
                </p>
                {tripleTeleportTo == null ? (
                  <button
                    type="button"
                    onClick={onOpenTeleport}
                    className={`flex w-full items-center justify-center gap-2 rounded-md border-2 px-3 py-2.5 text-sm font-bold ${teleportBtnClass}`}
                  >
                    <GiTeleport className="shrink-0 text-xl" aria-hidden />
                    Teleport
                  </button>
                ) : (
                  <button
                    type="button"
                    aria-label="Clear teleport destination"
                    className={`grid w-full grid-cols-[1fr_auto_1fr] items-center gap-x-1 rounded-full border px-3 py-2 text-sm ${teleportChosenClass}`}
                    onClick={onClearTeleport}
                  >
                    <span aria-hidden className="min-w-0" />
                    <span className="flex min-w-0 items-center justify-center gap-2">
                      <GiTeleport className="shrink-0 text-lg" aria-hidden />
                      <span className="text-center">
                        to {teleportDestinationLabel}
                      </span>
                    </span>
                    <span className="flex justify-end text-current" aria-hidden>
                      <IoClose className="h-5 w-5 shrink-0 opacity-90" />
                    </span>
                  </button>
                )}
              </div>
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
