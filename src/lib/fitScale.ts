/**
 * Uniform fit: the largest scale at which a `canvasW x canvasH` design canvas fits
 * inside a `boxW x boxH` box, preserving aspect ratio.
 *
 * A canvas is height-bound whenever `canvasW / canvasH` is less than `boxW / boxH`.
 * Every portrait board in this app is height-bound on a 360x552 play box.
 *
 * Returns 0 rather than a garbage number for any non-positive input. A ResizeObserver
 * can legitimately fire with a zero box during mount, and 0 is the signal callers use
 * to keep rendering their loading state instead of drawing a collapsed board.
 */
export function fitScale(boxW: number, boxH: number, canvasW: number, canvasH: number): number {
  if (boxW <= 0 || boxH <= 0 || canvasW <= 0 || canvasH <= 0) return 0;
  return Math.min(boxW / canvasW, boxH / canvasH);
}
