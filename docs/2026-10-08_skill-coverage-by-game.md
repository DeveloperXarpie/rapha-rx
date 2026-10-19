# Skill Coverage by Game

**Date**: 2026-10-08
**Content Type**: Analysis

This document checks each of the six rotation games against the primary and secondary skills it claims to train.
The skill map comes from the "Game Performance Measurement Format" spec (SJ, 2026-09-28) and lives in code in `src/lib/gameSkills.ts`.
The measures come from the same spec: Recall, Sequences and most other skills are correct ÷ total × 100; Selective Attention is targets hit ÷ total targets plus distractor errors; Planning is optimal ÷ actual actions; Response Time is the median of correct responses.

Every skill gets three questions:

- **Trained?** Does the gameplay actually make the resident use this skill?
- **Pushed by difficulty?** Does a higher difficulty score make this skill work harder? This is what makes training progressive.
- **Measured?** Can the spec's score be computed from the metrics the game sends today?

"Improving the skill" needs all three.
Trained without pushed means the exercise stops getting harder.
Trained without measured means any improvement is invisible.

Source: the code on `feat/app-flow-redesign` at `6739b0c` (v1.35.2).
Related: `docs/2026-10-08_game-grading-review.md` and `docs/scoring-implementation-analysis.md`.

## Summary

| Game | Primary | Primary verdict | Secondaries actually trained |
|---|---|---|---|
| Market Memory | Recall | **Mislabelled**: the game is recognition, not recall | Recognition yes; Retention and Association no |
| Train Yard | Sequences | **Not trained**: order never matters | Recall partly; Patterns no. The game really trains Association, which is not on its list. |
| Spot Focus | Selective Attention | Trained and pushed, **not measurable** (always 100%) | Response Time no |
| Garden Keeper | Selective Attention | **Trained, pushed and measurable today** | Accuracy yes |
| Serve the Guests | Planning | Trained and pushed, **not measurable** (no optimal-action count) | Decision-Making partly; Sequencing no |
| Clear the Way | Problem-Solving | Trained and pushed, **not measurable** (always solved) | Planning yes and measurable; Cognitive Flexibility no |

Of 17 claimed skills, 3 can be scored to the spec today: Garden Keeper's Selective Attention and Accuracy, and Clear the Way's Planning.
Only one game, Garden Keeper, has a primary skill that can be scored today.

## Market Memory (Shopping List)

The resident studies a shopping list, the list is covered for a hold, then they pick the items from a shelf of 12 crates and submit.
Wrong picks can be lookalike "twins" of list items.
Metrics sent: correct, wrong, missed, listLength, hintsUsed, studyMs, timeToFirstPickMs, timeToSubmitMs, pickOrder.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Recall | Primary | **No, not as defined.** The resident chooses from items shown on the shelf, which is recognition. True recall would need them to produce items with no cues. | List grows 3→6, hold grows 1.5→4 s (+2.5 s from 0.55) | correct ÷ listLength is computable, but it is a recognition score | Either relabel the primary as Recognition, or add a free-recall step (for example, pick from a full catalogue with no shelf cue) |
| Recognition | Secondary | **Yes.** Picking targets out of 12 crates is a recognition task, and twins make it a hard one. | Twins from 0.25, single-category shelf from 0.75, both of which make lures more alike | Partly. Overall accuracy is computable. Twin picks are not told apart from other wrong picks, and the list itself is not logged, so pickOrder cannot be checked afterwards. | Log list ids and twin picks separately |
| Retention | Secondary | **No.** The hold is a few seconds of short-term memory. The spec defines Retention as delayed recall after a delay or other activity. | Hold grows, but stays in seconds | No | Needs a delayed recall, for example asking for the list again after the next game |
| Association | Secondary | **No.** Nothing asks the resident to link an item to anything else. The single-category tier groups items but never asks about the link. | No | No, and the spec has no formula for it | Needs a mechanic, or drop it from the list |

## Train Yard (Station Master)

Four stations are shown with names and colours, the signs blank, and the resident sends each coloured train to its matching station.
Trains are shuffled independently of stations, and they can be sent in any order.
Metrics sent: trainsHome, firstTryCorrect, wrongDispatches, resets, livesLeft, signMs.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Sequences | Primary | **No.** No order is shown and no order is checked. Any dispatch order is accepted. | No | No | Either make order part of the task (for example, trains must leave in the order the stations lit up) or change the primary |
| Recall | Secondary | **Partly.** It is cued recall: the train's colour is the cue for its station. | Sign time 8→3 s, hold 1.5→4 s, similar colours from 0.6 | Yes: firstTryCorrect ÷ 4 | Fixed at 4 items, so there is no list-length lever |
| Patterns | Secondary | **No.** There is no pattern to spot. Similar colours make it harder to tell trains apart, which is discrimination, not patterns. | No | No, and the spec has no formula for it | Needs a mechanic, or drop it from the list |
| *Association* | *Not listed* | **Yes, this is the real task.** Linking a colour to a station is paired-associate memory, the classic association test. | Yes, through the same levers as Recall | Yes: firstTryCorrect ÷ 4 matches the spec's "% of correctly matched related items" | Ask the research team whether Association should be the primary |

## Spot Focus

Two panels of items; the resident taps every difference between them.
There is no timer and no way to fail, and the round ends only when everything is found.
Metrics sent: differencesFound, totalDifferences, falseTaps.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Selective Attention | Primary | **Yes.** Picking the changed items out of the matching ones is target-among-distractor search. | Yes: 2→7 differences, a wider grid from 0.4, subtler changes at 0.3 and 0.7 | **No.** Targets hit ÷ total targets is always 100%, because the round cannot end otherwise. falseTaps works as the spec's distractor-error count. | Needs a time limit, a give-up, or time-to-find per target so the score can vary |
| Response Time | Secondary | **Weakly.** Nothing asks for speed, so faster search is never rewarded. | No | No. No tap is timestamped. | Log a time per correct find, then take the median |

## Garden Keeper

A 90-second round: thirsty flowers sprout and must be watered before their window closes, while wilted flowers and pests must be left alone.
Metrics sent: watered, targetCount, falseTaps, driedUp, meanReactionMs, livesLeft.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Selective Attention | Primary | **Yes.** Water the thirsty flowers, ignore the wilted ones and pests. | Yes: 12→24 plants, distractors 25→55%, 1→3 thirsty at once | **Yes.** Targets hit ÷ targets = watered ÷ (watered + driedUp). Distractor errors = falseTaps. | None, apart from storing it |
| Accuracy | Secondary | **Yes.** Wrong taps cost a heart. | Yes, through more distractors and shorter windows | **Yes.** watered ÷ (watered + falseTaps) | None |
| *Response Time* | *Not listed* | **Yes.** Windows shrink 6→2.8 s. | Yes | Nearly. The model keeps every reaction time but sends only the mean. Sending the median is a one-line change. | Ask the research team whether to add it |
| *Sustained Attention* | *Not listed* | **Yes.** It is the only game with a fixed 90-second stretch. | No, length is fixed | No. Nothing is split into beginning, middle and end. | Log accuracy per 30 s segment if wanted |

## Serve the Guests (Tiffen Time)

Guests sit and order 1-3 dishes.
The resident taps a dish to cook it, then taps it again when ready to serve it.
**The game picks which guest gets the dish**, always the one with the least patience left.
Dishes burn if left ready for 11 s, and guests leave if they wait too long.
Metrics sent: itemsServed, itemsRequested, guestsFullyServed, dishesBurnt, walkouts, score.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Planning | Primary | **Yes.** Deciding what to start cooking ahead of demand, and keeping several dishes going at once. | Yes, but only in three steps (1, 2, then 3 dishes per guest) | **No.** The spec needs optimal ÷ actual actions. There is no optimal count for a real-time game, and taps are not counted. itemsServed ÷ itemsRequested measures throughput, not planning. | Define planning efficiency for this game with the research team, then log cook and serve taps |
| Decision-Making | Secondary | **Partly.** The resident chooses what to cook, but the game makes the "who to serve first" decision for them. | Weakly, through more dishes per guest | Partly. Burnt dishes and walkouts are poor-decision signals. Cooking a dish nobody ordered is not counted. | Log wasted cooks; consider letting the resident choose the guest |
| Sequencing | Secondary | **No.** A guest's dishes can be served in any order. | No | No | Needs a required order (for example, starter before main), or drop it from the list |

## Clear the Way (Free Me - Fish Box)

A sliding-block puzzle: move blocks to open a lane for the fish.
There is no timer and no way to fail.
"Show me" unlocks after twice the fewest possible moves.
There are 10 levels in `levels.ts`, two per tier, and `pickLevel` picks one of the two at random, so a resident sees each puzzle again within a few days.
Metrics sent: levelKey, tier, movesUsed, minMoves, resets, hintsUsed.

| Skill | Role | Trained? | Pushed by difficulty? | Measured? | Gap |
|---|---|---|---|---|---|
| Problem-Solving | Primary | **Yes.** Each puzzle has to be worked out. | Yes, through five tiers of deeper puzzles | **No.** "% of problems solved" is always 100%, because every puzzle ends solved. | Score "solved without a hint", or add a move or time limit after which the round counts as unsolved |
| Planning | Secondary | **Yes.** Fewer moves means thinking ahead. | Yes, deeper tiers need more look-ahead | **Yes.** minMoves ÷ movesUsed is exactly the spec's formula. Moves after "Start over" keep counting, which is correct. | Hints confound it; flag hinted rounds. With only 10 levels, repeats will measure memory of the solution. |
| Cognitive Flexibility | Secondary | **No.** The rules never change mid-round. | No | No, and the spec has no formula for it | Needs a mechanic (for example, a block that changes behaviour) or drop it from the list |

## Patterns across the six games

1. **The skill labels don't match the mechanics in both memory games.**
   Market Memory is recognition, labelled Recall.
   Train Yard is association, labelled Sequences.
   This is the most important finding, because the after-game card's main word comes from the primary skill.
2. **Two primaries are trained but always read 100%.**
   Spot Focus and Clear the Way cannot end until the task is done, so the spec's formula has nothing to vary.
3. **Five claimed secondaries have no mechanic at all:** Retention and Association (Market Memory), Patterns (Train Yard), Sequencing (Serve the Guests) and Cognitive Flexibility (Clear the Way).
   Train Yard's primary, Sequences, has none either.
   Retention, Patterns and Cognitive Flexibility also have no agreed formula in the spec.
4. **Two games train skills they don't claim.**
   Train Yard trains Association; Garden Keeper trains Response Time and Sustained Attention.
5. **Garden Keeper is the model to copy.**
   It can fail, it has distractors, it logs misses and false taps, and its difficulty levers map one-to-one onto its skills.

## Questions for the research team

1. Should the labels follow the mechanics (Market Memory → Recognition, Train Yard → Association), or should the mechanics change to fit the labels?
2. For skills with no mechanic, should we build one or drop the skill from that game's list?
3. Should Garden Keeper's Response Time and Sustained Attention be added to its list, since the data is nearly free?
4. How should the always-solved games be scored: by time, by hint use, or by adding a limit?
