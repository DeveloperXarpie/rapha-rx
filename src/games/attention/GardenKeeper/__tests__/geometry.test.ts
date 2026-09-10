import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../../../../lib/dynamicDifficulty';
import {
  BED, buildBed, columnsFor, hitSize, INSECT_BASE, isPest, PLANT_BASE,
  recedeFor, ringColour, ringSweepDeg, spriteFor, zIndexFor,
} from '../geometry';
import {
  COLOURS, FLOWER_SPECIES, INSECT_SPECIES, PEST_POOL, POISON_SPECIES, WEED_SPECIES,
} from '../palette';

/** Deterministic generator: cycles a fixed ramp so jitter, picks and shuffles are pinned. */
function seededRng() {
  const ramp = [0.1, 0.9, 0.35, 0.72, 0.05, 0.5, 0.88, 0.21];
  let i = 0;
  return () => ramp[i++ % ramp.length];
}

describe('buildBed', () => {
  it('builds exactly plantCount plants', () => {
    const p = getGardenKeeperParams(0.35);
    expect(buildBed(p, seededRng())).toHaveLength(16);
  });

  it('allocates the distractor share, rounded, however the hazards are split', () => {
    // The return of the pests must not change how many tap hazards stand on the bed -
    // only what they are. `distractorRatio` still governs the whole hazard budget.
    const p = getGardenKeeperParams(1); // 24 plants, ratio .55 -> 13 hazards
    const bed = buildBed(p, seededRng());
    const hazards = bed.filter((pl) => pl.kind !== 'flower');
    expect(hazards).toHaveLength(Math.round(24 * 0.55));
    expect(bed.filter((pl) => pl.kind === 'flower')).toHaveLength(24 - 13);
  });

  it('keeps wilted flowers the larger half of the hazard budget', () => {
    // The wilted-versus-bloomed discrimination is the spine of the round; the pests are
    // variety on top of it. If that ever inverts, the game has quietly become easier.
    for (const d of [0, 0.35, 0.6, 1]) {
      const bed = buildBed(getGardenKeeperParams(d), seededRng());
      const wilted = bed.filter((pl) => pl.kind === 'wilted').length;
      const pests = bed.filter(isPest).length;
      expect(wilted).toBeGreaterThanOrEqual(pests);
    }
  });

  it('puts weeds, insects and toadstools on the bed', () => {
    // At the top of the curve there are 6 pest slots against a 9-entry pool, so all three
    // families should be represented rather than one crowding the others out.
    const bed = buildBed(getGardenKeeperParams(1), seededRng());
    const kinds = new Set(bed.filter(isPest).map((pl) => pl.kind));
    expect(kinds.size).toBeGreaterThan(1);
    for (const k of kinds) expect(['weed', 'insect', 'poison']).toContain(k);
  });

  it('draws pests from the pool without repeating until the pool is exhausted', () => {
    const bed = buildBed(getGardenKeeperParams(1), seededRng());
    const pests = bed.filter(isPest);
    expect(pests.length).toBeLessThanOrEqual(PEST_POOL.length);
    const seen = pests.map((pl) => `${pl.kind}:${pl.species}`);
    // weedA appears twice in the pool, so that one pair is the only legal duplicate.
    const dupes = seen.length - new Set(seen).size;
    expect(dupes).toBeLessThanOrEqual(1);
  });

  it('gives every plant a species from its own family', () => {
    for (const pl of buildBed(getGardenKeeperParams(0.5), seededRng())) {
      if (pl.kind === 'weed') expect(WEED_SPECIES).toContain(pl.species);
      else if (pl.kind === 'insect') expect(INSECT_SPECIES).toContain(pl.species);
      else if (pl.kind === 'poison') expect(POISON_SPECIES).toContain(pl.species);
      else expect(FLOWER_SPECIES).toContain(pl.species);
    }
  });

  it('gives every insect an idle loop and leaves everything rooted without one', () => {
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      if (pl.kind === 'insect') {
        expect(pl.idle).toBeDefined();
        expect(['a', 'b']).toContain(pl.idle!.crawl);
        expect(pl.idle!.durMs).toBeGreaterThanOrEqual(5200);
        expect(pl.idle!.durMs).toBeLessThanOrEqual(8400);
        expect(pl.idle!.delayMs).toBeGreaterThanOrEqual(0);
        expect(pl.idle!.delayMs).toBeLessThanOrEqual(2600);
      } else {
        expect(pl.idle).toBeUndefined();
      }
    }
  });

  it('sorts ascending by y so nearer plants paint over further ones', () => {
    const bed = buildBed(getGardenKeeperParams(0.8), seededRng());
    const ys = bed.map((pl) => pl.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('keeps every plant inside the bed rectangle', () => {
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      expect(pl.x).toBeGreaterThan(BED.x);
      expect(pl.x).toBeLessThan(BED.x + BED.w);
      expect(pl.y).toBeGreaterThan(BED.y);
      expect(pl.y).toBeLessThan(BED.y + BED.h);
    }
  });

  it('keeps depth normalised', () => {
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      expect(pl.depth).toBeGreaterThanOrEqual(0);
      expect(pl.depth).toBeLessThanOrEqual(1);
    }
  });

  it('scales sprites with depth, off a smaller base for insects', () => {
    // A bee the size of a rose reads as a prop rather than as an insect, so insects keep
    // the handoff's second, smaller base.
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      const base = pl.kind === 'insect' ? INSECT_BASE : PLANT_BASE;
      expect(pl.size).toBeGreaterThanOrEqual(base * 0.86 - 0.001);
      expect(pl.size).toBeLessThanOrEqual(base * 1.14 + 0.001);
    }
  });

  it('never lets a hit target fall below 96px however small the sprite draws', () => {
    // The back row draws at 96 * 0.86 = 82.6px. The tap area must not follow it down.
    expect(hitSize(82.6)).toBe(96);
    expect(hitSize(96)).toBe(96);
    expect(hitSize(109.4)).toBeCloseTo(109.4, 6);
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      expect(pl.hit).toBeGreaterThanOrEqual(96);
    }
  });

  it('uses 3 columns up to 12 plants, 4 up to 18, 5 beyond', () => {
    // Wider beds need more columns or the rows run off the bottom of the soil.
    expect(columnsFor(11)).toBe(3);
    expect(columnsFor(12)).toBe(3);
    expect(columnsFor(13)).toBe(4);
    expect(columnsFor(18)).toBe(4);
    expect(columnsFor(19)).toBe(5);
    expect(columnsFor(24)).toBe(5);
  });

  it('is deterministic for a given rng', () => {
    const p = getGardenKeeperParams(0.6);
    expect(buildBed(p, seededRng())).toEqual(buildBed(p, seededRng()));
  });
});

describe('spriteFor', () => {
  it('maps kind and species onto the sliced sprite files', () => {
    expect(spriteFor({ kind: 'flower', species: 'rose' })).toBe('/garden-assets/rose-bloom.png');
    expect(spriteFor({ kind: 'wilted', species: 'peony' })).toBe('/garden-assets/peony-wilted.png');
  });
});

describe('depth helpers', () => {
  it('hazes the back of the bed and leaves the front clear', () => {
    expect(recedeFor(0)).toBeCloseTo(0.16, 6);
    expect(recedeFor(1)).toBeCloseTo(0, 6);
  });

  it('paints the active plant above the whole bed', () => {
    const back = { y: BED.y + 10 };
    const front = { y: BED.y + 800 };
    expect(zIndexFor(front, false)).toBeGreaterThan(zIndexFor(back, false));
    expect(zIndexFor(back, true)).toBeGreaterThan(zIndexFor(front, false));
  });

  it('caps the depth bonus so it can never reach the active band', () => {
    expect(zIndexFor({ y: BED.y + 100000 }, false)).toBe(7);
  });
});

describe('countdown ring', () => {
  it('sweeps a full circle at the start of the window and nothing at the end', () => {
    expect(ringSweepDeg(1)).toBe(360);
    expect(ringSweepDeg(0)).toBe(0);
    expect(ringSweepDeg(0.5)).toBe(180);
  });

  it('clamps a late tick instead of sweeping past a full circle', () => {
    // The ticker can fire after `until`, which makes remain negative, or before the
    // deadline is stamped, which makes it exceed 1. Neither may wrap the arc.
    expect(ringSweepDeg(-0.4)).toBe(0);
    expect(ringSweepDeg(1.8)).toBe(360);
  });

  it('runs green, then amber, then red as the window closes', () => {
    expect(ringColour(1)).toBe(COLOURS.ringFull);
    expect(ringColour(0.51)).toBe(COLOURS.ringFull);
    expect(ringColour(0.5)).toBe(COLOURS.ringLow);
    expect(ringColour(0.23)).toBe(COLOURS.ringLow);
    expect(ringColour(0.22)).toBe(COLOURS.ringCritical);
    expect(ringColour(0)).toBe(COLOURS.ringCritical);
  });

  it('gives all three states distinct colours', () => {
    // Colour is the second channel after arc length. If two states shared a colour the
    // redundancy would be gone for anyone reading colour first.
    const seen = new Set([ringColour(1), ringColour(0.4), ringColour(0.1)]);
    expect(seen.size).toBe(3);
  });
});
