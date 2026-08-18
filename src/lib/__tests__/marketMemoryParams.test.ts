import { describe, it, expect } from 'vitest';
import { getMarketMemoryParams } from '../dynamicDifficulty';

describe('getMarketMemoryParams', () => {
  it('starts gentle at score 0', () => {
    const p = getMarketMemoryParams(0);
    expect(p.listLength).toBe(3);
    expect(p.similarPackaging).toBe(false);
    expect(p.delayedRetrieval).toBe(false);
    expect(p.listCategory).toBe(false);
  });

  it('reaches full difficulty at score 1', () => {
    const p = getMarketMemoryParams(1);
    expect(p.listLength).toBe(6);
    expect(p.similarPackaging).toBe(true);
    expect(p.delayedRetrieval).toBe(true);
    expect(p.listCategory).toBe(true);
  });

  it('lengthens the covered hold across the curve, then adds the delayed bonus on top', () => {
    // The hold is the only clock in the game now: the list itself is untimed and ends on
    // READY, so this curve carries all of the encoding pressure listSeconds used to.
    expect(getMarketMemoryParams(0).retentionMs).toBe(1500);
    // Just under the delayedRetrieval threshold of 0.55, so no bonus yet.
    expect(getMarketMemoryParams(0.5).retentionMs).toBe(2750);
    expect(getMarketMemoryParams(1).retentionMs).toBe(4000 + 2500);
  });

  it('keeps lives and hints fixed across the whole curve', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expect(getMarketMemoryParams(s).lives).toBe(3);
      expect(getMarketMemoryParams(s).hints).toBe(2);
    }
  });

  it('never shortens the list or the covered hold as score rises', () => {
    let prevLen = 0;
    let prevHold = 0;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const p = getMarketMemoryParams(Math.min(1, s));
      expect(p.listLength).toBeGreaterThanOrEqual(prevLen);
      expect(p.retentionMs).toBeGreaterThanOrEqual(prevHold);
      prevLen = p.listLength;
      prevHold = p.retentionMs;
    }
  });

  it('keeps listCategory satisfiable: a group exists with listLength + 2 members', () => {
    // Produce has 20, staples 12, pulses and pantry 9, spices 8. If listLength ever
    // exceeds 6 this axis starts silently disabling itself group by group.
    const p = getMarketMemoryParams(1);
    expect(p.listLength + 2).toBeLessThanOrEqual(8);
  });

  it('clamps out-of-range scores', () => {
    expect(getMarketMemoryParams(-1).listLength).toBe(3);
    expect(getMarketMemoryParams(2).listLength).toBe(6);
  });
});
