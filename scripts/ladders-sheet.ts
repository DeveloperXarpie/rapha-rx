/**
 * The difficulty ladder sheet, both ways (plan 3b part 2; DIFFICULTY_RULES 1.1).
 *
 *   npm run ladders:import   read docs/redesign-v2/DIFFICULTY_LADDERS.xlsx, write
 *                            src/lib/ladders/anchors.generated.ts, run the ladder tests,
 *                            then refresh the sheet's filled rows
 *   npm run ladders:export   rebuild the sheet's ladder tabs from the app's anchors
 *
 * The layout and every value decision live in src/lib/ladders/sheet.ts (tested). This file
 * only moves cells between the workbook and that module. Close the workbook in Excel first:
 * Windows will not let a script overwrite an open file.
 */

import { readFileSync, writeFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import ExcelJS from 'exceljs';
import {
  anchorsToRows, GAME_SHEETS, GENERATED_PATH, renderGenerated, rowsToAnchors, SheetError,
  type Cell, type Cells, type GameSheet, type SheetLadder, type SheetRow,
} from '../src/lib/ladders/sheet';
import * as MM from '../src/lib/ladders/marketMemory';
import * as SF from '../src/lib/ladders/spotFocus';
import * as SG from '../src/lib/ladders/serveGuests';

const WORKBOOK = 'docs/redesign-v2/DIFFICULTY_LADDERS.xlsx';

/** The tabs as the 2026-11-11 workbook named them, so the first export replaces them in place. */
const OLD_TAB_NAMES: Record<string, string[]> = { 'Tiffin Time': ['Tiffen Time'] };

const CURRENT: Record<string, SheetLadder<object>> = {
  'market-memory': { length: MM.LENGTH, anchors: MM.ANCHORS },
  'spot-focus': { length: SF.LENGTH, anchors: SF.ANCHORS },
  'serve-guests': { length: SG.LENGTH, anchors: SG.ANCHORS },
};

// ─── Layout ───────────────────────────────────────────────────────────────────

const GUARD_ROW = 6;        // "Guardrails" and the column names
const LEVEL_HEADER_ROW = 15; // "Level", "Source", the column names, "Notes"
const FIRST_LEVEL_ROW = LEVEL_HEADER_ROW + 1;
const SPARE_ROWS = 10;      // empty level rows under the ladder, to lengthen it
const FIRST_COL = 3;        // C: the first setting

const FILL = {
  input: 'FFFFF2CC',   // yellow: type here
  guard: 'FFDDE3EA',   // blue-grey: limits, do not edit
  derived: 'FFDDE3EA',
  header: 'FF1F3A5F',
  claude: 'FFE2F0D9',  // green: Claude's anchor
  owner: 'FFFCE4D6',   // peach: the owner's anchor
};
const RED = 'FFF4B6B6';
const AMBER = 'FFFFD966';

const solid = (argb: string): ExcelJS.Fill => ({ type: 'pattern', pattern: 'solid', fgColor: { argb } });
const colLetter = (n: number) => {
  let s = '';
  for (let x = n; x > 0; x = Math.floor((x - 1) / 26)) s = String.fromCharCode(65 + ((x - 1) % 26)) + s;
  return s;
};

function buildTab<T extends object>(ws: ExcelJS.Worksheet, sheet: GameSheet<T>, ladder: SheetLadder<T>) {
  const cols = sheet.columns;
  const notesCol = FIRST_COL + cols.length;
  const lastRow = FIRST_LEVEL_ROW + ladder.length + SPARE_ROWS - 1;

  ws.getCell('A1').value = sheet.title;
  ws.getCell('A1').font = { bold: true, size: 14 };
  ws.getCell('A2').value = `Rules: ${sheet.rules}   |   Ladder: ${ladder.length} levels`;
  ws.getCell('A3').value = 'Type only in yellow cells. Set Source to owner on every level you set. '
    + 'Red = outside the hard min or max. Amber = easier than the level above, or a bigger step than allowed.';
  if (sheet.later) ws.getCell('A4').value = sheet.later;

  // The guardrail block: what each setting is and where its limits are.
  const guard: [string, (c: (typeof cols)[number]) => Cell][] = [
    ['Guardrails', (c) => c.header],
    ['Unit', (c) => c.unit],
    ['Hard min', (c) => c.min ?? null],
    ['Hard max', (c) => c.max ?? null],
    ['Max step / level', (c) => c.step ?? null],
    ['Direction', (c) => c.direction],
    ['Notes', (c) => c.note ?? null],
  ];
  guard.forEach(([label, get], i) => {
    const r = GUARD_ROW + i;
    ws.getCell(r, 1).value = label;
    ws.getCell(r, 1).font = { bold: true };
    cols.forEach((c, j) => {
      const cell = ws.getCell(r, FIRST_COL + j);
      cell.value = get(c) as ExcelJS.CellValue;
      cell.fill = solid(FILL.guard);
      cell.alignment = { wrapText: true, vertical: 'top' };
      if (i === 0) cell.font = { bold: true };
    });
  });

  // The level table.
  const header = ['Level', 'Source', ...cols.map((c) => c.header), 'Notes'];
  header.forEach((h, j) => {
    const cell = ws.getCell(LEVEL_HEADER_ROW, j + 1);
    cell.value = h;
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' } };
    cell.fill = solid(FILL.header);
  });
  ws.getCell(LEVEL_HEADER_ROW - 1, 1).value = 'Levels';
  ws.getCell(LEVEL_HEADER_ROW - 1, 1).font = { bold: true };

  const rows = anchorsToRows(sheet, ladder);
  for (let i = 0; i < ladder.length + SPARE_ROWS; i++) {
    const r = FIRST_LEVEL_ROW + i;
    const row: SheetRow | undefined = rows[i];
    ws.getCell(r, 1).value = i + 1;
    const src = ws.getCell(r, 2);
    src.value = row ? String(row.source) : null;
    src.fill = solid(row?.source === 'owner' ? FILL.owner : row?.source === 'claude' ? FILL.claude : FILL.input);
    cols.forEach((c, j) => {
      const cell = ws.getCell(r, FIRST_COL + j);
      if (c.derived) {
        // Spot Focus differences: the sum of the three tiers, for reading.
        const tiers = ['bold', 'medium', 'subtle'].map((h) => colLetter(FIRST_COL + cols.findIndex((x) => x.header === h)));
        cell.value = row ? { formula: tiers.map((t) => `${t}${r}`).join('+'), result: row.cells[c.header] as number } : null;
        cell.fill = solid(FILL.derived);
        return;
      }
      cell.value = (row ? row.cells[c.header] : null) as ExcelJS.CellValue;
      cell.fill = solid(FILL.input);
      if (row?.source === 'filled') cell.font = { color: { argb: 'FF808080' } };
      if (c.options) {
        cell.dataValidation = { type: 'list', allowBlank: true, formulae: [`"${c.options.join(',')}"`] };
      }
    });
    const note = ws.getCell(r, notesCol);
    note.value = (row?.note ?? null) as ExcelJS.CellValue;
    note.fill = solid(FILL.input);
    src.dataValidation = { type: 'list', allowBlank: true, formulae: ['"owner,claude,filled"'] };
  }

  // Red outside the limits; amber against the direction or past the max step.
  cols.forEach((c, j) => {
    if (c.derived && c.direction === 'none') return;
    const L = colLetter(FIRST_COL + j);
    const first = `${L}${FIRST_LEVEL_ROW}`;
    const rules: ExcelJS.ConditionalFormattingRule[] = [];
    const bounds = [
      c.min !== undefined ? `${first}<${c.min}` : null,
      c.max !== undefined ? `${first}>${c.max}` : null,
    ].filter(Boolean);
    if (bounds.length) {
      rules.push({ type: 'expression', priority: 1, formulae: [`AND(ISNUMBER(${first}),OR(${bounds.join(',')}))`], style: { fill: solid(RED) } });
    }
    const prev = `${L}${FIRST_LEVEL_ROW - 1}`;
    const moves = [
      c.direction === 'up' ? `${first}<${prev}` : null,
      c.direction === 'down' ? `${first}>${prev}` : null,
      c.step !== undefined ? `ABS(${first}-${prev})>${c.step}` : null,
    ].filter(Boolean);
    if (moves.length) {
      rules.push({ type: 'expression', priority: 2, formulae: [`AND(ISNUMBER(${first}),ISNUMBER(${prev}),OR(${moves.join(',')}))`], style: { fill: solid(AMBER) } });
    }
    if (rules.length) ws.addConditionalFormatting({ ref: `${L}${FIRST_LEVEL_ROW}:${L}${lastRow}`, rules });
  });

  ws.getColumn(1).width = 18;
  ws.getColumn(2).width = 10;
  cols.forEach((c, j) => { ws.getColumn(FIRST_COL + j).width = Math.max(12, c.header.length + 2); });
  ws.getColumn(notesCol).width = 60;
  ws.views = [{ state: 'frozen', xSplit: 2, ySplit: LEVEL_HEADER_ROW }];
}

const HOW_TO = [
  ['Rapha Rx - Difficulty Ladders', true],
  ['The app reads this sheet. Companion to docs/redesign-v2/DIFFICULTY_RULES.md. Nothing here is play-tested yet.', false],
  ['', false],
  ['What this is', true],
  ['One tab per ladder game: Shopping List, Spot Focus, Tiffin Time. Each row is a level; the columns are that game\'s settings.', false],
  ['The other tabs (Station Master, Garden Keeper, Free Me) are the 2026-11-11 drafts. Those games have no ladder in the app yet.', false],
  ['', false],
  ['How to change a ladder', true],
  ['1. Type the levels you want to set yourself in the yellow cells, and set their Source to owner.', false],
  ['2. You need at least level 1 and the last level. To shorten or lengthen a ladder, make the new last level an owner row and clear the rows below it.', false],
  ['3. Leave the other rows alone. Rows marked filled are worked out evenly between the anchors; the app recomputes them.', false],
  ['4. Rows marked claude are Claude\'s anchors (the rules doc samples, and levels added so each step changes one thing). Overwrite them freely: set them to owner.', false],
  ['5. Hand the file back. A developer runs npm run ladders:import, which checks every rule and either takes the sheet or names each problem.', false],
  ['   It refuses rather than guesses: a filled row changed without setting it to owner, a value it cannot read, or a level that breaks a rule.', false],
  ['', false],
  ['Colours', true],
  ['Yellow = type here.  Blue-grey = limits and computed values, do not edit.  Green Source = Claude\'s anchor.  Peach Source = yours.  Grey text = filled.', false],
  ['Red = outside the hard min or max.  Amber = easier than the level above, or a bigger step than allowed. Some steps may go amber on purpose (a breather when the board grows); the notes say so.', false],
] as const;

function buildHowTo(ws: ExcelJS.Worksheet) {
  HOW_TO.forEach(([text, bold], i) => {
    const cell = ws.getCell(i + 1, 1);
    cell.value = text;
    cell.font = bold ? { bold: true, size: i === 0 ? 14 : 12 } : {};
  });
  ws.getColumn(1).width = 140;
}

/**
 * exceljs orders tabs by each worksheet's `orderNo` (workbook.js, `get worksheets`), which
 * its typings leave out. A new tab gets the next number, so copying the old tab's number is
 * what keeps a replaced tab in its place.
 */
type Ordered = ExcelJS.Worksheet & { orderNo: number };

/** Replace a tab in place, keeping its position among the others. */
function replaceTab(wb: ExcelJS.Workbook, name: string, oldNames: string[] = []): ExcelJS.Worksheet {
  const old = [name, ...oldNames].map((n) => wb.getWorksheet(n)).find(Boolean) as Ordered | undefined;
  const orderNo = old?.orderNo;
  if (old) wb.removeWorksheet(old.id);
  const ws = wb.addWorksheet(name) as Ordered;
  if (orderNo !== undefined) ws.orderNo = orderNo;
  return ws;
}

async function writeWorkbook(ladders: Record<string, SheetLadder<object>>) {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK);
  buildHowTo(replaceTab(wb, 'How to use'));
  for (const sheet of GAME_SHEETS) {
    const ws = replaceTab(wb, sheet.tab, OLD_TAB_NAMES[sheet.tab]);
    buildTab(ws, sheet as GameSheet<object>, ladders[sheet.gameId]);
  }
  try {
    await wb.xlsx.writeFile(WORKBOOK);
  } catch (e) {
    if ((e as NodeJS.ErrnoException).code === 'EBUSY') fail(`${WORKBOOK} is open in another program. Close it and run again.`);
    throw e;
  }
}

// ─── Import ───────────────────────────────────────────────────────────────────

/** A cell's plain value: formulas give their result, rich text its text. */
function plain(v: ExcelJS.CellValue): Cell {
  if (v === null || v === undefined) return null;
  if (typeof v === 'number' || typeof v === 'string' || typeof v === 'boolean') return v;
  if (v instanceof Date) return v.toISOString();
  if (typeof v === 'object' && 'result' in v) return plain(v.result as ExcelJS.CellValue);
  if (typeof v === 'object' && 'richText' in v) return v.richText.map((t) => t.text).join('');
  if (typeof v === 'object' && 'text' in v) return String(v.text);
  return String(v);
}

function readTab<T extends object>(wb: ExcelJS.Workbook, sheet: GameSheet<T>, problems: string[]): SheetRow[] | null {
  const ws = wb.getWorksheet(sheet.tab);
  if (!ws) {
    problems.push(`No "${sheet.tab}" tab. Run npm run ladders:export to rebuild the sheet.`);
    return null;
  }
  let headerRow = 0;
  ws.eachRow((row, n) => {
    if (!headerRow && plain(row.getCell(1).value) === 'Level' && plain(row.getCell(2).value) === 'Source') headerRow = n;
  });
  if (!headerRow) {
    problems.push(`${sheet.tab}: no Level / Source header row. Run npm run ladders:export to rebuild the tab.`);
    return null;
  }
  const at: Record<string, number> = {};
  ws.getRow(headerRow).eachCell((cell, col) => { at[String(plain(cell.value))] = col; });
  const missing = sheet.columns.map((c) => c.header).filter((h) => !at[h]);
  if (missing.length) {
    problems.push(`${sheet.tab}: missing columns ${missing.join(', ')}. The tab has an old layout; run npm run ladders:export.`);
    return null;
  }

  const rows: SheetRow[] = [];
  for (let n = headerRow + 1; n <= ws.rowCount; n++) {
    const row = ws.getRow(n);
    const level = plain(row.getCell(1).value);
    if (typeof level !== 'number') break;
    const cells: Cells = {};
    for (const c of sheet.columns) cells[c.header] = plain(row.getCell(at[c.header]).value);
    rows.push({ level, source: plain(row.getCell(2).value), cells, note: at.Notes ? plain(row.getCell(at.Notes).value) : null });
  }
  return rows;
}

async function importSheet() {
  const wb = new ExcelJS.Workbook();
  await wb.xlsx.readFile(WORKBOOK);
  const problems: string[] = [];
  const ladders: Record<string, SheetLadder<object>> = {};
  for (const sheet of GAME_SHEETS) {
    const rows = readTab(wb, sheet as GameSheet<object>, problems);
    if (!rows) continue;
    try {
      ladders[sheet.gameId] = rowsToAnchors(sheet as GameSheet<object>, rows, CURRENT[sheet.gameId]);
    } catch (e) {
      if (!(e instanceof SheetError)) throw e;
      problems.push(...e.problems);
    }
  }
  if (problems.length) fail(`Nothing imported. Fix these in the sheet:\n- ${problems.join('\n- ')}`);

  const before = readFileSync(GENERATED_PATH, 'utf8');
  const after = renderGenerated(ladders);
  if (before === after) {
    console.log('The sheet matches the app. Nothing to import.');
    return;
  }
  writeFileSync(GENERATED_PATH, after);
  for (const sheet of GAME_SHEETS) {
    const was = CURRENT[sheet.gameId];
    const now = ladders[sheet.gameId];
    if (renderGenerated({ ...ladders, [sheet.gameId]: was }) === after) continue;
    console.log(`${sheet.tab}: ${now.length} levels, anchors at ${now.anchors.map((a) => a.level).join(', ')}`);
  }

  // The rules live in the tests. A level that breaks one is named there.
  console.log('\nChecking every level against the ladder rules...');
  const test = spawnSync('npx', ['vitest', 'run', 'src/lib/ladders', 'src/lib/contentGenerators'], { stdio: 'inherit', shell: true });
  if (test.status !== 0) {
    fail(`${GENERATED_PATH} was written, but some levels break a rule (above). `
      + 'Fix them in the sheet and import again, or git checkout the file to undo.');
  }

  // Refresh the filled rows, so the next import judges hand edits against these anchors.
  await writeWorkbook(ladders);
  console.log(`\nImported. ${GENERATED_PATH} and the sheet's filled rows are updated. Bump LADDER_VERSION in src/lib/ladders/index.ts.`);
}

function fail(message: string): never {
  console.error(message);
  process.exit(1);
}

const command = process.argv[2];
if (command === 'export') {
  await writeWorkbook(CURRENT);
  console.log(`${WORKBOOK}: rebuilt How to use, ${GAME_SHEETS.map((s) => s.tab).join(', ')}.`);
} else if (command === 'import') {
  await importSheet();
} else {
  fail('Usage: tsx scripts/ladders-sheet.ts import | export');
}
