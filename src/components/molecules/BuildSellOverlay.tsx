import React from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import {
  BOARD_TILES,
  BOARD_TILE_RAILROAD_STRIPE_STYLE,
  BOARD_TILE_UTILITY_STRIPE_STYLE,
  type BoardTileData,
  type ColorGroup,
} from '@/data/board';
import MortgageButton from '@/components/atoms/MortgageButton';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import { DndContext, type DragEndEvent, useDraggable, useDroppable } from '@dnd-kit/core';
import { computeRent, countGroupOwned, countRailroadsOwned, countUtilitiesOwned } from '@/features/selectors/rent';
import type { RootState } from '@/app/store';
import { BsCashStack } from 'react-icons/bs';
import { MdOutlineMoreHoriz } from 'react-icons/md';
import { TiPlus } from 'react-icons/ti';
import { FaMinus } from 'react-icons/fa';

export interface BuildSellOverlayProps {
  open: boolean;
  onClose: () => void;
  mode?: 'manage' | 'liquidate_for_rent';
  rentDue?: number;
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm touch-none"
      {...listeners}
      {...attributes}
      title="Drag to rearrange"
    >
      <img src="/icons/house.webp" alt="House" className="h-8 w-8" loading="lazy" decoding="async" />
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
      className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90 shadow-sm touch-none"
      {...listeners}
      {...attributes}
      title="Drag to swap with 4 houses"
    >
      <img src="/icons/hotel.webp" alt="Hotel" className="h-8 w-8" loading="lazy" decoding="async" />
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

export default function BuildSellOverlay({ open, onClose, mode = 'manage', rentDue = 0, playerId, playerMoney, tileLevels, tileMortgaged, ownedTileIds = [], railroadDepotInstalled = {}, housesRemaining, hotelsRemaining, skyscrapersRemaining = 12, onConfirm }: BuildSellOverlayProps): JSX.Element | null {
  const isLiquidationMode = mode === 'liquidate_for_rent';
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
        return 'bg-yellow-400 text-white';
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
  React.useEffect(() => {
    if (!open) return;
    setTargets({ ...tileLevels });
  }, [open, tileLevels]);

  // desired mortgage state starts at current
  const [desiredMortgaged, setDesiredMortgaged] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!open) return;
    const init: Record<string, boolean> = {};
    for (const t of ownedAllTiles) init[t.id] = !!tileMortgaged[t.id];
    setDesiredMortgaged(init);
  }, [open, ownedAllTiles, tileMortgaged]);

  // desired depot state for railroads
  const [desiredDepotInstalled, setDesiredDepotInstalled] = React.useState<Record<string, boolean>>({});
  React.useEffect(() => {
    if (!open) return;
    const init: Record<string, boolean> = {};
    for (const t of ownedAllTiles) if (t.type === 'railroad') init[t.id] = !!railroadDepotInstalled[t.id];
    setDesiredDepotInstalled(init);
  }, [open, ownedAllTiles, railroadDepotInstalled]);

  const openingLevelsRef = React.useRef<Record<string, number>>({});
  const openingMortgagedRef = React.useRef<Record<string, boolean>>({});
  const openingDepotRef = React.useRef<Record<string, boolean>>({});

  React.useEffect(() => {
    if (!open) return;
    openingLevelsRef.current = { ...tileLevels };
    openingMortgagedRef.current = Object.fromEntries(ownedAllTiles.map((t) => [t.id, !!tileMortgaged[t.id]]));
    openingDepotRef.current = Object.fromEntries(ownedAllTiles.filter((t) => t.type === 'railroad').map((t) => [t.id, !!railroadDepotInstalled[t.id]]));
  }, [open, tileLevels, ownedAllTiles, tileMortgaged, railroadDepotInstalled]);

  const resetPlan = React.useCallback(() => {
    setTargets({ ...openingLevelsRef.current });
    setDesiredMortgaged({ ...openingMortgagedRef.current });
    setDesiredDepotInstalled({ ...openingDepotRef.current });
  }, []);

  const [detailsTileId, setDetailsTileId] = React.useState<string | null>(null);
  React.useEffect(() => {
    if (!open) setDetailsTileId(null);
  }, [open]);
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
    if (isLiquidationMode) {
      const opening = openingLevelsRef.current[tile.id] ?? tileLevels[tile.id] ?? 0;
      if (cur >= opening) return false;
    }
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
      const maxAllowed = isLiquidationMode ? (openingLevelsRef.current[tile.id] ?? tileLevels[tile.id] ?? 0) : 6;
      return { ...m, [tile.id]: Math.max(0, Math.min(maxAllowed, cur + delta)) };
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
        if (isLiquidationMode) {
          const toOpening = openingLevelsRef.current[toTileId] ?? tileLevels[toTileId] ?? 0;
          if (toCount + 1 > toOpening) return prev;
        }

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
  const { totalCost, totalRefund, netCost, sellRefund, spendNow, availableNow, mortgageCreditNextTurn } = React.useMemo(() => {
    let buildCost = 0;
    let sellRefund = 0;
    let mortgageCost = 0;
    let mortgageRefund = 0;
    let depotCost = 0;
    for (const g of groups) {
      const tiles = g.tiles;
      if (tiles.length === 0) continue;
      const houseCost = tiles[0]?.type === 'property' && tiles[0].property ? tiles[0].property.houseCost : 0;
      const curSum = tiles.reduce((acc, t) => acc + (tileLevels[t.id] ?? 0), 0);
      const tarSum = tiles.reduce((acc, t) => acc + getLevelForTile(t.id, targets, tileLevels), 0);
      const delta = tarSum - curSum;
      if (delta > 0) buildCost += delta * houseCost;
      else if (delta < 0) sellRefund += (-delta) * (houseCost / 2);
    }
    // mortgage/unmortgage deltas
    for (const t of ownedAllTiles) {
      const current = !!tileMortgaged[t.id];
      const desired = !!desiredMortgaged[t.id];
      if (current === desired) continue;
      const mv = (t.property?.mortgageValue ?? t.railroad?.mortgageValue ?? t.utility?.mortgageValue ?? 0);
      if (desired && !current) {
        // mortgage credit is deferred to next turn
        mortgageRefund += mv;
      } else if (!desired && current) {
        // unmortgage -> player pays mortgage value
        mortgageCost += mv;
      }
    }
    // depot install cost (install costs, removal free)
    for (const t of ownedAllTiles) {
      if (t.type !== 'railroad') continue;
      const current = !!railroadDepotInstalled[t.id];
      const desired = !!desiredDepotInstalled[t.id];
      if (desired && !current) depotCost += 100;
    }
    const immediateMortgageCredit = isLiquidationMode ? mortgageRefund : 0;
    const totalCost = buildCost + mortgageCost + depotCost;
    const totalRefund = sellRefund + mortgageRefund;
    const spendNow = buildCost + mortgageCost + depotCost;
    const availableNow = playerMoney + sellRefund + immediateMortgageCredit;
    return {
      totalCost,
      totalRefund,
      netCost: Math.max(0, totalCost - totalRefund),
      sellRefund,
      spendNow,
      availableNow,
      mortgageCreditNextTurn: isLiquidationMode ? 0 : mortgageRefund,
    };
  }, [groups, targets, tileLevels, desiredMortgaged, desiredDepotInstalled, ownedAllTiles, tileMortgaged, railroadDepotInstalled, playerMoney, isLiquidationMode]);

  const bank = computeBankDeltas();
  const bankOk = bank.housesNeeded <= housesRemaining && bank.hotelsNeeded <= hotelsRemaining && bank.skyscrapersNeeded <= skyscrapersRemaining;
  const moneyOk = spendNow <= availableNow;
  const projectedCashAfterPlan = availableNow - spendNow;
  const liquidationReady = !isLiquidationMode || projectedCashAfterPlan >= rentDue;
  const liquidationShortfall = isLiquidationMode ? Math.max(0, rentDue - projectedCashAfterPlan) : 0;
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
        <motion.div
          data-cmp="m/BuildSellOverlay"
          key="build-sell-ov"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop p-4"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <div className="w-full max-w-3xl rounded-xl bg-surface-2 text-fg shadow-2xl border border-neutral-200 dark:border-neutral-700">
            <div className="p-1 bg-surface-1 rounded-t-xl">
              <OverlayHeader
                title={isLiquidationMode ? 'Liquidate & Pay' : 'Property Management'}
                onClose={onClose}
                subtitle={
                  isLiquidationMode && liquidationShortfall > 0 ? (
                    `Need $${liquidationShortfall} more to cover rent.`
                  ) : undefined
                }
                className="pl-2"
                subtitleClassName="pt-1 text-xs text-rose-600 dark:text-rose-400"
              />
              <div className=" p-2 flex items-center justify-between text-sm">
                <div className="flex flex-wrap items-center gap-x-4 gap-y-1">
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/house.webp" alt="House" className="h-8 w-8" loading="lazy" decoding="async" />
                    <strong className={bank.housesNeeded > housesRemaining ? 'text-rose-600' : ''}>{bank.housesNeeded}</strong>
                    <span className="opacity-70">/ {housesRemaining}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/hotel.webp" alt="Hotel" className="h-8 w-8" loading="lazy" decoding="async" />
                    <strong className={bank.hotelsNeeded > hotelsRemaining ? 'text-rose-600' : ''}>{bank.hotelsNeeded}</strong>
                    <span className="opacity-70">/ {hotelsRemaining}</span>
                  </span>
                  <span className="inline-flex items-center gap-1">
                    <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-8 w-8" loading="lazy" decoding="async" />
                    <strong className={bank.skyscrapersNeeded > skyscrapersRemaining ? 'text-rose-600' : ''}>{bank.skyscrapersNeeded}</strong>
                    <span className="opacity-70">/ {skyscrapersRemaining}</span>
                  </span>
                </div>
                <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span
                    className="inline-flex items-center gap-1"
                    aria-label={`Available: $${availableNow}`}
                  >
                    <BsCashStack className="h-4 w-4 shrink-0 text-emerald-600" aria-hidden />
                    <strong aria-hidden>${availableNow}</strong>
                  </span>
                  <span>Cost: <strong className={moneyOk ? 'text-emerald-700' : 'text-rose-600'}>${spendNow}</strong></span>
                  {mortgageCreditNextTurn > 0 && (
                    <span>Mortgage credit: <strong className="text-emerald-700">${mortgageCreditNextTurn}</strong></span>
                  )}
                </div>
              </div>
            </div>
            <DndContext onDragEnd={onDragEnd}>
            <div className="grid grid-cols-1 sm:grid-cols-2 place-content-start mx-auto gap-3 max-h-[60vh] overflow-auto p-4">
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
                    <div
                      key={g.group ?? 'none'}
                      className={`${showHouseBuildControls ? 'rounded-b-[16px] rounded-t-2xl' : 'rounded-2xl'} shadow-lg dark:shadow/70 ${getGroupContainerClasses(g.group)}`}
                    >
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
                                  <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-8 w-8" loading="lazy" decoding="async" />
                                  <span className="text-base text-fg font-bold">Skyscraper</span>
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
                                    <img src="/icons/hotel.webp" alt="Hotel" className="h-10 w-10" loading="lazy" decoding="async" />
                                  )}
                                  <span className="text-base text-fg font-bold">Hotel</span>
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
                                      return <div key={i} className="h-8 w-8 rounded-md border border-dashed border-neutral-300 dark:border-neutral-700 bg-white/60 dark:bg-neutral-900/30" />;
                                    }
                                    return draggable ? (
                                      <HouseToken key={i} id={makeHouseId(g.group, t.id, i)} />
                                    ) : (
                                      <div key={i} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90">
                                        <img src="/icons/house.webp" alt="House" className="h-8 w-8" loading="lazy" decoding="async" />
                                      </div>
                                    );
                                  })
                                ) : (
                                  Array.from({ length: count }).map((_, i) => (
                                    <div key={i} className="inline-flex h-8 w-8 items-center justify-center rounded-md border border-neutral-200 dark:border-neutral-700 bg-white/90 dark:bg-neutral-900/90">
                                      <img src="/icons/house.webp" alt="House" className="h-8 w-8" loading="lazy" decoding="async" />
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
                            <div key={t.id} className="rounded-xl bg-surface-tint-1 text-fg m-0 shadow-lg m-1.5">
                              <div className="flex rounded-t-xl items-center justify-between px-2 py-1 gap-2 bg-surface-tint-2">
                                <div className="text-sm font-medium truncate">{t.name}</div>
                                <div className="flex items-center gap-2">
                                  <div className="text-sm font-bold tabular-nums">
                                    <span className="opacity-80 font-normal text-xs">Rent</span> ${rent}
                                  </div>
                                  <button
                                    type="button"
                                    className="inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface-tint-3 px-2 py-1 text-sm font-semibold hover:brightness-[1.03] active:brightness-[0.98]"
                                    onClick={() => setDetailsTileId(t.id)}
                                    title="Details"
                                    aria-label="Property details"
                                  >
                                    <MdOutlineMoreHoriz className="h-5 w-5" />
                                  </button>
                                </div>
                              </div>
                              <div className="mt-2 flex items-center justify-between px-2 py-2.5 pt-0 gap-2">
                                <div className="min-w-0 flex-1">{renderMarkers()}</div>
                                {canToggleMortgage && (
                                  <MortgageButton
                                    label={mort ? 'Unmortgage' : `Mortgage $${mv}`}
                                    danger={mort}
                                    onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))}
                                  />
                                )}
                              </div>

                              {/* Mortgage toggle: hide when any improvements are planned on this property */}

                            </div>
                          );
                        })}

                        {/* Group-level +/- controls */}
                        {showPlusMinusRow && (
                          <div className="rounded-b-md flex items-center justify-between p-2">
                            <div className=" flex grow-1 items-center border-4 border-tint bg-surface-tint-1 rounded-full p-2">
                              <button
                                type="button"
                                className="flex items-center justify-center rounded-full grow-1 border border-surface-strong bg-white dark:bg-neutral-900 text-fg py-2 shadow-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:bg-white/60 dark:disabled:bg-neutral-900/40 disabled:text-muted disabled:border-surface disabled:shadow-none disabled:cursor-not-allowed disabled:hover:bg-white/60 dark:disabled:hover:bg-neutral-900/40 disabled:active:scale-100"
                                disabled={!groupCanMinus}
                                onClick={() => {
                                  const tile = tiles.find((t) => getLevelForTile(t.id, targets, tileLevels) === maxLevel && canDecrement(t));
                                  if (tile) adjust(tile, -1);
                                }}
                                aria-label="Remove house"
                              >
                                <FaMinus className="h-4 w-4" />
                              </button>
                              <div className="flex items-center max-h-8 justify-center gap-2 rounded-md grow-1 ">
                                <img src="/icons/house.webp" alt="House" className="h-8 w-7" loading="lazy" decoding="async" />
                                <img src="/icons/hotel.webp" alt="Hotel" className="h-8 w-7 -ml-4" loading="lazy" decoding="async" />
                                <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-8 w-7 -ml-4" loading="lazy" decoding="async" />
                              </div>
                              <button
                                type="button"
                                className="flex items-center justify-center rounded-full grow-1 border border-surface-strong bg-white dark:bg-neutral-900 text-fg py-2 shadow-sm transition-colors hover:bg-neutral-50 dark:hover:bg-neutral-800 active:scale-[0.98] focus:outline-none focus:ring-2 focus:ring-emerald-400/40 disabled:bg-white/60 dark:disabled:bg-neutral-900/40 disabled:text-muted disabled:border-surface disabled:shadow-none disabled:cursor-not-allowed disabled:hover:bg-white/60 dark:disabled:hover:bg-neutral-900/40 disabled:active:scale-100"
                                disabled={!groupCanPlus}
                                onClick={() => {
                                  const tile = tiles.find((t) => getLevelForTile(t.id, targets, tileLevels) === minLevel && canIncrement(t));
                                  if (tile) adjust(tile, +1);
                                }}
                                aria-label="Add house"
                              >
                                <TiPlus className="h-4 w-4" />
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
                <div
                  className="flex flex-col gap-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-1.5"
                  style={BOARD_TILE_UTILITY_STRIPE_STYLE}
                >
                  <div className="flex flex-col gap-1.5">
                    {ownedAllTiles.filter((t) => t.type === 'utility').map((t) => {
                      const mort = !!desiredMortgaged[t.id];
                      const mv = t.utility?.mortgageValue ?? 0;
                      const u = t.utility;
                      const ownedUtils = countUtilitiesOwned(rentState, playerId);
                      let rentMult = u?.rentMultiplier1 ?? 0;
                      if (u && ownedUtils >= 3 && u.rentMultiplier3 != null) rentMult = u.rentMultiplier3;
                      else if (u && ownedUtils >= 2) rentMult = u.rentMultiplier2;
                      return (
                        <div key={t.id} className="rounded-xl bg-surface-tint-3 text-fg m-0 shadow-lg">
                          <div className="flex rounded-t-xl items-center justify-between px-2 py-1 gap-2 bg-surface-tint-3">
                            <div className="text-sm font-medium truncate">{t.name}</div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-sm font-bold tabular-nums">
                                <span className="opacity-80 font-normal text-xs">Rent</span>{' '}
                                {mort ? '—' : `${rentMult}× dice`}
                              </div>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface-tint-3 px-2 py-1 text-sm font-semibold hover:brightness-[1.03] active:brightness-[0.98]"
                                onClick={() => setDetailsTileId(t.id)}
                                title="Details"
                                aria-label="Utility details"
                              >
                                <MdOutlineMoreHoriz className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between px-2 py-2.5 pt-0 gap-2">
                            <div className="min-w-0 flex-1">
                              {mort ? <div className="text-xs opacity-80 text-fg">Mortgaged</div> : null}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              <MortgageButton
                                label={mort ? 'Unmortgage' : `Mortgage $${mv}`}
                                danger={mort}
                                onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Railroads group: yellow/black hazard stripes (yellow wider) */}
              {ownedAllTiles.some((t) => t.type === 'railroad') && (
                <div
                  className="flex flex-col gap-1 rounded-2xl border border-neutral-200 dark:border-neutral-700 p-1.5"
                  style={BOARD_TILE_RAILROAD_STRIPE_STYLE}
                >
                  <div className="flex flex-col gap-1.5">
                    {ownedAllTiles.filter((t) => t.type === 'railroad').map((t) => {
                      const mort = !!desiredMortgaged[t.id];
                      const mv = (t.railroad?.mortgageValue ?? 0);
                      const depot = !!desiredDepotInstalled[t.id];
                      const rent = computeRent(rentState, t.id, 0);
                      return (
                        <div key={t.id} className="rounded-xl bg-surface-tint-3 text-fg m-0 shadow-lg">
                          <div className="flex rounded-t-xl items-center justify-between px-2 py-1 gap-2 bg-surface-tint-3">
                            <div className="text-sm font-medium truncate">{t.name}</div>
                            <div className="flex items-center gap-2 shrink-0">
                              <div className="text-sm font-bold tabular-nums">
                                <span className="opacity-80 font-normal text-xs">Rent</span> ${rent}
                              </div>
                              <button
                                type="button"
                                className="inline-flex items-center justify-center rounded-md border border-surface-strong bg-surface-tint-3 px-2 py-1 text-sm font-semibold hover:brightness-[1.03] active:brightness-[0.98]"
                                onClick={() => setDetailsTileId(t.id)}
                                title="Details"
                                aria-label="Railroad details"
                              >
                                <MdOutlineMoreHoriz className="h-5 w-5" />
                              </button>
                            </div>
                          </div>
                          <div className="mt-2 flex items-center justify-between px-2 py-2.5 pt-0 gap-2">
                            <div className="min-w-0 flex-1">
                              {mort ? (
                                <div className="text-xs opacity-80 text-fg ">Mortgaged</div>
                              ) : depot ? (
                                <div className="text-xs text-fg font-medium">Depot installed — rent doubled on this line</div>
                              ) : null}
                            </div>
                            <div className="flex flex-wrap items-center justify-end gap-2">
                              {!depot && (
                                <MortgageButton label={mort ? 'Unmortgage' : `Mortgage $${mv}`} danger={mort} onClick={() => setDesiredMortgaged((m) => ({ ...m, [t.id]: !mort }))} />
                              )}
                              {!isLiquidationMode && (
                                <MortgageButton
                                  label={depot ? 'Remove Depot' : 'Install Depot (+$100)'}
                                  onClick={() => setDesiredDepotInstalled((m) => ({ ...m, [t.id]: !m[t.id] }))}
                                  className={depot ? 'border-emerald-500 text-emerald-600' : undefined}
                                />
                              )}
                            </div>
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
                if (!tile) return null;

                if (tile.type === 'railroad' && tile.railroad) {
                  const rr = tile.railroad;
                  const ownedRR = countRailroadsOwned(rentState, playerId);
                  const ladder = [
                    { count: 1, base: rr.rent1 },
                    { count: 2, base: rr.rent2 },
                    { count: 3, base: rr.rent3 },
                    { count: 4, base: rr.rent4 },
                  ] as const;
                  const isRowActive = (n: number) => {
                    if (ownedRR <= 0) return false;
                    if (ownedRR >= 4) return n === 4;
                    return ownedRR === n;
                  };

                  return (
                    <motion.div
                      key="rr-details"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4"
                      onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setDetailsTileId(null);
                      }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Railroad details"
                    >
                      <div className="w-full max-w-md rounded-xl bg-surface-2 shadow-2xl border border-surface">
                        <OverlayHeader
                          title={tile.name}
                          onClose={() => setDetailsTileId(null)}
                          className="bg-surface-1 pl-3 pr-1 py-2 rounded-t-md"
                        />
                        <div className="divide-y divide-surface text-sm">
                          <div className="px-3 py-2.5 space-y-1 bg-surface-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="opacity-80">Purchase price</span>
                              <span className="tabular-nums font-semibold">${rr.purchasePrice}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="opacity-80">Mortgage value</span>
                              <span className="tabular-nums font-semibold">${rr.mortgageValue}</span>
                            </div>
                            {rr.hasDepot && (
                              <p className="text-xs opacity-80 pt-1 leading-snug">
                                Train depot: $100 to install on this line (doubles rent). Removing the depot returns $50 from the bank.
                              </p>
                            )}
                          </div>
                          <div className="px-3 py-2 bg-surface-0 rounded-b-xl">
                            <div className="flex items-center justify-between gap-2 text-xs mb-2">
                              <span className="font-semibold uppercase tracking-wide">Rent by railroads owned</span>
                              <span className="tabular-nums opacity-80">
                                You: <strong className="text-fg">{ownedRR}</strong>
                              </span>
                            </div>
                            <div className="space-y-1">
                              {ladder.map(({ count, base }) => {
                                const active = isRowActive(count);
                                const withDepot = base * 2;
                                return (
                                  <div
                                    key={count}
                                    className={`flex items-center justify-between rounded-md px-2 py-1.5 tabular-nums ${
                                      active ? 'bg-emerald-500/10 border border-emerald-500/40' : 'border border-transparent'
                                    }`}
                                  >
                                    <span className={active ? 'font-semibold' : 'opacity-90'}>{count} owned</span>
                                    <div className="text-right text-xs sm:text-sm">
                                      <div className="font-semibold">${base}</div>
                                      {rr.hasDepot && (
                                        <div className="opacity-70">Depot on this line: ${withDepot}</div>
                                      )}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (tile.type === 'utility' && tile.utility) {
                  const u = tile.utility;
                  const ownedU = countUtilitiesOwned(rentState, playerId);
                  const ladder = [
                    { count: 1 as const, mult: u.rentMultiplier1 },
                    { count: 2 as const, mult: u.rentMultiplier2 },
                    ...(u.rentMultiplier3 != null ? ([{ count: 3 as const, mult: u.rentMultiplier3 }] as const) : []),
                  ];
                  const isRowActive = (n: number) => {
                    if (ownedU <= 0) return false;
                    if (u.rentMultiplier3 != null) {
                      if (ownedU >= 3) return n === 3;
                      return ownedU === n;
                    }
                    if (ownedU >= 2) return n === 2;
                    return n === 1;
                  };

                  return (
                    <motion.div
                      key="utility-details"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4"
                      onMouseDown={(e) => {
                        if (e.target === e.currentTarget) setDetailsTileId(null);
                      }}
                      role="dialog"
                      aria-modal="true"
                      aria-label="Utility details"
                    >
                      <div className="w-full max-w-md rounded-xl bg-surface-2 shadow-2xl border border-surface">
                        <OverlayHeader
                          title={tile.name}
                          onClose={() => setDetailsTileId(null)}
                          className="bg-surface-1 pl-3 pr-1 py-2 rounded-t-md"
                        />
                        <div className="divide-y divide-surface text-sm">
                          <div className="px-3 py-2.5 space-y-1 bg-surface-0">
                            <div className="flex items-center justify-between gap-2">
                              <span className="opacity-80">Purchase price</span>
                              <span className="tabular-nums font-semibold">${u.purchasePrice}</span>
                            </div>
                            <div className="flex items-center justify-between gap-2">
                              <span className="opacity-80">Mortgage value</span>
                              <span className="tabular-nums font-semibold">${u.mortgageValue}</span>
                            </div>
                            <p className="text-xs opacity-80 pt-1 leading-snug">
                              Rent is the last dice roll total times the multiplier below (per utilities you own).
                            </p>
                          </div>
                          <div className="px-3 py-2 bg-surface-0 rounded-b-xl">
                            <div className="flex items-center justify-between gap-2 text-xs mb-2">
                              <span className="font-semibold uppercase tracking-wide">Rent by utilities owned</span>
                              <span className="tabular-nums opacity-80">
                                You: <strong className="text-fg">{ownedU}</strong>
                              </span>
                            </div>
                            <div className="space-y-1">
                              {ladder.map(({ count, mult }) => {
                                const active = isRowActive(count);
                                return (
                                  <div
                                    key={count}
                                    className={`flex items-center justify-between rounded-md px-2 py-1.5 tabular-nums ${
                                      active ? 'bg-emerald-500/10 border border-emerald-500/40' : 'border border-transparent'
                                    }`}
                                  >
                                    <span className={active ? 'font-semibold' : 'opacity-90'}>{count} owned</span>
                                    <div className="text-right text-xs sm:text-sm font-semibold">{mult}× dice</div>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        </div>
                      </div>
                    </motion.div>
                  );
                }

                if (tile.type !== 'property' || !tile.property) return null;
                const tar = getLevelForTile(detailsTileId, targets, tileLevels);

                const rentRows: Array<{ key: string; level: number; value: number | null }> = (() => {
                  const entry = (rentState as any)?.properties?.byTileId?.[detailsTileId];
                  const base = entry ? { ...entry, mortgaged: false } : { ownerId: playerId, mortgaged: false, improvements: 0 };
                  const byTileId = { ...(rentState as any).properties.byTileId, [detailsTileId]: base };
                  const makeState = (imp: number) =>
                    ({ properties: { byTileId: { ...byTileId, [detailsTileId]: { ...base, improvements: imp } } } } as unknown as RootState);
                  const r = tile.property!.rent;
                  const rows: Array<{ key: string; level: number; value: number | null }> = [];
                  rows.push({ key: 'rent', level: 0, value: computeRent(makeState(0), detailsTileId, 0) });
                  rows.push({ key: 'h1', level: 1, value: r.house1 ?? null });
                  rows.push({ key: 'h2', level: 2, value: r.house2 ?? null });
                  rows.push({ key: 'h3', level: 3, value: r.house3 ?? null });
                  rows.push({ key: 'h4', level: 4, value: r.house4 ?? null });
                  rows.push({ key: 'hotel', level: 5, value: r.hotel ?? null });
                  if (r.skyscraper != null) rows.push({ key: 'sky', level: 6, value: r.skyscraper });
                  return rows;
                })();

                const rentLine = (() => {
                  const base = tile.property!.rent.base;
                  const total = BOARD_TILES.filter((t) => t.type === 'property' && t.group === tile.group).length;
                  const partsAll: Array<{ owned: number; mult: 1 | 2 | 3; value: number }> = [];
                  for (let owned = 1; owned <= total; owned += 1) {
                    const mult = owned >= total ? 3 : owned === total - 1 ? 2 : 1;
                    partsAll.push({ owned, mult, value: base * mult });
                  }

                  // Only show the points where rent changes (plus the first base value).
                  const parts: Array<{ owned: number; mult: 1 | 2 | 3; value: number }> = [];
                  for (const p of partsAll) {
                    const last = parts[parts.length - 1];
                    if (!last || last.value !== p.value) parts.push(p);
                  }

                  return { total, parts };
                })();

                const current = (() => {
                  const grp = countGroupOwned(rentState, detailsTileId, playerId);
                  const mult: 1 | 2 | 3 =
                    grp.total > 0 && grp.owned >= grp.total ? 3 : grp.total > 1 && grp.owned === grp.total - 1 ? 2 : 1;
                  const effectiveRent = computeRent(rentState, detailsTileId, 0);
                  return { owned: grp.owned, total: grp.total, mult, imp: tar, effectiveRent };
                })();

                const isChipCurrent = (chip: { mult: 1 | 2 | 3 }, idx: number): boolean => {
                  if (current.mult === 1) return idx === 0; // base chip
                  return chip.mult === current.mult;
                };

                const levelIcon = (level: number): React.ReactNode => {
                  if (level <= 0) return null;
                  if (level >= 6) {
                    return <img src="/icons/skyscraper.webp" alt="Skyscraper" className="h-10 w-10" loading="lazy" decoding="async" />;
                  }
                  if (level === 5) {
                    return <img src="/icons/hotel.webp" alt="Hotel" className="h-10 w-10" loading="lazy" decoding="async" />;
                  }
                  return (
                    <div className="flex items-center gap-0.5">
                      {Array.from({ length: Math.min(4, level) }).map((_, i) => (
                        <img key={i} src="/icons/house.webp" alt="House" className="h-8 w-8" loading="lazy" decoding="async" />
                      ))}
                    </div>
                  );
                };

                return (
                  <motion.div
                    key="prop-details"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                    exit={{ opacity: 0 }}
                    className="fixed inset-0 z-[60] flex items-center justify-center modal-backdrop p-4"
                    onMouseDown={(e) => {
                      if (e.target === e.currentTarget) setDetailsTileId(null);
                    }}
                    role="dialog"
                    aria-modal="true"
                    aria-label="Property details"
                  >
                    <div className="w-full max-w-md rounded-xl bg-surface-2 shadow-2xl border border-surface ">
                      <OverlayHeader
                        title={tile.name}
                        onClose={() => setDetailsTileId(null)}
                        className="bg-surface-1 pl-3 pr-1 py-2 rounded-t-md"
                      />

                      <div className="space-y-1">
                        <div className="rounded-lg ">
                          <div className="divide-y divide-surface">
                            {rentRows.map((row) => {
                              if (row.key === 'rent') {
                                return (
                                  <div key={row.key} className="flex bg-surface-0 items-center justify-between px-3 py-2 text-sm">
                                    <div className="font-semibold text-base">RENT</div>
                                    <div className="flex items-center gap-3 flex-wrap justify-end">
                                      {rentLine.parts.map((p, idx) => {
                                        const active = isChipCurrent(p, idx) && current.imp === 0;
                                        return (
                                          <div
                                            key={p.owned}
                                            className={`tabular-nums font-semibold rounded-md px-2 py-1 border ${
                                              active
                                                ? 'bg-emerald-500/15 border-emerald-500 text-emerald-700 dark:text-emerald-300'
                                                : 'border-transparent'
                                            }`}
                                            title={`${p.owned} owned`}
                                          >
                                            ${p.value}
                                            {p.mult > 1 && <span className="ml-1 text-[11px] font-normal opacity-70">({p.owned} owned)</span>}
                                          </div>
                                        );
                                      })}
                                    </div>
                                  </div>
                                );
                              }
                              const rowActive = current.imp === row.level && current.effectiveRent > 0;
                              return (
                                <div
                                  key={row.key}
                                  className={`flex items-center justify-between px-3 py-1.5 text-sm ${
                                    rowActive ? 'bg-emerald-500/10 dark:bg-emerald-500/10' : ''
                                  }`}
                                >
                                  <div className="opacity-90">{levelIcon(row.level)}</div>
                                  <div className="tabular-nums font-semibold">{row.value != null ? `$${row.value}` : '—'}</div>
                                </div>
                              );
                            })}
                          </div>
                        </div>

                        <div className="bg-surface-0 rounded-b-xl py-2" />
                      </div>
                    </div>
                  </motion.div>
                );
              })()}
            </AnimatePresence>

            <div className=" bg-surface-1 p-3 mt-1 flex items-center justify-end gap-2 rounded-b-xl">
              <button
                type="button"
                disabled={!hasChange}
                onClick={resetPlan}
                className={`rounded-md border px-3 py-1.5 text-sm ${
                  !hasChange
                    ? 'border-neutral-200 dark:border-neutral-800 text-muted opacity-50 cursor-not-allowed'
                    : 'border-neutral-300 dark:border-neutral-700 hover:bg-neutral-50 dark:hover:bg-neutral-800/60'
                }`}
              >
                Reset
              </button>
              <button
                type="button"
                disabled={!hasChange || !bankOk || !moneyOk || !liquidationReady}
                onClick={() => onConfirm({ targets, desiredMortgaged, desiredDepotInstalled })}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold text-white ${!hasChange || !bankOk || !moneyOk || !liquidationReady ? 'bg-emerald-600/40 cursor-not-allowed' : 'bg-emerald-600 hover:bg-emerald-700'}`}
              >
                {isLiquidationMode ? `Liquidate & Pay $${rentDue}` : 'Confirm'}
              </button>
            </div>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}


