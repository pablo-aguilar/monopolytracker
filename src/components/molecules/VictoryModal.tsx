// Victory overlay with Framer Motion confetti (no extra canvas libs)

import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import AvatarToken from '@/components/atoms/AvatarToken';
import OverlayHeader from '@/components/molecules/OverlayHeader';

const CONFETTI_COLORS = [
  '#f472b6',
  '#34d399',
  '#60a5fa',
  '#fbbf24',
  '#a78bfa',
  '#fb7185',
  '#22d3ee',
  '#facc15',
  '#4ade80',
  '#c084fc',
];

type Particle = {
  id: number;
  leftPct: number;
  delay: number;
  duration: number;
  driftX: number;
  rotateEnd: number;
  color: string;
  w: number;
  h: number;
};

function generateParticles(count: number): Particle[] {
  return Array.from({ length: count }, (_, i) => ({
    id: i,
    leftPct: Math.random() * 100,
    delay: Math.random() * 0.5,
    duration: 2.1 + Math.random() * 2.4,
    driftX: (Math.random() - 0.5) * 300,
    rotateEnd: (Math.random() - 0.5) * 720,
    color: CONFETTI_COLORS[i % CONFETTI_COLORS.length]!,
    w: 4 + Math.random() * 7,
    h: 5 + Math.random() * 9,
  }));
}

function VictoryConfetti({ active }: { active: boolean }): JSX.Element | null {
  const particles = useMemo(() => (active ? generateParticles(72) : []), [active]);
  if (!active || particles.length === 0) return null;
  return (
    <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden>
      {particles.map((p) => (
        <motion.div
          key={p.id}
          className="absolute top-0 rounded-[2px] shadow-sm"
          style={{
            left: `${p.leftPct}%`,
            width: p.w,
            height: p.h,
            marginLeft: -p.w / 2,
            backgroundColor: p.color,
          }}
          initial={{ y: '-8vh', opacity: 1, rotate: 0, x: 0 }}
          animate={{ y: '110vh', opacity: [1, 1, 0.45], rotate: p.rotateEnd, x: p.driftX }}
          transition={{
            duration: p.duration,
            delay: p.delay,
            ease: [0.22, 0.61, 0.36, 1],
          }}
        />
      ))}
    </div>
  );
}

export type VictoryModalProps = {
  open: boolean;
  onClose: () => void;
  winnerNickname: string;
  winnerEmoji: string;
  /** Player color (hex) for avatar ring */
  accentColor: string;
};

export default function VictoryModal({
  open,
  onClose,
  winnerNickname,
  winnerEmoji,
  accentColor,
}: VictoryModalProps): JSX.Element | null {
  return (
    <AnimatePresence>
      {open && (
        <motion.div
          key="victory-modal"
          role="dialog"
          aria-modal="true"
          aria-labelledby="victory-modal-title"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.2 }}
          className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden">
            <VictoryConfetti active />
          </div>
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 16 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 0.96, y: 10 }}
            transition={{ type: 'spring', stiffness: 380, damping: 28 }}
            className="relative z-10 w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700"
          >
            <OverlayHeader
              title={<span id="victory-modal-title">Victory</span>}
              subtitle="Everyone else is out of the game."
              onClose={onClose}
              className="mb-1"
            />
            <div className="mt-4 flex flex-col items-center gap-3">
              <div
                className="rounded-full p-1"
                style={{ boxShadow: `0 0 0 4px ${accentColor}` }}
              >
                <AvatarToken emoji={winnerEmoji} size={88} borderColorClass="border-transparent" />
              </div>
              <p className="text-center text-xl font-bold text-fg">{winnerNickname}</p>
              <p className="text-center text-sm text-muted">Wins the game</p>
              <button
                type="button"
                onClick={onClose}
                className="mt-2 rounded-md bg-emerald-600 hover:bg-emerald-700 px-4 py-2 text-sm font-semibold text-white focus:outline-none focus:ring-2 focus:ring-emerald-400"
              >
                Continue
              </button>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
