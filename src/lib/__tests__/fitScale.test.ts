import { describe, it, expect } from 'vitest';
import { fitScale } from '../fitScale';

describe('fitScale', () => {
  it('takes the tighter of the two dimensions', () => {
    // A 800x1280 canvas in a 360x552 box: 360/800 = 0.45, 552/1280 = 0.43125.
    expect(fitScale(360, 552, 800, 1280)).toBeCloseTo(0.43125, 5);
    // The same canvas in a box that is tall for its width is width-bound instead.
    expect(fitScale(360, 4000, 800, 1280)).toBeCloseTo(0.45, 5);
  });

  it('returns exactly 1 when the canvas already fits the box', () => {
    expect(fitScale(800, 1280, 800, 1280)).toBe(1);
  });

  it('scales up when the box is larger than the canvas', () => {
    expect(fitScale(1600, 2560, 800, 1280)).toBeCloseTo(2, 5);
  });

  it('returns 0 for a box that has not been measured yet', () => {
    // The observer can fire with a zero box during mount. Callers render a loading
    // state on 0 rather than dividing by it.
    expect(fitScale(0, 0, 800, 1280)).toBe(0);
    expect(fitScale(360, 0, 800, 1280)).toBe(0);
    expect(fitScale(0, 552, 800, 1280)).toBe(0);
  });

  it('returns 0 for a canvas with no area, rather than Infinity', () => {
    expect(fitScale(360, 552, 0, 1280)).toBe(0);
    expect(fitScale(360, 552, 800, 0)).toBe(0);
  });

  it('never returns a negative scale', () => {
    expect(fitScale(-10, 552, 800, 1280)).toBe(0);
  });
});
