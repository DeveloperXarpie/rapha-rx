# Clear the Way - design spec

Date: 2026-08-19
Content Type: Design specification
Status: approved, in implementation
Source brief: "Design Brief: Sliding-Block Escape Puzzle" (working title "Finding Temo")
UI reference: `assets-src/keyescape/image_13.png`

## 1. What the game is

A grid-based sliding-block escape puzzle, the fourteenth game in the app and the fifth
in the **executive** category.

The board is a walled grid holding rectangular blocks. One block is the **key piece**:
it carries the thing the player is trying to free. The wall has a single **gap**, aligned
to one lane. The player slides obstructing blocks out of the way until the key piece can
reach the gap.

One puzzle is one round. No timer, no fail state, no score clock. The whole cognitive
load is spatial reasoning and move sequencing: read the board, find the blocking chain,
move the obstructions in dependency order, slide the key out.

Target round length is 30-90 seconds.

## 2. Why executive, not attention

The trained faculty is planning under a dependency constraint. The first move a player
can make is almost never the first move that helps; they have to hold a chain of
"before I can move A I must move B, and before B, C" and execute it in order. That is
sequencing and inhibition of the obvious move, which is the same faculty
`garden-sequencer` and `recipe-builder` train, reached through a spatial rather than a
procedural surface.

## 3. Naming and identity

Game id: **`clear-the-way`**.

`GameShell` renders its header title by title-casing the game id, so the id is also the
visible name ("Clear The Way"). The id is additionally the key under which per-day
`DifficultyState` rows and Amplitude events are written, so renaming it later strands a
resident's difficulty history.

The id is therefore deliberately theme-free. The shipped skin is the underwater reef of
the reference art, but a later re-skin to a market alley or a rickshaw lane is a change
to one file and no data migration.

## 4. Architecture

```
src/games/executive/ClearTheWay/
  model.ts        pure rules: board, pieces, legal travel, moves, solved test
  solver.ts       BFS over board states: minMoves, dependencyDepth, nextBestMove
  levels.ts       the level catalog, authored as ASCII layouts
  geometry.ts     grid -> pixel layout, responsive cell sizing
  skin.ts         every theme-specific value behind neutral names
  styles.tsx      scoped CSS, house pattern
  index.tsx       the React view: render, drag, move accounting, win state
  __tests__/model.test.ts
  __tests__/solver.test.ts
  __tests__/levels.test.ts

src/lib/contentGenerators/clearTheWay.ts   picks a level for the round
```

`model.ts` and `solver.ts` touch neither React, the DOM, nor the clock. The view owns the
loop and the pixels; the model owns the rules. This is the same split `ServeTheGuests`
and `GardenKeeper` use.

### 4.1 The rules core (`model.ts`)

A board is `{ cols, rows, exit, pieces }`. A piece is
`{ id, letter, col, row, w, h }` where `col`/`row` are the top-left cell.

Orientation is derived from the footprint, never stored:

| Footprint | Movement |
|---|---|
| `w > 1` | horizontal only, along its long axis |
| `h > 1` | vertical only, along its long axis |
| 1x1 | free: both axes, but a single drag locks to one |

Nothing rotates. Pieces are 1x1, 1x2 or 1x3.

Core functions:

- `travelRange(board, pieceId, axis) -> { min, max }` - how many cells the piece may
  move in each direction along that axis before it hits a wall or another piece. `min`
  is negative or zero, `max` is positive or zero.
- `applyMove(board, pieceId, axis, delta) -> Board` - returns a fresh board. Throws on
  an illegal delta rather than clamping silently, so a view bug surfaces in tests.
- `isSolved(board) -> boolean` - true when the key piece is flush against the exit wall
  and occupies the exit lane.
- `legalMoves(board) -> Move[]` - every legal single move on the board, used by the
  solver.
- `serialize(board) -> string` - a canonical string of the occupancy grid, used as the
  BFS visited-set key.

`isSolved` uses the standard Rush Hour formulation: the key does not travel through the
wall in the model, it reaches the wall on the exit lane. The escape itself is a view
animation played after `isSolved` flips.

**1x1 pieces.** The brief calls for them to move freely. They do, but a drag locks to
whichever axis the finger commits to first, so an L-shaped drag is impossible and one
drag is still exactly one move. This keeps the move count honest and keeps the solver's
branching factor at 4 directions rather than a path search. Levels should use 1x1s
sparingly: a free piece can sidestep out of a dependency chain instead of being part of
it, which softens the puzzle.

### 4.2 Level format (`levels.ts`)

Levels are authored as ASCII so that adding one is a five-line diff. Making new levels
cheap to add was an explicit requirement of the brief.

```ts
{
  id: 'reef-05',
  tier: 3,
  cols: 6,
  rows: 6,
  exit: { side: 'right', index: 3 },
  layout: [
    '.....g',
    '.dddfg',
    '..hcfg',
    'KKhcfa',
    '...bbb',
    '....ee',
  ],
  minMoves: 7,
  dependencyDepth: 6,
}
```

- `.` is an empty cell.
- `K` is the key piece. Exactly one per level, 1x2 horizontal, and it must lie in the
  exit lane.
- Any other character is an obstacle piece. All cells bearing the same character form
  one piece.
- `exit.index` is a row index for a `left`/`right` exit and a column index for a
  `top`/`bottom` exit.

`parseLevel` validates and throws on: a footprint that is not a solid rectangle of width
or height 1, a piece longer than 3 cells, a missing or misshapen key, a key not aligned
with the exit, a layout whose row lengths disagree with `cols`/`rows`, or an out-of-range
exit index. A malformed level fails at parse time with a message naming the level, not at
render.

`exit.side` carries all four sides from day one even though every shipped level uses
`right`. Left and top exits, and dead-end decoy pieces, then become data-only additions
with no code change, which is what the brief asked for as future support.

### 4.3 The solver (`solver.ts`)

Breadth-first search over serialized board states. One edge is one complete slide of any
distance, which mirrors the rule that a drag counts as one action however far it pulls.

- `solve(board) -> { minMoves, dependencyDepth, path } | null`
- `dependencyDepth` is the number of moves in the optimal solution that precede the first
  move of the key piece. This is the brief's "how many moves must precede the first
  useful one", and it is the second difficulty axis after piece count.
- `nextBestMove(board) -> Move | null` - the first move of an optimal path from the
  current state. Used by the in-game hint.
- The search is capped at 200,000 visited states and returns null past that, so a
  pathological hand-authored level fails a test rather than hanging a browser tab. The
  cap is overridable per call (`solve(board, { maxStates })`), which is what the level
  authoring harness used to reject expensive candidates cheaply.

Shipped boards are at most 6x6, so the reachable state space stays well inside that cap.

**How the hard levels were authored.** Random dense boards almost never need ten or more
moves, so the tier 5 boards were not found by generate-and-test. Sliding moves are
reversible, which makes the state graph undirected: enumerating a dense board's entire
reachable space and running a multi-source breadth-first search out of its solved states
gives every configuration's true distance from the exit. The furthest one is that piece
set's hardest legal board, and that is what shipped. The harness was throwaway; the
numbers it produced are re-derived and asserted by `levels.test.ts` on every run.

### 4.4 Difficulty and level selection

`getClearTheWayParams(score)` in `src/lib/dynamicDifficulty.ts` maps the daily 0-1
difficulty score onto `{ tier: 1..5 }`, in even bands of 0.2.

`src/lib/contentGenerators/clearTheWay.ts` picks a level of that tier, skipping ids held
in a module-scope recent-ids ring buffer so a resident is not handed the same board twice
running. The buffer holds the last 4 ids and resets on page load. No Dexie schema change
and therefore no new `.version()` block.

A tier's shelf is smaller than the buffer is deep, so "unplayed recently" is exhausted
within a few rounds. The constraint is then relaxed one step at a time rather than
dropped: first to "anything but the board just played", and only for a single-level shelf
to an outright repeat. The tier itself is never traded away, because being at the right
difficulty matters more than novelty.

Difficulty scales by piece count first and dependency depth second, not by grid size
alone, per the brief:

| Tier | Grid | Pieces | Minimum moves |
|---|---|---|---|
| 1 | 4x4 | 4-5 | 2-3 |
| 2 | 5x5 | 6-7 | 4-5 |
| 3 | 6x6 | 8-9 | 6-7 |
| 4 | 6x6 | 10-11 | 8-9 |
| 5 | 6x6 packed | 11-12 | 10-16 |

Tier 5 is a dense 6x6 rather than a 7x7. Length comes from packing, not from area: a
loose 7x7 solves in fewer moves than a tight 6x6, and the smaller grid also keeps every
block above the 80px touch target.

The band the catalog is held to in the test suite is minimum moves, because that is what
the player feels and what the score is computed from. Dependency depth is recorded per
level and asserted, but not banded: on a dense board it tracks minimum moves closely,
since the key itself usually moves exactly once.

Ten levels ship, two per tier.

### 4.5 The view (`index.tsx`, `geometry.ts`, `skin.ts`)

**Drag.** Pointer events on the piece. `pointerdown` captures the pointer and asks the
model for the travel clamp. The piece then follows the finger live, clamped to that
range, so it is impossible to drag a piece through another one - the block stops dead at
the collision, which is the feedback the mechanic depends on. `pointerup` snaps to the
nearest cell and commits one move if the displacement is non-zero. Drag is the only
input; there is no tap-to-move.

**Sizing.** Cell size is `min(availWidth / cols, availHeight / rows)`, capped at 96px and
floored at 56px, with the wall thickness scaled as a fraction of a cell so the frame grows
with the board. No shipped level exceeds 6x6, so the 56px floor is only reachable on a
very short viewport; the ladder topping out at 6x6 rather than 7x7 is what keeps blocks at
a comfortable size for this audience.

**Skin.** `skin.ts` holds every reef-specific value - block fills and edge treatment, the
key piece's cage, the exit glow, the backdrop - behind neutral names (`blockFill`,
`keyArt`, `exitGlow`). Re-skinning is that one file. The board renders programmatically
in the app's design tokens for now; commissioned art drops into the same slots later, the
way Garden and Tiffin did.

## 5. Controls, scoring and the stuck resident

Two controls sit under the board: **Reset**, which restores the level's start position,
and **Show me**.

"Show me" appears only after the player has spent more than twice the level's optimal
move count. It pulses the single piece the solver says to move next; it does not move it.
This is not in the original brief and is deliberate: with no timer and no fail state, a
stuck resident is stuck permanently, and this population will not self-rescue. It reuses
`nextBestMove` and is priced into the performance ratio.

Metrics reported on `onLevelComplete`:

```ts
{ levelKey, movesUsed, minMoves, resets, hintsUsed }
```

`computePerformanceRatio` for `clear-the-way` is move efficiency:

```
clamp01(minMoves / max(1, movesUsed) - 0.1 * resets - 0.15 * hintsUsed)
```

A no-fail-state puzzle gives the difficulty engine nothing else to read, so the ratio has
to be granular on its own. Move efficiency is exactly the thing the game trains: a player
who thrashes and eventually stumbles out scores low, a player who plans scores high, and
both completed the round.

## 6. Testing

`npm test` (vitest, node environment, `src/**/__tests__/**/*.test.ts`).

- `model.test.ts` - travel clamps against walls and neighbours, horizontal and vertical
  axis restriction, 1x1 freedom, `applyMove` immutability, illegal-move rejection,
  `isSolved` true only on the exit lane flush against the wall.
- `solver.test.ts` - known small boards with hand-verified optima; an unsolvable board
  returns null; `dependencyDepth` is zero when the key's first move is the first move.
- `levels.test.ts` - the gate on the catalog. Every level parses, is solvable, and its
  recorded `minMoves` and `dependencyDepth` match what the solver computes, and both sit
  inside their tier's band. A mis-tuned hand-authored level cannot reach main.

## 7. Integration surface

New files as listed in section 4, plus `public/placeholders/games/clear-the-way.svg` for
the home-screen tile.

Modified:

| File | Change |
|---|---|
| `src/screens/GameRouter.tsx` | import, registry entry, generator branch |
| `src/lib/dynamicDifficulty.ts` | `ClearTheWayDynamicParams`, `getClearTheWayParams` |
| `src/components/GameShell.tsx` | `computePerformanceRatio` case |
| `src/screens/HomeScreen.tsx` | executive tile |
| `public/locales/{en,hi,kn}/common.json` | game name and in-game copy |
| `package.json` | minor version bump (new game) |

## 8. Out of scope

Left and top exits, dead-end decoy pieces, and pieces that must move away from the exit
are all supported by the data model and left for later level authoring. Procedural level
generation, undo, per-level star ratings, and a level-select screen are not part of this
work.
