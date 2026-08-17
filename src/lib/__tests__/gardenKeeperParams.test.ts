import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../dynamicDifficulty';

describe('getGardenKeeperParams', () => {
  it('returns the gentle end of every axis at score 0', () => {
    expect(getGardenKeeperParams(0)).toEqual({
      plantCount: 12,
      distractorRatio: 0.25,
      targetCount: 8,
      spawnIntervalMs: 3000,
      thirstWindowMs: 6000,
      maxConcurrentThirsty: 1,
      roundDurationMs: 90000,
      lives: 3,
    });
  });

  it('returns the hard end of every axis at score 1', () => {
    expect(getGardenKeeperParams(1)).toEqual({
      plantCount: 24,
      distractorRatio: 0.55,
      targetCount: 20,
      spawnIntervalMs: 1200,
      thirstWindowMs: 2800,
      maxConcurrentThirsty: 3,
      roundDurationMs: 90000,
      lives: 3,
    });
  });

  it('interpolates at the seeded default of 0.35', () => {
    const p = getGardenKeeperParams(0.35);
    expect(p.plantCount).toBe(16);
    expect(p.targetCount).toBe(12);
    expect(p.spawnIntervalMs).toBe(2370);
    expect(p.thirstWindowMs).toBe(4880);
    expect(p.distractorRatio).toBeCloseTo(0.355, 6);
    // The baseline experience is one thirsty plant at a time. Do not soften this.
    expect(p.maxConcurrentThirsty).toBe(1);
  });

  it('steps concurrency at 0.4 and 0.75, not before', () => {
    expect(getGardenKeeperParams(0.39).maxConcurrentThirsty).toBe(1);
    expect(getGardenKeeperParams(0.4).maxConcurrentThirsty).toBe(2);
    expect(getGardenKeeperParams(0.74).maxConcurrentThirsty).toBe(2);
    expect(getGardenKeeperParams(0.75).maxConcurrentThirsty).toBe(3);
  });

  it('keeps the round winnable by arithmetic at every difficulty', () => {
    // The first sprout fires 900ms after start. If the spawner cannot physically
    // present targetCount windows inside the round, the round is unwinnable by
    // arithmetic rather than by attention, which is a design failure.
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const p = getGardenKeeperParams(Math.min(1, s));
      const windows = Math.floor((p.roundDurationMs - 900) / p.spawnIntervalMs) * p.maxConcurrentThirsty;
      expect(windows).toBeGreaterThan(p.targetCount);
    }
  });

  it('clamps scores outside 0-1', () => {
    expect(getGardenKeeperParams(-1)).toEqual(getGardenKeeperParams(0));
    expect(getGardenKeeperParams(2)).toEqual(getGardenKeeperParams(1));
  });
});
