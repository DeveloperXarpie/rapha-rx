# Redesign v2 Plan 3a: Difficulty Ladders Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date**: 2026-11-18
**Content Type**: Implementation plan

**Goal:** Replace the continuous 0-1 difficulty score with a numbered level ladder for Shopping List, Spot Focus and Tiffin Time.
Residents start every game at level 1 each day, go up one level on a clear, and go down one level after two fails in a row.

**Architecture:**
- **Ladders are data.** Each game defines a handful of **anchor levels** (taken from DIFFICULTY_RULES' sample levels, as the owner chose on 2026-11-18). A pure `fillLadder` fills the levels in between, by the rules doc's own method (section 1.1: even steps, rounded, anchors never changed).
- **Tests are the guardrails.** Tests check every filled level against each game's hard limits and curation rules.
- **One pure module moves a resident**, `movement.ts`.
- **Storage reuses the existing `difficultyState` rows.** They are already per user, game and day, so "restart each day" falls out naturally.
- **The games themselves do not change.** A ladder row has the same shape as the parameters each game reads today, apart from Tiffin, which gains four settings.

**Tech Stack:** React 18 + TypeScript, Dexie, Vitest (node environment, pure modules only).

**Spec:** `docs/redesign-v2/DIFFICULTY_RULES.md` sections 1, 2 (S1-S9, X1-X6), 3.1, 3.3 and 3.5; `docs/redesign-v2/FINAL_SPEC.md` section 10.

**Branch:** `feat/app-flow-redesign`. Commits carry no co-author line.

## Decisions this plan makes

| Topic | Behaviour | Source |
|---|---|---|
| X1 movement | Up one level on a clear. Down one level after 2 fails in a row. A hold or a single fail repeats the level; a hold or a clear resets the fail count. | Owner, 2026-11-18 |
| X2 overnight | Every game starts each day at level 1. | Owner, 2026-11-18 |
| Anchor levels | DIFFICULTY_RULES' sample levels are provisional anchors; `fillLadder` fills the rest. The owner edits later. | Owner, 2026-11-18 |
| X6 level to score | Not decided. The level is stored; plan 4 decides how it feeds scoring. | Owner, 2026-11-18 |
| Games | Shopping List, Spot Focus, Tiffin Time. Station Master waits for art, Free Me comes last, and the other games keep the 0-1 score. | Owner, 2026-11-18 |
| Source of truth | Interim: the anchor tables in `src/lib/ladders/*.ts`. The spreadsheet importer, and regenerating the spreadsheet with today's columns, is plan 3b. | This plan; DIFFICULTY_RULES 1 says the sheet is the source, so 3b restores that |
| Knobs used | Only knobs the games support today, plus four Tiffin constants made into settings (guests per round, patience base and per dish, ready window). Seats, counter size, mixed Spot Focus tiers, and Shopping List crates and closeness need layout or art work, so they go to 3b. | DIFFICULTY_RULES 5 |
| Tiffin guests per round | At least 8: seats stay at 4, and the rules require guests >= 2 x seats. The sample's 6 at level 1 assumed 2 seats. | DIFFICULTY_RULES 3.5 coupled rule |
| Spot Focus tier | One tier per board, as the game supports today. A sample row with mixed tiers uses its majority tier. | Interim until 3b |
| Ladder lengths | Shopping List 20, Spot Focus 24, Tiffin 30, as DIFFICULTY_RULES suggests. With a daily restart most residents will reach only the first several levels. | Owner chose the restart, with this pointed out |
| Debug jumper | For a ladder game, its levels are ladder levels, up to the ladder's length. | Interim |

## Global Constraints

- **Hard limits**, from DIFFICULTY_RULES as amended on 2026-11-18:
  - Shopping List: `listLength` 2-6; `retentionMs` 1000-8000; `hints` 0-1 and below `listLength - 1`.
  - Spot Focus: `gridCols` 3; `gridRows` 3-6; `differenceCount` 1 to floor(0.4 x cells).
  - Tiffin: `maxItemsPerGuest` 1-3; `readyWindowS` 8-20; `guestsPerRound` 8-18; patience never under the `guestPatience` floor (already enforced in the model).
- **Monotonic (S2):** no knob gets easier as the level rises, except `hints`, which may only fall.
- **S8:** every round logs its game, its level, and the ladder version (`LADDER_VERSION = '0.1'`) in `metrics`.
- **Dexie:** the new `difficultyState` fields are not indexed, so no `.version()` bump.
- **Release:** a minor bump to `1.38.0`. Lint must show no new errors against **28 errors, 1 warning**. The two known sessionLedger tests (timer temporarily 30 s) are the only allowed failures.

## Review Focus

1. **A new day mid-visit.** A resident still in a game at midnight continues today's rows. The next `getTodayLevel` (next game open) starts at 1. Test: `levelForToday(undefined)` returns 1 (Task 2).
2. **Two fails then a hold.** The fail count resets, so a later single fail does not drop the level. Test: `nextLevel` sequence fail, fail (down), fail, hold, fail (no drop) (Task 2).
3. **Top and bottom of the ladder.** A clear at the top stays at the top, and a double fail at level 1 stays at 1. Test in Task 2.
4. **A filled level that breaks a rule** (for example Spot Focus's 40% cap on a level between anchors). The guardrail tests fail and name the level, and the fix is an extra anchor, never a silent clamp (DIFFICULTY_RULES 1.1 step 3). Tests in Task 3.
5. **Debug and second-trip rounds.** They never move the ladder. Test: `shouldMoveLadder` (Task 2).

---

### Task 1: fillLadder

**Files:** Create `src/lib/ladders/fill.ts` and `src/lib/ladders/__tests__/fill.test.ts`.

**Interfaces:**
- `type FieldSpec = { kind: 'step'; step: number } | { kind: 'switch' }`
  - `step` rounds a linear interpolation to the nearest multiple of `step`.
  - `switch` holds the earlier anchor's value until the next anchor's level. This is for booleans and tiers, which change at one level, never halfway.
- `fillLadder<T extends Record<string, unknown>>(anchors: { level: number; values: T }[], length: number, spec: { [K in keyof T]: FieldSpec }): T[]`
  - Returns `length` rows; index 0 is level 1.
  - Throws if the anchors do not include level 1 and level `length`.
  - Anchor rows are returned unchanged.
  - Fields whose values are objects (Tiffin's `guestMix`) interpolate each numeric member with the same spec.

- [ ] **Step 1: Failing tests.**
  - Anchors `{1: {n: 3, on: false}, 5: {n: 5, on: true}}`, with `n: step 1` and `on: switch`, give n `[3, 4, 4, 5, 5]`. Use the rounding rule `Math.round` (3.5 rounds to 4, 4.5 to 5). The `on` values are `[false, false, false, false, true]`.
  - Anchors are untouched.
  - It throws without a level-1 anchor.
  - A `step: 500` field between 1500 and 2500 over 3 levels gives `[1500, 2000, 2500]`.
- [ ] **Step 2: FAIL. Step 3: implement. Step 4: PASS.**

### Task 2: Movement, daily restart, storage

**Files:** Create `src/lib/ladders/movement.ts` and its test. Modify `src/lib/db.ts` (`DifficultyState` gains `level?: number; failStreak?: number`). Create `src/lib/ladders/store.ts` (Dexie glue; not unit-tested).

**Interfaces (movement.ts, pure):**
- `nextLevel(s: { level: number; failStreak: number }, outcome: RoundOutcome, maxLevel: number): { level: number; failStreak: number }`
- `levelForToday(todayRow: { level?: number; failStreak?: number } | undefined): { level: number; failStreak: number }`: today's row if it exists, else `{ level: 1, failStreak: 0 }` (X2).
- `shouldMoveLadder(args: { debug: boolean; secondTrip: boolean }): boolean`

**Interfaces (store.ts):**
- `getTodayLevel(userId: string, gameId: string): Promise<number>`: reads or creates today's row via `levelForToday`.
- `advanceLadder(userId: string, gameId: string, outcome: RoundOutcome, maxLevel: number): Promise<number>`: applies `nextLevel`, upserts, and returns the new level. Keep `score` and `peakScore` on the row untouched. `roundsPlayed` goes up by 1.

- [ ] **Step 1: Failing tests:**
  - `clear` from 4 gives 5.
  - fail, fail from 4 gives 3 with streak 0.
  - fail, hold, fail from 4 stays 4.
  - `clear` at the max stays at the max.
  - fail, fail at 1 stays 1.
  - `levelForToday(undefined)` is `{1, 0}`.
  - `levelForToday({ level: 7, failStreak: 1 })` keeps both values.
  - `shouldMoveLadder` is false for debug or a second trip.
- [ ] **Steps 2-4: FAIL, implement, PASS.**

### Task 3: The three ladders

**Files:** Create `src/lib/ladders/marketMemory.ts`, `spotFocus.ts`, `serveGuests.ts` and `index.ts`, plus `src/lib/ladders/__tests__/ladders.test.ts`.

**Interfaces:**
- Each game file exports `ANCHORS`, `SPEC` and `LADDER = fillLadder(ANCHORS, length, SPEC)`. Rows use the game's existing param type: `MarketMemoryDynamicParams`, `SpotFocusDynamicParams` and `ServeGuestsDynamicParams`, the last extended in Task 4.
- `index.ts`:
  - `LADDER_VERSION = '0.1'`
  - `LADDER_GAMES = ['market-memory', 'spot-focus', 'serve-guests'] as const`
  - `isLadderGame(gameId: string): boolean`
  - `ladderLength(gameId: string): number`
  - `ladderParams(gameId: string, level: number): unknown`: clamps the level to 1..length.

**Anchors** (DIFFICULTY_RULES sample levels, adapted per the decisions table):

| Shopping List (20) | listLength | retentionMs | similarPackaging | listCategory | hints |
|---|---|---|---|---|---|
| 1 | 3 | 1500 | false | false | 1 |
| 5 | 4 | 2500 | true | false | 1 |
| 10 | 5 | 3000 | true | false | 1 |
| 15 | 5 | 5500 | true | true | 1 |
| 20 | 6 | 6500 | true | true | 0 |

Spec: listLength step 1; retentionMs step 500; the two booleans switch; hints switch.
`delayedRetrieval` is false on every row (the game never reads it).

| Spot Focus (24) | gridCols | gridRows | differenceCount | changeSubtlety |
|---|---|---|---|---|
| 1 | 3 | 3 | 1 | bold |
| 6 | 3 | 3 | 3 | medium |
| 12 | 3 | 4 | 4 | medium |
| 18 | 3 | 5 | 5 | subtle |
| 24 | 3 | 6 | 7 | subtle |

Spec: gridCols and gridRows switch, so the board grows at an anchor and never mid-band. differenceCount step 1. changeSubtlety switch.

| Tiffin (30) | maxItemsPerGuest | guestsPerRound | patienceBaseS | patiencePerItemS | readyWindowS | guestMix (I/P) |
|---|---|---|---|---|---|---|
| 1 | 1 | 8 | 40 | 10 | 16 | 0 / 0 |
| 8 | 2 | 8 | 34 | 9 | 14 | 0 / 0 |
| 15 | 2 | 8 | 30 | 9 | 12 | 0.2 / 0.2 |
| 23 | 3 | 10 | 26 | 9 | 11 | 0.3 / 0.3 |
| 30 | 3 | 12 | 22 | 8 | 9 | 0.4 / 0.3 |

Spec: maxItemsPerGuest switch; guestsPerRound step 1; patience step 1; readyWindowS step 1; guestMix step 0.05.

- [ ] **Step 1: Guardrail tests**, one `it` per rule per game, each naming the failing level:
  - Every row is within the hard limits.
  - Monotonic (hints and every patience or window value never easier as the level rises).
  - Spot Focus `differenceCount <= floor(0.4 * gridRows * gridCols)`.
  - Shopping List `hints < listLength - 1`.
  - Tiffin `guestsPerRound >= 8`.
  - The ladder lengths are 20, 24 and 30.
  - Anchors appear verbatim.
- [ ] **Step 2: Run.** A rule broken between anchors gets an added anchor in the data, never a clamp in `fillLadder`. Ledger each added anchor.
- [ ] **Step 3: PASS.**

### Task 4: Tiffin settings from the ladder

**Files:** Modify `src/games/executive/ServeTheGuests/model.ts` and `index.tsx`, `src/lib/dynamicDifficulty.ts` (`ServeGuestsDynamicParams` gains `guestsPerRound`, `patienceBaseS`, `patiencePerItemS` and `readyWindowS`, with today's constants as the defaults from `getServeGuestsParams`), and the model tests.

**Interfaces:**
- `RoundConfig = { totalGuests: number; readyWindow: number; patienceBase: number; patiencePerItem: number }`; `DEFAULT_CONFIG` holds today's constants (8, 11, 26, 9).
- `createInitialState(rng, config = DEFAULT_CONFIG)` stores `config` on the state.
- `tick`, `makeGuest`, `spoilProgress` and the `done` check read `state.config`, not the constants. The view's guests-left counter reads `state.config.totalGuests`.

- [ ] **Step 1: Failing tests:**
  - With `totalGuests: 2` the round is `done` after two guests leave.
  - With `readyWindow: 5` a ready dish burns at 5 s.
  - A guest's patience uses `config.patienceBase` and `patiencePerItem`, through `guestPatience`.
- [ ] **Steps 2-4: FAIL, implement, PASS.** Run the existing model tests too.

### Task 5: Wire the ladder into the game flow

**Files:** Modify `src/screens/GameRouter.tsx`, `src/components/GameShell.tsx`, `src/lib/debugLevels.ts` and `src/screens/dev/DebugLevels.tsx`.

**Behaviour:**
- **GameRouter, for a ladder game:**
  - Holds `level`, from `getTodayLevel`, or the debug level clamped to `ladderLength`.
  - Builds `levelConfig.params` and generated content from `ladderParams(gameId, level)`, not from `get*Params(score)`.
  - Passes `level` to `GameShell`.
  - `handleLevelComplete` reads `result.newLevel`.
  - Other games are unchanged.
- **GameShell, for a ladder game:**
  - The plate reads `Level ${level}`.
  - `handleLevelComplete` calls `advanceLadder(...)` when `shouldMoveLadder(...)`, in place of `adjustDifficulty`, and returns `newLevel`.
  - `recordLastLevel(userId, gameId, newLevel)`.
  - `metrics` gains `ladderLevel` and `ladderVersion` (S8).
- **Debug jumper:** `parseDebugLevel` accepts up to 30. The router clamps per game: ladder games to `ladderLength`, others to 10. The picker offers 1..`ladderLength` for ladder games.

- [ ] **Step 1: Failing test** in `debugLevels.test.ts`: `parseDebugLevel('24')` returns 24, and `'31'` returns null.
- [ ] **Steps 2-4: FAIL, implement, PASS**, then `npx tsc -b`.

### Task 6: Docs, version, gates, commit

- [ ] **Docs.**
  - CLAUDE.md "Dynamic difficulty": a paragraph on ladders for the three games, with the restart, X1, and where the anchors live.
  - DIFFICULTY_RULES 2.1: mark X1 and X2 as decided.
  - FINAL_SPEC 10.1: ladders live for three games.
  - README status line.
  - `package.json` to `1.38.0`.
- [ ] **Gates.**
  - `npm test`: everything passes except the 2 known tests.
  - `npm run build`: PASS.
  - `npm run lint`: at most 28 errors.
- [ ] **Commit** (no co-author line): `feat(v2): numbered difficulty ladders for Shopping List, Spot Focus and Tiffin`.
- [ ] **Smoke test** (the user runs it):
  - Each game starts at Level 1.
  - A clear goes up one level; two fails go down one.
  - The plate shows the level.
  - The debug jumper reaches level 24 of Spot Focus (a 3x6 board fits a phone) and level 30 of Tiffin (12 guests, 9 s ready window).
  - Train Yard is unchanged.
