# Rapha Rx Redesign v2: Dynamic Difficulty Rules

**Status**: Draft for review. Nothing here is approved yet.
**Date**: 2026-11-11
**Companion**: `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx`, the level sheet (one tab per game).
**Parent spec**: `docs/redesign-v2/FINAL_SPEC.md`, workstream D (section 10).

**Sources**

- Six code studies, one per game, run 2026-11-11 against `feat/app-flow-redesign` at v1.35.5.
  The full reports, with every file and line reference, are in `docs/redesign-v2/research/2026-11-11_difficulty-studies.md`.
  File references below are relative to `src/` and come from those studies.
- `docs/2026-10-16_level-capacity-by-game.md`, the earlier capacity analysis.
  The studies corrected it in several places, noted per game.
- `FINAL_SPEC.md` section 7.1, the two skills each game must measure.

Every limit is marked **hard** or **soft**:

- **Hard**: set by code, assets or screen layout.
  Crossing it needs engineering or new art, not a spreadsheet edit.
- **Soft**: design judgement, mostly about what is fair for elderly residents.
  The product owner can move it, ideally after a playtest.

No value in this doc has been play-tested with residents.

## 1. How the ladder works

Today difficulty is a continuous score from 0 to 1 (`lib/dynamicDifficulty.ts`).
Each game turns that score into parameters with straight-line formulas, and the score moves +0.05 x (0.5 + performance) on a completed round and -0.08 on a failed one.
Three games (`market-memory`, `spot-focus`, `serve-guests`) hard-code `completed: true`, so their difficulty can only rise.

The redesign replaces this with a **curated level ladder** per game:

- Each game has a fixed number of numbered levels.
- Every level's parameters are written down in the spreadsheet, not computed.
- A resident has a stored level per game.
  Dynamic difficulty is the rule that moves them up or down the ladder.
- The spreadsheet is the source of truth.
  The code reads it (build step to a typed data file); it does not invent values.

### 1.1 Filling the spreadsheet

1. The product owner fills the levels they care about: at least level 1 and the last level, ideally a few in between ("anchor levels").
2. Claude fills every empty level between two anchors so that each parameter moves evenly, rounded to its step size.
3. Every filled level is then checked against that game's guardrails and curation rules (sections 2 and 3).
   A level that breaks a rule is flagged, not silently adjusted.
4. Anchor levels are never changed by the fill.
   If anchors make a rule impossible to meet (for example, two anchors too far apart for the maximum step size), the gap is flagged for the owner.

## 2. Shared rules (all games)

These apply to every game unless the game's own section overrides them.

| # | Rule |
|---|---|
| S1 | **Guardrails are absolute.** No level may set a parameter outside its hard min and max. Soft limits may be crossed only by an owner decision recorded in the sheet. |
| S2 | **Monotonic.** Moving up one level never makes any parameter easier, except where a game's section allows a "sawtooth" (one knob relaxes on the step another gets harder). |
| S3 | **One axis per step.** Each level changes one primary knob (or one coupled pair the game names). Boolean features switch on one at a time. |
| S4 | **New element, easy settings.** When a level introduces something new (a station, a seat, a tier), every other knob in that step stays at its easiest value for the current band. |
| S5 | **Variety.** Every level can produce at least 4 distinct rounds, and the same round never repeats back to back for a resident. |
| S6 | **Every game can fail.** Each game has an explicit clear rule and fail rule (per-game sections). No game hard-codes `completed: true`. |
| S7 | **Hints and lives must not hide the measure.** Where a hint reveals an answer or lives cut a round short, the game section says how that round is scored. |
| S8 | **Log the level.** Every round logs its game, level number, and the full parameter set it ran with, so a retune can be traced. |
| S9 | **Version the ladder.** The sheet carries a version number. Changing any value bumps it, and every round logs the version (research question 20). |

### 2.1 Shared decisions needed

These affect every game, so they are decided once.

| # | Question | Why it matters |
|---|---|---|
| X1 | **How does a resident move on the ladder?** Proposal: up one level on a clear; down one level after 2 fails in a row; otherwise repeat. | Today's score moves every round. A ladder needs explicit rules. |
| X2 | **What happens to levels overnight?** D2 resets category unlocks daily, but levels could persist, decay, or warm up as today (80% of yesterday's peak). | A visible level that drops overnight conflicts with encouraging feedback. |
| X3 | **Phone or tablet?** Several hard maximums depend on it (Spot Focus columns, Free Me board size, Garden Keeper plant count). | Phone limits are much tighter. |
| X4 | **Hints.** Keep, cap, or remove? If kept, hinted answers count as misses. | Hints contaminate Recall and Problem-solving today. |
| X5 | **Lives.** Keep 3 hearts everywhere, or use them only as feedback without ending the round? | Lives cap error counts and cut rounds short, which distorts Self-control and Sustained attention. |
| X6 | **How does the ladder interact with the scoring proposal?** The proposed skill score uses difficulty d (0-1). With a ladder, d becomes level / max level. | Keeps the scoring formula working (FINAL_SPEC, scoring proposal pending). |

## 3. Per-game rules

Each game has: parameters with guardrails, curation rules, a clear/fail proposal, a suggested ladder size with sample levels, required game changes, and open questions.
Measurement gaps (what the game does not log for its two skills) are in section 4.

---

### 3.1 Shopping List (`market-memory`), Memory

**Skills**: Recall, Retention.
**Suggested ladder**: 20 levels (capacity doc estimate 15-25).

**Corrections to earlier docs**: the code has 16 crates and 62 items, an untimed list (READY ends the study phase) and no lives.
The 2026-08-17 design spec still says 12 crates, 21 items, a list timer and 3 lives.
`delayedRetrieval` is never read by the game; it only adds 2500 ms to `retentionMs`.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `listLength` | items | 3-6 | 2 | 6 | Max **hard (layout)**: the cart tray fits 6 slots (`games/memory/MarketMemory/geometry.ts:320-324`). 7 needs a cart redraw. Min soft. |
| `holdMs` (rename of `retentionMs`) | ms | 1500-6500 | 1000 | 8000 | **Soft**. Under 1 s the cover reads as a flicker; past 8 s it is dead time. Renamed because it is a short hold, unrelated to the Retention skill. |
| `similarPackaging` (twins) | on/off | on from 0.25 | - | - | **Hard rule**: needs `listLength x 2 <= crateCount`. |
| `listCategory` | on/off | on from 0.75 | - | - | **Hard (assets)**: only produce and staples have enough items (`round.ts:14,45-53`). |
| `hints` | count | 2 fixed | 0 | 2 | **Soft**. Each hint shows one remaining item for 3 s. |
| `crateCount` (new) | crates | 16 fixed | `listLength` x (twins ? 2 : 1) | 16 | Max **hard (layout)**: 4x4 grid. Fewer crates needs an art decision for empty compartments. |
| `twinCloseness` (new) | tier 1-3 | none | 1 | 3 | **Soft**. Needs a closeness tag per item. |
| `studyLimitMs` (new) | ms | untimed | 3000 | untimed | **Soft**. Re-adding a study timer is a small change. |
| `interference` (new) | on/off | none | - | - | Medium change: a new phase before shopping. |

#### Curation rules

- Never decreasing: `listLength`, `crateCount`, and each feature once switched on.
  Never increasing: `hints`.
- Max step: `listLength` +1; `holdMs` +500 ms (500 ms granularity); `hints` -1; one feature per step.
- Sawtooth allowed: `holdMs` may drop back to its band minimum on the step where `listLength` rises.
- Feature order: twins, then category, then closeness tier 3, then interference.
- Forbidden: `listLength > 6`; twins on with `listLength x 2 > crateCount`; `hints >= listLength - 1`; closeness tier 3 with category on.

#### Clear and fail (proposal)

- **Clear**: at most one item missed and no wrong picks; for `listLength <= 3`, perfect only.
- **Fail**: Recall under 50%.
- In between: repeat the level.
- Hinted items count as not recalled.
- Retention cannot gate a level, because it is asked once per session after the rounds.

#### Sample levels (proposal)

| Level | listLength | holdMs | Twins | Category | Closeness | Hints | Crates |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 1500 | off | off | - | 1 | 16 |
| 5 | 4 | 2500 | on | off | 1 | 1 | 16 |
| 10 | 5 | 3000 | on | off | 2 | 1 | 16 |
| 15 | 5 | 5500 | on | on | 2 | 1 | 16 |
| 20 | 6 | 6500 | on | on | 2 | 0 | 16 |

Hints are shown as 1 at the low levels so they respect the `hints < listLength - 1` rule.

#### Required game changes

- An end-of-session Retention question does not exist anywhere in the app.
- The list itself is not logged, so there is nothing to ask about later.

#### Open questions

1. Clear threshold: perfect only, or at most one miss?
2. Which list does the Retention question use when several rounds were played (first, last, all)?
3. Is 6 items the permanent cap, or is a cart redraw for 7 wanted?
4. Item names are English only and the pulse twins are told apart by reading. Do the hardest levels wait on translated names?
5. The task is recognition (picking from a shelf), not free recall. Relabel the skill, or add a free-recall step?

---

### 3.2 Station Master (`train-yard`), Memory

**Skills**: Association, Sequence (Sequence deferred, C10).
**Suggested ladder**: 24 levels with two small changes; about 12 with today's knobs only; 30+ needs a fifth colour or the Sequence mechanic.

**Corrections to earlier docs**: only 24 of the "576 rounds" are distinct memory problems; the rest only change lanes.
A station whose train has arrived stays coloured and cannot be tapped again, so the 4th train is always right and the 3rd is a 50/50.
That inflates Association today.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `stationCount` | stations | 4 fixed | 3 | 4 | **Hard (code and assets)**: 4 is hard-coded in several files and only 4 colours have art. 5 needs new art. With 2 the second pick is forced. |
| `signMsPerStation` | ms per station | 2000-750 (from 8000-3000 total) | 750 | 3000 | **Soft**. Below 750 ms per station is too fast to encode. Written per station so adding a station keeps the time fair. |
| `retentionHoldMs` | ms | 1500-4000 | 1000 | 6000 | **Soft**. Under 1 s the blind's lamps flicker; over 6 s is dead time. |
| `revealHomeStations` (new) | on/off | always on | - | - | Small change. Turning it off removes the giveaway above. |
| `similarColours` | on/off | on from 0.6 | - | - | **Hard (assets)**: close warm hues are filters over the same 4 sprites. Perceptual, not memory: see open question 2. |
| `lives` | hearts | 3 fixed | 1 | 3 | Max **hard (layout)**: the HUD always draws 3 hearts. |

Sequence parameters (only if the C10 game change is made): `sequenceLength` (2 to `stationCount`), `arrivalIntervalMs` (1500-4000, soft), `orderEnforced` (on/off).

#### Curation rules

- One knob per step, except `signMs` rises with `stationCount` so time per station stays the same.
- Max step: `signMsPerStation` -125 to -250 ms; `retentionHoldMs` +500 ms; `stationCount` +1; `lives` -1, at most once every 6 levels.
- Feature order: `revealHomeStations` off first, then `orderEnforced` (if built), then `similarColours` last.
- Forbidden: `similarColours` with more than 4 stations; `lives` 1 with `similarColours`; `sequenceLength > stationCount`.
- No repeat of the previous round's station assignment.

#### Clear and fail (proposal)

- **Clear**: first-try Association at least 75% in 2 of the last 3 rounds.
- **Fail**: 2 rounds in a row out of hearts, or Association under 50%.
- Trains never tried in a lost round count as misses.

#### Sample levels (proposal)

| Level | Stations | signMs total | holdMs | revealHome | similarColours | Lives |
|---|---|---|---|---|---|---|
| 1 | 3 | 7500 | 1500 | on | off | 3 |
| 6 | 4 | 9000 | 1500 | on | off | 3 |
| 12 | 4 | 7000 | 2500 | off | off | 3 |
| 18 | 4 | 5000 | 3500 | off | off | 2 |
| 24 | 4 | 4000 | 4000 | off | on | 2 |

#### Required game changes

- Grey stations leak their colour and width (they are the coloured sprite greyed out). A neutral station asset fixes this.
- `GameShell.tsx:447` divides by a hard-coded 4 stations.

#### Open questions

1. Sequence: build arrival-order encoding now, or keep an Association-only ladder while C10 is deferred?
2. Keep `similarColours` as the top knob despite age-related colour-vision decline, or commission more distinct colours?
3. Commission a fifth colour and a neutral station asset?
4. May any level drop to 1 heart?

---

### 3.3 Spot Focus (`spot-focus`), Attention

**Skills**: Selective attention, Response speed.
**Suggested ladder**: about 24 levels. Content is plentiful; the limit is the number of knobs and the screen.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `differenceCount` | count | 2-7 | 1 | 40% of cells | Max **soft but important**: today's top setting is 7 of 12 cells (58%), so random tapping finds targets. |
| `gridCols` | count | 3-4 | 3 | 4 | Max **hard (layout)**. On a phone, 4 columns gives cards about 31 px wide; see X3. |
| `gridRows` | count | 3 fixed | 3 | 4 | **Soft**, small change. The layout already reads rows from the scene. |
| `boldCount` / `mediumCount` / `subtleCount` | per board | one tier per board | 0 | subtle 8 (soft), 15 (hard, assets) | 15 twin families exist, at most one difference per family. Mixing tiers on one board is a small generator change. |
| `timeCapS` (new) | s | no timer | 60 | none | **Soft**. Without it, "% found" is always 100%. |
| `wrongTapLimit` (new) | count | penalty only | 0 | - | **Soft**. Used by the clear rule. |

#### Curation rules

- One knob harder per step. Max step: differences +1; one row or one column; at most 2 differences move up a tier; time cap -15 s.
- Exception: when the grid grows, the subtle count may drop by 1 in that step.
- Coupled: differences at most 40% of cells; time cap at least 15 s per difference.
- Tier order: bold only; medium mixed with bold; all medium; 1 subtle per board; majority subtle; then tighten the time cap.
- Forbidden: subtle with 4 columns on a phone; grid growth and a new tier in the same step; a time cap introduced at the level where subtle first appears.

#### Clear and fail (proposal)

- **Clear**: all differences found within the time cap, with wrong taps no more than `differenceCount`.
- **Fail**: time cap runs out, or wrong taps exceed 2 x `differenceCount`.
- When the cap runs out, the remaining differences are revealed.

#### Sample levels (proposal, tablet)

| Level | Grid | Differences | Bold/Med/Subtle | % of cells | Time cap | Max wrong taps |
|---|---|---|---|---|---|---|
| 1 | 3x3 | 2 | 2/0/0 | 22% | none or 180 s | 2 |
| 6 | 3x3 | 3 | 1/2/0 | 33% | 150 s | 3 |
| 12 | 3x4 | 4 | 0/3/1 | 33% | 120 s | 4 |
| 18 | 4x4 | 5 | 0/2/3 | 31% | 120 s | 5 |
| 24 | 4x4 | 6 | 0/0/6 | 38% | 90 s | 6 |

Levels 18 and 24 break the "no subtle at 4 columns" rule on a phone.

#### Open questions

1. Phone or tablet (X3)?
2. How does a round end without every difference found: time cap, an "I can't find it" button, or both?
3. Response speed as the median gap between finds, starting when the board is shown? (C11 deferred.)
4. Is the Mahjong idea in the capacity doc still alive? It would replace this ladder.
5. Commission more twin pairs to raise the subtle ceiling and reduce repetition?

---

### 3.4 Garden Keeper (`garden-keeper`), Attention

**Skills**: Sustained attention, Self-control.
**Suggested ladder**: 24 levels, interleaving load steps and speed steps; about 13 without raising caps.

**Corrections to earlier docs**:

- **Self-control cannot really be measured today.** The don't-tap items are fixed scenery with no timing, so there are no "leave it alone" trials, only a fixed set of objects.
- **Sustained attention has no last third.** The round ends the moment the target count is reached, roughly 30 s in at level 1.
- **"Wide before fast" is in a comment but not in the code.** All knobs move together.
- **The capacity doc's 35-object ceiling looks too high.** Even 24 may overlap tap areas; needs a device check.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `plantCount` | objects | 12-24 | 8 | 30 | Max **hard (layout)**: 5 columns; past 30, rows overlap. Needs a tap-overlap test. |
| `distractorRatio` | share | 0.25-0.55 | at least 1 wilted + 1 pest | flower pool rule | **Hard**: there must be enough flowers to keep spawning (coupled rules). |
| `spawnIntervalMs` | ms | 3000-1200 | 1000 | 3000 | **Soft**. Max keeps at least 10 targets per third. |
| `thirstWindowMs` | ms | 6000-2800 | 2500 | 6000 | **Soft**. Below 2.5 s it tests motor speed, not attention. |
| `bloomHoldMs` | ms | 11000-6500 | > window | 12000 | **Hard**: must exceed the thirst window. |
| `maxConcurrentThirsty` | targets | 1-3 | 1 | 3 | **Hard (maths)**: above `ceil(window / interval)` it has no effect. |
| `targetCount` | waterings | 8-20 | 8 | 60% of windows | Becomes the clear threshold (see below). |
| `roundDurationMs` | ms | 90000 | 90000 | 90000 | **Fixed** so the thirds are comparable. |
| `lives` | hearts | 3 | 3 | 5 | **Soft**. See X5. |

Possible new knobs (small changes): wilted vs pest split; same-species lures; **pests that appear and leave on a timer** (needed for real Self-control trials); ring colour cue on/off.

#### Curation rules

- One pressure axis per step: alternate load steps (plants, ratio) and speed steps (interval, window).
  Load first; speed steps start from about 30% of the ladder.
- Concurrency goes 1 to 2 only once plants >= 15, and 2 to 3 only once plants >= 21, with no other knob moving in that step.
- Max step: +1 to 2 plants; +0.03 ratio; -150 ms interval; -250 ms window; -500 ms bloom.
- Coupled (hard):
  - `bloomHoldMs > thirstWindowMs`
  - `maxConcurrentThirsty <= ceil(thirstWindowMs / spawnIntervalMs)`
  - flowers >= (`bloomHoldMs` + 2600) / `spawnIntervalMs` + `maxConcurrentThirsty`
  - at least 10 targets presented in each 30 s third, and at least 3 don't-tap events per third once they exist.

#### Clear and fail (proposal)

- The round always runs the full 90 s.
- **Clear**: hearts left and a hit rate (watered / targets shown) of at least 70%.
- **Fail**: hearts gone, or time up below the threshold.

#### Sample levels (proposal)

| Level | Plants | Ratio (wilted/pest) | Interval | Window | Concurrency | Bloom | Target | Lives |
|---|---|---|---|---|---|---|---|---|
| 1 | 12 | 0.25 (2/1) | 3000 | 3000 | 1 | 11000 | 8 | 3 |
| 6 | 15 | 0.33 (3/2) | 3000 | 4500 | 2 | 10000 | 10 | 3 |
| 12 | 18 | 0.40 (4/3) | 2200 | 4400 | 2 | 8800 | 14 | 3 |
| 18 | 21 | 0.48 (5/5) | 1700 | 3400 | 2 | 7500 | 17 | 3 |
| 24 | 24 | 0.55 (7/6) | 1200 | 2800 | 3 | 6500 | 20 | 3 |

Level 1 uses a 3 s window, half of today's 6 s, so each third has enough targets to measure. See open question 5.

#### Open questions

1. Self-control: build pests that appear on a timer (real trials), or redefine it as wrong taps per minute?
2. Drop the early finish so the round always runs 90 s?
3. Keep 3 hearts that end the round, or show heart loss as feedback only (X5)?
4. Hit-rate threshold to clear a level?
5. Level 1: a generous 6 s window, or enough targets per third to measure Sustained attention?

---

### 3.5 Tiffen Time (`serve-guests`), Planning

**Skills**: Sequencing, Decision-making.
**Suggested ladder**: 30 levels. Today's hardest setting sits around level 23; levels beyond need a timing playtest.

**Corrections to earlier docs**: the game, not the player, picks which guest gets a served dish (the least patient one).
Guest patience comes only from order size, so there is no separate urgency signal.
The 2026-08-11 design spec says 8 dishes and 3-6 s cooks; the code has 6 dishes and 3-7.5 s cooks.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `seats` | guests at once | 4 fixed | 2 | 4 | Max **hard (layout)**: at 4 the guests already touch. Min soft: 1 seat makes Decision-making unmeasurable. |
| `counterSize` | dishes on counter | 6 fixed | `maxItems` + 1 | 6 | Max **hard (layout)**: a third row of cards does not fit. |
| `minItems` / `maxItems` | dishes per order | 1 / 1-3 | 1 | 3 | **Soft** (design rule). 4 might fit as a 2x2 bubble; unchecked. |
| `guestsPerRound` | guests | 8 fixed | 2 x `seats` | 12 | **Soft (timing)**: more guests make longer rounds. |
| `patienceBaseS` / `patiencePerItemS` | s | 26 / 9 | longest cook + 2 taps per item | 45 / 12 | **Soft**. Too low turns it into a speed test. Needs research input. |
| `patienceSpread` (new) | +/- share | 0 | 0 | 0.3 | **Soft**. Gives urgency independent of order size; needed for Decision-making. |
| `readyWindowS` | s | 11 | 8 (hard floor: > 3) | 20 | **Hard** floor from the spoil ramp. |
| `cookBand` (new) | which dishes | all 22 | - | - | short (<= 4.5 s), all, long-weighted. Each band needs at least `counterSize` dishes. |
| `respawnGapS` | s | 0.9-2.3 | 0.9 | 5 | **Soft**. |
| `orderSteps` (new) | steps | none | - | - | No mechanic exists. See open question 1. |

#### Curation rules

- One axis per step. Max step: seats +1; counter +1; maxItems +1; patience -3 s base or -2 s per item; ready window -1 s; guests +1.
- Coupled: `counterSize >= maxItems + 1`; patience floor at least the longest cook plus 2 taps per item; moving to a longer cook band raises patience by the same amount; `guestsPerRound >= 2 x seats`.
- Feature order: seats 2 > 3 > 4; counter 3 > 6; items 1 > 2 > 3; cook bands; patience spread; then shorter patience and ready window. Sequencing steps last, once they exist.
- Forbidden: 1 seat at any scored level; `readyWindowS <= 3`; max items, minimum patience and long cooks all together without a playtest.

#### Clear and fail (proposal)

- **Clear**: at least 80% of dishes served and at most 1 guest walks out.
- **Fail**: under 60% served, or 3 or more walkouts.

#### Sample levels (proposal)

| Parameter | L1 | L8 | L15 | L23 | L30 |
|---|---|---|---|---|---|
| seats | 2 | 3 | 4 | 4 | 4 |
| counterSize | 3 | 4 | 5 | 6 | 6 |
| items (min-max) | 1-1 | 1-2 | 1-2 | 1-3 | 2-3 |
| guestsPerRound | 6 | 8 | 8 | 10 | 12 |
| patience base / per item (s) | 40 / 10 | 34 / 9 | 30 / 9 | 26 / 9 | 22 / 8 |
| patienceSpread | 0.15 | 0.15 | 0.2 | 0.25 | 0.3 |
| readyWindowS | 16 | 14 | 12 | 11 | 9 |
| cookBand | short | short + mid | all | all | long-weighted |
| respawnGapS | 2.5-4 | 1.5-3 | 1.2-2.6 | 0.9-2.3 | 0.9-2.3 |

#### Open questions

1. **Sequencing**: no mechanic trains it. Add multi-step dishes or a required serving order, or drop the skill for this game?
2. Should the player choose which guest to serve? Otherwise Decision-making is measured by which dish they cook first.
3. Clear rule: what % served and how many walkouts?
4. What is the shortest patience we may ever ask of a resident?
5. On-screen points: keep, remove, or replace with the level number? The speed bonus rewards motor speed, not planning.
6. Spelling: "Tiffen" or "Tiffin"?

---

### 3.6 Free Me (`clear-the-way`), Planning

**Skills**: Planning, Problem-solving.
**Suggested ladder**: 30 levels (optimal moves 2-16, about two levels per value).

Puzzles are hand-made content, so the "parameters" are descriptors a level selects puzzles by.
The study ran the game's own solver over all 10 shipped puzzles; figures marked "measured" come from that run.

#### Descriptors

| Descriptor | Unit | Today (10 puzzles) | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `boardSize` | cells per side | 4-6 | 4 | 6 | Max **hard (layout)**: 6x6 is the largest that fits a 360 px phone. |
| `minMoves` (optimal) | slides | 2-13 | 2 | 16 | **Soft**. Nothing above 13 exists; whether 14-16 can be generated is unverified. |
| `obstacles` | pieces | 4-11 (measured) | 1 | ~12 | Min **hard**: a puzzle needs at least one move. |
| `density` | share of cells | 0.44-0.75 (measured) | ~0.4 | ~0.8 | **Soft**. |
| `pieceLength` | cells | 1-3 | 1 | 3 | **Hard (code and art)**. |
| `singleCellPieces` | count | 0-3 | 0 | 0 on 6x6, 3 on 4x4 | **Soft, backed by layout**: a 1x1 at 41 px is half the 80 px touch minimum. |
| `mustMove` | pieces | 1-10 (measured) | 1 | = obstacles | Derived; not stored today. |
| `depth` | moves before the fish moves | 1-10 | 1 | `minMoves` - 1 | Stored and solver-checked. |
| `exitSide` | side | right only | - | 4 sides | Model supports all four; others unverified visually. |
| `hintUnlockRatio` | x `minMoves` | 2 | - | - | **Soft**. Global today, could be per level. |
| `solverStates` | states | - | - | 200,000 | **Hard (code)**: the live hint solver's budget. |

#### Curation rules

- Assign puzzles to levels by `minMoves`, then `depth`, then `obstacles`.
- Never decreasing: `minMoves`, `boardSize`; `density` and `obstacles` within one board size.
- Max step: `minMoves` +1; board size grows by one only at the start of a new `minMoves` value, and `minMoves` holds (or drops to the band floor) on that step.
- All puzzles in a level share `boardSize` and `minMoves`; their `depth` differs by at most 1.
- Forbidden: any 1x1 on 6x6; fewer than 2 must-move pieces after level 1; a puzzle the solver cannot finish within its budget; non-right exits before the last third of the ladder (if used at all).

#### Clear and fail (proposal)

- **Clear**: solved with no hint and no restart.
- **Fail**: any hint, any restart, or leaving mid-puzzle.
- Planning efficiency (`minMoves / moves used`) is reported but does not gate.

#### Sample levels (proposal)

| Level | Board | minMoves | Obstacles | Must move | Depth | Density | Max 1x1 | Exit |
|---|---|---|---|---|---|---|---|---|
| 1 | 4x4 | 2 | 4 | 1 | 1 | ~0.45 | 3 | right |
| 8 | 5x5 | 4 | 6 | 3 | 3 | ~0.55 | 1 | right |
| 15 | 6x6 | 7 | 8 | 5 | 5-6 | ~0.58 | 0 | right |
| 23 | 6x6 | 10 | 10-11 | 6-7 | 7 | ~0.68 | 0 | right |
| 30 | 6x6 | 15-16 | 11-12 | 8-10 | 8-12 | ~0.75 | 0 | right |

Level 30 has no existing puzzle to anchor it.

#### Required game changes

- **Content**: 10 puzzles exist; a 30-level ladder needs 120 at minimum (4 per level), better 240-300 (8-10 per level) so residents don't memorise solutions.
  An offline generator plus the existing solver can produce them; the design spec already describes the method.
- Planning scores are not comparable across levels: one wasted move scores 67 on a 2-move puzzle and 93 on a 13-move puzzle.
  Compare within a level, or normalise.

#### Open questions

1. Same puzzle for everyone at a given level (best for research), or a random one from the level's pool?
2. Should a restart count as a fail?
3. Add a move ceiling (for example 3x optimal) that ends the round as unsolved?
4. Planning on a restarted round: count moves since the last restart, or all moves?
5. Should the hint unlock ratio stay at 2x, or vary per level?
6. Is it acceptable that the board stops at 6x6 and later difficulty comes only from density and move count?

## 4. Measurement gaps

What each game does not log today that its two skill measures need.
These are engineering tasks for workstream C, listed here because the ladder is useless for research without them.

| Game | Gaps |
|---|---|
| Shopping List | List items not logged; no per-tap timestamps; twin picks not separated from other wrong picks; hinted items not logged; `pickOrder` keeps removed items; no end-of-session Retention question. |
| Station Master | Only totals; no per-dispatch event (colour, station, attempt, time); no arrival or dispatch order; untried trains on a lost round not counted; settings other than `signMs` not logged; train switches not logged. |
| Spot Focus | No per-find timestamps; start point is the mount effect, not first paint; `durationSeconds` includes the completion screen; wrong taps are a bare count; level parameters not logged. |
| Garden Keeper | Only totals and a mean reaction time (D9 needs the median); no per-target or per-false-tap events; no round start for splitting into thirds; taps on not-ready flowers unlogged; no don't-tap trials. |
| Tiffen Time | Cook and serve taps not logged with time or guest patience; wasted cooks silent; no per-guest records; no step log (no steps exist). |
| Free Me | Leaving mid-puzzle unlogged, so Problem-solving reads too high; move count carries across restarts; depth, level and must-move not logged; no record of whether a resident has seen a puzzle before. |

## 5. Summary of game changes the ladders need

Small (parameterise or tweak existing code):

- Make every game able to fail (S6): Shopping List, Spot Focus, Tiffen Time hard-code success.
- Shopping List: rename `retentionMs`, drop `delayedRetrieval`, variable crate count.
- Station Master: 3-station mode, `revealHomeStations` off, no back-to-back repeats.
- Spot Focus: mixed tiers per board, 4th row, time cap.
- Garden Keeper: always run 90 s; implement the interleaved load/speed ladder.
- Tiffen Time: turn constants (seats, counter, guests, patience) into parameters; patience spread.

Larger (new mechanics, content or art):

- Shopping List: end-of-session Retention question.
- Station Master: Sequence mechanic (C10, deferred); fifth colour; neutral station art.
- Garden Keeper: pests that appear on a timer (real Self-control trials).
- Tiffen Time: a Sequencing mechanic; possibly player choice of guest.
- Free Me: offline puzzle generator for 120-300 puzzles.
