/**
 * Pure rules for Clear the Way.
 *
 * Nothing here touches the DOM, React or the clock. The view owns the pixels and the
 * drag; this owns what a legal board is, how far a block may slide, and when the key
 * is out. Every transition returns a fresh board.
 */

// ─── Types ────────────────────────────────────────────────────────────────────

export type Axis = 'x' | 'y';
export type ExitSide = 'left' | 'right' | 'top' | 'bottom';

export interface Exit {
  side: ExitSide;
  /** Row index for a left/right exit, column index for a top/bottom one. */
  index: number;
}

export interface Piece {
  /** Stable across a level; equal to the layout letter. */
  id: string;
  letter: string;
  /** Top-left cell. */
  col: number;
  row: number;
  w: number;
  h: number;
  isKey: boolean;
}

export interface Board {
  cols: number;
  rows: number;
  exit: Exit;
  pieces: Piece[];
}

export interface Move {
  pieceId: string;
  axis: Axis;
  /** Cells travelled; never zero. Negative is left or up. */
  delta: number;
}

/**
 * A level as authored. The layout is the source of truth for the pieces; `minMoves` and
 * `dependencyDepth` are recorded here for the runtime to score against and are asserted
 * against the solver in `__tests__/levels.test.ts`.
 */
export interface LevelDef {
  id: string;
  tier: number;
  cols: number;
  rows: number;
  exit: Exit;
  layout: string[];
  minMoves: number;
  /** Moves in the optimal solution that precede the key's first move. */
  dependencyDepth: number;
}

export const EMPTY_CELL = '.';
export const KEY_LETTER = 'K';
const MAX_PIECE_LENGTH = 3;

// ─── Parsing ──────────────────────────────────────────────────────────────────

/**
 * Turns an authored level into a board, throwing on anything malformed. Levels are
 * hand-written, so this is the gate that keeps a typo out of a resident's session: it
 * fires at parse time with the level named, not as a silently unsolvable puzzle.
 */
export function parseLevel(def: LevelDef): Board {
  const where = `level "${def.id}"`;

  if (def.layout.length !== def.rows) {
    throw new Error(`${where}: layout has ${def.layout.length} rows, expected ${def.rows}`);
  }
  def.layout.forEach((line, r) => {
    if (line.length !== def.cols) {
      throw new Error(`${where}: layout row ${r} has ${line.length} cols, expected ${def.cols}`);
    }
  });

  const sideExit = def.exit.side === 'left' || def.exit.side === 'right';
  const exitLimit = sideExit ? def.rows : def.cols;
  if (!Number.isInteger(def.exit.index) || def.exit.index < 0 || def.exit.index >= exitLimit) {
    throw new Error(`${where}: exit index ${def.exit.index} is outside the board`);
  }

  // Collect every cell bearing each letter, then prove each set is a rectangle.
  const cellsByLetter = new Map<string, { col: number; row: number }[]>();
  for (let row = 0; row < def.rows; row++) {
    for (let col = 0; col < def.cols; col++) {
      const letter = def.layout[row][col];
      if (letter === EMPTY_CELL) continue;
      const cells = cellsByLetter.get(letter) ?? [];
      cells.push({ col, row });
      cellsByLetter.set(letter, cells);
    }
  }

  const pieces: Piece[] = [];
  for (const [letter, cells] of cellsByLetter) {
    const cols = cells.map((c) => c.col);
    const rows = cells.map((c) => c.row);
    const minCol = Math.min(...cols);
    const minRow = Math.min(...rows);
    const w = Math.max(...cols) - minCol + 1;
    const h = Math.max(...rows) - minRow + 1;

    if (w * h !== cells.length) {
      throw new Error(`${where}: piece "${letter}" is not a solid rectangle`);
    }
    if (w > 1 && h > 1) {
      throw new Error(`${where}: piece "${letter}" is not a solid rectangle of width or height 1`);
    }
    if (Math.max(w, h) > MAX_PIECE_LENGTH) {
      throw new Error(`${where}: piece "${letter}" is longer than ${MAX_PIECE_LENGTH} cells`);
    }

    pieces.push({ id: letter, letter, col: minCol, row: minRow, w, h, isKey: letter === KEY_LETTER });
  }

  const key = pieces.find((p) => p.isKey);
  if (!key) throw new Error(`${where}: no key piece ("${KEY_LETTER}") in the layout`);

  if (sideExit) {
    if (key.h !== 1 || key.w !== 2) {
      throw new Error(`${where}: a left/right exit needs a 1x2 horizontal key`);
    }
    if (key.row !== def.exit.index) {
      throw new Error(`${where}: the key is not in the exit lane (row ${def.exit.index})`);
    }
  } else {
    if (key.w !== 1 || key.h !== 2) {
      throw new Error(`${where}: a top/bottom exit needs a 2x1 vertical key`);
    }
    if (key.col !== def.exit.index) {
      throw new Error(`${where}: the key is not in the exit lane (column ${def.exit.index})`);
    }
  }

  // Sorted so serialisation and rendering order are stable regardless of scan order.
  pieces.sort((a, b) => a.letter.localeCompare(b.letter));

  return { cols: def.cols, rows: def.rows, exit: def.exit, pieces };
}

// ─── Geometry helpers ─────────────────────────────────────────────────────────

/** Rectangles slide along their long axis only; a 1x1 is free on both. */
export function allowedAxes(piece: Piece): Axis[] {
  if (piece.w > 1) return ['x'];
  if (piece.h > 1) return ['y'];
  return ['x', 'y'];
}

function occupancy(board: Board, ignoreId?: string): (string | null)[] {
  const grid: (string | null)[] = new Array(board.cols * board.rows).fill(null);
  for (const piece of board.pieces) {
    if (piece.id === ignoreId) continue;
    for (let dy = 0; dy < piece.h; dy++) {
      for (let dx = 0; dx < piece.w; dx++) {
        grid[(piece.row + dy) * board.cols + piece.col + dx] = piece.id;
      }
    }
  }
  return grid;
}

function pieceOrThrow(board: Board, pieceId: string): Piece {
  const piece = board.pieces.find((p) => p.id === pieceId);
  if (!piece) throw new Error(`unknown piece "${pieceId}"`);
  return piece;
}

/**
 * How far the piece may slide along `axis` before it meets a wall or another piece.
 * `min` is zero or negative (left/up), `max` is zero or positive (right/down).
 */
export function travelRange(board: Board, pieceId: string, axis: Axis): { min: number; max: number } {
  const piece = pieceOrThrow(board, pieceId);
  if (!allowedAxes(piece).includes(axis)) return { min: 0, max: 0 };

  const grid = occupancy(board, piece.id);
  const free = (col: number, row: number) =>
    col >= 0 && row >= 0 && col < board.cols && row < board.rows && grid[row * board.cols + col] === null;

  let min = 0;
  let max = 0;

  if (axis === 'x') {
    while (Array.from({ length: piece.h }, (_, dy) => free(piece.col + min - 1, piece.row + dy)).every(Boolean)) min--;
    while (Array.from({ length: piece.h }, (_, dy) => free(piece.col + piece.w + max, piece.row + dy)).every(Boolean)) max++;
  } else {
    while (Array.from({ length: piece.w }, (_, dx) => free(piece.col + dx, piece.row + min - 1)).every(Boolean)) min--;
    while (Array.from({ length: piece.w }, (_, dx) => free(piece.col + dx, piece.row + piece.h + max)).every(Boolean)) max++;
  }

  return { min, max };
}

// ─── Transitions ──────────────────────────────────────────────────────────────

/**
 * Slides a piece and returns a fresh board. Throws rather than clamping: the view is
 * expected to have asked `travelRange` first, so an out-of-range delta is a bug and
 * should be loud.
 */
export function applyMove(board: Board, pieceId: string, axis: Axis, delta: number): Board {
  const piece = pieceOrThrow(board, pieceId);
  const { min, max } = travelRange(board, pieceId, axis);

  if (delta === 0 || delta < min || delta > max) {
    throw new Error(`illegal move: ${pieceId} ${axis}${delta} outside [${min}, ${max}]`);
  }

  return {
    ...board,
    pieces: board.pieces.map((p) =>
      p.id === piece.id
        ? { ...p, col: axis === 'x' ? p.col + delta : p.col, row: axis === 'y' ? p.row + delta : p.row }
        : p,
    ),
  };
}

/** Every legal single slide on the board. One distance is one move, as one drag is. */
export function legalMoves(board: Board): Move[] {
  const moves: Move[] = [];
  for (const piece of board.pieces) {
    for (const axis of allowedAxes(piece)) {
      const { min, max } = travelRange(board, piece.id, axis);
      for (let delta = min; delta <= max; delta++) {
        if (delta !== 0) moves.push({ pieceId: piece.id, axis, delta });
      }
    }
  }
  return moves;
}

/**
 * The key does not travel through the wall in the model; it reaches it. The slide out
 * through the gap is a view animation played once this flips.
 */
export function isSolved(board: Board): boolean {
  const key = board.pieces.find((p) => p.isKey);
  if (!key) return false;

  switch (board.exit.side) {
    case 'right':  return key.row === board.exit.index && key.col + key.w === board.cols;
    case 'left':   return key.row === board.exit.index && key.col === 0;
    case 'bottom': return key.col === board.exit.index && key.row + key.h === board.rows;
    case 'top':    return key.col === board.exit.index && key.row === 0;
  }
}

/** Canonical occupancy string, used as the solver's visited-set key. */
export function serialize(board: Board): string {
  return occupancy(board).map((cell) => cell ?? EMPTY_CELL).join('');
}
