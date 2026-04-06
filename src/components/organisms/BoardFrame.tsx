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
}

/** Outer rim strip 16px; 4px color bar (`h-1` / `w-1`); 12px inward `surface-1` only (`pb/pt/pr/pl-3`). */
const SIZE_CLASSES: Record<
  BoardFrameSize,
  { wrapRow: string; wrapCol: string; barRow: string; barCol: string }
> = {
  sm: { wrapRow: 'h-4', wrapCol: 'w-4', barRow: 'h-1', barCol: 'w-1' },
  md: { wrapRow: 'h-4', wrapCol: 'w-4', barRow: 'h-1', barCol: 'w-1' },
};

const TILE_GAP = 'gap-0.5'; // 2px between tiles

/** Corner halves cap on both axes (default/mobile 25px, sm+ 50px). */
const CORNER_MAX_DIM = 'max-h-[25px] max-w-[25px] sm:max-h-[50px] sm:max-w-[50px]';

/** Fills inner-L gap: remainder below top bar (12px) + inward padding on next strip (12px). */
const CORNER_BRIDGE_LEN = 'h-[24px]';

export type BoardFrameRim = 'top' | 'bottom' | 'left' | 'right';

/** Which physical corner this half-tile belongs to (for L-bridge toward the adjacent rim). */
export type BoardFrameCorner = 'tl' | 'tr' | 'bl' | 'br';

function cornerBridgeClass(corner: BoardFrameCorner, edge: 'horizontal' | 'vertical'): string {
  const thick = 'w-1';
  const tOff = 'top-1';
  const bOff = 'bottom-1';
  const h = edge === 'horizontal';
  if (corner === 'tl') {
    if (h) return `left-0 ${tOff} ${thick} ${CORNER_BRIDGE_LEN}`;
    return `left-0 bottom-full ${thick} ${CORNER_BRIDGE_LEN}`;
  }
  if (corner === 'tr') {
    if (h) return `right-0 ${tOff} ${thick} ${CORNER_BRIDGE_LEN}`;
    return `right-0 bottom-full ${thick} ${CORNER_BRIDGE_LEN}`;
  }
  if (corner === 'bl') {
    if (h) return `left-0 ${bOff} ${thick} ${CORNER_BRIDGE_LEN}`;
    return `left-0 top-full ${thick} ${CORNER_BRIDGE_LEN}`;
  }
  /* br */
  if (h) return `right-0 ${bOff} ${thick} ${CORNER_BRIDGE_LEN}`;
  return `right-0 top-full ${thick} ${CORNER_BRIDGE_LEN}`;
}

function BoardFrameTile({
  tile,
  edge,
  rim,
  size,
  qaSuffix = '',
  cornerHalf = false,
  corner,
}: {
  tile: BoardTileData;
  edge: 'horizontal' | 'vertical';
  rim: BoardFrameRim;
  size: BoardFrameSize;
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
  const cornerCapCls = cornerHalf ? CORNER_MAX_DIM : '';
  const bridgeCls =
    cornerHalf && corner ? `pointer-events-none absolute z-[1] ${cornerBridgeClass(corner, edge)}` : '';

  const wrapLayout =
    rim === 'top'
      ? `${wrapRow} flex flex-1 flex-col pb-3`
      : rim === 'bottom'
        ? `${wrapRow} flex flex-1 flex-col justify-end pt-3`
        : rim === 'left'
          ? `${wrapCol} flex flex-1 flex-row pr-3`
          : `${wrapCol} flex flex-1 flex-row justify-end pl-3`;

  return (
    <div
      data-qa={`board-frame-tile-${tile.id}${qaSuffix}`}
      data-board-index={boardIndex}
      title={tile.name}
      className={`min-h-0 min-w-0 shrink-0 bg-surface-1 ${cornerHalf ? 'relative overflow-visible' : ''} ${wrapLayout} ${cornerCapCls}`}
    >
      <div className={`shrink-0 ${isHoriz ? `${barRow} w-full` : `${barCol} h-full`} ${bg}`} style={stripe} />
      {cornerHalf && corner ? (
        <span
          aria-hidden
          className={`${bg} ${bridgeCls}`}
          style={stripe}
        />
      ) : null}
    </div>
  );
}

function tilesFromIndices(indices: readonly number[]): BoardTileData[] {
  return indices.map((i) => BOARD_TILES[i]);
}

export default function BoardFrame({ children, size = 'sm', className = '', rimPlayers }: BoardFrameProps): JSX.Element {
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
        <BoardFrameTile key="go-h" tile={go} edge="horizontal" rim="top" size={size} qaSuffix="-h" cornerHalf corner="tl" />
        {topMiddle.map((t) => (
          <BoardFrameTile key={t.id} tile={t} edge="horizontal" rim="top" size={size} />
        ))}
        <BoardFrameTile key="jail-h" tile={jail} edge="horizontal" rim="top" size={size} qaSuffix="-h" cornerHalf corner="tr" />
      </div>
      <div className="flex min-h-0 w-full min-w-0 flex-1 flex-row items-stretch">
        <div className={`flex min-h-0 shrink-0 flex-col self-stretch ${TILE_GAP} ${wrapCol}`}>
          <BoardFrameTile key="go-v" tile={go} edge="vertical" rim="left" size={size} qaSuffix="-v" cornerHalf corner="tl" />
          {leftMiddle.map((t) => (
            <BoardFrameTile key={t.id} tile={t} edge="vertical" rim="left" size={size} />
          ))}
          {/* Bottom-left corner: Go To Jail (matches bottom row left = GTJ) */}
          <BoardFrameTile key="gtj-v" tile={goToJail} edge="vertical" rim="left" size={size} qaSuffix="-v" cornerHalf corner="bl" />
        </div>
        <div className="flex min-h-0 min-w-0 flex-1 flex-col items-center justify-start overflow-auto p-2.5 sm:p-6">{children}</div>
        <div className={`flex min-h-0 shrink-0 flex-col self-stretch ${TILE_GAP} ${wrapCol}`}>
          <BoardFrameTile key="jail-v" tile={jail} edge="vertical" rim="right" size={size} qaSuffix="-v" cornerHalf corner="tr" />
          {rightMiddle.map((t) => (
            <BoardFrameTile key={t.id} tile={t} edge="vertical" rim="right" size={size} />
          ))}
          {/* Bottom-right corner: Free Parking (matches bottom row right = FP) */}
          <BoardFrameTile key="fp-v" tile={freeParking} edge="vertical" rim="right" size={size} qaSuffix="-v" cornerHalf corner="br" />
        </div>
      </div>
      {/* Bottom edge LTR: Go To Jail → … → Free Parking (visual matches physical board) */}
      <div className={`flex w-full shrink-0 flex-row ${TILE_GAP} ${wrapRow}`}>
        <BoardFrameTile key="gtj-h" tile={goToJail} edge="horizontal" rim="bottom" size={size} qaSuffix="-h" cornerHalf corner="bl" />
        {bottomMiddle.map((t) => (
          <BoardFrameTile key={t.id} tile={t} edge="horizontal" rim="bottom" size={size} />
        ))}
        <BoardFrameTile key="fp-h" tile={freeParking} edge="horizontal" rim="bottom" size={size} qaSuffix="-h" cornerHalf corner="br" />
      </div>
      {rimPlayers && rimPlayers.length > 0 ? (
        <BoardRimTokens containerRef={frameRef} players={rimPlayers} />
      ) : null}
    </div>
  );
}
