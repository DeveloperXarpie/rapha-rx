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
 * bbox values come from assets-src/picture-postcard/post-office/boxes.json. Regenerate
 * with scripts/pp-seed-boxes.py and verify with scripts/pp-preview.py before editing
 * them by hand - the preview's contact-point check catches a misplaced item.
 */
const ITEM = (id: string) => `/pp/scenes/post-office/items/${id}.webp`;

export const postOffice: SceneDef = {
  id: 'post-office',
  theme: 'postOffice',
  background: [],
  backgroundImage: '/pp/scenes/post-office/background.webp',
  renderScale: 1,
  pinned: true,
  slots: [
    { id: 'scale', category: 'weighingScale', imageSrc: ITEM('scale'),
      bbox: { x: 0.0620, y: 0.3720, w: 0.1820, h: 0.1098 }, salience: 3, centrality: 2 },
    { id: 'bell', category: 'bell', imageSrc: ITEM('bell'),
      bbox: { x: 0.4360, y: 0.4290, w: 0.0620, h: 0.0580 }, salience: 1, centrality: 3 },
    { id: 'parcel', category: 'parcel', imageSrc: ITEM('parcel'),
      bbox: { x: 0.1592, y: 0.5506, w: 0.1942, h: 0.1669 }, salience: 3, centrality: 2 },
    { id: 'magnifier', category: 'magnifier', imageSrc: ITEM('magnifier'),
      bbox: { x: 0.2977, y: 0.6719, w: 0.1638, h: 0.1335 }, salience: 2, centrality: 3 },
    { id: 'stamp', category: 'rubberStamp', imageSrc: ITEM('stamp'),
      bbox: { x: 0.4444, y: 0.5971, w: 0.0657, h: 0.1153 }, salience: 2, centrality: 3 },
    { id: 'ink-pad', category: 'inkPad', imageSrc: ITEM('ink-pad'),
      bbox: { x: 0.5182, y: 0.5971, w: 0.0981, h: 0.1284 }, salience: 2, centrality: 3 },
    { id: 'satchel', category: 'satchel', imageSrc: ITEM('satchel'),
      bbox: { x: 0.6163, y: 0.5890, w: 0.2528, h: 0.2569 }, salience: 3, centrality: 2 },
    { id: 'postcard', category: 'postcard', imageSrc: ITEM('postcard'),
      bbox: { x: 0.4424, y: 0.7377, w: 0.1739, h: 0.0809 }, salience: 2, centrality: 3 },
    { id: 'letter-opener', category: 'letterOpener', imageSrc: ITEM('letter-opener'),
      bbox: { x: 0.2492, y: 0.8135, w: 0.2811, h: 0.0941 }, salience: 1, centrality: 2 },
    { id: 'key', category: 'key', imageSrc: ITEM('key'),
      bbox: { x: 0.7579, y: 0.8722, w: 0.1284, h: 0.0698 }, salience: 1, centrality: 1 },
  ],
};
