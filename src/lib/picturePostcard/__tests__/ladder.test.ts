import { describe, it, expect } from 'vitest';
import {
  LADDER, getLevelDef, effectiveParams, FIRST_APPEARANCE, DI_STEP, DI_CLAMP,
} from '../ladder';

describe('ladder (spec A5 validation)', () => {
  it('has 100 levels with correct tiers', () => {
    expect(LADDER).toHaveLength(100);
    expect(getLevelDef(1).tier).toBe(1);
    expect(getLevelDef(41).tier).toBe(5);
    expect(getLevelDef(100).tier).toBe(10);
  });
  it('matches curve endpoints at L1 and L100', () => {
    expect(getLevelDef(1).params).toMatchObject({ objects: 5, encodeMs: 7801, delayMs: 538, changes: 1, lureLevel: 0 });
    expect(getLevelDef(100).params).toMatchObject({ objects: 18, encodeMs: 3000, delayMs: 10000, changes: 4, lureLevel: 3 });
  });
  it('every axis is monotonic across levels', () => {
    for (let n = 2; n <= 100; n++) {
      const prev = getLevelDef(n - 1).params, cur = getLevelDef(n).params;
      expect(cur.objects).toBeGreaterThanOrEqual(prev.objects);
      expect(cur.encodeMs).toBeLessThanOrEqual(prev.encodeMs);
      expect(cur.delayMs).toBeGreaterThanOrEqual(prev.delayMs);
      expect(cur.changes).toBeGreaterThanOrEqual(prev.changes);
      expect(cur.lureLevel).toBeGreaterThanOrEqual(prev.lureLevel);
    }
  });
  it('changes breakpoints at L28/56/84; lureLevel at L26/52/78', () => {
    expect(getLevelDef(27).params.changes).toBe(1);
    expect(getLevelDef(28).params.changes).toBe(2);
    expect(getLevelDef(56).params.changes).toBe(3);
    expect(getLevelDef(84).params.changes).toBe(4);
    expect(getLevelDef(25).params.lureLevel).toBe(0);
    expect(getLevelDef(26).params.lureLevel).toBe(1);
    expect(getLevelDef(52).params.lureLevel).toBe(2);
    expect(getLevelDef(78).params.lureLevel).toBe(3);
  });
  it('no change class appears before its first-appearance level', () => {
    for (const def of LADDER) {
      for (const [cls, w] of Object.entries(def.changeTypeWeights)) {
        if ((w ?? 0) > 0) expect(def.level).toBeGreaterThanOrEqual(FIRST_APPEARANCE[Number(cls) as 1]);
      }
    }
  });
  it('probe modes follow the tier table (T1-T3 M2; T4 M2/M3; T5 M3)', () => {
    expect(getLevelDef(5).probeModeWeights).toEqual({ M2: 1 });
    expect(getLevelDef(15).probeModeWeights).toEqual({ M2: 1 });
    expect(getLevelDef(25).probeModeWeights).toEqual({ M2: 1 });
    expect(getLevelDef(35).probeModeWeights).toEqual({ M2: 0.5, M3: 0.5 });
    expect(getLevelDef(45).probeModeWeights).toEqual({ M3: 1 });
  });
  it('never offers a probe mode that reveals the original scene during the probe', () => {
    for (const def of LADDER) {
      for (const [mode, w] of Object.entries(def.probeModeWeights)) {
        if ((w ?? 0) > 0) expect(['M2', 'M3']).toContain(mode);
      }
    }
  });
  it('soft timer none/none/60s/60s/45s; interference from tier 5', () => {
    expect(getLevelDef(10).softTimerMs).toBeNull();
    expect(getLevelDef(20).softTimerMs).toBeNull();
    expect(getLevelDef(25).softTimerMs).toBe(60000);
    expect(getLevelDef(35).softTimerMs).toBe(60000);
    expect(getLevelDef(45).softTimerMs).toBe(45000);
    expect(getLevelDef(40).interference).toBe(false);
    expect(getLevelDef(41).interference).toBe(true);
  });
  it('effectiveParams evaluates curves at clamp(n + di)', () => {
    expect(effectiveParams(10, 0)).toEqual(getLevelDef(10).params);
    expect(effectiveParams(10, 2.0).delayMs).toBe(effectiveParams(12, 0).delayMs);
    expect(effectiveParams(1, -5)).toEqual(getLevelDef(1).params);   // clamped at L1
    expect(effectiveParams(100, 5)).toEqual(getLevelDef(100).params); // clamped at L100
  });
  it('changeTypeWeights sum to 1 and DI constants match spec', () => {
    for (const def of LADDER) {
      const sum = Object.values(def.changeTypeWeights).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
    }
    expect(DI_STEP).toBe(0.08);
    expect(DI_CLAMP).toBe(2.0);
  });
});
