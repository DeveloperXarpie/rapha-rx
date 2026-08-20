/**
 * Artwork paths. Everything here is sliced from `assets-src/Spot_Focus_Assets/` into
 * `public/spot-assets/` by `scripts/slice_spot_focus_assets.py`.
 *
 * The signboard plank, both ribbons and the item cards are not in this list on purpose.
 * The delivered UI kit paints English text into the plank and the ribbons, and this app
 * ships in English, Hindi and Kannada, so those pieces are drawn in CSS from the kit's
 * palette instead. Only the daisy sprigs carry no text and cannot be drawn in CSS.
 */

const BASE = '/spot-assets';

export const spritePath = (id: string): string => `${BASE}/item-${id}.png`;

export const BG_SCENE = `${BASE}/bg-scene.jpg`;
export const UI_SPRIG_LEFT = `${BASE}/ui-sprig-left.png`;
export const UI_SPRIG_RIGHT = `${BASE}/ui-sprig-right.png`;
