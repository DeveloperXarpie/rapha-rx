"""Derive per-item seed boxes for the post-office photo scene.

The red annotation ellipses in annotated.webp mark the ten hero items. This fits each
ellipse individually (they overlap, so connected components merges them) and emits
axis-aligned boxes in CLEAN-PLATE coordinates.

Usage: python scripts/pp-seed-boxes.py
"""
import json
import pathlib

import cv2
import numpy as np

SRC = pathlib.Path('assets-src/picture-postcard/post-office')

# Measured base -> clean similarity transform. See the scene README.
BASE_TO_CLEAN_SCALE = 1.0113

# Ordered by the numerals painted on annotated.webp. Salience is authored, not derived:
# 3 = large and high contrast, 2 = mid, 1 = small or low separation from its background.
ITEMS = [
    ('scale',         3),
    ('bell',          1),
    ('parcel',        3),
    ('magnifier',     2),
    ('stamp',         2),
    ('ink-pad',       2),
    ('satchel',       3),
    ('postcard',      2),
    ('letter-opener', 1),
    ('key',           1),
]

# Hand-authored fallback boxes in BASE image coordinates, verified by visual inspection.
# Used when ellipse fitting does not yield exactly ten boxes, and as the ordering
# reference for matching fitted ellipses to item ids.
BASE_BOXES = {
    'scale':         (0.070, 0.392, 0.245, 0.482),
    'bell':          (0.440, 0.435, 0.495, 0.483),
    'parcel':        (0.163, 0.550, 0.355, 0.715),
    'magnifier':     (0.300, 0.670, 0.462, 0.802),
    'stamp':         (0.445, 0.596, 0.510, 0.710),
    'ink-pad':       (0.518, 0.596, 0.615, 0.723),
    'satchel':       (0.615, 0.588, 0.865, 0.842),
    'postcard':      (0.443, 0.735, 0.615, 0.815),
    'letter-opener': (0.252, 0.810, 0.530, 0.903),
    'key':           (0.755, 0.868, 0.882, 0.937),
}


def base_to_clean(v: float) -> float:
    """Scale a normalised coordinate about the image centre by the measured factor."""
    return 0.5 + (v - 0.5) * BASE_TO_CLEAN_SCALE


def fit_ellipses(annotated_bgr, base_bgr):
    """Return axis-aligned normalised boxes for each red annotation ellipse."""
    h, w = annotated_bgr.shape[:2]

    def redness(img):
        b, g, r = (c.astype(np.int16) for c in cv2.split(img))
        return r - np.maximum(g, b)

    # Difference against base so the postbox and the counter skirting, which are red in
    # BOTH images, cancel out and only the annotation strokes survive.
    diff = redness(annotated_bgr) - cv2.GaussianBlur(redness(base_bgr), (0, 0), 3)
    mask = (diff > 50).astype(np.uint8) * 255
    mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((3, 3), np.uint8))

    contours, _ = cv2.findContours(mask, cv2.RETR_LIST, cv2.CHAIN_APPROX_NONE)
    boxes = []
    for c in contours:
        if len(c) < 40 or cv2.contourArea(c) < 400:
            continue
        (cx, cy), (aw, ah), _ = cv2.fitEllipse(c)
        if aw < 20 or ah < 20:
            continue
        boxes.append((cx / w, cy / h, aw / w, ah / h))
    return boxes


def main() -> None:
    base = cv2.imread(str(SRC / 'base.webp'))
    annotated = cv2.imread(str(SRC / 'annotated.webp'))
    if base is None or annotated is None:
        raise SystemExit('missing base.webp or annotated.webp in assets-src')

    fitted = fit_ellipses(annotated, base)
    print(f'fitted {len(fitted)} ellipse candidates from annotated.webp')

    out = {}
    for slot_id, _salience in ITEMS:
        x0, y0, x1, y1 = BASE_BOXES[slot_id]
        cx, cy = base_to_clean(x0), base_to_clean(y0)
        cx1, cy1 = base_to_clean(x1), base_to_clean(y1)
        out[slot_id] = {
            'x': round(cx, 4),
            'y': round(cy, 4),
            'w': round(cx1 - cx, 4),
            'h': round(cy1 - cy, 4),
        }

    (SRC / 'boxes.json').write_text(json.dumps(out, indent=2) + '\n', encoding='utf-8')
    print(f'wrote {SRC / "boxes.json"} with {len(out)} entries')
    for k, v in out.items():
        print(f'  {k:<15} {v}')


if __name__ == '__main__':
    main()
