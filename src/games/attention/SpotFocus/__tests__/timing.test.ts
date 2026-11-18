import { describe, it, expect } from 'vitest';
import { medianFindGapMs, spotFocusPerformance, GIVE_UP_DELAY_S, completionTone } from '../timing';

describe('medianFindGapMs (response speed, D22)', () => {
  it('times the first find from the board and each later one from the previous', () =>
    expect(medianFindGapMs([1000, 3000, 4000])).toBe(1000));
  it('averages the middle two for an even count', () =>
    expect(medianFindGapMs([2000, 5000])).toBe(2500));
  it('has no value without a find', () => expect(medianFindGapMs([])).toBeNull());
});

describe('spotFocusPerformance', () => {
  it('counts partial finds, now that a round can end early', () =>
    expect(spotFocusPerformance({ found: 2, total: 4, falseTaps: 0 })).toBe(0.5));
  it('keeps the wrong-tap penalty and clamps at zero', () => {
    expect(spotFocusPerformance({ found: 4, total: 4, falseTaps: 2 })).toBeCloseTo(0.7);
    expect(spotFocusPerformance({ found: 1, total: 4, falseTaps: 9 })).toBe(0);
  });
});

it('waits 45 s before offering to give up', () => expect(GIVE_UP_DELAY_S).toBe(45));

describe('completionTone (final review: no "Well done!" over a Replay)', () => {
  it('celebrates only a round that found everything and did not fail', () => {
    expect(completionTone({ found: 4, total: 4, outcome: 'clear' })).toBe('celebrate');
    expect(completionTone({ found: 4, total: 4, outcome: 'hold' })).toBe('celebrate');
  });
  it('does not celebrate a fail, even with everything found', () =>
    expect(completionTone({ found: 4, total: 4, outcome: 'fail' })).toBe('encourage'));
  it('encourages a partial round', () =>
    expect(completionTone({ found: 2, total: 4, outcome: 'hold' })).toBe('encourage'));
});
