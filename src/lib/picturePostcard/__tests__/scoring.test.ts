import { describe, it, expect } from 'vitest';
import { roundScore, streakMultiplier, speedBonus } from '../scoring';

describe('scoring (spec SS6)', () => {
  it('multiplier bands', () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(4)).toBe(1.0);
    expect(streakMultiplier(5)).toBe(1.2);
    expect(streakMultiplier(7)).toBe(1.2);
    expect(streakMultiplier(8)).toBe(1.5);
  });
  it('speed bonus scales with soft-timer remainder, 0 without a timer', () => {
    expect(speedBonus(null, 999)).toBe(0);
    expect(speedBonus(60000, 60000)).toBe(40);
    expect(speedBonus(60000, 30000)).toBe(20);
    expect(speedBonus(60000, 0)).toBe(0);
  });
  it('base case: one change, no extras = 100', () => {
    expect(roundScore({ changesFound: 1, responded: true, speedBonus: 0, streak: 0, hintsUsed: 0, autoScaffoldTiersAboveTier1: 0 })).toBe(100);
  });
  it('costs apply after the multiplier; floor is 10 for responded trials', () => {
    expect(roundScore({ changesFound: 1, responded: true, speedBonus: 20, streak: 5, hintsUsed: 1, autoScaffoldTiersAboveTier1: 0 })).toBe(Math.round(120 * 1.2) - 30);
    expect(roundScore({ changesFound: 0, responded: true, speedBonus: 0, streak: 0, hintsUsed: 3, autoScaffoldTiersAboveTier1: 3 })).toBe(10);
  });
  it('omissions score 0', () => {
    expect(roundScore({ changesFound: 0, responded: false, speedBonus: 0, streak: 0, hintsUsed: 0, autoScaffoldTiersAboveTier1: 0 })).toBe(0);
  });
});
