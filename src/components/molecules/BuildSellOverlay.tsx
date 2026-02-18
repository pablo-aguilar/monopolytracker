import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, type BoardTileData, type ColorGroup } from '@/data/board';
import MortgageButton from '@/components/atoms/MortgageButton';

export interface BuildSellOverlayProps {
  open: boolean;
  onClose: () => void;
  playerId: string;
  playerMoney: number;
  // snapshot of current levels (by tile id) and mortgage flags
  tileLevels: Record<string, number>;
  tileMortgaged: Record<string, boolean>;
  ownedTileIds?: string[]; // includes properties, railroads, utilities
  railroadDepotInstalled?: Record<string, boolean>;
  housesRemaining: number;
  hotelsRemaining: number;
  skyscrapersRemaining?: number;
  onConfirm: (payload: { targets: Record<string, number>; desiredMortgaged: Record<string, boolean>; desiredDepotInstalled: Record<string, boolean> }) => void;
}

type GroupPlan = {
  group: ColorGroup | undefined;
  tiles: BoardTileData[];
};

export default function BuildSellOverlay({ open, onClose, playerId, playerMoney, tileLevels, tileMortgaged, ownedTileIds = [], railroadDepotInstalled = {}, housesRemaining, hotelsRemaining, skyscrapersRemaining = 12, onConfirm }: BuildSellOverlayProps): JSX.Element | null {
  const ownedPropertyTiles: BoardTileData[] = React.useMemo(() => {
    return BOARD_TILES.filter((t) => t.type === 'property' && tileLevels[t.id] != null);
  }, [tileLevels]);

  const ownedAllTiles: BoardTileData[] = React.useMemo(() => {
    const set = new Set(ownedPropertyTiles.map((t) => t.id));
    (ownedTileIds ?? []).forEach((id) => set.add(id));
    return BOARD_TILES.filter((t) => set.has(t.id));
  }, [ownedPropertyTiles, ownedTileIds]);

  const groups: GroupPlan[] = React.useMemo(() => {
    const byGroup = new Map<ColorGroup | undefined, BoardTileData[]>();
    for (const t of ownedPropertyTiles) {
      const key = t.group;
      byGroup.set(key, [...(byGroup.get(key) ?? []), t]);
    }
    return Array.from(byGroup.entries()).map(([group, tiles]) => ({ group, tiles: tiles.sort((a, b) => a.index - b.index) }));
  }, [ownedPropertyTiles]);

  function getGroupContainerClasses(group?: ColorGroup): string {
    switch (group) {
      case 'brown':
        return 'bg-amber-800 text-white';
      case 'lightBlue':
        return 'bg-sky-300 text-white';
      case 'pink':
        return 'bg-fuchsia-800 text-white';
      case 'orange':
        return 'bg-orange-400 text-white';
      case 'red':
        return 'bg-red-600 text-white';
      case 'yellow':
        return 'bg-yellow-300 text-white';
      case 'green':
        return 'bg-green-600 text-white';
      case 'darkBlue':
        return 'bg-blue-900 text-white';
      default:
        return 'bg-neutral-200 text-white';
    }
  }

  // planned target levels start at current
  const [targets, setTargets] = React.useState<Record<string, number>>(() => ({ ...tileLevels }));
  React.useEffect(() => setTargets({ ...tileLevels }), [tileLevels]);

  // desired mortgage state starts at current
  const [desiredMortgaged, setDesiredMortgaged] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const t of ownedAllTiles) init[t.id] = !!tileMortgaged[t.id];
    setDesiredMortgaged(init);
  }, [ownedAllTiles, tileMortgaged]);

  // desired depot state for railroads
  const [desiredDepotInstalled, setDesiredDepotInstalled] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    const init: Record<string, boolean> = {};
    for (const t of ownedAllTiles) if (t.type === 'railroad') init[t.id] = !!railroadDepotInstalled[t.id];
    setDesiredDepotInstalled(init);
  }, [ownedAllTiles, railroadDepotInstalled]);

  // helpers for economics
  function getCostsForStep(tile: BoardTileData, from: number, to: number): number {
    if (tile.type !== 'property' || !tile.property) return 0;
    const { houseCost } = tile.property;
    return Math.max(0, to - from) * houseCost;
  }

  function getRefundsForStep(tile: BoardTileData, from: number, to: number): number {
    if (tile.type !== 'property' || !tile.property) return 0;
    const { houseCost } = tile.property;
    return Math.max(0, from - to) * (houseCost / 2);
  }

  // bank inventory deltas implied by targets
  function computeBankDeltas(): { housesNeeded: number; hotelsNeeded: number; skyscrapersNeeded: number } {
    let housesNeeded = 0;
    let hotelsNeeded = 0;
    let skyscrapersNeeded = 0;
    for (const g of groups) {
      for (const t of g.tiles) {
        const cur = tileLevels[t.id] ?? 0;
        const tar = targets[t.id] ?? cur;
        if (tar > cur) {
          for (let level = cur; level < tar; level += 1) {
            if (level < 4) housesNeeded += 1;
            else if (level === 4) {
              hotelsNeeded += 1;
              housesNeeded -= 4; // return 4 houses when upgrading to hotel
            } else if (level === 5) {
              skyscrapersNeeded += 1;
              hotelsNeeded -= 1; // hotel returns to bank when upgrading to skyscraper
            }
          }
        } else if (tar < cur) {
          for (let level = cur; level > tar; level -= 1) {
            if (level === 6) {
              skyscrapersNeeded -= 1; // selling a skyscraper returns to bank
              hotelsNeeded += 1; // and consumes a hotel from bank for downgrade
            } else if (level === 5) {
              hotelsNeeded -= 1; // hotel removed
              housesNeeded += 4; // and 4 houses are taken from bank (represented negative earlier). Here we add back to bank
            } else if (level <= 4) {
              housesNeeded -= 1; // selling a house returns to bank
            }
          }
        }
      }
    }
    return { housesNeeded, hotelsNeeded, skyscrapersNeeded };
  }

  // even rule checks per group
  function canIncrement(tile: BoardTileData): boolean {
    const cur = targets[tile.id];
    // Use desired state: cannot build if (desired) mortgaged
    if (desiredMortgaged[tile.id]) return false;
    if (cur >= 6) return false;
    const groupTilesAll = BOARD_TILES.filter((tt) => tt.type === 'property' && tt.group === tile.group);
    const fullGroupIds = groupTilesAll.map((tt) => tt.id);
    const ownedGroupTiles = groupTilesAll.filter((tt) => tileLevels[tt.id] != null);
    const groupSize = fullGroupIds.length;
    const ownedUnmortgagedCount = ownedGroupTiles.filter((tt) => desiredMortgaged[tt.id] !== true).length;
    const ownsFullUnmortgagedSet = ownedUnmortgagedCount === groupSize;
    const hotelThreshold = groupSize === 4 ? 3 : groupSize === 3 ? 2 : groupSize === 2 ? 2 : Number.POSITIVE_INFINITY;
    const groupTiles = (groups.find((g) => g.group === tile.group)?.tiles ?? []).filter((t) => fullGroupIds.includes(t.id));
    // ok to build in group as long as we consider desired mortgaged state
    if (groupTiles.length > 1) {
      const levels = groupTiles.map((t) => targets[t.id]);
      const minLevel = Math.min(...levels);
      if (targets[tile.id] !== minLevel) return false;
    }
    // Threshold rules
    if (cur >= 5) {
      // hotel -> skyscraper requires full set
      if (!ownsFullUnmortgagedSet) return false;
    } else {
      // houses up to hotel require meeting threshold count
      if (!(ownedUnmortgagedCount >= hotelThreshold)) return false;
    }
    return true;
  }

  function canDecrement(tile: BoardTileData): boolean {
    const cur = targets[tile.id];
    if (cur <= 0) return false;
    const groupTiles = groups.find((g) => g.group === tile.group)?.tiles ?? [tile];
    if (groupTiles.length > 1) {
      const levels = groupTiles.map((t) => targets[t.id]);
      const maxLevel = Math.max(...levels);
      if (targets[tile.id] !== maxLevel) return false;
    }
    return true;
  }

  function adjust(tile: BoardTileData, delta: 1 | -1): void {
    if (delta > 0 && !canIncrement(tile)) return;
    if (delta < 0 && !canDecrement(tile)) return;
    setTargets((m) => ({ ...m, [tile.id]: Math.max(0, Math.min(6, (m[tile.id] ?? 0) + delta)) }));
  }

  // compute costs/refunds
  const { totalCost, totalRefund, netCost } = React.useMemo(() => {
    let cost = 0;
    let refund = 0;
    for (const g of groups) {
      for (const t of g.tiles) {
        const cur = tileLevels[t.id] ?? 0;
        const tar = targets[t.id] ?? cur;
        if (tar > cur) cost += getCostsForStep(t, cur, tar);
        else if (tar < cur) refund += getRefundsForStep(t, cur, tar);
      }
    }
    // mortgage/unmortgage deltas
    for (const t of ownedAllTiles) {
      const current = !!tileMortgaged[t.id];
      const desired = !!desiredMortgaged[t.id];
      if (current === desired) continue;
      const mv = (t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0);
      if (desired && !current) {
        // mortgage -> player receives money
        refund += mv;
      } else if (!desired && current) {
        // unmortgage -> player pays mortgage value
        cost += mv;
      }
    }
    // depot install cost (install costs, removal free)
    for (const t of ownedAllTiles) {
      if (t.type !== 'railroad') continue;
      const current = !!railroadDepotInstalled[t.id];
      const desired = !!desiredDepotInstalled[t.id];
      if (desired && !current) cost += 100;
    }
    return { totalCost: cost, totalRefund: refund, netCost: Math.max(0, cost - refund) };
  }, [groups, targets, tileLevels, desiredMortgaged, desiredDepotInstalled, ownedAllTiles, tileMortgaged, railroadDepotInstalled]);

  const bank = computeBankDeltas();
  const bankOk = bank.housesNeeded <= housesRemaining && bank.hotelsNeeded <= hotelsRemaining && bank.skyscrapersNeeded <= skyscrapersRemaining;
  const moneyOk = netCost <= playerMoney;
  const hasChange = React.useMemo(() => {
    for (const t of ownedPropertyTiles) {
      const cur = tileLevels[t.id] ?? 0;
      const tar = targets[t.id] ?? cur;
      if (tar !== cur) return true;
    }
    for (const t of ownedAllTiles) {
      if (!!tileMortgaged[t.id] !== !!desiredMortgaged[t.id]) return true;
      if (t.type === 'railroad' && (!!railroadDepotInstalled[t.id] !== !!desiredDepotInstalled[t.id])) return true;
    }
    return false;
  }, [ownedPropertyTiles, ownedAllTiles, targets, tileLevels, tileMortgaged, desiredMortgaged, railroadDepotInstalled, desiredDepotInstalled]);

  if (!open) return null;

  return (
    <AnimatePresence>
      {open && (
        <motion.div key="build-sell-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="flex items-center justify-between mb-2">
              <div className="text-sm font-semibold">Build & Sell</div>
              <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">Close</button>
            </div>
            <div className="text-xs opacity-70 mb-2">Even-building enforced. Refunds are 50% of purchase price.</div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-auto pr-1">
              {/* Properties by color group (no wrapper) */}
              {groups.map((g) => {
                const tiles = g.tiles;
                const size = tiles.length;
                const ownedCount = tiles.filter((t) => tileLevels[t.id] != null).length;
                const hotelThreshold = size === 4 ? 3 : size === 3 ? 2 : size === 2 ? 2 : Number.POSITIVE_INFINITY;
                return (
                  <div key={g.group ?? 'none'} className={`rounded-md border border-neutral-200 dark:border-neutral-700 p-2 mb-2 last:mb-0 ${getGroupContainerClasses(g.group)}`}>
                    {tiles.map((t) => {
                          const cur = tileLevels[t.id] ?? 0;
                          const tar = targets[t.id] ?? cur;
                          const mort = !!desiredMortgaged[t.id];
                          const mv = (t.property?.mortgageValue ?? 0);
                          // Only allow mortgage/unmortgage when desired improvements are zero
                          const canToggleMortgage = tar === 0;
                          return (
                            <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 bg-white/90 dark:bg-neutral-900/90">
                              <div className="flex items-center justify-between gap-2">
                                <div className="text-xs font-medium truncate">{t.name}</div>
                                <div className="flex items-center gap-1">
                                  {!mort ? (
                                    <>
                                      <button type="button" className="rounded-md border px-2 py-0.5 text-xs disabled:opacity-50" disabled={!canDecrement(t)} onClick={() => adjust(t, -1)}>-</button>
                                      <div className="min-w-8 text-center text-xs font-semibold">{tar - cur >= 0 ? `+${tar - cur}` : `${tar - cur}`}</div>
                                      <button type="button" className="rounded-md border px-2 py-0.5 text-xs disabled:opacity-50" disabled={!canIncrement(t)} onClick={() => adjust(t, +1)}>+</button>
                                    </>
                                  ) : null}
                                </div>
                              </div>
                              {!mort && (
                                <div className="mt-1 flex items-center justify-between text-[11px] opacity-80">
                                  <div className="flex items-center gap-1">
                                    {Array.from({ length: 6 }).map((_, i) => (
                                      <span key={i} className={`inline-block h-2 w-2 rounded-sm ${i < tar ? (i < 4 ? 'bg-green-500' : i === 4 ? 'bg-red-500' : 'bg-blue-700') : 'bg-neutral-300 dark:bg-neutral-700'}`} />
                                    ))}
                                  </div>
                                  <div>
                                    <span className="mr-2">Cost:</span>
                                    <strong>${getCostsForStep(t, cur, tar) - getRefundsForStep(t, cur, tar)}</strong>
                                  </div>
                                </div>
                              )}
                              {/* Mortgage toggle (no tips/status) */}
                              {canToggleMortgage && (
                                <div className="mt-1 flex items-center justify-end">
                                  <MortgageButton label={mort ? 'Unmortgage' : `Mortgage (+$${mv})`} danger={mort} onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))} />
                                </div>
                              )}
                            </div>
                          );
                        })}
                  </div>
                );
              })}

              {/* Utilities group: white with diagonal bar pattern */}
              {ownedAllTiles.some((t) => t.type === 'utility') && (
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 text-white" style={{ backgroundColor: 'var(--color-zinc-600)', backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 12px)' }}>
                  <div className="space-y-2">
                    {ownedAllTiles.filter((t) => t.type === 'utility').map((t) => {
                      const mort = !!desiredMortgaged[t.id];
                      const mv = (t.utility?.mortgageValue ?? 0);
                      return (
                        <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 bg-white/90 dark:bg-neutral-900/90 text-white">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-xs font-medium truncate">{t.name}</div>
                            <div className="flex items-center gap-2">
                              <MortgageButton label={mort ? 'Unmortgage' : `Mortgage (+$${mv})`} danger={mort} onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))} />
                            </div>
                          </div>
                          
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Railroads group: white with black dot pattern */}
              {ownedAllTiles.some((t) => t.type === 'railroad') && (
                <div className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 text-white" 
                style={{ 
                  backgroundColor: 'var(--color-zinc-600)', 
                  backgroundImage: 'radial-gradient(rgba(0,0,0,0.30) 4px, transparent 1px)', 
                  backgroundSize: '14px 14px', 
                  backgroundPosition: '0 0' }}>
                  <div className="space-y-2">
                    {ownedAllTiles.filter((t) => t.type === 'railroad').map((t) => {
                      const mort = !!desiredMortgaged[t.id];
                      const mv = (t.railroad?.mortgageValue ?? 0);
                      return (
                        <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 bg-white/90 dark:bg-neutral-900/90 text-white">
                          <div className="text-xs font-medium truncate mb-2">{t.name}</div>
                          <div className="flex items-center gap-2">
                            {!desiredDepotInstalled[t.id] && (
                              <MortgageButton label={mort ? 'Unmortgage' : `Mortgage (+$${mv})`} danger={mort} onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))} />
                            )}
                            <button
                              type="button"
                              className={`rounded-md border px-2 py-0.5 text-xs ${desiredDepotInstalled[t.id] ? 'border-emerald-500 text-emerald-600' : 'border-zinc-300 text-zinc-700 dark:text-zinc-300'}`}
                              onClick={() => setDesiredDepotInstalled((m) => ({ ...m, [t.id]: !m[t.id] }))}
                            >
                              {desiredDepotInstalled[t.id] ? 'Remove Depot' : 'Install Depot (+$100)'}
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            <div className="mt-3 flex items-center justify-between text-sm">
              <div className="space-x-3">
                <span>Houses needed: <strong className={bank.housesNeeded > housesRemaining ? 'text-rose-600' : ''}>{bank.housesNeeded}</strong> / {housesRemaining}</span>
                <span>Hotels needed: <strong className={bank.hotelsNeeded > hotelsRemaining ? 'text-rose-600' : ''}>{bank.hotelsNeeded}</strong> / {hotelsRemaining}</span>
                <span>Skyscrapers needed: <strong className={bank.skyscrapersNeeded > skyscrapersRemaining ? 'text-rose-600' : ''}>{bank.skyscrapersNeeded}</strong> / {skyscrapersRemaining}</span>
              </div>
              <div className="space-x-3">
                <span>Refund: <strong className="text-emerald-700">${totalRefund}</strong></span>
                <span>Total: <strong>${totalCost}</strong></span>
                <span>Net: <strong className={netCost > playerMoney ? 'text-rose-600' : 'text-emerald-700'}>${netCost}</strong></span>
              </div>
            </div>

            <div className="mt-3 flex items-center justify-end gap-2">
              <button type="button" onClick={onClose} className="rounded-md border border-neutral-300 dark:border-neutral-700 px-3 py-1.5 text-sm">Cancel</button>
              <button
                type="button"
                disabled={!hasChange || !bankOk || !moneyOk}
                onClick={() => onConfirm({ targets, desiredMortgaged, desiredDepotInstalled })}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${!hasChange || !bankOk || !moneyOk ? 'bg-emerald-600/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                Confirm
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


