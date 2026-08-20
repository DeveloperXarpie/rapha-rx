/**
 * Artwork paths. Everything here is sliced from `assets-src/Spot_Focus_Assets/` into
 * `public/spot-assets/` by `scripts/slice_spot_focus_assets.py`.
 *
 * The signboard plank, both ribbons and the item cards are not in this list on purpose.
 * The delivered UI kit paints English text into the plank and the ribbons, and this app
 * ships in English, Hindi and Kannada, so those pieces are drawn in CSS from the kit's
 * palette instead. The signboard is sliced as three pieces - two end caps and a tiling middle -
 * cut from one plank whose baked-in heading was erased first, over the same rows. At a
 * common height they are the same wood at the same scale, so the board stretches to fit
 * any heading in any language without a visible join.
 */

const BASE = '/spot-assets';

export const spritePath = (id: string): string => `${BASE}/item-${id}.png`;

export const BG_SCENE = `${BASE}/bg-scene.jpg`;
export const UI_PLANK_LEFT = `${BASE}/ui-plank-left.png`;
export const UI_PLANK_MID = `${BASE}/ui-plank-mid.png`;
export const UI_PLANK_RIGHT = `${BASE}/ui-plank-right.png`;

/** The aspect ratio of each end cap, so the board can be laid out from its height. */
export const PLANK_CAP_RATIO = 116 / 202;
