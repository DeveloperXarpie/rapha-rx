import { levelsForTier } from '../../games/executive/ClearTheWay/levels';
import type { LevelDef } from '../../games/executive/ClearTheWay/model';

export interface GeneratedClearTheWayContent {
  level: LevelDef;
}

/**
 * Ids of the last few puzzles handed out, so a resident is not given the same board
 * twice running. Module scope rather than Dexie: it only has to hold for the length of
 * a session, and a page reload starting fresh is harmless.
 */
const RECENT_LIMIT = 4;
const recent: string[] = [];

/**
 * The shelf a tier offers is smaller than the recent buffer is deep, so "unplayed
 * recently" runs out quickly. When it does, the constraint is relaxed one step at a time
 * rather than dropped: never the same board twice running is the part worth keeping, and
 * the tier is never traded away for novelty - being at the right difficulty matters more
 * than never seeing a board twice.
 */
function poolFor(shelf: LevelDef[]): LevelDef[] {
  const unseen = shelf.filter((level) => !recent.includes(level.id));
  if (unseen.length > 0) return unseen;

  const last = recent[recent.length - 1];
  const notLast = shelf.filter((level) => level.id !== last);
  return notLast.length > 0 ? notLast : shelf;
}

export function generateClearTheWayContent(params: { tier: number }): GeneratedClearTheWayContent {
  const pool = poolFor(levelsForTier(params.tier));
  const level = pool[Math.floor(Math.random() * pool.length)];

  recent.push(level.id);
  while (recent.length > RECENT_LIMIT) recent.shift();

  return { level };
}
