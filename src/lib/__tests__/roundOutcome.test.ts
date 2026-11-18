import { describe, it, expect } from 'vitest';
import {
  marketMemoryOutcome, spotFocusOutcome, serveGuestsOutcome, shouldAdjustDifficulty, keepsLevelOnFail,
} from '../roundOutcome';

describe('Shopping List outcome (DIFFICULTY_RULES 3.1)', () => {
  it('fails under half recalled', () =>
    expect(marketMemoryOutcome({ correct: 1, listLength: 3, wrong: 0 })).toBe('fail'));
  it('holds between half and the clear bar', () =>
    expect(marketMemoryOutcome({ correct: 2, listLength: 4, wrong: 0 })).toBe('hold'));
  it('clears at 80% with no wrong picks', () =>
    expect(marketMemoryOutcome({ correct: 4, listLength: 5, wrong: 0 })).toBe('clear'));
  it('does not clear with a wrong pick', () =>
    expect(marketMemoryOutcome({ correct: 5, listLength: 5, wrong: 1 })).toBe('hold'));
});

describe('Spot Focus outcome (DIFFICULTY_RULES 3.3)', () => {
  it('fails on an early give-up or too many wrong taps', () => {
    expect(spotFocusOutcome({ found: 1, total: 4, falseTaps: 0, gaveUp: true })).toBe('fail');
    expect(spotFocusOutcome({ found: 4, total: 4, falseTaps: 9, gaveUp: false })).toBe('fail');
  });
  it('holds on a late give-up', () =>
    expect(spotFocusOutcome({ found: 2, total: 4, falseTaps: 0, gaveUp: true })).toBe('hold'));
  it('clears when all are found with few wrong taps', () => {
    expect(spotFocusOutcome({ found: 4, total: 4, falseTaps: 4, gaveUp: false })).toBe('clear');
    expect(spotFocusOutcome({ found: 4, total: 4, falseTaps: 5, gaveUp: false })).toBe('hold');
  });
});

describe('Tiffin outcome (DIFFICULTY_RULES 3.5)', () => {
  it('fails under 60% served or at three walkouts', () => {
    expect(serveGuestsOutcome({ itemsServed: 5, itemsRequested: 10, walkouts: 0 })).toBe('fail');
    expect(serveGuestsOutcome({ itemsServed: 10, itemsRequested: 10, walkouts: 3 })).toBe('fail');
  });
  it('holds in between', () =>
    expect(serveGuestsOutcome({ itemsServed: 6, itemsRequested: 10, walkouts: 2 })).toBe('hold'));
  it('clears at 80% served and at most one walkout', () =>
    expect(serveGuestsOutcome({ itemsServed: 8, itemsRequested: 10, walkouts: 1 })).toBe('clear'));
  it('does not fail a round with no dishes ordered', () =>
    expect(serveGuestsOutcome({ itemsServed: 0, itemsRequested: 0, walkouts: 0 })).toBe('clear'));
});

describe('difficulty after a round', () => {
  it('moves the plan-2 games only on a clear', () => {
    expect(keepsLevelOnFail('market-memory')).toBe(true);
    expect(keepsLevelOnFail('garden-keeper')).toBe(false);
    expect(shouldAdjustDifficulty({ gameId: 'spot-focus', completed: false, outcome: 'fail', secondTrip: false })).toBe(false);
    expect(shouldAdjustDifficulty({ gameId: 'spot-focus', completed: true, outcome: 'hold', secondTrip: false })).toBe(false);
    expect(shouldAdjustDifficulty({ gameId: 'spot-focus', completed: true, outcome: 'clear', secondTrip: false })).toBe(true);
  });
  it('leaves other games as they were', () => {
    expect(shouldAdjustDifficulty({ gameId: 'train-yard', completed: false, outcome: undefined, secondTrip: false })).toBe(true);
    expect(shouldAdjustDifficulty({ gameId: 'train-yard', completed: true, outcome: undefined, secondTrip: false })).toBe(true);
  });
  it('never moves difficulty on a second trip', () =>
    expect(shouldAdjustDifficulty({ gameId: 'market-memory', completed: true, outcome: 'clear', secondTrip: true })).toBe(false));
});
