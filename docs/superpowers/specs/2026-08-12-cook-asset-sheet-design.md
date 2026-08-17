# Serve the Guests: painted asset sheet

Date: 2026-08-12
Status: approved, implementing

## Problem

Serve the Guests currently draws its chrome - order bubbles, patience bars, cook bars, the
score capsule, the burnt-dish clear button - in CSS, while its dishes come from a set of
eight PNGs inherited from the design prototype.

That dish set is not coherent. `dish-idly-fresh.png` was never matted and carries an opaque
cream rectangle. `dish-plain-dosa.png` is bleached almost to white. Some dishes sit on a
banana leaf and some do not. Against that, the flat CSS chrome reads as placeholder work.

`public/Dar_assets_01.png` is a 1542x1000 sheet supplying a complete replacement: sixteen
dishes and thirteen UI pieces, all cleanly matted with soft drop shadows.

## What is on the sheet

Two blocks, separated by a transparent band at y 365-381.

**Top block** - sixteen dishes in two rows of eight. The left eight are fresh and map one to
one onto the existing dish IDs, in order: plain-dosa, masala-dosa, idly, vada, chutney,
sambar, combo, coffee. The right eight are mouldy counterparts of the same eight, in the
same order.

**Bottom block** - a red clear button, two speech bubbles, a banana leaf, a small steel bowl,
a large steel bowl, a tumbler, a score capsule, a gold coin, a bar track, a green bar fill,
a large panel, and two worked examples of an assembled order bubble. The worked examples are
reference only; the large panel is their clean equivalent.

## Decisions

### Slicing is a committed script, not a manual act

`scripts/slice_cook_assets.py` holds the bounding-box table and writes to
`public/cook-assets/`. If the sheet is redrawn the slice is one command, not an afternoon of
cropping. The table is the measured alpha bounding box of each piece.

### The fresh eight replace the current eight

Same filenames, same dish IDs, so nothing downstream changes. The old set's inconsistency is
the reason; keeping both would leave the bad art one import away from coming back.

### Burnt cross-fades into the mouldy art

The model already has a `burnt` state, faked with `sepia(.7) saturate(.6) brightness(.55)`.
That filter goes. Instead the card stacks the fresh and spoiled images and cross-fades
between them over the last seconds of the READY window, so a dish visibly spoils while the
player still has time to save it. `spoilProgress` in the model derives this from `dish.since`
and `READY_WINDOW`; it is 1 once the dish is actually burnt.

`useReducedMotion` snaps between the two rather than fading.

Idle and cooking keep their existing fade-and-saturate treatment. Those read as progress on
one object; swapping the art would read as a different object.

### Frames stretch by 9-slice

Every frame is drawn with `border-image` so corners and the painted bevel stay crisp at any
size. Insets live in the `sprites.ts` manifest beside each `src`, never in JSX.

All three bubble frames carry a tail at the bottom-left. Setting the bottom and left insets
wide enough to swallow the tail puts it entirely inside the bottom-left corner tile, which
`border-image` never stretches or repeats - so no separate tail sprite is needed.

### Bars are sized, not clipped

Track and fill are 3-slice pills: left cap, stretched middle, right cap, with zero vertical
inset since their height is fixed. The fill's width is set to the percentage rather than the
fill being clipped by a wrapper, so both end caps stay round at every value. Below the width
of the two caps the fill is hidden outright.

The patience bar needs amber and red and the art is only green, so the low states apply
`hue-rotate` to the green fill. That keeps one asset and preserves the painted bevel.

`COOK_BAR_H` rises from 12 to 20. The bar art is 53px tall natively and its bevel is
unreadable at 12; the card has the room.

### The score capsule is repainted before it ships

The capsule art has a gold coin and the literal text `000` painted into it, so it cannot show
a live score. The slicing script repaints the interior: for each row it samples the cream at
a clean column between the coin and the text and paints that colour across the interior. The
interior gradient is purely vertical, so this is exact rather than approximate.

The game then 9-slices the clean frame and composes the separate `ui-coin.png` and live text
on top.

## Output

| File | Source rect | Notes |
| --- | --- | --- |
| `dish-<id>.png` x8 | top block, left | replaces existing |
| `dish-<id>-spoiled.png` x8 | top block, right | new |
| `ui-btn-clear.png` | 56,392 116x122 | |
| `ui-bubble-sm.png` | 359,382 162x128 | 9-slice |
| `ui-bubble-md.png` | 555,383 164x131 | 9-slice |
| `ui-panel.png` | 1168,563 194x200 | 9-slice, order bubble |
| `ui-capsule.png` | 68,550 240x103 | 9-slice, interior repainted |
| `ui-bar-track.png` | 790,591 332x53 | 3-slice |
| `ui-bar-fill.png` | 793,662 326x47 | 3-slice |
| `ui-coin.png` | 631,555 122x123 | |
| `prop-leaf.png` | 745,389 201x131 | sliced, unwired |
| `prop-bowl-sm.png` | 974,394 156x128 | sliced, unwired |
| `prop-bowl-lg.png` | 1167,399 179x122 | sliced, unwired |
| `prop-tumbler.png` | 1398,391 92x130 | sliced, unwired |

The four props are empty vessels with no consumer today. They are sliced because they are
part of the delivered sheet, and marked unwired in the manifest so nobody hunts for a usage.

## Out of scope

The two worked order-bubble examples on the sheet. The background plate and character sheet,
which are unchanged.
