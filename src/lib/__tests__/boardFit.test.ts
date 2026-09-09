import { describe, it, expect } from 'vitest';
import { fitBoard } from '../fitScale';
import * as gardenKeeper from '../../games/attention/GardenKeeper/geometry';
import * as serveGuests from '../../games/executive/ServeTheGuests/geometry';
import * as marketMemory from '../../games/memory/MarketMemory/geometry';
import * as trainYard from '../../games/memory/TrainYard/geometry';

/**
 * Every fixed-canvas board, against the devices residents actually hold.
 *
 * The bug this exists to prevent shipped once already: `.app-root` caps the column at
 * `64dvh`, and the CSS comment claimed that made every board height-bound. It does - on a
 * tablet. On a 19.5:9 phone the column is 0.46 wide-to-tall against canvases of ~0.63, the
 * width binds instead, and Train Yard drew 657px tall in an 892px column with 235px of app
 * grey underneath. Nothing tested a viewport narrower than the cap, which is every phone.
 *
 * So this walks the real population and holds two promises:
 *
 *   1. nothing inside a board's declared SAFE_X is ever cropped, on any device;
 *   2. the board is never scaled past the height of its box.
 *
 * A new board, a new phone shape, or a widened safe band all get checked here. The column
 * width mirrors styles/index.css - keep the cap in step with portraitColumn.test.ts.
 */

/** Matches `.app-root`'s `max-width: min(100%, 64dvh)`. */
const COLUMN_CAP = 0.64;

const DEVICES = [
  { name: 'iPhone SE (2022)', w: 375, h: 667 },
  { name: 'iPhone 13 mini', w: 375, h: 812 },
  { name: 'iPhone 15 / 16', w: 393, h: 852 },
  { name: 'iPhone 16 Pro Max', w: 440, h: 956 },
  { name: 'Galaxy S24+', w: 412, h: 892 },
  { name: 'Pixel 8 / S24 Ultra', w: 412, h: 915 },
  { name: 'Xperia 1 VI (21:9)', w: 411, h: 958 },
  { name: 'Galaxy Fold 6 (inner)', w: 673, h: 841 },
  { name: 'iPad mini', w: 744, h: 1133 },
  { name: 'iPad 10.9', w: 820, h: 1180 },
  { name: 'iPad Pro 12.9', w: 1024, h: 1366 },
  { name: 'Galaxy Tab S9', w: 753, h: 1205 },
];

const BOARDS = [
  { name: 'GardenKeeper', g: gardenKeeper },
  { name: 'ServeTheGuests', g: serveGuests },
  { name: 'MarketMemory', g: marketMemory },
  { name: 'TrainYard', g: trainYard },
];

/** The play box a device gives a board: the full height, and the capped column width. */
function column(device: { w: number; h: number }) {
  return { w: Math.min(device.w, COLUMN_CAP * device.h), h: device.h };
}

describe('every board fits every device', () => {
  for (const { name, g } of BOARDS) {
    const [safeLeft, safeRight] = g.SAFE_X;

    it(`${name} keeps its safe band on screen everywhere`, () => {
      for (const device of DEVICES) {
        const box = column(device);
        const fit = fitBoard(box.w, box.h, g.CANVAS_W, g.CANVAS_H, safeLeft, safeRight);

        // What the box actually shows, in design px, measured about the canvas centre -
        // the board is centred, so the crop is symmetric.
        const halfWindow = box.w / (2 * fit.scale);
        const visibleLeft = g.CANVAS_W / 2 - halfWindow;
        const visibleRight = g.CANVAS_W / 2 + halfWindow;

        expect(visibleLeft, `${name} on ${device.name} crops the left of its safe band`)
          .toBeLessThanOrEqual(safeLeft + 0.001);
        expect(visibleRight, `${name} on ${device.name} crops the right of its safe band`)
          .toBeGreaterThanOrEqual(safeRight - 0.001);
      }
    });

    it(`${name} never overflows the height of its box`, () => {
      for (const device of DEVICES) {
        const box = column(device);
        const fit = fitBoard(box.w, box.h, g.CANVAS_W, g.CANVAS_H, safeLeft, safeRight);
        expect(g.CANVAS_H * fit.scale, `${name} on ${device.name} is taller than its box`)
          .toBeLessThanOrEqual(box.h + 0.001);
        // And whatever is left over is split, never dumped at the bottom.
        expect(fit.offsetY).toBeCloseTo((box.h - g.CANVAS_H * fit.scale) / 2, 3);
      }
    });

    it(`${name} declares a safe band inside its canvas`, () => {
      expect(safeLeft).toBeGreaterThanOrEqual(0);
      expect(safeRight).toBeLessThanOrEqual(g.CANVAS_W);
      expect(safeRight).toBeGreaterThan(safeLeft);
    });
  }

  it('fills the height on a tablet, where the column cap already binds', () => {
    // The cap makes a tablet column 0.640, against canvases of 0.625-0.640, so there is
    // nothing to letterbox. This is the case that was always fine and must stay fine.
    for (const { name, g } of BOARDS) {
      const box = column({ w: 820, h: 1180 });
      const fit = fitBoard(box.w, box.h, g.CANVAS_W, g.CANVAS_H, g.SAFE_X[0], g.SAFE_X[1]);
      expect(fit.offsetY, `${name} letterboxes on an iPad`).toBeLessThan(box.h * 0.06);
    }
  });
});
