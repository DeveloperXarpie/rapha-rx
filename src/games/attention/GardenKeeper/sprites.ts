/**
 * Raster sprite catalogue for Garden Keeper.
 *
 * The original plan drew plants from CSS primitives. Real artwork arrived afterwards, so
 * this is the raster replacement: see `docs/superpowers/specs/2026-08-17-garden-keeper-amendment.md`.
 * Sprites are sliced from the design sheet by `scripts/slice_garden_assets.py` into
 * `public/garden-assets/`.
 *
 * Swapping the art again touches only this file.
 */

import type { Stage } from './model';
import type { PlantKind } from './geometry';
import { FLOWER_SPECIES, type FlowerSpecies } from './palette';

const BASE = '/garden-assets';

/** The dormant stage: a bare green shoot, shared by every species. */
export const SPROUT_URL = `${BASE}/sprout.png`;

export function bloomUrl(species: FlowerSpecies): string {
  return `${BASE}/${species}-bloom.png`;
}

export function wiltedUrl(species: FlowerSpecies): string {
  return `${BASE}/${species}-wilted.png`;
}

/**
 * Which bitmap a plant shows right now.
 *
 * The three flower stages map onto the sheet exactly as it was drawn:
 *
 * - `seed`      a bare sprout. Dormant, carries no ring, and is not worth a tap.
 * - `sprouted`  the species in bloom, wearing the countdown ring. This is the target.
 * - `dried`     the species wilted. The window closed unwatered.
 *
 * A wilted distractor uses the same wilted bitmap as a dried flower, and that is
 * deliberate rather than a collision: a flower the player let die *becomes* something
 * they must not water, and the rules already agree, since only a `sprouted` plant can be
 * watered and anything else costs a heart.
 */
export function spriteUrl(kind: PlantKind, species: FlowerSpecies, stage: Stage): string {
  if (kind === 'wilted') return wiltedUrl(species);
  if (stage === 'sprouted') return bloomUrl(species);
  if (stage === 'dried') return wiltedUrl(species);
  return SPROUT_URL;
}

/** Everything the board can paint, for preloading before the round starts. */
export const ALL_SPRITE_URLS: string[] = [
  SPROUT_URL,
  ...FLOWER_SPECIES.map(bloomUrl),
  ...FLOWER_SPECIES.map(wiltedUrl),
];

/**
 * Only the bitmaps this bed can actually show. A round uses at most a handful of species,
 * so preloading the whole catalogue would stall the start for art that never appears.
 */
export function spriteUrlsFor(plants: readonly { kind: PlantKind; species: FlowerSpecies }[]): string[] {
  const urls = new Set<string>([SPROUT_URL]);
  for (const p of plants) {
    urls.add(wiltedUrl(p.species));
    if (p.kind === 'flower') urls.add(bloomUrl(p.species));
  }
  return [...urls];
}
