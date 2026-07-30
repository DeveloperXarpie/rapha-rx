import { describe, it, expect } from 'vitest';
import { SCENES } from '../../../games/memory/PicturePostcard/scenes';
import { SPRITES } from '../../../games/memory/PicturePostcard/sprites';

// spec SS5.2 build-time validation + SS5.3 lure-separation feasibility
describe('scene library validation (spec SS5.2)', () => {
  it('has at least 1 scene now, 8 by Task 10, each with >= 20 slots', () => {
    expect(SCENES.length).toBe(8);
    for (const scene of SCENES) {
      expect(scene.slots.length, `${scene.id} slot count`).toBeGreaterThanOrEqual(20);
    }
  });
  for (const scene of SCENES) {
    describe(scene.id, () => {
      it('every slot references known sprites (base, alternate, lures)', () => {
        for (const s of scene.slots) {
          expect(SPRITES[s.spriteId!], `${s.id} sprite`).toBeDefined();
          expect(SPRITES[s.variants!.alternate], `${s.id} alternate`).toBeDefined();
          for (const l of s.lures!) expect(SPRITES[l], `${s.id} lure ${l}`).toBeDefined();
        }
      });
      it('colour-change eligibility: >= 3 alternate fills, all distinct from base (M3 4-option rule)', () => {
        for (const s of scene.slots) {
          expect(s.variants!.colours.length, s.id).toBeGreaterThanOrEqual(3);
          expect(new Set([s.baseFill!, ...s.variants!.colours]).size).toBe(s.variants!.colours.length + 1);
        }
      });
      it('slot ids unique; bboxes and altPositions inside the scene', () => {
        expect(new Set(scene.slots.map((s) => s.id)).size).toBe(scene.slots.length);
        for (const s of scene.slots) {
          expect(s.bbox.x).toBeGreaterThanOrEqual(0);
          expect(s.bbox.x + s.bbox.w).toBeLessThanOrEqual(1);
          expect(s.bbox.y).toBeGreaterThanOrEqual(0);
          expect(s.bbox.y + s.bbox.h).toBeLessThanOrEqual(1);
          for (const p of s.altPositions!) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + s.bbox.w).toBeLessThanOrEqual(1);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y + s.bbox.h).toBeLessThanOrEqual(1);
          }
        }
      });
      it('salience/centrality spread: at least 4 slots at salience 3 and 4 at centrality 3', () => {
        expect(scene.slots.filter((s) => s.salience === 3).length).toBeGreaterThanOrEqual(4);
        expect(scene.slots.filter((s) => s.centrality === 3).length).toBeGreaterThanOrEqual(4);
      });
      it('mirror changes only reachable via mirrorable sprites: >= 5 mirrorable slots per scene', () => {
        expect(scene.slots.filter((s) => SPRITES[s.spriteId!].mirrorable).length).toBeGreaterThanOrEqual(5);
      });
    });
  }
});
