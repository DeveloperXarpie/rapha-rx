import { describe, it, expect } from 'vitest';
import { fitScale } from '../fitScale';
import * as gardenKeeper from '../../games/attention/GardenKeeper/geometry';
import * as serveGuests from '../../games/executive/ServeTheGuests/geometry';
import * as marketMemory from '../../games/memory/MarketMemory/geometry';
import * as trainYard from '../../games/memory/TrainYard/geometry';

/**
 * The app sits in an upright column capped at `64dvh` (styles/index.css,
 * `.app-root`). The cap clears the widest board canvas, and the whole point of
 * it is that the column can never make a board smaller than it already draws.
 *
 * These tests hold that invariant, and they earned their keep immediately: the
 * cap was first set to 0.625 on the belief that Garden Keeper's 800x1280 was
 * the widest canvas, and this caught Train Yard at 0.627.
 *
 * MUST be kept in step with the CSS. A new board with a wider canvas fails here
 * rather than silently shrinking on tablets months later.
 */
const COLUMN_RATIO = 0.64;

const BOARDS = [
  { name: 'GardenKeeper', w: gardenKeeper.CANVAS_W, h: gardenKeeper.CANVAS_H },
  { name: 'ServeTheGuests', w: serveGuests.CANVAS_W, h: serveGuests.CANVAS_H },
  { name: 'MarketMemory', w: marketMemory.CANVAS_W, h: marketMemory.CANVAS_H },
  { name: 'TrainYard', w: trainYard.CANVAS_W, h: trainYard.CANVAS_H },
];

describe('the portrait column never shrinks a board', () => {
  it('has no board canvas wider than the column ratio', () => {
    for (const b of BOARDS) {
      expect(b.w / b.h, `${b.name} canvas ratio`).toBeLessThanOrEqual(COLUMN_RATIO);
    }
  });

  it('leaves every board height-bound inside the column, at any viewport height', () => {
    // The play box is always shorter than the viewport - GameShell spends a top
    // bar and padding above it. 0.85 is a generous stand-in for that.
    const PLAY_BOX_FRACTION = 0.85;

    for (const viewportH of [640, 780, 900, 1024, 1366]) {
      const columnW = COLUMN_RATIO * viewportH;
      const playBoxH = PLAY_BOX_FRACTION * viewportH;

      for (const b of BOARDS) {
        const scale = fitScale(columnW, playBoxH, b.w, b.h);
        const heightBound = playBoxH / b.h;
        expect(
          scale,
          `${b.name} at ${viewportH}px tall should be limited by height, not the column`,
        ).toBeCloseTo(heightBound, 10);
      }
    }
  });

  it('fills the viewport on a portrait phone, where the cap must not bind', () => {
    // 360x640 is the narrowest device the app targets, and the shortest relative
    // to its width - the worst case for the cap binding.
    for (const [w, h] of [[360, 640], [390, 844], [430, 932]]) {
      expect(Math.min(w, COLUMN_RATIO * h), `${w}x${h}`).toBe(w);
    }
  });

  it('caps a 4:3 tablet, which is wider than any board draws anyway', () => {
    // A 768x1024 tablet held upright is wider than the cap, so the column binds.
    // fitScale already holds Train Yard to 1024 * 0.627 = 642px there, well
    // inside this, so the board is untouched and only the chrome is reined in.
    expect(Math.min(768, COLUMN_RATIO * 1024)).toBeCloseTo(655.36, 2);
  });
});
