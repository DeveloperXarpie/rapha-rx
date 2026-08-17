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
SRC = ROOT / "assets-src" / "Garden_Asets"
SHEET = SRC / "Plant_assets.png"
UI_SHEET = SRC / "UI_assets.png"
BACKGROUND = SRC / "garden_background_03.png"
OUT = ROOT / "public" / "garden-assets"

# ─── UI sheet ─────────────────────────────────────────────────────────────────
#
# Measured with a connected-component pass over the alpha channel; the pieces are far
# enough apart that labelling separates them cleanly. The one exception is the glow ring
# and the lantern, which touch: they are split at y=460, the thinnest row between them.
#
# Several pieces carry English text baked into the artwork. They are sliced so nothing is
# lost, but they cannot carry dynamic values or be localised, so the game does not use
# them - see the note in the amendment.
# Pieces the game actually paints. These ship in public/ and land in the PWA precache.
UI_RECTS_USED: dict[str, tuple[int, int, int, int]] = {
    # Measured tight. The merged ring+lantern component starts at x=910 because the
    # lantern is wider, and taking the ring from there dragged in the right edge of the
    # caption plate, which ends at x=948. The ring's own content starts at x=966.
    "ui-glow-ring":     (966, 257, 276, 200),
    "ui-lantern":       (951, 460, 291, 431),
    "ui-badge-can":     (18, 911, 283, 287),
}

# Everything else on the sheet. Sliced so nothing is lost, but written beside the source
# rather than into public/: the service worker precaches all of public/, and shipping a
# megabyte of art no screen references would be paid for on every install.
#
# The first four have English text baked into the artwork, so they can carry neither a
# live value nor a Hindi or Kannada translation. The rest are scenery the board plate
# already provides.
UI_RECTS_SPARE: dict[str, tuple[int, int, int, int]] = {
    "ui-timer-pill":    (16, 30, 309, 220),
    "ui-label-watered": (337, 40, 469, 75),
    "ui-caption-plate": (17, 255, 931, 231),
    "ui-sign":          (30, 481, 372, 416),
    "ui-pause":         (1110, 59, 132, 148),
    "ui-hearts-panel":  (821, 66, 279, 134),
    "ui-bar-track":     (337, 115, 469, 79),
    "ui-watering-can":  (438, 486, 437, 361),
    "ui-arch":          (301, 868, 648, 366),
    "ui-bush":          (951, 909, 294, 322),
}

SPARE_OUT = SRC / "sliced"

# The plate is a painted, photographic-style image with no transparency, so it ships as
# JPEG. As a PNG it is 2.1MB, over Workbox's 2MiB precache ceiling - and raising that
# ceiling would be treating the symptom. 1600px wide is 2x the 800px canvas.
BOARD_OUT_W = 1600
BOARD_JPEG_QUALITY = 86

# The board plate is authored 941 x 1672, taller than the 800 x 1172 board. Cropping to
# the board's aspect keeps the art undistorted; the window is biased upward so the rose
# arch survives, spending the loss on the grass strip below the soil instead.
BOARD_ASPECT_W = 800
BOARD_ASPECT_H = 1172
BACKGROUND_CROP_TOP = 150

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


def stray_blobs(piece: Image.Image) -> int:
    """
    Count disconnected opaque blobs, ignoring specks.

    A correctly cut piece is one blob. More than one means the rect caught a neighbour -
    which is exactly how the glow ring shipped with a slice of the caption plate attached.
    Needs scipy; if it is missing the check is skipped rather than blocking a slice.
    """
    try:
        import numpy as np
        from scipy import ndimage
    except ImportError:
        return 1

    mask = np.array(piece.getchannel("A")) > ALPHA_FLOOR
    labelled, count = ndimage.label(mask, structure=np.ones((3, 3)))
    if count <= 1:
        return count
    sizes = ndimage.sum(mask, labelled, range(1, count + 1))
    # Anything under 0.5% of the piece is a stray pixel, not a fragment.
    floor = 0.005 * mask.size
    return int((sizes > floor).sum())


def slice_ui(measure: bool) -> int:
    """Cut the UI sheet into its pieces, trimming each to its own alpha bounds."""
    if not UI_SHEET.exists():
        print(f"ui sheet not found: {UI_SHEET}", file=sys.stderr)
        return 0
    sheet = Image.open(UI_SHEET).convert("RGBA")
    written = 0
    if not measure:
        SPARE_OUT.mkdir(parents=True, exist_ok=True)

    for rects, dest, label in ((UI_RECTS_USED, OUT, "ship"), (UI_RECTS_SPARE, SPARE_OUT, "spare")):
        for name, (x, y, w, h) in rects.items():
            piece = sheet.crop((x, y, x + w, y + h))
            # Trim to the real content: the measured rects are generous by a pixel or two.
            box = piece.getchannel("A").point(lambda v: 255 if v > ALPHA_FLOOR else 0).getbbox()
            if box:
                piece = piece.crop(box)
            blobs = stray_blobs(piece)
            warn = "  <-- CHECK: rect caught a neighbour" if dest is OUT and blobs > 1 else ""
            print(f"  [{label}] {name}: {piece.width}x{piece.height} blobs={blobs}{warn}")
            if not measure:
                piece.save(dest / f"{name}.png")
                if dest is OUT:
                    written += 1
    return written


def slice_background(measure: bool) -> int:
    """
    Crop the board plate to the board's aspect and report where its soil bed lands.

    The soil rectangle is what the bed geometry has to agree with, so it is measured here
    rather than eyeballed: `BED` in geometry.ts is derived from the fractions printed.
    """
    if not BACKGROUND.exists():
        print(f"background not found: {BACKGROUND}", file=sys.stderr)
        return 0

    im = Image.open(BACKGROUND).convert("RGB")
    target_h = round(im.width * BOARD_ASPECT_H / BOARD_ASPECT_W)
    top = BACKGROUND_CROP_TOP
    bottom = min(im.height, top + target_h)
    cropped = im.crop((0, top, im.width, bottom))

    # Soil is the brown plate: red above green above blue, mid brightness, little blue.
    px = cropped.load()
    w, h = cropped.size
    cols = [0] * w
    rows = [0] * h
    for yy in range(h):
        for xx in range(w):
            r, g, b = px[xx, yy]
            if r > g + 18 and g > b + 8 and 70 < r < 190 and b < 120:
                cols[xx] += 1
                rows[yy] += 1
    xs = [i for i, v in enumerate(cols) if v > h * 0.15]
    ys = [i for i, v in enumerate(rows) if v > w * 0.30]

    print(f"  board plate: {w}x{h} (cropped {top}..{bottom} of {im.height})")
    if xs and ys:
        print(f"  soil bed: x {xs[0]}..{xs[-1]}  y {ys[0]}..{ys[-1]}")
        print(f"  soil as fractions: x {xs[0] / w:.4f}..{xs[-1] / w:.4f}  "
              f"y {ys[0] / h:.4f}..{ys[-1] / h:.4f}")
        print(f"  -> on a {BOARD_ASPECT_W}x{BOARD_ASPECT_H} board: "
              f"x {round(xs[0] / w * BOARD_ASPECT_W)}..{round(xs[-1] / w * BOARD_ASPECT_W)}  "
              f"y {round(ys[0] / h * BOARD_ASPECT_H)}..{round(ys[-1] / h * BOARD_ASPECT_H)}")
    else:
        print("  soil bed: NOT DETECTED", file=sys.stderr)

    if measure:
        return 0

    out = cropped.resize((BOARD_OUT_W, round(BOARD_OUT_W * cropped.height / cropped.width)),
                         Image.LANCZOS)
    path = OUT / "board.jpg"
    out.save(path, quality=BOARD_JPEG_QUALITY, optimize=True, progressive=True)
    print(f"  wrote {path.name}: {out.width}x{out.height}, {path.stat().st_size // 1024} KiB")
    return 1


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

    print("\nUI sheet:")
    written += slice_ui(args.measure)

    print("\nBoard plate:")
    written += slice_background(args.measure)

    if args.measure:
        print("\nmeasure only, nothing written")
    else:
        print(f"\nwrote {written} files to {OUT.relative_to(ROOT)}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
