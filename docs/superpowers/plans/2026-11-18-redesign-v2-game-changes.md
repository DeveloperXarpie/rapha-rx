# Redesign v2 Plan 2: Game Changes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date**: 2026-11-18
**Content Type**: Implementation plan

**Goal:** Make Shopping List, Spot Focus and Tiffin Time losable with a Replay button (D20). Add the small changes that let each game capture its skills (FINAL_SPEC 7.1a). Remove Tiffin Time's points (D23) and respell its name (D19).

**Architecture:** Each rule that decides something lives in a pure, node-tested module:
- `src/lib/roundOutcome.ts`: clear/fail thresholds, and which games keep their level on a fail.
- `MarketMemory/secondTrip.ts`: the Retention round.
- `SpotFocus/timing.ts`: find timing.
- Tiffin Time's existing pure `model.ts`.

The components only render what those modules decide. A visit (one stay in a game, from the board to leaving it) gets an id and a round counter from `GameRouter`. That is how Shopping List knows its first list and its last round.

**Tech Stack:** React 18 + TypeScript, Vitest (node environment, pure modules only), i18next.

**Spec:** `docs/redesign-v2/FINAL_SPEC.md` D18-D23, sections 7.1, 7.1a and 10.2; `docs/redesign-v2/DIFFICULTY_RULES.md` sections 3.1, 3.3 and 3.5.

**Branch:** `feat/app-flow-redesign`. Commits carry no co-author line.

## Decisions this plan makes

| Topic | Behaviour | Source |
|---|---|---|
| Scope | Shopping List, Spot Focus, Tiffin Time. Station Master waits for art; Free Me comes last. | Owner, 2026-11-18 |
| Where Replay appears | On the game's own round-end card. The button reads Replay instead of its usual label. | Owner, 2026-11-18 |
| Difficulty after a fail | Unchanged for these three games (the next round is the same level). Station Master and Garden Keeper keep today's step-down until plan 3's ladder rule (X1). | Owner, 2026-11-18 |
| Thresholds | Shopping List: fail under 50% recalled. Spot Focus: fail on giving up with under 50% found, or wrong taps over 2x the differences. Tiffin: fail under 60% of dishes served or 3+ walkouts. | Owner accepted, tune later |
| When the second trip runs (C20) | "Last round of the visit". A visit's last round is only known when the visit ends, so it runs when **Memory completes during a Shopping List visit of at least 2 rounds**: the crossing level finishes (D4), the second trip runs, then the score card. A resident who leaves early gets no Retention score for that visit. | Owner chose "last round"; trigger is this plan's reading |
| Second trip scoring | Not graded for clear/fail and never moves difficulty. Metric `retention` = correct picks on the second trip / correct picks on the first round x 100. | FINAL_SPEC 7.1 measure |
| Give-up delay | `GIVE_UP_DELAY_S = 45`, one constant. | DIFFICULTY_RULES 3.3 (min 30, value TBD) |
| Spot Focus wrong-tap fail | Judged at round end, not mid-round. | Interim |
| Guest type cue | An Impatient guest shows a clock badge on the bubble. Middle and Patient show nothing; their patience bars differ. Art can replace this later. | Interim (no art yet) |
| Guest mix by difficulty | score < 0.34: all Middle; < 0.67: 20/60/20 (Impatient/Middle/Patient); otherwise 30/40/30. | DIFFICULTY_RULES 3.5 sample, mapped onto today's 0-1 score until plan 3 |
| Tiffin patience floor | 18 s for one dish, plus 8 s per further dish, overriding the type multiplier. | DIFFICULTY_RULES 3.5 |

## Global Constraints

- Every new player-facing string goes into `public/locales/{en,hi,kn}/common.json`, is under 10 words, and is read with a fallback. Reuse existing keys (`btn.continue`, `btn.tryAgain` exist; check before adding).
- Touch targets at least 80 px. Spot Focus's give-up button uses the kit button height (74 px) of the "I'm Ready" button that used that slot before. Record this as a ruling.
- Boards stay fitted: Spot Focus's fixed-height slots shrink the board, so the slot height is reserved from the start and never jumps.
- Debug rounds (`debug` prop) never move difficulty and never trigger a second trip.
- Release: one minor bump to `1.37.0`. Lint gate is no new errors against **28 errors, 1 warning** (2026-11-18, after plan 1).
- The temporary `CATEGORY_SESSION_SECONDS = 30` stays (owner, 2026-11-18). The two sessionLedger tests that expect 600 are the only failures allowed, and they fail before and after this plan.

## Review Focus

1. **Leaving Shopping List before Memory completes.** No second trip runs, and the next visit starts with a clean first list. Test: `needsSecondTrip` returns false for a visit that never crossed, and `recordFirstRound` keys by visit id (Task 2).
2. **Giving up at the moment the last difference is found.** The round must end once. Test: `spotFocusRoundEnd` decides from the find count, and the component guards on phase (Task 3).
3. **An Impatient guest with a big order on a hard level.** Patience must never drop under the floor. Test: `guestPatience('impatient', 3, base 22, perItem 8)` returns 34, not 32 (Task 4).
4. **A failed round in Station Master or Garden Keeper.** It must still step down; only the three games keep their level. Test: `keepsLevelOnFail` (Task 1).
5. **A second-trip round.** It must not fail, show Replay or move difficulty, and it must complete Memory afterwards. Test: `needsSecondTrip` returns false once the trip ran (Task 2), and GameShell skips `adjustDifficulty` when `metrics.secondTrip` is set (Task 1).

---

### Task 1: Shared round outcome and same level on a fail

**Files:**
- Create: `src/lib/roundOutcome.ts`, `src/lib/__tests__/roundOutcome.test.ts`
- Modify: `src/components/GameShell.tsx` (`handleLevelComplete`)
- Modify: `public/locales/{en,hi,kn}/common.json` (`btn.replay`)

**Interfaces:**
- Produces:
  - `THRESHOLDS = { marketMemoryFailBelow: 0.5, spotFocusGiveUpFailBelow: 0.5, spotFocusWrongTapFactor: 2, serveGuestsFailBelow: 0.6, serveGuestsWalkoutFail: 3 }`
  - `marketMemoryFailed(m: { correct: number; listLength: number }): boolean`
  - `spotFocusFailed(m: { found: number; total: number; falseTaps: number; gaveUp: boolean }): boolean`
  - `serveGuestsFailed(m: { itemsServed: number; itemsRequested: number; walkouts: number }): boolean`
  - `keepsLevelOnFail(gameId: string): boolean`: true only for `market-memory`, `spot-focus`, `serve-guests`.
  - `shouldAdjustDifficulty(args: { gameId: string; completed: boolean; secondTrip: boolean }): boolean`

- [ ] **Step 1: Failing tests**

```ts
it('fails Shopping List under half recalled', () => {
  expect(marketMemoryFailed({ correct: 1, listLength: 3 })).toBe(true);
  expect(marketMemoryFailed({ correct: 2, listLength: 4 })).toBe(false);
});
it('fails Spot Focus on an early give-up or too many wrong taps', () => {
  expect(spotFocusFailed({ found: 1, total: 4, falseTaps: 0, gaveUp: true })).toBe(true);
  expect(spotFocusFailed({ found: 2, total: 4, falseTaps: 0, gaveUp: true })).toBe(false);
  expect(spotFocusFailed({ found: 4, total: 4, falseTaps: 9, gaveUp: false })).toBe(true);
  expect(spotFocusFailed({ found: 4, total: 4, falseTaps: 8, gaveUp: false })).toBe(false);
});
it('fails Tiffin under 60% served or at three walkouts', () => {
  expect(serveGuestsFailed({ itemsServed: 5, itemsRequested: 10, walkouts: 0 })).toBe(true);
  expect(serveGuestsFailed({ itemsServed: 6, itemsRequested: 10, walkouts: 2 })).toBe(false);
  expect(serveGuestsFailed({ itemsServed: 10, itemsRequested: 10, walkouts: 3 })).toBe(true);
});
it('keeps the level on a fail only for the plan-2 games', () => {
  expect(shouldAdjustDifficulty({ gameId: 'spot-focus', completed: false, secondTrip: false })).toBe(false);
  expect(shouldAdjustDifficulty({ gameId: 'train-yard', completed: false, secondTrip: false })).toBe(true);
  expect(shouldAdjustDifficulty({ gameId: 'spot-focus', completed: true, secondTrip: false })).toBe(true);
  expect(shouldAdjustDifficulty({ gameId: 'market-memory', completed: true, secondTrip: true })).toBe(false);
});
it('treats a zero-item Tiffin round as not failed', () =>
  expect(serveGuestsFailed({ itemsServed: 0, itemsRequested: 0, walkouts: 0 })).toBe(false));
```

- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/lib/__tests__/roundOutcome.test.ts`).
- [ ] **Step 3: Implement `roundOutcome.ts`.** In `GameShell.handleLevelComplete`, call `adjustDifficulty` only when `shouldAdjustDifficulty({ gameId, completed: result.completed, secondTrip: result.metrics.secondTrip === true })` holds, alongside the existing picture-postcard and debug exemptions.
- [ ] **Step 4: Run, expect PASS.**
- [ ] **Step 5: Copy.** `btn.replay`: en "Replay", hi "फिर से खेलें", kn "ಮತ್ತೆ ಆಡಿ".

---

### Task 2: Shopping List: losable, one hint, half score when hinted, second trip

**Files:**
- Create: `src/games/memory/MarketMemory/secondTrip.ts`, `src/games/memory/MarketMemory/__tests__/secondTrip.test.ts`
- Create: `src/games/memory/MarketMemory/performance.ts`, with tests in the same `__tests__` folder
- Modify: `src/games/memory/MarketMemory/round.ts` (split crate filling out of `buildRound`)
- Modify: `src/games/memory/MarketMemory/index.tsx`, `ResultCard.tsx` (label only)
- Modify: `src/lib/dynamicDifficulty.ts` (`hints: 1`), `src/lib/__tests__/marketMemoryParams.test.ts`
- Modify: `src/screens/GameRouter.tsx` (visit id and round counter), `src/components/GameShell.tsx` (second-trip hook in `finishLevel`; the market-memory branch of `computePerformanceRatio` delegates to `marketMemoryPerformance`)
- Modify: locales (`mm.secondTrip`)

**Interfaces:**
- `GameRouter` keeps `visitId` (`useState(() => crypto.randomUUID())`, so it is new each time the router mounts) and `roundInVisit` (starts at 0, +1 in `handleLevelComplete`). It passes `visit={{ id: visitId, round: roundInVisit }}` to both `GameShell` and the game component. Both props are optional (`visit?: { id: string; round: number }`), so the other 13 games ignore them.
- `round.ts`: `fillCrates(list: string[], p: BuildRoundParams, rng): string[]`. `buildRound` keeps its signature and calls it. Add `buildRoundForList(list: string[], p: BuildRoundParams, rng): Round`.
- `secondTrip.ts`, module-level state: a Map keyed by visit id. It survives remounts and is lost on reload, which is accepted: a reload gives no Retention score.
  - `recordFirstRound(visitId: string, list: string[], correct: number): void`: the first record per visit wins.
  - `firstRound(visitId: string): { list: string[]; correct: number } | undefined`
  - `needsSecondTrip(args: { visitId: string; round: number; secondTripDone: boolean }): boolean`: true when `round >= 1`, `firstRound` exists and `!secondTripDone`.
  - `requestSecondTrip(visitId)`, `isSecondTripPending(visitId)`, `markSecondTripDone(visitId)`
  - `retentionScore(secondCorrect: number, firstCorrect: number): number | null`: `null` when `firstCorrect === 0`, else `round(secondCorrect / firstCorrect * 100)`.
- `performance.ts`: `marketMemoryPerformance(m: { correct: number; listLength: number; wrong: number; hintsUsed: number }): number`. Keep today's formula, `correct/listLength - wrong*0.15`, clamped to 0..1, then halve it when `hintsUsed > 0` (owner: a hinted round scores half). This replaces today's `-0.05` per hint.

- [ ] **Step 1: Failing tests.**
  - `retentionScore(2, 4) === 50`; `retentionScore(1, 0) === null`.
  - `needsSecondTrip` is false at round 0, false without a recorded first round, false once done, and true at round 2 with a record.
  - `recordFirstRound` ignores a second call for the same visit.
  - `buildRoundForList(['tomato', ...], ...)` contains every list id among exactly 16 crates.
  - `marketMemoryPerformance({ correct: 3, listLength: 3, wrong: 0, hintsUsed: 1 }) === 0.5`.
  - Update `marketMemoryParams.test.ts`: hints is 1 at every score.

  Use real item ids from `items.ts`.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement the pure modules**, then wire them:
  - **Round 0:** at `commit`, `recordFirstRound(visit.id, round.list, score.correct.length)`.
  - **Failing:** `completed = !marketMemoryFailed(...)`. ResultCard's button label is `btn.replay` when failed, else `mm.next`.
  - **Second trip:** a game mounted with `isSecondTripPending(visit.id)`:
    - Starts in `shopping` with `buildRoundForList(firstRound.list, params)`.
    - Shows the banner `mm.secondTrip` instead of the list. Hint is disabled.
    - On DONE: `markSecondTripDone`, then commits with `completed: true` and metrics `{ ...usual, secondTrip: true, retention, firstCorrect }`.
  - **GameShell `finishLevel`:** when the category threshold is crossed, `gameId === 'market-memory'`, `!debug`, `!metrics.secondTrip` and `needsSecondTrip({ visitId, round, secondTripDone: false })`, then `requestSecondTrip(visit.id)` and call `onLevelComplete(result)` instead of completing. The next level end (the trip) then crosses again with `secondTrip` set and completes Memory as usual.
- [ ] **Step 4: Run, expect PASS.** Then `npx tsc -b`.
- [ ] **Step 5: Copy.** `mm.secondTrip`: en "Pick what was on your first list.", hi "अपनी पहली सूची की चीज़ें चुनें।", kn "ನಿಮ್ಮ ಮೊದಲ ಪಟ್ಟಿಯ ವಸ್ತುಗಳನ್ನು ಆರಿಸಿ."

---

### Task 3: Spot Focus: give-up button, find timing, losable

**Files:**
- Create: `src/games/attention/SpotFocus/timing.ts`, `src/games/attention/SpotFocus/__tests__/timing.test.ts`
- Modify: `src/games/attention/SpotFocus/index.tsx`, `Card.tsx` and `Grid.tsx` (a `revealed` state)
- Modify: `src/components/GameShell.tsx` (the spot-focus branch of `computePerformanceRatio` delegates to `spotFocusPerformance`)
- Modify: locales (`spot-focus.giveUp`, `spot-focus.completion.partial`)

**Interfaces:**
- `timing.ts`:
  - `GIVE_UP_DELAY_S = 45`
  - `medianFindGapMs(findTimesMs: number[]): number | null`: the gaps are `t0 - 0`, `t1 - t0`, ...; median of those; `null` when empty.
  - `spotFocusPerformance(m: { found: number; total: number; falseTaps: number }): number` = clamp(found/total - falseTaps*0.15, 0, 1). Today's formula ignored partial finds, which only became possible with give-up.
- Metrics gain `findTimesMs: number[]` (ms from board mount) and `gaveUp: boolean`.

- [ ] **Step 1: Failing tests.**
  - `medianFindGapMs([1000, 3000, 4000])` returns 1000 (gaps 1000, 2000, 1000).
  - `medianFindGapMs([])` is `null`.
  - `medianFindGapMs([2000, 5000])` returns 2500 (even count averages the middle two).
  - `spotFocusPerformance({ found: 2, total: 4, falseTaps: 0 })` is 0.5.
- [ ] **Step 2: Run, expect FAIL.**
- [ ] **Step 3: Implement and wire.**
  - Stamp each find into a ref at tap time.
  - After `GIVE_UP_DELAY_S` of board time, show `spot-focus.giveUp` ("I can't find it") as a kit button in the progress slot. The slot is 74 px from mount, so the board does not jump.
  - Give-up: set `gaveUp`, reveal the unfound differences with a distinct style (outline, no check mark), wait 1.5 s, then go to the completion card.
  - Both paths to completion go through one guarded function, so a find and a give-up in the same moment end the round once.
  - Completion heading: the existing key when all were found, else `spot-focus.completion.partial`.
  - `completed = !spotFocusFailed(...)`. The button label is `btn.replay` when failed.
- [ ] **Step 4: Run, expect PASS**, then `npx tsc -b`.
- [ ] **Step 5: Copy.**
  - `spot-focus.giveUp`: en "I can't find it", hi "मुझे नहीं मिल रहा", kn "ನನಗೆ ಸಿಗುತ್ತಿಲ್ಲ".
  - `spot-focus.completion.partial`: en "You found {{found}} of {{total}}.", hi "आपने {{total}} में से {{found}} ढूँढे।", kn "ನೀವು {{total}} ರಲ್ಲಿ {{found}} ಕಂಡುಹಿಡಿದಿರಿ."

---

### Task 4: Tiffin Time: no points, guest types, numbered dishes, decision logging, losable

**Files:**
- Modify: `src/games/executive/ServeTheGuests/model.ts`, `index.tsx`
- Create: `src/games/executive/ServeTheGuests/__tests__/model.test.ts`
- Modify: `src/lib/dynamicDifficulty.ts` (`getServeGuestsParams` gains `guestMix`)
- Modify: `public/locales/en/common.json` ("Tiffin Time"; remove `serveGuests.complete.score` from all three files)

**Interfaces (model.ts):**
- `type GuestType = 'impatient' | 'middle' | 'patient'`; `PATIENCE_MULTIPLIER = { impatient: 0.7, middle: 1, patient: 1.3 }`
- `guestPatience(type: GuestType, items: number, base = PATIENCE_BASE, perItem = PATIENCE_PER_ITEM): number` = max(18 + 8*(items-1), (base + items*perItem) * multiplier)
- `Guest` gains `type: GuestType`, plus `inOrder: boolean` (true until an item is served while an earlier item of that guest is unserved).
- `GameState` loses `score`. It gains `ordersMultiDish`, `ordersInOrder` (counted when a multi-dish guest is fully served), `choiceOpportunities` and `urgentChoices`.
- `tick(state, dt, maxItemsPerGuest, rng, guestMix?)`: `guestMix: { impatient: number; patient: number }` (shares 0..1, the remainder Middle). It defaults to all Middle and is used in `makeGuest`.
- Decision logging in `tapDish`, on idle→cooking:
  - When at least 2 guests are waiting with unserved items, `choiceOpportunities++`.
  - When the cooked dish is an unserved item of the waiting guest with the lowest `left`, also `urgentChoices++`.
- Delete `POINTS_PER_ITEM`, `COMPLETION_BONUS`, `SPEED_BONUS_MAX`, and the `+N` floats. The walkout float stays.

- [ ] **Step 1: Failing tests** (seeded rng):
  - `guestPatience('impatient', 3, 22, 8) === 34` (the floor wins over 32.2).
  - `guestPatience('patient', 1, 26, 9) === 45.5`.
  - Serving a 2-dish guest's second dish first, then the first, gives `ordersMultiDish 1, ordersInOrder 0`. In order gives 1, 1.
  - Cooking the most urgent guest's dish with two guests waiting gives `choiceOpportunities 1, urgentChoices 1`.
  - `'score' in createInitialState(rng)` is false.
- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/games/executive/ServeTheGuests`).
- [ ] **Step 3: Implement model changes**, then `index.tsx`:
  - Remove the score capsule, the float popper's points and the round-end "Score:" line.
  - The bubble numbers dishes 1..n (a small circled number on each dish image) when the order has 2 or more.
  - An Impatient guest's bubble shows a clock badge.
  - Pass `guestMix` from params.
  - `finish` sends `completed: !serveGuestsFailed(...)` and the new metrics, and drops `score`.
  - The round-end button reads `btn.replay` when failed.
  - `getServeGuestsParams` adds `guestMix` per the decisions table.
- [ ] **Step 4: Run, expect PASS**, then `npx tsc -b`.

---

### Task 5: Docs, version, gates, commit

**Files:** `CLAUDE.md` (a line under Game system about losable rounds and `roundOutcome.ts`), `package.json` (`1.37.0`), `docs/redesign-v2/README.md` (plan 2 status line).

- [ ] **Step 1:** Run `npm test` (expect everything to pass except the two known sessionLedger 600 s tests), `npm run build` (expect PASS) and `npm run lint` (expect at most 28 errors and 1 warning).
- [ ] **Step 2: Commit** (no co-author line):

```bash
git add -A src public/locales CLAUDE.md package.json docs/redesign-v2/README.md docs/superpowers/plans/2026-11-18-redesign-v2-game-changes.md
git commit -m "feat(v2): losable rounds with Replay, second trip, give-up, guest types"
```

- [ ] **Step 3: Smoke test** (the user runs it):
  1. **Shopping List:**
     - Recall under half shows Replay, and the next round is the same level.
     - Only one hint is available.
     - To see the second trip, raise `CATEGORY_SESSION_SECONDS` to about 120 first: at 30 s, round 0 usually crosses on its own, and a round-0 crossing never runs a trip (by design). Then play two quick rounds; at the next level end past the threshold a round with no list runs, then the score card.
  2. **Spot Focus:**
     - After 45 s, "I can't find it" appears.
     - Giving up early reveals the missing differences and shows Replay.
     - The board does not jump.
  3. **Tiffin:**
     - No points anywhere.
     - Multi-dish orders are numbered, and some guests show a clock.
     - Serving under 60% shows Replay.
     - The name reads "Tiffin Time".
  4. Station Master and Garden Keeper behave as before.
  5. No console errors; check phone and tablet widths.
