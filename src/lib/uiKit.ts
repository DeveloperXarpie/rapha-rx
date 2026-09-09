/**
 * The shared UI kit delivered with the Sep-9 review (`assets-src/Sep-9/`).
 *
 * These are the pieces the review asked for by name, and they are shared: the
 * close button is the game shell's, the undo arrow is both Free Play's back
 * control and Market Memory's cart badge. Anything used by exactly one game
 * still belongs in that game's own `sprites.ts`.
 *
 * The two panel bitmaps in the handoff (`ui_panel_texthold`,
 * `ui_text panel_01`) are deliberately absent. Both are flat rounded
 * rectangles that have to stretch around translated text, and a nine-slice of
 * a 191x42 bitmap buys nothing a border-radius does not; they are CSS instead
 * (`.shell-tag-plate`, and Market Memory's panels). The colours they were
 * sampled from are in KIT_COLOURS.
 */

const BASE = '/ui';

/** Navy disc with a white cross. Redrawn at 512 from the 40px handoff art. */
export const UI_CLOSE_X = `${BASE}/close-x.png`;

/** Yellow disc, blue return arrow, navy rim. Carries its own green count badge. */
export const UI_HINT = `${BASE}/hint.png`;

/** Yellow disc with a blue return arrow, ringed in navy. */
export const UI_UNDO = `${BASE}/undo.png`;

/** Pale slot with a dashed blue border - a cart space, or a result tile. */
export const UI_PANEL_SELECTION = `${BASE}/panel-selection.png`;

/**
 * Sampled from the handoff PNGs rather than eyeballed, so CSS that stands in
 * for one of the bitmaps lands on the same colour the artist picked.
 */
export const KIT_COLOURS = {
  /** Panel bodies and the level plate. */
  panel: '#F4F4F4',
  /** Header bars, close disc, body copy on a pale panel. */
  navy: '#033E84',
  /** Selection-slot fill - the "light blueish" the review asked cream to become. */
  slot: '#D8D9E6',
  /** The dashed border drawn around a selection slot. */
  slotBorder: '#7881C6',
} as const;
