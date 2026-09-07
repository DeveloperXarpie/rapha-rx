import { describe, expect, it } from 'vitest';
import {
  CANVAS_H, CANVAS_W, CART, COL_X, CRATE_H, CRATE_W, DONE_BTN,
  PLANK_Y, ROW_Y, SHELF_COLS, SHELF_ROWS, crateBox,
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
    // bg-store.jpg puts the unit's interior at x = 78..735 at this canvas width.
    expect(COL_X[0]).toBeGreaterThanOrEqual(78);
    expect(COL_X[COL_X.length - 1] + CRATE_W).toBeLessThanOrEqual(735);
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
