"""Cut the ten hero items out of base.webp and encode the shipped photo-scene assets.

base.webp and clean.webp are independent generations, not edits of one another: they
share a camera but differ by a uniform scale and a tone grade (see the scene README).
`boxes.json` is authored in CLEAN-plate coordinates, so before anything else base is
warped into clean's frame. Skipping that step lands each box 5-16 px away from its item
on base - 22% of the key's short side - and the same rect drives the final crop, so the
silhouette gets sliced at the box edge.

Aligning the two plates also buys the shadow layer. The matte covers the object only; a
contact shadow lies outside it on the background side, and clean.webp was generated with
the items absent, so neither source carries a shadow and the cutouts used to float. With
the plates registered, the per-pixel ratio base/clean over the wood around an item IS its
shadow, recovered from the original art's own lighting.

Mattes come from rembg (isnet-general-use). This used to be grabCut, which cannot do the
job: it decides from local colour and gradient, and several parts of these objects have
neither a colour outside the table's own distribution nor an edge to cut along. The
letter-opener's dark wooden handle sits 2.25 Mahalanobis units inside the background
model, and its outline measures |grad Lab| 71 against bare table's 65 - no boundary
exists there, so the minimum cut ran through the bright ferrule instead and the whole
handle was dropped. No parameter reaches that; a model that recognises the object does.

A learned matte also removes three things grabCut needed as scaffolding: seed-rect
tuning, the Mahalanobis hole punch for the key's bow ring and the satchel strap's loop,
and largest-blob speckle removal. It returns those holes correctly on its own.

Requires `pip install "rembg[cpu]"`. Downloads a ~180 MB model on first run, cached in
~/.u2net. Build-time only: the cutouts are committed, so nothing reaches the app bundle.

Usage: python scripts/pp-cut-scene.py [--only slot-id[,slot-id...]] [--no-shadows]
"""
import argparse
import io
import json
import pathlib

import cv2
import numpy as np
from PIL import Image, ImageCms
from rembg import new_session
from rembg import remove as rembg_remove

SRC = pathlib.Path('assets-src/picture-postcard/post-office')
OUT = pathlib.Path('public/pp/scenes/post-office')

# ─── Matting ──────────────────────────────────────────────────────────────────

# isnet-general-use over u2net: measured tighter on every item here, and the only one of
# the two that keeps the satchel's shoulder strap (coverage 0.62 vs u2net's 0.52, which
# trimmed the bag's lower body).
SEGMENT_MODEL = 'isnet-general-use'

# Context fed to the model around the item's box, per axis. It is a salient-object model,
# so it needs to see the object sitting in its surroundings; a tight crop makes the crop
# itself the object.
SEGMENT_CONTEXT = 0.35

# How much context an item needs is a property of the item, not a global constant. Given
# only 0.35, the model reads the rubber stamp's turned knob as the whole object and
# mattes the knob alone (coverage 0.19); at 0.7 it sees the assembly and returns knob
# plus block (0.40).
CONTEXT_OVERRIDE = {'stamp': 0.7}

# Regions no matte may claim, in scene-normalised coordinates.
#
# The model groups objects that touch, and it has no way to know which of them the game
# treats as a hero item. The potted plant behind the weighing scale, and the painted
# crate it stands on, are permanent scenery that lives on the background plate; letting
# them into the scale's cutout would paint base's copy over clean's while the scale is
# visible and drop back to clean's when it is hidden, which is a change the player can
# see but is not the change being tested.
EXCLUDE = {
    'scale': [(0.1430, 0.3400, 0.0552, 0.0993)],   # potted plant + its crate
}

# Coverage outside this band means the mask is almost certainly wrong, not merely
# imperfect. Reported per item so a regression cannot pass silently.
COVERAGE_MIN, COVERAGE_MAX = 0.08, 0.95

# ─── Shadow layer ─────────────────────────────────────────────────────────────

# The shadow asset covers the item's box inflated by this factor about its centre, so a
# shadow may fall this far outside the object. SceneView applies the same constant when
# it positions the layer - keep the two in step.
SHADOW_INFLATE = 1.6

# Darkening below this fraction is generation grain, not shadow. base and clean render
# wood differently at the pixel level; without a deadband that noise ships as dirt.
SHADOW_DEADBAND = 0.06

# Shadow reach, as a fraction of the item's longest side. Past this the ratio is
# measuring two different paintings of the same table, not a shadow. It is also what
# keeps the counter's dropped ledger stack out of the weighing scale's layer.
SHADOW_REACH = 0.22

# No real contact shadow on this table is darker than this.
SHADOW_FLOOR = 0.35


def register(base, clean):
    """Affine taking base into clean's frame, measured not assumed.

    Deriving this per run rather than hard-coding the README's numbers means a
    regenerated plate is caught here instead of silently mis-cutting every item.
    """
    sift = cv2.SIFT_create(nfeatures=8000)
    k1, d1 = sift.detectAndCompute(cv2.cvtColor(base, cv2.COLOR_BGR2GRAY), None)
    k2, d2 = sift.detectAndCompute(cv2.cvtColor(clean, cv2.COLOR_BGR2GRAY), None)
    good = [m for m, n in cv2.BFMatcher().knnMatch(d1, d2, k=2) if m.distance < 0.75 * n.distance]
    if len(good) < 100:
        raise SystemExit(f'base/clean share only {len(good)} matches - not the same room?')

    src = np.float32([k1[m.queryIdx].pt for m in good]).reshape(-1, 1, 2)
    dst = np.float32([k2[m.trainIdx].pt for m in good]).reshape(-1, 1, 2)
    M, inliers = cv2.estimateAffinePartial2D(src, dst, method=cv2.RANSAC,
                                             ransacReprojThreshold=3.0)
    if M is None or inliers.mean() < 0.5:
        raise SystemExit('base -> clean registration did not converge')

    scale = float(np.hypot(M[0, 0], M[0, 1]))
    rot = float(np.degrees(np.arctan2(M[1, 0], M[0, 0])))
    print(f'registration  scale {scale:.4f}  rot {rot:+.3f} deg  '
          f't ({M[0, 2]:+.1f}, {M[1, 2]:+.1f}) px  '
          f'inliers {int(inliers.sum())}/{len(good)} ({inliers.mean() * 100:.0f}%)')
    if not 0.95 < scale < 1.05 or abs(rot) > 1.0:
        raise SystemExit('registration is implausible for two renders of one room')
    return M


def matte(win_bgr, session):
    """Soft alpha for the salient object in this window, from the matting model."""
    buf = io.BytesIO()
    Image.fromarray(cv2.cvtColor(win_bgr, cv2.COLOR_BGR2RGB)).save(buf, 'PNG')
    out = rembg_remove(buf.getvalue(), session=session)
    return np.array(Image.open(io.BytesIO(out)).convert('RGBA'))[:, :, 3]


def isolate(alpha, rect):
    """Keep only the blob that is this slot's item.

    The window deliberately includes context, so the model often mattes a neighbour too -
    the magnifier's window contains the rubber stamp, the satchel's contains the ink pad
    and the postcard. Keep the component covering the most of the authored box, which is
    the one the box was drawn around.
    """
    x, y, bw, bh = rect
    solid = (alpha > 128).astype(np.uint8)
    n, labels, _stats, _c = cv2.connectedComponentsWithStats(solid, 8)
    if n <= 1:
        return alpha

    inbox = np.zeros(alpha.shape, bool)
    inbox[y:y + bh, x:x + bw] = True
    overlap = [int(((labels == i) & inbox).sum()) for i in range(1, n)]
    keep = 1 + int(np.argmax(overlap))
    return np.where(labels == keep, alpha, 0).astype(np.uint8)


def grade_match(base_win, clean_win, item_mask):
    """Put the base window on the clean plate's grade, and return it as BGR.

    Fitted on background pixels only, and by median, so the shadow - which is exactly
    the signal extract_shadow is about to measure - cannot drag the fit toward itself.
    The grade drifts across the frame (about 5 L* at the tabletop, 12 at the bottom-left
    corner), so this is fitted per item rather than applied as one global constant.

    The correction is additive in Lab rather than a per-channel RGB gain: a gain fitted
    on bare wood and applied to the whole cutout washes out anything that is not
    wood-coloured, which turned the navy satchel and the postcard chalky.
    """
    lb = cv2.cvtColor(base_win, cv2.COLOR_BGR2LAB).astype(np.float32)
    lc = cv2.cvtColor(clean_win, cv2.COLOR_BGR2LAB).astype(np.float32)
    ring = ~cv2.dilate(item_mask, np.ones((9, 9), np.uint8)).astype(bool)
    if ring.sum() >= 200:
        shift = np.median(lc[ring].reshape(-1, 3) - lb[ring].reshape(-1, 3), axis=0)
        lb += np.clip(shift, -40, 40)
    return cv2.cvtColor(np.clip(lb, 0, 255).astype(np.uint8), cv2.COLOR_LAB2BGR)


def extract_shadow(base_win, clean_win, item_mask):
    """RGBA contact shadow for one item, as darkening of the clean plate.

    Where the item casts a shadow, base is darker than clean once the two are on the
    same grade, so `base / clean` below 1 is the shadow and 1 is bare table.

    Encoded as black at a measured alpha rather than as a multiply layer: SceneView
    applies a CSS `filter` to non-target slots for the tier-1 scaffold, and a filter
    opens a stacking context that would leave `mix-blend-mode` blending against nothing.
    Straight alpha compositing survives that; on a neutral shadow over wood the two are
    visually equivalent.
    """
    b = grade_match(base_win, clean_win, item_mask).astype(np.float32)
    c = clean_win.astype(np.float32) + 1.0

    # Luma ratio. Below 1 = base is darker than the empty plate = shadow.
    ratio = np.clip(b / c, 0.0, 2.0)
    s = np.clip(ratio @ np.float32([0.114, 0.587, 0.299]), SHADOW_FLOOR, 1.0)

    dark = 1.0 - s
    # Grain deadband, rescaled so the surviving shadow keeps its full strength.
    dark = np.clip(dark - SHADOW_DEADBAND, 0.0, 1.0) / (1.0 - SHADOW_DEADBAND)

    # A shadow is attached to its caster. Beyond SHADOW_REACH we are comparing two
    # paintings of the same table, so fade to nothing.
    reach = max(6.0, SHADOW_REACH * max(item_mask.shape))
    dist = cv2.distanceTransform((item_mask == 0).astype(np.uint8), cv2.DIST_L2, 5)
    dark *= np.clip(1.0 - dist / reach, 0.0, 1.0) ** 2

    # The item paints over its own footprint, and the ratio is meaningless there.
    dark[cv2.dilate(item_mask, np.ones((3, 3), np.uint8)) > 0] = 0.0

    dark = cv2.GaussianBlur(dark, (0, 0), 2.0)
    alpha = (np.clip(dark, 0.0, 1.0) * 255).astype(np.uint8)
    return np.dstack([np.zeros(alpha.shape + (3,), np.uint8), alpha])


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--only', help='comma-separated slot ids to re-cut')
    ap.add_argument('--no-shadows', action='store_true', help='skip the shadow layers')
    args = ap.parse_args()

    base = cv2.imread(str(SRC / 'base.webp'))
    clean = cv2.imread(str(SRC / 'clean.webp'))
    if base is None or clean is None:
        raise SystemExit('missing base.webp or clean.webp in assets-src')
    h, w = clean.shape[:2]
    boxes = json.loads((SRC / 'boxes.json').read_text(encoding='utf-8'))

    only = set(args.only.split(',')) if args.only else None
    if only and (unknown := only - set(boxes)):
        raise SystemExit(f'unknown slot id(s): {", ".join(sorted(unknown))}')

    # Everything downstream works in clean-plate coordinates, which is what boxes.json
    # is authored in and what SceneView positions against.
    M = register(base, clean)
    base = cv2.warpAffine(base, M, (w, h), flags=cv2.INTER_CUBIC,
                          borderMode=cv2.BORDER_REPLICATE)

    (OUT / 'items').mkdir(parents=True, exist_ok=True)
    session = new_session(SEGMENT_MODEL)

    # The sources carry no ICC profile. Tag the shipped assets sRGB explicitly so a P3
    # tablet display does not over-saturate the postbox reds.
    srgb = ImageCms.ImageCmsProfile(ImageCms.createProfile('sRGB')).tobytes()

    kb = 0.0
    if not only:
        # Background plate. q82 is the knee of the size/quality curve for this painting.
        Image.fromarray(cv2.cvtColor(clean, cv2.COLOR_BGR2RGB)).save(
            OUT / 'background.webp', 'WEBP', quality=82, method=6, icc_profile=srgb)
        kb = (OUT / 'background.webp').stat().st_size / 1024
        print(f'background.webp  {kb:6.1f} KB')

    total = 0.0
    suspect: list[str] = []
    resolved: dict[str, dict[str, float]] = {}
    widened: list[str] = []
    for slot_id, b in boxes.items():
        if only and slot_id not in only:
            continue
        x, y = int(b['x'] * w), int(b['y'] * h)
        bw, bh = int(b['w'] * w), int(b['h'] * h)
        # Window the model sees: the box plus context on each axis.
        ctx = CONTEXT_OVERRIDE.get(slot_id, SEGMENT_CONTEXT)
        px, py = int(bw * ctx), int(bh * ctx)
        wx0, wy0 = max(0, x - px), max(0, y - py)
        wx1, wy1 = min(w, x + bw + px), min(h, y + bh + py)
        window = base[wy0:wy1, wx0:wx1]
        rect = [x - wx0, y - wy0, bw, bh]

        alpha = matte(window, session)
        for ex, ey, ew, eh in EXCLUDE.get(slot_id, ()):
            alpha[max(0, int(ey * h) - wy0):int((ey + eh) * h) - wy0,
                  max(0, int(ex * w) - wx0):int((ex + ew) * w) - wx0] = 0
        alpha = isolate(alpha, rect)

        # The authored box is a SEED, not a promise that the item fits inside it. Where
        # the silhouette runs past it - the satchel's flap and strap, the parcel's top -
        # widen the EMITTED box to contain it, otherwise the crop throws that geometry
        # away.
        #
        # The widened box is written to boxes.resolved.json for the scene def to use; it
        # deliberately does not feed back into boxes.json, so that the seed a run starts
        # from stays the hand-calibrated one.
        ys, xs = np.nonzero(alpha > 128)
        if len(xs):
            seeded = list(rect)
            rect = [min(seeded[0], int(xs.min())), min(seeded[1], int(ys.min())), 0, 0]
            rect[2] = max(seeded[0] + seeded[2], int(xs.max()) + 1) - rect[0]
            rect[3] = max(seeded[1] + seeded[3], int(ys.max()) + 1) - rect[1]
            if rect != seeded:
                widened.append(slot_id)
        x, y = wx0 + rect[0], wy0 + rect[1]
        bw, bh = rect[2], rect[3]
        resolved[slot_id] = {'x': round(x / w, 4), 'y': round(y / h, 4),
                             'w': round(bw / w, 4), 'h': round(bh / h, 4)}

        # Put the cutout on the plate's grade. Fitted per item on this window's own
        # background, which tracks the grade's drift across the frame - the previous
        # pair of global L*/b* constants could only be right in one place.
        graded = grade_match(window, clean[wy0:wy1, wx0:wx1], (alpha > 128).astype(np.uint8))
        rgb = cv2.cvtColor(graded, cv2.COLOR_BGR2RGB)

        rgba = np.dstack([rgb, alpha])[rect[1]:rect[1] + bh, rect[0]:rect[0] + bw]
        Image.fromarray(rgba, 'RGBA').save(
            OUT / 'items' / f'{slot_id}.webp', 'WEBP',
            quality=90, alpha_quality=100, method=6, icc_profile=srgb)

        size_kb = (OUT / 'items' / f'{slot_id}.webp').stat().st_size / 1024
        cover = float((rgba[:, :, 3] > 128).mean())
        if not COVERAGE_MIN < cover < COVERAGE_MAX:
            suspect.append(slot_id)

        shadow_kb = 0.0
        if not args.no_shadows:
            # The shadow reaches outside the item's box, so it gets its own window.
            sx0 = int(x + bw / 2 - bw * SHADOW_INFLATE / 2)
            sy0 = int(y + bh / 2 - bh * SHADOW_INFLATE / 2)
            sx1, sy1 = sx0 + int(bw * SHADOW_INFLATE), sy0 + int(bh * SHADOW_INFLATE)
            # SceneView paints this file into inflateBBox(bbox, SHADOW_INFLATE) with
            # objectFit:'fill'. Silently clamping to the frame here would ship a smaller
            # image that the renderer then stretches back, sliding the shadow off its
            # item. An item that close to the edge needs a per-slot inflation instead.
            if sx0 < 0 or sy0 < 0 or sx1 > w or sy1 > h:
                raise SystemExit(
                    f'{slot_id}: shadow window runs outside the frame - it cannot be '
                    f'cut at SHADOW_INFLATE={SHADOW_INFLATE} without misaligning')

            item_mask = np.zeros((h, w), np.uint8)
            item_mask[y:y + bh, x:x + bw] = (alpha[rect[1]:rect[1] + bh,
                                                   rect[0]:rect[0] + bw] > 128) * 255

            shadow = extract_shadow(base[sy0:sy1, sx0:sx1], clean[sy0:sy1, sx0:sx1],
                                    item_mask[sy0:sy1, sx0:sx1])
            Image.fromarray(shadow, 'RGBA').save(
                OUT / 'items' / f'{slot_id}.shadow.webp', 'WEBP',
                quality=80, alpha_quality=95, method=6)
            shadow_kb = (OUT / 'items' / f'{slot_id}.shadow.webp').stat().st_size / 1024

        total += size_kb + shadow_kb
        warn = '  !! coverage out of band' if slot_id in suspect else ''
        print(f'  {slot_id:<15} {size_kb:5.1f} KB  +{shadow_kb:4.1f} KB shadow  '
              f'coverage {cover:4.2f}{warn}')

    print(f'items total {total:.1f} KB, scene total {total + kb:.1f} KB')

    if not only:
        (SRC / 'boxes.resolved.json').write_text(
            json.dumps(resolved, indent=2) + '\n', encoding='utf-8')
        print(f'\nboxes.resolved.json written; {len(widened)} box(es) had to grow past '
              f'their seed: {", ".join(widened) or "none"}')
        print("postOffice.ts's bboxes must match that file. It is generated, not "
              'authored -\nkeep boxes.json as the hand-calibrated seed and do not feed '
              'the resolved values\nback into it.')

    if suspect:
        print(f'\n{len(suspect)} item(s) out of the coverage band: {", ".join(suspect)}')
        print('Inspect them before sign-off - adjust CONTEXT_OVERRIDE or EXCLUDE.')


if __name__ == '__main__':
    main()
