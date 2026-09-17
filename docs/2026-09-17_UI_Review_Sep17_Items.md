# UI Review - 17 Sep 2026 - Task List

**Date**: 2026-09-17
**Content Type**: Task List / Review Breakdown
**Source**: `docs/Copy of UI_review-17thsep.pdf` (8 pages)
**Branch**: `feat/app-flow-redesign`
**Status**: implemented at v1.32.0, revised at v1.32.1, v1.32.2, v1.32.3, v1.32.4 and v1.32.5 after smoke tests

## Screen-to-code map

The review uses the marketing names. In the code they are:

| Review name | `gameId` | Source |
|---|---|---|
| Station Master | `train-yard` | `src/games/memory/TrainYard/` |
| Shopping List | `market-memory` | `src/games/memory/MarketMemory/` |
| Spot Focus | `spot-focus` | `src/games/attention/SpotFocus/` |
| Free Play library | - | `src/screens/FreePlayScreen.tsx` |

## The through-line

Six of the eight pages are one request wearing different clothes: **every instruction
panel should be a blue plate with white text, at a larger size**, and it should be the
same plate in every game. Right now there are three unrelated implementations:

- `TrainYard/index.tsx:520-552` - pale `KIT_COLOURS.panel` plate, navy text, 25px, with a brain disc.
- `MarketMemory/geometry.ts:173` + `index.tsx:307` - pale plate, navy text, 30px, fixed 60px box.
- `SpotFocus/Scene.tsx` - a three-slice **wooden signboard** sprite with dark text, plus a
  separate instruction line underneath it.

So T1 below is the foundation and most of the other panel tasks are "adopt T1".

---

## Tasks

### T1 - Shared `InstructionPanel` component `[foundation]`

**New**: `src/components/chrome/InstructionPanel.tsx`, plus a blue/white token pair in
`src/lib/uiKit.ts` (`KIT_COLOURS` only has `panel`, `navy`, `slot`, `slotBorder` today -
there is no "instruction blue" anywhere).

Deep blue fill, white bold text, rounded, soft drop shadow, scaled up from today's sizes
(page 1: "font size should also be scaled up"). Takes the text and an optional leading
icon slot, sizes itself to the text, and keeps the one-line-no-wrap guarantee that
`MarketMemory/geometry.ts:164-171` currently hand-tunes.

Absolutely-positioned games (TrainYard, MarketMemory) place it on their design canvas;
flow-layout games (SpotFocus) drop it in the column.

### T2 - Station Master: adopt the blue panel (page 1, page 2)

`src/games/memory/TrainYard/index.tsx:520-552`. Swap the pale plate for T1. Decide
whether the brain disc survives - the page-1 and page-2 mockups both show the panel
**without** it (see Q1).

### T3 - Station Master: mask the background (page 2)

Page 2 annotates "Background masked" pointing at the scenery. The mockup board is
visibly darkened / blue-tinted relative to the live build, so the panel, the station signs
and the trains carry the contrast rather than competing with sunlit grass. Implement as a
tint layer over the board art, under the interactive sprites. Scope in Q2.

### T4 - Station Master: white ring on the selected train (page 2)

`src/games/memory/TrainYard/Train.tsx:143-158`. Today the selection ring is an amber
`#FFE083` **rounded rectangle** with dark edge bands, widened by the Sep-10 review. The
Sep-17 mockup asks for a **round white outline** instead. This reverses a deliberate
Sep-10 decision (the code comment says amber-alone failed the "highlight should be
bolder" note), so worth calling out - white on the darkened board of T3 should hold fine,
but T3 and T4 need to land together or the ring gets worse, not better.

### T5 - Station Master: re-skin the retention cover (page 3)

`src/games/memory/TrainYard/Blind.tsx`. Page 3 carries no text, only a before/after pair.
Today: a beige slatted blind with "SIGNS COVERED" and five progress dots. Proposed: a
level-crossing barrier - dark maroon band, yellow/black hazard stripes top and bottom,
and two large signal lamps in place of the dot row. The two insets to the right show the
lamps in alternating lit states, i.e. the hold is counted by the lamps flipping rather
than by dots filling. The "SIGNS COVERED" copy disappears in the mockup. See Q3 - this is
my reading of a wordless page.

### T6 - Free Play: bigger type (page 4)

`src/screens/FreePlayScreen.tsx:66-71` (title 27/700, subtitle 21/600) and `:87-94`
(section headings 20/800). All three arrows land here. The section headings were already
bumped 14/700 to 20/800 by the Sep-10 review and are being asked to grow again -
"bigger and bolder". Check the three-up tile grid still fits the longest word (`ATTENTION`)
without reflowing.

### T7 - Shopping List: lower the clipboard and READY (page 5)

`src/games/memory/MarketMemory/geometry.ts`. The list card and the READY button move down
so the instruction panel has clear air above them - today `CAPTION.top` is 104 with a 24px
clearance and the clipboard hangs off the caption's bottom edge, and in the screenshot the
caption visibly overlaps the clipboard's header. The T1 panel is taller than today's 60px
box, so this is partly a consequence of T1 and partly an extra nudge. Re-check `CANVAS_H`
headroom - READY is already near the bottom.

### T8 - Shopping List: darken the hint badge count (page 5)

`src/games/memory/MarketMemory/CartStrip.tsx:174-190`. The count is white on the green
badge painted into the hint art; at that size on that green it does not read. Change to a
dark colour. (The badge fill is baked into the `UI_HINT` art, so only the numeral is ours.)

### T9 - Shopping List: adopt the blue panel (page 6)

`src/games/memory/MarketMemory/index.tsx:307-310` and the `CAPTION` box in `geometry.ts`.
Same swap as T2. Explicitly cross-referenced by the reviewer to page 1.

### T10 - Spot Focus: replace the wooden signboard with the blue panel (page 7)

`src/games/attention/SpotFocus/Scene.tsx`. This is the biggest single change: the
signboard is three sliced sprites (`UI_PLANK_LEFT/MID/RIGHT`) with a documented
justification for existing. T1 retires all of it. The separate instruction line below it
folds into the panel or stays as a plain line under it (Q4).

### T11 - Spot Focus: lower the panel (page 7)

Same file. The plank currently sits flush at the top of the play box under the HUD.

### T12 - Spot Focus: remove the "I'm Ready" button (page 7)

`src/games/attention/SpotFocus/index.tsx:166-180`. The round starts as soon as the screen
appears. The button and the `x / y Found` pill share one fixed 74px slot precisely so
nothing shifts when the round starts - with the button gone that slot just holds the pill
from the start, which is simpler. `currentPhase` starts at the intro phase and `advance()`
is what moves it on; that transition becomes automatic.

Scoped to Spot Focus only. Page 5 keeps Shopping List's READY (it only moves it), and the
review says nothing about `remember-match` or `shopping-list-recall`, which have their own
"I'm Ready!" buttons. Q5.

### T13 - Spot Focus: fade the background (page 7)

`Scene.tsx` - `BG_SCENE` renders at full strength today. "Keep it as light as possible":
a white wash over the backdrop so the two comparison grids sit on near-white.

### T14 - Spot Focus completion screen: same treatment (page 8)

`src/games/attention/SpotFocus/index.tsx:123-137`. Inherits T10/T11/T13 automatically via
`Scene`, but needs its own check: the mockup shows the heading **clipping its own plank**
("You found all 3 differences! Well done!" is cut off top and bottom), which is a real bug
the blue panel must not reproduce - the panel has to grow to two lines rather than clip.
The `Continue` button stays; T12 does not apply here.

### T15 - Release chores

- `npm run lint` (count before/after - standing backlog, gate is "no new errors")
- `npm test`
- `npm run build`
- Version bump in `package.json` - **minor**, this is a visual system change across four screens
- Manual smoke test on localhost, then on the Vercel Preview
- Promote to Production in the Vercel dashboard (pushing is not deploying)

---

## Decisions taken (answers to the questions this list was written to ask)

**Q1 - the brain disc**: dropped. Train Yard's panel is the sentence alone.

**Q2 - how far the mask goes**: up for exactly as long as the instruction panel is. In
Train Yard the panel never comes down, so in practice the yard is masked for the whole
round - which is what both page-2 mockups show.

**Q3 - page 3**: the barrier art, no "SIGNS COVERED" caption, lamps alternating red /
green / black. The caption survives as an `sr-only` line, because it is the only thing
telling a screen-reader user the signs have just been covered.

**Q4 - Spot Focus' second line**: both sentences go inside the panel.

**Q5 - how many games**: the six in rotation, and only where they actually have an
instruction surface. That came to four - Train Yard, Market Memory, Spot Focus and Clear
The Way. Garden Keeper's `gk.instruction` is a heading inside a briefing modal, not a
panel, and Serve The Guests has no instruction line at all: the guests' order bubbles are
what speak to the resident. Neither was touched.

**Q6 - ordering**: as proposed.

## What shipped

| Task | Where |
|---|---|
| T1 | `src/components/chrome/InstructionPanel.tsx`, `KIT_COLOURS.instruction` + `INSTRUCTION_SCRIM` in `src/lib/uiKit.ts` |
| T2 | `TrainYard/index.tsx` - panel adopted, brain disc gone |
| T3 | `TrainYard/index.tsx` - backdrop wrapped in its own stacking context, scrim above track and scenery, below stations and trains |
| T4 | `TrainYard/Train.tsx` - white circular ring, one dark edge, replacing the amber rounded rectangle |
| T5 | `TrainYard/Blind.tsx` rewritten as the crossing barrier; lamp keyframes and barrier colours in `TrainYard/styles.tsx` |
| T6 | `FreePlayScreen.tsx` - title 27 to 34, subtitle 21 to 24, section headings 20 to 26 |
| T7 | `MarketMemory/geometry.ts` - `CAPTION.height` 60 to 72, `CAPTION_CLEARANCE` 24 to 40; clipboard and READY drop 28px with it |
| T8 | `MarketMemory/CartStrip.tsx` - hint count now `#0E3311` |
| T9 | `MarketMemory/index.tsx` - panel adopted |
| T10-T13 | `SpotFocus/Scene.tsx` rewritten; `SpotFocus/index.tsx` - `scene_intro` phase removed |
| T14 | inherited via `Scene`; the panel grows to two lines instead of clipping |
| T15 | v1.32.0; lint 31 errors before and after, all pre-existing; 500 tests pass; build clean |

Dead code removed along the way: `UI_PLANK_LEFT/MID/RIGHT` and `PLANK_CAP_RATIO` from
`SpotFocus/sprites.ts` (and their assertion in `__tests__/sprites.test.ts`),
`COLOURS.signText` from `SpotFocus/palette.ts`, `blindSlatA`, `blindSlatB` and `signWood`
from `TrainYard/styles.tsx`, and `spot-focus.intro.ready` and `spot-focus.btn.ready` from
all three locales.

## Smoke-test round 1 (revisions at v1.32.1)

- **The Station Master mask was invisible.** A navy scrim at 46% over sunlit green gets
  darker but stays green, and the reference is cool and flat as well as dark. The mask is
  two declarations now: `BACKDROP_MASK` (`saturate(.5) brightness(.62)`) on the backdrop,
  and `INSTRUCTION_SCRIM` at `rgba(20,70,130,.5)` over it. The board plate moved off the
  board element and onto the backdrop so the filter reaches it - it was the one thing in
  the yard a scrim covered but a filter would have missed.
- **The barrier lamps now count rather than blink.** Red under 0.4 of the hold, both dark
  to 0.75, green after, then the barrier lifts. The CSS alternation is gone, and with it
  the `ty-lamp-a` / `ty-lamp-b` keyframes: the lamps are driven straight off `progress`,
  which puts back the "how much longer" the five dots used to carry.
- **Spot Focus was top-heavy.** The two panels were `flex-1`, so they stretched over the
  height the 3:4 cards did not need and the cards piled at the top of two tall empty
  frames. The row is `flex-none` now and the stage centres it; the panel's own drop went
  from 26 to 48.
- **Shopping List**: the panel dropped 16px (`CAPTION.top` 104 to 120) with
  `CAPTION_CLEARANCE` giving 14 of it back, so the clipboard and READY stay where the
  first pass put them - READY still ends at 1223 of 1250. The hint count went from 0.72 to
  0.92 of the badge diameter.

## Smoke-test round 2 (revisions at v1.32.2)

The mask was applied flat across the whole board. It should exempt the station row and
the train row - those are the two places in this game where a resident reads colour,
which is the entire task, so masking them masks the thing the mask exists to make
legible. The reference render is explicit: the grass under the stations and under the
trains is the board's own #9EBA3F, untouched, while everything between sits at #416070.

- The mask is now two elements, each carrying one radial hole, split at `MASK_SPLIT`
  (620) where both are already at full strength so the seam cannot be seen. One element
  cannot carry both holes: a second gradient stacked on it paints its own opaque field
  over the first one's hole.
- The pool centres hang off `MOUTH_Y` and `LANE_Y`, so moving the stations or the lanes
  moves the holes with them.
- The `saturate`/`brightness` filter is gone and the board plate went back onto the board
  element. With the scrim at `rgba(30,66,130,.75)` the masked grass computes to #3E6071
  against the reference's #416070, so the filter was never needed - and a filter cannot
  have a hole in it, which is what made it the wrong tool once the exemptions were known.

## Smoke-test round 3 (revisions at v1.32.3)

Spot Focus's two comparison panels were not merely high - they were not being drawn at
all, and the sky under the pill was the whole board. A regression from this pass:
`boardWidth` was a bare subtraction clamped at zero, and the taller instruction panel plus
a flat 48px top padding pushed the column's fixed chrome past the play box on a short
viewport. `box.height - RIBBON_H` went too small for three rows, the panel width came out
negative, and `Math.max(0, ...)` turned it into a board 0px wide.

- `MIN_STAGE_H` (132) and `MIN_BOARD_W` (180) floor the fit, so an overrun column now
  yields a small board rather than no board.
- The panel's drop is `clamp(14px, 6vh, 48px)`, not a flat 48: it is the first thing that
  should give way on a screen shorter than this game was drawn for.
- The pill's slot was 74px because that is what the removed "I'm Ready" button stood at.
  It is 52px now - the pill's own height - and the 22px goes back to the board.
- Separation, as asked: the column's gap went 12 to 16 and the pill carries another 12 of
  its own, so the panel and the pill no longer read as one stack.

Checked across viewports afterwards: 887x483 (the reported one) gives a 180px board where
it gave 0; 768x1024 gives 736, which is width-bound, so the spare height is what
`justify-center` distributes above and below.

## Smoke-test round 4 (revision at v1.32.4)

The gap between the level plate and the instruction panel was nil, and the round-3 change
could not have fixed it: `clamp(14px, 6vh, 48px)` evaluates to 48 on a tablet, which is
what it already was. Round 3 fixed a different failure - the board not drawing at all.

The cause is that GameShell's level plate is absolutely positioned **inside the play box**
this padding is measured against, at `top: max(safe-top + 8, ...)`, and stands about 41px
tall. It therefore occupies roughly 8px to 49px of that space, and a 48px drop lands the
panel exactly on its bottom edge. The padding was sized against the box while ignoring the
shell's own overlay chrome sitting in it.

`paddingTop` is now `calc(var(--safe-top, 0px) + clamp(66px, 7vh, 86px))`: the floor
clears the plate rather than being a token amount, and the safe-area inset is added
because the plate is pushed down by it on a device with a cutout and the panel has to
follow. Resulting gap below the plate: 17px at the clamp's floor, 37px on the reported
1402px-tall viewport, where it was 0.

## Serve The Guests: the lines behind the order bubbles (v1.32.5)

Not in the Sep-17 review and not caused by this pass - a pre-existing defect noticed
during the smoke test, fixed here because it is one line of data per frame.

They are not drawn on the art. The panel PNG's interior is flat #FCEEDA from edge to edge;
what is showing is the background bleeding through the seams of the frame that draws it.
`frameStyle` renders with `border-image`, which paints nine separate tiles, and this board
is a fixed design canvas that gets `transform: scale()`d by whatever the viewport needs -
almost never a whole number. The tiles land on fractional device pixels and the hairline
gaps between them let the counter and the roof through, as a faint rectangle inset by
exactly the slice width. Measured on the reported screenshot: panel interior at
rgb(249,238,218), the hairlines one pixel wide at rgb(229,213,189), 21px in from a 139px
panel whose slice is 28 at a stage scale of about 0.75.

`FrameDef` now carries the art's own `fill` and `radius`, and `frameStyle` paints the fill
behind the tiles, so a seam reveals the panel's cream rather than the counter. The radius
is the art's own (fitted to the corner arc of each PNG: 29 bubble, 27 capsule, 50 tray, 26
and 23 for the two bar pills) so the fill stays inside the painted rim.

The fix is in the helper, so it covers the tray, the score capsule and both patience-bar
pills as well - all five had the same seams, the bubbles are just where they land on a
dark background and become obvious.

## Still outstanding

- **Smoke test.** Nothing here has been seen on a device. Worth looking at in this order:
  Station Master (the masked board is the biggest visual change in the app, and the white
  ring has to hold against it), Spot Focus (the round now starts with no press, so the
  resident is live the instant the board appears), then Shopping List's bottom edge -
  READY now ends at 1223 of a 1250 canvas, which is the tightest it has ever been.
- **`public/spot-assets/ui-plank-*.png`** are still on disk and still precached by the
  service worker, and `scripts/slice_spot_focus_assets.py` still cuts them. Nothing
  references them. Three files, so not urgent, but it is dead weight on every tablet.
- **Spot Focus' band of sky.** The board is 3 columns of 3:4 cards at full width, so
  width binds and about 460px of height goes spare on a tall tablet. `justify-center`
  splits it, which currently leaves ~230px of sky between the pill and the ribbons and
  ~200px of meadow below the board. It is symmetrical, but if that upper band reads as a
  hole, the one-line alternative is `justify-start` on the stage, which closes it and
  puts all the spare height into the meadow - which is the composition the review's own
  page-7 mockup shows.
- **Promote to Production.** Pushing only builds a Preview.
