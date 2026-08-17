# Garden Keeper - spec amendment: wilted flowers as distractors

Date: 2026-08-17
Status: approved
Amends: `docs/superpowers/specs/2026-08-12-garden-keeper-design.md`
Affects: `docs/superpowers/plans/2026-08-12-garden-keeper.md`, principally Task 4

## Why

Real artwork arrived after the spec and plan were written, in
`assets-src/Garden_Asets/` (`Plant_assets.png`, `UI_assets.png`,
`garden_background_03.png`). The decision is to use it rather than the CSS-drawn
artwork the plan specifies.

The plant sheet does not contain the game the spec describes. It is a 5 x 6 grid holding:

| Rows | Contents |
|---|---|
| 1-2 | One sprout and nine seeds |
| 3-4 | Ten flowers in bloom: rose, sunflower, lily, hydrangea, daisy, marigold, hibiscus, aster, daffodil, peony |
| 5-6 | The same ten flowers, wilted |

There are **no weeds, insects or toadstools**, which the original mechanic requires as the
things the player must not tap. The UI sheet reinforces a different framing: its caption
reads "Water the blooming flowers! Don't let them die."

Rather than drop the inhibition demand - which is what makes this an attention game rather
than a reaction game - the distractor role moves onto art that exists.

## The change

**Distractors are wilted flowers.** The player waters blooming flowers and must not water
flowers that have already wilted.

This preserves every structural property the original design depended on:

- A target/non-target discrimination the player must make before each tap
- A heart cost for tapping a non-target, so inhibition carries real stakes
- A distractor pool large enough to vary: ten wilted flowers, one per species
- Perceptual similarity between target and distractor, which is what loads attention. A
  wilted rose and a blooming rose share silhouette, position and colour family, and differ
  in exactly the dimension the player must attend to.

It arguably reads better for this population than the original: "water the healthy flower,
leave the dead one" needs no explanation, whereas "do not water the toadstool" does.

## What this supersedes in the original spec

| Original spec | Replaced by |
|---|---|
| Distractor pool `[weedA, weedB, weedA, bee, ladybird, snail, caterpillar, mushroom, carnivore]` (section on distractor allocation) | The wilted sprite of any species, drawn freely (see note below) |
| `falseTaps` described as "taps on a weed, insect or toadstool" | Taps on a wilted flower |
| Sprite size `base = 82` for insects, `96` for everything else | Uniform `base = 96`; there are no insects |
| Idle motion for insects, looping per instance | Removed. Wilted flowers do not move. |
| Legend row `gk.legend.avoid` - "Never water weeds, bugs or toadstools" | "Leave the wilted flowers alone" |
| Distractor filter `saturate(0.62) brightness(1 - recede)` | Removed. The wilted art is already desaturated; a second desaturation would flatten it. Recede haze still applies. |
| CSS-drawn plant artwork as a pure `art()` function returning style strings | Raster sprites from `public/garden-assets/`, catalogued in `sprites.ts` |

### Species are drawn freely for both kinds

An earlier draft of this amendment said a distractor uses "a species not currently used as
a target". That is unworkable: at the top of the curve a bed holds 11 blooms and 13 wilted
plants, and there are only ten species, so disjoint sets cannot exist.

Species are therefore drawn independently for both kinds, and the same species may appear
bloomed in one spot and wilted in another. This is the better design anyway - a wilted rose
beside a blooming rose is the hardest useful discrimination, and it is exactly the one the
mechanic is asking the player to make.

Everything else in the original spec stands unchanged: the bed layout, the countdown ring,
the thirst cycle, the heart economy, the difficulty axes and their curves, the round
structure, and the three timing warnings.

## Assets

`scripts/slice_garden_assets.py` cuts the sheet into 30 sprites in `public/garden-assets/`,
named `<species>-bloom.png`, `<species>-wilted.png`, `sprout.png` and `seed-*.png`.

The columns separate cleanly on an alpha projection but the rows do not: the blooms overlap
the bands above and below, so an even 1024/6 pitch clips them top and bottom. Each row
boundary is placed at the thinnest point of its column's own opacity profile, which puts the
real boundaries at roughly 149/295/483/661/835. Re-derive with `--measure` if the sheet is
ever redrawn.

Only `<species>-bloom` and `<species>-wilted` are used by the game today. The sprout and
seeds are sliced anyway so that a later change to the growth stages does not need the sheet
again.

`UI_assets.png` and `garden_background_03.png` are not yet sliced. The board furniture stays
CSS for now, as in the original spec, and swapping it is a separate piece of work.

## Consequences for the plan

- **Task 4 is rewritten.** It becomes a raster sprite catalogue plus a preload hook, not a
  CSS `art()` function. Its unit tests change from asserting on generated style strings to
  asserting that every catalogue entry resolves to a file that exists and that every species
  has both states.
- **Task 2** keeps its bed geometry, but the distractor allocation draws from the wilted
  pool.
- **Task 5** loses the weed/insect/toadstool legend keys and gains a wilted-flower one.
- **Task 6** drops the insect idle-motion branch.
- **Task 9** bumps to `1.7.0`, not `1.6.0`: Market Memory took `1.6.0` in commit `6e38dbb`.
