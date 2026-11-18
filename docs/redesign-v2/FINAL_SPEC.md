# Rapha Rx Redesign v2: Final Spec

**Status**: Draft. Filled from confirmed decisions and the base draft.
Sections marked _TBD_ wait on further input.
Conflicts found in the inputs are listed in section 13 and are not resolved anywhere else in this doc.
**Started**: 2026-11-11
**Updated**: 2026-11-18 (owner answers on the difficulty design notes)
**Content Type**: Specification
**Branch**: _TBD_ (proposed `feat/redesign-v2`, cut from `main` after `feat/app-flow-redesign` merges)

**Sources**

- **[Chat]**: decisions confirmed in conversation, 2026-11-11.
- **[Owner]**: the product owner's answers of 2026-11-18, written on `docs/redesign-v2/2026-11-12_difficulty-design-notes.md.pdf` and confirmed in conversation.
  The full list is the decision log in `DIFFICULTY_RULES.md` section 6 (O1-O29).
- **[Draft]**: `docs/App Flow changes finale.pdf`, the base draft with mocks.
  Its three mocks are referenced below as **Mock 1** (home, p1), **Mock 2** (per-game scorecard, p3) and **Mock 3** (10-minute summary, p4).

## 1. Scope

The redesign covers:

1. Core loop changes: when each category unlocks.
2. Residents can pick any game within each unlocked category.
3. A session is measured in minutes played per category; reaching the threshold unlocks the next category.
4. A new scorecard after each game.
5. A new summary at the end of each 10-minute category session.
6. Popups for locked categories and for completed categories.
7. Dynamic difficulty that generates levels automatically for each of the 6 games.
8. Copy changes: "prescription" removed from the app. **[Draft]**
9. A comparison against a demographic, shown after 10 levels. **[Draft]**
10. Skill scoring: twelve skills, two per game, each with one measure. **[Draft]**
    Skills and measures stay as drafted; small game changes capture the ones the games cannot produce today (D24).

### Non-goals

_TBD_

## 2. Confirmed decisions

| # | Decision | Source |
|---|---|---|
| D1 | A category session ends after **10 minutes** of total play, across any number of games in that category. Finishing it unlocks the next category. The 10 is a tunable value. A full day is 3 x 10 = **30 minutes** (the draft refers to "play after the 30 minutes"). | [Chat], [Draft] |
| D2 | Unlocks **reset every day**. Each day starts with only Memory unlocked. | [Chat] |
| D3 | Play in a completed category counts **toward nothing**. That category's session score is already calculated. | [Chat] |
| D4 | If the threshold is crossed mid-level, the level **finishes first**, then the next category unlocks. | [Chat] |
| D5 | An **unrestricted Free Play** mode stays. It ignores scoring and performance entirely. | [Chat] |
| D6 | Unlock order is fixed: **1 Memory, 2 Attention, 3 Planning.** | [Draft] |
| D7 | Everything before Home (splash, signup, sign-in) is unchanged. | [Draft] |
| D8 | Each game has **two skills**, twelve in all, each with one measure the app can compute itself (section 7.1). | [Draft] |
| D9 | Response speed uses the **median**, not the mean. | [Draft] |
| D10 | Every player-facing message exists in **Kannada, Hindi and English** and is **under 10 words**. | [Draft] |
| D11 | Remove the word "prescription" from the app. Wherever "prescriptive games" appears, write **"scientifically designed"** instead. | [Draft] |
| D12 | The 10-minute summary **shows numeric scores** ("72 of 100") and the change since last session, as in Mock 3. This overrides the draft's "no numbers" rule for the summary. | [Chat] |
| D13 | Declines are shown: the summary uses **red down arrows** for a drop since last session, as in Mock 3. | [Chat] |
| D14 | The 10-minute summary shows **only the skills of the games played in that category session**: 2 rings if one game was played, 4 if both. The overall average covers only those skills. | [Chat] |
| D15 | **Garden Keeper leaves the six games** and gets no changes; it is not part of the core prescription. Its Attention slot goes to **Baggage Sort**, a new game to be designed and built later. | [Owner] |
| D16 | **No separate end-of-session Retention question screen** is built for Shopping List. Retention is captured inside the game by a small change (7.1a). | [Owner] |
| D17 | **No new Sequence mechanic** for Station Master. Sequence is captured by a small change to the existing game (7.1a). | [Owner] |
| D18 | **No new Sequencing mechanic** (such as multi-step cooking) for Tiffin Time; Sequencing is captured by a small change (7.1a). Decision-making comes from **guest types** (Impatient, Middle, Patient), which give guests an urgency independent of order size. The game keeps choosing which guest gets a served dish. | [Owner] |
| D19 | The game is spelled **"Tiffin Time"**. | [Owner] |
| D20 | **Every scored game can be lost.** On a failed round the scorecard's Continue becomes **Replay**, and the resident replays the same level. Clear and fail compare each game's own raw measure with a threshold, not the difficulty-weighted skill score. | [Owner] |
| D21 | Every game must work on **both phone and tablet**. | [Owner] |
| D22 | Spot Focus Response speed is the **median gap between finds**. A round without every difference found ends with an **"I can't find it"** button that appears after a delay; there is no time limit. | [Owner] |
| D23 | Tiffin Time's **on-screen points are removed**. | [Owner] |
| D24 | **Skill names and measures stay exactly as in section 7.1.** Where a game cannot produce a measure today, a small change to the existing game captures it (section 7.1a): not a new mechanic, not a different skill. Baggage Sort takes Garden Keeper's two skills. | [Owner] |

## 3. Workstreams

| Stream | Items | Summary | Depends on |
|---|---|---|---|
| A. Session engine | 1, 3, logic of 6 | Per-category minute ledger, unlock rules, daily reset, session end. Pure logic, unit-tested. | Nothing |
| B. Home and popups | 2, 6 | Home with locked/unlocked categories, unlock animation, popups. | A's state model |
| C. Scoring | 4, 5, 9, 10 | Skill measures, performance bands, per-game scorecard, 10-minute summary, weekly stars. | A, game features in 7.3 |
| D. Difficulty and levels | 7 | Auto-generated levels for each of the 6 games, at least 4 alternate versions per level. | Nothing |
| E. Research data | - | Research dashboard data, raw tap log. Scope _TBD_ (section 9). | C |
| F. Copy | 8 | "Prescription" removal. | Nothing |

## 4. Games and naming

The draft uses player-facing names; the code uses ids.

| Player-facing name | Code id | Category |
|---|---|---|
| Shopping List | `market-memory` | Memory |
| Station Master | `train-yard` | Memory |
| Spot Focus | `spot-focus` | Attention |
| Baggage Sort | _TBD_ (new game) | Attention |
| Tiffin Time | `serve-guests` | Planning |
| Free Me | `clear-the-way` | Planning |

Garden Keeper (`garden-keeper`) is no longer one of the six (D15).
Whether it stays in Free Play unchanged is C18.

## 5. Core loop (Stream A)

### 5.1 Category order and unlocking

- Order: Memory (1), Attention (2), Planning (3) (D6).
- Memory is unlocked when the resident reaches Home. Attention and Planning start locked. **[Draft]**
- A category unlocks after 10 minutes of gameplay across any number of games in the previous category (D1).
- Unlocks reset daily (D2).

### 5.2 Minute ledger

- Minutes count across any number of games in the current category (D1).
- Minutes in a completed category count toward nothing (D3).
- Free Play minutes count toward nothing (D5).
- Only **board time** counts: time with a game board on screen, the exit dialog closed and the tab visible. Intro, title, scorecard and Home do not count. **[Owner]** (2026-11-18, answers Q2)

### 5.3 Crossing the threshold

1. The level in progress finishes (D4).
2. The level's scorecard shows a small popup saying the next category is unlocked. **[Draft]**
3. The resident returns to Home, where the lock on the new category is removed with a small animation, and its games appear with a small bounce. **[Draft]**
4. The resident is free to pick any game from any unlocked category. **[Draft]**

Where the 10-minute summary (section 7.5) fits into this sequence is deferred (C4 in section 13).

### 5.4 Day boundary and resume

_TBD_

### 5.5 State model

_TBD_

## 6. Home and popups (Stream B)

### 6.1 Home layout (Mock 1)

- Header: logo, Settings, greeting ("Good Afternoon, Mark"), subtitle "What would you like to play today?"
- One panel per category, in unlock order, each with a heading:
  - "Boost Your MEMORY"
  - "Build Your FOCUS"
  - "Strengthen Your PLANNING"
- Each panel shows its two game tiles with names underneath.
- There is no Start Session button and no "Today's Workout takes 6 minutes" line; the resident picks games directly.
- The empty slots beside each panel's two games: see C7 in section 13.

### 6.2 Locked category

- The category panel shows a small lock icon on top. **[Draft]**
- Its game tiles are greyed out. **[Draft]**
- Tapping a greyed tile shows a popup: "Play the assigned games." **[Draft]**

### 6.3 Unlocking

- The lock is removed with a small animation, and the games appear with a small bounce (5.3).
- Animation details: _TBD_

### 6.4 Completed category

- Tapping a game in a completed category shows a popup saying this domain has been completed, with **Proceed** and **Back**. **[Draft]**
- Proceed opens the game; that play counts toward nothing (D3).
- Exact copy: _TBD_

## 7. Scoring (Stream C)

### 7.1 Skills and measures

The skills and measures are the draft's, unchanged **[Draft]**.
Only the game column changes: Garden Keeper's two skills pass to Baggage Sort (D15), and "Tiffen" is respelled (D19).

| Game | Domain | Skill | What the player does | Measure |
|---|---|---|---|---|
| Shopping List | Memory | Recall | Sees a shopping list, then picks the items in the market | % of list items picked correctly |
| Shopping List | Memory | Retention | At the end of the session, is asked which items were on today's list | items remembered at the end / items remembered straight after x 100 |
| Station Master | Memory | Sequence | Remembers the order in which trains arrived | % of trains placed in the right order |
| Station Master | Memory | Association | Remembers which train goes to which platform | % of correct train-platform matches |
| Spot Focus | Attention | Selective attention | Finds the target items among look-alikes | % of targets found; wrong taps counted separately |
| Spot Focus | Attention | Response speed | Taps the target as soon as it is spotted | median seconds from item appearing to correct tap |
| Baggage Sort | Attention | Sustained attention | Keeps watch over the garden for the whole round | accuracy in the last third of the round compared with the first third |
| Baggage Sort | Attention | Self-control | Leaves alone the things that should not be tapped | % of "don't tap" items correctly left alone |
| Tiffin Time | Planning | Sequencing | Prepares each tiffin with the steps in the right order | % of orders made in the correct step order |
| Tiffin Time | Planning | Decision-making | Chooses which order to make first when several are waiting | % of times the most urgent order was handled first |
| Free Me | Planning | Planning | Plans moves to free the fish | fewest possible moves / moves used x 100 |
| Free Me | Planning | Problem-solving | Solves the puzzle without help | % of puzzles solved without a hint or restart |

The Baggage Sort rows keep the draft's Garden Keeper wording until Baggage Sort is designed; "the garden" then becomes Baggage Sort's own scene.

How each measure maps onto a 0-100 score and onto the bands in 7.2 is deferred (C3 in section 13).

### 7.1a How each game captures its measures (D24)

Where a game cannot produce a measure today, a **small change** to the existing game captures it: a reveal order, a label, a reused screen, and logging.
No new mechanic is added and no skill changes.
The principle is decided; each specific change below is a proposal for the owner to confirm.

| Game | Skill | Captured today? | Small change (proposed) |
|---|---|---|---|
| Shopping List | Recall | Partly | Log the list and every pick. |
| Shopping List | Retention | No | **Second trip**: the last round of a Shopping List visit shows no list. It reuses the market shelf and cart and asks for the items on the visit's first list; the rounds in between are the delay. "Remembered at the end" = correct picks on the second trip; "straight after" = correct picks when that list was first shopped. See C20. |
| Station Master | Sequence | No | **Staggered arrival**: in the study phase, trains pull into their stations one at a time instead of all at once (an animation change), and the player is told to send them home in the order they came. The dispatch order is logged and compared with the arrival order. Order is scored, not enforced, so a wrong order costs no heart. |
| Station Master | Association | Partly | Log every dispatch with its train, station and attempt. Turn off the filled-station giveaway (`DIFFICULTY_RULES.md` 3.2). |
| Spot Focus | Selective attention | Partly | Log each find and each wrong tap. The "I can't find it" button (D22) lets "% found" fall below 100. |
| Spot Focus | Response speed | No | Log the time of each find. The board appearing is the items appearing: the first find is timed from when the board is first painted, each later find from the previous one (D22). |
| Baggage Sort | Sustained attention | - | Design requirement: a fixed-length round split into thirds, with enough targets in each third to measure. |
| Baggage Sort | Self-control | - | Design requirement: "don't tap" items that appear and leave on a timer, so each one is a trial the player can resist or not. |
| Tiffin Time | Sequencing | No | **Numbered dishes**: a 2- or 3-dish order shows its dishes numbered 1, 2, 3 in the speech bubble, as the tiffin's steps. Serving them in that order counts as correct. Scored, not enforced; only multi-dish orders count. |
| Tiffin Time | Decision-making | No | **Guest types** (D18) give guests an urgency independent of order size. Log which dish is cooked first while guests of different urgency wait. |
| Free Me | Planning | Partly | Count moves from the last restart (`DIFFICULTY_RULES.md` 3.6). |
| Free Me | Problem-solving | Partly | Log leaving mid-puzzle as unsolved. |

### 7.2 Performance bands

**Per skill, after every game**: five levels, each with an encouraging word. **[Draft]**

| Level | Performance | Word shown |
|---|---|---|
| 1 | Poor | Fighting Spirit |
| 2 | Average | Steady Growth |
| 3 | Fair | Good Potential |
| 4 | Good | Rising Confidence |
| 5 | Excellent | Pure Excellence |

Only the word is shown; the performance label is internal.

**Overall average, in the 10-minute summary**: ten bands. **[Draft]**

| Average | Word shown |
|---|---|
| 0-19 | Needs a Fresh Start |
| 20-29 | Finding Your Footing |
| 30-39 | Building the Basics |
| 40-49 | Getting There |
| 50-59 | Steady Progress |
| 60-69 | Good Progress |
| 70-79 | Strong Performance |
| 80-89 | Excellent Work |
| 90-99 | Outstanding |
| 100 | Exceeding Expectations |

### 7.3 Game features the measures depend on

To confirm with the game team. **[Draft]**

- [ ] Every tap is logged with its time: when the item appeared and when it was tapped.
- [ ] Shopping List can ask about today's list again: the second-trip round (7.1a).
- [ ] Station Master records both the arrival order and the platform for each train: staggered arrival (7.1a).
- [ ] Baggage Sort has "don't tap" items as well as targets, appearing and leaving on a timer, in a fixed-length round. (Was Garden Keeper: D15.)
- [ ] Tiffin Time has orders with different urgency, so there is a right one to do first: guest types (D18).
- [ ] Tiffin Time multi-dish orders show their dishes numbered, and the serving order is logged (7.1a).
- [ ] Spot Focus logs the time of each find and of the "I can't find it" button (D22).
- [ ] Free Me puzzles each have a known fewest-moves solution, and the move count restarts on a restart.
- [ ] Each game has at least 4 alternate versions per level.
- [ ] Each scored game can be lost and offers Replay (D20).

Status of each against the current code: _TBD_ (to be audited).

### 7.4 Per-game scorecard (Mock 2)

Shown after every game. **[Draft]**

- Game tile art, and the category name below it ("MEMORY").
- One card per skill of that game (two cards), each with:
  - the skill name ("Recall")
  - the encouraging word for its band ("Rising Confidence")
  - a five-segment bar, filled to the band level
- Each skill has its own colour; Mock 2 shows Recall in green and Retention in yellow.
- A message below the cards. Mock 2 shows two variants:
  - "Thank you for playing today."
  - "Your recall has improved steadily. Keep playing a few times a week to build on it."
  When each variant shows: see C5 in section 13.
- Continue button. On a failed round it reads **Replay** and replays the level (D20).

### 7.5 10-minute summary (Mock 3)

Shown at the end of each 10-minute category session. **[Draft]**

- Title "YOUR MEMORY", subtitle "Performance today".
- One ring per skill of each game played in this category session (D14): 2 rings for one game, 4 for both.
  Mock 3 shows the 4-ring case for Memory (Recall, Retention, Sequence, Association).
  Each ring shows:
  - the score "of 100" (D12)
  - the change since last session, with a green up arrow or a red down arrow (D13)
- Ring colours (Mock 3): Recall green, Retention yellow, Sequence cyan, Association pink.
- A "HISTORY METRICS" expander. Contents: _TBD_
- The overall-average word from 7.2 ("Great Progress!").
- Continue button.
- At the end of each session the player also sees how many of this week's 3 sessions are done, as stars that fill in. This rewards turning up, not performance. **[Draft]**

### 7.6 Message rules

From the draft, for what the player sees: **[Draft]**

- No numbers, scores, percentages, timers or rankings.
- Name the skill in everyday words: "remembering", "spotting", "planning".
- Every message in Kannada, Hindi and English, under 10 words (D10).

Exception: the 10-minute summary shows numeric scores and declines (D12, D13).

### 7.7 Demographic comparison

- Shown after completing 10 levels. **[Draft]**
- Everything else: _TBD_

## 8. Free Play

- Unrestricted: every game open (D5).
- No scoring, no performance tracking (D5).
- Whether Free Play play still adjusts difficulty: _TBD_
- How Free Play is reached from the new Home: _TBD_

## 9. Research data (Stream E)

What researchers see, from the draft. Numbers the player never sees live here. **[Draft]**

- Each skill's measure for every game played, with the level reached.
- The trend from week 0 to week 6 to week 12, alongside the MoCA scores.
- Session details that could affect results: device, pauses, interruptions, and play after the 30 minutes, kept separate.
  (The draft also listed minutes since the list was shown, for Retention; moot under D16.)
- The raw tap log, kept permanently, so measures can be reworked later.
- The independent evaluator does not see this dashboard, to keep the MoCA assessment blind.

Whether the dashboard itself is in this redesign's scope, where the data is stored, and consent: _TBD_

## 10. Dynamic difficulty and level generation (Stream D)

Full draft rules: `docs/redesign-v2/DIFFICULTY_RULES.md`.
Level values: `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx` (one tab per game; the product owner fills anchor levels, the rest are filled within the guardrails).
Both are drafts. The rules doc has the owner's answers of 2026-11-18 folded in; the sheet still waits on anchor levels.

### 10.1 Shared rules

- Each game has at least 4 alternate versions per level. **[Draft]**
- Each game has a curated, numbered level ladder with hard guardrails per parameter and its own curation rules. **[Chat]**
- Every scored game can be lost; a failed round offers Replay (D20).
- Generator games build a fresh round from the level's settings on every play; Free Me picks at random from the level's puzzle pool. **[Owner]**
- Every level must fit a 360 px phone as well as a tablet (D21).
- Ladders are live for Shopping List, Spot Focus and Tiffin Time (v1.38.0): every game restarts at level 1 each day; up one level on a clear, down one after two fails in a row. **[Owner]** (2026-11-18, X1 and X2)
- Everything else: see `DIFFICULTY_RULES.md` section 2.

### 10.2 Per game

Details and remaining open questions are in `DIFFICULTY_RULES.md` section 3.
Order of work **[Owner]**: Station Master starts only after its art style and designs exist; Free Me comes last.

| Game | Code id | Spec |
|---|---|---|
| Shopping List | `market-memory` | Clear on the Recall measure, misses allowed. Hints limited heavily; a hinted round scores half. 6 items until new cart art. Simple, translated item names before the top levels. **[Owner]** |
| Station Master | `train-yard` | Sequence via staggered arrival (7.1a). Up to 8 stations with new colours and close-hue sets. Hearts shown as a heart with a number, down to 1. Up at 75% in 2 of the last 3 rounds; down after 2 lost rounds in a row. Waits on art. **[Owner]** |
| Spot Focus | `spot-focus` | Board up to 6 x 3. Differences from 1 to 40% of cards. "I can't find it" button after a delay (D22). More twin pairs. **[Owner]** |
| Baggage Sort | _TBD_ | New game; design _TBD_ (D15). |
| Tiffin Time | `serve-guests` | Guest types (D18); numbered dishes for Sequencing (7.1a). Up to 18 guests per round. No on-screen points (D23). Clear rule and tightest patience: Claude's proposal in the rules doc, to balance later. **[Owner]** |
| Free Me | `clear-the-way` | Random pick from the level pool. Restart counts as not cleared. No move ceiling. Hint unlock varies by level. 6 x 6 cap for now. More puzzles and visual variety. Worked on last. **[Owner]** |

## 11. Copy changes (Stream F)

- Remove "prescription" from the app; replace "prescriptive games" with "scientifically designed" (D11).
- Respell "Tiffen" as "Tiffin" in all player-facing copy (D19).
- Audit, 2026-11-11: the en, hi and kn locale files show no user-visible "prescription" wording.
  The signup and settings labels already read "Recommended by".
  The only remaining hits are internal key names (`signup.prescribedBy`, `settings.prescriber`) and "As prescribed" in the non-marquee Morning Routine game.
  Where "prescriptive games" appears: _TBD_ (see C8).

## 12. Testing and acceptance

_TBD_

## 13. Conflicts and open questions

Items found in the inputs that need a decision.
Nothing in this list is assumed anywhere else in the doc.

| # | Issue | Blocks |
|---|---|---|
| C5 | **Scorecard message variants.** When does the scorecard show "Thank you for playing today" and when "Your recall has improved steadily"? | C |
| C6 | **"After every game" vs "after each level".** The draft says the scorecard shows after every game. A game visit is several short levels. Is it after each level, or once when the resident leaves the game? | A, C |
| C7 | **Home empty slots.** Mock 1 shows two empty tiles in each category panel. Are they placeholders for future games, decoration, or should they be removed? (Mock 1 also labels the Garden Keeper tile "SHOPPING LIST", assumed to be a mock typo.) | B |
| C8 | **"Prescriptive games" location.** No such wording exists in the app copy today. Is it in an image, the store listing, or a place outside the locale files? | F |
| C14 | **"This week's 3 sessions".** Is a session here one full day of 30 minutes? Is the weekly target fixed at 3? | A, C |
| C15 | **Demographic comparison.** 10 levels of one game or in total? Which demographic and source data? Does it break the no-numbers and no-rankings rules? | C |
| C16 | **"Since last session".** Is the comparison against the same category's previous 10-minute session, which is the previous day given D2? | C |
| Q3 | Does Free Play play still feed dynamic difficulty? | D |
| Q4 | How is Free Play reached from the new Home, and from when? | B |
| C20 | **Retention delay.** The draft asks about today's list "at the end of the session". The proposed second trip (7.1a) asks at the end of the Shopping List visit instead, so the delay is a few rounds, not the rest of the Memory session. Acceptable, or should the second trip wait for the resident's next Shopping List visit that day? And what if a visit has only one round? | C |
| C18 | **Garden Keeper in Free Play.** Does it stay reachable from Free Play unchanged, or leave the app? | B |

### Resolved (2026-11-11)

- C1: the summary shows numeric scores (D12).
- C2: declines are shown with red down arrows (D13).
- C13: the summary shows only the skills of games played, 2 or 4 rings (D14).

### Resolved (2026-11-18)

- C9: Baggage Sort replaces Garden Keeper (D15).
- C10: no Sequence mechanic for Station Master (D17).
- C11: Spot Focus measures are restated for spot-the-difference: % of differences found, and the median gap between finds (D22).
- C12: moot; there is no Retention question (D16).
- Q2: only board time counts toward the 10 minutes (5.2).
- C17: no game loses a skill. Every skill and measure stays as drafted, and small game changes capture the ones the games cannot produce today (D24, 7.1a).

### Deferred (not to be addressed for now)

Kept so they are not lost; nothing in this spec depends on them yet.

| # | Issue |
|---|---|
| C3 | **Measure to band.** How each raw measure becomes a 0-100 score and a 1-5 band. Response speed is in seconds and needs a direction and range. Retention can exceed 100. |
| C4 | **Order at the threshold.** The order of the level scorecard, the unlock popup, the 10-minute summary, then Home. (The Retention question that was in this sequence will not be built: D16.) |

## 14. Related documents

- `docs/App Flow changes finale.pdf`: the base draft.
- `docs/redesign-v2/2026-11-12_difficulty-design-notes.md.pdf`: the owner's written answers, source of D15-D23.
- `docs/redesign-v2/DIFFICULTY_RULES.md` section 6: the full owner decision log (O1-O29).
- `docs/2026-10-12_open-questions-for-research.md`: D1 answers A3 (dose = minutes per domain).
  Item 2 answers A2 (choice within each category).
  D3 and D5 answer A4 (which rounds count).
  Section 7.1 answers B6 and B7 (the skills each game claims) and part of C10 (formulas).
- `docs/2026-10-08_skill-coverage-by-game.md`: background for C10 and C11.
- `docs/2026-10-12_decisions-needed-brief.md`
- `docs/superpowers/specs/2026-09-02-app-flow-redesign-design.md`: the previous redesign this builds on.
