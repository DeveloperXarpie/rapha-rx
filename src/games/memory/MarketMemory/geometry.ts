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

/**
 * The chrome strip across the top of the board. The Sep-9 review repaints it from
 * the old deep navy to the kit's near-white, but keeps it: GameShell's level plate
 * and exit sit on it, and the mock shows the board art starting below it.
 */
export const HUD_H = 96;

/** The board is the whole canvas - the backgrounds run under the HUD. */
export const BOARD_W = CANVAS_W;
export const BOARD_H = CANVAS_H;

// ─── The backdrop, and the grid derived from it ────────────────────────────────

/**
 * `bg-store.jpg` in its own pixels, and the plank front edges measured in them.
 *
 * Everything about the shelf is derived from these two facts, so the zoom below can
 * change without any number here being re-measured by hand.
 */
const ART_W = 1280;
const ART_H = 2000;
const ART_PLANK_Y = [674, 897, 1114, 1330, 1547];
/** The unit's interior, in art pixels. */
const ART_INTERIOR_X = [125, 1176];

/**
 * How much taller than the board the backdrop is drawn. Vertical only.
 *
 * Drawn 1:1 the art's compartments are 135px apart, and a crate's contents - a 79px
 * product above a 50px name plate - come to 129px. The shelf board above eats about
 * 18px of that, so the goods ran into the underside of the shelf above them. The art
 * cannot be redrawn from here, so the backdrop is stretched instead: the compartments
 * grow and the crate contents, which are sized in board pixels, do not.
 *
 * Deliberately not a uniform zoom. Scaling both axes by this much crops 48px off each
 * side, which takes the unit's own frame rails off the board and stops it reading as a
 * freestanding shelf. Stretching one axis costs a 12% distortion of the wood grain and
 * the blurred scenery instead, which is not noticeable, and keeps the unit whole.
 *
 * The cost is a crop of 120px off the top - ceiling - and 30px off the bottom floor.
 */
export const BG_STRETCH_Y = 1.12;
/** How far up the stretched backdrop is pulled, so the crop lands on ceiling not floor. */
export const BG_OFFSET_Y = -120;

/**
 * Where the backdrop is drawn. Scene paints both layers into this box, and because it is
 * a different shape from the art it must be drawn with `object-fit: fill`.
 */
export const BG = {
  left: 0,
  top: BG_OFFSET_Y,
  width: CANVAS_W,
  height: CANVAS_H * BG_STRETCH_Y,
};

/** Art pixels to board pixels. X is untouched; Y carries the stretch and the offset. */
const artX = (x: number) => Math.round(x * (BG.width / ART_W));
const artY = (y: number) => Math.round(y * (BG.height / ART_H) + BG.top);

/**
 * The plank surfaces. Goods stand on the top four; the fifth is covered by the cart
 * tray, exactly as the spare planks were on the art before this one.
 */
export const PLANK_Y = ART_PLANK_Y.map(artY);

/** How many plank rows carry goods. The rest are behind the cart. */
export const SHELF_ROWS = 4;
export const SHELF_COLS = 4;

/** The unit's interior in board pixels, which the columns are centred inside. */
export const INTERIOR_X = ART_INTERIOR_X.map(artX) as [number, number];

export const CRATE_W = 150;
const COL_GAP = 15;

/** Column left edges, centred in the unit's interior rather than written down. */
export const COL_X = Array.from({ length: 4 }, (_, i) => {
  const span = 4 * CRATE_W + 3 * COL_GAP;
  const start = INTERIOR_X[0] + Math.round((INTERIOR_X[1] - INTERIOR_X[0] - span) / 2);
  return start + i * (CRATE_W + COL_GAP);
});

/**
 * The compartment height, taken from the tightest of the five gaps so crates tile the
 * shelf without ever overlapping.
 *
 * An earlier pass made this taller than the compartment and hung the name plate over the
 * shelf's front lip, to win the product art some height back. That does not work: crates
 * paint in index order, so a plate hanging into the compartment below is painted over by
 * the next row's product rather than sitting in front of it, and the goods below lose
 * their top 18px. The plate stands on the deck instead.
 */
export const CRATE_H = 151;

/**
 * Empty space reserved at the top of every crate.
 *
 * The shelf board above a compartment is painted about 18px thick, and a crate spans the
 * whole compartment, so without this the product art is drawn hard against the underside
 * of the shelf above it and reads as jammed in. This is the gap that keeps the goods
 * clear of it.
 */
export const CRATE_TOP_CLEARANCE = 22;

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
 * The caption sits in the gap between the chrome strip, which ends at HUD_H plus its
 * 4px rule, and the first row of crates at `crateBox(0).top`.
 *
 * It stays a single line: two lines is the shape that covered the goods when the unit
 * sat higher, and the copy was rewritten to suit.
 */
/*
 * Height and font size are declared here, not just the top, because the clipboard's
 * top is derived from this plate's bottom edge and the Sep-10 review asked for both
 * to grow. The plate is drawn as a fixed-height flex box rather than padding around
 * the text, so this height is what it actually occupies and CAPTION_CLEARANCE below
 * can be trusted.
 *
 * Centred at 640 wide: 80px of shop floor either side. The old 500 could not hold
 * "Remember and Collect items" at this size on one line, and the plate does not wrap
 * - see the note on the caption in index.tsx.
 */
export const CAPTION = { left: 80, top: 120, width: 640, height: 72, fontSize: 30 };

/**
 * Clear air between the caption plate and whatever the phase puts under it.
 *
 * The Sep-17 review asked for the clipboard and READY to move down and "give space for
 * the instruction panel", and its follow-up asked for the panel itself to come down
 * too. The two pull in opposite directions on a canvas with 29px to spare at the
 * bottom, so the panel took the 16px and this gave most of it back: the clipboard sits
 * where the first pass left it, and the extra air is above the panel rather than below.
 */
export const CAPTION_CLEARANCE = 26;

/**
 * The clipboard sprite, `ui-clipboard.png`, is 465 x 868. Drawn at 430 wide it keeps its
 * aspect at 803 tall, which fits the shorter canvas with the READY button below it.
 *
 * Its top hangs off the caption rather than being written down, which is the Sep-10
 * review's "give space for the instruction panel": the panel grew, so the clipboard
 * and the READY button below it move down by exactly as much as it grew.
 */
export const CLIPBOARD = {
  left: 185,
  top: CAPTION.top + CAPTION.height + CAPTION_CLEARANCE,
  width: 430,
  height: 803,
};

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

/** `ui-clipboard.png` in its own pixels, so the rules below can be converted. */
const ART_CLIPBOARD_W = 465;

/**
 * The rules printed on the clipboard, sampled off the sliced art as the eight
 * dark horizontal bands inside the paper. Evenly spaced 76 art px apart.
 *
 * The Sep-9 review's "alignment issue" is what happens without these: the rows
 * used to be a flex column centred on the paper, at a row height that had
 * nothing to do with the printed rules, so an item's name landed wherever it
 * fell - usually straight across a line. A row belongs in the band BETWEEN two
 * rules, which is what these coordinates are for.
 */
const ART_RULE_Y = [191, 267, 344, 420, 495, 573, 648, 723];

/** Rule positions in board pixels. */
export const LIST_RULE_Y = ART_RULE_Y.map(
  (y) => Math.round(CLIPBOARD.top + y * (CLIPBOARD.width / ART_CLIPBOARD_W)),
);

/** Writing bands, one fewer than the rules that bound them. */
export const LIST_BANDS = LIST_RULE_Y.length - 1;

/** The height of one band, which is every row's height. */
export const LIST_ROW_H = Math.round(
  (LIST_RULE_Y[LIST_RULE_Y.length - 1] - LIST_RULE_Y[0]) / LIST_BANDS,
);

/**
 * The first band an `n`-item list occupies, so the block sits centred on the
 * page in whole bands rather than straddling them.
 */
export function listStartBand(n: number): number {
  return Math.max(0, Math.floor((LIST_BANDS - n) / 2));
}

/** The retention cover. Full canvas - see the note in Blind.tsx. */
export const BLIND = { left: 0, top: 0, width: CANVAS_W, height: CANVAS_H, lift: CANVAS_H };

/**
 * 20% wider than the 300x166 it was, per the Sep-9 review, and re-centred at that
 * width. `ui-ready.png` is 328x182, so the 1.80 ratio is the art's own.
 *
 * It rides just under the clipboard - the 2px is not a gap so much as the art's own
 * transparent margin meeting the sprite's - so moving the clipboard down moves this
 * with it. At the Sep-10 positions it ends at y 1193, just inside where DONE ends in
 * the shopping phase, so the two phases put their button in the same place.
 */
export const READY_BTN = {
  left: 220,
  top: CLIPBOARD.top + CLIPBOARD.height + 2,
  width: 360,
  height: 200,
};

/** Covers the sixth plank and the floor below it, starting clear of row 5. */
export const CART = { left: 20, top: 856, width: 760, height: 220 };
export const CART_HEADER_H = 52;

/**
 * HINT, straddling the cart's top-left corner, where the Sep-9 review put it. It
 * used to sit in the middle of a HUD bar across the top of the board; that bar is
 * gone, and the shell's level plate now occupies the space it held.
 *
 * `ui_icon_hint_.png` is 72x64, and the ratio is kept so the badge baked into its
 * top-left corner stays circular. Deliberately overhanging rather than tucked
 * inside: the cart header is only 52px tall and the disc is 76.
 */
export const HINT_BTN = {
  left: CART.left - 8,
  top: CART.top - 26,
  width: 86,
  height: 76,
};

/**
 * Where the remaining-count sits on that art, as a fraction of its box - the green
 * badge is painted into the PNG, so the number has to land on it rather than beside
 * it. Measured off the asset: badge centre (17.4%, 24.2%), diameter 33.3% of width.
 */
export const HINT_BADGE = { cx: 0.174, cy: 0.242, d: 0.333 } as const;
export const CART_PAD = 14;
export const SLOT_GAP = 10;

/** 20% smaller than the 300x147 it was, and re-centred at that width. */
export const DONE_BTN = { left: 280, top: 1096, width: 240, height: 118 };

/**
 * The band that must stay on screen on any viewport. The cart is the widest thing on the
 * board - its outer slots reach x20 and x780 - so only the 20px of shop floor outside it
 * is croppable. See lib/fitScale.ts `fitBoard`.
 */
export const SAFE_X = [CART.left, CANVAS_W - CART.left] as const;

/**
 * Edge colours of the two backgrounds, used to fill any height the board does not cover.
 * The list phase is the living room, the rest of the round is the shop aisle.
 */
export const GROUND = {
  home: { top: '#725228', bottom: '#74390B' },
  store: { top: '#AE8861', bottom: '#E5BB88' },
} as const;

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
