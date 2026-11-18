import { describe, it, expect } from 'vitest';
import {
  recordFirstRound, firstRound, needsSecondTrip, requestSecondTrip, isSecondTripPending,
  markSecondTripDone, retentionScore,
} from '../secondTrip';
import { buildRoundForList, CRATE_COUNT } from '../round';
import { marketMemoryPerformance } from '../performance';

describe('retentionScore', () => {
  it('compares the second trip with the first round', () => expect(retentionScore(2, 4)).toBe(50));
  it('has no score when nothing was recalled the first time', () => expect(retentionScore(1, 0)).toBeNull());
});

describe('visit record', () => {
  it('keeps the first round of a visit only', () => {
    recordFirstRound('v1', ['tomatoes', 'apples'], 2);
    recordFirstRound('v1', ['onion'], 1);
    expect(firstRound('v1')).toEqual({ list: ['tomatoes', 'apples'], correct: 2 });
    expect(firstRound('v-other')).toBeUndefined();
  });
});

describe('needsSecondTrip', () => {
  it('needs a recorded first round and at least two rounds', () => {
    recordFirstRound('v2', ['carrots'], 1);
    expect(needsSecondTrip({ visitId: 'v2', round: 0, secondTripDone: false })).toBe(false);
    expect(needsSecondTrip({ visitId: 'v2', round: 1, secondTripDone: false })).toBe(true);
    expect(needsSecondTrip({ visitId: 'v2', round: 2, secondTripDone: true })).toBe(false);
    expect(needsSecondTrip({ visitId: 'never-recorded', round: 3, secondTripDone: false })).toBe(false);
  });
  it('tracks a pending trip until it is done', () => {
    requestSecondTrip('v3');
    expect(isSecondTripPending('v3')).toBe(true);
    markSecondTripDone('v3');
    expect(isSecondTripPending('v3')).toBe(false);
  });
});

describe('buildRoundForList', () => {
  it('shelves every listed item among the crates', () => {
    const list = ['tomatoes', 'apples', 'onion'];
    const r = buildRoundForList(list, { listLength: 3, similarPackaging: true, listCategory: false });
    expect(r.list).toEqual(list);
    expect(r.crates).toHaveLength(CRATE_COUNT);
    list.forEach((id) => expect(r.crates).toContain(id));
  });
});

describe('marketMemoryPerformance', () => {
  it('halves a hinted round (owner, 2026-11-18)', () =>
    expect(marketMemoryPerformance({ correct: 3, listLength: 3, wrong: 0, hintsUsed: 1 })).toBe(0.5));
  it('keeps the unhinted formula', () =>
    expect(marketMemoryPerformance({ correct: 2, listLength: 4, wrong: 1, hintsUsed: 0 })).toBeCloseTo(0.35));
});
