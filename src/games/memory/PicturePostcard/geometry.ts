import type { AppliedChange } from '../../../lib/contentGenerators/picturePostcard';
import type { SceneDef } from './scenes';

// Mirrors SceneView's per-class placement rules so markers, annotations, and
// error-distance telemetry all line up with what's actually painted.

/**
 * Authored slot bboxes are proportionally small (real-world scale); sprites are
 * painted inflated around their centre so they read clearly at postcard size.
 * Everything that must align with the painted sprite (hit-testing, rings,
 * annotations) uses the same factor. Centres are inflation-invariant, so
 * error-distance telemetry is unaffected.
 */
export const SPRITE_RENDER_SCALE = 1.5;

/**
 * How far a raster slot's contact-shadow layer extends past its bbox. A shadow falls
 * outside the object casting it, so the shadow asset is cut from a window this much
 * larger than the item's.
 *
 * Must match SHADOW_INFLATE in scripts/pp-cut-scene.py, which is what decides how much
 * of the plate each shadow file actually covers.
 */
export const SHADOW_INFLATE = 1.6;

export function inflateBBox(
  b: { x: number; y: number; w: number; h: number },
  k: number = SPRITE_RENDER_SCALE,
): { x: number; y: number; w: number; h: number } {
  return {
    x: b.x + (b.w * (1 - k)) / 2,
    y: b.y + (b.h * (1 - k)) / 2,
    w: b.w * k,
    h: b.h * k,
  };
}

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

/** Scene-normalised centre of a change's target. */
export function changeCentre(scene: SceneDef, change: AppliedChange): { x: number; y: number } | null {
  const bbox = changeBBox(scene, change);
  if (!bbox) return null;
  return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
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
