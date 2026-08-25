/**
 * Artwork paths. Everything here is sliced from `assets-src/escape-teml/` into
 * `public/reef-assets/` by `scripts/slice_clear_the_way_assets.py`.
 *
 * Paths only: which slab a given piece wears is a theme decision and lives in `skin.ts`.
 *
 * The frame ships as one rail per axis and one corner rather than four of each. The
 * mock's frame is symmetric, so the game mirrors them into place - see `RAIL_RATIO` and
 * `CORNER_RATIO` for the proportions those crops were cut at.
 */

const BASE = '/reef-assets';

export const BACKDROP = `${BASE}/backdrop.jpg`;
export const FLOOR_CELL = `${BASE}/floor-cell.png`;
export const EXIT_ARROW = `${BASE}/exit-arrow.png`;
export const FISH = `${BASE}/fish.png`;

/** The bottom rail; the top one is this flipped. */
export const RAIL_H = `${BASE}/frame-rail-h.png`;
/** The right rail; the left one is this flipped. */
export const RAIL_V = `${BASE}/frame-rail-v.png`;
/** The top-left spiral; the other three are this mirrored. */
export const CORNER = `${BASE}/frame-corner.png`;

/**
 * Rail tile length over its thickness, so a rail drawn at the wall's thickness repeats
 * its own stonework at the scale it was painted at instead of a stretched one.
 */
export const RAIL_RATIO = { h: 220 / 55, v: 220 / 46 } as const;

/** Corner ornament over rail thickness. The spiral is drawn wider than the rail it caps. */
export const CORNER_RATIO = 2;

/**
 * Obstacle slabs by shape: `<axis><cells>`, and `s1` for the square. Every level piece is
 * a 1x1 or a run of two or three cells on one axis, so these five lists cover the board.
 *
 * The variants within a shape are there so that two blocks side by side read as two
 * objects rather than one long one; `skin.ts` picks between them.
 */
export const SLABS = {
  s1: ['block-1x1-a', 'block-1x1-b', 'block-1x1-c'],
  h2: ['block-h2-a', 'block-h2-b', 'block-h2-c', 'block-h2-d', 'block-h2-e'],
  h3: ['block-h3-a', 'block-h3-b'],
  v2: ['block-v2-a', 'block-v2-b', 'block-v2-c'],
  v3: ['block-v3-a', 'block-v3-b'],
} as const;

export type SlabShape = keyof typeof SLABS;

export const slabPath = (name: string): string => `${BASE}/${name}.png`;
