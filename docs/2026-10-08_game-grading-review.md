# Game Grading Breakdown and Review

**Date**: 2026-10-08
**Content Type**: Analysis

This document has two parts.
The first breaks down how each of the six daily-rotation games grades a round: scoring, hints and difficulty.
The second collects the problems found by two parallel reviewers, one looking from a game design view and one from a prescription and clinical measurement view.
Both reviewers checked their claims against the code and the spec documents in `docs/scoring and end/`.
The most serious claims were re-checked by hand.

Source: the code on `feat/app-flow-redesign` at `a4f1051` (v1.35.1).
Companion to `docs/scoring-implementation-analysis.md` (2026-09-30), which lists the four research-team blockers.

## Part 1 - Breakdown

### The shared engine

All six games use the same engine.
Each game turns its round metrics into a performance ratio from 0 to 1 (`computePerformanceRatio` in `src/components/GameShell.tsx`).
`adjustDifficulty` (`src/lib/dynamicDifficulty.ts`) then updates a hidden difficulty score, also 0 to 1:

- A completed round adds 0.05 × (0.5 + ratio), so between +0.025 and +0.075.
- A failed round subtracts 0.08.
- The next day starts at 0.8 × yesterday's peak.
- The resident sees the score only as "Level 1-10" on the board.
- The after-game score card (`getScoreCard` in `src/lib/scoreCard.ts`) is still a placeholder that returns null for every game.

### Table 1 - How a round plays

| Game | What difficulty changes (score 0 → 1) | How a round ends | Hints and helpers | What the resident sees |
|---|---|---|---|---|
| **Market Memory** (memory) | List of 3→6 items. Memory hold 1.5→4 s, plus 2.5 s from 0.55. Lookalike decoys from 0.25. Single-category list from 0.75. | Can't fail. Ends when they finish shopping. | **2 hints** per round, each shows one list item for 3 s. | ✓ / ✗ result card. Confetti only on a perfect round. |
| **Train Yard** (memory) | Station names shown 8→3 s. Blind held 1.5→4 s. Similar train colours from 0.6. Always 4 trains and 3 hearts. | **Fails** when the 3 hearts are gone (a wrong station costs a heart). | No hints. **Reset**: hearts not restored, and it counts against the score. | Hearts, a "Not this one" message, then "Round complete" or "Out of hearts". |
| **Spot Focus** (attention) | 2→7 differences. Grid widens from 3 to 4 columns at 0.4. Changes go bold → medium → subtle at 0.3 and 0.7. | Can't fail, no timer. Ends when every difference is found. | None. | "x / y Found", then "You found all n!" |
| **Garden Keeper** (attention) | 12→24 plants. Wilted-flower distractors 25→55%. Target 8→20 waterings. New sprout every 3→1.2 s. Each sprout can be watered for 6→2.8 s. 1→3 thirsty at once. Always 90 s and 3 hearts. | **Fails** on running out of hearts (tapping a wilted flower or pest costs one) or when the 90 s runs out. | None. Tapping a healthy flower too early gives a "Not ready yet" nudge, with no penalty. | Hearts, a "WATERED x / target" bar, then a summary with how many dried up. |
| **Serve the Guests** (executive) | **One setting**: up to 1 / 2 / 3 dishes per guest, stepping up at 0.34 and 0.67. Always 8 guests. | Can't fail. Ends after the 8th guest. Waiting guests eventually give up and leave, and a dish burns if left ready for 11 s. | None. | **The only on-screen points score**: 10 per item, +10 per fully served guest, up to +20 for speed. Then "You looked after x of 8". |
| **Clear the Way** (executive) | **One setting**: a puzzle tier from 1 to 5, one per fifth of the score. Puzzles are hand-picked and checked by a solver, 10 in total (two per tier). | Can't fail, no timer. Ends when the fish is free. | **"Show me"** is unlocked only after the player has used twice the fewest possible moves. **"Start over"**, and the move counter keeps running. | Move count against the fewest possible moves, then "You did it in n moves. Best possible: m." |

### Table 2 - Grading (what feeds difficulty)

| Game | Metrics logged | Performance ratio (0-1) | Logged but not used in the ratio |
|---|---|---|---|
| **Market Memory** | correct, wrong, missed, listLength, hintsUsed | correct/listLength − 0.15 × wrong − 0.05 × hints | missed (only counted indirectly, through correct) |
| **Train Yard** | trainsHome, firstTryCorrect, wrongDispatches, resets, livesLeft, signMs | firstTryCorrect/4 − 0.1 × resets | wrongDispatches, livesLeft |
| **Spot Focus** | differencesFound, totalDifferences, falseTaps | 1 − 0.15 × falseTaps | **time taken** (finding everything is required to finish, so speed is the only thing that could vary) |
| **Garden Keeper** | watered, targetCount, falseTaps, driedUp, meanReactionMs, livesLeft | (watered/target + watered/(watered + falseTaps)) / 2 | **meanReactionMs** and driedUp |
| **Serve the Guests** | itemsServed, itemsRequested, guestsFullyServed, dishesBurnt | itemsServed/itemsRequested − min(0.3, 0.05 × burnt) | the on-screen points and speed bonus, guestsFullyServed |
| **Clear the Way** | tier, levelKey, movesUsed, minMoves, resets, hintsUsed | minMoves/movesUsed − 0.1 × resets − 0.15 × hints | time taken |

### What stands out in the breakdown

1. **In 4 of the 6 games, difficulty can only go up during a day.**
   Market Memory, Spot Focus, Serve the Guests and Clear the Way always report `completed: true`, and a completed round always adds at least +0.025.
   A poor round just goes up more slowly.
   Only Train Yard and Garden Keeper can fail a round and get the −0.08.
   The 0.8 drop at the start of the next day is the only other way down.
2. **Speed is measured but never used.**
   Garden Keeper records reaction time and nothing reads it.
   Spot Focus and Clear the Way don't count time at all.
   The spec's 1.0-3.0 s response-time measures would need new telemetry in four games.
3. **Penalty weights differ between games.**
   A wrong answer costs 0.15 in Market Memory and Spot Focus.
   A hint costs 0.05 in Market Memory and 0.15 in Clear the Way.
   A reset costs 0.1 in Train Yard and Clear the Way.
   Nobody chose these numbers on research grounds, so ratios can't be compared across games.
4. **Serve the Guests shows points that have no connection to grading.**
   The resident sees speed-weighted points, but difficulty ignores them.
   Those points may also conflict with the score card's rule of showing words, not numbers.
5. **Two games have only one difficulty setting.**
   Serve the Guests has three steps and Clear the Way has five tiers, so a long run of rounds gets the same difficulty.
6. **Spot Focus's ratio can only distinguish "careful" from "careless".**
   Any round with no wrong taps scores 1.0, the maximum.

## Part 2 - Review findings

The most important finding is a plain bug: **progression almost never carries over from one day to the next.**

### Problems both reviewers found

1. **Progress resets most days. Confirmed.**
   `getYesterdayDifficultyState` (`src/lib/db.ts:197`) only looks for a record dated exactly yesterday.
   The daily trio always alternates between a category's two games, so each game comes round every other day.
   The lookup misses and the game starts again at Level 1.
   A missed day or a weekend does the same for every game.
   In practice adaptive difficulty works within one 2-minute visit and nowhere else.
2. **Four games can only get harder.**
   Market Memory, Spot Focus, Serve the Guests and Clear the Way always report the round as completed, so even a very poor round gains at least +0.025.
   Struggling residents get pushed up, which risks frustration and dropout, and the level becomes useless as an outcome.
3. **Each game uses different penalties, set by guesswork.**
   A hint costs 0.05 in Market Memory and 0.15 in Clear the Way.
   A wrong answer costs 0.15, so two Market Memory hints cost less than one wrong pick.
   A hint that shows the answer mid-recall makes that round invalid as a recall measure.
4. **Spot Focus and Clear the Way always score 100.**
   Spot Focus can't end until every difference is found, and Clear the Way can't be failed.
   Spot Focus also climbs at full speed for anyone who taps carefully.

### Game design

- **Climbing is too slow to matter.**
  A 2-minute visit fits 1-4 rounds, so a resident gains at most about +0.3 and from Level 1 rarely gets past Level 2-3.
  Session length sets the challenge, not skill.
- **Residents can see their level drop.**
  "Last time: level n" falls overnight, by 20% at best and usually back to 1.
  This contradicts the score card's rule of never framing a result as a drop.
- **Serve the Guests shows a points score that nothing else uses.**
  It's the only game showing numbers, and it rewards speed that grading ignores.
- **Clear the Way has only 10 puzzles, two per tier, and repeats aren't avoided.**
  Residents will learn the solutions by heart, so move efficiency will measure memory instead of planning.
- **Garden Keeper ignores lateness and reaction time.**
  The game says "Too late for this one", but flowers drying up costs nothing.
- **"Level 5" means something different in each game.**

### Prescription

- **The difficulty rules are part of the treatment, but nothing versions them.**
  Any retune silently changes the dose mid-study, and the events don't record which algorithm version a resident got.
- **The dose isn't defined.**
  Real time on task varies by game and speed.
  Free-play rounds also feed difficulty, because the guard only excludes debug rounds and Picture Postcard.
  Nothing marks a round as free play, so prescribed and unprescribed play can't be told apart.
- **There's no research data store.**
  Data goes only to Amplitude.
  Difficulty history lives only on the device, and the "Clear & reset" that old tablets need deletes it.
- **Timestamps are wrong after offline play. Confirmed.**
  Queued events are sent with the time they were flushed, not the time they happened (`src/lib/analytics.ts:47`).
  The day also rolls over at 05:30 IST because dates are in UTC.
- **Telemetry the spec needs is missing.**
  No game logs individual response times; Garden Keeper logs a mean, but the spec asks for a median.
  There's no delayed recall and no switch cost.
  About half the skills on the score card can't be computed.
- **Scores from different games can't be combined.**
  Each formula is ad hoc, so averaging them into a domain score, as the spec asks, wouldn't mean anything.
- **Debug rounds share the resident's identity, and there's no consent capture anywhere in the app.**

## Recommended next steps

1. **Fix the reset bug now.**
   Base the starting difficulty on the last day the game was played, with some decay for days missed.
   It's small, testable and not blocked by research.
2. **Fix the timestamps now.**
   Send the original event time and use local dates for the day boundary.
   These are cheap correctness fixes.
3. **Leave the rest for the research team.**
   Everything else is a design choice.
   Add it to the options paper alongside the four blockers in `docs/scoring-implementation-analysis.md`.
