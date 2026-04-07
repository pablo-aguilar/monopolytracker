import React, { useRef } from 'react';
import BoardRimTokens, { type BoardRimPlayer } from '@/components/organisms/BoardRimTokens';
import {
  BOARD_FRAME_BOTTOM_MIDDLE_INDICES,
  BOARD_FRAME_LEFT_INDICES,
  BOARD_FRAME_RIGHT_INDICES,
  BOARD_FRAME_TOP_MIDDLE_INDICES,
  BOARD_TILES,
  FREE_PARKING_INDEX,
  GO_INDEX,
  GO_TO_JAIL_INDEX,
  JAIL_INDEX,
  getBoardTileStripeStyle,
  getTileHeaderBgClass,
  type BoardTileData,
} from '@/data/board';

export type BoardFrameSize = 'sm' | 'md';

export interface BoardFrameProps {
  children: React.ReactNode;
  size?: BoardFrameSize;
  className?: string;
  /** Rim pawn dots; positions follow `data-board-index` cells. */
  rimPlayers?: BoardRimPlayer[];
  /** Called when a perimeter tile is clicked. */
  onTileClick?: (tileIndex: number) => void;
  /** Map of tile id -> owner color for owned perimeter tiles. */
  ownerColorByTileId?: Record<string, string | null | undefined>;
  /** Property tiles: Monopoly improvements (0..4 houses, 5 hotel, 6 skyscraper). */
  improvementsByTileId?: Record<string, number | undefined>;
}

/** Outer rim strip 16px; 4px color bar (`h-1` / `w-1`); 12px inward `surface-1` only (`pb/pt/pr/pl-3`). */
const SIZE_CLASSES: Record<
  BoardFrameSize,
  { wrapRow: string; wrapCol: string; barRow: string; barCol: string }
> = {
  sm: { wrapRow: 'h-5', wrapCol: 'w-5', barRow: 'h-1', barCol: 'w-1' },
  md: { wrapRow: 'h-5', wrapCol: 'w-5', barRow: 'h-1', barCol: 'w-1' },
};

const TILE_GAP = 'gap-0.5'; // 2px between tiles

/** Fixed corner half width on horizontal rims (all four corners). */
const CORNER_HALF_FIXED_W = 'w-[34px] sm:w-[58px]';
/** Fixed corner half height on vertical rims (all four corners). */
const CORNER_HALF_FIXED_H = 'h-[14px] sm:h-[38px]';

/** Fills inner-L gap: remainder below top bar (12px) + inward padding on next strip (12px). */
const CORNER_BRIDGE_LEN_H = 'h-[24px]';
const CORNER_BRIDGE_LEN_V = 'h-[19px] sm:h-[27px]';

export type BoardFrameRim = 'top' | 'bottom' | 'left' | 'right';

/** Which physical corner this half-tile belongs to (for L-bridge toward the adjacent rim). */
export type BoardFrameCorner = 'tl' | 'tr' | 'bl' | 'br';

function cornerBridgeClass(corner: BoardFrameCorner, edge: 'horizontal' | 'vertical'): string {
  const thick = 'w-1';
  const tOff = 'top-1';
  const bOff = 'bottom-1';
  const h = edge === 'horizontal';
  const bridgeLen = h ? CORNER_BRIDGE_LEN_H : CORNER_BRIDGE_LEN_V;
  if (corner === 'tl') {
    if (h) return `left-0 ${tOff} ${thick} ${bridgeLen}`;
    return `left-0 bottom-full ${thick} ${bridgeLen}`;
  }
  if (corner === 'tr') {
    if (h) return `right-0 ${tOff} ${thick} ${bridgeLen}`;
    return `right-0 bottom-full ${thick} ${bridgeLen}`;
  }
  if (corner === 'bl') {
    if (h) return `left-0 ${bOff} ${thick} ${bridgeLen}`;
    return `left-0 top-full ${thick} ${bridgeLen}`;
  }
  /* br */
  if (h) return `right-0 ${bOff} ${thick} ${bridgeLen}`;
  return `right-0 top-full ${thick} ${bridgeLen}`;
}

/** Small rim glyphs: houses (green squares), hotel (red rectangle), skyscraper (circle). Sizes use clamp so they scale on narrow tiles. */
function RimBuildings({
  improvements,
  rim,
  edge,
}: {
  improvements: number;
  rim: BoardFrameRim;
  edge: 'horizontal' | 'vertical';
}): JSX.Element | null {
  if (improvements < 1) return null;

  const isHorizEdge = edge === 'horizontal';
  /** Nudged toward the color bar so the board-inner edge stays open for rim tokens. */
  const pos =
    rim === 'top'
      ? 'bottom-2 left-0.5 right-0.5'
      : rim === 'bottom'
        ? 'top-2 left-0.5 right-0.5'
        : rim === 'left'
          ? 'right-2 top-1/2 -translate-y-1/2'
          : 'left-2 top-1/2 -translate-y-1/2';
  const useHouseGrid = !isHorizEdge && improvements === 4;
  const clusterClass = useHouseGrid
    ? 'grid grid-cols-2 place-items-center gap-0.5'
    : isHorizEdge
      ? 'flex flex-row flex-wrap items-center justify-center gap-0.5 max-w-full'
      : 'flex flex-col items-center justify-center gap-0.5';

  const houseClass =
    'shrink-0 rounded-none border border-emerald-950/35 bg-emerald-600 dark:bg-emerald-500 min-h-[3px] min-w-[3px] h-[clamp(3px,1vmin,5px)] w-[clamp(3px,1vmin,5px)]';
  const hotelClass =
    'shrink-0 rounded-none bg-red-600 dark:bg-red-500 border border-red-900/40 min-h-[5px] min-w-[10px] h-[clamp(5px,1.8vmin,8px)] w-[clamp(12px,5vmin,22px)]';
  const skyClass =
    'shrink-0 rounded-full bg-amber-400 dark:bg-amber-300 border border-amber-700/45 min-h-[6px] min-w-[6px] h-[clamp(6px,2vmin,10px)] w-[clamp(6px,2vmin,10px)]';

  let inner: React.ReactNode;
  if (improvements >= 6) {
    inner = <span aria-hidden className={skyClass} title="Skyscraper" />;
  } else if (improvements === 5) {
    inner = <span aria-hidden className={hotelClass} title="Hotel" />;
  } else {
    inner = Array.from({ length: improvements }, (_, i) => (
      <span key={i} aria-hidden className={houseClass} title={`House ${i + 1}`} />
    ));
  }

  return (
    <div className={`pointer-events-none absolute z-[2] ${clusterClass} ${pos}`} aria-hidden>
      {inner}
    </div>
  );
}

function BoardFrameTile({
  tile,
  edge,
  rim,
  size,
  onTileClick,
  ownerColorByTileId,
  improvementsByTileId,
  qaSuffix = '',
  cornerHalf = false,
  corner,
}: {
  tile: BoardTileData;
  edge: 'horizontal' | 'vertical';
  rim: BoardFrameRim;
  size: BoardFrameSize;
  onTileClick?: (tileIndex: number) => void;
  ownerColorByTileId?: Record<string, string | null | undefined>;
  improvementsByTileId?: Record<string, number | undefined>;
  qaSuffix?: string;
  cornerHalf?: boolean;
  /** Required when `cornerHalf` — bridge spans the inner L toward the perpendicular rim. */
  corner?: BoardFrameCorner;
}): JSX.Element {
  const boardIndex = tile.index;
  const { wrapRow, wrapCol, barRow, barCol } = SIZE_CLASSES[size];
  const stripe = getBoardTileStripeStyle(tile, edge);
  const bg = getTileHeaderBgClass(tile);
  const isHoriz = edge === 'horizontal';
  const ownerColor = ownerColorByTileId?.[tile.id] ?? null;
  const cornerCapCls = cornerHalf ? (isHoriz ? CORNER_HALF_FIXED_W : CORNER_HALF_FIXED_H) : '';
  const bridgeCls =
    cornerHalf && corner ? `pointer-events-none absolute z-[1] ${cornerBridgeClass(corner, edge)}` : '';
  const ownerStripeCls =
    rim === 'top'
      ? 'absolute left-0 right-0 top-[5px] h-[2px]'
      : rim === 'bottom'
        ? 'absolute left-0 right-0 bottom-[5px] h-[2px]'
        : rim === 'left'
          ? 'absolute top-0 bottom-0 left-[5px] w-[2px]'
          : 'absolute top-0 bottom-0 right-[5px] w-[2px]';

  const wrapLayout =
    rim === 'top'
      ? `${wrapRow} flex ${cornerHalf ? '' : 'flex-1'} flex-col pb-3`
      : rim === 'bottom'
        ? `${wrapRow} flex ${cornerHalf ? '' : 'flex-1'} flex-col justify-end pt-3`
        : rim === 'left'
          ? `${wrapCol} flex ${cornerHalf ? '' : 'flex-1'} flex-row pr-3`
          : `${wrapCol} flex ${cornerHalf ? '' : 'flex-1'} flex-row justify-end pl-3`;
  const isInteractive = typeof onTileClick === 'function';
  const improvements = tile.type === 'property' ? improvementsByTileId?.[tile.id] ?? 0 : 0;

  return (
    <button
      type="button"
      data-qa={`board-frame-tile-${tile.id}${qaSuffix}`}
      data-board-index={boardIndex}
      data-board-rim={rim}
      title={tile.name}
      onClick={isInteractive ? () => onTileClick(boardIndex) : undefined}
      className={`relative min-h-0 min-w-0 shrink-0 bg-surface-1 text-left ${cornerHalf ? 'overflow-visible' : ''} ${wrapLayout} ${cornerCapCls} ${isInteractive ? 'cursor-pointer hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-emerald-500/70' : 'cursor-default'}`}
      aria-label={isInteractive ? `Show details for ${tile.name}` : undefined}
      disabled={!isInteractive}
    >
      <div className={`shrink-0 ${isHoriz ? `${barRow} w-full` : `${barCol} h-full`} ${bg}`} style={stripe} />
      {ownerColor ? (
        <span aria-hidden className={ownerStripeCls} style={{ backgroundColor: ownerColor }} />
      ) : null}
      {cornerHalf && corner ? (
        <span
          aria-hidden
          className={`${bg} ${bridgeCls}`}
          style={stripe}
        />
      ) : null}
      {improvements > 0 ? <RimBuildings improvements={improvements} rim={rim} edge={isHoriz ? 'horizontal' : 'vertical'} /> : null}
    </button>
  );
}

function tilesFromIndices(indices: readonly number[]): BoardTileData[] {
  return indices.map((i) => BOARD_TILES[i]);
}

export default function BoardFrame({
  children,
  size = 'sm',
  className = '',
  rimPlayers,
  onTileClick,
  ownerColorByTileId,
  improvementsByTileId,
}: BoardFrameProps): JSX.Element {
  const frameRef = useRef<HTMLDivElement>(null);
  const { wrapRow, wrapCol } = SIZE_CLASSES[size];
  const go = BOARD_TILES[GO_INDEX];
  const jail = BOARD_TILES[JAIL_INDEX];
  const freeParking = BOARD_TILES[FREE_PARKING_INDEX];
  const goToJail = BOARD_TILES[GO_TO_JAIL_INDEX];
  const topMiddle = tilesFromIndices(BOARD_FRAME_TOP_MIDDLE_INDICES);
  const bottomMiddle = tilesFromIndices(BOARD_FRAME_BOTTOM_MIDDLE_INDICES);
  const leftMiddle = tilesFromIndices(BOARD_FRAME_LEFT_INDICES);
  const rightMiddle = tilesFromIndices(BOARD_FRAME_RIGHT_INDICES);

  return (
    <div
      ref={frameRef}
      data-cmp="o/BoardFrame"
      className={`relative flex h-dvh min-h-0 w-full min-w-0 flex-col overflow-hidden ${className}`}
    >
      <div className={`flex w-full shrink-0 flex-row ${TILE_GAP} ${wrapRow}`}>
        <BoardFrameTile key="go-h" tile={go} edge="horizontal" rim="top" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-h" cornerHalf corner="tl" />
        {topMiddle.map((t) => (
          <BoardFrameTile key={t.id} tile={t} edge="horizontal" rim="top" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} />
        ))}
        <BoardFrameTile key="jail-h" tile={jail} edge="horizontal" rim="top" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-h" cornerHalf corner="tr" />
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-row items-stretch">
        <div className={`flex min-h-0 shrink-0 flex-col self-stretch ${TILE_GAP} ${wrapCol}`}>
          <BoardFrameTile key="go-v" tile={go} edge="vertical" rim="left" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-v" cornerHalf corner="tl" />
          {leftMiddle.map((t) => (
            <BoardFrameTile key={t.id} tile={t} edge="vertical" rim="left" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} />
          ))}
          {/* Bottom-left corner: Go To Jail (matches bottom row left = GTJ) */}
          <BoardFrameTile key="gtj-v" tile={goToJail} edge="vertical" rim="left" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-v" cornerHalf corner="bl" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-start overflow-auto p-2.5 sm:p-6">{children}</div>
        <div className={`flex min-h-0 shrink-0 flex-col self-stretch ${TILE_GAP} ${wrapCol}`}>
          <BoardFrameTile key="jail-v" tile={jail} edge="vertical" rim="right" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-v" cornerHalf corner="tr" />
          {rightMiddle.map((t) => (
            <BoardFrameTile key={t.id} tile={t} edge="vertical" rim="right" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} />
          ))}
          {/* Bottom-right corner: Free Parking (matches bottom row right = FP) */}
          <BoardFrameTile key="fp-v" tile={freeParking} edge="vertical" rim="right" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-v" cornerHalf corner="br" />
        </div>
      </div>
      {/* Bottom edge LTR: Go To Jail → … → Free Parking (visual matches physical board) */}
      <div className={`flex w-full shrink-0 flex-row ${TILE_GAP} ${wrapRow}`}>
        <BoardFrameTile key="gtj-h" tile={goToJail} edge="horizontal" rim="bottom" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-h" cornerHalf corner="bl" />
        {bottomMiddle.map((t) => (
          <BoardFrameTile key={t.id} tile={t} edge="horizontal" rim="bottom" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} />
        ))}
        <BoardFrameTile key="fp-h" tile={freeParking} edge="horizontal" rim="bottom" size={size} onTileClick={onTileClick} ownerColorByTileId={ownerColorByTileId} improvementsByTileId={improvementsByTileId} qaSuffix="-h" cornerHalf corner="br" />
      </div>
      {rimPlayers && rimPlayers.length > 0 ? (
        <BoardRimTokens containerRef={frameRef} players={rimPlayers} />
      ) : null}
    </div>
  );
}
