# Spot Focus Art Rework Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Rebuild Spot Focus on the delivered 200-object raster art set, and make the difficulty engine's `changeSubtlety` parameter actually drive the game.

**Architecture:** A Python script slices two 10x10 atlases into `public/spot-assets/`. A pure `items.ts` catalogue groups the objects into families and twin pairs, which is what lets one generator produce bold, medium and subtle differences with no extra art. The screen splits into small presentational components over a CSS rebuild of the UI kit, because the kit's art has English text baked into it.

**Tech Stack:** React 19, TypeScript, Tailwind, Vitest (node environment), Python 3 with Pillow/NumPy/SciPy for slicing.

**Spec:** `docs/superpowers/specs/2026-08-20-spot-focus-art-design.md`

## Global Constraints

- **Never use the em dash.** Use a plain dash. This applies to code comments, commit messages and UI copy.
- **Version bump required on every commit** in `package.json`. This work lands as **minor**: `1.10.2` to `1.11.0`. Bump once, in Task 8.
- **`npm run build` must pass** (`tsc -b && vite build`). This is the TypeScript gate.
- **`npx eslint <changed paths>` must pass clean.** Repo-wide `npm run lint` has 38 pre-existing failures in untouched files and cannot be used as a gate; lint only what you changed.
- **`npm test` must stay green.** Baseline is 318 passing tests in 27 files.
- **Vitest runs in the `node` environment and only collects `src/**/__tests__/**/*.test.ts`.** There is no jsdom and no testing-library. Do not write component tests; do not add those dependencies. React components are verified in a real browser in Task 9.
- **Do not touch** `focus-filter`, `word-search`, `getSpotFocusParams` in `dynamicDifficulty.ts`, or the `spot-focus` branch of `computePerformanceRatio` in `GameShell.tsx`.
- **Metrics contract is frozen:** `onLevelComplete` must keep emitting `differencesFound`, `totalDifferences` and `falseTaps`.
- Sprite paths are absolute from the web root: `/spot-assets/item-<id>.png`.

---

## File Structure

| File | Responsibility |
|---|---|
| `scripts/slice_spot_focus_assets.py` | Create. Cuts atlases, backdrop and ornaments into `public/spot-assets/`. |
| `public/spot-assets/*` | Create. 200 sprites, `bg-scene.jpg`, 2 ornaments, `manifest.json`. |
| `src/games/attention/SpotFocus/items.ts` | Create. The object catalogue: id, labelKey, family, twin. Pure data. |
| `src/games/attention/SpotFocus/sprites.ts` | Create. Path helpers and the backdrop/ornament constants. |
| `src/games/attention/SpotFocus/palette.ts` | Create. Colours sampled from the kit. |
| `src/games/attention/SpotFocus/Card.tsx` | Create. One item card: sprite, found overlay, tick badge. |
| `src/games/attention/SpotFocus/Grid.tsx` | Create. One panel: ribbon label, blue frame, the cards. |
| `src/games/attention/SpotFocus/Scene.tsx` | Create. Backdrop, signboard header, instruction line. |
| `src/games/attention/SpotFocus/index.tsx` | Rewrite. Phases, tap handling, scoring. |
| `src/lib/contentGenerators/spotFocus.ts` | Rewrite. Family/twin-aware generation. |
| `public/locales/{en,hi,kn}/common.json` | Modify. Two new keys, one changed. |

---

### Task 1: Slice the art

**Files:**
- Create: `scripts/slice_spot_focus_assets.py`
- Create (generated): `public/spot-assets/`

**Interfaces:**
- Consumes: nothing.
- Produces: `public/spot-assets/item-<id>.png` for 200 ids, `bg-scene.jpg`, `ui-sprig-left.png`, `ui-sprig-right.png`, `manifest.json`. The id list in this script is the source of truth that Task 2's catalogue must match.

There is no vitest coverage for Python. Following `scripts/slice_shopping_assets.py`, the script asserts its own invariants and exits non-zero on mismatch, and prints every crop box it used.

- [ ] **Step 1: Confirm the toolchain is present**

Run: `python -c "import numpy, scipy, PIL; print('ok')"`
Expected: `ok`. These are already used by `scripts/slice_shopping_assets.py`.

- [ ] **Step 2: Write the script**

> **What actually happened (recorded after execution).** The script below is not what
> shipped. Its premise - that the atlases are even 10 x 10 grids so a cell can be cropped
> and trimmed - is false, and Step 5's eyeball check is what caught it. Measured row gaps
> in atlas 1 run 134, 136, 128, 132, 123, 123, 116, 111 pixels, so an even split puts grid
> lines through the objects in the lower rows. Three fixes were tried against the bad grid
> and all failed, because the grid was the bug.
>
> The shipped script measures the nine gutters as the emptiest lines near where an even
> split would fall, then settles ownership against each cell's core - its central half.
> A component reaching one core is one object and keeps its overflow; a component reaching
> two is two objects touching, and is cut at the neck by a watershed on the distance
> transform. Read `scripts/slice_spot_focus_assets.py` for the real thing.


Create `scripts/slice_spot_focus_assets.py`. The id tables below are the 100 names per atlas from `assets-src/Spot_Focus_Assets/items_0*_100_items.docx`, kebab-cased, 10 per row, in atlas order. The docx lists are accurate; rows 1 to 3 of atlas 1 were verified name by name against the rendered sheet. Note `globe-2` in atlas 1 row 10: the docx names "Globe" twice, so the second occurrence is suffixed to keep the sprite filenames unique. It is sliced but omitted from the catalogue in Task 2.

```python
"""
Slice the Spot Focus art set into public/spot-assets/.

Run from the repo root:

    python scripts/slice_spot_focus_assets.py

Both atlases are exact 10 x 10 grids with every cell occupied, so slicing is per grid
cell and then trimmed to the alpha bounding box inside that cell. It is deliberately not
per connected component: atlas 1 labels into exactly 100 components but atlas 2 labels
into 107 for its 100 objects, so at least one object separates under alpha labelling and
component analysis would cut it in half.

The script prints every crop box it used. Those numbers are the source of truth for the
geometry constants in the game; do not eyeball them off the image.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets-src" / "Spot_Focus_Assets"
OUT = ROOT / "public" / "spot-assets"

GRID = 10
ALPHA_FLOOR = 40
# Transparent margin kept around each sprite so it never renders flush to its edge.
PAD = 2
JPEG_QUALITY = 88

# Ornament crop boxes, measured off spot_focus_UI.png (1024 x 1024).
# The signboard plank carries baked-in English text and is rebuilt in CSS; only these
# two text-free sprigs are cut.
UI_CROPS: dict[str, tuple[int, int, int, int]] = {
    "ui-sprig-left":  (18, 196, 128, 330),
    "ui-sprig-right": (498, 196, 608, 330),
}

ATLAS_1_IDS: list[list[str]] = [
    # row 1
    ["bowl", "blue-mug", "pink-teacup-with-saucer", "dinner-plate", "drinking-glass", "wine-glass", "metal-spoon", "fork", "table-knife", "wooden-spoon"],
    # row 2
    ["red-kettle", "blue-teapot", "coffee-carafe", "toaster", "cooking-pot", "frying-pan", "chopping-board", "stack-of-bowls", "colander", "salt-shaker"],
    # row 3
    ["pepper-grinder", "cooking-oil-bottle", "spice-jar", "herb-jar", "honey-jar", "jam-jar", "cookie-jar", "sugar-cube-jar", "kitchen-utensil-holder", "oven-mitt"],
    # row 4
    ["tomato", "lemon", "orange", "red-apple", "green-apple", "banana", "blueberry-cupcake", "chocolate-chip-cookie", "pink-doughnut", "strawberry-cake-slice"],
    # row 5
    ["daisy-flower-pot", "sunflower-pot", "lavender-pot", "monstera-plant", "cactus", "yellow-tulips-in-vase", "red-roses-in-jug", "pink-hydrangea-pot", "leafy-plant-in-basket", "white-orchid"],
    # row 6
    ["red-alarm-clock", "blue-wall-clock", "hourglass", "globe", "stack-of-books", "open-book", "framed-beach-picture", "window-with-curtains", "framed-mountain-picture", "oval-mirror"],
    # row 7
    ["yellow-cushion", "blue-patterned-cushion", "pink-polka-dot-cushion", "blue-checked-blanket", "folded-towels", "basket-of-towels", "rubber-duck", "soap-dish-with-soap", "liquid-soap-dispenser", "toothbrush-cup"],
    # row 8
    ["scissors", "colourful-buttons", "keys-with-key-tag", "padlock", "remote-control", "game-controller", "flashlight", "tissue-box", "white-candle", "purple-candle"],
    # row 9
    ["wicker-basket", "laundry-basket", "vacuum-cleaner", "broom", "dustpan-and-brush", "watering-can", "spray-bottle", "potted-leafy-plant", "dog", "cat"],
    # row 10
    ["house", "birdhouse", "lantern", "table-lamp", "candlestick", "desk-lamp", "green-alarm-clock", "globe-2", "small-potted-plant", "stack-of-folded-towels"],
]

ATLAS_2_IDS: list[list[str]] = [
    # row 1
    ["red-sofa", "yellow-armchair", "rocking-chair", "dining-chair", "round-dining-table", "coffee-table", "bedside-lamp", "wardrobe", "chest-of-drawers", "single-bed"],
    # row 2
    ["bunk-bed", "study-desk", "office-chair", "wooden-stool", "coat-stand", "shoe-rack", "tall-drawer-cabinet", "baby-crib", "hammock", "bean-bag-chair"],
    # row 3
    ["refrigerator", "microwave-oven", "blender", "stand-mixer", "rice-cooker", "air-fryer", "pressure-cooker", "waffle-maker", "sandwich-toaster", "table-fan"],
    # row 4
    ["air-conditioner", "washing-machine", "clothes-iron", "sewing-machine", "hair-dryer", "electric-shaver", "laptop", "desktop-monitor", "tablet", "smartphone"],
    # row 5
    ["headphones", "smartwatch", "digital-camera", "printer", "bluetooth-speaker", "game-console", "wi-fi-router", "usb-flash-drive", "computer-mouse", "computer-keyboard"],
    # row 6
    ["backpack", "handbag", "suitcase", "wallet", "sunglasses", "baseball-cap", "scarf", "sneakers", "hiking-boots", "ball-of-yarn"],
    # row 7
    ["umbrella", "raincoat", "t-shirt", "hoodie", "pink-dress", "jeans", "leather-belt", "necklace", "bracelet", "ring"],
    # row 8
    ["perfume-bottle", "lipstick", "nail-polish", "hair-comb", "hairbrush", "shampoo-bottle", "lotion-bottle", "toilet-paper-roll", "plunger", "shower-head"],
    # row 9
    ["bath-towel", "bathroom-bin", "laundry-detergent-bottle", "first-aid-kit", "thermometer", "stethoscope", "medicine-bottle", "adhesive-bandages", "toolbox", "hammer"],
    # row 10
    ["screwdriver", "wrench", "pliers", "paintbrush", "paint-bucket", "power-drill", "tape-measure", "light-bulb", "extension-power-strip", "step-ladder"],
]


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


def slice_atlas(filename: str, ids: list[list[str]]) -> list[dict]:
    """One sprite per grid cell, trimmed to its own alpha box within that cell."""
    sheet = Image.open(SRC / filename).convert("RGBA")
    if sheet.width != sheet.height:
        die(f"{filename} is {sheet.size}, expected a square atlas")

    cell = sheet.width / GRID
    alpha = np.array(sheet.split()[3]) > ALPHA_FLOOR
    records = []

    for row in range(GRID):
        for col in range(GRID):
            cx0, cy0 = int(round(col * cell)), int(round(row * cell))
            cx1, cy1 = int(round((col + 1) * cell)), int(round((row + 1) * cell))
            sub = alpha[cy0:cy1, cx0:cx1]
            if sub.sum() < 500:
                die(f"{filename} cell ({row},{col}) is empty")

            ys, xs = np.where(sub)
            box = (
                max(cx0 + int(xs.min()) - PAD, 0),
                max(cy0 + int(ys.min()) - PAD, 0),
                min(cx0 + int(xs.max()) + 1 + PAD, sheet.width),
                min(cy0 + int(ys.max()) + 1 + PAD, sheet.height),
            )
            item_id = ids[row][col]
            sheet.crop(box).save(OUT / f"item-{item_id}.png")
            records.append({"id": item_id, "atlas": filename, "row": row, "col": col,
                            "box": list(box)})
            print(f"  item-{item_id:28} {filename} ({row},{col}) {box}")

    return records


def main() -> None:
    if not SRC.exists():
        die(f"missing source directory {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)

    for name, ids in (("items_01.png", ATLAS_1_IDS), ("items_02.png", ATLAS_2_IDS)):
        flat = [i for r in ids for i in r]
        if len(ids) != GRID or any(len(r) != GRID for r in ids):
            die(f"{name}: id table is not {GRID} x {GRID}")
        if len(set(flat)) != len(flat):
            dupes = sorted({i for i in flat if flat.count(i) > 1})
            die(f"{name}: duplicate ids {dupes}")

    print("Items:")
    records = slice_atlas("items_01.png", ATLAS_1_IDS)
    records += slice_atlas("items_02.png", ATLAS_2_IDS)

    all_ids = [r["id"] for r in records]
    if len(set(all_ids)) != len(all_ids):
        dupes = sorted({i for i in all_ids if all_ids.count(i) > 1})
        die(f"ids collide across the two atlases: {dupes}")

    print("UI:")
    ui = Image.open(SRC / "spot_focus_UI.png").convert("RGBA")
    for name, box in UI_CROPS.items():
        ui.crop(box).save(OUT / f"{name}.png")
        print(f"  {name:20} {box}")

    print("Backdrop:")
    bg = Image.open(SRC / "spot_focus_bg.png").convert("RGB")
    bg.save(OUT / "bg-scene.jpg", quality=JPEG_QUALITY, optimize=True)
    size_kb = (OUT / "bg-scene.jpg").stat().st_size // 1024
    print(f"  bg-scene.jpg         {bg.size} {size_kb} KB")

    (OUT / "manifest.json").write_text(json.dumps({"items": records}, indent=2))
    print(f"\nWrote {len(records)} sprites to {OUT}")


if __name__ == "__main__":
    main()
```

- [ ] **Step 3: Run it**

Run: `python scripts/slice_spot_focus_assets.py`
Expected: a printed crop box for all 200 items, then the two ornaments and the backdrop, ending in `Wrote 200 sprites to ...`. Non-zero exit means an id table is malformed or a cell is empty; fix the table, do not loosen the check.

- [ ] **Step 4: Verify the output on disk**

Run: `ls public/spot-assets/item-*.png | wc -l && ls -la public/spot-assets/bg-scene.jpg public/spot-assets/ui-sprig-*.png`
Expected: `200`, and four further files. `bg-scene.jpg` should be roughly 150-400 KB; if it is over 1 MB the JPEG encode did not happen.

- [ ] **Step 5: Eyeball three sprites against the atlas**

Open `public/spot-assets/item-blue-teapot.png`, `item-rubber-duck.png` and `item-red-alarm-clock.png`. Confirm each is the object its id names, cleanly trimmed, with transparent surroundings and no neighbouring object bleeding in from an adjacent cell. A mismatch means the id table is offset by a row or a column.

- [ ] **Step 6: Commit**

```bash
git add scripts/slice_spot_focus_assets.py public/spot-assets
git commit -m "chore(spot-focus): slice the 200-object art set and the scene plate"
```

---

### Task 2: The item catalogue

**Files:**
- Create: `src/games/attention/SpotFocus/items.ts`
- Test: `src/games/attention/SpotFocus/__tests__/items.test.ts`

**Interfaces:**
- Consumes: the id list from Task 1's script.
- Produces:
  ```ts
  export type Subtlety = 'bold' | 'medium' | 'subtle';
  export interface SpotItem { id: string; labelKey: string; family: string; twin?: string; }
  export const ITEMS: SpotItem[];
  export const BY_ID: Map<string, SpotItem>;
  export function familyMembers(family: string): SpotItem[];
  ```

`family` groups objects that read as the same kind of thing. `twin` names a near-identical partner and is authored on both members of a pair. Together they are what produce three subtlety tiers from one art set.

Drop `globe` at atlas 1 position 97 from the catalogue: it duplicates position 54 and an invisible difference is unfindable. The sprite file still exists; only the catalogue omits it. Give the two files distinct ids in Task 1 (`globe` and `globe-2`) and omit `globe-2` here.

- [ ] **Step 1: Write the failing test**

Create `src/games/attention/SpotFocus/__tests__/items.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { BY_ID, ITEMS, familyMembers } from '../items';
import { getSpotFocusParams } from '../../../../lib/dynamicDifficulty';

describe('item catalogue', () => {
  it('has no duplicate ids', () => {
    const ids = ITEMS.map((i) => i.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it('omits the duplicated globe', () => {
    expect(BY_ID.has('globe')).toBe(true);
    expect(BY_ID.has('globe-2')).toBe(false);
  });

  it('gives every item a label key derived from its id', () => {
    for (const item of ITEMS) {
      expect(item.labelKey).toBe(`spot-focus.item.${item.id}`);
    }
  });

  it('makes every twin symmetric, real, and in the same family', () => {
    for (const item of ITEMS) {
      if (!item.twin) continue;
      const twin = BY_ID.get(item.twin);
      expect(twin, `${item.id} twins a missing id ${item.twin}`).toBeDefined();
      // A one-sided twin silently halves the subtle pool.
      expect(twin!.twin, `${item.id} and ${item.twin} disagree`).toBe(item.id);
      expect(twin!.family).toBe(item.family);
    }
  });

  it('gives every family used for a medium swap at least two members', () => {
    for (const item of ITEMS) {
      const kin = familyMembers(item.family).filter((k) => k.id !== item.id);
      if (kin.length === 0) continue;
      expect(familyMembers(item.family).length).toBeGreaterThanOrEqual(2);
    }
  });

  it('carries enough twins for the hardest round the engine can ask for', () => {
    // getSpotFocusParams tops out at 7 differences; a subtle round needs one twinned
    // item per difference, all in distinct families.
    const maxDifferences = getSpotFocusParams(1).differenceCount;
    const twinFamilies = new Set(ITEMS.filter((i) => i.twin).map((i) => i.family));
    expect(twinFamilies.size).toBeGreaterThanOrEqual(maxDifferences);
  });

  it('has enough families to fill the largest grid without repeating one', () => {
    const { gridRows, gridCols } = getSpotFocusParams(1);
    const families = new Set(ITEMS.map((i) => i.family));
    expect(families.size).toBeGreaterThanOrEqual(gridRows * gridCols);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/games/attention/SpotFocus/__tests__/items.test.ts`
Expected: FAIL, `Failed to resolve import "../items"`.

- [ ] **Step 3: Write the catalogue**

Create `src/games/attention/SpotFocus/items.ts`. Author all 199 entries, taking ids from Task 1's tables in the same order.

```ts
/**
 * The object catalogue for Spot Focus.
 *
 * Artwork is sliced from `assets-src/Spot_Focus_Assets/` into `public/spot-assets/` by
 * `scripts/slice_spot_focus_assets.py`; the ids here are that script's ids.
 *
 * `family` and `twin` are the whole difficulty model. A `subtle` difference swaps an
 * item for its twin, a `medium` one for another member of its family, and a `bold` one
 * for something out of a different family. That is why 200 objects was a better art
 * delivery than a smaller set with hand-drawn variants: the tiers come from how the
 * objects relate, not from extra drawing.
 *
 * `globe-2` is sliced but deliberately absent here: it is pixel-identical to `globe`,
 * and a difference nobody can see is a difference nobody can find.
 */

export type Subtlety = 'bold' | 'medium' | 'subtle';

export interface SpotItem {
  id: string;
  labelKey: string;
  family: string;
  /** Near-identical partner. Authored on both members of the pair. */
  twin?: string;
}

const item = (id: string, family: string, twin?: string): SpotItem => ({
  id,
  labelKey: `spot-focus.item.${id}`,
  family,
  ...(twin ? { twin } : {}),
});

export const ITEMS: SpotItem[] = [
  // ── Crockery, drinkware, glassware ──────────────────────────────────────
  item('bowl', 'crockery'),
  item('dinner-plate', 'crockery'),
  item('stack-of-bowls', 'crockery'),
  item('blue-mug', 'drinkware'),
  item('pink-teacup-with-saucer', 'drinkware'),
  item('drinking-glass', 'glassware'),
  item('wine-glass', 'glassware'),
  item('metal-spoon', 'cutlery', 'wooden-spoon'),
  item('wooden-spoon', 'cutlery', 'metal-spoon'),
  item('fork', 'cutlery'),
  item('table-knife', 'cutlery'),

  // ── Kitchen ─────────────────────────────────────────────────────────────
  item('red-kettle', 'hot-drinks'),
  item('blue-teapot', 'hot-drinks'),
  item('coffee-carafe', 'hot-drinks'),
  item('cooking-pot', 'cookware'),
  item('frying-pan', 'cookware'),
  item('colander', 'cookware'),
  item('chopping-board', 'prep'),
  item('kitchen-utensil-holder', 'prep'),
  item('oven-mitt', 'prep'),
  item('salt-shaker', 'seasoning', 'pepper-grinder'),
  item('pepper-grinder', 'seasoning', 'salt-shaker'),
  item('cooking-oil-bottle', 'seasoning'),
  item('spice-jar', 'jars', 'herb-jar'),
  item('herb-jar', 'jars', 'spice-jar'),
  item('honey-jar', 'jars', 'jam-jar'),
  item('jam-jar', 'jars', 'honey-jar'),
  item('cookie-jar', 'jars', 'sugar-cube-jar'),
  item('sugar-cube-jar', 'jars', 'cookie-jar'),
  item('toaster', 'counter-appliances'),
  item('microwave-oven', 'counter-appliances'),
  item('blender', 'counter-appliances'),
  item('stand-mixer', 'counter-appliances'),
  item('rice-cooker', 'counter-appliances'),
  item('air-fryer', 'counter-appliances'),
  item('pressure-cooker', 'counter-appliances'),
  item('waffle-maker', 'counter-appliances', 'sandwich-toaster'),
  item('sandwich-toaster', 'counter-appliances', 'waffle-maker'),

  // ── Food ────────────────────────────────────────────────────────────────
  item('tomato', 'fruit'),
  item('lemon', 'fruit', 'orange'),
  item('orange', 'fruit', 'lemon'),
  item('red-apple', 'fruit', 'green-apple'),
  item('green-apple', 'fruit', 'red-apple'),
  item('banana', 'fruit'),
  item('blueberry-cupcake', 'baked-treats'),
  item('chocolate-chip-cookie', 'baked-treats'),
  item('pink-doughnut', 'baked-treats'),
  item('strawberry-cake-slice', 'baked-treats'),

  // ── Plants and flowers ──────────────────────────────────────────────────
  item('daisy-flower-pot', 'potted-plants', 'sunflower-pot'),
  item('sunflower-pot', 'potted-plants', 'daisy-flower-pot'),
  item('lavender-pot', 'potted-plants'),
  item('monstera-plant', 'potted-plants'),
  item('cactus', 'potted-plants'),
  item('pink-hydrangea-pot', 'potted-plants'),
  item('leafy-plant-in-basket', 'potted-plants'),
  item('white-orchid', 'potted-plants'),
  item('potted-leafy-plant', 'potted-plants', 'small-potted-plant'),
  item('small-potted-plant', 'potted-plants', 'potted-leafy-plant'),
  item('yellow-tulips-in-vase', 'cut-flowers'),
  item('red-roses-in-jug', 'cut-flowers'),

  // ── Things on a shelf or a wall ─────────────────────────────────────────
  item('red-alarm-clock', 'clocks', 'green-alarm-clock'),
  item('blue-wall-clock', 'clocks'),
  item('green-alarm-clock', 'clocks', 'red-alarm-clock'),
  item('hourglass', 'desk-objects'),
  item('globe', 'desk-objects'),
  item('stack-of-books', 'books'),
  item('open-book', 'books'),
  item('framed-beach-picture', 'wall-art', 'framed-mountain-picture'),
  item('framed-mountain-picture', 'wall-art', 'framed-beach-picture'),
  item('oval-mirror', 'wall-art'),
  item('window-with-curtains', 'wall-art'),

  // ── Soft furnishings ────────────────────────────────────────────────────
  item('yellow-cushion', 'cushions', 'pink-polka-dot-cushion'),
  item('blue-patterned-cushion', 'cushions'),
  item('pink-polka-dot-cushion', 'cushions', 'yellow-cushion'),
  item('blue-checked-blanket', 'blankets'),
  item('folded-towels', 'towels', 'stack-of-folded-towels'),
  item('basket-of-towels', 'towels'),
  item('stack-of-folded-towels', 'towels', 'folded-towels'),
  item('bath-towel', 'towels'),

  // ── Bathroom ────────────────────────────────────────────────────────────
  item('rubber-duck', 'bath-items'),
  item('soap-dish-with-soap', 'bath-items'),
  item('liquid-soap-dispenser', 'bath-items'),
  item('toothbrush-cup', 'bath-items'),
  item('plunger', 'bathroom-fixtures'),
  item('shower-head', 'bathroom-fixtures'),
  item('bathroom-bin', 'bathroom-fixtures'),
  item('tissue-box', 'paper-goods'),
  item('toilet-paper-roll', 'paper-goods'),

  // ── Odds and ends ───────────────────────────────────────────────────────
  item('scissors', 'small-hardware'),
  item('colourful-buttons', 'small-hardware'),
  item('keys-with-key-tag', 'small-hardware'),
  item('padlock', 'small-hardware'),
  item('remote-control', 'handheld-devices'),
  item('game-controller', 'handheld-devices'),
  item('flashlight', 'handheld-devices'),
  item('white-candle', 'candles', 'purple-candle'),
  item('purple-candle', 'candles', 'white-candle'),
  item('candlestick', 'candles'),
  item('lantern', 'candles'),
  item('wicker-basket', 'baskets', 'laundry-basket'),
  item('laundry-basket', 'baskets', 'wicker-basket'),

  // ── Housework ───────────────────────────────────────────────────────────
  item('vacuum-cleaner', 'cleaning'),
  item('broom', 'cleaning'),
  item('dustpan-and-brush', 'cleaning'),
  item('spray-bottle', 'cleaning'),
  item('laundry-detergent-bottle', 'cleaning'),
  item('watering-can', 'garden'),
  item('dog', 'pets'),
  item('cat', 'pets'),
  item('house', 'buildings'),
  item('birdhouse', 'buildings'),
  item('table-lamp', 'lamps', 'desk-lamp'),
  item('desk-lamp', 'lamps', 'table-lamp'),
  item('bedside-lamp', 'lamps'),

  // ── Furniture ───────────────────────────────────────────────────────────
  item('red-sofa', 'seating'),
  item('yellow-armchair', 'seating'),
  item('rocking-chair', 'seating'),
  item('dining-chair', 'seating'),
  item('office-chair', 'seating'),
  item('wooden-stool', 'seating'),
  item('bean-bag-chair', 'seating'),
  item('round-dining-table', 'tables'),
  item('coffee-table', 'tables'),
  item('study-desk', 'tables'),
  item('wardrobe', 'storage-furniture'),
  item('chest-of-drawers', 'storage-furniture'),
  item('tall-drawer-cabinet', 'storage-furniture'),
  item('shoe-rack', 'storage-furniture'),
  item('coat-stand', 'storage-furniture'),
  item('single-bed', 'beds'),
  item('bunk-bed', 'beds'),
  item('baby-crib', 'beds'),
  item('hammock', 'beds'),

  // ── Appliances ──────────────────────────────────────────────────────────
  item('refrigerator', 'large-appliances'),
  item('washing-machine', 'large-appliances'),
  item('clothes-iron', 'large-appliances'),
  item('table-fan', 'climate'),
  item('air-conditioner', 'climate'),
  item('sewing-machine', 'craft'),
  item('ball-of-yarn', 'craft'),
  item('hair-dryer', 'grooming-appliances'),
  item('electric-shaver', 'grooming-appliances'),

  // ── Electronics ─────────────────────────────────────────────────────────
  item('laptop', 'computers'),
  item('desktop-monitor', 'computers'),
  item('tablet', 'computers'),
  item('printer', 'computers'),
  item('smartphone', 'mobile'),
  item('smartwatch', 'mobile'),
  item('headphones', 'audio'),
  item('bluetooth-speaker', 'audio'),
  item('digital-camera', 'gadgets'),
  item('game-console', 'gadgets'),
  item('wi-fi-router', 'gadgets'),
  item('usb-flash-drive', 'gadgets'),
  item('computer-mouse', 'peripherals'),
  item('computer-keyboard', 'peripherals'),

  // ── Clothing and personal ───────────────────────────────────────────────
  item('backpack', 'bags'),
  item('handbag', 'bags'),
  item('suitcase', 'bags'),
  item('wallet', 'bags'),
  item('sunglasses', 'accessories'),
  item('baseball-cap', 'accessories'),
  item('scarf', 'accessories'),
  item('leather-belt', 'accessories'),
  item('sneakers', 'footwear', 'hiking-boots'),
  item('hiking-boots', 'footwear', 'sneakers'),
  item('umbrella', 'outerwear'),
  item('raincoat', 'outerwear'),
  item('t-shirt', 'clothing'),
  item('hoodie', 'clothing'),
  item('pink-dress', 'clothing'),
  item('jeans', 'clothing'),
  item('necklace', 'jewellery'),
  item('bracelet', 'jewellery'),
  item('ring', 'jewellery'),
  item('perfume-bottle', 'cosmetics'),
  item('lipstick', 'cosmetics'),
  item('nail-polish', 'cosmetics'),
  item('hair-comb', 'haircare', 'hairbrush'),
  item('hairbrush', 'haircare', 'hair-comb'),
  item('shampoo-bottle', 'toiletries'),
  item('lotion-bottle', 'toiletries'),

  // ── Tools and hardware ──────────────────────────────────────────────────
  item('first-aid-kit', 'medical'),
  item('thermometer', 'medical'),
  item('stethoscope', 'medical'),
  item('medicine-bottle', 'medical'),
  item('adhesive-bandages', 'medical'),
  item('toolbox', 'tools'),
  item('hammer', 'tools'),
  item('screwdriver', 'tools'),
  item('wrench', 'tools'),
  item('pliers', 'tools'),
  item('power-drill', 'tools'),
  item('tape-measure', 'tools'),
  item('paintbrush', 'painting'),
  item('paint-bucket', 'painting'),
  item('light-bulb', 'electrical'),
  item('extension-power-strip', 'electrical'),
  item('step-ladder', 'electrical'),
];

export const BY_ID = new Map(ITEMS.map((i) => [i.id, i]));

const BY_FAMILY = ITEMS.reduce<Map<string, SpotItem[]>>((acc, i) => {
  const list = acc.get(i.family) ?? [];
  list.push(i);
  acc.set(i.family, list);
  return acc;
}, new Map());

export function familyMembers(family: string): SpotItem[] {
  return BY_FAMILY.get(family) ?? [];
}
```

That is the complete catalogue: 199 entries, every id from Task 1 exactly once apart from `globe-2`, in 59 families with 19 twin pairs spread across 15 of them. The tests need 12 families and 7 twin-bearing families, so there is real headroom.

Copy it verbatim rather than retyping it. The coverage was verified mechanically before this plan was written: no id missing, none duplicated, none invented, and no twin pointing outside its own family.

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/games/attention/SpotFocus/__tests__/items.test.ts`
Expected: PASS, 7 tests.

If "enough families to fill the largest grid" fails, families are too coarse: split an oversized one. If "enough twins" fails, add twin pairs; there are plenty of candidates left in the atlas lists.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/SpotFocus/items.ts src/games/attention/SpotFocus/__tests__/items.test.ts
git commit -m "feat(spot-focus): the object catalogue, and the families that grade a difference"
```

---

### Task 3: Sprite paths, checked against disk

**Files:**
- Create: `src/games/attention/SpotFocus/sprites.ts`
- Test: `src/games/attention/SpotFocus/__tests__/sprites.test.ts`

**Interfaces:**
- Consumes: `ITEMS` from Task 2; the files from Task 1.
- Produces: `spritePath(id: string): string`, `BG_SCENE: string`, `UI_SPRIG_LEFT: string`, `UI_SPRIG_RIGHT: string`.

This task exists to catch the one failure that silently breaks the board: a rename in the slicing script that leaves the catalogue pointing at files that are not there.

- [ ] **Step 1: Write the failing test**

Create `src/games/attention/SpotFocus/__tests__/sprites.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { ITEMS } from '../items';
import { BG_SCENE, UI_SPRIG_LEFT, UI_SPRIG_RIGHT, spritePath } from '../sprites';

/**
 * The art that actually exists on disk.
 *
 * Enumerated with Vite's own glob rather than node:fs: `tsconfig.app.json` restricts
 * ambient types to `vite/client` precisely so app code cannot reach for Node APIs, and
 * widening that for one test would be the wrong trade.
 */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('/public/spot-assets/*.{png,jpg}')).map((p) =>
    p.replace('/public', ''),
  ),
);

describe('spot-focus art', () => {
  it('resolves every catalogue item to a sprite that exists', () => {
    for (const item of ITEMS) {
      expect(ON_DISK.has(spritePath(item.id)), `missing sprite for ${item.id}`).toBe(true);
    }
  });

  it('resolves the backdrop and both signboard sprigs', () => {
    for (const path of [BG_SCENE, UI_SPRIG_LEFT, UI_SPRIG_RIGHT]) {
      expect(ON_DISK.has(path), `missing ${path}`).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/games/attention/SpotFocus/__tests__/sprites.test.ts`
Expected: FAIL, `Failed to resolve import "../sprites"`.

- [ ] **Step 3: Write the module**

Create `src/games/attention/SpotFocus/sprites.ts`:

```ts
/**
 * Artwork paths. Everything here is sliced from `assets-src/Spot_Focus_Assets/` into
 * `public/spot-assets/` by `scripts/slice_spot_focus_assets.py`.
 *
 * The signboard plank, both ribbons and the item cards are not in this list on purpose:
 * the kit paints English text into the plank and the ribbons, and this app ships in
 * three languages, so those pieces are drawn in CSS from the kit's palette instead.
 */

const BASE = '/spot-assets';

export const spritePath = (id: string): string => `${BASE}/item-${id}.png`;

export const BG_SCENE = `${BASE}/bg-scene.jpg`;
export const UI_SPRIG_LEFT = `${BASE}/ui-sprig-left.png`;
export const UI_SPRIG_RIGHT = `${BASE}/ui-sprig-right.png`;
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/games/attention/SpotFocus/__tests__/sprites.test.ts`
Expected: PASS, 2 tests.

A failure here names the exact id that is missing. Fix the id in `items.ts` or in the slicing script's table, whichever is wrong, and rerun the script.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/SpotFocus/sprites.ts src/games/attention/SpotFocus/__tests__/sprites.test.ts
git commit -m "feat(spot-focus): sprite paths, proved against what is on disk"
```

---

### Task 4: The generator

**Files:**
- Rewrite: `src/lib/contentGenerators/spotFocus.ts`
- Test: `src/lib/contentGenerators/__tests__/spotFocus.test.ts`

**Interfaces:**
- Consumes: `ITEMS`, `BY_ID`, `familyMembers`, `SpotItem`, `Subtlety` from Task 2; `SpotFocusDynamicParams` from `src/lib/dynamicDifficulty.ts`.
- Produces:
  ```ts
  export interface SceneCell { id: string; labelKey: string; isDifference?: true; }
  export interface GeneratedScene {
    originalRows: SceneCell[][];
    modifiedRows: SceneCell[][];
    differenceCount: number;
    fallbacksUsed: number;
  }
  export function generateSpotFocusContent(params: SpotFocusDynamicParams): GeneratedScene;
  ```

The old `SceneCell` had `display` and `label`; both are gone. `index.tsx` in Task 7 consumes the new shape.

Order is the point. The current implementation fills the grid and then looks for differences among whatever landed, which is structurally why `changeSubtlety` could never be honoured. This picks the difference-bearing items first.

- [ ] **Step 1: Write the failing test**

Replace `src/lib/contentGenerators/__tests__/spotFocus.test.ts` with:

```ts
import { describe, it, expect } from 'vitest';
import { generateSpotFocusContent } from '../spotFocus';
import { BY_ID } from '../../../games/attention/SpotFocus/items';
import { getSpotFocusParams, type SpotFocusDynamicParams } from '../../dynamicDifficulty';

const SUBTLETIES = ['bold', 'medium', 'subtle'] as const;
const GRIDS = [
  { gridRows: 3, gridCols: 3 },
  { gridRows: 3, gridCols: 4 },
];

/** Every shape the difficulty engine can actually ask for. */
function allParams(): SpotFocusDynamicParams[] {
  const out: SpotFocusDynamicParams[] = [];
  for (const grid of GRIDS)
    for (const changeSubtlety of SUBTLETIES)
      for (let differenceCount = 2; differenceCount <= 7; differenceCount++)
        out.push({ ...grid, differenceCount, changeSubtlety });
  return out;
}

describe('generateSpotFocusContent', () => {
  it('fills the grid the params asked for', () => {
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      expect(scene.originalRows).toHaveLength(params.gridRows);
      expect(scene.modifiedRows).toHaveLength(params.gridRows);
      for (const row of [...scene.originalRows, ...scene.modifiedRows]) {
        expect(row).toHaveLength(params.gridCols);
      }
    }
  });

  it('always produces exactly the number of differences asked for', () => {
    // The count is what the resident is told to find, so it is the promise that holds.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      const marked = scene.modifiedRows.flat().filter((c) => c.isDifference);
      expect(marked).toHaveLength(params.differenceCount);
      expect(scene.differenceCount).toBe(params.differenceCount);
    }
  });

  it('never falls back to a bolder tier for anything the engine can request', () => {
    // A non-zero count here means the catalogue is too thin, not that the code is wrong.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      expect(scene.fallbacksUsed, JSON.stringify(params)).toBe(0);
    }
  });

  it('marks a cell as a difference exactly when the two grids disagree', () => {
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      scene.modifiedRows.forEach((row, r) =>
        row.forEach((cell, c) => {
          const changed = cell.id !== scene.originalRows[r][c].id;
          expect(Boolean(cell.isDifference)).toBe(changed);
        }),
      );
    }
  });

  it('never repeats a family within a grid', () => {
    // Two teapots on one board is a difference the player can see and the game will not
    // credit, which is worse than an easier round.
    for (const params of allParams()) {
      const scene = generateSpotFocusContent(params);
      for (const rows of [scene.originalRows, scene.modifiedRows]) {
        const families = rows.flat().map((c) => BY_ID.get(c.id)!.family);
        expect(new Set(families).size).toBe(families.length);
      }
    }
  });

  it('swaps for the twin when subtle is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, differenceCount: 4, changeSubtlety: 'subtle',
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        expect(BY_ID.get(scene.originalRows[r][c].id)!.twin).toBe(cell.id);
      }),
    );
  });

  it('swaps within the family, but not for the twin, when medium is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, differenceCount: 4, changeSubtlety: 'medium',
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        const before = BY_ID.get(scene.originalRows[r][c].id)!;
        expect(BY_ID.get(cell.id)!.family).toBe(before.family);
        expect(cell.id).not.toBe(before.twin);
      }),
    );
  });

  it('swaps across families when bold is asked for', () => {
    const scene = generateSpotFocusContent({
      gridRows: 3, gridCols: 4, differenceCount: 4, changeSubtlety: 'bold',
    });
    scene.modifiedRows.forEach((row, r) =>
      row.forEach((cell, c) => {
        if (!cell.isDifference) return;
        const before = BY_ID.get(scene.originalRows[r][c].id)!;
        expect(BY_ID.get(cell.id)!.family).not.toBe(before.family);
      }),
    );
  });

  it('holds up over many rounds at the settings the engine produces', () => {
    for (let i = 0; i <= 10; i++) {
      const params = getSpotFocusParams(i / 10);
      for (let round = 0; round < 40; round++) {
        const scene = generateSpotFocusContent(params);
        expect(scene.fallbacksUsed).toBe(0);
        expect(scene.modifiedRows.flat().filter((c) => c.isDifference))
          .toHaveLength(params.differenceCount);
      }
    }
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/contentGenerators/__tests__/spotFocus.test.ts`
Expected: FAIL. The old generator still exports `generateSpotFocusContent`, so expect assertion failures such as `expected undefined to be 0` on `fallbacksUsed`, not an import error.

- [ ] **Step 3: Write the generator**

Replace the whole of `src/lib/contentGenerators/spotFocus.ts`:

```ts
/**
 * Content generator for Spot Focus.
 *
 * The order here is the opposite of the version this replaces, and that is the point.
 * The old generator filled the grid and then hunted for differences among whatever
 * landed, which is structurally why `changeSubtlety` could never be honoured: by the
 * time the tier was consulted, the cells were already committed. This picks the
 * difference-bearing items first and fills the rest around them.
 */

import { BY_ID, ITEMS, familyMembers, type SpotItem, type Subtlety }
  from '../../games/attention/SpotFocus/items';
import type { SpotFocusDynamicParams } from '../dynamicDifficulty';

export interface SceneCell {
  id: string;
  labelKey: string;
  isDifference?: true;
}

export interface GeneratedScene {
  originalRows: SceneCell[][];
  modifiedRows: SceneCell[][];
  differenceCount: number;
  /** Differences that had to drop to a bolder tier. Zero on a healthy catalogue. */
  fallbacksUsed: number;
}

/** Bolder is the direction we degrade in: a difference stays findable, just easier. */
const BOLDER: Record<Subtlety, Subtlety | null> = {
  subtle: 'medium',
  medium: 'bold',
  bold: null,
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** What `item` would become at `tier`, or null if the catalogue cannot support it. */
function swapFor(item: SpotItem, tier: Subtlety, usedFamilies: Set<string>): SpotItem | null {
  if (tier === 'subtle') {
    return item.twin ? BY_ID.get(item.twin) ?? null : null;
  }
  if (tier === 'medium') {
    const kin = familyMembers(item.family).filter((k) => k.id !== item.id && k.id !== item.twin);
    return kin.length ? shuffle(kin)[0] : null;
  }
  const outsiders = ITEMS.filter((k) => !usedFamilies.has(k.family));
  return outsiders.length ? shuffle(outsiders)[0] : null;
}

const cellOf = (item: SpotItem): SceneCell => ({ id: item.id, labelKey: item.labelKey });

export function generateSpotFocusContent(params: SpotFocusDynamicParams): GeneratedScene {
  const { gridRows, gridCols, differenceCount, changeSubtlety } = params;
  const total = gridRows * gridCols;
  const wanted = Math.min(differenceCount, total);

  const usedFamilies = new Set<string>();
  const originals: SpotItem[] = [];
  const swaps = new Map<string, SpotItem>();
  let fallbacksUsed = 0;

  // 1. The difference-bearing cells first, so the tier decides which items are eligible
  //    rather than the other way round.
  for (const candidate of shuffle(ITEMS)) {
    if (swaps.size === wanted) break;
    if (usedFamilies.has(candidate.family)) continue;

    let tier: Subtlety | null = changeSubtlety;
    let dropped = 0;
    let replacement: SpotItem | null = null;

    while (tier && !replacement) {
      replacement = swapFor(candidate, tier, usedFamilies);
      if (!replacement) {
        tier = BOLDER[tier];
        dropped++;
      }
    }
    if (!replacement) continue;

    originals.push(candidate);
    swaps.set(candidate.id, replacement);
    usedFamilies.add(candidate.family);
    // A bold swap brings in an outsider, whose family is now spoken for too.
    usedFamilies.add(replacement.family);
    fallbacksUsed += dropped;
  }

  // 2. Fill the rest, keeping one family to a board so no object appears twice.
  for (const candidate of shuffle(ITEMS)) {
    if (originals.length === total) break;
    if (usedFamilies.has(candidate.family)) continue;
    originals.push(candidate);
    usedFamilies.add(candidate.family);
  }

  // 3. Shuffle placement so the differences are not always the first cells.
  const placed = shuffle(originals);

  const originalRows: SceneCell[][] = [];
  const modifiedRows: SceneCell[][] = [];
  for (let r = 0; r < gridRows; r++) {
    const origRow: SceneCell[] = [];
    const modRow: SceneCell[] = [];
    for (let c = 0; c < gridCols; c++) {
      const item = placed[r * gridCols + c];
      origRow.push(cellOf(item));
      const swap = swaps.get(item.id);
      modRow.push(swap ? { ...cellOf(swap), isDifference: true } : cellOf(item));
    }
    originalRows.push(origRow);
    modifiedRows.push(modRow);
  }

  return { originalRows, modifiedRows, differenceCount: swaps.size, fallbacksUsed };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/contentGenerators/__tests__/spotFocus.test.ts`
Expected: PASS, 9 tests.

If "never repeats a family" fails, the bold branch is picking an outsider whose family is already on the board; confirm `usedFamilies.add(replacement.family)` runs. If "always produces exactly the number asked for" fails at 7 differences on a 3x3 grid, `wanted` is not being clamped to `total`.

- [ ] **Step 5: Run the whole suite**

Run: `npm test`
Expected: all files pass. The old generator's tests are replaced, so the total moves; nothing should fail.

- [ ] **Step 6: Commit**

```bash
git add src/lib/contentGenerators/spotFocus.ts src/lib/contentGenerators/__tests__/spotFocus.test.ts
git commit -m "feat(spot-focus): pick the differences first, so subtlety finally means something"
```

---

### Task 5: Palette and the card

**Files:**
- Create: `src/games/attention/SpotFocus/palette.ts`
- Create: `src/games/attention/SpotFocus/Card.tsx`

**Interfaces:**
- Consumes: `spritePath` from Task 3.
- Produces: `COLOURS` from `palette.ts`; `Card` from `Card.tsx` with props `{ id: string; ariaLabel: string; interactive: boolean; found: boolean; onTap?: () => void }`.

No unit test: vitest is `node`-only and collects `.test.ts`, not `.test.tsx`. Verification is Task 9's browser run.

- [ ] **Step 1: Write the palette**

Create `src/games/attention/SpotFocus/palette.ts`. Values were sampled from `-abs.png` with a modal-colour probe, not eyeballed.

```ts
/**
 * Screen colours for Spot Focus, sampled from the reference mockup rather than
 * eyeballed. The item art carries its own colour, so nothing here describes an object.
 *
 * These exist because the delivered UI kit has English text baked into the signboard
 * and both ribbons, and the app ships in three languages. The shapes are flat rounded
 * rectangles, so CSS draws them crisply at any size and in any language where a sprite
 * would be wrong in two of the three.
 */
export const COLOURS = {
  skyTop: '#149dfd',
  skyMid: '#5ec1fb',

  panelFrame: '#3c52a4',
  cardFill: '#ffffff',
  cardEdge: 'rgba(60,82,164,.18)',

  foundFill: '#f08c89',
  foundEdge: '#e05a56',

  pillFill: '#bee6fe',
  pillText: '#0e4795',

  ribbonBlue: '#034eb4',
  ribbonRed: '#b20604',
  ribbonText: '#ffffff',

  signWood: '#fbc161',
  signGrain: '#f6b04a',
  signFrame: '#f2a242',
  signText: '#43260c',
} as const;
```

- [ ] **Step 2: Write the card**

Create `src/games/attention/SpotFocus/Card.tsx`:

```tsx
import { spritePath } from './sprites';
import { COLOURS } from './palette';

interface Props {
  id: string;
  ariaLabel: string;
  interactive: boolean;
  found: boolean;
  onTap?: () => void;
}

/**
 * One item card.
 *
 * The found state is a pink wash in `multiply` blend rather than a tint on the sprite.
 * The card underneath is white and the object sits on it, so multiply turns the card
 * pink and leaves the object's own colours alone, which is what the mockup draws.
 * Tinting the sprite would wash the object out.
 *
 * The tick badge is not decoration. The mockup carries the found state on colour alone,
 * which is invisible to a colour-blind resident, so a second non-colour cue rides along.
 */
export function Card({ id, ariaLabel, interactive, found, onTap }: Props) {
  return (
    <button
      type="button"
      aria-label={ariaLabel}
      aria-pressed={interactive ? found : undefined}
      disabled={!interactive}
      onClick={interactive ? onTap : undefined}
      className="relative aspect-[3/4] w-full rounded-xl overflow-hidden select-none disabled:cursor-default enabled:active:scale-95 transition-transform"
      style={{
        background: COLOURS.cardFill,
        boxShadow: `inset 0 0 0 1px ${COLOURS.cardEdge}, 0 2px 4px rgba(11,32,74,.18)`,
      }}
    >
      <img
        src={spritePath(id)}
        alt=""
        aria-hidden
        draggable={false}
        className="absolute inset-0 w-full h-full object-contain p-[10%] pointer-events-none"
      />

      {found && (
        <>
          <span
            aria-hidden
            className="absolute inset-0 pointer-events-none"
            style={{ background: COLOURS.foundFill, mixBlendMode: 'multiply' }}
          />
          <span
            aria-hidden
            className="absolute inset-0 rounded-xl pointer-events-none"
            style={{ boxShadow: `inset 0 0 0 3px ${COLOURS.foundEdge}` }}
          />
          <span
            aria-hidden
            className="absolute top-1 right-1 flex items-center justify-center rounded-full font-bold text-white"
            style={{ width: 22, height: 22, fontSize: 14, background: COLOURS.foundEdge }}
          >
            &#10003;
          </span>
        </>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Typecheck**

Run: `npm run build`
Expected: `built in ...` with no TypeScript errors. Nothing renders `Card` yet; this proves it compiles.

- [ ] **Step 4: Lint**

Run: `npx eslint src/games/attention/SpotFocus`
Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/SpotFocus/palette.ts src/games/attention/SpotFocus/Card.tsx
git commit -m "feat(spot-focus): the card, and a found state that is not colour alone"
```

---

### Task 6: The grid panel and the scene frame

**Files:**
- Create: `src/games/attention/SpotFocus/Grid.tsx`
- Create: `src/games/attention/SpotFocus/Scene.tsx`

**Interfaces:**
- Consumes: `Card` from Task 5; `COLOURS` from Task 5; `SceneCell` from Task 4; `BG_SCENE`, `UI_SPRIG_LEFT`, `UI_SPRIG_RIGHT` from Task 3.
- Produces:
  - `Grid` with props `{ rows: SceneCell[][]; tone: 'blue' | 'red'; label: string; interactive: boolean; found: Set<string>; onTap?: (row: number, col: number) => void }`
  - `Scene` with props `{ heading: string; instruction: string; children: React.ReactNode }`

- [ ] **Step 1: Write the grid panel**

Create `src/games/attention/SpotFocus/Grid.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { Card } from './Card';
import { COLOURS } from './palette';
import type { SceneCell } from '../../../lib/contentGenerators/spotFocus';

interface Props {
  rows: SceneCell[][];
  tone: 'blue' | 'red';
  label: string;
  interactive: boolean;
  found: Set<string>;
  onTap?: (row: number, col: number) => void;
}

/** One labelled panel of cards: the ribbon, the blue frame, and the grid inside it. */
export function Grid({ rows, tone, label, interactive, found, onTap }: Props) {
  const { t } = useTranslation();
  const cols = rows[0]?.length ?? 0;

  return (
    <div className="flex flex-col items-center gap-2 flex-1 min-w-0">
      <span
        className="px-5 py-2 rounded-full font-bold text-body-md whitespace-nowrap"
        style={{
          background: tone === 'blue' ? COLOURS.ribbonBlue : COLOURS.ribbonRed,
          color: COLOURS.ribbonText,
          boxShadow: '0 3px 0 rgba(0,0,0,.22)',
        }}
      >
        {label}
      </span>

      <div
        className="w-full rounded-2xl p-2"
        style={{ background: COLOURS.panelFrame, boxShadow: '0 4px 0 rgba(0,0,0,.2)' }}
      >
        <div
          className="grid gap-2"
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}
        >
          {rows.map((row, r) =>
            row.map((cell, c) => (
              <Card
                key={`${r}-${c}`}
                id={cell.id}
                // Labelled by position, never by object: naming the objects would read
                // "Green apple" on one side and "Orange" on the other, announcing the
                // difference the player was asked to find.
                ariaLabel={t('spot-focus.aria.cell', 'Picture {{col}} in row {{row}}', {
                  row: r + 1,
                  col: c + 1,
                })}
                interactive={interactive}
                found={found.has(`${r}-${c}`)}
                onTap={onTap ? () => onTap(r, c) : undefined}
              />
            )),
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Write the scene frame**

Create `src/games/attention/SpotFocus/Scene.tsx`:

```tsx
import type { ReactNode } from 'react';
import { COLOURS } from './palette';
import { BG_SCENE, UI_SPRIG_LEFT, UI_SPRIG_RIGHT } from './sprites';

interface Props {
  heading: string;
  instruction: string;
  children: ReactNode;
}

/**
 * The backdrop, the signboard header and the instruction line.
 *
 * The plank is CSS rather than the kit's sprite because the kit paints "Can you spot the
 * Differences?" into the wood, and this app ships in English, Hindi and Kannada. Only
 * the daisy sprigs are sliced: they carry no text and CSS cannot draw them.
 */
export function Scene({ heading, instruction, children }: Props) {
  return (
    <div
      role="main"
      className="flex-1 flex flex-col items-center gap-4 p-4 bg-cover bg-center bg-no-repeat"
      style={{
        backgroundImage: `url(${BG_SCENE})`,
        backgroundColor: COLOURS.skyMid,
      }}
    >
      <div className="relative w-full max-w-2xl flex items-center justify-center">
        <img src={UI_SPRIG_LEFT} alt="" aria-hidden
             className="absolute -left-2 -top-3 w-16 md:w-20 z-10 pointer-events-none" />
        <img src={UI_SPRIG_RIGHT} alt="" aria-hidden
             className="absolute -right-2 -top-3 w-16 md:w-20 z-10 pointer-events-none" />
        <h2
          className="w-full text-center font-extrabold text-h2 px-8 py-3 rounded-2xl"
          style={{
            color: COLOURS.signText,
            background: `repeating-linear-gradient(180deg, ${COLOURS.signWood} 0 9px, ${COLOURS.signGrain} 9px 18px)`,
            border: `7px solid ${COLOURS.signFrame}`,
            boxShadow: '0 5px 0 rgba(0,0,0,.25)',
          }}
        >
          {heading}
        </h2>
      </div>

      <p
        className="text-body-md text-center font-bold max-w-2xl"
        style={{ color: COLOURS.pillText, textShadow: '0 1px 3px rgba(255,255,255,.9)' }}
      >
        {instruction}
      </p>

      {children}
    </div>
  );
}
```

- [ ] **Step 3: Typecheck and lint**

Run: `npm run build && npx eslint src/games/attention/SpotFocus`
Expected: build succeeds, eslint silent.

- [ ] **Step 4: Commit**

```bash
git add src/games/attention/SpotFocus/Grid.tsx src/games/attention/SpotFocus/Scene.tsx
git commit -m "feat(spot-focus): the scene frame and the grid panels, in CSS so they translate"
```

---

### Task 7: Rewire the screen

**Files:**
- Rewrite: `src/games/attention/SpotFocus/index.tsx`

**Interfaces:**
- Consumes: `Scene`, `Grid`, `COLOURS`, and `GeneratedScene` from Task 4.
- Produces: the default export `SpotFocus`, already registered in `src/screens/GameRouter.tsx`. No registry change is needed.

The metrics contract is frozen: keep emitting `differencesFound`, `totalDifferences` and `falseTaps`.

- [ ] **Step 1: Rewrite the component**

Replace the whole of `src/games/attention/SpotFocus/index.tsx`:

```tsx
import { useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import type { GeneratedScene } from '../../../lib/contentGenerators/spotFocus';
import { generateSpotFocusContent } from '../../../lib/contentGenerators/spotFocus';
import { COLOURS } from './palette';
import { Grid } from './Grid';
import { Scene } from './Scene';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedScene;
}

type Phase = 'scene_intro' | 'find_differences' | 'completion';

export default function SpotFocus({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance } = useGamePhase<Phase>([
    'scene_intro',
    'find_differences',
    'completion',
  ]);

  // One scene per round. GameRouter remounts between rounds, so this is chosen once and
  // never changes underneath the player.
  const scene = useMemo<GeneratedScene>(
    () =>
      generatedContent ??
      generateSpotFocusContent({
        gridRows: 3,
        gridCols: 3,
        differenceCount: 2,
        changeSubtlety: 'bold',
      }),
    [generatedContent],
  );

  const [found, setFound] = useState<Set<string>>(new Set());
  const falseTapsRef = useRef(0);
  const startedAt = useRef(Date.now());

  const total = scene.differenceCount;

  function handleTap(row: number, col: number) {
    const key = `${row}-${col}`;
    const cell = scene.modifiedRows[row][col];

    if (!cell.isDifference) {
      falseTapsRef.current++;
      return;
    }
    if (found.has(key)) return;

    setFound((prev) => {
      const next = new Set(prev).add(key);
      if (next.size === total) setTimeout(advance, 700);
      return next;
    });
  }

  function handleComplete() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        differencesFound: found.size,
        totalDifferences: total,
        falseTaps: falseTapsRef.current,
      },
    });
  }

  if (currentPhase === 'completion') {
    return (
      <Scene
        heading={t('spot-focus.completion.heading', 'You found all {{count}} differences! Well done!', { count: total })}
        instruction={t('spot-focus.completion.encouragement', 'Your attention is sharp today!')}
      >
        <span className="text-7xl" aria-hidden>&#127881;</span>
        <div className="w-full max-w-xs">
          <Button fullWidth onClick={handleComplete}>
            {t('spot-focus.btn.continue', 'Continue')}
          </Button>
        </div>
      </Scene>
    );
  }

  const playing = currentPhase === 'find_differences';

  return (
    <Scene
      heading={t('spot-focus.intro.heading', 'Can you spot the differences?')}
      instruction={t(
        'spot-focus.intro.instruction',
        'Look at both pictures carefully. Tap on the right picture where you see a difference.',
      )}
    >
      {/*
        The button and the pill occupy the same slot, so nothing on the board shifts when
        the round starts under a resident who is already looking at it.
      */}
      <div className="h-14 flex items-center justify-center">
        {playing ? (
          <p
            role="status"
            aria-live="polite"
            className="px-8 py-2 rounded-2xl font-extrabold text-h3"
            style={{ background: COLOURS.pillFill, color: COLOURS.pillText }}
          >
            {t('spot-focus.found', '{{found}} / {{total}} Found', { found: found.size, total })}
          </p>
        ) : (
          <Button className="btn-ready" onClick={advance}>
            {t('spot-focus.btn.ready', "I'm Ready")}
          </Button>
        )}
      </div>

      <div className="w-full max-w-4xl flex gap-3 md:gap-4">
        <Grid
          rows={scene.originalRows}
          tone="blue"
          label={t('spot-focus.label.original', 'Original')}
          interactive={false}
          found={new Set()}
        />
        <Grid
          rows={scene.modifiedRows}
          tone="red"
          label={t('spot-focus.label.modified', 'Find differences here')}
          interactive={playing}
          found={found}
          onTap={handleTap}
        />
      </div>
    </Scene>
  );
}
```

- [ ] **Step 2: Typecheck**

Run: `npm run build`
Expected: success. A TypeScript error mentioning `display` or `label` on `SceneCell` means something still refers to the old cell shape; grep for it.

- [ ] **Step 3: Lint**

Run: `npx eslint src/games/attention/SpotFocus src/lib/contentGenerators/spotFocus.ts`
Expected: no output.

- [ ] **Step 4: Run the whole suite**

Run: `npm test`
Expected: all green.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/SpotFocus/index.tsx
git commit -m "feat(spot-focus): rebuild the screen on the art, with the pill in the button's slot"
```

---

### Task 8: Copy, in three languages

**Files:**
- Modify: `public/locales/en/common.json`
- Modify: `public/locales/hi/common.json`
- Modify: `public/locales/kn/common.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: the `t()` keys used in Tasks 6 and 7.
- Produces: nothing code-facing.

Only two keys are new. There are no per-object keys: cards are labelled by position, so the 199 object names never reach the screen. `items.ts` still carries a `labelKey` for future use, but nothing renders it and no translations are needed.

- [ ] **Step 1: Add the two new keys to English**

In `public/locales/en/common.json`:

```json
"spot-focus.found": "{{found}} / {{total}} Found",
"spot-focus.aria.cell": "Picture {{col}} in row {{row}}"
```

Also change `spot-focus.label.modified` from `"Find differences here →"` to `"Find differences here"`. The arrow was pointing at a layout that no longer exists, and the red ribbon now sits directly above the grid it names.

- [ ] **Step 2: Add the same two keys to Hindi and Kannada**

In `public/locales/hi/common.json`:

```json
"spot-focus.found": "{{found}} / {{total}} मिले",
"spot-focus.aria.cell": "पंक्ति {{row}} में चित्र {{col}}"
```

In `public/locales/kn/common.json`:

```json
"spot-focus.found": "{{found}} / {{total}} ಸಿಕ್ಕಿದೆ",
"spot-focus.aria.cell": "ಸಾಲು {{row}} ರಲ್ಲಿ ಚಿತ್ರ {{col}}"
```

Apply the same `spot-focus.label.modified` arrow removal in both files.

**Flag for the user:** these two Hindi and Kannada strings need a native speaker's eye before release. Say so in the handoff rather than presenting them as verified.

- [ ] **Step 3: Verify all three files still parse and agree**

Run:
```bash
python -c "
import json
keys=[json.load(open(f'public/locales/{l}/common.json',encoding='utf-8')).keys() for l in ('en','hi','kn')]
print([len(k) for k in keys])
print('en-only:', set(keys[0])-set(keys[1]))
print('missing from kn:', set(keys[0])-set(keys[2]))
"
```
Expected: three equal counts, and both diff lines empty.

- [ ] **Step 4: Bump the version**

In `package.json`, change `"version": "1.10.2"` to `"version": "1.11.0"`. Minor: this is new behaviour and a new art set, not a fix.

- [ ] **Step 5: Commit**

```bash
git add public/locales package.json
git commit -m "feat(spot-focus): the found pill copy, and cards named by where they are"
```

---

### Task 9: Prove it in a browser

**Files:**
- Create (temporary, deleted in step 6): `smoke-spot-focus.cjs`

**Interfaces:**
- Consumes: the running dev server and everything above.
- Produces: screenshots and a pass/fail line. Nothing is committed.

There is no jsdom in this project, so this is the only test that exercises the React tree. Playwright is available transitively at `node_modules/.bin/playwright`; a driver must live inside the project root to resolve the import.

- [ ] **Step 1: Start the dev server**

Run: `npm run dev`
Note the port it prints. It is usually 5173 but takes 5174 if 5173 is busy. Use the printed port below.

- [ ] **Step 2: Write the driver**

Create `smoke-spot-focus.cjs` in the repo root:

```js
const { chromium } = require('playwright');
const URL = process.env.URL || 'http://localhost:5173';

(async () => {
  const browser = await chromium.launch();
  const page = await browser.newPage({ viewport: { width: 1100, height: 900 } });
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('requestfailed', (r) => errors.push(`REQFAIL ${r.url()}`));

  await page.goto(URL);
  await page.evaluate(() => {
    const today = new Date().toISOString().slice(0, 10);
    localStorage.setItem('brain-training-store', JSON.stringify({
      state: {
        activeProfile: { userId: 'smoke-1', firstName: 'Smoke', lastName: 'Test',
          careHomeId: 'ch-1', language: 'en', createdAt: Date.now(),
          soundEnabled: false, textSize: 'normal' },
        currentSession: { date: today, questionnaireCompleted: true,
          focusCategory: 'attention', categoriesCompleted: [], currentCategory: 'attention',
          currentGameId: 'spot-focus', secondsInCurrentCategory: 0, sessionStartedAt: Date.now() },
        language: 'en', textSize: 'normal', soundEnabled: false,
      }, version: 0,
    }));
  });
  await page.goto(`${URL}/app/game/spot-focus`);
  await page.waitForSelector('text=I’m Ready, text=I\'m Ready', { timeout: 15000 }).catch(() => {});
  await page.waitForTimeout(1200);
  await page.screenshot({ path: 'spot-1-intro.png' });

  // Every sprite must actually have loaded. A 404 shows as naturalWidth 0.
  const broken = await page.evaluate(() =>
    [...document.querySelectorAll('img')]
      .filter((i) => !i.complete || i.naturalWidth === 0)
      .map((i) => i.getAttribute('src')));

  await page.getByRole('button', { name: /Ready/i }).click();
  await page.waitForTimeout(400);

  const readPill = () => page.evaluate(() => {
    const m = document.body.innerText.match(/(\d+)\s*\/\s*(\d+)\s*Found/i);
    return m ? { found: +m[1], total: +m[2] } : null;
  });
  const before = await readPill();

  // Tap every card in the right panel. Wrong taps count as false taps, which is fine:
  // this proves the found state and the completion handoff, not the scoring.
  const cards = await page.locator('button[aria-label^="Picture"]').all();
  const rightHalf = [];
  for (const c of cards) {
    const box = await c.boundingBox();
    if (box && box.x > 550) rightHalf.push(c);
  }
  for (const c of rightHalf) { await c.click({ force: true }); await page.waitForTimeout(90); }

  await page.waitForTimeout(400);
  await page.screenshot({ path: 'spot-2-found.png' });
  const ticks = await page.locator('button[aria-pressed="true"]').count();

  await page.waitForSelector('text=/Well done/i', { timeout: 6000 });
  await page.screenshot({ path: 'spot-3-complete.png' });

  const noise = /PLACEHOLDER_KEY|firestore|googleapis|400|403/i;
  const real = errors.filter((e) => !noise.test(e));

  console.log('cards on the right panel:', rightHalf.length);
  console.log('pill at start:', JSON.stringify(before));
  console.log('cards marked found:', ticks);
  console.log('broken images:', broken.length, broken.slice(0, 5));
  real.forEach((e) => console.log('  ! ' + e));

  const ok = broken.length === 0 && before && before.found === 0
    && ticks === before.total && real.length === 0;
  console.log(ok ? 'PASS' : 'FAIL');
  await browser.close();
  process.exit(ok ? 0 : 1);
})();
```

- [ ] **Step 3: Run it**

Run: `URL=http://localhost:5173 node smoke-spot-focus.cjs`
Expected: `broken images: 0`, `pill at start: {"found":0,"total":N}`, `cards marked found: N`, then `PASS`.

`broken images` above zero is the failure that matters: it means a sprite path in `items.ts` does not match a file on disk, and Task 3's test did not catch it because the id was wrong in both places. Fix the id, rerun the slicing script.

- [ ] **Step 4: Look at the screenshots**

Open `spot-1-intro.png`, `spot-2-found.png` and `spot-3-complete.png`. Check against `assets-src/spot-focus/-abs.png`:
- The backdrop fills the screen and the signboard sits on it with a sprig at each end.
- Both panels have their ribbon, the blue frame, and white cards with one object each.
- Found cards are pink with a tick, and the object is still legible through the wash.
- The pill sits where the "I'm Ready" button was, and nothing else moved between the two screenshots.

- [ ] **Step 5: Check the other two languages**

In the browser, switch to Hindi and Kannada with the header toggle and confirm the signboard heading, both ribbons and the pill all render translated text and that nothing overflows its shape. This is what the CSS rebuild bought and it is worth looking at directly.

- [ ] **Step 6: Clean up**

Run: `rm -f smoke-spot-focus.cjs spot-1-intro.png spot-2-found.png spot-3-complete.png && git status -s`
Expected: no untracked leftovers.

- [ ] **Step 7: Final gates**

Run: `npm run build && npm test && npx eslint src/games/attention/SpotFocus src/lib/contentGenerators/spotFocus.ts`
Expected: build succeeds, all tests pass, eslint silent.

---

## Handoff notes for the user

State these plainly rather than burying them:

- **The Hindi and Kannada strings in Task 8 are mine, not a translator's.** Two short strings; they need a native speaker's eye before release.
- **Session resume was not verified.** Seeded localStorage bypasses Dexie, so the resume path needs a session started through the real UI. Nothing in this work touches session or persistence code.
- **`changeSubtlety` now bites.** Residents at high difficulty scores get harder differences than before, not just more of them. Worth watching in the first week of real use.
- **`assets-src/` weight.** This adds roughly 5 MB more source art. With `keyescape/image_13.png` and the Spot Focus mockups already committed, Git LFS is worth deciding on before the history gets long enough to make moving it painful.
