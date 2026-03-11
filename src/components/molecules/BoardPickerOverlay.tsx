import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, type BoardTileData } from '@/data/board';
import { AVATARS } from '@/data/avatars';
import CloseIconButton from '@/components/atoms/CloseIconButton';

export type BoardPickerMode = 'select' | 'view';

export interface BoardPickerOverlayProps {
  open: boolean;
  title?: string;
  mode?: BoardPickerMode;
  onClose: () => void;
  onSelectTile?: (tileIndex: number, tile: BoardTileData) => void;
  players: Array<{ id: string; avatarKey: string; positionIndex: number; color?: string }>;
  activePlayerId?: string;
  ownedByTileId?: Record<string, string | null>;
  tileFooterIcon?: (tileId: string) => JSX.Element | null;
  filterTileIds?: string[]; // if provided, only render these
}

export default function BoardPickerOverlay({ open, title = 'Board', mode = 'view', onClose, onSelectTile, players, activePlayerId, ownedByTileId = {}, tileFooterIcon, filterTileIds }: BoardPickerOverlayProps): JSX.Element | null {
  if (!open) return null;
  const canSelect = mode === 'select' && typeof onSelectTile === 'function';
  return (
    <AnimatePresence>
      {open && (
        <motion.div data-cmp="m/BoardPickerOverlay" key="board-picker-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">{title}</div>
              <CloseIconButton onClick={onClose} />
            </div>
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 max-h-[70vh] overflow-auto">
              {BOARD_TILES.map((t) => {
                if (filterTileIds && !filterTileIds.includes(t.id)) return null;
                const onTile = players.filter((pl) => pl.positionIndex === t.index);
                const ownerIdForTile = ownedByTileId[t.id] ?? null;
                const ownerColor = ownerIdForTile ? (players.find((pl) => pl.id === ownerIdForTile)?.color) : undefined;
                const isActive = players.find((pl) => pl.id === activePlayerId)?.positionIndex === t.index;
                const ButtonTag = canSelect ? 'button' : ('div' as const);
                const onClickProp = canSelect ? { onClick: () => onSelectTile!(t.index, t) } : {};
                return (
                  <div key={t.id} className="relative pt-2">
                    {onTile.length > 0 && (
                      <div className="pointer-events-none absolute z-10 -top-2 left-1/2 -translate-x-1/2 flex -space-x-2">
                        {onTile.slice(0, 3).map((pl) => {
                          const emoji = AVATARS.find((a) => a.key === pl.avatarKey)?.emoji ?? '🙂';
                          return <span key={pl.id} className="inline-flex h-8 w-8 items-center justify-center rounded-full ring-2 ring-white dark:ring-neutral-900 bg-neutral-100 dark:bg-neutral-800 text-lg">{emoji}</span>;
                        })}
                        {onTile.length > 3 && <span className="ml-2 text-[10px] opacity-70">+{onTile.length - 3}</span>}
                      </div>
                    )}
                    {ownerColor && (
                      <div className="pointer-events-none absolute left-0 right-0 top-2 bottom-0 rounded-xl" style={{ outline: `3px solid ${ownerColor}` }} aria-hidden />
                    )}
                    <ButtonTag
                      className={`relative rounded-xl border text-[11px] text-left bg-white dark:bg-neutral-900 ${isActive ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-700'} ${canSelect ? 'hover:shadow' : ''} w-full`}
                      title={t.name}
                      {...onClickProp}
                    >
                      <div className={`h-2 rounded-t-xl ${getTileHeaderBg(t)}`} />
                      <div className="p-2 space-y-1">
                        <div className="font-semibold text-[12px] truncate">{t.name}</div>
                      </div>
                      <div className="px-2 pb-2 flex items-center justify-between text-[10px] opacity-80">
                        <div>#{t.index}</div>
                        <div className="flex items-center gap-1">{tileFooterIcon ? tileFooterIcon(t.id) : null}</div>
                      </div>
                    </ButtonTag>
                  </div>
                );
              })}
            </div>
            <div className="mt-2 text-xs opacity-70">GO is at index 0 (top-right).</div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

function getTileHeaderBg(tile: BoardTileData): string {
  if (tile.type === 'property') {
    switch (tile.group) {
      case 'brown':
        return 'bg-amber-800';
      case 'lightBlue':
        return 'bg-sky-300';
      case 'pink':
        return 'bg-pink-400';
      case 'orange':
        return 'bg-orange-400';
      case 'red':
        return 'bg-red-600';
      case 'yellow':
        return 'bg-yellow-400';
      case 'green':
        return 'bg-green-600';
      case 'darkBlue':
        return 'bg-blue-900';
      default:
        return 'bg-neutral-200';
    }
  }
  if (tile.type === 'railroad') return 'bg-stone-300';
  if (tile.type === 'utility') return 'bg-zinc-200';
  return 'bg-neutral-200';
}


