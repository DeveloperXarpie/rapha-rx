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
import type { FlowerKind, PlantKind } from './geometry';
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
 * - `thriving`  the same bloom, watered, with no ring. Watering buys the flower life
 *               rather than resetting it, so it must not drop back to a sprout.
 * - `dried`     the species wilted, whether its window closed unwatered or its bloom
 *               simply ran out.
 *
 * A wilted distractor uses the same wilted bitmap as a dried flower, and that is
 * deliberate rather than a collision: a flower the player let die *becomes* something
 * they must not water, and the rules already agree, since only a `sprouted` plant can be
 * watered and anything else costs a heart.
 */
export function spriteUrl(kind: FlowerKind, species: FlowerSpecies, stage: Stage): string {
  if (kind === 'wilted') return wiltedUrl(species);
  if (stage === 'sprouted' || stage === 'thriving') return bloomUrl(species);
  if (stage === 'dried') return wiltedUrl(species);
  return SPROUT_URL;
}

// ─── Board furniture ──────────────────────────────────────────────────────────

/**
 * The painted board plate: sky, hills, fence, rose arch, flower borders and the soil bed.
 * It replaces the CSS bands the plan specified, and it is the authority on where the bed
 * is - `SOIL` in geometry.ts is measured from this image.
 */
export const BOARD_URL = `${BASE}/board.jpg`;

/** The warm glow behind a plant that is asking for water. */
export const GLOW_RING_URL = `${BASE}/ui-glow-ring.png`;

/** Watering-can roundel, used as the intro card's icon. */
export const BADGE_CAN_URL = `${BASE}/ui-badge-can.png`;

/** Garden lantern, pure decoration on the grass beside the bed. */
export const LANTERN_URL = `${BASE}/ui-lantern.png`;

/**
 * The watering can, used as the completion mark: it tips over a plant the moment its
 * watering lands, and it heads the round-complete card.
 *
 * The spec dropped the can as an *affordance* - there is nothing to pick up, the tap is
 * the whole interaction. This is the opposite job: confirmation after the fact.
 */
export const WATERING_CAN_URL = `${BASE}/ui-watering-can.png`;

/**
 * Board furniture that must be decoded before the first frame.
 *
 * The rest of the UI sheet is sliced but unused: the timer pill, the WATERED label, the
 * caption plate and the wooden sign all have English text baked into the artwork, so they
 * can carry neither a live value nor a Hindi or Kannada translation.
 */
export const FURNITURE_URLS: string[] = [
  BOARD_URL, GLOW_RING_URL, BADGE_CAN_URL, LANTERN_URL, WATERING_CAN_URL,
];

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
export function spriteUrlsFor(plants: readonly { kind: PlantKind; species: string }[]): string[] {
  const urls = new Set<string>([SPROUT_URL, ...FURNITURE_URLS]);
  for (const p of plants) {
    // Pests are CSS primitives, not sprites. Asking for `bee-wilted.png` would preload a
    // 404 and stall the round start on a file that does not exist.
    if (p.kind !== 'flower' && p.kind !== 'wilted') continue;
    const species = p.species as FlowerSpecies;
    urls.add(wiltedUrl(species));
    if (p.kind === 'flower') urls.add(bloomUrl(species));
  }
  return [...urls];
}
