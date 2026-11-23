import { describe, it, expect } from 'vitest';
import * as MM from '../marketMemory';
import * as SF from '../spotFocus';
import * as SG from '../serveGuests';
import { isLadderGame, ladderLength, ladderParams, LADDER_VERSION } from '../index';
import { COOK_BANDS } from '../../../games/executive/ServeTheGuests/model';

/** Every guardrail names the level it fails at, so the fix is an anchor at that level. */
function eachLevel<T>(rows: T[], check: (row: T, prev: T | undefined, level: number) => void) {
  rows.forEach((row, i) => check(row, rows[i - 1], i + 1));
}

describe('ladder index', () => {
  it('knows the three ladder games and their lengths', () => {
    expect(isLadderGame('market-memory') && isLadderGame('spot-focus') && isLadderGame('serve-guests')).toBe(true);
    expect(isLadderGame('train-yard')).toBe(false);
    expect([ladderLength('market-memory'), ladderLength('spot-focus'), ladderLength('serve-guests')])
      .toEqual([20, 24, 30]);
    expect(LADDER_VERSION).toBe('0.2');
  });
  it('clamps a level to the ladder', () => {
    expect(ladderParams('spot-focus', 0)).toEqual(SF.LADDER[0]);
    expect(ladderParams('spot-focus', 99)).toEqual(SF.LADDER[23]);
  });
});

describe('every ladder keeps its anchors verbatim', () => {
  it.each([['market-memory', MM], ['spot-focus', SF], ['serve-guests', SG]] as const)('%s', (_id, mod) => {
    for (const a of mod.ANCHORS) expect(mod.LADDER[a.level - 1]).toEqual(a.values);
  });
});

describe('Shopping List guardrails (DIFFICULTY_RULES 3.1)', () => {
  it('stays within hard limits', () => eachLevel(MM.LADDER, (r, _p, level) => {
    expect(r.listLength, `level ${level}`).toBeGreaterThanOrEqual(2);
    expect(r.listLength, `level ${level}`).toBeLessThanOrEqual(6);
    expect(r.retentionMs, `level ${level}`).toBeGreaterThanOrEqual(1000);
    expect(r.retentionMs, `level ${level}`).toBeLessThanOrEqual(8000);
    expect(r.hints, `level ${level}`).toBeLessThanOrEqual(1);
    expect(r.hints, `level ${level}`).toBeLessThan(r.listLength - 1);
  }));
  it('never gets easier as the level rises', () => eachLevel(MM.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.listLength, `level ${level}`).toBeGreaterThanOrEqual(p.listLength);
    expect(r.retentionMs, `level ${level}`).toBeGreaterThanOrEqual(p.retentionMs);
    expect(r.hints, `level ${level}`).toBeLessThanOrEqual(p.hints);
    if (p.similarPackaging) expect(r.similarPackaging, `level ${level}`).toBe(true);
    if (p.listCategory) expect(r.listCategory, `level ${level}`).toBe(true);
  }));
});

/** Differences above bold, counting a subtle one twice: how hard the tiers are (3.3). */
const tierWeight = (r: { mediumCount: number; subtleCount: number }) => r.mediumCount + 2 * r.subtleCount;
const nonBold = (r: { mediumCount: number; subtleCount: number }) => r.mediumCount + r.subtleCount;

describe('Spot Focus guardrails (DIFFICULTY_RULES 3.3)', () => {
  it('stays within hard limits and the 40% cap', () => eachLevel(SF.LADDER, (r, _p, level) => {
    expect(r.gridCols, `level ${level}`).toBe(3);
    expect(r.gridRows, `level ${level}`).toBeGreaterThanOrEqual(3);
    expect(r.gridRows, `level ${level}`).toBeLessThanOrEqual(6);
    expect(r.differenceCount, `level ${level}`).toBeGreaterThanOrEqual(1);
    expect(r.differenceCount, `level ${level}`)
      .toBeLessThanOrEqual(Math.floor(0.4 * r.gridRows * r.gridCols));
    expect(r.mediumCount, `level ${level}`).toBeGreaterThanOrEqual(0);
    expect(r.subtleCount, `level ${level}`).toBeGreaterThanOrEqual(0);
    expect(nonBold(r), `level ${level}`).toBeLessThanOrEqual(r.differenceCount);
    // Soft cap on subtle differences per board (3.3); the twin catalogue allows 15.
    expect(r.subtleCount, `level ${level}`).toBeLessThanOrEqual(7);
  }));
  it('never gets easier as the level rises', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.gridRows, `level ${level}`).toBeGreaterThanOrEqual(p.gridRows);
    // The subtle count may drop by one when the grid grows (DIFFICULTY_RULES 3.3).
    const allowance = r.gridRows > p.gridRows ? 1 : 0;
    expect(r.differenceCount, `level ${level}`).toBeGreaterThanOrEqual(p.differenceCount - allowance);
    expect(r.subtleCount, `level ${level}`).toBeGreaterThanOrEqual(p.subtleCount - allowance);
    expect(tierWeight(r), `level ${level}`).toBeGreaterThanOrEqual(tierWeight(p) - 2 * allowance);
  }));
  it('holds the rules doc sample levels (3.3)', () => {
    const at = (level: number) => SF.LADDER[level - 1];
    expect([1, 6, 12, 18, 24].map((l) => [at(l).gridRows, at(l).differenceCount - nonBold(at(l)), at(l).mediumCount, at(l).subtleCount]))
      .toEqual([[3, 1, 0, 0], [3, 1, 2, 0], [4, 0, 3, 1], [5, 0, 2, 3], [6, 0, 1, 6]]);
  });
});

describe('Spot Focus curation (DIFFICULTY_RULES 3.3)', () => {
  /*
   * The tier axis is harder when a subtle difference appears or a bold one turns medium.
   * A new difference that arrives above bold is two changes: one more difference, and a
   * harder tier.
   */
  const tierHarder = (r: SFRow, p: SFRow) =>
    r.subtleCount > p.subtleCount || nonBold(r) > nonBold(p);

  it('makes at most one thing harder per step (S3)', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    const harder = [r.gridRows > p.gridRows, r.differenceCount > p.differenceCount, tierHarder(r, p)]
      .filter(Boolean).length;
    expect(harder, `level ${level}`).toBeLessThanOrEqual(1);
  }));

  it('moves at most two differences up a tier per step', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    expect(tierWeight(r) - tierWeight(p), `level ${level}`).toBeLessThanOrEqual(2);
  }));

  it('never grows the grid and moves up a tier in the same step', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.gridRows > p.gridRows && tierHarder(r, p), `level ${level}`).toBe(false);
  }));
});

type SFRow = (typeof SF.LADDER)[number];

describe('Tiffin guardrails (DIFFICULTY_RULES 3.5)', () => {
  it('stays within hard limits', () => eachLevel(SG.LADDER, (r, _p, level) => {
    expect(r.maxItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(1);
    expect(r.maxItemsPerGuest, `level ${level}`).toBeLessThanOrEqual(3);
    expect(r.readyWindowS, `level ${level}`).toBeGreaterThanOrEqual(8);
    expect(r.readyWindowS, `level ${level}`).toBeLessThanOrEqual(20);
    expect(r.guestsPerRound, `level ${level}`).toBeLessThanOrEqual(18);
    expect(r.guestMix.impatient + r.guestMix.patient, `level ${level}`).toBeLessThanOrEqual(1);
    // Plan 3b: seats, counter, smallest order, respawn gap.
    expect(r.seats, `level ${level}`).toBeGreaterThanOrEqual(2);
    expect(r.seats, `level ${level}`).toBeLessThanOrEqual(4);
    expect(r.counterSize, `level ${level}`).toBeGreaterThanOrEqual(3);
    expect(r.counterSize, `level ${level}`).toBeLessThanOrEqual(6);
    expect(r.minItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(1);
    expect(r.respawnMinS, `level ${level}`).toBeGreaterThanOrEqual(0.9);
    expect(r.respawnMaxS, `level ${level}`).toBeLessThanOrEqual(5);
  }));
  it('keeps its coupled rules', () => eachLevel(SG.LADDER, (r, _p, level) => {
    expect(r.counterSize, `level ${level}`).toBeGreaterThanOrEqual(r.maxItemsPerGuest + 1);
    expect(r.guestsPerRound, `level ${level}`).toBeGreaterThanOrEqual(2 * r.seats);
    expect(r.minItemsPerGuest, `level ${level}`).toBeLessThanOrEqual(r.maxItemsPerGuest);
    expect(r.respawnMinS, `level ${level}`).toBeLessThanOrEqual(r.respawnMaxS);
    // Guest types need a choice between guests (3.5 forbidden list).
    if (r.guestMix.impatient + r.guestMix.patient > 0) expect(r.seats, `level ${level}`).toBeGreaterThan(1);
  }));
  it('never gets easier as the level rises', () => eachLevel(SG.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.maxItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(p.maxItemsPerGuest);
    expect(r.guestsPerRound, `level ${level}`).toBeGreaterThanOrEqual(p.guestsPerRound);
    expect(r.patienceBaseS, `level ${level}`).toBeLessThanOrEqual(p.patienceBaseS);
    expect(r.patiencePerItemS, `level ${level}`).toBeLessThanOrEqual(p.patiencePerItemS);
    expect(r.readyWindowS, `level ${level}`).toBeLessThanOrEqual(p.readyWindowS);
    expect(r.guestMix.impatient, `level ${level}`).toBeGreaterThanOrEqual(p.guestMix.impatient);
    expect(r.seats, `level ${level}`).toBeGreaterThanOrEqual(p.seats);
    expect(r.counterSize, `level ${level}`).toBeGreaterThanOrEqual(p.counterSize);
    expect(r.minItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(p.minItemsPerGuest);
    expect(COOK_BANDS.indexOf(r.cookBand), `level ${level}`).toBeGreaterThanOrEqual(COOK_BANDS.indexOf(p.cookBand));
    expect(r.respawnMinS, `level ${level}`).toBeLessThanOrEqual(p.respawnMinS);
    expect(r.respawnMaxS, `level ${level}`).toBeLessThanOrEqual(p.respawnMaxS);
  }));
  it('holds the rules doc sample levels (3.5)', () => {
    const at = (level: number) => SG.LADDER[level - 1];
    expect([1, 8, 15, 23, 30].map((l) => [at(l).seats, at(l).counterSize, at(l).minItemsPerGuest, at(l).maxItemsPerGuest, at(l).guestsPerRound, at(l).cookBand]))
      .toEqual([[2, 3, 1, 1, 6, 'short'], [3, 4, 1, 2, 8, 'mid'], [4, 5, 1, 2, 8, 'all'], [4, 6, 1, 3, 10, 'all'], [4, 6, 2, 3, 12, 'long']]);
    expect([1, 8, 15, 23, 30].map((l) => [at(l).respawnMinS, at(l).respawnMaxS]))
      .toEqual([[2.5, 4], [1.5, 3], [1.2, 2.6], [0.9, 2.3], [0.9, 2.3]]);
  });
});
