# Portrait mode across phones and tablets

Date: 2026-08-28
Status: approved design, ready for an implementation plan

## 1. Decision and scope

The app targets patients on phones and tablets in **portrait orientation only**.
Landscape is not a supported layout. The device envelope runs from a 360x640 CSS-pixel
Android phone up to iPad Pro portrait at 1024x1366, and 360px wide is the binding
constraint on every layout decision in this document.

Version 1 surfaces **six games**:

| Category | Games |
|---|---|
| memory | Train Yard, Market Memory |
| attention | Spot Focus, Garden Keeper |
| executive | Serve the Guests, Clear the Way |

The other nine games in `GAME_REGISTRY` stay registered and stay reachable through the
dev-unlocked practice shortcuts on `HomeScreen`, but they are **out of scope**. They are
not audited here, no portrait work is planned for them, and they must not block this work.

## 2. Goals and non-goals

**Goals**

- Every v1 screen and game fits its viewport in portrait without scrolling, from 360x640 up.
- A game never needs to know the height of the app chrome, the viewport, or a notch.
- One implementation of "fit a board into the space available", not six.
- Rotating the device to landscape produces a gentle, actionable prompt rather than a broken layout.

**Non-goals**

- A working landscape layout for anything.
- Portrait work on the nine non-v1 games.
- Fixing the 38 pre-existing `npm run lint` errors. That is separate work and must not be entangled with this.
- Changing game mechanics, difficulty tuning, or content generation, with the single
  deliberate exception of `COUNTER_SIZE` in Serve the Guests (section 7).

## 3. The play-box contract

### 3.1 The problem

All six v1 games contain a variation of the same comment:

> Height cannot come from the layout: GameShell's column is `min-h-full`, so it sizes to
> its content and our content is sized by this measurement. Measuring against the viewport
> breaks that circularity.

The layout chain today is:

```
AppShell    min-h-screen        (100vh)
  main      flex-1
    GameShell  min-h-full       <- sizes to content
      play area
```

Because `min-h-full` sizes to its content, the play area has no height of its own.
A game that measures its own container gets a circular answer, so each one instead reaches
past the layout to `window.innerHeight` and subtracts a guess at the chrome height.
Those guesses have diverged:

| Game | Height guess | Floor |
|---|---|---|
| Serve the Guests | `window.innerHeight - rect.top - 16` | 360 |
| Garden Keeper | `window.innerHeight - rect.top - 16` | 360 |
| Train Yard | `window.innerHeight - rect.top - 16` | 360 |
| Market Memory | `window.innerHeight - rect.top - 16` | 360 |
| Clear the Way | `window.innerHeight - rect.top - CHROME_H` | 280 |
| Spot Focus | `window.innerHeight - top - BOARD_FOOTER - RIBBON_H` | `MIN_BOARD_WIDTH` |

Four of the six are byte-identical (`GardenKeeper/index.tsx:538`, `TrainYard/index.tsx:333`,
`MarketMemory/index.tsx:293`, `ServeTheGuests/index.tsx:82`), which is the clearest possible
signal that this belongs in one place.

Every one of these goes stale the moment the chrome changes, which section 5 does deliberately.
This is the root cause and it is fixed once, not patched six times.

### 3.2 The fix

Make the play area a genuinely bounded box.

```
root       100dvh, fixed height, safe-area padding
  main     flex-1 min-h-0 overflow-hidden
    GameShell  flex flex-col h-full
      header   flex-none
      play box flex-1 min-h-0 overflow-hidden   <- has a real, measurable height
```

Every level from the root to the play box is `flex-1 min-h-0` with `overflow-hidden`.
`min-h-0` is load-bearing: without it a flex child's default `min-height: auto` lets content
push the box taller than its parent, which is the same content-sizing bug in a different guise.

`GameShell`'s wrapper changes from `min-h-full` to `h-full`, and its play area from
`flex-1 flex flex-col p-4` to `flex-1 min-h-0 overflow-hidden` with padding applied inside.

Consequence, accepted deliberately: **a game may never scroll.** It fits or it scales down.

### 3.3 The shared hooks

New file `src/hooks/useStageFit.ts`:

```ts
/** The honest size of the play box, via ResizeObserver on the element itself. */
function useStageFit(ref: RefObject<HTMLElement>): { width: number; height: number }

/** Uniform-fit a fixed design canvas into that box. */
function useStageScale(
  ref: RefObject<HTMLElement>,
  canvasW: number,
  canvasH: number,
): { scale: number; width: number; height: number }
```

`useStageScale` returns `scale = Math.min(width / canvasW, height / canvasH)` plus the
resulting rendered size, and is consumed by Train Yard, Market Memory, Garden Keeper and
Serve the Guests. `useStageFit` returns the raw box and is consumed by Clear the Way and
Spot Focus, which compute their own cell sizes rather than scaling a fixed canvas.

Both observe the element, not the window. Neither reads `window.innerHeight`.
Both delete the arbitrary floors: under the contract the box is never zero-height after
first layout, so a floor only hides a bug.

**The observed element must be the play box, never the scaled wrapper.** This is the single
most likely way to get this wrong, and it would be a regression rather than a bug the current
code has. Today all four scaled games observe the very element they resize: `TrainYard`
observes `wrapRef` at `index.tsx:339` and sets `style={{ height: CANVAS_H * scale }}` on that
same ref at `:371`. That is safe today only by accident, because the height fed into `scale`
comes from `window.innerHeight` rather than from the observed box. The moment `useStageScale`
derives height from the element it observes, observe to resize to observe becomes a closed
cycle: a guaranteed "ResizeObserver loop completed with undelivered notifications", and
possibly visible oscillation.

So the structure is fixed:

```
play box       <- flex-1 min-h-0, sized only by its parent. THIS is what the ref observes.
  wrapper      <- width/height set from `scale`. Never observed.
    board
```

Requirements on the hooks:

- Attach the observer via a **ref callback**, not `useEffect(..., [])`. Every one of these
  games returns a loading node while sprites decode and mounts the real element afterwards,
  so a mount-time `ro.observe(ref.current)` runs against `null` and never re-attaches.
  `TrainYard/index.tsx:326-341` has deps `[]` while the loading return at `:362-368` precedes
  the wrapper at `:371`; Garden Keeper and Market Memory share the defect, and only the
  `window` resize listener currently rescues them. Serve the Guests is the one that gets this
  right, keying its effect on `[imagesReady]` (`index.tsx:72,91`), and its pattern is the one
  to generalise.
- Also handle `orientationchange`, since some browsers fire it without a matching resize on
  the observed element.
- Guard against the observer firing with a zero box during mount, by returning the previous
  value rather than collapsing the board.
- Be safe to call before the element exists, returning a zero box that callers render as a
  loading state, which is what the games already do while sprites decode.

## 4. Viewport plumbing and orientation

### 4.1 `index.html`

Add `viewport-fit=cover` to the existing viewport meta. Without it, `env(safe-area-inset-*)`
resolves to zero and the page is letterboxed by the browser instead of painting under the
notch and home indicator.

`maximum-scale=1.0, user-scalable=no` stays. Pinch-zoom on a game board would be a trap for
this audience, and the app has its own `text-size-*` accessibility control instead.

### 4.2 Safe-area insets

Nothing in the codebase reads `env(safe-area-inset-*)` today.
The root box takes `padding-top: env(safe-area-inset-top)` and
`padding-bottom: env(safe-area-inset-bottom)`, expressed as a Tailwind utility so it is one
class rather than inline styles scattered across screens.

These are subtracted from the play box *before* a game measures it, so no game has to know a
notch exists. On an iPhone the bottom inset is 34px, which would otherwise sit under the
bottom row of the Serve the Guests counter.

### 4.3 `dvh`, not `vh`

The root becomes `height: 100dvh` with `height: 100vh` as the preceding declaration for
fallback in browsers without `dvh`.

With `vh`, a board is sized for a viewport that shrinks the instant the mobile browser
toolbar animates in, putting the bottom of the board underneath it.

The `min-h-screen` occurrences outside `AppShell` are **removed**, not converted:

- `src/games/executive/MorningRoutineQuest/index.tsx` lines 139, 163, 304 (out of v1 scope
  but removed anyway, since a nested viewport-height assertion breaks the contract for
  whatever renders it)
- `src/screens/CareHomeSelector.tsx` lines 172, 206, 268, 339
- `src/screens/ProfileSelector.tsx` line 68
- `src/screens/SignupFlow.tsx` line 115
- `src/main.tsx` line 27

Under the contract a child must never assert viewport height. It fills the box it is given.

`src/games/memory/RememberMatch/index.tsx:366` uses `min-h-full` rather than `min-h-screen`,
so it is not in the list above, but it breaks under the contract in exactly the same way.
It is out of v1 scope and is noted here only so that whoever surfaces that game later does
not have to rediscover it.

`src/games/attention/SpotFocus/Scene.tsx` line 48 hardcodes `min-h-[calc(100vh-12rem)]`,
baking in today's chrome height. It is removed as part of the Spot Focus work in section 6.

### 4.4 Orientation

Two layers, because neither alone is sufficient.

**Manifest.** Add `orientation: 'portrait-primary'` to the VitePWA manifest in
`vite.config.ts`. This is authoritative when the app is installed to the home screen, which
is the intended care-home deployment.

**`RotateDevice` overlay.** For browser tabs, where the Screen Orientation API cannot lock
without fullscreen. Requirements:

- Triggered by the CSS media query `(orientation: landscape)`, not a JS listener, so it
  cannot flicker or miss an event.
- Rendered **above** the app, and it must **not unmount the app beneath it**. A mid-round
  rotation must not destroy game state and cost the patient their round.
- Carries a plain illustration and one line of copy through `t()`, present in `en`, `hi` and `kn`.
- Tone is gentle and instantly actionable, not an error state. See the risk below.

**Known risk, accepted.** iPadOS ignores manifest `orientation` for installed PWAs.
On iPad the overlay is the only defence, and it will fire on a tablet a resident has simply
laid flat and picked up sideways. This makes the copy and tone of the overlay a real design
concern rather than an afterthought.

## 5. The chrome budget

On a 360x640 phone, chrome is the single biggest lever on board size.

### 5.1 Today

| Element | Height |
|---|---|
| `AppShell` header (app name, 3-way language switcher, settings gear; `px-6 py-4` around 48px controls) | ~80px |
| `GameShell` header (title banner, category tag, level tag, exit; `px-6 py-4` around 48px controls) | ~80px |
| `GameShell` play area padding (`p-4`) | 32px |
| **Total** | **~192px** |

Plus the offline banner (`AppShell.tsx:74-78`, `px-6 py-3`), roughly 48px, which appears
whenever the device is offline. That is not an edge case here: it is precisely the care-home
wifi condition this app is built for, so a resident may routinely be playing with 240px of
chrome. The banner **also hides on `/app/game/*`**, for the same reason the header does: it
is a status message with no action attached, and it is visible on Home before the round starts.

That leaves a 360x448 play box. Fitting an 800x1280 canvas into it is height-bound:
scale 0.35, so the board renders 280px wide and wastes 80px of a 360px screen.

### 5.2 Changes

**`AppShell` hides its own header on `/app/game/*`.** Hidden, not shrunk.
Language switching and settings are not things a resident does mid-round while guests are
walking out. They remain available on Home, Rotation and Settings, where they belong.
`GameShell` becomes the single source of chrome during a round. This returns 80px, the
largest single win available, and costs nothing a patient needs.

*Accepted behaviour change:* a resident who started a round in the wrong language must exit
the round to change it.

**`GameShell`'s bar targets 56px instead of 80px:**

- `py-2` rather than `py-4`, `px-4` rather than `px-6`
- exit button 44x44 rather than 48x48
- the category tag is dropped on narrow screens, since the game title already says what you
  are playing
- the title banner and level tag stay

*Deliberate exception:* 44px is above the WCAG 2.5.5 AAA minimum but below the app's own
80px `touch-min` token. Exit is a destructive control that ends a round, and it should not be
easy to hit by accident mid-game. This exception is intentional and applies only to exit.

### 5.3 Result

| | Today | After |
|---|---|---|
| Chrome | ~192px | ~88px |
| Play box on 360x640 | 360x448 | 360x552 |
| 800x1280 canvas scale | 0.35 | 0.43 |
| Rendered board width | 280px | 345px |

About 23% more board from chrome work alone.

**`text-size-*` interaction.** `src/styles/index.css:17-19` implements text size by setting
`html { font-size: 100% | 112.5% | 125% }`. That scales **every rem-based utility**, not just
the title: `py-2`, `px-4`, `gap-4` and the play box's own `p-4` all grow with it. At
`text-size-xlarge` the 56px bar is roughly 70px and the padding goes 32px to 40px, so the
budget is ~88px to ~110px and the board shrinks accordingly.

The bar must be allowed to grow rather than clip, and the section 3 contract handles that
correctly: the play box is whatever is left over, not a fixed number.

**Known limitation, named deliberately.** None of the four scaled games uses rem inside its
fixed design canvas, so `text-size-large` and `text-size-xlarge` have **no effect at all** on
text inside those boards. A resident who needs larger text gets it everywhere except the game
they are playing. Fixing that is out of scope here, but it should not be discovered by
surprise later.

## 6. The six v1 games

### 6.1 Adopt the hook and verify

These three already use portrait canvases and need no redesign. Each is an independently
committable change: delete the local measure effect, adopt `useStageScale`, verify.

| Game | Canvas | Scale in a 360x552 box | Rendered width | Notes |
|---|---|---|---|---|
| Train Yard | 800x1276 | 0.433 | 346px | Simplest board of the set. Do this one first. |
| Garden Keeper | 800x1280 | 0.431 | 345px | Deletes the `- 16` fudge and the `360` floor. |
| Market Memory | 800x1422 | 0.388 | 311px | Tallest canvas, so the most height-bound. Check its HUD text is still legible at 0.39. |

Train Yard's canvas is `CANVAS_W x CANVAS_H` = `800 x (HUD_H 96 + BOARD_H 1180)` = **800x1276**
(`TrainYard/geometry.ts:8-13`). `BOARD_H` alone is not the canvas, and it is the canvas that
`useStageScale` fits.

All three are height-bound in a 360x552 box. The threshold is aspect ratio, not a fixed size:
a canvas is height-bound whenever `canvasW / canvasH < 360 / 552 = 0.652`. Train Yard is
0.627, Garden Keeper 0.625, Market Memory 0.563.

**Do not treat Train Yard as the pattern to copy.** Its measure effect
(`index.tsx:326-341`) carries the ref-callback defect described in section 3.3, as do Garden
Keeper's and Market Memory's. Serve the Guests has the correct shape. Train Yard is first
here because its board is the simplest to verify, not because its code is the model.

### 6.2 Clear the Way

Does not scale a canvas. It computes cell size from the available box, clamped to
`MIN_CELL = 56` and `MAX_CELL = 96` in `geometry.ts`. It moves to `useStageFit`.

**The board overflows a 360px screen, and this is now measured rather than deferred.**
`levels.ts` reaches `cols: 6, rows: 6`. `boardMetrics` (`geometry.ts:30-43`) computes
`boardW = cols * cell + wall * 2` with `wall = round(cell * WALL_RATIO)`. At `MIN_CELL = 56`:
`wall = round(56 * 0.35) = 20`, so `boardW = 6 * 56 + 40 = 376px`. That is 16px wider than a
360px viewport, and `MIN_CELL` is a hard `Math.max` floor, so the board cannot shrink to fit.

Two options, and I recommend the first:

1. **Lower `MIN_CELL` to 52 on narrow screens.** `6 * 52 + 2 * round(52 * 0.35) = 312 + 36 =
   348px`, which fits with 12px to spare. Note `geometry.ts:9-12` already documents the 56px
   floor as a knowing violation of the 80px `touch-min` token, so this widens an exception
   that was already taken deliberately rather than establishing a new one.
2. Cap the grid at 5 columns on narrow screens, which changes the difficulty curve.

`src/games/executive/ClearTheWay/__tests__/geometry.test.ts` exercises `boardMetrics` and
will need updating if `MIN_CELL` changes.

### 6.3 Spot Focus

The first real redesign.

`index.tsx` sizes the board as `panel * 2 + PANEL_GAP`, rendering the two scenes as panels
**side by side**, each a 3 to 4 column grid of 3:4 cards. At 360px that is up to 8 card
columns across a 328px content width, roughly 41px per card, for a game whose entire premise
is comparing fine detail at a glance.

**Change:** stack the panels vertically in portrait. Scene above, scene below.
This doubles the height demand, so cards are sized by the height budget instead of the width
budget, with the two panels taking roughly half each.

Also remove the hardcoded `min-h-[calc(100vh-12rem)]` in `Scene.tsx` line 48.

**Flagged for on-device review:** the comparison gesture changes from left-right to up-down.
That is arguably easier on a phone, but it is a real change to how the game reads and it is
not something the automated checks in section 9 can judge. It needs a look on a real device
before it is called done.

## 7. Serve the Guests portrait

### 7.1 The assets

Supplied in `assets-src/guests_portrait/`:

| File | Size | What it is |
|---|---|---|
| `guests_bg_pt.png` | 941x1672 | Empty courtyard plate. No counter painted in. |
| `guests_assets_portrait.png` | 1176x1337 | Loose pieces on transparent: tray panel, 4 busts, HUD lockups, MAKE/SERVE/COOKING buttons, coin, bar track and fill, blank bubble frame, guests-left pip strip. |
| `guests_ui_pt.png` | 941x1672 | Composed mock, for reference only. Not shipped. |

**The structural win.** In landscape, the counter tray was painted into `bg_cook.jpg`, which
is why `geometry.ts` carries constraints like "the bands cannot go further, the tray is
painted into the background, so growing this budget means redrawing the plate."
In the portrait set the tray is a **separate transparent panel**. That constraint is gone and
geometry becomes composable rather than measured against a baked plate.

**What carries over unchanged:** all 22 dish PNGs and their `-spoiled` variants in
`public/cook-assets`, plus `ui-bar-track.png`, `ui-bar-fill.png`, `ui-coin.png` and
`ui-panel-tail.png`. The new sheet re-supplies only the furniture.

The two shipped source PNGs total 4.03 MB (`guests_bg_pt.png` 2.13 MB,
`guests_assets_portrait.png` 1.90 MB; the 2.64 MB mock is not shipped) and must be exported
for the web first, not committed to `public/` as-is. The landscape plate is a 246 KB JPEG for
comparison. The background becomes a JPEG; the transparent sheet stays PNG or moves to WebP.

**Do not let this land in the precache.** `vite.config.ts:26` `globPatterns` precaches all
png and webp, and the comment at `:29-33` already warns that Workbox precaching is
all-or-nothing on install and that a care-home wifi stall would leave a partially installed
worker under `registerType: 'autoUpdate'`. Adding several hundred KB of new art to the
precache is exactly the failure that comment anticipates. The new Serve the Guests art goes
through a `runtimeCaching` rule alongside the existing `pp/scenes` rule, not the glob.

### 7.2 Canvas

Design canvas is the assets' native **941 x 1672**, so every coordinate in `geometry.ts` can
be measured straight off the PNG rather than through a conversion factor.

Its aspect (0.563) is within a rounding error of Market Memory's 800x1422 (0.563), so it is
already the house portrait shape.

| Device | Play box | Scale | Rendered width | Bound by |
|---|---|---|---|---|
| 360x640 phone | 360x552 | 0.330 | 311px | height |
| 390x844 phone | 390x756 | 0.415 | 390px | width, full-bleed |
| 768x1024 iPad | 768x936 | 0.560 | 527px | height |

The 390x844 phone is the one size where this canvas is width-bound and the board runs edge to
edge, because that play box's aspect (0.516) is narrower than the canvas's (0.563). Worth
knowing when placing anything near the left or right margin.

### 7.3 Counter size and the tray

`COUNTER_SIZE` changes from **8 to 6**. This is a decided change, and the only mechanics
change in this document.

The tray on the sprite sheet is drawn with 4x2 = 8 cells baked in. Rather than request a
redraw, **9-slice the tray's outer frame and draw the cells in code.** The cells are plain
cream rounded rectangles and reproduce faithfully, and this makes `COUNTER_SIZE` a free
parameter rather than an art dependency. The separate blank bubble frame on the same sheet
indicates the artist already intends 9-slicing, so this is consistent with how the set was drawn.

At 6 dishes in 3 columns, each card is roughly 290 design-px wide against the mock's 215 at
4 columns. Cards get about 35% wider, which is the point of the change for this audience.

Consequences to handle:

- **The counter geometry is strictly one-dimensional today and must be rewritten, not
  reflowed.** `geometry.ts:31-35` is `CARD_W = floor(TRAY_W / DISH_COUNT)` and
  `cardX(i) = TRAY_INSET_X + i * CARD_W`. At `COUNTER_SIZE = 6` that yields six cards in a
  single row, not 3x2. A 3x2 tray needs `CARD_W = TRAY_W / 3`, a new `cardY(index)`, and
  `cardX(index % 3)`. Treat this as new geometry.
- More broadly, `CANVAS_W = 1920` and `CANVAS_H = 1080` (`geometry.ts:12-13`) are the
  landscape plate, and **every coordinate in that file is measured against it**. The file is
  rewritten against the 941x1672 canvas rather than adjusted. The card internals
  (`CARD_IMG_*`, `CARD_NAME_*`, `CARD_BTN_*`, `BTN_W`) are all remeasured against the new tray.
- `src/games/executive/ServeTheGuests/__tests__/model.test.ts` asserts
  `expect(COUNTER_SIZE).toBe(DISH_COUNT)` and that the initial state deals `COUNTER_SIZE`
  dishes. Both remain true at 6 and should keep passing unchanged. Confirm rather than assume.
- **Difficulty shifts in two directions and the net is genuinely unknown.** `dealCounter`
  (`model.ts:106-110`) notes that "the dealt set is the whole world for the round, orders are
  drawn from it too, so a guest can never ask for something the counter cannot make." So a
  smaller counter never makes an order unfillable. What it does is concentrate orders across
  6 dishes instead of 8, which raises **contention**: a dish card holds one state at a time,
  so two guests wanting the same dish must be served through sequential cook cycles. That is
  harder. Against it, 6 larger cards are a much easier visual search than 8 small ones, which
  is easier, and is the reason for the change.
  `getServeGuestsParams` only varies `maxItemsPerGuest` and is not mechanically coupled to
  counter size, so no tuning change is required now. Watch it once the board is playable.

### 7.4 Layout

Vertical budget on the 941x1672 canvas, to be refined against the plate during implementation:

| Band | Approx height |
|---|---|
| HUD (guests-left dial, coin capsule) | 200 |
| Order bubbles | 260 |
| Guest busts, 4 seats at ~235px wide | 400 |
| Counter tray, 3 cols x 2 rows | 700 |
| Slack | ~110 |

Bubbles stay above the guests' heads with the tail pointing down, as in landscape, which the
mock confirms. `bubbleWidth()`, `patienceBarWidth()` and `bubbleCentreX()` keep their current
shape and are remeasured.

Note that the bubble band and the bust band overlap in the mock: bubbles float over the
courtyard wall above the heads. The table above budgets them as separate bands, which is the
conservative reading. If the remeasured layout runs short, overlapping them is the first
place to recover height.

### 7.5 Open asset items

These are asset questions, not code questions. None of them blocks sections 3 to 5, and none
of them blocks section 6. They block only the Serve the Guests phase.

1. **No DISPOSE button on the portrait sheet.** It supplies MAKE, SERVE and COOKING.
   The model has four dish states (`idle | cooking | ready | burnt`) and `burnt` currently
   renders `btn-dispose.png`. Portrait needs a fourth button, or `burnt` needs a different
   treatment. Blocking for this phase.
2. **The painted title.** "Tiffen Time" is baked into the plate. It duplicates GameShell's
   own title banner; it is baked English so it cannot localise to `hi` or `kn`, the exact
   problem `PAINTED_BUTTON_LANG` already exists to manage for the buttons; and *Tiffen* is a
   misspelling of **Tiffin**.
3. **Cast size.** The sheet has 4 busts. `FACE_CELLS` in `sprites.ts` has 10, cut from
   `characters_cook.png`. Is the cast shrinking to 4, or does portrait keep drawing from the
   existing 10-bust sheet? This matters beyond art: `faceCrop` cycles by index modulo
   `FACE_COUNT` (`sprites.ts:263`) and `TOTAL_GUESTS` is 8 (`model.ts:13`), so a 4-bust cast
   means every face appears twice within a single round.
4. **Multi-item bubbles.** The mock shows one dish per bubble, but `maxItemsPerGuest` reaches
   3 and the current bubble wraps after 2 columns. Confirm the new bubble frame is meant to be
   9-sliced and grown.
5. **Seat count.** 4 busts across 941px is 235px each, which is generous. Confirming
   `SEAT_COUNT` stays at 4.

## 8. Non-game screens

Much less work than the games. Every screen already uses `max-w-*` caps, which behave
correctly at 360px because they cap rather than floor.

- `ProfileSelector.tsx:102` is **already** `grid-cols-2 sm:grid-cols-3 md:grid-cols-4`. An
  earlier draft of this spec called it a break and proposed exactly what is already there.
  There is no change to make; it needs verification only.
- The `min-h-screen` removals listed in section 4.3, paired with the scroll owner below.
- `SettingsScreen`, `HomeScreen`, `RotationScreen`, `SessionSummary`, `DailyQuestionnaire`,
  `SignupFlow` and `CareHomeSelector` need verification at 360px but no structural change is
  anticipated. If verification finds one, it is handled in place.

**These screens scroll, and that is correct.** The no-scroll rule in section 3.2 applies to
the game play box, not to the whole app. `SettingsScreen` and `CareHomeSelector` are forms and
lists that legitimately exceed a 640px viewport.

To state the boundary precisely, since section 3.2 and this section otherwise appear to
conflict: **`main` keeps `flex-1 min-h-0 overflow-hidden` on every route.** The difference is
one level below it. `GameShell`'s play box is `overflow-hidden` and must fit. Non-game route
components become `h-full overflow-y-auto` and own their own scrolling. Nothing above `main`
ever scrolls, on any route.

Consequence: `AppShell.tsx:39`'s header carries `sticky top-0 z-10`, which becomes inert once
`main` owns no scroll. Harmless, but the classes should be removed rather than left as a
misleading signal that the header is sticky.

## 9. Verification

No layout test suite exists today, and this does not propose a heavy one.

**Playwright smoke script** at the three binding sizes (360x640, 390x844, 768x1024), loading
each of the six v1 games by seeding `localStorage` to skip the login and questionnaire flow.
Two assertions per game:

1. The play box does not overflow: its `scrollHeight <= clientHeight` and the document
   itself does not scroll.
2. The board's rendered bounding box fits inside the play box.

Those two catch essentially every regression this work is about. Both assertions run after
the game reports its sprites decoded, since every one of these games renders a loading state
first and would otherwise be measured empty.

**Landscape check.** Assert the `RotateDevice` overlay appears at a landscape viewport and
that the app beneath it is still mounted, by checking a game element is still in the DOM.

**Manual on-device pass**, covering three things the automated checks cannot judge:

- Spot Focus stacking and Serve the Guests. "Fits" and "reads well" are different questions
  and only the first is automatable.
- The `GameShell` title in `hi` and `kn` at `text-size-xlarge` on a 360px screen. Those render
  in Noto Sans Devanagari and Noto Sans Kannada, which are taller per line than Inter, and the
  56px bar has to hold a one-line title after the category tag is dropped. If it wraps, the
  bar grows and every board on that device shrinks.
- The `RotateDevice` overlay's copy and tone on a real iPad, given it will fire on a tablet
  simply picked up sideways.

**Pre-commit checklist** from `CLAUDE.md` applies, with one caveat: `npm run lint` currently
fails with 38 pre-existing errors, so it cannot serve as a clean gate as-is. The workable
rule is that the error count must not rise. That debt is separate work and is explicitly not
entangled with this.

`npx vitest run` must stay green throughout. Two suites are touched by this work:

- `src/games/executive/ServeTheGuests/__tests__/model.test.ts`, by the `COUNTER_SIZE` change
  in section 7.3. Both of its relevant assertions should stay green at 6, but confirm rather
  than assume.
- `src/games/executive/ClearTheWay/__tests__/geometry.test.ts`, if phase 6 changes `MIN_CELL`.

## 10. Sequencing

Each phase is independently committable and independently valuable. Phases 1 to 3 are
prerequisites for everything after them.

| Phase | Content | Blocked by |
|---|---|---|
| 1 | Viewport plumbing: `viewport-fit=cover`, safe-area utility, `100dvh` root, remove `min-h-screen` from `main.tsx` and the game components | - |
| 2 | The play-box contract in `AppShell` and `GameShell`, plus `useStageFit` / `useStageScale` | 1 |
| 3 | Chrome budget: hide the `AppShell` header and offline banner on game routes, slim the `GameShell` bar | 2 |
| 4 | Orientation: manifest `portrait-primary`, `RotateDevice` overlay, `t()` copy in 3 languages | 1 |
| 5 | Train Yard onto `useStageScale`, then Garden Keeper and Market Memory | 2, 3 |
| 6 | Clear the Way onto `useStageFit`, including the `MIN_CELL` decision | 2, 3 |
| 7 | Non-game screens: remove their `min-h-screen`, add the `h-full overflow-y-auto` scroll owner, verify at 360px | 2 |
| 8 | Spot Focus vertical stacking | 2, 3 |
| 9 | Serve the Guests portrait | 2, 3, and the section 7.5 asset answers |
| 10 | Playwright smoke script | 5, 6, 8, 9 |

**Phase 1 deliberately does not touch the non-game screens.** Removing their `min-h-screen`
before phase 7 supplies the replacement scroll owner would leave them with neither a height
assertion nor a way to scroll. `CareHomeSelector.tsx:268` in particular currently pairs
`min-h-screen` with `overflow-y-auto` and would break outright. Those four files
(`CareHomeSelector`, `ProfileSelector`, `SignupFlow`, and the `main.tsx` loading state, which
is safe either way) move together in phase 7.

Phase 5 deliberately comes before the two redesigns: it proves the contract works on the
easy cases before effort is spent on the hard ones.

Phases 2 and 3 land together in a single deployable state. Phase 2 alone bounds the play box
while the old chrome still occupies 192px of it, which is a working but visibly worse layout,
so the two should not be released separately even though they are separate commits.

Every phase carries a `package.json` version bump per the release protocol in `CLAUDE.md`.
Phases 1 through 8 are patch or minor; phase 9 is minor.

## 11. Open questions

Carried forward, none blocking the start of implementation.

1. The five Serve the Guests asset items in section 7.5. Item 1, the missing DISPOSE button,
   is blocking for phase 9 specifically.
2. Clear the Way's 376px board at `MIN_CELL = 56`: the overflow is measured (section 6.2) and
   the recommendation is to lower `MIN_CELL` to 52 on narrow screens. Confirm that rather than
   the alternative of capping the grid at 5 columns, which would change the difficulty curve.
3. Whether the reduced Serve the Guests counter meaningfully shifts difficulty once playable.
4. Whether the `text-size-*` setting having no effect inside the scaled game canvases
   (section 5.2) is acceptable for v1. It is out of scope here, but it is an accessibility
   gap in an app built for this audience and it deserves a decision rather than silence.
