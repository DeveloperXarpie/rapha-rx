import { describe, it, expect } from 'vitest';
import { ITEMS } from '../items';
import { BG_SCENE, UI_PLANK_LEFT, UI_PLANK_RIGHT, spritePath } from '../sprites';

/**
 * The art that actually exists on disk.
 *
 * Enumerated with Vite's own glob rather than node:fs: `tsconfig.app.json` restricts
 * ambient types to `vite/client` precisely so app code cannot reach for Node APIs, and
 * widening that for one test would be the wrong trade.
 */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('/public/spot-assets/*.{png,jpg}')).map((p) =>
    p.replace('/public', ''),
  ),
);

describe('spot-focus art', () => {
  it('resolves every catalogue item to a sprite that exists', () => {
    // The one failure that matters: a rename in the slicing script that leaves the
    // board painting broken images.
    for (const item of ITEMS) {
      expect(ON_DISK.has(spritePath(item.id)), `missing sprite for ${item.id}`).toBe(true);
    }
  });

  it('resolves the backdrop and both signboard end caps', () => {
    for (const path of [BG_SCENE, UI_PLANK_LEFT, UI_PLANK_RIGHT]) {
      expect(ON_DISK.has(path), `missing ${path}`).toBe(true);
    }
  });
});
