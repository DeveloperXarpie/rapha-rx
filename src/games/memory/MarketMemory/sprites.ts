/**
 * Artwork paths. Everything here is sliced from `assets-src/ShoppingList/` into
 * `public/shop-assets/` by `scripts/slice_shopping_assets.py`.
 *
 * The HINT tile and the cart tray are not in this list on purpose: the kit paints a "2"
 * and a "0/10" into that art, and both counts change during play, so those two pieces are
 * drawn in CSS from the kit's palette instead. READY and DONE left the list for a related
 * reason: their green is `.btn-green-kit` now, so the label under it can be translated.
 * `ui-ready.png` and `ui-done.png` stay on disk as the reference that green is sampled
 * from - see styles/kitButton.ts - but nothing loads them.
 */

const BASE = '/shop-assets';

export const BG_HOME = `${BASE}/bg-home.jpg`;
export const BG_STORE = `${BASE}/bg-store.jpg`;
export const UI_CLIPBOARD = `${BASE}/ui-clipboard.png`;
/**
 * The car-and-supermarket plate the Sep-10 review supplied for the retention cover,
 * trimmed to its own bounding box and re-encoded from `assets-src/sep-10/`. It has an
 * alpha channel, so it drops straight onto the cover's gradient.
 */
export const UI_TRAVEL = `${BASE}/ui-travel.webp`;
export const UI_TRAVEL_ASPECT = 1280 / 823;
/** The undo badge on a filled cart slot - dropped in by hand, not sliced by the script. */
export const UI_UNDO = `${BASE}/ui-undo.png`;

/**
 * Warmed during encoding so the walk to the shop never lands on an unpainted board.
 * The travel plate is in the list because it IS the walk to the shop - decoding it on
 * arrival would show the resident an empty cover for the first frames of the hold.
 */
export const PRELOAD = [BG_STORE, UI_TRAVEL];
