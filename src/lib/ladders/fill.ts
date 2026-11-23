/**
 * Fills a difficulty ladder from its anchor levels (DIFFICULTY_RULES 1.1).
 *
 * The owner sets a few anchor levels; every level between two anchors moves each knob
 * evenly, rounded to that knob's step. Anchors are never changed. A filled level that
 * breaks a game's rule is left for the guardrail tests to name, so the fix is another
 * anchor, not a silent adjustment here.
 */

export type FieldSpec = { kind: 'step'; step: number } | { kind: 'switch' };

/** Who set an anchor: the owner, or Claude (the rules doc's samples and any extra anchor). */
export type AnchorSource = 'owner' | 'claude';

export interface Anchor<T> {
  level: number;
  values: T;
  /** Carried to and from the ladder sheet; the fill ignores both. */
  source?: AnchorSource;
  note?: string;
}

/** Rounds to a multiple of `step` without float noise (0.05 x 6 is 0.3, not 0.30000000000000004). */
function roundTo(value: number, step: number): number {
  const decimals = (String(step).split('.')[1] ?? '').length;
  return Number((Math.round(value / step) * step).toFixed(decimals));
}

function between(from: unknown, to: unknown, t: number, spec: FieldSpec): unknown {
  if (spec.kind === 'switch') return t < 1 ? from : to;
  if (typeof from === 'number' && typeof to === 'number') {
    return roundTo(from + (to - from) * t, spec.step);
  }
  if (from && to && typeof from === 'object' && typeof to === 'object') {
    const out: Record<string, unknown> = {};
    for (const key of Object.keys(from)) {
      out[key] = between((from as Record<string, unknown>)[key], (to as Record<string, unknown>)[key], t, spec);
    }
    return out;
  }
  return t < 1 ? from : to;
}

export function fillLadder<T extends object>(
  anchors: Anchor<T>[],
  length: number,
  spec: { [K in keyof T]: FieldSpec },
): T[] {
  const sorted = [...anchors].sort((a, b) => a.level - b.level);
  if (sorted[0]?.level !== 1 || sorted[sorted.length - 1]?.level !== length) {
    throw new Error(`ladder anchors must include level 1 and level ${length}`);
  }

  const rows: T[] = [];
  for (let level = 1; level <= length; level++) {
    const exact = sorted.find((a) => a.level === level);
    if (exact) {
      rows.push(exact.values);
      continue;
    }
    const lo = [...sorted].reverse().find((a) => a.level < level)!;
    const hi = sorted.find((a) => a.level > level)!;
    const t = (level - lo.level) / (hi.level - lo.level);
    const row = {} as Record<string, unknown>;
    const from = lo.values as Record<string, unknown>;
    const to = hi.values as Record<string, unknown>;
    for (const key of Object.keys(spec)) {
      row[key] = between(from[key], to[key], t, spec[key as keyof T]);
    }
    rows.push(row as unknown as T);
  }
  return rows;
}
