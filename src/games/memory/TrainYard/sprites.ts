/**
 * Sprite manifest. Every asset is cropped from the handoff's art sheet by
 * design_handoff_train_yard_dispatcher/source-art/extract-sprites.py and served from
 * public/, so paths are absolute strings (the house convention - see PicturePostcard's
 * scene definitions).
 */

const BASE = '/train-assets';
const S = `${BASE}/sprites`;

export interface SpriteDef {
  src: string;
  /** Natural pixel size, so layout can preserve the crop's aspect ratio. */
  w: number;
  h: number;
}

/** Station buildings, indexed by palette entry (red, blue, green, yellow). */
export const STATION_SPRITES: SpriteDef[] = [
  { src: `${S}/station-red.png`,    w: 199, h: 203 },
  { src: `${S}/station-blue.png`,   w: 191, h: 200 },
  { src: `${S}/station-green.png`,  w: 192, h: 201 },
  { src: `${S}/station-yellow.png`, w: 189, h: 201 },
];

/** Top-down locomotives, indexed by palette entry. */
export const TRAIN_SPRITES: SpriteDef[] = [
  { src: `${BASE}/Train_red.png`,    w: 193, h: 427 },
  { src: `${BASE}/Train_blue.png`,   w: 193, h: 427 },
  { src: `${BASE}/Train_green.png`,  w: 193, h: 427 },
  { src: `${BASE}/Train_yellow.png`, w: 193, h: 427 },
];

/** One seamless sleeper period, painted repeating along each track segment. */
export const TRACK_TILE: SpriteDef = { src: `${S}/track-tile.png`, w: 71, h: 21 };

/**
 * The board plate: grass with its own trees, rocks, flowers, buildings and signals painted
 * in along both edges. Built to the board's exact 800 x 1180 by make-board.py, so it neither
 * crops a prop nor squashes one.
 */
export const BOARD_BACKGROUND: SpriteDef = { src: `${BASE}/board-grass.webp`, w: 800, h: 1180 };

export const HEART: SpriteDef = { src: `${S}/heart.png`, w: 41, h: 37 };
export const RESET_GLYPH: SpriteDef = { src: `${S}/reset-glyph.png`, w: 45, h: 47 };

export const SCENERY_SPRITES = {
  tree:       { src: `${S}/tree.png`,        w: 105, h: 151 },
  bush:       { src: `${S}/bush.png`,        w:  40, h:  38 },
  house:      { src: `${S}/house.png`,       w: 191, h: 201 },
  waterTower: { src: `${S}/water-tower.png`, w: 128, h: 222 },
  crates:     { src: `${S}/crates.png`,      w:  96, h:  99 },
  fence:      { src: `${S}/fence.png`,       w: 125, h:  40 },
  flowers:    { src: `${S}/flowers.png`,     w:  72, h:  60 },
  rock:       { src: `${S}/rock.png`,        w:  66, h:  43 },
  signal:     { src: `${S}/signal.png`,      w:  35, h: 120 },
  lever:      { src: `${S}/lever.png`,       w:  52, h:  81 },
} as const;

/**
 * Where the sign plate and the tunnel opening sit inside a station sprite, as fractions of
 * the sprite box. Measured off the art; the four buildings share a geometry to within a
 * pixel, so one set of fractions serves all of them.
 */
export const STATION_SIGN = { x0: 0.19, x1: 0.845, y0: 0.225, y1: 0.575 };
export const STATION_TUNNEL = { top: 0.685, bottom: 0.936 };

/** Everything that must be decoded before the encoding window may start. */
export const ALL_SPRITE_URLS: string[] = [
  BOARD_BACKGROUND.src,
  ...STATION_SPRITES.map((s) => s.src),
  ...TRAIN_SPRITES.map((s) => s.src),
  TRACK_TILE.src,
  HEART.src,
  RESET_GLYPH.src,
  ...Object.values(SCENERY_SPRITES).map((s) => s.src),
];
