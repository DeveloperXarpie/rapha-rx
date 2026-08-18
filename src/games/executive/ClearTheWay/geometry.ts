/**
 * Pixel layout for the board. Pure arithmetic: the view asks how big a cell may be for
 * the space it has, and where each cell sits.
 */

import type { Board, Exit, Piece } from './model';

/**
 * A 1x1 block at the smallest cell is 56px, under the app's 80px touch-target minimum.
 * That floor is unavoidable on a 7x7 grid on a narrow tablet; the mitigation is to keep
 * 1x1 pieces out of the large boards rather than to shrink the target.
 */
export const MIN_CELL = 56;
export const MAX_CELL = 96;

/** Wall thickness as a fraction of one cell, so the frame scales with the board. */
const WALL_RATIO = 0.22;

export interface BoardMetrics {
  cell: number;
  wall: number;
  /** Outer size, walls included. */
  boardW: number;
  boardH: number;
}

export function boardMetrics(board: Board, availW: number, availH: number): BoardMetrics {
  // avail = n * cell + 2 * WALL_RATIO * cell, solved for cell.
  const byWidth = availW / (board.cols + WALL_RATIO * 2);
  const byHeight = availH / (board.rows + WALL_RATIO * 2);
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byWidth, byHeight))));
  const wall = Math.round(cell * WALL_RATIO);

  return {
    cell,
    wall,
    boardW: board.cols * cell + wall * 2,
    boardH: board.rows * cell + wall * 2,
  };
}

/** Top-left pixel of a piece within the board's outer box. */
export function pieceOrigin(piece: Piece, m: BoardMetrics): { x: number; y: number } {
  return { x: m.wall + piece.col * m.cell, y: m.wall + piece.row * m.cell };
}

export function pieceSize(piece: Piece, m: BoardMetrics): { w: number; h: number } {
  return { w: piece.w * m.cell, h: piece.h * m.cell };
}

/** The gap in the wall, in board-box coordinates. */
export function exitRect(exit: Exit, board: Board, m: BoardMetrics): { x: number; y: number; w: number; h: number } {
  const lane = m.wall + exit.index * m.cell;
  switch (exit.side) {
    case 'right':  return { x: m.boardW - m.wall, y: lane, w: m.wall, h: m.cell };
    case 'left':   return { x: 0, y: lane, w: m.wall, h: m.cell };
    case 'bottom': return { x: lane, y: m.boardH - m.wall, w: m.cell, h: m.wall };
    case 'top':    return { x: lane, y: 0, w: m.cell, h: m.wall };
  }
}

/**
 * Where the key travels to when it escapes: straight out through the gap and clear of
 * the frame. Purely decorative, so it is measured in cells beyond the wall.
 */
export function escapeOffset(exit: Exit, m: BoardMetrics): { x: number; y: number } {
  // Far enough to read as "gone", short enough to stay inside the framing panel while
  // it fades: the key is not clipped, so a long throw would cross the HUD.
  const distance = m.cell * 1.4;
  switch (exit.side) {
    case 'right':  return { x: distance, y: 0 };
    case 'left':   return { x: -distance, y: 0 };
    case 'bottom': return { x: 0, y: distance };
    case 'top':    return { x: 0, y: -distance };
  }
}
