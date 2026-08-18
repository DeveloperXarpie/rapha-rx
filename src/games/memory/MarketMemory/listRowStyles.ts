import type { CSSProperties } from 'react';
import { EASE_SETTLE } from './styles';

/** Stagger between consecutive rows arriving on the page. */
const ROW_STAGGER_MS = 90;

export interface ListRowStyles {
  /** The outer element. Owns the entrance animation. */
  entrance: CSSProperties;
  /** The inner element. Owns the blanking that the retention cover depends on. */
  content: CSSProperties;
}

/**
 * Styles for one row of the shopping list, split across two elements.
 *
 * The split is the whole point. A CSS animation running with `fill-mode: both` sits above
 * normal declarations in the cascade and keeps its final keyframe value for the element's
 * whole life, so an element carrying the entrance animation can never afterwards be
 * blanked by an `opacity` declaration - the animation's `to { opacity: 1 }` simply wins.
 * Putting the entrance on the outer element and the blanking on the inner one means the
 * two never contend for the same property.
 */
export function listRowStyles(index: number, covered: boolean, reduced: boolean): ListRowStyles {
  return {
    entrance: {
      animation: reduced
        ? `mm-fade 300ms ease ${index * ROW_STAGGER_MS}ms both`
        : `mm-slidein 300ms ${EASE_SETTLE} ${index * ROW_STAGGER_MS}ms both`,
    },
    content: {
      opacity: covered ? 0 : 1,
      transition: 'opacity 120ms linear',
    },
  };
}
