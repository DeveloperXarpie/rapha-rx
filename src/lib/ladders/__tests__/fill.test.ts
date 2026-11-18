import { describe, it, expect } from 'vitest';
import { fillLadder } from '../fill';

describe('fillLadder (DIFFICULTY_RULES 1.1)', () => {
  const anchors = [
    { level: 1, values: { n: 3, on: false } },
    { level: 5, values: { n: 5, on: true } },
  ];
  const spec = { n: { kind: 'step', step: 1 }, on: { kind: 'switch' } } as const;

  it('steps a number evenly between anchors, rounded to its step', () =>
    expect(fillLadder(anchors, 5, spec).map((r) => r.n)).toEqual([3, 4, 4, 5, 5]));

  it('switches a flag at the next anchor, never halfway', () =>
    expect(fillLadder(anchors, 5, spec).map((r) => r.on)).toEqual([false, false, false, false, true]));

  it('returns the anchor rows unchanged', () => {
    const rows = fillLadder(anchors, 5, spec);
    expect(rows[0]).toEqual(anchors[0].values);
    expect(rows[4]).toEqual(anchors[1].values);
  });

  it('rounds to a coarser step', () =>
    expect(fillLadder(
      [{ level: 1, values: { ms: 1500 } }, { level: 3, values: { ms: 2500 } }],
      3, { ms: { kind: 'step', step: 500 } },
    ).map((r) => r.ms)).toEqual([1500, 2000, 2500]));

  it('interpolates each member of an object field', () =>
    expect(fillLadder(
      [{ level: 1, values: { mix: { a: 0, b: 0 } } }, { level: 3, values: { mix: { a: 0.2, b: 0.4 } } }],
      3, { mix: { kind: 'step', step: 0.05 } },
    )[1].mix).toEqual({ a: 0.1, b: 0.2 }));

  it('refuses anchors that do not cover the first and last level', () => {
    expect(() => fillLadder([{ level: 2, values: { n: 1 } }, { level: 5, values: { n: 2 } }], 5,
      { n: { kind: 'step', step: 1 } })).toThrow();
    expect(() => fillLadder([{ level: 1, values: { n: 1 } }], 5, { n: { kind: 'step', step: 1 } })).toThrow();
  });
});
