import { describe, it, expect } from 'vitest';
import {
  CANVAS_W, CARD_H, CARD_W, cardX, cardY, faceCentreX, SEAT_W, TRAY_INNER_H, TRAY_INNER_W, TRAY_INNER_X, TRAY_INNER_Y,
} from '../geometry';

describe('seats (plan 3b)', () => {
  it('fills the width with four seats, as before', () => {
    expect([0, 1, 2, 3].map((s) => faceCentreX(s, 4))).toEqual([0, 1, 2, 3].map((s) => s * SEAT_W + SEAT_W / 2));
  });
  it('centres fewer seats at the same width', () => {
    for (const seats of [2, 3]) {
      const xs = Array.from({ length: seats }, (_, s) => faceCentreX(s, seats));
      expect(xs[1] - xs[0]).toBeCloseTo(SEAT_W);
      expect((xs[0] + xs[seats - 1]) / 2).toBeCloseTo(CANVAS_W / 2);
    }
  });
});

describe('counter cards (plan 3b)', () => {
  it('lays six out as two full rows filling the tray, as before', () => {
    expect([0, 1, 2, 3, 4, 5].map((i) => cardX(i, 6))).toEqual([0, 1, 2, 0, 1, 2].map((c) => TRAY_INNER_X + c * CARD_W + (TRAY_INNER_W - 3 * CARD_W) / 2));
    expect(cardY(0, 6)).toBeCloseTo(TRAY_INNER_Y + (TRAY_INNER_H - 2 * CARD_H) / 2);
  });
  it('centres a part-filled last row', () => {
    const left = cardX(3, 4);
    expect(left + CARD_W / 2).toBeCloseTo(TRAY_INNER_X + TRAY_INNER_W / 2);
    expect(cardX(4, 5) - cardX(3, 5)).toBeCloseTo(CARD_W);
    expect((cardX(3, 5) + cardX(4, 5) + CARD_W) / 2).toBeCloseTo(TRAY_INNER_X + TRAY_INNER_W / 2);
  });
  it('centres a single row of three vertically', () => {
    expect(cardY(0, 3) + CARD_H / 2).toBeCloseTo(TRAY_INNER_Y + TRAY_INNER_H / 2);
  });
  it('keeps every card inside the tray', () => {
    for (const count of [3, 4, 5, 6]) for (let i = 0; i < count; i++) {
      expect(cardX(i, count)).toBeGreaterThanOrEqual(TRAY_INNER_X);
      expect(cardX(i, count) + CARD_W).toBeLessThanOrEqual(TRAY_INNER_X + TRAY_INNER_W);
      expect(cardY(i, count)).toBeGreaterThanOrEqual(TRAY_INNER_Y);
      expect(cardY(i, count) + CARD_H).toBeLessThanOrEqual(TRAY_INNER_Y + TRAY_INNER_H);
    }
  });
});
