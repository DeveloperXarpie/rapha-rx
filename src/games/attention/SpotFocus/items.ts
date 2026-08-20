/**
 * The object catalogue for Spot Focus.
 *
 * Artwork is sliced from `assets-src/Spot_Focus_Assets/` into `public/spot-assets/` by
 * `scripts/slice_spot_focus_assets.py`; the ids here are that script's ids.
 *
 * `family` and `twin` are the whole difficulty model. A `subtle` difference swaps an
 * item for its twin, a `medium` one for another member of its family, and a `bold` one
 * for something out of a different family. That is why two hundred objects was a better
 * art delivery than a smaller set with hand-drawn variants: the tiers come from how the
 * objects relate to each other, not from extra drawing.
 *
 * `globe-2` is sliced but deliberately absent here. It is the same globe as `globe`, and
 * a difference nobody can see is a difference nobody can find.
 */

export type Subtlety = 'bold' | 'medium' | 'subtle';

export interface SpotItem {
  id: string;
  labelKey: string;
  family: string;
  /** Near-identical partner. Authored on both members of the pair. */
  twin?: string;
}

const item = (id: string, family: string, twin?: string): SpotItem => ({
  id,
  labelKey: `spot-focus.item.${id}`,
  family,
  ...(twin ? { twin } : {}),
});

export const ITEMS: SpotItem[] = [
  // ── Crockery, drinkware, glassware ──────────────────────────────────────
  item('bowl', 'crockery'),
  item('dinner-plate', 'crockery'),
  item('stack-of-bowls', 'crockery'),
  item('blue-mug', 'drinkware'),
  item('pink-teacup-with-saucer', 'drinkware'),
  item('drinking-glass', 'glassware'),
  item('wine-glass', 'glassware'),
  item('metal-spoon', 'cutlery', 'wooden-spoon'),
  item('wooden-spoon', 'cutlery', 'metal-spoon'),
  item('fork', 'cutlery'),
  item('table-knife', 'cutlery'),

  // ── Kitchen ─────────────────────────────────────────────────────────────
  item('red-kettle', 'hot-drinks'),
  item('blue-teapot', 'hot-drinks'),
  item('coffee-carafe', 'hot-drinks'),
  item('cooking-pot', 'cookware'),
  item('frying-pan', 'cookware'),
  item('colander', 'cookware'),
  item('chopping-board', 'prep'),
  item('kitchen-utensil-holder', 'prep'),
  item('oven-mitt', 'prep'),
  item('salt-shaker', 'seasoning', 'pepper-grinder'),
  item('pepper-grinder', 'seasoning', 'salt-shaker'),
  item('cooking-oil-bottle', 'seasoning'),
  item('spice-jar', 'jars', 'herb-jar'),
  item('herb-jar', 'jars', 'spice-jar'),
  item('honey-jar', 'jars', 'jam-jar'),
  item('jam-jar', 'jars', 'honey-jar'),
  item('cookie-jar', 'jars', 'sugar-cube-jar'),
  item('sugar-cube-jar', 'jars', 'cookie-jar'),
  item('toaster', 'counter-appliances'),
  item('microwave-oven', 'counter-appliances'),
  item('blender', 'counter-appliances'),
  item('stand-mixer', 'counter-appliances'),
  item('rice-cooker', 'counter-appliances'),
  item('air-fryer', 'counter-appliances'),
  item('pressure-cooker', 'counter-appliances'),
  item('waffle-maker', 'counter-appliances', 'sandwich-toaster'),
  item('sandwich-toaster', 'counter-appliances', 'waffle-maker'),

  // ── Food ────────────────────────────────────────────────────────────────
  item('tomato', 'fruit'),
  item('lemon', 'fruit', 'orange'),
  item('orange', 'fruit', 'lemon'),
  item('red-apple', 'fruit', 'green-apple'),
  item('green-apple', 'fruit', 'red-apple'),
  item('banana', 'fruit'),
  item('blueberry-cupcake', 'baked-treats'),
  item('chocolate-chip-cookie', 'baked-treats'),
  item('pink-doughnut', 'baked-treats'),
  item('strawberry-cake-slice', 'baked-treats'),

  // ── Plants and flowers ──────────────────────────────────────────────────
  item('daisy-flower-pot', 'potted-plants', 'sunflower-pot'),
  item('sunflower-pot', 'potted-plants', 'daisy-flower-pot'),
  item('lavender-pot', 'potted-plants'),
  item('monstera-plant', 'potted-plants'),
  item('cactus', 'potted-plants'),
  item('pink-hydrangea-pot', 'potted-plants'),
  item('leafy-plant-in-basket', 'potted-plants'),
  item('white-orchid', 'potted-plants'),
  item('potted-leafy-plant', 'potted-plants', 'small-potted-plant'),
  item('small-potted-plant', 'potted-plants', 'potted-leafy-plant'),
  item('yellow-tulips-in-vase', 'cut-flowers'),
  item('red-roses-in-jug', 'cut-flowers'),

  // ── Things on a shelf or a wall ─────────────────────────────────────────
  item('red-alarm-clock', 'clocks', 'green-alarm-clock'),
  item('blue-wall-clock', 'clocks'),
  item('green-alarm-clock', 'clocks', 'red-alarm-clock'),
  item('hourglass', 'desk-objects'),
  item('globe', 'desk-objects'),
  item('stack-of-books', 'books'),
  item('open-book', 'books'),
  item('framed-beach-picture', 'wall-art', 'framed-mountain-picture'),
  item('framed-mountain-picture', 'wall-art', 'framed-beach-picture'),
  item('oval-mirror', 'wall-art'),
  item('window-with-curtains', 'wall-art'),

  // ── Soft furnishings ────────────────────────────────────────────────────
  item('yellow-cushion', 'cushions', 'pink-polka-dot-cushion'),
  item('blue-patterned-cushion', 'cushions'),
  item('pink-polka-dot-cushion', 'cushions', 'yellow-cushion'),
  item('blue-checked-blanket', 'blankets'),
  item('folded-towels', 'towels', 'stack-of-folded-towels'),
  item('basket-of-towels', 'towels'),
  item('stack-of-folded-towels', 'towels', 'folded-towels'),
  item('bath-towel', 'towels'),

  // ── Bathroom ────────────────────────────────────────────────────────────
  item('rubber-duck', 'bath-items'),
  item('soap-dish-with-soap', 'bath-items'),
  item('liquid-soap-dispenser', 'bath-items'),
  item('toothbrush-cup', 'bath-items'),
  item('plunger', 'bathroom-fixtures'),
  item('shower-head', 'bathroom-fixtures'),
  item('bathroom-bin', 'bathroom-fixtures'),
  item('tissue-box', 'paper-goods'),
  item('toilet-paper-roll', 'paper-goods'),

  // ── Odds and ends ───────────────────────────────────────────────────────
  item('scissors', 'small-hardware'),
  item('colourful-buttons', 'small-hardware'),
  item('keys-with-key-tag', 'small-hardware'),
  item('padlock', 'small-hardware'),
  item('remote-control', 'handheld-devices'),
  item('game-controller', 'handheld-devices'),
  item('flashlight', 'handheld-devices'),
  item('white-candle', 'candles', 'purple-candle'),
  item('purple-candle', 'candles', 'white-candle'),
  item('candlestick', 'candles'),
  item('lantern', 'candles'),
  item('wicker-basket', 'baskets', 'laundry-basket'),
  item('laundry-basket', 'baskets', 'wicker-basket'),

  // ── Housework ───────────────────────────────────────────────────────────
  item('vacuum-cleaner', 'cleaning'),
  item('broom', 'cleaning'),
  item('dustpan-and-brush', 'cleaning'),
  item('spray-bottle', 'cleaning'),
  item('laundry-detergent-bottle', 'cleaning'),
  item('watering-can', 'garden'),
  item('dog', 'pets'),
  item('cat', 'pets'),
  item('house', 'buildings'),
  item('birdhouse', 'buildings'),
  item('table-lamp', 'lamps', 'desk-lamp'),
  item('desk-lamp', 'lamps', 'table-lamp'),
  item('bedside-lamp', 'lamps'),

  // ── Furniture ───────────────────────────────────────────────────────────
  item('red-sofa', 'seating'),
  item('yellow-armchair', 'seating'),
  item('rocking-chair', 'seating'),
  item('dining-chair', 'seating'),
  item('office-chair', 'seating'),
  item('wooden-stool', 'seating'),
  item('bean-bag-chair', 'seating'),
  item('round-dining-table', 'tables'),
  item('coffee-table', 'tables'),
  item('study-desk', 'tables'),
  item('wardrobe', 'storage-furniture'),
  item('chest-of-drawers', 'storage-furniture'),
  item('tall-drawer-cabinet', 'storage-furniture'),
  item('shoe-rack', 'storage-furniture'),
  item('coat-stand', 'storage-furniture'),
  item('single-bed', 'beds'),
  item('bunk-bed', 'beds'),
  item('baby-crib', 'beds'),
  item('hammock', 'beds'),

  // ── Appliances ──────────────────────────────────────────────────────────
  item('refrigerator', 'large-appliances'),
  item('washing-machine', 'large-appliances'),
  item('clothes-iron', 'large-appliances'),
  item('table-fan', 'climate'),
  item('air-conditioner', 'climate'),
  item('sewing-machine', 'craft'),
  item('ball-of-yarn', 'craft'),
  item('hair-dryer', 'grooming-appliances'),
  item('electric-shaver', 'grooming-appliances'),

  // ── Electronics ─────────────────────────────────────────────────────────
  item('laptop', 'computers'),
  item('desktop-monitor', 'computers'),
  item('tablet', 'computers'),
  item('printer', 'computers'),
  item('smartphone', 'mobile'),
  item('smartwatch', 'mobile'),
  item('headphones', 'audio'),
  item('bluetooth-speaker', 'audio'),
  item('digital-camera', 'gadgets'),
  item('game-console', 'gadgets'),
  item('wi-fi-router', 'gadgets'),
  item('usb-flash-drive', 'gadgets'),
  item('computer-mouse', 'peripherals'),
  item('computer-keyboard', 'peripherals'),

  // ── Clothing and personal ───────────────────────────────────────────────
  item('backpack', 'bags'),
  item('handbag', 'bags'),
  item('suitcase', 'bags'),
  item('wallet', 'bags'),
  item('sunglasses', 'accessories'),
  item('baseball-cap', 'accessories'),
  item('scarf', 'accessories'),
  item('leather-belt', 'accessories'),
  item('sneakers', 'footwear', 'hiking-boots'),
  item('hiking-boots', 'footwear', 'sneakers'),
  item('umbrella', 'outerwear'),
  item('raincoat', 'outerwear'),
  item('t-shirt', 'clothing'),
  item('hoodie', 'clothing'),
  item('pink-dress', 'clothing'),
  item('jeans', 'clothing'),
  item('necklace', 'jewellery'),
  item('bracelet', 'jewellery'),
  item('ring', 'jewellery'),
  item('perfume-bottle', 'cosmetics'),
  item('lipstick', 'cosmetics'),
  item('nail-polish', 'cosmetics'),
  item('hair-comb', 'haircare', 'hairbrush'),
  item('hairbrush', 'haircare', 'hair-comb'),
  item('shampoo-bottle', 'toiletries'),
  item('lotion-bottle', 'toiletries'),

  // ── Tools and hardware ──────────────────────────────────────────────────
  item('first-aid-kit', 'medical'),
  item('thermometer', 'medical'),
  item('stethoscope', 'medical'),
  item('medicine-bottle', 'medical'),
  item('adhesive-bandages', 'medical'),
  item('toolbox', 'tools'),
  item('hammer', 'tools'),
  item('screwdriver', 'tools'),
  item('wrench', 'tools'),
  item('pliers', 'tools'),
  item('power-drill', 'tools'),
  item('tape-measure', 'tools'),
  item('paintbrush', 'painting'),
  item('paint-bucket', 'painting'),
  item('light-bulb', 'electrical'),
  item('extension-power-strip', 'electrical'),
  item('step-ladder', 'electrical'),
];

export const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

const BY_FAMILY = ITEMS.reduce<Map<string, SpotItem[]>>((acc, i) => {
  const list = acc.get(i.family) ?? [];
  list.push(i);
  acc.set(i.family, list);
  return acc;
}, new Map());

export function familyMembers(family: string): SpotItem[] {
  return BY_FAMILY.get(family) ?? [];
}
