/**
 * Artwork paths. Everything here is sliced from `assets-src/Spot_Focus_Assets/` into
 * `public/spot-assets/` by `scripts/slice_spot_focus_assets.py`.
 *
 * The signboard plank, both ribbons and the item cards are not in this list on purpose.
 * The delivered UI kit paints English text into the plank and the ribbons, and this app
 * ships in English, Hindi and Kannada, so those pieces are drawn in CSS from the kit's
 * palette instead. Only the two end caps are sliced: they carry the rounded plank ends, their
 * screws and the daisy sprigs, none of which CSS can draw. The wood between them is a
 * gradient sampled from the plank itself, so the board stretches to fit any heading.
 */

const BASE = '/spot-assets';

export const spritePath = (id: string): string => `${BASE}/item-${id}.png`;

export const BG_SCENE = `${BASE}/bg-scene.jpg`;
export const UI_PLANK_LEFT = `${BASE}/ui-plank-left.png`;
export const UI_PLANK_RIGHT = `${BASE}/ui-plank-right.png`;
