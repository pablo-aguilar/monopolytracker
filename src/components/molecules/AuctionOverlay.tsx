import React, { useMemo, useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, getTileById, type BoardTileData } from '@/data/board';
import BoardPickerOverlay from '@/components/molecules/BoardPickerOverlay';

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

  const bankTiles: BoardTileData[] = useMemo(() => {
    return BOARD_TILES.filter((t) => (t.type === 'property' || t.type === 'railroad' || t.type === 'utility') && bankOwnedByTileId[t.id] === true);
  }, [bankOwnedByTileId]);

  React.useEffect(() => {
    if (!open) return;
    setStep(presetTileId ? 2 : 1);
    setSelectedTileId(presetTileId ?? null);
    setWinnerId(null);
    setAmount(0);
  }, [open, presetTileId]);

  if (!open) return null;

  const chosen = selectedTileId ? getTileById(selectedTileId) : null;
  const canAfford = winnerId ? ((players.find((p) => p.id === winnerId)?.money ?? 0) >= amount) : false;
  const amountValid = amount >= 0 && amount % 5 === 0;
  const canConfirm = step === 1 ? selectedTileId != null : (selectedTileId != null && ((amount === 0) || (winnerId != null && amountValid && canAfford)));

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="auction-ov" initial={{ y: '100%' }} animate={{ y: 0 }} exit={{ y: '100%' }} transition={{ type: 'spring', stiffness: 260, damping: 24 }} className="fixed inset-x-0 bottom-0 z-50 rounded-t-2xl bg-white dark:bg-neutral-900 border-t border-neutral-200 dark:border-neutral-700 p-4 shadow-2xl">
          <div className="flex items-center justify-between mb-2">
            <div className="text-sm font-semibold">Auction</div>
            <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">Close</button>
          </div>
          <div className="space-y-3">
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
              <div className="space-y-2">
                <div className="text-xs font-medium">Step 2 — Winner and price</div>
                {chosen && (
                  <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 text-xs">
                    <div className="font-semibold">{chosen.name}</div>
                    <div className="opacity-80">Type: {chosen.type}</div>
                  </div>
                )}
                <div className="flex items-center gap-2">
                  <select className="rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm px-2 py-1" value={winnerId ?? ''} onChange={(e) => setWinnerId(e.target.value || null)}>
                    <option value="">Select winner</option>
                    {players.map((p) => (
                      <option value={p.id} key={p.id}>{p.nickname} — ${p.money}</option>
                    ))}
                  </select>
                  <div className="inline-flex items-center gap-1">
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setAmount((a) => Math.max(0, a - 5))}>-5</button>
                    <input className="w-24 rounded-md border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-900 text-sm px-2 py-1" type="number" value={amount} onChange={(e) => setAmount(parseInt(e.target.value || '0', 10))} step={5} min={0} />
                    <button className="rounded-md border px-2 py-1 text-sm" onClick={() => setAmount((a) => a + 5)}>+5</button>
                  </div>
                </div>
                <div className="text-[11px]">
                  {!amountValid && <span className="text-amber-700">Amount must be in $5 increments.</span>}
                  {winnerId && amount > 0 && !canAfford && <span className="text-rose-700 ml-2">Winner cannot afford.</span>}
                  {amount === 0 && <span className="opacity-70">If $0, bank keeps the property.</span>}
                </div>
              </div>
            )}

            <div className="flex items-center justify-between pt-1">
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
      )}
    </AnimatePresence>
  );
}


