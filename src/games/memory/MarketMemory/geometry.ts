/**
 * Board geometry in a fixed 800px-wide design space. The whole game lays out at these
 * coordinates and scales to the viewport with a single transform.
 *
 * The canvas is sized to the artwork: `bg-home.jpg` and `bg-store.jpg` are 941 x 1672, so
 * at 800 wide they are 1422 tall. Both backgrounds are full-bleed and the HUD is painted
 * over the top of them rather than sitting in a band above.
 *
 * The shelf numbers below are measured off `bg-store.jpg` scaled to 800 x 1422, not
 * eyeballed: the plank surfaces sit at y = 497, 655, 812, 970 and 1150, and the unit's
 * interior runs x = 120 to 695. Items stand on the top three planks; the lower two are
 * covered by the cart tray.
 */

export const CANVAS_W = 800;
export const CANVAS_H = 1422;
export const HUD_H = 96;

/** The board is the whole canvas - the backgrounds run under the HUD. */
export const BOARD_W = CANVAS_W;
export const BOARD_H = CANVAS_H;

// ─── Shelf grid ───────────────────────────────────────────────────────────────

export const COL_X = [121, 268, 415, 562];
/** Crate tops. Each is a plank surface minus CRATE_H, so goods stand on the wood. */
export const ROW_Y = [357, 515, 672];
export const CRATE_W = 132;
export const CRATE_H = 140;

export interface Box { left: number; top: number; width: number; height: number }

/** Crate i sits at column i % 4, row floor(i / 4). */
export function crateBox(i: number): Box {
  return {
    left: COL_X[i % 4],
    top: ROW_Y[Math.floor(i / 4)],
    width: CRATE_W,
    height: CRATE_H,
  };
}

// ─── Fixed furniture ──────────────────────────────────────────────────────────

export const CAPTION  = { left: 130, top: 108, width: 540 };
export const HINT_BTN = { right: 16, top: 196, width: 132, height: 116 };

/**
 * The clipboard sprite, `ui-clipboard.png`, is 465 x 868. It is drawn at 470 wide, so it
 * keeps its aspect at 877 tall.
 */
export const CLIPBOARD = { left: 165, top: 190, width: 470, height: 877 };

/**
 * The cream paper inside that sprite, measured on the sliced PNG at x = 26..433,
 * y = 116..826, expressed here in board coordinates. List rows are laid out inside it.
 */
export const CLIPBOARD_PAPER = {
  left: CLIPBOARD.left + 26,
  top: CLIPBOARD.top + 117,
  width: 411,
  height: 717,
};

/** The retention cover, sized to swallow the clipboard whole. */
export const BLIND = { left: 155, top: 178, width: 490, height: 901, lift: 1100 };

export const READY_BTN = { left: 250, top: 1096, width: 300, height: 166 };

export const CART = { left: 20, top: 900, width: 760, height: 240 };
export const CART_HEADER_H = 56;
export const CART_PAD = 16;
export const SLOT_GAP = 10;

export const DONE_BTN = { left: 250, top: 1172, width: 300, height: 147 };

/**
 * Slots shrink as the list grows so the row always fits the tray's inner width of
 * 728px: six 112s and five gaps come to 722.
 */
export function slotWidth(listLength: number): number {
  if (listLength <= 4) return 140;
  if (listLength === 5) return 128;
  return 112;
}
