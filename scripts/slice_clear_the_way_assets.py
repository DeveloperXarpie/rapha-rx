"""
Slice the Clear the Way reef art into public/reef-assets/.

Run from the repo root:

    python scripts/slice_clear_the_way_assets.py

Two source images, cut for two different jobs.

`ChatGPT Image ... 11_35_53 AM.png` is the block sheet: eight painted stone slabs and
the clownfish, scattered on a dark glow with no grid. The slabs are found by texture
rather than by brightness - the glow behind them is as bright as some of the stone, but
it is smooth, and the stone is not - and each one is then matted with GrabCut seeded
from its own component.

The sheet does not cover every shape the levels use. It has five two-cell horizontals,
one two-cell vertical, one three-cell vertical and one four-cell vertical; the levels
also want three-cell horizontals, more two-cell verticals and 1x1s. Rather than stretch
a slab to fit, the missing shapes are built by rotating a slab whose ornament is
radially symmetric (a starfish or a bubble reads the same on its side; a fan shell does
not), and by splicing a slab's length - lifting a band of texture out of it, or joining
its two rounded end caps into a square. Splicing keeps the stone at its native pixel
scale, so a 1x1 and a three-cell slab are cut from the same rock.

Nothing here is resized to a cell multiple on purpose. The slabs are drawn inset in
their cells in the mock, and the game renders each sprite `contain`ed in its piece box,
so the sheet's own proportions produce that inset for free and no sprite is ever
squashed.

`ChatGPT Image ... 03_38_29 PM.png` is the empty-board mock, cut for the frame: four
corner ornaments, a tiling rail for each axis, one floor cell and the exit beacon. The
mock bakes its exit gap into the right rail, so the right rail tile is taken from above
the notch. The reef behind it becomes the backdrop, with the mock's own board painted
out by stretching the clean water band above it down over the hole.

The script prints every crop box it used. Those numbers are the source of truth for the
geometry constants in the game; do not eyeball them off the image.
"""

from __future__ import annotations

import os
import sys

import cv2
import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
SRC = os.path.join(ROOT, "assets-src", "escape-teml")
OUT = os.path.join(ROOT, "public", "reef-assets")

BLOCK_SHEET = os.path.join(SRC, "ChatGPT Image Aug 21, 2026, 11_35_53 AM.png")
BOARD_MOCK = os.path.join(SRC, "ChatGPT Image Aug 21, 2026, 03_38_29 PM.png")


# ─── Block sheet ──────────────────────────────────────────────────────────────


def find_components(bgr: np.ndarray) -> list[tuple[slice, slice]]:
    """
    Bounding boxes of the objects on the block sheet, in reading order.

    The separator is texture, not brightness. The sheet's backdrop is a dark field with a
    coloured glow under each slab, and that glow is brighter than the shadowed end of the
    grey stone, so no luminance threshold splits the two cleanly at every slab at once.
    The Laplacian does: painted rock is full of high-frequency detail and the glow is a
    smooth ramp.
    """
    grey = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY)
    detail = np.abs(cv2.Laplacian(cv2.GaussianBlur(grey, (3, 3), 0), cv2.CV_32F))

    mask = detail > 6
    mask = ndimage.binary_closing(mask, np.ones((15, 15)))
    mask = ndimage.binary_fill_holes(mask)
    mask = ndimage.binary_opening(mask, np.ones((15, 15)))

    labels, _ = ndimage.label(mask)
    boxes = [
        (i, sl)
        for i, sl in enumerate(ndimage.find_objects(labels), 1)
        if (labels[sl] == i).sum() > 6000
    ]
    boxes.sort(key=lambda t: (t[1][0].start, t[1][1].start))
    return labels, boxes


def matte(bgr: np.ndarray, component: np.ndarray) -> Image.Image:
    """
    Cut one object out of the sheet with a soft edge.

    The component from `find_components` is a good seed but a poor matte: closing and
    filling it rounds off the slabs' bevelled corners and swallows the gap between the
    fish's fins. GrabCut is seeded with it - eroded core as certain foreground, dilated
    halo as probable background - and settles the edge against the actual colours.
    """
    pad = 24
    h, w = bgr.shape[:2]
    ys, xs = np.where(component)
    y0, y1 = max(0, ys.min() - pad), min(h, ys.max() + 1 + pad)
    x0, x1 = max(0, xs.min() - pad), min(w, xs.max() + 1 + pad)

    sub = bgr[y0:y1, x0:x1]
    seed = component[y0:y1, x0:x1]

    gc = np.full(seed.shape, cv2.GC_BGD, np.uint8)
    gc[ndimage.binary_dilation(seed, np.ones((13, 13)))] = cv2.GC_PR_BGD
    gc[seed] = cv2.GC_PR_FGD
    gc[ndimage.binary_erosion(seed, np.ones((21, 21)))] = cv2.GC_FGD
    cv2.grabCut(sub, gc, None, np.zeros((1, 65)), np.zeros((1, 65)), 6, cv2.GC_INIT_WITH_MASK)

    solid = (gc == cv2.GC_FGD) | (gc == cv2.GC_PR_FGD)
    # A slab's bevelled corner can be shaved off by GrabCut where the stone darkens into
    # the glow. Closing before the opening puts those notches back without re-fusing the
    # fish's fins, which are further apart than the kernel.
    solid = ndimage.binary_closing(solid, np.ones((25, 25)))
    solid = ndimage.binary_fill_holes(solid)
    solid = ndimage.binary_opening(solid, np.ones((5, 5)))

    labels, count = ndimage.label(solid)
    if count > 1:
        sizes = ndimage.sum(solid, labels, range(1, count + 1))
        solid = labels == int(np.argmax(sizes)) + 1

    alpha = cv2.GaussianBlur((solid * 255).astype(np.uint8), (5, 5), 0)
    ys, xs = np.where(solid)
    box = (slice(ys.min(), ys.max() + 1), slice(xs.min(), xs.max() + 1))
    rgba = np.dstack([cv2.cvtColor(sub, cv2.COLOR_BGR2RGB), alpha])[box]
    return Image.fromarray(rgba, "RGBA")


# ─── Shape derivation ─────────────────────────────────────────────────────────


def splice(im: Image.Image, target_len: int, *, at: float = 0.20, blend: int = 14) -> Image.Image:
    """
    Change a slab's length along its long axis without scaling it.

    A band of texture is lifted out (to shorten) or repeated (to lengthen) at `at`, a
    fraction of the way along, and the join is cross-faded over `blend` pixels. Both end
    caps and every ornament survive at their original pixel scale, which a resize would
    not manage: squashing a four-cell slab into three fattens its rounded caps and
    flattens the coral on it.

    `at` sits in the first fifth by default. The sheet's ornaments are at or below the
    middle of every slab, so a band taken from near the leading cap is plain stone.
    """
    a = np.asarray(im).astype(np.float32)
    horizontal = im.width > im.height
    if horizontal:
        a = a.transpose(1, 0, 2)  # work with the long axis first

    length = a.shape[0]
    cut = int(length * at)
    # The cross-fade consumes `blend` pixels of the join, so the band moved is that much
    # larger than the difference asked for.
    if target_len <= length:
        drop = length - target_len - blend
        head, tail = a[:cut], a[cut + drop :]
    else:
        add = target_len - length + blend
        band = a[cut : cut + max(add, blend)]
        reps = int(np.ceil(add / band.shape[0]))
        head = np.concatenate([a[:cut], np.tile(band, (reps, 1, 1))[:add]])
        tail = a[cut:]

    k = min(blend, head.shape[0], tail.shape[0])
    ramp = np.linspace(0, 1, k, dtype=np.float32)[:, None, None]
    joined = tail[:k] * ramp + head[-k:] * (1 - ramp)
    out = np.concatenate([head[:-k], joined, tail[k:]])

    if horizontal:
        out = out.transpose(1, 0, 2)
    return Image.fromarray(np.clip(out, 0, 255).astype(np.uint8), "RGBA")


def cap_join(im: Image.Image, blend: int = 14) -> Image.Image:
    """
    A square block, built from a slab's two rounded end caps with the middle removed.

    `splice` with a target short enough to delete everything between the caps, cut at the
    halfway mark so each cap contributes the same amount. The result keeps both bevelled
    ends, so a 1x1 is unmistakably the same rock as its neighbours, and whatever ornament
    sat in the middle goes with the middle.
    """
    long_side, short_side = max(im.width, im.height), min(im.width, im.height)
    # A little proud of square on the long axis, matching how the sheet's slabs sit
    # inset on their short axis and near-flush on their long one.
    target = int(short_side * 1.12)
    return splice(im, target, at=target / (2 * long_side), blend=blend)


def rotate(im: Image.Image) -> Image.Image:
    """Stand a horizontal slab on end, or lay a vertical one down."""
    return im.transpose(Image.Transpose.ROTATE_270)


# ─── Board mock ───────────────────────────────────────────────────────────────

# Read off the mock against a 10px grid overlay; see the module docstring.
#
# Only one rail of each axis and one corner are cut. The mock's frame is symmetric, so
# the opposite sides are mirrors, and mirroring guarantees a symmetry that four separate
# crops of hand-painted art would not: the moss lands on the inner edge of all four
# rails and the spiral curls the same way into all four corners.
#
# The bottom rail rather than the top, and the right rather than the left, because those
# two are drawn face-on. The top rail is foreshortened to half the thickness of the
# others, and stretching a foreshortened tile back out reads as blur.
FRAME_RAIL_H = (300, 1291, 520, 1346)
# Above the mock's exit notch, which is baked into the right rail.
FRAME_RAIL_V = (800, 550, 846, 770)
FRAME_CORNER = (58, 412, 148, 508)
# One interior cell, groove included. The mock's grid is on a 137 x 133 pitch; the tile
# is repeated at the runtime cell size rather than at this one.
FLOOR_CELL = (118, 490, 255, 623)
# The glowing chevron in the mock's gap.
EXIT_ARROW = (772, 800, 862, 920)
# The mock's own board, painted out of the backdrop. Wider than the frame on every side,
# because the fill is feathered and a feather that starts inside the frame leaves the
# frame's outer edge standing.
BOARD_HOLE = (0, 380, 941, 1382)
# The mock's exit notch bows out past the frame's right edge, so it survives the hole
# and is painted out on its own.
NOTCH_HOLE = (876, 716, 941, 968)
# Scenery the hole would otherwise take with it. The hole runs the full width so that its
# feathered edge falls outside the picture rather than leaving a bright seam beside the
# board; what has to survive that is named here and the fill is held off it. The kelp is
# in the list for the seam's sake as much as its own: a join hidden in a frond reads as
# nothing, the same join in open water reads as a stripe.
KEEP = (
    (0, 1080, 122, 1400),    # the anchor
    (778, 1268, 941, 1400),  # the starfish
    (0, 240, 46, 1400),      # the kelp down the left
    (884, 240, 941, 1400),   # the kelp and coral down the right
)
# A band of clean, ray-lit water above the board, stretched down to fill the hole.
WATER_BAND = (0, 250, 941, 380)
# The HUD is GameShell's job, so the backdrop starts below it.
BACKDROP_TOP = 240


def crop(bgr: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    """An opaque crop, RGBA so every sprite in the set has the same mode."""
    x0, y0, x1, y1 = box
    return Image.fromarray(cv2.cvtColor(bgr[y0:y1, x0:x1], cv2.COLOR_BGR2RGB), "RGB").convert("RGBA")


def water_matte(bgr: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    """
    Cut the corner ornament out of the water behind it.

    The rails are straight bands and are cropped flush, but the corner spiral has a
    curved silhouette that overhangs the frame on both axes, so it needs a matte. The
    water behind it is a smooth dark field with no detail, which is exactly what a
    flood fill from the crop's own border eats. It is seeded at all four corners, so a
    fill blocked by the ornament on one side still reaches the water on the others, and
    kept tight: the moss in the ornament's shadow is not much lighter than the water, and
    a loose tolerance walks straight up it and hollows the spiral out.
    """
    x0, y0, x1, y1 = box
    sub = bgr[y0:y1, x0:x1]
    h, w = sub.shape[:2]

    background = np.zeros((h, w), bool)
    for seed in ((0, 0), (w - 1, 0), (0, h - 1), (w - 1, h - 1)):
        flood = np.zeros((h + 2, w + 2), np.uint8)
        cv2.floodFill(
            sub.copy(), flood, seed, 0, (12, 12, 12), (12, 12, 12),
            4 | cv2.FLOODFILL_MASK_ONLY | (255 << 8),
        )
        background |= flood[1:-1, 1:-1] > 0

    solid = ndimage.binary_fill_holes(~background)
    solid = ndimage.binary_opening(solid, np.ones((3, 3)))
    alpha = cv2.GaussianBlur((solid * 255).astype(np.uint8), (3, 3), 0)
    return Image.fromarray(np.dstack([cv2.cvtColor(sub, cv2.COLOR_BGR2RGB), alpha]), "RGBA")


def glow_matte(bgr: np.ndarray, box: tuple[int, int, int, int]) -> Image.Image:
    """
    Cut the exit beacon out of the water behind it.

    The chevron is a light source rather than an object, so it has no edge to find. Its
    own brightness is the alpha: the water is dark, the glow is not, and taking the
    matte from luminance keeps the falloff instead of stamping a hard rectangle of it.
    """
    x0, y0, x1, y1 = box
    sub = bgr[y0:y1, x0:x1]
    lum = cv2.cvtColor(sub, cv2.COLOR_BGR2GRAY).astype(np.float32)
    floor, ceiling = np.percentile(lum, 30), lum.max()
    alpha = np.clip((lum - floor) / max(ceiling - floor, 1e-3), 0, 1)
    # Squared, so the water's ambient brightness falls away faster than the glow does.
    alpha = (alpha**2 * 255).astype(np.uint8)
    return Image.fromarray(
        np.dstack([cv2.cvtColor(sub, cv2.COLOR_BGR2RGB), alpha]), "RGBA"
    )


def build_backdrop(bgr: np.ndarray) -> Image.Image:
    """
    The reef, with the mock's board removed.

    The board is not inpainted - a full-width, 1000px-tall hole comes back mush - but overwritten by the
    band of open water above it, stretched down. The scene's light is a set of vertical
    god-rays, so stretching it vertically neither bends them nor moves them.

    What is left is the reef without a board in it: kelp down both sides, coral, the
    seabed, and the anchor and starfish that lap over where the frame stood.
    """
    scene = bgr[BACKDROP_TOP:].copy()
    shift = BACKDROP_TOP
    bx0, by0, bx1, by1 = BOARD_HOLE[0], BOARD_HOLE[1] - shift, BOARD_HOLE[2], BOARD_HOLE[3] - shift
    wy0, wy1 = WATER_BAND[1] - shift, WATER_BAND[3] - shift

    water = scene[wy0:wy1, bx0:bx1]
    fill = cv2.resize(water, (bx1 - bx0, by1 - by0), interpolation=cv2.INTER_LINEAR)

    # Feathered so the seam against the surrounding reef is a gradient rather than a line.
    feather = 22
    mask = np.zeros((by1 - by0, bx1 - bx0), np.float32)
    mask[feather:-feather, feather:-feather] = 1
    for kx0, ky0, kx1, ky1 in KEEP:
        mask[
            max(0, ky0 - shift - by0) : max(0, ky1 - shift - by0),
            max(0, kx0 - bx0) : max(0, kx1 - bx0),
        ] = 0
    mask = cv2.GaussianBlur(mask, (0, 0), feather / 2)[..., None]
    scene[by0:by1, bx0:bx1] = (fill * mask + scene[by0:by1, bx0:bx1] * (1 - mask)).astype(np.uint8)

    # The notch is small enough for a plain inpaint, and it sits against kelp rather than
    # open water, so the stretched band would not match there anyway.
    nx0, ny0, nx1, ny1 = NOTCH_HOLE[0], NOTCH_HOLE[1] - shift, NOTCH_HOLE[2], NOTCH_HOLE[3] - shift
    hole = np.zeros(scene.shape[:2], np.uint8)
    hole[ny0:ny1, nx0:nx1] = 255
    scene = cv2.inpaint(scene, hole, 8, cv2.INPAINT_TELEA)

    return Image.fromarray(cv2.cvtColor(scene, cv2.COLOR_BGR2RGB), "RGB")


# ─── Entry point ──────────────────────────────────────────────────────────────


def main() -> int:
    os.makedirs(OUT, exist_ok=True)

    sheet = cv2.imread(BLOCK_SHEET, cv2.IMREAD_COLOR)
    mock = cv2.imread(BOARD_MOCK, cv2.IMREAD_COLOR)
    if sheet is None or mock is None:
        print(f"missing source art under {SRC}", file=sys.stderr)
        return 1

    labels, boxes = find_components(sheet)
    if len(boxes) != 9:
        print(f"expected 8 slabs and a fish, found {len(boxes)} objects", file=sys.stderr)
        return 1

    print(f"block sheet {sheet.shape[1]}x{sheet.shape[0]}")
    parts: list[Image.Image] = []
    for index, (label, sl) in enumerate(boxes):
        part = matte(sheet, labels == label)
        parts.append(part)
        print(
            f"  [{index}] x{sl[1].start}..{sl[1].stop} y{sl[0].start}..{sl[0].stop}"
            f" -> {part.width}x{part.height}"
        )

    # Index -> what the sheet drew, established from the aspect ratios printed above and
    # confirmed against the in-game mock.
    green_v3, blue_v2, teal_h2, shell_h2, grey_v4, fish, blue_h2, starfish_h2, grey_h2 = parts

    # A three-cell vertical cut out of the four-cell slab, at the same stone scale as the
    # green one beside it.
    grey_v3 = splice(grey_v4, round(grey_v4.width * (green_v3.height / green_v3.width)))

    written: dict[str, Image.Image] = {
        "block-h2-a": teal_h2,
        "block-h2-b": shell_h2,
        "block-h2-c": blue_h2,
        "block-h2-d": starfish_h2,
        "block-h2-e": grey_h2,
        "block-v3-a": green_v3,
        "block-v3-b": grey_v3,
        "block-v2-a": blue_v2,
        # Stood on end. The teal slab is bare and the starfish is the one ornament that
        # has no up, so neither rotation reads as a sprite lying on its side.
        "block-v2-b": rotate(teal_h2),
        "block-v2-c": rotate(starfish_h2),
        # Laid down, for the same reason: bubbles and a coral fan survive the turn.
        "block-h3-a": rotate(green_v3),
        "block-h3-b": rotate(grey_v3),
        "block-1x1-a": cap_join(teal_h2),
        "block-1x1-b": cap_join(blue_h2),
        "block-1x1-c": cap_join(grey_h2),
        "fish": fish,
    }

    print(f"board mock {mock.shape[1]}x{mock.shape[0]}")
    written["frame-rail-h"] = crop(mock, FRAME_RAIL_H)
    written["frame-rail-v"] = crop(mock, FRAME_RAIL_V)
    written["frame-corner"] = water_matte(mock, FRAME_CORNER)
    written["floor-cell"] = crop(mock, FLOOR_CELL)
    written["exit-arrow"] = glow_matte(mock, EXIT_ARROW)
    for name, box in (
        ("frame-rail-h", FRAME_RAIL_H), ("frame-rail-v", FRAME_RAIL_V),
        ("frame-corner", FRAME_CORNER), ("floor-cell", FLOOR_CELL), ("exit-arrow", EXIT_ARROW),
    ):
        print(f"  {name} x{box[0]}..{box[2]} y{box[1]}..{box[3]}")

    for name, im in written.items():
        path = os.path.join(OUT, f"{name}.png")
        im.save(path, optimize=True)
        print(f"wrote {os.path.relpath(path, ROOT)} {im.width}x{im.height}")

    backdrop = build_backdrop(mock)
    path = os.path.join(OUT, "backdrop.jpg")
    backdrop.save(path, quality=86, optimize=True)
    print(f"wrote {os.path.relpath(path, ROOT)} {backdrop.width}x{backdrop.height}")

    return 0


if __name__ == "__main__":
    raise SystemExit(main())
