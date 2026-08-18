import { describe, it, expect } from 'vitest';
import { parseLevel } from '../model';
import { solve } from '../solver';
import { LEVELS, levelsForTier, pickLevel } from '../levels';

/**
 * Move-count band per tier. Difficulty is meant to rise with the length of the blocking
 * chain, so this is the band the catalog is held to: a level that drifts out of it is
 * mis-shelved and will be handed to the wrong resident.
 */
const TIER_BANDS: Record<number, { min: number; max: number }> = {
  1: { min: 2, max: 3 },
  2: { min: 4, max: 5 },
  3: { min: 6, max: 7 },
  4: { min: 8, max: 9 },
  5: { min: 10, max: 16 },
};

describe('the level catalog', () => {
  it('has at least two levels on every tier from 1 to 5', () => {
    for (let tier = 1; tier <= 5; tier++) {
      expect(LEVELS.filter((l) => l.tier === tier).length, `tier ${tier}`).toBeGreaterThanOrEqual(2);
    }
  });

  it('has unique ids', () => {
    const ids = LEVELS.map((l) => l.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s parses, solves, and matches its recorded numbers', (_id, level) => {
    const board = parseLevel(level);
    const solution = solve(board);

    expect(solution, 'level is unsolvable').not.toBeNull();
    expect(solution!.minMoves).toBe(level.minMoves);
    expect(solution!.dependencyDepth).toBe(level.dependencyDepth);

    const band = TIER_BANDS[level.tier];
    expect(band, `unknown tier ${level.tier}`).toBeDefined();
    expect(solution!.minMoves).toBeGreaterThanOrEqual(band.min);
    expect(solution!.minMoves).toBeLessThanOrEqual(band.max);
  });

  it.each(LEVELS.map((level) => [level.id, level] as const))('%s starts unsolved', (_id, level) => {
    expect(solve(parseLevel(level))!.minMoves).toBeGreaterThan(0);
  });
});

describe('levelsForTier', () => {
  it('returns only that tier', () => {
    expect(levelsForTier(3).every((l) => l.tier === 3)).toBe(true);
  });

  it('clamps a tier outside 1-5', () => {
    expect(levelsForTier(0).every((l) => l.tier === 1)).toBe(true);
    expect(levelsForTier(99).every((l) => l.tier === 5)).toBe(true);
  });

  it('always yields something to play', () => {
    for (let tier = 0; tier <= 7; tier++) {
      expect(levelsForTier(tier).length).toBeGreaterThan(0);
      expect(pickLevel(tier)).toBeDefined();
    }
  });
});
