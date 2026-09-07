import { describe, it, expect } from 'vitest';
import { buildRound, resultRows, scoreRound, CRATE_COUNT } from '../round';
import { BY_ID, ITEMS } from '../items';

/** Deterministic stand-in for Math.random: cycles a fixed sequence. */
function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('buildRound', () => {
  it('produces exactly 12 unique crates', () => {
    const r = buildRound({ listLength: 4, similarPackaging: true, listCategory: false }, seededRng());
    expect(r.crates).toHaveLength(CRATE_COUNT);
    expect(new Set(r.crates).size).toBe(CRATE_COUNT);
  });

  it('produces a list of the requested length', () => {
    const r = buildRound({ listLength: 5, similarPackaging: true, listCategory: false }, seededRng(7));
    expect(r.list).toHaveLength(5);
    expect(new Set(r.list).size).toBe(5);
  });

  it('always makes the list a subset of the crates', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: false }, seededRng(seed));
      r.list.forEach((id) => expect(r.crates).toContain(id));
    }
  });

  it('seeds every target twin when similarPackaging is on', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = buildRound({ listLength: 4, similarPackaging: true, listCategory: false }, seededRng(seed));
      // 4 targets + at most 4 twins is 8, comfortably under 12, so every twin must fit.
      r.list.forEach((id) => expect(r.crates).toContain(BY_ID[id].twin));
    }
  });

  it('does not deliberately seed twins when similarPackaging is off', () => {
    // Twins can still appear as random filler, so assert on the aggregate rather than
    // on any single round: seeding off must produce strictly fewer twin-pairs on average.
    const count = (similarPackaging: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const r = buildRound({ listLength: 3, similarPackaging, listCategory: false }, seededRng(seed));
        total += r.list.filter((id) => r.crates.includes(BY_ID[id].twin)).length;
      }
      return total;
    };
    expect(count(false)).toBeLessThan(count(true));
  });

  it('draws targets from a single group when listCategory is on', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(seed));
      const groups = new Set(r.list.map((id) => BY_ID[id].group));
      expect(groups.size).toBe(1);
    }
  });

  it('fills the shelf from the chosen group as far as that group goes', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(seed));
      const group = BY_ID[r.list[0]].group;
      const available = ITEMS.filter((i) => i.group === group).length;
      const sameGroup = r.crates.filter((id) => BY_ID[id].group === group).length;
      // Groups qualify at 8 members and the smallest of them cannot fill all 12 crates,
      // so the bar is the group's own size, not a flat count. Twins are admitted even
      // from outside the group, which is why this is a floor and not an equality.
      expect(sameGroup).toBeGreaterThanOrEqual(Math.min(available, CRATE_COUNT) - 6);
    }
  });

  it('never returns an id that is not in the catalogue', () => {
    const known = new Set(ITEMS.map((i) => i.id));
    const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(11));
    r.crates.forEach((id) => expect(known.has(id)).toBe(true));
  });
});

describe('scoreRound', () => {
  it('partitions picks into correct, wrong and missed', () => {
    const s = scoreRound(['milk', 'jam', 'rice'], ['milk', 'cream', 'jam']);
    expect(s.correct).toEqual(['milk', 'jam']);
    expect(s.wrong).toEqual(['cream']);
    expect(s.missed).toEqual(['rice']);
  });

  it('marks a perfect round', () => {
    expect(scoreRound(['milk', 'jam'], ['jam', 'milk']).perfect).toBe(true);
    expect(scoreRound(['milk', 'jam'], ['milk']).perfect).toBe(false);
    expect(scoreRound(['milk', 'jam'], ['milk', 'jam', 'cream']).perfect).toBe(false);
  });

  it('handles an empty pick set', () => {
    const s = scoreRound(['milk', 'jam'], []);
    expect(s.correct).toEqual([]);
    expect(s.wrong).toEqual([]);
    expect(s.missed).toEqual(['milk', 'jam']);
    expect(s.perfect).toBe(false);
  });

  /*
   * The hearts system is gone, so a round can no longer be lost - only finished more or
   * less accurately. These three counts are what the effectiveness measure reads, and
   * this holds that nothing has quietly reintroduced a life count beside them.
   */
  it('carries no life count', () => {
    expect(scoreRound(['milk'], ['milk'])).not.toHaveProperty('livesLost');
  });
});

describe('resultRows', () => {
  it('lists the shopping list in its original order, then the wrong picks', () => {
    // Picked out of order on purpose: the rows follow the list, not the cart.
    expect(resultRows(['milk', 'jam', 'rice'], ['cream', 'rice', 'milk'])).toEqual([
      { id: 'milk',  status: 'correct' },
      { id: 'jam',   status: 'missed'  },
      { id: 'rice',  status: 'correct' },
      { id: 'cream', status: 'wrong'   },
    ]);
  });

  it('keeps wrong picks in the order they were picked', () => {
    const rows = resultRows(['milk'], ['honey', 'milk', 'cream']);
    expect(rows.filter((r) => r.status === 'wrong')).toEqual([
      { id: 'honey', status: 'wrong' },
      { id: 'cream', status: 'wrong' },
    ]);
  });

  it('marks every row correct on a perfect round', () => {
    const rows = resultRows(['milk', 'jam'], ['jam', 'milk']);
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === 'correct')).toBe(true);
  });

  it('marks the whole list missed when the cart is empty', () => {
    expect(resultRows(['milk', 'jam'], [])).toEqual([
      { id: 'milk', status: 'missed' },
      { id: 'jam',  status: 'missed' },
    ]);
  });

  it('accounts for every item exactly once', () => {
    const rows = resultRows(['milk', 'jam', 'rice'], ['cream', 'rice', 'milk']);
    expect(rows).toHaveLength(new Set(rows.map((r) => r.id)).size);
    expect(rows).toHaveLength(3 + 1);
  });
});
