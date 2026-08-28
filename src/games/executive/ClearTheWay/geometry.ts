/**
 * Pixel layout for the board. Pure arithmetic: the view asks how big a cell may be for
 * the space it has, and where each cell sits.
 */

import type { Board, Exit, ExitSide, Piece } from './model';

/**
 * The floor on a cell, set by the widest board on the narrowest supported phone.
 *
 * It was 56, which put the widest board (6 columns) at a 444px panel against the 328px a
 * 360px phone actually gives us. This is a hard floor rather than a preference, so the
 * board could not shrink its own way out: it simply overhung the screen. 41 is the
 * largest cell at which a 6x6 panel fits 328px.
 *
 * A 1x1 block at 41px is half the app's 80px touch-target minimum, which sounds worse
 * than it is: the target is the piece, not the cell. Across the six 6-column levels there
 * are 64 pieces and only three of them are a single cell; every other piece spans 2 or 3,
 * so its long axis is 82px or 123px, both clear of the minimum. The mitigation is
 * therefore the same as it has always been - keep 1x1 pieces out of the large boards -
 * and it now applies to exactly three pieces, in reef-05, reef-07 and reef-08.
 *
 * The alternative was capping the grid at 5 columns on narrow screens. 6x6 starts at
 * tier 3, so that would have taken six of the ten levels off phones entirely.
 */
export const MIN_CELL = 41;
export const MAX_CELL = 96;

/**
 * Wall thickness as a fraction of one cell, so the frame scales with the board. Set from
 * the art: the mock draws its rails at 47px against a 135px cell.
 */
export const WALL_RATIO = 0.35;

/**
 * The panel's padding around the board, as a fraction of one cell. The exit beacon is
 * drawn outside the wall, so the panel is wider than the board it contains.
 *
 * This is the panel's own `padding` in the view, and it must be part of the fit: the
 * panel is what has to fit the play box, not the board. Leaving it out was worth about
 * 1.2 cells of width, which is what made the widest board overhang a 360px phone even
 * after the cell floor came down.
 */
export const PANEL_PAD_RATIO = 0.6;

export interface BoardMetrics {
  cell: number;
  wall: number;
  /** Outer size, walls included. */
  boardW: number;
  boardH: number;
  /** The panel's padding around the board, in px. */
  pad: number;
  /** The panel's outer size: what actually has to fit the space available. */
  panelW: number;
  panelH: number;
}

export function boardMetrics(board: Board, availW: number, availH: number): BoardMetrics {
  // The panel is what has to fit, not the board: it adds PANEL_PAD_RATIO of a cell on
  // every side for the exit beacon. So
  //   avail = n * cell + 2 * WALL_RATIO * cell + 2 * PANEL_PAD_RATIO * cell
  // solved for cell.
  const perCell = WALL_RATIO * 2 + PANEL_PAD_RATIO * 2;
  const byWidth = availW / (board.cols + perCell);
  const byHeight = availH / (board.rows + perCell);
  const cell = Math.max(MIN_CELL, Math.min(MAX_CELL, Math.floor(Math.min(byWidth, byHeight))));
  const wall = Math.round(cell * WALL_RATIO);
  const pad = Math.round(cell * PANEL_PAD_RATIO);
  const boardW = board.cols * cell + wall * 2;
  const boardH = board.rows * cell + wall * 2;

  return {
    cell,
    wall,
    pad,
    boardW,
    boardH,
    panelW: boardW + pad * 2,
    panelH: boardH + pad * 2,
  };
}

/** Top-left pixel of a piece within the board's outer box. */
export function pieceOrigin(piece: Piece, m: BoardMetrics): { x: number; y: number } {
  return { x: m.wall + piece.col * m.cell, y: m.wall + piece.row * m.cell };
}

export function pieceSize(piece: Piece, m: BoardMetrics): { w: number; h: number } {
  return { w: piece.w * m.cell, h: piece.h * m.cell };
}

/** The four rails and the four corner ornaments, in the order they are drawn. */
export const SIDES: ExitSide[] = ['top', 'right', 'bottom', 'left'];
export const CORNERS = ['tl', 'tr', 'bl', 'br'] as const;
export type Corner = (typeof CORNERS)[number];

/** One rail of the frame, corner to corner. The corner ornaments cover the overlaps. */
export function railRect(side: ExitSide, m: BoardMetrics): { left: number; top: number; width: number; height: number } {
  switch (side) {
    case 'top':    return { left: 0, top: 0, width: m.boardW, height: m.wall };
    case 'bottom': return { left: 0, top: m.boardH - m.wall, width: m.boardW, height: m.wall };
    case 'left':   return { left: 0, top: 0, width: m.wall, height: m.boardH };
    case 'right':  return { left: m.boardW - m.wall, top: 0, width: m.wall, height: m.boardH };
  }
}

/**
 * One corner ornament, centred on where the two rails' mid-lines cross rather than on
 * the box corner. That is where the mock sits its spiral: overhanging the frame a little
 * on both axes and lapping a little way into the board, which is what makes it read as
 * capping the join rather than as a fifth piece of stone.
 */
export function cornerRect(corner: Corner, m: BoardMetrics, size: number): { left: number; top: number } {
  const near = m.wall / 2 - size / 2;
  return {
    left: corner === 'tl' || corner === 'bl' ? near : m.boardW - m.wall / 2 - size / 2,
    top: corner === 'tl' || corner === 'tr' ? near : m.boardH - m.wall / 2 - size / 2,
  };
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
