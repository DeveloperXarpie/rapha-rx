/**
 * Spot Focus timing and performance, kept pure so they are tested in node.
 */

/** Board time before "I can't find it" appears (DIFFICULTY_RULES 3.3: at least 30 s). */
export const GIVE_UP_DELAY_S = 45;

/**
 * Response speed (FINAL_SPEC D22): the median gap between finds. The board appearing is
 * the "item appearing", so the first gap runs from 0 and each later one from the
 * previous find. Times are ms from the board's mount.
 */
export function medianFindGapMs(findTimesMs: number[]): number | null {
  if (findTimesMs.length === 0) return null;
  const gaps = findTimesMs.map((t, i) => t - (i === 0 ? 0 : findTimesMs[i - 1]));
  const sorted = [...gaps].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid] : (sorted[mid - 1] + sorted[mid]) / 2;
}

/**
 * The difficulty curve's performance ratio. Found share less 0.15 per wrong tap; the
 * old formula ignored the found share because every round used to find them all.
 */
export function spotFocusPerformance(m: { found: number; total: number; falseTaps: number }): number {
  const raw = m.found / Math.max(1, m.total) - m.falseTaps * 0.15;
  return Math.max(0, Math.min(1, raw));
}

/**
 * How the completion card speaks. It celebrates only a round that found everything
 * and did not fail, so "Well done!" never sits over a Replay button.
 */
export function completionTone(m: {
  found: number; total: number; outcome: 'clear' | 'hold' | 'fail';
}): 'celebrate' | 'encourage' {
  return m.found >= m.total && m.outcome !== 'fail' ? 'celebrate' : 'encourage';
}
