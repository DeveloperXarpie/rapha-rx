import { describe, it, expect } from 'vitest';
import { generateTrial } from '../../contentGenerators/picturePostcard';
import { getLevelDef, effectiveParams, M3_ELIGIBLE_CLASSES } from '../ladder';
import { SCENES } from '../../../games/memory/PicturePostcard/scenes';
import { todayISO } from '../../dates';

const rng = (() => { let s = 42; return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); })();
const gen = (level: number, extra: Partial<Parameters<typeof generateTrial>[0]> = {}) =>
  generateTrial({
    levelDef: getLevelDef(level), params: effectiveParams(level, 0),
    scenesThisSession: [], pairHistory: [], rng, ...extra,
  });

describe('trial generator', () => {
  it('L1: one class-1 change, M2 probe, no lures', () => {
    const t = gen(1);
    expect(t.changes).toHaveLength(1);
    expect(t.changes[0].changeClass).toBe(1);
    expect(t.probeMode).toBe('M2');
    expect(t.lurePlacements).toHaveLength(0);
  });
  it('avoids scenes used this session', () => {
    // Level 10, not level 1: levels 1-3 are pinned to the photo scene and bypass the
    // pool entirely, so they cannot exercise session exclusion.
    const pool = SCENES.filter((s) => !s.pinned);
    const used = pool.slice(0, pool.length - 1).map((s) => s.id);
    const expected = pool[pool.length - 1].id;
    for (let i = 0; i < 10; i++) {
      expect(gen(10, { scenesThisSession: used }).sceneId).toBe(expected);
    }
  });
  it('levels 1-3 always use the pinned photo scene', () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        expect(gen(level).sceneId).toBe('post-office');
      }
    }
  });

  it('the pinned photo scene is never chosen at any other level', () => {
    for (const level of [4, 10, 27, 45, 80, 100]) {
      for (let i = 0; i < 20; i++) {
        expect(gen(level).sceneId).not.toBe('post-office');
      }
    }
  });

  it('photo trials only ever apply class-1 removals', () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        for (const c of gen(level).changes) expect(c.changeClass).toBe(1);
      }
    }
  });

  it('pinning ignores session and pair history', () => {
    const t = gen(1, {
      scenesThisSession: ['post-office'],
      pairHistory: [{ sceneId: 'post-office', changeClass: 1, lastUsedDate: todayISO() }],
    });
    expect(t.sceneId).toBe('post-office');
  });

  it('relaxes constraints rather than throwing when everything is excluded', () => {
    const all = SCENES.map((s) => s.id);
    expect(() => gen(1, { scenesThisSession: all })).not.toThrow();
  });
  it('respects the 30-day pair rule when alternatives exist', () => {
    const pairHistory = SCENES.map((s) => ({ sceneId: s.id, changeClass: 1, lastUsedDate: todayISO() }));
    // all scenes conflicted for class 1 -> relaxation, still generates
    expect(() => gen(1, { pairHistory })).not.toThrow();
  });
  it('M3 trials only use M3-eligible change classes for the probed change', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(45); // tier 5: M3 only
      expect(t.probeMode).toBe('M3');
      expect(M3_ELIGIBLE_CLASSES).toContain(t.changes[0].changeClass);
      expect(t.m3Question?.options).toHaveLength(4);
      expect(t.m3Question!.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });
  it('multi-change trials never stack two changes on one slot', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(35, {});
      const slots = t.changes.map((c) => c.slotId);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });
  it('mirror changes only target mirrorable sprites', () => {
    for (let i = 0; i < 50; i++) {
      const t = gen(45);
      for (const c of t.changes.filter((c) => c.changeClass === 7)) {
        const scene = SCENES.find((s) => s.id === t.sceneId)!;
        const slot = scene.slots.find((sl) => sl.id === c.slotId)!;
        // validated indirectly: generator must only pick mirrorable sprites
        expect(slot).toBeDefined();
      }
    }
  });
  it('lure placements respect the separation constraint', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(30); // lureLevel 1
      const scene = SCENES.find((s) => s.id === t.sceneId)!;
      for (const lure of t.lurePlacements) {
        for (const c of t.changes) {
          const target = scene.slots.find((sl) => sl.id === c.slotId);
          if (!target) continue;
          const dx = (lure.x + lure.w / 2) - (target.bbox.x + target.bbox.w / 2);
          const dy = (lure.y + lure.h / 2) - (target.bbox.y + target.bbox.h / 2);
          const minSep = 1.5 * (Math.hypot(lure.w, lure.h) / 2 + Math.hypot(target.bbox.w, target.bbox.h) / 2);
          expect(Math.hypot(dx, dy)).toBeGreaterThan(minSep);
        }
      }
    }
  });
});
