import React, { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react';
import { animate, motion, useMotionValue } from 'framer-motion';
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

function tabIdsFor(showSpecial: boolean): TabId[] {
  return showSpecial ? ['a', 'b', 'special'] : ['a', 'b'];
}

const PILL_SPRING = { type: 'spring' as const, stiffness: 380, damping: 36 };
/** After drag release: ease-out only (no bounce) so the thumb “drops” in place from the finger position. */
const DRAG_SETTLE_EASE: [number, number, number, number] = [0.22, 1, 0.36, 1];
const DRAG_SETTLE_TWEEN = { type: 'tween' as const, duration: 0.38, ease: DRAG_SETTLE_EASE };

export default function DiceSelector({ d6A, d6B, special, onSelectA, onSelectB, onSelectSpecial, showSpecial = true }: DiceSelectorProps): JSX.Element {
  const [activeTab, setActiveTab] = useState<TabId>('a');
  const [pill, setPill] = useState({ left: 0, width: 0 });
  /** Framer `drag="x"` bounds: min/max translate from rest (`left` ≤ 0, `right` ≥ 0 relative to segment). */
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

  const tabToIndex = useCallback((t: TabId): number => {
    const ids = tabIdsFor(showSpecial);
    const i = ids.indexOf(t);
    return i >= 0 ? i : 0;
  }, [showSpecial]);

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
  }, [measurePill, showSpecial]);

  useLayoutEffect(() => {
    const strip = stripRef.current;
    if (!strip || pill.width <= 0) {
      setDragConstraintsPx({ left: 0, right: 0 });
      return;
    }
    const S = strip.clientWidth;
    const { left: L, width: W } = pill;
    setDragConstraintsPx({ left: -L, right: Math.max(0, S - L - W) });
  }, [pill, showSpecial]);

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
    const ids = tabIdsFor(showSpecial);
    const i = Math.min(ids.length - 1, Math.max(0, Math.round(el.scrollLeft / w)));
    const next = ids[i]!;
    if (next !== activeTabRef.current) {
      setActiveTab(next);
    }
  }, [showSpecial]);

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
  }, [activeTab, showSpecial, tabToIndex]);

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

  const hitTestTabIndex = useCallback(
    (clientX: number): number => {
      const ids = tabIdsFor(showSpecial);
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
    [showSpecial]
  );

  const snapPillAfterDrag = useCallback(() => {
    const strip = stripRef.current;
    if (!strip) return;
    const s = strip.getBoundingClientRect();
    const ids = tabIdsFor(showSpecial);
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
  }, [dragX, showSpecial, tabToIndex]);

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
    const ids = tabIdsFor(showSpecial);
    const idx = hitTestTabIndex(e.clientX);
    setActiveTab(ids[idx]!);
  };

  const onTabListKeyDown = (e: React.KeyboardEvent): void => {
    const ids = tabIdsFor(showSpecial);
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

  const setTabBtnRef = (i: number) => (el: HTMLButtonElement | null): void => {
    tabBtnRefs.current[i] = el;
  };

  const tabLabelClass = (id: TabId): string => {
    const on = activeTab === id;
    return `relative z-[2] flex flex-1 flex-col items-center justify-center gap-1 rounded-full border border-transparent px-2 py-2 text-center text-xs font-semibold transition-colors sm:text-sm pointer-events-none ${
      on ? 'text-emerald-900 dark:text-emerald-100' : 'text-neutral-500 dark:text-neutral-400'
    }`;
  };

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
        className="relative flex gap-0.5 border-b border-tint bg-surface-0 py-1 pl-1 pr-1 outline-none focus-visible:ring-2 focus-visible:ring-emerald-500 focus-visible:ring-offset-2 dark:border-neutral-600 dark:focus-visible:ring-offset-neutral-900 rounded-full"
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
          className="absolute top-1 bottom-1 z-[3] cursor-grab rounded-full border border-emerald-500/45 bg-emerald-500/10 shadow-sm active:cursor-grabbing dark:border-emerald-400/40 dark:bg-emerald-400/10 dark:shadow-emerald-950/20"
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
          ref={setTabBtnRef(0)}
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
          ref={setTabBtnRef(1)}
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
            ref={setTabBtnRef(2)}
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
            </section>
          )}
        </div>
      </div>
    </div>
  );
}
