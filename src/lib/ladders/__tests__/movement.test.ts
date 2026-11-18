import { describe, it, expect } from 'vitest';
import { nextLevel, levelForToday, shouldMoveLadder } from '../movement';
import type { RoundOutcome } from '../../roundOutcome';

const run = (start: number, outcomes: RoundOutcome[], max = 20) =>
  outcomes.reduce((s, o) => nextLevel(s, o, max), { level: start, failStreak: 0 });

describe('nextLevel (X1, owner 2026-11-18)', () => {
  it('goes up one on a clear', () => expect(run(4, ['clear']).level).toBe(5));
  it('goes down one after two fails in a row', () =>
    expect(run(4, ['fail', 'fail'])).toEqual({ level: 3, failStreak: 0 }));
  it('repeats the level on a single fail or a hold', () => {
    expect(run(4, ['fail']).level).toBe(4);
    expect(run(4, ['hold']).level).toBe(4);
  });
  it('lets a hold break a run of fails', () => expect(run(4, ['fail', 'hold', 'fail']).level).toBe(4));
  it('lets a clear break a run of fails', () => expect(run(4, ['fail', 'clear', 'fail']).level).toBe(5));
  it('stops at the top and the bottom', () => {
    expect(run(20, ['clear']).level).toBe(20);
    expect(run(1, ['fail', 'fail']).level).toBe(1);
  });
});

describe('levelForToday (X2: restart each day)', () => {
  it('starts a fresh day at level 1', () => expect(levelForToday(undefined)).toEqual({ level: 1, failStreak: 0 }));
  it("keeps today's progress", () =>
    expect(levelForToday({ level: 7, failStreak: 1 })).toEqual({ level: 7, failStreak: 1 }));
  it('treats a row written before ladders as level 1', () =>
    expect(levelForToday({})).toEqual({ level: 1, failStreak: 0 }));
});

describe('shouldMoveLadder', () => {
  it('moves on an ordinary round', () => expect(shouldMoveLadder({ debug: false, secondTrip: false })).toBe(true));
  it('never moves on a debug probe or a second trip', () => {
    expect(shouldMoveLadder({ debug: true, secondTrip: false })).toBe(false);
    expect(shouldMoveLadder({ debug: false, secondTrip: true })).toBe(false);
  });
});
