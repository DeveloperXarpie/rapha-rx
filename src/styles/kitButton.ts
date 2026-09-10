import type { CSSProperties } from 'react';

/**
 * The geometry of the in-game kit's green button, derived once so the six games
 * and the title screen stop each carrying their own copy of it.
 *
 * `.btn-green-kit` in `styles/brand.css` paints the button; it deliberately sets
 * no border-radius and no font-size, because both are fractions of the button's
 * own HEIGHT and CSS cannot express that (a percentage radius resolves per axis
 * and drew an ellipse on a wide button). So the paint lives in CSS and the two
 * height-derived numbers live here.
 *
 * Both fractions are measured off `public/shop-assets/ui-ready.png`, which is the
 * art the kit's green was sampled from in the first place:
 *
 *   - the corner arc leaves the top edge 50px in on a button 182px tall (0.275);
 *   - the cap-height of READY is 48px on that same 182 (0.264), which for Baloo 2
 *     Extra Bold - cap-height 0.72em - puts the label at 0.37 of the button.
 *
 * The second figure is what the hand-tuned buttons had already converged on
 * independently: Station Master ran 28px on 76 and Garden Keeper 31px on 84, both
 * 0.368. It is written down now rather than rediscovered per game.
 */
export const KIT_CORNER = 0.27;

export const KIT_LABEL = 0.37;

/**
 * The style half of a kit button, to sit alongside `className="btn-brand btn-green-kit"`.
 *
 * `height` is in whatever units the caller's box uses - board games draw on a fixed
 * canvas that `fitScale` then scales as a whole, so their px are canvas px.
 */
export function kitButton(height: number): CSSProperties {
  return {
    minHeight: height,
    borderRadius: Math.round(KIT_CORNER * height),
    fontSize: Math.round(KIT_LABEL * height),
  };
}
