import type { RoundOutcome } from '../roundOutcome';

/**
 * How a resident moves on a ladder (DIFFICULTY_RULES X1, owner 2026-11-18): up one level
 * on a clear, down one after two fails in a row. A hold or a single fail repeats the
 * level; a hold or a clear breaks a run of fails.
 */
export interface LadderPosition {
  level: number;
  failStreak: number;
}

export const FAILS_TO_STEP_DOWN = 2;

export function nextLevel(s: LadderPosition, outcome: RoundOutcome, maxLevel: number): LadderPosition {
  if (outcome === 'clear') return { level: Math.min(maxLevel, s.level + 1), failStreak: 0 };
  if (outcome === 'hold') return { level: s.level, failStreak: 0 };
  const streak = s.failStreak + 1;
  if (streak >= FAILS_TO_STEP_DOWN) return { level: Math.max(1, s.level - 1), failStreak: 0 };
  return { level: s.level, failStreak: streak };
}

/** Every game starts each day at level 1 (X2, owner 2026-11-18); today's row keeps today's progress. */
export function levelForToday(todayRow: { level?: number; failStreak?: number } | undefined): LadderPosition {
  return { level: todayRow?.level ?? 1, failStreak: todayRow?.failStreak ?? 0 };
}

/** A debug probe and Shopping List's second trip never move the ladder. */
export function shouldMoveLadder(args: { debug: boolean; secondTrip: boolean }): boolean {
  return !args.debug && !args.secondTrip;
}
