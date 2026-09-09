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

export interface BoardFit {
  /** The scale to draw the canvas at. */
  scale: number;
  /** Top offset that centres the drawn board in the box. 0 once it fills the height. */
  offsetY: number;
  /** How far the canvas runs past each edge of the box. 0 when nothing is cropped. */
  bleedPerSide: number;
}

const NO_FIT: BoardFit = { scale: 0, offsetY: 0, bleedPerSide: 0 };

/**
 * The fit every fixed-canvas board uses.
 *
 * `fitScale` alone is wrong on a tall phone. A board canvas is about 0.63 wide-to-tall
 * and a modern phone is 0.46, so the WIDTH binds: on a Galaxy S24+ Train Yard draws 657px
 * tall in an 892px column and the remaining 235px is empty app grey. The column's own
 * `64dvh` cap (styles/index.css) means tablets never see this - their column is 0.640
 * against canvases of 0.625-0.640, so both dimensions bind together - but every phone
 * does, and the narrower the phone the worse it gets.
 *
 * The fix is to let a board give up the parts of its canvas that carry nothing: scenery,
 * background, empty ground. `safeLeft`/`safeRight` are the horizontal band that MUST stay
 * on screen, declared in each board's own geometry file next to the coordinates they are
 * measured from. This scales up until either the height is filled or that band reaches
 * the edges, whichever comes first, so:
 *
 *   - nothing inside the safe band is ever cropped, on any viewport, however narrow;
 *   - a board whose art has no margin to give simply gets today's uniform fit back;
 *   - the leftover height, if any, is split top and bottom rather than dumped at the
 *     bottom, and the caller paints it with the board's own ground.
 *
 * The board is centred horizontally, so the crop is symmetric however off-centre the safe
 * band is - hence measuring the band by its widest half rather than its width.
 */
export function fitBoard(
  boxW: number,
  boxH: number,
  canvasW: number,
  canvasH: number,
  safeLeft: number,
  safeRight: number,
): BoardFit {
  if (boxW <= 0 || boxH <= 0 || canvasW <= 0 || canvasH <= 0) return NO_FIT;

  const left = Math.max(0, Math.min(safeLeft, canvasW));
  const right = Math.min(canvasW, Math.max(safeRight, 0));
  if (right <= left) return NO_FIT;

  const centre = canvasW / 2;
  const halfSpan = Math.max(centre - left, right - centre);

  const heightBound = boxH / canvasH;
  const safeBound = halfSpan > 0 ? boxW / (2 * halfSpan) : Infinity;
  const scale = Math.min(heightBound, safeBound);

  return {
    scale,
    offsetY: Math.max(0, (boxH - canvasH * scale) / 2),
    bleedPerSide: Math.max(0, (canvasW * scale - boxW) / 2),
  };
}
