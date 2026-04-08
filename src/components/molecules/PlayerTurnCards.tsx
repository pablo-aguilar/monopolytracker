import React from 'react';
import { BOARD_TILES, JAIL_INDEX, type ColorGroup } from '@/data/board';
import AnimatedNumber from '@/components/atoms/AnimatedNumber';
import HudBadge from '@/components/atoms/HudBadge';
import Tooltip from '@/components/atoms/Tooltip';
import { BsCashStack } from 'react-icons/bs';
import { FaBusAlt } from 'react-icons/fa';
import { TbBuildings } from 'react-icons/tb';
import { AnimatePresence, motion } from 'framer-motion';

function abbreviateTileNameForHud(name: string): string {
  return name.replace(/\bAvenue\b/g, 'Ave');
}

export type PlayerTurnCardsPlayer = {
  id: string;
  nickname: string;
  avatarKey: string;
  color: string;
  positionIndex: number;
  money: number;
  liquidationPotential?: number;
  busTickets?: number;
  gojfChance?: number;
  gojfCommunity?: number;
  // allow extra fields without fighting PlayConsole typing
  [k: string]: unknown;
};

export interface PlayerTurnCardsProps {
  players: PlayerTurnCardsPlayer[];
  activePlayerIndex: number;
  getTileByIndex: (idx: number) => { name: string };
  propsByTileId: Record<string, { ownerId?: string | null } | undefined>;
  railroadTooltipForPlayer: (playerId: string) => React.ReactNode;
  utilitiesTooltipForPlayer: (playerId: string) => React.ReactNode;
  groupTooltipForPlayer: (playerId: string, group: ColorGroup) => React.ReactNode;
  getGroupBorderClass: (group: ColorGroup) => string;
  tradePassBadgesForPlayer: (playerId: string) => Array<{
    key: string;
    count: number;
    borderClassName: string;
    tooltip: React.ReactNode;
  }>;
  renderActivePanel?: (player: PlayerTurnCardsPlayer, idx: number) => React.ReactNode;
}

export default function PlayerTurnCards({
  players,
  activePlayerIndex,
  getTileByIndex,
  propsByTileId,
  railroadTooltipForPlayer,
  utilitiesTooltipForPlayer,
  groupTooltipForPlayer,
  getGroupBorderClass,
  tradePassBadgesForPlayer,
  renderActivePanel,
}: PlayerTurnCardsProps): JSX.Element {
  const p = players[activePlayerIndex] ?? players[0];
  if (!p) {
    return <div data-cmp="m/PlayerTurnCards" data-qa="turn-cards" className="rounded-2xl" />;
  }
  const liquidationPotential = Number(p.liquidationPotential ?? 0);
  const loc = getTileByIndex(p.positionIndex);
  const locLabel = (() => {
    if (p.positionIndex !== JAIL_INDEX) return abbreviateTileNameForHud(loc.name);
    const inJail = Boolean((p as any).inJail);
    if (!inJail) return 'Jail: Just Visiting';
    const attempts = Number((p as any).jailAttempts ?? 0);
    if (attempts <= 0) return 'Jail: First Roll';
    if (attempts === 1) return 'Jail: Second Roll';
    return 'Jail: Last Roll';
  })();

  return (
    <div data-cmp="m/PlayerTurnCards" data-qa="turn-cards" className="rounded-2xl">
      <AnimatePresence mode="wait" initial={false}>
        <motion.div
          key={p.id}
          initial={{ opacity: 0, scale: 0.88, y: 14 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 1.08, y: -10 }}
          transition={{ type: 'spring', stiffness: 420, damping: 24, mass: 0.82 }}
          data-qa="player-turn-card"
          className="rounded-3xl border-2 border-emerald-400 border-3 bg-surface-2"
        >
          <div className="pl-2 py-1 pr-2 gap-2 relative bg-surface-1 flex flex-col rounded-t-3xl">
            {/* location only + cash/liquidation pill (avatar/name intentionally removed) */}
            <div className="flex items-center gap-3 relative">
              <div className="font-semibold flex flex-col text-fg min-w-0">
                <span className="text-sm font-normal text-muted truncate">
                  {locLabel} <span className="text-subtle">{p.positionIndex}</span>
                </span>
              </div>
              <div className="ml-auto inline-flex items-center gap-2 text-sm font-bold text-fg bg-surface-0 border border-surface-strong rounded-full px-3 py-2">
                <span className="inline-flex items-center gap-1">
                  <BsCashStack className="h-4 w-4 text-emerald-600" aria-hidden />
                  <AnimatedNumber value={p.money} prefix="$" />
                </span>
                {liquidationPotential !== 0 && (
                  <span className="inline-flex items-center gap-1">
                    <TbBuildings className="h-4 w-4 text-sky-600" aria-hidden />
                    <AnimatedNumber value={liquidationPotential} prefix="$" />
                  </span>
                )}
              </div>
            </div>
            {/* inventory HUD: jail / passes left; bus + properties + railroads + utilities wrap */}
            <div className="flex items-center gap-3 px-1 pb-1 text-sm text-muted">
              <div className="flex shrink-0 items-center gap-3">
                {(Number(p.gojfChance ?? 0) + Number(p.gojfCommunity ?? 0) > 0) && (<HudBadge title="Get Out of Jail Free" icon={<span>⛓️‍💥</span>} count={Number(p.gojfChance ?? 0) + Number(p.gojfCommunity ?? 0)} />)}
                {(() => {
                  const badges = tradePassBadgesForPlayer(p.id);
                  if (badges.length <= 0) return null;
                  return badges.map((badge) => (
                    <Tooltip key={badge.key} content={badge.tooltip}>
                      <HudBadge title="Trade passes" icon={<span>🎟️</span>} count={badge.count} variant="pill" borderClassName={badge.borderClassName} />
                    </Tooltip>
                  ));
                })()}
              </div>
              <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
                {(Number(p.busTickets ?? 0) > 0) && (
                  <HudBadge
                    title="Bus tickets"
                    icon={<FaBusAlt className="h-3.5 w-3.5 text-game-bus" aria-hidden />}
                    count={Number(p.busTickets ?? 0)}
                  />
                )}
                {(['brown', 'lightBlue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkBlue'] as ColorGroup[]).map((g) => {
                  const ownedIds = BOARD_TILES.filter((t) => t.type === 'property' && t.group === g && (propsByTileId[t.id]?.ownerId === p.id));
                  if (ownedIds.length === 0) return null;
                  const tip = groupTooltipForPlayer(p.id, g);
                  return (
                    <Tooltip key={g} content={tip || `${g} x${ownedIds.length}`}>
                      <HudBadge icon={<span>🏠</span>} count={ownedIds.length} variant="pill" borderClassName={getGroupBorderClass(g)} />
                    </Tooltip>
                  );
                })}
                {(() => {
                  const rrCount = BOARD_TILES.filter((t) => t.type === 'railroad' && (propsByTileId[t.id]?.ownerId === p.id)).length;
                  if (rrCount <= 0) return null;
                  const tip = railroadTooltipForPlayer(p.id);
                  return (
                    <Tooltip content={tip || `Railroads x${rrCount}`}>
                      <HudBadge title="Railroads owned" icon={<span>🚂</span>} count={rrCount} variant="pill" borderClassName="border-white" />
                    </Tooltip>
                  );
                })()}
                {(() => {
                  const utilCount = BOARD_TILES.filter((t) => t.type === 'utility' && (propsByTileId[t.id]?.ownerId === p.id)).length;
                  if (utilCount <= 0) return null;
                  const tip = utilitiesTooltipForPlayer(p.id);
                  return (
                    <Tooltip content={tip || `Utilities x${utilCount}`}>
                      <HudBadge title="Utilities owned" icon={<span>🛠️</span>} count={utilCount} variant="pill" borderClassName="border-white" />
                    </Tooltip>
                  );
                })()}
              </div>
            </div>
          </div>
          {renderActivePanel ? (
            <div>
              {renderActivePanel(p, activePlayerIndex)}
            </div>
          ) : null}
        </motion.div>
      </AnimatePresence>
    </div>
  );
}

