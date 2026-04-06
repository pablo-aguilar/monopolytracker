import React, { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import { perimeterPathInclusive } from '@/data/board';

export type BoardRimPlayer = {
  id: string;
  positionIndex: number;
  color: string;
};

/** 4px fill + 1px border each side (box-content) → ~6px across; offset from center to top-left */
const TOKEN_OFFSET = 3;
const HOP_MS = 88;

function unionCenterToContainer(
  container: HTMLElement,
  elements: HTMLElement[],
): { x: number; y: number } | null {
  if (elements.length === 0) return null;
  let l = Infinity;
  let t = Infinity;
  let r = -Infinity;
  let b = -Infinity;
  for (const el of elements) {
    const rect = el.getBoundingClientRect();
    l = Math.min(l, rect.left);
    t = Math.min(t, rect.top);
    r = Math.max(r, rect.right);
    b = Math.max(b, rect.bottom);
  }
  const cr = container.getBoundingClientRect();
  return { x: (l + r) / 2 - cr.left, y: (t + b) / 2 - cr.top };
}

function measureCenters(container: HTMLElement): Map<number, { x: number; y: number }> {
  const byIndex = new Map<number, HTMLElement[]>();
  container.querySelectorAll<HTMLElement>('[data-board-index]').forEach((node) => {
    const raw = node.dataset.boardIndex;
    if (raw == null || raw === '') return;
    const idx = Number(raw);
    if (Number.isNaN(idx)) return;
    const list = byIndex.get(idx) ?? [];
    list.push(node);
    byIndex.set(idx, list);
  });
  const out = new Map<number, { x: number; y: number }>();
  byIndex.forEach((els, idx) => {
    const c = unionCenterToContainer(container, els);
    if (c) out.set(idx, c);
  });
  return out;
}

function PlayerRimToken({
  color,
  positionIndex,
  stackIndex,
  centers,
}: {
  color: string;
  positionIndex: number;
  stackIndex: number;
  centers: Map<number, { x: number; y: number }>;
}): JSX.Element | null {
  const visualRef = useRef(positionIndex);
  const [renderIdx, setRenderIdx] = useState(positionIndex);

  const dx = (stackIndex % 3) * 5;
  const dy = Math.floor(stackIndex / 3) * 5;

  useEffect(() => {
    const from = visualRef.current;
    const to = positionIndex;
    if (from === to) return;

    let cancelled = false;
    const path = perimeterPathInclusive(from, to);

    (async () => {
      if (path.length <= 1) {
        visualRef.current = to;
        setRenderIdx(to);
        return;
      }
      for (let i = 1; i < path.length; i++) {
        if (cancelled) return;
        visualRef.current = path[i];
        setRenderIdx(path[i]);
        if (i < path.length - 1) {
          await new Promise<void>((r) => {
            setTimeout(r, HOP_MS);
          });
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [positionIndex]);

  const center = centers.get(renderIdx);

  if (!center) {
    return null;
  }

  const x = center.x - TOKEN_OFFSET + dx;
  const y = center.y - TOKEN_OFFSET + dy;

  return (
    <motion.div
      className="pointer-events-none absolute left-0 top-0 z-[30] box-content h-1 w-1 rounded-full border border-solid border-surface-1"
      style={{ backgroundColor: color }}
      initial={false}
      animate={{ x, y }}
      transition={{
        type: 'spring',
        stiffness: 520,
        damping: 22,
        mass: 0.35,
      }}
    />
  );
}

export interface BoardRimTokensProps {
  containerRef: React.RefObject<HTMLElement | null>;
  players: BoardRimPlayer[];
}

export default function BoardRimTokens({ containerRef, players }: BoardRimTokensProps): JSX.Element | null {
  const [centers, setCenters] = useState<Map<number, { x: number; y: number }>>(new Map());

  const measure = useMemo(() => {
    return () => {
      const el = containerRef.current;
      if (!el) return;
      setCenters(measureCenters(el));
    };
  }, [containerRef]);

  useLayoutEffect(() => {
    measure();
  }, [measure, players]);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;
    const ro = new ResizeObserver(() => measure());
    ro.observe(el);
    return () => ro.disconnect();
  }, [containerRef, measure]);

  const stackByTile = useMemo(() => {
    const m = new Map<number, number>();
    return players.map((p) => {
      const n = m.get(p.positionIndex) ?? 0;
      m.set(p.positionIndex, n + 1);
      return { ...p, stackIndex: n };
    });
  }, [players]);

  if (players.length === 0 || centers.size === 0) {
    return null;
  }

  return (
    <div
      data-cmp="o/BoardRimTokens"
      data-qa="board-rim-tokens"
      className="pointer-events-none absolute inset-0 z-[25] overflow-visible"
      aria-hidden
    >
      {stackByTile.map((p) => (
        <PlayerRimToken
          key={p.id}
          color={p.color}
          positionIndex={p.positionIndex}
          stackIndex={p.stackIndex}
          centers={centers}
        />
      ))}
    </div>
  );
}
