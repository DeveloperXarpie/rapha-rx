/**
 * Procedural content generator for SpotFocus.
 * Produces a unique scene with randomly placed differences each round.
 */

import type { SpotFocusDynamicParams } from '../../lib/dynamicDifficulty';

// ── Themed cell banks ────────────────────────────────────────────────────────

interface CellDef {
  id: string;
  display: string;
  label: string;
}

interface SwapDef {
  original: CellDef;
  modified: CellDef;
}

const KITCHEN_CELLS: CellDef[] = [
  { id: 'kettle',  display: '🫖', label: 'Tea Kettle' },
  { id: 'jar',     display: '🫙', label: 'Pickle Jar' },
  { id: 'pot',     display: '🫕', label: 'Cooking Pot' },
  { id: 'cooker',  display: '🍲', label: 'Pressure Cooker' },
  { id: 'spoon',   display: '🥄', label: 'Serving Spoon' },
  { id: 'tomato',  display: '🍅', label: 'Tomato' },
  { id: 'curry',   display: '🌿', label: 'Curry Leaves' },
  { id: 'stove',   display: '🔥', label: 'Gas Stove' },
  { id: 'salt',    display: '🧂', label: 'Salt' },
  { id: 'bowl',    display: '🥣', label: 'Bowl' },
  { id: 'onion',   display: '🧅', label: 'Onion' },
  { id: 'lime',    display: '🍋', label: 'Lime' },
  { id: 'window',  display: '🪟', label: 'Window' },
  { id: 'lamp',    display: '💡', label: 'Light' },
  { id: 'oil',     display: '🫙', label: 'Oil Jar' },
  { id: 'ladle',   display: '🥄', label: 'Ladle' },
];

const KITCHEN_SWAPS: SwapDef[] = [
  { original: { id: 'kettle', display: '🫖', label: 'Tea Kettle' },  modified: { id: 'kettle', display: '☕', label: 'Coffee Cup' } },
  { original: { id: 'pot',    display: '🫕', label: 'Cooking Pot' }, modified: { id: 'pot',    display: '',   label: 'Empty' } },
  { original: { id: 'tomato', display: '🍅', label: 'Tomato' },     modified: { id: 'tomato', display: '🍅🍅', label: 'Two Tomatoes' } },
  { original: { id: 'bowl',   display: '🥣', label: 'Bowl' },      modified: { id: 'bowl',   display: '🪣', label: 'Bucket' } },
  { original: { id: 'salt',   display: '🧂', label: 'Salt' },      modified: { id: 'salt',   display: '🫙', label: 'Jar' } },
  { original: { id: 'onion',  display: '🧅', label: 'Onion' },     modified: { id: 'onion',  display: '🧅🧅', label: 'Two Onions' } },
  { original: { id: 'lamp',   display: '💡', label: 'Light' },     modified: { id: 'lamp',   display: '',   label: 'Empty' } },
  { original: { id: 'oil',    display: '🫙', label: 'Oil Jar' },   modified: { id: 'oil',    display: '',   label: 'Empty' } },
  { original: { id: 'window', display: '🪟', label: 'Window' },    modified: { id: 'window', display: '🚪', label: 'Door' } },
  { original: { id: 'lime',   display: '🍋', label: 'Lime' },      modified: { id: 'lime',   display: '🍊', label: 'Orange' } },
];

const GARDEN_CELLS: CellDef[] = [
  { id: 'tulsi',     display: '🌿', label: 'Tulsi' },
  { id: 'neem',      display: '🌳', label: 'Neem Tree' },
  { id: 'marigold',  display: '🌺', label: 'Marigold' },
  { id: 'hibiscus',  display: '🌸', label: 'Hibiscus' },
  { id: 'pot',       display: '🪴', label: 'Pot' },
  { id: 'watering',  display: '🚿', label: 'Watering Can' },
  { id: 'bench',     display: '🪑', label: 'Bench' },
  { id: 'jasmine',   display: '🌼', label: 'Jasmine' },
  { id: 'soil',      display: '🟫', label: 'Soil Patch' },
  { id: 'butterfly', display: '🦋', label: 'Butterfly' },
  { id: 'sparrow',   display: '🐦', label: 'Sparrow' },
  { id: 'sun',       display: '☀️', label: 'Sunny Patch' },
  { id: 'rose',      display: '🌹', label: 'Rose' },
  { id: 'aloe',      display: '🌵', label: 'Aloe Vera' },
  { id: 'mango',     display: '🥭', label: 'Mango Tree' },
  { id: 'coconut',   display: '🥥', label: 'Coconut Tree' },
];

const GARDEN_SWAPS: SwapDef[] = [
  { original: { id: 'marigold',  display: '🌺', label: 'Marigold' },  modified: { id: 'marigold',  display: '🌻', label: 'Sunflower' } },
  { original: { id: 'pot',       display: '🪴', label: 'Pot' },       modified: { id: 'pot',       display: '',   label: 'Empty' } },
  { original: { id: 'watering',  display: '🚿', label: 'Watering' },  modified: { id: 'watering',  display: '🪣', label: 'Bucket' } },
  { original: { id: 'butterfly', display: '🦋', label: 'Butterfly' }, modified: { id: 'butterfly', display: '🐛', label: 'Caterpillar' } },
  { original: { id: 'sun',       display: '☀️', label: 'Sunny' },     modified: { id: 'sun',       display: '🌧️', label: 'Rain Cloud' } },
  { original: { id: 'rose',      display: '🌹', label: 'Rose' },      modified: { id: 'rose',      display: '🌷', label: 'Tulip' } },
  { original: { id: 'sparrow',   display: '🐦', label: 'Sparrow' },   modified: { id: 'sparrow',   display: '🐦‍⬛', label: 'Crow' } },
  { original: { id: 'coconut',   display: '🥥', label: 'Coconut' },   modified: { id: 'coconut',   display: '🍌', label: 'Banana Tree' } },
  { original: { id: 'aloe',      display: '🌵', label: 'Aloe Vera' }, modified: { id: 'aloe',      display: '🌴', label: 'Palm Tree' } },
  { original: { id: 'mango',     display: '🥭', label: 'Mango' },     modified: { id: 'mango',     display: '🍎', label: 'Apple' } },
];

const LIVING_ROOM_CELLS: CellDef[] = [
  { id: 'clock',    display: '🕰️', label: 'Clock' },
  { id: 'photo',    display: '🖼️', label: 'Photo Frame' },
  { id: 'window',   display: '🪟', label: 'Window' },
  { id: 'fan',      display: '💨', label: 'Ceiling Fan' },
  { id: 'sofa',     display: '🛋️', label: 'Sofa' },
  { id: 'lamp',     display: '💡', label: 'Floor Lamp' },
  { id: 'table',    display: '🪵', label: 'Coffee Table' },
  { id: 'plant',    display: '🌿', label: 'Indoor Plant' },
  { id: 'remote',   display: '📱', label: 'Remote' },
  { id: 'cup',      display: '☕', label: 'Tea Cup' },
  { id: 'book',     display: '📚', label: 'Books' },
  { id: 'cat',      display: '🐈', label: 'Cat' },
  { id: 'mat',      display: '🟩', label: 'Doormat' },
  { id: 'shoes',    display: '👟', label: 'Shoes' },
  { id: 'bag',      display: '👜', label: 'Bag' },
  { id: 'umbrella', display: '☂️', label: 'Umbrella' },
];

const LIVING_ROOM_SWAPS: SwapDef[] = [
  { original: { id: 'clock',    display: '🕰️', label: 'Clock' },      modified: { id: 'clock',    display: '⏰', label: 'Alarm Clock' } },
  { original: { id: 'window',   display: '🪟', label: 'Window' },     modified: { id: 'window',   display: '🚪', label: 'Door' } },
  { original: { id: 'lamp',     display: '💡', label: 'Lamp' },       modified: { id: 'lamp',     display: '',   label: 'Empty' } },
  { original: { id: 'plant',    display: '🌿', label: 'Plant' },      modified: { id: 'plant',    display: '🌵', label: 'Cactus' } },
  { original: { id: 'remote',   display: '📱', label: 'Remote' },     modified: { id: 'remote',   display: '📺', label: 'TV Remote' } },
  { original: { id: 'book',     display: '📚', label: 'Books' },      modified: { id: 'book',     display: '📖', label: 'Single Book' } },
  { original: { id: 'shoes',    display: '👟', label: 'Shoes' },      modified: { id: 'shoes',    display: '👟👟', label: 'Two Pairs' } },
  { original: { id: 'umbrella', display: '☂️', label: 'Umbrella' },   modified: { id: 'umbrella', display: '',   label: 'Empty' } },
  { original: { id: 'cat',      display: '🐈', label: 'Cat' },        modified: { id: 'cat',      display: '🐕', label: 'Dog' } },
  { original: { id: 'cup',      display: '☕', label: 'Tea Cup' },     modified: { id: 'cup',      display: '🥤', label: 'Cold Drink' } },
];

interface ThemePool {
  cells: CellDef[];
  swaps: SwapDef[];
}

const THEME_POOLS: ThemePool[] = [
  { cells: KITCHEN_CELLS,     swaps: KITCHEN_SWAPS },
  { cells: GARDEN_CELLS,      swaps: GARDEN_SWAPS },
  { cells: LIVING_ROOM_CELLS, swaps: LIVING_ROOM_SWAPS },
];

// ── Shuffle helper ───────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generated content types ─────────────────────────────────────────────────

export interface SceneCell {
  id: string;
  display: string;
  label: string;
  isDifference?: true;
}

export interface GeneratedScene {
  label: string;
  originalRows: SceneCell[][];
  modifiedRows: SceneCell[][];
  differenceCount: number;
}

// ── Main generator ──────────────────────────────────────────────────────────

export function generateSpotFocusContent(params: SpotFocusDynamicParams): GeneratedScene {
  // Pick a random theme
  const theme = THEME_POOLS[Math.floor(Math.random() * THEME_POOLS.length)];

  const totalCells = params.gridRows * params.gridCols;

  // Pick enough cells for the grid
  const shuffledCells = shuffle(theme.cells).slice(0, totalCells);

  // Pick which cells will be differences
  const availableSwaps = shuffle(theme.swaps).filter(
    (swap) => shuffledCells.some((c) => c.id === swap.original.id)
  );
  const selectedSwaps = availableSwaps.slice(0, params.differenceCount);

  // Build grids
  const originalRows: SceneCell[][] = [];
  const modifiedRows: SceneCell[][] = [];

  for (let r = 0; r < params.gridRows; r++) {
    const origRow: SceneCell[] = [];
    const modRow: SceneCell[] = [];

    for (let c = 0; c < params.gridCols; c++) {
      const idx = r * params.gridCols + c;
      const cell = shuffledCells[idx];
      if (!cell) continue;

      const swap = selectedSwaps.find((s) => s.original.id === cell.id);

      origRow.push({ id: cell.id, display: cell.display, label: cell.label });

      if (swap) {
        modRow.push({
          id: swap.modified.id,
          display: swap.modified.display,
          label: swap.modified.label,
          isDifference: true,
        });
      } else {
        modRow.push({ id: cell.id, display: cell.display, label: cell.label });
      }
    }

    originalRows.push(origRow);
    modifiedRows.push(modRow);
  }

  const labels = ['Kitchen', 'Garden', 'Living Room'];
  const themeIndex = THEME_POOLS.indexOf(theme);

  return {
    label: labels[themeIndex] ?? 'Scene',
    originalRows,
    modifiedRows,
    differenceCount: selectedSwaps.length,
  };
}
