import { describe, it, expect } from 'vitest';
import { generateClearTheWayContent } from '../clearTheWay';
import { levelsForTier } from '../../../games/executive/ClearTheWay/levels';

describe('generateClearTheWayContent', () => {
  it('draws from the requested tier', () => {
    for (let tier = 1; tier <= 5; tier++) {
      expect(generateClearTheWayContent({ tier }).level.tier).toBe(tier);
    }
  });

  it('does not hand out the same board twice running while the shelf has others', () => {
    const tier = 1;
    expect(levelsForTier(tier).length).toBeGreaterThan(1);

    let previous = generateClearTheWayContent({ tier }).level.id;
    for (let round = 0; round < 8; round++) {
      const next = generateClearTheWayContent({ tier }).level.id;
      expect(next).not.toBe(previous);
      previous = next;
    }
  });

  it('falls back to a repeat rather than a wrong tier once the shelf is exhausted', () => {
    // The recent-ids buffer is longer than any single tier's shelf, so a run of draws
    // from one tier must start repeating - and must stay on that tier when it does.
    const drawn = Array.from({ length: 12 }, () => generateClearTheWayContent({ tier: 2 }).level);
    expect(drawn.every((level) => level.tier === 2)).toBe(true);
    expect(new Set(drawn.map((l) => l.id)).size).toBeLessThan(drawn.length);
  });
});
