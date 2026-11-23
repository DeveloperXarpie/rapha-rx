# Redesign v2 Plan 3b (part 2): Ladder Spreadsheet Importer

**Date**: 2026-11-23
**Content Type**: Implementation plan

**Goal:** Make `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx` the source of the ladder anchor levels again, as DIFFICULTY_RULES section 1 says.
- The owner edits the sheet.
- `npm run ladders:import` turns it into a typed data file the app reads.
- `npm run ladders:export` rebuilds the sheet's three ladder tabs from the app, using today's columns.

**Why the export too:** the sheet's columns date from 2026-11-11 and no longer match the games.
- Spot Focus has a time cap and four columns; it now has a give-up button and three columns.
- Tiffin has `patienceSpread`; it now has guest types.

An owner filling the old columns would be typing values the app cannot use.

**Branch:** `feat/app-flow-redesign`. Commits carry no co-author line. These are my calls; the user asked for the importer without further questions (2026-11-23).

## Decisions

| Topic | Behaviour |
|---|---|
| Tools | Two dev dependencies, run only on a developer's machine: `exceljs` reads and writes the workbook, and `tsx` runs the TypeScript script so it can reuse the ladder code. |
| Data file | `src/lib/ladders/anchors.generated.ts`, written only by the importer. It holds each ladder's length and anchor rows (level, source, values, note). The ladder modules read it; `fillLadder` and the guardrail tests are unchanged. |
| Which rows are anchors | Rows whose Source is `owner` (set by the owner) or `claude` (set by Claude, e.g. the samples or an extra anchor). `filled` rows are what `fillLadder` computes; the export writes them so the sheet reads as a full ladder, and the import ignores them. |
| Editing a filled row | If a `filled` row no longer matches what the fill computes, the import stops and names the row: its Source must be set to `owner`, or the edit would be silently lost. |
| Ladder length | The highest level row with any value. Level 1 and the last level must be anchors. |
| Columns | Only settings the games read today. Shopping List's crates, closeness, study timer and interference are left out until the game supports them (listed in the tab's notes). Spot Focus has bold, medium and subtle (differences is their sum, shown for reading). Tiffin has Impatient and Patient shares (Middle is the rest). |
| Checks | The importer rejects malformed cells (unknown band, non-number, missing level 1 or last level) and writes nothing. The rules themselves stay in `ladders.test.ts`; the importer runs those tests after writing and reports any rule a level breaks. |
| Formatting in the sheet | The rebuilt tabs keep the guardrail block, the yellow input cells, the Source and band drop-downs, and red (outside min or max) and amber (against the direction) highlighting. The old "Rule issues" formulas are dropped: they checked rules the code no longer has, and the tests are the full check. |
| Other tabs | "How to use" is rewritten for the new Source values. Station Master, Garden Keeper and Free Me are left exactly as they are. |
| Version | `package.json` 1.42.0. `LADDER_VERSION` is unchanged, because no value changes. |

## Tasks (TDD, inline)

1. `src/lib/ladders/sheet.ts`: column definitions per game, plus pure `anchorsToRows` and `rowsToAnchors`. Tests: a round trip returns the anchors; bad cells, missing ends and edited filled rows are reported.
2. Bootstrap `anchors.generated.ts` from today's anchors, so the app's values do not change. The ladder modules read it.
3. `scripts/ladders-sheet.ts` with `export` and `import`, plus the npm scripts.
4. Run the export, then the import. The round trip must leave `anchors.generated.ts` byte-identical. Check that the untouched tabs survive.
5. Docs: update DIFFICULTY_RULES 1.1, the README and CLAUDE.md. Version bump. Lint, test and build.
