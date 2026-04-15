import React from 'react';
import type { PlayerLite } from '@/features/players/playersSlice';
import type { PropertiesState } from '@/features/properties/propertiesSlice';
import { BOARD_TILES } from '@/data/board';
import { AVATARS } from '@/data/avatars';
import AvatarToken from '@/components/atoms/AvatarToken';
import AnimatedNumber from '@/components/atoms/AnimatedNumber';
import HudBadge from '@/components/atoms/HudBadge';
import { BsCashStack } from 'react-icons/bs';
import { TbBuildings } from 'react-icons/tb';
import { FaBusAlt } from 'react-icons/fa';
import CloseIconButton from '@/components/atoms/CloseIconButton';

function abbreviateTileNameForHud(name: string): string {
  return name.replace(/\bAvenue\b/g, 'Ave');
}

export interface PlayerSnapshotCardProps {
  player: PlayerLite;
  properties: PropertiesState;
  liquidationPotential: number;
  /** When false, no close control (e.g. parent provides a single modal close). */
  showClose?: boolean;
  /** Stretch the card vertically to fill the parent (e.g. equal-height headers in a carousel). */
  fillHeight?: boolean;
  className?: string;
  onClose: () => void;
}

export default function PlayerSnapshotCard({
  player,
  properties,
  liquidationPotential,
  showClose = true,
  fillHeight = false,
  className = '',
  onClose,
}: PlayerSnapshotCardProps): JSX.Element {
  return (
    <div
      data-cmp="m/PlayerSnapshotCard"
      className={`rounded-3xl border-2 border-neutral-200 dark:border-neutral-700 bg-surface-2 ${
        fillHeight ? 'flex min-h-0 flex-col' : ''
      } ${className}`.trim()}
    >
      <div
        className={`relative flex min-h-0 flex-col gap-2 rounded-t-3xl rounded-b-3xl bg-surface-1 py-1 pl-2 pr-2 ${
          fillHeight ? 'min-h-0 flex-1 justify-between' : ''
        }`}
      >
        {showClose ? (
          <div className="absolute right-1.5 top-1.5 z-[1]">
            <CloseIconButton onClick={onClose} />
          </div>
        ) : null}
        <div className={`flex w-full items-center gap-3 pl-1.5 ${showClose ? 'pr-8' : 'pr-0'}`}>
          <div style={{ ['--player-color' as string]: player.color } as React.CSSProperties}>
            <AvatarToken
              emoji={AVATARS.find((a) => a.key === player.avatarKey)?.emoji ?? '🙂'}
              borderColorClass="border-[color:var(--player-color)]"
              ring
              ringColorClass="ring-[color:var(--player-color)]"
              size={36}
            />
          </div>
          <div className="flex min-w-0 flex-col font-semibold text-fg">
            <span className="truncate">{player.nickname}</span>
            <span className="text-sm font-normal text-muted">
              {abbreviateTileNameForHud(BOARD_TILES[player.positionIndex]?.name ?? '—')}{' '}
              <span className="text-subtle">{player.positionIndex}</span>
            </span>
          </div>
          <div className="ml-auto inline-flex shrink-0 items-center gap-2 rounded-full border border-surface-strong bg-surface-0 px-3 py-2 text-sm font-bold text-fg">
            <span className="inline-flex items-center gap-1">
              <BsCashStack className="h-4 w-4 text-emerald-600" aria-hidden />
              <AnimatedNumber value={player.money} prefix="$" />
            </span>
            {liquidationPotential > 0 ? (
              <span className="inline-flex items-center gap-1">
                <TbBuildings className="h-4 w-4 text-sky-600" aria-hidden />
                <AnimatedNumber value={liquidationPotential} prefix="$" />
              </span>
            ) : null}
          </div>
        </div>
        <div className="flex items-center gap-3 px-1 pb-1 text-sm text-muted">
          <div className="flex shrink-0 items-center gap-3">
            {(player.gojfChance ?? 0) + (player.gojfCommunity ?? 0) > 0 ? (
              <HudBadge
                title="Get Out of Jail Free"
                icon={<span>⛓️‍💥</span>}
                count={(player.gojfChance ?? 0) + (player.gojfCommunity ?? 0)}
              />
            ) : null}
          </div>
          <div className="flex min-w-0 flex-1 flex-wrap items-center gap-1">
            {(player.busTickets ?? 0) > 0 ? (
              <HudBadge
                title="Bus tickets"
                icon={<FaBusAlt className="h-3.5 w-3.5 text-game-bus" aria-hidden />}
                count={player.busTickets ?? 0}
              />
            ) : null}
            {(['brown', 'lightBlue', 'pink', 'orange', 'red', 'yellow', 'green', 'darkBlue'] as const).map((g) => {
              const owned = BOARD_TILES.filter(
                (t) => t.type === 'property' && t.group === g && properties.byTileId[t.id]?.ownerId === player.id,
              ).length;
              if (owned <= 0) return null;
              return (
                <HudBadge key={g} icon={<span>🏠</span>} count={owned} variant="pill" borderClassName="border-white" />
              );
            })}
            {(() => {
              const rr = BOARD_TILES.filter(
                (t) => t.type === 'railroad' && properties.byTileId[t.id]?.ownerId === player.id,
              ).length;
              return rr > 0 ? (
                <HudBadge title="Railroads owned" icon={<span>🚂</span>} count={rr} variant="pill" borderClassName="border-white" />
              ) : null;
            })()}
            {(() => {
              const util = BOARD_TILES.filter(
                (t) => t.type === 'utility' && properties.byTileId[t.id]?.ownerId === player.id,
              ).length;
              return util > 0 ? (
                <HudBadge title="Utilities owned" icon={<span>🛠️</span>} count={util} variant="pill" borderClassName="border-white" />
              ) : null;
            })()}
          </div>
        </div>
        {fillHeight ? <div className="min-h-0 flex-1" aria-hidden /> : null}
      </div>
    </div>
  );
}
