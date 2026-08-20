/**
 * The theme layer, and the only file that knows this board is underwater.
 *
 * Everything here is named for its role on the board, not for what it depicts, so a
 * re-skin to a market alley or a rickshaw lane is a change to this file and nothing
 * else. `model.ts` and `solver.ts` have no idea a fish is involved.
 */

import type { Piece } from './model';

export const SKIN = {
  id: 'reef',

  /** Behind the frame. */
  backdrop: 'radial-gradient(120% 100% at 50% 0%, #1d7fa3 0%, #0d4d6b 55%, #072f46 100%)',

  /** The wall the board is cut into. */
  wallFill: 'linear-gradient(180deg, #6f9b7a 0%, #4e7860 45%, #3a5c4b 100%)',
  wallEdge: '#2b4739',

  /** The floor the blocks slide across. */
  floorFill: 'linear-gradient(180deg, #0e4a5c 0%, #0a3b4c 100%)',
  floorLine: 'rgba(255,255,255,0.06)',

  /** The gap, and the glow that advertises it. */
  exitGlow: '#6ee7ff',
  exitArrow: '#bff4ff',

  /** The key piece: the thing being freed. */
  keyFill: 'linear-gradient(180deg, #ffb765 0%, #f38f2f 55%, #d9741a 100%)',
  keyEdge: '#a4520c',
  keyBars: 'rgba(228,244,255,0.85)',

  /** The wake the key leaves behind on its auto-swim out. */
  bubbleFill: 'rgba(206,244,255,0.55)',
  bubbleEdge: 'rgba(255,255,255,0.75)',
  keyFace: '🐠',

  /** Copy that is theme-specific rather than mechanical. */
  freedEmoji: '🐠',
} as const;

/**
 * Obstacle faces. Blocks are given one of a few stone/weed treatments, picked from the
 * piece letter so a given block keeps its look for the life of the puzzle and adjacent
 * blocks read as separate objects.
 */
const BLOCK_FACES = [
  { fill: 'linear-gradient(180deg, #9dc95a 0%, #7aa93c 55%, #5d8a2a 100%)', edge: '#41611c', speck: 'rgba(255,255,255,0.28)' },
  { fill: 'linear-gradient(180deg, #7fb8cf 0%, #5793ad 55%, #416f85 100%)', edge: '#2d4f60', speck: 'rgba(255,255,255,0.30)' },
  { fill: 'linear-gradient(180deg, #b7c9c2 0%, #90a7a0 55%, #6d8079 100%)', edge: '#4b5a55', speck: 'rgba(255,255,255,0.32)' },
  { fill: 'linear-gradient(180deg, #86c9a8 0%, #5da684 55%, #447f65 100%)', edge: '#2f5a47', speck: 'rgba(255,255,255,0.26)' },
] as const;

export type BlockFace = (typeof BLOCK_FACES)[number];

export function blockFace(piece: Piece): BlockFace {
  const seed = piece.letter.charCodeAt(0);
  return BLOCK_FACES[seed % BLOCK_FACES.length];
}

/** Small ornaments scattered on the larger blocks, so the board is not flat colour. */
const ORNAMENTS = ['🐚', '⭐', '🪸', '🫧'] as const;

export function blockOrnament(piece: Piece): string | null {
  if (piece.w * piece.h < 2) return null;
  const seed = piece.letter.charCodeAt(0) + piece.w * 7 + piece.h * 13;
  // Roughly half the eligible blocks stay bare, which keeps the ornaments from becoming
  // noise the player has to filter.
  return seed % 2 === 0 ? ORNAMENTS[seed % ORNAMENTS.length] : null;
}
