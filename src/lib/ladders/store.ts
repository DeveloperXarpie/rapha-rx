import { getDifficultyState, upsertDifficultyState, type DifficultyState } from '../db';
import { todayISO } from '../dates';
import type { RoundOutcome } from '../roundOutcome';
import { levelForToday, nextLevel } from './movement';

/*
 * Dexie glue for the ladders. The rules are in movement.ts; this only reads and writes
 * today's difficultyState row, leaving its 0-1 `score` fields alone.
 */

async function todayRow(userId: string, gameId: string): Promise<DifficultyState> {
  const date = todayISO();
  const existing = await getDifficultyState(userId, gameId, date);
  if (existing) return existing;
  const fresh: DifficultyState = {
    userId, gameId, date, score: 0, peakScore: 0, roundsPlayed: 0, level: 1, failStreak: 0,
  };
  await upsertDifficultyState(fresh);
  return fresh;
}

/** Today's level for a ladder game: 1 on the day's first visit. */
export async function getTodayLevel(userId: string, gameId: string): Promise<number> {
  return levelForToday(await todayRow(userId, gameId)).level;
}

/** Applies one round's outcome and returns the new level. */
export async function advanceLadder(
  userId: string, gameId: string, outcome: RoundOutcome, maxLevel: number,
): Promise<number> {
  const row = await todayRow(userId, gameId);
  const next = nextLevel(levelForToday(row), outcome, maxLevel);
  await upsertDifficultyState({
    ...row, level: next.level, failStreak: next.failStreak, roundsPlayed: row.roundsPlayed + 1,
  });
  return next.level;
}
