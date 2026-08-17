/**
 * Sprite manifest.
 *
 * Everything except the background plate and the character sheet is cut from
 * `public/Dar_assets_01.png` by `scripts/slice_cook_assets.py` into `public/cook-assets/`,
 * so paths are absolute strings - the house convention, see TrainYard's sprite manifest and
 * PicturePostcard's scene definitions. Sizes below are the slicer's output; re-run it and
 * copy its printed sizes if the sheet is redrawn.
 *
 * The guest faces are the exception: they are cropped out of the character sheet at render
 * time. See `faceCrop` below.
 */

export interface DishDef {
  id: string;
  /** i18n key; the English name is the fallback. */
  nameKey: string;
  nameEn: string;
  src: string;
  /** The mouldy counterpart, cross-faded in as the dish spoils. Same framing as `src`. */
  spoiledSrc: string;
  /** Natural pixel size, so the card can preserve the crop's aspect ratio. */
  w: number;
  h: number;
  /** Seconds from PREPARE to READY. */
  cookSeconds: number;
}

const DISH_BASE = '/cook-assets';

function dish(
  id: string,
  nameKey: string,
  nameEn: string,
  w: number,
  h: number,
  cookSeconds: number,
): DishDef {
  return {
    id,
    nameKey,
    nameEn,
    src: `${DISH_BASE}/dish-${id}.png`,
    spoiledSrc: `${DISH_BASE}/dish-${id}-spoiled.png`,
    w,
    h,
    cookSeconds,
  };
}

export const DISH_DEFS: DishDef[] = [
  dish('plain-dosa',  'serveGuests.dish.plainDosa',  'Plain Dosa',       191, 159, 4.5),
  dish('masala-dosa', 'serveGuests.dish.masalaDosa', 'Masala Dosa',      184, 157, 6),
  dish('idly',        'serveGuests.dish.idly',       'Idly',             176, 136, 4),
  dish('vada',        'serveGuests.dish.vada',       'Vada',             163, 144, 5),
  dish('chutney',     'serveGuests.dish.chutney',    'Chutney',          131, 122, 3),
  dish('sambar',      'serveGuests.dish.sambar',     'Sambar',           168, 151, 3.5),
  dish('combo',       'serveGuests.dish.combo',      'Chutney & Sambar', 215, 142, 5),
  dish('coffee',      'serveGuests.dish.coffee',     'Coffee/Tea',       140, 148, 3),
];

export const DISH_BY_ID: Record<string, DishDef> = Object.fromEntries(
  DISH_DEFS.map((d) => [d.id, d]),
);

// ─── UI frames ────────────────────────────────────────────────────────────────

/**
 * A painted frame that has to survive being resized, drawn with CSS `border-image`.
 *
 * `slice` is the inset from each edge, in the asset's own pixels, clockwise from the top.
 * Only the middle stretches, so corners and the painted bevel stay crisp at any size. The
 * same numbers set the element's border width, which is what insets its content - so a
 * slice wider than the painted border pads the contents by the difference.
 */
export interface FrameDef {
  src: string;
  w: number;
  h: number;
  slice: [top: number, right: number, bottom: number, left: number];
}

export const FRAMES = {
  /** Order bubble above each guest. Grows downward as an order gains items. */
  orderBubble: { src: `${DISH_BASE}/ui-panel.png`,   w: 194, h: 180, slice: [28, 28, 28, 28] },
  /** HUD score chip. Interior is repainted clean by the slicer, so it takes live text. */
  capsule:     { src: `${DISH_BASE}/ui-capsule.png`, w: 240, h: 103, slice: [24, 34, 24, 34] },
} satisfies Record<string, FrameDef>;

/**
 * The order bubble's tail, cut off the panel at its seam and placed against the frame's
 * bottom-left corner - the one region `border-image` leaves unstretched, so the join is
 * pixel-exact. `x` is its offset from the frame's left edge on the source art.
 */
export const BUBBLE_TAIL = { src: `${DISH_BASE}/ui-panel-tail.png`, w: 47, h: 20, x: 20 };

/**
 * The bar pills. These are 3-slice rather than 9-slice: a pill has no straight vertical
 * section, so the end caps are scaled with the bar's height instead of being sliced
 * vertically. `barWidth` below works that scale out.
 */
export const BAR_TRACK: FrameDef = { src: `${DISH_BASE}/ui-bar-track.png`, w: 332, h: 53, slice: [0, 26, 0, 26] };
export const BAR_FILL: FrameDef = { src: `${DISH_BASE}/ui-bar-fill.png`, w: 326, h: 47, slice: [0, 22, 0, 22] };

export const COIN_SRC = `${DISH_BASE}/ui-coin.png`;
export const CLEAR_BTN_SRC = `${DISH_BASE}/ui-btn-clear.png`;

/**
 * Sliced but unconsumed: the two smaller speech bubbles and the sheet's empty vessels -
 * banana leaf, two bowls, a tumbler. Listed so the slicer's output is accounted for rather
 * than looking like strays in the directory, and so anything that wants them can find them.
 */
export const UNUSED_ASSETS = [
  `${DISH_BASE}/ui-bubble-sm.png`,
  `${DISH_BASE}/ui-bubble-md.png`,
  `${DISH_BASE}/prop-leaf.png`,
  `${DISH_BASE}/prop-bowl-sm.png`,
  `${DISH_BASE}/prop-bowl-lg.png`,
  `${DISH_BASE}/prop-tumbler.png`,
];

/**
 * CSS for a frame rendered at `scale` times its native size. Scale stays 1 for anything
 * sized in design pixels; the bars pass their height ratio so the caps keep their shape.
 */
export function frameStyle(frame: FrameDef, scale = 1) {
  const [t, r, b, l] = frame.slice;
  return {
    borderImageSource: `url(${frame.src})`,
    borderImageSlice: `${t} ${r} ${b} ${l} fill`,
    borderImageWidth: `${t * scale}px ${r * scale}px ${b * scale}px ${l * scale}px`,
    borderStyle: 'solid' as const,
    borderColor: 'transparent',
    borderWidth: `${t * scale}px ${r * scale}px ${b * scale}px ${l * scale}px`,
  };
}

export const BACKGROUND_SRC = '/bg_cook.png';
export const FACE_SHEET_SRC = '/characters_cook.png';

export const ALL_SPRITE_URLS: string[] = [
  BACKGROUND_SRC,
  FACE_SHEET_SRC,
  ...DISH_DEFS.flatMap((d) => [d.src, d.spoiledSrc]),
  ...Object.values(FRAMES).map((f) => f.src),
  BAR_TRACK.src,
  BAR_FILL.src,
  COIN_SRC,
  CLEAR_BTN_SRC,
];

// ─── Guest faces ──────────────────────────────────────────────────────────────

export const FACE_SHEET_W = 1254;
export const FACE_SHEET_H = 1254;

/**
 * Where each bust actually sits on the sheet.
 *
 * The sheet *looks* like an even 5x4 grid but is not: the painted rows sit at y 35-319,
 * 331-608, 627-892 and 904-1188, not on 313.5px boundaries, and each bust is a different
 * size within its row. Deriving cells by division therefore sliced the top off one row and
 * dragged the crown of the row below into the row above it. These rects are the measured
 * alpha bounding box of every bust, so a crop contains exactly one guest and nothing else.
 *
 * Rows 0-1 of the sheet are children and twenty-somethings; only the ten adults from rows
 * 2-3 are listed, so the guests read as the players' own generation and their children.
 */
export interface FaceCell {
  x: number;
  y: number;
  w: number;
  h: number;
}

export const FACE_CELLS: FaceCell[] = [
  { x: 1,    y: 630, w: 236, h: 258 },
  { x: 256,  y: 632, w: 237, h: 259 },
  { x: 505,  y: 632, w: 235, h: 259 },
  { x: 756,  y: 635, w: 224, h: 257 },
  { x: 1005, y: 627, w: 242, h: 266 },
  { x: 5,    y: 921, w: 230, h: 266 },
  { x: 244,  y: 913, w: 247, h: 274 },
  { x: 502,  y: 916, w: 240, h: 273 },
  { x: 752,  y: 922, w: 245, h: 267 },
  { x: 1006, y: 904, w: 248, h: 284 },
];

export const FACE_COUNT = FACE_CELLS.length;

/**
 * CSS background properties that crop face `index` out of the sheet, scaled so the bust
 * stands exactly `targetH` tall. The busts differ in native size, so normalising on height
 * is what keeps the guests the same height above the counter; `width` comes back with the
 * style because it varies per guest and the caller has to centre the box itself.
 */
export function faceCrop(index: number, targetH: number) {
  const cell = FACE_CELLS[((index % FACE_COUNT) + FACE_COUNT) % FACE_COUNT];
  const scale = targetH / cell.h;
  return {
    width: Math.round(cell.w * scale),
    height: targetH,
    backgroundImage: `url(${FACE_SHEET_SRC})`,
    backgroundSize: `${FACE_SHEET_W * scale}px ${FACE_SHEET_H * scale}px`,
    backgroundPosition: `-${cell.x * scale}px -${cell.y * scale}px`,
    backgroundRepeat: 'no-repeat' as const,
  };
}
