# Train Yard - design

Date: 2026-08-04
Game id: `train-yard`
Category: memory

## Purpose

Paired-associate memory with visual tracking. The player learns which coloured train belongs to
which named station, the station signs are then covered, and the player routes each train to its
station along a lattice of crossing tracks. The sixteen overlapping diagonals are the difficulty
mechanic: a route cannot be resolved by following a line with the eye alone.

Source of truth for visual detail: `design_handoff_train_yard_dispatcher/README.md` and
`design_handoff_train_yard_dispatcher/Train Yard Dispatcher.dc.html`. This spec records only where
the app deviates from that handoff, plus the integration surface. Anything not contradicted here is
built exactly as the handoff specifies.

## Deviations from the handoff

The handoff describes a standalone game with its own chrome and a full assist toolkit. This app's
`GameShell` already owns the frame, and no existing game has a score, a clock or assists.

Removed:

- Countdown clock and the entire `deadline` / `heldMs` / display-ticker architecture
- HINT and UNDO (and therefore the `history` and `peek` state, and the charge badges)
- Score, the `+100` / `-100` numerals and the HUD score cluster
- Pause button and the `paused` state
- Level pill (GameShell renders a level tag already)
- Upcoming Trains panel
- Intro card

Kept:

- Encoding -> retention -> dispatch -> round end
- 3 hearts as the only fail condition
- RESET, free, returns every train to its lane
- Round-complete card
- The retention blind, the random nudge, and every dispatch effect except the score numeral
- Reduced-motion handling

The name is **Train Yard**, not Train Yard Dispatcher. `GameShell` derives its displayed title from
the game id, so `train-yard` renders as "Train Yard".

## Integration surface

One round = four trains dispatched = one `onLevelComplete` call.

| File | Change |
|---|---|
| `src/screens/GameRouter.tsx` | registry entry `'train-yard' -> { TrainYard, 'memory' }`, plus a `getTrainYardParams` branch in `generateContentForGame` |
| `src/lib/dynamicDifficulty.ts` | `TrainYardDynamicParams` type and `getTrainYardParams(score)` |
| `src/components/GameShell.tsx` | a `computePerformanceRatio` case for `'train-yard'` |
| `public/locales/{en,hi,kn}/common.json` | `ty.*` caption and station-name keys |

### Difficulty parameters

```ts
type TrainYardDynamicParams = {
  signMs: number;           // lerp(8000, 3000, score) - encoding window
  retentionHoldMs: number;  // lerp(1500, 4000, score) - blind held down
  similarColours: boolean;  // score >= 0.6
  lives: number;            // 3, fixed
};
```

`similarColours` swaps the four distinct hues (red/blue/green/yellow) for the four close warm hues.
The raster station and train art exists only in the four distinct colours, so the similar-colours
tier applies a per-train and per-station CSS `hue-rotate`/`saturate` filter derived from the target
hue rather than shipping a second art set. If that reads badly in the smoke test, the fallback is to
drop `similarColours` and extend `signMs` instead - recorded as an open risk, not a silent choice.

### Metrics and performance ratio

`onLevelComplete` returns:

```ts
metrics = { trainsHome, totalTrains: 4, firstTryCorrect, wrongDispatches, resets, livesLeft, signMs }
```

`completed` is true when all four trains reach their station, false when hearts reach zero.

```ts
// GameShell.computePerformanceRatio
if (gameId === 'train-yard') {
  const firstTryCorrect = (m.firstTryCorrect as number) ?? 0;
  const resets = (m.resets as number) ?? 0;
  return Math.max(0, Math.min(1, firstTryCorrect / 4 - resets * 0.1));
}
```

A train that was dispatched wrongly and bounced back does not count toward `firstTryCorrect` even
once it later reaches the right station, so the ratio measures recall, not persistence.

## Structure

`src/games/memory/TrainYard/`

| File | Responsibility |
|---|---|
| `index.tsx` | phase machine, round setup, dispatch resolution, lives, `onLevelComplete` |
| `geometry.ts` | column and band constants, the route path for a (lane, station) pair, the 24 track segments with per-segment angle and length |
| `TrackLayer.tsx` | the 8 verticals and 16 diagonals |
| `Station.tsx` | station sprite, sign, revealed/hidden/invite states |
| `Train.tsx` | train sprite, lane/arm/run/back/done states, selection ring, nudge halo, steam |
| `Blind.tsx` | the retention cover and its progress dots |
| `effects.tsx` | gold ring bloom, confetti, dim-dip with cross |
| `palette.ts` | both colour sets, the station-name pool |
| `sprites.ts` | sprite manifest: url and natural size per asset |
| `styles.css` | the `ty-*` keyframes |

Plus `src/lib/useImagesReady.ts`, a generic `(urls: string[]) => boolean` decode gate.
Picture Postcard's `useSceneImages` is the same idea bound to a `SceneDef`; it is left alone, and the
duplication is logged as a follow-up rather than refactored under this work.

### Canvas

The 800 x 1276 design canvas (HUD 800 x 96, board 800 x 1180) is laid out in design pixels and
scaled to the GameShell content area with a single `transform: scale(s)`, `s = min(w/800, h/1276)`,
centred. All handoff coordinates are used unchanged.

The HUD bar keeps its navy geometry and holds only the heart cluster. The board's right-hand column,
vacated by the Upcoming Trains panel, takes scenery from the sprite sheet (water tower, house,
crates) so the board does not read as lopsided. Scenery is `pointer-events: none` and paints below
every interactive layer; the RESET control keeps its `z-index: 7`.

## Art

Assets are cropped from `public/train-assets/Train_Station_Game_assets.png` (1536 x 1461) by a one-off
Python/PIL script into alpha-trimmed PNGs under `public/train-assets/sprites/`. The script lives in
the scratchpad; the PNGs are committed.

Cropped: four station buildings, the straight track tile, tree, bush, flowers, rock, house, water
tower, crates, fence, heart. The four `Train_*.png` top-down sprites are used as-is in the
70 x 112 train slot.

Two consequences of using raster art:

1. **Station roof colour is baked into the image.** Roof colour is the answer, so a coloured
   building cannot show during dispatch. Hidden state is `filter: grayscale(1) brightness(.95)` on
   the same image, transitioning over the handoff's 420ms; revealed state is full colour. The sign
   plate is part of the building art, so the name and the `?` glyph are overlaid on it at the sign
   rectangle given in the handoff.
2. **Diagonals.** The straight track tile is repeated along each segment and rotated to that
   segment's own angle, so sleepers stay perpendicular and rail gauge does not collapse. The same
   tile is used at 26px for the eight verticals and 17px for the sixteen diagonals.

Trains follow the handoff's three-leg route with `offset-path` / `offset-distance` and
`offset-rotate: auto 90deg`, so they visibly stay on drawn rails.

Baloo 2 is not in the app's type stack. The game uses the app's existing Inter / Noto stack at the
handoff's sizes and weights rather than adding a font dependency for one screen.

## Phases

`'encoding' | 'retention' | 'dispatch' | 'roundEnd'`

There is no intro card, so encoding begins on mount - but gated on sprite decode via
`useImagesReady`, because `signMs` is a measured window and a decode running inside it silently
shortens it. Until the gate opens the board shows the app's existing loading treatment.

Round setup shuffles `assign` (station index -> palette index) and `order` (lane index -> palette
index) independently, so a train's lane position carries no information about its station. Four
station names are drawn from the eight-name pool.

### Retention transition

Built exactly as the handoff specifies, because it is the mechanic most likely to be got wrong:

1. Blind drops 540ms `cubic-bezier(.22,.61,.36,1)` with the station names **still showing**
2. A separate timer, firing at the end of the drop, sets `covered` -> signs blank to `?` underneath
3. Hold for `retentionHoldMs`, progress dots ticking every 120ms
4. Blind lifts 540ms, dispatch begins

The blanking is gated on the `covered` flag, never on the phase, so the names are never seen popping
to `?` in plain view.

### Timers

Every phase change runs off its own `setTimeout`, cleared on unmount. The 120ms retention dot ticker
is display-only and cannot move the game. With the countdown removed there is no other timekeeping.

### Dispatch resolution

Correct and wrong dispatch follow the handoff's timelines exactly, minus the score numeral:
2300ms outbound run, then bloom + confetti + permanent sign reveal on a correct dispatch, or dim-dip
+ cross + one heart lost + an 1800ms return run on a wrong one. Taps are ignored while any train is
`arm`, `run` or `back`, when the station is already filled, and when no train is selected.

The random nudge nominates one waiting train when dispatch opens and again after each successful
dispatch; it clears on any train tap and never points at a station.

RESET returns every train to its lane and clears the selection. It does not restore lives, and it
increments the `resets` metric.

### Round end

- All four home -> card titled "Round complete", button "Next round"
- Hearts at zero -> card titled "Out of hearts", button "Try again"

Either button calls `onLevelComplete`; GameShell remounts the game for the next round.

## Copy and localisation

Captions use `t()` with an English fallback, keyed under `ty.*`:

| Key | English |
|---|---|
| `ty.caption.encoding` | Learn the station names now - the signs go blank in a moment. |
| `ty.caption.retention` | Hold them in mind... |
| `ty.caption.dispatch` | Tap a train, then tap the station it belongs to. |
| `ty.caption.selected` | Where does the {{colour}} train go? |
| `ty.caption.wrong` | Not this one |
| `ty.blind.covered` | SIGNS COVERED |
| `ty.reset` | RESET |
| `ty.roundComplete` | Round complete |
| `ty.outOfHearts` | Out of hearts |
| `ty.next` | Next round |
| `ty.retry` | Try again |

Station names are a pool of eight, four drawn per round, keyed `ty.station.1` .. `ty.station.8`:

MYSURU, UDUPI, HASSAN, MANDYA, BIDAR, BELAGAVI, HUBBALLI, TUMAKURU

All are eight characters or fewer, so they fit the 114px sign at 20px/800. In `hi` and `kn` they are
rendered in Devanagari and Kannada script; the Noto Sans fallbacks are already in the type stack.

## Reduced motion

`prefers-reduced-motion`, with a prop override. Every transform effect becomes an opacity fade: the
blind fades over the same 540ms instead of dropping, confetti fades in place, the bloom fades, and
the bob, sign glow and nudge pulse are suppressed - the nudge keeps its static halo.

## Verification

- `npm run build` completes with no TypeScript or Vite errors
- `npm run lint` introduces no new errors (the repo carries 38 pre-existing ones, so the gate is
  "no new", not "clean")
- Manual smoke test: encoding shows names, the blind covers before they blank, all four dispatch
  correctly, a wrong dispatch costs a heart and returns the train, RESET works, hearts to zero shows
  the game-over card, and session resume still works
- `package.json` bumped to 1.4.0 (minor - new game)

## Open risks

1. The `similarColours` tier is achieved with a CSS filter over the four-colour art, not a second
   art set. It may read poorly; the fallback is to drop the lever.
2. The 800 x 1276 canvas is tall. On a short viewport the scale-to-fit factor may make the trains
   small. If the smoke test shows this, the fallback is to fit width and scroll vertically rather
   than shrink.
