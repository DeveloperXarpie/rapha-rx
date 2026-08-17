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
  buttonGreen: '#6BA83C',
  buttonGreenEdge: '#4E7C29',

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

  ringTrack: 'rgba(255,255,255,.35)',
  ringFull: '#7ED957',
  ringLow: '#F0A92B',
  ringCritical: '#D7443C',

  heart: '#D7443C',
  success: '#3F7E2B',
  error: '#C13A33',
} as const;
