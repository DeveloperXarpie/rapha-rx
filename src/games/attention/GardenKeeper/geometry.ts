import type { GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';
import {
  COLOURS, FLOWER_SPECIES, PEST_POOL,
  type FlowerSpecies, type PestEntry, type PestKind, type PestSpecies,
} from './palette';

// ─── Canvas ───────────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 1280;
export const HUD_H = 108;
export const BOARD_H = CANVAS_H - HUD_H;

/**
 * The soil plate painted into `board.png`, in board coordinates. Measured by
 * `scripts/slice_garden_assets.py`, which prints these numbers - do not eyeball them.
 */
export const SOIL = { x: 45, y: 280, right: 760, bottom: 1107 } as const;

/**
 * The planting rectangle: the soil, inset so no sprite hangs off the plate.
 *
 * A plant is anchored at its base and drawn upward, so the inset is asymmetric in spirit
 * even though the numbers are not: the top needs roughly a sprite's height of clearance
 * (about 140px at the default size), while the sides need half a sprite's width.
 */
export const BED = { x: 110, y: 400, w: 580, h: 700 } as const;

/**
 * The band that must stay on screen on any viewport. The lantern badge sits at x6, which
 * is as far in as the left edge can come; the right is mirrored because the board is
 * centred. Outside it is only the garden wall. See lib/fitScale.ts `fitBoard`.
 */
export const SAFE_X = [6, CANVAS_W - 6] as const;

/** Edge colours of board.jpg - evening sky above, soil below. */
export const GROUND = { top: '#85CBDA', bottom: '#597733' } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

/** The two kinds that come off the delivered plant sheet, as raster art. */
export type FlowerKind = 'flower' | 'wilted';

/**
 * Everything the bed can hold.
 *
 * `wilted` is the sharpest distractor and stays the commonest one: a wilted rose beside a
 * blooming rose differs in exactly the dimension the player must attend to, which loads
 * attention harder than a toadstool that differs in every dimension at once. The
 * 2026-08-17 amendment made that case and it still holds.
 *
 * The three pest kinds are back alongside it, from the original handoff, because one
 * distractor type left the bed monotonous. They differ from `wilted` in what they cost
 * the player - nothing; both cost a heart - and in where their art comes from: pests are
 * CSS primitives (`pests.ts`), flowers are sprites.
 */
export type PlantKind = FlowerKind | PestKind;

/**
 * An insect's idle loop, rolled per instance so the bed does not twitch in lockstep.
 * Only insects carry it; weeds and toadstools are rooted.
 */
export interface IdleMotion {
  crawl: 'a' | 'b';
  durMs: number;
  delayMs: number;
}

interface PlantBase {
  id: string;
  x: number;
  y: number;
  /** 0 at the back of the bed, 1 at the front. */
  depth: number;
  /** Drawn sprite size in px. */
  size: number;
  /** Tap area in px, never below 96 however small the sprite draws. */
  hit: number;
}

/** A flower or a wilted flower: raster art, and the only kind that can hold a cycle. */
export type FlowerPlant = PlantBase & {
  kind: FlowerKind;
  species: FlowerSpecies;
  idle?: undefined;
};

/** A weed, insect or toadstool: CSS art, permanent scenery, and a heart if tapped. */
export type PestPlant = PlantBase & {
  kind: PestKind;
  species: PestSpecies;
  idle?: IdleMotion;
};

/**
 * Discriminated on `kind` so a pest species can never be handed to a sprite-URL builder.
 * `bee-wilted.png` does not exist, and this is what stops one being requested.
 */
export type Plant = FlowerPlant | PestPlant;

export function isPest(plant: Plant): plant is PestPlant {
  return plant.kind === 'weed' || plant.kind === 'insect' || plant.kind === 'poison';
}

/**
 * Sprite base sizes. Insects draw smaller than anything rooted, as the handoff specified -
 * a bee the size of a rose reads as a prop rather than as an insect. The tap target does
 * not follow it down; `hitSize` holds the floor at 96.
 */
export const INSECT_BASE = 82;
export const PLANT_BASE = 96;

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** An older hand on a tablet needs 96px whatever the perspective does to the sprite. */
export function hitSize(size: number): number {
  return Math.max(96, size);
}

/** Back rows sit hazier, so the bed recedes instead of tiling flat. */
export function recedeFor(depth: number): number {
  return lerp(0.16, 0, depth);
}

/** A denser bed needs more columns, or the rows run off the bottom of the soil. */
export function columnsFor(plantCount: number): number {
  return plantCount <= 12 ? 3 : plantCount <= 18 ? 4 : 5;
}

/** The plant asking for water always paints above the bed. */
export function zIndexFor(plant: Pick<Plant, 'y'>, active: boolean): number {
  return (active ? 20 : 1) + Math.min(6, Math.round((plant.y - BED.y) / 140));
}

// ─── Countdown ring ───────────────────────────────────────────────────────────

/**
 * Ring colour for the fraction of the thirst window still open.
 *
 * The swept arc is the primary signal and colour is the second, so this stays legible to
 * someone who cannot separate green from amber. Thresholds are the prototype's.
 */
export function ringColour(remain: number): string {
  if (remain > 0.5) return COLOURS.ringFull;
  if (remain > 0.22) return COLOURS.ringLow;
  return COLOURS.ringCritical;
}

/** Degrees of arc still filled, clamped so a late tick cannot sweep past a full circle. */
export function ringSweepDeg(remain: number): number {
  return Math.max(0, Math.min(1, remain)) * 360;
}

/**
 * Sprite file for a flower, relative to the public root. Pests are drawn rather than
 * sliced, so they are not expressible here and the type says so.
 */
export function spriteFor(plant: { kind: FlowerKind; species: FlowerSpecies }): string {
  return `/garden-assets/${plant.species}-${plant.kind === 'flower' ? 'bloom' : 'wilted'}.png`;
}

// ─── Bed construction ─────────────────────────────────────────────────────────

/**
 * Loose rows, never a visible grid: a jittered lattice sized to the plant count, then
 * sorted by y so nearer plants paint over further ones.
 *
 * Species are drawn freely for both flower kinds, so the same species can appear bloomed
 * in one spot and wilted in another. That is deliberate - it is the hardest useful version
 * of the discrimination - and it is also forced: ten species cannot cover 11 blooms and 13
 * wilted distractors disjointly at the top of the curve.
 *
 * `distractorRatio` is untouched by the return of the pests: the same number of tap
 * hazards stands on the bed as before, and they are simply no longer all the same thing.
 * The split holds `wilted` at the larger half, so the bloom-versus-wilted discrimination
 * stays the spine of the round and the pests supply variety rather than replace it.
 *
 * `rng` is injected rather than calling Math.random directly so the layout can be pinned
 * in tests. It must return [0, 1).
 */
export function buildBed(
  params: Pick<GardenKeeperDynamicParams, 'plantCount' | 'distractorRatio'>,
  rng: () => number = Math.random,
): Plant[] {
  const { plantCount, distractorRatio } = params;
  const rnd = (a: number, b: number) => a + rng() * (b - a);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const shuffled = <T>(arr: readonly T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const cols = columnsFor(plantCount);
  const rows = Math.ceil(plantCount / cols);
  const cw = BED.w / cols;
  const ch = BED.h / rows;

  const nDist = Math.round(plantCount * distractorRatio);
  // Wilted takes the larger half of the hazard budget on an odd count.
  const nWilted = Math.ceil(nDist / 2);
  const nPest = nDist - nWilted;

  // Each arm carries a single literal `kind`, so the map below can narrow both ways.
  // See the note on `PestEntry` for why a widened discriminant does not survive this.
  type Roster =
    | { kind: 'flower'; species: FlowerSpecies }
    | { kind: 'wilted'; species: FlowerSpecies }
    | PestEntry;

  const roster: Roster[] = [];
  for (let i = 0; i < plantCount - nDist; i++) {
    roster.push({ kind: 'flower', species: pick(FLOWER_SPECIES) });
  }
  for (let i = 0; i < nWilted; i++) {
    roster.push({ kind: 'wilted', species: pick(FLOWER_SPECIES) });
  }
  // Drawn cyclically from a shuffled pool, so a bed with room for four pests gets four
  // different ones rather than four rolls of the same die.
  const pool = shuffled(PEST_POOL);
  for (let i = 0; i < nPest; i++) {
    roster.push(pool[i % pool.length]);
  }

  return shuffled(roster)
    .map((r, i): Plant => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jx = rnd(-cw * 0.14, cw * 0.14);
      const jy = rnd(-ch * 0.12, ch * 0.12);
      const y = BED.y + ch * (row + 0.42) + jy;
      const depth = Math.max(0, Math.min(1, (y - BED.y) / BED.h));
      const base = r.kind === 'insect' ? INSECT_BASE : PLANT_BASE;
      const size = base * lerp(0.86, 1.14, depth);
      const common = {
        id: 'p' + i,
        x: BED.x + cw * (col + 0.5) + jx,
        y,
        depth,
        size,
        hit: hitSize(size),
      };
      if (r.kind === 'weed' || r.kind === 'insect' || r.kind === 'poison') {
        return {
          ...common,
          kind: r.kind,
          species: r.species,
          // Only insects move. A rooted weed with a crawl would read as a bug in the code
          // before it read as one on the bed.
          idle: r.kind === 'insect'
            ? {
              crawl: rng() < 0.5 ? 'a' : 'b',
              durMs: Math.round(rnd(5200, 8400)),
              delayMs: Math.round(rnd(0, 2600)),
            }
            : undefined,
        };
      }
      return { ...common, kind: r.kind, species: r.species };
    })
    .sort((a, b) => a.y - b.y);
}
