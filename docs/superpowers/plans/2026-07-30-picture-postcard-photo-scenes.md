# Picture Postcard Photo Scenes Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a raster "photo scene" to the Picture Postcard memory game so ladder levels 1, 2 and 3 use a painted post-office interior and hide 2, 3 and 4 of its ten items, leaving level 4 onward completely unchanged.

**Architecture:** A painted background plate renders behind ten transparent PNG cutouts positioned by normalised bounding box. Hiding an item makes its `<img>` invisible while keeping its hit target. Rather than making `SceneDef` a discriminated union (which silently breaks `geometry.ts`, the generator and the tests), the *render payload* on `ObjectSlot` becomes the variable part and vector-only fields become optional. The scene is pinned to levels 1-3 by a new `LevelDef.sceneId` and is excluded from the general scene pool.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, Vitest, Dexie. Asset pipeline in Python 3 with OpenCV 5.0, numpy and PIL (no ML segmentation available - no rembg, torch, onnxruntime, scipy or skimage).

**Spec:** `docs/superpowers/specs/2026-07-30-picture-postcard-photo-scenes-design.md`

## Global Constraints

- **Never use the em dash.** Use a plain dash in all code comments, copy and commit messages.
- **Every commit bumps `"version"` in `package.json`.** This work is a minor bump: `1.1.1` -> `1.2.0`. Bump it once, in Task 13, and reference the same version in every earlier commit body only if you also amend - simplest is: earlier tasks do not touch `package.json`, Task 13 performs the single bump.
- **`npm run lint` must pass with no errors** before any commit.
- **`npm run build` must complete** without TypeScript or Vite errors before the final commit.
- **`npm test` (vitest run) must pass** at the end of every task that touches `src/`.
- Never commit secrets or `.env` files. Never use `--no-verify`.
- Do not add a co-author trailer to commit messages.
- Levels 4-100 must behave **byte-identically** to today. Any test asserting level 4+ behaviour that starts failing is a bug in the change, not a stale test.
- Photo trials must resolve, score and commit through **exactly** the same code path as vector trials. Do not add partial credit, do not rescale the wrong-tap budget, do not special-case scoring.
- Source images are AI-generated with no recorded prompt or seed. They are unreproducible - never delete them.

## File Structure

**Created:**

| Path | Responsibility |
|---|---|
| `assets-src/picture-postcard/post-office/README.md` | Asset provenance |
| `assets-src/picture-postcard/post-office/{base,clean,annotated}.webp` | Committed lossless sources |
| `assets-src/picture-postcard/post-office/boxes.json` | Calibrated per-item normalised bboxes |
| `scripts/pp-cut-scene.py` | Cutout extraction: grabCut mask-init, tone grade, WebP encode |
| `scripts/pp-preview.py` | Contact sheets + contact-point guard rail for positioning |
| `public/pp/scenes/post-office/background.webp` | Shipped background plate |
| `public/pp/scenes/post-office/items/*.webp` | Shipped item cutouts (10) |
| `src/games/memory/PicturePostcard/scenes/postOffice.ts` | The photo `SceneDef` |
| `src/games/memory/PicturePostcard/useSceneImages.ts` | Preload + decode gate for raster scenes |

**Modified:**

| Path | Change |
|---|---|
| `src/games/memory/PicturePostcard/scenes/types.ts` | Optional render payload + `backgroundImage`, `renderScale`, `pinned` |
| `src/games/memory/PicturePostcard/scenes/index.ts` | Register `postOffice` |
| `src/games/memory/PicturePostcard/geometry.ts` | Per-scene `renderScale` |
| `src/games/memory/PicturePostcard/SceneView.tsx` | Raster background + `<img>` items + `visibility` hiding |
| `src/games/memory/PicturePostcard/index.tsx` | Decode gate, pinned-scene bookkeeping skip, photo tip card |
| `src/lib/contentGenerators/picturePostcard.ts` | `supportsClass` guards, scene pinning, salience composition |
| `src/lib/picturePostcard/ladder.ts` | Dedupe curves, photo level overrides, `sceneId`, `changeComposition` |
| `src/lib/picturePostcard/engineCore.ts` | `tipCardPhotoShown` default |
| `src/lib/db.ts` | `tipCardPhotoShown` on `PpEngineRow` |
| `src/lib/picturePostcard/__tests__/{ladder,generator,scenes}.test.ts` | Scope assertions to vector scenes / levels 4+ |
| `public/locales/{en,hi,kn}/common.json` | Photo-mode copy |
| `vite.config.ts` | `webp` in `globPatterns` + runtime caching rule |
| `.gitignore` | Ignore stray root PNGs |
| `package.json` | Version bump |

---

## Task 1: Relocate and commit the source images

The five source PNGs sit untracked in the repo root at ~12.4 MB. They are unreproducible and must be committed, but as lossless WebP (~24% smaller) rather than PNG.

**Files:**
- Create: `assets-src/picture-postcard/post-office/README.md`
- Create: `assets-src/picture-postcard/post-office/{base,clean,annotated}.webp`
- Create: `assets-src/picture-postcard/seaside/{base,annotated}.webp`
- Modify: `.gitignore`
- Delete: `l2-base.png`, `l2-clean.png`, `l2-images.png`, `L1-base.png`, `L1-Items.png`

**Interfaces:**
- Produces: `assets-src/picture-postcard/post-office/base.webp`, `clean.webp`, `annotated.webp` - all 1448x1086 lossless RGB, consumed by Tasks 2-4.

- [ ] **Step 1: Convert the sources to lossless WebP**

```bash
mkdir -p assets-src/picture-postcard/post-office assets-src/picture-postcard/seaside
python - <<'PY'
from PIL import Image
pairs = [
    ('l2-base.png',  'assets-src/picture-postcard/post-office/base.webp'),
    ('l2-clean.png', 'assets-src/picture-postcard/post-office/clean.webp'),
    ('l2-images.png','assets-src/picture-postcard/post-office/annotated.webp'),
    ('L1-base.png',  'assets-src/picture-postcard/seaside/base.webp'),
    ('L1-Items.png', 'assets-src/picture-postcard/seaside/annotated.webp'),
]
for src, dst in pairs:
    im = Image.open(src).convert('RGB')
    im.save(dst, 'WEBP', lossless=True, quality=100, method=6)
    print(f'{dst}  {im.size}')
PY
```

Expected: five lines, every size `(1448, 1086)`.

- [ ] **Step 2: Verify the conversion is genuinely lossless**

```bash
python - <<'PY'
from PIL import Image
import numpy as np
for png, webp in [('l2-base.png','assets-src/picture-postcard/post-office/base.webp'),
                  ('l2-clean.png','assets-src/picture-postcard/post-office/clean.webp'),
                  ('l2-images.png','assets-src/picture-postcard/post-office/annotated.webp')]:
    a = np.asarray(Image.open(png).convert('RGB'), dtype=np.int16)
    b = np.asarray(Image.open(webp).convert('RGB'), dtype=np.int16)
    print(webp, 'max abs diff =', int(np.abs(a-b).max()))
PY
```

Expected: `max abs diff = 0` on all three. Any non-zero value means `lossless=True` did not apply - stop and fix before continuing.

- [ ] **Step 3: Write the provenance README**

Create `assets-src/picture-postcard/post-office/README.md`:

```markdown
# Post office scene - source assets

Used by the Picture Postcard photo scene at ladder levels 1-3.

| File | Contents |
|---|---|
| `base.webp` | Scene with all ten hero items present. Cutouts are extracted from this. |
| `clean.webp` | Scene with the ten items absent. Ships as the background plate. |
| `annotated.webp` | Scene with ten red ellipses marking the items. Source of the seed boxes. |
| `boxes.json` | Calibrated per-item normalised bounding boxes, in clean-plate coordinates. |

## Provenance

- Origin: AI image generation. Model, prompt and seed were not recorded.
- Received: 2026-07-30.
- Licensing terms: undocumented. Confirm before any use outside this app.
- The wall painting and the postcard both depict a building. Confirm it is not a
  recognisable trademarked landmark before any public marketing use.

**These images are unreproducible. Do not delete them.** Losing them means losing the
ability to re-cut an item.

## Registration

The three renders are independent generations, not edits of one another. They share one
camera and one room geometry but differ by a uniform scale and a tone grade. Measured by
SIFT + RANSAC partial-affine fit, 845 good matches, 728 inliers (86%):

    base -> clean:  scale 1.0113, rotation -0.011 deg, translation (-0.9, -0.1) px
                    median reprojection error 0.87 px, p90 2.11 px

The clean plate is roughly 5 L* brighter than base across the tabletop, rising to about
12 L* at the bottom-left corner. `scripts/pp-cut-scene.py` corrects for both.

## Known differences beyond the ten items

`clean.webp` also dropped the **pen cup** and the **ledger stack** on the counter, which
were never marked. The notice board contents and the pigeonhole letter arrangement also
differ from `base.webp`. None of this affects gameplay - those objects are not among the
ten - but do not assume the plate is a pixel-accurate inpaint, because it is not.
```

- [ ] **Step 4: Stop stray root images being committed in future**

Append to `.gitignore`:

```gitignore

# Loose source images dropped in the repo root - the committed copies live in assets-src/
/*.png
/*.jpg
```

- [ ] **Step 5: Remove the root PNGs and commit**

```bash
rm -f l2-base.png l2-clean.png l2-images.png L1-base.png L1-Items.png
git add assets-src .gitignore
git commit -m "chore: move picture-postcard source images into assets-src as lossless webp

The five source PNGs were sitting untracked in the repo root at ~12.4 MB. They are
AI-generated with no recorded prompt or seed, so they are unreproducible and must be
committed. Lossless WebP saves about 24% over PNG.

Records provenance and the measured registration between the three post-office renders."
```

---

## Task 2: Extract seed boxes from the annotated image

The ten red ellipses in `annotated.webp` give the item locations. They must be fitted individually - dilating to close the strokes merges the ten ellipses into eight blobs, one spanning 31% of the frame, so connected-component labelling does not work.

**Files:**
- Create: `scripts/pp-seed-boxes.py`
- Create: `assets-src/picture-postcard/post-office/boxes.json`

**Interfaces:**
- Consumes: `assets-src/picture-postcard/post-office/{base,annotated}.webp` from Task 1.
- Produces: `boxes.json`, a JSON object `{ "<slotId>": {"x":float,"y":float,"w":float,"h":float}, ... }` with ten entries, normalised 0-1 to 4 decimal places, **in clean-plate coordinates**. Consumed by Tasks 3, 4 and 6.

- [ ] **Step 1: Write the seed-box script**

Create `scripts/pp-seed-boxes.py`:

```python
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
```

The fitted ellipses are printed as a cross-check on the hand-authored boxes. The hand-authored boxes are authoritative because they were visually verified against `base.webp`; automatic ellipse-to-item assignment is not worth the ambiguity for ten fixed items.

- [ ] **Step 2: Run it**

```bash
python scripts/pp-seed-boxes.py
```

Expected: `wrote assets-src/picture-postcard/post-office/boxes.json with 10 entries`, and ten lines of coordinates. Every `x`, `y` should be >= 0 and every `x+w`, `y+h` <= 1.

- [ ] **Step 3: Assert the boxes are in range**

```bash
python - <<'PY'
import json
b = json.load(open('assets-src/picture-postcard/post-office/boxes.json'))
assert len(b) == 10, f'expected 10 boxes, got {len(b)}'
for k, v in b.items():
    assert 0 <= v['x'] and v['x'] + v['w'] <= 1, f'{k} x out of range: {v}'
    assert 0 <= v['y'] and v['y'] + v['h'] <= 1, f'{k} y out of range: {v}'
    assert v['w'] > 0 and v['h'] > 0, f'{k} degenerate: {v}'
print('all 10 boxes in range')
PY
```

Expected: `all 10 boxes in range`.

- [ ] **Step 4: Commit**

```bash
git add scripts/pp-seed-boxes.py assets-src/picture-postcard/post-office/boxes.json
git commit -m "feat: seed-box extraction for the post-office photo scene

Emits ten normalised item boxes in clean-plate coordinates, converting from the
hand-verified base-image boxes by the measured 1.0113 scale about the image centre.
Fits the red annotation ellipses individually as a cross-check - connected components
merges the ten overlapping ellipses into eight blobs, so it cannot be used here."
```

---

## Task 2 note on manual work

Three of the ten cutouts will not come out of an automated pass and need an image editor. Budget for this rather than discovering it:

- **satchel** - dark navy against dark wood and a dark doorway; its strap encloses a non-uniform background (table edge, floor tile, skirting). Automated extraction returned 0.6% foreground, a total failure.
- **letter-opener** - a thin brass blade within a few Lab units of the table wood along its lower edge; grabCut eats the tip.
- **magnifier** - the lens is genuinely transparent, showing table wood through it. A binary mask either deletes the glass or carries a wood-coloured disc that would travel with the item. Needs a hand-painted semi-transparent alpha.

Task 3 produces the best automated result for all ten and flags these three. Task 4's contact sheet is where you confirm the hand-fixed versions look right.

---

## Task 3: Cutout extraction pipeline

**Files:**
- Create: `scripts/pp-cut-scene.py`
- Create: `public/pp/scenes/post-office/items/*.webp` (10 files)
- Create: `public/pp/scenes/post-office/background.webp`

**Interfaces:**
- Consumes: `boxes.json` from Task 2, `base.webp` and `clean.webp` from Task 1.
- Produces: `public/pp/scenes/post-office/background.webp` (~146 KB) and `public/pp/scenes/post-office/items/<slotId>.webp` for each of the ten slot ids, RGBA, each cropped to its box and sized to match its normalised bbox against a 1448x1086 frame.

- [ ] **Step 1: Write the extraction script**

Create `scripts/pp-cut-scene.py`:

```python
"""Cut the ten hero items out of base.webp and encode the shipped photo-scene assets.

Rect-init grabCut cannot mark ENCLOSED background, so it fills the key's bow ring and
the satchel strap's loop with table wood. This combines a rect-init pass for the outer
silhouette with a Mahalanobis-seeded mask-init pass that punches out the holes.

Usage: python scripts/pp-cut-scene.py
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

# Items whose alpha cannot be recovered automatically. The script still emits its best
# attempt so there is something to hand-correct, but it says so loudly.
NEEDS_MANUAL = {
    'satchel': 'dark navy on dark wood; strap loop encloses mixed background',
    'letter-opener': 'thin brass blade, low Lab separation from the table wood',
    'magnifier': 'transparent lens - needs a hand-painted semi-transparent alpha',
}


def mahalanobis_map(lab, rect, pad):
    """Per-pixel Mahalanobis distance from the background colour model.

    The model is fitted on an annulus OUTSIDE the seed rect, so it describes whatever
    surface the item is resting on.
    """
    h, w = lab.shape[:2]
    x, y, bw, bh = rect
    outer = np.ones((h, w), bool)
    outer[max(0, y - pad):y + bh + pad, max(0, x - pad):x + bw + pad] = False
    ring = np.zeros((h, w), bool)
    ring[max(0, y - pad):y + bh + pad, max(0, x - pad):x + bw + pad] = True
    ring[y:y + bh, x:x + bw] = False
    del outer

    samples = lab[ring].reshape(-1, 3).astype(np.float64)
    if len(samples) < 50:
        return np.full((h, w), 10.0), ring
    mu = samples.mean(axis=0)
    cov = np.cov(samples, rowvar=False) + np.eye(3) * 1e-3
    inv = np.linalg.inv(cov)
    d = lab.reshape(-1, 3).astype(np.float64) - mu
    m = np.sqrt(np.einsum('ij,jk,ik->i', d, inv, d)).reshape(h, w)
    return m, ring


def extract_alpha(bgr, rect):
    """Binary alpha for one item: rect-init silhouette minus mask-init holes."""
    lab = cv2.cvtColor(bgr, cv2.COLOR_BGR2LAB)
    pad = max(12, int(min(rect[2], rect[3]) * 0.30))

    # Pass 1: rect-init grabCut gives a reliable outer silhouette.
    m1 = np.zeros(bgr.shape[:2], np.uint8)
    cv2.grabCut(bgr, m1, tuple(rect), np.zeros((1, 65), np.float64),
                np.zeros((1, 65), np.float64), 6, cv2.GC_INIT_WITH_RECT)
    outer = np.isin(m1, [cv2.GC_FGD, cv2.GC_PR_FGD])

    # Pass 2: Mahalanobis-seeded mask-init marks enclosed background as definite BGD.
    dist, ring = mahalanobis_map(lab, rect, pad)
    m2 = np.full(bgr.shape[:2], cv2.GC_PR_BGD, np.uint8)
    m2[dist < 1.8] = cv2.GC_BGD
    m2[(dist >= 3.2) & (dist < 6.0)] = cv2.GC_PR_FGD
    m2[dist >= 6.0] = cv2.GC_FGD
    m2[ring & (dist < 6.0)] = cv2.GC_BGD
    if (m2 == cv2.GC_FGD).sum() > 0 and (m2 == cv2.GC_BGD).sum() > 0:
        cv2.grabCut(bgr, m2, None, np.zeros((1, 65), np.float64),
                    np.zeros((1, 65), np.float64), 8, cv2.GC_INIT_WITH_MASK)

    alpha = outer & ~(dist < 2.0)
    alpha = cv2.morphologyEx(alpha.astype(np.uint8) * 255, cv2.MORPH_OPEN,
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
    for slot_id, b in boxes.items():
        x, y = int(b['x'] * w), int(b['y'] * h)
        bw, bh = int(b['w'] * w), int(b['h'] * h)
        # Work in a padded window so the annulus has room for its colour model.
        pad = max(20, int(min(bw, bh) * 0.5))
        wx0, wy0 = max(0, x - pad), max(0, y - pad)
        wx1, wy1 = min(w, x + bw + pad), min(h, y + bh + pad)
        window = base[wy0:wy1, wx0:wx1]
        rect = [x - wx0, y - wy0, bw, bh]

        alpha = soften(extract_alpha(window, rect))
        rgb = cv2.cvtColor(tone_grade(window), cv2.COLOR_BGR2RGB)

        rgba = np.dstack([rgb, alpha])[rect[1]:rect[1] + bh, rect[0]:rect[0] + bw]
        Image.fromarray(rgba, 'RGBA').save(
            OUT / 'items' / f'{slot_id}.webp', 'WEBP',
            quality=90, alpha_quality=100, method=6, icc_profile=srgb)

        size_kb = (OUT / 'items' / f'{slot_id}.webp').stat().st_size / 1024
        total += size_kb
        cover = float((rgba[:, :, 3] > 128).mean())
        flag = f'  <-- MANUAL: {NEEDS_MANUAL[slot_id]}' if slot_id in NEEDS_MANUAL else ''
        warn = '  !! coverage suspicious' if not 0.05 < cover < 0.95 else ''
        print(f'  {slot_id:<15} {size_kb:5.1f} KB  coverage {cover:4.2f}{warn}{flag}')

    print(f'items total {total:.1f} KB, scene total {total + kb:.1f} KB')
    if NEEDS_MANUAL:
        print('\nHand-correct the flagged items in an image editor before Task 4 sign-off.')


if __name__ == '__main__':
    main()
```

Note `alpha_quality=100` with `quality=90`: lossy colour with effectively lossless alpha. Fully lossy alpha produces visible halos on soft edges and must not be used.

- [ ] **Step 2: Run it**

```bash
python scripts/pp-cut-scene.py
```

Expected: `background.webp` around 140-155 KB, ten item lines, `items total` around 90-130 KB. The three `MANUAL` flags are expected and are not failures.

- [ ] **Step 3: Hand-correct the three flagged cutouts**

Open `public/pp/scenes/post-office/items/{satchel,letter-opener,magnifier}.webp` in an image editor and fix the alpha:

- **satchel** - reselect the body and the full shoulder strap; the strap's enclosed loop must be transparent, not filled with table wood.
- **letter-opener** - restore the blade tip that grabCut ate along the lower edge.
- **magnifier** - paint the lens alpha to roughly 25-35% rather than 0 or 100, so the glass reads as glass without carrying a wood-coloured disc.

Re-save each as WebP, quality 90, lossless alpha, same filename and same pixel dimensions. Do not change the canvas size - the bbox in `boxes.json` assumes it.

- [ ] **Step 4: Verify dimensions still match the boxes**

```bash
python - <<'PY'
import json, pathlib
from PIL import Image
W, H = 1448, 1086
boxes = json.load(open('assets-src/picture-postcard/post-office/boxes.json'))
items = pathlib.Path('public/pp/scenes/post-office/items')
bad = 0
for slot, b in boxes.items():
    im = Image.open(items / f'{slot}.webp')
    want = (int(b['w'] * W), int(b['h'] * H))
    ok = im.size == want and im.mode == 'RGBA'
    bad += not ok
    print(f"{slot:<15} {im.size} want {want} mode {im.mode} {'OK' if ok else 'MISMATCH'}")
raise SystemExit(bad)
PY
```

Expected: every line `OK`, exit code 0. A mismatch means a hand-edit changed the canvas - fix it before continuing.

- [ ] **Step 5: Commit**

```bash
git add scripts/pp-cut-scene.py public/pp/scenes/post-office
git commit -m "feat: cutout extraction pipeline and shipped post-office assets

Combines a rect-init grabCut pass for the outer silhouette with a Mahalanobis-seeded
mask-init pass that punches out enclosed background - rect-init alone fills the key's
bow ring and the satchel strap's loop with table wood.

Tone-grades each cutout toward the clean plate, which is about 5 L* brighter, so the
cutouts do not carry a dark rim. Ships lossy WebP with lossless alpha; fully lossy
alpha halos on soft edges.

The satchel, letter opener and magnifier lens are hand-corrected - the script flags
them and emits its best attempt to correct from."
```

---

## Task 4: Positioning contact sheets and the contact-point guard rail

Boxes are seeded by transform, not by eye, but they still need confirming - and the satchel and key sit near the clean plate's table corner, which is the one place the two renders genuinely diverge.

**Files:**
- Create: `scripts/pp-preview.py`
- Modify: `assets-src/picture-postcard/post-office/boxes.json` (calibration)

**Interfaces:**
- Consumes: `boxes.json`, `public/pp/scenes/post-office/**` from Task 3.
- Produces: calibrated `boxes.json`, and three preview images under the scratchpad. The guard rail exits non-zero if any item is not resting on a plausible surface.

- [ ] **Step 1: Write the preview script**

Create `scripts/pp-preview.py`:

```python
"""Composite the post-office cutouts onto the clean plate and check they sit on a surface.

Writes three contact sheets:
  pp-preview-composite.png   the scene as the app will render it
  pp-preview-labelled.png    the same, with each bbox stroked and labelled
  pp-preview-sidebyside.png  base | composite at matched scale

The side-by-side is the one that makes a 10px drift obvious. Also previews at the true
render width of 670 CSS px - a box that looks right at 1448 can be visibly off there.

Usage: python scripts/pp-preview.py [--out DIR]
"""
import argparse
import json
import pathlib
import sys

import cv2
import numpy as np
from PIL import Image

SRC = pathlib.Path('assets-src/picture-postcard/post-office')
OUT = pathlib.Path('public/pp/scenes/post-office')
RENDER_WIDTH = 670  # SceneView sits in max-w-2xl (672px) minus its 2px border

# Acceptable surfaces under an item's contact point, as Lab centres with a tolerance.
# Sampled from the clean plate: table wood, counter stone, floor tile.
SURFACES = [
    ('table wood',    (120.0, 145.0, 160.0), 34.0),
    ('counter stone', (185.0, 128.0, 133.0), 30.0),
    ('floor tile',    (205.0, 130.0, 140.0), 34.0),
]


def composite(clean_bgr, boxes):
    h, w = clean_bgr.shape[:2]
    out = clean_bgr.astype(np.float32).copy()
    for slot, b in boxes.items():
        item = Image.open(OUT / 'items' / f'{slot}.webp').convert('RGBA')
        arr = np.asarray(item)
        rgb = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR).astype(np.float32)
        a = (arr[:, :, 3:4].astype(np.float32)) / 255.0
        x, y = int(b['x'] * w), int(b['y'] * h)
        ih, iw = arr.shape[:2]
        if y + ih > h or x + iw > w:
            print(f'  {slot}: overflows the frame, skipped in preview', file=sys.stderr)
            continue
        region = out[y:y + ih, x:x + iw]
        out[y:y + ih, x:x + iw] = region * (1 - a) + rgb * a
    return out.astype(np.uint8)


def check_contact(clean_bgr, boxes):
    """Assert each item's bottom-centre sits on a known surface. Returns failure count."""
    h, w = clean_bgr.shape[:2]
    lab = cv2.cvtColor(clean_bgr, cv2.COLOR_BGR2LAB)
    failures = 0
    for slot, b in boxes.items():
        cx = int((b['x'] + b['w'] / 2) * w)
        cy = min(h - 1, int((b['y'] + b['h']) * h) + 4)
        patch = lab[max(0, cy - 8):cy + 8, max(0, cx - 8):cx + 8].reshape(-1, 3)
        mean = patch.mean(axis=0)
        best, dist = None, 1e9
        for name, centre, tol in SURFACES:
            d = float(np.linalg.norm(mean - np.array(centre)))
            if d < dist:
                best, dist = (name, tol), d
        ok = dist <= best[1]
        failures += not ok
        print(f'  {slot:<15} contact ({cx:4d},{cy:4d}) -> {best[0]:<13} '
              f'dE {dist:5.1f} {"OK" if ok else "FLOATING"}')
    return failures


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='.')
    args = ap.parse_args()
    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    clean = cv2.imread(str(SRC / 'clean.webp'))
    base = cv2.imread(str(SRC / 'base.webp'))
    boxes = json.loads((SRC / 'boxes.json').read_text(encoding='utf-8'))
    h, w = clean.shape[:2]

    comp = composite(clean, boxes)
    cv2.imwrite(str(out_dir / 'pp-preview-composite.png'), comp)

    labelled = comp.copy()
    for slot, b in boxes.items():
        p0 = (int(b['x'] * w), int(b['y'] * h))
        p1 = (int((b['x'] + b['w']) * w), int((b['y'] + b['h']) * h))
        cv2.rectangle(labelled, p0, p1, (0, 255, 0), 3)
        cv2.putText(labelled, slot, (p0[0] + 5, p0[1] + 28),
                    cv2.FONT_HERSHEY_SIMPLEX, 0.85, (0, 255, 0), 2)
    cv2.imwrite(str(out_dir / 'pp-preview-labelled.png'), labelled)

    sbs = np.hstack([base, comp])
    cv2.imwrite(str(out_dir / 'pp-preview-sidebyside.png'), sbs)

    small = cv2.resize(comp, (RENDER_WIDTH, int(RENDER_WIDTH * h / w)),
                       interpolation=cv2.INTER_AREA)
    cv2.imwrite(str(out_dir / 'pp-preview-rendersize.png'), small)

    print(f'wrote 4 previews to {out_dir}')
    print('contact-point check:')
    failures = check_contact(clean, boxes)
    if failures:
        print(f'\n{failures} item(s) not resting on a known surface - adjust boxes.json')
    raise SystemExit(failures)


if __name__ == '__main__':
    main()
```

- [ ] **Step 2: Run it and look at the sheets**

```bash
python scripts/pp-preview.py --out "$SCRATCHPAD"
```

where `$SCRATCHPAD` is the session scratchpad directory. Then read `pp-preview-sidebyside.png` and `pp-preview-rendersize.png` and check:

- every item sits on the table or counter, none floating or half-sunk
- the satchel and the key, which sit near the clean plate's table corner, are on wood not floor tile
- no item overlaps another in a way it does not in `base.webp`
- no dark halo rim around any cutout (if there is, raise `TONE_L_SHIFT` in Task 3's script and re-run it)

- [ ] **Step 3: Calibrate any item that needs it**

Adjust that item's entry in `assets-src/picture-postcard/post-office/boxes.json`, then re-run Task 3's `pp-cut-scene.py` (the crop depends on the box) and this preview. Repeat until the sheets look right and the contact check exits 0. Expect 3-5 iterations.

- [ ] **Step 4: Confirm the guard rail passes**

```bash
python scripts/pp-preview.py --out "$SCRATCHPAD"; echo "exit=$?"
```

Expected: every line `OK` and `exit=0`.

- [ ] **Step 5: Commit**

```bash
git add scripts/pp-preview.py assets-src/picture-postcard/post-office/boxes.json public/pp/scenes/post-office
git commit -m "feat: positioning contact sheets and contact-point guard rail

Composites the cutouts onto the clean plate at 1448px and at the true 670px render
width, plus a base-versus-composite side-by-side that makes small drift obvious.

The guard rail samples the plate under each item's bottom-centre and fails the run if
it is not table wood, counter stone or floor tile, so a floating item cannot pass
review by eye alone."
```

---

## Task 5: Optional render payload and per-scene render scale

The naive change - making `SceneDef` a discriminated union - breaks `geometry.ts`, `placeLures`, `pickVisibleSlots`, `buildM3` and the scene tests, and several of those fail *silently* by returning `null`. Instead the render payload on `ObjectSlot` becomes optional and the generator gains explicit per-class capability guards.

**Files:**
- Modify: `src/games/memory/PicturePostcard/scenes/types.ts`
- Modify: `src/games/memory/PicturePostcard/geometry.ts`
- Modify: `src/lib/contentGenerators/picturePostcard.ts`
- Test: `src/lib/picturePostcard/__tests__/geometry.test.ts` (create)

**Interfaces:**
- Produces:
  - `ObjectSlot` with `spriteId?`, `baseFill?`, `imageSrc?`, `variants?`, `altPositions?`, `lures?` and required `id`, `category`, `bbox`, `salience`, `centrality`.
  - `SceneDef` with `backgroundImage?: string`, `renderScale?: number`, `pinned?: boolean`.
  - `inflateBBox(b, k?)` unchanged; `changeBBox(scene, change)` and `annotationBBox(scene, change, view)` now use `scene.renderScale ?? SPRITE_RENDER_SCALE`.
  - `supportsClass(slot: ObjectSlot, cls: ChangeClass): boolean` exported from the generator for tests.

- [ ] **Step 1: Write the failing test**

Create `src/lib/picturePostcard/__tests__/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { changeBBox, annotationBBox, SPRITE_RENDER_SCALE } from '../../../games/memory/PicturePostcard/geometry';
import type { SceneDef } from '../../../games/memory/PicturePostcard/scenes';

const slot = {
  id: 'a', category: 'thing', bbox: { x: 0.4, y: 0.4, w: 0.2, h: 0.2 },
  salience: 2 as const, centrality: 2 as const, imageSrc: '/x.webp',
};

const vectorScene = { id: 'v', theme: 't', background: [], slots: [slot] } as unknown as SceneDef;
const photoScene = { ...vectorScene, id: 'p', renderScale: 1 } as unknown as SceneDef;

describe('geometry renderScale', () => {
  it('defaults to SPRITE_RENDER_SCALE when the scene does not set one', () => {
    const b = changeBBox(vectorScene, { changeClass: 1, slotId: 'a' })!;
    expect(b.w).toBeCloseTo(0.2 * SPRITE_RENDER_SCALE, 6);
    expect(b.x + b.w / 2).toBeCloseTo(0.5, 6); // centre is inflation-invariant
  });

  it('honours a per-scene renderScale of 1 for raster scenes', () => {
    const b = changeBBox(photoScene, { changeClass: 1, slotId: 'a' })!;
    expect(b).toEqual({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
  });

  it('applies the same scale to annotationBBox', () => {
    expect(annotationBBox(photoScene, { changeClass: 1, slotId: 'a' }, 'original'))
      .toEqual({ x: 0.4, y: 0.4, w: 0.2, h: 0.2 });
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/picturePostcard/__tests__/geometry.test.ts`
Expected: FAIL - the `renderScale: 1` cases return inflated boxes because `changeBBox` still hard-codes `SPRITE_RENDER_SCALE`.

- [ ] **Step 3: Widen the scene types**

In `src/games/memory/PicturePostcard/scenes/types.ts`, replace `ObjectSlot` and `SceneDef`:

```ts
export interface ObjectSlot {
  id: string;
  category: string;            // i18n key suffix pp.category.<category>
  bbox: { x: number; y: number; w: number; h: number }; // scene-normalised 0-1
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;

  // Render payload - vector scenes set spriteId + baseFill, raster scenes set imageSrc.
  spriteId?: string;
  baseFill?: string;           // the sprite's authored colour for this slot
  imageSrc?: string;           // public path to a transparent cutout

  // Vector-only. A slot without these cannot take change classes 2 and 4-7; the
  // generator's supportsClass() enforces that rather than the renderer guessing.
  variants?: SlotVariants;
  altPositions?: [{ x: number; y: number }, { x: number; y: number }];
  lures?: [string, string, string]; // sprite ids ordered most->least similar
}

export interface SceneDef {
  id: string;
  theme: string;               // i18n key suffix pp.theme.<theme>
  background: BackgroundLayer[];
  backgroundImage?: string;    // raster scenes; when set, `background` is []
  /** Painted-size multiplier. Vector sprites are authored small (1.5); raster
   *  cutouts are authored at true size (1.0). Defaults to SPRITE_RENDER_SCALE. */
  renderScale?: number;
  /** Pinned scenes are bound to specific levels and never enter the random pool. */
  pinned?: boolean;
  slots: ObjectSlot[];
}
```

- [ ] **Step 4: Thread renderScale through geometry**

In `src/games/memory/PicturePostcard/geometry.ts`, replace `changeBBox` and `annotationBBox`:

```ts
/** Scene-normalised bbox a given change occupies on the MODIFIED scene (at painted size). */
export function changeBBox(
  scene: SceneDef,
  change: AppliedChange,
): { x: number; y: number; w: number; h: number } | null {
  const slot = scene.slots.find((s) => s.id === change.slotId);
  if (!slot) return null;
  const k = scene.renderScale ?? SPRITE_RENDER_SCALE;
  if ((change.changeClass === 2 || change.changeClass === 3) && change.newPosition) {
    return inflateBBox({ x: change.newPosition.x, y: change.newPosition.y, w: slot.bbox.w, h: slot.bbox.h }, k);
  }
  return inflateBBox(slot.bbox, k);
}

/**
 * Where a change should be ANNOTATED during corrective feedback. The original
 * scene is shown, so classes 2/3 (addition / translocation) annotate the slot's
 * original position context; on the modified scene they annotate the new spot.
 */
export function annotationBBox(
  scene: SceneDef,
  change: AppliedChange,
  view: 'original' | 'modified',
): { x: number; y: number; w: number; h: number } | null {
  const slot = scene.slots.find((s) => s.id === change.slotId);
  if (!slot) return null;
  if (view === 'modified') return changeBBox(scene, change);
  return inflateBBox(slot.bbox, scene.renderScale ?? SPRITE_RENDER_SCALE);
}
```

- [ ] **Step 5: Add per-class capability guards to the generator**

In `src/lib/contentGenerators/picturePostcard.ts`, add `supportsClass` above `eligiblePool` and rewrite `eligiblePool` and `applyChangeClass`:

```ts
/**
 * Whether a slot carries the data a given change class needs. Raster slots only carry
 * a bbox and an image, so this is what confines photo scenes to removal without any
 * scene-kind branching downstream.
 */
export function supportsClass(s: ObjectSlot, cls: ChangeClass): boolean {
  switch (cls) {
    case 1: return true;
    case 2: return !!s.variants && !!s.altPositions;
    case 3: return !!s.altPositions;
    case 4: return !!s.variants && s.variants.colours.length > 0;
    case 5: return !!s.variants;
    case 6: return !!s.variants;
    case 7: return !!s.spriteId && !!SPRITES[s.spriteId]?.mirrorable;
    default: return false;
  }
}

/** Rule 3: which slots a given change class may legally target. */
function eligiblePool(cls: ChangeClass, visible: ObjectSlot[], invisible: ObjectSlot[], used: Set<string>): ObjectSlot[] {
  const pool = cls === 2 ? invisible : visible;
  return pool.filter((s) => !used.has(s.id) && supportsClass(s, cls));
}

/** Rule 2/3: compute the per-class payload for a change already targeted at `slot`.
 *  Returns null when the slot lacks the payload; eligiblePool should already have
 *  excluded it, so null means buildChanges retries rather than emitting a broken change. */
function applyChangeClass(scene: SceneDef, slot: ObjectSlot, cls: ChangeClass, rng: () => number): AppliedChange | null {
  void scene;
  switch (cls) {
    case 1:
      return { changeClass: 1, slotId: slot.id };
    case 2: {
      if (!slot.altPositions || !slot.variants) return null;
      const pos = slot.altPositions[Math.floor(rng() * slot.altPositions.length)];
      return { changeClass: 2, slotId: slot.id, addedSpriteId: slot.variants.alternate, newPosition: pos };
    }
    case 3: {
      if (!slot.altPositions) return null;
      const pos = slot.altPositions[Math.floor(rng() * slot.altPositions.length)];
      return { changeClass: 3, slotId: slot.id, newPosition: pos };
    }
    case 4: {
      if (!slot.variants) return null;
      const fill = slot.variants.colours[Math.floor(rng() * slot.variants.colours.length)];
      return { changeClass: 4, slotId: slot.id, newFill: fill };
    }
    case 5:
      if (!slot.variants) return null;
      return { changeClass: 5, slotId: slot.id, newSpriteId: slot.variants.alternate };
    case 6: {
      if (!slot.variants) return null;
      const [lo, hi] = slot.variants.scales;
      return { changeClass: 6, slotId: slot.id, newScale: rng() < 0.5 ? lo : hi };
    }
    case 7:
    default:
      return { changeClass: 7, slotId: slot.id, mirrored: true };
  }
}
```

- [ ] **Step 6: Handle the nullable return in buildChanges**

In the same file, inside `buildChanges`, replace the fallback block so a `null` payload is treated as an ineligible combination:

```ts
    if (!applied) {
      // never throw: fall back to the first still-eligible (class, slot) combination
      const fallback = (Object.keys(weights) as unknown as ChangeClass[])
        .map(Number as unknown as (c: unknown) => ChangeClass)
        .map((cls) => ({ cls, pool: eligiblePool(cls, visible, invisible, used) }))
        .find((p) => p.pool.length > 0);
      if (!fallback) break; // truly nothing left to change
      const target = fallback.pool[Math.floor(rng() * fallback.pool.length)];
      applied = applyChangeClass(scene, target, fallback.cls, rng);
      if (!applied) break;
    }
```

- [ ] **Step 7: Guard the remaining optional-field readers**

In `placeLures`, replace the `targets` filter so lure-less slots are skipped:

```ts
  const targets = changes
    .map((c) => scene.slots.find((sl) => sl.id === c.slotId))
    .filter((s): s is ObjectSlot => !!s && !!s.lures);
```

and inside its loop, replace `const spriteId = source.lures[lureIndex];` with:

```ts
      const spriteId = source.lures?.[lureIndex];
      if (!spriteId) continue;
```

At the top of `buildM3`, add a guard before `const name = ...`:

```ts
  // M3 needs the full vector payload. Raster slots never reach here - photo levels are
  // tier 1, which is M2-only - but the guard keeps the type honest.
  if (!slot.spriteId || !slot.baseFill || !slot.variants || !slot.lures) return undefined;
  const spriteId = slot.spriteId;
  const baseFill = slot.baseFill;
  const variants = slot.variants;
  const lures = slot.lures;
```

then replace every `slot.spriteId`, `slot.baseFill`, `slot.variants` and `slot.lures` inside `buildM3`'s option arrays with the locals `spriteId`, `baseFill`, `variants` and `lures`.

- [ ] **Step 8: Run the geometry test**

Run: `npx vitest run src/lib/picturePostcard/__tests__/geometry.test.ts`
Expected: PASS, 3 tests.

- [ ] **Step 9: Run the whole suite and lint**

```bash
npm test && npm run lint
```

Expected: all existing tests still pass (no scene sets `renderScale` yet, so behaviour is unchanged), lint clean.

- [ ] **Step 10: Commit**

```bash
git add src/games/memory/PicturePostcard/scenes/types.ts src/games/memory/PicturePostcard/geometry.ts src/lib/contentGenerators/picturePostcard.ts src/lib/picturePostcard/__tests__/geometry.test.ts
git commit -m "refactor: optional slot render payload and per-scene render scale

Makes the render payload on ObjectSlot the variable part rather than turning SceneDef
into a discriminated union. A top-level union breaks geometry.ts, placeLures,
pickVisibleSlots and buildM3, and several of those fail silently by returning null -
which would mean no found-markers during the probe and no annotation during feedback.

Adds supportsClass() so a slot's capabilities, not a scene-kind branch, decide which
change classes can target it. Adds SceneDef.renderScale so raster cutouts, which are
authored at true size, are not inflated by the 1.5x meant for vector sprites."
```

---

## Task 6: The post-office scene definition

**Files:**
- Create: `src/games/memory/PicturePostcard/scenes/postOffice.ts`
- Modify: `src/games/memory/PicturePostcard/scenes/index.ts`
- Modify: `src/lib/picturePostcard/__tests__/scenes.test.ts`

**Interfaces:**
- Consumes: `boxes.json` values from Task 4, `SceneDef`/`ObjectSlot` from Task 5.
- Produces: `postOffice: SceneDef` with `id: 'post-office'`, `pinned: true`, `renderScale: 1`, `backgroundImage: '/pp/scenes/post-office/background.webp'`, and exactly 10 slots with ids `scale`, `bell`, `parcel`, `magnifier`, `stamp`, `ink-pad`, `satchel`, `postcard`, `letter-opener`, `key`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/picturePostcard/__tests__/scenes.test.ts`, at the end of the file:

```ts
describe('post-office photo scene', () => {
  const photo = SCENES.find((s) => s.id === 'post-office');

  it('is registered, pinned, and raster', () => {
    expect(photo).toBeDefined();
    expect(photo!.pinned).toBe(true);
    expect(photo!.renderScale).toBe(1);
    expect(photo!.backgroundImage).toBe('/pp/scenes/post-office/background.webp');
    expect(photo!.background).toHaveLength(0);
  });

  it('has exactly the ten marked items, each with an image and no vector payload', () => {
    expect(photo!.slots).toHaveLength(10);
    expect(photo!.slots.map((s) => s.id).sort()).toEqual([
      'bell', 'ink-pad', 'key', 'letter-opener', 'magnifier',
      'parcel', 'postcard', 'satchel', 'scale', 'stamp',
    ]);
    for (const s of photo!.slots) {
      expect(s.imageSrc, s.id).toBe(`/pp/scenes/post-office/items/${s.id}.webp`);
      expect(s.spriteId, s.id).toBeUndefined();
      expect(s.variants, s.id).toBeUndefined();
      expect(s.lures, s.id).toBeUndefined();
    }
  });

  it('has bboxes inside the frame', () => {
    for (const s of photo!.slots) {
      expect(s.bbox.x, s.id).toBeGreaterThanOrEqual(0);
      expect(s.bbox.y, s.id).toBeGreaterThanOrEqual(0);
      expect(s.bbox.x + s.bbox.w, s.id).toBeLessThanOrEqual(1);
      expect(s.bbox.y + s.bbox.h, s.id).toBeLessThanOrEqual(1);
    }
  });

  it('can satisfy every salience composition the photo levels ask for', () => {
    const count = (n: number) => photo!.slots.filter((s) => s.salience === n).length;
    expect(count(3)).toBeGreaterThanOrEqual(1); // L1/L2/L3 each need one
    expect(count(2)).toBeGreaterThanOrEqual(2); // L3 needs two
    expect(count(1)).toBeGreaterThanOrEqual(1); // L2/L3 each need one
  });
});
```

- [ ] **Step 2: Run it to confirm it fails**

Run: `npx vitest run src/lib/picturePostcard/__tests__/scenes.test.ts`
Expected: FAIL - `photo` is `undefined`, plus the existing vector assertions now fail because they will run against nothing new yet. Only the new `describe` should fail at this point.

- [ ] **Step 3: Write the scene**

Create `src/games/memory/PicturePostcard/scenes/postOffice.ts`. The bbox values below are the Task 2 seeds; **replace each one with the calibrated value from `assets-src/picture-postcard/post-office/boxes.json`** after Task 4:

```ts
import type { SceneDef } from './types';

/**
 * Raster scene: a village post office interior, pinned to ladder levels 1-3.
 *
 * The background is a painted plate with the ten hero items absent; each item is a
 * transparent cutout layered on top at its authored bbox. Hiding an item is change
 * class 1 and is the only class this scene supports - the slots carry no variants,
 * altPositions or lures, so the generator's supportsClass() excludes classes 2 and 4-7
 * automatically.
 *
 * Salience is authored: 3 = large and high contrast, 2 = mid, 1 = small or poorly
 * separated from its background. It drives which items each level hides, so that a
 * level-1 trial hiding the satchel is comparable to one hiding the parcel.
 *
 * bbox values come from assets-src/picture-postcard/post-office/boxes.json. Regenerate
 * with scripts/pp-seed-boxes.py and verify with scripts/pp-preview.py before editing
 * them by hand.
 */
const ITEM = (id: string) => `/pp/scenes/post-office/items/${id}.webp`;

export const postOffice: SceneDef = {
  id: 'post-office',
  theme: 'postOffice',
  background: [],
  backgroundImage: '/pp/scenes/post-office/background.webp',
  renderScale: 1,
  pinned: true,
  slots: [
    { id: 'scale',         category: 'weighingScale', imageSrc: ITEM('scale'),
      bbox: { x: 0.0651, y: 0.3908, w: 0.1770, h: 0.0910 }, salience: 3, centrality: 2 },
    { id: 'bell',          category: 'bell', imageSrc: ITEM('bell'),
      bbox: { x: 0.4393, y: 0.4343, w: 0.0556, h: 0.0485 }, salience: 1, centrality: 3 },
    { id: 'parcel',        category: 'parcel', imageSrc: ITEM('parcel'),
      bbox: { x: 0.1592, y: 0.5506, w: 0.1942, h: 0.1668 }, salience: 3, centrality: 2 },
    { id: 'magnifier',     category: 'magnifier', imageSrc: ITEM('magnifier'),
      bbox: { x: 0.2977, y: 0.6719, w: 0.1639, h: 0.1335 }, salience: 2, centrality: 3 },
    { id: 'stamp',         category: 'rubberStamp', imageSrc: ITEM('stamp'),
      bbox: { x: 0.4444, y: 0.5971, w: 0.0657, h: 0.1153 }, salience: 2, centrality: 3 },
    { id: 'ink-pad',       category: 'inkPad', imageSrc: ITEM('ink-pad'),
      bbox: { x: 0.5182, y: 0.5971, w: 0.0981, h: 0.1285 }, salience: 2, centrality: 3 },
    { id: 'satchel',       category: 'satchel', imageSrc: ITEM('satchel'),
      bbox: { x: 0.6163, y: 0.5890, w: 0.2528, h: 0.2569 }, salience: 3, centrality: 2 },
    { id: 'postcard',      category: 'postcard', imageSrc: ITEM('postcard'),
      bbox: { x: 0.4424, y: 0.7376, w: 0.1739, h: 0.0810 }, salience: 2, centrality: 3 },
    { id: 'letter-opener', category: 'letterOpener', imageSrc: ITEM('letter-opener'),
      bbox: { x: 0.2492, y: 0.8135, w: 0.2811, h: 0.0941 }, salience: 1, centrality: 2 },
    { id: 'key',           category: 'key', imageSrc: ITEM('key'),
      bbox: { x: 0.7579, y: 0.8722, w: 0.1284, h: 0.0697 }, salience: 1, centrality: 1 },
  ],
};
```

- [ ] **Step 4: Register it**

In `src/games/memory/PicturePostcard/scenes/index.ts`, add the import and extend `SCENES`:

```ts
import { postOffice } from './postOffice';

export const SCENES: SceneDef[] = [park, marketIndian, templeStreet, teaStall, seaside, kitchen, garden, cafe, postOffice];
```

- [ ] **Step 5: Scope the existing vector assertions**

In `src/lib/picturePostcard/__tests__/scenes.test.ts`, add a filtered list under the imports and use it for the vector-only blocks:

```ts
// Raster scenes carry no sprites, variants or lures. These assertions describe the
// vector scene contract only.
const VECTOR_SCENES = SCENES.filter((s) => !s.backgroundImage);
```

Then change the first test to:

```ts
  it('has 8 vector scenes plus 1 photo scene, each vector scene with >= 20 slots', () => {
    expect(SCENES.length).toBe(9);
    expect(VECTOR_SCENES.length).toBe(8);
    for (const scene of VECTOR_SCENES) {
      expect(scene.slots.length, `${scene.id} slot count`).toBeGreaterThanOrEqual(20);
    }
  });
```

and change the per-scene loop header from `for (const scene of SCENES) {` to `for (const scene of VECTOR_SCENES) {`.

Inside that loop, the assertions read optional fields, so make them non-null explicitly - replace the first two `it` bodies' inner lines:

```ts
        for (const s of scene.slots) {
          expect(SPRITES[s.spriteId!], `${s.id} sprite`).toBeDefined();
          expect(SPRITES[s.variants!.alternate], `${s.id} alternate`).toBeDefined();
          for (const l of s.lures!) expect(SPRITES[l], `${s.id} lure ${l}`).toBeDefined();
        }
```

```ts
        for (const s of scene.slots) {
          expect(s.variants!.colours.length, s.id).toBeGreaterThanOrEqual(3);
          expect(new Set([s.baseFill!, ...s.variants!.colours]).size).toBe(s.variants!.colours.length + 1);
        }
```

and in the bbox test replace `for (const p of s.altPositions) {` with `for (const p of s.altPositions!) {`, and in the mirrorable test replace `SPRITES[s.spriteId].mirrorable` with `SPRITES[s.spriteId!].mirrorable`.

- [ ] **Step 6: Run the scene tests**

Run: `npx vitest run src/lib/picturePostcard/__tests__/scenes.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the whole suite**

```bash
npm test
```

Expected: `generator.test.ts` now FAILS on `avoids scenes used this session` - it excludes `SCENES.slice(0, 7)` and expects `SCENES[7]`, but with 9 scenes two candidates remain. That is fixed in Task 8. Note the failure and continue; do not "fix" it by weakening the assertion here.

- [ ] **Step 8: Commit**

```bash
git add src/games/memory/PicturePostcard/scenes/postOffice.ts src/games/memory/PicturePostcard/scenes/index.ts src/lib/picturePostcard/__tests__/scenes.test.ts
git commit -m "feat: post-office photo scene definition

Ten hero items as raster cutouts over a painted plate, pinned and render-scaled 1.0.
The slots carry no variants, altPositions or lures, so supportsClass() confines the
scene to change class 1 without any scene-kind branching.

Scopes the vector scene contract assertions to vector scenes."
```

---

## Task 7: Render raster scenes in SceneView

**Files:**
- Modify: `src/games/memory/PicturePostcard/SceneView.tsx`

**Interfaces:**
- Consumes: `SceneDef.backgroundImage`, `SceneDef.renderScale`, `ObjectSlot.imageSrc` from Tasks 5-6.
- Produces: no new exports. `SceneView`'s prop contract is unchanged.

- [ ] **Step 1: Add imageSrc to the render target type**

In `src/games/memory/PicturePostcard/SceneView.tsx`, extend `RenderTarget`:

```ts
interface RenderTarget {
  id: string;
  bbox: BBox;
  spriteId?: string;
  imageSrc?: string;
  fill?: string;
  mirrored?: boolean;
  scale?: number;
  /** false = removed by a class-1 change: not painted, but still hit-testable. */
  visible: boolean;
}
```

- [ ] **Step 2: Carry imageSrc through the render-target builder**

In the same file, in the `renderTargets` `useMemo`, add `imageSrc: slot.imageSrc` to every `out.push({ ... })` that references a `slot`, and use the scene's render scale for the final inflation. Replace the closing lines of the memo:

```ts
    // Paint (and therefore hit-test, pulse, dim) at the inflated render size so
    // sprites read clearly at postcard scale; centres are unchanged. Raster scenes
    // set renderScale 1 - their cutouts are already authored at true size.
    const k = scene.renderScale ?? SPRITE_RENDER_SCALE;
    return out.map((rt) => ({ ...rt, bbox: inflateBBox(rt.bbox, k) }));
  }, [scene, modifications, visibleSlotIds]);
```

and update the import to bring in the constant:

```ts
import { inflateBBox, SPRITE_RENDER_SCALE } from './geometry';
```

For the class-2 block at the end of the memo, `originSlot.imageSrc` is the right source:

```ts
      out.push({
        id: mod.slotId,
        bbox: { x: mod.newPosition.x, y: mod.newPosition.y, w: originSlot.bbox.w, h: originSlot.bbox.h },
        spriteId: mod.addedSpriteId,
        imageSrc: originSlot.imageSrc,
        fill: originSlot.baseFill,
        visible: true,
      });
```

- [ ] **Step 3: Render the raster background**

In the same file, immediately before the `{scene.background.map(...)}` block, add:

```tsx
      {scene.backgroundImage && (
        <img
          src={scene.backgroundImage}
          alt=""
          aria-hidden
          draggable={false}
          fetchPriority="high"
          className="absolute inset-0 w-full h-full pointer-events-none"
          // `fill`, not `cover`: the plate is authored at exactly 4:3, so there is
          // nothing to crop, and `cover` would silently shift every authored bbox.
          // Absolute positioning is required because .scene-board has p-3 padding and
          // a flow child would be inset 12px away from the items.
          style={{ objectFit: 'fill' }}
        />
      )}
```

- [ ] **Step 4: Paint raster items and keep hidden ones hit-testable**

In the same file, replace the body of the `renderTargets.map(...)` block:

```tsx
      {renderTargets.map((rt) => {
        const entry = rt.spriteId ? SPRITES[rt.spriteId] : undefined;
        return (
          <div
            key={rt.id}
            className="absolute"
            style={{
              ...boxStyle(rt.bbox),
              filter: dimNonTargets && rt.id !== dimExemptId ? 'saturate(0.92)' : undefined,
            }}
          >
            {/* Raster items stay MOUNTED when hidden and go invisible instead. Removing
                the element would drop its decoded bitmap, risking a decode stall when
                feedback reveals it - and SceneView relies on removed slots remaining in
                renderTargets so handleTap can still resolve a tap on the empty spot. */}
            {rt.imageSrc && (
              <img
                src={rt.imageSrc}
                alt=""
                aria-hidden
                draggable={false}
                className="absolute inset-0 w-full h-full pointer-events-none"
                style={{
                  objectFit: 'fill',
                  visibility: rt.visible ? 'visible' : 'hidden',
                  transform: rt.mirrored ? 'scaleX(-1)' : undefined,
                }}
              />
            )}
            {!rt.imageSrc && rt.visible && entry && (
              <entry.Component fill={rt.fill} mirrored={rt.mirrored} scale={rt.scale} />
            )}
            {pulseSlotId === rt.id && (
              <div className="absolute inset-0 pp-scene-pulse-overlay pointer-events-none rounded-full bg-white/40" />
            )}
          </div>
        );
      })}
```

- [ ] **Step 5: Guard the lure renderer against slots without sprites**

In the same file, the `lures.map(...)` block already does `const entry = SPRITES[lure.spriteId]; if (!entry) return null;` - no change needed. Confirm by reading it.

- [ ] **Step 6: Typecheck and lint**

```bash
npx tsc -b --noEmit && npm run lint
```

Expected: no errors. If `fetchPriority` is rejected by the React 18 types, use `{...{ fetchpriority: 'high' }}` spread instead.

- [ ] **Step 7: Run the suite**

```bash
npm test
```

Expected: same single known failure in `generator.test.ts` from Task 6, nothing new.

- [ ] **Step 8: Commit**

```bash
git add src/games/memory/PicturePostcard/SceneView.tsx
git commit -m "feat: render raster scenes in SceneView

Paints an absolutely-positioned background plate and per-item cutout images alongside
the existing vector sprite path, honouring the scene's renderScale.

Hidden raster items stay mounted with visibility:hidden rather than being unmounted.
Unmounting would drop the decoded bitmap and, more importantly, SceneView depends on
removed slots staying in renderTargets so a tap on the empty spot still resolves - if
they left the list every tap would count as wrong and the trial would be unwinnable.

The background is absolutely positioned because .scene-board has p-3 padding, and uses
object-fit fill because the plate is authored at exactly 4:3."
```

---

## Task 8: Pin the photo scene to levels 1-3

**Files:**
- Modify: `src/lib/picturePostcard/ladder.ts`
- Modify: `src/lib/contentGenerators/picturePostcard.ts`
- Modify: `src/games/memory/PicturePostcard/index.tsx`
- Modify: `src/lib/picturePostcard/__tests__/generator.test.ts`

**Interfaces:**
- Produces: `LevelDef.sceneId?: string`. `generateTrial` returns `sceneId === 'post-office'` for levels 1-3 and never returns it otherwise.

- [ ] **Step 1: Write the failing tests**

Add to `src/lib/picturePostcard/__tests__/generator.test.ts`, at the end of the outer `describe`:

```ts
  it('levels 1-3 always use the pinned photo scene', () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        expect(gen(level).sceneId).toBe('post-office');
      }
    }
  });

  it('the pinned photo scene is never chosen at any other level', () => {
    for (const level of [4, 10, 27, 45, 80, 100]) {
      for (let i = 0; i < 20; i++) {
        expect(gen(level).sceneId).not.toBe('post-office');
      }
    }
  });

  it('photo trials only ever apply class-1 removals', () => {
    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 20; i++) {
        for (const c of gen(level).changes) expect(c.changeClass).toBe(1);
      }
    }
  });

  it('pinning ignores session and pair history', () => {
    const t = gen(1, {
      scenesThisSession: ['post-office'],
      pairHistory: [{ sceneId: 'post-office', changeClass: 1, lastUsedDate: todayISO() }],
    });
    expect(t.sceneId).toBe('post-office');
  });
```

- [ ] **Step 2: Fix the stale session-exclusion test**

In the same file, replace the `avoids scenes used this session` test. It currently excludes `SCENES.slice(0, 7)` and expects `SCENES[7]`; with 9 scenes and one of them pinned, that is ambiguous. Make the intent explicit:

```ts
  it('avoids scenes used this session', () => {
    const pool = SCENES.filter((s) => !s.pinned);
    const used = pool.slice(0, pool.length - 1).map((s) => s.id);
    const expected = pool[pool.length - 1].id;
    for (let i = 0; i < 10; i++) {
      expect(gen(10, { scenesThisSession: used }).sceneId).toBe(expected);
    }
  });
```

Level 10 rather than level 1, because level 1 is now pinned and would bypass the pool entirely.

- [ ] **Step 3: Run to confirm they fail**

Run: `npx vitest run src/lib/picturePostcard/__tests__/generator.test.ts`
Expected: FAIL on the four new tests - `sceneId` is a random vector scene at levels 1-3.

- [ ] **Step 4: Add sceneId to the ladder**

In `src/lib/picturePostcard/ladder.ts`, add the constant and the field. Put the constant just below `M3_ELIGIBLE_CLASSES`:

```ts
/** Levels bound to a specific scene rather than drawing from the random pool.
 *  The post-office photo scene supports change class 1 only, so it must never be
 *  reachable above the levels that ask for removals alone. */
export const PINNED_SCENE_BY_LEVEL: Record<number, string> = {
  1: 'post-office', 2: 'post-office', 3: 'post-office',
};
```

Add to the `LevelDef` interface:

```ts
  /** When set, the generator uses this scene instead of picking from the pool. */
  sceneId?: string;
```

And in `buildLevel`'s returned object, add:

```ts
    sceneId: PINNED_SCENE_BY_LEVEL[n],
```

- [ ] **Step 5: Short-circuit scene selection in the generator**

In `src/lib/contentGenerators/picturePostcard.ts`, exclude pinned scenes from the pool. Replace the three pool lines inside `pickScene`:

```ts
  const poolScenes = SCENES.filter((s) => !s.pinned);
  const sessionFiltered = poolScenes.filter((s) => !scenesThisSession.includes(s.id));
  let pool = sessionFiltered.filter((s) => !conflicted(s));
  if (pool.length === 0) pool = sessionFiltered;       // relax the 30-day pair rule
  if (pool.length === 0) pool = poolScenes;            // relax the session rule too
  return pool[Math.floor(rng() * pool.length)];
```

Then in `generateTrial`, replace the scene line:

```ts
  // Rule 1, with a pinned override: level-bound scenes bypass the pool entirely, so
  // session-uniqueness and the 30-day pair rule do not apply to them.
  const pinned = levelDef.sceneId ? SCENES.find((s) => s.id === levelDef.sceneId) : undefined;
  const scene = pinned ?? pickScene(levelDef, scenesThisSession, pairHistory, rng);
```

- [ ] **Step 6: Skip session and pair bookkeeping for pinned scenes**

In `src/games/memory/PicturePostcard/index.tsx`, replace the `markSceneUsed` call inside `mount()`:

```ts
      // Pinned scenes are not drawn from the pool, so recording them would only poison
      // scene selection and the 30-day pair cooldown for the vector scenes.
      const usedScene = getScene(newTrial.sceneId);
      const updatedRow = usedScene.pinned
        ? loadedRow
        : await markSceneUsed(
          loadedRow,
          newTrial.sceneId,
          newTrial.changes.map((c) => c.changeClass),
        );
      if (cancelled) return;
```

- [ ] **Step 7: Run the generator tests**

Run: `npx vitest run src/lib/picturePostcard/__tests__/generator.test.ts`
Expected: PASS. The `photo trials only ever apply class-1 removals` test passes because `supportsClass` from Task 5 excludes every other class for slots with no variants.

- [ ] **Step 8: Run the suite and lint**

```bash
npm test && npm run lint
```

Expected: `ladder.test.ts` still passes (no param overrides yet). All else green.

- [ ] **Step 9: Commit**

```bash
git add src/lib/picturePostcard/ladder.ts src/lib/contentGenerators/picturePostcard.ts src/games/memory/PicturePostcard/index.tsx src/lib/picturePostcard/__tests__/generator.test.ts
git commit -m "feat: pin the post-office scene to ladder levels 1-3

Without pinning, pickScene excludes any scene already used this session, so the photo
scene would be used for exactly one trial and trial 2 of level 1 would silently serve
a vector scene carrying photo parameters. markSceneUsed also writes a 30-day pair row,
which for a daily player would leave the photo scene permanently conflicted for the
only change class it supports.

Pinned scenes bypass the pool and write no session or pair bookkeeping, and the pool
excludes them so they can never be drawn at any other level."
```

---

## Task 9: Photo level parameters

**Files:**
- Modify: `src/lib/picturePostcard/ladder.ts`
- Modify: `src/lib/picturePostcard/__tests__/ladder.test.ts`

**Interfaces:**
- Produces: `effectiveParams(level, di)` returns `objects: 10` and `changes: 2|3|4` for levels 1-3 respectively, with `encodeMs`, `delayMs` and `lureLevel` still taken from the DI-shifted curve. `getLevelDef(n).params` agrees with `effectiveParams(n, 0)` at every level.

- [ ] **Step 1: Write the failing test**

In `src/lib/picturePostcard/__tests__/ladder.test.ts`, add inside the outer `describe`:

```ts
  it('photo levels 1-3 override objects and changes but keep the curve elsewhere', () => {
    expect(effectiveParams(1, 0)).toMatchObject({ objects: 10, changes: 2, encodeMs: 7801, delayMs: 538 });
    expect(effectiveParams(2, 0)).toMatchObject({ objects: 10, changes: 3 });
    expect(effectiveParams(3, 0)).toMatchObject({ objects: 10, changes: 4 });
    expect(effectiveParams(4, 0).objects).toBe(5);
    expect(effectiveParams(4, 0).changes).toBe(1);
  });

  it('the hidden count on photo levels does not move with DI', () => {
    for (const di of [-2, -1, 0, 1, 2]) {
      expect(effectiveParams(3, di).changes).toBe(4);
      expect(effectiveParams(3, di).objects).toBe(10);
    }
    // encode and delay still respond to DI
    expect(effectiveParams(3, 2).delayMs).toBeGreaterThan(effectiveParams(3, -2).delayMs);
  });

  it('getLevelDef params agree with effectiveParams at di 0 for every level', () => {
    for (let n = 1; n <= 100; n++) {
      expect(effectiveParams(n, 0), `level ${n}`).toEqual(getLevelDef(n).params);
    }
  });

  it('levels 1-3 are pinned to the photo scene and nothing else is', () => {
    expect(getLevelDef(1).sceneId).toBe('post-office');
    expect(getLevelDef(3).sceneId).toBe('post-office');
    expect(getLevelDef(4).sceneId).toBeUndefined();
    expect(getLevelDef(100).sceneId).toBeUndefined();
  });
```

- [ ] **Step 2: Update the two assertions the overrides invalidate**

In the same file, replace the L1 endpoint expectation - level 1 is no longer a pure curve point:

```ts
  it('matches curve endpoints at L4 and L100', () => {
    expect(getLevelDef(4).params).toMatchObject({ objects: 5, changes: 1, lureLevel: 0 });
    expect(getLevelDef(100).params).toMatchObject({ objects: 18, encodeMs: 3000, delayMs: 10000, changes: 4, lureLevel: 3 });
  });
```

and scope the monotonicity loop to the curve-driven levels:

```ts
  it('every axis is monotonic across the curve-driven levels', () => {
    // Levels 1-3 are photo levels with authored objects/changes, so the curve's
    // monotonicity guarantee starts at level 4.
    for (let n = 5; n <= 100; n++) {
      const prev = getLevelDef(n - 1).params, cur = getLevelDef(n).params;
      expect(cur.objects).toBeGreaterThanOrEqual(prev.objects);
      expect(cur.encodeMs).toBeLessThanOrEqual(prev.encodeMs);
      expect(cur.delayMs).toBeGreaterThanOrEqual(prev.delayMs);
      expect(cur.changes).toBeGreaterThanOrEqual(prev.changes);
      expect(cur.lureLevel).toBeGreaterThanOrEqual(prev.lureLevel);
    }
  });
```

- [ ] **Step 3: Run to confirm it fails**

Run: `npx vitest run src/lib/picturePostcard/__tests__/ladder.test.ts`
Expected: FAIL - `effectiveParams(1, 0).objects` is 5, not 10.

- [ ] **Step 4: Dedupe the curves and add the overrides**

In `src/lib/picturePostcard/ladder.ts`, delete the duplicate `curveParams` body and replace both functions with a single implementation plus the override table:

```ts
/** Hidden-item counts for the pinned photo levels. Authored, not curve-derived: the
 *  curve maxes out at 4 changes (level 100), so these sit inside the game's own range.
 *  Deliberately NOT DI-shifted - encode and delay carry the adaptive load instead. */
const PHOTO_LEVEL_PARAMS: Record<number, { objects: number; changes: number }> = {
  1: { objects: 10, changes: 2 },
  2: { objects: 10, changes: 3 },
  3: { objects: 10, changes: 4 },
};

// GDD SS4.3 curves - authoritative over the tier table (spec A5)
function curveParams(n: number): TrialParams {
  const x = n / 100;
  return {
    objects: Math.round(5 + 13 * Math.pow(x, 0.85)),
    encodeMs: Math.round(8000 - 5000 * Math.pow(x, 0.7)),
    delayMs: Math.round(500 + 9500 * Math.pow(x, 1.2)),
    changes: 1 + Math.floor(n / 28),
    lureLevel: Math.floor(n / 26),
  };
}

/** Curves evaluated at the DI-shifted level coordinate (spec A7), with the authored
 *  photo-level overrides applied at the TRUE level so DI cannot move the hidden count. */
export function effectiveParams(level: number, di: number): TrialParams {
  const n = Math.min(100, Math.max(1, level + di));
  const base = curveParams(n);
  const override = PHOTO_LEVEL_PARAMS[Math.round(Math.min(100, Math.max(1, level)))];
  return override ? { ...base, ...override } : base;
}
```

- [ ] **Step 5: Make LevelDef.params agree**

In the same file, in `buildLevel`, replace `params: curveParams(n),` with:

```ts
    params: effectiveParams(n, 0),
```

- [ ] **Step 6: Run the ladder tests**

Run: `npx vitest run src/lib/picturePostcard/__tests__/ladder.test.ts`
Expected: PASS.

- [ ] **Step 7: Run the suite and lint**

```bash
npm test && npm run lint
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/lib/picturePostcard/ladder.ts src/lib/picturePostcard/__tests__/ladder.test.ts
git commit -m "feat: authored objects and hidden counts for photo levels 1-3

LevelDef.params is never read at runtime - index.tsx calls effectiveParams(level, di),
a pure function of level and DI - so overriding LADDER[n].params would have been dead
code and levels 1-3 would have run at 5 objects and 1 change. The override goes in
effectiveParams, keyed on the true level so DI cannot shift the hidden count.

Deduplicates curveParams and effectiveParams, which were verbatim copies of the same
formulas; leaving both risked the override landing in one and not the other."
```

---

## Task 10: Salience-stratified hidden-item selection

Uniform random selection makes a trial that hides the satchel and the parcel far easier than one that hides the key and the ink pad, while both record as the same level. That variance is unfair to the player and swamps the between-level signal the staircase reads.

**Files:**
- Modify: `src/lib/picturePostcard/ladder.ts`
- Modify: `src/lib/contentGenerators/picturePostcard.ts`
- Modify: `src/lib/picturePostcard/__tests__/generator.test.ts`

**Interfaces:**
- Produces: `LevelDef.changeComposition?: (1 | 2 | 3)[]` - one authored salience band per change. Levels 1-3 get `[3,2]`, `[3,2,1]`, `[3,2,2,1]`.

- [ ] **Step 1: Write the failing test**

Add to `src/lib/picturePostcard/__tests__/generator.test.ts`:

```ts
  it('photo trials hide the authored salience mix, with no repeats', () => {
    const scene = SCENES.find((s) => s.id === 'post-office')!;
    const salienceOf = (slotId: string) => scene.slots.find((s) => s.id === slotId)!.salience;
    const expected: Record<number, number[]> = { 1: [2, 3], 2: [1, 2, 3], 3: [1, 2, 2, 3] };

    for (const level of [1, 2, 3]) {
      for (let i = 0; i < 30; i++) {
        const t = gen(level);
        const ids = t.changes.map((c) => c.slotId);
        expect(new Set(ids).size, `level ${level} repeats a slot`).toBe(ids.length);
        expect(ids.map(salienceOf).sort()).toEqual(expected[level]);
      }
    }
  });

  it('photo trials vary which items they hide', () => {
    const seen = new Set<string>();
    for (let i = 0; i < 60; i++) for (const c of gen(3).changes) seen.add(c.slotId);
    expect(seen.size).toBeGreaterThanOrEqual(6);
  });
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run src/lib/picturePostcard/__tests__/generator.test.ts -t "authored salience mix"`
Expected: FAIL - the salience mix is whatever uniform sampling produced.

- [ ] **Step 3: Add the composition to the ladder**

In `src/lib/picturePostcard/ladder.ts`, add below `PINNED_SCENE_BY_LEVEL`:

```ts
/** Per-change salience bands for the pinned photo levels, so a trial that hides the
 *  satchel is comparable to one that hides the parcel. Uniform sampling would make
 *  difficulty a coin flip within a level. */
export const CHANGE_COMPOSITION_BY_LEVEL: Record<number, (1 | 2 | 3)[]> = {
  1: [3, 2],
  2: [3, 2, 1],
  3: [3, 2, 2, 1],
};
```

Add to the `LevelDef` interface:

```ts
  /** When set, one authored salience band per change, replacing weighted sampling. */
  changeComposition?: (1 | 2 | 3)[];
```

And in `buildLevel`'s returned object:

```ts
    changeComposition: CHANGE_COMPOSITION_BY_LEVEL[n],
```

- [ ] **Step 4: Honour it in the generator**

In `src/lib/contentGenerators/picturePostcard.ts`, add a builder above `buildChanges`:

```ts
/** Removal-only change set drawn to an authored salience composition. Falls back to any
 *  remaining slot when a band is exhausted, so it can never return fewer changes than
 *  the composition asks for while slots remain. */
function buildCompositionChanges(
  visible: ObjectSlot[],
  composition: (1 | 2 | 3)[],
  rng: () => number,
): AppliedChange[] {
  const used = new Set<string>();
  const out: AppliedChange[] = [];
  for (const band of composition) {
    const remaining = visible.filter((s) => !used.has(s.id));
    const pool = remaining.filter((s) => s.salience === band);
    const from = pool.length > 0 ? pool : remaining;
    if (from.length === 0) break;
    const target = from[Math.floor(rng() * from.length)];
    used.add(target.id);
    out.push({ changeClass: 1, slotId: target.id });
  }
  return out;
}
```

Then in `generateTrial`, replace the `changes` line:

```ts
  const changes = levelDef.changeComposition
    ? buildCompositionChanges(visible, levelDef.changeComposition, rng)
    : buildChanges(scene, visible, weights, params.changes, rng); // rules 2/3
```

- [ ] **Step 5: Run the generator tests**

Run: `npx vitest run src/lib/picturePostcard/__tests__/generator.test.ts`
Expected: PASS.

- [ ] **Step 6: Run the suite and lint**

```bash
npm test && npm run lint
```

Expected: all green.

- [ ] **Step 7: Commit**

```bash
git add src/lib/picturePostcard/ladder.ts src/lib/contentGenerators/picturePostcard.ts src/lib/picturePostcard/__tests__/generator.test.ts
git commit -m "feat: salience-stratified hidden-item selection on photo levels

Uniform sampling would make a trial that hides the satchel and the parcel far easier
than one that hides the key and the ink pad, while both record as the same level. That
is unfair to the player and it swamps the between-level signal the staircase reads.

Each photo level now draws one item per authored salience band, uniformly within the
band, so trials stay varied while remaining comparable."
```

---

## Task 11: Preload and decode gate

The trial clock is a plain `setInterval(100ms)` and `ready -> encoding` sets `msLeftInPhase = encodeMs` immediately. Vector scenes are inline SVG, so pixels exist the instant the timer starts. Eleven `<img>` elements do not. Encode duration is a measured experimental parameter, so a decode that eats part of the window silently corrupts it.

**Files:**
- Create: `src/games/memory/PicturePostcard/useSceneImages.ts`
- Modify: `src/games/memory/PicturePostcard/index.tsx`
- Test: `src/lib/picturePostcard/__tests__/sceneImages.test.ts` (create)

**Interfaces:**
- Produces: `sceneImageUrls(scene: SceneDef): string[]` and `useSceneImages(scene: SceneDef | null): boolean` (true once every URL has decoded, immediately true for scenes with no images).

- [ ] **Step 1: Write the failing test**

Create `src/lib/picturePostcard/__tests__/sceneImages.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { sceneImageUrls } from '../../../games/memory/PicturePostcard/useSceneImages';
import { SCENES, getScene } from '../../../games/memory/PicturePostcard/scenes';

describe('sceneImageUrls', () => {
  it('returns the plate plus every item cutout for a raster scene', () => {
    const urls = sceneImageUrls(getScene('post-office'));
    expect(urls).toHaveLength(11);
    expect(urls[0]).toBe('/pp/scenes/post-office/background.webp');
    expect(urls).toContain('/pp/scenes/post-office/items/key.webp');
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('returns nothing for vector scenes, so they never wait on a decode', () => {
    for (const scene of SCENES.filter((s) => !s.backgroundImage)) {
      expect(sceneImageUrls(scene), scene.id).toHaveLength(0);
    }
  });
});
```

- [ ] **Step 2: Run to confirm it fails**

Run: `npx vitest run src/lib/picturePostcard/__tests__/sceneImages.test.ts`
Expected: FAIL - module not found.

- [ ] **Step 3: Write the hook**

Create `src/games/memory/PicturePostcard/useSceneImages.ts`:

```ts
import { useEffect, useState } from 'react';
import type { SceneDef } from './scenes';

/**
 * Decoded-image cache, module-level so it outlives the retention phase's unmount of
 * SceneView. Without it the probe would re-decode every cutout.
 */
const CACHE = new Map<string, HTMLImageElement>();

/** Every image URL a scene paints: the background plate first, then each cutout. */
export function sceneImageUrls(scene: SceneDef): string[] {
  if (!scene.backgroundImage) return [];
  const urls = [scene.backgroundImage];
  for (const slot of scene.slots) if (slot.imageSrc) urls.push(slot.imageSrc);
  return urls;
}

function load(url: string): Promise<void> {
  const cached = CACHE.get(url);
  if (cached?.complete) return Promise.resolve();
  const img = cached ?? new Image();
  img.decoding = 'async';
  CACHE.set(url, img);
  if (img.src !== new URL(url, window.location.href).href) img.src = url;
  // decode() rejects on a broken image; a missing asset must not wedge the trial, so
  // resolve either way and let the browser render whatever it has.
  return img.decode().catch(() => undefined);
}

/**
 * True once every image the scene needs has a paintable bitmap. Raster scenes must not
 * enter the encoding phase before this flips: encodeMs is a measured parameter, and a
 * decode running inside the encode window silently shortens it.
 */
export function useSceneImages(scene: SceneDef | null): boolean {
  const urls = scene ? sceneImageUrls(scene) : [];
  const key = urls.join('|');
  const [readyKey, setReadyKey] = useState<string | null>(urls.length === 0 ? '' : null);

  useEffect(() => {
    if (urls.length === 0) {
      setReadyKey('');
      return;
    }
    let cancelled = false;
    void Promise.all(urls.map(load)).then(() => {
      if (!cancelled) setReadyKey(key);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return urls.length === 0 ? true : readyKey === key;
}
```

- [ ] **Step 4: Run the test**

Run: `npx vitest run src/lib/picturePostcard/__tests__/sceneImages.test.ts`
Expected: PASS, 2 tests.

- [ ] **Step 5: Gate the clock on the decode**

In `src/games/memory/PicturePostcard/index.tsx`, add the import:

```ts
import { useSceneImages } from './useSceneImages';
```

Add the hook call just below the existing `const [starOutcome, setStarOutcome] = useState(...)` line:

```ts
  // Raster scenes must finish decoding before the encode timer starts, or part of the
  // memorisation window is spent on a blank board. READY_MS gives us 1.5s to do it in.
  const imagesReady = useSceneImages(trial ? getScene(trial.sceneId) : null);
```

Then change the clock effect's guard so the machine does not tick until the images are in:

```ts
  // ── 100ms machine clock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!trial || showTip || !imagesReady) return;
    const id = setInterval(() => {
      setMachine((prev) => (prev ? reduce(prev, trial, { type: 'TICK', ms: TICK_MS }) : prev));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [trial, showTip, imagesReady]);
```

Holding the clock rather than only the phase transition means the `ready` phase simply lasts longer when the network is slow, and `encoding` always gets its full authored duration - which is exactly the intended behaviour.

- [ ] **Step 6: Show the loading copy while the plate decodes**

In the same file, in `renderReady`, replace the `<h3>` line with:

```tsx
          <h3 className="text-h2 font-bold text-body-text">
            {imagesReady ? t('pp.ready.title', 'Look carefully') : t('pp.loading', 'Loading…')}
          </h3>
```

- [ ] **Step 7: Typecheck, test and lint**

```bash
npx tsc -b --noEmit && npm test && npm run lint
```

Expected: all green.

- [ ] **Step 8: Commit**

```bash
git add src/games/memory/PicturePostcard/useSceneImages.ts src/games/memory/PicturePostcard/index.tsx src/lib/picturePostcard/__tests__/sceneImages.test.ts
git commit -m "feat: gate the trial clock on raster scene decode

The trial clock is a plain setInterval and ready -> encoding sets msLeftInPhase to
encodeMs immediately. Vector scenes are inline SVG so pixels exist the moment the timer
starts; eleven img elements do not. encodeMs is a measured experimental parameter, so a
400ms decode inside the encode window silently shortens it by 13% at level 100.

Decoded images are cached at module level so they survive the retention phase's unmount
of SceneView and the probe does not re-decode. A broken asset resolves rather than
rejecting, so a missing file cannot wedge the trial."
```

---

## Task 12: Copy, localisation and the onboarding card

Every existing string assumes a "something changed" framing, which is wrong for removal-only trials. And levels 1-3 are every player's first contact with the game, where nothing currently teaches that the action is to tap where something is missing.

**Files:**
- Modify: `src/lib/db.ts`
- Modify: `src/lib/picturePostcard/engineCore.ts`
- Modify: `src/lib/picturePostcard/engine.ts`
- Modify: `src/games/memory/PicturePostcard/index.tsx`
- Modify: `src/games/memory/PicturePostcard/ProbeSpatial.tsx`
- Modify: `src/games/memory/PicturePostcard/FeedbackView.tsx`
- Modify: `public/locales/{en,hi,kn}/common.json`

**Interfaces:**
- Produces: `PpEngineRow.tipCardPhotoShown: boolean`, `markPhotoTipShown(row): Promise<PpEngineRow>`.

- [ ] **Step 1: Add the persistence field**

In `src/lib/db.ts`, add to the `PpEngineRow` interface, directly after `tipCardL41Shown: boolean;`:

```ts
  /** Onboarding card for the photo levels. Not indexed, so no Dexie version bump is
   *  needed - the ppEngine store is declared as 'userId' and nothing else. Existing
   *  rows read undefined, which is falsy, so returning players see it once. */
  tipCardPhotoShown?: boolean;
```

In `src/lib/picturePostcard/engineCore.ts`, add the default to `freshEngineRow`, changing:

```ts
    scenesThisSession: [], tipCardL41Shown: false,
```

to:

```ts
    scenesThisSession: [], tipCardL41Shown: false, tipCardPhotoShown: false,
```

- [ ] **Step 2: Add the persistence helper**

In `src/lib/picturePostcard/engine.ts`, add below `markTipShown`:

```ts
export async function markPhotoTipShown(row: PpEngineRow): Promise<PpEngineRow> {
  const updated: PpEngineRow = { ...row, tipCardPhotoShown: true, updatedAt: Date.now() };
  await putPpEngine(updated);
  return updated;
}
```

- [ ] **Step 3: Show the card on the first photo level**

In `src/games/memory/PicturePostcard/index.tsx`, extend the import:

```ts
import { loadEngine, markSceneUsed, markTipShown, markPhotoTipShown, commitTrial } from '../../../lib/picturePostcard/engine';
```

Add a second tip state below `const [showTip, setShowTip] = useState(false);`:

```ts
  const [showPhotoTip, setShowPhotoTip] = useState(false);
```

Inside `mount()`, after `const tipNeeded = ...`, add:

```ts
      const photoTipNeeded = !!getLevelDef(loadedRow.currentLevel).sceneId && !loadedRow.tipCardPhotoShown;
```

and after `setShowTip(tipNeeded);` add:

```ts
      setShowPhotoTip(photoTipNeeded);
```

Add the dismiss handler next to `dismissTip`:

```ts
  async function dismissPhotoTip() {
    if (!row) return;
    const updated = await markPhotoTipShown(row);
    setRow(updated);
    setShowPhotoTip(false);
  }
```

Extend the clock guard so the card holds the trial:

```ts
    if (!trial || showTip || showPhotoTip || !imagesReady) return;
```

and its dependency array:

```ts
  }, [trial, showTip, showPhotoTip, imagesReady]);
```

Then add the card body immediately **above** the existing `if (showTip)` block:

```tsx
  if (showPhotoTip) {
    return (
      <div className="flex-1 flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card max-w-md w-full flex flex-col gap-6 items-center p-8 text-center">
            <p className="text-h3 text-body-text">
              {t(
                'pp.tip.photo',
                "You'll see a picture. Look at everything in it. In a moment some things will be gone - tap the empty spot where each missing thing used to be. Take your time.",
              )}
            </p>
            <button type="button" onClick={dismissPhotoTip} className="btn-primary w-full min-h-[96px] min-w-[96px]">
              {t('btn.continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }
```

- [ ] **Step 4: Fix the removal-mode copy**

In `src/games/memory/PicturePostcard/index.tsx`, replace `probeExpectFallback`:

```ts
function probeExpectFallback(mode: TrialSpec['probeMode'], removalOnly: boolean): string {
  if (mode === 'M3') return "You'll choose the answer from a set of pictures";
  return removalOnly
    ? "You'll tap the empty spot where each missing thing used to be"
    : "You'll tap every thing that changed";
}
```

and in `renderReady`, replace the probe-expectation paragraph:

```tsx
          <p className="text-h3 text-body-text">
            {trial.changes.every((c) => c.changeClass === 1) && trial.probeMode === 'M2'
              ? t('pp.probe.expect.M2.removal', probeExpectFallback('M2', true))
              : t(`pp.probe.expect.${trial.probeMode}`, probeExpectFallback(trial.probeMode, false))}
          </p>
```

In `src/games/memory/PicturePostcard/ProbeSpatial.tsx`, find the instruction line reading `'Tap where the change happened.'` and replace it with a removal-aware variant, computing the flag just above the returned JSX:

```tsx
  const removalOnly = trial.changes.every((c) => c.changeClass === 1);
```

```tsx
        {removalOnly
          ? t('pp.probe.tapMissing', 'Tap where something is missing.')
          : t('pp.probe.tap', 'Tap where the change happened.')}
```

In `src/games/memory/PicturePostcard/FeedbackView.tsx`, find the heading reading `'Here is what changed'` and replace it, computing the same flag above the JSX:

```tsx
  const removalOnly = trial.changes.every((c) => c.changeClass === 1);
```

```tsx
        {removalOnly
          ? t('pp.feedback.missing', 'This is what was missing')
          : t('pp.feedback.changed', 'Here is what changed')}
```

- [ ] **Step 5: Add the English strings**

In `public/locales/en/common.json`, add these keys alongside the existing `pp.*` entries (match the file's existing nesting - if `pp` is a nested object, nest them; if the keys are flat dotted strings, keep them flat):

```json
{
  "pp.tip.photo": "You'll see a picture. Look at everything in it. In a moment some things will be gone - tap the empty spot where each missing thing used to be. Take your time.",
  "pp.probe.expect.M2.removal": "You'll tap the empty spot where each missing thing used to be",
  "pp.probe.tapMissing": "Tap where something is missing.",
  "pp.feedback.missing": "This is what was missing",
  "pp.theme.postOffice": "Post office",
  "pp.category.weighingScale": "weighing scale",
  "pp.category.bell": "bell",
  "pp.category.parcel": "parcel",
  "pp.category.magnifier": "magnifying glass",
  "pp.category.rubberStamp": "rubber stamp",
  "pp.category.inkPad": "ink pad",
  "pp.category.satchel": "post bag",
  "pp.category.postcard": "postcard",
  "pp.category.letterOpener": "letter opener",
  "pp.category.key": "key"
}
```

- [ ] **Step 6: Add the Hindi strings**

In `public/locales/hi/common.json`:

```json
{
  "pp.tip.photo": "आपको एक तस्वीर दिखेगी। उसमें सब कुछ ध्यान से देखिए। थोड़ी देर में कुछ चीज़ें गायब हो जाएँगी - जहाँ हर गायब चीज़ थी, उस खाली जगह पर छूइए। आराम से कीजिए।",
  "pp.probe.expect.M2.removal": "जहाँ हर गायब चीज़ थी, उस खाली जगह पर आप छूएँगे",
  "pp.probe.tapMissing": "जहाँ कुछ गायब है वहाँ छूइए।",
  "pp.feedback.missing": "यह गायब था",
  "pp.theme.postOffice": "डाकघर",
  "pp.category.weighingScale": "तराज़ू",
  "pp.category.bell": "घंटी",
  "pp.category.parcel": "पार्सल",
  "pp.category.magnifier": "आवर्धक काँच",
  "pp.category.rubberStamp": "मुहर",
  "pp.category.inkPad": "स्याही पैड",
  "pp.category.satchel": "डाक थैला",
  "pp.category.postcard": "पोस्टकार्ड",
  "pp.category.letterOpener": "पत्र खोलने वाला चाकू",
  "pp.category.key": "चाबी"
}
```

- [ ] **Step 7: Add the Kannada strings**

In `public/locales/kn/common.json`:

```json
{
  "pp.tip.photo": "ನಿಮಗೆ ಒಂದು ಚಿತ್ರ ಕಾಣಿಸುತ್ತದೆ. ಅದರಲ್ಲಿರುವ ಎಲ್ಲವನ್ನೂ ಗಮನಿಸಿ. ಸ್ವಲ್ಪ ಹೊತ್ತಿನಲ್ಲಿ ಕೆಲವು ವಸ್ತುಗಳು ಮಾಯವಾಗುತ್ತವೆ - ಪ್ರತಿ ಕಾಣೆಯಾದ ವಸ್ತು ಇದ್ದ ಖಾಲಿ ಜಾಗವನ್ನು ಮುಟ್ಟಿ. ನಿಧಾನವಾಗಿ ಮಾಡಿ.",
  "pp.probe.expect.M2.removal": "ಪ್ರತಿ ಕಾಣೆಯಾದ ವಸ್ತು ಇದ್ದ ಖಾಲಿ ಜಾಗವನ್ನು ನೀವು ಮುಟ್ಟುತ್ತೀರಿ",
  "pp.probe.tapMissing": "ಏನಾದರೂ ಕಾಣೆಯಾಗಿರುವ ಜಾಗವನ್ನು ಮುಟ್ಟಿ.",
  "pp.feedback.missing": "ಇದು ಕಾಣೆಯಾಗಿತ್ತು",
  "pp.theme.postOffice": "ಅಂಚೆ ಕಚೇರಿ",
  "pp.category.weighingScale": "ತೂಕದ ಯಂತ್ರ",
  "pp.category.bell": "ಗಂಟೆ",
  "pp.category.parcel": "ಪಾರ್ಸಲ್",
  "pp.category.magnifier": "ಭೂತಗನ್ನಡಿ",
  "pp.category.rubberStamp": "ಮುದ್ರೆ",
  "pp.category.inkPad": "ಶಾಯಿ ಪ್ಯಾಡ್",
  "pp.category.satchel": "ಅಂಚೆ ಚೀಲ",
  "pp.category.postcard": "ಪೋಸ್ಟ್‌ಕಾರ್ಡ್",
  "pp.category.letterOpener": "ಪತ್ರ ತೆರೆಯುವ ಚಾಕು",
  "pp.category.key": "ಕೀಲಿ"
}
```

- [ ] **Step 8: Verify the locale files are valid JSON with matching keys**

```bash
python - <<'PY'
import json
files = {l: json.load(open(f'public/locales/{l}/common.json', encoding='utf-8'))
         for l in ('en', 'hi', 'kn')}
def flat(d, p=''):
    out = {}
    for k, v in d.items():
        out.update(flat(v, f'{p}{k}.')) if isinstance(v, dict) else out.update({f'{p}{k}': v})
    return out
sets = {l: set(flat(d)) for l, d in files.items()}
base = sets['en']
for l in ('hi', 'kn'):
    missing = sorted(k for k in base if k.startswith('pp.') and k not in sets[l])
    print(f'{l}: {len(missing)} missing pp.* keys', missing[:10])
PY
```

Expected: `hi: 0 missing pp.* keys []` and the same for `kn`.

- [ ] **Step 9: Typecheck, test and lint**

```bash
npx tsc -b --noEmit && npm test && npm run lint
```

Expected: all green.

- [ ] **Step 10: Commit**

```bash
git add src/lib/db.ts src/lib/picturePostcard/engineCore.ts src/lib/picturePostcard/engine.ts src/games/memory/PicturePostcard/index.tsx src/games/memory/PicturePostcard/ProbeSpatial.tsx src/games/memory/PicturePostcard/FeedbackView.tsx public/locales
git commit -m "feat: removal-mode copy and the photo onboarding card

Every existing string assumes a 'something changed' framing, which is wrong when
nothing changed and things are simply gone. Adds removal-aware variants for the ready
card, the probe instruction and the feedback heading, in all three languages.

Levels 1-3 are every player's first contact with the game and nothing taught that the
action is to tap where something is missing. A one-time card now does, following the
L41 tip card pattern. tipCardPhotoShown is unindexed, so no Dexie version bump is
required and existing rows read it as falsy - which correctly shows the card once."
```

---

## Task 13: Service worker caching, version bump and verification

**Files:**
- Modify: `vite.config.ts`
- Modify: `package.json`

- [ ] **Step 1: Confirm the assets are currently uncached**

```bash
grep -n "globPatterns" vite.config.ts
```

Expected: `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}'],` - note `webp` is absent, so every new asset would be network-only with no build warning.

- [ ] **Step 2: Add webp and a runtime rule**

In `vite.config.ts`, change the `globPatterns` line to:

```ts
        globPatterns: ['**/*.{js,css,html,ico,png,svg,webp,woff2}'],
```

and add a `runtimeCaching` entry to the same `workbox` object:

```ts
        // Photo scenes are precached today (one scene, ~255 KB). Workbox precaching is
        // all-or-nothing on install, so at eight or nine scenes a care-home wifi stall
        // would leave a partially installed worker under registerType 'autoUpdate'.
        // This rule is in place before that happens: draw the precache line at two
        // scenes and let the rest come through here.
        runtimeCaching: [
          {
            urlPattern: /^.*\/pp\/scenes\/.*\.webp$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'pp-scenes',
              expiration: { maxEntries: 120, maxAgeSeconds: 60 * 60 * 24 * 180 },
              cacheableResponse: { statuses: [0, 200] },
            },
          },
        ],
```

- [ ] **Step 3: Bump the version**

In `package.json`, change `"version": "1.1.1"` to `"version": "1.2.0"`. This is a minor bump - a new game mechanic and three new levels.

- [ ] **Step 4: Build and confirm the assets are precached**

```bash
npm run build
```

Then:

```bash
python - <<'PY'
import re, pathlib, json
sw = pathlib.Path('dist/sw.js').read_text(encoding='utf-8')
entries = re.findall(r'"(/[^"]+?)","revision"', sw) or re.findall(r'url:"(/[^"]+?)"', sw)
pp = [e for e in entries if '/pp/scenes/' in e]
print(f'precache entries: {len(entries)}')
print(f'post-office entries: {len(pp)}')
for e in sorted(pp): print('  ', e)
assert len(pp) == 11, f'expected 11 photo-scene assets precached, got {len(pp)}'
print('OK')
PY
```

Expected: `post-office entries: 11` (one background plus ten items) and `OK`. If the regex finds nothing, print a slice of `dist/sw.js` and adjust the pattern - the assertion is what matters, not the parsing.

- [ ] **Step 5: Check the shipped size**

```bash
du -sh public/pp/scenes/post-office && du -sh dist/assets 2>/dev/null || true
```

Expected: the scene directory around 250-270 KB. If it is materially over 350 KB, re-run `scripts/pp-cut-scene.py` after lowering the background quality from 82 toward 78.

- [ ] **Step 6: Full verification**

```bash
npm run lint && npm test && npm run build
```

Expected: lint clean, every test passing, build succeeding. Record the actual test count and paste it into the commit body - do not claim success without reading the output.

- [ ] **Step 7: Commit**

```bash
git add vite.config.ts package.json
git commit -m "chore: cache photo scene assets and bump to 1.2.0

globPatterns did not include webp and no runtimeCaching rule matched the new path, so
the photo scene assets would have been network-only - broken offline and refetched cold
every session on care-home wifi, with no build-time warning.

Adds webp to the precache glob and a CacheFirst rule for /pp/scenes/ ahead of needing
it: Workbox precaching is all-or-nothing on install, so several photo scenes would risk
a partially installed worker under registerType 'autoUpdate'."
```

---

## Task 14: Manual smoke test

The project's pre-commit checklist requires a manual pass on localhost. Automated tests do not cover rendering, tapping or the feel of the trial.

**Files:** none - this is verification.

- [ ] **Step 1: Start the dev server**

```bash
npm run dev
```

- [ ] **Step 2: Walk a fresh player through levels 1-3**

Use a new profile so the engine starts at level 1 with `tipCardPhotoShown` unset. Confirm:

- the onboarding card appears once, before the first trial, and not again on the next trial
- the post office picture is fully painted before the encode progress bar starts moving - it must not appear blank and then pop in
- during encode all ten items are visible and correctly seated on the table and counter, with no halo or misalignment
- at probe exactly 2 items are gone at level 1, 3 at level 2, 4 at level 3
- tapping an empty spot registers as found, with a marker
- tapping a still-present item registers as wrong
- feedback appears and the trial advances
- the trial-progress dots fill as trials complete

- [ ] **Step 3: Confirm level 4 is untouched**

Play through to level 4 (or edit `currentLevel` in the Dexie `ppEngine` row via devtools) and confirm the SVG scenes render exactly as before, with one change per trial and no raster assets involved.

- [ ] **Step 4: Confirm session resume still works**

Start a session, refresh the page mid-session, and confirm the Home screen offers Resume.

- [ ] **Step 5: Check the console**

Confirm no errors during a full level of play. A 404 on any `/pp/scenes/` asset means a filename mismatch between `postOffice.ts` and `public/`.

- [ ] **Step 6: Check offline**

In devtools, go offline after one full load and confirm the picture still renders from the service worker cache.

- [ ] **Step 7: Report**

Report exactly what was observed, including anything that did not work. Do not report the feature as complete unless every item above passed.

---

## Post-implementation notes

The spec records ten known concerns in section 11 that follow from keeping trial resolution identical to vector trials. Several are worth revisiting after the smoke test, in this order:

1. **Retention delay is ~538-642ms at levels 1-3**, which is inside visual short-term memory, so these levels currently measure change blindness more than memory. It is one curve constant to change.
2. **All-or-nothing correctness with a 3-wrong-tap kill.** At level 3 the player must find all 4 gaps and three imprecise taps ends the trial. Watch how often this fires during the smoke test.
3. **Wrong taps produce no on-screen response.** `ProbeSpatial` renders nothing keyed to `wrongResponses`, so a tap that misses reads as a broken screen and invites a second tap - burning the strike budget.
4. **`FeedbackView` reveals one miss for a fixed 1200ms** with no acknowledgement of what was found.
5. **No soft timer at tiers 1-2**, so a player who stops tapping mid-probe sits there indefinitely.

None of these are introduced by this work - items 3, 4 and 5 are reachable today - but this change makes them far more reachable, and item 2 is the one most likely to make level 3 a wall.
