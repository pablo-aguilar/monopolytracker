import React from 'react';
import { BOARD_TILES, JAIL_INDEX, type ColorGroup } from '@/data/board';
import { AVATARS } from '@/data/avatars';
import AvatarToken from '@/components/atoms/AvatarToken';
import AnimatedNumber from '@/components/atoms/AnimatedNumber';
import HudBadge from '@/components/atoms/HudBadge';
import Tooltip from '@/components/atoms/Tooltip';

export type PlayerTurnCardsPlayer = {
  id: string;
  nickname: string;
  avatarKey: string;
  color: string;
  positionIndex: number;
  money: number;
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
  tradePassCountForPlayer: (playerId: string) => number;
  tradePassTooltipForPlayer: (playerId: string) => React.ReactNode;
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
  tradePassCountForPlayer,
  tradePassTooltipForPlayer,
  renderActivePanel,
}: PlayerTurnCardsProps): JSX.Element {
  return (
    <div data-cmp="m/PlayerTurnCards" data-qa="turn-cards" className="grid grid-cols-1 md:grid-cols-2 gap-4 rounded-2xl ">
      {players.map((p, idx) => {
        const isActive = idx === activePlayerIndex;
        const emoji = AVATARS.find((a) => a.key === p.avatarKey)?.emoji ?? '🙂';
        const loc = getTileByIndex(p.positionIndex);
        const locLabel = (() => {
          if (p.positionIndex !== JAIL_INDEX) return loc.name;
          const inJail = Boolean((p as any).inJail);
          if (!inJail) return 'Jail: Just Visiting';
          const attempts = Number((p as any).jailAttempts ?? 0);
          if (attempts <= 0) return 'Jail: First Roll';
          if (attempts === 1) return 'Jail: Second Roll';
          return 'Jail: Last Roll';
        })();
        return (
          <div data-qa="player-turn-card" key={p.id} className={`rounded-3xl overflow-hidden border-2 ${isActive ? 'border-emerald-400 border-3' : 'border-neutral-200 dark:border-neutral-700'} bg-surface-2`}>
            <div className=" pl-2 py-1 pr-2 gap-2 relative bg-surface-1  flex flex-col">
              {/* player avatar & name */}
              <div className="flex items-center gap-3 relative">
                <div style={{ ['--player-color' as any]: p.color } as React.CSSProperties}>
                  <AvatarToken emoji={emoji} borderColorClass="border-[color:var(--player-color)]" ring ringColorClass="ring-[color:var(--player-color)]" size={36} />
                </div>
                <div className="font-semibold flex flex-col text-fg">
                  <span>{p.nickname}</span>
                  <span className="text-sm font-normal text-muted">
                    {locLabel} <span className=" text-subtle">{p.positionIndex}</span>
                  </span>
                </div>
                <div className="ml-auto text-lg font-bold text-fg bg-surface-0 border border-surface-strong rounded-full px-3 py-1">
                  <AnimatedNumber value={p.money} prefix="$" />
                </div>
              </div>
              {/* inventory HUD */}
              <div className="flex items-center gap-3 px-1 pb-1 text-sm text-muted">
                {(Number(p.busTickets ?? 0) > 0) && (<HudBadge title="Bus tickets" icon={<span>🚌</span>} count={Number(p.busTickets ?? 0)} />)}
                {(Number(p.gojfChance ?? 0) + Number(p.gojfCommunity ?? 0) > 0) && (<HudBadge title="Get Out of Jail Free" icon={<span>⛓️‍💥</span>} count={Number(p.gojfChance ?? 0) + Number(p.gojfCommunity ?? 0)} />)}
                {(() => {
                  const passCount = tradePassCountForPlayer(p.id);
                  if (passCount <= 0) return null;
                  const tip = tradePassTooltipForPlayer(p.id);
                  return (
                    <Tooltip content={tip || `Passes x${passCount}`}>
                      <HudBadge title="Trade passes" icon={<span>🎫</span>} count={passCount} variant="pill" borderClassName="border-violet-400" />
                    </Tooltip>
                  );
                })()}
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
                {/* per-group property indicators */}
                <div className="inline-flex items-center gap-1 flex-wrap">
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
                </div>
              </div>
            </div>
            {isActive && renderActivePanel && (
              <div className="">
                {renderActivePanel(p, idx)}
              </div>
            )}
          </div>
        );
      })}
    </div>
  );
}

