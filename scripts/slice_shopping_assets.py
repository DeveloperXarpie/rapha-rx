"""
Slice the Shopping List art set into public/shop-assets/.

Run from the repo root:

    python scripts/slice_shopping_assets.py

Three jobs:

1. Item sprites out of `items-2.png`. The sheet is already alpha-cut, so the items are
   found by connected-component labelling rather than by a grid: the rows do not share a
   column pitch (five rows of ten, one row of twelve), so a uniform grid would cut row 6
   in half. Small fragments - a fleck of onion skin, the shadow under a bowl - are merged
   into the nearest large component so a halved onion stays one sprite.

2. UI sprites out of `ui-kit-1.png` and `ui-kit2.png`, by measured crop box. These sheets
   are hand-laid-out, so the boxes are constants, verified against the printed report.

3. Backgrounds. `bg-home.png` and `bg-store.png` are opaque and painterly, so they are
   re-encoded as JPEG - roughly 200 KB against 2 MB as PNG.

The script prints every crop box it used. Those numbers are the source of truth for the
geometry constants in the game; do not eyeball them off the image.
"""

from __future__ import annotations

import json
import sys
from pathlib import Path

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets-src" / "ShoppingList"
OUT = ROOT / "public" / "shop-assets"

# Alpha at or below this is background. The sheet's transparent regions carry stray
# colour, so the cut is on alpha alone.
ALPHA_FLOOR = 40

# Below this pixel count a component is a fragment, not an item.
ITEM_MIN_AREA = 800

# A fragment joins an item if it sits within this many pixels of the item's box.
FRAGMENT_REACH = 26

# Transparent margin kept around each sprite so it never renders flush to its edge.
PAD = 4

ITEM_ROWS = 6

# ─── Item ids, row by row, left to right ──────────────────────────────────────
#
# Verified against the rendered sheet, not against ShoppingList_items.docx: the doc
# lists eleven names for row 1, double-listing garlic, which belongs to row 3.

ITEM_IDS: list[list[str]] = [
    # Row 1 - fruit and everyday vegetables
    ["tomatoes", "onion", "potatoes", "carrots", "bananas",
     "apples", "orange", "grapes", "pomegranate", "mango"],
    # Row 2 - vegetables and greens
    ["capsicum", "vine-tomatoes", "brinjal", "okra", "cauliflower",
     "cabbage", "broccoli", "green-beans", "curry-leaves", "coriander"],
    # Row 3 - aromatics, chillies and dark pulses
    ["ginger", "garlic", "green-chillies", "red-chillies", "turmeric",
     "cumin", "kala-chana", "urad-dal", "toor-dal", "masoor-dal"],
    # Row 4 - loose grains, pulses and staples
    ["rice", "chana-dal", "moong-dal", "rajma", "kabuli-chana",
     "white-chana", "atta-loose", "rava", "sugar-loose", "salt-loose"],
    # Row 5 - packaged staples and dairy
    ["rice-pack", "atta-pack", "sunflower-oil", "groundnut-oil", "ghee",
     "milk", "curd", "paneer", "eggs", "bread"],
    # Row 6 - packaged food and household
    ["tea", "coffee", "sugar-pack", "salt-pack", "sambar-masala", "garam-masala",
     "biscuits", "noodles", "detergent", "dish-liquid", "tissue", "toilet-cleaner"],
]

# ─── UI crop boxes, measured off the kit sheets ───────────────────────────────
#
# (left, top, right, bottom) in each sheet's own pixel space.

# Only the pieces that carry no baked-in number. The HINT tile has a "2" and the cart
# panel a "0/10" painted into the art, and both counts are dynamic in play, so those two
# stay CSS - restyled to this kit's palette rather than cut from it.
UI_CROPS: dict[str, tuple[str, tuple[int, int, int, int]]] = {
    "ui-clipboard": ("ui-kit2.png",  (15, 186, 480, 1054)),
    "ui-ready":     ("ui-kit2.png",  (360, 1097, 688, 1279)),
    "ui-done":      ("ui-kit-1.png", (1231, 335, 1526, 480)),
}

BACKGROUNDS = {"bg-home": "bg-home.png", "bg-store": "bg-store.png"}
JPEG_QUALITY = 88


def die(msg: str) -> None:
    print(f"ERROR: {msg}", file=sys.stderr)
    raise SystemExit(1)


# ─── Items ────────────────────────────────────────────────────────────────────

def find_items(sheet: Image.Image) -> list[tuple[int, int, int, int]]:
    """Merged bounding boxes, ordered row-major. One box per item."""
    alpha = np.array(sheet.split()[3]) > ALPHA_FLOOR
    labels, count = ndimage.label(alpha, structure=np.ones((3, 3)))
    areas = ndimage.sum(alpha, labels, range(1, count + 1))
    slices = ndimage.find_objects(labels)

    items: list[list[int]] = []
    fragments: list[tuple[int, int, int, int]] = []
    for i in range(count):
        ys, xs = slices[i]
        box = [xs.start, ys.start, xs.stop, ys.stop]
        (items if areas[i] >= ITEM_MIN_AREA else fragments).append(box)

    # A fragment belongs to whichever item box it is nearest, but only if it is nearly
    # touching. Anything further away is sheet noise and is dropped.
    for fx0, fy0, fx1, fy1 in fragments:
        best, best_gap = None, FRAGMENT_REACH + 1
        for box in items:
            gap = max(box[0] - fx1, fx0 - box[2], 0) + max(box[1] - fy1, fy0 - box[3], 0)
            if gap < best_gap:
                best, best_gap = box, gap
        if best is not None and best_gap <= FRAGMENT_REACH:
            best[0] = min(best[0], fx0)
            best[1] = min(best[1], fy0)
            best[2] = max(best[2], fx1)
            best[3] = max(best[3], fy1)

    # Row-major order. Rows are a fixed pitch even though columns are not, so the row a
    # box belongs to is its centre bucketed by that pitch.
    pitch = sheet.height / ITEM_ROWS
    items.sort(key=lambda b: (int(((b[1] + b[3]) / 2) // pitch), (b[0] + b[2]) / 2))
    return [tuple(b) for b in items]


def slice_items() -> list[dict]:
    sheet = Image.open(SRC / "items-2.png").convert("RGBA")
    boxes = find_items(sheet)

    expected = [name for row in ITEM_IDS for name in row]
    if len(boxes) != len(expected):
        die(f"found {len(boxes)} items on the sheet, ITEM_IDS names {len(expected)}")

    pitch = sheet.height / ITEM_ROWS
    per_row: dict[int, int] = {}
    for x0, y0, _, y1 in boxes:
        r = int(((y0 + y1) / 2) // pitch)
        per_row[r] = per_row.get(r, 0) + 1
    want = {i: len(row) for i, row in enumerate(ITEM_IDS)}
    if per_row != want:
        die(f"row counts {per_row} do not match ITEM_IDS {want}")

    manifest = []
    for name, (x0, y0, x1, y1) in zip(expected, boxes):
        sprite = Image.new("RGBA", (x1 - x0 + PAD * 2, y1 - y0 + PAD * 2), (0, 0, 0, 0))
        sprite.paste(sheet.crop((x0, y0, x1, y1)), (PAD, PAD))
        path = OUT / f"item-{name}.png"
        sprite.save(path, optimize=True)
        manifest.append({
            "id": name,
            "file": path.name,
            "box": [x0, y0, x1, y1],
            "size": list(sprite.size),
        })
        print(f"  item-{name:<16} box=({x0:4},{y0:4})-({x1:4},{y1:4})  {sprite.size[0]}x{sprite.size[1]}")
    return manifest


# ─── UI and backgrounds ───────────────────────────────────────────────────────

def slice_ui() -> list[dict]:
    sheets: dict[str, Image.Image] = {}
    manifest = []
    for name, (sheet_file, box) in UI_CROPS.items():
        if sheet_file not in sheets:
            sheets[sheet_file] = Image.open(SRC / sheet_file).convert("RGBA")
        crop = sheets[sheet_file].crop(box)
        path = OUT / f"{name}.png"
        crop.save(path, optimize=True)
        manifest.append({"id": name, "file": path.name, "source": sheet_file, "box": list(box)})
        print(f"  {name:<16} {sheet_file} box={box}  {crop.size[0]}x{crop.size[1]}")
    return manifest


def convert_backgrounds() -> list[dict]:
    manifest = []
    for name, src_file in BACKGROUNDS.items():
        im = Image.open(SRC / src_file).convert("RGB")
        path = OUT / f"{name}.jpg"
        im.save(path, "JPEG", quality=JPEG_QUALITY, optimize=True, progressive=True)
        kb = path.stat().st_size / 1024
        manifest.append({"id": name, "file": path.name, "size": list(im.size)})
        print(f"  {name:<16} {im.size[0]}x{im.size[1]}  {kb:.0f} KB")
    return manifest


def main() -> None:
    if not SRC.is_dir():
        die(f"missing source directory {SRC}")
    OUT.mkdir(parents=True, exist_ok=True)

    print("items-2.png")
    items = slice_items()
    print("\nui kit")
    ui = slice_ui()
    print("\nbackgrounds")
    backgrounds = convert_backgrounds()

    (OUT / "manifest.json").write_text(
        json.dumps({"items": items, "ui": ui, "backgrounds": backgrounds}, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"\n{len(items)} items, {len(ui)} ui sprites, {len(backgrounds)} backgrounds -> {OUT}")


if __name__ == "__main__":
    main()
