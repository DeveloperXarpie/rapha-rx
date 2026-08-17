"""
Slice `assets-src/Garden_Asets/Plant_assets.png` into the individual Garden Keeper sprites.

The sheet arrives with clean alpha, so this is a crop rather than a cutout. It is laid out
as a 5 x 6 grid:

    row 0   sprout, then four seeds
    row 1   five more seeds
    row 2   five flowers in bloom
    row 3   five more flowers in bloom
    row 4   the row 2 flowers, wilted
    row 5   the row 3 flowers, wilted

The columns separate cleanly on an alpha projection, but the rows do not: the blooms are
tall enough to overlap the bands above and below, so a regular 1024/6 pitch clips them top
and bottom. Instead each row boundary is placed at the thinnest point of the column's own
opacity profile, searched within +/- 46px of where an even pitch would put it. The real
rows turn out to be uneven (roughly 149/295/483/661/835), which is why the even pitch
cannot work.

A few boundaries still carry a little opacity - a leaf tip crossing into the next cell.
That is unavoidable on this sheet and costs at most a few stray pixels.

    python scripts/slice_garden_assets.py            # write sprites
    python scripts/slice_garden_assets.py --measure  # print boxes, write nothing

Requires Pillow. Writes to public/garden-assets/, overwriting.
"""

from __future__ import annotations

import argparse
import pathlib
import sys

from PIL import Image

ROOT = pathlib.Path(__file__).resolve().parent.parent
SHEET = ROOT / "assets-src" / "Garden_Asets" / "Plant_assets.png"
OUT = ROOT / "public" / "garden-assets"

ROWS = 6
# Measured alpha-projection column bands. Re-derive with --measure if the sheet is redrawn.
COL_BANDS = [(76, 301), (362, 611), (652, 883), (931, 1171), (1231, 1460)]

# Ten flower species, in sheet order: row 2 holds the first five, row 3 the last five.
FLOWERS = [
    "rose", "sunflower", "lily", "hydrangea", "daisy",
    "marigold", "hibiscus", "aster", "daffodil", "peony",
]

# Row 0 and row 1 are the pre-bloom stages. Only `sprout` is used by the game today; the
# seeds are sliced anyway so a later stage change does not need the sheet again.
SEED_NAMES = [
    "sprout", "seed-striped", "seed-pumpkin", "seed-corn", "seed-cocoa",
    "seed-speckled", "seed-almond", "seed-cacao", "seed-white", "seed-peas",
]

# Alpha at or below this counts as empty when finding a sprite's bounding box.
ALPHA_FLOOR = 8
# How far a row boundary may move from its nominal position to find the thinnest cut.
SEARCH = 46


def cell_name(row: int, col: int) -> str:
    """Sprite id for a grid cell."""
    if row < 2:
        return SEED_NAMES[row * 5 + col]
    if row < 4:
        return f"{FLOWERS[(row - 2) * 5 + col]}-bloom"
    return f"{FLOWERS[(row - 4) * 5 + col]}-wilted"


def row_cuts(sheet: Image.Image, col: int) -> list[int]:
    """
    Row boundaries for one column, placed where that column is thinnest.

    An even pitch clips the tall blooms, so each interior boundary is nudged to the
    minimum of the opacity profile within SEARCH px of its nominal position.
    """
    left, right = COL_BANDS[col]
    band = sheet.crop((left, 0, right + 1, sheet.height)).getchannel("A")
    # One pass over the band, counting opaque pixels per row.
    width = band.width
    pixels = band.load()
    profile = [
        sum(1 for x in range(width) if pixels[x, y] > ALPHA_FLOOR)
        for y in range(sheet.height)
    ]

    cuts = [0]
    for k in range(1, ROWS):
        nominal = int(round(k * sheet.height / ROWS))
        lo = max(0, nominal - SEARCH)
        hi = min(sheet.height - 1, nominal + SEARCH)
        window = profile[lo:hi + 1]
        cuts.append(lo + window.index(min(window)))
    cuts.append(sheet.height)
    return cuts


def sprite_box(sheet: Image.Image, row: int, col: int, cuts: list[int]) -> tuple[int, int, int, int] | None:
    """Alpha bounding box of one cell, in sheet coordinates."""
    top, bottom = cuts[row], cuts[row + 1]
    left, right = COL_BANDS[col]

    cell = sheet.crop((left, top, right + 1, bottom))
    mask = cell.getchannel("A").point(lambda v: 255 if v > ALPHA_FLOOR else 0)
    box = mask.getbbox()
    if box is None:
        return None
    x0, y0, x1, y1 = box
    return (left + x0, top + y0, left + x1, top + y1)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measure", action="store_true", help="print boxes without writing")
    args = parser.parse_args()

    if not SHEET.exists():
        print(f"sheet not found: {SHEET}", file=sys.stderr)
        return 1

    sheet = Image.open(SHEET).convert("RGBA")
    if not args.measure:
        OUT.mkdir(parents=True, exist_ok=True)

    written = 0
    for col in range(len(COL_BANDS)):
        cuts = row_cuts(sheet, col)
        for row in range(ROWS):
            name = cell_name(row, col)
            box = sprite_box(sheet, row, col, cuts)
            if box is None:
                print(f"  {name}: EMPTY CELL", file=sys.stderr)
                continue
            x0, y0, x1, y1 = box
            print(f"  {name}: x={x0} y={y0} w={x1 - x0} h={y1 - y0}")
            if not args.measure:
                sheet.crop(box).save(OUT / f"{name}.png")
                written += 1

    if args.measure:
        print("\nmeasure only, nothing written")
    else:
        print(f"\nwrote {written} sprites to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
