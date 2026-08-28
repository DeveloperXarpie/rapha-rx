"""
Slice the portrait Serve the Guests art into `public/cook-assets/`.

Two sheets feed the portrait board:

    assets-src/guests_portrait/guests_bg_pt.png          the empty courtyard plate
    assets-src/guests_portrait/guests_assets_portrait.png the loose furniture

`guests_ui_pt.png` in the same folder is a composed mock for reference and is not shipped.

The portrait set only re-supplies the furniture. Everything else carries over from the
landscape build unchanged: the 22 dishes and their `-spoiled` variants, all four state
buttons (including DISPOSE, which the portrait sheet does not draw), the bar track and
fill, the coin and the bubble tail. The guest busts also stay on `characters_cook.png`,
which has ten faces against the portrait sheet's four - `TOTAL_GUESTS` is 8 and faces
cycle by index, so four would mean every face appearing twice in a round.

The big win over the landscape sheet: the counter tray is a separate transparent panel
here rather than being painted into the background. Its cells are drawn 4x2 in the art,
but the board deals six dishes in 3x2, so only the tray's outer frame is used - the cells
are drawn in code from PANEL_* in geometry.ts. That makes the counter size a parameter
rather than an art dependency.

    python scripts/slice_cook_portrait.py

Requires Pillow. Writes to public/cook-assets/, overwriting.
"""

from __future__ import annotations

import pathlib
import sys

from PIL import Image, ImageDraw, ImageOps

ROOT = pathlib.Path(__file__).resolve().parent.parent
SRC = ROOT / "assets-src" / "guests_portrait"
SHEET = SRC / "guests_assets_portrait.png"
BACKGROUND = SRC / "guests_bg_pt.png"

OUT = ROOT / "public" / "cook-assets"
BACKGROUND_OUT = ROOT / "public" / "bg_cook_pt.jpg"

# Alpha bounding boxes measured off the sheet, as (x, y, w, h). Re-derive with
# `python scripts/slice_cook_assets.py --measure <sheet>`; the pieces in the left column
# touch each other and come back as one blob, so the tray and title were measured by
# scanning for the tray's own top edge rather than taken from that output.
PIECES = {
    # The painted game title. English only and reads "Tiffen" rather than "Tiffin"; it is
    # shipped at the user's request, and GameShell hides its own banner for this game so
    # the two do not both appear.
    "pt-title": (375, 12, 422, 238),
}

# Three pieces on the sheet are deliberately not cut, and it is worth saying why so nobody
# re-adds them:
#
#   the guests-left dial (41, 20, 255, 210)   its count and pip strip are painted in, so it
#                                             reads "8" and "7 of 8" no matter what the
#                                             round is doing
#   the score capsule    (855, 94, 282, 114)  likewise painted as "000"
#
# Both would have to be masked and overdrawn to carry live numbers, which is more work than
# drawing them, so the HUD stays code-drawn exactly as the landscape board does. It uses the
# same palette, so it still reads as part of the kit.
#
#   the blank bubble     (876, 1085, 239, 135) the existing ui-panel.png is the same kit and
#                                              already has measured 9-slice insets that a
#                                              multi-item order grows correctly

# JPEG quality for the courtyard plate. The source is a 2.1 MB PNG of a soft painted
# scene with no hard edges or text, so it takes this happily; the landscape plate ships
# at 246 KB for comparison.
BACKGROUND_QUALITY = 82

# The tray, as (x, y, w, h), already inset 4px on every side: the guest busts sit in front
# of the tray on the sheet and overlap its top rows.
TRAY = (34, 724, 787, 576)
TRAY_BAND = 34   # frame thickness
TRAY_CORNER = 70


def build_tray(sheet: Image.Image) -> Image.Image:
    """
    Rebuild the counter's frame, clean and symmetric, from its own pixels.

    The tray cannot simply be cropped. On the sheet its cells hold dishes and buttons, and
    several of those overflow their cell into the frame band - the gulab jamun bowl, a
    MAKE button and a SERVE button all bleed over the left rim. Cropping tighter to escape
    them would eat the frame itself.

    The frame is symmetric, though, and its right edge is the one run nothing overlaps. So
    one clean corner and two clean edge samples are mirrored and tiled into a whole frame.
    Every pixel is still the artist's; none of it is redrawn.

    The interior is filled flat, because the sheet draws 4x2 cells and the board deals six
    in 3x2. The cells are drawn in code from the geometry instead, which is what makes
    COUNTER_SIZE a parameter rather than a property of the art.
    """
    x, y, w, h = TRAY
    src = sheet.crop((x, y, x + w, y + h))
    b, c = TRAY_BAND, TRAY_CORNER

    out = Image.new("RGBA", (w, h), (0, 0, 0, 0))
    corner = src.crop((w - c, h - c, w, h))
    v_strip = src.crop((w - b, h // 2 - 1, w, h // 2 + 1))
    h_strip = src.crop((w // 2 - 1, h - b, w // 2 + 1, h))

    out.paste(ImageOps.mirror(ImageOps.flip(corner)), (0, 0))
    out.paste(ImageOps.flip(corner), (w - c, 0))
    out.paste(ImageOps.mirror(corner), (0, h - c))
    out.paste(corner, (w - c, h - c))

    row = v_strip.crop((0, 1, b, 2))
    for yy in range(c, h - c):
        out.paste(ImageOps.mirror(row), (0, yy))
        out.paste(row, (w - b, yy))

    col = h_strip.crop((1, 0, 2, b))
    for xx in range(c, w - c):
        out.paste(ImageOps.flip(col), (xx, 0))
        out.paste(col, (xx, h - b))

    interior = src.getpixel((200, h // 2))
    ImageDraw.Draw(out).rectangle((b - 1, b - 1, w - b, h - b), fill=interior)
    return out


def slice_all() -> list[tuple[str, tuple[int, int]]]:
    OUT.mkdir(parents=True, exist_ok=True)
    sheet = Image.open(SHEET).convert("RGBA")

    written = []
    for name, (x, y, w, h) in PIECES.items():
        piece = sheet.crop((x, y, x + w, y + h))
        path = OUT / f"{name}.png"
        piece.save(path)
        written.append((path.name, piece.size))

    tray = build_tray(sheet)
    tray.save(OUT / "pt-tray.png")
    written.append(("pt-tray.png", tray.size))

    plate = Image.open(BACKGROUND).convert("RGB")
    plate.save(BACKGROUND_OUT, "JPEG", quality=BACKGROUND_QUALITY, optimize=True)
    written.append((BACKGROUND_OUT.name, plate.size))

    return written


def main() -> int:
    missing = [p for p in (SHEET, BACKGROUND) if not p.exists()]
    if missing:
        for p in missing:
            print(f"sheet not found: {p}", file=sys.stderr)
        return 1

    for name, size in slice_all():
        print(f"{name} {size[0]}x{size[1]}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
