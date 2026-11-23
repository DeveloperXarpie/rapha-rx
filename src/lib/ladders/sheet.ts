/**
 * The ladder sheet's layout, and the two pure conversions between its rows and a ladder's
 * anchors (plan 3b part 2). `scripts/ladders-sheet.ts` does the file work; everything that
 * decides a value lives here, so it is tested.
 *
 * A sheet row is a level. Its Source says who set it:
 * - `owner` or `claude`: an anchor, imported as it stands.
 * - `filled`: what `fillLadder` computes between anchors. Exported so the sheet reads as a
 *   whole ladder, ignored on import, and refused if someone edited it without claiming it.
 */

import type {
  MarketMemoryDynamicParams, ServeGuestsDynamicParams, SpotFocusDynamicParams,
} from '../dynamicDifficulty';
import { fillLadder, type Anchor, type AnchorSource, type FieldSpec } from './fill';

export type Cell = string | number | boolean | null | undefined;
export type Cells = Record<string, Cell>;

export const SOURCES = ['owner', 'claude', 'filled'] as const;

export interface Column {
  header: string;
  unit: string;
  min?: number;
  max?: number;
  /** The largest change from one level to the next. */
  step?: number;
  /** Which way the value may move as the level rises; `order` is a fixed sequence of options. */
  direction: 'up' | 'down' | 'order' | 'none';
  /** Allowed values, in order, for a drop-down column. */
  options?: string[];
  /** Shown for reading and computed from the others; never imported. */
  derived?: boolean;
  note?: string;
}

/** One level as it sits in the sheet. */
export interface SheetRow {
  level: number;
  source: Cell;
  cells: Cells;
  note?: Cell;
}

/** Reads typed values out of a row's cells, collecting problems instead of throwing. */
export class Reader {
  private cells: Cells;
  private problems: string[];
  private where: string;

  constructor(cells: Cells, problems: string[], where: string) {
    this.cells = cells;
    this.problems = problems;
    this.where = where;
  }

  private fail(header: string, wanted: string): never {
    this.problems.push(`${this.where}, ${header}: expected ${wanted}, found "${String(this.cells[header] ?? '')}"`);
    throw new SkipRow();
  }

  num(header: string): number {
    const v = this.cells[header];
    const n = typeof v === 'number' ? v : typeof v === 'string' && v.trim() !== '' ? Number(v) : NaN;
    return Number.isFinite(n) ? n : this.fail(header, 'a number');
  }

  int(header: string): number {
    const n = this.num(header);
    return Number.isInteger(n) ? n : this.fail(header, 'a whole number');
  }

  onOff(header: string): boolean {
    const v = this.cells[header];
    if (v === true || v === false) return v;
    const s = typeof v === 'string' ? v.trim().toLowerCase() : '';
    if (s === 'on') return true;
    if (s === 'off') return false;
    return this.fail(header, 'on or off');
  }

  option<T extends string>(header: string, options: readonly T[]): T {
    const v = this.cells[header];
    const s = typeof v === 'string' ? v.trim() : '';
    return (options as readonly string[]).includes(s) ? (s as T) : this.fail(header, options.join(', '));
  }
}

class SkipRow extends Error {}

export interface GameSheet<T> {
  gameId: string;
  tab: string;
  title: string;
  rules: string;
  columns: Column[];
  /** Settings the game will gain later, named on the tab so nobody looks for them. */
  later?: string;
  spec: { [K in keyof T]: FieldSpec };
  toCells(v: T): Cells;
  fromCells(read: Reader): T;
}

const onOff = (b: boolean) => (b ? 'on' : 'off');

// ─── The three ladder games ───────────────────────────────────────────────────

export const MARKET_MEMORY_SHEET: GameSheet<MarketMemoryDynamicParams> = {
  gameId: 'market-memory',
  tab: 'Shopping List',
  title: 'Shopping List (market-memory)',
  rules: 'DIFFICULTY_RULES.md section 3.1',
  later: 'Coming later, once the game supports them: crates (needs empty-slot art), twin closeness (needs a tag per item), a study timer, interference.',
  columns: [
    { header: 'listLength', unit: 'items', min: 2, max: 6, step: 1, direction: 'up', note: 'The cart fits 6.' },
    { header: 'holdMs', unit: 'ms', min: 1000, max: 8000, step: 500, direction: 'up', note: 'Was retentionMs. 500 ms steps.' },
    { header: 'twins', unit: 'on/off', direction: 'order', options: ['off', 'on'], note: 'Look-alike items. Needs listLength x 2 <= 16.' },
    { header: 'category', unit: 'on/off', direction: 'order', options: ['off', 'on'], note: 'One-category lists. After twins.' },
    { header: 'hints', unit: 'count', min: 0, max: 1, step: 1, direction: 'down', note: 'Must stay below listLength - 1.' },
  ],
  spec: {
    listLength: { kind: 'step', step: 1 },
    retentionMs: { kind: 'step', step: 500 },
    similarPackaging: { kind: 'switch' },
    delayedRetrieval: { kind: 'switch' },
    listCategory: { kind: 'switch' },
    hints: { kind: 'switch' },
  },
  toCells: (v) => ({
    listLength: v.listLength, holdMs: v.retentionMs, twins: onOff(v.similarPackaging),
    category: onOff(v.listCategory), hints: v.hints,
  }),
  fromCells: (r) => ({
    listLength: r.int('listLength'), retentionMs: r.int('holdMs'), similarPackaging: r.onOff('twins'),
    // Never read by the game (DIFFICULTY_RULES 3.1), so not on the sheet.
    delayedRetrieval: false,
    listCategory: r.onOff('category'), hints: r.int('hints'),
  }),
};

export const SPOT_FOCUS_SHEET: GameSheet<SpotFocusDynamicParams> = {
  gameId: 'spot-focus',
  tab: 'Spot Focus',
  title: 'Spot Focus (spot-focus)',
  rules: 'DIFFICULTY_RULES.md section 3.3',
  later: 'Always 3 columns, so cards stay readable on a phone. The "I can\'t find it" delay is not on the ladder yet.',
  columns: [
    { header: 'gridRows', unit: 'rows', min: 3, max: 6, step: 1, direction: 'up' },
    { header: 'bold', unit: 'count', min: 0, direction: 'none', note: 'An object from another family.' },
    { header: 'medium', unit: 'count', min: 0, direction: 'none', note: 'Another member of the family.' },
    { header: 'subtle', unit: 'count', min: 0, max: 7, direction: 'up', note: 'The near-identical twin. May drop by 1 when the grid grows.' },
    { header: 'differences', unit: 'count', min: 1, step: 1, direction: 'up', derived: true, note: 'bold + medium + subtle; at most 40% of the cards.' },
  ],
  spec: {
    gridCols: { kind: 'switch' },
    gridRows: { kind: 'switch' },
    differenceCount: { kind: 'step', step: 1 },
    mediumCount: { kind: 'step', step: 1 },
    subtleCount: { kind: 'step', step: 1 },
  },
  toCells: (v) => ({
    gridRows: v.gridRows, bold: v.differenceCount - v.mediumCount - v.subtleCount,
    medium: v.mediumCount, subtle: v.subtleCount, differences: v.differenceCount,
  }),
  fromCells: (r) => {
    const bold = r.int('bold');
    const mediumCount = r.int('medium');
    const subtleCount = r.int('subtle');
    return { gridCols: 3, gridRows: r.int('gridRows'), differenceCount: bold + mediumCount + subtleCount, mediumCount, subtleCount };
  },
};

const COOK_BANDS = ['short', 'mid', 'all', 'long'] as const;

export const SERVE_GUESTS_SHEET: GameSheet<ServeGuestsDynamicParams> = {
  gameId: 'serve-guests',
  tab: 'Tiffin Time',
  title: 'Tiffin Time (serve-guests)',
  rules: 'DIFFICULTY_RULES.md section 3.5',
  columns: [
    { header: 'seats', unit: 'guests at once', min: 2, max: 4, step: 1, direction: 'up' },
    { header: 'counterSize', unit: 'dishes', min: 3, max: 6, step: 1, direction: 'up', note: 'At least maxItems + 1.' },
    { header: 'minItems', unit: 'dishes/order', min: 1, max: 3, step: 1, direction: 'up' },
    { header: 'maxItems', unit: 'dishes/order', min: 1, max: 3, step: 1, direction: 'up' },
    { header: 'guestsPerRound', unit: 'guests', max: 18, step: 1, direction: 'up', note: 'At least 2 x seats.' },
    { header: 'patienceBaseS', unit: 's', max: 45, step: 3, direction: 'down', note: 'A Middle guest. Never under 18 s + 8 s per further dish.' },
    { header: 'patiencePerItemS', unit: 's', max: 12, step: 2, direction: 'down' },
    { header: 'impatient', unit: 'share 0-1', min: 0, max: 1, step: 0.1, direction: 'up', note: 'Impatient guests (x 0.7 patience).' },
    { header: 'patient', unit: 'share 0-1', min: 0, max: 1, direction: 'none', note: 'Patient guests (x 1.3). The rest are Middle.' },
    { header: 'readyWindowS', unit: 's', min: 8, max: 20, step: 1, direction: 'down' },
    { header: 'cookBand', unit: 'band', direction: 'order', options: [...COOK_BANDS], note: 'short <= 4.5 s; mid <= 6 s; all; long = slow dishes twice as often.' },
    { header: 'respawnMinS', unit: 's', min: 0.9, max: 5, direction: 'down' },
    { header: 'respawnMaxS', unit: 's', min: 0.9, max: 5, direction: 'down' },
  ],
  spec: {
    seats: { kind: 'step', step: 1 },
    counterSize: { kind: 'step', step: 1 },
    minItemsPerGuest: { kind: 'switch' },
    maxItemsPerGuest: { kind: 'switch' },
    guestsPerRound: { kind: 'step', step: 1 },
    patienceBaseS: { kind: 'step', step: 1 },
    patiencePerItemS: { kind: 'step', step: 1 },
    guestMix: { kind: 'step', step: 0.05 },
    readyWindowS: { kind: 'step', step: 1 },
    cookBand: { kind: 'switch' },
    respawnMinS: { kind: 'step', step: 0.1 },
    respawnMaxS: { kind: 'step', step: 0.1 },
  },
  toCells: (v) => ({
    seats: v.seats, counterSize: v.counterSize, minItems: v.minItemsPerGuest, maxItems: v.maxItemsPerGuest,
    guestsPerRound: v.guestsPerRound, patienceBaseS: v.patienceBaseS, patiencePerItemS: v.patiencePerItemS,
    impatient: v.guestMix.impatient, patient: v.guestMix.patient, readyWindowS: v.readyWindowS,
    cookBand: v.cookBand, respawnMinS: v.respawnMinS, respawnMaxS: v.respawnMaxS,
  }),
  fromCells: (r) => ({
    seats: r.int('seats'), counterSize: r.int('counterSize'),
    minItemsPerGuest: r.int('minItems'), maxItemsPerGuest: r.int('maxItems'),
    guestsPerRound: r.int('guestsPerRound'), patienceBaseS: r.num('patienceBaseS'),
    patiencePerItemS: r.num('patiencePerItemS'),
    guestMix: { impatient: r.num('impatient'), patient: r.num('patient') },
    readyWindowS: r.num('readyWindowS'), cookBand: r.option('cookBand', COOK_BANDS),
    respawnMinS: r.num('respawnMinS'), respawnMaxS: r.num('respawnMaxS'),
  }),
};

export const GAME_SHEETS = [MARKET_MEMORY_SHEET, SPOT_FOCUS_SHEET, SERVE_GUESTS_SHEET] as const;

// ─── Conversions ──────────────────────────────────────────────────────────────

export interface SheetLadder<T> {
  length: number;
  anchors: Anchor<T>[];
}

/** Every level as a sheet row: anchors with their source and note, the rest marked filled. */
export function anchorsToRows<T extends object>(sheet: GameSheet<T>, ladder: SheetLadder<T>): SheetRow[] {
  const filled = fillLadder(ladder.anchors, ladder.length, sheet.spec);
  return filled.map((values, i) => {
    const anchor = ladder.anchors.find((a) => a.level === i + 1);
    return {
      level: i + 1,
      source: anchor ? anchor.source ?? 'claude' : 'filled',
      cells: sheet.toCells(anchor ? anchor.values : values),
      note: anchor?.note ?? null,
    };
  });
}

const blank = (c: Cell) => c === null || c === undefined || (typeof c === 'string' && c.trim() === '');

function sameCell(a: Cell, b: Cell): boolean {
  if (blank(a) && blank(b)) return true;
  const na = typeof a === 'number' ? a : Number(a);
  const nb = typeof b === 'number' ? b : Number(b);
  if (typeof a !== 'boolean' && typeof b !== 'boolean' && Number.isFinite(na) && Number.isFinite(nb)
    && !blank(a) && !blank(b)) {
    return Math.abs(na - nb) < 1e-9;
  }
  return String(a).trim().toLowerCase() === String(b).trim().toLowerCase();
}

export class SheetError extends Error {
  problems: string[];

  constructor(problems: string[]) {
    super(problems.join('\n'));
    this.problems = problems;
  }
}

/**
 * A game's anchors from its sheet rows. Refuses, naming every problem, rather than guessing:
 * a malformed cell, an unknown Source, a missing first or last anchor, or a filled row that
 * someone changed without setting its Source to owner.
 *
 * `previous` is the ladder as last imported, which is what the sheet's filled rows were
 * exported from. A filled row is judged against that, not against the new fill: adding an
 * anchor moves the levels around it, and those rows were never touched, so they are simply
 * refilled. Only a row that differs from what was exported was typed into.
 */
export function rowsToAnchors<T extends object>(
  sheet: GameSheet<T>, rows: SheetRow[], previous: SheetLadder<T>,
): SheetLadder<T> {
  const problems: string[] = [];
  const inputs = sheet.columns.filter((c) => !c.derived).map((c) => c.header);
  const used = rows.filter((r) => !blank(r.source) || inputs.some((h) => !blank(r.cells[h])));
  const length = Math.max(0, ...used.map((r) => r.level));
  const where = (level: number) => `${sheet.tab}, level ${level}`;

  const anchors: Anchor<T>[] = [];
  for (const row of used) {
    const source = blank(row.source) ? '' : String(row.source).trim().toLowerCase();
    if (source !== '' && !(SOURCES as readonly string[]).includes(source)) {
      problems.push(`${where(row.level)}: Source must be owner, claude or filled, found "${String(row.source)}"`);
      continue;
    }
    if (source !== 'owner' && source !== 'claude') continue;
    try {
      const values = sheet.fromCells(new Reader(row.cells, problems, where(row.level)));
      const note = blank(row.note) ? undefined : String(row.note).trim();
      anchors.push({ level: row.level, source: source as AnchorSource, ...(note ? { note } : {}), values });
    } catch (e) {
      if (!(e instanceof SkipRow)) throw e;
    }
  }

  const anchored = new Set(anchors.map((a) => a.level));
  if (length === 0) problems.push(`${sheet.tab}: no levels`);
  else {
    if (!anchored.has(1)) problems.push(`${where(1)}: must be an anchor (Source owner or claude)`);
    if (!anchored.has(length)) problems.push(`${where(length)}: the last level must be an anchor (Source owner or claude)`);
  }
  if (problems.length > 0) throw new SheetError(problems);

  // A filled row that differs from what was exported was edited by hand. Importing it as
  // filled would throw the edit away, so ask for it to be claimed instead. A row past the
  // old ladder's end was never exported, so any value in it was typed in.
  const exported = fillLadder(previous.anchors, previous.length, sheet.spec);
  for (const row of used) {
    if (anchored.has(row.level)) continue;
    const old = exported[row.level - 1];
    const expected: Cells = old ? sheet.toCells(old) : {};
    const changed = inputs.filter((h) => !blank(row.cells[h]) && !sameCell(row.cells[h], expected[h]));
    if (changed.length > 0) {
      problems.push(`${where(row.level)}: ${changed.join(', ')} changed, but Source is not owner. Set Source to owner to keep the change.`);
    }
  }
  if (problems.length > 0) throw new SheetError(problems);

  return { length, anchors: anchors.sort((a, b) => a.level - b.level) };
}

// ─── The generated data file ──────────────────────────────────────────────────

export const GENERATED_PATH = 'src/lib/ladders/anchors.generated.ts';

const EXPORT_NAME: Record<string, { name: string; type: string }> = {
  'market-memory': { name: 'MARKET_MEMORY', type: 'MarketMemoryDynamicParams' },
  'spot-focus': { name: 'SPOT_FOCUS', type: 'SpotFocusDynamicParams' },
  'serve-guests': { name: 'SERVE_GUESTS', type: 'ServeGuestsDynamicParams' },
};

/** A value as TypeScript: object keys bare, strings single-quoted, as the codebase writes them. */
function literal(v: unknown): string {
  if (typeof v === 'string') return `'${v.replace(/\\/g, '\\\\').replace(/'/g, "\\'")}'`;
  if (v === null || typeof v !== 'object') return String(v);
  if (Array.isArray(v)) return `[${v.map(literal).join(', ')}]`;
  return `{ ${Object.entries(v).map(([k, x]) => `${k}: ${literal(x)}`).join(', ')} }`;
}

/** The contents of `anchors.generated.ts` for the three ladders, keyed by game id. */
export function renderGenerated(ladders: Record<string, SheetLadder<object>>): string {
  const blocks = GAME_SHEETS.map((sheet) => {
    const { name, type } = EXPORT_NAME[sheet.gameId];
    const ladder = ladders[sheet.gameId];
    const rows = ladder.anchors.map((a) => {
      const fields: Record<string, unknown> = { level: a.level, source: a.source ?? 'claude' };
      if (a.note) fields.note = a.note;
      fields.values = a.values;
      return `    ${literal(fields)},`;
    });
    return [
      `export const ${name}: SheetLadder<${type}> = {`,
      `  length: ${ladder.length},`,
      '  anchors: [',
      ...rows,
      '  ],',
      '};',
    ].join('\n');
  });
  return [
    '/*',
    ' * GENERATED by `npm run ladders:import` from docs/redesign-v2/DIFFICULTY_LADDERS.xlsx.',
    ' * Do not edit by hand: change the sheet and import it (DIFFICULTY_RULES.md section 1.1).',
    ' */',
    '',
    "import type { MarketMemoryDynamicParams, ServeGuestsDynamicParams, SpotFocusDynamicParams } from '../dynamicDifficulty';",
    "import type { SheetLadder } from './sheet';",
    '',
    blocks.join('\n\n'),
    '',
  ].join('\n');
}
