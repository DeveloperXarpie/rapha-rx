import type { SpotFocusDynamicParams } from '../dynamicDifficulty';
import { fillLadder, type Anchor, type FieldSpec } from './fill';

/**
 * Spot Focus's ladder (DIFFICULTY_RULES 3.3), phone-safe: 3 columns, up to 6 rows,
 * differences at most 40% of the cards. Tiers mix on one board since plan 3b, so the
 * sample levels hold their bold / medium / subtle split exactly.
 */
export const LENGTH = 24;

/** A level: rows, then the bold / medium / subtle split, as in the rules doc's sample table. */
const row = (gridRows: number, bold: number, mediumCount: number, subtleCount: number): SpotFocusDynamicParams =>
  ({ gridCols: 3, gridRows, differenceCount: bold + mediumCount + subtleCount, mediumCount, subtleCount });

/*
 * The rules doc's samples are levels 1, 6, 12, 18 and 24. Even steps between them made two
 * things harder at once, so every level is written out (plan 3b), each changing one thing:
 * the board, one more difference, or a tier.
 * - When the board grows (7, 13, 19), it may drop a difference to give a breather, as 3.3
 *   allows.
 * - Level 5 repeats level 6: the 3x3 board has room for only four changes in five steps.
 */
const LEVELS: [number, number, number, number][] = [
  [3, 1, 0, 0], [3, 2, 0, 0], [3, 1, 1, 0], [3, 2, 1, 0], [3, 1, 2, 0], [3, 1, 2, 0],
  [4, 0, 2, 0], [4, 1, 2, 0], [4, 2, 2, 0], [4, 1, 3, 0], [4, 1, 2, 1], [4, 0, 3, 1],
  [5, 0, 3, 0], [5, 1, 3, 0], [5, 2, 3, 0], [5, 0, 5, 0], [5, 0, 3, 2], [5, 0, 2, 3],
  [6, 0, 2, 3], [6, 1, 2, 3], [6, 2, 2, 3], [6, 0, 4, 3], [6, 0, 2, 5], [6, 0, 1, 6],
];

export const ANCHORS: Anchor<SpotFocusDynamicParams>[] =
  LEVELS.map(([rows, bold, medium, subtle], i) => ({ level: i + 1, values: row(rows, bold, medium, subtle) }));

export const SPEC: { [K in keyof SpotFocusDynamicParams]: FieldSpec } = {
  gridCols: { kind: 'switch' },
  gridRows: { kind: 'switch' },
  differenceCount: { kind: 'step', step: 1 },
  mediumCount: { kind: 'step', step: 1 },
  subtleCount: { kind: 'step', step: 1 },
};

export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
