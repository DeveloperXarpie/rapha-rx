export type ChangeClass = 1 | 2 | 3 | 4 | 5 | 6 | 7;
export type ProbeMode = 'M1' | 'M2' | 'M3';

export interface TrialParams {
  objects: number;
  encodeMs: number;
  delayMs: number;
  changes: number;
  lureLevel: number;
}

export interface LevelDef {
  level: number;
  tier: number;
  params: TrialParams;
  changeTypeWeights: Partial<Record<ChangeClass, number>>;
  probeModeWeights: Partial<Record<ProbeMode, number>>;
  softTimerMs: number | null;
  interference: boolean;
}

export const DI_STEP = 0.08;
export const DI_CLAMP = 2.0;

export const FIRST_APPEARANCE: Record<ChangeClass, number> = {
  1: 1, 2: 4, 3: 11, 4: 15, 5: 21, 6: 33, 7: 41,
};

export const M3_ELIGIBLE_CLASSES: ChangeClass[] = [1, 2, 4, 5];

// GDD SS4.3 curves — authoritative over the tier table (spec A5)
function curveParams(n: number): TrialParams {
  const x = n / 100;
  return {
    objects: Math.round(5 + 13 * Math.pow(x, 0.85)),
    encodeMs: Math.round(8000 - 5000 * Math.pow(x, 0.7)),
    delayMs: Math.round(500 + 9500 * Math.pow(x, 1.2)),
    changes: 1 + Math.floor(n / 28),
    lureLevel: Math.floor(n / 26),
  };
}

/** Curves evaluated at the DI-shifted level coordinate (spec A7). */
export function effectiveParams(level: number, di: number): TrialParams {
  const n = Math.min(100, Math.max(1, level + di));
  const x = n / 100;
  return {
    objects: Math.round(5 + 13 * Math.pow(x, 0.85)),
    encodeMs: Math.round(8000 - 5000 * Math.pow(x, 0.7)),
    delayMs: Math.round(500 + 9500 * Math.pow(x, 1.2)),
    changes: 1 + Math.floor(n / 28),
    lureLevel: Math.floor(n / 26),
  };
}

const TIER_PROBE_WEIGHTS: Partial<Record<ProbeMode, number>>[] = [
  { M1: 1 },                // tier 1
  { M1: 0.5, M2: 0.5 },     // tier 2
  { M2: 1 },                // tier 3
  { M2: 0.5, M3: 0.5 },     // tier 4
  { M3: 1 },                // tier 5
];
const TIER_SOFT_TIMER: (number | null)[] = [null, null, 60000, 60000, 45000];

// Recency-biased weights: newest available class 3 parts, second-newest 2, rest 1 each.
function changeTypeWeights(n: number): Partial<Record<ChangeClass, number>> {
  const available = (Object.keys(FIRST_APPEARANCE) as unknown as string[])
    .map(Number)
    .filter((c) => FIRST_APPEARANCE[c as ChangeClass] <= n)
    .sort((a, b) => FIRST_APPEARANCE[b as ChangeClass] - FIRST_APPEARANCE[a as ChangeClass]);
  const raw = available.map((_, i) => (i === 0 ? 3 : i === 1 ? 2 : 1));
  const total = raw.reduce((a, b) => a + b, 0);
  const out: Partial<Record<ChangeClass, number>> = {};
  available.forEach((c, i) => { out[c as ChangeClass] = raw[i] / total; });
  return out;
}

function buildLevel(n: number): LevelDef {
  const tier = Math.ceil(n / 10);
  const t = Math.min(tier, 5) - 1; // MVP arrays cover tiers 1-5; 6+ reuse tier-5 row
  return {
    level: n,
    tier,
    params: curveParams(n),
    changeTypeWeights: changeTypeWeights(n),
    probeModeWeights: TIER_PROBE_WEIGHTS[t],
    softTimerMs: TIER_SOFT_TIMER[t],
    interference: tier >= 5,
  };
}

export const LADDER: LevelDef[] = Array.from({ length: 100 }, (_, i) => buildLevel(i + 1));

export function getLevelDef(level: number): LevelDef {
  return LADDER[Math.min(100, Math.max(1, Math.round(level))) - 1];
}
