import React, { useMemo, useState } from 'react';
import {
  autoUpdate,
  flip,
  FloatingPortal,
  offset,
  shift,
  size,
  useClick,
  useDismiss,
  useFloating,
  useInteractions,
  useRole,
} from '@floating-ui/react';
import { FaChevronDown } from 'react-icons/fa';
import { FaFlagCheckered } from 'react-icons/fa6';
import AvatarToken from '@/components/atoms/AvatarToken';
import { AVATARS } from '@/data/avatars';
import type { PlayerLite } from '@/features/players/playersSlice';

export type RacePotBadgeProps = {
  amount: number;
  participantIds: string[];
  players: PlayerLite[];
  className?: string;
};

export default function RacePotBadge({ amount, participantIds, players, className }: RacePotBadgeProps): JSX.Element {
  const [open, setOpen] = useState(false);

  const rows = useMemo(() => {
    return participantIds.map((id) => {
      const p = players.find((x) => x.id === id);
      return p
        ? { id, nickname: p.nickname, color: p.color, emoji: AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂' }
        : { id, nickname: 'Unknown player', color: '#94a3b8', emoji: '🙂' as const };
    });
  }, [participantIds, players]);

  const { refs, floatingStyles, context } = useFloating({
    open,
    onOpenChange: setOpen,
    placement: 'bottom-start',
    middleware: [
      offset(8),
      flip({ padding: 8 }),
      shift({ padding: 8 }),
      size({
        padding: 8,
        apply({ availableHeight, elements }) {
          Object.assign(elements.floating.style, {
            maxHeight: `${Math.max(0, availableHeight)}px`,
            overflowY: 'auto',
          });
        },
      }),
    ],
    whileElementsMounted: autoUpdate,
  });

  const click = useClick(context);
  const dismiss = useDismiss(context);
  const role = useRole(context, { role: 'menu' });

  const { getReferenceProps, getFloatingProps } = useInteractions([click, dismiss, role]);

  const label = `Race pot $${amount}`;

  return (
    <div data-cmp="m/RacePotBadge" className={`relative ${className ?? ''}`}>
      <button
        type="button"
        data-qa="badge-race-pot"
        ref={refs.setReference}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label={`${label}. ${rows.length} participants. Open list.`}
        className="inline-flex items-center gap-1.5 rounded-[18px] border border-emerald-700/35 bg-emerald-600 pl-2.5 pr-2 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-700 sm:pl-3"
        {...getReferenceProps()}
      >
        <FaFlagCheckered className="h-4 w-4 shrink-0" aria-hidden />
        <span>${amount}</span>
        <FaChevronDown className={`h-3 w-3 shrink-0 transition-transform text-white/90 ${open ? 'rotate-180' : ''}`} aria-hidden />
      </button>
      {open ? (
        <FloatingPortal>
          <div
            ref={refs.setFloating}
            style={floatingStyles}
            className="z-[100] min-w-[min(220px,calc(100vw-16px))] space-y-1 rounded-[14px] border border-surface bg-surface-0 p-2 shadow-lg outline-none"
            {...getFloatingProps()}
          >
            {rows.map((row) => (
              <div
                key={row.id}
                className="flex items-center gap-2 rounded-md bg-surface-1 px-2 py-1 text-xs text-fg"
                style={{ ['--player-color' as string]: row.color } as React.CSSProperties}
              >
                <AvatarToken emoji={row.emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={24} />
                <span className="min-w-0 truncate font-medium">{row.nickname}</span>
              </div>
            ))}
          </div>
        </FloatingPortal>
      ) : null}
    </div>
  );
}
