# Level Capacity by Game: Can Each Redesigned Game Support a Long Level Ladder?

**Date**: 2026-10-16
**Content Type**: Analysis

The decisions sheet (`Rapha_Questions_and_Answers_Decisions_Sheet.pdf`, reviewed 2026-10-15) moves every game to visible, numbered levels.
A player stays on a level until they clear it, and content grows "from less to more" as levels rise.
This document asks, game by game, whether that is possible within each game's constraints, and what each game's design has to change to get there.

Source: the code on `feat/app-flow-redesign` at `6739b0c` (v1.35.2).
File references are relative to `src/`.

## How many levels does a game actually need?

The sheet fixes the dose: 3 sessions a week for 12 weeks, 10 minutes per domain per session.
That is **6 hours per domain** over the programme.
A resident who always picks the same game in a domain spends all 6 hours in it.
At 1 to 2 minutes a round, that is roughly **180 to 360 rounds of one game**, plus any extra play.

Two separate things are needed to fill that:

- **Depth**: distinct difficulty steps, each one genuinely harder than the last. This is what a level number means.
- **Variety**: distinct rounds within a step, so a resident who repeats a level does not see the same board.

Because players repeat a level until they clear it, a game needs far fewer steps than rounds.
A realistic target is **20 to 40 meaningful steps**, each with **hundreds of distinct rounds**.
Beyond about 40 steps, most extra levels would only be relabelled repeats of the same difficulty.

## Summary

| Game (sheet name) | Code id | Variety today | Depth today | Depth possible | Main ceiling | Verdict |
|---|---|---|---|---|---|---|
| Shopping List | `market-memory` | Millions of lists | 7 states | 15 to 25 steps | Cart holds 6 items; elderly working memory | Possible, but shallow. Needs new knobs to go deeper |
| Station Master | `train-yard` | 576 rounds | Timings only | Dozens of steps | Everything hard-coded to 4 stations and 4 colours | Possible only after the planned redesign |
| Spot Focus | `spot-focus` | ~10^15 | 7 states | Dozens of steps | Card size on phones; 15 subtle twin pairs | Possible. Easiest to extend |
| Baggage Sort | none (new) | n/a | n/a | Effectively unlimited | Undefined design | Possible by nature, but it is a whole new game |
| (Garden Keeper, fallback) | `garden-keeper` | High | ~13 steps | 10 to 13 steps | 24 objects, 3 concurrent targets | Shallow; "much busier" means new caps |
| Tiffin Time | `serve-guests` | ~75k counters | 3 steps | 30 to 60 steps | 4 seats, 6 dishes, 3 items per order | Possible once constants become parameters |
| Free Me | `clear-the-way` | 10 puzzles | 5 tiers | Hundreds of puzzles | Board cannot grow past 6x6 on phones | Possible with an offline generator, but not by growing the box |

## Problems shared by every game

These apply across the board and should be decided once, not per game.

1. **There is no level counter.**
   Difficulty is a continuous score from 0 to 1, shown as "Level 1 to 10" (`lib/dynamicDifficulty.ts:16-21`).
   A numbered ladder needs a stored level per player per game.
   `picture-postcard` already does this with its own 1 to 100 ladder in Dexie, bypassing the score (`screens/GameRouter.tsx:78-87`), so there is a precedent.
2. **Three of the games can never fail.**
   `market-memory` (`index.tsx:280`), `spot-focus` (`index.tsx:132`) and `serve-guests` (`index.tsx:109`) hard-code `completed: true`.
   So the demotion step in `adjustDifficulty` never runs, and difficulty only ever goes up.
   This is the Shopping List bug in the sheet ("I did not get all items correct, difficulty increased").
   Each game needs an explicit "cleared" rule before "stay until cleared" means anything.
3. **The daily warm-up conflicts with visible levels.**
   Each day starts at 80% of yesterday's peak (`lib/dynamicDifficulty.ts:8, 33`).
   With a visible number, a resident would see their level drop overnight.
   The sheet's Q15 (decay after missed days, and whether players see a drop) is still unanswered.
4. **"Levels" and "dynamic difficulty" both appear in the sheet.**
   They can coexist: the level is the ladder, and dynamic difficulty is the rule that moves you on it (up on clear, down after repeated failure).
   The sheet does not yet say when a level goes down.
5. **No game logs per-tap timing** (Q7).
   Each game records totals only.
   This is the same work in every game: log when an item appeared, when it was tapped, and whether it was right.

## Recommended model for "a level"

One approach fits every game except Free Me:

- **A level is a fixed set of parameters**, authored as a table (level 1 = 3 items, no decoys, long study time, and so on).
  This gives depth, and it keeps "Level 12" meaning the same thing for every resident, which matters for the research comparisons in Q6.
- **Each play of a level generates fresh content** from those parameters, using the generators that already exist.
  This gives variety, so repeating a level does not mean repeating a board.

Free Me is the exception, because a puzzle's difficulty only exists once a solver has checked it.
Its levels should be a fixed, numbered list of puzzles, generated and graded offline.

---

## Shopping List (`market-memory`)

**Verdict: Plenty of variety. Only 15 to 25 genuinely harder steps are possible, and the cap is partly cognitive, not just technical.**

### How it works today
- `buildRound` picks a random list from the pool, adds look-alike decoys if on, fills a 16-crate shelf, and shuffles (`games/memory/MarketMemory/round.ts:64-82`).
- The difficulty knobs are in `lib/dynamicDifficulty.ts:399-423`:
  - Item count: 3 to 6.
  - Cover time: 1.5 to 6.5 seconds.
  - Look-alike decoys: on from score 0.25.
  - Single-category list: on from score 0.75.
  - Hints: always 2.
- On today's curve that is only **7 distinct states**.

### Content
- 62 items in 6 categories, each with one look-alike twin (`items.ts:29-109`).
- That gives about 38k possible lists at 3 items and about 61M at 6. Content is not the limit.
- Only produce (20) and staples (12) are big enough for single-category rounds (`round.ts:45-53`).

### Ceilings
- **Cart**: holds at most 6 slots (`geometry.ts:316-324`). This is the binding limit. A redrawn cart could take 7, matching the clipboard's 7 rows.
- **Shelf**: 16 crates. With decoys on, the list plus its twins needs 2 crates per item, so 8 items is the hard maximum.
- **Working memory**: an older adult's span for unrelated items is roughly 4 to 6.
  A list of 7 or 8 would mostly measure failure, not training.
  So more items is not the route to more levels.

### Ways to add depth
Each of these is a new design knob:

- **Decoy closeness**: mixed twins first, then pulses (which differ only in colour).
- **Cover time bands**: several steps between 1.5 and 6.5 seconds.
- **Hints**: 2, then 1, then 0.
- **Category rounds**: all items look alike.
- **Interference**: a short distraction between study and shopping.
- **Delayed recall**: a second shop later in the session.

Layered, these give roughly 100 to 180 combinations.
About **15 to 25 feel clearly different** to a player.

### Design impact
- A clear rule already exists but is unused: `perfect` means no wrong picks and nothing missed (`round.ts:104`).
- "All items correct" as the clear rule may be too strict at high levels for this population.
  A threshold such as "at most one miss" may be fairer.
- **Translation is a real blocker.** Item names are hard-coded English with no translation keys (`items.ts`).
  The pulse look-alikes are told apart mainly by the name on the crate (`items.ts:63-65`).
  So the hardest levels depend on reading.
- A stale comment at `round.ts:78` ("the full 21") should be fixed separately.

### Questions for the team
- Is 6 the maximum list length, or should we redraw the cart for 7?
- Which new depth knobs are acceptable: interference, delayed recall, fewer hints?
- What counts as "clearing" a level: perfect, or a threshold?

---

## Station Master (`train-yard`)

**Verdict: Not possible on today's board. Possible, with dozens of steps, once the planned redesign lifts the hard-coded 4.**

### How it works today
- Encoding shows each station's colour and name, then a blind covers them, then trains arrive one at a time and the player taps the matching station (`games/memory/TrainYard/index.tsx:76, 200-234`).
- **Everything is fixed at 4**: stations, trains, colours, the column positions `COL_X` (`geometry.ts:15`), the crossing lattice (`geometry.ts:81-89`), the win check (`index.tsx:279`) and the metric formula (`components/GameShell.tsx:442-448`).
- The only knobs are study time (8 to 3 seconds), blind time (1.5 to 4 seconds) and a "similar colours" switch (`lib/dynamicDifficulty.ts:306-313`).
- There are 576 possible rounds per setting.

### Order does not matter today
- Lanes are shuffled specifically so position gives nothing away (`index.tsx:116-118`).
- The game, not the player, chooses which train comes next (`index.tsx:188-194`).
- A correct tap only checks colour (`index.tsx:256`).

The sheet's "remember the order and colours" is therefore **a new mechanic**, not a tweak.

### Ceilings
- **Width**: about 5 columns fit in one row (`geometry.ts:165`).
  The 7-station, two-row mock needs a new track layout, because routing is currently lane, then one diagonal, then spur (`geometry.ts:100-104`).
- **Colours**: only 4 hues have art (`sprites.ts:19-32`).
  - The standard set is red, blue, green and yellow. Red and green is the classic colour-blindness pair.
  - The "similar" set is CSS filters over the same 4 sprites.
  - Seven stations need seven distinguishable, colour-blind-safe colours, and that means new art.
- **Grey-station bug, two leaks**:
  1. The hidden state is the coloured sprite in grayscale (`Station.tsx:31`), so each hue becomes a different grey.
  2. Each station's width comes from its own sprite (`geometry.ts:118-120`), so the red station is visibly wider.

  One shared neutral asset of a fixed width fixes both.

### Depth after the redesign
The steps can layer:

- station count, 3 to 7
- the length of the order to remember
- colour set (distinct, then similar)
- study time
- blind time
- lives

That gives **dozens of steps**.
Variety per step runs to thousands of rounds: 7 stations from 7 colours alone give 5,040 layouts.

### Design impact
- This is effectively a rebuild of the board and the round logic.
  The level system should be designed into it from the start, not added afterwards.
- Remembering order adds load on top of colour.
  At 7 stations with order recall, the task may exceed what this population can do.
  The ladder should introduce order at a low station count first.
- If colour is the thing to remember, a second cue (shape or pattern) for colour-blind players also gives the answer away.
  The team must choose between accessibility and keeping colour as the task.
- Station names are translated text on an 85px sign (`Station.tsx:43`), and longer Hindi or Kannada names will be tight.
- Unverified: whether a retry after "Game over" repeats the same layout, as the card promises (`index.tsx:741`).

### Questions for the team
- Does "order" mean the order trains arrive in, or the order of stations along the line?
- How many stations at the top level, given that order recall is also required?
- Should colour-blind players get a pattern cue, even though it changes what is being remembered?

---

## Spot Focus (`spot-focus`)

**Verdict: The easiest game to extend. Dozens of steps and practically unlimited variety are available. The real ceiling is card size on phones, and the open Mahjong idea could change the game entirely.**

### How it works today
- The game is spot-the-difference between two grids of cards: an original, and a copy where the player taps the changes (`games/attention/SpotFocus/index.tsx:222-236`).
- The knobs (`lib/dynamicDifficulty.ts:133-141`):
  - Differences: 2 to 7.
  - Grid: 3x3, then 3x4.
  - Subtlety: bold (a different family), medium (the same family), or subtle (a twin).
- That gives **7 distinct states** under 10 labels.
- `levels.config.ts` is dead config.

### Content
- 199 items in 59 families, with 19 twin pairs across 15 families (`items.ts`).
- Rounds per step are on the order of 10^15. Variety is not a concern.

### Ceilings
- **One item per family per board** (`lib/contentGenerators/spotFocus.ts:416, 432-438`), so a board holds at most about 59 cells.
  Screen space binds long before that.
- **Subtle differences cap at 15 per board**, one per twin family.
- **Touch target**: on a 360px phone, two panels side by side give cards of about 41px at 3 columns and about 29px at 4.
  Today's board already breaks the 80px rule on phones.
  Bigger grids make this worse, so on phones grid size cannot be the main progression knob.

### Depth
Layer these:

- the number of differences
- the grid size, on tablets only
- the subtlety tier
- a mix of tiers within one board
- optionally a time limit

That gives **dozens of steps**.
Adding more twin pairs (new art) would raise the subtle ceiling.

### Design impact
- The only way to finish a round is to clear it, so "stay until cleared" already holds trivially.
  But the false-tap penalty is the only thing that separates good play from bad.
- **Reaction time**: every item appears at once, so there is no "item appeared" moment.
  The meaningful measure is the time between finds.
  This needs a short definition from research, since Q7 assumes items appear one at a time.
- **The Mahjong idea is a fork in the road.**
  If Spot Focus takes on Mahjong-style tile matching, its generator, knobs and level ladder are different from this analysis.
  This should be settled before any level work on this game.

### Questions for the team
- Is Mahjong a visual style (tiles, layout) or a change of mechanic (matching pairs)?
- What is the maximum grid on a phone, given the touch-target rule?
- How should reaction time be defined when the whole board appears at once?

---

## Baggage Sort (new, replacing Garden Keeper)

**Verdict: A stream-sorting game generates levels naturally, so depth and variety are not a concern. The concern is that nothing exists yet: no design, no art, no code.**

### What the sheet says
"Number of boxes to sort-clear against time", with items starting few and increasing.
That is all of it.

### Why it scales well
In a sorting game, every round is generated from a few numbers:

- how many items
- how many bins or categories
- how fast items arrive
- how similar the categories look
- the time limit

These combine smoothly into **as many steps as needed**, and the content never runs out.
It is also a good fit for per-tap reaction time (Q7), because each item has a clear "appeared" moment.

### What can be reused from Garden Keeper
The Garden Keeper report found these parts reusable:

- the reducer with wall-clock deadlines, pause and resume (`games/attention/GardenKeeper/model.ts:77-191`)
- the spawn scheduler with a concurrency cap (`model.ts:197-207`)
- the countdown ring (`geometry.ts:147-156`)
- tap hit-boxes, effects and lives (`index.tsx`)

Not reusable:

- all the art
- the interaction, which is tap-only. Sorting needs drag, or "tap the item, then tap the bin".
  For this population, two taps is likely easier than dragging.

### Design questions that block any estimate
- What is sorted, and by what rule (colour, destination, shape)?
- Is it a moving belt (time pressure from speed) or a pile (time pressure from a clock)?
- Drag, or two taps?
- How many bins fit at the 80px touch target? This is the real ceiling on depth.

### If Garden Keeper is kept instead
The sheet says it would need to be "much busier".
Today:

- the bed peaks at about 24 objects
- only 3 targets can be active at once
- the spawn interval bottoms out at 1.2 seconds (`lib/dynamicDifficulty.ts:360-372`)

That gives about **10 to 13 steps**.
"Busier" means raising the concurrency cap and the spawn rate, not adding plants.
The grid fits about 35 objects at the 96px tap floor (`geometry.ts:121-133`).
Performance with many active targets is unmeasured, because every element is a DOM node.
Today it logs reaction time only for correct taps, not for false ones (`model.ts:151-158`).

---

## Tiffin Time (`serve-guests`)

**Verdict: Possible, with 30 to 60 steps, once the hard-coded constants become level parameters. The screen limits are tight, and the "speed" axis needs a floor that suits elderly players.**

### How it works today
The player taps a dish to cook it, taps it again to serve the right guest, and clears burnt dishes (`games/executive/ServeTheGuests/model.ts:274-346`).

**The only live knob is items per order, 1 to 3** (`lib/dynamicDifficulty.ts:315-327`), so there are **3 steps** today.
Everything else is a constant:

- 4 seats and 8 guests (`model.ts:27-28`)
- a 6-dish counter
- patience of 26 seconds plus 9 per item
- an 11-second window before a dish burns
- fixed cook times of 3 to 7.5 seconds

### Content
- 22 dishes and 10 guest faces. The counter can be dealt about 75k ways.
- Variety is not a concern.

### Ceilings
- **Seats**: 4 at most, and the busts already touch (`geometry.ts:113, 124-129`).
- **Counter**: 6 dishes at most. A third row or a fourth column would not fit the dish image (`geometry.ts:67-105`).
- **Order size**: 3 items at most. The order bubble wraps after 2 (`geometry.ts:162-167`).

So "more customers and more food" tops out quickly on screen.
Most of the extra depth has to come from time and sequencing.

### Depth
Turn these constants into level parameters:

- seats, 1 to 4
- counter size, 2 to 6
- items per order, 1 to 3
- guests per round
- patience tiers
- the length of the ready window
- a choice of dish set by cook time (long cooks force planning ahead)

That gives roughly **30 to 60 steps** that feel different.
This is the agent's estimate, not something the code states.

### Design impact
- There is no fail state: `completed` is always `true`, so the score only rises.
  A clear rule is needed, for example "no guest leaves unserved" or "90% of items served".
- **Speed is the risky axis.**
  A dish cannot be hurried once it is cooking (`model.ts:279`), so patience must always cover the longest cook time plus the taps.
  Pushing speed too far would test motor speed, not planning.
  The sheet says "speed is also progressive", but it needs a floor that research agrees to.
- Dish names on cards and the painted MAKE/SERVE buttons are English in the art.
  Other languages get text pills (`index.tsx:496-502`), which works but looks different.

### Questions for the team
- What does "clearing" a Tiffin Time level mean?
- What is the fastest the game should ever ask an elderly player to act?

---

## Free Me (`clear-the-way`)

**Verdict: Hundreds of good puzzles are achievable with an offline generator and the existing solver. But the sheet's own progression ("scale up the size of the puzzle box") stops at 6x6 on phones.**

### How it works today
- There are **10 hand-authored puzzles**, 2 per tier, across boards of 4x4, 5x5 and 6x6, needing 2 to 13 moves to solve (`games/executive/ClearTheWay/levels.ts`).
- A tier is chosen from the score in fifths, and a puzzle is picked from that tier's shelf.
  The generator admits the shelf is smaller than its "avoid the last 4" buffer (`lib/contentGenerators/clearTheWay.ts:13-39`).
- **A resident playing this game for 6 hours would see the same 10 puzzles over and over.** This is the worst variety of the six games.

### The solver already does the hard part
- A breadth-first search (`solver.ts`) returns the minimum number of moves, a dependency depth, and the solution path.
- It already runs live for the "Show me" hint.
- It has a `maxStates` option documented for "solving throwaway candidates in bulk" (`solver.ts:41-44`), so a generator was anticipated.
- The tests already check that every level's recorded numbers match the solver (`__tests__/levels.test.ts`).

### Puzzle supply
This estimate comes from published Rush Hour research, not from this repo:

- The standard 6x6 game has about 2.5 million distinct non-trivial puzzles, most of them short.
- This game's rules allow more: 1x1 pieces, exits on any side, and smaller boards.
- A generator could plausibly yield **hundreds of distinct puzzles per difficulty band** at 5x5 and 6x6.
- The 4x4 boards run out sooner, after a few dozen.

### Ceilings
On a 360px phone, cells come out at about:

| Board | Cell size |
|---|---|
| 6x6 | 41px |
| 7x7 | 36px |
| 8x8 | 32px |

There is a 41px floor, below which the board spills off screen (`geometry.ts:10-27, 64-67`).
`levels.ts:162-163` already notes that 7x7 would breach the touch target.
**So "bigger box" can only take the ladder from 4x4 to 6x6.**
After that, difficulty must come from more blockers, longer solutions and deeper dependency chains, which is what the sheet's second knob ("number of blockers") gives.

### Design impact
- This is the game best suited to a fixed numbered ladder (for example Level 1 to 200).
  Generate and grade puzzles offline, sort them by minimum moves and dependency depth, and ship them as data.
  Every resident then sees the same "Level 40", which suits research comparisons.
- There is no fail state and no clock.
  "Stay until cleared" holds trivially, because every round ends solved.
  Efficiency (moves used versus the minimum) and hints are the only performance signal.
- No reading is needed. The puzzle has no text.

### Questions for the team
- Should Free Me have a fixed, shared puzzle order (best for research), or random puzzles within a band?
- Is it acceptable for the board to stop growing at 6x6, with difficulty coming from blockers instead?

---

## Effort ranking

From least to most work to reach a 20 to 40 step ladder:

1. **Spot Focus**: the knobs and the generator exist. Mostly a level table, a clear rule and timing logs. Blocked only by the Mahjong question.
2. **Free Me**: needs an offline generator script plus a level list, and the solver already exists. Little in-game change.
3. **Tiffin Time**: turn constants into parameters, add a clear rule, and tune the timings with research.
4. **Shopping List**: needs new depth knobs and a fixed clear rule. It also needs translated item names before the hardest levels work in Hindi or Kannada.
5. **Station Master**: a rebuild of the board, the art and the round logic, plus a new order mechanic.
6. **Baggage Sort**: a new game from scratch, and its design is not written yet.

The shared work (a stored level counter, a clear rule per game, per-tap logging, and the decay decision for Q15) should come before any per-game ladder.
Every game depends on it.
