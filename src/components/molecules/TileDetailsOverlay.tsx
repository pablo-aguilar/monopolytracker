import React, { useMemo } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import OverlayHeader from '@/components/molecules/OverlayHeader';
import { BOARD_TILES, getTileByIndex, type BoardTileData } from '@/data/board';
import type { GameEvent } from '@/types/monopoly-schema';
import type { PlayerLite } from '@/features/players/playersSlice';
import type { PropertiesState } from '@/features/properties/propertiesSlice';

export interface TileDetailsOverlayProps {
  open: boolean;
  tileIndex: number | null;
  onClose: () => void;
  players: PlayerLite[];
  properties: PropertiesState;
  events: GameEvent[];
}

function labelForImprovements(level: number): string {
  if (level <= 0) return 'None';
  if (level >= 1 && level <= 4) return `${level} house${level === 1 ? '' : 's'}`;
  if (level === 5) return 'Hotel';
  return 'Skyscraper';
}

function propertyRentNow(tile: BoardTileData, improvements: number): number | null {
  const rent = tile.property?.rent;
  if (!rent) return null;
  if (improvements <= 0) return rent.base;
  if (improvements === 1) return rent.house1;
  if (improvements === 2) return rent.house2;
  if (improvements === 3) return rent.house3;
  if (improvements === 4) return rent.house4;
  if (improvements === 5) return rent.hotel;
  return rent.skyscraper ?? rent.hotel;
}

function railroadRentNow(tile: BoardTileData, ownerId: string | null, installed: boolean, properties: PropertiesState): number | null {
  const rr = tile.railroad;
  if (!rr || !ownerId) return rr ? rr.rent1 : null;
  const ownedRailroads = BOARD_TILES.filter(
    (t) => t.type === 'railroad' && properties.byTileId[t.id]?.ownerId === ownerId,
  ).length;
  let base = rr.rent1;
  if (ownedRailroads >= 4) base = rr.rent4;
  else if (ownedRailroads === 3) base = rr.rent3;
  else if (ownedRailroads === 2) base = rr.rent2;
  return installed ? base * 2 : base;
}

export default function TileDetailsOverlay({
  open,
  tileIndex,
  onClose,
  players,
  properties,
  events,
}: TileDetailsOverlayProps): JSX.Element | null {
  const tile = tileIndex == null ? null : getTileByIndex(tileIndex);

  const derived = useMemo(() => {
    if (!tile) return null;
    const ps = properties.byTileId[tile.id];
    const ownerId = ps?.ownerId ?? null;
    const owner = ownerId ? players.find((p) => p.id === ownerId) ?? null : null;
    const occupants = players.filter((p) => p.positionIndex === tile.index);

    let landedCount = 0;
    let lastLandedAt: string | null = null;
    let lastLandedBy: PlayerLite | null = null;
    const landedByPlayer: Record<string, number> = {};
    for (const ev of events) {
      if (ev.type !== 'MOVE') continue;
      const to = typeof ev.payload?.to === 'number' ? ev.payload.to : null;
      if (to !== tile.index) continue;
      landedCount += 1;
      const playerId = (ev.payload?.playerId as string | undefined) ?? ev.actorPlayerId;
      if (playerId) {
        landedByPlayer[playerId] = (landedByPlayer[playerId] ?? 0) + 1;
        const by = players.find((p) => p.id === playerId) ?? null;
        if (by) lastLandedBy = by;
      }
      lastLandedAt = ev.createdAt;
    }

    const landedByRows = Object.entries(landedByPlayer)
      .map(([playerId, count]) => ({
        playerId,
        count,
        nickname: players.find((p) => p.id === playerId)?.nickname ?? playerId,
      }))
      .sort((a, b) => b.count - a.count || a.nickname.localeCompare(b.nickname));

    const ownerGroupCount =
      tile.type === 'property' && tile.group && ownerId
        ? BOARD_TILES.filter((t) => t.type === 'property' && t.group === tile.group && properties.byTileId[t.id]?.ownerId === ownerId)
            .length
        : null;
    const totalGroupCount = tile.type === 'property' && tile.group ? BOARD_TILES.filter((t) => t.type === 'property' && t.group === tile.group).length : null;

    return {
      ps,
      owner,
      ownerId,
      occupants,
      landedCount,
      lastLandedAt,
      lastLandedBy,
      landedByRows,
      ownerGroupCount,
      totalGroupCount,
    };
  }, [events, players, properties, tile]);

  if (!open || !tile || !derived) return null;

  const currentRent =
    tile.type === 'property'
      ? propertyRentNow(tile, derived.ps?.improvements ?? 0)
      : tile.type === 'railroad'
        ? railroadRentNow(tile, derived.ownerId, Boolean(derived.ps?.depotInstalled), properties)
        : null;

  return (
    <AnimatePresence>
      {open ? (
        <motion.div
          data-cmp="m/TileDetailsOverlay"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-50 flex items-center justify-center p-4 modal-backdrop"
          onMouseDown={(e) => {
            if (e.target === e.currentTarget) onClose();
          }}
        >
          <motion.div
            initial={{ opacity: 0, y: 10, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 8, scale: 0.98 }}
            transition={{ duration: 0.16 }}
            className="w-full max-w-xl rounded-xl border border-neutral-200 bg-surface-0 shadow-2xl dark:border-neutral-700"
          >
            <OverlayHeader
              title={tile.name}
              subtitle={`#${tile.index} · ${tile.type}`}
              onClose={onClose}
              className="px-3 pt-2"
              rowClassName="pb-1"
            />
            <div className="max-h-[75vh] overflow-auto px-3 pb-3 space-y-3">
              <section className="rounded-lg border border-surface p-3 bg-surface-1">
                <div className="text-xs text-muted">Owner</div>
                <div className="text-sm font-medium">{derived.owner ? derived.owner.nickname : 'Unowned'}</div>
                {tile.type === 'property' && tile.group && derived.ownerGroupCount != null && derived.totalGroupCount != null ? (
                  <div className="mt-1 text-xs text-muted">Color group owned: {derived.ownerGroupCount}/{derived.totalGroupCount}</div>
                ) : null}
                {derived.ps ? (
                  <div className="mt-2 grid grid-cols-2 gap-2 text-xs">
                    <div>Mortgaged: {derived.ps.mortgaged ? 'Yes' : 'No'}</div>
                    {tile.type === 'property' ? <div>Buildings: {labelForImprovements(derived.ps.improvements)}</div> : null}
                    {tile.type === 'railroad' ? <div>Depot: {derived.ps.depotInstalled ? 'Installed' : 'No'}</div> : null}
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-surface p-3 bg-surface-1">
                <div className="text-xs text-muted">Landings this game</div>
                <div className="text-sm font-medium">{derived.landedCount}</div>
                {derived.lastLandedAt ? (
                  <div className="mt-1 text-xs text-muted">
                    Last landed: {new Date(derived.lastLandedAt).toLocaleString()}
                    {derived.lastLandedBy ? ` by ${derived.lastLandedBy.nickname}` : ''}
                  </div>
                ) : (
                  <div className="mt-1 text-xs text-muted">No one has landed here yet.</div>
                )}
                {derived.landedByRows.length > 0 ? (
                  <div className="mt-2 text-xs space-y-1">
                    {derived.landedByRows.map((row) => (
                      <div key={row.playerId} className="flex items-center justify-between">
                        <span>{row.nickname}</span>
                        <span>{row.count}</span>
                      </div>
                    ))}
                  </div>
                ) : null}
              </section>

              <section className="rounded-lg border border-surface p-3 bg-surface-1">
                <div className="text-xs text-muted">Players on tile now</div>
                {derived.occupants.length > 0 ? (
                  <div className="mt-1 text-sm">{derived.occupants.map((p) => p.nickname).join(', ')}</div>
                ) : (
                  <div className="mt-1 text-sm text-muted">None</div>
                )}
              </section>

              <section className="rounded-lg border border-surface p-3 bg-surface-1">
                <div className="text-xs text-muted">Economics</div>
                <div className="mt-1 text-xs space-y-1">
                  {tile.property ? (
                    <>
                      <div>Purchase: ${tile.property.purchasePrice}</div>
                      <div>Mortgage value: ${tile.property.mortgageValue}</div>
                      <div>House cost: ${tile.property.houseCost}</div>
                      <div>Current rent: {currentRent != null ? `$${currentRent}` : 'N/A'}</div>
                    </>
                  ) : null}
                  {tile.railroad ? (
                    <>
                      <div>Purchase: ${tile.railroad.purchasePrice}</div>
                      <div>Mortgage value: ${tile.railroad.mortgageValue}</div>
                      <div>Current rent: {currentRent != null ? `$${currentRent}` : 'N/A'}</div>
                    </>
                  ) : null}
                  {tile.utility ? (
                    <>
                      <div>Purchase: ${tile.utility.purchasePrice}</div>
                      <div>Mortgage value: ${tile.utility.mortgageValue}</div>
                      <div>Rent multiplier: x{tile.utility.rentMultiplier1} / x{tile.utility.rentMultiplier2}{tile.utility.rentMultiplier3 ? ` / x${tile.utility.rentMultiplier3}` : ''}</div>
                    </>
                  ) : null}
                  {tile.type === 'tax' ? <div>Tax due: ${tile.taxAmount ?? 0}</div> : null}
                  {!tile.property && !tile.railroad && !tile.utility && tile.type !== 'tax' ? (
                    <div>Special tile ({tile.type.replace(/([A-Z])/g, ' $1').trim()}).</div>
                  ) : null}
                </div>
              </section>
            </div>
          </motion.div>
        </motion.div>
      ) : null}
    </AnimatePresence>
  );
}
