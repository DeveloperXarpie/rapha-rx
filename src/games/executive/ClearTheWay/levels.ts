/**
 * The level catalog.
 *
 * Levels are authored as ASCII grids: `.` is empty, `K` is the key piece, and every
 * other character is one obstacle. Adding a puzzle is adding one entry - which is the
 * point, since this game's content is hand-picked rather than generated at runtime.
 *
 * `minMoves` and `dependencyDepth` are not decoration: `minMoves` is what the round is
 * scored against, and both are asserted against the solver in `__tests__/levels.test.ts`.
 * A level whose numbers are wrong, or which cannot be solved at all, fails the suite.
 *
 * Difficulty rises with piece count first and dependency depth second, not with grid
 * size alone. Every shipped level exits on the right; `exit.side` supports all four, so
 * left and top exits are later a data change and nothing more.
 */

import type { LevelDef } from './model';

export const LEVELS: LevelDef[] = [
  // ── Tier 1 - 4x4, one thing in the way ────────────────────────────────────
  {
    id: 'reef-01',
    tier: 1,
    cols: 4,
    rows: 4,
    exit: { side: 'right', index: 1 },
    layout: [
      'a..d',
      'KKb.',
      '..b.',
      'c...',
    ],
    minMoves: 2,
    dependencyDepth: 1,
  },
  {
    id: 'reef-02',
    tier: 1,
    cols: 4,
    rows: 4,
    exit: { side: 'right', index: 2 },
    layout: [
      'a..e',
      '.bb.',
      'KK.c',
      '...c',
    ],
    minMoves: 3,
    dependencyDepth: 2,
  },

  // ── Tier 2 - 5x5, a blocker whose escape is itself blocked ────────────────
  {
    id: 'reef-03',
    tier: 2,
    cols: 5,
    rows: 5,
    exit: { side: 'right', index: 2 },
    layout: [
      'aab..',
      '..b.d',
      'KKc.d',
      '..c.e',
      '.ff.e',
    ],
    minMoves: 4,
    dependencyDepth: 3,
  },
  {
    id: 'reef-04',
    tier: 2,
    cols: 5,
    rows: 5,
    exit: { side: 'right', index: 1 },
    layout: [
      'a.bb.',
      'KKc.d',
      '..c.d',
      '.eef.',
      '...f.',
    ],
    minMoves: 4,
    dependencyDepth: 3,
  },

  // ── Tier 3 - 6x6, a chain that has to be unpicked from the far end ────────
  {
    id: 'reef-05',
    tier: 3,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 3 },
    layout: [
      '.....g',
      '.dddfg',
      '..hcfg',
      'KKhcfa',
      '...bbb',
      '....ee',
    ],
    minMoves: 7,
    dependencyDepth: 6,
  },
  {
    id: 'reef-06',
    tier: 3,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 2 },
    layout: [
      'h.e...',
      'h.e..f',
      '.KKg.f',
      'cc.gdd',
      'a..g..',
      'a.bbb.',
    ],
    minMoves: 6,
    dependencyDepth: 5,
  },

  // ── Tier 4 - 6x6, dense, with more than one way to waste a move ───────────
  {
    id: 'reef-07',
    tier: 4,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 0 },
    layout: [
      '.aKK.i',
      'ff.e.i',
      'h..edd',
      'h..e.g',
      'j.bbbg',
      'jcc...',
    ],
    minMoves: 8,
    dependencyDepth: 7,
  },
  {
    id: 'reef-08',
    tier: 4,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 3 },
    layout: [
      'jj.dd.',
      '.i.b.h',
      '.i.bgg',
      '.KKbae',
      '.c..ae',
      '.cfff.',
    ],
    minMoves: 8,
    dependencyDepth: 3,
  },

  // ── Tier 5 - 6x6 packed tight, the hardest arrangement its pieces admit ───
  //
  // Both were found by enumerating a dense board's whole reachable state space and
  // taking the configuration furthest from any solved state. 6x6 rather than 7x7 on
  // purpose: density is what makes a board long, and a 6x6 keeps every block above the
  // 80px touch target that a 7x7 would breach on a narrow tablet.
  {
    id: 'reef-09',
    tier: 5,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 3 },
    layout: [
      '..g...',
      'kfg..i',
      'kfjaei',
      'KKjaed',
      'bbb..d',
      'hhccc.',
    ],
    minMoves: 13,
    dependencyDepth: 7,
  },
  {
    id: 'reef-10',
    tier: 5,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 1 },
    layout: [
      'ee..jh',
      'KK..jh',
      'fiiddc',
      'f.aaac',
      '...bbb',
      '.ggkkk',
    ],
    minMoves: 11,
    dependencyDepth: 10,
  },
];

/**
 * The shelf of levels for a tier. Falls back down the tiers rather than up, so an empty
 * shelf hands out something easier than intended rather than something harder.
 */
export function levelsForTier(tier: number): LevelDef[] {
  const wanted = Math.max(1, Math.min(5, Math.round(tier)));
  for (let t = wanted; t >= 1; t--) {
    const shelf = LEVELS.filter((level) => level.tier === t);
    if (shelf.length > 0) return shelf;
  }
  return LEVELS;
}

/** Fallback for a mount that arrives without generated content. */
export function pickLevel(tier: number): LevelDef {
  const shelf = levelsForTier(tier);
  return shelf[Math.floor(Math.random() * shelf.length)];
}
