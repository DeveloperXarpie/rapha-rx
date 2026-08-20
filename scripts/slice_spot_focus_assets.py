"""
Slice the Spot Focus art set into public/spot-assets/.

Run from the repo root:

    python scripts/slice_spot_focus_assets.py

Both atlases hold ten rows of ten objects, but the rows are not on an even pitch and the
objects are drawn larger than their share of the sheet, so neither a plain cell crop nor
plain component labelling produces clean sprites.

The grid is therefore measured, not assumed: the nine gutters between the rows are found
as the emptiest lines near where an even split would fall. Atlas 1's row gaps run from
134 pixels down to 111, so an even split puts grid lines straight through the objects in
the lower rows.

The objects are drawn larger than their cells and spill across the boundaries, so
cropping a cell drags in a slice of whatever sits next door. Labelling does not rescue
it: atlas 2 gives 107 components for 100 objects because some objects break into pieces
while others touch a neighbour and fuse into one blob. The detergent bottle and the
pliers are a single component, so no assignment of components to cells can separate them.

So ownership is settled against each cell's core - its central half - rather than the
cell. A component reaching one core is one object and stays whole, overflow included. A
component reaching two cores is a genuine fusion and is cut at the neck between them by
a watershed. Each sprite is then masked to the pixels it owns, so the saved PNG is
transparent everywhere a neighbour reached in.

The UI kit is not sliced beyond two ornaments. It paints English text into the
signboard, both ribbons and the instruction line, and the app ships in English, Hindi
and Kannada, so those pieces are rebuilt in CSS from the kit's palette. Only the daisy
sprigs carry no text and cannot be drawn in CSS.

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
from skimage.segmentation import watershed

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "assets-src" / "Spot_Focus_Assets"
OUT = ROOT / "public" / "spot-assets"

GRID = 10
ALPHA_FLOOR = 40
# Transparent margin kept around each sprite so it never renders flush to its edge.
PAD = 2
# Below this much alpha a cell is empty, which means the id table is out of step with
# the sheet rather than that the artist left a gap.
CELL_MIN_ALPHA = 500
# Half-width of a cell's core, as a fraction of the cell. The core is the central region
# an object always fills and an overflowing neighbour never reaches.
CORE_HALF = 0.25
# A fragment further than this from any sprite is sheet noise and is dropped.
ORPHAN_REACH = 30
# How far either side of an even split to hunt for the real gutter, as a fraction of
# the nominal pitch.
SEAM_WINDOW = 0.30
JPEG_QUALITY = 88

# The signboard, as three pieces cut from one cleaned plank.
#
# The kit paints "Can you spot the Differences?" into the wood and this app ships in
# English, Hindi and Kannada, so the heading has to be live text. An earlier version drew
# the plank in CSS between two sliced end caps, and the join showed: two framed blocks
# butted against a flat gradient, reading as an overlap rather than a board.
#
# So the lettering is erased from the plank first (see `clean_plank`) and all three
# pieces are cut from that, over the same rows. Rendered at a common height they are the
# same wood at the same scale, and the middle tiles between the caps without a seam.
SIGN_Y0, SIGN_Y1 = 170, 372
# The middle is a six-pixel column of wood taken from beside the lettering rather than
# from behind it. Cut from the repaired area it tiles the repair's own edges into a row
# of faint dashes; cut from clean wood it carries the true top-to-bottom colour and
# repeats invisibly. Everything outside the plank's rows is cleared, because that column
# also passes under a sprig.
SIGN_CROPS: dict[str, tuple[int, int]] = {
    "ui-plank-left": (14, 130),
    "ui-plank-mid": (124, 130),
    "ui-plank-right": (494, 612),
}

# The lettering to erase: dark, warm, and well inside the plank's own frame.
TEXT_BOX = (125, 203, 500, 358)
# Clean wood columns either side of it - past the left sprig's leaves, which reach x 109,
# and short of the right sprig, which starts at x 497.
WOOD_LEFT = (118, 130)
WOOD_RIGHT = (492, 496)
PLANK_ROWS = (198, 362)

# Names transcribed from items_01_100_items.docx, kebab-cased, in atlas order.
# "Globe" is named twice; the second is suffixed so the filenames stay unique. It is
# sliced but omitted from src/games/attention/SpotFocus/items.ts, because the two cells
# are the same object and an invisible difference is unfindable.
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

# Names transcribed from items_02_100_items.docx.
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


def find_seams(profile: np.ndarray) -> list[int]:
    """
    The nine gutters between ten rows or columns of artwork.

    The atlases are not on a uniform pitch. Measured row gaps in atlas 1 run 134, 136,
    128, 132, 123, 123, 116, 111 pixels, so dividing the image by ten puts the grid lines
    through the middle of the objects near the bottom - which was the root of every
    slicing problem this script went through before the seams were measured rather than
    assumed.

    Each gutter is the emptiest column of pixels in a window around where an even split
    would have put it.
    """
    filled = np.where(profile > 0)[0]
    lo, hi = int(filled.min()), int(filled.max())
    pitch = (hi - lo + 1) / GRID

    seams = []
    for k in range(1, GRID):
        centre = lo + k * pitch
        window = slice(int(centre - pitch * SEAM_WINDOW), int(centre + pitch * SEAM_WINDOW))
        seams.append(int(window.start + np.argmin(profile[window])))
    return seams


def cell_bounds(profile: np.ndarray, size: int) -> list[tuple[int, int]]:
    """Ten (start, stop) spans, from the measured gutters."""
    edges = [0, *find_seams(profile), size]
    return [(edges[i], edges[i + 1]) for i in range(GRID)]


def split_fusion(
    pixels: np.ndarray,
    claimants: list[int],
    core: np.ndarray,
) -> dict[int, np.ndarray]:
    """
    Separate two or more objects that touch and were labelled as one component.

    Cutting along the cell boundary is the obvious move and it is wrong: the frame that
    overflows into the rubber duck's cell then hands the duck a strip of frame. The seam
    between two touching objects is the narrow neck where they meet, which is what a
    watershed on the distance transform finds.

    Each claiming cell contributes one marker, placed at the deepest point of the blob
    inside that cell's core. Seeding from the core rather than the whole cell is what
    keeps the marker inside the cell's own object: seeded from the whole cell it can land
    in the neighbour's overflow instead, and then the two objects come out swapped.
    """
    distance = ndimage.distance_transform_edt(pixels)

    markers = np.zeros(pixels.shape, dtype=np.int32)
    for i, c in enumerate(claimants, start=1):
        region = pixels & (core == c)
        if not region.any():
            continue
        deepest = np.unravel_index(np.argmax(np.where(region, distance, -1)), distance.shape)
        markers[deepest] = i

    basins = watershed(-distance, markers, mask=pixels)
    return {c: basins == i for i, c in enumerate(claimants, start=1)}


def clean_plank(sheet: Image.Image) -> Image.Image:
    """
    Erase the baked-in heading from the signboard, leaving bare wood.

    The letters are anti-aliased into the grain, so no threshold catches their fringe
    without also eating the grain itself; the mask is grown instead. The hole is then
    filled by blending between the clean wood either side of the lettering, row by row.
    The plank's colour varies down the board and barely across it, so a straight
    horizontal blend rebuilds it convincingly - and the live heading lands over the same
    area anyway.

    Sampling the replacement colour from inside the text box was tried first and fails:
    on the rows the lettering fills, there is too little clean wood left to measure, and
    those rows come through with the original text intact.
    """
    a = np.array(sheet).astype(int)
    tx0, ty0, tx1, ty1 = TEXT_BOX

    region = np.zeros(a.shape[:2], bool)
    region[ty0:ty1, tx0:tx1] = True
    core = (
        region
        & (a[:, :, 3] > 80)
        & (a[:, :, :3].max(axis=2) < 135)
        & (a[:, :, 0] >= a[:, :, 1])       # letters are warm; the sprig leaves are green
    )
    mask = ndimage.binary_dilation(core, np.ones((3, 3)), iterations=4) & region

    out = a.copy()
    xs = np.arange(tx0, tx1)
    t = ((xs - tx0) / (tx1 - tx0))[:, None]
    for y in range(*PLANK_ROWS):
        left = a[y, WOOD_LEFT[0]:WOOD_LEFT[1], :3].mean(axis=0)
        right = a[y, WOOD_RIGHT[0]:WOOD_RIGHT[1], :3].mean(axis=0)
        blend = left[None, :] * (1 - t) + right[None, :] * t
        row = mask[y, tx0:tx1]
        if not row.any():
            continue
        out[y, tx0:tx1][row] = np.concatenate(
            [blend[row], np.full((int(row.sum()), 1), 255)], axis=1)

    print(f"  erased {int(mask.sum())} px of baked heading from the plank")
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def slice_atlas(filename: str, ids: list[list[str]]) -> list[dict]:
    """
    One sprite per grid cell, built from the artwork that belongs to that cell.

    The grid is measured from the sheet rather than assumed, because the rows are not on
    an even pitch. Ownership is then settled against each cell's core - its central half.
    A component reaching exactly one core is one object and keeps its overflow; a
    component reaching two is two objects that touch, and is cut at the neck between them.
    Each sprite is masked to the pixels it owns, so the PNG is transparent everywhere a
    neighbour reached in.
    """
    sheet = Image.open(SRC / filename).convert("RGBA")
    if sheet.width != sheet.height:
        die(f"{filename} is {sheet.size}, expected a square atlas")

    rgba = np.array(sheet)
    alpha = rgba[:, :, 3] > ALPHA_FLOOR

    labels, count = ndimage.label(alpha, structure=np.ones((3, 3)))
    boxes = ndimage.find_objects(labels)

    # Components do not map one-to-one onto objects, in either direction. Atlas 2 labels
    # into 107 for its 100 objects: some objects break into pieces, and some touch a
    # neighbour and fuse into a single blob, which no assignment of whole components to
    # cells can undo.
    #
    # Ownership is settled against each cell's CORE - its central half - rather than the
    # whole cell. An object reliably fills its own core; a neighbour spilling over the
    # boundary reliably does not reach it. That one distinction separates the two cases
    # that look alike from the outside: a plant pot hanging into the cell below owns one
    # core and stays whole, while the picture frame genuinely fused to the rubber duck
    # owns two and gets cut apart.
    row_spans = cell_bounds(alpha.sum(axis=1), sheet.height)
    col_spans = cell_bounds(alpha.sum(axis=0), sheet.width)
    print(f"  grid rows {[a for a, _ in row_spans]}")
    print(f"  grid cols {[a for a, _ in col_spans]}")

    core = np.zeros(alpha.shape, dtype=np.int32) - 1
    for row, (ry0, ry1) in enumerate(row_spans):
        for col, (cx0, cx1) in enumerate(col_spans):
            hy, hx = (ry1 - ry0) * CORE_HALF, (cx1 - cx0) * CORE_HALF
            my, mx = (ry0 + ry1) / 2, (cx0 + cx1) / 2
            core[int(my - hy):int(my + hy), int(mx - hx):int(mx + hx)] = row * GRID + col

    masks = {c: np.zeros_like(alpha) for c in range(GRID * GRID)}
    orphans: list[int] = []

    for label in range(1, count + 1):
        pixels = labels == label
        touched = np.unique(core[pixels & (core >= 0)])

        if len(touched) == 1:
            masks[int(touched[0])] |= pixels
        elif len(touched) > 1:
            for c, part in split_fusion(pixels, [int(c) for c in touched], core).items():
                masks[c] |= part
        else:
            # Reaches nobody's core: a detached handle or a dropped shadow.
            orphans.append(label)

    # An orphan joins whichever cell's artwork it sits nearest, so a split object is made
    # whole rather than left as litter between two crops.
    for label in orphans:
        ly, lx = boxes[label - 1]
        best, best_gap = None, None
        for c, m in masks.items():
            if not m.any():
                continue
            ys, xs = np.where(m)
            gap = (max(int(ys.min()) - ly.stop, ly.start - int(ys.max()), 0)
                   + max(int(xs.min()) - lx.stop, lx.start - int(xs.max()), 0))
            if best_gap is None or gap < best_gap:
                best, best_gap = c, gap
        if best is not None and best_gap <= ORPHAN_REACH:
            masks[best] |= labels == label

    thin = [c for c, m in masks.items() if m.sum() < CELL_MIN_ALPHA]
    if thin:
        die(f"{filename}: cells {[(c // GRID, c % GRID) for c in thin]} came out empty; "
            f"the id table is out of step with the sheet")

    records: list[dict] = []
    for row in range(GRID):
        for col in range(GRID):
            mask = masks[row * GRID + col]
            ys, xs = np.where(mask)
            box = (
                max(int(xs.min()) - PAD, 0),
                max(int(ys.min()) - PAD, 0),
                min(int(xs.max()) + 1 + PAD, sheet.width),
                min(int(ys.max()) + 1 + PAD, sheet.height),
            )

            # Knock out anything inside the box that belongs to another cell.
            cut = rgba[box[1]:box[3], box[0]:box[2]].copy()
            cut[:, :, 3] = np.where(mask[box[1]:box[3], box[0]:box[2]], cut[:, :, 3], 0)

            item_id = ids[row][col]
            Image.fromarray(cut, "RGBA").save(OUT / f"item-{item_id}.png")
            records.append(
                {"id": item_id, "atlas": filename, "row": row, "col": col,
                 "box": list(box), "pixels": int(mask.sum())}
            )
            print(f"  item-{item_id:26} {filename} ({row},{col}) {box}")

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

    print("Signboard:")
    board = clean_plank(Image.open(SRC / "spot_focus_UI.png").convert("RGBA"))
    for name, (x0, x1) in SIGN_CROPS.items():
        piece = board.crop((x0, SIGN_Y0, x1, SIGN_Y1))
        if name.endswith("-mid"):
            px = np.array(piece)
            px[: PLANK_ROWS[0] - SIGN_Y0, :, 3] = 0
            px[PLANK_ROWS[1] - SIGN_Y0 :, :, 3] = 0
            piece = Image.fromarray(px, "RGBA")
        piece.save(OUT / f"{name}.png")
        print(f"  {name:20} x {x0}..{x1}, y {SIGN_Y0}..{SIGN_Y1}")

    print("Backdrop:")
    bg = Image.open(SRC / "spot_focus_bg.png").convert("RGB")
    bg.save(OUT / "bg-scene.jpg", quality=JPEG_QUALITY, optimize=True)
    size_kb = (OUT / "bg-scene.jpg").stat().st_size // 1024
    print(f"  bg-scene.jpg         {bg.size} {size_kb} KB")

    (OUT / "manifest.json").write_text(json.dumps({"items": records}, indent=2))
    print(f"\nWrote {len(records)} sprites to {OUT}")


if __name__ == "__main__":
    main()
