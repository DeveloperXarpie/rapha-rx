import { describe, expect, it } from 'vitest';
import {
  CANVAS_H, CANVAS_W, CAPTION, CAPTION_CLEARANCE, CART, CLIPBOARD, COL_X, CRATE_H,
  CRATE_TOP_CLEARANCE, CRATE_W, DONE_BTN, HUD_H, INTERIOR_X, PLANK_Y, READY_BTN,
  ROW_Y, SHELF_COLS, SHELF_ROWS, crateBox,
} from '../geometry';
import { CRATE_COUNT } from '../round';

describe('shelf grid', () => {
  it('stands every crate on a plank surface', () => {
    ROW_Y.forEach((top, i) => expect(top + CRATE_H).toBe(PLANK_Y[i]));
  });

  it('holds exactly the number of crates a round builds', () => {
    expect(SHELF_ROWS * SHELF_COLS).toBe(CRATE_COUNT);
  });

  it('leaves a plank spare for the cart tray to cover', () => {
    expect(PLANK_Y.length).toBeGreaterThan(SHELF_ROWS);
  });

  it('tiles the compartments exactly, so no crate overlaps the row below', () => {
    // Crates paint in index order, so an overlap here would put a row's name plate
    // underneath the next row's product rather than in front of it.
    for (let i = 1; i < ROW_Y.length; i++) {
      expect(ROW_Y[i]).toBeGreaterThanOrEqual(ROW_Y[i - 1] + CRATE_H);
    }
  });

  it('never overlaps two crates in the same row', () => {
    for (let i = 1; i < COL_X.length; i++) {
      expect(COL_X[i]).toBeGreaterThanOrEqual(COL_X[i - 1] + CRATE_W);
    }
  });

  it('keeps the whole shelf inside the unit painted on the backdrop', () => {
    // INTERIOR_X is measured off the art and moves with the backdrop zoom, so this
    // asserts the relationship rather than restating numbers that would go stale.
    expect(COL_X[0]).toBeGreaterThanOrEqual(INTERIOR_X[0]);
    expect(COL_X[COL_X.length - 1] + CRATE_W).toBeLessThanOrEqual(INTERIOR_X[1]);
  });

  it('centres the columns in the unit', () => {
    const leftGap = COL_X[0] - INTERIOR_X[0];
    const rightGap = INTERIOR_X[1] - (COL_X[COL_X.length - 1] + CRATE_W);
    expect(Math.abs(leftGap - rightGap)).toBeLessThanOrEqual(1);
  });

  it('leaves the goods clear of the shelf board above them', () => {
    // The whole point of the backdrop zoom: a crate's contents have to fit the
    // compartment with room to spare, or the product art jams into the shelf above.
    const shelfBoard = 18;
    expect(CRATE_TOP_CLEARANCE).toBeGreaterThanOrEqual(shelfBoard);
    for (let i = 1; i < PLANK_Y.length; i++) {
      expect(PLANK_Y[i] - PLANK_Y[i - 1], 'compartment must hold a crate').toBeGreaterThanOrEqual(CRATE_H);
    }
  });

  it('lays the crates out in row-major order', () => {
    expect(crateBox(0)).toMatchObject({ left: COL_X[0], top: ROW_Y[0] });
    expect(crateBox(SHELF_COLS - 1)).toMatchObject({ left: COL_X[SHELF_COLS - 1], top: ROW_Y[0] });
    expect(crateBox(SHELF_COLS)).toMatchObject({ left: COL_X[0], top: ROW_Y[1] });
    expect(crateBox(CRATE_COUNT - 1)).toMatchObject({
      left: COL_X[SHELF_COLS - 1], top: ROW_Y[SHELF_ROWS - 1],
    });
  });
});

/*
 * The Sep-10 review's "give space for the instruction panel". The panel, the clipboard
 * and READY are a single stack down the encoding screen, and the review's complaint was
 * that it had no slack in it: the panel's bottom edge landed exactly on the clipboard.
 * These hold the stack apart, and hold it on the board once it has been pushed down.
 */
describe('the encoding stack', () => {
  it('starts the caption below the chrome strip', () => {
    expect(CAPTION.top).toBeGreaterThanOrEqual(HUD_H);
  });

  it('leaves clear air between the caption and the clipboard', () => {
    expect(CLIPBOARD.top - (CAPTION.top + CAPTION.height)).toBe(CAPTION_CLEARANCE);
    expect(CAPTION_CLEARANCE).toBeGreaterThan(0);
  });

  it('keeps the clipboard and READY on the board', () => {
    expect(READY_BTN.top).toBeGreaterThanOrEqual(CLIPBOARD.top + CLIPBOARD.height);
    expect(READY_BTN.top + READY_BTN.height).toBeLessThanOrEqual(CANVAS_H);
  });

  it('centres the caption plate on the canvas', () => {
    expect(CAPTION.left).toBe(CANVAS_W - (CAPTION.left + CAPTION.width));
  });
});

describe('furniture below the shelf', () => {
  it('starts the cart below the last row of goods', () => {
    expect(CART.top).toBeGreaterThanOrEqual(PLANK_Y[SHELF_ROWS - 1]);
  });

  it('keeps the cart and the DONE button on the board', () => {
    expect(CART.left + CART.width).toBeLessThanOrEqual(CANVAS_W);
    expect(DONE_BTN.top + DONE_BTN.height).toBeLessThanOrEqual(CANVAS_H);
  });

  it('does not let the cart overlap the DONE button', () => {
    expect(DONE_BTN.top).toBeGreaterThanOrEqual(CART.top + CART.height);
  });
});
