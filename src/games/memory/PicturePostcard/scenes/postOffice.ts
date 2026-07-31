import type { SceneDef } from './types';

/**
 * Raster scene: a village post office interior, pinned to ladder levels 1-3.
 *
 * The background is a painted plate with the ten hero items absent; each item is a
 * transparent cutout layered on top at its authored bbox. Hiding an item is change
 * class 1 and is the only class this scene supports - the slots carry no variants,
 * altPositions or lures, so the generator's supportsClass() excludes classes 2 and 4-7
 * automatically.
 *
 * Salience is authored: 3 = large and high contrast, 2 = mid, 1 = small or poorly
 * separated from its background. It drives which items each level hides, so that a
 * level-1 trial hiding the satchel is comparable to one hiding the parcel.
 *
 * Objects in the plate that are NOT among these ten - the letter bundle at the table's
 * back-left, the potted plants, the pigeonhole shelf, the postbox, the wall pictures,
 * the ceiling fan, the notice board - are permanently visible and are never probed.
 *
 * bbox values come from assets-src/picture-postcard/post-office/boxes.resolved.json,
 * which scripts/pp-cut-scene.py writes on every run. They are NOT boxes.json: that file
 * holds the authored seed rects, and a silhouette routinely runs a little past its seed
 * (the satchel's flap most of all). The cutout is emitted at the resolved box, so
 * painting it into the seed box would squash it. Re-copy after any re-cut.
 *
 * Each item also has a shadow layer, sharing the slot's visibility so that removing an
 * item removes its shadow. See SHADOW_INFLATE in geometry.ts for how it is positioned.
 */
const ITEM = (id: string) => `/pp/scenes/post-office/items/${id}.webp`;
const SHADOW = (id: string) => `/pp/scenes/post-office/items/${id}.shadow.webp`;

export const postOffice: SceneDef = {
  id: 'post-office',
  theme: 'postOffice',
  background: [],
  backgroundImage: '/pp/scenes/post-office/background.webp',
  renderScale: 1,
  pinned: true,
  slots: [
    { id: 'scale', category: 'weighingScale', imageSrc: ITEM('scale'), shadowSrc: SHADOW('scale'),
      bbox: { x: 0.0615, y: 0.3711, w: 0.1816, h: 0.1179 }, salience: 3, centrality: 2 },
    { id: 'bell', category: 'bell', imageSrc: ITEM('bell'), shadowSrc: SHADOW('bell'),
      bbox: { x: 0.4358, y: 0.4282, w: 0.0615, h: 0.0608 }, salience: 1, centrality: 3 },
    { id: 'parcel', category: 'parcel', imageSrc: ITEM('parcel'), shadowSrc: SHADOW('parcel'),
      bbox: { x: 0.1588, y: 0.5497, w: 0.1941, h: 0.1777 }, salience: 3, centrality: 2 },
    { id: 'magnifier', category: 'magnifier', imageSrc: ITEM('magnifier'), shadowSrc: SHADOW('magnifier'),
      bbox: { x: 0.2977, y: 0.6713, w: 0.1637, h: 0.1326 }, salience: 2, centrality: 3 },
    { id: 'stamp', category: 'rubberStamp', imageSrc: ITEM('stamp'), shadowSrc: SHADOW('stamp'),
      bbox: { x: 0.4441, y: 0.5967, w: 0.0691, h: 0.1298 }, salience: 2, centrality: 3 },
    { id: 'ink-pad', category: 'inkPad', imageSrc: ITEM('ink-pad'), shadowSrc: SHADOW('ink-pad'),
      bbox: { x: 0.5180, y: 0.5967, w: 0.0994, h: 0.1354 }, salience: 2, centrality: 3 },
    { id: 'satchel', category: 'satchel', imageSrc: ITEM('satchel'), shadowSrc: SHADOW('satchel'),
      bbox: { x: 0.6160, y: 0.5884, w: 0.2597, h: 0.2716 }, salience: 3, centrality: 2 },
    { id: 'postcard', category: 'postcard', imageSrc: ITEM('postcard'), shadowSrc: SHADOW('postcard'),
      bbox: { x: 0.4420, y: 0.7376, w: 0.1761, h: 0.1077 }, salience: 2, centrality: 3 },
    { id: 'letter-opener', category: 'letterOpener', imageSrc: ITEM('letter-opener'), shadowSrc: SHADOW('letter-opener'),
      bbox: { x: 0.2486, y: 0.8131, w: 0.2811, h: 0.0958 }, salience: 1, centrality: 2 },
    { id: 'key', category: 'key', imageSrc: ITEM('key'), shadowSrc: SHADOW('key'),
      bbox: { x: 0.7576, y: 0.8720, w: 0.1285, h: 0.0691 }, salience: 1, centrality: 1 },
  ],
};
