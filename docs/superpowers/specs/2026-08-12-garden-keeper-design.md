# Garden Keeper - design

Date: 2026-08-12
Game id: `garden-keeper`
Category: attention
Source: `design_handoff_garden_keeper/` (README, `garden-keeper.html`, `garden-keeper-src.dc.html`)
Supersedes: `docs/superpowers/specs/2026-08-07-garden-keeper-brief.md` where the two disagree

## Purpose

Garden Keeper is the fourth attention game, joining `spot-focus`, `focus-filter` and `word-search`.
Plants in a garden bed sprout one at a time and ask to be watered inside a short window.
The player taps the sprouted plant before its countdown ring closes, and must not tap the weeds,
insects and toadstools that share the bed.

One gesture, one tap. There is no watering can to pick up, no drag, no aiming.
The demand comes from **which** object is asking and **when**.

The round lasts 90 seconds and ends when the target count is reached, the clock runs out, or the
player loses all three hearts.

## Deviations from the brief

The 2026-08-07 brief described a different mechanic. The handoff prototype replaced it, and the
handoff wins. Recorded here so the brief is not read as current:

| Brief | Handoff, and this spec |
|---|---|
| Water droplet markers float above flowers | No markers. Plants run a seed → sprouted → dried cycle; the sprouted plant is the target |
| Legend as three persistent corner chips | A four-row legend on the intro card, dismissed with START |
| Gardener character introduces the round | Dropped. He occupied space the bed wanted |
| Watering can as the pour affordance | Dropped. The tap is the whole interaction; a splash of droplets is the feedback |
| Weather and day/night ambient noise | Dropped. Not implemented, and not planned |
| Missed droplet wilts the flower for a beat, then recovers | Missed window browns and droops the plant for 2600ms, then returns it to seed |

The asymmetry the brief insisted on survives intact: a missed window costs nothing, only tapping a
distractor costs a heart. This is deliberate for this population and is not to be "balanced".

## Deviations from the handoff

1. **The bed rebuilds each round.** The handoff builds the bed once per mount and reuses it across
   rounds, resetting only cycles and counters. This app remounts the game component on every round
   (`GameRouter` increments `gameKey`), so each round gets a fresh garden. Accepted: a new bed each
   round is, if anything, better for an attention task.
2. **`NEXT ROUND` exits the game rather than restarting it.** The handoff's end-card button calls
   the same `start()` as the intro. Here it calls `onLevelComplete` exactly once, and `GameShell`
   decides whether to rotate the player out or remount for another round.
3. **Type face.** The handoff specifies Baloo 2 from Google Fonts and permits substituting an
   established rounded face. This app's face is used. A network font fetch inside a timed round is
   a decode risk the round cannot absorb.
4. **All copy through `t()`.** The prototype's strings are English literals. Every one is keyed
   under `gk.*` and authored in en, hi and kn.
5. **Sprite drawing lives in its own module.** The prototype inlines its drawing helper. Here it is
   `sprites.tsx` with a `(species, stage, size)` interface, so replacing CSS primitives with raster
   art later touches one file.
6. **The toast wraps instead of `white-space: nowrap`.** Hindi and Kannada run visually longer than
   English at the same size, and a nowrap toast at 24px would run off the board. See Interactions.

Everything else - geometry, backdrop, HUD, the signifier, all ten keyframes, toast and splash,
card layout, colour and type tokens - is transcribed literally from the handoff.

## Integration surface

Hard contracts from the app:

1. **Props in:** `{ levelConfig, onLevelComplete }`, plus an optional `reducedMotion` override for
   testing. `levelConfig.params` carries `GardenKeeperDynamicParams`.
2. **Call `onLevelComplete` exactly once**, with `completed`, `durationSeconds` and `metrics`.
3. **One round per mount.** The bed is built once at mount.
4. **A single 0-1 difficulty score drives everything.** No per-player configuration.
5. **Tap only, 96px minimum hit targets** (above the app's 80px floor), three languages.
6. **`prefers-reduced-motion` respected**, with the prop override.

Files to touch:

| File | Change |
|---|---|
| `src/games/attention/GardenKeeper/` | New. See Structure |
| `src/games/attention/GardenKeeper.ts` | Re-export barrel, matching the other attention games |
| `src/screens/GameRouter.tsx` | Registry entry + `garden-keeper` params branch |
| `src/components/GameShell.tsx` | `computePerformanceRatio` case |
| `src/lib/dynamicDifficulty.ts` | `GardenKeeperDynamicParams` + `getGardenKeeperParams` |
| `src/session/SessionManager.tsx` | Add to the `attention` rotation pool |
| `src/screens/DailyQuestionnaire.tsx` | Add to its own copy of the `attention` rotation pool |
| `src/screens/HomeScreen.tsx` | Tile entry |
| `public/placeholders/games/garden-keeper.svg` | Home-screen tile art |
| `public/locales/{en,hi,kn}/common.json` | `gk.*` keys |
| `package.json` | Minor bump, 1.5.0 → 1.6.0 |

`SessionManager` and `DailyQuestionnaire` each hold their own copy of the rotation pool. Both are
updated here; consolidating them is a separate change and is not attempted in this work.

### Difficulty parameters

`getGardenKeeperParams(score)`, using the existing `lerp` / `lerpInt` helpers:

```ts
export interface GardenKeeperDynamicParams {
  plantCount: number;
  distractorRatio: number;
  targetCount: number;
  spawnIntervalMs: number;
  thirstWindowMs: number;
  maxConcurrentThirsty: number;
  roundDurationMs: number;
  lives: number;
}
```

| Param | Formula | at 0 | at 0.35 | at 1 |
|---|---|---|---|---|
| `plantCount` | `lerpInt(12, 24, s)` | 12 | 16 | 24 |
| `distractorRatio` | `lerp(0.25, 0.55, s)` | 0.25 | 0.36 | 0.55 |
| `targetCount` | `lerpInt(8, 20, s)` | 8 | 12 | 20 |
| `spawnIntervalMs` | `lerpInt(3000, 1200, s)` | 3000 | 2370 | 1200 |
| `thirstWindowMs` | `lerpInt(6000, 2800, s)` | 6000 | 4880 | 2800 |
| `maxConcurrentThirsty` | `s < 0.4 → 1`, `s < 0.75 → 2`, else `3` | 1 | 1 | 3 |
| `roundDurationMs` | fixed | 90000 | 90000 | 90000 |
| `lives` | fixed | 3 | 3 | 3 |

At the seeded default the game presents exactly one thirsty plant at a time. That is the intended
baseline experience, not a warm-up state to be grown out of quickly.

**Achievability.** The brief requires `targetCount` to be reachable at the given spawn rate, or the
round is unwinnable by arithmetic rather than by attention. At score 0, the first sprout fires at
900ms and one plant is thirsty at a time, giving `floor((90000 - 900) / 3000) = 29` windows against
a target of 8. At score 1, spawn is 1200ms with up to 3 concurrent, giving 74 windows against a
target of 20. Both hold with wide margin; the binding constraint is the player, which is correct.

### Metrics and performance ratio

Reported on `onLevelComplete`:

```
watered          plants successfully watered this round
targetCount      the round's goal
falseTaps        taps on a weed, insect or toadstool
driedUp          windows that expired unwatered
meanReactionMs   mean ms from sprout to water, rounded; 0 when nothing was watered
livesLeft        3 → 0
```

`completed` is `true` only for the `complete` outcome (target reached), `false` for `time` and
`hearts`. `levelId` is `levelConfig.id`, and `durationSeconds` is wall-clock seconds from the
START tap to the outcome being decided, rounded - not from mount, so time spent reading the intro
card does not count as play.

`computePerformanceRatio`, `garden-keeper` case:

```
hitRatio    = watered / max(1, targetCount)
precision   = (watered + falseTaps) === 0 ? 1 : watered / (watered + falseTaps)
performance = clamp01((hitRatio + precision) / 2)
```

`meanReactionMs` is logged but not scored. It is the cleanest available measure of sustained
attention decay and has no precedent in this codebase; it is worth accumulating before anything
depends on it.

Note what precision does and does not defend against. Tapping every plant on screen inflates
`watered` but costs a heart on the first distractor, so the round ends in seconds - hearts, not the
ratio, are the defence against tap-spamming. Whether three hearts is tight enough is listed under
Open risks.

## Structure

```
src/games/attention/GardenKeeper/
  index.tsx      component: phase machine, timers, spawner, tap handling, HUD, cards
  geometry.ts    canvas constants, BED, buildBed(), depth/size/hit/z-index maths
  sprites.ts     CSS-primitive drawing: (species, stage, size) → style strings
  model.ts       cycle records, stage advancement, spawn selection, result maths
  styles.tsx     gk-* keyframes as an inline <style> block
  palette.ts     flower colourways, dried browns, distractor pool
```

`model.ts` and `sprites.ts` hold no React. The stage advancement, the result maths and the drawing
layer are the parts most likely to be wrong, and keeping them free of JSX is what makes them
testable in vitest's node environment. `art()` therefore returns CSS text per layer and the
component turns those into elements.

### Canvas

Fixed 800px design canvas, scaled with one transform to fit its container, exactly as Train Yard
does: `transform: scale(calc(100cqw / 800))`, `transform-origin: top left`, on a
`container-type: inline-size` parent.

| Region | Geometry |
|---|---|
| HUD bar | 800 × 108, at top |
| Play board | 800 × 1172 |
| **Total** | **800 × 1280** |

All board coordinates below have their origin at the play board's top-left.

### Bed layout

`buildBed(plantCount, distractorRatio)` runs once at mount.

| Constant | Value |
|---|---|
| `BED.x` | 62 |
| `BED.y` | 250 |
| `BED.w` | 676 |
| `BED.h` | 860 |

Columns from the plant count: `≤12 → 3`, `≤18 → 4`, otherwise `5`.
`rows = ceil(count / cols)`, `cw = BED.w / cols`, `ch = BED.h / rows`.

For plant index `i`, with `col = i % cols` and `row = floor(i / cols)`:

```
jx = random(-cw * 0.14, cw * 0.14)
jy = random(-ch * 0.12, ch * 0.12)
x  = BED.x + cw * (col + 0.5) + jx
y  = BED.y + ch * (row + 0.42) + jy
```

The array is then sorted ascending by `y`, so nearer plants paint over further ones.

`depth = clamp01((y - BED.y) / BED.h)` drives two things:

| Property | Rule |
|---|---|
| Sprite size | `base * lerp(0.86, 1.14, depth)`, `base = 82` for insects, `96` for everything else |
| Recede haze | `recede = lerp(0.16, 0, depth)`, applied as `brightness(1 - recede * k)`, `k = 0.4` for real plants, `1` for distractors |

**Hit target.** A square of `max(96, size)` px, never below 96 regardless of how small the sprite
draws, positioned `margin: -hit*0.82 0 0 -hit/2` on the `(x, y)` anchor so the anchor sits at the
plant's base.

**Stacking.** `z-index = (active ? 20 : 1) + min(6, round((y - BED.y) / 140))`. The plant currently
asking for water always paints above the bed.

**Distractor allocation.** `round(plantCount * distractorRatio)` plants are distractors, drawn
cyclically from `[weedA, weedB, weedA, bee, ladybird, snail, caterpillar, mushroom, carnivore]`
shuffled per bed. The remainder are flowers, each assigned a species and one of six colourways.

### Backdrop

Three bands. Board background:

```
linear-gradient(180deg, #9AD0EC 0%, #C4E3F4 132px, #86BE55 133px, #6BA641 240px)
```

Over it, in order:

| Element | Geometry | Fill |
|---|---|---|
| Hedge lobe 1 | `left -40, top 96`, 380 × 96, `border-radius: 50%` | `#6FA83F` |
| Hedge lobe 2 | `left 250, top 74`, 340 × 108, `border-radius: 50%` | `#7CB447` |
| Hedge lobe 3 | `left 520, top 92`, 360 × 98, `border-radius: 50%` | `#679C3A` |
| Hedge base | `left 0, top 168`, 800 × 40 | `linear-gradient(180deg, #5E9C38, #4E8C3A)` |
| Lawn | `left 0, top 200`, 800 × 972 | `linear-gradient(180deg, #4E8C3A, #427E2F)` |
| Soil bed | `left 18, top 224`, 764 × 924, `border-radius: 210px / 130px` | `radial-gradient(ellipse at 50% 20%, #7E5632 0%, #67451F 55%, #533618 100%)` |
| Soil vignette | same box, `pointer-events: none` | `radial-gradient(ellipse at 50% 42%, transparent 46%, rgba(28,16,4,.34) 100%)` |

### HUD

800 × 108, `linear-gradient(180deg, #2C5580 0%, #1E3E63 100%)`,
`border-bottom: 4px solid #14304F`, flex row, `align-items: center`, `gap: 22px`,
`padding: 0 26px`. It sits below `GameShell`'s own top bar, as Train Yard's does.

**Clock** (left). `m:ss`, 42px/800, `font-variant-numeric: tabular-nums`,
`letter-spacing: .01em`, line-height 1.3. `#FFFFFF`, switching to `#FFB4A8` at `timeLeft ≤ 15s`.

**Progress** (centre, `flex: 1`). Column, `gap: 7px`.
Label `gk.progress` at 18px/700 `#9FC0DE`, `letter-spacing: .14em`.
Track height 16, radius 8, `rgba(10,28,48,.55)`, `overflow: hidden`.
Fill `linear-gradient(90deg, #8FD65C, #62B33C)`, radius 8,
`transition: width 320ms cubic-bezier(.22,.61,.36,1)`.

**Hearts** (right). Three, flex row `gap: 9px`, each 38 × 35, drawn with

```css
clip-path: path('M19 35 C6.6 24.6 0 17 0 10 C0 3.8 4.5 0 9.5 0 C13.4 0 17 2.3 19 5.7 C21 2.3 24.6 0 28.5 0 C33.5 0 38 3.8 38 10 C38 17 31.4 24.6 19 35 Z');
```

Filled `#F2564C`, spent `rgba(255,255,255,.18)`, `transition: background-color 260ms ease`.

## The plant cycle

Every flower runs an independent cycle. Distractors have no cycle at all.

| Stage | Meaning | Waterable | Exit |
|---|---|---|---|
| `seed` | Dormant in the soil | No | Chosen by the spawner |
| `sprouted` | Up and asking for water, ring closing | **Yes** | Watered → `seed`; window expires → `dried` |
| `dried` | Window missed, browned and drooping | No | After `DRIED_HOLD_MS = 2600` → `seed` |

Watering returns the plant to `seed`, so the same plant can cycle again later in the round.

```ts
interface CycleRecord {
  stage: 'seed' | 'sprouted' | 'dried';
  thirstyAt: number | null;   // epoch ms, for reaction time
  until: number | null;       // epoch ms wall-clock deadline, not a countdown
  seq: number;                // increments per sprout; keys the entry animation
}
```

**Advancement.** A 100ms ticker reads the clock and never accumulates elapsed time. On each tick,
for every cycle with `until` set and `now >= until`:

- `sprouted` → `dried`, `until = now + 2600`, `driedUp += 1`. Costs no heart.
- `dried` → `seed`, `until = null`.

Round end is its own `setTimeout` at the round deadline, never the ticker.

**Spawner.** A self-rescheduling `setTimeout`: first fire 900ms after start, then every
`spawnIntervalMs`. Each fire, if the count of `sprouted` plants is below `maxConcurrentThirsty`,
pick a random `seed` plant and sprout it with `until = now + thirstWindowMs`.

## The active-plant signifier

**Exactly one signifier marks the target.** Earlier prototype iterations stacked a pin, a droplet
badge, a tail and a bar; all were removed. What remains is a light pool, a closing ring, and the
fact that the active plant is the only fully saturated object on screen. A future feature wanting
another cue should replace the ring, not sit beside it.

With `hit` the plant's hit size, `ringSize = hit * 1.24`, and
`remain = clamp01((until - now) / thirstWindowMs)`:

**Countdown ring** - `left 50%, top 62%`, `ringSize` square, `border-radius: 50%`,
`transform: translate(-50%,-50%)`, `pointer-events: none`.

```css
background: conic-gradient(RING_COL 0deg {remain*360}deg, rgba(255,255,255,.22) {remain*360}deg 360deg);
mask: radial-gradient(circle, transparent 0 60%, #000 61%);   /* + -webkit-mask */
```

| `remain` | `RING_COL` |
|---|---|
| `> 0.5` | `#8FD65C` |
| `0.22 - 0.5` | `#FFC24D` |
| `≤ 0.22` | `#FF7A6B` |

Entry `gk-ringin 260ms EASE both`. Inactive: `opacity: 0`, `transition: opacity 260ms ease`.

**Light pool** - same anchor, `ringSize * 1.5` square, `border-radius: 50%`:

```css
background: radial-gradient(circle,
  rgba(255,246,214,.5) 0%,
  rgba(255,236,180,.18) 46%,
  rgba(255,236,180,0) 70%);
animation: gk-halo 2200ms ease-in-out infinite;
```

Inactive: `opacity: 0`, `transition: opacity 320ms ease`.

**Saturation as figure/ground.**

| Object | Filter |
|---|---|
| Active sprouted plant | none |
| Other flowers (seed / dried) | `saturate(0.9) brightness(1 - recede * 0.4)` |
| Distractors | `saturate(0.62) brightness(1 - recede)` |

**Ground shadow** under every plant: `left 50%, bottom -6px`, `hit*0.54 × hit*0.16`,
`border-radius: 50%`, `rgba(30,18,6,.26)`.

## Interactions

One gesture: `pointerup` on a plant's hit square. Cursor `pointer` while playing, `default`
otherwise. Taps are ignored outside the `playing` phase.

| Tap target | Result |
|---|---|
| Sprouted plant | **Score.** `watered += 1`, cycle → `seed`, reaction `now - thirstyAt` recorded. Splash + bloom. At `watered >= targetCount`, finish `complete` after 620ms |
| Seed plant | No penalty. Toast `gk.toast.notReady` in `#F5D778` |
| Dried plant | No penalty. Toast `gk.toast.tooLate` in `#F5D778` |
| Weed / insect / poison | **Heart lost.** `falseTaps += 1`, shake, toast `gk.toast.notThis` in `#FFD9D2`. At 0 hearts, finish `hearts` after 460ms |

**Toast.** Absolute at `(plant.x, plant.y - size*0.7)`, `translate(-50%, 0)`, `padding 8px 20px`,
`border-radius 14px`, `background rgba(14,36,60,.92)`, 24px/700, `z-index 30`,
`animation: gk-toast 900ms ease-out both`, removed after 1020ms.

The prototype sets `white-space: nowrap`. Hindi and Kannada run visually longer than English at
the same size, so the toast wraps at `max-width: 520px` with `text-wrap: balance` instead, and
`white-space: nowrap` is dropped. Everything else about the toast is unchanged.

**Water splash.** 10 droplets from `(x, y - size*0.4)`. Each droplet 13 × 16, `#9FD8F5`,
`border-radius: 50% / 62% 62% 38% 38%`, `z-index 30`, angle `2π·i/10 + random(-0.3, 0.3)`,
travelling `dx = cos(a) * random(44,78)`, `dy = sin(a) * random(32,58) + 12`, staggered
`random(0, 90)`ms, `animation: gk-splash 760ms cubic-bezier(.33,1,.68,1)`, removed after 880ms.

## Animations

`EASE = cubic-bezier(.22,.61,.36,1)` throughout. All plant transforms use
`transform-origin: 50% 100%`, so growth and droop pivot at the soil line.

| Name | Duration / easing | Keyframes |
|---|---|---|
| `gk-sprout` | 520ms `EASE` | `0%: scaleY(.4) scaleX(.78) opacity .35` → `58%: scaleY(1.1) scaleX(1.04) opacity 1` → `100%: scale(1,1)` |
| `gk-bloom` | 620ms `EASE` | `0%: scale(1)` → `42%: scale(1.18)` → `100%: scale(1)` |
| `gk-droop` | 620ms ease-out both | `0%: rotate(0) scaleY(1)` → `100%: rotate(-6deg) scaleY(.92)` |
| `gk-shake` | 460ms ease-in-out | `translateX` 0 → -6 → 5 → -3 → 2 → 0 px at 0/22/44/66/88/100% |
| `gk-halo` | 2200ms ease-in-out infinite | opacity `.5 → .82 → .5`, scale `1 → 1.06 → 1` |
| `gk-ringin` | 260ms `EASE` both | `opacity 0, scale .72` → `opacity 1, scale 1` |
| `gk-splash` | 760ms `cubic-bezier(.33,1,.68,1)` both | `0%: scale(.5) opacity 0` → `18%: opacity 1` → `100%: translate(var(--dx), var(--dy)) scale(1) opacity 0` |
| `gk-toast` | 900ms ease-out both | rises `translate(-50%, 6px) → (-50%, -34px)`, in by 22%, out after 74% |
| `gk-cardin` | 260ms `EASE` | `opacity 0, scale .94` → `opacity 1, scale 1`, on top of `translate(-50%,-50%)` |
| `gk-fade` | 220-620ms ease | plain opacity 0 → 1 |

As in Train Yard, `gk-cardin` bakes its centring translate into every keyframe and runs with
fill-mode `both`, so the animation owns `transform` for the element's life. Centring the card any
other way throws it to the top-left corner.

**Idle motion, distractors only, never flowers.** Insects loop with per-instance duration
`random(5200, 8400)`ms and delay `random(0, 2600)`ms:

- Bee → `gk-flutter`: `translate(9px,-7px) rotate(4deg)` at 50%, `rotate(-3deg)` at the ends.
- Others → `gk-crawl-a` (`translateX(13px) rotate(3deg)` at 50%) or `gk-crawl-b`
  (`translateX(-11px) rotate(-3deg)`), assigned 50/50 at build time.

A slow idle crawl, never a dart. Fast movement in peripheral vision is the easiest way to make
this game feel stressful rather than absorbing.

## Cards

Full-board scrim `rgba(14,36,60,.62)`, `z-index 9`. Card centred, `z-index 10`: width 620,
`padding 44px 44px 40px`, `border-radius 28px`, `background #FFFCF4`,
`box-shadow 0 18px 0 rgba(20,48,79,.18)`, column flex, `align-items: center`, `gap 26px`,
centred text.

**Intro.** Title `gk.instruction` at 40px/800 `#4A3A22`, line-height 1.2, `text-wrap: pretty`.
Below it four legend rows, each `display: flex; align-items: center; gap: 20px; padding: 12px 8px`,
with a 72 × 66 figure well and left-aligned text at 26px/700, line-height 1.28:

| Figure | Key | Colour |
|---|---|---|
| Seed-stage flower | `gk.legend.seed` | `#8C6D2F` |
| Sprouted flower, ringed | `gk.legend.sprouted` | `#2F6BA8` |
| Dried flower | `gk.legend.dried` | `#8C6D2F` |
| Toadstool | `gk.legend.avoid` | `#B33B2E` |

The ringed row's figure carries `box-shadow: 0 0 0 4px #8FD65C, 0 0 0 12px rgba(143,214,92,.22)`.

The legend renders its figures through the same `sprites.tsx` helper at size 58. Because every
layer is expressed in hundredths of the stage size, a species drawn at 58 in the legend is the same
drawing the player meets at 96 on the bed. Preserve that property in any art pipeline that replaces
the CSS primitives.

**End.** Title 46px/800, `#3F7E2B` on completion, `#5C4A2E` otherwise:

| Outcome | Key |
|---|---|
| `complete` | `gk.roundComplete` |
| `hearts` | `gk.outOfHearts` |
| `time` | `gk.timeUp` |

Body `gk.summary` at 29px/600 `#6B5A3E`, line-height 1.35, interpolating `watered`, `target` and
`dried`.

**Button** on both cards: `min-height 84px`, `padding 0 56px`, `border-radius 20px`,
`background #6FA83F`, `border-bottom: 7px solid #4E7C29`, no other border, 31px/800 `#FFFFFF`,
`letter-spacing .03em`. `gk.start` on the intro, `gk.next` on the end card. The intro button starts
the round; the end button calls `onLevelComplete`.

## State and timers

```
phase        'intro' | 'playing' | 'done'
plants       Plant[]                       // built once at mount, never mutated during play
cycles       Record<plantId, CycleRecord>  // flowers only
watered      number
falseTaps    number
driedUp      number
reactions    number[]
lives        number                        // 3 → 0
timeLeft     number                        // seconds, display only
deadline     number                        // epoch ms, authoritative round end
effects      Effect[]                      // droplets, toasts, shake/bloom flags
result       'complete' | 'time' | 'hearts' | undefined
```

`Plant`: `{ id, kind, species, colour?, x, y, depth, size, hit, crawl, dur, delay }`.

**Timers** - four, all cleared together on unmount and on `start()`:

1. `tick` - `setInterval` 100ms, advances stages and updates the displayed clock.
2. `spawnTimer` - self-rescheduling `setTimeout`.
3. `endTimer` - one `setTimeout` at `roundDurationMs`.
4. A pool of short effect-cleanup timeouts.

A `visibilitychange` listener is added on mount and removed on unmount.

**Transitions.** `intro --START--> playing`; `playing --target reached--> done(complete)`;
`playing --deadline--> done(time)`; `playing --lives 0--> done(hearts)`;
`done --NEXT ROUND--> onLevelComplete`.

### Backgrounding

All timing is wall-clock: stages advance by comparing `Date.now()` against stored deadlines, so
stage *state* survives tab backgrounding where an accumulating timer would drift. The displayed
clock and the sprout windows do not - a throttled ticker leaves a stale clock on screen, and a
plant that sprouts while the app is hidden expires unseen. Two things are therefore required on
`visibilitychange` back to visible, and both are part of this spec:

1. Re-sync `timeLeft` from `deadline - Date.now()` immediately.
2. Return any plant still `sprouted` whose `until` has already passed to `seed`, **not** to
   `dried`, and do not increment `driedUp`. The player never saw the window, so it must not be
   scored against them.

This is the single easiest thing in the game to get silently wrong, and nothing on screen reveals
it when it is.

`finish()` normalises the clock: `timeLeft` is set to `0` for the `time` outcome and to the true
remaining seconds otherwise, so the end card can never contradict the clock behind it.

## Copy and localisation

Everything through `t()` with an English fallback, keyed under `gk.*`, authored in en, hi and kn in
the same commit. Shopping List Recall shipped with hardcoded English labels that could not be
translated even in principle; that is the failure mode this avoids.

| Key | English |
|---|---|
| `gk.instruction` | Water each plant once it has sprouted |
| `gk.legend.seed` | A seed. Leave it be |
| `gk.legend.sprouted` | Sprouted, ring closing. Water it now |
| `gk.legend.dried` | Left too long, it dries up |
| `gk.legend.avoid` | Never water weeds, bugs or toadstools |
| `gk.progress` | WATERED {{watered}} / {{target}} |
| `gk.toast.notReady` | Not ready yet |
| `gk.toast.tooLate` | Too late for this one |
| `gk.toast.notThis` | Not this one |
| `gk.roundComplete` | Garden watered |
| `gk.outOfHearts` | Let's try again |
| `gk.timeUp` | Time's up |
| `gk.summary` | {{watered}} of {{target}} plants watered. {{dried}} dried up. |
| `gk.start` | Start |
| `gk.next` | Next round |
| `game.gardenKeeper` | Garden Keeper |

The plants are never named, which keeps the vocabulary burden near zero. Naming them later would
be a much larger localisation surface.

`gk.progress` is uppercase in English by convention of the HUD label style. Hindi and Kannada have
no case, so the label renders as authored in those languages and `text-transform` is not used.

## Art

CSS-drawn primitives, transcribed from the prototype: absolutely-positioned divs with
`border-radius`, gradients, `clip-path` and `conic-gradient`. This is a prototype expedient carried
forward deliberately so the game is playable and testable now; it is not the final art direction.

The drawing helper takes a stage size `s` and expresses every layer in hundredths of `s`.

Species inventory:

| Kind | Species | Stages |
|---|---|---|
| `flower` | `daisy`, `sun`, `rose`, `lily`, `bell` | seed, sprouted (× 6 colourways), dried |
| `weed` | `weedA`, `weedB` | single |
| `insect` | `bee`, `ladybird`, `snail`, `caterpillar` | single |
| `poison` | `mushroom`, `carnivore` | single |

Flower colourways (`petal` / `deep` / `mid`):

| # | petal | deep | mid |
|---|---|---|---|
| 1 | `#F07FB4` | `#C9518F` | `#FFD764` |
| 2 | `#8A7BE0` | `#5F52B6` | `#FFD764` |
| 3 | `#FFB43C` | `#D08718` | `#8C5A18` |
| 4 | `#FFF6E4` | `#DCCDAE` | `#FFB43C` |
| 5 | `#F26A55` | `#BE4231` | `#FFE08A` |
| 6 | `#57A8E4` | `#357CB6` | `#FFD764` |

Dried browns: `#9A7A45`, `#B08C4E`, `#C2A05C`, `#8C6D2F`.

**When real art arrives**, the swap is confined to `sprites.tsx`. Three requirements carry over:
the three flower stages must read as one plant changing state; the seed stage must read as *not yet
actionable* (the current two-leaf shoot on a soil mound tested well for this); and a species must
render identically at 58px in the legend and 96px on the bed. Following Picture Postcard and Train
Yard, raster art would arrive as alpha-trimmed PNGs from a committed script with a `useImagesReady`
preload gate before the round starts - a decode running inside a live countdown silently steals
seconds from the player.

The home-screen tile is a new `public/placeholders/games/garden-keeper.svg`, matching the other
tiles in the folder.

## Reduced motion

Driven by the existing `useReducedMotion()` hook (`src/lib/useReducedMotion.ts`), with a
`reducedMotion` prop override for testing that takes precedence when defined.

When on: every animation above is replaced with `gk-fade` at the same duration; the halo pulse and
ring entry drop to plain opacity transitions; all insect idle motion is disabled. Stage changes
still read clearly, because colour and the ring's conic sweep carry the information without any
animation at all.

## Verification

1. `npm run build` completes with no TypeScript or Vite errors.
2. `npm run lint` introduces no new errors. The repo carries 38 pre-existing errors, so the gate is
   "no new errors from these files", checked by diffing the count.
3. Manual smoke test on localhost:
   - Round plays end to end: intro → START → water plants → end card → NEXT ROUND remounts with a
     fresh bed.
   - All three endings reachable: reach the target, run the clock out, and lose three hearts.
   - Tapping a seed, a dried plant and a distractor each produce the right toast, and only the
     distractor costs a heart.
   - Background the tab mid-round, return, and confirm the clock re-syncs and that no plant which
     expired while hidden was counted as dried.
   - Switch to Hindi and Kannada and confirm no card, toast or HUD label overflows.
   - `prefers-reduced-motion` on: no insect motion, no halo pulse, target still obvious.
   - Session resume still works: start a session, refresh, confirm the Resume button appears.
   - No console errors during normal play.
4. Version bumped to 1.6.0 before committing.

## Open risks

1. **Is 90 seconds with a live countdown absorbing or stressful for this audience?** The countdown
   is new to this app and is the riskiest borrowed element. It cannot be settled without residents.
2. **Are three hearts tight enough to stop tap-spamming, and loose enough that a careful slow
   player never sees the out-of-hearts card?** The brief asks this and the answer needs observation,
   not arithmetic.
3. **At what plant count does the bed stop reading as a garden and start reading as clutter?** 24 at
   the top of the curve is the handoff's answer; it is untested with residents.
4. **The resting state.** Between sprouts at low difficulty, nothing is asking to be watered. Insect
   idle motion is all that keeps the garden alive. If it reads as "the game has stopped", the fix is
   ambient life, not a faster spawn rate.
5. **CSS-primitive art at tablet distance for an older eye.** The prototype was authored on a
   desktop display. The figure/ground separation between an unsaturated weed and a saturated
   sprouted flower is the thing to check first on the actual hardware.
