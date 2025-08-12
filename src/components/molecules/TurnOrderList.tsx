// #index
// - //#component: draggable turn order list using Framer Motion with delete support

import React from 'react';
import { Reorder } from 'framer-motion';
import AvatarToken from '@/components/atoms/AvatarToken';

export type TurnPlayer = {
  id: string;
  nickname: string;
  color: string;
  avatarKey: string;
  emoji?: string; // if provided
};

export type TurnOrderListProps = {
  players: TurnPlayer[];
  onReorder: (newOrderIds: string[]) => void;
  onRemove?: (id: string) => void;
};

export default function TurnOrderList({ players, onReorder, onRemove }: TurnOrderListProps): JSX.Element {
  const [order, setOrder] = React.useState(players);

  React.useEffect(() => {
    setOrder(players);
  }, [players]);

  const handleReorder = (newOrder: TurnPlayer[]) => {
    setOrder(newOrder);
    onReorder(newOrder.map((p) => p.id));
  };

  return (
    <div data-qa="turn-order" className="space-y-2">
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
            <div className="font-medium">{p.nickname}</div>
            {/* Actions: delete + drag handle */}
            <div className="ml-auto flex items-center gap-2">
              {onRemove && (
                <button
                  data-qa={`btn-remove-${p.id}`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemove?.(p.id);
                  }}
                  className="inline-flex items-center justify-center rounded-md px-2 py-1 bg-rose-600 text-white text-xs font-semibold shadow hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-400"
                >
                  Delete
                </button>
              )}
              <div className="cursor-grab text-neutral-500 select-none">⋮⋮</div>
            </div>
          </Reorder.Item>
        ))}
      </Reorder.Group>
    </div>
  );
}
