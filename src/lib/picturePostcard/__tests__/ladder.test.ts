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
  it('matches curve endpoints at L4 and L100', () => {
    // L1-L3 are photo levels with authored objects/changes, so L4 is the lowest pure
    // curve point.
    expect(getLevelDef(4).params).toMatchObject({ objects: 6, encodeMs: 7475, delayMs: 700, changes: 1, lureLevel: 0 });
    expect(getLevelDef(100).params).toMatchObject({ objects: 18, encodeMs: 3000, delayMs: 10000, changes: 4, lureLevel: 3 });
  });
  it('every axis is monotonic across the curve-driven levels', () => {
    // Levels 1-3 are photo levels with authored objects/changes, so the curve's
    // monotonicity guarantee starts at level 4.
    for (let n = 5; n <= 100; n++) {
      const prev = getLevelDef(n - 1).params, cur = getLevelDef(n).params;
      expect(cur.objects).toBeGreaterThanOrEqual(prev.objects);
      expect(cur.encodeMs).toBeLessThanOrEqual(prev.encodeMs);
      expect(cur.delayMs).toBeGreaterThanOrEqual(prev.delayMs);
      expect(cur.changes).toBeGreaterThanOrEqual(prev.changes);
      expect(cur.lureLevel).toBeGreaterThanOrEqual(prev.lureLevel);
    }
  });
  it('photo levels 1-3 override objects and changes but keep the curve elsewhere', () => {
    expect(effectiveParams(1, 0)).toMatchObject({ objects: 10, changes: 2, encodeMs: 7801, delayMs: 538 });
    expect(effectiveParams(2, 0)).toMatchObject({ objects: 10, changes: 3 });
    expect(effectiveParams(3, 0)).toMatchObject({ objects: 10, changes: 4 });
    expect(effectiveParams(4, 0).objects).toBe(6);
    expect(effectiveParams(4, 0).changes).toBe(1);
  });

  it('the hidden count on photo levels does not move with DI', () => {
    for (const di of [-2, -1, 0, 1, 2]) {
      expect(effectiveParams(3, di).changes).toBe(4);
      expect(effectiveParams(3, di).objects).toBe(10);
    }
    // encode and delay still respond to DI
    expect(effectiveParams(3, 2).delayMs).toBeGreaterThan(effectiveParams(3, -2).delayMs);
  });

  it('getLevelDef params agree with effectiveParams at di 0 for every level', () => {
    for (let n = 1; n <= 100; n++) {
      expect(effectiveParams(n, 0), `level ${n}`).toEqual(getLevelDef(n).params);
    }
  });

  it('levels 1-3 are pinned to the photo scene and nothing else is', () => {
    expect(getLevelDef(1).sceneId).toBe('post-office');
    expect(getLevelDef(3).sceneId).toBe('post-office');
    expect(getLevelDef(4).sceneId).toBeUndefined();
    expect(getLevelDef(100).sceneId).toBeUndefined();
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
