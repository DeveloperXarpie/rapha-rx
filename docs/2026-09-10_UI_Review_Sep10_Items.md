# UI Review - Sep 10 - Items and Resolution

**Date**: 2026-09-10
**Content Type**: Report

Source: `assets-src/sep-10/UI_review (1).pdf` (10 pages; 8 carry annotations).
Supplied assets in the same folder:

- `shopping_list_loading.png` - 1536 x 1024, RGBA - car + SUPERMARKET storefront
- `spotfocus_new_bg.png` - 1003 x 1568, RGB - full Spot Focus splash plate

Shipped in **v1.29.0** on `feat/app-flow-redesign`: the review items landed
first, and the button convergence below followed in the same release.

---

## Resolved

### 1. Free Play - text too small (p2)

`src/screens/FreePlayScreen.tsx`, `src/components/chrome/GameTile.tsx`

- Category headers `MEMORY / ATTENTION / PLANNING`: 14px/700 → **20px/800**, tracking
  eased from `.12em` to `.08em` (a 20px word does not need a small word's tracking).
- Header subtitle: 18px → **21px**.
- Per-tile captions: 15px → **17px**.

### 2. Shopping List - no room for the instruction panel (p3, p5)

`src/games/memory/MarketMemory/geometry.ts`, `index.tsx`

The caption plate's bottom edge landed exactly on the clipboard - 46px of plate in a
46px gap. Both halves of the review's note are one change:

- `CAPTION` is now `{ left: 80, top: 104, width: 640, height: 60, fontSize: 30 }`,
  up from `{ left: 150, top: 104, width: 500 }` at 24px. Centred on the canvas.
- New `CAPTION_CLEARANCE = 24`, and `CLIPBOARD.top` is **derived** from the caption's
  bottom edge (150 → 188) rather than written down. `READY_BTN.top` is derived from the
  clipboard's bottom edge (955 → 993). The panel and the button move down by exactly as
  much as the panel grew, which is what the review asked for, and they cannot drift
  apart again.
- The plate is drawn as a fixed-height flex box, so its height is a fact geometry can
  rely on.
- Four new invariants in `__tests__/geometry.test.ts` hold the stack apart and on the
  board.

### 3. Shopping List - copy (p5)

`mm.caption.shopping`: "Remember & Collect Items" → **"Remember and Collect items"**.
The old string carried a comment saying it had been shortened to fit one line; the
wider plate buys that room back.

### 4. Shopping List - bare retention screen (p4)

`src/games/memory/MarketMemory/Blind.tsx`, `sprites.ts`

"ON THE WAY TO THE SHOP" was a flat navy gradient with a caption and five dots. The
supplied art is trimmed to its bounding box and re-encoded to
`public/shop-assets/ui-travel.webp` (1280 x 823, 206 KB), and now sits above the
caption on a soft radial halo. Added to `PRELOAD`, because it *is* the walk to the
shop - decoding it on arrival would show an empty cover for the first frames.

### 5. PLAY button should match the READY art (p6)

`src/styles/brand.css`, `src/screens/GameTitleScreen.tsx`

`.btn-green-kit` existed already but was an approximation. Every value is now sampled
off `ui-ready.png`:

- rim `#005000..#1B9305`, bright `#60D336` ring just inside it,
- face `#63D22F` → `#23A80E`,
- and the near-white specular band (`#FAFED5`) across the top eighth, which the
  earlier pass was missing entirely. That band is most of what makes the art read as
  moulded plastic rather than a flat green rectangle.

The corner is measured too: the arc leaves the top edge 50px in on a 182px-tall
button, so `KIT_CORNER = 0.27` of the button's height, replacing a hand-computed
`radiusCqh: 2.68` literal. `Rect` now stores percentages as numbers and derives the
radius, so a rect can change height without its corner going stale.

### 6. Spot Focus - splash size issue (p9)

`public/games/splash-spot.webp` replaced with the supplied 1003 x 1568 plate - the
same wide re-cut shape Shopping List and Station Master got in the Sep-9 pass, so the
portrait column stops letterboxing it. `spot-focus` joins `ART_ASPECT`, and its
`PLAY_RECT` moves off the old painted pill (which the new art does not paint) onto
the paved path at `top 70.4%, height 12.2%, left 29%, width 42%` - clear of the bench
and cat to its left and the bicycle to its right.

### 7. Station Master - modal did not match the kit (p7)

`src/games/memory/TrainYard/index.tsx`

The round-end / out-of-hearts card was cream with a gold border and an amber button,
next to an instruction banner that was already the kit's pale plate. It now wears the
same plate, the same navy ink and the same pink brain disc as the banner, with a
`btn-green-kit` action button. Only the heading colour still varies - it is the one
place the card has to say which of the two states it is in before the resident reads
a word.

### 8. Station Master - wrong instruction text (p7, p8)

`ty.caption.encoding` and `ty.caption.dispatch`, in code and in all three locale files:

- encoding: "Learn the station names now - the signs go blank in a moment."
  → **"Remember the colour of each station."**
- dispatch (idle board): "Tap the station this train belongs to."
  → **"Remember the colour of each station."**

The old encoding line was factually wrong about the game: a train is matched to its
station by colour, and the names on the signs are scenery. Per the reviewer's answer,
the city names on the signs stay as they are.

`ty.caption.selected` keeps its per-train question ("Where does the yellow train go?")
- see Open Questions.

### 9. Station Master - highlight too weak (p8)

`src/games/memory/TrainYard/Train.tsx`

- Selected scale 1.08 → **1.22**. There is room: lanes are 140 apart and the ring
  around a scaled train comes to about 110.
- Selection ring 5px → 8px, and it is now three bands - `#7A4E06` outside the amber
  and inside it. Pale yellow on a sunlit green board has almost no contrast either
  side of it, so widening the band alone would not have been enough.
- The selected train carries the amber glow that previously only the nudge had.

---

## Follow-up pass - one green for every primary action (v1.29.0)

Asked after the items above shipped: *are the play and ready buttons on the six games
different from each other?* They were. The title screens rendered from one component and
were nearly consistent; the boards had six unrelated buttons - four greens (the kit, a
bitmap, Garden Keeper's flat `#6BA83C`, Tiffen Time's `#7ed957→#4caf27` gradient) and two
blues, sharing no radius, shadow or height between them.

### The geometry is written down once

`src/styles/kitButton.ts` (new). `.btn-green-kit` paints the button but deliberately sets
no radius and no font-size, because both are fractions of the button's own **height** and
CSS cannot express that. Those two fractions now live in one place, measured off
`ui-ready.png`:

- `KIT_CORNER = 0.27` - the corner arc leaves the top edge 50px in on a 182px button.
- `KIT_LABEL = 0.37` - READY's cap-height is 48px on that same 182 (0.264), which at Baloo
  2 Extra Bold's 0.72em cap-height puts the label at 0.37 of the button. Station Master
  had independently settled on 28/76 and Garden Keeper on 31/84 - both 0.368 - so this is
  a figure the hand-tuning had already found twice.

`kitButton(height)` returns `{ minHeight, borderRadius, fontSize }` from those.

### Title screens

`src/screens/GameTitleScreen.tsx`. The `kitCorner` flag ran the wrong way round: it marked
the splashes that *should* get the kit corner, so any splash nobody remembered to flag got
`.btn-brand`'s 34px pill by accident - which is exactly how Free Me and Garden Keeper ended
up wrong. Five of the six splashes paint no pill, so the flag is now `paintedPill` and
marks the single exception (Tiffen Time). All six are correct, and a seventh game added
tomorrow is correct by default.

### Boards

| Game | Was | Now |
|---|---|---|
| Shopping List | `<img>` of `ui-ready.png` / `ui-done.png` | `.btn-green-kit`, `kitButton(200)` / `kitButton(118)` |
| Station Master | `.btn-green-kit`, radius and size by hand | `kitButton(76)` - same pixels, derived |
| Spot Focus | `.btn-ready` blue-with-gold; Continue on the legacy Tailwind blue | `<Button variant="kit">` for both |
| Garden Keeper | flat `#6BA83C`, 7px bottom edge, radius 20 | `.btn-green-kit`, `kitButton(84)` |
| Tiffen Time | `#7ed957→#4caf27`, radius 999, fixed 380px | `.btn-green-kit`, `kitButton(96)`, still 380px wide |
| Free Me | `<Button>` with no variant → legacy `bg-primary-blue` | `<Button variant="kit">` |

`Button` gains a `kit` variant, so a page-level button can wear the board's green without
each caller reaching for two class names and a radius of its own. It is on the dev gallery
at `/dev/chrome`.

Two consequences worth knowing about:

- **Shopping List's READY and DONE are no longer art.** They gain a focus ring, a press
  that moves, and a label that *can* be translated - but `mm.ready` and `mm.submit` are
  not in `public/locales/{hi,kn}/common.json`, so hi and kn still fall through to the
  English default, exactly as the baked-in art did. No regression, but no win yet either.
  `ui-ready.png` and `ui-done.png` stay on disk as the reference the CSS is sampled from;
  nothing loads them, and `PRELOAD` dropped DONE.
- **Spot Focus's ready slot grew 64px → 74px.** The slot never matched its button: it was
  `h-16` holding an 84px `.btn-ready`, which overhung by 10px top and bottom.

---

## Not a defect on this branch

**Shopping List splash "replace with a wider asset" (p6).** The wide 1003 x 1568 plate
already landed in `6efdb2b`. The reviewer's screenshot shows that art with a
**gold-rimmed** PLAY button, which is `.btn-green`, not the `.btn-green-kit` the same
commit introduced - so the review is reading a build where the kit button is not
taking effect. Worth confirming what the reviewer is looking at: if it is the deployed
site, it is stale; if it is a local build off this branch, then `.btn-green-kit` is
being overridden at runtime and that is a live bug this pass has not found.

---

## Raised, not fixed

- `src/games/memory/TrainYard/index.tsx` is over 650 lines and holds caption logic,
  effects, HUD, board and two modals. It is the file most likely to fight the next
  change.

---

## Open questions

1. **`ty.caption.selected`** - p8's arrow lands on "Where does the yellow train go?",
   which is the caption shown *after* a train is tapped. The suggested replacement has
   been applied to the two states where the resident is being told the task (encoding
   and the idle board), and the per-train question is kept, because at that moment the
   resident is placing a train rather than memorising one. Say the word and it goes.
2. **Verification gap** - `npm test` collects `src/**/__tests__/**/*.test.ts` in the
   node environment, so none of the visual changes above are covered by a test. Every
   item needs eyes on it.
3. **The secondary buttons are still six different things**, and the convergence pass did
   not touch them: Station Master's RESET is a cream-and-gold panel, Free Me's Start over
   and Show me are outlined blue `variant="secondary"`, Shopping List's HINT is a sliced
   sprite. Same defect one level down; worth deciding whether the kit has a secondary.
4. **`.btn-ready` still dresses seven Free Play games** - Focus Filter, Garden Planner,
   Garden Sequencer, Morning Routine Quest, Remember Match, Shopping List Recall. The six
   marquee games no longer use it, so the blue-with-gold pill is now a Free-Play-only
   style. Either it converges too or it is deliberate; right now it is neither.
