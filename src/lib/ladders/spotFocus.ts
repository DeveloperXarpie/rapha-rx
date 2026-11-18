import type { SpotFocusDynamicParams } from '../dynamicDifficulty';
import { fillLadder, type Anchor, type FieldSpec } from './fill';

/**
 * Spot Focus's ladder (DIFFICULTY_RULES 3.3), phone-safe: 3 columns, up to 6 rows,
 * differences at most 40% of the cards. One subtlety tier per board, as the game
 * supports today; a sample row with mixed tiers uses its majority tier.
 */
export const LENGTH = 24;

const row = (gridRows: number, differenceCount: number, changeSubtlety: SpotFocusDynamicParams['changeSubtlety']):
  SpotFocusDynamicParams => ({ gridCols: 3, gridRows, differenceCount, changeSubtlety });

export const ANCHORS: Anchor<SpotFocusDynamicParams>[] = [
  { level: 1, values: row(3, 1, 'bold') },
  { level: 6, values: row(3, 3, 'medium') },
  // Added (plan 3a guardrail tests): the board grows a level before the difference count
  // rises (11, 17, 23), so no step makes two things harder and no level breaks the 40% cap.
  { level: 11, values: row(4, 3, 'medium') },
  { level: 12, values: row(4, 4, 'medium') },
  { level: 17, values: row(5, 4, 'medium') },
  // The board grows at 17 and the tier moves at 19: never both in one step (3.3).
  { level: 18, values: row(5, 5, 'medium') },
  { level: 19, values: row(5, 5, 'subtle') },
  { level: 23, values: row(6, 6, 'subtle') },
  { level: 24, values: row(6, 7, 'subtle') },
];

export const SPEC: { [K in keyof SpotFocusDynamicParams]: FieldSpec } = {
  gridCols: { kind: 'switch' },
  gridRows: { kind: 'switch' },
  differenceCount: { kind: 'step', step: 1 },
  changeSubtlety: { kind: 'switch' },
};

export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
