/**
 * The painted progress pill, used by both the patience bar and the cook bar.
 *
 * Track and fill are the same art at two sizes, drawn with `border-image` so the end caps
 * stay round. A pill has no straight vertical section to slice against, so the caps are
 * scaled with the bar's height rather than sliced vertically - hence the `height / native`
 * scale handed to `frameStyle`.
 *
 * The fill is *sized*, not clipped: its width is the percentage, so it keeps a rounded cap
 * at both ends at every value. That means it cannot render narrower than its own two caps,
 * so below that it is dropped entirely rather than drawn as a stub.
 *
 * Track and fill are siblings inside a borderless wrapper rather than the fill living inside
 * the track. An absolutely positioned child is laid out against its parent's *padding* box,
 * so a fill nested in the track would start inside the track's left cap and read as a
 * lozenge floating in an empty trough instead of a bar draining from the edge.
 */

import { BAR_FILL, BAR_TRACK, frameStyle } from './sprites';

/** Hue rotations that take the painted green fill to amber and to red. */
const TINTS = {
  green: 'none',
  amber: 'hue-rotate(-38deg) saturate(1.45)',
  red: 'hue-rotate(-92deg) saturate(1.6)',
} as const;

export type BarTint = keyof typeof TINTS;

export function Bar({
  value,
  width,
  height,
  tint = 'green',
  animate = true,
}: {
  /** 0 to 1. */
  value: number;
  width: number;
  height: number;
  tint?: BarTint;
  animate?: boolean;
}) {
  const pct = Math.max(0, Math.min(1, value));
  const fillScale = height / BAR_FILL.h;
  const minFill = (BAR_FILL.slice[1] + BAR_FILL.slice[3]) * fillScale;
  const fillWidth = pct * width;

  return (
    <div style={{ position: 'relative', width, height }}>
      <div
        style={{
          position: 'absolute', inset: 0, boxSizing: 'border-box',
          ...frameStyle(BAR_TRACK, height / BAR_TRACK.h),
        }}
      />
      {fillWidth >= minFill && (
        <div
          style={{
            position: 'absolute', left: 0, top: 0,
            width: fillWidth, height, boxSizing: 'border-box',
            filter: TINTS[tint],
            transition: animate ? 'width .12s linear, filter .3s' : 'none',
            ...frameStyle(BAR_FILL, fillScale),
          }}
        />
      )}
    </div>
  );
}
