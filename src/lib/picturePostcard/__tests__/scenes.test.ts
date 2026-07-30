import { describe, it, expect } from 'vitest';
import { SCENES } from '../../../games/memory/PicturePostcard/scenes';
import { SPRITES } from '../../../games/memory/PicturePostcard/sprites';

// Raster scenes carry no sprites, variants or lures. These assertions describe the
// vector scene contract only.
const VECTOR_SCENES = SCENES.filter((s) => !s.backgroundImage);

// spec SS5.2 build-time validation + SS5.3 lure-separation feasibility
describe('scene library validation (spec SS5.2)', () => {
  it('has 8 vector scenes plus 1 photo scene, each vector scene with >= 20 slots', () => {
    expect(SCENES.length).toBe(9);
    expect(VECTOR_SCENES.length).toBe(8);
    for (const scene of VECTOR_SCENES) {
      expect(scene.slots.length, `${scene.id} slot count`).toBeGreaterThanOrEqual(20);
    }
  });
  for (const scene of VECTOR_SCENES) {
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

describe('post-office photo scene', () => {
  const photo = SCENES.find((s) => s.id === 'post-office');

  it('is registered, pinned, and raster', () => {
    expect(photo).toBeDefined();
    expect(photo!.pinned).toBe(true);
    expect(photo!.renderScale).toBe(1);
    expect(photo!.backgroundImage).toBe('/pp/scenes/post-office/background.webp');
    expect(photo!.background).toHaveLength(0);
  });

  it('has exactly the ten marked items, each with an image and no vector payload', () => {
    expect(photo!.slots).toHaveLength(10);
    expect(photo!.slots.map((s) => s.id).sort()).toEqual([
      'bell', 'ink-pad', 'key', 'letter-opener', 'magnifier',
      'parcel', 'postcard', 'satchel', 'scale', 'stamp',
    ]);
    for (const s of photo!.slots) {
      expect(s.imageSrc, s.id).toBe(`/pp/scenes/post-office/items/${s.id}.webp`);
      expect(s.spriteId, s.id).toBeUndefined();
      expect(s.variants, s.id).toBeUndefined();
      expect(s.lures, s.id).toBeUndefined();
    }
  });

  it('has bboxes inside the frame', () => {
    for (const s of photo!.slots) {
      expect(s.bbox.x, s.id).toBeGreaterThanOrEqual(0);
      expect(s.bbox.y, s.id).toBeGreaterThanOrEqual(0);
      expect(s.bbox.x + s.bbox.w, s.id).toBeLessThanOrEqual(1);
      expect(s.bbox.y + s.bbox.h, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('can satisfy every salience composition the photo levels ask for', () => {
    const count = (n: number) => photo!.slots.filter((s) => s.salience === n).length;
    expect(count(3)).toBeGreaterThanOrEqual(1); // L1/L2/L3 each need one
    expect(count(2)).toBeGreaterThanOrEqual(2); // L3 needs two
    expect(count(1)).toBeGreaterThanOrEqual(1); // L2/L3 each need one
  });
});
