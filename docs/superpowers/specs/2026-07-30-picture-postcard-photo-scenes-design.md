# Picture Postcard: photo scenes (levels 1-3)

Date: 2026-07-30
Status: approved design, ready for implementation planning
Supersedes nothing. Extends `2026-07-24-picture-postcard-design.md`.

## 1. Summary

Picture Postcard currently builds every scene from SVG sprites positioned over flat
coloured rectangles. This adds a second kind of scene: a painted raster background
with photographic item cutouts layered on top.

Levels 1, 2 and 3 become photo levels. They use one scene, a village post office
interior, and hide 2, 3 and 4 of its ten items respectively. Level 4 onward is
completely unchanged: same SVG scenes, same seven change classes, same ladder.

The mechanic within a trial is identical to today's. Encode shows the scene with
every item present, retention masks it, the probe shows the scene with N items
missing, the player taps each gap, feedback reveals what was missed.

## 2. Decisions taken

| Decision | Value | Rationale |
|---|---|---|
| Hidden count per level | 2 / 3 / 4 | The ladder's own ceiling is 4 (`changes = 1 + floor(n/28)`, max 4 at level 100). 2/4/6 was rejected as above terminal difficulty. |
| Level placement | 1, 2, 3 | Every player's opening. Level 4+ untouched. |
| Scene mixing | None | All 30 counted trials across levels 1-3 use the post office scene. |
| Trial resolution, scoring, staircase | Identical to vector trials | No partial credit, no rescaled strike budget, no photo-specific scoring. A photo trial commits through exactly the same code as a vector trial. Note this is narrower than "the engine is untouched": section 5.6 gates the `ready -> encoding` transition on image decode, and 6.2 adds a parameter override. Neither changes how a trial is judged. |
| Probe mode | M2 (tap the scene) | Already what tiers 1-2 use. |
| Change classes | Class 1 (removal) only | The other six are not viable on baked raster cutouts. See section 8. |
| Asset strategy | Clean plate + transparent cutouts | `l2-clean.png` as an immutable background, ten cutouts extracted from `l2-base.png`. |

## 3. The scene

Source images (repo root today, relocated by this work):

- `l2-base.png` - the scene with all ten items present
- `l2-clean.png` - the scene with the items absent
- `l2-images.png` - the scene with ten red ellipses marking the items

All three are 1448x1086 RGB PNG, no ICC profile. 1448/1086 = 1.3333 exactly, matching
the `aspectRatio: '4 / 3'` box every scene renders into.

### 3.1 Image registration

Measured with SIFT + RANSAC partial-affine fit, 845 good matches, 728 inliers (86%):

```
base -> clean:  scale 1.0113   rotation -0.011 deg   translation (-0.9, -0.1)
                median reprojection error 0.87 px, p90 2.11 px
```

The three renders share one camera and one room geometry. They differ by a uniform
1.1% scale about the image centre (max ~8px displacement at the frame edge) plus a
tone grade: the clean plate is consistently ~5 L\* brighter than base across the
tabletop, rising to ~12 L\* at the bottom-left corner.

Consequence: item bounding boxes transfer from base to clean by a single scale factor
of 1.0111, not by hand-authoring. Only the satchel and the key need manual nudging,
because the clean plate's table has a slightly different right-hand corner and both
items sit near that boundary.

### 3.2 The clean plate is not an inpaint

`l2-clean.png` is an independent regeneration, not an edit of `l2-base.png`. Two
consequences the implementation must respect:

- It removed more than the ten marked items. The **pen cup** and the **ledger stack**
  on the counter are gone, and they were never marked. The notice board contents and
  the pigeonhole letter arrangement also differ.
- Conversely it is genuinely clean where it matters: inspection at 2.5-3x found no
  residual shadows, ghost marks or inpainting seams where the ten items used to be.

The pen cup and ledger stack are simply accepted as absent from the photo scene. They
are not among the ten items and their absence changes nothing about the task.

### 3.3 Items

The ten items, read off the red annotations in `l2-images.png`:

| # | Item | Slot id | Salience | Notes |
|---|---|---|---|---|
| 1 | Weighing scale | `scale` | 3 | On the counter. Annotation also encloses the ledger stack - the cutout takes the scale only. |
| 2 | Brass bell | `bell` | 1 | On the counter, small. |
| 3 | Brown paper parcel | `parcel` | 3 | Large, high contrast. |
| 4 | Magnifying glass | `magnifier` | 2 | **Transparent lens** - needs a semi-transparent alpha, see 5.3. |
| 5 | Rubber stamp | `stamp` | 2 | Crosses the table/wainscot boundary. |
| 6 | Ink pad | `ink-pad` | 2 | Crosses the table/wainscot boundary. |
| 7 | Canvas satchel | `satchel` | 3 | Largest. Strap forms a closed loop over mixed background. |
| 8 | Postcard | `postcard` | 2 | Flat on the table. |
| 9 | Brass letter opener | `letter-opener` | 1 | Thin blade, low separation from table wood. |
| 10 | Brass key | `key` | 1 | Smallest. Bow ring encloses background. |

Salience values are authored, not derived, and drive hidden-item selection (5.5).

**Unmarked objects stay permanently visible** and are never probed: the letter bundle
at the table's back-left, potted plants, pigeonhole shelf, red postbox, wall pictures,
ceiling fan, notice board. This is per the instruction to hide nothing beyond the ten.

## 4. Data model

The naive approach - making `SceneDef` a discriminated union of vector and photo
scenes - was rejected. `SceneDef` is consumed as a data type well outside `SceneView`:
`geometry.ts` (`changeBBox`, `annotationBBox`), the generator's `pickVisibleSlots`,
`placeLures` and `buildM3`, plus the scene test suite. A top-level union breaks all of
them, and several fail *silently* by returning `null` rather than type-erroring - which
would mean no found-markers during the probe and no annotation during feedback.

Instead the **render payload** becomes the variable part, and vector-only fields become
optional:

```ts
export interface ObjectSlot {
  id: string;
  category: string;
  bbox: { x: number; y: number; w: number; h: number };
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;

  // Render payload - exactly one of these
  spriteId?: string;          // vector scenes
  baseFill?: string;          // vector scenes
  imageSrc?: string;          // photo scenes

  // Vector-only, required for any slot that can take change classes 2 and 4-7
  variants?: SlotVariants;
  altPositions?: [{ x: number; y: number }, { x: number; y: number }];
  lures?: [string, string, string];
}

export interface SceneDef {
  id: string;
  theme: string;
  background: BackgroundLayer[];       // vector scenes
  backgroundImage?: string;            // photo scenes; when set, `background` is []
  renderScale?: number;                // default 1.5 (SPRITE_RENDER_SCALE); photo scenes use 1.0
  slots: ObjectSlot[];
}
```

The eight existing scenes need no edits - their fields all remain valid. The generator
sites that read `variants`, `altPositions` and `lures` gain guards that skip slots
lacking them; those branches only run for change classes 2 and 4-7 and for lure
placement, none of which a photo level uses.

`geometry.ts`, `pickVisibleSlots` (reads `salience`), the staircase, scoring, telemetry
and the abandonment commit path all continue to work untouched.

## 5. Rendering

### 5.1 `renderScale`

`inflateBBox` in `geometry.ts` currently applies `SPRITE_RENDER_SCALE = 1.5`
unconditionally, because the authored SVG sprites are drawn small. Photo cutouts are
authored at true size and must not be inflated.

`renderScale` is threaded through `inflateBBox`, `changeBBox`, `annotationBBox` and
`SceneView`'s paint loop. These four move together or the feedback rings desynchronise
from what is painted and `errorDistanceNorm` telemetry becomes wrong.

Hit-testing slop is separate and unchanged: `handleTap` already tests against
`bbox x 1.5` and keeps doing so. Photo items therefore keep a generous tap area even
at `renderScale: 1.0`.

### 5.2 Background and item painting

`.scene-board` carries `p-3`, and percentages on absolutely-positioned children resolve
against the padding box. A background image placed in normal flow would be inset 12px
and would no longer register with the items. The background is therefore
`position: absolute; inset: 0; width: 100%; height: 100%; object-fit: fill`.
`object-fit: fill` not `cover` - the aspect ratio matches exactly, so there is nothing
to crop.

Items render as absolutely-positioned `<img>` elements. Eleven `<img>` elements are
preferred over a canvas composite or a sprite sheet: they preserve the existing
positioning maths, the per-slot CSS filters used by the hint scaffold, and DOM-level
structure. Absolutely-positioned elements do not participate in flow, so hiding one
causes no reflow.

**Hidden items stay mounted.** They render with `visibility: hidden` rather than being
unmounted, for two reasons: `SceneView` already keeps class-1-removed slots in
`renderTargets` with `visible: false` specifically so they remain hit-testable, and an
unmounted `<img>` loses its decoded bitmap, risking a decode stall if it is revealed
during feedback. **If hidden items lose their hit target the trial becomes unwinnable** -
every tap resolves to `null`, and three of those end the trial.

**No drop shadow.** Inspection at 2.5-3x shows the source render is flat and near-
ambient: the key has only 2-3px of darkening under its shaft, the stamp and ink pad have
essentially no ground shadow. Adding a CSS drop-shadow would give the ten items a
shadow no other object in the scene has, making them read as more pasted-on, not less.
What is needed instead is the tone grade in 5.3.

### 5.3 Cutout extraction

Pipeline lives in `scripts/pp-cut-scene.py`. Environment has OpenCV 5.0, numpy and PIL;
no ML segmentation is available.

1. **Seed boxes**, lifted automatically from `l2-images.png` by redness-differencing
   against `l2-base.png`, then `cv2.fitEllipse` per stroke arc with arcs merged by
   centre proximity. Connected-component labelling must not be used - dilating to close
   the strokes merges the ten ellipses into eight blobs.
2. **Transform** seed boxes to clean-plate coordinates by scaling 1.0111 about the
   image centre.
3. **Mask-init grabCut.** Compute Lab mean and covariance from a 40-50px annulus outside
   each seed box, then per-pixel Mahalanobis distance `d`, and seed
   `GC_BGD` (`d < 1.8`), `GC_PR_BGD` (`< 3.2`), `GC_PR_FGD` (`< 6`), `GC_FGD` (`>= 6`),
   with the annulus forced to `GC_BGD`. Eight iterations. Rect-init alone cannot mark
   *enclosed* background, which is why it fills the key's bow ring and the satchel
   strap's loop with table wood.
4. **Combine** outer silhouette from rect-init with holes from the mask-init pass:
   `alpha = rect_fg AND NOT(d < 2.0)`.
5. **Soft edge.** Erode 2px for definite foreground, dilate 2px for definite background,
   resolve the band between with a guided filter, falling back to a Gaussian blur plus
   smoothstep remap. Without this the cutouts alias visibly.
6. **Tone grade** every cutout by roughly `L* += 5, b* += 3.5` to match the clean plate,
   and keep the alpha ramp under 2px. Skipping this leaves each cutout with a 1-2px rim
   of base-tone wood that reads as a dark halo against the lighter plate.

Expect eight of ten items to come out clean. **Three need manual work in an image
editor** and should be budgeted for, not discovered:

- **Satchel** - dark navy against dark wood and a dark doorway, and its strap encloses a
  non-uniform background. Automated extraction failed outright.
- **Letter opener** - thin brass blade within a few Lab units of the table wood along its
  lower edge; grabCut eats the tip.
- **Magnifier lens** - genuinely transparent, showing table wood through it. Needs a
  hand-painted semi-transparent alpha; a binary mask either deletes the glass or carries
  a wood-coloured disc.

### 5.4 Positioning workflow

`scripts/pp-preview.py` reads `boxes.json`, composites the cutouts onto the clean plate,
and writes three images: the composite, the composite with each bbox stroked and
labelled, and a base-versus-composite side-by-side at matched scale. The side-by-side is
the one that makes a 10px drift obvious. Preview at 1448px **and** at the true render
width of 670px - a box that looks right at full size can be visibly off when rendered.

A numeric guard rail backs up the eye: for each item, sample the clean plate at the
item's bottom-centre contact point +/-8px and assert the colour falls in the table-wood
or counter-stone cluster. An item floating above its surface fails the check.

`boxes.json` stores normalised 0-1 floats at 4 decimal places, dropping straight into
`ObjectSlot.bbox`.

### 5.5 Which items get hidden

Uniform random selection is rejected. Hiding {satchel, parcel} and hiding {key, ink pad}
differ by a large factor in difficulty, yet both would be recorded as "level 1, 2 items".
That variance is unfair to the player and it swamps the between-level signal the
staircase reads.

Selection is **salience-stratified**. Each trial draws a fixed composition per level:

| Level | Hidden | Composition |
|---|---|---|
| 1 | 2 | 1 x salience 3, 1 x salience 2 |
| 2 | 3 | 1 x salience 3, 1 x salience 2, 1 x salience 1 |
| 3 | 4 | 1 x salience 3, 2 x salience 2, 1 x salience 1 |

Within each salience band the draw is uniform, so trials stay varied while remaining
comparable to each other.

### 5.6 Decode gating

The trial clock is a plain `setInterval(100ms)`, and `ready -> encoding` sets
`msLeftInPhase = encodeMs` immediately. Today `SceneView` renders inline SVG components,
so there is zero latency between the timer starting and pixels existing. With eleven
`<img>` elements there is not.

**Encode duration is a measured experimental parameter**, so a decode that eats part of
the encode window silently corrupts it. A 400ms first decode is 13% of the level-100
encode budget.

The fix uses the 1500ms `READY_MS` phase that already exists. During `ready`, every URL
in the trial is loaded and `await img.decode()`-ed; the `ready -> encoding` transition is
gated on completion. Decoded `HTMLImageElement`s are held in a module-level `Map` that
outlives the retention phase's unmount, so the probe does not re-decode. A `preloadMs`
telemetry field is emitted; if it exceeds ~1200ms the `ready` phase extends rather than
the `encoding` phase shrinking.

## 6. Trial generation and ladder integration

### 6.1 Scene pinning

`pickScene` filters out every scene already used this session, and `markSceneUsed`
appends the scene id after every trial. So routing the photo scene through `pickScene`
means it is used for exactly one trial per session, after which trial 2 of level 1
silently serves a **vector** scene carrying photo parameters. Additionally
`markSceneUsed` writes a `(scene, changeClass 1)` pair row, and `pickScene` avoids pairs
used within 30 days - so for a daily player the photo scene becomes permanently
conflicted for the only change class it supports.

`LevelDef` gains `sceneId?: string`. `generateTrial` short-circuits before `pickScene`
when it is set. Session and pair bookkeeping are **skipped for pinned scenes** - both
are meaningless for a scene that is not being chosen from a pool, and the pair rows would
otherwise poison selection for the vector scenes.

### 6.2 Parameter overrides

`LevelDef.params` is **never read at runtime**. `index.tsx` calls
`effectiveParams(level, di)`, which is a pure function of level and DI that never
consults `LevelDef`. Overriding `LADDER[n].params` would therefore be dead code and
levels 1-3 would run at 5 objects and 1 change.

The override goes in `effectiveParams` and nowhere else, as a small table:

```ts
const PHOTO_LEVEL_OVERRIDES: Record<number, { objects: number; changes: number }> = {
  1: { objects: 10, changes: 2 },
  2: { objects: 10, changes: 3 },
  3: { objects: 10, changes: 4 },
};
```

`objects: 10` because all ten items are shown during encode. `changes` is fixed by level
and deliberately not DI-shifted; encode duration and retention delay still respond to DI
through the curves.

`curveParams` and `effectiveParams` are currently duplicate implementations of the same
formulas. They are deduplicated as part of this change - leaving both risks the override
landing in one and not the other.

### 6.3 What is unchanged

Staircase, DI, warmup and confidence trial kinds, hint budget, star card, `COUNTED_PER_LEVEL`,
the trial state machine, scoring, telemetry, and the abandonment commit path. A photo
trial commits through exactly the same code as a vector trial, per the decision in
section 2.

The L41 tip card (gated on `currentLevel === 41`) and the interference mini-task
(`tier >= 5`) are both inert at levels 1-3.

## 7. Copy and localisation

Existing strings assume a "something changed" framing and are wrong for removal-only
multi-target trials:

- `ProbeSpatial`: "Tap where the change happened." - singular, and nothing changed
- `pp.probe.expect.M2`: "You'll tap every thing that changed" - also ungrammatical
- `FeedbackView`: "Here is what changed"

New photo-mode keys are added for all three, plus `pp.theme.postOffice` and ten
`pp.category.*` entries, in `en`, `hi` and `kn`.

An onboarding card is added before the first trial of level 1, following the existing
L41 tip card pattern. Levels 1-3 are every player's first experience of the game, the
action is "tap where something is missing", and no string anywhere currently teaches
that.

The L41 card persists through `PpEngineRow.tipCardL41Shown`. The new card needs its own
flag, so `PpEngineRow` gains `tipCardPhotoShown` and `BrainTrainingDB` takes a **new
`.version()` block** - per the project rule, existing versions are never mutated.

## 8. Why removal only

Of the seven change classes, five cannot work on baked raster cutouts:

| Class | Meaning | Viable |
|---|---|---|
| 1 | Remove | Yes |
| 2 | Add | No - needs an alternate sprite per slot |
| 3 | Translocate | Possible within one surface plane, not used here |
| 4 | Recolour | No - `fill` is meaningless for a raster |
| 5 | Substitute | No - needs an alternate cutout per slot |
| 6 | Rescale | No - breaks perspective, reads as a rendering bug |
| 7 | Mirror | No - baked lighting, and the postcard carries legible text |

Lure placement (from level 26) would need three more cutouts per slot, thirty in total.
None of this constrains levels 1-3, which only ever use class 1, but it does mean the
photo scene can never be promoted into the general scene pool. It is pinned to levels
1-3 and the generator must never select it elsewhere.

## 9. Asset delivery

### 9.1 Formats and sizes

`SceneView` renders inside `max-w-2xl` = 672px, minus border = **670 CSS px**. At DPR 2
that is 1340 device px, so the native 1448px source is a 1.08x oversample - correct, with
no `srcset` fan-out needed and no DPR-3 variant.

| Asset | Format | Size |
|---|---|---|
| Background | WebP q82 @ 1448px | ~146 KB |
| 10 cutouts | WebP lossy, `alpha_quality=100` | ~110 KB total |
| **Total per scene** | | **~255 KB** |

Cutouts use lossy WebP with lossless alpha, not fully lossless: 222 KB lossless drops to
~48 KB at q90 with no visible alpha degradation. Fully lossy alpha produces halos on soft
edges and must not be used.

Shipped assets are tagged sRGB explicitly, so a P3 tablet display does not over-saturate
the postbox reds.

### 9.2 Service worker

`vite.config.ts` has `globPatterns: ['**/*.{js,css,html,ico,png,svg,woff2}']`. **`webp` is
absent**, and there is no `runtimeCaching` rule matching the new path. As proposed the
assets would be network-only: broken offline, refetched cold every session on care-home
wifi, with no build-time warning.

`webp` is added to `globPatterns`. The current precache manifest is 519 entries / 2.449 MB;
one photo scene takes it to ~2.70 MB, consistent with the existing convention of
precaching all 511 game SVGs.

This does not scale. At eight or nine photo scenes the precache would carry ~4.5 MB of
images, and Workbox precaching is all-or-nothing on install - a wifi stall leaves a
partially installed service worker under `registerType: 'autoUpdate'`. A `CacheFirst`
runtime rule matching `/^\/pp\/scenes\//` (`maxEntries: 120`, `maxAgeSeconds: 180 days`)
is added **now**, before there is a third scene, with the precache line drawn at two.

### 9.3 Layout

```
assets-src/picture-postcard/post-office/     # committed, never shipped
  base.webp  clean.webp  annotated.webp      # lossless WebP, ~5.1 MB vs 6.7 MB as PNG
  boxes.json                                 # per-item seed rects, hand-corrected
  README.md                                  # provenance: model, date, prompt, terms
scripts/pp-cut-scene.py                      # extraction pipeline
scripts/pp-preview.py                        # positioning contact sheets
public/pp/scenes/post-office/                # shipped
  background.webp
  items/scale.webp bell.webp parcel.webp magnifier.webp stamp.webp
        ink-pad.webp satchel.webp postcard.webp letter-opener.webp key.webp
```

The five source PNGs currently sit untracked in the repo root, ~12.4 MB. They move to
`assets-src/` and are committed as lossless WebP. They are AI-generated with no recorded
prompt or seed, so they are unreproducible - losing them means losing the ability to
re-cut an item. Their provenance goes in the README while someone still remembers it,
including a check that the building depicted in the wall painting is not a recognisable
trademarked landmark.

## 10. Testing

New:

- Generator: correct hidden count per level (2/3/4); salience composition matches 5.5;
  no duplicate items within a trial; every item is reachable across many draws.
- Ladder: levels 1-3 resolve to the pinned photo scene with `objects: 10` and the right
  `changes`; levels 4+ are byte-identical to today.
- Pinning: the photo scene is never returned by `pickScene`; pinned scenes write no
  session or pair bookkeeping.
- Hit-testing: a tap inside a hidden item's bbox resolves to that item's id (guards the
  unwinnable-trial failure in 5.2).
- `renderScale`: `changeBBox` and `annotationBBox` agree with `SceneView`'s painted box
  for both 1.0 and 1.5.

Existing tests that this change breaks and how they are updated:

| Test | Break | Resolution |
|---|---|---|
| `scenes.test.ts` `SCENES.length === 8` | 9 scenes | Update count |
| `scenes.test.ts` `slots.length >= 20` | photo scene has 10 | Scope the assertion to vector scenes |
| `scenes.test.ts` variant/lure/sprite assertions | fields now optional | Scope to vector scenes |
| `generator.test.ts` L1 one class-1 change | now 2 | Update expectation |
| `generator.test.ts` `SCENES.slice(0,7)` exclusion | 9 scenes leaves 2 candidates | Exclude by explicit id list |
| `ladder.test.ts` monotonic `changes`/`objects` | L3=4 then L4=1 | Scope monotonicity to levels >= 4 |
| `ladder.test.ts` `getLevelDef(1).params` | overridden | Update expectation |

## 11. Known concerns, recorded not fixed

These follow from the decision to keep engine behaviour identical. They are recorded so
they can be revisited after a smoke test rather than discovered in a care home.

1. **Retention delay at levels 1-3 is ~538-642ms.** That is inside visual short-term
   memory, so as built these levels measure change blindness more than memory. Making them
   a memory task would need a delay of 2-4s. Cheap to change later: it is one curve.

2. **All-or-nothing correctness with 3 wrong taps ending the trial.** At level 3 a player
   must find all 4 gaps, and three imprecise taps resolves the trial as incorrect. Advancing
   needs 5 of 10 trials fully correct. Expect level 3 to be a wall for many players.

3. **The frustration guard cannot help.** After 3 consecutive errors the engine fires a
   confidence trial at `di = -0.32`, but hidden count is fixed per level, so the mercy trial
   presents the same 4 targets and differs only by ~0.1s of encode time.

4. **`roundScore = 100 x changesFound`, unnormalised.** A level-3 photo trial scores up to
   400 where every vector trial in levels 4-27 scores 100, and a *failed* trial that found 3
   of 4 still scores 300. This does not affect dynamic difficulty - `computePerformanceRatio`'s
   `picture-postcard` branch is unreachable, since `GameShell` guards it with
   `gameId !== 'picture-postcard'`, and PP writes its own difficulty as `currentLevel / 100` -
   but it does make the score number meaningless across level 4. That dead branch in
   `computePerformanceRatio` should be deleted separately.

5. **No soft timer at tiers 1-2.** `TIER_SOFT_TIMER[0]` is `null`, so `msLeftInPhase` is
   `Infinity` and the probe never times out. A player who finds 2 of 4 and then stops tapping
   sits in the probe indefinitely. This is pre-existing and reachable today at one target;
   more reachable with four.

6. **Wrong taps produce no on-screen response.** `ProbeSpatial` renders nothing keyed to
   `wrongResponses`. For a low-tech-literacy user a tap that does nothing reads as a broken
   screen, and the natural response is to tap again - burning the 3-strike budget. Pre-existing,
   but this change makes it the primary interaction.

7. **`FeedbackView` reveals one miss for a fixed 1200ms.** With up to 4 hidden items it shows
   a single dashed ring on one of them, non-skippable, and `+score` renders only on the correct
   branch. A player who finds 1 of 4 gets no acknowledgement of the one they got.

8. **Proactive interference.** All 30 counted trials across levels 1-3 use one picture with a
   redrawn hidden set each time. By trial 8 the discriminating information is which *trial* an
   item was absent in - source memory rather than item memory. The engine's own `pickScene`
   rules forbid within-session scene reuse everywhere else. Adding a second photo scene later
   is the fix.

9. **Telemetry for levels 1-3 is near-constant.** `sceneId` is fixed and `encodeMs`/`delayMs`
   vary by under 5% across the reachable DI range, so the first three levels of every user's
   history will carry little signal.

10. **`scenesThisSession` is unbounded.** Pre-existing smell, unrelated to this change, worth
    a separate issue.

## 12. Out of scope

- The L1 seaside scene. The architecture takes a second photo scene as a drop-in, but it
  needs a clean plate that does not exist yet.
- Change classes other than removal on photo scenes.
- Keyboard and switch access for the probe. `SceneView` renders plain divs with
  `onPointerUp` only, so the probe is pointer-only today. Pre-existing, and worth its own
  piece of work given the audience.
