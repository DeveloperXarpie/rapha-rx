// ─── Types ────────────────────────────────────────────────────────────────────

export type WordDirection =
  | 'horizontal'
  | 'horizontal-back'
  | 'vertical'
  | 'vertical-back'
  | 'diagonal-dr'   // down-right
  | 'diagonal-dl'   // down-left
  | 'diagonal-ur'   // up-right
  | 'diagonal-ul';  // up-left

export interface WordPlacement {
  word: string;
  startRow: number;
  startCol: number;
  direction: WordDirection;
}

export interface GeneratedWordSearchContent {
  theme: string;
  themeIcon: string;
  words: string[];            // target word list (in display order)
  grid: string[][];           // rows × cols letter grid
  placements: WordPlacement[]; // where each word sits (for analytics / debug)
}

// ─── Theme vocabulary ─────────────────────────────────────────────────────────

const THEMES = [
  {
    name: 'South Indian Fruits',
    icon: '🥭',
    words: ['MANGO', 'GUAVA', 'GRAPE', 'JAMUN', 'LEMON', 'PLUM', 'PAPAYA'],
  },
  {
    name: 'Temple Items',
    icon: '🪔',
    words: ['DIYA', 'BELL', 'LAMP', 'LOTUS', 'TULSI', 'PUJA'],
  },
  {
    name: 'Breakfast Foods',
    icon: '🍽️',
    words: ['IDLI', 'DOSA', 'VADA', 'UPMA', 'POHA', 'ROTI'],
  },
  {
    name: 'Garden Flowers',
    icon: '🌸',
    words: ['ROSE', 'LILY', 'LOTUS', 'DAISY', 'TULIP'],
  },
  {
    name: 'Birds of India',
    icon: '🦜',
    words: ['CROW', 'KOEL', 'MYNA', 'ROBIN', 'SWIFT', 'PARROT'],
  },
];

// ─── Direction vectors [row-step, col-step] ───────────────────────────────────

const DIRECTION_VECTORS: Record<WordDirection, [number, number]> = {
  'horizontal':      [0,  1],
  'horizontal-back': [0, -1],
  'vertical':        [1,  0],
  'vertical-back':   [-1, 0],
  'diagonal-dr':     [1,  1],
  'diagonal-dl':     [1, -1],
  'diagonal-ur':     [-1, 1],
  'diagonal-ul':     [-1,-1],
};

// Letters that look distinct and won't confuse elderly eyes (no I/l/1 confusion pair issues)
const FILL_CHARS = 'ABCDEFGHJKMNOPRSTUVWY';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function getAvailableDirections(
  allowDiagonal: boolean,
  allowBackwards: boolean,
): WordDirection[] {
  const dirs: WordDirection[] = ['horizontal', 'vertical'];
  if (allowBackwards) {
    dirs.push('horizontal-back', 'vertical-back');
  }
  if (allowDiagonal) {
    dirs.push('diagonal-dr', 'diagonal-dl');
    if (allowBackwards) {
      dirs.push('diagonal-ur', 'diagonal-ul');
    }
  }
  return dirs;
}

function canPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: WordDirection,
  gridRows: number,
  gridCols: number,
): boolean {
  const [dr, dc] = DIRECTION_VECTORS[dir];
  for (let i = 0; i < word.length; i++) {
    const r = row + dr * i;
    const c = col + dc * i;
    if (r < 0 || r >= gridRows || c < 0 || c >= gridCols) return false;
    // Allow overlap only when the existing letter matches
    if (grid[r][c] !== '' && grid[r][c] !== word[i]) return false;
  }
  return true;
}

function doPlace(
  grid: string[][],
  word: string,
  row: number,
  col: number,
  dir: WordDirection,
): void {
  const [dr, dc] = DIRECTION_VECTORS[dir];
  for (let i = 0; i < word.length; i++) {
    grid[row + dr * i][col + dc * i] = word[i];
  }
}

// ─── Main export ──────────────────────────────────────────────────────────────

export interface WordSearchParams {
  gridRows: number;
  gridCols: number;
  wordCount: number;
  allowDiagonal: boolean;
  allowBackwards: boolean;
  themeIndex?: number; // optional: force a theme (rotates randomly if omitted)
}

export function generateWordSearchContent(
  params: WordSearchParams,
): GeneratedWordSearchContent {
  const { gridRows, gridCols, wordCount, allowDiagonal, allowBackwards } = params;

  // Pick theme
  const themeIndex = params.themeIndex ?? Math.floor(Math.random() * THEMES.length);
  const theme = THEMES[themeIndex % THEMES.length];

  // Filter to words that can fit along any axis of the grid
  const maxLen = Math.max(gridRows, gridCols);
  const eligible = theme.words.filter(w => w.length <= maxLen);

  // Shuffle and take wordCount
  const shuffled = [...eligible].sort(() => Math.random() - 0.5);
  const targetWords = shuffled.slice(0, Math.min(wordCount, shuffled.length));

  const availDirs = getAvailableDirections(allowDiagonal, allowBackwards);
  const grid: string[][] = Array.from({ length: gridRows }, () => Array(gridCols).fill(''));
  const placements: WordPlacement[] = [];

  for (const word of targetWords) {
    let placed = false;
    for (let attempt = 0; attempt < 300 && !placed; attempt++) {
      const dir = availDirs[Math.floor(Math.random() * availDirs.length)];
      const row = Math.floor(Math.random() * gridRows);
      const col = Math.floor(Math.random() * gridCols);
      if (canPlace(grid, word, row, col, dir, gridRows, gridCols)) {
        doPlace(grid, word, row, col, dir);
        placements.push({ word, startRow: row, startCol: col, direction: dir });
        placed = true;
      }
    }
    // If still not placed after 300 attempts, skip this word silently
  }

  // Fill empty cells with random consonant/vowel mix
  for (let r = 0; r < gridRows; r++) {
    for (let c = 0; c < gridCols; c++) {
      if (grid[r][c] === '') {
        grid[r][c] = FILL_CHARS[Math.floor(Math.random() * FILL_CHARS.length)];
      }
    }
  }

  return {
    theme: theme.name,
    themeIcon: theme.icon,
    words: placements.map(p => p.word), // only words that were successfully placed
    grid,
    placements,
  };
}
