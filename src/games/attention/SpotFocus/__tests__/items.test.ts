import { describe, it, expect } from 'vitest';
import { BY_ID, ITEMS, familyMembers } from '../items';
import { getSpotFocusParams } from '../../../../lib/dynamicDifficulty';

describe('item catalogue', () => {
  it('has no duplicate ids', () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('omits the duplicated globe', () => {
    // The atlas draws the same globe twice. Both are sliced so the filenames stay
    // unique, but a difference nobody can see is a difference nobody can find.
    expect(BY_ID.has('globe')).toBe(true);
    expect(BY_ID.has('globe-2')).toBe(false);
  });

  it('gives every item a label key derived from its id', () => {
    for (const item of ITEMS) {
      expect(item.labelKey).toBe(`spot-focus.item.${item.id}`);
    }
  });

  it('makes every twin symmetric, real, and in the same family', () => {
    for (const item of ITEMS) {
      if (!item.twin) continue;
      const twin = BY_ID.get(item.twin);
      expect(twin, `${item.id} twins a missing id ${item.twin}`).toBeDefined();
      // A one-sided twin silently halves the subtle pool.
      expect(twin!.twin, `${item.id} and ${item.twin} disagree`).toBe(item.id);
      expect(twin!.family).toBe(item.family);
    }
  });

  it('resolves familyMembers to every item carrying that family', () => {
    for (const item of ITEMS) {
      const kin = familyMembers(item.family);
      expect(kin).toContain(item);
      expect(kin.every((k) => k.family === item.family)).toBe(true);
    }
  });

  it('carries enough twins for the hardest round the engine can ask for', () => {
    // A subtle round needs one twinned item per difference, each in its own family.
    const maxDifferences = getSpotFocusParams(1).differenceCount;
    const twinFamilies = new Set(ITEMS.filter((i) => i.twin).map((i) => i.family));
    expect(twinFamilies.size).toBeGreaterThanOrEqual(maxDifferences);
  });

  it('has enough families to fill the largest grid without repeating one', () => {
    const { gridRows, gridCols } = getSpotFocusParams(1);
    const families = new Set(ITEMS.map((i) => i.family));
    expect(families.size).toBeGreaterThanOrEqual(gridRows * gridCols);
  });

  it('has enough families with two or more members to run a medium round', () => {
    const maxDifferences = getSpotFocusParams(1).differenceCount;
    const plural = new Set(
      ITEMS.filter((i) => familyMembers(i.family).length >= 2).map((i) => i.family),
    );
    expect(plural.size).toBeGreaterThanOrEqual(maxDifferences);
  });
});
