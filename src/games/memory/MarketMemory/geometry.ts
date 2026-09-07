/**
 * Board geometry in a fixed 800px-wide design space. The whole game lays out at these
 * coordinates and scales to the viewport with a single transform.
 *
 * The canvas is sized to the artwork: `bg-store.jpg` is 1280 x 2000, so at 800 wide it
 * is 1250 tall. Both backgrounds are full-bleed and the HUD is painted over the top of
 * them rather than sitting in a band above.
 *
 * Every number below was measured off the shipped art by sampling its pixels, not
 * estimated: the plank front edges are the six brightest horizontal bands inside the
 * unit, and they came back evenly spaced 135px apart.
 *
 * The canvas ratio is 0.64, which is exactly the portrait column's cap in
 * styles/index.css. That is safe rather than marginal - lib/__tests__/portraitColumn.test.ts
 * holds it - because the play box GameShell hands a board is always shorter than the
 * viewport, so height keeps binding before the column does.
 *
 * `bg-home.jpg` is still the old 941 x 1672 plate and is therefore `cover`-cropped by
 * about 171px vertically here. It reads fine as a backdrop; replace it with a 1280 x 2000
 * home plate when one exists and the crop goes away.
 */

export const CANVAS_W = 800;
export const CANVAS_H = 1250;
export const HUD_H = 96;

/** The board is the whole canvas - the backgrounds run under the HUD. */
export const BOARD_W = CANVAS_W;
export const BOARD_H = CANVAS_H;

// ─── Shelf grid ───────────────────────────────────────────────────────────────

/**
 * Column left edges. The unit's interior runs x 78..735, and four 150px crates with
 * 13px between them centre inside it.
 */
export const COL_X = [82, 245, 408, 571];

/**
 * The plank surfaces. Goods stand on the top four; the fifth is covered by the cart
 * tray, exactly as the spare planks were on the art before this one.
 *
 * The unit sits lower on this backdrop - its top rail is at y 269, where the previous
 * one started at 138 - so the first row of goods starts further down the board.
 */
export const PLANK_Y = [421, 561, 696, 831, 967];

/** How many plank rows carry goods. The rest are behind the cart. */
export const SHELF_ROWS = 4;
export const SHELF_COLS = 4;

export const CRATE_W = 150;

/**
 * Exactly the compartment height, so crates tile the shelf without overlapping.
 *
 * An earlier pass made this 153 and hung the name plate over the shelf's front lip, to
 * win the product art some height back. That does not work: crates paint in index order,
 * so a plate hanging into the compartment below is painted over by the next row's
 * product rather than sitting in front of it, and the goods below lose their top 18px.
 * The plate stands on the deck instead, and the product takes the smaller size.
 */
export const CRATE_H = 135;

export interface Box { left: number; top: number; width: number; height: number }

/**
 * Crate i sits at column i % SHELF_COLS, row floor(i / SHELF_COLS).
 *
 * The top is derived from the plank rather than written down, so the goods can never
 * drift off the wood when CRATE_H changes - they did once, when the offsets were
 * literals with a comment explaining the relationship.
 */
export function crateBox(i: number): Box {
  const row = Math.floor(i / SHELF_COLS);
  return {
    left: COL_X[i % SHELF_COLS],
    top: PLANK_Y[row] - CRATE_H,
    width: CRATE_W,
    height: CRATE_H,
  };
}

/** Crate tops, in row order. Kept for the tests that assert the grid's shape. */
export const ROW_Y = PLANK_Y.slice(0, SHELF_ROWS).map((y) => y - CRATE_H);

// ─── Fixed furniture ──────────────────────────────────────────────────────────

/**
 * The caption sits between the HUD bar and the shelf unit, whose top rail is at y 269.
 * The first row of crates starts at y 286, so there is plenty of room here - but it
 * stays a single line, because two lines is the shape that covered the goods when the
 * unit sat higher, and the copy was rewritten to suit. That is a 54px slot, so the caption is a single line - the old
 * two-line panel would have covered the top row of goods. The shopping caption's copy
 * was shortened to suit.
 */
export const CAPTION = { left: 150, top: 100, width: 500 };

/**
 * HINT is a round button centred in the HUD bar now. The old 132 x 116 tile lived at
 * y 196, which is inside the shelf on this art.
 *
 * Centred rather than tucked into a corner because GameShell insets its level badge and
 * exit button 8px from the board's *rendered* corners, in viewport pixels - so how much
 * of this board's top-left and top-right they cover changes with the stage scale. The
 * middle of the bar is the only part that is reliably the game's own.
 */
export const HINT_BTN = { left: 364, top: 12, size: 72 };

/**
 * The clipboard sprite, `ui-clipboard.png`, is 465 x 868. Drawn at 430 wide it keeps its
 * aspect at 803 tall, which fits the shorter canvas with the READY button below it.
 */
export const CLIPBOARD = { left: 185, top: 150, width: 430, height: 803 };

/**
 * The cream paper inside that sprite, measured on the sliced PNG at x = 26..433,
 * y = 116..826, scaled to the width above and expressed in board coordinates.
 */
export const CLIPBOARD_PAPER = {
  left: CLIPBOARD.left + 24,
  top: CLIPBOARD.top + 108,
  width: 380,
  height: 663,
};

/** The retention cover. Full canvas - see the note in Blind.tsx. */
export const BLIND = { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, lift: CANVAS_H };

export const READY_BTN = { left: 250, top: 975, width: 300, height: 166 };

/** Covers the sixth plank and the floor below it, starting clear of row 5. */
export const CART = { left: 20, top: 856, width: 760, height: 220 };
export const CART_HEADER_H = 52;
export const CART_PAD = 14;
export const SLOT_GAP = 10;

export const DONE_BTN = { left: 250, top: 1090, width: 300, height: 147 };

/**
 * Slots shrink as the list grows so the row always fits the tray's inner width of
 * 732px: six 118s and five gaps come to 758 at the widest, so six 112s and five gaps
 * come to 722 and clear it.
 */
export function slotWidth(listLength: number): number {
  if (listLength <= 4) return 140;
  if (listLength === 5) return 128;
  return 112;
}
