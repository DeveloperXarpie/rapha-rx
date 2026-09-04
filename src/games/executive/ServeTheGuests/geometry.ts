/**
 * Board geometry, in the fixed design-pixel space of `public/bg_cook_pt.jpg`.
 *
 * The whole game is laid out at these coordinates and scaled to the play box with a single
 * transform, the same approach every other board takes. Every number below is measured
 * against the portrait plate, so moving an element means moving it here, not in the JSX.
 *
 * This replaces a 1920x1080 landscape layout. The one structural change that made it
 * pleasant: the counter tray used to be *painted into* the background, so the card bands
 * could not grow without redrawing the plate. In the portrait set the tray is a separate
 * transparent panel and the plate behind it is an empty courtyard, so the counter is now
 * free geometry.
 */

import { COUNTER_SIZE, SEAT_COUNT } from './model';
import { FRAMES } from './sprites';

export const CANVAS_W = 941;
export const CANVAS_H = 1672;

// ─── Counter tray ─────────────────────────────────────────────────────────────

/**
 * The tray panel, measured off the composed mock (`guests_ui_pt.png`, which is drawn at
 * this exact canvas size). The sprite is `pt-tray.png` and is 9-sliced, so these can move
 * or resize freely.
 */
export const TRAY_X = 27;
export const TRAY_Y = 913;
export const TRAY_W = 886;
export const TRAY_H = 720;

/**
 * The painted frame's thickness, as rendered. The sprite's own band is 34px at its native
 * 787px width; this is that scaled to `TRAY_W`, so the border-image slice and the interior
 * agree no matter what width the tray is given.
 */
export const TRAY_BAND = Math.round(34 * (TRAY_W / 787));

/** The tray's usable interior, which is what the cards divide up. */
export const TRAY_INNER_X = TRAY_X + TRAY_BAND;
export const TRAY_INNER_Y = TRAY_Y + TRAY_BAND;
export const TRAY_INNER_W = TRAY_W - TRAY_BAND * 2;
export const TRAY_INNER_H = TRAY_H - TRAY_BAND * 2;

// ─── Dish cards ───────────────────────────────────────────────────────────────

/**
 * The counter is a grid rather than the single row the landscape board used. Six dishes
 * across three columns give cards about 269px wide against the 111px eight-in-a-row would
 * have allowed here - the whole point of dropping to six.
 *
 * The tray art draws 4x2 cells, but only its frame is used and the cells are drawn from
 * these numbers, so the count is a parameter rather than a property of the art.
 */
export const DISH_COUNT = COUNTER_SIZE;
export const CARD_COLS = 3;
export const CARD_ROWS = Math.ceil(DISH_COUNT / CARD_COLS);

export const CARD_W = Math.floor(TRAY_INNER_W / CARD_COLS);
export const CARD_H = Math.floor(TRAY_INNER_H / CARD_ROWS);

export function cardX(index: number): number {
  return TRAY_INNER_X + (index % CARD_COLS) * CARD_W;
}

export function cardY(index: number): number {
  return TRAY_INNER_Y + Math.floor(index / CARD_COLS) * CARD_H;
}

/**
 * Card internals, as offsets from the card's own top-left.
 *
 * The dish image takes the lion's share, because it is what the player actually reads.
 * Unlike the landscape board these are not pinned to a painted tray, so the only
 * constraint is the card's own height.
 */
export const CARD_PAD = 10;
export const CARD_IMG_DY = CARD_PAD;
export const CARD_IMG_H = 196;
export const CARD_NAME_DY = CARD_IMG_DY + CARD_IMG_H + 6;
export const CARD_NAME_H = 44;

/**
 * The state button.
 *
 * The four painted buttons have different aspect ratios - DISPOSE carries a bin and stink
 * lines above its pill - so each is drawn at `BTN_W` wide, given the height its own art
 * asks for, and hung from the card's bottom. Bottom-aligning is what puts every pill on one
 * baseline, and it works because the pill is the lowest painted thing in all four.
 */
export const BTN_W = 196;
export const CARD_BTN_H = 68;
export const CARD_BTN_DY = CARD_H - CARD_PAD - CARD_BTN_H;

/** The cook-progress bar, along the bottom of the image band. */
export const COOK_BAR_W = 170;
export const COOK_BAR_H = 22;

// ─── Guests ───────────────────────────────────────────────────────────────────

export const SEAT_W = CANVAS_W / SEAT_COUNT;

/**
 * Rendered bust height. The busts are cropped at their own native sizes (see `FACE_CELLS`)
 * and scaled to this height, so every guest stands the same height above the counter no
 * matter how the artist drew them. Width follows from each bust's own aspect ratio.
 *
 * Sized against how much guest the mock shows: it puts the busts' crowns at y630 with the
 * tray top at y913, so 283px of guest stands above the counter. At 240 tall with a 72px
 * overlap only 168px showed and the guests read as sinking behind the panel.
 *
 * The ceiling is the seat, not the canvas: at 275 the widest bust (248x284 native) lands
 * at about 252px against a 235px seat, so neighbours' shoulders touch and the outer two
 * crop by about 8px at the canvas edge. Both match how the mock arranges them; going much
 * taller starts hiding one guest behind the next.
 */
export const FACE_H = 275;

/**
 * Faces are anchored below the tray's top edge so the guests read as standing behind the
 * counter, with the tray crossing their chests. The landscape board sat them exactly on
 * the counter line; the overlap is what sells the depth here, where the tray is a panel in
 * front rather than a painted surface.
 *
 * 28px is enough to read as "behind" without eating the bust: it leaves 247 of the 275
 * showing, against the mock's 283.
 */
export const FACE_BOTTOM_Y = TRAY_Y + 28;

export function faceCentreX(seat: number): number {
  return seat * SEAT_W + SEAT_W / 2;
}

/** The top of a bust, i.e. the crown of the guest's head. */
export const FACE_TOP_Y = FACE_BOTTOM_Y - FACE_H;

// ─── Order bubbles ────────────────────────────────────────────────────────────

/**
 * Bubbles float clear above the guest's head, tail pointing down at them. This is the
 * bubble's *bottom*; the tail hangs below it and the frame grows upward.
 */
export const BUBBLE_BOTTOM_Y = FACE_TOP_Y - 26;

/** The requested dish is the thing the player has to read across the room, so it is big. */
export const BUBBLE_ITEM_W = 112;
export const BUBBLE_ITEM_H = 92;
export const BUBBLE_ITEM_GAP = 6;

/**
 * Items wrap after two. A seat is 235px wide here, so three items in a single row would
 * make a bubble wider than the seat and the outer two guests' bubbles would collide or hang
 * off the board.
 */
export const BUBBLE_ITEM_COLS = 2;
export const PATIENCE_BAR_H = 22;

/** What the painted frame's border takes out of the bubble's width. */
const BUBBLE_PAD_X = FRAMES.orderBubble.slice[1] + FRAMES.orderBubble.slice[3];

/** The floor stops a one-item bubble shrinking to a stub around its single dish. */
const BUBBLE_MIN_W = 156;

export function bubbleWidth(itemCount: number): number {
  const cols = Math.min(itemCount, BUBBLE_ITEM_COLS);
  const items = cols * BUBBLE_ITEM_W + Math.max(0, cols - 1) * BUBBLE_ITEM_GAP;
  return Math.max(BUBBLE_MIN_W, items + BUBBLE_PAD_X);
}

/** The bubble's interior, which is what the patience bar spans. */
export function patienceBarWidth(itemCount: number): number {
  return bubbleWidth(itemCount) - BUBBLE_PAD_X;
}

/** Bubbles are centred over the guest they belong to, so the tail points at that head. */
export function bubbleCentreX(seat: number): number {
  return faceCentreX(seat);
}

// ─── HUD ──────────────────────────────────────────────────────────────────────

/**
 * The HUD is drawn in code rather than from the sheet's painted dial and score capsule:
 * both have their values baked into the art ("8", a 7-of-8 pip strip, and "000"), so they
 * cannot carry live state without being masked and overdrawn.
 *
 * Two small groups, not one big line: guests hangs under GameShell's level badge in the
 * top-left, score sits beside its exit in the top-right. Both of those are fixed
 * screen-size overlays over a board that scales, so their share of the canvas is largest
 * at the smallest board - the insets here clear them there.
 *
 * Sizes run about a third above the handoff's, which was drawn for a board read at arm's
 * length rather than by a resident holding a phone. The handoff anticipates this in its
 * legibility note and sanctions a 44px chip with a 22px count; these go a step further.
 */
export const HUD_Y = 22;

/**
 * Guests chip, below the level badge.
 *
 * The handoff's y72 was measured against a mock that draws the badge in board space. The
 * real badge is a fixed screen-size overlay, so at the smallest board it reaches y84 in
 * canvas terms and the two overlapped by 4 screen px. Measured at a 360px viewport, which
 * is the worst case: a larger board shrinks the badge's share of the canvas, never grows it.
 */
export const HUD_LEFT_X = 26;
export const GUEST_CHIP_Y = 104;
export const GUEST_CHIP_H = 46;
export const GUEST_DIAL = 32;
export const GUEST_FONT = 21;

/**
 * Score chip, left of the exit.
 *
 * The handoff's 92 was derived the same way as the guests y above and overlapped the exit
 * by 17 screen px at a 360px viewport. 156 clears it by 6px there; on a wider board the
 * exit's canvas footprint shrinks and the gap only opens further.
 */
export const HUD_RIGHT_X = 156;
export const SCORE_CAPSULE_H = 68;
export const SCORE_COIN = 40;
export const SCORE_FONT = 32;

/**
 * The capsule's 9-slice band, scaled down with the chip. At the frame's native 24/34 the
 * rim alone is taller than the chip and swallows the number.
 */
export const SCORE_FRAME_SCALE = 0.72;
