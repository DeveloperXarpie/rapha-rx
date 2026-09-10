# Garden Keeper - weeds, insects and toadstools restored

**Date**: 2026-09-10
**Content Type**: Documentation

Partially reverses `docs/superpowers/specs/2026-08-17-garden-keeper-amendment.md`.
Source of the restored design: the Garden Keeper design handoff bundle
(`design_handoff_garden_keeper/` - `README.md`, `garden-keeper.html`,
`garden-keeper-src.dc.html`). That bundle is **not in the repo**: `.gitignore` excludes
`design_handoff_*/` as handoff scratch. Everything this change depends on has been
carried into code and into this document.

## Why

The bed held one distractor type - a wilted flower - and played monotonously. The original
handoff specified three more families, and the amendment dropped them for one reason only:
the delivered plant sheet (`assets-src/Garden_Asets/Plant_assets.png`) is a 5 x 6 grid of
one sprout, nine seeds, ten blooms and ten wilted blooms, and contains no bug, weed or
toadstool. That was an art constraint, never a design judgement.

## What changed

Distractor slots now split between wilted flowers and the handoff's pest pool.
`distractorRatio` is **untouched**, so the same number of tap hazards stands on the bed as
before - they are simply no longer all the same thing.

| Difficulty | Plants | Hazards | Wilted | Pests |
|---|---|---|---|---|
| 0.0 | 12 | 3 | 2 | 1 |
| 0.35 (default) | 16 | 6 | 3 | 3 |
| 1.0 | 24 | 13 | 7 | 6 |

Wilted keeps the larger half on an odd count, and a test holds that. The
bloom-versus-wilted discrimination is the spine of the round - a wilted rose beside a
blooming rose differs in exactly the dimension the player must attend to - and the pests
are variety on top of it rather than a replacement for it. That much of the amendment's
argument still stands.

Restored from the handoff:

- **The pool**, in its original order and multiplicity:
  `[weedA, weedB, weedA, bee, ladybird, snail, caterpillar, mushroom, carnivore]`.
  `weedA` appears twice, so weeds stay the commonest pest and the bed does not read as an
  insect farm. Shuffled per bed and drawn cyclically, so four pest slots get four
  different pests.
- **The second base size.** Insects draw off 82px against everything else's 96. Tap
  targets do not follow it down; `hitSize` still holds the floor at 96.
- **Insect idle motion.** `gk-flutter` for the bee, `gk-crawl-a`/`gk-crawl-b` 50/50 for the
  others, duration `random(5200, 8400)` ms and delay `random(0, 2600)` ms rolled per
  instance so the bed does not twitch in lockstep. Suppressed entirely under reduced
  motion. Weeds and toadstools are rooted.
- **The full saturation knock-down** on hazards, `saturate(0.62)`. It matters more for the
  pests than it did for wilted art: flat CSS colour would otherwise out-shout the painted
  flowers, and a hazard that draws the eye harder than the target inverts the task.

Tapping any of them costs a heart, exactly as tapping a wilted flower already did. No new
scoring path: the tap handler's condition widened from `kind === 'wilted'` to
`kind !== 'flower'`, and pests get no cycle, so they can never be watered.

The intro card stays at four rows. Row four's figure is now a drawn toadstool and its copy
covers both hazards - *"Never water wilted flowers, weeds or bugs"* - in en, hi and kn. A
fifth row risked overflowing the card on a phone, and the wilted flower is already shown
one row above as the `dried` stage.

## The art, and how to replace it

**The pests are CSS primitives**, ported from the prototype's drawing code at
`garden-keeper-src.dc.html:210-256` in that untracked bundle.
They will read flatter than the painted flowers beside them.
That is the known and accepted cost of having them at all before art exists.

The cost is contained to one file. `src/games/attention/GardenKeeper/pests.ts` is the
entire swap surface - nothing else in the game knows how a pest is drawn.

**To swap in raster art:**

1. Add the eight sprites to `public/garden-assets/` as `<species>.png`: `weedA`, `weedB`,
   `bee`, `ladybird`, `snail`, `caterpillar`, `mushroom`, `carnivore`.
2. Replace `pestLayers()` with a URL lookup, and render an `<img>` in the pest branch of
   `PlantView` the way the flower branch already does.
3. Delete `pests.test.ts`, whose assertions are all about the drawing.

Nothing in `geometry.ts`, `model.ts` or the round logic changes: `Plant`'s pest variant
already carries only `kind`, `species` and the idle loop.

`scripts/slice_garden_assets.py` gets **no** entries for these. It slices a specific 5 x 6
grid whose every cell is accounted for; the pests are not in that sheet and would have to
arrive as their own files or their own sheet with its own script.

Art requirements, if it is commissioned:

- Anchored at the base, drawn upward - the bed positions every object at its foot.
- Legible at 82px on a tablet and at 58px in the intro legend, from one file.
- Visibly *not* a flower at a glance, since the whole demand is a go/no-go discrimination.

## Known consequence

The round is **harder at every difficulty** than it was yesterday. The hazard count has not
moved, but hazards that move and catch peripheral vision are more tempting than static
wilted flowers, so false taps should rise. The difficulty curve was deliberately not
retuned in this pass - retuning against a guess would be worse than retuning against
observed play.
