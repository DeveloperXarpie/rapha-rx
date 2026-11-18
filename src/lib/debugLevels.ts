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

/** Query key shared by the picker that writes it and the router that reads it. */
export const DEBUG_LEVEL_PARAM = 'debugLevel';

/** `scoreToLevel` maps the 0-1 score onto ten bands. */
export const MAX_DEBUG_LEVEL = 10;

/**
 * The score at the middle of `level`'s band. Mid-band rather than on the
 * boundary, where one floating-point nudge would land in the neighbouring band.
 */
export function levelToScore(level: number): number {
  return (level - 0.5) / MAX_DEBUG_LEVEL;
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

