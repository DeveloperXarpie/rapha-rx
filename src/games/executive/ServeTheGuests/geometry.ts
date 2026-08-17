/**
 * Board geometry, in the fixed design-pixel space of `public/bg_cook.png`.
 *
 * The whole game is laid out at these coordinates and scaled to the viewport with a single
 * transform, the same approach TrainYard takes. Every number below is measured against the
 * background plate, so moving a element means moving it here, not in the JSX.
 */

import { SEAT_COUNT } from './model';
import { FRAMES } from './sprites';

export const CANVAS_W = 1920;
export const CANVAS_H = 1080;

// ─── Counter ──────────────────────────────────────────────────────────────────

/**
 * The painted cream tray panel in the background plate. Guests stand behind this line and
 * the dish cards live inside it, so it is the one measurement everything else hangs off.
 */
export const COUNTER_Y = 776;

/** Horizontal inset of the tray's usable interior, matching the plate's rounded border. */
const TRAY_INSET_X = 56;

export const TRAY_W = CANVAS_W - TRAY_INSET_X * 2;

// ─── Dish cards ───────────────────────────────────────────────────────────────

export const DISH_COUNT = 8;
export const CARD_W = Math.floor(TRAY_W / DISH_COUNT);

export function cardX(index: number): number {
  return TRAY_INSET_X + index * CARD_W;
}

/**
 * Card internals. Measured off the background plate: the tray's cream interior runs y 796
 * to 1048, with its painted rim just outside that. The bands below bleed a few pixels over
 * the rim at each end, which the art carries fine, but they cannot go further - the tray is
 * painted into `bg_cook.png`, so growing this budget means redrawing the plate.
 *
 * The dish image takes the lion's share, because it is what the player actually reads. The
 * name and button were cut back to 30 and 46 to pay for it; `CARD_BTN_H` only sizes the
 * card's hit area, since the visible capsule is sized by its own padding.
 */
export const CARD_IMG_Y = 778;
export const CARD_IMG_H = 196;
export const CARD_NAME_Y = 976;
export const CARD_NAME_H = 30;
export const CARD_BTN_Y = 1006;
export const CARD_BTN_H = 46;

/**
 * The cook-progress bar sits along the bottom of the image band. It is 20 rather than the
 * 12 a flat bar needed: the painted bar art is 53px tall natively and its bevel turns to
 * mush much below this.
 */
export const COOK_BAR_W = 150;
export const COOK_BAR_H = 20;

// ─── Guests ───────────────────────────────────────────────────────────────────

export const SEAT_W = CANVAS_W / SEAT_COUNT;

/**
 * Rendered bust height. The busts are cropped at their own native sizes (see `FACE_CELLS`)
 * and scaled to this height, so every guest stands the same height above the counter no
 * matter how the artist drew them. Width follows from each bust's own aspect ratio.
 *
 * Deliberately modest: the guests say who is waiting, but the dishes are what the player
 * reads and acts on, so the busts give up the room.
 */
export const FACE_H = 224;

/** Faces are anchored to the counter line so the guests read as standing behind it. */
export const FACE_BOTTOM_Y = COUNTER_Y;

/**
 * Faces are centred on this line rather than left-aligned, because the busts are not all
 * the same width. It used to sit left of the seat centre to leave the order bubble room
 * beside the face; now the bubble is overhead and centred on this same line, so the seat
 * centre is what keeps a three-item bubble inside the board at the outer two seats.
 */
export function faceCentreX(seat: number): number {
  return seat * SEAT_W + SEAT_W / 2;
}

/** The top of a bust, i.e. the crown of the guest's head. */
export const FACE_TOP_Y = FACE_BOTTOM_Y - FACE_H;

// ─── Order bubbles ────────────────────────────────────────────────────────────

/**
 * Bubbles float clear above the guest's head, tail pointing down at them, rather than
 * alongside the face where they used to crowd it. This is the bubble's *bottom*; the tail
 * hangs below it and the frame grows upward.
 */
export const BUBBLE_BOTTOM_Y = FACE_TOP_Y - 28;

/** The requested dish is the thing the player has to read across the room, so it is big. */
export const BUBBLE_ITEM_W = 147;
export const BUBBLE_ITEM_H = 120;
export const BUBBLE_ITEM_GAP = 8;

/**
 * Items wrap after two. In a single row, three items this size make a 513px bubble - wider
 * than the 480px seat, so neighbouring guests' bubbles would collide and the outer two would
 * hang off the board. Wrapping spends the headroom that the smaller busts freed up instead.
 */
export const BUBBLE_ITEM_COLS = 2;
export const PATIENCE_BAR_H = 26;

/** What the painted frame's border takes out of the bubble's width. */
const BUBBLE_PAD_X = FRAMES.orderBubble.slice[1] + FRAMES.orderBubble.slice[3];

/** The floor stops a one-item bubble from shrinking to a stub around its single dish. */
const BUBBLE_MIN_W = 200;

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

export const HUD_Y = 26;
export const HUD_LEFT_X = 40;
export const HUD_RIGHT_X = 40;
export const GUEST_DIAL = 104;
export const GUEST_CAPSULE_W = 620;

/** Score chip. Height matches the guest dial so the two HUD ends sit on one line. */
export const SCORE_CAPSULE_W = 300;
export const SCORE_CAPSULE_H = 104;
