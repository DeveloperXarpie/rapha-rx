import { describe, it, expect } from 'vitest';
import { LEVELS } from '../levels';
import { parseLevel } from '../model';
import { blockSlab, SKIN } from '../skin';
import { BACKDROP, CORNER, EXIT_ARROW, FISH, FLOOR_CELL, RAIL_H, RAIL_V, SLABS, slabPath } from '../sprites';

/**
 * The art that actually exists on disk.
 *
 * Enumerated with Vite's own glob rather than node:fs: `tsconfig.app.json` restricts
 * ambient types to `vite/client` precisely so app code cannot reach for Node APIs, and
 * widening that for one test would be the wrong trade.
 */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('/public/reef-assets/*.{png,jpg}')).map((p) =>
    p.replace('/public', ''),
  ),
);

describe('clear-the-way art', () => {
  it('resolves every slab in the catalogue', () => {
    for (const [shape, variants] of Object.entries(SLABS)) {
      for (const name of variants) {
        expect(ON_DISK.has(slabPath(name)), `missing ${shape} slab ${name}`).toBe(true);
      }
    }
  });

  it('resolves the frame, the floor, the beacon and the fish', () => {
    for (const path of [BACKDROP, CORNER, EXIT_ARROW, FISH, FLOOR_CELL, RAIL_H, RAIL_V]) {
      expect(ON_DISK.has(path), `missing ${path}`).toBe(true);
    }
    expect(SKIN.key).toBe(FISH);
  });

  it('dresses every obstacle in every shipped level', () => {
    // The one failure that matters: a level introducing a shape the sheet has no slab
    // for, which `blockSlab` would resolve to `undefined.png` and paint as a broken image.
    for (const def of LEVELS) {
      for (const piece of parseLevel(def).pieces) {
        if (piece.isKey) continue;
        expect(
          ON_DISK.has(blockSlab(piece)),
          `${def.id}: no slab for piece "${piece.letter}" at ${piece.w}x${piece.h}`,
        ).toBe(true);
      }
    }
  });
});
