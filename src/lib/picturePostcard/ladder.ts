export type ChangeClass = 1 | 2 | 3 | 4 | 5 | 6 | 7;
// M1 (side-by-side "spot the difference") was removed: showing the original
// alongside the modified scene during the probe turns a memory task into a
// perceptual one. Tiers 1-2 now use M2 and take their scaffolding from the
// longer encode / shorter delay the curves already give at low levels.
export type ProbeMode = 'M2' | 'M3';

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
  /** When set, the generator uses this scene instead of picking from the pool. */
  sceneId?: string;
}

export const DI_STEP = 0.08;
export const DI_CLAMP = 2.0;

export const FIRST_APPEARANCE: Record<ChangeClass, number> = {
  1: 1, 2: 4, 3: 11, 4: 15, 5: 21, 6: 33, 7: 41,
};

export const M3_ELIGIBLE_CLASSES: ChangeClass[] = [1, 2, 4, 5];

/**
 * Levels bound to a specific scene rather than drawing from the random pool.
 *
 * The post-office photo scene supports change class 1 only, so it must never be
 * reachable above the levels that ask for removals alone. pickScene also excludes every
 * pinned scene from its pool, so this is the sole route to it.
 */
export const PINNED_SCENE_BY_LEVEL: Record<number, string> = {
  1: 'post-office', 2: 'post-office', 3: 'post-office',
};

/**
 * Authored objects / hidden counts for the pinned photo levels.
 *
 * Not curve-derived: the curve tops out at 4 changes (level 100), so these sit inside
 * the game's own difficulty range rather than above it. `objects` is 10 because the
 * photo scene has exactly ten items and shows all of them during encode.
 *
 * Deliberately NOT DI-shifted - encode duration and retention delay carry the adaptive
 * load on these levels instead. See the spec's known concerns.
 */
const PHOTO_LEVEL_PARAMS: Record<number, { objects: number; changes: number }> = {
  1: { objects: 10, changes: 2 },
  2: { objects: 10, changes: 3 },
  3: { objects: 10, changes: 4 },
};

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

/**
 * Curves evaluated at the DI-shifted level coordinate (spec A7), with the authored
 * photo-level overrides applied at the TRUE level so DI cannot move the hidden count.
 *
 * This is the only runtime source of trial parameters. LevelDef.params is derived from
 * it rather than the other way round - overriding LevelDef.params alone would be dead
 * code, because nothing at runtime reads it.
 */
export function effectiveParams(level: number, di: number): TrialParams {
  const n = Math.min(100, Math.max(1, level + di));
  const base = curveParams(n);
  const override = PHOTO_LEVEL_PARAMS[Math.round(Math.min(100, Math.max(1, level)))];
  return override ? { ...base, ...override } : base;
}

const TIER_PROBE_WEIGHTS: Partial<Record<ProbeMode, number>>[] = [
  { M2: 1 },                // tier 1
  { M2: 1 },                // tier 2
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
    params: effectiveParams(n, 0),
    changeTypeWeights: changeTypeWeights(n),
    probeModeWeights: TIER_PROBE_WEIGHTS[t],
    softTimerMs: TIER_SOFT_TIMER[t],
    interference: tier >= 5,
    sceneId: PINNED_SCENE_BY_LEVEL[n],
  };
}

export const LADDER: LevelDef[] = Array.from({ length: 100 }, (_, i) => buildLevel(i + 1));

export function getLevelDef(level: number): LevelDef {
  return LADDER[Math.min(100, Math.max(1, Math.round(level))) - 1];
}
