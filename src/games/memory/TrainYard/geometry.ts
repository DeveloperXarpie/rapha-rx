/**
 * Board geometry, in the handoff's fixed 800px design-pixel space. The whole game is laid
 * out at these coordinates and scaled to the viewport with a single transform.
 */

import { SCENERY_SPRITES, STATION_SPRITES, STATION_TUNNEL, TRAIN_SPRITES } from './sprites';

export const HUD_H = 96;
export const BOARD_W = 800;
export const BOARD_H = 1180;
export const CANVAS_W = BOARD_W;
export const CANVAS_H = HUD_H + BOARD_H;

/** The four shared columns. Lane i and station i sit on the same vertical. */
export const COL_X = [186, 326, 466, 606];

/**
 * The whole run sits 80-90px higher than the handoff's, which put the station row deep in
 * the board and parked the waiting trains flush against its bottom edge. The crossing band
 * keeps its exact 285px height and the spur its 193px, so the lattice geometry is unchanged;
 * only the lane run is shortened, and the trains now clear the board's bottom by 90px.
 *
 * The board itself stays 1180 tall: the painted plate can only give up 295 rows of empty
 * grass, which puts its own floor at 1171, so there is nothing to gain by shortening it.
 */
export const MOUTH_Y = 272;
export const ZIG_TOP = 465;
export const ZIG_BOT = 750;
export const LANE_Y = 1022;

/**
 * Track bed widths. The handoff's SVG track used 26 and 17; the raster tile's sleeper
 * period is narrower relative to its width, so the beds are scaled up to keep the art's
 * own proportions. The ratio between the two - and so the narrow "waist" each column takes
 * as it crosses the band - is preserved.
 */
export const BED_MAIN = 40;
export const BED_CROSS = 24;

/**
 * The verticals overrun the crossing band by this much. Raster segments have square ends,
 * and the wider verticals paint over the diagonals' butt joints.
 */
const JOINT_OVERLAP = 12;

export interface Segment {
  key: string;
  /** Centre of the segment, where its div is anchored. */
  cx: number;
  cy: number;
  /** Length along the rail, and bed width across it. */
  length: number;
  bed: number;
  /** Rotation that turns the vertical track tile onto this segment. */
  angleDeg: number;
}

function seg(key: string, x0: number, y0: number, x1: number, y1: number, bed: number): Segment {
  const dx = x1 - x0;
  const dy = y1 - y0;
  const length = Math.hypot(dx, dy) || 1;
  return {
    key,
    cx: (x0 + x1) / 2,
    cy: (y0 + y1) / 2,
    length,
    bed,
    // The tile is drawn running down the +y axis. CSS rotate(t) maps (0,1) to
    // (-sin t, cos t), so the rotation that puts it on (dx, dy) is atan2(-dx, dy).
    angleDeg: (Math.atan2(-dx, dy) * 180) / Math.PI,
  };
}

/**
 * All 24 segments, diagonals first so the verticals paint over their ends.
 *
 * Four of the sixteen "diagonals" are degenerate - lane i to station i runs straight down
 * its own column - which is what gives each column its narrow waist through the band. That
 * is deliberate, not a bug to tidy away.
 */
export const CROSS_SEGMENTS: Segment[] = (() => {
  const out: Segment[] = [];
  for (let lane = 0; lane < 4; lane++) {
    for (let st = 0; st < 4; st++) {
      out.push(seg(`x-${lane}-${st}`, COL_X[lane], ZIG_BOT, COL_X[st], ZIG_TOP, BED_CROSS));
    }
  }
  return out;
})();

export const MAIN_SEGMENTS: Segment[] = COL_X.flatMap((x, i) => [
  seg(`lane-${i}`, x, LANE_Y, x, ZIG_BOT - JOINT_OVERLAP, BED_MAIN),
  seg(`spur-${i}`, x, ZIG_TOP + JOINT_OVERLAP, x, MOUTH_Y, BED_MAIN),
]);

/**
 * The route a train takes: lane vertical, one diagonal, station spur. Fed to offset-path,
 * so the train visibly stays on drawn rails the whole way.
 */
export function pathFor(lane: number, station: number): string {
  const x0 = COL_X[lane];
  const x1 = COL_X[station];
  return `M ${x0} ${LANE_Y} L ${x0} ${ZIG_BOT} L ${x1} ${ZIG_TOP} L ${x1} ${MOUTH_Y}`;
}

// ─── Station boxes ────────────────────────────────────────────────────────────

/**
 * Stations are sized by height and anchored by their base, so all four tunnel mouths land
 * on the same line whatever each crop's aspect. The base sits just below MOUTH_Y, which
 * puts the tunnel opening around the point where a train's run ends.
 */
export const STATION_H = 132;
export const STATION_BASE_Y = MOUTH_Y + 26;

export interface Box { left: number; top: number; width: number; height: number }

export function stationBox(column: number, paletteIndex: number): Box {
  const sprite = STATION_SPRITES[paletteIndex];
  const width = STATION_H * (sprite.w / sprite.h);
  return {
    left: COL_X[column] - width / 2,
    top: STATION_BASE_Y - STATION_H,
    width,
    height: STATION_H,
  };
}

/** Absolute y of a station's tunnel opening, for sanity-checking the arrival point. */
export function tunnelSpan(): { top: number; bottom: number } {
  const top = STATION_BASE_Y - STATION_H;
  return {
    top: top + STATION_H * STATION_TUNNEL.top,
    bottom: top + STATION_H * STATION_TUNNEL.bottom,
  };
}

// ─── Train box ────────────────────────────────────────────────────────────────

export const TRAIN_W = 62;
export const TRAIN_H = Math.round(TRAIN_W * (TRAIN_SPRITES[0].h / TRAIN_SPRITES[0].w));

// ─── Fixed furniture ──────────────────────────────────────────────────────────

export const BANNER = { left: 156, top: 18, width: 488 };
export const RESET_BTN = { left: 60, top: 760, width: 104, height: 96 };

/**
 * The band that must stay on screen on any viewport, however narrow. Everything outside
 * it is grass and scenery - trees, the house, the water tower - which the fit may crop
 * rather than shrink the board. RESET is the left-most thing a resident has to reach, so
 * that is as far in as the left edge can come; the right is mirrored because the board is
 * centred in its box.
 *
 * RESET sat at x14 until the Sep-17 phone pass, which is all but the whole canvas and left
 * a phone nothing to crop: the board stayed width-bound and drew short, with a band of
 * leftover above the HUD and below the yard. At x60 - with the hearts moved to match, they
 * are the only other thing out here - the board fills the height of any box down to 0.53
 * wide-to-tall, which covers a phone in a browser. A narrower box still letterboxes, and
 * the stage paints what is left with the board's own scrimmed art.
 *
 * Move RESET further in and more of a tall phone fills. lib/__tests__/boardFit.test.ts
 * holds the promise that nothing inside this band is ever cropped.
 */
export const SAFE_X = [RESET_BTN.left, CANVAS_W - RESET_BTN.left] as const;

/** Edge colours of board-grass.webp, used to fill any height the board does not cover. */
export const GROUND = { top: '#95BD1D', bottom: '#8CB81B' } as const;
export const BLIND = { top: 132, height: 310, lift: 442 };

export type SceneryKind = keyof typeof SCENERY_SPRITES;

export interface SceneryPlacement { kind: SceneryKind; left: number; top: number; height: number }

/**
 * Props layered on top of the board plate.
 *
 * The plate paints its own trees, rocks, flowers, house, water tower, crates, fence and two
 * signals down both edges, so nothing here duplicates them - the overlay only fills the gaps
 * between adjacent columns, centred on 256, 396 and 536. Every plate prop sits at x < 176 or
 * x > 643, which is what makes those gaps safe.
 *
 * The crossing band (y 465-750) stays clear so the lattice stays readable, and scenery never
 * takes taps. There is no apron left above the station roofs now that the run has moved up,
 * so the props that sat there are gone.
 */
export const SCENERY: SceneryPlacement[] = [
  // Between the spurs, above the crossing band
  { kind: 'signal',     left: 243, top: 300, height:  64 },
  { kind: 'lever',      left: 240, top: 390, height:  44 },
  { kind: 'signal',     left: 383, top: 320, height:  64 },
  { kind: 'lever',      left: 382, top: 402, height:  44 },
  { kind: 'signal',     left: 523, top: 300, height:  64 },
  { kind: 'bush',       left: 518, top: 392, height:  32 },

  // Between the lanes, below the crossing band
  { kind: 'signal',     left: 243, top: 772, height:  64 },
  { kind: 'lever',      left: 240, top: 862, height:  44 },
  { kind: 'bush',       left: 238, top: 942, height:  32 },
  { kind: 'signal',     left: 383, top: 792, height:  64 },
  { kind: 'lever',      left: 382, top: 902, height:  44 },
  { kind: 'flowers',    left: 376, top: 998, height:  40 },
  { kind: 'signal',     left: 523, top: 772, height:  64 },
  { kind: 'lever',      left: 520, top: 872, height:  44 },
  { kind: 'bush',       left: 518, top: 950, height:  32 },
  { kind: 'bush',       left: 238, top:1096, height:  32 },
  { kind: 'flowers',    left: 516, top:1090, height:  40 },
];
