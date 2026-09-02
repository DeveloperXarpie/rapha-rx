import { describe, it, expect } from 'vitest';
import { pickTrio, CATEGORY_ORDER } from '../sessionPlan';
import { getGame } from '../gameCatalog';

describe('pickTrio', () => {
  it('returns one marquee game per category, in play order', () => {
    const trio = pickTrio(null);
    expect(trio).toHaveLength(3);
    trio.forEach((id, i) => {
      const g = getGame(id);
      expect(g, `${id} is in the catalog`).toBeDefined();
      expect(g!.marquee).toBe(true);
      expect(g!.category).toBe(CATEGORY_ORDER[i]);
    });
  });

  it('never repeats the previous session game for the same category', () => {
    const first = pickTrio(null);
    for (let i = 0; i < 40; i++) {
      const next = pickTrio(first);
      next.forEach((id, slot) => expect(id).not.toBe(first[slot]));
    }
  });

  it('is deterministic given an rng', () => {
    // Each category has exactly two marquee games; 0 picks the first, 0.99 the second.
    expect(pickTrio(null, () => 0)).toEqual(['market-memory', 'spot-focus', 'serve-guests']);
    expect(pickTrio(null, () => 0.99)).toEqual(['train-yard', 'garden-keeper', 'clear-the-way']);
  });

  it('ignores a previous trio that names games no longer marquee', () => {
    const trio = pickTrio(['remember-match', 'word-search', 'recipe-builder']);
    expect(trio).toHaveLength(3);
    trio.forEach((id) => expect(getGame(id)!.marquee).toBe(true));
  });

  it('tolerates a short or empty previous trio', () => {
    expect(pickTrio([])).toHaveLength(3);
    expect(pickTrio(['market-memory'])).toHaveLength(3);
  });
});
