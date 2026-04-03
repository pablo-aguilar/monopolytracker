import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, getBoardTileStripeStyle, getTileHeaderBgClass, type BoardTileData } from '@/data/board';
import { AVATARS } from '@/data/avatars';
import OverlayHeader from '@/components/molecules/OverlayHeader';

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
        <motion.div
          data-cmp="m/BoardPickerOverlay"
          key="board-picker-ov"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 py-0 px-0 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <OverlayHeader
              title={title}
              onClose={onClose}
              rowClassName="pt-2 pb-2 pl-3.5 pr-2"
            />
            <div className="grid grid-cols-4 lg:grid-cols-6 gap-2 max-h-[70vh] overflow-auto pl-4 pr-4 pb-4">
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
                      <div className="pointer-events-none absolute left-0 right-0 top-2 bottom-0 rounded-lg" style={{ outline: `3px solid ${ownerColor}` }} aria-hidden />
                    )}
                    <ButtonTag
                      className={`relative rounded-xl border text-[11px] text-left bg-white dark:bg-neutral-900 ${isActive ? 'border-emerald-500' : 'border-neutral-200 dark:border-neutral-700'} ${canSelect ? 'hover:shadow' : ''} w-full`}
                      title={t.name}
                      {...onClickProp}
                    >
                      <div className={`h-2 rounded-t-xl ${getTileHeaderBgClass(t)}`} style={getBoardTileStripeStyle(t)} />
                      <div className="p-2 space-y-1">
                        <div className="font-semibold text-xs truncate">{t.name} </div>
                      </div>
                      <div className="px-2 pb-1.5 flex items-center justify-between text-xs opacity-80">
                        <div>#{t.index}</div>
                        <div className="flex items-center gap-1">{tileFooterIcon ? tileFooterIcon(t.id) : null}</div>
                      </div>
                    </ButtonTag>
                  </div>
                );
              })}
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

