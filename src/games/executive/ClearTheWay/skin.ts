/**
 * The theme layer, and the only file that knows this board is underwater.
 *
 * Everything here is named for its role on the board, not for what it depicts, so a
 * re-skin to a market alley or a rickshaw lane is a change to this file, its half of
 * `sprites.ts` and nothing else. `model.ts` and `solver.ts` have no idea a fish is
 * involved.
 */

import type { CSSProperties } from 'react';
import type { Corner } from './geometry';
import type { ExitSide, Piece } from './model';
import {
  BACKDROP, CORNER, EXIT_ARROW, FISH, FLOOR_CELL, RAIL_H, RAIL_RATIO, RAIL_V,
  SLABS, slabPath, type SlabShape,
} from './sprites';

export const SKIN = {
  id: 'reef',

  /** Behind the frame. The painted reef, with its own board taken out of it. */
  backdrop: BACKDROP,

  /** The wall the board is cut into: one rail tile per axis, mirrored into four sides. */
  railH: RAIL_H,
  railV: RAIL_V,
  corner: CORNER,

  /** The floor the blocks slide across, one cell of it. */
  floorCell: FLOOR_CELL,
  /** Under the floor tile, so a fractional last row is water rather than nothing. */
  floorFill: '#0d3c4c',

  /** The gap, and the beacon that advertises it. */
  exitGlow: '#6ee7ff',
  exitArrow: EXIT_ARROW,

  /** The wake the key leaves behind on its auto-swim out. */
  bubbleFill: 'rgba(206,244,255,0.55)',
  bubbleEdge: 'rgba(255,255,255,0.75)',

  /**
   * The key piece: the thing being freed. It wears no slab - the fish swims in its cells
   * rather than being carried by a block - so the piece box is transparent and only the
   * fish is drawn.
   */
  key: FISH,
} as const;

/**
 * The board floor, tiled one cell at a time so the stonework's joints land on the grid
 * lines at every board size. `floorFill` shows through wherever the tile does not reach.
 */
export function floorPaint(cell: number): CSSProperties {
  return {
    backgroundColor: SKIN.floorFill,
    backgroundImage: `url(${SKIN.floorCell})`,
    backgroundSize: `${cell}px ${cell}px`,
  };
}

/**
 * One rail of the frame.
 *
 * Two tiles serve four sides. The top rail is the bottom one turned over and the left is
 * the right one turned over, which is both half the artwork and a guarantee the moss
 * lands on the inner edge all the way round.
 *
 * The tile repeats at its painted proportions rather than being stretched to the rail's
 * length, so a 4x4 board and a 6x6 one are built of the same size stones.
 */
export function railPaint(side: ExitSide, wall: number): CSSProperties {
  const horizontal = side === 'top' || side === 'bottom';
  return {
    backgroundImage: `url(${horizontal ? SKIN.railH : SKIN.railV})`,
    backgroundRepeat: horizontal ? 'repeat-x' : 'repeat-y',
    backgroundSize: horizontal
      ? `${Math.round(wall * RAIL_RATIO.h)}px 100%`
      : `100% ${Math.round(wall * RAIL_RATIO.v)}px`,
    transform: side === 'top' ? 'scaleY(-1)' : side === 'left' ? 'scaleX(-1)' : undefined,
  };
}

/** Which way to turn the one painted spiral so it curls into each of the four corners. */
export function cornerFlip(corner: Corner): string | undefined {
  switch (corner) {
    case 'tl': return undefined;
    case 'tr': return 'scaleX(-1)';
    case 'bl': return 'scaleY(-1)';
    case 'br': return 'scale(-1, -1)';
  }
}

/**
 * Which way the fish faces. It is painted swimming to the right, which is the way out of
 * every shipped level; the model allows the other three sides, so they are turned here
 * rather than left facing into the wall.
 */
export function keyFacing(exit: ExitSide): string {
  switch (exit) {
    case 'right':  return 'none';
    case 'left':   return 'scaleX(-1)';
    case 'top':    return 'rotate(-90deg)';
    case 'bottom': return 'rotate(90deg)';
  }
}

/**
 * The slab an obstacle wears.
 *
 * Picked from the piece letter, so a block keeps its look for the life of the puzzle -
 * including across a reset - and two blocks that happen to sit flush read as two objects
 * rather than one long one.
 */
export function blockSlab(piece: Piece): string {
  const length = Math.max(piece.w, piece.h);
  const shape: SlabShape =
    length === 1 ? 's1' : ((piece.w > piece.h ? 'h' : 'v') + length) as SlabShape;
  const variants = SLABS[shape];
  return slabPath(variants[piece.letter.charCodeAt(0) % variants.length]);
}
