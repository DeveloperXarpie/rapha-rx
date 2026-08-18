"""
Slice the Serve the Guests art into `public/cook-assets/`.

Four sheets feed this game, each owning a different part of the board:

    assets-src/tiffin/food.png       the 22 dishes
    assets-src/tiffin/panels-1.png   the MAKE / COOKING / SERVE buttons
    assets-src/tiffin/panel-2.png    the DISPOSE button
    public/Dar_assets_01.png         the order bubble, score capsule, bars, coin, props

`assets-src/tiffin/bg-new.png` also becomes `public/bg_cook.jpg`, so the board's art has one
command behind all of it.

Every sheet arrives already matted - each piece has clean alpha and its own soft drop
shadow - so this is a crop, not a cutout. The rects below are the measured alpha bounding
box of each piece; re-derive them with `--measure <sheet>` if a sheet is ever redrawn.

The mouldy dishes are the exception: there is no spoiled art, so `spoil` below paints it.

    python scripts/slice_cook_assets.py

Requires Pillow (and numpy/scipy for --measure). Writes to public/cook-assets/, overwriting.
"""

from __future__ import annotations

import argparse
import math
import pathlib
import random
import sys

from PIL import Image, ImageFilter

ROOT = pathlib.Path(__file__).resolve().parent.parent
TIFFIN = ROOT / "assets-src" / "tiffin"
UI_SHEET = ROOT / "public" / "Dar_assets_01.png"
FOOD_SHEET = TIFFIN / "food.png"
BUTTON_SHEET = TIFFIN / "panels-1.png"
DISPOSE_SHEET = TIFFIN / "panel-2.png"
BACKGROUND = TIFFIN / "bg-new.png"

OUT = ROOT / "public" / "cook-assets"
BACKGROUND_OUT = ROOT / "public" / "bg_cook.jpg"

# ─── Output budget ────────────────────────────────────────────────────────────

# This game is played on care-home tablets over whatever connection the home has, and the
# board blocks on `useImagesReady` before the patience clock starts - so every kilobyte here
# is time a resident spends looking at a loading line. Straight crops of these sheets came
# to 9MB; the three rules below bring that under 1.5MB with no visible difference.

# 1. Everything is quantised to a 255-colour palette (leaving one index for transparency).
#    The art is flat cel shading, so a palette holds it: a dish goes 100K -> 22K, and at 2x
#    zoom the quantised and truecolour versions are indistinguishable.
PALETTE_COLOURS = 255

# 2. Buttons are drawn ~178 design px wide but ship at 1146-1509. Downscaling to this keeps
#    them past 2x for a hi-DPI tablet and takes the four of them from 2.5MB to under 80K.
#    Dishes are left at their native ~250px, which is already about 1x for their 216px slot.
BUTTON_W = 480

# 3. The background has no transparency and is the single largest asset, so it ships as a
#    progressive JPEG: 1.9MB -> ~240K. Quality is high enough that the painted tray's bevel,
#    which the card geometry is measured against, stays crisp.
BACKGROUND_QUALITY = 88

# ─── Dishes ───────────────────────────────────────────────────────────────────

# (id, x, y, w, h) in sheet order: the south Indian tiffin first, then the north Indian
# plates and the sweets. IDs are what `sprites.ts` and the saved order data key off, so
# they are stable even if the sheet is re-laid-out - only the rects move.
#
# Dal Makhani and Rajma Chawal are the one pair the alpha scan cannot separate: the kadai's
# right handle overlaps the rajma bowl, so `--measure` returns them as a single 483px box.
# They are split by hand at x=1019, between the handle's tip and the bowl's rim.
DISHES = [
    ("plain-dosa",       13,  25, 255, 237),
    ("masala-dosa",     284,  46, 241, 211),
    ("idly",            536,  63, 239, 201),
    ("uddin-vada",      790,  62, 235, 195),
    ("filter-coffee",  1058,  65, 183, 190),
    ("coconut-chutney",  21, 296, 202, 185),
    ("sambar",          270, 287, 230, 195),
    ("chutney-sambar",  526, 317, 237, 166),
    ("samosa",          780, 284, 233, 198),
    ("pakora",         1027, 288, 221, 195),
    ("aloo-paratha",      7, 517, 247, 200),
    ("chole-bhature",   265, 504, 249, 215),
    ("butter-chicken",  518, 521, 256, 199),
    ("dal-makhani",     766, 515, 253, 201),
    ("rajma-chawal",   1019, 515, 230, 201),
    ("kadhi-chawal",      4, 743, 238, 208),
    ("paneer-tikka",    250, 729, 264, 227),
    ("tandoori-chicken", 518, 741, 254, 212),
    ("amritsari-kulcha", 778, 749, 253, 208),
    ("gulab-jamun",    1035, 754, 214, 194),
    ("jalebi",          322, 967, 289, 231),
    ("gajar-ka-halwa",  646, 979, 255, 214),
]

# ─── Buttons ──────────────────────────────────────────────────────────────────

# The three state pills share one sheet, stacked. DISPOSE has a sheet to itself, where the
# painted red glow around the pill is already fully transparent, so it crops like the rest.
#
# DISPOSE is the odd one: its bin and stink lines rise well above the pill, so it is 2.66:1
# where the other three are ~3.24:1. The view sizes all four by width and bottom-aligns them,
# which puts every pill on one baseline and lets the bin overhang - see `BUTTONS` in
# `sprites.ts`. That only holds because the pill is the lowest painted thing in all four.
BUTTON_RECTS = {
    "btn-make":    (BUTTON_SHEET, (54, 80, 1146, 354)),
    "btn-cooking": (BUTTON_SHEET, (52, 448, 1150, 354)),
    "btn-serve":   (BUTTON_SHEET, (52, 818, 1151, 362)),
    "btn-dispose": (DISPOSE_SHEET, (12, 194, 1509, 567)),
}

# ─── UI furniture, still cut from the original sheet ──────────────────────────

UI_RECTS = {
    # Superseded by btn-dispose, but still cut so the sheet's output is accounted for.
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


# ─── Spoiling ─────────────────────────────────────────────────────────────────

# The dish sheet ships fresh plates only, but the card cross-fades a mouldy counterpart in
# over the last seconds of the READY window - that fade is the player's warning that a plate
# is about to be wasted, so it has to read as mould rather than as a colour filter. Two
# things together get there: the whole plate goes dull, and grey-green blotches settle on it.

# How far the fresh colour is pulled toward its own greyscale, and then darkened.
DESATURATE = 0.45
DARKEN = 0.86
# A cold green cast over everything, which is what stops the dull plate reading as "shadowed".
CAST = (108, 122, 78)
CAST_MIX = 0.14

# Blotches are drawn onto a mask with a solid core and a soft rim, then blurred slightly.
# A flat disc at partial opacity reads as a colour wash rather than as mould, so the core
# has to stay opaque and only the edge feather. Count scales with area so a small chutney
# bowl is not carpeted.
BLOTCH_PER_10K_PX = 5.5
BLOTCH_R_MIN = 6
BLOTCH_R_MAX = 17
# Fraction of the radius that stays fully opaque before the rim starts falling away.
BLOTCH_CORE = 0.45
BLOTCH_BLUR = 1.8
BLOTCH_ALPHA = 0.88
MOULD = (104, 124, 74)

# The spores: hard dark dots scattered inside each blotch. These are what stop the mould
# reading as a smudge - a fuzzy patch alone looks like a stain, dots look alive.
SPECK_PER_BLOTCH = (3, 7)
SPECK_R = (1, 3)
SPECK_ALPHA = 0.9
SPECK = (52, 68, 38)

# Specular highlights on the steel keep their shine: blotches are held off anything this
# bright, so a mouldy plate still looks like it is sitting in a real bowl. Set high enough
# that pale food - rice, idly, cream - still takes mould.
SPECULAR_V = 0.97


def spoil(img: Image.Image, seed: str) -> Image.Image:
    """Paint the mouldy counterpart of a fresh dish crop.

    Deterministic in `seed`, so re-running the slicer reproduces the same plate rather than
    churning the committed art. Alpha is carried through untouched, so the mouldy crop lines
    up with the fresh one pixel for pixel and the cross-fade does not shift the dish.
    """
    src = img.convert("RGBA")
    w, h = src.size
    px = src.load()

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    op = out.load()

    # Dull pass.
    for y in range(h):
        for x in range(w):
            r, g, b, a = px[x, y]
            if a == 0:
                continue
            lum = 0.299 * r + 0.587 * g + 0.114 * b
            r = r + (lum - r) * DESATURATE
            g = g + (lum - g) * DESATURATE
            b = b + (lum - b) * DESATURATE
            r = r + (CAST[0] - r) * CAST_MIX
            g = g + (CAST[1] - g) * CAST_MIX
            b = b + (CAST[2] - b) * CAST_MIX
            op[x, y] = (
                int(max(0, min(255, r * DARKEN))),
                int(max(0, min(255, g * DARKEN))),
                int(max(0, min(255, b * DARKEN))),
                a,
            )

    # Blotch and speck masks. Both are built first and composited after, so overlapping
    # blotches blend into one patch instead of stacking to a solid.
    rng = random.Random(seed)
    blotches = Image.new("L", (w, h), 0)
    specks = Image.new("L", (w, h), 0)
    bp = blotches.load()
    sp = specks.load()

    def takes_mould(x: int, y: int) -> bool:
        r, g, b, a = px[x, y]
        return a >= 40 and max(r, g, b) / 255 <= SPECULAR_V

    def stamp(target, cx: int, cy: int, radius: int, core: float) -> None:
        solid = radius * core
        for y in range(max(0, cy - radius), min(h, cy + radius + 1)):
            for x in range(max(0, cx - radius), min(w, cx + radius + 1)):
                d = math.hypot(x - cx, y - cy)
                if d > radius or not takes_mould(x, y):
                    continue
                # Opaque core, then a linear falloff to nothing at the rim.
                v = 255 if d <= solid else int(255 * (1 - (d - solid) / max(1e-6, radius - solid)))
                if v > target[x, y]:
                    target[x, y] = v

    count = max(5, int(w * h / 10_000 * BLOTCH_PER_10K_PX))
    placed = 0
    attempts = 0
    while placed < count and attempts < count * 40:
        attempts += 1
        cx, cy = rng.randrange(w), rng.randrange(h)
        if px[cx, cy][3] < 200:
            continue
        radius = rng.randint(BLOTCH_R_MIN, BLOTCH_R_MAX)
        stamp(bp, cx, cy, radius, BLOTCH_CORE)
        for _ in range(rng.randint(*SPECK_PER_BLOTCH)):
            angle = rng.uniform(0, 2 * math.pi)
            dist = rng.uniform(0, radius * 0.8)
            stamp(sp, int(cx + math.cos(angle) * dist), int(cy + math.sin(angle) * dist),
                  rng.randint(*SPECK_R), 0.7)
        placed += 1

    blotches = blotches.filter(ImageFilter.GaussianBlur(BLOTCH_BLUR))
    bp, sp = blotches.load(), specks.load()

    # Composite the mould through the masks, never outside the dish's own alpha.
    for y in range(h):
        for x in range(w):
            r, g, b, a = op[x, y]
            if a == 0:
                continue
            for mask_px, colour, strength in ((bp, MOULD, BLOTCH_ALPHA), (sp, SPECK, SPECK_ALPHA)):
                m = mask_px[x, y]
                if m == 0:
                    continue
                k = (m / 255) * strength
                r = r + (colour[0] - r) * k
                g = g + (colour[1] - g) * k
                b = b + (colour[2] - b) * k
            op[x, y] = (int(r), int(g), int(b), a)

    return out


# ─── Slicing ──────────────────────────────────────────────────────────────────


def slice_all() -> list[tuple[str, tuple[int, int]]]:
    OUT.mkdir(parents=True, exist_ok=True)
    written: list[tuple[str, tuple[int, int]]] = []

    def write(name: str, img: Image.Image) -> None:
        img.quantize(colors=PALETTE_COLOURS, method=Image.Quantize.FASTOCTREE).save(
            OUT / f"{name}.png", optimize=True
        )
        written.append((name, img.size))

    def crop(sheet: Image.Image, rect: tuple[int, int, int, int]) -> Image.Image:
        x, y, w, h = rect
        return sheet.crop((x, y, x + w, y + h))

    food = Image.open(FOOD_SHEET).convert("RGBA")
    for dish_id, x, y, w, h in DISHES:
        fresh = crop(food, (x, y, w, h))
        write(f"dish-{dish_id}", fresh)
        write(f"dish-{dish_id}-spoiled", spoil(fresh, dish_id))

    sheets: dict[pathlib.Path, Image.Image] = {}
    for name, (path, rect) in BUTTON_RECTS.items():
        if path not in sheets:
            sheets[path] = Image.open(path).convert("RGBA")
        button = crop(sheets[path], rect)
        height = round(BUTTON_W * button.height / button.width)
        write(name, button.resize((BUTTON_W, height), Image.LANCZOS))

    ui = Image.open(UI_SHEET).convert("RGBA")
    for name, rect in UI_RECTS.items():
        img = crop(ui, rect)
        if name == "ui-capsule":
            img = repaint_capsule(img)
        write(name, img)

    background = Image.open(BACKGROUND).convert("RGB")
    background.save(BACKGROUND_OUT, quality=BACKGROUND_QUALITY, optimize=True, progressive=True)
    written.append(("../bg_cook.jpg", background.size))

    return written


def measure(path: pathlib.Path) -> None:
    """Print the alpha bounding box of every piece on a sheet, to re-derive the rects above."""
    import numpy as np
    from scipy import ndimage

    sheet = Image.open(path).convert("RGBA")
    alpha = np.array(sheet.split()[3]) > 16
    labels, _ = ndimage.label(alpha)
    boxes = []
    for ys, xs in ndimage.find_objects(labels):
        w, h = xs.stop - xs.start, ys.stop - ys.start
        if w >= 24 and h >= 24:
            boxes.append((xs.start, ys.start, w, h))
    for box in sorted(boxes, key=lambda b: (b[1] // 80, b[0])):
        print(box)


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--measure", metavar="SHEET", help="print a sheet's piece rects and exit")
    args = parser.parse_args()

    if args.measure:
        measure(pathlib.Path(args.measure))
        return 0

    missing = [p for p in (UI_SHEET, FOOD_SHEET, BUTTON_SHEET, DISPOSE_SHEET, BACKGROUND) if not p.exists()]
    if missing:
        for p in missing:
            print(f"sheet not found: {p}", file=sys.stderr)
        return 1

    for name, size in slice_all():
        print(f"{name} {size[0]}x{size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
