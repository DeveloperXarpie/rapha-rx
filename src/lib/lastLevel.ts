import { appDb } from './db';

/**
 * Records the level a game reached. Called by GameShell wherever it already
 * calls adjustDifficulty, so it stays in step with the difficulty system
 * without reading through it.
 *
 * Updates the existing gameProgress row rather than replacing it - that row
 * also carries the adaptive-difficulty counters.
 */
export async function recordLastLevel(userId: string, gameId: string, level: number): Promise<void> {
  const lastPlayedISO = new Date().toISOString().split('T')[0];
  const existing = await appDb.gameProgress.where('[userId+gameId]').equals([userId, gameId]).first();

  if (existing?.id != null) {
    await appDb.gameProgress.update(existing.id, { lastLevel: level, lastPlayedISO });
    return;
  }

  await appDb.gameProgress.add({
    userId,
    gameId,
    currentLevelId: 'level_1',
    consecutiveCompletions: 0,
    consecutiveIncompletes: 0,
    hasBeenPromptedForLevel: false,
    lastLevel: level,
    lastPlayedISO,
  });
}

/**
 * Batched read for Home, the free-play grid and the session summary. Games
 * never played are absent from the result rather than present as 0 - a resident
 * who has not played a game should not be told they reached nothing.
 */
export async function getLastLevels(
  userId: string, gameIds: string[],
): Promise<Record<string, number>> {
  const rows = await appDb.gameProgress.where('userId').equals(userId).toArray();
  const wanted = new Set(gameIds);
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (wanted.has(r.gameId) && typeof r.lastLevel === 'number') out[r.gameId] = r.lastLevel;
  }
  return out;
}
