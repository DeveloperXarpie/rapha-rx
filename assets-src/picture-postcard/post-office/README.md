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
