import React, { useMemo, useState, useRef } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, getTileById, getTileHeaderBgClass, getTileHeaderTextClass, type BoardTileData } from '@/data/board';
import BoardPickerOverlay from '@/components/molecules/BoardPickerOverlay';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import AvatarToken from '@/components/atoms/AvatarToken';
import MoneyInput from '@/components/atoms/MoneyInput';
import { AVATARS } from '@/data/avatars';

export interface AuctionOverlayProps {
  open: boolean;
  onClose: () => void;
  bankOwnedByTileId: Record<string, boolean>; // true if bank owns
  players: Array<{ id: string; nickname: string; money: number }>;
  boardPlayers: Array<{ id: string; avatarKey: string; positionIndex: number; color?: string }>; // for BoardPickerOverlay
  onConfirm: (tileId: string | null, winnerId: string | null, amount: number) => void;
  presetTileId?: string | null;
}

export default function AuctionOverlay({ open, onClose, bankOwnedByTileId, players, boardPlayers, onConfirm, presetTileId = null }: AuctionOverlayProps): JSX.Element | null {
  const [step, setStep] = useState<1 | 2>(presetTileId ? 2 : 1);
  const [selectedTileId, setSelectedTileId] = useState<string | null>(presetTileId);
  const [winnerId, setWinnerId] = useState<string | null>(null);
  const [amount, setAmount] = useState<number>(0);
  const winnerBtnRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const bankTiles: BoardTileData[] = useMemo(() => {
    return BOARD_TILES.filter((t) => (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') && bankOwnedByTileId[t.id] === true);
  }, [bankOwnedByTileId]);

  const bpById = useMemo(() => new Map(boardPlayers.map((bp) => [bp.id, bp] as const)), [boardPlayers]);

  React.useEffect(() => {
    if (!open) return;
    setStep(presetTileId ? 2 : 1);
    setSelectedTileId(presetTileId ?? null);
    setWinnerId(null);
    setAmount(0);
  }, [open, presetTileId]);

  if (!open) return null;

  const chosen = selectedTileId ? getTileById(selectedTileId) : null;
  const chosenBg = chosen ? getTileHeaderBgClass(chosen) : 'bg-surface-1';
  const chosenFg = chosen ? getTileHeaderTextClass(chosen) : 'text-fg';
  const canAfford = winnerId ? ((players.find((p) => p.id === winnerId)?.money ?? 0) >= amount) : false;
  const amountValid = amount >= 0 && amount % 5 === 0;
  const canConfirm = step === 1 ? selectedTileId != null : (selectedTileId != null && ((amount === 0) || (winnerId != null && amountValid && canAfford)));

  return (
    <AnimatePresence>
      {open && (
        <div data-cmp="m/AuctionOverlay" className="fixed inset-0 z-50">
          <motion.div
            key="auction-backdrop"
            className="absolute inset-0 modal-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            onMouseDown={(e) => {
              if (e.target !== e.currentTarget) return;
              onClose();
            }}
          />
          <motion.div
            key="auction-sheet"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'spring', stiffness: 260, damping: 24 }}
            className="absolute inset-x-0 bottom-0 mx-2 rounded-t-2xl overflow-hidden bg-surface-2 border-t border-surface shadow-2xl"
            onMouseDown={(e) => e.stopPropagation()}
          >
            <OverlayHeader title="Auction" onClose={onClose} className="bg-surface-1 px-4 py-1" />
            <div className="space-y-3 ">
              {step === 1 && !presetTileId && (
                <div className="space-y-2">
                  <div className="text-xs font-medium">Step 1 — Choose a bank-owned tile</div>
                  <BoardPickerOverlay
                    open={true}
                    title="Pick a bank-owned tile"
                    mode="select"
                    onClose={() => onClose()}
                    onSelectTile={(tileIndex, tile) => {
                      if (!bankOwnedByTileId[tile.id]) return; // ignore non-bank-owned
                      setSelectedTileId(tile.id);
                      setStep(2);
                    }}
                    players={boardPlayers}
                    filterTileIds={bankTiles.map((t) => t.id)}
                  />
                </div>
              )}

            {step === 2 && (
              <div className="space-y-2 p-2">
                {/* <div className="text-xs font-medium">Step 2 — Winner and price</div> */}
                {chosen && (
                  <div className={`rounded-md border border-surface p-2 text-xs ${chosenBg} ${chosenFg}`}>
                    <div className="font-semibold">{chosen.name}</div>
                    <div className="opacity-80">Type: {chosen.type}</div>
                  </div>
                )}
                <div className="space-y-2">
                  <div className="text-sm font-semibold uppercase tracking-wide text-subtle ">Winner</div>
                  <div
                    role="group"
                    aria-label="Select auction winner"
                    className="flex flex-row gap-2"
                    onKeyDown={(e) => {
                      const key = e.key;
                      if (!(key === 'ArrowDown' || key === 'ArrowUp' || key === 'Home' || key === 'End')) return;
                      e.preventDefault();
                      const refs = winnerBtnRefs.current;
                      const activeEl = document.activeElement as HTMLElement | null;
                      let idx = refs.findIndex((r) => r != null && r === activeEl);
                      if (idx < 0) idx = Math.max(0, players.findIndex((p) => p.id === winnerId));
                      if (idx < 0) idx = 0;
                      let next = idx;
                      if (key === 'ArrowDown') next = Math.min(players.length - 1, idx + 1);
                      if (key === 'ArrowUp') next = Math.max(0, idx - 1);
                      if (key === 'Home') next = 0;
                      if (key === 'End') next = Math.max(0, players.length - 1);
                      refs[next]?.focus();
                    }}
                  >
                    {players.map((p, idx) => {
                      const bp = bpById.get(p.id);
                      const emoji = AVATARS.find((a) => a.key === bp?.avatarKey)?.emoji ?? '🙂';
                      const selected = winnerId === p.id;
                      return (
                        <button
                          key={p.id}
                          ref={(el) => {
                            winnerBtnRefs.current[idx] = el;
                          }}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => setWinnerId((cur) => (cur === p.id ? null : p.id))}
                          className={`flex items-center gap-1 flex-row rounded-xl border border-surface px-3 py-2 text-left transition-colors ${
                            selected
                              ? 'border-emerald-500 bg-emerald-50 dark:bg-emerald-900/30'
                              : 'border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 hover:bg-neutral-50 dark:hover:bg-neutral-800'
                          }`}
                        >
                          <div style={{ ['--player-color' as any]: bp?.color ?? '#a1a1aa' } as React.CSSProperties}>
                            <AvatarToken
                              emoji={emoji}
                              size={32}
                              borderColorClass="border-[color:var(--player-color)]"
                              ring={selected}
                              ringColorClass="ring-[color:var(--player-color)]"
                            />
                          </div>
                          <div className="min-w-0 flex-1">
                            <div className="font-semibold truncate">{p.nickname}</div>
                            <div className="text-xs opacity-70 tabular-nums">${p.money}</div>
                          </div>
                          {selected && <div className="text-emerald-700 dark:text-emerald-300 font-semibold text-sm">✓</div>}
                        </button>
                      );
                    })}
                  </div>

                  <div className="pt-1">
                    <div className="text-[11px] font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Price</div>
                    <div className="mt-1">
                      <MoneyInput
                        value={amount}
                        min={0}
                        onChange={setAmount}
                        quickSteps={[5, 25, 100]}
                        inputClassName="w-24 border-0 bg-transparent text-sm px-2 py-1 focus:outline-none"
                      />
                    </div>
                  </div>
                </div>
                <div className="text-[11px]">
                  {!amountValid && <span className="text-amber-700">Amount must be in $5 increments.</span>}
                  {winnerId && amount > 0 && !canAfford && <span className="text-rose-700 ml-2">Winner cannot afford.</span>}
                  {amount === 0 && <span className="opacity-70">If $0, bank keeps the property.</span>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between p-3 bg-surface-1">
              <button className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm" onClick={() => (step === 1 ? onClose() : setStep(1))}>{step === 1 ? 'Cancel' : 'Back'}</button>
              {step === 1 ? (
                <button className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${selectedTileId ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600/40 cursor-not-allowed'}`} disabled={!selectedTileId} onClick={() => setStep(2)}>Next</button>
              ) : (
                <button
                  className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${canConfirm ? 'bg-emerald-600 hover:bg-emerald-700' : 'bg-emerald-600/40 cursor-not-allowed'}`}
                  disabled={!canConfirm}
                  onClick={() => onConfirm(selectedTileId, amount === 0 ? null : winnerId, amount)}
                >
                  Confirm
                </button>
              )}
            </div>
          </div>
          </motion.div>
        </div>
      )}
    </AnimatePresence>
  );
}


