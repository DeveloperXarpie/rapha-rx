/**
 * The Market Memory goods.
 *
 * Artwork is raster, sliced from `assets-src/ShoppingList/items-2.png` into
 * `public/shop-assets/` by `scripts/slice_shopping_assets.py`. Ids here match the ids in
 * that script's ITEM_IDS table; `sprites.test.ts` fails the build if they drift apart.
 */

export type Group = 'produce' | 'spices' | 'pulses' | 'staples' | 'pantry' | 'household';

export interface Item {
  id: string;
  name: string;
  group: Group;
  /**
   * The lookalike this item seeds as a decoy. Deliberately asymmetric in places: a twin
   * is "what would I grab by mistake", which is not always mutual.
   */
  twin: string;
}

const BASE = '/shop-assets';

/** Where the item's artwork lives. */
export function spriteFor(item: Item): string {
  return `${BASE}/item-${item.id}.png`;
}

export const ITEMS: Item[] = [
  // ─── Produce ────────────────────────────────────────────────────────────────
  { id: 'tomatoes',      name: 'Tomatoes',      group: 'produce',   twin: 'vine-tomatoes' },
  { id: 'vine-tomatoes', name: 'Vine Tomatoes', group: 'produce',   twin: 'tomatoes'      },
  { id: 'apples',        name: 'Apples',        group: 'produce',   twin: 'tomatoes'      },
  { id: 'orange',        name: 'Orange',        group: 'produce',   twin: 'apples'        },
  { id: 'onion',         name: 'Onion',         group: 'produce',   twin: 'pomegranate'   },
  { id: 'pomegranate',   name: 'Pomegranate',   group: 'produce',   twin: 'onion'         },
  { id: 'potatoes',      name: 'Potatoes',      group: 'produce',   twin: 'onion'         },
  { id: 'carrots',       name: 'Carrots',       group: 'produce',   twin: 'red-chillies'  },
  { id: 'bananas',       name: 'Bananas',       group: 'produce',   twin: 'mango'         },
  { id: 'mango',         name: 'Mango',         group: 'produce',   twin: 'bananas'       },
  { id: 'grapes',        name: 'Grapes',        group: 'produce',   twin: 'green-beans'   },
  { id: 'capsicum',      name: 'Capsicum',      group: 'produce',   twin: 'brinjal'       },
  { id: 'brinjal',       name: 'Brinjal',       group: 'produce',   twin: 'capsicum'      },
  { id: 'okra',          name: 'Okra',          group: 'produce',   twin: 'green-chillies'},
  { id: 'green-beans',   name: 'Green Beans',   group: 'produce',   twin: 'okra'          },
  { id: 'cauliflower',   name: 'Cauliflower',   group: 'produce',   twin: 'cabbage'       },
  { id: 'cabbage',       name: 'Cabbage',       group: 'produce',   twin: 'cauliflower'   },
  { id: 'broccoli',      name: 'Broccoli',      group: 'produce',   twin: 'cauliflower'   },
  { id: 'curry-leaves',  name: 'Curry Leaves',  group: 'produce',   twin: 'coriander'     },
  { id: 'coriander',     name: 'Coriander',     group: 'produce',   twin: 'curry-leaves'  },

  // ─── Spices ─────────────────────────────────────────────────────────────────
  { id: 'ginger',         name: 'Ginger',         group: 'spices',  twin: 'turmeric'       },
  { id: 'turmeric',       name: 'Turmeric',       group: 'spices',  twin: 'ginger'         },
  { id: 'garlic',         name: 'Garlic',         group: 'spices',  twin: 'onion'          },
  { id: 'green-chillies', name: 'Green Chillies', group: 'spices',  twin: 'okra'           },
  { id: 'red-chillies',   name: 'Red Chillies',   group: 'spices',  twin: 'carrots'        },
  { id: 'cumin',          name: 'Cumin Seeds',    group: 'spices',  twin: 'kala-chana'     },
  { id: 'sambar-masala',  name: 'Sambar Masala',  group: 'spices',  twin: 'garam-masala'   },
  { id: 'garam-masala',   name: 'Garam Masala',   group: 'spices',  twin: 'sambar-masala'  },

  // ─── Pulses ─────────────────────────────────────────────────────────────────
  //
  // The sharpest twins in the game: five bowls of split pulses that differ only in
  // colour. The name plate on the crate is what tells them apart, which is the point.
  { id: 'kala-chana',   name: 'Kala Chana',   group: 'pulses',   twin: 'urad-dal'    },
  { id: 'urad-dal',     name: 'Urad Dal',     group: 'pulses',   twin: 'kala-chana'  },
  { id: 'toor-dal',     name: 'Toor Dal',     group: 'pulses',   twin: 'chana-dal'   },
  { id: 'chana-dal',    name: 'Chana Dal',    group: 'pulses',   twin: 'toor-dal'    },
  { id: 'masoor-dal',   name: 'Masoor Dal',   group: 'pulses',   twin: 'toor-dal'    },
  { id: 'moong-dal',    name: 'Moong Dal',    group: 'pulses',   twin: 'urad-dal'    },
  { id: 'rajma',        name: 'Rajma',        group: 'pulses',   twin: 'kala-chana'  },
  { id: 'kabuli-chana', name: 'Kabuli Chana', group: 'pulses',   twin: 'white-chana' },
  { id: 'white-chana',  name: 'White Chana',  group: 'pulses',   twin: 'kabuli-chana'},

  // ─── Staples ────────────────────────────────────────────────────────────────
  { id: 'rice',        name: 'Rice',        group: 'staples',  twin: 'sugar-loose' },
  { id: 'sugar-loose', name: 'Sugar',       group: 'staples',  twin: 'salt-loose'  },
  { id: 'salt-loose',  name: 'Salt',        group: 'staples',  twin: 'sugar-loose' },
  { id: 'atta-loose',  name: 'Wheat Flour', group: 'staples',  twin: 'rava'        },
  { id: 'rava',        name: 'Rava',        group: 'staples',  twin: 'atta-loose'  },
  { id: 'rice-pack',   name: 'Rice Pack',   group: 'staples',  twin: 'atta-pack'   },
  { id: 'atta-pack',   name: 'Atta Pack',   group: 'staples',  twin: 'rice-pack'   },
  { id: 'sugar-pack',  name: 'Sugar Pack',  group: 'staples',  twin: 'salt-pack'   },
  { id: 'salt-pack',   name: 'Salt Pack',   group: 'staples',  twin: 'sugar-pack'  },
  { id: 'bread',       name: 'Bread',       group: 'staples',  twin: 'biscuits'    },
  { id: 'biscuits',    name: 'Biscuits',    group: 'staples',  twin: 'noodles'     },
  { id: 'noodles',     name: 'Noodles',     group: 'staples',  twin: 'biscuits'    },

  // ─── Pantry ─────────────────────────────────────────────────────────────────
  { id: 'sunflower-oil', name: 'Sunflower Oil', group: 'pantry', twin: 'groundnut-oil' },
  { id: 'groundnut-oil', name: 'Groundnut Oil', group: 'pantry', twin: 'sunflower-oil' },
  { id: 'ghee',          name: 'Ghee',          group: 'pantry', twin: 'groundnut-oil' },
  { id: 'milk',          name: 'Milk',          group: 'pantry', twin: 'paneer'        },
  { id: 'paneer',        name: 'Paneer',        group: 'pantry', twin: 'milk'          },
  { id: 'curd',          name: 'Curd',          group: 'pantry', twin: 'paneer'        },
  { id: 'eggs',          name: 'Eggs',          group: 'pantry', twin: 'bread'         },
  { id: 'tea',           name: 'Tea',           group: 'pantry', twin: 'garam-masala'  },
  { id: 'coffee',        name: 'Coffee',        group: 'pantry', twin: 'tea'           },

  // ─── Household ──────────────────────────────────────────────────────────────
  //
  // Four items, below the `listCategory` margin, so `poolFor` never draws a whole list
  // from this group. They still stock the shelf as decoys, which is what they are for.
  { id: 'detergent',       name: 'Detergent',      group: 'household', twin: 'milk'            },
  { id: 'dish-liquid',     name: 'Dish Liquid',    group: 'household', twin: 'toilet-cleaner'  },
  { id: 'toilet-cleaner',  name: 'Toilet Cleaner', group: 'household', twin: 'dish-liquid'     },
  { id: 'tissue',          name: 'Tissue',         group: 'household', twin: 'detergent'       },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

export const GROUPS: Group[] = ['produce', 'spices', 'pulses', 'staples', 'pantry', 'household'];
