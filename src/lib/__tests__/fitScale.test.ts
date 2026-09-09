import { describe, it, expect } from 'vitest';
import { fitBoard, fitScale } from '../fitScale';

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

describe('fitBoard', () => {
  // Train Yard's canvas, and the column a Galaxy S24+ gives it.
  const CW = 800;
  const CH = 1276;

  it('is the plain uniform fit when the whole canvas is safe', () => {
    // Nothing may be cropped, so this can do no better than fitScale.
    const fit = fitBoard(412, 892, CW, CH, 0, CW);
    expect(fit.scale).toBeCloseTo(fitScale(412, 892, CW, CH), 5);
    expect(fit.bleedPerSide).toBe(0);
  });

  it('spends a declared margin to fill more of the height', () => {
    // 80px of scenery down each side may go. The safe band is 640 wide and centred,
    // so the box has to cover 640 design px rather than 800.
    const fit = fitBoard(412, 892, CW, CH, 80, 720);
    expect(fit.scale).toBeCloseTo(412 / 640, 5);
    expect(fit.scale).toBeGreaterThan(fitScale(412, 892, CW, CH));
    expect(fit.bleedPerSide).toBeCloseTo((CW * (412 / 640) - 412) / 2, 5);
  });

  it('never scales past the height, however much margin is offered', () => {
    // A box wide enough for the whole canvas takes the height bound and crops nothing -
    // an offered margin is permission to crop, never an instruction to.
    const fit = fitBoard(4000, 892, CW, CH, 80, 720);
    expect(fit.scale).toBeCloseTo(892 / CH, 5);
    expect(fit.bleedPerSide).toBe(0);
  });

  it('measures an off-centre safe band from the far side', () => {
    // The board is centred in the box, so the crop is symmetric however off-centre the
    // band is. For 40..720 the widest half is the left one, 400 - 40 = 360, so the box
    // has to cover 720 design px about the centre - which reaches 760 on the right, well
    // past the declared 720. The tighter side sets the scale for both.
    const fit = fitBoard(412, 892, CW, CH, 40, 720);
    expect(fit.scale).toBeCloseTo(412 / 720, 5);
  });

  it('centres the board in whatever height is left over', () => {
    const fit = fitBoard(412, 892, CW, CH, 0, CW);
    const drawn = CH * fit.scale;
    expect(fit.offsetY).toBeCloseTo((892 - drawn) / 2, 5);
    expect(fit.offsetY).toBeGreaterThan(0);
  });

  it('leaves no offset once the board fills the height', () => {
    // A shorter box, so the height binds before the safe band does.
    const fit = fitBoard(412, 700, CW, CH, 80, 720);
    expect(fit.scale).toBeCloseTo(700 / CH, 5);
    expect(fit.offsetY).toBeCloseTo(0, 5);
  });

  it('is a no-op for an unmeasured box', () => {
    expect(fitBoard(0, 892, CW, CH, 0, CW)).toEqual({ scale: 0, offsetY: 0, bleedPerSide: 0 });
  });

  it('ignores a safe band wider than the canvas', () => {
    expect(fitBoard(412, 892, CW, CH, -50, CW + 50).scale)
      .toBeCloseTo(fitScale(412, 892, CW, CH), 5);
  });
});
