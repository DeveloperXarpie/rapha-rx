import type { ChangeClass, LevelDef, ProbeMode, TrialParams } from '../picturePostcard/ladder';
import { M3_ELIGIBLE_CLASSES } from '../picturePostcard/ladder';
import { SCENES } from '../../games/memory/PicturePostcard/scenes';
import type { ObjectSlot, SceneDef } from '../../games/memory/PicturePostcard/scenes';
import { SPRITES } from '../../games/memory/PicturePostcard/sprites';
import { daysBetweenISO, todayISO } from '../dates';

export interface AppliedChange {
  changeClass: ChangeClass;
  slotId: string;
  // per-class payload:
  addedSpriteId?: string;                  // class 2
  newPosition?: { x: number; y: number };  // class 2 (added-object placement) / class 3
  newFill?: string;                        // class 4
  newSpriteId?: string;                    // class 5
  newScale?: number;                       // class 6
  mirrored?: boolean;                      // class 7
}

export interface M3Option { spriteId: string; fill: string; correct: boolean }

export interface TrialSpec {
  sceneId: string;
  probeMode: ProbeMode;
  changes: AppliedChange[];       // probed change FIRST
  lurePlacements: { spriteId: string; x: number; y: number; w: number; h: number }[];
  m3Question?: { questionKey: string; options: M3Option[] }; // shuffled, exactly 4
  params: TrialParams;
  softTimerMs: number | null;
  interference: boolean;
  // Optional so hand-written TrialSpec fixtures elsewhere (e.g. trialMachine tests) keep compiling;
  // generateTrial always populates it. Class-2 additions are NOT included (they target invisible slots).
  visibleSlotIds?: string[];
}

interface PairHistoryEntry { sceneId: string; changeClass: number; lastUsedDate: string }

const M3_QUESTION_NAME: Partial<Record<ChangeClass, string>> = {
  1: 'removal', 2: 'addition', 4: 'colour', 5: 'substitution',
};

/** Weighted sample of a key from a Partial<Record<K, number>>; falls back to the first key if all weights are 0. */
function sampleWeighted<K extends string | number>(rng: () => number, weights: Partial<Record<K, number>>): K {
  const entries = Object.entries(weights) as [string, number | undefined][];
  const positive = entries.filter(([, w]) => (w ?? 0) > 0);
  const pool = positive.length > 0 ? positive : entries;
  const total = pool.reduce((sum, [, w]) => sum + (w ?? 0), 0);
  const asKey = (k: string): K => (/^-?\d+$/.test(k) ? (Number(k) as unknown as K) : (k as unknown as K));
  if (total <= 0) return asKey(pool[0][0]);
  let r = rng() * total;
  for (const [k, w] of pool) {
    r -= w ?? 0;
    if (r <= 1e-9) return asKey(k);
  }
  return asKey(pool[pool.length - 1][0]);
}

function shuffle<T>(arr: T[], rng: () => number): T[] {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

/** Rule 1: exclude this-session scenes, prefer no 30-day pair conflict; relax pair rule then session rule rather than throw. */
function pickScene(
  levelDef: LevelDef,
  scenesThisSession: string[],
  pairHistory: PairHistoryEntry[],
  rng: () => number,
): SceneDef {
  const today = todayISO();
  const candidateClasses = (Object.keys(levelDef.changeTypeWeights) as unknown as string[]).map(Number);
  const conflicted = (s: SceneDef) => pairHistory.some((h) => h.sceneId === s.id
    && candidateClasses.includes(h.changeClass)
    && daysBetweenISO(h.lastUsedDate, today) < 30);

  // Pinned scenes are bound to specific levels and must never be drawn here. The photo
  // scene supports change class 1 only, so serving it at a level that asks for a
  // recolour or an M3 question would produce a trial that cannot be probed.
  const poolScenes = SCENES.filter((s) => !s.pinned);
  const sessionFiltered = poolScenes.filter((s) => !scenesThisSession.includes(s.id));
  let pool = sessionFiltered.filter((s) => !conflicted(s));
  if (pool.length === 0) pool = sessionFiltered;       // relax the 30-day pair rule
  if (pool.length === 0) pool = poolScenes;            // relax the session rule too
  return pool[Math.floor(rng() * pool.length)];
}

/** Rule 2 (subset): visible slots weighted toward salience, without replacement. */
function pickVisibleSlots(scene: SceneDef, count: number, rng: () => number): ObjectSlot[] {
  const pool = [...scene.slots];
  const chosen: ObjectSlot[] = [];
  const n = Math.min(count, pool.length);
  for (let i = 0; i < n; i++) {
    const weights: Partial<Record<number, number>> = {};
    pool.forEach((s, idx) => { weights[idx] = s.salience; });
    const idx = sampleWeighted(rng, weights);
    chosen.push(pool[idx]);
    pool.splice(idx, 1);
  }
  return chosen;
}

/**
 * Whether a slot carries the data a given change class needs. Raster slots only carry a
 * bbox and an image, so this is what confines photo scenes to removal without any
 * scene-kind branching downstream.
 */
export function supportsClass(s: ObjectSlot, cls: ChangeClass): boolean {
  switch (cls) {
    case 1: return true;
    case 2: return !!s.variants && !!s.altPositions;
    case 3: return !!s.altPositions;
    case 4: return !!s.variants && s.variants.colours.length > 0;
    case 5: return !!s.variants;
    case 6: return !!s.variants;
    case 7: return !!s.spriteId && !!SPRITES[s.spriteId]?.mirrorable;
    default: return false;
  }
}

/** Rule 3: which slots a given change class may legally target. */
function eligiblePool(cls: ChangeClass, visible: ObjectSlot[], invisible: ObjectSlot[], used: Set<string>): ObjectSlot[] {
  const pool = cls === 2 ? invisible : visible;
  return pool.filter((s) => !used.has(s.id) && supportsClass(s, cls));
}

/**
 * Rule 2/3: compute the per-class payload for a change already targeted at `slot`.
 * Returns null when the slot lacks the payload; eligiblePool should already have
 * excluded it, so null means buildChanges retries rather than emitting a broken change.
 */
function applyChangeClass(scene: SceneDef, slot: ObjectSlot, cls: ChangeClass, rng: () => number): AppliedChange | null {
  void scene;
  switch (cls) {
    case 1:
      return { changeClass: 1, slotId: slot.id };
    case 2: {
      if (!slot.altPositions || !slot.variants) return null;
      const pos = slot.altPositions[Math.floor(rng() * slot.altPositions.length)];
      return { changeClass: 2, slotId: slot.id, addedSpriteId: slot.variants.alternate, newPosition: pos };
    }
    case 3: {
      if (!slot.altPositions) return null;
      const pos = slot.altPositions[Math.floor(rng() * slot.altPositions.length)];
      return { changeClass: 3, slotId: slot.id, newPosition: pos };
    }
    case 4: {
      if (!slot.variants) return null;
      const fill = slot.variants.colours[Math.floor(rng() * slot.variants.colours.length)];
      return { changeClass: 4, slotId: slot.id, newFill: fill };
    }
    case 5:
      if (!slot.variants) return null;
      return { changeClass: 5, slotId: slot.id, newSpriteId: slot.variants.alternate };
    case 6: {
      if (!slot.variants) return null;
      const [lo, hi] = slot.variants.scales;
      return { changeClass: 6, slotId: slot.id, newScale: rng() < 0.5 ? lo : hi };
    }
    case 7:
    default:
      return { changeClass: 7, slotId: slot.id, mirrored: true };
  }
}

function buildChanges(
  scene: SceneDef,
  visible: ObjectSlot[],
  weights: Partial<Record<ChangeClass, number>>,
  count: number,
  rng: () => number,
): AppliedChange[] {
  const invisible = scene.slots.filter((s) => !visible.some((v) => v.id === s.id));
  const used = new Set<string>();
  const changes: AppliedChange[] = [];

  for (let i = 0; i < count; i++) {
    let applied: AppliedChange | null = null;
    for (let attempt = 0; attempt < 20 && !applied; attempt++) {
      const cls = sampleWeighted(rng, weights);
      const pool = eligiblePool(cls, visible, invisible, used);
      if (pool.length === 0) continue;
      const target = pool[Math.floor(rng() * pool.length)];
      applied = applyChangeClass(scene, target, cls, rng);
    }
    if (!applied) {
      // never throw: fall back to the first still-eligible (class, slot) combination
      const fallback = (Object.keys(weights) as unknown as ChangeClass[])
        .map(Number as unknown as (c: unknown) => ChangeClass)
        .map((cls) => ({ cls, pool: eligiblePool(cls, visible, invisible, used) }))
        .find((p) => p.pool.length > 0);
      if (!fallback) break; // truly nothing left to change
      const target = fallback.pool[Math.floor(rng() * fallback.pool.length)];
      applied = applyChangeClass(scene, target, fallback.cls, rng);
      if (!applied) break;
    }
    used.add(applied.slotId);
    changes.push(applied);
  }
  return changes;
}

/** Rule 5: place `lureLevel` lures near the change targets, skipping any that can't satisfy the separation constraint. */
function placeLures(
  scene: SceneDef,
  changes: AppliedChange[],
  lureLevel: number,
  rng: () => number,
): TrialSpec['lurePlacements'] {
  const lures: TrialSpec['lurePlacements'] = [];
  if (lureLevel <= 0 || changes.length === 0) return lures;

  const targets = changes
    .map((c) => scene.slots.find((sl) => sl.id === c.slotId))
    .filter((s): s is ObjectSlot => !!s && !!s.lures);
  if (targets.length === 0) return lures;

  const lureIndex = Math.min(2, Math.max(0, 3 - lureLevel));
  for (let i = 0; i < lureLevel; i++) {
    const source = targets[i % targets.length];
    const spriteId = source.lures?.[lureIndex];
    if (!spriteId) continue;
    const w = source.bbox.w;
    const h = source.bbox.h;
    for (let attempt = 0; attempt < 20; attempt++) {
      const x = rng() * Math.max(0, 1 - w);
      const y = rng() * Math.max(0, 1 - h);
      const cx = x + w / 2;
      const cy = y + h / 2;
      const ok = targets.every((t) => {
        const tcx = t.bbox.x + t.bbox.w / 2;
        const tcy = t.bbox.y + t.bbox.h / 2;
        const minSep = 1.5 * (Math.hypot(w, h) / 2 + Math.hypot(t.bbox.w, t.bbox.h) / 2);
        return Math.hypot(cx - tcx, cy - tcy) > minSep;
      });
      if (ok) {
        lures.push({ spriteId, x, y, w, h });
        break;
      }
    }
  }
  return lures;
}

/** Rule 6: build the 4-option M3 recognition question for the probed (first) change. */
function buildM3(slot: ObjectSlot, change: AppliedChange, rng: () => number): TrialSpec['m3Question'] {
  const name = M3_QUESTION_NAME[change.changeClass];
  if (!name) return undefined;

  // M3 needs the full vector payload. Raster slots never reach here - photo levels are
  // tier 1, which is M2-only - but the guard keeps the type honest.
  if (!slot.spriteId || !slot.baseFill || !slot.variants || !slot.lures) return undefined;
  const spriteId = slot.spriteId;
  const baseFill = slot.baseFill;
  const variants = slot.variants;
  const lures = slot.lures;

  let options: M3Option[];
  if (change.changeClass === 4) {
    options = [
      { spriteId, fill: baseFill, correct: baseFill === change.newFill },
      ...variants.colours.map((fill) => ({ spriteId, fill, correct: fill === change.newFill })),
    ];
  } else if (change.changeClass === 1) {
    options = [
      { spriteId, fill: baseFill, correct: true },
      ...lures.map((id) => ({ spriteId: id, fill: baseFill, correct: false })),
    ];
  } else if (change.changeClass === 2) {
    options = [
      { spriteId: change.addedSpriteId ?? variants.alternate, fill: baseFill, correct: true },
      ...lures.map((id) => ({ spriteId: id, fill: baseFill, correct: false })),
    ];
  } else {
    // class 5: original + variants.alternate + 2 lures
    options = [
      { spriteId, fill: baseFill, correct: false },
      { spriteId: variants.alternate, fill: baseFill, correct: true },
      { spriteId: lures[0], fill: baseFill, correct: false },
      { spriteId: lures[1], fill: baseFill, correct: false },
    ];
  }

  return { questionKey: `pp.probe.m3.${name}`, options: shuffle(options, rng) };
}

/** Rule 3: when probing via M3, restrict + renormalise the change-class distribution to M3_ELIGIBLE_CLASSES. */
function m3RenormalisedWeights(weights: Partial<Record<ChangeClass, number>>): Partial<Record<ChangeClass, number>> {
  const withWeight = M3_ELIGIBLE_CLASSES.filter((c) => (weights[c] ?? 0) > 0);
  const eligible = withWeight.length > 0 ? withWeight : M3_ELIGIBLE_CLASSES;
  const out: Partial<Record<ChangeClass, number>> = {};
  eligible.forEach((c) => { out[c] = weights[c] ?? 1; });
  return out;
}

export function generateTrial(opts: {
  levelDef: LevelDef;
  params: TrialParams;
  scenesThisSession: string[];
  pairHistory: PairHistoryEntry[];
  rng?: () => number;
}): TrialSpec {
  const { levelDef, params, scenesThisSession, pairHistory, rng = Math.random } = opts;

  // Rule 1, with a pinned override: level-bound scenes bypass the pool entirely, so
  // session-uniqueness and the 30-day pair rule do not apply to them.
  const pinned = levelDef.sceneId ? SCENES.find((s) => s.id === levelDef.sceneId) : undefined;
  const scene = pinned ?? pickScene(levelDef, scenesThisSession, pairHistory, rng);
  const probeMode = sampleWeighted(rng, levelDef.probeModeWeights);       // rule 4
  const visible = pickVisibleSlots(scene, params.objects, rng);           // rule 2

  const weights = probeMode === 'M3'
    ? m3RenormalisedWeights(levelDef.changeTypeWeights)                   // rule 3 (M3 renormalisation)
    : levelDef.changeTypeWeights;
  const changes = buildChanges(scene, visible, weights, params.changes, rng); // rules 2/3

  const lurePlacements = placeLures(scene, changes, params.lureLevel, rng);   // rule 5

  let m3Question: TrialSpec['m3Question'];
  if (probeMode === 'M3' && changes.length > 0) {
    const primary = changes[0];
    const slot = scene.slots.find((s) => s.id === primary.slotId);
    if (slot) m3Question = buildM3(slot, primary, rng);                  // rule 6
  }

  return {
    sceneId: scene.id,
    probeMode,
    changes,
    lurePlacements,
    m3Question,
    params,
    softTimerMs: levelDef.softTimerMs,
    interference: levelDef.interference,
    visibleSlotIds: visible.map((s) => s.id),
  };
}
