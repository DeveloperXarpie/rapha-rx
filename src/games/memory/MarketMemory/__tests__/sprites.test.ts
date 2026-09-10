import { describe, it, expect } from 'vitest';
import { BY_ID, GROUPS, ITEMS, spriteFor, type Group } from '../items';
import { BG_HOME, BG_STORE, PRELOAD, UI_CLIPBOARD, UI_TRAVEL } from '../sprites';
import { CRATE_COUNT, categoryGroupMinimum, eligibleGroups } from '../round';

/**
 * The set of art files that actually exist on disk.
 *
 * Enumerated with Vite's own glob rather than node:fs: `tsconfig.app.json` restricts
 * ambient types to `vite/client` precisely so app code cannot reach for Node APIs, and
 * widening that for one test would be the wrong trade.
 */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('/public/shop-assets/*.{png,jpg,webp}')).map((p) => p.replace('/public', '')),
);

/** Mirrors MM.listLengthMax in dynamicDifficulty.ts. */
const LIST_LENGTH_MAX = 6;

describe('item catalogue', () => {
  it('resolves every item to a sprite that actually exists', () => {
    // The one failure that matters: a rename in slice_shopping_assets.py that silently
    // leaves the shelf painting broken images.
    for (const item of ITEMS) {
      expect(ON_DISK.has(spriteFor(item)), `missing sprite for ${item.id}`).toBe(true);
    }
  });

  it('has no duplicate ids', () => {
    expect(new Set(ITEMS.map((i) => i.id)).size).toBe(ITEMS.length);
  });

  it('points every twin at a real item', () => {
    for (const item of ITEMS) {
      expect(BY_ID[item.twin], `${item.id} twins with unknown ${item.twin}`).toBeDefined();
    }
  });

  it('never makes an item its own twin', () => {
    // A self-twin would silently disarm the decoy mechanic for that target.
    for (const item of ITEMS) expect(item.twin).not.toBe(item.id);
  });

  it('assigns every item to a declared group', () => {
    for (const item of ITEMS) expect(GROUPS).toContain(item.group);
  });

  it('stocks the shelf several times over', () => {
    expect(ITEMS.length).toBeGreaterThanOrEqual(CRATE_COUNT * 2);
  });
});

describe('category groups', () => {
  const size = (g: Group) => ITEMS.filter((i) => i.group === g).length;

  it('leaves at least one group eligible at the hardest list length', () => {
    // poolFor falls back to the whole catalogue when nothing qualifies, which would make
    // listCategory a no-op at the top of the curve without failing anywhere visible.
    expect(eligibleGroups(LIST_LENGTH_MAX).length).toBeGreaterThan(0);
  });

  it('only admits groups that can actually dominate the shelf', () => {
    // The point of the tier is that the shelf reads as one product family. A group that
    // fills a third of it and leaves the rest to random backfill does not do that.
    const needed = categoryGroupMinimum(LIST_LENGTH_MAX);
    for (const g of eligibleGroups(LIST_LENGTH_MAX)) {
      expect(size(g), `${g} should fill most of the shelf`).toBeGreaterThanOrEqual(needed);
    }
    expect(needed / CRATE_COUNT).toBeGreaterThanOrEqual(0.5);
  });

  it('keeps household out, so a whole list is never cleaning products', () => {
    // Deliberate: the four household items stock the shelf as decoys only.
    expect(eligibleGroups(LIST_LENGTH_MAX)).not.toContain('household');
  });
});

describe('board art', () => {
  it('resolves every backdrop and ui sprite to a file that actually exists', () => {
    for (const url of [BG_HOME, BG_STORE, UI_CLIPBOARD, UI_TRAVEL]) {
      expect(ON_DISK.has(url), `missing art: ${url}`).toBe(true);
    }
  });

  it('preloads the art the walk to the shop needs before it is on screen', () => {
    // The store backdrop appears behind the cover, and the travel plate IS the cover.
    // Warming either late is a blank frame at exactly the moment the player is being
    // tested. DONE is not in the list any more because it is no longer art.
    expect(PRELOAD).toContain(BG_STORE);
    expect(PRELOAD).toContain(UI_TRAVEL);
  });
});
