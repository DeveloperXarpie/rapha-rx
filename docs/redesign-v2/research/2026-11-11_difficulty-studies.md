# Difficulty Studies: One Report per Game

**Date**: 2026-11-11
**Content Type**: Research (code studies)
**Source**: `feat/app-flow-redesign` at v1.35.5.
**Used by**: `docs/redesign-v2/DIFFICULTY_RULES.md`, which condenses these reports into rules.

Six parallel agents each studied one game's code, design spec and the October analysis docs.
They worked against the two skills `FINAL_SPEC.md` section 7.1 assigns each game.
Each report lists that game's parameters and guardrails, its curation rules, a clear/fail rule, variety, a sample ladder, measurement gaps and open questions.
The agents only read code; none edited the repo.
These are the agents' reports, lightly formatted.
Values are proposals and have not been play-tested.
File references are relative to `src/` unless they start with `docs/`, or are relative to the game folder where a report says so.

---

## 1. Shopping List (`market-memory`)

### 0. Corrections to the existing docs

- The design spec is stale: "12 crates / 21 items / `listSeconds` 9000->3500 / lives 3" (`docs/superpowers/specs/2026-08-17-market-memory-design.md` section 9).
  The code has 16 crates (`games/memory/MarketMemory/round.ts:3`) and 62 items (`items.ts:29-109`: produce 20, spices 8, pulses 9, staples 12, pantry 9, household 4).
  There is no list timer (READY is the only exit, `index.tsx:175-180`) and no lives (`round.ts:91-95`).
- The capacity doc's "7 states" counts discrete breakpoints only (1/6, 0.25, 0.5, 0.55, 0.75, 5/6). `retentionMs` is a continuous lerp (`dynamicDifficulty.ts:416-417`).
- `delayedRetrieval` is never read by the game. It only adds 2500 ms to `retentionMs` (`dynamicDifficulty.ts:413-417`; the game merely declares it at `index.tsx:51,60`). In a ladder, drop it and set `retentionMs` directly.
- Stale comments: `round.ts:26` ("Twelve item ids"), `round.ts:78` ("full 21"). `DEFAULT_PARAMS.similarPackaging` is `true` (`index.tsx:59`), while score 0 gives `false`.

### 1. Parameters

| Param | Unit | In code today | Hard min | Hard max | Reason / type |
|---|---|---|---|---|---|
| `listLength` | items | 3-6 (`dynamicDifficulty.ts:400-401`) | 2 (soft) | **6** | Hard (layout): `slotWidth` fits 6 in the 732 px tray (`geometry.ts:320-324`); 7 slots at 112 px = 844 px. The clipboard has 7 bands (`geometry.ts:225-233`); an 8th row clamps and overlaps (`ListCard.tsx:60`). 7 is possible only with a cart redraw. With twins on, the shelf caps at 8 (16 crates / 2). Elderly span of about 4-6 suggests keeping 6. |
| `retentionMs` (cover hold) | ms | 1500-6500 (`dynamicDifficulty.ts:402-404,416-417`) | 1000 (soft) | 8000 (soft) | No code limits (`index.tsx:196-205`). Min keeps the cover from reading as a flicker. Past about 8 s it is a blank stare and does not train Retention (which is end-of-session). |
| `similarPackaging` | bool | on at >= 0.25 (`:405`) | - | - | Adds each target's twin to the shelf (`round.ts:75`). Hard: needs `listLength x 2 <= crates`. |
| `listCategory` | bool | on at >= 0.75 (`:407`) | - | - | Only produce and staples qualify; the group needs at least max(L, 10) items (`round.ts:14,45-53`). Hard (assets): spices and pulses can never be a category round. |
| `hints` | count | fixed 2 (`:408`) | 0 | 2 (soft) | Each hint shows one remaining item for 3 s (`index.tsx:43,240-251`). No code cap. |
| *New:* `crateCount` | crates | fixed 16 | L x (twins ? 2 : 1) | **16** | Hard (layout): 4x4 grid above the cart (`geometry.ts:93-94`). Small change in `round.ts:70,79`; an empty compartment needs an art decision. |
| *New:* twin closeness tier | 1-3 | none | 1 | 3 | Needs a closeness tag per item. Pulses differ only in colour (`items.ts:63-65`). Soft. |
| *New:* study time limit | ms | none (untimed) | 3000 (soft) | untimed | Removed earlier; small to re-add. |
| *New:* interference task | bool | none | - | - | Medium change: a new phase between `travel` and `shopping`. |

### 2. Skill mapping

- **Recall** is stressed by `listLength`, `retentionMs`, the study limit and interference.
  Lure similarity (twins, category, closeness, `crateCount`) stresses discrimination; it lowers Recall through wrong picks, not forgetting.
  This is recognition, not free recall (`docs/2026-10-08_skill-coverage-by-game.md:47`).
- **Retention** is not stressed by any in-round param. The ratio normalises by the straight-after count, so level differences mostly cancel. The re-ask format must stay fixed across levels or Retention is not comparable between days.
- **Distortion: `hints`.** A hinted item picked correctly is not memory. With `hints=2` at L=3, two thirds of the list can be revealed. Hinted ids are not logged (`index.tsx:245-247`), so they cannot be excluded from Recall.
- **Naming trap:** `retentionMs` is a short-term hold, unrelated to the Retention skill. Rename it (for example `holdMs`).

### 3. Curation rules

- Monotone non-decreasing: `listLength`, twin/category/closeness unlocks (once on, stay on), `crateCount`. Non-increasing: `hints`.
- Sawtooth allowed: the hold may drop back to its band minimum on the step where `listLength` rises.
- One knob per step, except the coupled `listLength`+1 with the hold reset.
- Max change per step: `listLength` +1; hold +500 ms (500 ms granularity, soft); `hints` -1; one boolean at a time.
- Unlock order: twins, then category, then closeness tier 3 (pulses), then interference.
- Forbidden: L > 6; L x 2 > `crateCount` with twins on; `hints >= L-1`; category on at L > 10; closeness tier 3 with category on (pulses cannot be a category round today).

### 4. Clear / fail rule

- Hard-coded `completed: true` at `index.tsx:280` (justified at `:267-272`), so `adjustDifficulty`'s demotion branch never runs (`dynamicDifficulty.ts:64-70`). `perfect` already exists (`round.ts:104`) but is unused for progression.
- Proposal: Clear = Recall >= L-1 correct with 0 wrong (L <= 3: perfect only). Fail = Recall < 50%. Hinted items count as not recalled. In between = repeat the level.
- Retention cannot gate a level: it arrives once per session, after the rounds.

### 5. Variety

- Lists from the full pool: C(62,3) = 37,820 at L=3 and about 61M at L=6, with crate order shuffled on top (`round.ts:81`).
- Highest level (category on, L=6): C(20,6) + C(12,6) = about 39.7k lists. "At least 4 versions" holds easily at both ends.
- Quirk: a list can contain an item and its own twin (tomatoes and vine-tomatoes, `items.ts:31-32`), which silently removes one decoy.

### 6. Ladder: about 20 levels (capacity doc estimate 15-25)

| Level | L | Hold ms | Twins | Category | Closeness | Hints | Crates |
|---|---|---|---|---|---|---|---|
| 1 | 3 | 1500 | off | off | - | 2 | 16 |
| 5 | 4 | 2500 | on | off | 1 | 2 | 16 |
| 10 | 5 | 3000 | on | off | 2 | 1 | 16 |
| 15 | 5 | 5500 | on | on | 2 | 1 | 16 |
| 20 | 6 | 6500 | on | on | 2 | 0 | 16 |

The hint values break the `hints < L-1` rule at L=3 and 4; hinted items must be excluded from Recall, or hints capped at 1 there. (The rules doc uses 1.) Closeness is a proposed knob. All values are judgement, not play-tested.

### 7. Measurement gaps

- Target `list` ids are not in the metrics (`index.tsx:281-291`), so `pickOrder` cannot be scored afterwards and Retention has no "today's list" to re-ask.
- No per-tap timestamps; only `timeToFirstPickMs` and `timeToSubmitMs`.
- Twin picks are not separated from other wrong picks. Hinted item ids are not logged.
- `pickOrder` keeps items later removed (`index.tsx:231,235-238`).
- No end-of-session re-ask exists anywhere in `src/` (searched).

### 8. Open questions

1. Clear threshold: perfect only, or at most one miss?
2. Which list does the Retention re-ask use when the game runs several rounds in a session (first, last, all)? Adds to C12.
3. Keep hints at all given they contaminate Recall, or score hinted items as misses?
4. Cart redraw for L=7, or is 6 the permanent cap?
5. Do the hardest levels wait on translated item names? Names are English-only (`items.ts`, rendered at `Crate.tsx:112`), and the pulse twins are told apart by reading.
6. Relabel Recall as Recognition, or add a free-recall step?

---

## 2. Station Master (`train-yard`)

Paths relative to `src/games/memory/TrainYard/` unless stated.

### Corrections to earlier docs

- **Only 24 of the 576 rounds are distinct memory problems.** 576 = 4! x 4! (`index.tsx:120-124`). Only `assign` (which colour sits at which station) is remembered; `order` only moves trains between lanes.
- **The stations give away answers late in the round.** A station whose train is home stays coloured and cannot be tapped (`index.tsx:249, 611`). So the 4th train is always right first time unless it missed earlier, and the 3rd is a 50/50. This inflates Association.
- **Names play no part.** The match is colour to column (`index.tsx:359-365`); names show only during encoding (`index.tsx:383`).
- **The real delay is longer than `retentionHoldMs`**: plus two 540 ms blind moves (`index.tsx:28, 222-226`) and 2300 ms run time per earlier train (`Train.tsx:8`).
- **`lives` above 3 would not show.** The HUD always draws 3 hearts (`index.tsx:503`).
- **Station colour leaks while grey.** Hidden stations are the coloured sprite greyed out (`Station.tsx:31`), and each station's width comes from its own sprite (`geometry.ts:118-120`; about 124-129 design px, `sprites.ts:19-24`).

### 1. Parameters

| Param | Unit | Code today | Hard min | Hard max | Reasons |
|---|---|---|---|---|---|
| `signMs` (study time) | ms | 8000 down to 3000 (`dynamicDifficulty.ts:308`) | 3000 soft | 12000 soft | Encoding cannot be skipped (`index.tsx:203-210`), so a long window is just waiting. Below about 750 ms per station is too fast for elderly encoding. Suggest expressing as ms per station. |
| `retentionHoldMs` | ms | 1500 up to 4000 (`:309`) | 1000 soft | 6000 soft | Blind lamps change at 40% and 75% of the hold (`Blind.tsx:25-27`), so under about 1 s they flicker. Over 6 s is dead time in a 10-minute session. |
| `similarColours` | bool | true from 0.6 (`:310`) | off | on | Hard (assets): close warm hues are CSS filters over the same 4 sprites (`palette.ts:27-32`). |
| `lives` | count | always 3 (`:311`) | 1 soft | 3 hard (layout) | `index.tsx:503` draws 3 hearts. A guesser who never repeats a station needs at most 6 misses, so high lives remove the fail state. |
| `stationCount` | count | always 4 | 3 hard | 4 hard (assets), 5 with new art | Hard-coded in `geometry.ts:15, 83-84`, `index.tsx:121-123, 279, 341`, `GameShell.tsx:447`. Only 4 hues have art (`sprites.ts:19-32`). About 5 columns fit `SAFE_X` (`geometry.ts:165`). With 2 stations the second pick is forced. |
| `revealHomeStations` (new) | bool | always on (`index.tsx:611`) | - | - | Small change; turning it off removes the giveaway. |

**Sequence parameters (need a game change; C10 deferred).** Trains fade in together at dispatch (`index.tsx:391`); the game picks a random next train (`index.tsx:188-194`) and the player may switch (`index.tsx:242-246`). Nothing checks order.

| Param | Unit | Bounds | Basis |
|---|---|---|---|
| `sequenceLength` | trains | 2 up to `stationCount` | Hard: station count. Soft: about 5 for elderly forward span. |
| `arrivalIntervalMs` | ms between arrivals while encoding | 1500 to 4000 | Soft |
| `orderEnforced` | bool | - | Whether a wrong-order dispatch costs a heart. |
| `sequenceScoring` | per-position or longest correct run | - | Product owner decision. |

### 2. Skill mapping

| Param | Stresses | Distortion |
|---|---|---|
| `signMs` | Association (encoding) | None |
| `retentionHoldMs` | Association (retention) | None |
| `similarColours` | Colour discrimination more than memory | **Yes**: a miss may be perceptual, which matters with age-related colour-vision decline. |
| `lives` | Neither | Changes clear rate, not the measure. A round cut short loses data unless untried trains count as misses. |
| `stationCount` | Association (load) | None, if the denominator scales |
| `revealHomeStations` off | Association | Removes the inflation, so the measure gets more valid |
| Sequence params | Sequence | Two memory loads in one round: score each separately. |

### 3. Curation rules

1. Monotone: never lower a parameter's difficulty from one level to the next.
2. One knob per step; exception: `signMs` rises with `stationCount` so time per station stays the same.
3. Step sizes: `signMs` -500 to -1000 ms; `retentionHoldMs` +500 ms; `stationCount` +1; `lives` -1, at most once every 6 levels.
4. Booleans in order: `revealHomeStations` off, then (after a game change) `orderEnforced`, then `similarColours` last.
5. Forbidden: `similarColours` with more than 4 stations; `lives` 1 with `similarColours`; any `signMs` under 750 ms per station; `sequenceLength > stationCount`.
6. A newly added station or feature arrives with the most generous timings.

### 4. Clear and fail

- Keep the round outcome for the player: completed = all trains home (`index.tsx:279`); failed = out of hearts (`index.tsx:306`).
- Base level moves on the measures, not "completed": with 3 hearts, a round with 2 misses still completes at 50% Association.
- Proposal: Clear = Association >= 75% (first-try matches over station count) in 2 of the last 3 rounds, no reset (and Sequence >= 75% once it exists). Fail / demote = 2 rounds in a row out of hearts, or Association < 50%.

### 5. Variety

- Distinct memory problems per level = N! assignments: 3 stations 6, 4 stations 24, 5 stations 120. With 3 stations, choosing 3 of 4 hues gives 24.
- Names add 1680 cosmetic variants (8P4, `palette.ts:43-46`).
- At least 4 versions holds at every level.
- Nothing stops a repeat across rounds (`index.tsx:120-124`); add a "not the same as last round" rule.

### 6. Ladder size and sample

About 12 levels with today's knobs; about 24 with `stationCount` 3-4 and `revealHomeStations`; 30+ only with a fifth hue or the Sequence mechanic.

| Level | Stations | signMs | holdMs | revealHome | similar | lives |
|---|---|---|---|---|---|---|
| 1 | 3 | 7500 | 1500 | on | off | 3 |
| 6 | 4 | 9000 | 1500 | on | off | 3 |
| 12 | 4 | 7000 | 2500 | off | off | 3 |
| 18 | 4 | 5000 | 3500 | off | off | 2 |
| 24 | 4 | 4000 | 4000 | off | on | 2 |

Level 6 matches today's easiest (score 0) plus 1 s of study. Level 24 exceeds today's hardest only through `revealHome` off and `lives` 2. Judgement, not verified with residents.

### 7. Measurement gaps

- Only totals logged (`index.tsx:339-347`); no per-dispatch event (colour, station chosen, attempt, time).
- Arrival order and dispatch order are not recorded, so Sequence cannot be computed.
- `firstTryCorrect` counts only trains that got home (`index.tsx:342`); untried trains on a lost round are not misses.
- The score assumes 4 stations (`GameShell.tsx:447`).
- `retentionHoldMs`, `similarColours` and the open-station count at each choice are not logged; only `signMs` is (`index.tsx:346`). Without the open-station count there is no chance correction.
- Train switches are not logged (`index.tsx:242-246`).

### 8. Open questions

1. Sequence: should trains arrive one by one during encoding, with order costing a heart, or stay deferred with an Association-only ladder?
2. `similarColours`: keep as the top knob despite the perceptual confound, or commission more distinct hues?
3. New art: a fifth hue and a shared neutral station asset (also fixes the grey-station leaks)?
4. Clear threshold: approve 75% in 2 of 3, and 2 lost rounds in a row to demote?
5. Lives: may any level drop to 1 heart?

---

## 3. Spot Focus (`spot-focus`)

Note: `docs/2026-10-16_level-capacity-by-game.md:213` cites `spotFocus.ts:416, 432-438`, but that file has 152 lines. The "one family per board" rule is at `lib/contentGenerators/spotFocus.ts:109,117-119,128`.

### 1. Parameters

Today (`lib/dynamicDifficulty.ts:133-141`): 2-7 differences; 3 columns below 0.4, then 4; always 3 rows; bold below 0.3, medium below 0.7, then subtle. That is 7 distinct states. `levels.config.ts` is dead code.

Content: 199 items in 59 families (`items.ts:34-261`); 38 items form 19 twin pairs over 15 families. Tiers (`spotFocus.ts:65-87`): subtle swaps for its twin; medium for a non-twin relative in the same family; bold for an item from a family not yet on the board (using a second family).

| Param | Unit | Today | Hard min | Hard max | Reason |
|---|---|---|---|---|---|
| differenceCount | count | 2-7 | 1 (hard, code: generator clamps `min(diff,total)`, `spotFocus.ts:94`) | 40% of cells (soft) | Above about 40%, random tapping finds targets. Today's max is 7 of 12 = 58%, so a random tap is right 58% of the time, which destroys the selective-attention measure. |
| subtle differences per board | count | 0 or 6-7 | 0 | 15 (hard, assets: 15 twin families, at most one per family, `spotFocus.ts:109`); 8 recommended (soft) | With 7 of 15 twin families on every board, residents may learn the pairs (unverified). |
| gridCols | count | 3-4 | 3 (soft) | 4 (hard, layout) | Arithmetic from `index.tsx:22-26,99-108`, not measured: on a 360 px phone the side-by-side panels give cards about 44 px at 3 columns and about 31 px at 4, both below the 80 px touch minimum. On a 4:3 tablet (column 64dvh, about 655 px): about 96 px at 3 and 70 px at 4. |
| gridRows | count | 3 fixed (`dynamicDifficulty.ts:136`) | 3 (soft) | 4 (soft, small change) | Layout reads rows from the scene (`index.tsx:81,102`). On phones width binds, so a 4th row costs little: height about 95 to 69 px, width stays near 44 px. Not measured on a device. |
| cells + bold differences | count | at most 19 | n/a | 59 (hard, families, `spotFocus.ts:117-119,128`) | Never binding. |
| tier mix per board | counts per tier | one tier per board (`spotFocus.ts:92,105`) | n/a | n/a | Small change: generator takes a count per tier. |
| round time cap (new) | s | no timer | 60 (soft) | none | Needed so "% found" can vary. |
| wrong-tap tolerance (new) | count | ratio penalty only, 0.15 per tap (`GameShell.tsx:384-388`) | 0 | n/a | Design judgement. |

### 2. Skill mapping

- differenceCount stresses Selective attention; it distorts Response speed (more targets, shorter gaps between finds) and distorts accuracy above 40% of cells.
- Subtlety tier stresses Selective attention most purely; it slows finds legitimately.
- Grid size stresses both (more to scan). Smaller cards make subtle harder to see, an acuity confound elderly users feel most.
- Time cap makes "% found" measurable but censors slow finds; record unfound targets as censored or the median reads too fast.
- Wrong-tap tolerance affects the clear rule only.

### 3. Curation rules

- Monotonic: no knob gets easier from one level to the next; exception, when the grid grows the subtle count may drop by 1 in that step.
- One knob harder per step. Max change: differences +1; one row or one column; at most 2 differences move up a tier; time cap -15 s.
- Coupled: differences <= 40% of cells; subtle <= min(8, 15); cells + bold <= 59; time cap >= 15 s per difference (soft).
- Forbidden: subtle with 4 columns on a phone layout (about 31 px cards hide the twin detail); grid growth and a new tier in the same step; a time cap introduced where subtle first appears.
- Unlock order: bold only; medium mixed with bold; all medium; subtle mixed in, 1 per board; majority subtle; time cap tightened last.
- Granularity: integers; time cap in 15 s steps.

### 4. Clear / fail rule

- Today: `completed: true` hard-coded (`index.tsx:132`); the round cannot end until every difference is found (`index.tsx:123`); no timer, no give-up.
- Proposal: Clear = all found within the cap and wrong taps <= differenceCount. Fail = cap expires, or wrong taps > 2 x differenceCount. When the cap expires, reveal the remaining differences.

### 5. Variety

- Level 1 (3x3, 2 bold): about 10^10 or more distinct rounds.
- Top level (6 subtle of 15 twin families): C(15,6) = 5005 x twin direction (x64) x fill.
- At least 4 versions holds easily. The real risk at the top is perceived repetition of the 19 twin pairs (unverified).

### 6. Ladder size and sample

About 24 levels; the cap comes from the number of knobs, not content.

| Level | Grid | Differences | Bold/Med/Subtle | % of cells | Time cap | Max wrong taps |
|---|---|---|---|---|---|---|
| 1 | 3x3 | 2 | 2/0/0 | 22% | none or 180 s | 2 |
| 6 | 3x3 | 3 | 1/2/0 | 33% | 150 s | 3 |
| 12 | 3x4 | 4 | 0/3/1 | 33% | 120 s | 4 |
| 18 | 4x4 | 5 | 0/2/3 | 31% | 120 s | 5 |
| 24 | 4x4 | 6 | 0/0/6 | 38% | 90 s | 6 |

Levels 12-24 assume a tablet; on a phone, 18 and 24 break "no subtle at 4 columns".

### 7. Measurement gaps

- No per-find timestamps; `handleTap` (`index.tsx:111-126`) records no time. Proposed Response speed: start = board shown; intervals = board to first correct tap, then time since the previous correct tap; take the median.
- The start point is the mount effect (`index.tsx:76-78`), not first paint; the board may be measured after mount (`boardWidth` undefined until then, `index.tsx:100`).
- `durationSeconds` is floored to whole seconds and stamped on Continue (`index.tsx:128-131`), so it includes the 700 ms delay (`index.tsx:123`) and time on the completion screen.
- Wrong taps are a bare count, with no time or cell; repeat taps on one wrong cell each count (`index.tsx:115-117`).
- Level params (grid, tier mix, `fallbacksUsed`, `spotFocus.ts:35`) are not logged.
- Not checked: whether exiting mid-round logs partial finds.
- `items.test.ts:43-62` sizes checks from `getSpotFocusParams(1)`; retarget to the ladder maximum.

### 8. Open questions

1. Target device: phone or tablet? Decides the column max and whether subtle can ever appear at 4 columns.
2. How does a round end without every difference found: time cap, "I can't find it" button, or both?
3. Response speed as the median gap between finds? (C11 deferred.)
4. Is the Mahjong fork in `level-capacity-by-game.md` still alive? It changes this ladder entirely.
5. Commission more twin pairs to raise the subtle ceiling above 15?

---

## 4. Garden Keeper (`garden-keeper`)

### Key findings that correct earlier docs

- **Self-control is not really measurable today.** Hazards have no cycle and stay as fixed scenery (`index.tsx:439`, `index.tsx:541-551`), so there is no don't-tap event with a time window, only a fixed set of objects.
- **Hearts cap the errors.** Each false tap costs a heart and the round ends at 0 (`model.ts:155-157`, `index.tsx:550`). With 3 lives, "% left alone" records only 0-3 errors: a strong ceiling effect.
- **Sustained attention has no "last third".** The round ends the moment `watered >= targetCount` (`index.tsx:584`); a competent player at level 1 (target 8) finishes in roughly 30 s.
- **"Wide before fast" is not implemented.** The comment says so (`dynamicDifficulty.ts:353-358`), but every knob interpolates from the same score (`:363-368`); only concurrency steps.
- **The winnability test overstates capacity.** It multiplies by concurrency (`lib/__tests__/gardenKeeperParams.test.ts:57`), but each spawner fire sprouts at most one plant (`model.ts:197-207`, `index.tsx:500-504`). The real cap is `floor((90000-900)/interval)+1` windows: 30 at easiest, 75 at hardest.
- **Hidden flower-pool limit.** A watered flower cannot re-sprout for `bloomHold + 2600` ms (`model.ts:4`, `:148`, `:108-115`). At score 1 that needs about (6500+2600)/1200 + 3 = 10.6 free flowers; only 11 exist (24 x 0.45). Fires get skipped near the top.
- **The capacity doc's "about 35 objects" looks too high.** Columns cap at 5 (`geometry.ts:130-132`); front sprites draw at 96 x 1.14 = 109 px (`geometry.ts:241`, `:120-122`). 35 objects = 7 rows at 100 px pitch. Even 24 (116 px column pitch, +/-16 px jitter, `:236`) may already overlap hit boxes. Not verified on a device.

### 1. Parameters

All current ranges from `dynamicDifficulty.ts:363-371`.

| Param | Unit | Current | Hard min | Hard max | Reason |
|---|---|---|---|---|---|
| plantCount | objects | 12-24 | 8 (soft) | 30 (hard, layout) | 5 columns max; 30 = 5x6 at 117 px row pitch. Beyond, rows fall below the 109 px sprite. Needs a hit-overlap test. |
| distractorRatio | share | 0.25-0.55 | enough for >= 2 hazards: 1 wilted + 1 pest (hard, to measure) | flowers >= pool rule (hard) | Split is `ceil(n/2)` wilted (`geometry.ts:206-209`). Pest pool 9 entries, 8 unique (`palette.ts:42-52`). |
| targetCount | waterings | 8-20 | 8 (soft) | <= 60% of guaranteed windows (soft) | Ends the round today; becomes a clear threshold under the proposal. |
| spawnIntervalMs | ms | 3000-1200 | 1000 (soft, older-adult reaction + movement) | 3000 (soft, keeps >= 10 fires per third) | The 100 ms tick (`index.tsx:516`) is not binding. |
| thirstWindowMs | ms | 6000-2800 | 2500 (soft, older-adult choice reaction ~1 s plus reach across 800 px) | 6000 (soft) | Must stay below bloomHold (test, `gardenKeeperParams.test.ts:62-69`). |
| bloomHoldMs | ms | 11000-6500 | > window (hard, test) | 12000 (soft) | Also feeds the pool rule. |
| maxConcurrentThirsty | targets | 1-3 | 1 | `ceil(window/interval)` (hard, maths); 3 (soft) | No code cap (`model.ts:202-203`). |
| roundDurationMs | ms | fixed 90000 | 90000 | 90000 | Fixed so thirds compare. |
| lives | hearts | fixed 3 | 3 | 5 (soft) | See section 4. |
| DRIED_HOLD_MS, first-sprout delay | ms | 2600, 900 | constants | | `model.ts:4`, `index.tsx:518`. |

Small-change knobs: wilted vs pest split; same-species bloom/wilted lures (`geometry.ts:172-175`); **transient no-go events** (a pest that appears with its own timer, needed for self-control); ring colour cue (`geometry.ts:147-151`).

### 2. Skill mapping

- plantCount, distractorRatio: search load and lure density; stress self-control and selective search; no distortion.
- interval, window, concurrency: time pressure; stress sustained attention but also speed. A short window turns lapses into speed failures, so the 2.5 s floor keeps it about attention.
- lives: distort both measures (cap commission errors; running out ends the round before the last third).
- targetCount (current behaviour): distorts sustained attention by truncating the round.

### 3. Curation rules

1. Monotonic: plantCount, ratio, concurrency never decrease; interval, window, bloom never increase.
2. One pressure axis per step, interleaving load and speed (the real way to get "wide before fast"). Load first; speed steps from about 30% of the ladder. Concurrency 1 to 2 only after plants >= 15; 2 to 3 only after plants >= 21.
3. Max change per step: +1 to 2 plants; +0.03 ratio; -150 ms interval; -250 ms window; -500 ms bloom; concurrency +1 with no other knob moving.
4. Coupled (hard): `bloom > window`; `concurrency <= ceil(window/interval)`; `flowers >= (bloom+2600)/interval + concurrency`; `floor(89100/interval)+1 >= targetCount / 0.6`.
5. Guaranteed windows per third: at least 10 per 30 s third, and at least 3 no-go opportunities per third once they exist. With 10, one lapse moves accuracy 10 points; below 6 it is noise. Presentation is only guaranteed when `window <= interval x concurrency`. Today's easiest setting breaks this (window 6000, interval 3000, concurrency 1 gives about 3-5 windows per third for a non-responding player).
6. Forbidden: concurrency > `ceil(window/interval)`; window <= interval x 0.9 at concurrency 1 (dead air); a ratio leaving fewer than 1 pest.

### 4. Clear and fail

- Proposal: the round always runs the full 90 s, with no early finish. Clear = hearts > 0 AND hit rate (watered / presented windows) >= threshold (suggest 70%, owner sign-off). Fail = hearts gone, or time up below threshold. `targetCount` becomes informational or the threshold.
- Today: `completed = outcome==='complete'` (`index.tsx:610`), and the score ignores driedUp (`model.ts:239-244`).

### 5. Variety

- Every level is random: 10 flower species per slot (`palette.ts:11-14`), jittered positions, shuffled pest pool, random spawn order (`model.ts:206`). At least 4 versions holds trivially (well over 10^9).
- Perceived variety is thin at level 1: 12 x 0.25 = 3 hazards, so 2 wilted and only one pest.

### 6. Ladder size and sample

About 24 levels (about 12 plant steps plus about 12 interval steps, interleaved, window and bloom riding along). About 13 steps without raising caps (agrees with the capacity doc). Proposal, checked against the rules above, not play-tested.

| Level | Plants | Ratio (wilted/pest) | Flowers | Interval | Window | Conc | Bloom | Target | Round | Lives |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 12 | 0.25 (2/1) | 9 | 3000 | 3000* | 1 | 11000 | 8 | 90 s | 3 |
| 6 | 15 | 0.33 (3/2) | 10 | 3000 | 4500 | 2 | 10000 | 10 | 90 s | 3 |
| 12 | 18 | 0.40 (4/3) | 11 | 2200 | 4400 | 2 | 8800 | 14 | 90 s | 3 |
| 18 | 21 | 0.48 (5/5) | 11 | 1700 | 3400 | 2 | 7500 | 17 | 90 s | 3 |
| 24 | 24 | 0.55 (7/6) | 11 | 1200 | 2800 | 3 | 6500 | 20 | 90 s | 3 |

\*Level 1 trade-off: a 3000 ms window guarantees 10 windows per third but halves today's 6000 ms. Level 24 sits exactly at the pool limit (10.6 <= 11).

### 7. Measurement gaps

- Only totals plus a mean reaction time (`model.ts:214-232`); per-window data stays local (`reactions[]`, `model.ts:151`).
- Missing: each window (sprout time, plant id, outcome + timestamp); each false tap (timestamp, hazard kind, species); round start time for thirds.
- Taps on not-ready or dried flowers show a toast and log nothing (`index.tsx:589-595`): possible commission errors.
- No denominator for "items left alone" (no no-go trials).
- Never split into thirds; windows forgiven on resume (`model.ts:160-172`) need flagging.
- D9 asks for the median reaction time; only the mean is sent.

### 8. Open questions

1. Redefine self-control as false taps per minute or per hazard, or build transient no-go pests so "% left alone" has real trials?
2. Always run 90 s (drop the early finish) so thirds exist?
3. Keep 3 hearts? They cap self-control errors and cut rounds short. Alternative: no game-over, heart loss as feedback only.
4. What hit-rate threshold clears a level?
5. Level 1: a generous 6 s window, or at least 10 measurable windows per third?

Files: `lib/dynamicDifficulty.ts`, `games/attention/GardenKeeper/{model.ts,index.tsx,geometry.ts,palette.ts}`, `lib/__tests__/gardenKeeperParams.test.ts`.

---

## 5. Tiffen Time (`serve-guests`)

Paths relative to `src/games/executive/ServeTheGuests/` unless given.

### Corrections to earlier docs

- The capacity doc's line references drifted: seats and guests are at `model.ts:12-13` (not 27-28); interaction code at `model.ts:259-331`.
- The game, not the player, picks which guest gets a served dish: `tapDish` gives it to the waiting guest with the least patience left (`model.ts:276-288`).
- The 2026-08-11 spec says 8 dishes and 3-6 s cooks; the code has 6 dishes (`model.ts:103`) and 3-7.5 s cooks (`sprites.ts:60-81`).
- Guests do have patience timers (`model.ts:70-72, 195-204`), shown as a green/amber/red bar (`index.tsx:315-316`). But patience is set entirely by order size, `26 + 9 x items` (`model.ts:25-26, 151`), so urgency differs only through arrival stagger and order size. No independent urgency signal.

### 1. Parameters

| Param | Unit | Today | Hard min | Hard max | Reason |
|---|---|---|---|---|---|
| `seats` | guests at once | 4 const (`model.ts:12`) | 1 hard (code); **2 soft** so Decision-making is measurable | **4 hard (layout)** | `SEAT_W = CANVAS_W/SEAT_COUNT` (`geometry.ts:113`); at 4 the busts already touch (`geometry.ts:124-128`). |
| `counterSize` | dish cards | 6 const (`model.ts:103`) | >= `maxItems` (hard, code: orders drawn from the counter, `model.ts:145`); 2 soft | **6 hard (layout)** | 3 columns (`geometry.ts:68`); a third row makes a card 214 px tall < image 196 + name 44 + button 68 (`geometry.ts:89-104`). Whole card is the tap target, 270x322 canvas px (`index.tsx:517-528`). |
| `minItems` / `maxItems` | dishes per order | min 1 const, max 1/2/3 (`dynamicDifficulty.ts:323-327`), uniform draw (`model.ts:143`) | 1 hard | 3 soft (design rule, `docs/cooking-game-basic-design-rules.md:4`) | The bubble wraps after 2 (`geometry.ts:162-167`); 4 might fit as 2x2, unchecked. Items in one order are distinct (`model.ts:147-149`). |
| `guestsPerRound` | guests | 8 const (`model.ts:13`) | `seats` (soft) | ~12 soft (timing) | The spec measured 27-96 s rounds at 8 guests (`docs/superpowers/specs/2026-08-11-serve-the-guests-design.md:156-169`). More guests = longer rounds; D4 lets a level run past the 10-minute threshold. |
| `patienceBase` / `patiencePerItem` | s | 26 / 9 (`model.ts:25-26`) | soft: longest cook in the set + time for 2 taps per item; needs research | soft ~45 / 12 | A cook cannot be hurried (`model.ts:264`). Too low a floor tests motor speed, not planning. |
| `patienceSpread` (new) | +/- fraction | 0 | 0 | soft ~0.3 | Urgency independent of order size; needed for Decision-making. |
| `readyWindow` | s | 11 (`model.ts:16`) | > `SPOIL_RAMP` = 3, hard (code) (`model.ts:22, 350`); soft 8 | soft ~20 | Above ~20 s dishes effectively never burn. |
| `cookBand` (new) | which dishes | all 22, 3-7.5 s (`sprites.ts:60-81`) | >= `counterSize` dishes in band (hard) | n/a | Short band (<= 4.5 s): 8 dishes. Long band (>= 6 s): 8 dishes. Long cooks force planning ahead. |
| `respawnGap` | s | 0.9 + 0-1.4 random (`model.ts:30-31, 208`) | 0 hard; 0.9 soft | soft ~5 | Opening stagger 0-5.2 s (`model.ts:29`). |
| `orderSteps` (new) | steps | none | n/a | n/a | No mechanic exists. |

### 2. Skill mapping

- **Decision-making** is stressed by `seats`, `patienceSpread`, `counterSize`, `cookBand`, `readyWindow`.
  With `seats = 1`, or equal patience for every guest, there is no "most urgent" order, so the measure is undefined: `seats >= 2` at every scored level.
  The game auto-picks the guest (`model.ts:276-288`), so the only real decision is what to cook first. Either redefine the measure as "the cook started was for the most urgent unmet item", or give guest choice back to the player.
- **Sequencing** is not trained by any parameter. One tap to cook, one to serve; items in any order (`docs/2026-10-08_skill-coverage-by-game.md:98`). Raising `maxItems` adds load but no order. Needs a new mechanic: multi-step dishes (prepare > cook > plate) or a required order within an order.
- Distortion: the speed bonus (`model.ts:41, 309`) and short patience reward tapping fast, not planning well.

### 3. Curation rules

- Monotonic: no parameter gets easier from level N to N+1; relieve one axis only if another gets harder in the same step.
- One axis per step. Max step: seats +1, counter +1, maxItems +1, patience -2 s per item or -3 s base, readyWindow -1 s, guests +1.
- Coupled: `counterSize >= maxItems + 1`; patience floor >= longest cook in the band + 2 taps x ~3 s per item (soft); longer cook band raises patience by the same amount; `guestsPerRound >= 2 x seats`.
- Forbidden: `seats = 1` with scored Decision-making; `readyWindow <= 3`; `counterSize < maxItems`; max items + min patience + long cooks together without a playtest.
- Unlock order: seats 2 > 3 > 4; counter 3 > 6; items 1 > 2 > 3; cook bands; patience spread; shorter patience and ready window. Sequencing steps last, once they exist.
- Granularity: integers in whole steps; seconds in 1 s steps.

### 4. Clear / fail rule

- Today `completed: true` is hard-coded (`index.tsx:109`). Performance is `itemsServed/itemsRequested - min(0.3, 0.05 x burnt)` (`components/GameShell.tsx:459-467`): throughput, not either skill.
- Proposal: Clear = >= 80% of items served and <= 1 walkout. Fail = < 60% served or >= 3 walkouts. In between: replay. All inputs already exist in the metrics (`index.tsx:110-117`).

### 5. Variety

- Highest level: C(22,6) = 74,613 counters x random orders x faces (10 faces, `sprites.ts:278-291`).
- Lowest level: a 3-dish counter gives C(22,3) = 1,540 counters.
- An 8-dish cook band dealt 6 at a time still gives 28 counters, with random orders on top. At least 4 versions holds at both ends.

### 6. Ladder size and sample

About 30 levels (an estimate; the capacity doc estimated 30-60 steps).

| Param | L1 | L8 | L15 | L23 | L30 |
|---|---|---|---|---|---|
| seats | 2 | 3 | 4 | 4 | 4 |
| counterSize | 3 | 4 | 5 | 6 | 6 |
| items (min-max) | 1-1 | 1-2 | 1-2 | 1-3 | 2-3 |
| guestsPerRound | 6 | 8 | 8 | 10 | 12 |
| patience base / per item (s) | 40 / 10 | 34 / 9 | 30 / 9 | 26 / 9 | 22 / 8 |
| patienceSpread | 0.15 | 0.15 | 0.2 | 0.25 | 0.3 |
| readyWindow (s) | 16 | 14 | 12 | 11 | 9 |
| cookBand | short | short + mid | all | all | long-weighted |
| respawnGap (s) | 2.5-4 | 1.5-3 | 1.2-2.6 | 0.9-2.3 | 0.9-2.3 |
| orderSteps | TBD | TBD | TBD | TBD | TBD |

L23 is roughly today's top band. L30 is unvalidated; it needs a timing playtest with residents.

### 7. Measurement gaps

- Cook and serve taps are not logged: no timestamp, no snapshot of each guest's patience at the tap. Both are needed for "most urgent first".
- Wasted cooks (a dish nobody ordered) are silent (`model.ts:292-297`).
- No per-order step log (no steps exist), so Sequencing cannot be computed.
- Metrics are round totals only (`index.tsx:110-117`); no per-guest records (arrival, patience, serve order, walkout time).

### 8. Open questions

1. Sequencing: add a step mechanic, or drop Sequencing for this game?
2. Guest choice: should the player choose which guest to serve, or measure Decision-making by which dish they cook first?
3. Clear rule: what % served and how many walkouts count as a clear?
4. Speed floor: the shortest patience, or fastest tap rate, we may ever ask of a resident?
5. On-screen points (10 per item, +10 per completed guest, up to +20 speed bonus, `model.ts:39-41`; HUD `index.tsx:258`; end screen `index.tsx:287`) feed nothing in grading. Keep, remove, or replace with the level number? The speed bonus rewards motor speed.
6. Spelling: "Tiffen" or "Tiffin"? The docs use both.

Uncertainties: the 4-item layout, the per-tap reaction allowance, every L30 timing, and real-phone card size are untested.

---

## 6. Free Me (`clear-the-way`)

The agent ran the game's real solver over all 10 shipped puzzles. "Measured" values come from that run.

### 1. Parameters / descriptors

| Descriptor | Unit | Today (10 puzzles) | Hard min | Hard max | Reason / kind |
|---|---|---|---|---|---|
| Board size (cols x rows) | cells | 4x4, 5x5, 6x6 (`levels.ts:20-197`) | 4 | 6 | Max **hard (layout)**: `MIN_CELL = 41` is the largest cell at which a 6x6 fits a 360 px phone (`geometry.ts:8-26`); 7x7 spills off. Min soft. The parser accepts non-square boards (`model.ts:77-84`), none ship (untested). |
| Optimal moves (`minMoves`) | slides, any distance = 1 (`solver.ts:4-7`, `model.ts:230`) | 2-13 | 2 | 16 | Both soft. Test bands T1 2-3 up to T5 10-16 (`levels.test.ts:11-17`). Nothing ships above 13, so 14-16 is unverified. |
| Obstacle count | pieces | 4-11 (measured) | 1 | ~12 | Min hard: `minMoves > 0` asserted (`levels.test.ts:46`). Max soft (density is the practical limit). |
| Density | occupied / total cells | 0.44-0.75 (measured) | ~0.4 | ~0.8 | Soft. The hardest boards come from packing tight, not a bigger board (spec:205-207). |
| Piece length | cells | 1-3 | 1 | 3 | Hard (code): `MAX_PIECE_LENGTH = 3`, straight only (`model.ts:65, 116-121`); sprite art only for s1, h2/h3, v2/v3 (`sprites.ts:37-50`). |
| 1x1 pieces | count | 0-3 (measured) | 0 | 0 on 6x6, <= 3 on 4x4 | Soft, backed by layout: a 1x1 at 41 px is half the 80 px touch minimum (`geometry.ts:12-20`); a 1x1 can also sidestep a dependency chain (spec:102-107). |
| Blocks that must move | pieces | 1-10 (measured) | 1 | = obstacle count | Derived; not stored in `LevelDef` (`model.ts:51-61`). |
| Dependency depth (moves before the fish's first move) | moves | 1-10 | 1 | `minMoves - 1` | Stored and solver-checked (`levels.test.ts:36-37`); deliberately not banded (spec:209-212). |
| Exit side | enum | right only (`levels.ts:13-14`) | - | 4 sides | Model supports four (`model.ts:248-257`); top/bottom need a vertical key (`model.ts:136-142`). Non-right exits not visually verified. |
| Hint unlock ratio | x minMoves | 2 (`index.tsx:40, 277`) | - | - | Soft. A global constant today, not per level. |
| Solver state budget | states | < 200k | - | 200,000 | Hard (code): `MAX_STATES` (`solver.ts:33`). The hint solves live from the current board (`index.tsx:254-256`, `solver.ts:81-83`); reef-10 took 532 ms from its start on a dev PC. Tablet timing unverified, so the generator should cap state count per puzzle. |

### 2. Skill mapping

- Optimal moves, depth, blocks that must move push both skills: look-ahead (Planning) and solving alone (Problem-solving).
  Distortion: Planning = min/used, so one wasted move costs much more on a short puzzle (2-move puzzle: 67; 13-move puzzle: 93). Raw Planning scores are not comparable across levels; compare within a level or normalise.
- Density and obstacle count mostly push Problem-solving (more ways to get stuck).
- Board size mostly changes moves available per turn (8-13 legal moves at start, measured); close to neutral for Planning. A cramped 6x6 on a phone adds motor error, and a drag slip counts as a move (`index.tsx:178-183`), wrongly lowering Planning.
- 1x1 pieces distort both (hard to drag, shorten chains).
- Hint ratio directly changes Problem-solving (no hint before 2 x minMoves).
- Puzzle repeats are the biggest distortion: a remembered solution scores perfectly on both (grading-review:108-109).

### 3. Curation rules

- Bucket by `minMoves`, ties broken by depth, then obstacle count.
- Monotonic: `minMoves` and board size never go down; density and obstacles non-decreasing within one board size.
- Max step: `minMoves` +1; board size +1 step only at the start of a new `minMoves` value.
- Hold fixed while another rises: when the board grows, hold `minMoves` (or drop to the band floor); reef-03 is 4 moves on 5x5. When `minMoves` rises, hold board size and exit side.
- Forbidden: any 1x1 on 6x6; non-right exits before the last third (if used at all); fewer than 2 must-move blocks after level 1; a puzzle the solver cannot finish within budget.
- All variants in a level share board size and `minMoves`; depth may differ by +/-1. reef-08 shows why depth needs its own column: 8 moves but depth 3, because the fish moves twice.

### 4. Clear / fail rule

- Today every round reports `completed: true` (`index.tsx:265`).
- Proposal: Clear = solved with 0 hints and 0 restarts. Fail = any hint, any restart, or leaving mid-puzzle. Planning efficiency reported alongside, not gating. A move ceiling is an open question.

### 5. Variety

- Today: 2 puzzles per tier, 10 total (`levels.test.ts:20-23`). The avoid-repeats buffer holds 4, already more than any shelf (`clearTheWay.ts:13-30`).
- Needed: at least 4 per level (120+ for 30 levels); 8-10 per level is better against memorised solutions.
- Offline generator (method at spec:171-178): pick a piece set; enumerate the reachable state space; multi-source BFS from solved states; keep boards inside the guardrails; dedupe by canonical form; emit `LevelDef` with every descriptor (level, must-move, density, obstacles, state count); keep solver assertions in CI (`levels.test.ts:36-42`).
- Cheap extra variants: a top-to-bottom flip keeps `minMoves` and depth exactly (only the exit row changes). Left-right flips and rotations also preserve the numbers but move the exit to an unshipped side. These help against recognising the board, less against a remembered solution.

### 6. Suggested ladder: 30 levels

`minMoves` 2-16 gives 15 values; about two levels per value, the second denser or deeper.

| Level | Board | Optimal moves | Obstacles | Must move | Depth | Density | 1x1 max | Exit | Hint after | Anchor |
|---|---|---|---|---|---|---|---|---|---|---|
| 1 | 4x4 | 2 | 4 | 1 | 1 | ~0.45 | 3 | right | 2x | reef-01 |
| 8 | 5x5 | 4 | 6 | 3 | 3 | ~0.55 | 1 | right | 2x | reef-03/04 |
| 15 | 6x6 | 7 | 8 | 5 | 5-6 | ~0.58 | 0 | right | 2x | reef-05 |
| 23 | 6x6 | 10 | 10-11 | 6-7 | 7 | ~0.68 | 0 | right | 2x | between reef-07 and reef-10 |
| 30 | 6x6 | 15-16 | 11-12 | 8-10 | 8-12 | ~0.75 | 0 | right | 2x | none; volume unverified |

### 7. Measurement gaps

The game already logs `movesUsed`, `minMoves`, `resets`, `hintsUsed`, `levelKey`, `tier` (`index.tsx:266-273`), so both measures can be computed per solved round. Gaps:

1. Leaving mid-puzzle is invisible: only `session_interrupted`, with no `levelKey`, moves or hints (`GameShell.tsx:235-240`). Unsolved puzzles drop out, so Problem-solving reads too high.
2. The move count runs through a restart (`index.tsx:250-251`), so Planning on a restarted round mixes two attempts.
3. Depth, level number and must-move are not logged.
4. Repeat exposure is not tracked: the avoid-repeats buffer is in-memory and empties on reload (`clearTheWay.ts:9-14`).
5. The move sequence is not logged (only matters if research wants it).

### 8. Open questions

1. Fixed puzzle per level for everyone (best for research), or a random variant from the level's pool?
2. Should a restart count as a fail?
3. A move ceiling (for example 3x optimal) that ends the round as unsolved?
4. Planning on a restarted round: moves since the last restart, or all moves?
5. Keep the 2x hint unlock fixed, or vary per level?
6. Is it acceptable that the board stops at 6x6, with all later difficulty from density and optimal moves?
