import type { Group } from './items';

/**
 * Colour tokens sampled from the Shopping List art kit (`assets-src/ShoppingList/`).
 *
 * The board is raster now, so this palette exists for the pieces that stay CSS: the HUD,
 * the caption and basket plates, the cart tray, the retention cover and the result card.
 * The scenery colours the old CSS backdrop needed are gone with it.
 */
export const COLOURS = {
  // HUD and headers: the kit's deep teal-navy.
  navyDeep:     '#0B2C38',
  navyHudTop:   '#1C5566',
  navyHudBot:   '#123C4C',
  navyLabel:    '#8FC4CE',
  navyPlate:    '#134E7A',
  navyPlateEdge:'#0C3757',

  // Paper and panels.
  cream:        '#F2E4C6',
  creamLight:   '#FAEFD6',
  creamSlot:    '#F6E9CC',
  creamBorder:  '#C9A055',
  slotDash:     '#C7A365',

  // The cart tray's wooden frame.
  woodLight:    '#C08A45',
  woodDark:     '#9A6428',
  woodDarker:   '#7A4E1E',

  ink:          '#4A3A22',
  inkSoft:      '#5C4A2E',
  inkSign:      '#1F4C36',

  amber:        '#F2A32B',
  amberEdge:    '#C77E15',

  green:        '#3FA33F',
  greenPick:    '#4CB050',
  greenEdge:    '#2C7A2E',
  greenResult:  '#2F7E33',
  greenMuted:   '#8FA987',
  greenBadge:   '#2E9E4A',

  redDeep:      '#C13A33',

  purple:       '#5B3E8E',
  purpleEdge:   '#402A69',
} as const;

export const CONFETTI_COLOURS = ['#EDBB2A', '#F5D778', '#D7443C', '#3D7CC9', '#FFFFFF', '#5AA83F'] as const;

/**
 * Fill for the placeholder panel a product falls back to when its sprite fails to load.
 * Tinted per group so a broken board still reads as a shelf rather than as grey boxes.
 */
export const GROUP_TINT: Record<Group, string> = {
  produce:   '#7FA85A',
  spices:    '#C98A2E',
  pulses:    '#A8763C',
  staples:   '#B79A63',
  pantry:    '#5C8FB5',
  household: '#8A7FB0',
};
