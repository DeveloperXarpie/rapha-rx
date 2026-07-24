import type { AppliedChange } from '../../../lib/contentGenerators/picturePostcard';
import type { SceneDef } from './scenes';

// Mirrors SceneView's per-class placement rules so markers, annotations, and
// error-distance telemetry all line up with what's actually painted.

/** Scene-normalised bbox a given change occupies on the MODIFIED scene. */
export function changeBBox(
  scene: SceneDef,
  change: AppliedChange,
): { x: number; y: number; w: number; h: number } | null {
  const slot = scene.slots.find((s) => s.id === change.slotId);
  if (!slot) return null;
  if ((change.changeClass === 2 || change.changeClass === 3) && change.newPosition) {
    return { x: change.newPosition.x, y: change.newPosition.y, w: slot.bbox.w, h: slot.bbox.h };
  }
  return slot.bbox;
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
  return slot.bbox;
}
