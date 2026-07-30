"""Cut the ten hero items out of base.webp and encode the shipped photo-scene assets.

grabCut's own foreground/background GMMs are multi-modal, so rect-init handles items
whose surroundings span several surfaces (the weighing scale sits against a counter, a
terracotta pot, a parcel and a window). That is the default path.

What rect-init cannot do is mark background ENCLOSED by the item - the key's bow ring
and the satchel strap's loop come out filled with table wood. Those get an opt-in
second pass that punches holes using a Mahalanobis distance from a background colour
model, gated on the hole being genuinely enclosed.

The gate matters: an ungated colour punch eats the item's own interior whenever item
and background are similar, which turned the brown-paper parcel and the pale postcard
into swiss cheese. Hole punching is therefore per-item and off by default.

Usage: python scripts/pp-cut-scene.py [--only slot-id]
"""
import json
import pathlib

import cv2
import numpy as np
from PIL import Image, ImageCms

SRC = pathlib.Path('assets-src/picture-postcard/post-office')
OUT = pathlib.Path('public/pp/scenes/post-office')

# The clean plate is graded brighter and warmer than base. Without this correction each
# cutout carries a rim of base-tone wood that reads as a dark halo on the plate.
TONE_L_SHIFT = 5.0
TONE_B_SHIFT = 3.5

# Per-item extraction tuning. Everything is optional; the defaults suit most items.
#   iters      grabCut iterations (more = tighter, but can nibble low-contrast edges)
#   hole_dist  enable enclosed-hole punching at this Mahalanobis threshold; None = off
#   grow       expand the seed rect by this fraction before grabCut, for items whose
#              authored box clips a thin protruding part (a handle, a strap)
TUNING = {
    'scale':         {'iters': 10, 'grow': 0.05},
    'bell':          {'grow': 0.10},
    'parcel':        {},
    'magnifier':     {'grow': 0.06},
    'stamp':         {},
    'ink-pad':       {},
    'satchel':       {'grow': 0.04, 'hole_dist': 2.2},
    'postcard':      {},
    'letter-opener': {'grow': 0.05},
    'key':           {'hole_dist': 2.6},
}

# Coverage outside this band means the mask is almost certainly wrong, not merely
# imperfect. Reported per item so a regression cannot pass silently.
COVERAGE_MIN, COVERAGE_MAX = 0.08, 0.95


def mahalanobis_map(lab, rect, pad):
    """Per-pixel Mahalanobis distance from the background colour model.

    The model is fitted on an annulus OUTSIDE the seed rect, so it describes whatever
    surface the item is resting on.
    """
    h, w = lab.shape[:2]
    x, y, bw, bh = rect
    ring = np.zeros((h, w), bool)
    ring[max(0, y - pad):y + bh + pad, max(0, x - pad):x + bw + pad] = True
    ring[y:y + bh, x:x + bw] = False

    samples = lab[ring].reshape(-1, 3).astype(np.float64)
    if len(samples) < 50:
        return np.full((h, w), 10.0), ring
    mu = samples.mean(axis=0)
    cov = np.cov(samples, rowvar=False) + np.eye(3) * 1e-3
    inv = np.linalg.inv(cov)
    d = lab.reshape(-1, 3).astype(np.float64) - mu
    m = np.sqrt(np.einsum('ij,jk,ik->i', d, inv, d)).reshape(h, w)
    return m, ring


def punch_enclosed_holes(outer, dist, threshold):
    """Remove background-coloured regions that are fully enclosed by the silhouette.

    A candidate region touching the silhouette's outside is an edge sliver, not a hole -
    punching it would eat the item's rim. Only genuinely enclosed regions are removed,
    which is what recovers the key's bow ring and the satchel strap's loop.
    """
    candidate = (outer & (dist < threshold)).astype(np.uint8)
    if candidate.sum() == 0:
        return outer

    exterior = (~outer).astype(np.uint8)
    n, labels = cv2.connectedComponents(candidate, 8)
    holes = np.zeros_like(candidate, bool)
    for i in range(1, n):
        comp = labels == i
        # Enclosed if dilating the component never reaches the silhouette's outside.
        touching = cv2.dilate(comp.astype(np.uint8), np.ones((3, 3), np.uint8)) & exterior
        if touching.sum() == 0:
            holes |= comp
    return outer & ~holes


def extract_alpha(bgr, rect, tuning):
    """Binary alpha for one item.

    grabCut's GMMs are multi-modal, so rect-init copes with backgrounds that span
    several surfaces. Enclosed-hole punching is opt-in per item.
    """
    h, w = bgr.shape[:2]
    grow = tuning.get('grow', 0.0)
    if grow:
        gx, gy = int(rect[2] * grow), int(rect[3] * grow)
        seed = (max(1, rect[0] - gx), max(1, rect[1] - gy),
                min(w - 2, rect[2] + 2 * gx), min(h - 2, rect[3] + 2 * gy))
    else:
        seed = tuple(rect)

    mask = np.zeros((h, w), np.uint8)
    cv2.grabCut(bgr, mask, seed, np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), tuning.get('iters', 6),
                cv2.GC_INIT_WITH_RECT)
    outer = np.isin(mask, [cv2.GC_FGD, cv2.GC_PR_FGD])

    hole_dist = tuning.get('hole_dist')
    if hole_dist is not None:
        lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
        pad = max(12, int(min(rect[2], rect[3]) * 0.30))
        dist, _ring = mahalanobis_map(lab, rect, pad)
        outer = punch_enclosed_holes(outer, dist, hole_dist)

    alpha = cv2.morphologyEx(outer.astype(np.uint8) * 255, cv2.MORPH_OPEN,
                             np.ones((3, 3), np.uint8))

    # Keep only the largest connected blob - drops speckle without touching real holes.
    n, labels, stats, _ = cv2.connectedComponentsWithStats((alpha > 0).astype(np.uint8), 8)
    if n > 1:
        biggest = 1 + int(np.argmax(stats[1:, cv2.CC_STAT_AREA]))
        alpha = np.where(labels == biggest, 255, 0).astype(np.uint8)
    return alpha


def soften(alpha):
    """Turn a hard binary alpha into a sub-2px ramp. Without this the edges alias."""
    a = alpha.astype(np.float32) / 255.0
    a = cv2.GaussianBlur(a, (0, 0), 1.2)
    # smoothstep, so the ramp stays tight rather than spreading the blur's full width
    a = np.clip((a - 0.35) / 0.30, 0.0, 1.0)
    return (a * a * (3 - 2 * a) * 255).astype(np.uint8)


def tone_grade(bgr):
    """Shift base-image colour toward the clean plate's grade."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB).astype(np.float32)
    lab[:, :, 0] = np.clip(lab[:, :, 0] + TONE_L_SHIFT * 255.0 / 100.0, 0, 255)
    lab[:, :, 2] = np.clip(lab[:, :, 2] + TONE_B_SHIFT, 0, 255)
    return cv2.cvtColor(lab.astype(np.uint8), cv2.COLOR_LAB2BGR)


def main() -> None:
    base = cv2.imread(str(SRC / 'base.webp'))
    clean = cv2.imread(str(SRC / 'clean.webp'))
    if base is None or clean is None:
        raise SystemExit('missing base.webp or clean.webp in assets-src')
    h, w = base.shape[:2]
    boxes = json.loads((SRC / 'boxes.json').read_text(encoding='utf-8'))

    (OUT / 'items').mkdir(parents=True, exist_ok=True)

    # The sources carry no ICC profile. Tag the shipped assets sRGB explicitly so a P3
    # tablet display does not over-saturate the postbox reds.
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()

    # Background plate. q82 is the knee of the size/quality curve for this painting.
    Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)).save(
        OUT / 'background.webp', 'WEBP', quality=82, method=6, icc_profile=srgb)
    kb = (OUT / 'background.webp').stat().st_size / 1024
    print(f'background.webp  {kb:6.1f} KB')

    total = 0.0
    suspect: list[str] = []
    for slot_id, b in boxes.items():
        x, y = int(b['x'] * w), int(b['y'] * h)
        bw, bh = int(b['w'] * w), int(b['h'] * h)
        # Work in a padded window so the annulus has room for its colour model.
        pad = max(20, int(min(bw, bh) * 0.5))
        wx0, wy0 = max(0, x - pad), max(0, y - pad)
        wx1, wy1 = min(w, x + bw + pad), min(h, y + bh + pad)
        window = base[wy0:wy1, wx0:wx1]
        rect = [x - wx0, y - wy0, bw, bh]

        alpha = soften(extract_alpha(window, rect, TUNING.get(slot_id, {})))
        rgb = cv2.cvtColor(tone_grade(window), cv2.COLOR_BGR2RGB)

        rgba = np.dstack([rgb, alpha])[rect[1]:rect[1] + bh, rect[0]:rect[0] + bw]
        Image.fromarray(rgba, 'RGBA').save(
            OUT / 'items' / f'{slot_id}.webp', 'WEBP',
            quality=90, alpha_quality=100, method=6, icc_profile=srgb)

        size_kb = (OUT / 'items' / f'{slot_id}.webp').stat().st_size / 1024
        total += size_kb
        cover = float((rgba[:, :, 3] > 128).mean())
        if not COVERAGE_MIN < cover < COVERAGE_MAX:
            suspect.append(slot_id)
        warn = '  !! coverage out of band' if slot_id in suspect else ''
        print(f'  {slot_id:<15} {size_kb:5.1f} KB  coverage {cover:4.2f}{warn}')

    print(f'items total {total:.1f} KB, scene total {total + kb:.1f} KB')
    if suspect:
        print(f'\n{len(suspect)} item(s) out of the coverage band: {", ".join(suspect)}')
        print('Inspect them before Task 4 sign-off - tune TUNING or hand-correct.')


if __name__ == '__main__':
    main()
