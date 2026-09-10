/**
 * Species and board colours for Garden Keeper.
 *
 * Flower artwork is raster, sliced from the design sheet into `public/garden-assets/`
 * (see `scripts/slice_garden_assets.py`), so there are no petal colourways here: each
 * species carries its own colour in its sprite. What remains is the species list and the
 * board furniture, which is still CSS.
 */

/** The ten species on the sheet. Every one has both a bloomed and a wilted sprite. */
export const FLOWER_SPECIES = [
  'rose', 'sunflower', 'lily', 'hydrangea', 'daisy',
  'marigold', 'hibiscus', 'aster', 'daffodil', 'peony',
] as const;

export type FlowerSpecies = (typeof FLOWER_SPECIES)[number];

/**
 * The bed's other hazards, restored from the original handoff.
 *
 * The 2026-08-17 amendment dropped weeds, insects and toadstools because the delivered
 * plant sheet holds none of them - only blooms and wilted blooms. They are back because
 * the bed needed more to attend to than one distractor type, and they are drawn from CSS
 * primitives in `pests.ts` until raster art exists. Nothing else in the game knows how
 * they are drawn.
 */
export const WEED_SPECIES = ['weedA', 'weedB'] as const;
export const INSECT_SPECIES = ['bee', 'ladybird', 'snail', 'caterpillar'] as const;
export const POISON_SPECIES = ['mushroom', 'carnivore'] as const;

export type WeedSpecies = (typeof WEED_SPECIES)[number];
export type InsectSpecies = (typeof INSECT_SPECIES)[number];
export type PoisonSpecies = (typeof POISON_SPECIES)[number];
export type PestSpecies = WeedSpecies | InsectSpecies | PoisonSpecies;

/**
 * The handoff's distractor pool, in its original order and multiplicity: `weedA` appears
 * twice, so weeds stay the commonest pest and the bed does not read as an insect farm.
 * Shuffled per bed and drawn cyclically, so a bed with room for four pests gets four
 * different ones rather than four of the same.
 */
export const PEST_POOL = [
  { kind: 'weed', species: 'weedA' },
  { kind: 'weed', species: 'weedB' },
  { kind: 'weed', species: 'weedA' },
  { kind: 'insect', species: 'bee' },
  { kind: 'insect', species: 'ladybird' },
  { kind: 'insect', species: 'snail' },
  { kind: 'insect', species: 'caterpillar' },
  { kind: 'poison', species: 'mushroom' },
  { kind: 'poison', species: 'carnivore' },
] as const satisfies readonly { kind: PestKind; species: PestSpecies }[];

/**
 * One entry of the pool, with `kind` kept as a literal per entry rather than widened to
 * `PestKind`.
 *
 * That distinction is load-bearing. A union arm whose discriminant is itself a union of
 * literals can be narrowed *into* but not *away from* - `kind !== 'weed' && ...` leaves
 * the arm standing with its species type intact - so widening here would silently cost
 * `buildBed` the narrowing that keeps a pest species out of a flower's slot.
 */
export type PestEntry = (typeof PEST_POOL)[number];

/** The three kinds that are drawn from primitives rather than from the sprite sheet. */
export type PestKind = 'weed' | 'insect' | 'poison';

export const COLOURS = {
  hudTop: '#2C5580',
  hudBot: '#1E3E63',
  hudEdge: '#14304F',
  hudLabel: '#9FC0DE',
  clockLow: '#FFB4A8',

  heartFilled: '#D7443C',
  heartSpent: 'rgba(255,255,255,.22)',

  barTrack: 'rgba(10,28,48,.55)',
  barFillA: '#8FD65C',
  barFillB: '#62B33C',

  cardSurface: '#FFF9EA',
  cardHeading: '#2E4A1E',
  legendBrown: '#6B5334',
  legendBlue: '#2F6BA8',
  warning: '#C13A33',

  skyTop: '#9FD8F0',
  skyBot: '#CFEBF7',
  soilTop: '#8A5A34',
  soilBot: '#6E4526',
  grass: '#5FA83C',
  grassDeep: '#3F7E2B',

  cream: '#FBEFD5',
  creamLight: '#FFF9EA',
  creamBorder: '#C9A76B',

  ink: '#4A3A22',
  inkDeep: '#3A2C18',

  /** The unspent part of the countdown ring. */
  ringTrack: 'rgba(255,255,255,.22)',
  ringFull: '#8FD65C',
  ringLow: '#FFC24D',
  ringCritical: '#FF7A6B',

  heart: '#D7443C',
  success: '#3F7E2B',
  error: '#C13A33',
} as const;
