import { describe, it, expect } from 'vitest';
import type {
  MarketMemoryDynamicParams, ServeGuestsDynamicParams, SpotFocusDynamicParams,
} from '../../dynamicDifficulty';
import {
  anchorsToRows, GAME_SHEETS, MARKET_MEMORY_SHEET, rowsToAnchors, SERVE_GUESTS_SHEET, SheetError,
  SPOT_FOCUS_SHEET, type GameSheet, type SheetLadder, type SheetRow,
} from '../sheet';
import * as MM from '../marketMemory';
import * as SF from '../spotFocus';
import * as SG from '../serveGuests';

function problemsOf(fn: () => unknown): string[] {
  try { fn(); } catch (e) { if (e instanceof SheetError) return e.problems; throw e; }
  return [];
}

/*
 * Fixed ladders for the import rules, so a change to the real ladders (which is the point
 * of the sheet) never breaks these tests. The real ladders get the round trip.
 */
const mm = (listLength: number, retentionMs: number, on: boolean, hints: number): MarketMemoryDynamicParams =>
  ({ listLength, retentionMs, similarPackaging: on, delayedRetrieval: false, listCategory: on, hints });
const MM_FIXTURE: SheetLadder<MarketMemoryDynamicParams> = {
  length: 20,
  anchors: [
    { level: 1, source: 'claude', values: mm(3, 1500, false, 1) },
    { level: 20, source: 'claude', values: mm(6, 6500, true, 0) },
  ],
};

const sg = (seats: number, counterSize: number, cookBand: ServeGuestsDynamicParams['cookBand']): ServeGuestsDynamicParams => ({
  seats, counterSize, minItemsPerGuest: 1, maxItemsPerGuest: 2, guestsPerRound: 8, patienceBaseS: 30,
  patiencePerItemS: 9, guestMix: { impatient: 0, patient: 0 }, readyWindowS: 12, cookBand, respawnMinS: 1, respawnMaxS: 2,
});
const SG_FIXTURE: SheetLadder<ServeGuestsDynamicParams> = {
  length: 10,
  anchors: [
    { level: 1, source: 'claude', values: sg(2, 3, 'short') },
    { level: 10, source: 'claude', values: sg(4, 6, 'all') },
  ],
};

const sf = (gridRows: number, bold: number, mediumCount: number, subtleCount: number): SpotFocusDynamicParams =>
  ({ gridCols: 3, gridRows, differenceCount: bold + mediumCount + subtleCount, mediumCount, subtleCount });
const SF_FIXTURE: SheetLadder<SpotFocusDynamicParams> = {
  length: 2,
  anchors: [
    { level: 1, source: 'claude', values: sf(3, 1, 0, 0) },
    { level: 2, source: 'owner', note: 'Mixed', values: sf(6, 0, 1, 6) },
  ],
};

describe('ladder sheet round trip', () => {
  it('returns the real ladders as they were given', () => {
    const roundTrip = <T extends object>(sheet: GameSheet<T>, ladder: SheetLadder<T>) => {
      const rows = anchorsToRows(sheet, ladder);
      expect(rows).toHaveLength(ladder.length);
      expect(rowsToAnchors(sheet, rows, ladder)).toEqual(ladder);
    };
    roundTrip(MARKET_MEMORY_SHEET, { length: MM.LENGTH, anchors: MM.ANCHORS });
    roundTrip(SPOT_FOCUS_SHEET, { length: SF.LENGTH, anchors: SF.ANCHORS });
    roundTrip(SERVE_GUESTS_SHEET, { length: SG.LENGTH, anchors: SG.ANCHORS });
    expect(GAME_SHEETS).toHaveLength(3);
  });

  it('marks the levels between anchors as filled', () => {
    const rows = anchorsToRows(SERVE_GUESTS_SHEET, SG_FIXTURE);
    expect(rows.map((r) => r.source)).toEqual(['claude', ...Array(8).fill('filled'), 'claude']);
  });

  it('shows the Spot Focus difference count, but never reads it back', () => {
    const rows = anchorsToRows(SPOT_FOCUS_SHEET, SF_FIXTURE);
    expect(rows[1]).toMatchObject({ source: 'owner', note: 'Mixed', cells: { gridRows: 6, bold: 0, medium: 1, subtle: 6, differences: 7 } });
    rows[1].cells.differences = 99;
    expect(rowsToAnchors(SPOT_FOCUS_SHEET, rows, SF_FIXTURE).anchors[1].values.differenceCount).toBe(7);
  });
});

describe('ladder sheet import refuses rather than guesses', () => {
  const mmRows = (): SheetRow[] => anchorsToRows(MARKET_MEMORY_SHEET, MM_FIXTURE);

  it('takes an owner row as an anchor and keeps its note', () => {
    const rows = mmRows();
    rows[2] = { ...rows[2], source: 'owner', cells: { ...rows[2].cells, holdMs: 2000 }, note: 'Owner, 2026-12-01' };
    const ladder = rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE);
    expect(ladder.anchors.find((a) => a.level === 3)).toMatchObject({ source: 'owner', note: 'Owner, 2026-12-01', values: { retentionMs: 2000 } });
  });

  it('refills the untouched rows around a new anchor', () => {
    const rows = mmRows();
    rows[2] = { ...rows[2], source: 'owner', cells: { ...rows[2].cells, listLength: 5 } };
    expect(rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE).anchors.map((a) => a.level)).toEqual([1, 3, 20]);
  });

  it('names a filled row edited without being claimed', () => {
    const rows = mmRows();
    rows[2].cells.holdMs = 7000;
    expect(problemsOf(() => rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE)))
      .toEqual(['Shopping List, level 3: holdMs changed, but Source is not owner. Set Source to owner to keep the change.']);
  });

  it('names malformed cells', () => {
    const rows = mmRows();
    rows[0].cells.twins = 'maybe';
    rows[19].cells.listLength = 'four';
    expect(problemsOf(() => rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE))).toEqual([
      'Shopping List, level 1, twins: expected on or off, found "maybe"',
      'Shopping List, level 20, listLength: expected a number, found "four"',
      'Shopping List, level 1: must be an anchor (Source owner or claude)',
      'Shopping List, level 20: the last level must be an anchor (Source owner or claude)',
    ]);
  });

  it('names an unknown band and an unknown Source', () => {
    const rows = anchorsToRows(SERVE_GUESTS_SHEET, SG_FIXTURE);
    rows[0].cells.cookBand = 'medium';
    rows[3].source = 'me';
    expect(problemsOf(() => rowsToAnchors(SERVE_GUESTS_SHEET, rows, SG_FIXTURE))).toEqual([
      'Tiffin Time, level 1, cookBand: expected short, mid, all, long, found "medium"',
      'Tiffin Time, level 4: Source must be owner, claude or filled, found "me"',
      'Tiffin Time, level 1: must be an anchor (Source owner or claude)',
    ]);
  });

  it('needs the last level to be an anchor, and takes the length from the rows', () => {
    const rows = mmRows().slice(0, 18);
    expect(problemsOf(() => rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE)))
      .toEqual(['Shopping List, level 18: the last level must be an anchor (Source owner or claude)']);
    rows[17].source = 'owner';
    expect(rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE).length).toBe(18);
  });

  it('names a value typed past the old end of the ladder without a Source', () => {
    const rows = [...mmRows(), { level: 21, source: null, cells: { listLength: 6 } }];
    expect(problemsOf(() => rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE))).toEqual([
      'Shopping List, level 21: the last level must be an anchor (Source owner or claude)',
    ]);
  });

  it('accepts on/off in any case and numbers typed as text', () => {
    const rows = mmRows();
    rows[0].cells = { ...rows[0].cells, twins: 'OFF', listLength: '3' };
    expect(rowsToAnchors(MARKET_MEMORY_SHEET, rows, MM_FIXTURE).anchors[0].values).toEqual(MM_FIXTURE.anchors[0].values);
  });
});
