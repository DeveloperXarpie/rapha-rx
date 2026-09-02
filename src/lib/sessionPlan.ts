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
