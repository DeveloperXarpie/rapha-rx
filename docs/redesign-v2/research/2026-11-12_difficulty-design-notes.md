# Difficulty Design Notes: How Each Game Should Get Harder

**Date**: 2026-11-12
**Content Type**: Research (design reading)
**Source**: a game-design rewrite of `2026-11-11_difficulty-studies.md`.
That file holds the engineering detail: code references, exact limits and measurement plumbing.
This one asks what the player feels at each step, and what we want them to feel.
**Used by**: `docs/redesign-v2/DIFFICULTY_RULES.md`.

Nothing here has been play-tested.
Every number is a starting point for a playtest, not a decision.

---

## Who we are designing for

Our players are older adults in care homes, often with slower reactions, weaker eyesight and less confidence with a touchscreen.
Each game exists to train two named skills (`FINAL_SPEC.md` section 7.1), and the difficulty ladder is how we keep each player at the edge of what they can do.
That gives every ladder three jobs:

1. **Stretch the skill, not something else.**
   If a level gets harder by being faster, smaller or more colour-subtle, a miss may come from the hands or the eyes, not the memory or attention we are trying to train.
2. **Feel fair.**
   A player should always be able to tell why they missed.
   A level that feels like bad luck teaches nothing and drains confidence.
3. **Keep the score honest.**
   If the game hands out answers, a high score means nothing, for the player or the care team.

## Patterns that show up in every game

These came up in most of the six studies, so they are worth settling once rather than six times.

- **Most games cannot be lost.**
  Shopping List, Spot Focus, Tiffen Time and Free Me always report the round as won.
  So the difficulty only ever goes up, and nothing tells the game a player is struggling.
  Each game needs a real "cleared", "try again" and "step back".
- **Help and safety nets bend the score.**
  Hints in Shopping List and Free Me, and hearts in Station Master and Garden Keeper, make the game kinder, but they also hide what the player can actually do.
  The question for each game is whether a helped answer still counts.
- **Turn one dial at a time.**
  When two things get harder at once, a player who starts missing cannot tell why, and neither can we.
  Every study lands on the same rule: one change per level, with a few deliberate pairs (for example, a longer list comes with a shorter wait, so the level does not jump twice).
- **New things arrive gently.**
  When a new feature appears, such as a fourth station, twin items or a bigger board, the other settings drop back to their easiest so the player can learn the new idea first.
- **Never step backwards.**
  Once a level adds something, later levels keep it.
  A level that feels easier than the one before reads as a bug, or as the game going easy on you.
- **Phone or tablet matters.**
  Several ladders hit the edge of the screen before they run out of ideas.
  A phone limits the top levels of Spot Focus and Free Me and squeezes every grid.
- **Seeing the same thing twice spoils it.**
  A remembered puzzle or a repeated layout scores perfectly without any thinking.
  Freshness matters most at the top levels, where the content pool is smallest.

---

## 1. Shopping List

**Skills:** Recall, Retention.
**The fantasy:** you read a shopping list, walk to the market, and pick the right items off the shelves.

### What the player actually does

You study a list, the list is covered, and after a short pause you pick items from a 16-crate market shelf.
There is no study timer; you press READY when you feel ready.
Strictly, this is recognition (spotting the right item) rather than free recall (naming it from memory).
The game today has no lives and no clock.

### What makes it harder

| Dial | Easy end | Hard end | How it feels to the player |
|---|---|---|---|
| List length | 3 items | 6 items | More to hold in mind. Six is the most the cart can show, and it already sits at the top of typical span for older adults. |
| Wait before shopping | 1.5 s | 6.5 s (8 s at most) | Holding the list a little longer. Past about 8 s it becomes a blank stare rather than training. |
| Twins on the shelf | off | on | Every list item has a look-alike next to it ("vine tomatoes" next to "tomatoes"). You must remember exactly what was listed. |
| One-aisle lists | off | on | All items come from one group, such as produce, so they blur together. Only produce and staples have enough items to work. |
| How close the twins are | loose | very close | The closest twins are the pulses, which differ only in colour. This dial is proposed, not built. |
| Hints | 2 | 0 | Each hint shows one remaining item for 3 seconds. |

Possible later dials: a study time limit, fewer crates, or a small distracting task between the list and the shelf.

### How the curve should feel

The list grows by one item at a time, and the wait drops back to short on the step where the list grows, so the player is never hit twice at once.
Then the features unlock in order: twins, then one-aisle lists, then the closest twins, then any distracting task.
Hints fade out as the list grows.

### Winning and losing

Today every round counts as a win, so the level never drops.
Proposal: clear with at most one miss and no wrong picks (perfect only, for lists of 3); step back below half right; anything in between replays the level.
A hinted item counts as not remembered.
Retention cannot decide a level, because it is only asked once, at the end of the session.

### Where the design leaks

- **Hints can give away most of the list.**
  With 2 hints on a 3-item list, the game can show two of the three answers.
  Either a hinted item scores as a miss, or the early levels get at most 1 hint.
- **A list can include an item and its own twin**, which quietly removes one decoy.
- **The game never re-asks the list at the end**, so Retention cannot be measured yet.
- **The word "retention" is used twice.** The short pause before shopping is not the end-of-session Retention skill. Renaming the pause would avoid confusion.

### Freshness

Plenty, even at the hardest level: tens of thousands of possible lists.

### Ladder at a glance (about 20 levels)

| Level | Items | Wait | Twins | One aisle | Hints |
|---|---|---|---|---|---|
| 1 | 3 | 1.5 s | off | off | 2 |
| 5 | 4 | 2.5 s | on | off | 2 |
| 10 | 5 | 3 s | on | off | 1 |
| 15 | 5 | 5.5 s | on | on | 1 |
| 20 | 6 | 6.5 s | on | on | 0 |

The early hint counts break the leak rule above; the rules doc already lowers them to 1.

### Design calls for you

1. Clear on a perfect round only, or allow one miss?
2. When the game is played several times in a session, which list does the end-of-session question ask about: the first, the last, or all of them?
3. Keep hints, given that they muddy Recall? Or keep them and score hinted items as misses?
4. Is 6 items the permanent cap, or is a bigger cart worth new art?
5. Item names are English-only, and the hardest twins are told apart by reading. Do the top levels wait on translations?
6. Call the skill Recognition, or add a true recall step where the player names the items?

---

## 2. Station Master

**Skills:** Association, Sequence.
**The fantasy:** you are the station master, sending each train to its own platform.

### What the player actually does

Coloured trains are shown at their stations, the stations go grey, and after a pause you send each train home.
The match is purely colour to platform; the station names appear while you study but play no part in the answer.
Trains arrive together, and nothing checks their order, so **Sequence is not trained by this game today**.

### What makes it harder

| Dial | Easy end | Hard end | How it feels |
|---|---|---|---|
| Stations | 3 | 4 (5 with new art) | One more pairing to hold. Only four colours have art. |
| Study time | about 9 s | about 3 s (never under 0.75 s per station) | Less time to take in the board. A long study time just feels like waiting, because the player cannot skip ahead. |
| Pause before sending | 1.5 s | 4 s (6 s at most) | Holding the pairings longer. The real gap is longer still, because each train's run adds time. |
| Stations reveal when filled | on | off | Today a filled station stays coloured and cannot be chosen, which gives away the last answers. Turning this off is a quiet but real difficulty step. |
| Similar colours | off | on | Warm colours that sit close together. |
| Hearts | 3 | 2 (maybe 1) | Fewer mistakes before the round ends. |

If Sequence is built, it adds its own dials: how many trains arrive in order, how far apart, and whether a wrong order costs a heart.

### How the curve should feel

The player starts with three stations and gets a generous study time.
When the fourth station arrives, study time goes up so the time per station stays the same.
Then the pauses lengthen, the giveaway switches off, any ordering rule comes in, and similar colours come last.
Hearts drop at most once every 6 levels.

### Winning and losing

The player still sees the round as won (every train home) or lost (out of hearts).
But the level should move on how well they remembered, not just whether they finished.
Today a round with two misses still counts as won, at only 50% right.
Proposal: move up when at least 75% of first tries are right in 2 of the last 3 rounds; step back after 2 lost rounds in a row, or below 50%.

### Where the design leaks

- **The last train is a gift.**
  Because filled stations cannot be chosen, the 4th train is always right unless it missed earlier, and the 3rd is a coin flip.
  This makes Association look better than it is.
- **The grey stations still give clues.** Each grey station is its coloured picture faded out, and each is a slightly different width.
- **Similar colours test eyesight as much as memory.** Colour vision fades with age, so a miss may be perceptual. This is the riskiest dial in the game.
- **Only 24 truly different memory problems exist** at four stations. The 576 "rounds" counted elsewhere are the same 24 with the trains shuffled into different lanes.
- **More than 3 hearts would not show,** because the screen always draws three.
- **A guesser who never repeats a station needs at most 6 misses,** so generous hearts remove the risk of losing.

### Freshness

Enough at every level: 6 pairings at three stations, 24 at four, 120 with a fifth.
Nothing stops the same pairing from coming up twice in a row; it should be ruled out.

### Ladder at a glance (about 24 levels)

| Level | Stations | Study | Pause | Giveaway | Similar colours | Hearts |
|---|---|---|---|---|---|---|
| 1 | 3 | 7.5 s | 1.5 s | on | off | 3 |
| 6 | 4 | 9 s | 1.5 s | on | off | 3 |
| 12 | 4 | 7 s | 2.5 s | off | off | 3 |
| 18 | 4 | 5 s | 3.5 s | off | off | 2 |
| 24 | 4 | 4 s | 4 s | off | on | 2 |

With today's dials alone, the ladder runs out at about 12 levels.
Going past 30 needs a fifth colour or the Sequence mechanic.

### Design calls for you

1. Sequence: should trains arrive one by one, with a wrong order costing a heart? Or does this game train Association only for now?
2. Similar colours: keep it as the top dial despite the eyesight risk, or commission more distinct colours?
3. New art: a fifth colour, and a plain shared station picture that fixes the grey-station clues?
4. Approve the 75%-in-2-of-3 rule to move up, and 2 lost rounds in a row to step back?
5. May any level drop to a single heart?

---

## 3. Spot Focus

**Skills:** Selective attention, Response speed.
**The fantasy:** a spot-the-difference board; two panels side by side, find what changed.

### What the player actually does

Two grids of items sit side by side, and some cells differ.
The player taps each difference.
There is no timer and no give-up: the round ends only when every difference is found.

### What makes it harder

| Dial | Easy end | Hard end | How it feels |
|---|---|---|---|
| Number of differences | 2 | 6 | More to find. Above about 40% of the cells, random tapping starts to work. Today's top level has 7 of 12 cells different, so a random tap is right more often than not, which ruins the measure. |
| How subtle the change is | bold | subtle | Bold swaps in something from another family (a cup becomes a shoe). Medium swaps in a relative (one cup for another). Subtle swaps in a near twin. Subtle is the purest test of attention. |
| Board size | 3 x 3 | 4 x 4 | More to scan. On a phone, every extra column shrinks the cards well below a comfortable touch size. |
| Mixed subtlety | one level per board | mixed | Lets a board ease in with mostly bold and one subtle. A small change to build. |
| Time limit | none | 90 s | Needed so "how many did you find" can vary. Proposed, not built. |

### How the curve should feel

1. Bold only.
2. Medium mixed with bold.
3. All medium.
4. One subtle per board.
5. Mostly subtle.
6. Tighter time limit, last.

When the board grows, the subtle count may drop by one in that same step so it does not feel like a cliff.
A time limit never arrives on the same level as the first subtle change.

### Winning and losing

Today the round cannot be lost.
Proposal: clear by finding all differences within the time limit with no more wrong taps than there are differences.
Step back when time runs out or wrong taps reach twice the differences.
When time runs out, show the player where the rest were, so they finish with the answer rather than frustration.

### Where the design leaks

- **Too many differences makes the game a tapping game,** as above.
- **Small cards make subtle changes an eyesight test.** On a phone, 4 columns gives cards about a third of the comfortable size, too small to see a twin's detail.
- **Players may learn the twins.** Only 15 families have twins, and today's top level uses 7 of them every board. This is a guess, not observed.
- **Response speed is not measurable yet,** because the game does not record when each find happened.

### Freshness

Billions of boards at the bottom and thousands at the top.
The real risk at the top is not repeated boards but repeated twin pairs.

### Ladder at a glance (about 24 levels)

| Level | Board | Differences | Bold / medium / subtle | Time limit | Wrong taps allowed |
|---|---|---|---|---|---|
| 1 | 3 x 3 | 2 | 2 / 0 / 0 | none or 180 s | 2 |
| 6 | 3 x 3 | 3 | 1 / 2 / 0 | 150 s | 3 |
| 12 | 3 x 4 | 4 | 0 / 3 / 1 | 120 s | 4 |
| 18 | 4 x 4 | 5 | 0 / 2 / 3 | 120 s | 5 |
| 24 | 4 x 4 | 6 | 0 / 0 / 6 | 90 s | 6 |

Levels 18 and 24 assume a tablet; on a phone they break the "no subtle at 4 columns" rule.

### Design calls for you

1. Phone or tablet? This decides how big the board can get and whether subtle changes ever appear at 4 columns.
2. How does a round end without every difference found: a time limit, an "I can't find it" button, or both?
3. Measure Response speed as the typical gap between finds?
4. Is the Mahjong-style alternative from the capacity doc still on the table? It would replace this ladder.
5. Commission more twin pairs to raise the ceiling on subtle changes?

---

## 4. Garden Keeper

**Skills:** Sustained attention, Self-control.
**The fantasy:** tend a garden; water the flowers when they get thirsty, and leave the wilted plants and pests alone.

### What the player actually does

Flowers become thirsty one at a time; tap them in time to water them.
Wilted plants and pests are scattered among them; tapping one costs a heart.
The round ends as soon as you hit the watering target, or when the hearts run out.

### What makes it harder

| Dial | Easy end | Hard end | How it feels |
|---|---|---|---|
| Plants in the garden | 12 | 24 (30 at most) | More to watch. Thirty is the most that fits without plants overlapping. |
| Share of hazards | 25% | 55% | More things you must not tap. |
| Time between thirsty flowers | 3 s | 1.2 s (never under 1 s) | Faster pace. |
| Time to water before it dries | 3 to 6 s | 2.8 s (never under 2.5 s) | Less time to react. Below 2.5 s, a miss tests hand speed, not attention. |
| Thirsty at once | 1 | 3 | Juggling several needs. |
| Hearts | 3 | 3 | See below. |

The round is meant to be a fixed 90 seconds, so its beginning and end can be compared.

### How the curve should feel

The code already intends "wide before fast" (more plants first, then a quicker pace), but today everything speeds up together.
The ladder should alternate: a busier garden, then a quicker pace, then busier again.
The pace starts tightening about a third of the way up.
A second thirsty flower at once only arrives once the garden has at least 15 plants, and a third once it has 21.
Every 30-second stretch needs at least 10 thirsty flowers, or one slip swings the score too much to mean anything.

### Winning and losing

Proposal: always play the full 90 seconds.
Clear by keeping a heart and watering at least 70% of thirsty flowers (to be signed off).
Fail by losing every heart, or by finishing below the bar.

### Where the design leaks

These are the most serious problems of the six games.

- **Self-control has nothing to resist.**
  Hazards sit still as scenery, so there is never a moment where something tempting appears and the player must hold back.
  To measure self-control properly, pests need to pop up for a moment and then leave.
- **Hearts cap the mistakes.**
  With 3 hearts, the game can only ever record 0 to 3 wrong taps, so every careless player looks about the same.
- **Sustained attention has no "end of round".**
  The round stops as soon as the target is hit; a competent player clears level 1 in about 30 seconds, so there is no late stretch to compare with the start.
- **The easiest level is too sparse.**
  With a 6 second window and one flower every 3 seconds, a quiet player sees only 3 to 5 thirsty flowers per 30 seconds: too few to measure.
  Fixing it means a shorter window at level 1, which is less generous.
- **Taps on flowers that are not ready show a message but are not counted,** though they may be impulsive taps.
- **At the top, the garden runs low on fresh flowers,** because a watered flower rests before it can be thirsty again.

### Freshness

Every round is random: species, positions, pests and order.
Level 1 feels thin, though: only three hazards, and just one pest.

### Ladder at a glance (about 24 levels)

| Level | Plants | Hazards (wilted / pest) | Pace | Window | At once | Target | Hearts |
|---|---|---|---|---|---|---|---|
| 1 | 12 | 2 / 1 | 3 s | 3 s | 1 | 8 | 3 |
| 6 | 15 | 3 / 2 | 3 s | 4.5 s | 2 | 10 | 3 |
| 12 | 18 | 4 / 3 | 2.2 s | 4.4 s | 2 | 14 | 3 |
| 18 | 21 | 5 / 5 | 1.7 s | 3.4 s | 2 | 17 | 3 |
| 24 | 24 | 7 / 6 | 1.2 s | 2.8 s | 3 | 20 | 3 |

### Design calls for you

1. Self-control: measure it as wrong taps per minute, or build pests that pop up so there is something to resist?
2. Always play the full 90 seconds, dropping the early finish?
3. Keep 3 hearts? The alternative is no game over, with a lost heart as feedback only.
4. What watering rate clears a level?
5. Level 1: a generous 6 second window, or enough thirsty flowers to measure?

---

## 5. Tiffen Time

**Skills:** Sequencing, Decision-making.
**The fantasy:** run a tiffin counter; cook what the guests ordered and serve them before they lose patience.

### What the player actually does

Guests sit at the counter with an order of one to three dishes and a patience bar.
You tap a dish to cook it, then tap it again to serve it.
The game, not the player, picks which guest gets the dish: always the least patient one.
Dishes can be served in any order.

That last point matters: **neither skill is really trained yet.**
Sequencing needs a dish with steps in an order (for example prepare, cook, plate), and that mechanic does not exist.
Decision-making needs a real choice between guests, but the game picks the guest, and a guest's patience depends only on how big the order is.
The only real choice today is which dish to cook first.

### What makes it harder

| Dial | Easy end | Hard end | How it feels |
|---|---|---|---|
| Guests at once | 2 | 4 | More to juggle. Four is the most that fits. At least 2 at every level, or there is no choice to make. |
| Dishes on the counter | 3 | 6 | More to scan. Six is the most that fits. |
| Dishes per order | 1 | 3 | Bigger orders. |
| Guests per round | 6 | 12 | A longer service. |
| Patience | generous | tight | Less slack. It must never get so tight that it tests hand speed rather than planning; a cook cannot be rushed. |
| Uneven patience | none | some guests in more of a hurry | Gives the player a real "who first?" question. Proposed, not built. |
| How long a ready dish lasts | 16 s | 9 s | Ready dishes burn sooner. Above about 20 s, nothing ever burns. |
| Cooking times | short dishes | long dishes | Long cooks force the player to plan ahead. |

### How the curve should feel

Unlock in this order: more guests (2, 3, then 4); a bigger counter; bigger orders; longer cooking times; uneven patience; and finally tighter patience and shorter-lasting dishes.
Sequencing steps come last, once they exist.
Never make maximum orders, minimum patience and long cooks all arrive together without a playtest.

### Winning and losing

Today every round counts as a win, and the score measures how many items got served, which is neither skill.
Proposal: clear by serving at least 80% of items with at most one guest walking out.
Step back below 60%, or at 3 walkouts.
In between, replay.

### Where the design leaks

- **The game makes the key decision for the player** by choosing which guest gets each dish.
- **The speed bonus and on-screen points reward fast tapping,** not good planning, and feed nothing in grading.
- **Cooking a dish nobody ordered passes silently,** though it is exactly the kind of planning mistake we want to see.

### Freshness

Plenty at every level: over a thousand counters at the bottom and tens of thousands at the top, with random orders and faces on top.

### Ladder at a glance (about 30 levels)

| | L1 | L8 | L15 | L23 | L30 |
|---|---|---|---|---|---|
| Guests at once | 2 | 3 | 4 | 4 | 4 |
| Counter | 3 | 4 | 5 | 6 | 6 |
| Dishes per order | 1 | 1-2 | 1-2 | 1-3 | 2-3 |
| Guests per round | 6 | 8 | 8 | 10 | 12 |
| Patience (base / per dish) | 40 / 10 s | 34 / 9 s | 30 / 9 s | 26 / 9 s | 22 / 8 s |
| Ready dish lasts | 16 s | 14 s | 12 s | 11 s | 9 s |
| Cooking times | short | short + mid | all | all | mostly long |

Level 23 is roughly today's hardest.
Level 30 needs a timing playtest with residents before anyone trusts it.

### Design calls for you

1. Sequencing: add dishes with steps, or drop Sequencing from this game?
2. Decision-making: give the player the choice of guest, or judge it by which dish they cook first?
3. What share of dishes served, and how many walkouts, count as a clear?
4. What is the tightest patience we will ever ask of a resident?
5. Keep the on-screen points, remove them, or show the level number instead?
6. "Tiffen" or "Tiffin"? The docs use both.

---

## 6. Free Me

**Skills:** Planning, Problem-solving.
**The fantasy:** a sliding-block puzzle; slide the obstacles aside to free the fish.

### What the player actually does

You slide blocks to clear a path, and the fish swims out to the right.
A hint unlocks once you have used twice the fewest possible moves.
Ten puzzles ship today, two per difficulty tier.
The game's own solver has checked every one of them.

### What makes it harder

| Dial | Easy end | Hard end | How it feels |
|---|---|---|---|
| Fewest moves to solve | 2 | 15-16 | The core of the challenge: how far ahead you must think. Nothing ships above 13 moves yet. |
| Moves before the fish can move | 1 | 10+ | The length of the chain you must untangle before you see progress. |
| Board size | 4 x 4 | 6 x 6 | More moves available each turn. Six by six is the largest that fits a phone, so later difficulty must come from tighter packing, not bigger boards. |
| How tightly packed | about 45% full | about 75% full | Fewer escape routes. The hardest puzzles come from packing, not size. |
| Small single-cell blocks | up to 3 | none | They are hard to drag, and they let players sidestep the intended chain. None on 6 x 6. |
| Exit side | right | any side | Supported by the code but never shown or tested; save it for the last third, if ever. |

### How the curve should feel

Each level has one "fewest moves" value, and that value never goes down.
It rises by one step at a time.
The board grows only at the start of a new value, and when it grows the move count holds still so the player can get used to the space.
Every puzzle in a level shares board size and move count.

### Winning and losing

Today every round counts as a win.
Proposal: clear by solving with no hint and no restart.
Any hint, restart or walking away counts as not cleared.
Planning (how close to the fewest moves you got) is reported, but does not decide the level.

### Where the design leaks

- **Remembered solutions are the biggest problem.**
  With only two puzzles per tier, a player who remembers a solution scores perfectly on both skills without thinking.
  The "don't repeat" memory also empties when the app reloads.
- **One wasted move hurts short puzzles far more.**
  On a 2-move puzzle, one extra move drops Planning to 67; on a 13-move puzzle it is 93.
  Planning scores cannot be compared across levels as they stand.
- **On a crowded phone board, a slipped finger counts as a wasted move,** which wrongly lowers Planning.
- **Walking away is invisible**, so unsolved puzzles drop out and Problem-solving looks better than it is.
- **The move count carries through a restart**, mixing two attempts in one Planning score.

### Freshness

This is the one game that needs new content.
Each level wants at least 4 puzzles, ideally 8-10, so solutions are not remembered: 120 or more for 30 levels.
An offline puzzle generator can produce them, with every puzzle checked by the solver.
Flipping a board top to bottom is a cheap extra variant that keeps it exactly as hard, though it helps more against recognising a board than against a remembered solution.

### Ladder at a glance (about 30 levels, two per move count)

| Level | Board | Fewest moves | Blocks | Must move | Packing |
|---|---|---|---|---|---|
| 1 | 4 x 4 | 2 | 4 | 1 | about 45% |
| 8 | 5 x 5 | 4 | 6 | 3 | about 55% |
| 15 | 6 x 6 | 7 | 8 | 5 | about 58% |
| 23 | 6 x 6 | 10 | 10-11 | 6-7 | about 68% |
| 30 | 6 x 6 | 15-16 | 11-12 | 8-10 | about 75% |

Whether enough level-30 puzzles exist is unverified.

### Design calls for you

1. One fixed puzzle per level for everyone (best for research), or a random pick from the level's pool?
2. Should a restart count as not cleared?
3. A move ceiling, such as 3 times the fewest moves, after which the round ends unsolved?
4. Planning on a restarted round: count moves since the last restart, or all moves?
5. Keep the hint unlocking at twice the fewest moves, or vary it by level?
6. Is it fine that the board stops at 6 x 6, with all later difficulty from tighter packing and longer solutions?
