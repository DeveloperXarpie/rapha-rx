"""Composite the post-office cutouts onto the clean plate and check they sit on a surface.

Writes four contact sheets:
  pp-preview-composite.png   the scene as the app will render it (shadows included)
  pp-preview-labelled.png    the same, with each bbox stroked and labelled
  pp-preview-sidebyside.png  base | composite at matched scale
  pp-preview-rendersize.png  the composite at the true 670 CSS px render width

The side-by-side is the one that makes a 10px drift obvious. The render-size sheet
matters because a box that looks right at 1448px can be visibly off at 670px.

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

# Acceptable surfaces under an item's contact point, as OpenCV-Lab centres with a
# tolerance. Measured from clean.webp by sampling 12x12 patches at known points on each
# surface; the tolerance is the observed max deviation plus a small margin.
#
# Counter stone and floor tile are only ~18 apart, so nearest-match is what separates
# them - do not widen these tolerances without re-measuring.
SURFACES = [
    ('table wood',    (110.0, 152.0, 167.0), 16.0),
    ('counter stone', (182.0, 133.0, 140.0), 18.0),
    ('floor tile',    (170.0, 139.0, 152.0), 32.0),
]

# Which surface each item is supposed to be resting on. Checking only that SOME known
# surface sits under the contact point is too weak to be useful: floating the key up
# into mid-air still passes, because the pixel behind it is valid floor tile. Asserting
# the EXPECTED surface is what makes this check catch a misplaced item.
EXPECTED_SURFACE = {
    'scale': 'counter stone',
    'bell': 'counter stone',
    'parcel': 'table wood',
    'magnifier': 'table wood',
    'stamp': 'table wood',
    'ink-pad': 'table wood',
    'satchel': 'table wood',
    'postcard': 'table wood',
    'letter-opener': 'table wood',
    'key': 'table wood',
}


def composite(clean_bgr, boxes):
    h, w = clean_bgr.shape[:2]
    out = clean_bgr.astype(np.float32).copy()

    # Shadows first, all of them, exactly as SceneView paints them: the layers reach
    # past their slots, so interleaving would let one item's shadow fall over another.
    for slot, b in boxes.items():
        f = OUT / 'items' / f'{slot}.shadow.webp'
        if not f.exists():
            continue
        arr = np.asarray(Image.open(f).convert('RGBA'))
        ih, iw = arr.shape[:2]
        x = int((b['x'] + b['w'] / 2) * w - iw / 2)
        y = int((b['y'] + b['h'] / 2) * h - ih / 2)
        if x < 0 or y < 0 or y + ih > h or x + iw > w:
            print(f'  {slot}: shadow overflows the frame, skipped', file=sys.stderr)
            continue
        a = arr[:, :, 3:4].astype(np.float32) / 255.0
        rgb = cv2.cvtColor(arr[:, :, :3], cv2.COLOR_RGB2BGR).astype(np.float32)
        out[y:y + ih, x:x + iw] = out[y:y + ih, x:x + iw] * (1 - a) + rgb * a

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
    """Assert each item's bottom-centre rests on its EXPECTED surface.

    Returns the number of failures.
    """
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

        want = EXPECTED_SURFACE.get(slot)
        if want is None:
            verdict, ok = 'NO EXPECTATION SET', False
        elif dist > best[1]:
            verdict, ok = 'FLOATING (no surface)', False
        elif best[0] != want:
            verdict, ok = f'WRONG SURFACE (want {want})', False
        else:
            verdict, ok = 'OK', True
        failures += not ok
        print(f'  {slot:<15} contact ({cx:4d},{cy:4d}) -> {best[0]:<13} '
              f'dE {dist:5.1f}  {verdict}')
    return failures


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument('--out', default='.')
    args = ap.parse_args()
    out_dir = pathlib.Path(args.out)
    out_dir.mkdir(parents=True, exist_ok=True)

    clean = cv2.imread(str(SRC / 'clean.webp'))
    base = cv2.imread(str(SRC / 'base.webp'))
    # The RESOLVED boxes, which is what postOffice.ts paints into - see pp-cut-scene.py.
    boxes = json.loads((SRC / 'boxes.resolved.json').read_text(encoding='utf-8'))
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
        print(f'\n{failures} item(s) failed the contact check - adjust boxes.json')
    raise SystemExit(failures)


if __name__ == '__main__':
    main()
