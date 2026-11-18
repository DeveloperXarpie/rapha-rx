import { describe, it, expect } from 'vitest';
import * as MM from '../marketMemory';
import * as SF from '../spotFocus';
import * as SG from '../serveGuests';
import { isLadderGame, ladderLength, ladderParams, LADDER_VERSION } from '../index';

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
    expect(LADDER_VERSION).toBe('0.1');
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

const TIER = { bold: 0, medium: 1, subtle: 2 } as const;

describe('Spot Focus guardrails (DIFFICULTY_RULES 3.3)', () => {
  it('stays within hard limits and the 40% cap', () => eachLevel(SF.LADDER, (r, _p, level) => {
    expect(r.gridCols, `level ${level}`).toBe(3);
    expect(r.gridRows, `level ${level}`).toBeGreaterThanOrEqual(3);
    expect(r.gridRows, `level ${level}`).toBeLessThanOrEqual(6);
    expect(r.differenceCount, `level ${level}`).toBeGreaterThanOrEqual(1);
    expect(r.differenceCount, `level ${level}`)
      .toBeLessThanOrEqual(Math.floor(0.4 * r.gridRows * r.gridCols));
  }));
  it('never gets easier as the level rises', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.gridRows, `level ${level}`).toBeGreaterThanOrEqual(p.gridRows);
    expect(TIER[r.changeSubtlety], `level ${level}`).toBeGreaterThanOrEqual(TIER[p.changeSubtlety]);
    // The subtle count may drop by one when the grid grows (DIFFICULTY_RULES 3.3).
    const allowance = r.gridRows > p.gridRows ? 1 : 0;
    expect(r.differenceCount, `level ${level}`).toBeGreaterThanOrEqual(p.differenceCount - allowance);
  }));
});

describe('Spot Focus curation (DIFFICULTY_RULES 3.3)', () => {
  it('makes at most one thing harder per step (S3)', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    const harder = [
      r.gridRows > p.gridRows,
      r.differenceCount > p.differenceCount,
      TIER[r.changeSubtlety] > TIER[p.changeSubtlety],
    ].filter(Boolean).length;
    expect(harder, `level ${level}`).toBeLessThanOrEqual(1);
  }));

  it('never grows the grid and moves up a tier in the same step', () => eachLevel(SF.LADDER, (r, p, level) => {
    if (!p) return;
    const grew = r.gridRows > p.gridRows;
    const newTier = TIER[r.changeSubtlety] > TIER[p.changeSubtlety];
    expect(grew && newTier, `level ${level}`).toBe(false);
  }));
});

describe('Tiffin guardrails (DIFFICULTY_RULES 3.5)', () => {
  it('stays within hard limits', () => eachLevel(SG.LADDER, (r, _p, level) => {
    expect(r.maxItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(1);
    expect(r.maxItemsPerGuest, `level ${level}`).toBeLessThanOrEqual(3);
    expect(r.readyWindowS, `level ${level}`).toBeGreaterThanOrEqual(8);
    expect(r.readyWindowS, `level ${level}`).toBeLessThanOrEqual(20);
    expect(r.guestsPerRound, `level ${level}`).toBeGreaterThanOrEqual(8);
    expect(r.guestsPerRound, `level ${level}`).toBeLessThanOrEqual(18);
    expect(r.guestMix.impatient + r.guestMix.patient, `level ${level}`).toBeLessThanOrEqual(1);
  }));
  it('never gets easier as the level rises', () => eachLevel(SG.LADDER, (r, p, level) => {
    if (!p) return;
    expect(r.maxItemsPerGuest, `level ${level}`).toBeGreaterThanOrEqual(p.maxItemsPerGuest);
    expect(r.guestsPerRound, `level ${level}`).toBeGreaterThanOrEqual(p.guestsPerRound);
    expect(r.patienceBaseS, `level ${level}`).toBeLessThanOrEqual(p.patienceBaseS);
    expect(r.patiencePerItemS, `level ${level}`).toBeLessThanOrEqual(p.patiencePerItemS);
    expect(r.readyWindowS, `level ${level}`).toBeLessThanOrEqual(p.readyWindowS);
    expect(r.guestMix.impatient, `level ${level}`).toBeGreaterThanOrEqual(p.guestMix.impatient);
  }));
});
