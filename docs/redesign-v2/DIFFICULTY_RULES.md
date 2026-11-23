# Rapha Rx Redesign v2: Dynamic Difficulty Rules

**Status**: Draft. Owner answers of 2026-11-18 are folded in and tagged **[Owner 2026-11-18]**; everything untagged is still a proposal.
**Date**: 2026-11-11
**Updated**: 2026-11-18
**Content Type**: Design rules
**Companion**: `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx`, the level sheet (one tab per game).
**Parent spec**: `docs/redesign-v2/FINAL_SPEC.md`, workstream D (section 10).

**Sources**

- Owner answers and notes of 2026-11-18, written on the design notes: `docs/redesign-v2/2026-11-12_difficulty-design-notes.md.pdf`.
  Section 6 logs every decision taken from them.

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

**Games in scope** [Owner 2026-11-18]: Shopping List, Station Master, Spot Focus, Tiffin Time, Free Me, plus **Baggage Sort**, a new Attention game still to be designed.
Garden Keeper leaves the core six (section 3.4).

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
| S5 | **Variety.** Every level can produce at least 4 distinct rounds, and the same round never repeats back to back for a resident. Generator games build a fresh round from the level's parameters on every play; Free Me picks at random from the level's puzzle pool [Owner 2026-11-18]. |
| S6 | **Every game can fail.** Each game has an explicit clear rule and fail rule (per-game sections). No game hard-codes `completed: true`. When a round fails, the scorecard's **Continue** button becomes **Replay** and the resident replays the same level [Owner 2026-11-18]. |
| S6a | **Clear and fail use the game's own measure, not the skill score.** The proposed skill score already includes difficulty, so a fixed score threshold would trigger Replay more often on easy levels than hard ones. Each game compares its raw measure (share recalled, share found, share served) with a threshold that means the same at every level [Owner 2026-11-18]. Thresholds are starting values to balance in playtest. |
| S7 | **Hints and lives must not hide the measure.** Where a hint reveals an answer or lives cut a round short, the game section says how that round is scored. |
| S8 | **Log the level.** Every round logs its game, level number, and the full parameter set it ran with, so a retune can be traced. |
| S9 | **Version the ladder.** The sheet carries a version number. Changing any value bumps it, and every round logs the version (research question 20). |

### 2.1 Shared decisions needed

These affect every game, so they are decided once.

| # | Question | Why it matters |
|---|---|---|
| X1 | **How does a resident move on the ladder?** **Decided** [Owner 2026-11-18]: up one level on a clear; down one level after 2 fails in a row; otherwise repeat. Live in v1.38.0. | Today's score moves every round. A ladder needs explicit rules. |
| X2 | **What happens to levels overnight?** **Decided** [Owner 2026-11-18]: every game restarts at level 1 each day. D2 resets category unlocks daily, but levels could persist, decay, or warm up as today (80% of yesterday's peak). | A visible level that drops overnight conflicts with encouraging feedback. |
| X3 | **Phone or tablet?** **Decided: both** [Owner 2026-11-18]. Every level must work on a 360 px phone and a tablet, so the phone sets the hard maximums (Spot Focus columns, Free Me board size). | Phone limits are much tighter. |
| X4 | **Hints.** Partly decided per game: Shopping List keeps hints, heavily limited, and a hinted round scores half; Free Me's hint unlock point varies by level [Owner 2026-11-18]. | Hints contaminate Recall and Problem-solving today. |
| X5 | **Lives.** Partly decided: Station Master shows hearts as one heart icon with a number, so more than 3 can be shown, and a level may go as low as 1 heart [Owner 2026-11-18]. | Lives cap error counts and cut rounds short. |
| X6 | **How does the ladder interact with the scoring proposal?** The proposed skill score uses difficulty d (0-1). With a ladder, d becomes level / max level. | Keeps the scoring formula working (FINAL_SPEC, scoring proposal pending). |

## 3. Per-game rules

Each game has: parameters with guardrails, curation rules, a clear/fail proposal, a suggested ladder size with sample levels, required game changes, and open questions.
Measurement gaps (what the game does not log for its two skills) are in section 4.

---

### 3.1 Shopping List (`market-memory`), Memory

**Skills**: Recall, Retention (unchanged; FINAL_SPEC 7.1). Retention is captured by the second-trip round below (FINAL_SPEC D24, 7.1a).
**Suggested ladder**: 20 levels (capacity doc estimate 15-25).

**Owner decisions [Owner 2026-11-18]**: no separate end-of-session question screen; Retention is captured inside the game by a small change (second trip); 6 items stays the cap until a bigger cart is drawn; item names must be simple and translated before the hardest levels ship.

**Corrections to earlier docs**: the code has 16 crates and 62 items, an untimed list (READY ends the study phase) and no lives.
The 2026-08-17 design spec still says 12 crates, 21 items, a list timer and 3 lives.
`delayedRetrieval` is never read by the game; it only adds 2500 ms to `retentionMs`.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `listLength` | items | 3-6 | 2 | 6 | Max **hard (layout)**: the cart tray fits 6 slots (`games/memory/MarketMemory/geometry.ts:320-324`). New cart art is planned; 6 stays the cap until it lands [Owner 2026-11-18]. Min soft. |
| `holdMs` (rename of `retentionMs`) | ms | 1500-6500 | 1000 | 8000 | **Soft**. Under 1 s the cover reads as a flicker; past 8 s it is dead time. Renamed because it is a short hold, unrelated to the Retention skill. |
| `similarPackaging` (twins) | on/off | on from 0.25 | - | - | **Hard rule**: needs `listLength x 2 <= crateCount`. |
| `listCategory` | on/off | on from 0.75 | - | - | **Hard (assets)**: only produce and staples have enough items (`round.ts:14,45-53`). |
| `hints` | count | 2 fixed | 0 | 1 | **Soft**. Each hint shows one remaining item for 3 s. Limit heavily [Owner 2026-11-18]; max lowered to 1. |
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

Misses are allowed; the level is decided by the Recall measure against a threshold (S6a) [Owner 2026-11-18].

- **Clear**: Recall of at least 80% with no wrong picks (proposed starting value).
- **Fail (Replay)**: Recall under 50%.
- In between: repeat the level.
- A round where a hint was used scores **half** [Owner 2026-11-18]. Whether a hinted round can still clear is open (question 6).

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

- A Recall-based clear and fail with the Replay button (S6, S6a).
- Half score for hinted rounds.
- Simple, translatable item names in Kannada, Hindi and English before the top levels ship.
- **Second trip** (small change for Retention, proposed): the last round of a Shopping List visit shows no list. It reuses the shelf and cart and asks for the items on the visit's first list. Score = correct picks on the second trip / correct picks when that list was first shopped x 100. The rounds in between are the delay (FINAL_SPEC C20).
- Log the list of every round, so the second trip knows what to ask.
- Not built, by owner decision: a separate end-of-session question screen.

#### Decided [Owner 2026-11-18]

- Clear threshold: misses allowed, decided by the measure (was question 1).
- No separate end-of-session question screen; Retention comes from the second trip (was question 2).
- 6 items until new cart art (was question 3).
- Top levels wait on translated, simple item names (was question 4).
- Keep the skill names; no free-recall step (was question 5).

#### Open questions

1. Confirm the starting thresholds: clear at 80% Recall, fail under 50%.
2. Can a round where a hint was used still clear the level?

---

### 3.2 Station Master (`train-yard`), Memory

**Skills**: Association, Sequence (unchanged; FINAL_SPEC 7.1). No new mechanic [Owner 2026-11-18]; Sequence is captured by staggered arrival, a small change (FINAL_SPEC D24, 7.1a).
**Suggested ladder**: 24 levels with two small changes; about 12 with today's knobs only; 30+ needs a fifth colour or the Sequence mechanic.

**Owner decisions [Owner 2026-11-18]**:

- No new Sequence mechanic. Sequence is captured by staggered arrival (FINAL_SPEC 7.1a).
- Up to **8 stations**: 4 more drawn behind today's row. The owner is adding new colours, including more close-hue sets for `similarColours`.
- **Work on this game starts only after the art style and designs are in place.** The ladder below is provisional until then.
- Hearts become one heart icon with a number, so more than 3 can be shown; a level may drop to 1 heart.
- Move up at 75% first-try Association in 2 of the last 3 rounds; step back after 2 lost rounds in a row.

**Corrections to earlier docs**: only 24 of the "576 rounds" are distinct memory problems; the rest only change lanes.
A station whose train has arrived stays coloured and cannot be tapped again, so the 4th train is always right and the 3rd is a 50/50.
That inflates Association today.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `stationCount` | stations | 4 fixed | 3 | 8 | Max raised to 8 [Owner 2026-11-18]. **Hard (code and assets) until the new art lands**: 4 is hard-coded in several files and only 4 colours exist. With 2 the second pick is forced. 8 pairings is about twice the typical working-memory span of older adults, so the top of this range needs a playtest. |
| `signMsPerStation` | ms per station | 2000-750 (from 8000-3000 total) | 750 | 3000 | **Soft**. Below 750 ms per station is too fast to encode. Written per station so adding a station keeps the time fair. |
| `retentionHoldMs` | ms | 1500-4000 | 1000 | 6000 | **Soft**. Under 1 s the blind's lamps flicker; over 6 s is dead time. |
| `revealHomeStations` (new) | on/off | always on | - | - | Small change. Turning it off removes the giveaway above. |
| `similarColours` | on/off | on from 0.6 | - | - | **Hard (assets)**: today close warm hues are filters over the same 4 sprites. The owner's new close-hue colour sets replace this. |
| `lives` | hearts | 3 fixed | 1 | _TBD_ | Min 1 allowed [Owner 2026-11-18]. Max is no longer capped by layout once the heart-with-number HUD is built; the value is open (question 2). |

Staggered arrival (small change for Sequence, FINAL_SPEC 7.1a): `arrivalIntervalMs`, the gap between trains pulling in during study, 1500-4000 ms, **soft**. Arrival order is scored, never enforced: a wrong order costs no heart.
The study time `signMsPerStation` must cover the staggered arrivals.

#### Curation rules

- One knob per step, except `signMs` rises with `stationCount` so time per station stays the same.
- Max step: `signMsPerStation` -125 to -250 ms; `retentionHoldMs` +500 ms; `stationCount` +1; `lives` -1, at most once every 6 levels.
- At 8 stations the 750 ms per-station floor means at least 6 s of study time.
- Feature order: `revealHomeStations` off first, then `similarColours` last.
- Forbidden: `lives` 1 with `similarColours`.
  The old rule "`similarColours` with no more than 4 stations" existed because only 4 sprites exist; it is to be revisited once the new colour sets exist.
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

Blocked on art: none of this starts until the art style and designs are in place [Owner 2026-11-18].

- Art: new station colours (up to 8), close-hue sets for `similarColours`, a layout that fits 8 stations with 4 behind today's row, and a heart-with-number HUD.
- Grey stations leak their colour and width (they are the coloured sprite greyed out). A neutral station asset fixes this.
- `GameShell.tsx:447` divides by a hard-coded 4 stations; the station count is hard-coded in several other files too.
- No back-to-back repeat of a station assignment.
- **Staggered arrival** (proposed): trains pull into their stations one at a time during study, with an instruction to send them home in the same order. Log arrival order and dispatch order; Sequence = % of trains sent in the right order.

#### Decided [Owner 2026-11-18]

- No new Sequence mechanic; Sequence comes from staggered arrival (was question 1).
- New colours rather than relying on filtered hues (was questions 2 and 3).
- A level may drop to 1 heart (was question 4).

#### Open questions

1. Whether a neutral grey station asset is part of the new art.
2. The most hearts any level gives, now that the number HUD allows more than 3.
3. Rebuild the sample ladder for 8 stations once the art exists.

---

### 3.3 Spot Focus (`spot-focus`), Attention

**Skills**: Selective attention, Response speed.
**Suggested ladder**: about 24 levels. Content is plentiful; the limit is the number of knobs and the screen.

**Owner decisions [Owner 2026-11-18]**:

- Runs on **phone and tablet**.
- Board up to **6 x 3** (18 cells).
- Differences from **1** up to **40% of cells**, which is 7 on the largest board.
- No time cap. An **"I can't find it" button** appears after a set delay and ends the round.
- Response speed is the median gap between finds.
- More twin pairs will be commissioned.
- The Mahjong idea is an art change only and does not affect this ladder.

Grids below are written **columns x rows**.
_Assumption to confirm_: 6 x 3 means 3 columns and 6 rows. Six columns would make cards far too small on a 360 px phone (4 columns already gives cards about 31 px wide), which the phone-and-tablet decision rules out.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `differenceCount` | count | 2-7 | 1 | floor(40% of cells) | **Hard rule** [Owner 2026-11-18]. Above 40% random tapping finds targets (today's top setting is 7 of 12, 58%). By grid: 3x3 = 3, 3x4 = 4, 3x5 = 6, 3x6 = 7, 4x4 = 6. |
| `gridCols` | count | 3-4 | 3 | 4 on tablet; 3 on phone at subtle levels | **Hard (layout)**. On a phone, 4 columns gives cards about 31 px wide. |
| `gridRows` | count | 3 fixed | 3 | 6 | Max raised [Owner 2026-11-18]. Small change: the layout already reads rows from the scene. Needs a check that 6 rows fit a phone in the portrait column. |
| `boldCount` / `mediumCount` / `subtleCount` | per board | one tier per board | 0 | subtle 7 (soft), 15 (hard, assets) | 15 twin families exist, at most one difference per family; more twin pairs are being commissioned. Mixing tiers on one board is a small generator change. |
| `giveUpDelayS` (new) | s | no button | 30 | _TBD_ | **Soft**. How long the board is up before "I can't find it" appears. Replaces the time cap [Owner 2026-11-18]. Lets "% found" vary. |
| `wrongTapLimit` (new) | count | penalty only | 0 | - | **Soft**. Used by the clear rule. |

#### Curation rules

- One knob harder per step. Max step: differences +1; one row or one column; at most 2 differences move up a tier; `giveUpDelayS` +15 s.
- Exception: when the grid grows, the subtle count may drop by 1 in that step.
- Coupled: differences at most 40% of cells.
- Tier order: bold only; medium mixed with bold; all medium; 1 subtle per board; majority subtle.
- Forbidden: subtle with 4 columns on a phone; grid growth and a new tier in the same step.

#### Clear and fail (proposal)

The measure is the share of differences found (S6a).

- **Clear**: every difference found without pressing "I can't find it", with wrong taps no more than `differenceCount`.
- **Fail (Replay)**: gave up with under 50% found, or wrong taps over 2 x `differenceCount`.
- In between: repeat the level.
- On give-up, the remaining differences are revealed, so the round ends with the answer, not frustration.

#### Sample levels (proposal, phone-safe)

| Level | Grid (cols x rows) | Differences | Bold/Med/Subtle | % of cells | Max wrong taps |
|---|---|---|---|---|---|
| 1 | 3x3 | 1 | 1/0/0 | 11% | 1 |
| 6 | 3x3 | 3 | 1/2/0 | 33% | 3 |
| 12 | 3x4 | 4 | 0/3/1 | 33% | 4 |
| 18 | 3x5 | 5 | 0/2/3 | 33% | 5 |
| 24 | 3x6 | 7 | 0/1/6 | 39% | 7 |

The previous sample used 4 x 4 at levels 18 and 24, which broke the "no subtle at 4 columns" rule on a phone.

**Built (v1.41.0, plan 3b):** tiers mix on one board, and the ladder holds these samples exactly. Even steps between them made two things harder at once, so all 24 levels are written out in `src/lib/ladders/spotFocus.ts`, each changing one thing. When the board grows (levels 7, 13 and 19) it drops a difference, as allowed above. Level 5 repeats level 6, because the 3 x 3 board has room for only four changes in five steps.

#### Decided [Owner 2026-11-18]

- Phone and tablet (was question 1).
- "I can't find it" button after a delay, no time cap (was question 2).
- Response speed as the median gap between finds (was question 3).
- Mahjong is art only (was question 4).
- Commission more twin pairs (was question 5).

#### Open questions

1. Confirm 6 x 3 means 3 columns by 6 rows.
2. The delay before "I can't find it" appears: one value, or growing with board size?
3. Response speed start point: when the board is first painted (not the mount effect, see section 4).

---

### 3.4 Garden Keeper (`garden-keeper`): removed from the core six

**Decision [Owner 2026-11-18]**: Garden Keeper leaves the six-game list and will not be part of the core prescription.
It gets **no changes**: no ladder, no clear or fail rule, no measurement work.
Whether it stays reachable from Free Play as it is today is not stated (open question below).

Its Attention slot goes to **Baggage Sort**, a new game to be designed and built later.
This also answers FINAL_SPEC C9 ("Garden Keeper / Baggage Sort"): Baggage Sort is the replacement.

**Carry into the Baggage Sort design**: Baggage Sort takes over Sustained attention and Self-control with their draft measures (FINAL_SPEC 7.1, D24), so it must avoid the problems found in Garden Keeper below:

- Real "leave it alone" trials: tempting items that appear and leave on a timer.
- A fixed-length round, so the first and last thirds can be compared.
- Enough targets in every third to measure.
- Errors that are not capped by hearts.

**Open question**: does Garden Keeper stay in Free Play unchanged, or leave the app?

The analysis below is kept for reference only. None of it will be built.

#### Archived analysis (2026-11-11)

**Skills**: Sustained attention, Self-control.
**Suggested ladder**: 24 levels, interleaving load steps and speed steps; about 13 without raising caps.

**Corrections to earlier docs**:

- **Self-control cannot really be measured today.** The don't-tap items are fixed scenery with no timing, so there are no "leave it alone" trials, only a fixed set of objects.
- **Sustained attention has no last third.** The round ends the moment the target count is reached, roughly 30 s in at level 1.
- **"Wide before fast" is in a comment but not in the code.** All knobs move together.
- **The capacity doc's 35-object ceiling looks too high.** Even 24 may overlap tap areas; needs a device check.

##### Parameters

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

##### Curation rules

- One pressure axis per step: alternate load steps (plants, ratio) and speed steps (interval, window).
  Load first; speed steps start from about 30% of the ladder.
- Concurrency goes 1 to 2 only once plants >= 15, and 2 to 3 only once plants >= 21, with no other knob moving in that step.
- Max step: +1 to 2 plants; +0.03 ratio; -150 ms interval; -250 ms window; -500 ms bloom.
- Coupled (hard):
  - `bloomHoldMs > thirstWindowMs`
  - `maxConcurrentThirsty <= ceil(thirstWindowMs / spawnIntervalMs)`
  - flowers >= (`bloomHoldMs` + 2600) / `spawnIntervalMs` + `maxConcurrentThirsty`
  - at least 10 targets presented in each 30 s third, and at least 3 don't-tap events per third once they exist.

##### Clear and fail (proposal)

- The round always runs the full 90 s.
- **Clear**: hearts left and a hit rate (watered / targets shown) of at least 70%.
- **Fail**: hearts gone, or time up below the threshold.

##### Sample levels (proposal)

| Level | Plants | Ratio (wilted/pest) | Interval | Window | Concurrency | Bloom | Target | Lives |
|---|---|---|---|---|---|---|---|---|
| 1 | 12 | 0.25 (2/1) | 3000 | 3000 | 1 | 11000 | 8 | 3 |
| 6 | 15 | 0.33 (3/2) | 3000 | 4500 | 2 | 10000 | 10 | 3 |
| 12 | 18 | 0.40 (4/3) | 2200 | 4400 | 2 | 8800 | 14 | 3 |
| 18 | 21 | 0.48 (5/5) | 1700 | 3400 | 2 | 7500 | 17 | 3 |
| 24 | 24 | 0.55 (7/6) | 1200 | 2800 | 3 | 6500 | 20 | 3 |

Level 1 uses a 3 s window, half of today's 6 s, so each third has enough targets to measure. See open question 5.

##### Open questions

1. Self-control: build pests that appear on a timer (real trials), or redefine it as wrong taps per minute?
2. Drop the early finish so the round always runs 90 s?
3. Keep 3 hearts that end the round, or show heart loss as feedback only (X5)?
4. Hit-rate threshold to clear a level?
5. Level 1: a generous 6 s window, or enough targets per third to measure Sustained attention?

---

### 3.5 Tiffin Time (`serve-guests`), Planning

**Skills**: Sequencing, Decision-making (unchanged; FINAL_SPEC 7.1). No new mechanic such as multi-step cooking [Owner 2026-11-18]; Sequencing is captured by numbered dishes, a small change (FINAL_SPEC D24, 7.1a).
**Suggested ladder**: 30 levels. Today's hardest setting sits around level 23; levels beyond need a timing playtest.

**Owner decisions [Owner 2026-11-18]**:

- Spelled **Tiffin**.
- No new Sequencing mechanic; Sequencing comes from numbered dishes (FINAL_SPEC 7.1a).
- The game keeps choosing which guest gets a served dish.
- **Guest types**, Impatient, Middle and Patient, give each guest an urgency that does not depend on order size. That makes "which dish do I cook first?" a real decision, which is how Decision-making is measured.
- Guests per round up to 18.
- On-screen points removed.
- The clear threshold and the tightest patience are Claude's proposals below, to be balanced later.

**Corrections to earlier docs**: the game, not the player, picks which guest gets a served dish (the least patient one).
Guest patience comes only from order size today, so there is no separate urgency signal; guest types add one.
The 2026-08-11 design spec says 8 dishes and 3-6 s cooks; the code has 6 dishes and 3-7.5 s cooks.

#### Parameters

| Parameter | Unit | Today | Min | Max | Kind and reason |
|---|---|---|---|---|---|
| `seats` | guests at once | 4 fixed | 2 | 4 | Max **hard (layout)**: at 4 the guests already touch. Min soft: 1 seat makes Decision-making unmeasurable. |
| `counterSize` | dishes on counter | 6 fixed | `maxItems` + 1 | 6 | Max **hard (layout)**: a third row of cards does not fit. |
| `minItems` / `maxItems` | dishes per order | 1 / 1-3 | 1 | 3 | **Soft** (design rule). 4 might fit as a 2x2 bubble; unchecked. |
| `guestsPerRound` | guests | 8 fixed | 2 x `seats` | 18 | Max raised to 18 [Owner 2026-11-18]. **Soft (timing)**: more guests make longer rounds; 18 guests is roughly a 4-5 minute service at the top levels. |
| `patienceBaseS` / `patiencePerItemS` | s | 26 / 9 | see floor | 45 / 12 | **Soft**. Patience of a Middle guest. Too low turns it into a speed test. |
| `guestMix` (new, replaces `patienceSpread`) | share Impatient / Middle / Patient | all one type | all Middle | 40 / 30 / 30 | **Soft**. Each guest's patience is the level's patience x their type: Impatient x 0.7, Middle x 1.0, Patient x 1.3 (proposed). Needs a visible type cue on each guest (art). |
| `readyWindowS` | s | 11 | 8 (hard floor: > 3) | 20 | **Hard** floor from the spoil ramp. |
| `cookBand` (new) | which dishes | all 22 | - | - | short (<= 4.5 s), all, long-weighted. Each band needs at least `counterSize` dishes. |
| `respawnGapS` | s | 0.9-2.3 | 0.9 | 5 | **Soft**. |

**Tightest patience (proposal)**: no guest, of any type, ever gets less than **18 s for a one-dish order plus 8 s for each further dish** (18 / 26 / 34 s for 1 / 2 / 3 dishes).
Reasoning: the longest cook is 7.5 s, and the rest leaves an older player about 10 s per dish to notice the order, find the card, and tap twice.
This floor overrides the type multiplier.

#### Curation rules

- One axis per step. Max step: seats +1; counter +1; maxItems +1; patience -3 s base or -2 s per item; ready window -1 s; guests +1; Impatient share +10 points.
- Coupled: `counterSize >= maxItems + 1`; no guest below the tightest-patience floor; moving to a longer cook band raises patience by the same amount; `guestsPerRound >= 2 x seats`.
- Feature order: seats 2 > 3 > 4; counter 3 > 6; items 1 > 2 > 3; cook bands; guest types; then shorter patience and ready window.
- Forbidden: 1 seat at any scored level; `readyWindowS <= 3`; guest types at a 1-seat level (there is no choice to make); max items, minimum patience and long cooks all together without a playtest.

#### Clear and fail (proposal, to be balanced later [Owner 2026-11-18])

The measure is the share of dishes served (S6a).

- **Clear**: at least 80% of dishes served and at most 1 guest walks out.
- **Fail (Replay)**: under 60% served, or 3 or more walkouts.
- In between: repeat the level.

#### Sample levels (proposal)

| Parameter | L1 | L8 | L15 | L23 | L30 |
|---|---|---|---|---|---|
| seats | 2 | 3 | 4 | 4 | 4 |
| counterSize | 3 | 4 | 5 | 6 | 6 |
| items (min-max) | 1-1 | 1-2 | 1-2 | 1-3 | 2-3 |
| guestsPerRound | 6 | 8 | 8 | 10 | 12 |
| patience base / per item (s), Middle guest | 40 / 10 | 34 / 9 | 30 / 9 | 26 / 9 | 22 / 8 |
| guestMix (Impatient / Middle / Patient %) | 0 / 100 / 0 | 0 / 100 / 0 | 20 / 60 / 20 | 30 / 40 / 30 | 40 / 30 / 30 |
| readyWindowS | 16 | 14 | 12 | 11 | 9 |
| cookBand | short | short + mid | all | all | long-weighted |
| respawnGapS | 2.5-4 | 1.5-3 | 1.2-2.6 | 0.9-2.3 | 0.9-2.3 |

At L30 an Impatient guest with a 3-dish order would get 0.7 x 46 = 32 s, under the 34 s floor, so the floor applies.
The 18-guest cap leaves room to lengthen service above L30 if the playtest shows the ladder ends too early.

**Built (v1.41.0, plan 3b):** the ladder holds this whole table.
- Fewer seats keep the 4-seat width and are centred.
- A smaller counter keeps the card size and centres its rows.
- Cook bands: `short` is 4.5 s or less (8 dishes); "short + mid" is `mid`, 6 s or less (17); `all` is all 22; `long` deals dishes of 6 s or more at double weight.
- Not applied: the coupled rule that a longer cook band raises patience, because this table does not follow it either. Check at the playtest.
- Not tested: "one axis per step", because the table moves several axes between levels. This is unchanged from plan 3a.

#### Decided [Owner 2026-11-18]

- No new Sequencing mechanic; numbered dishes capture it (was question 1).
- No player choice of guest; guest types carry Decision-making (was question 2).
- Claude proposes the clear rule and the tightest patience; to be balanced later (were questions 3 and 4).
- Remove on-screen points (was question 5).
- "Tiffin" (was question 6).

#### Open questions

1. Confirm the type multipliers (0.7 / 1.0 / 1.3) and the patience floor at playtest.
2. Art: how a guest shows their type (face, colour, a small badge).

---

### 3.6 Free Me (`clear-the-way`), Planning

**Skills**: Planning, Problem-solving.
**Suggested ladder**: 30 levels (optimal moves 2-16, about two levels per value).

**Owner decisions [Owner 2026-11-18]**:

- **This game is worked on last** of the six.
- Each round picks at random from the level's puzzle pool.
- A restart counts as not cleared.
- No move ceiling.
- Planning counts moves since the last restart.
- The hint unlock point varies by level.
- 6 x 6 stays the largest board for now.
- Freshness also comes from visual variety: new block types and background types.
- Generate more puzzles, so a level can be built from every descriptor, especially `depth`, `density` and `singleCellPieces`.

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
| `hintUnlockRatio` | x `minMoves` | 2 | _TBD_ | _TBD_ | **Soft**. Global today; becomes a per-level value [Owner 2026-11-18]. |
| `solverStates` | states | - | - | 200,000 | **Hard (code)**: the live hint solver's budget. |

#### Curation rules

- Assign puzzles to levels by `minMoves`, then `depth`, then `obstacles`.
- Never decreasing: `minMoves`, `boardSize`; `density` and `obstacles` within one board size.
- Max step: `minMoves` +1; board size grows by one only at the start of a new `minMoves` value, and `minMoves` holds (or drops to the band floor) on that step.
- All puzzles in a level share `boardSize` and `minMoves`; their `depth` differs by at most 1.
- Forbidden: any 1x1 on 6x6; fewer than 2 must-move pieces after level 1; a puzzle the solver cannot finish within its budget; non-right exits before the last third of the ladder (if used at all).

#### Clear and fail (proposal)

- **Clear**: solved with no hint and no restart.
- **Fail (Replay)**: any hint, any restart [Owner 2026-11-18], or leaving mid-puzzle.
- No move ceiling: a round only ends solved or abandoned [Owner 2026-11-18].
- Planning efficiency (`minMoves / moves since the last restart`) is reported but does not gate [Owner 2026-11-18].

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

- **Visual variety** [Owner 2026-11-18]: new block types and background types, so a level's pool feels fresh. This helps against recognising a board, but not against a remembered solution, so it adds to the puzzle count rather than replacing it.
- **Generator coverage** [Owner 2026-11-18]: generate enough puzzles to test whether every descriptor can drive a level, especially `depth`, `density` and `singleCellPieces`. Today's 10 puzzles do not cover them.

#### Decided [Owner 2026-11-18]

- Random pick from the level's pool (was question 1).
- A restart counts as not cleared (was question 2).
- No move ceiling (was question 3).
- Planning counts moves since the last restart (was question 4).
- The hint unlock varies by level (was question 5).
- 6 x 6 is fine for now (was question 6).

#### Open questions

1. The hint unlock ratio per level. Suggested start: 3 x `minMoves` at the bottom, falling to 1.5 x at the top.
   A fixed 2 x unlocks a hint after only 4 moves on a 2-move puzzle, but makes a player wait 26 moves on a 13-move one.
2. Random pools make results less comparable between residents at the same level.
   The curation rules already hold `boardSize` and `minMoves` equal within a level, and `depth` within 1.
   Is that close enough for research?

## 4. Measurement gaps

What each game does not log today that its skill measures need.
These are engineering tasks for workstream C, listed here because the ladder is useless for research without them.

| Game | Gaps |
|---|---|
| Shopping List | List items not logged; no per-tap timestamps; twin picks not separated from other wrong picks; hinted items not logged; `pickOrder` keeps removed items. Second-trip picks must be logged apart from normal rounds. |
| Station Master | Only totals; no per-dispatch event (colour, station, attempt, time); untried trains on a lost round not counted; settings other than `signMs` not logged; train switches not logged. |
| Spot Focus | No per-find timestamps; start point is the mount effect, not first paint; `durationSeconds` includes the completion screen; wrong taps are a bare count; level parameters not logged; give-up not logged (new). |
| Tiffin Time | Cook and serve taps not logged with time, guest patience or guest type; wasted cooks silent; no per-guest records. |
| Free Me | Leaving mid-puzzle unlogged, so Problem-solving reads too high; move count carries across restarts (to be counted from the last restart [Owner 2026-11-18]); depth, level and must-move not logged; no record of whether a resident has seen a puzzle before. |
| Garden Keeper | Removed from the core six; no work [Owner 2026-11-18]. |

## 5. Summary of game changes the ladders need

Order of work [Owner 2026-11-18]: Station Master waits for the art style and designs; Free Me comes last; Garden Keeper gets nothing; Baggage Sort is a new design.

Small (parameterise or tweak existing code):

- Make every game able to fail (S6), with Continue becoming Replay on a failed round: Shopping List, Spot Focus, Tiffin Time hard-code success.
- Shopping List: rename `retentionMs`, drop `delayedRetrieval`, variable crate count, half score for hinted rounds, at most 1 hint.
- Station Master (after art): 3-station mode, `revealHomeStations` off, no back-to-back repeats.
- Spot Focus: mixed tiers per board, up to 6 rows, "I can't find it" button after a delay.
- Tiffin Time: turn constants (seats, counter, guests, patience) into parameters; guest types; remove on-screen points; rename "Tiffen" to "Tiffin" in player-facing copy.
- Free Me (last): count moves from the last restart; per-level hint unlock; log leaving mid-puzzle.

Larger (new mechanics, content or art):

- Shopping List: simple, translated item names (Kannada, Hindi, English); new cart art for more than 6 items.
- Station Master: up to 8 station colours, close-hue colour sets, 8-station layout, heart-with-number HUD, neutral station art.
- Spot Focus: more twin pairs.
- Tiffin Time: art for the three guest types.
- Free Me: offline puzzle generator for 120-300 puzzles covering every descriptor; new block and background types.
- Baggage Sort: new Attention game, replacing Garden Keeper (section 3.4).

Small changes that capture skills (FINAL_SPEC 7.1a): Shopping List second trip, Station Master staggered arrival, Tiffin Time numbered dishes.

Not built, by owner decision: a separate end-of-session question screen, a new Station Master Sequence mechanic, multi-step cooking in Tiffin Time, player choice of guest, any Garden Keeper change.

## 6. Decision log

Every owner answer from `2026-11-12_difficulty-design-notes.md.pdf` and the follow-up of 2026-11-18, in one place.

| # | Game | Decision |
|---|---|---|
| O1 | All | A failed round turns Continue into Replay; the resident replays the level. |
| O2 | All | Clear and fail compare each game's own measure with a threshold, not the difficulty-weighted skill score (S6a). |
| O3 | All | Generator games build a fresh round from the level's settings each play. |
| O4 | All | Phone and tablet both supported (X3). |
| O5 | Shopping List | Misses allowed; clear decided by the Recall threshold. |
| O6 | Shopping List | No separate end-of-session question screen; Retention captured by the second trip (O30). |
| O7 | Shopping List | Hints limited heavily; a hinted round scores half. |
| O8 | Shopping List | 6 items until new cart art. |
| O9 | Shopping List | Simple, translatable item names before the top levels. |
| O10 | Shopping List | Skill names unchanged; no free-recall step. |
| O11 | Station Master | No new Sequence mechanic; Sequence captured by staggered arrival (O30). |
| O12 | Station Master | Up to 8 stations; new colours and close-hue sets from the owner. |
| O13 | Station Master | Game work starts only after the art style and designs are in place. |
| O14 | Station Master | Hearts shown as a heart with a number; levels may go down to 1 heart. |
| O15 | Station Master | Up at 75% in 2 of the last 3 rounds; down after 2 lost rounds in a row. |
| O16 | Spot Focus | Board up to 6 x 3; differences from 1 to 40% of cells. |
| O17 | Spot Focus | "I can't find it" button after a delay; no time cap. |
| O18 | Spot Focus | Response speed = median gap between finds. |
| O19 | Spot Focus | More twin pairs; Mahjong is art only. |
| O20 | Garden Keeper | Removed from the core six; no changes. Baggage Sort replaces it later. |
| O21 | Tiffin Time | No new Sequencing mechanic; Sequencing captured by numbered dishes (O30). |
| O22 | Tiffin Time | Game keeps choosing the guest; guest types (Impatient, Middle, Patient) carry Decision-making. |
| O23 | Tiffin Time | Guests per round up to 18. |
| O24 | Tiffin Time | Claude proposes clear rule and tightest patience; balance later. |
| O25 | Tiffin Time | On-screen points removed; spelled "Tiffin". |
| O26 | Free Me | Worked on last. |
| O27 | Free Me | Random pick from the level's pool; restart = not cleared; no move ceiling. |
| O28 | Free Me | Planning counts moves since the last restart; hint unlock varies by level; 6 x 6 cap for now. |
| O29 | Free Me | More visual variety; generate puzzles that exercise every descriptor. |
| O30 | All | Skill names and measures stay as in FINAL_SPEC 7.1. Where a game cannot produce a measure, a small change captures it: second trip (Retention), staggered arrival (Sequence), numbered dishes (Sequencing). Baggage Sort keeps Garden Keeper's two skills. |

### Applied to FINAL_SPEC (2026-11-18)

O1-O30 are in FINAL_SPEC as D15-D24.
C9, C10, C11, C12 and C17 are resolved there; C18 (Garden Keeper in Free Play) and C20 (Retention delay for the second trip) are open.
