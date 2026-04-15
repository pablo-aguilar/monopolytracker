// #index
// - //#component: draggable turn order list using Framer Motion with delete support and race pot toggle

import React from 'react';
import { Reorder } from 'framer-motion';
import { CiEdit } from 'react-icons/ci';
import { IoTrashOutline } from 'react-icons/io5';
import AvatarToken from '@/components/atoms/AvatarToken';
import Toggle from '@/components/atoms/Toggle';

export type TurnPlayer = {
  id: string;
  nickname: string;
  color: string;
  avatarKey: string;
  emoji?: string; // if provided
  racePotOptIn?: boolean;
};

export type TurnOrderListProps = {
  players: TurnPlayer[];
  onReorder: (newOrderIds: string[]) => void;
  onRemove?: (id: string) => void;
  /** When true, hide remove so roster cannot drop below two players. */
  removeDisabled?: boolean;
  onOptInChange?: (id: string, optIn: boolean) => void;
  /** When set, tap/click nickname to edit inline (setup). */
  onNicknameChange?: (id: string, nickname: string) => void;
};

export default function TurnOrderList({
  players,
  onReorder,
  onRemove,
  removeDisabled = false,
  onOptInChange,
  onNicknameChange,
}: TurnOrderListProps): JSX.Element {
  const [order, setOrder] = React.useState(players);
  const [editingId, setEditingId] = React.useState<string | null>(null);
  const [draft, setDraft] = React.useState('');
  const nicknameInputRef = React.useRef<HTMLInputElement | null>(null);

  React.useEffect(() => {
    setOrder(players);
  }, [players]);

  const handleReorder = (newOrder: TurnPlayer[]) => {
    setOrder(newOrder);
    onReorder(newOrder.map((p) => p.id));
  };

  React.useEffect(() => {
    if (!editingId) return;
    const id = requestAnimationFrame(() => {
      nicknameInputRef.current?.focus();
      nicknameInputRef.current?.select();
    });
    return () => cancelAnimationFrame(id);
  }, [editingId]);

  return (
    <div data-qa="turn-order" data-cmp="m/TurnOrderList" className="space-y-2">
      <Reorder.Group axis="y" values={order} onReorder={handleReorder} className="space-y-2">
        {order.map((p, idx) => (
          <Reorder.Item
            key={p.id}
            value={p}
            as="div"
            layout
            whileDrag={{ scale: 1.02 }}
            className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 p-2 flex items-center gap-3 shadow-sm"
          >
            <div
              className="cursor-grab text-neutral-500 select-none shrink-0"
              title="Drag to reorder"
              aria-label="Drag to reorder"
            >
              ⋮⋮
            </div>
            {/* Turn number */}
            <div className="w-6 text-xs font-mono opacity-70">{idx + 1}</div>
            {/* Avatar token with player color border and ring */}
            <div style={{ ['--player-color' as any]: p.color } as React.CSSProperties}>
              <AvatarToken
                emoji={p.emoji ?? '🙂'}
                borderColorClass="border-[color:var(--player-color)]"
                ring
                ringColorClass="ring-[color:var(--player-color)]"
                size={40}
              />
            </div>
            {/* Nickname */}
            <div className="min-w-0 flex-1">
              {onNicknameChange ? (
                editingId === p.id ? (
                  <input
                    ref={nicknameInputRef}
                    data-qa={`turn-order-nickname-input-${p.id}`}
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => e.stopPropagation()}
                    onKeyDown={(e) => {
                      if (e.key === 'Escape') {
                        e.preventDefault();
                        setDraft(p.nickname);
                        setEditingId(null);
                      }
                      if (e.key === 'Enter') {
                        e.preventDefault();
                        (e.currentTarget as HTMLInputElement).blur();
                      }
                    }}
                    onBlur={() => {
                      const trimmed = draft.trim();
                      if (trimmed.length === 0) {
                        setEditingId(null);
                        return;
                      }
                      if (trimmed !== p.nickname) onNicknameChange(p.id, trimmed);
                      setEditingId(null);
                    }}
                    className="w-full min-w-0 rounded border border-neutral-300 dark:border-neutral-600 bg-white dark:bg-neutral-900 px-2 py-0.5 text-sm font-medium text-fg"
                    aria-label="Edit nickname"
                  />
                ) : (
                  <button
                    type="button"
                    data-qa={`turn-order-nickname-${p.id}`}
                    onPointerDown={(e) => e.stopPropagation()}
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditingId(p.id);
                      setDraft(p.nickname);
                    }}
                    className="group inline-flex w-fit min-w-[80px] max-w-full items-center gap-1.5 rounded-md border border-transparent px-2 py-1 text-left font-medium transition-colors hover:border-neutral-200 hover:bg-neutral-100/90 dark:hover:border-neutral-600 dark:hover:bg-neutral-700/40 focus:outline-none focus:ring-2 focus:ring-blue-400 dark:focus:ring-blue-500"
                  >
                    <span className="min-w-0 flex-1 truncate">{p.nickname}</span>
                    <CiEdit
                      className="h-3.5 w-3.5 shrink-0 text-subtle opacity-60 transition-opacity group-hover:text-fg group-hover:opacity-100  dark:group-hover:text-fg"
                      aria-hidden
                    />
                  </button>
                )
              ) : (
                <div className="font-medium truncate">{p.nickname}</div>
              )}
            </div>
            {/* Race pot toggle */}
            <div className="ml-auto flex items-center gap-3">
              <div className="flex items-center gap-2" title="Race pot.  cost:$100. First to go wins the pot.">
                <button
                  type="button"
                  onClick={() => onOptInChange?.(p.id, !p.racePotOptIn)}
                  className="text-base"
                  aria-label="Toggle race pot"
                >
                  <span role="img" aria-hidden>
                    🏃‍➡️💰
                  </span>
                </button>
                <Toggle checked={Boolean(p.racePotOptIn)} onChange={(next) => onOptInChange?.(p.id, next)} qa={`toggle-race-${p.id}`} />
              </div>
              {onRemove && !removeDisabled && (
                <button
                  type="button"
                  data-qa={`btn-remove-${p.id}`}
                  aria-label={`Remove ${p.nickname}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(p.id);
                  }}
                  className="inline-flex items-center justify-center rounded-md p-1.5 bg-rose-600 text-white shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  <IoTrashOutline className="h-4 w-4 shrink-0" aria-hidden />
                </button>
              )}
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
