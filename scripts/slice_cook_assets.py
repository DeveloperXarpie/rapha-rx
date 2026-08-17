"""
Slice `public/Dar_assets_01.png` into the individual Serve the Guests assets.

The sheet arrives already matted - every piece has clean alpha and its own soft drop
shadow - so this is a crop, not a cutout. The rects below are the measured alpha bounding
box of each piece; re-derive them with `--measure` if the sheet is ever redrawn.

    python scripts/slice_cook_assets.py

Requires Pillow. Writes to public/cook-assets/, overwriting.
"""

from __future__ import annotations

import argparse
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / "public" / "Dar_assets_01.png"
OUT = ROOT / "public" / "cook-assets"

# Dish IDs in sheet order. The sheet lays the fresh eight out left to right across two
# rows, then repeats the same eight mouldy on the right half - so one list drives both.
DISH_IDS = [
    "plain-dosa",
    "masala-dosa",
    "idly",
    "vada",
    "chutney",
    "sambar",
    "combo",
    "coffee",
]

# (x, y, w, h) per dish, fresh then spoiled, in DISH_IDS order.
FRESH_RECTS = [
    (26, 25, 191, 159),
    (229, 31, 184, 157),
    (419, 49, 176, 136),
    (608, 50, 163, 144),
    (36, 218, 131, 122),
    (201, 198, 168, 151),
    (394, 208, 215, 142),
    (628, 202, 140, 148),
]

SPOILED_RECTS = [
    (810, 43, 170, 158),
    (995, 39, 168, 160),
    (1184, 51, 159, 138),
    (1366, 52, 135, 129),
    (815, 219, 132, 122),
    (978, 202, 154, 145),
    (1148, 204, 203, 146),
    (1367, 197, 141, 153),
]

UI_RECTS = {
    "ui-btn-clear": (56, 392, 116, 122),
    "ui-bubble-sm": (359, 382, 162, 128),
    "ui-bubble-md": (555, 383, 164, 131),
    # The panel is split at its body/tail seam. Keeping the tail in the frame would force a
    # 66px left inset - wide enough to hold the tail inside the one corner tile border-image
    # never stretches - and that inset is also the content padding, which would shove the
    # bubble's contents two thirds of the way across it. Split, the frame insets are just the
    # corner radius and the tail is placed against the seam as its own sprite.
    "ui-panel": (1168, 563, 194, 180),
    "ui-panel-tail": (1188, 743, 47, 20),
    "ui-capsule": (68, 550, 240, 103),
    "ui-bar-track": (790, 591, 332, 53),
    "ui-bar-fill": (793, 662, 326, 47),
    "ui-coin": (631, 555, 122, 123),
    "prop-leaf": (745, 389, 201, 131),
    "prop-bowl-sm": (974, 394, 156, 128),
    "prop-bowl-lg": (1167, 399, 179, 122),
    "prop-tumbler": (1398, 391, 92, 130),
}

# ─── Capsule repaint ──────────────────────────────────────────────────────────

# The capsule art has a gold coin and the literal text "000" painted into it, so it cannot
# show a live score. The repaint samples from this column, the clean cream gap between the
# coin and the text, and insets by this much from the silhouette to spare the painted bevel.
CAPSULE_CLEAN_COL = 96
CAPSULE_BEVEL = 9


def repaint_capsule(img: Image.Image) -> Image.Image:
    """Erase the coin and the painted `000`, leaving a reusable frame.

    The interior's shading runs purely vertically, so painting each row with the colour
    sampled from a clean column of that same row reproduces it exactly rather than
    approximately. Each row is repainted between its own opaque edges rather than inside a
    fixed rectangle, so the rounded corners are followed instead of being cut across.
    """
    out = img.copy()
    px = out.load()
    w, h = out.size
    for y in range(h):
        opaque = [x for x in range(w) if px[x, y][3] > 200]
        if not opaque:
            continue
        left, right = opaque[0] + CAPSULE_BEVEL, opaque[-1] - CAPSULE_BEVEL
        if right <= left:
            continue
        fill = px[CAPSULE_CLEAN_COL, y]
        if fill[3] < 200:
            continue
        for x in range(left, right + 1):
            px[x, y] = fill
    return out


# ─── Slicing ──────────────────────────────────────────────────────────────────


def slice_all(sheet: Image.Image) -> list[tuple[str, tuple[int, int]]]:
    OUT.mkdir(parents=True, exist_ok=True)
    written: list[tuple[str, tuple[int, int]]] = []

    def write(name: str, rect: tuple[int, int, int, int]) -> None:
        x, y, w, h = rect
        img = sheet.crop((x, y, x + w, y + h))
        if name == "ui-capsule":
            img = repaint_capsule(img)
        img.save(OUT / f"{name}.png")
        written.append((name, img.size))

    for dish_id, rect in zip(DISH_IDS, FRESH_RECTS):
        write(f"dish-{dish_id}", rect)
    for dish_id, rect in zip(DISH_IDS, SPOILED_RECTS):
        write(f"dish-{dish_id}-spoiled", rect)
    for name, rect in UI_RECTS.items():
        write(name, rect)

    return written


def measure(sheet: Image.Image) -> None:
    """Print the alpha bounding box of every piece, to re-derive the rects above."""
    import numpy as np
    from scipy import ndimage

    alpha = np.array(sheet.split()[3]) > 16
    labels, _ = ndimage.label(alpha)
    boxes = []
    for ys, xs in ndimage.find_objects(labels):
        w, h = xs.stop - xs.start, ys.stop - ys.start
        if w >= 12 and h >= 12:
            boxes.append((xs.start, ys.start, w, h))
    for box in sorted(boxes, key=lambda b: (b[1] // 60, b[0])):
        print(box)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measure", action="store_true", help="print component rects and exit")
    args = parser.parse_args()

    if not SHEET.exists():
        print(f"sheet not found: {SHEET}", file=sys.stderr)
        return 1

    sheet = Image.open(SHEET).convert("RGBA")

    if args.measure:
        measure(sheet)
        return 0

    for name, size in slice_all(sheet):
        print(f"{name}.png {size[0]}x{size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
