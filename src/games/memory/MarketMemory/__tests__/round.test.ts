import { describe, it, expect } from 'vitest';
import { buildRound, scoreRound, CRATE_COUNT } from '../round';
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

  it('marks a perfect round and costs no lives', () => {
    const s = scoreRound(['milk', 'jam'], ['jam', 'milk']);
    expect(s.perfect).toBe(true);
    expect(s.livesLost).toBe(0);
  });

  it('caps the wrong-pick penalty at 2 hearts', () => {
    const s = scoreRound(['milk'], ['cream', 'jam', 'honey', 'oil']);
    // 3+ wrong caps at 2, plus 1 for having missed something.
    expect(s.livesLost).toBe(3);
  });

  it('charges exactly one heart for any number of misses', () => {
    const s = scoreRound(['milk', 'jam', 'rice', 'oil'], ['milk']);
    expect(s.livesLost).toBe(1);
  });

  it('handles an empty pick set', () => {
    const s = scoreRound(['milk', 'jam'], []);
    expect(s.correct).toEqual([]);
    expect(s.missed).toEqual(['milk', 'jam']);
    expect(s.livesLost).toBe(1);
    expect(s.perfect).toBe(false);
  });
});
