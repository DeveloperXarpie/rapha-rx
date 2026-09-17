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
  /**
   * The instruction panel's fill, sampled off the Sep-17 review mockups. A shade
   * deeper and cooler than `navy`, which is a header-bar and body-copy colour; this
   * one has to carry white text at a distance across four different game boards.
   */
  instruction: '#183D81',
  /** The rim that holds the instruction panel off a busy board. */
  instructionRim: 'rgba(255, 255, 255, 0.92)',
  /** Text on the instruction panel. */
  instructionText: '#FFFFFF',
} as const;

/**
 * The mask the Sep-17 review asked for under the instruction panel ("Background
 * masked"): it drops a board's scenery back a plane so white text on `instruction` blue
 * reads across a room, and so that what the resident actually has to look at is the
 * brightest thing on the screen.
 *
 * The value is what it is because it has to land on a particular colour, not merely be
 * dark: the reference render's masked grass sits at #416070 where the live board's is
 * #9EBA3F, and this opacity of this blue over that green comes out at #3E6071.
 *
 * A game does not paint it flat. It masks the scenery and leaves the places the resident
 * reads unmasked - see Train Yard, which cuts two holes in it.
 */
export const INSTRUCTION_SCRIM = 'rgba(30, 66, 130, 0.75)';

/**
 * The same colour at zero alpha, for the clear end of a gradient that fades the mask
 * out. Not `transparent`: that keyword is transparent *black*, and a gradient running
 * from it to an opaque colour is only free of a grey fringe because browsers happen to
 * interpolate premultiplied. Naming the colour does not rely on that.
 */
export const INSTRUCTION_SCRIM_CLEAR = 'rgba(30, 66, 130, 0)';
