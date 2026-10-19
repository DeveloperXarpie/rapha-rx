# Free Choice vs a Prescribed Session

**Date**: 2026-10-12
**Content Type**: Analysis

There is an open debate about letting residents pick any game they want instead of playing the daily trio the app chooses.
This document sets out what that would change, the pros and cons, and the knock-on effects on difficulty, game design and measurement.
It builds on `docs/2026-10-08_game-grading-review.md`, `docs/2026-10-08_skill-coverage-by-game.md` and `docs/scoring-implementation-analysis.md`.

Source: the code on `feat/app-flow-redesign` at `6739b0c` (v1.35.2).

## What "prescribed" means today

The prescription is carried by three things in the code:

1. **Coverage.** `pickTrio()` (`src/lib/sessionPlan.ts`) always gives one game per category, in the fixed order memory, attention, executive.
   Every session trains all three domains.
2. **Dose.** Each category runs for about two minutes (`ROTATION_THRESHOLD_SECONDS`), so the session has a roughly fixed length and split.
3. **Variety.** The trio never repeats a category's game from the previous session, so a resident alternates between the two marquee games in each category.

Free choice already exists, but only after the session is done, through Free Play (`/app/free-play`), which offers all 15 games.
So the debate is really about whether the **core session** should be chosen by the resident.

One existing gap matters to the whole debate: free-play rounds feed dynamic difficulty exactly like prescribed rounds, and nothing in the logged events says which kind a round was (grading review, Prescription section).
Today prescribed and chosen play already cannot be told apart.

## How free choice moves away from prescription

A prescription fixes **what** is trained, **how much**, and **in what mix**.
Full free choice hands all three to the resident.

- **What is trained drifts toward strengths.**
  People tend to pick what they are good at and what feels pleasant.
  A resident with weak executive function is the one most likely to skip Clear the Way and Serve the Guests, which is the domain the prescription exists to train.
- **The dose stops being a dose.**
  Time per domain becomes whatever the resident chose, so two residents on the "same prescription" get very different exposure.
- **The mix becomes a behaviour, not a treatment.**
  In a study, the game choices become an outcome correlated with ability, not a controlled input.
  That is self-selection bias, and it cannot be removed afterwards.

At that point the app is closer to a brain-games library than a prescribed intervention.
That may be acceptable for engagement, but it weakens any clinical claim built on dose and domain coverage.

## Pros and cons

### Pros of free choice

- **Autonomy improves adherence.**
  Feeling in control is one of the strongest drivers of motivation (self-determination theory), and adherence is the biggest practical problem in long-term cognitive training.
  A resident who comes back daily for a game they like may get more total training than one who drops out of a prescribed plan.
- **Dignity.**
  Being told what to play can feel institutional or childish to older adults.
  Choice respects them as adults.
- **Preference data.**
  Which games residents choose, and abandon, is useful product feedback.
- **Fits the care-home reality.**
  Staff and residents may already steer toward favourites; a strict plan that people work around is worse than an honest choice.

### Cons of free choice

- **Domain coverage is lost.**
  Weak domains get the least practice, the opposite of a therapeutic intent.
- **The dose cannot be stated.**
  "Six minutes a day across three domains" stops being true, and the grading review already flags the dose as undefined.
- **Research validity suffers.**
  Self-selection makes per-skill change scores hard to interpret, and pre/post comparisons across residents become comparisons of different treatments.
- **Choice overload and decision effort.**
  For residents with cognitive impairment, choosing among 15 tiles is itself a demanding task, and some will freeze, ask staff, or always tap the first tile.
  "Always the first tile" is not real choice; it is a layout effect.
- **Repetition.**
  Residents will replay one favourite.
  For Clear the Way, with only 10 puzzles, that means memorised solutions within days.
- **Prescriber role weakens.**
  Signup records a prescriber, which implies someone sets the plan; free choice leaves that role with nothing to configure.

## Impact on level difficulty

Dynamic difficulty is per game per resident, so it keeps working under free choice, but several existing problems get worse.

- **The reset bug gets more visible, not less.**
  `getYesterdayDifficultyState` (`src/lib/db.ts:197`) only finds a record dated exactly yesterday.
  A resident who plays a game every day would keep their level; one who drifts between games would restart at Level 1 almost every time.
  The fix in the grading review (base it on the last day played, with decay for days missed) becomes a prerequisite.
- **Levels become very uneven across games.**
  A favourite game climbs high while neglected games stay near Level 1.
  Because "Level 5" means something different in each game, a resident's levels can't be compared or summed into a profile.
- **The "only goes up" games inflate faster.**
  Four games always report the round as completed, so even poor rounds add difficulty.
  A resident who plays one of them all day rides it to the top even if they are struggling.
  Under the current two-minute visits this is capped by time; under free choice it is not.
- **Difficulty becomes a reason to switch.**
  When a game gets hard, a resident can simply leave for an easier one.
  Difficulty then never settles at a challenging level, which is the point of adaptive training.
- **The warm-up penalty bites harder.**
  Each new day starts at 0.8 × the last peak; residents who drop in and out of a game see their level fall more often, which clashes with the score card's rule of never framing a result as a drop.

## Impact on game design

- **Every pickable game must stand on its own.**
  Today 9 of the 15 games have no commissioned art and fall back to a category icon.
  In a free-choice home screen they would look second-class and rarely be picked, or they need art.
- **Skill labels become the menu.**
  If residents or staff pick by "This game improves your Recall", the mislabelled memory games (Market Memory is recognition, Train Yard is association) mislead the choice itself.
  The skill coverage findings move from a measurement problem to a user-facing one.
- **Instrumentation must cover every pickable game.**
  Only Garden Keeper's primary skill can be scored today.
  Under the trio, gaps are spread across a fixed rotation; under free choice, a resident might spend all their time in a game that produces no usable measure.
- **Content depth matters more.**
  Replay of a favourite exposes thin content: 10 puzzles in Clear the Way, and generators with few distinct layouts.
- **Session flow changes.**
  `SessionManager`, `nextStep()` and the rotation threshold assume a fixed trio.
  Free choice needs a different end condition (time budget, number of games, or the resident deciding to stop) and the summary screen needs a new meaning.
- **The picker is a design problem of its own.**
  It needs few options, large tiles, and a sensible default so that not choosing is also fine.

## Impact on measurement and the research blockers

- **Blocker 1 (what is a session)** gets harder: a session no longer has a fixed shape.
- **Blocker 2 (difficulty confound)** gets worse: now difficulty and exposure both vary by resident choice.
- **Every round must record how it was reached:** `prescribed`, `chosen`, or `free-play`.
  This is needed whichever way the debate goes, and is cheap.
- **Choice itself becomes data.**
  Avoidance of a domain may be an early signal worth reporting to staff, if it is logged.

## Middle grounds

Choice and prescription are not all-or-nothing.
Options, from most to least prescriptive:

1. **Current model: fixed trio, then Free Play.**
   Full prescription, choice only as a reward.
2. **Choice within each category slot.**
   The session still has a memory, an attention and an executive slot, but the resident picks which of that category's games to play (two marquee options each today).
   Keeps coverage and dose; gives real but bounded choice; keeps the picker to two large tiles.
3. **Choice of order.**
   All three categories must be played, in any order.
   A small autonomy gain at almost no measurement cost.
4. **Prescriber-configured plan.**
   The prescriber chooses the domains and weights per resident (for example, extra executive time), and the resident picks games within those rules.
   Gives the prescriber role a real job.
5. **Earned or nudged choice.**
   Free choice, but the app recommends the least-played domain and tracks coverage.
6. **Full free choice.**
   Any game, any time.

Options 2 and 3 can be combined, and together give most of the autonomy benefit while keeping the prescription intact.

## Questions for the research team

1. Is the study's claim about a **dose per domain**, or about **engagement with training in general**?
   The answer decides how much choice is acceptable.
2. Would they accept choice within a category (option 2) as still "prescribed"?
3. Should choice vs fixed be a **study arm** of its own, randomised, so the trade-off is measured instead of argued?
4. Should rounds reached through choice count toward the prescribed dose, the measured outcomes, or neither?

## Recommendation

- **Do now, whatever the outcome:** fix the reset bug, and tag every round with how it was reached (`prescribed`, `chosen`, `free-play`).
- **If choice is wanted:** start with choice within each category slot, plus free order.
  It keeps domain coverage and a stable dose while giving residents a real say, and the code change is mostly in `pickTrio()` and the Home screen.
- **Before full free choice:** the skill labels, scoring gaps and content depth in the companion docs need fixing first, because free choice exposes each of them to residents directly.
