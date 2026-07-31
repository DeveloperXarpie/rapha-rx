# Post office scene - source assets

Used by the Picture Postcard photo scene at ladder levels 1-3.

| File | Contents |
|---|---|
| `base.webp` | Scene with all ten hero items present. Cutouts are extracted from this. |
| `clean.webp` | Scene with the ten items absent. Ships as the background plate. |
| `annotated.webp` | Scene with ten red ellipses marking the items. Source of the seed boxes. |
| `boxes.json` | Authored per-item normalised SEED boxes, in clean-plate coordinates. |
| `boxes.resolved.json` | Generated. The boxes the cutouts are actually emitted at. |

## boxes.json vs boxes.resolved.json

`boxes.json` is hand-calibrated and is only ever a *seed* for grabCut. A silhouette
routinely runs slightly past its seed - the satchel's flap by 2.3% of the frame height -
so `pp-cut-scene.py` widens the box to contain the mask and emits the cutout at that
resolved box. **`postOffice.ts` must carry the resolved values**, not the seeds; painting
a cutout into its smaller seed box squashes it.

The resolved boxes deliberately do not feed back into `boxes.json`. grabCut is chaotic,
so moving the seed moves the mask, which moves the box again; iterating that oscillates
instead of settling.

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
12 L* at the bottom-left corner. `scripts/pp-cut-scene.py` corrects for both: it measures
the geometry itself with SIFT on every run rather than trusting the numbers above, and
fits the grade per item so the drift across the frame is tracked.

Registering the pair is also what makes contact shadows possible. A matte covers the
object alone and the clean plate was generated with the items absent, so neither source
carries a shadow; once the two are aligned, `base / clean` over the wood around an item
is its shadow, and it ships as `<item>.shadow.webp`.

## Why the mattes come from rembg and not grabCut

grabCut decides from local colour and gradient, and several parts of these objects offer
neither. The letter-opener's dark wooden handle sits 2.25 Mahalanobis units *inside* the
table's own colour distribution, and its outline measures `|grad Lab|` 71 against bare
table's 65 - there is no boundary there to cut along, so the minimum cut ran through the
bright ferrule instead and the whole handle was dropped from the cutout. The same thing
cost the magnifier its handle, the key its shaft edge and the stamp its base. No
parameter reaches that, because the information is not in the image; only a model that
recognises the object can put an edge where the pixels do not.

Install the pipeline's dependencies with `pip install -r scripts/requirements.txt`.

Two places the model needs telling what the game means:

- **`CONTEXT_OVERRIDE`** - it is a salient-object model, so how much surrounding context
  it sees changes what it decides the object *is*. Given a tight crop it reads the rubber
  stamp's turned knob as the whole object and mattes the knob alone.
- **`EXCLUDE`** - it groups objects that touch, and has no way to know which of them the
  game treats as a hero item. It pulls the potted plant and its crate into the weighing
  scale; both are permanent scenery living on the plate, and a cutout containing them
  would swap base's copy for clean's whenever the scale is hidden, showing the player a
  change that is not the one being tested.

## Known differences beyond the ten items

`clean.webp` also dropped the **pen cup** and the **ledger stack** on the counter, which
were never marked. The notice board contents and the pigeonhole letter arrangement also
differ from `base.webp`. None of this affects gameplay - those objects are not among the
ten - but do not assume the plate is a pixel-accurate inpaint, because it is not.
