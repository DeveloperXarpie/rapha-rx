# Market Memory - design spec

Date: 2026-08-17
Status: approved, ready for implementation planning
Source: `design_handoff_market_memory/` (README.md, market-memory.html, market-memory-src.dc.html)

## 1. What the game is

Market Memory trains episodic memory: recall and recognition under distraction.

A shopping list of named goods is shown for a few seconds. A wooden blind then drops
and covers the list. The player must collect exactly those goods from a market shelf of
twelve crates that also holds lookalike decoys, then press SUBMIT.

The decoys are the difficulty mechanic. Every target on the list seeds a **twin**: same
silhouette, near-identical packaging, different product (Milk / Cream, Jam / Honey,
Apples / Tomatoes, Rice / Sugar / Flour). The player cannot succeed by remembering a
shape or a colour. They have to remember the item.

This is the third game in the same design line as Picture Postcard and Train Yard
Dispatcher, and it is built on the same 800px design canvas, the same Baloo 2 type, the
same palette family and the same retention-blind mechanic.

## 2. Relationship to the existing games

Market Memory is added as the **sixth memory game**. The existing `shopping-list-recall`
game is left entirely untouched and stays in rotation, despite the conceptual overlap.
Retiring it is a separate decision to be taken after both have been played side by side.

`src/games/memory/TrainYard/` is the structural precedent for this port. Where this spec
is silent on a convention, follow Train Yard.

## 3. Integration points

New game id: `market-memory`. Category: `memory`.

| File | Change |
|---|---|
| `src/screens/GameRouter.tsx` | Import the component, add the `GAME_REGISTRY` entry, add a `generateContentForGame` branch calling `getMarketMemoryParams(score)` |
| `src/lib/dynamicDifficulty.ts` | `MarketMemoryDynamicParams` interface and `getMarketMemoryParams(score)` |
| `src/components/GameShell.tsx` | A `computePerformanceRatio` case for `market-memory` (see section 9) |
| `src/screens/HomeScreen.tsx` | Tile in the `memory` list, icon `🧺`, `imageSrc: '/placeholders/games/market-memory.svg'` |
| `src/session/SessionManager.tsx` | Add `'market-memory'` to `GAME_BY_CATEGORY.memory` |
| `src/screens/DailyQuestionnaire.tsx` | Add `'market-memory'` to its memory list |

`generatedContent` is `undefined`. The game builds its own round from `levelConfig.params`,
exactly as Train Yard does. A placeholder SVG is needed at
`public/placeholders/games/market-memory.svg`.

### Known unrelated defect

While surveying the registration points, `serve-guests` was found to be present in
`GAME_REGISTRY` and on `HomeScreen` but **absent** from both `SessionManager`'s
`GAME_BY_CATEGORY.executive` and `DailyQuestionnaire`, so it can never be selected by a
rotation. This is a pre-existing bug, out of scope for this work, and should be tracked
separately.

## 4. File layout

`src/games/memory/MarketMemory/`, split so that no single file carries more than one
responsibility:

| File | Responsibility |
|---|---|
| `index.tsx` | Round machine, phase transitions, board layout, modals |
| `geometry.ts` | Canvas constants, crate grid, fixed element boxes |
| `palette.ts` | Colour tokens from the handoff |
| `styles.tsx` | Keyframes (`mk-slidein`, `mk-glow`), `EASE_SETTLE`, injected style block |
| `items.ts` | The 21-item catalogue and its `registerAsset` calls |
| `Product.tsx` | Shape-keyed CSS packaging wrapping the emoji glyph, one `size` prop |
| `Crate.tsx` | One shelf crate: packaging, name text, picked state, tick badge, hint glow |
| `ListCard.tsx` | Shopping-list card, staggered row entry, blanking |
| `Blind.tsx` | Retention cover, adapted from `TrainYard/Blind.tsx` |
| `CartStrip.tsx` | MY CART block, slots, SUBMIT |
| `effects.tsx` | Confetti and floating toast |
| `round.ts` | Pure functions: `buildRound(params)` and `scoreRound(list, picked)` |

`round.ts` holds the only real logic in the game - crate composition and scoring - as
pure functions with no React dependency, so it can be read and reasoned about on its own.

## 5. Layout and coordinate system

Fixed 800px-wide design canvas, scaled to its container with a single transform
(`transform: scale(100cqw / 800)`, origin top-left, on a `container-type: inline-size`
parent). Same wrapper as Train Yard.

| Region | Geometry |
|---|---|
| HUD bar | 800 x 96, at top |
| Play board | 800 x 1180, directly below |
| Total canvas | 800 x 1276 |

All coordinates below are design pixels measured inside the play board, origin at board
top-left.

### Shelf grid

Twelve crates, 4 x 3.

| Constant | Value |
|---|---|
| `COL_X` | `[24, 216, 408, 600]` |
| `ROW_Y` | `[584, 726, 868]` |
| `CRATE_W` x `CRATE_H` | `176 x 128` |

Crate index `i` maps to column `i % 4`, row `floor(i / 4)`. Grid order is shuffled every
round, so a crate's position carries no information across rounds.

### Fixed elements

| Element | Position | z-index |
|---|---|---|
| Caption bubble | left 150, top 16, width 500 | 6 |
| Basket readout | left 16, top 122 | 7 |
| HINT button | right 16, top 122, 132 x 108 | 7 |
| Shopping-list card | left 232, top 196, width 336 | 6 |
| Retention blind | left 224, top 188, 352 x 360 | 8 |
| Cart strip | left 20, top 1006, 760 x 156 | 7 |
| Modal overlay / card | full board / centred | 9 / 10 |

**Controls always sit above decoration.** Backdrop scenery 0-1, crates 5, HUD-adjacent
controls 6-7, blind 8, modals 9-10. This ordering was a defect fix in the previous game
and must be preserved.

### Backdrop

Board gradient:

```
linear-gradient(180deg, #A9D2EE 0px, #C6E1F1 190px, #D9C0A0 191px, #C99A6B 300px, #C08F60 1180px)
```

Over it: a `#C9B79C -> #B29C7E` street band at y 96-192; four flat building blocks
(`#C7A98A`, `#D3B694`, `#C2A283`, `#D0B291`); two market stalls.

- **Left stall, FRESH FRUITS.** Awning left -14, top 196, 300 x 62,
  `repeating-linear-gradient(90deg, #D24B42 0 34px, #FBF3E4 34px 68px)`, bottom border
  5px `#A9352E`. Counter left 6, top 258, 262 x 300,
  `linear-gradient(180deg, #8A5A34, #6E4526)`. Sign plate `#C9A76B`, 3px border
  `#8A5A34`, label `#5C3A18`.
- **Right stall, BAKERY & DAIRY.** Mirrored, awning stripe `#2F6BA8` / `#FBF3E4`, bottom
  border `#234F7C`.
- **Stall goods**: ten flat rounded blocks with `box-shadow: inset 0 -6px 0 rgba(0,0,0,.14)`.
  Decoration only, never interactive.

## 6. Type and colour

Font **Baloo 2** (500 / 600 / 700 / 800), fallback `ui-rounded, "Segoe UI", system-ui,
sans-serif`.

| Role | Size / weight |
|---|---|
| HUD label | 17 / 700, letter-spacing .12em |
| HUD value (lives) | 30-34 / 800 |
| Caption | 27 / 700 |
| List card title | 27 / 800 |
| List row item name | 30 / 700 |
| Crate item name | 19 / 700 |
| SUBMIT | 34 / 800 |
| Modal title / body | 46 / 800, 27 / 500 |

Nothing below 17px on the 800px canvas.

### Palette

| Token | Hex | Use |
|---|---|---|
| Navy deep | `#14304F` | page background, HUD border |
| Navy HUD | `#2C5580` -> `#1E3E63` | HUD gradient |
| Sky | `#A9D2EE` / `#C6E1F1` | upper backdrop |
| Ground | `#D9C0A0` -> `#C08F60` | market floor |
| Wood dark | `#8A5A34` / `#6E4526` | crates, counters, blind border |
| Wood light | `#A9743F` | crate face top |
| Cream panel | `#FBEFD5` / `#FFF9EA` / `#FFF7E2` | cards, buttons, readouts |
| Cream border | `#C9A76B` | panel borders |
| Ink | `#4A3A22` / `#5C4A2E` / `#5C3A18` | body text on cream |
| Amber | `#F0A92B` / `#C8821A` | hint badge, hint glow border |
| Gold | `#F5C33B` / `#FFE38A` / `#EDBB2A` | hint glow, confetti |
| Green | `#59A93C` / `#5AA83F` / `#3C7A26` | SUBMIT, picked state, correct |
| Red | `#D7443C` / `#C13A33` | hearts, out of hearts |
| Purple | `#5B3E8E` / `#402A69` | list header, cart block, neutral result |

**Button shape language throughout**: radius 12-18px, flat fill, 5-7px solid bottom
border in a darker shade of the fill. No box-shadows for depth.

## 7. Item catalogue and artwork

21 items, each `{ id, name, group, shape, twin, emoji? }`.

| Group | Items |
|---|---|
| produce | Apples, Tomatoes, Oranges, Grapes, Plums |
| dairy | Milk, Cream, Yogurt, Butter |
| bakery | Bread, Buns |
| pantry | Rice, Sugar, Flour, Pasta, Cereal, Chips, Jam, Honey, Oil, Vinegar |

Eleven packaging shapes: `round`, `cluster`, `carton`, `cup`, `box`, `bag`, `pouch`,
`jar`, `bottle`, `loaf`, `buns`.

`twin` is the lookalike pairing used to seed decoys. It is deliberately **asymmetric in
places** (Sugar -> Flour, Flour -> Rice) so that decoy sets vary between rounds.

### Rendering

Each item registers an emoji token through `registerAsset` at module load time, following
the app's asset-catalog convention.

`Product.tsx` renders that glyph **inside a CSS packaging container keyed by the item's
`shape`**. Twins share a shape, so Milk and Cream present the same carton silhouette in
the same colour family, and the emoji sits small on the container's label area rather
than being the dominant signal. The item name in text is the reliable cue.

This layering is deliberate and load-bearing. Eight of the twenty-one items have no
distinct emoji at all (Cream, Yogurt, Sugar, Flour, Jam, Vinegar, Plums, Buns), and the
missing glyphs cluster in exactly the twin pairs the game is built on. Emoji alone would
render decoys blank or duplicated and would collapse the mechanic into "spot the familiar
picture". Items with no emoji render as packaging plus name, which is a legitimate state.

One definition renders at three sizes with no separate crops: **78px** on a crate, **62px**
in a cart slot, **60px** in the list. Sizes are expressed in `s / 100` units inside a
stage of height `s`.

Crates, panels, blind, HUD and stalls stay geometric CSS. If an illustration set is
sourced later, it replaces the glyph inside `Product.tsx` only.

## 8. Round structure

Five phases, one screen, all transitions in place:

```
encoding -> retention -> shopping -> roundEnd | outOfHearts
```

The handoff's `intro` modal is **dropped**. GameShell already frames the game, and an
extra tap before every round is friction for this audience. The round opens directly on
the visible list.

The handoff's arcade shell is also dropped: no countdown clock, no points, no coins, no
LEVEL pill, no pause button, no PLAY AGAIN reset. GameShell owns the level badge and the
exit affordance; SessionManager owns rotation. Lives, hints and the round-end cards are
kept. This matches how Train Yard was ported.

### 8.1 `encoding` - list visible

The shopping-list card shows: purple `#5B3E8E` header bar, one row per item (60px
artwork + 30/700 name), footer pill "Find these items!". Rows animate in with
`mk-slidein` 300ms `cubic-bezier(.22,.61,.36,1)`, **staggered 90ms per row**.

Held for `listSeconds`. Caption: "Remember the items from the list."

### 8.2 `retention` - list covered

1. The wooden blind drops over the card: 540ms `cubic-bezier(.22,.61,.36,1)`,
   `translateY` from `-560px` to `0`. Fill is
   `repeating-linear-gradient(180deg, #C9A76B 0 26px, #B8945A 26px 30px)` with a 5px
   `#8A5A34` border, reading "LIST COVERED".
2. **Only once the blind has landed** does the list blank (`covered: true`), after a 40ms
   arm delay matching Train Yard's `ARM_MS`.
3. Hold for `retentionMs`. Five progress dots fill left to right, driven by a 120ms
   interval against a wall-clock start.
4. The blind lifts (540ms, same easing) and the phase becomes `shopping`.

Total phase length is `540 + hold + 540`.

### 8.3 `shopping`

Untimed. Crates are live. Caption: "Find and collect only those items, then press SUBMIT."

- **Tap a crate** adds the item to the cart: the crate lifts `translateY(-5px)` over
  220ms, its border turns green `#5AA83F`, opacity drops to `.82`, a green tick badge
  fades in top-right over 180ms, and the artwork appears in the next cart slot with
  `mk-slidein` 240ms.
- **Tap a picked crate, or its cart slot**, to remove it.
- **Basket full** (picks equal list length) shows a floating "Basket full" toast at the
  tap point and takes no pick.
- **Cart slots**: one dashed `#C0A377` outline per list item; filled slots become
  `#FFF7E2` with a solid `#C9A76B` border. Slot width shrinks so the strip always fits
  760px: **100px** at 4 or fewer items, **82px** at 5, **68px** at 6 (gap 10, panel
  `min-width: 0`). MY CART block 112px, SUBMIT 172px.
- **SUBMIT** is `#59A93C` when at least one item is picked, `#8FA987` otherwise.

### 8.4 `roundEnd` - scoring

On SUBMIT, `scoreRound` partitions the picks:

```
correct = picked ∩ list
wrong   = picked \ list
missed  = list \ picked

livesLost = min(2, |wrong|) + (|missed| > 0 ? 1 : 0)
```

If `|correct| > 0`, fire confetti at (400, 1000). If lives reach 0 the phase becomes
`outOfHearts`, otherwise `roundEnd`:

- Perfect: title "Whole list, exactly right" in `#3F7E2B`
- Otherwise: "Basket checked" in `#5B3E8E`
- Body: "`{correct}` of `{n}` right, `{w}` not on the list, `{m}` missed."
- Button **Next round**, which commits the result via `onLevelComplete`

### 8.5 `outOfHearts`

Title "Market closed" in `#C13A33`, button **Try again**, which also commits via
`onLevelComplete` with `completed: false`.

Both terminal cards commit exactly once, guarded by a `committedRef`, as in Train Yard.

### 8.6 Hints

Two per round. Tapping HINT picks a random **un-collected list item** and makes its crate
glow: border `#F0A92B` plus `mk-glow`, a 2000ms breathing ring
`0 0 0 14px rgba(255,214,102,.5)` at the halfway point. Auto-clears after **3000ms**, or
immediately when superseded. Disabled at `opacity: .55` outside `shopping` or at 0 hints
remaining.

## 9. Difficulty

`getMarketMemoryParams(score)` maps the 0.0-1.0 difficulty score onto five axes. Every
threshold lives in one named constants block at the top of the function so the curve can
be retuned from a single place.

| Prop | Curve across score 0 -> 1 |
|---|---|
| `listLength` | 3 -> 6 (integer lerp) |
| `listSeconds` | 9000ms -> 3500ms |
| `similarPackaging` | on from 0.25 |
| `delayedRetrieval` | on from 0.55 |
| `listCategory` | on from 0.75 |
| `lives` | fixed at 3 |
| `hints` | fixed at 2 |

`retentionMs` is 1500ms, plus 2500ms when `delayedRetrieval` is on.

### 9.1 Crate composition

```
0. pool = listCategory ? all items of the chosen group (see 9.2) : all 21 items
1. list = shuffle(pool).slice(0, listLength).map(id)
2. if similarPackaging: for each target, push its twin if not already chosen and fewer than 12 chosen
3. fill from shuffle(pool) until 12 chosen or pool is exhausted
4. if still fewer than 12 chosen: fill from shuffle(all 21 items) until 12 chosen
5. crates = shuffle(chosen)
```

Step 4 only ever does work when `listCategory` is on, because the full 21-item pool
cannot be exhausted before 12 are chosen. A target's twin may fall outside the chosen
group; step 2 still admits it, which is intended - the twin is the mechanic and outranks
group homogeneity.

The list is always a subset of the twelve crates, and every target's twin is present
whenever there is room.

### 9.2 `listCategory` - deviation from the handoff

The handoff specifies that `listCategory` draws all targets **and** fills all remaining
crates from a single group. That cannot be implemented as written: no group has twelve
members. Pantry has 10, produce 5, dairy 4, bakery 2.

Resolution: when `listCategory` is on, choose uniformly at random among the groups with at
least `listLength + 2` members, and use that group as the `pool` in 9.1. Steps 1-3 then
draw targets, twins and filler from within the group, and step 4 tops the shelf up to
twelve from the global pool.

The `+ 2` margin guarantees the group can supply the targets **and** at least two
same-group decoys, which is what makes the shelf feel homogeneous. A `listLength * 2`
rule was considered and rejected: it demands 12 members at `listLength` 6, which no group
has, so `listCategory` would silently disable itself at precisely the top of the curve
where it is meant to bite.

In practice `listCategory` and `listLength` 5-6 both sit above score 0.75, so pantry (10
members) is the qualifying group at the top of the curve, giving 10 of 12 crates from one
group. Produce (5) qualifies only at `listLength` 3, reachable if the thresholds are
later retuned. Should no group qualify, `listCategory` degrades to the full pool for that
round rather than failing - but with the curve as specified this branch is unreachable.

This delivers the intended homogeneous-shelf pressure without pretending to a constraint
the catalogue cannot satisfy.

### 9.3 Performance ratio

In `computePerformanceRatio`, for `market-memory`:

```
ratio = correct / listLength - wrong * 0.15 - hintsUsed * 0.05
```

clamped to 0-1. Wrong picks are penalised more heavily than misses because picking a twin
is the specific failure this game exists to measure; a miss is ordinary forgetting.

## 10. Metrics

`onLevelComplete` emits, in `metrics`:

| Key | Meaning |
|---|---|
| `correct` | count of picked items that were on the list |
| `wrong` | count of picked items that were not |
| `missed` | count of list items never picked |
| `listLength` | targets this round |
| `hintsUsed` | 0-2 |
| `timeToFirstPickMs` | from `shopping` entry to the first crate tap |
| `timeToSubmitMs` | from `shopping` entry to SUBMIT |
| `pickOrder` | item ids in the order they were picked |

`durationSeconds` is measured from mount, and `completed` is true unless the round ended
in `outOfHearts`.

## 11. State model

```ts
{
  phase: 'encoding' | 'retention' | 'shopping' | 'roundEnd' | 'outOfHearts',
  lives, hints,
  list: string[],       // target item ids
  crates: string[],     // 12 item ids in grid order
  picked: string[],
  peek: string | null,  // hinted item id
  covered: boolean,     // list blanked; set only after the blind lands
  blindDown: boolean,
  retentionPct: 0..1,
  effects: Effect[],    // toasts and confetti
  result
}
```

The round (`list`, `crates`) is frozen in a lazy `useState` initialiser. A re-render must
never reshuffle the round underneath the player.

## 12. Three implementation warnings

Carried verbatim from the handoff. All three describe defects that were actually hit in
the previous games.

1. **Phase changes run on `setTimeout` against a deadline, never on the display ticker.**
   A ticker-driven phase machine deadlocks on a pause, a backgrounded tab or a dropped
   frame.
2. **Clear the phase timer before every transition.** A single `clearPhaseTimer()` must
   kill both the pending `setTimeout` and the retention dot interval. Missing this leaves
   an old timer to fire a stale transition mid-round.
3. **Blank the list only after the blind has landed.** Blanking on phase entry is visible
   through the drop and destroys the illusion.

Effects are keyed by a monotonic sequence and self-remove after `life + 120ms`. Never key
them by index, or overlapping confetti bursts will recycle DOM nodes mid-animation.

## 13. Motion

| Effect | Duration | Easing |
|---|---|---|
| `EASE_SETTLE` | - | `cubic-bezier(.22,.61,.36,1)` |
| Blind drop / lift | 540ms | `EASE_SETTLE` |
| List row stagger | 300ms, 90ms apart | `EASE_SETTLE` |
| Crate pick lift | 220ms | `EASE_SETTLE` |
| Crate tick badge | 180ms | ease |
| Cart slot fill | 240ms | `EASE_SETTLE` |
| Hint glow | 2000ms loop | ease-in-out |
| Modal card in | 260ms | `EASE_SETTLE` |
| Caption swap | 260ms | ease |
| Floating toast | 900ms | ease-out |
| Confetti | 1150ms | `cubic-bezier(.33,1,.68,1)` |

**Confetti**: 16 pieces from the origin, evenly spaced angles with +/-0.225 rad jitter,
radius 90-170px, vertical scale x0.7 with a -30px lift, rotation +/-160deg, size 10-17 x
6-12, every third piece round, per-piece delay 0-90ms. Palette `#EDBB2A`, `#F5D778`,
`#D7443C`, `#3D7CC9`, `#FFFFFF`, `#5AA83F`.

**Reduced motion** uses the shared `src/lib/useReducedMotion.ts` hook rather than Train
Yard's private copy. Every transform animation becomes an opacity fade of the same
duration: the blind cross-fades rather than drops, confetti and toasts fade in place,
list rows and cart slots appear without sliding. **No timing changes** - the phase
schedule is identical.

## 14. Accessibility

- Minimum tap target 68 x 100 (cart slots at the longest list); crates are 176 x 128.
- Text on cream is `#4A3A22` or darker on `#FFF9EA` (at least 8:1); white on the navy HUD
  (at least 9:1).
- Every crate carries its item **name in text** under the artwork. The game never depends
  on recognising a picture alone - which is also what makes the emoji-less items viable.
- Colour is never the only signal for a picked crate: border colour, lift, opacity and a
  tick badge all change together.
- `prefers-reduced-motion` is honoured at mount via the shared hook.

## 15. i18n

All user-facing strings go through `t('key', 'English fallback')` per the project
convention, namespaced `mm.*`. Only English fallbacks are authored here; Hindi and
Kannada entries can be added to `public/locales/<lng>/common.json` later with no code
change.

## 16. Out of scope

- Real product illustration (the `Product.tsx` glyph is the single swap point)
- The countdown clock, points, coins, pause, LEVEL pill and PLAY AGAIN reset
- Hindi and Kannada translations
- Retiring `shopping-list-recall`
- Fixing the `serve-guests` rotation defect noted in section 3
