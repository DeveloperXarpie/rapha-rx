import type { SkillId } from './gameSkills';

/**
 * The after-game score card's data, and the words it turns into.
 *
 * There is no scoring system yet. `getScoreCard` is the one place it will plug in;
 * until then it returns nothing, and the card shows only the lines that need no
 * score. Residents never see numbers: a hidden 0-100 score becomes a word, and a
 * change against last time becomes a friendly line (Game Performance Measurement
 * Format, docs/scoring and end).
 */
export interface ScoreCardData {
  /** This session's primary-skill score, 0-100. */
  primary: number | null;
  /** The previous session's primary-skill score, or null on a first game. */
  previous: number | null;
  /** The skill that scored highest this game. */
  bestSkill: SkillId | null;
}

/**
 * Placeholder. Replace with the real lookup once scoring is finalised; the
 * signature is the contract the card is built against.
 */
export const getScoreCard: (gameId: string) => ScoreCardData = () => (
  { primary: null, previous: null, bestSkill: null }
);

/** Highest band first. A score takes the first word whose floor it reaches. */
export const MAIN_WORDS: ReadonlyArray<{ min: number; key: string }> = [
  { min: 90, key: 'scoreCard.word.excellent' },
  { min: 75, key: 'scoreCard.word.doingGreat' },
  { min: 60, key: 'scoreCard.word.goodWork' },
  { min: 40, key: 'scoreCard.word.niceEffort' },
  { min: 0,  key: 'scoreCard.word.keepPractising' },
];

export const COMPARISON_KEYS = {
  first:  'scoreCard.compare.first',
  better: 'scoreCard.compare.better',
  steady: 'scoreCard.compare.steady',
  lower:  'scoreCard.compare.lower',
} as const;

/** A change of this many points or more counts as up or down; less is steady. */
const CHANGE_POINTS = 3;

export function mainWordKey(score: number | null): string | null {
  if (score === null) return null;
  return MAIN_WORDS.find((w) => score >= w.min)?.key ?? null;
}

/** A lower result is never described as a drop - the "lower" line stays positive. */
export function comparisonKey(current: number | null, previous: number | null): string | null {
  if (current === null) return null;
  if (previous === null) return COMPARISON_KEYS.first;
  const change = current - previous;
  if (change >= CHANGE_POINTS) return COMPARISON_KEYS.better;
  if (change <= -CHANGE_POINTS) return COMPARISON_KEYS.lower;
  return COMPARISON_KEYS.steady;
}
