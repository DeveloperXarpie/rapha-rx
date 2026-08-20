# Spot Focus - art and design rework - design spec

Date: 2026-08-20
Status: approved; revised 2026-08-20 for the delivered art set
Source art: `assets-src/Spot_Focus_Assets/`
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

## 3. Art supplied

Delivered in `assets-src/Spot_Focus_Assets/`.
No art needs commissioning; this section records what arrived and what is usable.

| File | Size | What it is |
|---|---|---|
| `items_01.png` | 1254 x 1254 RGBA | 10 x 10 atlas, 100 objects, cells of 125.4 px |
| `items_02.png` | 1254 x 1254 RGBA | 10 x 10 atlas, 100 objects, cells of 125.4 px |
| `spot_focus_bg.png` | 941 x 1672 RGB | The scene plate, clean of UI |
| `spot_focus_UI.png` | 1024 x 1024 RGBA | UI kit |
| `items_0*_100_items.docx` | - | The object names, in atlas order |

`__MACOSX/` is archive residue and is not committed.

### 3.1 The atlases

Both are exact 10 x 10 grids with every cell occupied, verified by counting alpha mass
per cell.

Slicing is **per grid cell, then trimmed to the alpha bounding box within that cell**,
not by connected component.
Atlas 1 yields exactly 100 components, but atlas 2 yields 107 for its 100 objects: at
least one object separates into pieces under alpha labelling.
Cell cropping merges those correctly, which is the same conclusion
`slice_shopping_assets.py` reached about the halved onion.

### 3.2 The names

Unlike `ShoppingList_items.docx`, these two lists are accurate: rows 1 to 3 of atlas 1
were checked against the rendered sheet name by name and match left-to-right,
top-to-bottom.
They are still transcribed into the slicing script rather than parsed from the `.docx`,
so the ids are reviewable in a diff.

**Atlas 1 lists "Globe" twice**, at positions 54 and 97, and the two cells are the same
object.
An identical pair is unusable as a difference: a resident told to find six differences
would be hunting one that cannot be seen.
Position 97 is dropped from the catalogue, leaving 199 usable objects.
The slicing script still cuts it, so the file count matches the atlas; only `items.ts`
omits it.

### 3.3 The UI kit is mostly unusable, and that is fine

`spot_focus_UI.png` carries English text baked into the art: the signboard reads "Can
you spot the Differences?", the ribbons read "Original" and "Find Differences Here", and
the instruction line is painted as pixels.
This app ships `en`, `hi` and `kn`.
Shipping a Kannada session with an English signboard is not acceptable, and there is no
clean plate underneath the text to slice.

So the kit is used as a **colour and shape reference**, not as sprites, following the
precedent set for Market Memory's HINT tile and cart tray: art with baked-in dynamic
content gets rebuilt in CSS from the kit's own palette.

| Piece | Treatment |
|---|---|
| Signboard plank | CSS: wood gradient, rounded frame, from `signWood` and `signFrame` |
| Daisy and leaf ornaments | **Sliced** - they carry no text, and CSS cannot draw them |
| Blue "Original" ribbon | CSS from `ribbonBlue` |
| Red "Find Differences Here" ribbon | CSS from `ribbonRed` |
| Instruction line | Live text, already in the locale files |
| White item card | CSS: white fill, radius, soft shadow |
| Blue grid panel | CSS from `panelFrame` |
| "Level 1" pill and X button | Neither is ours; `GameShell` already draws both |

Rebuilding these in CSS is not a compromise.
They are flat rounded rectangles with text.
CSS renders them crisply at any size and in any language, where a sprite would blur when
scaled and would be wrong in two of the three languages.

## 4. Asset pipeline

New `scripts/slice_spot_focus_assets.py`, following `scripts/slice_shopping_assets.py`.

It writes to `public/spot-assets/` and prints every crop box it uses, so the geometry
constants in section 6 are derived from the image and never eyeballed.

| Job | Source | Output |
|---|---|---|
| Object sprites, per grid cell, alpha-trimmed | `items_01.png`, `items_02.png` | `item-<slug>.png`, 200 files |
| Backdrop, re-encoded to JPEG at quality 88 | `spot_focus_bg.png` | `bg-scene.jpg` |
| Signboard ornaments, by measured crop box | `spot_focus_UI.png` | `ui-sprig-left.png`, `ui-sprig-right.png` |
| Manifest of slug to source cell to crop box | all | `manifest.json` |

No stand-in mode is needed; the real art is here.

Sprites are written at their trimmed size, roughly 110 px on the long edge.
A card renders at about 130 px on a 1024 px tablet, so this is close to a 1:1 draw and
comfortably inside a 2x device pixel ratio.

## 5. Content model

### 5.1 `items.ts`

New file, `src/games/attention/SpotFocus/items.ts`.

```ts
export type Subtlety = 'bold' | 'medium' | 'subtle';

export interface SpotItem {
  id: string;          // stable, kebab-case, also the sprite slug
  labelKey: string;    // `spot-focus.item.<id>`
  family: string;      // objects that read as the same kind of thing
  twin?: string;       // id of a near-identical partner, if one exists
}
```

The three subtlety tiers fall out of `family` and `twin` rather than out of extra art.
This is the whole reason 200 objects is a better delivery than the 48 sprites an earlier
draft of this spec asked for.

| Tier | How a difference is built | Example |
|---|---|---|
| `subtle` | Swap the item for its `twin` | red alarm clock to green alarm clock |
| `medium` | Swap for another member of the same `family` that is not its twin | blue teapot to red kettle |
| `bold` | Swap for an item from a different `family` | teapot to rubber duck |

`twin` is symmetric and authored on both members of a pair.
A test asserts that symmetry, because a one-sided twin silently halves the subtle pool.

Families are authored rather than derived from the names.
"Red kettle", "Blue teapot" and "Coffee carafe" share no words but are one family.

### 5.2 Generator

`generateSpotFocusContent` is rewritten around the catalogue.

The order matters, and it is the opposite of the current implementation.
Today the grid is filled first and differences are chosen from whatever landed, which is
precisely why a subtlety tier could never be honoured: by the time the tier is consulted
the cells are already committed.

1. Read `changeSubtlety` and `differenceCount` from the params.
2. Pick `differenceCount` items that **can support** a difference at that tier: items
   with a `twin` for `subtle`, items whose `family` has another member for `medium`, any
   item for `bold`.
3. Fill the remaining cells from items that are not in the same family as any chosen
   difference item, so a family never appears twice on the board.
4. Shuffle the cell positions.
5. Build the modified grid by applying each swap.

**Subtlety fallback.**
If step 2 cannot find enough items at the requested tier, fall back one tier towards
bolder (`subtle` to `medium` to `bold`) rather than returning fewer differences than
asked.
The count is what the resident is told to find, so the count is the promise that has to
hold; the class of difference is what degrades.
The generator returns a `fallbacksUsed` count, and a test asserts it stays at zero for
every grid size and subtlety `getSpotFocusParams` can request.

**No accidental duplicates.**
Step 3's family exclusion is what stops a bold swap putting a second teapot on the
board.
A resident who spots two teapots has found a real difference that the game does not
credit, which is worse than a round being slightly easier.

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
| Signboard sprigs | 110 x 134 each, at (18, 196) and (498, 196) in `spot_focus_UI.png` |

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

### 7.2 Cards are labelled by position, not by object

The current code sets each cell's `aria-label` to the object's name.

That is the wrong call for this game, and not only because 199 object names across three
languages is 597 strings nobody can review.
Naming the objects **gives away the answers**: a screen reader that reads "Green apple"
on the left and "Orange" in the same position on the right has just announced a
difference the player was asked to find.

Cards are therefore labelled by position, from the existing locale file:
`spot-focus.aria.cell` = "Picture {{col}} in row {{row}}", with the found ones adding
"found".
Progress stays on the existing `role="status" aria-live="polite"` region.

This is honest rather than generous.
Spot the difference is irreducibly visual and no labelling scheme makes it playable
without sight; what labelling can do is not hand the answers to a partially sighted
resident using magnification with speech.
`items.ts` still carries a `labelKey` per item so the names are available for future use
- a "what did I miss?" review panel is the obvious one - but nothing renders it today.

## 8. Testing

| Test | What it protects |
|---|---|
| `__tests__/sprites.test.ts` | Every catalogue id resolves to a sprite that exists in `public/spot-assets/`, enumerated with `import.meta.glob`. Catches a rename in the slicing script silently leaving broken images on the board. |
| `__tests__/items.test.ts` | No duplicate ids; the dropped duplicate globe is absent; every `twin` is symmetric and points at a real id in the same family; every family used for `medium` has at least two members; enough twinned items exist to satisfy the largest `differenceCount` the difficulty engine can request. |
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

The art is in hand, so there is no stand-in phase.
Order is bottom-up: slicing script, then catalogue, then generator, then the screen,
each with its own tests, so a failure lands on the layer that caused it.
