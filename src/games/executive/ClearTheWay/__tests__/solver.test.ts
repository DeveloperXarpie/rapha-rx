import { describe, it, expect } from 'vitest';
import { parseLevel, applyMove, isSolved, type LevelDef } from '../model';
import { solve, nextBestMove } from '../solver';

/** Two moves: drop b out of the lane, then slide the key out. */
const TWO_MOVER: LevelDef = {
  id: 'test-two-mover',
  tier: 1,
  cols: 4,
  rows: 4,
  exit: { side: 'right', index: 1 },
  layout: [
    'a...',
    'KKb.',
    '..b.',
    '....',
  ],
  minMoves: 2,
  dependencyDepth: 1,
};

/** The key is already clear of the gap: one move, nothing to clear first. */
const ONE_MOVER: LevelDef = {
  ...TWO_MOVER,
  id: 'test-one-mover',
  layout: [
    'a...',
    'KK..',
    '..b.',
    '..b.',
  ],
  minMoves: 1,
  dependencyDepth: 0,
};

/** c spans the full height of the board in the key's way, so it can never move. */
const UNSOLVABLE: LevelDef = {
  id: 'test-unsolvable',
  tier: 1,
  cols: 4,
  rows: 3,
  exit: { side: 'right', index: 1 },
  layout: [
    '..c.',
    'KKc.',
    '..c.',
  ],
  minMoves: 0,
  dependencyDepth: 0,
};

describe('solve', () => {
  it('finds the shortest solution and counts the moves before the key first moves', () => {
    const result = solve(parseLevel(TWO_MOVER))!;
    expect(result.minMoves).toBe(2);
    expect(result.dependencyDepth).toBe(1);
    expect(result.path.map((m) => m.pieceId)).toEqual(['b', 'K']);
  });

  it('reports zero dependency depth when the key moves first', () => {
    const result = solve(parseLevel(ONE_MOVER))!;
    expect(result.minMoves).toBe(1);
    expect(result.dependencyDepth).toBe(0);
  });

  it('returns null for a board that cannot be solved', () => {
    expect(solve(parseLevel(UNSOLVABLE))).toBeNull();
  });

  it('returns an empty path for a board that is already solved', () => {
    const solved = applyMove(parseLevel(ONE_MOVER), 'K', 'x', 2);
    const result = solve(solved)!;
    expect(result.minMoves).toBe(0);
    expect(result.path).toEqual([]);
  });

  it('yields a path that actually solves the board when replayed', () => {
    const board = parseLevel(TWO_MOVER);
    const result = solve(board)!;
    const finished = result.path.reduce((b, m) => applyMove(b, m.pieceId, m.axis, m.delta), board);
    expect(isSolved(finished)).toBe(true);
  });

  it('treats a longer slide as a single move', () => {
    // The key has a clear run of two cells; that is one move, not two.
    expect(solve(parseLevel(ONE_MOVER))!.path).toEqual([{ pieceId: 'K', axis: 'x', delta: 2 }]);
  });
});

describe('nextBestMove', () => {
  it('names the piece that has to move first', () => {
    expect(nextBestMove(parseLevel(TWO_MOVER))).toMatchObject({ pieceId: 'b' });
  });

  it('is null on an unsolvable board', () => {
    expect(nextBestMove(parseLevel(UNSOLVABLE))).toBeNull();
  });

  it('is null once the board is solved', () => {
    const solved = applyMove(parseLevel(ONE_MOVER), 'K', 'x', 2);
    expect(nextBestMove(solved)).toBeNull();
  });
});
