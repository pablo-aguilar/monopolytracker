import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import { BOARD_TILES, type BoardTileData, type ColorGroup } from '@/data/board';
import MortgageButton from '@/components/atoms/MortgageButton';
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { computeRent } from '@/features/selectors/rent';
import type { RootState } from '@/app/store';

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

function getLevelForTile(tileId: string, targets: Record<string, number>, tileLevels: Record<string, number>): number {
  const v = targets[tileId];
  if (typeof v === 'number') return v;
  const cur = tileLevels[tileId];
  return typeof cur === 'number' ? cur : 0;
}

function HouseToken({ id }: { id: string }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.85 : 1 }
    : undefined;
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm touch-none"
      {...listeners}
      {...attributes}
      title="Drag to rearrange"
    >
      <img src="/icons/house.webp" alt="House" className="h-5 w-5" loading="lazy" decoding="async" />
    </button>
  );
}

function HotelToken({ id }: { id: string }): JSX.Element {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({ id });
  const style: React.CSSProperties | undefined = transform
    ? { transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`, opacity: isDragging ? 0.85 : 1 }
    : undefined;
  return (
    <button
      type="button"
      ref={setNodeRef}
      style={style}
      className="inline-flex h-7 w-7 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm touch-none"
      {...listeners}
      {...attributes}
      title="Drag to swap with 4 houses"
    >
      <img src="/icons/hotel.webp" alt="Hotel" className="h-6 w-6" loading="lazy" decoding="async" />
    </button>
  );
}

function HouseDropZone({ id, children }: { id: string; children: React.ReactNode }): JSX.Element {
  const { isOver, setNodeRef } = useDroppable({ id });
  return (
    <div ref={setNodeRef} className={`rounded-md ${isOver ? 'ring-2 ring-emerald-400' : ''}`}>
      {children}
    </div>
  );
}

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

  const [detailsTileId, setDetailsTileId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!detailsTileId) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setDetailsTileId(null);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [detailsTileId]);

  const rentState = React.useMemo(() => {
    const byTileId: Record<string, any> = {};
    for (const t of ownedAllTiles) {
      if (!(t.type === 'property' || t.type === 'railroad' || t.type === 'utility')) continue;
      byTileId[t.id] = {
        ownerId: playerId,
        mortgaged: !!(desiredMortgaged[t.id] ?? tileMortgaged[t.id]),
        improvements: t.type === 'property' ? getLevelForTile(t.id, targets, tileLevels) : 0,
        depotInstalled: t.type === 'railroad' ? !!(desiredDepotInstalled[t.id] ?? railroadDepotInstalled[t.id]) : false,
      };
    }
    return { properties: { byTileId } } as unknown as RootState;
  }, [ownedAllTiles, playerId, desiredMortgaged, tileMortgaged, desiredDepotInstalled, railroadDepotInstalled, targets, tileLevels]);

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
    const cur = getLevelForTile(tile.id, targets, tileLevels);
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
      const levels = groupTiles.map((t) => getLevelForTile(t.id, targets, tileLevels));
      const minLevel = Math.min(...levels);
      if (getLevelForTile(tile.id, targets, tileLevels) !== minLevel) return false;
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
    const cur = getLevelForTile(tile.id, targets, tileLevels);
    if (cur <= 0) return false;
    const groupTiles = groups.find((g) => g.group === tile.group)?.tiles ?? [tile];
    if (groupTiles.length > 1) {
      const levels = groupTiles.map((t) => getLevelForTile(t.id, targets, tileLevels));
      const maxLevel = Math.max(...levels);
      if (getLevelForTile(tile.id, targets, tileLevels) !== maxLevel) return false;
    }
    return true;
  }

  function adjust(tile: BoardTileData, delta: 1 | -1): void {
    if (delta > 0 && !canIncrement(tile)) return;
    if (delta < 0 && !canDecrement(tile)) return;
    setTargets((m) => {
      const cur = getLevelForTile(tile.id, m, tileLevels);
      return { ...m, [tile.id]: Math.max(0, Math.min(6, cur + delta)) };
    });
  }

  const makeHouseId = (group: ColorGroup | undefined, tileId: string, idx: number): string => `house:${String(group ?? 'none')}:${tileId}:${idx}`;
  const makeHotelId = (group: ColorGroup | undefined, tileId: string): string => `hotel:${String(group ?? 'none')}:${tileId}`;
  const makeDropId = (group: ColorGroup | undefined, tileId: string): string => `drop:${String(group ?? 'none')}:${tileId}`;

  const onDragEnd = (ev: DragEndEvent): void => {
    const activeId = String(ev.active.id);
    const overId = ev.over?.id != null ? String(ev.over.id) : null;
    if (!overId) return;
    if (!overId.startsWith('drop:')) return;
    const [, groupB, toTileId] = overId.split(':');
    if (!groupB || !toTileId) return;

    const isHouseDrag = activeId.startsWith('house:');
    const isHotelDrag = activeId.startsWith('hotel:');
    if (!isHouseDrag && !isHotelDrag) return;

    const parts = activeId.split(':');
    const groupA = parts[1];
    const fromTileId = parts[2];
    if (!fromTileId || !toTileId) return;
    if (groupA !== groupB) return; // within-group only
    if (fromTileId === toTileId) return;

    setTargets((prev) => {
      const fromCount = getLevelForTile(fromTileId, prev, tileLevels);
      const toCount = getLevelForTile(toTileId, prev, tileLevels);

      const groupKey = (BOARD_TILES.find((t) => t.id === fromTileId)?.group) as ColorGroup | undefined;
      const groupTiles = groups.find((g) => g.group === groupKey)?.tiles ?? [];
      if (groupTiles.length <= 1) return prev;
      const levels = groupTiles.map((t) => getLevelForTile(t.id, prev, tileLevels));

      // House drag: only within house-level groups
      if (isHouseDrag) {
        if (fromCount <= 0 || fromCount > 4) return prev;
        if (toCount < 0 || toCount >= 4) return prev;
        if (desiredMortgaged[toTileId]) return prev;
        if (levels.some((l) => l >= 5)) return prev; // dragging only for houses

        const next = { ...prev, [fromTileId]: fromCount - 1, [toTileId]: toCount + 1 };
        const nextLevels = groupTiles.map((t) => getLevelForTile(t.id, next, tileLevels));
        const min = Math.min(...nextLevels);
        const max = Math.max(...nextLevels);
        if (max - min > 1) return prev; // keep even-building invariant
        return next;
      }

      // Hotel swap drag: swap hotel (5) with 4 houses only
      if (isHotelDrag) {
        if (fromCount !== 5) return prev;
        if (toCount !== 4) return prev;
        if (desiredMortgaged[fromTileId] || desiredMortgaged[toTileId]) return prev;
        if (levels.some((l) => l >= 6)) return prev; // don't support swaps with skyscrapers

        const next = { ...prev, [fromTileId]: 4, [toTileId]: 5 };
        const nextLevels = groupTiles.map((t) => getLevelForTile(t.id, next, tileLevels));
        const min = Math.min(...nextLevels);
        const max = Math.max(...nextLevels);
        if (max - min > 1) return prev;
        return next;
      }

      return prev;
    });
  };

  // compute costs/refunds
  const { totalCost, totalRefund, netCost } = React.useMemo(() => {
    let cost = 0;
    let refund = 0;
    for (const g of groups) {
      const tiles = g.tiles;
      if (tiles.length === 0) continue;
      const houseCost = tiles[0]?.type === 'property' && tiles[0].property ? tiles[0].property.houseCost : 0;
      const curSum = tiles.reduce((acc, t) => acc + (tileLevels[t.id] ?? 0), 0);
      const tarSum = tiles.reduce((acc, t) => acc + getLevelForTile(t.id, targets, tileLevels), 0);
      const delta = tarSum - curSum;
      if (delta > 0) cost += delta * houseCost;
      else if (delta < 0) refund += (-delta) * (houseCost / 2);
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
        <motion.div data-cmp="m/BuildSellOverlay" key="build-sell-ov" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4">
          <div className="w-full max-w-3xl rounded-xl bg-white dark:bg-neutral-900 shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-t-xl">
              <div className="flex items-center justify-between mb-2">
                <div className="text-sm font-semibold">Property Management</div>
                <button onClick={onClose} className="text-sm opacity-70 hover:opacity-100">Close</button>
              </div>
              <div className="mt-3 flex items-center justify-between text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/house.webp" alt="House" className="h-7 w-7" loading="lazy" decoding="async" />
                    <strong className={bank.housesNeeded > housesRemaining ? 'text-rose-600' : ''}>{bank.housesNeeded}</strong>
                    <span className="opacity-70">/ {housesRemaining}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/hotel.webp" alt="Hotel" className="h-7 w-7" loading="lazy" decoding="async" />
                    <strong className={bank.hotelsNeeded > hotelsRemaining ? 'text-rose-600' : ''}>{bank.hotelsNeeded}</strong>
                    <span className="opacity-70">/ {hotelsRemaining}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-7 w-7" loading="lazy" decoding="async" />
                    <strong className={bank.skyscrapersNeeded > skyscrapersRemaining ? 'text-rose-600' : ''}>{bank.skyscrapersNeeded}</strong>
                    <span className="opacity-70">/ {skyscrapersRemaining}</span>
                  </span>
                </div>
                <div className="space-x-3">
                  <span>Refund: <strong className="text-emerald-700">${totalRefund}</strong></span>
                  <span>Total: <strong>${totalCost}</strong></span>
                  <span>Net: <strong className={netCost > playerMoney ? 'text-rose-600' : 'text-emerald-700'}>${netCost}</strong></span>
                </div>
              </div>
            </div>
            <DndContext onDragEnd={onDragEnd}>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[60vh] overflow-auto p-4">
                {/* Properties by color group (one +/- per group) */}
                {groups.map((g) => {
                  const tiles = g.tiles;
                  const levels = tiles.map((t) => getLevelForTile(t.id, targets, tileLevels));
                  const minLevel = levels.length ? Math.min(...levels) : 0;
                  const maxLevel = levels.length ? Math.max(...levels) : 0;
                  const groupHasHotelOrSky = levels.some((l) => l >= 5);
                  const groupHasSkyscraper = levels.some((l) => l >= 6);
                  const hotelSwapEnabled = !groupHasSkyscraper && levels.some((l) => l === 5) && levels.some((l) => l === 4);
                  const groupCanPlus = tiles.some((t) => getLevelForTile(t.id, targets, tileLevels) === minLevel && canIncrement(t));
                  const groupCanMinus = tiles.some((t) => getLevelForTile(t.id, targets, tileLevels) === maxLevel && canDecrement(t));
                  const houseDragEnabled = !groupHasHotelOrSky;
                  const showPlusMinusRow = groupCanPlus || groupCanMinus;
                  const showHouseBuildControls = groupCanPlus;

                  return (
                    <div key={g.group ?? 'none'} className={`rounded-md border border-neutral-200 dark:border-neutral-700 p-2 ${getGroupContainerClasses(g.group)}`}>
                      <div className="space-y-2">
                        {tiles.map((t) => {
                          const cur = tileLevels[t.id] ?? 0;
                          const tar = getLevelForTile(t.id, targets, tileLevels);
                          const mort = !!desiredMortgaged[t.id];
                          const mv = (t.property?.mortgageValue ?? 0);
                          const canToggleMortgage = tar === 0;
                          const rent = computeRent(rentState, t.id, 0);

                          const renderMarkers = () => {
                            if (mort) {
                              return <div className="text-xs opacity-80">Mortgaged</div>;
                            }
                            if (tar >= 6) {
                              const body = (
                                <div className="flex items-center gap-2">
                                  <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-6 w-6" loading="lazy" decoding="async" />
                                  <span className="text-xs opacity-80">Skyscraper</span>
                                </div>
                              );
                              return showHouseBuildControls ? (
                                <HouseDropZone id={makeDropId(g.group, t.id)}>{body}</HouseDropZone>
                              ) : (
                                body
                              );
                            }
                            if (tar >= 5) {
                              const body = (
                                <div className="flex items-center gap-2">
                                  {showHouseBuildControls && hotelSwapEnabled ? (
                                    <HotelToken id={makeHotelId(g.group, t.id)} />
                                  ) : (
                                    <img src="/icons/hotel.webp" alt="Hotel" className="h-6 w-6" loading="lazy" decoding="async" />
                                  )}
                                  <span className="text-sm opacity-80">Hotel</span>
                                </div>
                              );
                              return showHouseBuildControls ? (
                                <HouseDropZone id={makeDropId(g.group, t.id)}>{body}</HouseDropZone>
                              ) : (
                                body
                              );
                            }
                            const count = Math.max(0, Math.min(4, tar));
                            const draggable = showHouseBuildControls && houseDragEnabled && count > 0;
                            const markers = (
                              <div className="flex items-center gap-1">
                                {showHouseBuildControls ? (
                                  Array.from({ length: 4 }).map((_, i) => {
                                    const filled = i < count;
                                    if (!filled) {
                                      return <div key={i} className="h-6 w-6 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/30" />;
                                    }
                                    return draggable ? (
                                      <HouseToken key={i} id={makeHouseId(g.group, t.id, i)} />
                                    ) : (
                                      <div key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90">
                                        <img src="/icons/house.webp" alt="House" className="h-5 w-5" loading="lazy" decoding="async" />
                                      </div>
                                    );
                                  })
                                ) : (
                                  Array.from({ length: count }).map((_, i) => (
                                    <div key={i} className="inline-flex h-6 w-6 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90">
                                      <img src="/icons/house.webp" alt="House" className="h-5 w-5" loading="lazy" decoding="async" />
                                    </div>
                                  ))
                                )}
                              </div>
                            );
                            return showHouseBuildControls ? (
                              <HouseDropZone id={makeDropId(g.group, t.id)}>{markers}</HouseDropZone>
                            ) : (
                              markers
                            );
                          };

                          return (
                            <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/50 dark:bg-neutral-900/50 text-neutral-900 dark:text-neutral-100"> 
                              <div className="flex items-center justify-between px-2 py-1 gap-2 bg-white/50 dark:bg-neutral-900/50 ">
                                <div className="text-sm font-medium truncate">{t.name}</div>
                                <div className="text-sm font-bold  tabular-nums"><span className="opacity-80 font-normal text-xs">Rent</span> ${rent}</div>
                              </div>
                              <div className="mt-2 flex items-center justify-between px-2 py-2.5 pt-0 gap-2">
                                {renderMarkers()}
                                {canToggleMortgage && (
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md border border-neutral-300 dark:border-neutral-700 bg-white/80 dark:bg-neutral-900/60 px-2 py-1 text-sm font-semibold hover:bg-white dark:hover:bg-neutral-900"
                                    onClick={() => setDetailsTileId(t.id)}
                                    title="Details"
                                    aria-label="Property details"
                                  >
                                    …
                                  </button>
                                )}
                              </div>

                              {/* Mortgage toggle: hide when any improvements are planned on this property */}

                            </div>
                          );
                        })}

                        {/* Group-level +/- controls */}
                        {showPlusMinusRow && (
                          <div className="pt-1 flex items-center justify-between gap-2">
                            <div className="flex grow-1 items-center gap-2">
                              <div className="text-lg opacity-80 font-bold">
                                Build & Sell
                              </div>
                              <button
                                type="button"
                                className="rounded-md grow-1 border px-3 py-1 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!groupCanMinus}
                                onClick={() => {
                                  const tile = tiles.find((t) => getLevelForTile(t.id, targets, tileLevels) === maxLevel && canDecrement(t));
                                  if (tile) adjust(tile, -1);
                                }}
                              >
                                −
                              </button>
                              <button
                                type="button"
                                className="rounded-md grow-1 border px-3 py-1 text-sm font-semibold disabled:opacity-50 disabled:cursor-not-allowed"
                                disabled={!groupCanPlus}
                                onClick={() => {
                                  const tile = tiles.find((t) => getLevelForTile(t.id, targets, tileLevels) === minLevel && canIncrement(t));
                                  if (tile) adjust(tile, +1);
                                }}
                              >
                                +
                              </button>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })}

              {/* Utilities group: white with diagonal bar pattern */}
              {ownedAllTiles.some((t) => t.type === 'utility') && (
                <div className=" rounded-md border border-neutral-200 dark:border-neutral-700 p-2 text-white" style={{ backgroundColor: 'var(--color-zinc-600)', backgroundImage: 'repeating-linear-gradient(45deg, rgba(0,0,0,0.22) 0px, rgba(0,0,0,0.22) 6px, rgba(0,0,0,0) 6px, rgba(0,0,0,0) 12px)' }}>
                  <div className="space-y-2">
                    {ownedAllTiles.filter((t) => t.type === 'utility').map((t) => {
                      const mort = !!desiredMortgaged[t.id];
                      const mv = (t.utility?.mortgageValue ?? 0);
                      return (
                        <div key={t.id} className="rounded-md border border-neutral-200 dark:border-neutral-700 p-2 bg-white/90 dark:bg-neutral-900/90 text-white">
                          <div className="flex items-center justify-between gap-2">
                            <div className="text-sm font-medium truncate">{t.name}</div>
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
            </DndContext>

            <AnimatePresence>
              {(() => {
                if (!detailsTileId) return null;
                const tile = BOARD_TILES.find((t) => t.id === detailsTileId);
                if (!tile || tile.type !== 'property' || !tile.property) return null;
                const tar = getLevelForTile(detailsTileId, targets, tileLevels);
                const mort = !!desiredMortgaged[detailsTileId];
                const mv = tile.property.mortgageValue ?? 0;

                const rentRows: Array<{ label: string; value: number | null }> = (() => {
                  const entry = (rentState as any)?.properties?.byTileId?.[detailsTileId];
                  const base = entry ? { ...entry, mortgaged: false } : { ownerId: playerId, mortgaged: false, improvements: 0 };
                  const byTileId = { ...(rentState as any).properties.byTileId, [detailsTileId]: base };
                  const makeState = (imp: number) =>
                    ({ properties: { byTileId: { ...byTileId, [detailsTileId]: { ...base, improvements: imp } } } } as unknown as RootState);
                  const r = tile.property!.rent;
                  const rows: Array<{ label: string; value: number | null }> = [];
                  rows.push({ label: 'No houses', value: computeRent(makeState(0), detailsTileId, 0) });
                  rows.push({ label: '1 house', value: r.house1 ?? null });
                  rows.push({ label: '2 houses', value: r.house2 ?? null });
                  rows.push({ label: '3 houses', value: r.house3 ?? null });
                  rows.push({ label: '4 houses', value: r.house4 ?? null });
                  rows.push({ label: 'Hotel', value: r.hotel ?? null });
                  if (r.skyscraper != null) rows.push({ label: 'Skyscraper', value: r.skyscraper });
                  return rows;
                })();

                return (
                  <motion.div
                    key="prop-details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) setDetailsTileId(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Property details"
                  >
                    <div className="w-full max-w-md rounded-xl bg-white dark:bg-neutral-900 p-4 shadow-2xl border border-neutral-200 dark:border-neutral-700">
                      <div className="flex items-center justify-between gap-3 mb-3">
                        <div className="text-sm font-semibold">{tile.name}</div>
                        <button type="button" onClick={() => setDetailsTileId(null)} className="text-sm opacity-70 hover:opacity-100">
                          Close
                        </button>
                      </div>

                      <div className="space-y-2">
                        <div className="text-xs font-semibold uppercase tracking-wide text-neutral-500 dark:text-neutral-400">Rent ladder</div>
                        <div className="rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900">
                          <div className="divide-y divide-neutral-200 dark:divide-neutral-800">
                            {rentRows.map((row) => (
                              <div key={row.label} className="flex items-center justify-between px-3 py-2 text-sm">
                                <div className="opacity-90">{row.label}</div>
                                <div className="tabular-nums font-semibold">{row.value != null ? `$${row.value}` : '—'}</div>
                              </div>
                            ))}
                          </div>
                        </div>

                        {/* Mortgage button stays hidden when improvements exist (tar>0) */}
                        {tar === 0 && (
                          <div className="pt-2 flex items-center justify-end">
                            <MortgageButton
                              label={mort ? 'Unmortgage' : `Mortgage +$${mv}`}
                              danger={mort}
                              onClick={() => setDesiredMortgaged((m) => ({ ...m, [detailsTileId]: !mort }))}
                            />
                          </div>
                        )}
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

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


