import { describe, it, expect } from 'vitest';
import {
  parseLevel, travelRange, applyMove, isSolved, keyEscapeSlide, legalMoves, serialize, allowedAxes,
  type LevelDef,
} from '../model';

/**
 * The reference board used by most of these tests:
 *
 *   a . . .      a  1x1 loose block
 *   K K b .      K  the key, 1x2 horizontal, sitting in the exit lane (row 1)
 *   . . b .      b  1x2 vertical, the only thing between the key and the gap
 *   . . . .
 */
const BASIC: LevelDef = {
  id: 'test-basic',
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

describe('parseLevel', () => {
  it('reads pieces out of the layout with their footprints', () => {
    const board = parseLevel(BASIC);
    expect(board.cols).toBe(4);
    expect(board.rows).toBe(4);
    expect(board.pieces).toHaveLength(3);

    const key = board.pieces.find((p) => p.isKey)!;
    expect(key).toMatchObject({ letter: 'K', col: 0, row: 1, w: 2, h: 1 });

    expect(board.pieces.find((p) => p.letter === 'b')).toMatchObject({ col: 2, row: 1, w: 1, h: 2 });
    expect(board.pieces.find((p) => p.letter === 'a')).toMatchObject({ col: 0, row: 0, w: 1, h: 1 });
  });

  it('rejects a layout whose dimensions disagree with cols/rows', () => {
    expect(() => parseLevel({ ...BASIC, layout: ['a...', 'KK..'] })).toThrow(/rows/i);
    expect(() => parseLevel({ ...BASIC, layout: ['a..', 'KK.', '...', '...'] })).toThrow(/cols/i);
  });

  it('rejects a non-rectangular piece', () => {
    const bent = { ...BASIC, layout: ['aa..', 'KKa.', '..b.', '..b.'] };
    expect(() => parseLevel(bent)).toThrow(/rectangle/i);
  });

  it('rejects a piece longer than three cells', () => {
    const long = { ...BASIC, layout: ['....', 'KK..', 'cccc', '....'] };
    expect(() => parseLevel(long)).toThrow(/longer than 3/i);
  });

  it('rejects a level with no key', () => {
    expect(() => parseLevel({ ...BASIC, layout: ['a...', '..b.', '..b.', '....'] })).toThrow(/key/i);
  });

  it('rejects a key that is not 1x2 horizontal for a side exit', () => {
    const vertical = { ...BASIC, layout: ['.K..', '.K..', '..b.', '..b.'] };
    expect(() => parseLevel(vertical)).toThrow(/horizontal/i);
  });

  it('rejects a key that does not sit in the exit lane', () => {
    const offLane = { ...BASIC, layout: ['KK..', '...b', '...b', '....'] };
    expect(() => parseLevel(offLane)).toThrow(/exit lane/i);
  });

  it('rejects an exit index outside the board', () => {
    expect(() => parseLevel({ ...BASIC, exit: { side: 'right', index: 9 } })).toThrow(/exit/i);
  });

  it('accepts a vertical key against a top exit', () => {
    const board = parseLevel({
      ...BASIC,
      exit: { side: 'top', index: 1 },
      layout: [
        '.K..',
        '.K..',
        '..b.',
        '..b.',
      ],
    });
    expect(board.pieces.find((p) => p.isKey)).toMatchObject({ col: 1, row: 0, w: 1, h: 2 });
  });
});

describe('allowedAxes', () => {
  it('restricts rectangles to their long axis and leaves 1x1 free', () => {
    const board = parseLevel(BASIC);
    const key = board.pieces.find((p) => p.letter === 'K')!;
    const vertical = board.pieces.find((p) => p.letter === 'b')!;
    const loose = board.pieces.find((p) => p.letter === 'a')!;

    expect(allowedAxes(key)).toEqual(['x']);
    expect(allowedAxes(vertical)).toEqual(['y']);
    expect(allowedAxes(loose)).toEqual(['x', 'y']);
  });
});

describe('travelRange', () => {
  const board = parseLevel(BASIC);

  it('stops at the first collision', () => {
    // The key is pinned: wall to the left, block b to the right.
    expect(travelRange(board, 'K', 'x')).toEqual({ min: 0, max: 0 });
    // a sits at the top-left; the whole of row 0 to its right is empty.
    expect(travelRange(board, 'a', 'x')).toEqual({ min: 0, max: 3 });
  });

  it('measures both directions along the long axis', () => {
    expect(travelRange(board, 'b', 'y')).toEqual({ min: -1, max: 1 });
  });

  it('returns no travel on a forbidden axis', () => {
    expect(travelRange(board, 'K', 'y')).toEqual({ min: 0, max: 0 });
    expect(travelRange(board, 'b', 'x')).toEqual({ min: 0, max: 0 });
  });

  it('blocks a 1x1 against a neighbour on one axis while leaving the other open', () => {
    // a is directly above the key, so it cannot come down.
    expect(travelRange(board, 'a', 'y')).toEqual({ min: 0, max: 0 });
  });
});

describe('applyMove', () => {
  const board = parseLevel(BASIC);

  it('returns a fresh board and leaves the original untouched', () => {
    const moved = applyMove(board, 'b', 'y', 1);
    expect(moved).not.toBe(board);
    expect(moved.pieces.find((p) => p.letter === 'b')).toMatchObject({ row: 2 });
    expect(board.pieces.find((p) => p.letter === 'b')).toMatchObject({ row: 1 });
  });

  it('rejects a move past a collision', () => {
    expect(() => applyMove(board, 'b', 'y', 2)).toThrow(/illegal/i);
  });

  it('rejects a move on a forbidden axis', () => {
    expect(() => applyMove(board, 'b', 'x', 1)).toThrow(/illegal/i);
  });

  it('rejects a zero-distance move', () => {
    expect(() => applyMove(board, 'b', 'y', 0)).toThrow(/illegal/i);
  });

  it('rejects an unknown piece', () => {
    expect(() => applyMove(board, 'zz', 'y', 1)).toThrow(/unknown piece/i);
  });
});

describe('isSolved', () => {
  const board = parseLevel(BASIC);

  it('is false while the key is blocked', () => {
    expect(isSolved(board)).toBe(false);
  });

  it('is true once the key is flush against the exit wall on the exit lane', () => {
    const cleared = applyMove(board, 'b', 'y', 1);
    const escaped = applyMove(cleared, 'K', 'x', 2);
    expect(isSolved(escaped)).toBe(true);
  });

  it('is not satisfied by the key touching the opposite wall', () => {
    const open = parseLevel({
      ...BASIC,
      layout: [
        'a...',
        'KK..',
        '....',
        '....',
      ],
    });
    // Flush left, with a clear run to a right-hand exit: not out yet.
    expect(isSolved(open)).toBe(false);
    expect(isSolved(applyMove(open, 'K', 'x', 2))).toBe(true);
  });

  it('reads the exit lane from the top for a top exit', () => {
    const top = parseLevel({
      ...BASIC,
      exit: { side: 'top', index: 1 },
      layout: [
        '....',
        '.K..',
        '.K..',
        '....',
      ],
    });
    expect(isSolved(top)).toBe(false);
    expect(isSolved(applyMove(top, 'K', 'y', -1))).toBe(true);
  });
});

describe('legalMoves', () => {
  it('enumerates every distance as its own move', () => {
    const board = parseLevel(BASIC);
    const moves = legalMoves(board);

    // a: 3 to the right. b: 1 up, 1 down. K: pinned.
    expect(moves).toHaveLength(5);
    expect(moves.filter((m) => m.pieceId === 'a')).toHaveLength(3);
    expect(moves.filter((m) => m.pieceId === 'b')).toHaveLength(2);
    expect(moves.filter((m) => m.pieceId === 'K')).toHaveLength(0);
    expect(moves.every((m) => m.delta !== 0)).toBe(true);
  });
});

describe('serialize', () => {
  it('round-trips the occupancy of the start position', () => {
    expect(serialize(parseLevel(BASIC))).toBe('a...KKb...b.....');
  });

  it('distinguishes two boards that differ by one slide', () => {
    const board = parseLevel(BASIC);
    expect(serialize(applyMove(board, 'b', 'y', 1))).not.toBe(serialize(board));
  });
});

describe('keyEscapeSlide', () => {
  it('is null while something stands between the key and the gap', () => {
    // b sits at column 2 of the exit lane; the key cannot reach the wall.
    expect(keyEscapeSlide(parseLevel(BASIC))).toBeNull();
  });

  it('is the distance to the wall once the lane is clear', () => {
    // b slides down out of row 1, leaving columns 2 and 3 free.
    const open = applyMove(parseLevel(BASIC), 'b', 'y', 1);
    expect(keyEscapeSlide(open)).toBe(2);
  });

  it('is null when the key is already against the wall', () => {
    const open = applyMove(parseLevel(BASIC), 'b', 'y', 1);
    const out = applyMove(open, 'K', 'x', 2);
    expect(isSolved(out)).toBe(true);
    expect(keyEscapeSlide(out)).toBeNull();
  });

  it('does not fire for a lane that some other piece could clear', () => {
    // The key is walled in by c, but a is free to run to the right-hand wall itself.
    const blocked = parseLevel({
      ...BASIC,
      layout: [
        'a...',
        'KKc.',
        '..c.',
        '....',
      ],
    });
    expect(keyEscapeSlide(blocked)).toBeNull();
  });

  it('reads a left exit as a negative slide', () => {
    const left = parseLevel({
      ...BASIC,
      exit: { side: 'left', index: 1 },
      layout: [
        '....',
        '..KK',
        '....',
        '....',
      ],
    });
    expect(keyEscapeSlide(left)).toBe(-2);
  });

  it('reads a bottom exit as a downward slide', () => {
    const bottom = parseLevel({
      ...BASIC,
      exit: { side: 'bottom', index: 1 },
      layout: [
        '.K..',
        '.K..',
        '....',
        '....',
      ],
    });
    expect(keyEscapeSlide(bottom)).toBe(2);
  });

  it('reads a top exit as an upward slide', () => {
    const top = parseLevel({
      ...BASIC,
      exit: { side: 'top', index: 1 },
      layout: [
        '....',
        '....',
        '.K..',
        '.K..',
      ],
    });
    expect(keyEscapeSlide(top)).toBe(-2);
  });
});
