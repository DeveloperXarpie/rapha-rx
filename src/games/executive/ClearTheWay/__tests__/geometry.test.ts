import { describe, it, expect } from 'vitest';
import { boardMetrics, escapeOffset, exitRect, pieceOrigin, pieceSize, MAX_CELL, MIN_CELL } from '../geometry';
import { parseLevel, type LevelDef } from '../model';

const DEF: LevelDef = {
  id: 'test-geometry',
  tier: 1,
  cols: 5,
  rows: 4,
  exit: { side: 'right', index: 2 },
  layout: [
    '.....',
    '.....',
    'KK..b',
    '....b',
  ],
  minMoves: 1,
  dependencyDepth: 0,
};

const board = parseLevel(DEF);

describe('boardMetrics', () => {
  it('fits the board to the tighter of the two dimensions', () => {
    const wide = boardMetrics(board, 4000, 400);
    const tall = boardMetrics(board, 400, 4000);
    expect(wide.cell).toBeLessThan(MAX_CELL);
    expect(tall.cell).toBeLessThan(MAX_CELL);
    // 5 columns against 4 rows: the same pixel budget is tighter horizontally.
    expect(boardMetrics(board, 500, 500).cell).toBe(Math.floor(500 / (5 + 0.44)));
  });

  it('clamps between the touch-target floor and the ceiling', () => {
    expect(boardMetrics(board, 40, 40).cell).toBe(MIN_CELL);
    expect(boardMetrics(board, 6000, 6000).cell).toBe(MAX_CELL);
  });

  it('sizes the outer box as the grid plus two walls', () => {
    const m = boardMetrics(board, 900, 700);
    expect(m.boardW).toBe(board.cols * m.cell + m.wall * 2);
    expect(m.boardH).toBe(board.rows * m.cell + m.wall * 2);
  });
});

describe('piece placement', () => {
  const m = boardMetrics(board, 900, 700);

  it('offsets the grid by the wall', () => {
    const key = board.pieces.find((p) => p.isKey)!;
    expect(pieceOrigin(key, m)).toEqual({ x: m.wall, y: m.wall + 2 * m.cell });
  });

  it('sizes a piece by its footprint', () => {
    const key = board.pieces.find((p) => p.isKey)!;
    expect(pieceSize(key, m)).toEqual({ w: 2 * m.cell, h: m.cell });
  });
});

describe('exitRect', () => {
  const m = boardMetrics(board, 900, 700);

  it('sits in the right-hand wall on the exit lane', () => {
    expect(exitRect(board.exit, board, m)).toEqual({
      x: m.boardW - m.wall,
      y: m.wall + 2 * m.cell,
      w: m.wall,
      h: m.cell,
    });
  });

  it('runs along the top wall for a top exit', () => {
    const rect = exitRect({ side: 'top', index: 1 }, board, m);
    expect(rect).toEqual({ x: m.wall + m.cell, y: 0, w: m.cell, h: m.wall });
  });
});

describe('escapeOffset', () => {
  it('sends the key out through its own side', () => {
    const m = boardMetrics(board, 900, 700);
    expect(escapeOffset({ side: 'right', index: 0 }, m).x).toBeGreaterThan(0);
    expect(escapeOffset({ side: 'left', index: 0 }, m).x).toBeLessThan(0);
    expect(escapeOffset({ side: 'top', index: 0 }, m).y).toBeLessThan(0);
    expect(escapeOffset({ side: 'bottom', index: 0 }, m).y).toBeGreaterThan(0);
  });
});
