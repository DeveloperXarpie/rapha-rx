import { describe, it, expect } from 'vitest';
import { pestLayers } from '../pests';
import { PEST_POOL, INSECT_SPECIES, POISON_SPECIES, WEED_SPECIES } from '../palette';

describe('pestLayers', () => {
  it('draws every species in the pool', () => {
    // A species that returns nothing renders an invisible hazard: a 96px tap target that
    // costs a heart and shows the player nothing to avoid. Nothing else would catch it.
    for (const p of PEST_POOL) {
      expect(pestLayers(p.kind, p.species, 82).length).toBeGreaterThan(0);
    }
  });

  it('covers every species of every family, not just the ones the pool happens to hold', () => {
    for (const species of WEED_SPECIES) {
      expect(pestLayers('weed', species, 82).length).toBeGreaterThan(0);
    }
    for (const species of INSECT_SPECIES) {
      expect(pestLayers('insect', species, 82).length).toBeGreaterThan(0);
    }
    for (const species of POISON_SPECIES) {
      expect(pestLayers('poison', species, 82).length).toBeGreaterThan(0);
    }
  });

  it('gives every layer a unique key', () => {
    for (const p of PEST_POOL) {
      const keys = pestLayers(p.kind, p.species, 82).map((l) => l.key);
      expect(new Set(keys).size).toBe(keys.length);
    }
  });

  it('positions every layer absolutely inside the sprite box', () => {
    for (const p of PEST_POOL) {
      for (const l of pestLayers(p.kind, p.species, 82)) {
        expect(l.style.position).toBe('absolute');
      }
    }
  });

  it('scales linearly with the stage size, so one species draws alike on bed and card', () => {
    // This is the property that lets the intro legend render a toadstool at 58px from the
    // same code the bed renders it at 82. Doubling the box must double every measurement.
    for (const p of PEST_POOL) {
      const small = pestLayers(p.kind, p.species, 50);
      const large = pestLayers(p.kind, p.species, 100);
      expect(small).toHaveLength(large.length);
      for (let i = 0; i < small.length; i++) {
        const a = small[i].style;
        const b = large[i].style;
        if (typeof a.width === 'number' && typeof b.width === 'number') {
          expect(b.width).toBeCloseTo(a.width * 2, 6);
        }
        if (typeof a.height === 'number' && typeof b.height === 'number') {
          expect(b.height).toBeCloseTo(a.height * 2, 6);
        }
      }
    }
  });

  it('separates weedA from weedB, or the two are the same hazard twice', () => {
    const a = pestLayers('weed', 'weedA', 82);
    const b = pestLayers('weed', 'weedB', 82);
    expect(b.length).toBeGreaterThan(a.length);
  });
});
