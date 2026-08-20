# Spot Focus - art and design rework - design spec

Date: 2026-08-20
Status: draft, awaiting review
Source art: `assets-src/spot-focus/`
Reference mockup: `assets-src/spot-focus/-abs.png`

## 1. What changes and why

Spot Focus currently draws emoji into a Tailwind grid.
Every object is a glyph, every surface is a utility class, and there is no separation
between the screen's furniture and its content.

It now runs on a commissioned raster art set and the screen is rebuilt against the
reference mockup: a sky and meadow backdrop, a wooden signboard header, blue framed
panels around each grid, white cards, and a pink treatment on found differences.

The mechanic is unchanged.
Tap a cell on the right grid, find the differences, and the round scores on false taps.
One thing that is not merely cosmetic comes with the art, and it is the largest win
here: `changeSubtlety` becomes real.

### 1.1 `changeSubtlety` is currently dead config

`getSpotFocusParams` has always returned a `changeSubtlety` of `bold`, `medium` or
`subtle` derived from the difficulty score.
`generateSpotFocusContent` never reads it.
A resident at score 0.9 gets exactly the same class of difference as one at score 0.1,
and only the count moves.

Emoji are the reason.
There is no subtle difference available between two glyphs: a tomato is a tomato or it
is an orange, and nothing sits between them.
Illustrated art has that middle ground, so the parameter can finally drive what it was
written to drive.

| Subtlety | Definition | Example | Extra art needed |
|---|---|---|---|
| `bold` | The object is replaced by a different object | teapot to rubber duck | none, any two pool objects do it |
| `medium` | Same object, different kind | green apple to orange | one variant sprite |
| `subtle` | Same object, one detail changed | blue teapot with daisies to the same teapot plain | one variant sprite |

This makes the game genuinely harder at high difficulty scores in a way it has never
been.
That is correct, and it is called out here because it is a behaviour change riding
along with an art change.

## 2. Target

| | |
|---|---|
| Game id | `spot-focus` |
| Category | `attention` |
| Directory | `src/games/attention/SpotFocus/` |
| Art source | `assets-src/spot-focus/` |
| Art output | `public/spot-assets/` |
| Generator | `src/lib/contentGenerators/spotFocus.ts` |

Unchanged: the three phases, the metrics contract, and the `spot-focus` case in
`computePerformanceRatio`, which reads `falseTaps` only.

## 3. Art to be supplied

Two new files in `assets-src/spot-focus/`.
The existing `ui_base.png`, `ui_solved.png` and `-abs.png` stay as reference and are
not sliced for items.

### 3.1 `items.png` - the object sheet

- Alpha-cut PNG, transparent background.
- Objects roughly 512 px on the long side.
- Loosely scattered with clear gaps between objects, in the shape of
  `assets-src/ShoppingList/items-2.png`.
- Consistent lighting and a consistent three-quarter viewing angle across the whole
  sheet, because two objects sit side by side in one grid and a mismatch reads as a
  difference that is not one.
- No cast shadows baked onto a ground plane.
  The cards are white and flat; a baked shadow will look wrong on the pink found state.

**48 sprites: 16 base objects, each with one medium and one subtle variant.**

The theme is domestic, matching the mockup, and leans Indian where the object allows.
The app's existing content banks are Indian domestic (tulsi, pressure cooker, sambar
masala) and the residents are in Indian care homes, so a purely Western kitchen would
be a step backwards from what is already there.

| # | Base object | Medium variant | Subtle variant |
|---|---|---|---|
| 1 | Blue enamel teapot with daisy pattern | Steel teapot | Same blue teapot, no daisies |
| 2 | Tomato with green crown | Red apple | Tomato with the crown removed |
| 3 | Galvanised metal watering can | Green plastic watering can | Same can, plain spout instead of a rose spout |
| 4 | Yellow rubber duck | Yellow toy elephant | Duck with a blue wing patch |
| 5 | Red oven mitt with white polka dots | Blue striped oven mitt | Same red mitt, plain, no dots |
| 6 | Honey jar, glass, cloth lid tied with string | Red jam jar with a paper label | Same honey jar, no cloth tie |
| 7 | Glass cookie jar with a wooden lid, full | Glass jar of pink sweets | Same cookie jar, half full |
| 8 | Green apple with a leaf | Orange | Green apple, no leaf |
| 9 | Wicker laundry basket with white cloth | Wicker basket with folded towels | Darker wicker, same white cloth |
| 10 | Five red roses in a white jug | Five sunflowers in a white jug | Three red roses in the same jug |
| 11 | Stack of three books, blue on red on green | Stack of folded towels | Same stack, top book yellow |
| 12 | Blue dustpan and brush | Red dustpan and brush | Same blue dustpan, brush bristles orange |
| 13 | Three-tier steel tiffin box | Round steel dabba | Two-tier steel tiffin box |
| 14 | Brass lota water pot | Steel tumbler | Same lota, engraved band around the middle |
| 15 | Round wall clock, white face, reading 10:10 | Table alarm clock with bells | Same wall clock reading 3:00 |
| 16 | Table lamp with a yellow shade | Standing floor lamp | Same lamp, cream shade |

Every base object carries both variants.
An earlier draft asked for subtle variants on only half the pool, which would have made
the generator's fallback fire routinely at high difficulty scores - the exact case the
subtle tier exists to serve.
If a subtle variant reads too weakly once drawn, it is dropped from `items.ts` and the
generator falls back as described in section 5.2; the pool degrades gracefully rather
than being authored short from the start.

### 3.2 `backdrop.png` - the scene plate

The sky, clouds, tree canopy at the top corners, meadow and stone path from the
mockup, **with no UI painted on it**.
No signboard, no title text, no pills, no panels, no cards.

Portrait, at least 1400 px tall, and safe to crop horizontally: the game renders on
tablets in both orientations, so nothing load-bearing should sit near the left or right
edge.

Re-encoded to JPEG by the slicing script, as `bg-home.png` and `bg-store.png` were for
Market Memory.
A painterly opaque plate is roughly 200 KB as JPEG against 2 MB as PNG.

### 3.3 Sliced from the mockup, not commissioned

The wooden signboard is large and clean enough in `-abs.png` to slice directly:
roughly 570 x 165 px at `(200, 175)` to `(770, 340)`.
It is cut with its daisy and leaf ornaments, and the title text is **not** part of the
sprite - the plate is cut empty and the translated heading is drawn over it, because
the heading exists in `en`, `hi` and `kn`.

## 4. Asset pipeline

New `scripts/slice_spot_focus_assets.py`, following `scripts/slice_shopping_assets.py`.

It writes to `public/spot-assets/` and prints every crop box it uses, so the geometry
constants in section 6 are derived from the image and never eyeballed.

| Job | Source | Output |
|---|---|---|
| Object sprites, by connected component | `items.png` | `item-<slug>.png`, 48 files |
| Backdrop, re-encoded | `backdrop.png` | `bg-scene.jpg` |
| Signboard, by measured crop box | `-abs.png` | `ui-signboard.png` |
| Manifest | all | `manifest.json` |

Connected-component labelling rather than a grid, because the sheet is scattered rather
than ruled.
Small fragments are merged into the nearest large component, so the daisy on the teapot
or the string on the honey jar does not become its own sprite.

Until `items.png` and `backdrop.png` arrive, the script slices stand-in objects out of
`-abs.png` at the card boxes measured in section 6 and re-encodes the mockup itself as
the backdrop.
The stand-ins are named with the same slugs as the real sprites, so the real sheet drops
in with no code change.
The script prints a loud warning when it is running in stand-in mode.

## 5. Content model

### 5.1 `items.ts`

New file, `src/games/attention/SpotFocus/items.ts`.
The catalogue that grows when more art is drawn.

```ts
export type Subtlety = 'bold' | 'medium' | 'subtle';

export interface Variant {
  slug: string;        // sprite file, item-<slug>.png
  labelKey: string;    // i18n key, with an English fallback at the call site
  subtlety: 'medium' | 'subtle';
}

export interface SpotItem {
  id: string;
  slug: string;
  labelKey: string;
  variants: Variant[];
}
```

`bold` is not stored on an item.
A bold difference is any other item in the pool, so it is derived at generation time
rather than authored, and no table can drift out of step with the sprite list.

### 5.2 Generator

`generateSpotFocusContent` is rewritten around the catalogue.

1. Draw `gridRows * gridCols` distinct items from the pool for the original grid.
2. Choose `differenceCount` of those cells to alter.
3. For each, build a difference at the requested `changeSubtlety`.

**Subtlety fallback.**
If the requested tier has no variant for a chosen cell, fall back one tier towards
bolder (`subtle` to `medium` to `bold`) rather than returning fewer differences than
asked.
The count is what the resident is told to find, so the count is the promise that must
hold; the class of difference is the thing that degrades.
A round that resolves entirely by fallback is a signal the art pool is too thin, so the
generator returns a `fallbacksUsed` count and a test asserts it stays at zero for every
grid size and subtlety the difficulty engine can request.

**No accidental duplicates.**
A bold swap draws its replacement from items *not already visible in either grid*.
Without that guard a bold swap can put a second teapot on the board, and a resident who
spots two teapots has found a real difference that the game does not credit.

## 6. Geometry and palette

Measured from `-abs.png`, 941 x 1672.

| Element | Measurement |
|---|---|
| Card | 130 x 171 px, 3 columns per panel |
| Card column pitch | 143 px |
| Card row pitch | 183 px |
| Card rows | 4 in the mockup, 3 at runtime |
| Left panel cards | x 35, 178, 320 |
| Right panel cards | x 494, 637, 780 |
| Signboard | 570 x 165 at (200, 175) |

The mockup draws a 4 x 3 grid.
`getSpotFocusParams` returns `gridRows: 3` and `gridCols: 3` or `4`, so the runtime grid
is 3 rows of 3 or 4 columns.
The layout is driven by the params, not by the mockup, and the card pitch above is the
target size at the 4-column setting on a 1024 px tablet.

Palette, sampled from the mockup rather than eyeballed:

| Token | Value |
|---|---|
| `skyTop` | `#149dfd` |
| `skyMid` | `#5ec1fb` |
| `panelFrame` | `#3c52a4` |
| `cardFill` | `#ffffff` |
| `foundFill` | `#f08c89` |
| `pillFill` | `#bee6fe` |
| `pillText` | `#0e4795` |
| `ribbonBlue` | `#034eb4` |
| `ribbonRed` | `#b20604` |
| `signWood` | `#fbc161` |
| `signFrame` | `#f2a242` |

These live in `src/games/attention/SpotFocus/palette.ts`, following
`GardenKeeper/palette.ts` and `MarketMemory/palette.ts`.

## 7. Screen

Three phases, unchanged in structure.

**`scene_intro`** - backdrop, signboard with the heading, the two-line instruction, both
grids drawn but inert, and an "I'm Ready" button occupying the position the found pill
will take.

**`find_differences`** - identical layout, the button replaced by the `5 / 6 Found`
pill, the right grid live.
Keeping the two phases means the layout does not move between them, so the screen does
not jump under a resident who is mid-look.

**`completion`** - unchanged in content.

### 7.1 Found state

The mockup fills a found card pink and gives it a pink border.

Implemented as a `foundFill` overlay in `mix-blend-mode: multiply` over the card.
The card beneath is white and the object sits on it, so multiply turns the card pink and
leaves the object's own colours untouched, which is exactly what is drawn.
Tinting the sprite directly would wash the object out.

**Plus a tick badge in the corner of the card.**
The mockup carries the found state on colour alone, which fails for a colour-blind
resident, and this app has an accessibility bar it is not worth quietly dropping.
The badge is small and sits clear of the object.

Reduced motion is respected through the existing `useReducedMotion` hook: the card's
pink fill appears without its scale-in.

## 8. Testing

| Test | What it protects |
|---|---|
| `__tests__/sprites.test.ts` | Every catalogue entry and variant resolves to a file that exists in `public/spot-assets/`, enumerated with `import.meta.glob`. Catches a rename in the slicing script silently leaving broken images on the board. |
| `__tests__/items.test.ts` | No duplicate slugs; every item carries both a `medium` and a `subtle` variant, so the generator never has to fall back on a full art set. |
| `contentGenerators/__tests__/spotFocus.test.ts` | Grid dimensions match the params; `differenceCount` differences are always produced; `fallbacksUsed` is zero across every grid size and subtlety `getSpotFocusParams` can return; no item appears twice in a grid; a bold swap never introduces an object already on the board. |

Following the MarketMemory precedent, `sprites.test.ts` enumerates disk with Vite's glob
rather than `node:fs`, because `tsconfig.app.json` restricts ambient types to
`vite/client` on purpose.

## 9. Out of scope

- `focus-filter` and `word-search`, the other two attention games, are untouched.
- The `spot-focus` performance ratio in `GameShell.tsx` is untouched.
  It reads `falseTaps` only, and that metric survives the rewrite unchanged.
- Grid sizes and difference counts in `getSpotFocusParams` are untouched.
  Only the previously ignored `changeSubtlety` starts being read.

## 10. Sequencing

The pipeline, catalogue, generator, palette and the whole screen are built first,
against stand-in sprites cut from `-abs.png`.
When `items.png` and `backdrop.png` land, the script is rerun and the real art drops in
with no layout work.
