import { describe, it, expect } from 'vitest';
import { levelToScore, parseDebugLevel, DEBUG_LEVEL_PARAM, MAX_DEBUG_LEVEL } from '../debugLevels';
import { scoreToLevel } from '../dynamicDifficulty';

/**
 * The debug jumper picks a level; every game downstream reads a 0.0-1.0
 * difficulty score. `levelToScore` is the only bridge between the two, so it is
 * only correct insofar as it round-trips through `scoreToLevel`.
 *
 * That round-trip is the test that earns its keep: `scoreToLevel` is
 * `Math.ceil(score * 10)`, and anyone retuning that formula without this file
 * would silently land the jumper one band off - "level 7" quietly serving
 * level 6 - which is invisible by eye and ruins every test done through it.
 */

describe('levelToScore', () => {
  it('round-trips through scoreToLevel for every level', () => {
    for (let level = 1; level <= MAX_DEBUG_LEVEL; level++) {
      expect(scoreToLevel(levelToScore(level))).toBe(level);
    }
  });

  it('stays inside the 0..1 range the difficulty system expects', () => {
    for (let level = 1; level <= MAX_DEBUG_LEVEL; level++) {
      const score = levelToScore(level);
      expect(score).toBeGreaterThan(0);
      expect(score).toBeLessThan(1);
    }
  });

  it('lands mid-band, not on the boundary', () => {
    // A boundary value is one floating-point nudge away from the wrong band.
    expect(levelToScore(7)).toBeCloseTo(0.65, 10);
  });
});

describe('parseDebugLevel', () => {
  it('accepts every level in range', () => {
    for (let level = 1; level <= MAX_DEBUG_LEVEL; level++) {
      expect(parseDebugLevel(String(level))).toBe(level);
    }
  });

  it('returns null when the param is absent', () => {
    expect(parseDebugLevel(null)).toBeNull();
  });

  /*
   * Everything below must return null rather than throw or clamp. This param
   * ships to production behind the tap-unlock, so a mistyped or hand-edited URL
   * has to fall back to the resident's real difficulty, never to a guess.
   */
  it.each([
    ['empty', ''],
    ['whitespace', '   '],
    ['zero', '0'],
    ['negative', '-1'],
    ['above the ceiling', '11'],
    ['fractional', '3.5'],
    ['not a number', 'abc'],
    ['number with suffix', '7abc'],
    ['infinity', 'Infinity'],
  ])('returns null for %s', (_label, raw) => {
    expect(parseDebugLevel(raw)).toBeNull();
  });
});

describe('DEBUG_LEVEL_PARAM', () => {
  it('is the query key the router and the picker both agree on', () => {
    expect(DEBUG_LEVEL_PARAM).toBe('debugLevel');
  });
});
