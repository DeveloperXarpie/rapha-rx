import type { GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';
import { COLOURS, FLOWER_SPECIES, type FlowerSpecies } from './palette';

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

/**
 * Two kinds only. The distractor is an already-wilted flower rather than a weed, insect or
 * toadstool: see the 2026-08-17 amendment. A wilted rose beside a blooming rose differs in
 * exactly the dimension the player must attend to, which is a harder and cleaner
 * discrimination than a toadstool, which differs in every dimension at once.
 */
export type PlantKind = 'flower' | 'wilted';

export interface Plant {
  id: string;
  kind: PlantKind;
  species: FlowerSpecies;
  x: number;
  y: number;
  /** 0 at the back of the bed, 1 at the front. */
  depth: number;
  /** Drawn sprite size in px. */
  size: number;
  /** Tap area in px, never below 96 however small the sprite draws. */
  hit: number;
}

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

/** Sprite file for a plant, relative to the public root. */
export function spriteFor(plant: Pick<Plant, 'kind' | 'species'>): string {
  return `/garden-assets/${plant.species}-${plant.kind === 'flower' ? 'bloom' : 'wilted'}.png`;
}

// ─── Bed construction ─────────────────────────────────────────────────────────

/**
 * Loose rows, never a visible grid: a jittered lattice sized to the plant count, then
 * sorted by y so nearer plants paint over further ones.
 *
 * Species are drawn freely for both kinds, so the same species can appear bloomed in one
 * spot and wilted in another. That is deliberate - it is the hardest useful version of the
 * discrimination - and it is also forced: ten species cannot cover 11 blooms and 13 wilted
 * distractors disjointly at the top of the curve.
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
  const roster: { kind: PlantKind; species: FlowerSpecies }[] = [];
  for (let i = 0; i < plantCount - nDist; i++) {
    roster.push({ kind: 'flower', species: pick(FLOWER_SPECIES) });
  }
  for (let i = 0; i < nDist; i++) {
    roster.push({ kind: 'wilted', species: pick(FLOWER_SPECIES) });
  }

  return shuffled(roster)
    .map((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jx = rnd(-cw * 0.14, cw * 0.14);
      const jy = rnd(-ch * 0.12, ch * 0.12);
      const y = BED.y + ch * (row + 0.42) + jy;
      const depth = Math.max(0, Math.min(1, (y - BED.y) / BED.h));
      const size = 96 * lerp(0.86, 1.14, depth);
      return {
        ...r,
        id: 'p' + i,
        x: BED.x + cw * (col + 0.5) + jx,
        y,
        depth,
        size,
        hit: hitSize(size),
      };
    })
    .sort((a, b) => a.y - b.y);
}
