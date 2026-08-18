/**
 * Artwork paths. Everything here is sliced from `assets-src/ShoppingList/` into
 * `public/shop-assets/` by `scripts/slice_shopping_assets.py`.
 *
 * The HINT tile and the cart tray are not in this list on purpose: the kit paints a "2"
 * and a "0/10" into that art, and both counts change during play, so those two pieces are
 * drawn in CSS from the kit's palette instead.
 */

const BASE = '/shop-assets';

export const BG_HOME = `${BASE}/bg-home.jpg`;
export const BG_STORE = `${BASE}/bg-store.jpg`;
export const UI_CLIPBOARD = `${BASE}/ui-clipboard.png`;
export const UI_READY = `${BASE}/ui-ready.png`;
export const UI_DONE = `${BASE}/ui-done.png`;

/** Warmed during encoding so the walk to the shop never lands on an unpainted board. */
export const PRELOAD = [BG_STORE, UI_DONE];
