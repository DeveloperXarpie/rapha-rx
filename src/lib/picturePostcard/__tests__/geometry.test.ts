import { describe, it, expect } from 'vitest';
import { changeBBox, annotationBBox, SPRITE_RENDER_SCALE } from '../../../games/memory/PicturePostcard/geometry';
import type { SceneDef } from '../../../games/memory/PicturePostcard/scenes';

const slot = {
  id: 'a', category: 'thing', bbox: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
  salience: 2 as const, centrality: 2 as const, imageSrc: '/x.webp',
};

const vectorScene = { id: 'v', theme: 't', background: [], slots: [slot] } as unknown as SceneDef;
const photoScene = { ...vectorScene, id: 'p', renderScale: 1 } as unknown as SceneDef;

describe('geometry renderScale', () => {
  it('defaults to SPRITE_RENDER_SCALE when the scene does not set one', () => {
    const b = changeBBox(vectorScene, { changeClass: 1, slotId: 'a' })!;
    expect(b.w).toBeCloseTo(0.2 * SPRITE_RENDER_SCALE, 6);
    expect(b.x + b.w / 2).toBeCloseTo(0.5, 6); // centre is inflation-invariant
  });

  it('honours a per-scene renderScale of 1 for raster scenes', () => {
    const b = changeBBox(photoScene, { changeClass: 1, slotId: 'a' })!;
    expect(b).toEqual({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
  });

  it('applies the same scale to annotationBBox', () => {
    expect(annotationBBox(photoScene, { changeClass: 1, slotId: 'a' }, 'original'))
      .toEqual({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
  });
});
