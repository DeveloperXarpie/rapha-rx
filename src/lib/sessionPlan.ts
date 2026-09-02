import { marqueeByCategory } from './gameCatalog';
import type { GameCategory } from '../styles/tokens';

/** The order categories are played in, and the order plannedGames is indexed by. */
export const CATEGORY_ORDER: GameCategory[] = ['memory', 'attention', 'executive'];

/**
 * Chooses the three games for a session: one marquee game per category, never
 * repeating the game that category ran last session.
 *
 * Pure, and takes its rng, so the caller can make it deterministic in a test.
 * Called once by startSession - deciding lazily at each rotation would let Home
 * display a trio the session then contradicts.
 */
export function pickTrio(
  previous?: string[] | null,
  rng: () => number = Math.random,
): string[] {
  return CATEGORY_ORDER.map((category, slot) => {
    const options = marqueeByCategory(category);
    const last = previous?.[slot];
    // Filtering can empty the list if a category ever drops to one marquee game,
    // so fall back to the unfiltered set rather than returning undefined.
    const fresh = options.filter((g) => g.id !== last);
    const pool = fresh.length > 0 ? fresh : options;
    return pool[Math.floor(rng() * pool.length)].id;
  });
}

export type NextStep =
  | { kind: 'intro'; category: GameCategory; gameId: string }
  | { kind: 'summary' }
  /** The session is already done. The caller must not navigate. */
  | { kind: 'stay' };

/**
 * Decides what happens when a category finishes. The only place that decision
 * lives - it used to be split across DailyQuestionnaire, GameShell and
 * SessionManager, with two of them holding stale copies of the game list.
 *
 * `stay` exists for free play. The per-category ticker keeps running once a
 * session is complete, so a free-play round crossing the two-minute threshold
 * would otherwise fire rotation, find every category done and throw the
 * resident into the session summary.
 */
export function nextStep(args: {
  currentCategory: string | null;
  categoriesCompleted: string[];
  plannedGames: string[];
}): NextStep {
  const { currentCategory, categoriesCompleted, plannedGames } = args;

  const alreadyDone = CATEGORY_ORDER.every((c) => categoriesCompleted.includes(c));
  if (alreadyDone) return { kind: 'stay' };

  const completed = currentCategory && !categoriesCompleted.includes(currentCategory)
    ? [...categoriesCompleted, currentCategory]
    : categoriesCompleted;

  const next = CATEGORY_ORDER.find((c) => !completed.includes(c));
  if (!next) return { kind: 'summary' };

  // A session started before plannedGames existed has none. Plan the whole trio
  // once rather than picking a single game lazily, so the rest of the session
  // behaves like a fresh one.
  const trio = plannedGames.length === 3 ? plannedGames : pickTrio(null);
  return { kind: 'intro', category: next, gameId: trio[CATEGORY_ORDER.indexOf(next)] };
}
