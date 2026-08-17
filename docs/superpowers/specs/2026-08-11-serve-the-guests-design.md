# Serve the Guests - design

Date: 2026-08-11
Category: executive
Game id: `serve-guests`
Source prototype: Claude Design project `c8b82a5a-ebf1-43fa-8d2c-9570ddeb82e0`, file `Serve the Guests.dc.html`
Design rules: `public/cooking game basic design rules.md`

## Purpose

A simplified cooking time-management game for care-home residents.
The player runs a small South Indian tiffin counter: guests arrive with a short order
and a patience timer, and the player decides what to cook, when, and what to throw away.

The executive-function content is **planning under time pressure**: choosing what to
start cooking before it is asked for, holding several cook timers in mind at once,
inhibiting the urge to start everything at once, and clearing waste to free capacity.
It is deliberately not a matching task and not a reaction test.

## Round shape

- Four seats. Eight guests per round, arriving on a stagger.
- Each guest asks for 1-3 dishes and carries a patience bar that counts down.
  When it empties they leave unserved.
- The round ends when all eight guests have been handled (served or left).
- **There is no fail state.** `completed` is always `true`. Performance is carried by
  the metrics, not by pass/fail.
- Measured round length is 27-96 seconds depending on difficulty band and how fast the
  player taps, so every round sits inside `GameShell`'s 120-second category rotation
  threshold. See "Measured behaviour" below.

## Dish state machine

```
idle --tap--> cooking --(cookSeconds)--> ready --(11s)--> burnt --tap--> idle
                                           |
                                        tap: serve
                                           v
                                         idle
```

- `idle` is the available state; its button reads PREPARE.
- The design rules doc lists four phases beginning with "prepare". In the prototype
  PREPARE is the button label on the idle state rather than a phase of its own, so
  this implementation has three live states plus idle. This reading is deliberate.
- A burnt card shows WASTED and an ✕ button; it blocks that dish until cleared.

## Serving

Tapping a READY card serves it to the waiting guest with the least patience remaining
who has that dish unserved in their order. One tap, no targeting.

- No matching guest: the card nudges (a short shake) and stays READY. No penalty.
- On a successful serve the card returns to `idle`.
- Score: +10 per item. When a guest's whole order is complete they turn happy and add
  a bonus of `round(20 * patienceRemaining) + 10`.

## Difficulty

One knob scales with the 0.0-1.0 difficulty score:

```ts
export interface ServeGuestsDynamicParams { maxItemsPerGuest: number }

getServeGuestsParams(score) => ({
  maxItemsPerGuest: score < 0.34 ? 1 : score < 0.67 ? 2 : 3,
})
```

Each guest draws an order size uniformly from `1..maxItemsPerGuest`, and draws that
many distinct dishes from the tray.

Everything else stays at prototype values: 8 dishes on the tray, 8 guests, 4 seats,
patience `26 + 9 * itemCount` seconds, cook times 3-6s per dish, 11s ready window.

**Known limitation:** a single three-step knob saturates quickly across the full score
range. If rounds feel flat in play, the next knobs to add are tray size (4-8 dishes)
and patience/burn window. Deliberately out of scope for this version.

## Metrics and performance ratio

`LevelResult.metrics`:

| key | meaning |
|---|---|
| `itemsServed` | dishes successfully handed to guests |
| `itemsRequested` | total dishes asked for across all eight guests |
| `guestsFullyServed` | guests whose whole order was completed |
| `dishesBurnt` | cards that reached `burnt` |
| `walkouts` | guests who left unserved |
| `score` | in-game points |

`GameShell.computePerformanceRatio`:

```ts
if (gameId === 'serve-guests') {
  const serveRatio = itemsServed / Math.max(1, itemsRequested);
  const wastePenalty = Math.min(0.3, dishesBurnt * 0.05);
  return Math.max(0, Math.min(1, serveRatio - wastePenalty));
}
```

Items rather than guests, so the ratio is granular enough to move the difficulty score
despite the single knob.

## Architecture

```
src/games/executive/ServeTheGuests/
  index.tsx         view, game loop, completion overlay
  model.ts          pure state: createInitialState / tick / tapDish
  geometry.ts       1920x1080 design-pixel layout constants
  sprites.ts        dish manifest + character-sheet crop maths
  styles.ts         keyframes and palette
  levels.config.ts  vestigial, per house convention
```

The whole board is laid out in a fixed 1920x1080 design-pixel space and scaled to the
viewport with a single `transform: scale()`, matching `TrainYard`'s approach and the
prototype's own 1672x941 stage.

`model.ts` is pure and DOM-free: `tick(state, dt)` and `tapDish(state, index)` both
return a new state. The view holds the live state in a ref, drives a 100ms interval
with `dt` from `performance.now()`, and mirrors into React state for rendering.

## Assets

| asset | source |
|---|---|
| background | `/bg_cook.png` (1920x1080). Its cream rounded panel is the dish tray. |
| dish sprites | 8 PNGs pulled from the Design project into `/cook-assets/dish-*.png` |
| guest faces | `/characters_cook.png` (1254x1254, 5x4 grid). Rows 3-4 are the older adults: a 10-face pool, cropped with CSS `background-position`. |

`ui_cook.png` is the visual target for review, not a shipped asset.

All sprites preload through `useImagesReady` before the first guest spawns, so no
patience clock starts behind an image decode.

## Integration points

- `GameRouter.tsx` - registry entry and a `generateContentForGame` branch.
- `GameShell.tsx` - `computePerformanceRatio` case.
- `dynamicDifficulty.ts` - `ServeGuestsDynamicParams` and `getServeGuestsParams`.
- `HomeScreen.tsx` - tile for `serve-guests`.
- `public/placeholders/games/serve-guests.svg` and `manifest.json`.
- `public/locales/{en,hi,kn}/translation.json` - game name, 8 dish names, HUD labels,
  overlay copy.
- `package.json` - version 1.5.0 (minor: new game).

## Measured behaviour

The model was exercised headlessly with a simulated player throttled to one tap every
N seconds, averaged over five seeds per cell. `perf` is the ratio `GameShell` feeds the
difficulty engine.

| maxItems | tap every | round | items served | walkouts | perf |
|---|---|---|---|---|---|
| 1 | 1.5s | 27.3s | 8.0 / 8.0 | 0.0 | 1.00 |
| 1 | 3s | 46.8s | 7.8 / 8.0 | 0.2 | 0.97 |
| 1 | 5s | 56.8s | 5.8 / 8.0 | 2.2 | 0.72 |
| 1 | 8s | 77.1s | 3.8 / 8.0 | 4.2 | 0.41 |
| 2 | 1.5s | 38.5s | 11.0 / 11.0 | 0.0 | 1.00 |
| 2 | 3s | 60.3s | 9.8 / 11.4 | 1.4 | 0.86 |
| 2 | 5s | 76.9s | 7.8 / 11.4 | 3.4 | 0.68 |
| 2 | 8s | 89.4s | 4.4 / 11.4 | 5.4 | 0.35 |
| 3 | 1.5s | 45.9s | 14.2 / 14.4 | 0.2 | 0.99 |
| 3 | 3s | 73.7s | 12.2 / 14.6 | 2.2 | 0.84 |
| 3 | 5s | 93.5s | 8.8 / 14.8 | 4.8 | 0.57 |
| 3 | 8s | 95.7s | 5.2 / 14.2 | 6.2 | 0.35 |

Two things this settles:

- The performance ratio discriminates properly - it spans 1.00 to 0.35 across plausible
  human tap rates, so the difficulty engine gets real signal rather than a pinned 1.0.
- A brisk player tops out at ~1.00 in every band, including `maxItems: 3`. They will be
  promoted to the top band within a few rounds and then have nowhere further to go. This
  is the single-knob limitation noted above, now confirmed rather than suspected.

## Verification

There is no test suite in this repo. Verification is:

1. `npm run build` completes with no TypeScript or Vite errors.
2. `npm run lint` introduces no new errors (38 pre-existing errors are a known
   baseline and are not touched by this work).
3. Manual smoke test on `npm run dev`: play a full round at each of the three
   difficulty bands, confirm burn-and-clear works, confirm the round completes and
   hands back to `GameShell`, confirm session resume still works, and confirm there
   are no console errors.
