/**
 * Sprite manifest.
 *
 * Everything except the background plate and the character sheet is cut by
 * `scripts/slice_cook_assets.py` into `public/cook-assets/`, so paths are absolute strings -
 * the house convention, see TrainYard's sprite manifest and PicturePostcard's scene
 * definitions. Sizes below are the slicer's output; re-run it and copy its printed sizes if
 * a sheet is redrawn.
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

/**
 * The full menu: the south Indian tiffin first, then the north Indian plates and the sweets.
 *
 * Only `DISH_COUNT` of these are dealt onto the counter in any one round - see
 * `createInitialState` - so this is a pool to draw from, not a layout. Cook times are set by
 * how much work the dish is, which is what makes ordering between them a decision: a chutney
 * is nearly instant, a tandoori chicken ties the card up for the length of a short order.
 */
export const DISH_DEFS: DishDef[] = [
  dish('plain-dosa',       'serveGuests.dish.plainDosa',      'Plain Dosa',        255, 237, 4.5),
  dish('masala-dosa',      'serveGuests.dish.masalaDosa',     'Masala Dosa',       241, 211, 6),
  dish('idly',             'serveGuests.dish.idly',           'Idly',              239, 201, 4),
  dish('uddin-vada',       'serveGuests.dish.uddinVada',      'Uddin Vada',        235, 195, 5),
  dish('filter-coffee',    'serveGuests.dish.filterCoffee',   'Filter Coffee',     183, 190, 3),
  dish('coconut-chutney',  'serveGuests.dish.coconutChutney', 'Coconut Chutney',   202, 185, 3),
  dish('sambar',           'serveGuests.dish.sambar',         'Sambar',            230, 195, 3.5),
  dish('chutney-sambar',   'serveGuests.dish.chutneySambar',  'Chutney & Sambar',  237, 166, 5),
  dish('samosa',           'serveGuests.dish.samosa',         'Samosa',            233, 198, 5.5),
  dish('pakora',           'serveGuests.dish.pakora',         'Pakora',            221, 195, 4.5),
  dish('aloo-paratha',     'serveGuests.dish.alooParatha',    'Aloo Paratha',      247, 200, 5.5),
  dish('chole-bhature',    'serveGuests.dish.choleBhature',   'Chole Bhature',     249, 215, 7),
  dish('butter-chicken',   'serveGuests.dish.butterChicken',  'Butter Chicken',    256, 199, 7),
  dish('dal-makhani',      'serveGuests.dish.dalMakhani',     'Dal Makhani',       253, 201, 6.5),
  dish('rajma-chawal',     'serveGuests.dish.rajmaChawal',    'Rajma Chawal',      230, 201, 6),
  dish('kadhi-chawal',     'serveGuests.dish.kadhiChawal',    'Kadhi Chawal',      238, 208, 5.5),
  dish('paneer-tikka',     'serveGuests.dish.paneerTikka',    'Paneer Tikka',      264, 227, 6.5),
  dish('tandoori-chicken', 'serveGuests.dish.tandooriChicken', 'Tandoori Chicken', 254, 212, 7.5),
  dish('amritsari-kulcha', 'serveGuests.dish.amritsariKulcha', 'Amritsari Kulcha', 253, 208, 6),
  dish('gulab-jamun',      'serveGuests.dish.gulabJamun',     'Gulab Jamun',       214, 194, 4),
  dish('jalebi',           'serveGuests.dish.jalebi',         'Jalebi',            289, 231, 4.5),
  dish('gajar-ka-halwa',   'serveGuests.dish.gajarKaHalwa',   'Gajar Ka Halwa',    255, 214, 5),
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
  /**
   * The counter tray. Its interior is flat, because the sheet draws 4x2 cells and the
   * board deals six in 3x2 - the cells come from geometry.ts instead. Slicing at the
   * frame's own 34px band means the panel can be any size without the rim distorting.
   */
  tray:        { src: `${DISH_BASE}/pt-tray.png`,    w: 787, h: 576, slice: [34, 34, 34, 34] },
} satisfies Record<string, FrameDef>;

/**
 * The painted title lockup. Not localised and reads "Tiffen" rather than "Tiffin"; both
 * are known and accepted. GameShell hides its own banner for this game so they do not
 * both appear.
 */
export const TITLE_SRC = `${DISH_BASE}/pt-title.png`;

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

// ─── State buttons ────────────────────────────────────────────────────────────

/**
 * The painted button for each dish state.
 *
 * These carry their word in the artwork, so they are only used when the UI language is the
 * one they are painted in; every other language falls back to the CSS capsules in
 * `palette.ts`. See `PAINTED_BUTTON_LANG` below.
 *
 * The four are drawn at different aspect ratios - DISPOSE's bin and stink lines rise above
 * its pill - so the card sizes each by width and bottom-aligns it. That puts all four pills
 * on one baseline, because in every one of them the pill is the lowest painted thing.
 */
export interface ButtonDef {
  src: string;
  w: number;
  h: number;
}

export const BUTTONS = {
  idle:    { src: `${DISH_BASE}/btn-make.png`,    w: 480, h: 148 },
  cooking: { src: `${DISH_BASE}/btn-cooking.png`, w: 480, h: 148 },
  ready:   { src: `${DISH_BASE}/btn-serve.png`,   w: 480, h: 151 },
  burnt:   { src: `${DISH_BASE}/btn-dispose.png`, w: 480, h: 180 },
} satisfies Record<string, ButtonDef>;

/**
 * The language the button art is painted in. Hindi and Kannada get the CSS capsules with
 * their own translated word instead, so no player is asked to read a language they did not
 * pick. Redrawing the pills per language would remove this branch.
 */
export const PAINTED_BUTTON_LANG = 'en';

/**
 * Sliced but unconsumed: the round ✕ the DISPOSE pill replaced, the two smaller speech
 * bubbles, and the sheet's empty vessels - banana leaf, two bowls, a tumbler. Listed so the
 * slicer's output is accounted for rather than looking like strays in the directory, and so
 * anything that wants them can find them.
 */
export const UNUSED_ASSETS = [
  `${DISH_BASE}/ui-btn-clear.png`,
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

export const BACKGROUND_SRC = '/bg_cook_pt.jpg';
export const FACE_SHEET_SRC = '/characters_cook.png';

/**
 * Everything the board has to have decoded before the patience clock may start.
 *
 * Only the dishes actually dealt to the counter are included. Orders are drawn from the
 * same dealt set, so nothing outside it can ever appear, and preloading the whole 22-dish
 * pool would more than double the wait before a round for art it will not show.
 */
export function spriteUrls(dealtDishIds: string[]): string[] {
  return [
    BACKGROUND_SRC,
    FACE_SHEET_SRC,
    TITLE_SRC,
    ...dealtDishIds.flatMap((id) => [DISH_BY_ID[id].src, DISH_BY_ID[id].spoiledSrc]),
    ...Object.values(FRAMES).map((f) => f.src),
    ...Object.values(BUTTONS).map((b) => b.src),
    BAR_TRACK.src,
    BAR_FILL.src,
    COIN_SRC,
  ];
}

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
