/**
 * Board geometry in the handoff's fixed 800px design-pixel space. The whole game lays out
 * at these coordinates and scales to the viewport with a single transform.
 */

export const HUD_H = 96;
export const BOARD_W = 800;
export const BOARD_H = 1180;
export const CANVAS_W = BOARD_W;
export const CANVAS_H = HUD_H + BOARD_H;

// ─── Shelf grid ───────────────────────────────────────────────────────────────

export const COL_X = [24, 216, 408, 600];
export const ROW_Y = [584, 726, 868];
export const CRATE_W = 176;
export const CRATE_H = 128;

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

export const CAPTION   = { left: 150, top: 16, width: 500 };
export const BASKET    = { left: 16, top: 122 };
export const HINT_BTN  = { right: 16, top: 122, width: 132, height: 108 };
export const LIST_CARD = { left: 232, top: 196, width: 336 };
export const BLIND     = { left: 224, top: 188, width: 352, height: 360, lift: 560 };
export const CART      = { left: 20, top: 1006, width: 760, height: 156 };

export const CART_BLOCK_W = 112;
export const SUBMIT_W = 172;
export const SLOT_GAP = 10;

/**
 * Slots shrink with list length so the strip always fits its 760px. The three widths are
 * fixed by the handoff rather than computed, because the computed value drifts a pixel or
 * two off the design at some lengths.
 */
export function slotWidth(listLength: number): number {
  if (listLength <= 4) return 100;
  if (listLength === 5) return 82;
  return 68;
}
