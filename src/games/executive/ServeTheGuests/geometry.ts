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
 * 240 rather than the landscape board's 224, but against a 235px seat rather than a 480px
 * one: the widest bust is about 248x266 native, so this lands it at roughly 224px wide and
 * it just clears its neighbours.
 */
export const FACE_H = 240;

/**
 * Faces are anchored below the tray's top edge so the guests read as standing behind the
 * counter, with the tray overlapping their chests. The landscape board sat them exactly on
 * the counter line; the overlap is what sells the depth here, where the tray is a panel in
 * front rather than a painted surface.
 */
export const FACE_BOTTOM_Y = TRAY_Y + 72;

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
 */
export const HUD_Y = 30;
export const HUD_LEFT_X = 34;
export const HUD_RIGHT_X = 34;
export const GUEST_DIAL = 92;
export const GUEST_CAPSULE_W = 240;

/** Score chip. Height matches the guest dial so the two HUD ends sit on one line. */
export const SCORE_CAPSULE_W = 230;
export const SCORE_CAPSULE_H = 92;

// ─── Title ────────────────────────────────────────────────────────────────────

/**
 * The painted title lockup, centred between the two HUD ends.
 *
 * Shipped at the user's request, with two known costs: the word is painted, so it stays
 * English on a Hindi or Kannada device, and the art reads "Tiffen" rather than "Tiffin".
 * GameShell hides its own title banner for this game so the two do not both appear.
 */
export const TITLE_W = 300;
export const TITLE_H = Math.round(TITLE_W * (238 / 422));

/**
 * Below the HUD row rather than beside it. Centred at this width the lockup runs x321..621
 * and the guests-left group ends at x344, so sitting them on one line overlapped by 23px.
 * Narrowing the capsules instead risked wrapping "GUESTS LEFT", and there is a whole empty
 * sky here to hang it in.
 */
export const TITLE_Y = HUD_Y + SCORE_CAPSULE_H + 24;
export const TITLE_X = Math.round((CANVAS_W - TITLE_W) / 2);
