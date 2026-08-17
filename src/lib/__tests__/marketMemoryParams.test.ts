import { describe, it, expect } from 'vitest';
import { getMarketMemoryParams } from '../dynamicDifficulty';

describe('getMarketMemoryParams', () => {
  it('starts gentle at score 0', () => {
    const p = getMarketMemoryParams(0);
    expect(p.listLength).toBe(3);
    expect(p.listSeconds).toBe(9000);
    expect(p.similarPackaging).toBe(false);
    expect(p.delayedRetrieval).toBe(false);
    expect(p.listCategory).toBe(false);
  });

  it('reaches full difficulty at score 1', () => {
    const p = getMarketMemoryParams(1);
    expect(p.listLength).toBe(6);
    expect(p.listSeconds).toBe(3500);
    expect(p.similarPackaging).toBe(true);
    expect(p.delayedRetrieval).toBe(true);
    expect(p.listCategory).toBe(true);
  });

  it('adds the delayed-retrieval hold only when that axis is on', () => {
    expect(getMarketMemoryParams(0).retentionMs).toBe(1500);
    expect(getMarketMemoryParams(1).retentionMs).toBe(4000);
  });

  it('keeps lives and hints fixed across the whole curve', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expect(getMarketMemoryParams(s).lives).toBe(3);
      expect(getMarketMemoryParams(s).hints).toBe(2);
    }
  });

  it('never shortens the list or lengthens the encoding as score rises', () => {
    let prevLen = 0;
    let prevSecs = Infinity;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const p = getMarketMemoryParams(Math.min(1, s));
      expect(p.listLength).toBeGreaterThanOrEqual(prevLen);
      expect(p.listSeconds).toBeLessThanOrEqual(prevSecs);
      prevLen = p.listLength;
      prevSecs = p.listSeconds;
    }
  });

  it('keeps listCategory satisfiable: a group exists with listLength + 2 members', () => {
    // Pantry has 10. If listLength ever exceeds 8 this axis silently disables itself.
    const p = getMarketMemoryParams(1);
    expect(p.listLength + 2).toBeLessThanOrEqual(10);
  });

  it('clamps out-of-range scores', () => {
    expect(getMarketMemoryParams(-1).listLength).toBe(3);
    expect(getMarketMemoryParams(2).listLength).toBe(6);
  });
});
