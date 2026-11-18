/**
 * The debug level jumper.
 *
 * Every game downstream is driven by a 0.0-1.0 difficulty score, never by a
 * level number - `scoreToLevel` in dynamicDifficulty.ts is what turns one into
 * the other for display. Jumping to a level therefore means handing GameRouter
 * a score that `scoreToLevel` reads back as the level asked for, which is all
 * `levelToScore` does. The round-trip is pinned by a test.
 *
 * The chosen level travels as a query param rather than store state so that it
 * survives the page reloads that testing a level is mostly made of, and so a
 * particular level is a link someone can be sent.
 */

import { isLadderGame, ladderLength } from './ladders';

/** Query key shared by the picker that writes it and the router that reads it. */
export const DEBUG_LEVEL_PARAM = 'debugLevel';

/** `scoreToLevel` maps the 0-1 score onto ten bands, for the games without a ladder. */
export const MAX_SCORE_LEVEL = 10;

/** The longest ladder (Tiffin Time, 30 levels). The URL accepts up to this. */
export const MAX_DEBUG_LEVEL = 30;

/**
 * The score at the middle of `level`'s band. Mid-band rather than on the
 * boundary, where one floating-point nudge would land in the neighbouring band.
 */
export function levelToScore(level: number): number {
  return (level - 0.5) / MAX_SCORE_LEVEL;
}

/**
 * A requested level clamped to what the game has: a ladder game's levels are its
 * ladder rungs (plan 3a), every other game has the ten score bands.
 */
export function debugLevelFor(gameId: string, level: number): number {
  const max = isLadderGame(gameId) ? ladderLength(gameId) : MAX_SCORE_LEVEL;
  return Math.max(1, Math.min(max, level));
}

/**
 * A level from the query string, or null if there isn't a usable one.
 *
 * Null for anything malformed rather than a clamp or a throw: this param ships
 * to production behind the tap-unlock, so a hand-edited or stale URL has to
 * fall back to the resident's real difficulty rather than to a guess.
 */
export function parseDebugLevel(raw: string | null): number | null {
  if (raw === null || !/^\d+$/.test(raw)) return null;
  const level = Number(raw);
  return level >= 1 && level <= MAX_DEBUG_LEVEL ? level : null;
}

/** The jumper's own route, shared by the route table and the ways in. */
export const DEBUG_LEVELS_PATH = '/app/debug-levels';

