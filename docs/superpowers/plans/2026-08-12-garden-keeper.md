# Garden Keeper Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship `garden-keeper`, the fourth attention game: plants sprout one at a time and must be watered with a single tap before a countdown ring closes, while weeds, insects and toadstools must be left alone.

**Architecture:** A fixed 800 × 1280 design canvas scaled to its container with one transform, as Train Yard does. Round state lives in a `useReducer` over a pure reducer in `model.ts`, so stage advancement and scoring are testable in Node with no DOM. Bed layout is a pure function with an injectable RNG. Plant artwork is CSS primitives returned as style strings from a pure `art()` function, so the whole drawing layer is unit-testable and swapping to raster art later touches one file.

**Tech Stack:** React 19 + TypeScript, Vite, vitest (node environment), i18next, Tailwind for the outer shell only - the game canvas is inline styles transcribed from the prototype.

**Source of truth:** `docs/superpowers/specs/2026-08-12-garden-keeper-design.md`. The prototype is `design_handoff_garden_keeper/garden-keeper-src.dc.html` (logic) and `garden-keeper.html` (playable). Open the playable one in a browser before starting; it is the fastest way to understand what you are building.

## Global Constraints

- **Every task commits only its own files, named explicitly.** The working tree carries unrelated in-flight work (`src/games/executive/ServeTheGuests/`, `public/cook-assets/`, locale edits). Never `git add -A` or `git add .`.
- **`npm run lint` carries 38 pre-existing errors.** The gate is *no new errors*, checked by comparing the error count before and after. Do not attempt to fix the pre-existing ones.
- **`npm run build` must pass** (`tsc -b && vite build`) at the end of every task that touches TypeScript.
- **Tests:** vitest, `environment: 'node'`, discovered only at `src/**/__tests__/**/*.test.ts`. Test files must be `.ts`, never `.tsx`, and must not import anything that renders JSX or touches `window`.
- **All player-visible copy goes through `t('key', 'English fallback')`.** No string literals in JSX. Keys are namespaced `gk.*`.
- **Minimum hit target 96px**, above the app's 80px floor. Tap only: `pointerup`, no drag, no long-press, no double-tap.
- **No em dash anywhere**, in code, comments, copy or commit messages. Use a plain dash.
- **Never use `Math.random()` inside a function that a test needs to pin.** Take an `rng: () => number = Math.random` parameter instead.
- **Version bump is part of the final task**, `1.5.0` → `1.6.0` in `package.json`.
- Commit messages: no co-author trailer, no agent name.

---

### Task 1: Difficulty parameters

**Files:**
- Modify: `src/lib/dynamicDifficulty.ts` (append beside `getServeGuestsParams`, around line 323)
- Test: `src/lib/__tests__/gardenKeeperParams.test.ts`

**Interfaces:**
- Consumes: `lerp`, `lerpInt` from `src/lib/dynamicDifficulty.ts`
- Produces: `GardenKeeperDynamicParams`, `getGardenKeeperParams(score: number): GardenKeeperDynamicParams`. Every later task takes this interface as its params type.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/gardenKeeperParams.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../dynamicDifficulty';

describe('getGardenKeeperParams', () => {
  it('returns the gentle end of every axis at score 0', () => {
    expect(getGardenKeeperParams(0)).toEqual({
      plantCount: 12,
      distractorRatio: 0.25,
      targetCount: 8,
      spawnIntervalMs: 3000,
      thirstWindowMs: 6000,
      maxConcurrentThirsty: 1,
      roundDurationMs: 90000,
      lives: 3,
    });
  });

  it('returns the hard end of every axis at score 1', () => {
    expect(getGardenKeeperParams(1)).toEqual({
      plantCount: 24,
      distractorRatio: 0.55,
      targetCount: 20,
      spawnIntervalMs: 1200,
      thirstWindowMs: 2800,
      maxConcurrentThirsty: 3,
      roundDurationMs: 90000,
      lives: 3,
    });
  });

  it('interpolates at the seeded default of 0.35', () => {
    const p = getGardenKeeperParams(0.35);
    expect(p.plantCount).toBe(16);
    expect(p.targetCount).toBe(12);
    expect(p.spawnIntervalMs).toBe(2370);
    expect(p.thirstWindowMs).toBe(4880);
    expect(p.distractorRatio).toBeCloseTo(0.355, 6);
    // The baseline experience is one thirsty plant at a time. Do not soften this.
    expect(p.maxConcurrentThirsty).toBe(1);
  });

  it('steps concurrency at 0.4 and 0.75, not before', () => {
    expect(getGardenKeeperParams(0.39).maxConcurrentThirsty).toBe(1);
    expect(getGardenKeeperParams(0.4).maxConcurrentThirsty).toBe(2);
    expect(getGardenKeeperParams(0.74).maxConcurrentThirsty).toBe(2);
    expect(getGardenKeeperParams(0.75).maxConcurrentThirsty).toBe(3);
  });

  it('keeps the round winnable by arithmetic at every difficulty', () => {
    // The first sprout fires 900ms after start. If the spawner cannot physically
    // present targetCount windows inside the round, the round is unwinnable by
    // arithmetic rather than by attention, which is a design failure.
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const p = getGardenKeeperParams(Math.min(1, s));
      const windows = Math.floor((p.roundDurationMs - 900) / p.spawnIntervalMs) * p.maxConcurrentThirsty;
      expect(windows).toBeGreaterThan(p.targetCount);
    }
  });

  it('clamps scores outside 0-1', () => {
    expect(getGardenKeeperParams(-1)).toEqual(getGardenKeeperParams(0));
    expect(getGardenKeeperParams(2)).toEqual(getGardenKeeperParams(1));
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/gardenKeeperParams.test.ts`
Expected: FAIL, `getGardenKeeperParams is not a function` / no such export.

- [ ] **Step 3: Write the implementation**

Append to `src/lib/dynamicDifficulty.ts`, after `getServeGuestsParams`:

```ts
export interface GardenKeeperDynamicParams {
  /** Total objects in the bed, flowers plus distractors. */
  plantCount: number;
  /** Share of plantCount that is weeds, insects and toadstools. */
  distractorRatio: number;
  /** Waterings needed to complete the round. */
  targetCount: number;
  /** Gap between spawner fires. */
  spawnIntervalMs: number;
  /** How long a sprouted plant stays waterable before it dries up. */
  thirstWindowMs: number;
  /** Ceiling on simultaneously sprouted plants. */
  maxConcurrentThirsty: number;
  roundDurationMs: number;
  lives: number;
}

/**
 * Two pressures from one score: search load (plantCount, distractorRatio) and time
 * pressure (spawn rate, window length, concurrency), so the curve goes wide before
 * it goes fast. Round length and lives are fixed - a shorter round would not fit the
 * two-minute category slot any better, and fewer than three hearts ends the round on
 * a single lapse of attention.
 */
export function getGardenKeeperParams(score: number): GardenKeeperDynamicParams {
  const s = Math.max(0, Math.min(1, score));
  return {
    plantCount: lerpInt(12, 24, s),
    distractorRatio: lerp(0.25, 0.55, s),
    targetCount: lerpInt(8, 20, s),
    spawnIntervalMs: lerpInt(3000, 1200, s),
    thirstWindowMs: lerpInt(6000, 2800, s),
    maxConcurrentThirsty: s < 0.4 ? 1 : s < 0.75 ? 2 : 3,
    roundDurationMs: 90000,
    lives: 3,
  };
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/gardenKeeperParams.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dynamicDifficulty.ts src/lib/__tests__/gardenKeeperParams.test.ts
git commit -m "feat: garden keeper difficulty parameters"
```

---

### Task 2: Bed geometry

**Files:**
- Create: `src/games/attention/GardenKeeper/geometry.ts`
- Test: `src/games/attention/GardenKeeper/__tests__/geometry.test.ts`

**Interfaces:**
- Consumes: `GardenKeeperDynamicParams` from Task 1.
- Produces:
  - `CANVAS_W = 800`, `CANVAS_H = 1280`, `HUD_H = 108`, `BOARD_H = 1172`, `BED = { x: 62, y: 250, w: 676, h: 860 }`
  - `type PlantKind = 'flower' | 'weed' | 'insect' | 'poison'`
  - `interface Plant { id, kind, species, colour, x, y, depth, size, hit, crawl, dur, delay }`
  - `buildBed(params, rng?): Plant[]`
  - `columnsFor(plantCount: number): number`
  - `hitSize(size: number): number`
  - `zIndexFor(plant: Plant, active: boolean): number`
  - `recedeFor(depth: number): number`

- [ ] **Step 1: Write the failing test**

Create `src/games/attention/GardenKeeper/__tests__/geometry.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../../../../lib/dynamicDifficulty';
import { BED, buildBed, columnsFor, hitSize, zIndexFor, recedeFor } from '../geometry';

/** Deterministic generator: cycles a fixed ramp so jitter, picks and shuffles are pinned. */
function seededRng() {
  const ramp = [0.1, 0.9, 0.35, 0.72, 0.05, 0.5, 0.88, 0.21];
  let i = 0;
  return () => ramp[i++ % ramp.length];
}

describe('buildBed', () => {
  it('builds exactly plantCount plants', () => {
    const p = getGardenKeeperParams(0.35);
    expect(buildBed(p, seededRng())).toHaveLength(16);
  });

  it('allocates the distractor share, rounded', () => {
    const p = getGardenKeeperParams(1); // 24 plants, ratio .55 -> 13 distractors
    const bed = buildBed(p, seededRng());
    const distractors = bed.filter((pl) => pl.kind !== 'flower');
    expect(distractors).toHaveLength(Math.round(24 * 0.55));
    expect(bed.filter((pl) => pl.kind === 'flower')).toHaveLength(24 - 13);
  });

  it('gives every flower a species and a colourway, and no distractor a colourway', () => {
    const bed = buildBed(getGardenKeeperParams(0.5), seededRng());
    for (const pl of bed) {
      expect(pl.species).toBeTruthy();
      if (pl.kind === 'flower') expect(pl.colour).toBeTruthy();
      else expect(pl.colour).toBeUndefined();
    }
  });

  it('sorts ascending by y so nearer plants paint over further ones', () => {
    const bed = buildBed(getGardenKeeperParams(0.8), seededRng());
    const ys = bed.map((pl) => pl.y);
    expect(ys).toEqual([...ys].sort((a, b) => a - b));
  });

  it('keeps every plant inside the bed rectangle', () => {
    const bed = buildBed(getGardenKeeperParams(1), seededRng());
    for (const pl of bed) {
      expect(pl.x).toBeGreaterThan(BED.x);
      expect(pl.x).toBeLessThan(BED.x + BED.w);
      expect(pl.y).toBeGreaterThan(BED.y);
      expect(pl.y).toBeLessThan(BED.y + BED.h);
    }
  });

  it('keeps depth normalised', () => {
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      expect(pl.depth).toBeGreaterThanOrEqual(0);
      expect(pl.depth).toBeLessThanOrEqual(1);
    }
  });

  it('scales sprites with depth, insects smaller than plants', () => {
    const bed = buildBed(getGardenKeeperParams(1), seededRng());
    for (const pl of bed) {
      const base = pl.kind === 'insect' ? 82 : 96;
      expect(pl.size).toBeGreaterThanOrEqual(base * 0.86 - 0.001);
      expect(pl.size).toBeLessThanOrEqual(base * 1.14 + 0.001);
    }
  });

  it('never lets a hit target fall below 96px however small the sprite draws', () => {
    // Back-row insects draw at 82 * 0.86 = 70px. The tap area must not follow them down.
    expect(hitSize(70.5)).toBe(96);
    expect(hitSize(96)).toBe(96);
    expect(hitSize(109.4)).toBeCloseTo(109.4, 6);
    for (const pl of buildBed(getGardenKeeperParams(1), seededRng())) {
      expect(pl.hit).toBeGreaterThanOrEqual(96);
    }
  });

  it('uses 3 columns up to 12 plants, 4 up to 18, 5 beyond', () => {
    // Wider beds need more columns or the rows run off the bottom of the soil.
    expect(columnsFor(11)).toBe(3);
    expect(columnsFor(12)).toBe(3);
    expect(columnsFor(13)).toBe(4);
    expect(columnsFor(18)).toBe(4);
    expect(columnsFor(19)).toBe(5);
    expect(columnsFor(24)).toBe(5);
  });

  it('is deterministic for a given rng', () => {
    const p = getGardenKeeperParams(0.6);
    expect(buildBed(p, seededRng())).toEqual(buildBed(p, seededRng()));
  });
});

describe('depth helpers', () => {
  it('hazes the back of the bed and leaves the front clear', () => {
    expect(recedeFor(0)).toBeCloseTo(0.16, 6);
    expect(recedeFor(1)).toBeCloseTo(0, 6);
  });

  it('paints the active plant above the whole bed', () => {
    const back = { y: BED.y + 10 } as never;
    const front = { y: BED.y + 800 } as never;
    expect(zIndexFor(front, false)).toBeGreaterThan(zIndexFor(back, false));
    expect(zIndexFor(back, true)).toBeGreaterThan(zIndexFor(front, false));
  });

  it('caps the depth bonus so it can never reach the active band', () => {
    expect(zIndexFor({ y: BED.y + 100000 } as never, false)).toBe(7);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/games/attention/GardenKeeper/__tests__/geometry.test.ts`
Expected: FAIL, cannot resolve `../geometry`.

- [ ] **Step 3: Write the implementation**

Create `src/games/attention/GardenKeeper/geometry.ts`:

```ts
import type { GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';
import { DISTRACTORS, FLOWER_COLOURS, FLOWER_SPECIES, type FlowerColour } from './palette';

// ─── Canvas ───────────────────────────────────────────────────────────────────

export const CANVAS_W = 800;
export const CANVAS_H = 1280;
export const HUD_H = 108;
export const BOARD_H = CANVAS_H - HUD_H;

/** The planting rectangle, in board coordinates (origin at the board's top-left). */
export const BED = { x: 62, y: 250, w: 676, h: 860 } as const;

// ─── Types ────────────────────────────────────────────────────────────────────

export type PlantKind = 'flower' | 'weed' | 'insect' | 'poison';

export interface Plant {
  id: string;
  kind: PlantKind;
  species: string;
  /** Flowers only. Distractors carry no colourway. */
  colour?: FlowerColour;
  x: number;
  y: number;
  /** 0 at the back of the bed, 1 at the front. */
  depth: number;
  /** Drawn sprite size in px. */
  size: number;
  /** Tap area in px, never below 96 however small the sprite draws. */
  hit: number;
  /** Idle crawl variant, insects only. */
  crawl: 'a' | 'b';
  dur: number;
  delay: number;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * Math.max(0, Math.min(1, t));
}

/** An older hand on a tablet needs 96px whatever the perspective does to the sprite. */
export function hitSize(size: number): number {
  return Math.max(96, size);
}

/** Back rows sit hazier, so the bed recedes instead of tiling flat. */
export function recedeFor(depth: number): number {
  return lerp(0.16, 0, depth);
}

/** A denser bed needs more columns, or the rows run off the bottom of the soil. */
export function columnsFor(plantCount: number): number {
  return plantCount <= 12 ? 3 : plantCount <= 18 ? 4 : 5;
}

/** The plant asking for water always paints above the bed. */
export function zIndexFor(plant: Pick<Plant, 'y'>, active: boolean): number {
  return (active ? 20 : 1) + Math.min(6, Math.round((plant.y - BED.y) / 140));
}

// ─── Bed construction ─────────────────────────────────────────────────────────

/**
 * Loose rows, never a visible grid: a jittered lattice sized to the plant count, then
 * sorted by y so nearer plants paint over further ones.
 *
 * `rng` is injected rather than calling Math.random directly so the layout can be pinned
 * in tests. It must return [0, 1).
 */
export function buildBed(
  params: Pick<GardenKeeperDynamicParams, 'plantCount' | 'distractorRatio'>,
  rng: () => number = Math.random,
): Plant[] {
  const { plantCount, distractorRatio } = params;
  const rnd = (a: number, b: number) => a + rng() * (b - a);
  const pick = <T>(arr: readonly T[]): T => arr[Math.floor(rng() * arr.length)];
  const shuffled = <T>(arr: readonly T[]): T[] => {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(rng() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
  };

  const cols = columnsFor(plantCount);
  const rows = Math.ceil(plantCount / cols);
  const cw = BED.w / cols;
  const ch = BED.h / rows;

  const nDist = Math.round(plantCount * distractorRatio);
  const roster: { kind: PlantKind; species: string; colour?: FlowerColour }[] = [];
  for (let i = 0; i < plantCount - nDist; i++) {
    roster.push({ kind: 'flower', species: pick(FLOWER_SPECIES), colour: pick(FLOWER_COLOURS) });
  }
  const pool = shuffled(DISTRACTORS);
  for (let i = 0; i < nDist; i++) roster.push({ ...pool[i % pool.length] });

  return shuffled(roster)
    .map((r, i) => {
      const col = i % cols;
      const row = Math.floor(i / cols);
      const jx = rnd(-cw * 0.14, cw * 0.14);
      const jy = rnd(-ch * 0.12, ch * 0.12);
      const y = BED.y + ch * (row + 0.42) + jy;
      const depth = Math.max(0, Math.min(1, (y - BED.y) / BED.h));
      const base = r.kind === 'insect' ? 82 : 96;
      const size = base * lerp(0.86, 1.14, depth);
      return {
        ...r,
        id: 'p' + i,
        x: BED.x + cw * (col + 0.5) + jx,
        y,
        depth,
        size,
        hit: hitSize(size),
        crawl: (rng() < 0.5 ? 'a' : 'b') as 'a' | 'b',
        dur: Math.round(rnd(5200, 8400)),
        delay: Math.round(rnd(0, 2600)),
      };
    })
    .sort((a, b) => a.y - b.y);
}
```

Note this task depends on `palette.ts`, which Task 3 creates. Create the minimal `palette.ts` here so the module compiles, and let Task 3 own its contents:

```ts
// src/games/attention/GardenKeeper/palette.ts
export interface FlowerColour { petal: string; deep: string; mid: string }

export const FLOWER_COLOURS: readonly FlowerColour[] = [
  { petal: '#F07FB4', deep: '#C9518F', mid: '#FFD764' },
  { petal: '#8A7BE0', deep: '#5F52B6', mid: '#FFD764' },
  { petal: '#FFB43C', deep: '#D08718', mid: '#8C5A18' },
  { petal: '#FFF6E4', deep: '#DCCDAE', mid: '#FFB43C' },
  { petal: '#F26A55', deep: '#BE4231', mid: '#FFE08A' },
  { petal: '#57A8E4', deep: '#357CB6', mid: '#FFD764' },
];

export const FLOWER_SPECIES = ['daisy', 'sun', 'rose', 'lily', 'bell'] as const;

/**
 * Drawn cyclically after shuffling, so weedA appearing twice weights the pool toward
 * the quietest distractor rather than toward the loudest.
 */
export const DISTRACTORS: readonly { kind: 'weed' | 'insect' | 'poison'; species: string }[] = [
  { kind: 'weed', species: 'weedA' },
  { kind: 'weed', species: 'weedB' },
  { kind: 'weed', species: 'weedA' },
  { kind: 'insect', species: 'bee' },
  { kind: 'insect', species: 'ladybird' },
  { kind: 'insect', species: 'snail' },
  { kind: 'insect', species: 'caterpillar' },
  { kind: 'poison', species: 'mushroom' },
  { kind: 'poison', species: 'carnivore' },
];
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/games/attention/GardenKeeper/__tests__/geometry.test.ts`
Expected: PASS, every test in both describe blocks green.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/GardenKeeper/geometry.ts src/games/attention/GardenKeeper/palette.ts src/games/attention/GardenKeeper/__tests__/geometry.test.ts
git commit -m "feat: garden keeper bed geometry"
```

---

### Task 3: Round model

The reducer is the heart of the game. Every rule that decides what a tap or a tick means lives here, in pure functions, so it can be tested without a browser.

**Files:**
- Create: `src/games/attention/GardenKeeper/model.ts`
- Test: `src/games/attention/GardenKeeper/__tests__/model.test.ts`

**Interfaces:**
- Consumes: `GardenKeeperDynamicParams` (Task 1).
- Produces: `DRIED_HOLD_MS`, `Stage`, `CycleRecord`, `Outcome`, `RoundState`, `RoundAction`, `initialRoundState`, `roundReducer`, `pickSproutId`, `meanReactionMs`, `buildMetrics`, `gardenKeeperPerformance`, `timeLeftSeconds`.

- [ ] **Step 1: Write the failing test**

Create `src/games/attention/GardenKeeper/__tests__/model.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { getGardenKeeperParams } from '../../../../lib/dynamicDifficulty';
import {
  DRIED_HOLD_MS, buildMetrics, gardenKeeperPerformance, initialRoundState, meanReactionMs,
  pickSproutId, roundReducer, timeLeftSeconds, type RoundState,
} from '../model';

const P = getGardenKeeperParams(0.35); // window 4880ms, target 12, 1 concurrent
const T0 = 1_700_000_000_000;
const IDS = ['p0', 'p1', 'p2'];

function started(): RoundState {
  return roundReducer(initialRoundState(P), { type: 'start', now: T0, plantIds: IDS, params: P });
}

function sprouted(at = T0 + 1000, id = 'p0'): RoundState {
  return roundReducer(started(), { type: 'sprout', now: at, id, thirstWindowMs: P.thirstWindowMs });
}

describe('start', () => {
  it('opens every flower in the seed stage with no deadline', () => {
    const s = started();
    expect(s.phase).toBe('playing');
    expect(Object.keys(s.cycles)).toEqual(IDS);
    for (const id of IDS) expect(s.cycles[id]).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 0 });
    expect(s.deadline).toBe(T0 + P.roundDurationMs);
    expect(s.lives).toBe(3);
    expect(s.watered).toBe(0);
  });
});

describe('sprout', () => {
  it('raises a seed into the waterable stage on a wall-clock deadline', () => {
    const c = sprouted().cycles.p0;
    expect(c.stage).toBe('sprouted');
    expect(c.thirstyAt).toBe(T0 + 1000);
    expect(c.until).toBe(T0 + 1000 + P.thirstWindowMs);
    expect(c.seq).toBe(1);
  });

  it('increments seq on every sprout so the entry animation restarts', () => {
    let s = sprouted();
    s = roundReducer(s, { type: 'water', now: T0 + 1500, id: 'p0' });
    s = roundReducer(s, { type: 'sprout', now: T0 + 4000, id: 'p0', thirstWindowMs: P.thirstWindowMs });
    expect(s.cycles.p0.seq).toBe(2);
  });
});

describe('tick', () => {
  it('leaves a window that has not closed alone', () => {
    const s = roundReducer(sprouted(), { type: 'tick', now: T0 + 2000 });
    expect(s.cycles.p0.stage).toBe('sprouted');
    expect(s.driedUp).toBe(0);
  });

  it('dries a window that closed unwatered and counts it', () => {
    const at = T0 + 1000 + P.thirstWindowMs;
    const s = roundReducer(sprouted(), { type: 'tick', now: at });
    expect(s.cycles.p0).toEqual({ stage: 'dried', thirstyAt: null, until: at + DRIED_HOLD_MS, seq: 1 });
    expect(s.driedUp).toBe(1);
  });

  it('costs no heart when a window is missed', () => {
    // Inattention is deliberately cheaper than impulsivity for this population.
    const s = roundReducer(sprouted(), { type: 'tick', now: T0 + 1000 + P.thirstWindowMs });
    expect(s.lives).toBe(3);
  });

  it('returns a dried plant to seed after the hold, so it can cycle again', () => {
    const driedAt = T0 + 1000 + P.thirstWindowMs;
    let s = roundReducer(sprouted(), { type: 'tick', now: driedAt });
    s = roundReducer(s, { type: 'tick', now: driedAt + DRIED_HOLD_MS });
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
    expect(s.driedUp).toBe(1);
  });

  it('advances several plants in one tick without double counting', () => {
    let s = started();
    s = roundReducer(s, { type: 'sprout', now: T0, id: 'p0', thirstWindowMs: 1000 });
    s = roundReducer(s, { type: 'sprout', now: T0, id: 'p1', thirstWindowMs: 1000 });
    s = roundReducer(s, { type: 'tick', now: T0 + 1000 });
    expect(s.driedUp).toBe(2);
    s = roundReducer(s, { type: 'tick', now: T0 + 1000 });
    expect(s.driedUp).toBe(2);
  });

  it('ignores ticks once the round is done', () => {
    const done = roundReducer(sprouted(), { type: 'finish', now: T0 + 2000, outcome: 'time' });
    expect(roundReducer(done, { type: 'tick', now: T0 + 90000 })).toBe(done);
  });
});

describe('water', () => {
  it('scores a sprouted plant, records the reaction, and returns it to seed', () => {
    const s = roundReducer(sprouted(), { type: 'water', now: T0 + 2600, id: 'p0' });
    expect(s.watered).toBe(1);
    expect(s.reactions).toEqual([1600]);
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
  });

  it('refuses to score a seed or a dried plant, and costs nothing', () => {
    const seed = roundReducer(started(), { type: 'water', now: T0 + 500, id: 'p1' });
    expect(seed.watered).toBe(0);
    expect(seed.lives).toBe(3);
    expect(seed.reactions).toEqual([]);
  });
});

describe('falseTap', () => {
  it('costs a heart and counts against precision', () => {
    const s = roundReducer(started(), { type: 'falseTap' });
    expect(s.lives).toBe(2);
    expect(s.falseTaps).toBe(1);
  });

  it('never drives lives below zero', () => {
    let s = started();
    for (let i = 0; i < 5; i++) s = roundReducer(s, { type: 'falseTap' });
    expect(s.lives).toBe(0);
    expect(s.falseTaps).toBe(5);
  });
});

describe('resume from a backgrounded tab', () => {
  it('forgives a window the player never saw instead of scoring it as dried', () => {
    // The ticker is throttled while hidden, so this window opened and closed offscreen.
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 1000 + P.thirstWindowMs + 5000 });
    expect(s.cycles.p0).toEqual({ stage: 'seed', thirstyAt: null, until: null, seq: 1 });
    expect(s.driedUp).toBe(0);
    expect(s.lives).toBe(3);
  });

  it('leaves a window that is still open alone', () => {
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 2000 });
    expect(s.cycles.p0.stage).toBe('sprouted');
  });

  it('re-syncs the displayed clock from the authoritative deadline', () => {
    const s = roundReducer(sprouted(), { type: 'resume', now: T0 + 30000 });
    expect(s.timeLeft).toBeCloseTo(60, 6);
  });
});

describe('pickSproutId', () => {
  const rand = () => 0; // always the first candidate

  it('picks a dormant seed while below the concurrency ceiling', () => {
    expect(pickSproutId(started().cycles, 1, rand)).toBe('p0');
  });

  it('returns null once the ceiling is reached', () => {
    expect(pickSproutId(sprouted().cycles, 1, rand)).toBeNull();
  });

  it('allows a second plant up when the ceiling allows it', () => {
    expect(pickSproutId(sprouted().cycles, 2, rand)).toBe('p1');
  });

  it('never picks a dried plant', () => {
    const driedAt = T0 + 1000 + P.thirstWindowMs;
    const s = roundReducer(sprouted(), { type: 'tick', now: driedAt });
    expect(pickSproutId(s.cycles, 2, rand)).toBe('p1');
  });

  it('returns null when nothing is dormant', () => {
    let s = started();
    for (const id of IDS) s = roundReducer(s, { type: 'sprout', now: T0, id, thirstWindowMs: 1000 });
    expect(pickSproutId(s.cycles, 9, rand)).toBeNull();
  });
});

describe('finish', () => {
  it('zeroes the clock on a time-out so the card cannot contradict the HUD', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 90000, outcome: 'time' });
    expect(s.timeLeft).toBe(0);
    expect(s.outcome).toBe('time');
    expect(s.phase).toBe('done');
  });

  it('reports the true remaining seconds on any other ending', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 30000, outcome: 'complete' });
    expect(s.timeLeft).toBeCloseTo(60, 6);
  });

  it('clears the bed so no ring keeps closing behind the card', () => {
    const s = roundReducer(sprouted(), { type: 'finish', now: T0 + 5000, outcome: 'hearts' });
    expect(Object.values(s.cycles).every((c) => c.stage === 'seed')).toBe(true);
  });

  it('is idempotent - a second ending cannot overwrite the first', () => {
    const first = roundReducer(sprouted(), { type: 'finish', now: T0 + 5000, outcome: 'complete' });
    expect(roundReducer(first, { type: 'finish', now: T0 + 9000, outcome: 'time' })).toBe(first);
  });
});

describe('metrics and performance', () => {
  it('averages reaction times and rounds', () => {
    expect(meanReactionMs([1000, 1001])).toBe(1001);
    expect(meanReactionMs([])).toBe(0);
  });

  it('reports completion only when the target was reached', () => {
    const s = { ...started(), watered: 12, falseTaps: 1, driedUp: 2, reactions: [1000], lives: 2 };
    const done = { ...s, phase: 'done' as const, outcome: 'complete' as const };
    expect(buildMetrics(done, P)).toEqual({
      watered: 12, targetCount: 12, falseTaps: 1, driedUp: 2, meanReactionMs: 1000, livesLeft: 2,
    });
  });

  it('scores a clean full round at 1', () => {
    expect(gardenKeeperPerformance({ watered: 12, targetCount: 12, falseTaps: 0 })).toBeCloseTo(1, 6);
  });

  it('treats an untouched round as neutral precision rather than zero', () => {
    // Nothing watered and nothing mistapped is a player who never engaged, not a
    // player who was imprecise. Precision has no evidence, so it must not punish.
    expect(gardenKeeperPerformance({ watered: 0, targetCount: 12, falseTaps: 0 })).toBeCloseTo(0.5, 6);
  });

  it('punishes tap-spamming through precision', () => {
    expect(gardenKeeperPerformance({ watered: 4, targetCount: 12, falseTaps: 12 })).toBeCloseTo(0.29, 2);
  });

  it('never exceeds 1 when the player overshoots the target', () => {
    expect(gardenKeeperPerformance({ watered: 14, targetCount: 12, falseTaps: 0 })).toBe(1);
  });
});

describe('timeLeftSeconds', () => {
  it('never returns a negative clock', () => {
    expect(timeLeftSeconds(T0, T0 + 5000)).toBe(0);
    expect(timeLeftSeconds(T0 + 45000, T0)).toBeCloseTo(45, 6);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/games/attention/GardenKeeper/__tests__/model.test.ts`
Expected: FAIL, cannot resolve `../model`.

- [ ] **Step 3: Write the implementation**

Create `src/games/attention/GardenKeeper/model.ts`:

```ts
import type { GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';

/** How long a missed plant stays browned and drooping before it returns to seed. */
export const DRIED_HOLD_MS = 2600;

export type Stage = 'seed' | 'sprouted' | 'dried';
export type Outcome = 'complete' | 'time' | 'hearts';

export interface CycleRecord {
  stage: Stage;
  /** When this plant sprouted, for the reaction time. */
  thirstyAt: number | null;
  /** Wall-clock deadline for the current stage, not a countdown. */
  until: number | null;
  /** Increments on every sprout; keys the entry animation so it restarts. */
  seq: number;
}

export interface RoundState {
  phase: 'intro' | 'playing' | 'done';
  cycles: Record<string, CycleRecord>;
  watered: number;
  falseTaps: number;
  driedUp: number;
  reactions: number[];
  lives: number;
  /** Authoritative round end, epoch ms. */
  deadline: number;
  /** Display only, seconds. */
  timeLeft: number;
  outcome: Outcome | null;
}

export type RoundAction =
  | { type: 'start'; now: number; plantIds: string[]; params: GardenKeeperDynamicParams }
  | { type: 'tick'; now: number }
  | { type: 'sprout'; now: number; id: string; thirstWindowMs: number }
  | { type: 'water'; now: number; id: string }
  | { type: 'falseTap' }
  | { type: 'resume'; now: number }
  | { type: 'finish'; now: number; outcome: Outcome };

const SEED: CycleRecord = { stage: 'seed', thirstyAt: null, until: null, seq: 0 };

export function timeLeftSeconds(deadline: number, now: number): number {
  return Math.max(0, (deadline - now) / 1000);
}

export function initialRoundState(params: GardenKeeperDynamicParams): RoundState {
  return {
    phase: 'intro',
    cycles: {},
    watered: 0,
    falseTaps: 0,
    driedUp: 0,
    reactions: [],
    lives: params.lives,
    deadline: 0,
    timeLeft: params.roundDurationMs / 1000,
    outcome: null,
  };
}

export function roundReducer(s: RoundState, a: RoundAction): RoundState {
  switch (a.type) {
    case 'start': {
      const cycles: Record<string, CycleRecord> = {};
      for (const id of a.plantIds) cycles[id] = { ...SEED };
      return {
        phase: 'playing',
        cycles,
        watered: 0,
        falseTaps: 0,
        driedUp: 0,
        reactions: [],
        lives: a.params.lives,
        deadline: a.now + a.params.roundDurationMs,
        timeLeft: a.params.roundDurationMs / 1000,
        outcome: null,
      };
    }

    case 'tick': {
      if (s.phase !== 'playing') return s;
      let changed = false;
      let driedNow = 0;
      const cycles: Record<string, CycleRecord> = { ...s.cycles };
      for (const [id, c] of Object.entries(s.cycles)) {
        if (c.until === null || a.now < c.until) continue;
        if (c.stage === 'sprouted') {
          // The window closed unwatered. It browns and droops, and costs no heart.
          cycles[id] = { stage: 'dried', thirstyAt: null, until: a.now + DRIED_HOLD_MS, seq: c.seq };
          driedNow++;
          changed = true;
        } else if (c.stage === 'dried') {
          cycles[id] = { stage: 'seed', thirstyAt: null, until: null, seq: c.seq };
          changed = true;
        }
      }
      const timeLeft = timeLeftSeconds(s.deadline, a.now);
      if (!changed && Math.abs(timeLeft - s.timeLeft) < 0.08) return s;
      return { ...s, cycles, driedUp: s.driedUp + driedNow, timeLeft };
    }

    case 'sprout': {
      if (s.phase !== 'playing') return s;
      const c = s.cycles[a.id];
      if (!c || c.stage !== 'seed') return s;
      return {
        ...s,
        cycles: {
          ...s.cycles,
          [a.id]: { stage: 'sprouted', thirstyAt: a.now, until: a.now + a.thirstWindowMs, seq: c.seq + 1 },
        },
      };
    }

    case 'water': {
      if (s.phase !== 'playing') return s;
      const c = s.cycles[a.id];
      // Watering is valid only while the plant is sprouted and its ring is still closing.
      if (!c || c.stage !== 'sprouted' || c.thirstyAt === null) return s;
      return {
        ...s,
        cycles: { ...s.cycles, [a.id]: { stage: 'seed', thirstyAt: null, until: null, seq: c.seq } },
        watered: s.watered + 1,
        reactions: [...s.reactions, a.now - c.thirstyAt],
      };
    }

    case 'falseTap': {
      if (s.phase !== 'playing') return s;
      return { ...s, falseTaps: s.falseTaps + 1, lives: Math.max(0, s.lives - 1) };
    }

    case 'resume': {
      if (s.phase !== 'playing') return s;
      // The ticker was throttled while the tab was hidden, so any window that elapsed
      // offscreen was never seen. Forgive it back to seed rather than scoring it as
      // dried: the player never had the chance the score would be assuming.
      const cycles: Record<string, CycleRecord> = { ...s.cycles };
      for (const [id, c] of Object.entries(s.cycles)) {
        if (c.stage === 'sprouted' && c.until !== null && a.now >= c.until) {
          cycles[id] = { stage: 'seed', thirstyAt: null, until: null, seq: c.seq };
        }
      }
      return { ...s, cycles, timeLeft: timeLeftSeconds(s.deadline, a.now) };
    }

    case 'finish': {
      if (s.phase !== 'playing') return s;
      const cycles: Record<string, CycleRecord> = {};
      for (const [id, c] of Object.entries(s.cycles)) cycles[id] = { ...SEED, seq: c.seq };
      return {
        ...s,
        phase: 'done',
        cycles,
        outcome: a.outcome,
        // Never leave a stale clock behind the card: the ticker may have been throttled.
        timeLeft: a.outcome === 'time' ? 0 : timeLeftSeconds(s.deadline, a.now),
      };
    }

    default:
      return s;
  }
}

/**
 * Choose the next plant to bring up, or null if the bed is already at its concurrency
 * ceiling or has nothing dormant. `rand` is injected so spawn order can be pinned.
 */
export function pickSproutId(
  cycles: Record<string, CycleRecord>,
  maxConcurrentThirsty: number,
  rand: () => number = Math.random,
): string | null {
  const up = Object.values(cycles).filter((c) => c.stage === 'sprouted').length;
  if (up >= maxConcurrentThirsty) return null;
  const free = Object.keys(cycles).filter((id) => cycles[id].stage === 'seed');
  if (!free.length) return null;
  return free[Math.floor(rand() * free.length)];
}

export function meanReactionMs(reactions: number[]): number {
  if (!reactions.length) return 0;
  return Math.round(reactions.reduce((a, b) => a + b, 0) / reactions.length);
}

export interface GardenKeeperMetrics {
  watered: number;
  targetCount: number;
  falseTaps: number;
  driedUp: number;
  meanReactionMs: number;
  livesLeft: number;
}

export function buildMetrics(s: RoundState, params: GardenKeeperDynamicParams): GardenKeeperMetrics {
  return {
    watered: s.watered,
    targetCount: params.targetCount,
    falseTaps: s.falseTaps,
    driedUp: s.driedUp,
    meanReactionMs: meanReactionMs(s.reactions),
    livesLeft: s.lives,
  };
}

/**
 * Completion weighted against precision. Precision is 1 when there is no evidence
 * either way, so a player who never engaged is not additionally punished for
 * imprecision they never demonstrated.
 */
export function gardenKeeperPerformance(m: Pick<GardenKeeperMetrics, 'watered' | 'targetCount' | 'falseTaps'>): number {
  const hitRatio = m.watered / Math.max(1, m.targetCount);
  const attempts = m.watered + m.falseTaps;
  const precision = attempts === 0 ? 1 : m.watered / attempts;
  return Math.max(0, Math.min(1, (hitRatio + precision) / 2));
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/games/attention/GardenKeeper/__tests__/model.test.ts`
Expected: PASS, every describe block green. If `resume` or `finish` fails, fix the reducer, never the test - those two encode the rules a resident is scored by.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/GardenKeeper/model.ts src/games/attention/GardenKeeper/__tests__/model.test.ts
git commit -m "feat: garden keeper round model"
```

---

### Task 4: Plant artwork and keyframes

Plant art is CSS primitives returned as style strings from a pure function. Keeping it a pure `.ts` module rather than JSX means the whole drawing layer is testable in the node environment, and replacing it with raster art later touches exactly this file.

**Files:**
- Create: `src/games/attention/GardenKeeper/sprites.ts`
- Create: `src/games/attention/GardenKeeper/styles.tsx`
- Modify: `src/games/attention/GardenKeeper/palette.ts` (created in Task 2, add the dried browns)
- Test: `src/games/attention/GardenKeeper/__tests__/sprites.test.ts`

**Interfaces:**
- Consumes: `FlowerColour`, `FLOWER_COLOURS`, `FLOWER_SPECIES`, `DISTRACTORS` from `palette.ts`; `Plant`, `PlantKind` from `geometry.ts`.
- Produces:
  - `interface ArtLayer { key: string; style: string }`
  - `art(subject: ArtSubject, s: number, stage?: Stage | null): ArtLayer[]`
  - `type ArtSubject = { kind: PlantKind; species: string; colour?: FlowerColour }`
  - `KEYFRAMES: string`, `GardenKeeperStyles()`, `EASE`, `COLOURS` from `styles.tsx`

- [ ] **Step 1: Write the failing test**

Create `src/games/attention/GardenKeeper/__tests__/sprites.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { DISTRACTORS, FLOWER_COLOURS, FLOWER_SPECIES } from '../palette';
import { art } from '../sprites';

const colour = FLOWER_COLOURS[0];

describe('art', () => {
  it('draws every flower species in every stage', () => {
    for (const species of FLOWER_SPECIES) {
      for (const stage of ['seed', 'sprouted', 'dried'] as const) {
        const layers = art({ kind: 'flower', species, colour }, 96, stage);
        expect(layers.length).toBeGreaterThan(0);
        expect(new Set(layers.map((l) => l.key)).size).toBe(layers.length);
        for (const l of layers) expect(l.style).toContain('position: absolute');
      }
    }
  });

  it('draws every distractor in the pool', () => {
    for (const d of DISTRACTORS) {
      expect(art(d, 96).length).toBeGreaterThan(0);
    }
  });

  it('expresses every layer in hundredths of the stage size', () => {
    // A species must render identically at 58px in the legend and 96px on the bed,
    // or the intro card is teaching a different plant from the one on the board.
    const small = art({ kind: 'flower', species: 'daisy', colour }, 50, 'sprouted');
    const large = art({ kind: 'flower', species: 'daisy', colour }, 100, 'sprouted');
    expect(small).toHaveLength(large.length);
    const px = (s: string) => (s.match(/(-?[\d.]+)px/g) ?? []).map((v) => parseFloat(v));
    for (let i = 0; i < small.length; i++) {
      const a = px(small[i].style);
      const b = px(large[i].style);
      expect(a).toHaveLength(b.length);
      a.forEach((v, j) => {
        // Fixed radii (3px, 4px, 5px, 8px, 12px) are literal in the prototype and do
        // not scale; everything derived from the stage size doubles.
        if (Math.abs(v - b[j]) > 0.0001) expect(b[j]).toBeCloseTo(v * 2, 4);
      });
    }
  });

  it('gives the seed stage no bloom, so it reads as not yet actionable', () => {
    const seed = art({ kind: 'flower', species: 'rose', colour }, 96, 'seed');
    const sprouted = art({ kind: 'flower', species: 'rose', colour }, 96, 'sprouted');
    expect(seed.length).toBeLessThan(sprouted.length);
    expect(seed.some((l) => l.style.includes(colour.petal))).toBe(false);
  });

  it('draws the dried stage in browns only, never in the flower colourway', () => {
    const dried = art({ kind: 'flower', species: 'daisy', colour }, 96, 'dried');
    for (const l of dried) {
      expect(l.style).not.toContain(colour.petal);
      expect(l.style).not.toContain(colour.deep);
    }
  });

  it('returns no layers for an unknown subject rather than throwing', () => {
    expect(art({ kind: 'weed', species: 'nope' }, 96)).not.toHaveLength(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/games/attention/GardenKeeper/__tests__/sprites.test.ts`
Expected: FAIL, cannot resolve `../sprites`.

- [ ] **Step 3: Write the implementation**

Transcribe the `art()` function from `design_handoff_garden_keeper/garden-keeper-src.dc.html`, **lines 156 to 254**, into `src/games/attention/GardenKeeper/sprites.ts`. That block is the authority for every colour, radius, offset and rotation. Do not redesign a single layer, and do not round any value.

The conversion is mechanical:

- The prototype's `L(css)` helper becomes a local `push(css: string)` that appends `'position: absolute; ' + css`.
- `p.colour` is typed `FlowerColour`.
- The final `return out.map((l, i) => ({ key: 'l' + i, style: l.style }))` becomes the single return at the end of the function, so the early returns for `seed` and `dried` map the same way.
- `u(n)` stays `(n * s) / 100`.

The wrapper to write around it:

```ts
import type { Stage } from './model';
import type { FlowerColour } from './palette';
import type { PlantKind } from './geometry';

export interface ArtLayer {
  key: string;
  style: string;
}

export interface ArtSubject {
  kind: PlantKind;
  species: string;
  colour?: FlowerColour;
}

/**
 * Plant artwork, drawn from CSS primitives. `s` is the stage size in px and every layer
 * is expressed in hundredths of it, so a species renders identically on the bed at 96px
 * and in the intro legend at 58px. Preserve that property in whatever art pipeline
 * replaces this: the legend is teaching the player to recognise the bed.
 *
 * `stage` applies to flowers only; distractors have one appearance and no cycle.
 *
 * Transcribed from design_handoff_garden_keeper/garden-keeper-src.dc.html lines 156-254.
 */
export function art(p: ArtSubject, s: number, stage?: Stage | null): ArtLayer[] {
  const u = (n: number) => (n * s) / 100;
  const cx = 'left: 50%; transform: translateX(-50%);';
  const out: string[] = [];
  const push = (css: string) => out.push('position: absolute; ' + css);
  // ... transcribed body ...
  return out.map((style, i) => ({ key: 'l' + i, style }));
}
```

As a worked example, the prototype's seed-stage mound

```js
out.push(L(cx + `bottom: 0; width: ${u(60)}px; height: ${u(18)}px; border-radius: 50% 50% 26% 26%; background: linear-gradient(180deg, #7E5632 0%, #533618 100%);`));
```

becomes

```ts
push(cx + `bottom: 0; width: ${u(60)}px; height: ${u(18)}px; border-radius: 50% 50% 26% 26%; background: linear-gradient(180deg, #7E5632 0%, #533618 100%);`);
```

Then add the dried browns to `palette.ts` for reference by later tasks:

```ts
/** The dried stage is drawn in these only - never in the flower's own colourway. */
export const DRIED = { stem: '#9A7A45', leaf: '#B08C4E', headLight: '#C2A05C', headDeep: '#8C6D2F' } as const;
```

Create `src/games/attention/GardenKeeper/styles.tsx` with the ten keyframes from the spec plus the three insect idles. Note the trap Train Yard documents: `gk-cardin` bakes its centring translate into every keyframe and runs with fill-mode `both`, so the animation owns `transform` for the card's whole life. Centring the card any other way throws it to the top-left corner.

```tsx
/**
 * Keyframes, transcribed from the handoff prototype, rendered as an inline <style>
 * block - the pattern every other game in this app uses for its animations.
 *
 * gk-cardin bakes the centring translate into both keyframes and runs `both`, so the
 * animation owns `transform` for the card's life. Do not centre the card any other way.
 *
 * gk-splash reads --dx / --dy from the element, and those custom properties carry their
 * units on the value, not inside a calc().
 */
export const KEYFRAMES = `
@keyframes gk-fade { from { opacity: 0; } to { opacity: 1; } }

@keyframes gk-sprout {
  0%   { transform: scaleY(.4) scaleX(.78); opacity: .35; }
  58%  { transform: scaleY(1.1) scaleX(1.04); opacity: 1; }
  100% { transform: scale(1, 1); opacity: 1; }
}

@keyframes gk-bloom {
  0%   { transform: scale(1); }
  42%  { transform: scale(1.18); }
  100% { transform: scale(1); }
}

@keyframes gk-droop {
  0%   { transform: rotate(0deg) scaleY(1); }
  100% { transform: rotate(-6deg) scaleY(.92); }
}

@keyframes gk-shake {
  0%   { transform: translateX(0); }
  22%  { transform: translateX(-6px); }
  44%  { transform: translateX(5px); }
  66%  { transform: translateX(-3px); }
  88%  { transform: translateX(2px); }
  100% { transform: translateX(0); }
}

@keyframes gk-halo {
  0%   { opacity: .5; transform: translate(-50%,-50%) scale(1); }
  50%  { opacity: .82; transform: translate(-50%,-50%) scale(1.06); }
  100% { opacity: .5; transform: translate(-50%,-50%) scale(1); }
}

@keyframes gk-ringin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.72); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes gk-splash {
  0%   { opacity: 0; transform: translate(0,0) scale(.5); }
  18%  { opacity: 1; }
  100% { opacity: 0; transform: translate(var(--dx), var(--dy)) scale(1); }
}

@keyframes gk-toast {
  0%   { opacity: 0; transform: translate(-50%, 6px); }
  22%  { opacity: 1; }
  74%  { opacity: 1; transform: translate(-50%, -26px); }
  100% { opacity: 0; transform: translate(-50%, -34px); }
}

@keyframes gk-toast-ro {
  0%   { opacity: 0; transform: translate(-50%, 0); }
  22%  { opacity: 1; transform: translate(-50%, 0); }
  74%  { opacity: 1; transform: translate(-50%, 0); }
  100% { opacity: 0; transform: translate(-50%, 0); }
}

@keyframes gk-cardin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.94); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes gk-flutter {
  0%   { transform: translate(0,0) rotate(-3deg); }
  50%  { transform: translate(9px,-7px) rotate(4deg); }
  100% { transform: translate(0,0) rotate(-3deg); }
}

@keyframes gk-crawl-a {
  0%   { transform: translateX(0) rotate(0deg); }
  50%  { transform: translateX(13px) rotate(3deg); }
  100% { transform: translateX(0) rotate(0deg); }
}

@keyframes gk-crawl-b {
  0%   { transform: translateX(0) rotate(0deg); }
  50%  { transform: translateX(-11px) rotate(-3deg); }
  100% { transform: translateX(0) rotate(0deg); }
}
`;

export const EASE = 'cubic-bezier(.22,.61,.36,1)';
export const EASE_SPLASH = 'cubic-bezier(.33,1,.68,1)';

export const COLOURS = {
  hudTop: '#2C5580',
  hudBottom: '#1E3E63',
  hudBorder: '#14304F',
  hudLabel: '#9FC0DE',
  clockLow: '#FFB4A8',
  heartFilled: '#F2564C',
  heartSpent: 'rgba(255,255,255,.18)',
  ringSafe: '#8FD65C',
  ringWarn: '#FFC24D',
  ringUrgent: '#FF7A6B',
  progressFrom: '#8FD65C',
  progressTo: '#62B33C',
  droplet: '#9FD8F5',
  cardSurface: '#FFFCF4',
  cardHeading: '#4A3A22',
  cardBody: '#6B5A3E',
  success: '#3F7E2B',
  warning: '#B33B2E',
  neutralTitle: '#5C4A2E',
  legendBrown: '#8C6D2F',
  legendBlue: '#2F6BA8',
  toastCalm: '#F5D778',
  toastAlarm: '#FFD9D2',
  buttonGreen: '#6FA83F',
  buttonShadow: '#4E7C29',
} as const;

export function GardenKeeperStyles() {
  return <style>{KEYFRAMES}</style>;
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/games/attention/GardenKeeper/`
Expected: PASS, all three suites.

Then confirm the whole project still type-checks: `npm run build`
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/games/attention/GardenKeeper/sprites.ts src/games/attention/GardenKeeper/styles.tsx src/games/attention/GardenKeeper/palette.ts src/games/attention/GardenKeeper/__tests__/sprites.test.ts
git commit -m "feat: garden keeper plant artwork and keyframes"
```

---

### Task 5: Localisation

Do this before the component so no English literal ever reaches JSX. Shopping List Recall shipped with hardcoded labels that could not be translated even in principle; this is the task that prevents a repeat.

**Files:**
- Modify: `public/locales/en/common.json`
- Modify: `public/locales/hi/common.json`
- Modify: `public/locales/kn/common.json`

**Interfaces:**
- Produces: the `gk.*` key set and `game.gardenKeeper`, consumed by Tasks 6, 7 and 8.

- [ ] **Step 1: Add the English keys**

Add to `public/locales/en/common.json`, beside the existing `ty.*` block:

```json
"game.gardenKeeper": "Garden Keeper",
"gk.instruction": "Water each plant once it has sprouted",
"gk.legend.seed": "A seed. Leave it be",
"gk.legend.sprouted": "Sprouted, ring closing. Water it now",
"gk.legend.dried": "Left too long, it dries up",
"gk.legend.avoid": "Never water weeds, bugs or toadstools",
"gk.progress": "WATERED {{watered}} / {{target}}",
"gk.toast.notReady": "Not ready yet",
"gk.toast.tooLate": "Too late for this one",
"gk.toast.notThis": "Not this one",
"gk.roundComplete": "Garden watered",
"gk.outOfHearts": "Let's try again",
"gk.timeUp": "Time's up",
"gk.summary": "{{watered}} of {{target}} plants watered. {{dried}} dried up.",
"gk.start": "Start",
"gk.next": "Next round"
```

- [ ] **Step 2: Add the Hindi keys**

Add to `public/locales/hi/common.json`:

```json
"game.gardenKeeper": "बगीचे की देखभाल",
"gk.instruction": "जो पौधा अंकुरित हो जाए, उसी को पानी दें",
"gk.legend.seed": "यह बीज है। इसे रहने दें",
"gk.legend.sprouted": "अंकुरित हो गया, घेरा बंद हो रहा है। अभी पानी दें",
"gk.legend.dried": "देर हो गई तो यह सूख जाता है",
"gk.legend.avoid": "खरपतवार, कीड़े या कुकुरमुत्ते को कभी पानी न दें",
"gk.progress": "पानी दिया {{watered}} / {{target}}",
"gk.toast.notReady": "अभी तैयार नहीं",
"gk.toast.tooLate": "इसके लिए देर हो गई",
"gk.toast.notThis": "यह नहीं",
"gk.roundComplete": "बगीचा सिंच गया",
"gk.outOfHearts": "फिर से कोशिश करें",
"gk.timeUp": "समय समाप्त",
"gk.summary": "{{target}} में से {{watered}} पौधों को पानी मिला। {{dried}} सूख गए।",
"gk.start": "शुरू करें",
"gk.next": "अगला राउंड"
```

- [ ] **Step 3: Add the Kannada keys**

Add to `public/locales/kn/common.json`:

```json
"game.gardenKeeper": "ತೋಟದ ಆರೈಕೆ",
"gk.instruction": "ಮೊಳಕೆಯೊಡೆದ ಗಿಡಕ್ಕೆ ಮಾತ್ರ ನೀರು ಹಾಕಿ",
"gk.legend.seed": "ಇದು ಬೀಜ. ಹಾಗೆಯೇ ಬಿಡಿ",
"gk.legend.sprouted": "ಮೊಳಕೆಯೊಡೆದಿದೆ, ಉಂಗುರ ಮುಚ್ಚುತ್ತಿದೆ. ಈಗಲೇ ನೀರು ಹಾಕಿ",
"gk.legend.dried": "ತಡವಾದರೆ ಒಣಗಿ ಹೋಗುತ್ತದೆ",
"gk.legend.avoid": "ಕಳೆ, ಹುಳು ಅಥವಾ ಅಣಬೆಗೆ ಎಂದಿಗೂ ನೀರು ಹಾಕಬೇಡಿ",
"gk.progress": "ನೀರು ಹಾಕಿದ್ದು {{watered}} / {{target}}",
"gk.toast.notReady": "ಇನ್ನೂ ಸಿದ್ಧವಿಲ್ಲ",
"gk.toast.tooLate": "ಇದಕ್ಕೆ ತಡವಾಯಿತು",
"gk.toast.notThis": "ಇದು ಅಲ್ಲ",
"gk.roundComplete": "ತೋಟಕ್ಕೆ ನೀರಾಯಿತು",
"gk.outOfHearts": "ಇನ್ನೊಮ್ಮೆ ಪ್ರಯತ್ನಿಸೋಣ",
"gk.timeUp": "ಸಮಯ ಮುಗಿಯಿತು",
"gk.summary": "{{target}} ಗಿಡಗಳಲ್ಲಿ {{watered}} ಗಿಡಗಳಿಗೆ ನೀರಾಯಿತು. {{dried}} ಒಣಗಿದವು.",
"gk.start": "ಪ್ರಾರಂಭಿಸಿ",
"gk.next": "ಮುಂದಿನ ಸುತ್ತು"
```

- [ ] **Step 4: Verify all three files parse and carry the same keys**

Run:

```bash
node -e "const fs=require('fs');const ls=['en','hi','kn'].map(l=>Object.keys(JSON.parse(fs.readFileSync('public/locales/'+l+'/common.json','utf8'))).filter(k=>k.startsWith('gk.')||k==='game.gardenKeeper'));console.log(ls.map(k=>k.length));console.log(ls[0].filter(k=>!ls[1].includes(k)||!ls[2].includes(k)))"
```

Expected: `[ 16, 16, 16 ]` then `[]`. A non-empty second line means a key is missing from Hindi or Kannada.

- [ ] **Step 5: Commit**

```bash
git add public/locales/en/common.json public/locales/hi/common.json public/locales/kn/common.json
git commit -m "feat: garden keeper copy in en, hi and kn"
```

Note: these three files already carry uncommitted changes from other in-flight work. Check `git diff --cached` before committing and unstage anything that is not a `gk.*` or `game.gardenKeeper` line:

```bash
git diff --cached public/locales/en/common.json
```

---

### Task 6: The board

This task builds everything the player sees before the clock starts: the scaled canvas, the HUD, the backdrop, the bed and the intro card. It ends with a screen you can look at, with the round loop still inert.

**Files:**
- Create: `src/games/attention/GardenKeeper/index.tsx`
- Create: `src/games/attention/GardenKeeper.ts`

**Interfaces:**
- Consumes: everything from Tasks 1 to 5.
- Produces: `GardenKeeperProps { levelConfig, onLevelComplete, reducedMotion? }`, default export `GardenKeeper`.

- [ ] **Step 1: Write the barrel**

Create `src/games/attention/GardenKeeper.ts`, matching `FocusFilter.ts`:

```ts
export { default } from './GardenKeeper/index';
```

- [ ] **Step 2: Write the component skeleton and the canvas**

Create `src/games/attention/GardenKeeper/index.tsx`. Start with the scaffolding, the scaled canvas and the backdrop:

```tsx
import { useMemo, useReducer, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useReducedMotion } from '../../../lib/useReducedMotion';
import { getGardenKeeperParams, type GardenKeeperDynamicParams } from '../../../lib/dynamicDifficulty';
import { BED, BOARD_H, CANVAS_H, CANVAS_W, HUD_H, buildBed, recedeFor, zIndexFor, type Plant } from './geometry';
import { initialRoundState, roundReducer } from './model';
import { art } from './sprites';
import { COLOURS, EASE, GardenKeeperStyles } from './styles';
import { FLOWER_COLOURS } from './palette';

interface GardenKeeperProps {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  /** Test override for the OS media query. */
  reducedMotion?: boolean;
}

export default function GardenKeeper({ levelConfig, onLevelComplete, reducedMotion }: GardenKeeperProps) {
  const { t } = useTranslation();
  const prefersReduced = useReducedMotion();
  const reduced = reducedMotion ?? prefersReduced;

  const params = useMemo<GardenKeeperDynamicParams>(
    () => ({ ...getGardenKeeperParams(0.35), ...(levelConfig.params as Partial<GardenKeeperDynamicParams>) }),
    [levelConfig.params],
  );

  // One round per mount: the bed is built once and never changes during play.
  const [plants] = useState<Plant[]>(() => buildBed(params));
  const [state, dispatch] = useReducer(roundReducer, params, initialRoundState);

  return (
    // The canvas is transformed, so it no longer contributes its scaled height to
    // layout. The spacer reserves it, or the game overlaps whatever GameShell renders
    // below it.
    <div style={{ containerType: 'inline-size', width: '100%' }}>
      <GardenKeeperStyles />
      <div style={{ position: 'relative', width: '100%', height: `calc(100cqw * ${CANVAS_H} / ${CANVAS_W})` }}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            width: CANVAS_W,
            height: CANVAS_H,
            transform: `scale(calc(100cqw / ${CANVAS_W}))`,
            transformOrigin: 'top left',
          }}
        >
          <Hud state={state} params={params} t={t} />
          <div style={{ position: 'relative', width: CANVAS_W, height: BOARD_H, overflow: 'hidden' }}>
            <Backdrop />
            {/* bed and cards go here */}
          </div>
        </div>
      </div>
    </div>
  );
}
```

Import only what you use. `BED`, `HUD_H` and `recedeFor` are consumed in later steps of this task, not this one; adding them early trips the no-unused-vars rule and the lint gate is a count comparison, so a new error is a task failure.

- [ ] **Step 3: Write the backdrop**

Three bands and nothing more. Transcribe from the spec's Backdrop table. Board background:

```tsx
function Backdrop() {
  const layer = (style: React.CSSProperties) => <div style={{ position: 'absolute', ...style }} />;
  return (
    <>
      <div style={{
        position: 'absolute', inset: 0,
        background: 'linear-gradient(180deg, #9AD0EC 0%, #C4E3F4 132px, #86BE55 133px, #6BA641 240px)',
      }} />
      {layer({ left: -40, top: 96, width: 380, height: 96, borderRadius: '50%', background: '#6FA83F' })}
      {layer({ left: 250, top: 74, width: 340, height: 108, borderRadius: '50%', background: '#7CB447' })}
      {layer({ left: 520, top: 92, width: 360, height: 98, borderRadius: '50%', background: '#679C3A' })}
      {layer({ left: 0, top: 168, width: 800, height: 40, background: 'linear-gradient(180deg, #5E9C38, #4E8C3A)' })}
      {layer({ left: 0, top: 200, width: 800, height: 972, background: 'linear-gradient(180deg, #4E8C3A, #427E2F)' })}
      {layer({
        left: 18, top: 224, width: 764, height: 924, borderRadius: '210px / 130px',
        background: 'radial-gradient(ellipse at 50% 20%, #7E5632 0%, #67451F 55%, #533618 100%)',
      })}
      {layer({
        left: 18, top: 224, width: 764, height: 924, borderRadius: '210px / 130px', pointerEvents: 'none',
        background: 'radial-gradient(ellipse at 50% 42%, transparent 46%, rgba(28,16,4,.34) 100%)',
      })}
    </>
  );
}
```

- [ ] **Step 4: Write the HUD**

800 × 108, flex row, `gap: 22px`, `padding: 0 26px`, `align-items: center`, gradient `#2C5580 → #1E3E63`, `border-bottom: 4px solid #14304F`.

- Clock on the left: `m:ss` from `state.timeLeft`, 42px/800, `fontVariantNumeric: 'tabular-nums'`, `letterSpacing: '.01em'`, colour `#FFFFFF` switching to `COLOURS.clockLow` when playing and `timeLeft <= 15`.
- Progress in the centre with `flex: 1`, column, `gap: 7px`. Label `t('gk.progress', 'WATERED {{watered}} / {{target}}', { watered: state.watered, target: params.targetCount })` at 18px/700, `COLOURS.hudLabel`, `letterSpacing: '.14em'`. Track height 16, radius 8, `rgba(10,28,48,.55)`, `overflow: hidden`. Fill width `min(1, watered / targetCount) * 100%`, gradient `#8FD65C → #62B33C`, `transition: width 320ms ${EASE}`.
- Hearts on the right, three of them, flex row `gap: 9px`, each 38 × 35 with the clip-path from the spec, `backgroundColor` `COLOURS.heartFilled` when `i < state.lives` else `COLOURS.heartSpent`, `transition: background-color 260ms ease`.

Do not apply `textTransform` to the progress label. English is authored uppercase; Hindi and Kannada have no case and must render as authored.

- [ ] **Step 5: Render the bed**

Map `plants` to hit squares. For each plant, with `c = state.cycles[plant.id]`, `stage = c?.stage ?? null`, `active = c?.stage === 'sprouted'`:

```tsx
<div
  key={plant.id}
  onPointerUp={() => onTap(plant)}
  style={{
    position: 'absolute',
    left: plant.x, top: plant.y, width: plant.hit, height: plant.hit,
    margin: `${-plant.hit * 0.82}px 0 0 ${-plant.hit / 2}px`,
    zIndex: zIndexFor(plant, active),
    cursor: state.phase === 'playing' ? 'pointer' : 'default',
  }}
>
```

Inside it, in this order: the halo, the ring, the ground shadow, then the art wrapper. The exact style strings are in the prototype at `garden-keeper-src.dc.html` lines 530 to 537 and in the spec's signifier section. Two values that are easy to get wrong:

- The halo and ring both anchor at `left: 50%; top: 62%` with `transform: translate(-50%,-50%)`, and `ringSize = plant.hit * 1.24`. The halo is `ringSize * 1.5` square.
- The art wrapper is `left: 0; bottom: 0; width: 100%; height: ${plant.hit}px; transformOrigin: '50% 100%'`, so growth and droop pivot at the soil line.

Saturation is the figure/ground device: the active plant gets no filter, other flowers get `saturate(0.9) brightness(1 - recede * 0.4)`, distractors get `saturate(0.62) brightness(1 - recede)` where `recede = recedeFor(plant.depth)`.

Insect idle motion runs only when `!reduced` and the plant has no cycle:
`gk-${species === 'bee' ? 'flutter' : 'crawl-' + plant.crawl} ${plant.dur}ms ease-in-out ${plant.delay}ms infinite`.

Render the art layers as bare divs:

```tsx
{art(plant, plant.size, stage).map((l) => <div key={l.key} style={styleStringToObject(l.style)} />)}
```

Rather than parsing style strings back into objects, set them directly with `dangerouslySetInnerHTML`-free `style` attribute strings by rendering `<div key={l.key} style={...} />` through a tiny helper that React accepts. The simplest correct approach: have the layer div use the `style` prop with a parsed object via a `cssTextToStyle` helper local to `index.tsx`:

```tsx
/** The art layers are authored as CSS text; React needs an object. */
function cssTextToStyle(css: string): React.CSSProperties {
  const out: Record<string, string> = {};
  for (const decl of css.split(';')) {
    const i = decl.indexOf(':');
    if (i < 0) continue;
    const prop = decl.slice(0, i).trim();
    const value = decl.slice(i + 1).trim();
    if (!prop || !value) continue;
    out[prop.startsWith('--') ? prop : prop.replace(/-([a-z])/g, (_, c) => c.toUpperCase())] = value;
  }
  return out as React.CSSProperties;
}
```

- [ ] **Step 6: Render the intro card**

Scrim `rgba(14,36,60,.62)` at `zIndex: 9` covering the board, card at `zIndex: 10` centred with `left: 50%; top: 50%; transform: translate(-50%,-50%)`, width 620, `padding: '44px 44px 40px'`, `boxSizing: 'border-box'`, `borderRadius: 28`, `background: COLOURS.cardSurface`, `boxShadow: '0 18px 0 rgba(20,48,79,.18)'`, column flex, `alignItems: 'center'`, `gap: 26`, `textAlign: 'center'`, animation `gk-cardin 260ms ${EASE}` or `gk-fade 220ms ease` when reduced.

Title: `t('gk.instruction', 'Water each plant once it has sprouted')` at 40px/800, `COLOURS.cardHeading`, line-height 1.2, `textWrap: 'pretty'`.

Four legend rows, each `display: flex; align-items: center; gap: 20px; padding: 12px 8px`, figure well 72 × 66 `position: relative`, text 26px/700 line-height 1.28 `textAlign: 'left'`:

| Figure subject | Key and fallback | Colour |
|---|---|---|
| `art({ kind: 'flower', species: 'daisy', colour: FLOWER_COLOURS[0] }, 58, 'seed')` | `gk.legend.seed` / "A seed. Leave it be" | `COLOURS.legendBrown` |
| same at `'sprouted'` | `gk.legend.sprouted` / "Sprouted, ring closing. Water it now" | `COLOURS.legendBlue` |
| same at `'dried'` | `gk.legend.dried` / "Left too long, it dries up" | `COLOURS.legendBrown` |
| `art({ kind: 'poison', species: 'mushroom' }, 58)` | `gk.legend.avoid` / "Never water weeds, bugs or toadstools" | `COLOURS.warning` |

The sprouted row's figure well carries `boxShadow: '0 0 0 4px #8FD65C, 0 0 0 12px rgba(143,214,92,.22)'` and `borderRadius: '50%'`.

Button: `minHeight: 84`, `padding: '0 56px'`, `borderRadius: 20`, `background: COLOURS.buttonGreen`, `borderBottom: '7px solid #4E7C29'`, `border: 'none'` otherwise, 31px/800 `#FFFFFF`, `letterSpacing: '.03em'`, label `t('gk.start', 'Start')`. Wire it to a `handleStart` that for now only dispatches `{ type: 'start', ... }`; Task 7 adds the timers.

- [ ] **Step 7: Register the game so it can be opened**

The board cannot be looked at until the router knows about it, so do the two router edits now. Task 8 does the remaining wiring.

In `src/screens/GameRouter.tsx`, add the import beside the other attention games:

```ts
import GardenKeeper from '../games/attention/GardenKeeper';
```

the registry line beside `'focus-filter'`:

```ts
  'garden-keeper':          { component: GardenKeeper,        category: 'attention' },
```

and the params branch in `generateContentForGame`, beside the `train-yard` branch, adding `getGardenKeeperParams` to the existing `../lib/dynamicDifficulty` import:

```ts
  if (gameId === 'garden-keeper') {
    const params = getGardenKeeperParams(score);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: undefined,
    };
  }
```

- [ ] **Step 8: Verify it renders**

Run: `npm run dev` and open the game by navigating to `/app/game/garden-keeper` once you are past profile selection. It has no home-screen tile until Task 8.

Confirm by eye:
- The bed fills the board with loose rows, not a visible grid.
- Back-row plants draw smaller and hazier than front-row ones.
- The intro card is centred, not thrown to the top-left. If it is in the corner, something else is setting `transform` on it.
- The four legend figures are recognisable at 58px, and the sprouted one carries a green ring.

Run: `npm run build`
Expected: no errors.

- [ ] **Step 9: Commit**

```bash
git add src/games/attention/GardenKeeper/index.tsx src/games/attention/GardenKeeper.ts src/screens/GameRouter.tsx
git commit -m "feat: garden keeper board, hud and intro card"
```

---

### Task 7: The round loop

**Files:**
- Modify: `src/games/attention/GardenKeeper/index.tsx`

**Interfaces:**
- Consumes: `roundReducer`, `pickSproutId`, `buildMetrics`, `timeLeftSeconds` and the `Outcome` type (Task 3); `EASE_SPLASH` and `COLOURS` (Task 4).
- Produces: a complete, playable game that calls `onLevelComplete` exactly once.

- [ ] **Step 1: Add the timer refs and the teardown**

Four timers, all cleared together. Hold them in refs, and clear them in one function called from `handleStart` and from the unmount cleanup:

```tsx
const tickRef = useRef<number | null>(null);
const spawnRef = useRef<number | null>(null);
const endRef = useRef<number | null>(null);
const fxRef = useRef<number[]>([]);

const stopAll = useCallback(() => {
  if (tickRef.current !== null) window.clearInterval(tickRef.current);
  if (spawnRef.current !== null) window.clearTimeout(spawnRef.current);
  if (endRef.current !== null) window.clearTimeout(endRef.current);
  tickRef.current = spawnRef.current = endRef.current = null;
  fxRef.current.forEach(window.clearTimeout);
  fxRef.current = [];
}, []);

useEffect(() => stopAll, [stopAll]);
```

- [ ] **Step 2: Add the ticker, the spawner and the end timer**

`handleStart` dispatches `start`, then arms all three:

```tsx
const handleStart = useCallback(() => {
  stopAll();
  const now = Date.now();
  dispatch({ type: 'start', now, plantIds: flowerIds, params });
  // Round end runs on its own deadline timer, never on the display ticker.
  endRef.current = window.setTimeout(() => finish('time'), params.roundDurationMs);
  tickRef.current = window.setInterval(() => dispatch({ type: 'tick', now: Date.now() }), 100);
  scheduleSpawn(900);
}, [flowerIds, params, stopAll]);
```

where `flowerIds = useMemo(() => plants.filter((p) => p.kind === 'flower').map((p) => p.id), [plants])`.

The spawner reschedules itself and reads the current cycles from a ref, since the timer callback closes over a stale state otherwise:

```tsx
const stateRef = useRef(state);
useEffect(() => { stateRef.current = state; }, [state]);

const scheduleSpawn = useCallback((ms: number) => {
  if (spawnRef.current !== null) window.clearTimeout(spawnRef.current);
  spawnRef.current = window.setTimeout(() => {
    const s = stateRef.current;
    if (s.phase === 'playing') {
      const id = pickSproutId(s.cycles, params.maxConcurrentThirsty);
      if (id) dispatch({ type: 'sprout', now: Date.now(), id, thirstWindowMs: params.thirstWindowMs });
    }
    scheduleSpawn(params.spawnIntervalMs);
  }, ms);
}, [params.maxConcurrentThirsty, params.spawnIntervalMs, params.thirstWindowMs]);
```

The 100ms ticker only reads the clock. It never accumulates elapsed time, and it never ends the round.

- [ ] **Step 3: Add the visibility handler**

```tsx
useEffect(() => {
  const onVisible = () => {
    if (document.hidden) return;
    // The ticker was throttled while hidden: re-sync the clock and forgive any window
    // that opened and closed offscreen. The player never saw it, so it must not be
    // scored against them.
    dispatch({ type: 'resume', now: Date.now() });
  };
  document.addEventListener('visibilitychange', onVisible);
  return () => document.removeEventListener('visibilitychange', onVisible);
}, []);
```

- [ ] **Step 4: Add tap handling and effects**

Effects are transient view state, not round state, so they live in their own `useState<Effect[]>`:

```tsx
type Effect =
  | { id: number; kind: 'drop'; x: number; y: number; dx: number; dy: number; delay: number }
  | { id: number; kind: 'toast'; x: number; y: number; text: string; colour: string }
  | { id: number; kind: 'shake'; plantId: string }
  | { id: number; kind: 'watered'; plantId: string };
```

`pushEffect(effect, lifeMs)` appends it and registers a cleanup timeout at `lifeMs + 120` in `fxRef`.

`onTap(plant)`:

- Ignore unless `state.phase === 'playing'`.
- `const c = state.cycles[plant.id]`. **No cycle means a distractor**: push a `shake` on that plant (460ms) and a toast `t('gk.toast.notThis', 'Not this one')` in `COLOURS.toastAlarm` (900ms), dispatch `falseTap`, and if `state.lives - 1 <= 0` schedule `finish('hearts')` in 460ms.
- `c.stage === 'sprouted'`: splash 10 droplets from `(plant.x, plant.y - plant.size * 0.4)`, push a `watered` flag on that plant (620ms), dispatch `water`, and if `state.watered + 1 >= params.targetCount` schedule `finish('complete')` in 620ms.
- Otherwise it is a real plant that is not asking for water: no heart, just a toast in `COLOURS.toastCalm`, `gk.toast.tooLate` when `c.stage === 'dried'` and `gk.toast.notReady` when it is a seed.

The splash, verbatim from the prototype:

```tsx
for (let i = 0; i < 10; i++) {
  const a = (Math.PI * 2 * i) / 10 + rnd(-0.3, 0.3);
  pushEffect({
    id: nextFxId(), kind: 'drop', x, y,
    dx: Math.cos(a) * rnd(44, 78),
    dy: Math.sin(a) * rnd(32, 58) + 12,
    delay: Math.round(rnd(0, 90)),
  }, 760);
}
```

Droplet: 13 × 16, `background: COLOURS.droplet`, `borderRadius: '50% 50% 50% 50% / 62% 62% 38% 38%'`, `zIndex: 30`, custom properties `--dx` and `--dy` carrying their `px` units on the value, animation `gk-splash 760ms ${EASE_SPLASH} ${delay}ms both` or `gk-fade 420ms ease ${delay}ms both` when reduced.

Toast: absolute at `(e.x, e.y)`, `transform: translate(-50%, 0)`, `padding: '8px 20px'`, `borderRadius: 14`, `background: 'rgba(14,36,60,.92)'`, 24px/700, `zIndex: 30`, animation `gk-toast` or `gk-toast-ro` at 900ms ease-out both. Give it `maxWidth: 520` and `textWrap: 'balance'` and **do not** set `whiteSpace: 'nowrap'` - the prototype does, and Hindi and Kannada would run off the board.

- [ ] **Step 5: Add finish and the end card**

```tsx
const finish = useCallback((outcome: Outcome) => {
  const s = stateRef.current;
  if (s.phase !== 'playing') return;
  stopAll();
  dispatch({ type: 'finish', now: Date.now(), outcome });
}, [stopAll]);
```

The end card reuses the intro card's chrome. Title 46px/800, `COLOURS.success` on `complete` and `COLOURS.neutralTitle` otherwise:

| Outcome | Key and fallback |
|---|---|
| `complete` | `gk.roundComplete` / "Garden watered" |
| `hearts` | `gk.outOfHearts` / "Let's try again" |
| `time` | `gk.timeUp` / "Time's up" |

Body: `t('gk.summary', '{{watered}} of {{target}} plants watered. {{dried}} dried up.', { watered: state.watered, target: params.targetCount, dried: state.driedUp })` at 29px/600, `COLOURS.cardBody`, line-height 1.35.

Button label `t('gk.next', 'Next round')`, wired to a handler that calls `onLevelComplete` **exactly once**:

```tsx
const reported = useRef(false);

const handleNext = () => {
  if (reported.current || !state.outcome) return;
  reported.current = true;
  onLevelComplete({
    levelId: levelConfig.id,
    durationSeconds: Math.round((Date.now() - startedAtRef.current) / 1000),
    completed: state.outcome === 'complete',
    metrics: buildMetrics(state, params) as unknown as Record<string, unknown>,
  });
};
```

`startedAtRef` is stamped in `handleStart`, not at mount, so time spent reading the intro card is not scored as play.

- [ ] **Step 6: Play it**

Run: `npm run dev` and play a full round. Confirm every line of this list:

- The first plant sprouts about a second after START, with a green ring that closes and turns amber then red.
- Tapping it splashes water, blooms it, and advances the progress bar.
- Letting one expire browns and droops it for about 2.5 seconds, then returns it to a seed, and **costs no heart**.
- Tapping a seed says "Not ready yet", tapping a dried plant says "Too late for this one", and neither costs a heart.
- Tapping a weed, bee, ladybird, snail, caterpillar, mushroom or carnivorous plant shakes it, says "Not this one", and costs one heart.
- Three wrong taps ends the round on "Let's try again".
- Reaching the target ends it on "Garden watered".
- Letting the clock run out ends it on "Time's up" with the clock reading 0:00.
- The end card's button leaves the game and a fresh round starts with a new bed.
- Background the tab for 20 seconds mid-round, come back: the clock is correct immediately, and the plant that was sprouted when you left is a seed again, not counted as dried. Check `driedUp` on the end card.

Run: `npm run build`
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add src/games/attention/GardenKeeper/index.tsx
git commit -m "feat: garden keeper round loop, scoring and end card"
```

---

### Task 8: App wiring

**Files:**
- Modify: `src/components/GameShell.tsx` (`computePerformanceRatio`, near line 293)
- Modify: `src/session/SessionManager.tsx:9`
- Modify: `src/screens/DailyQuestionnaire.tsx:10`
- Modify: `src/screens/HomeScreen.tsx` (attention block, near line 36)
- Create: `public/placeholders/games/garden-keeper.svg`

**Interfaces:**
- Consumes: `GardenKeeper` default export (Task 6), `getGardenKeeperParams` (Task 1), `gardenKeeperPerformance` (Task 3).

The router registration landed in Task 6 so the board could be opened. This task does the rest.

- [ ] **Step 1: Add the performance ratio case**

In `src/components/GameShell.tsx`, beside the `serve-guests` case:

```ts
  if (gameId === 'garden-keeper') {
    // The maths lives with the game rather than inline here, because it is unit-tested
    // against the round model and duplicating it would let the two drift.
    return gardenKeeperPerformance({
      watered: (m.watered as number) ?? 0,
      targetCount: (m.targetCount as number) ?? 1,
      falseTaps: (m.falseTaps as number) ?? 0,
    });
  }
```

with `import { gardenKeeperPerformance } from '../games/attention/GardenKeeper/model';` at the top. This is a small, deliberate divergence from the house pattern of inlining each game's ratio: the ratio is what moves a resident's difficulty, and a tested single definition is worth the one import.

- [ ] **Step 2: Add it to both rotation pools**

`src/session/SessionManager.tsx:9` and `src/screens/DailyQuestionnaire.tsx:10` each hold their own copy of the pool. Add `'garden-keeper'` to the `attention` array in both:

```ts
  attention: ['spot-focus', 'focus-filter', 'word-search', 'garden-keeper'],
```

Check the existing contents of each array before editing; they may already differ from each other. Do not consolidate them here - that duplication is a real smell, but fixing it is a separate change with its own blast radius.

- [ ] **Step 3: Add the home-screen tile**

In `src/screens/HomeScreen.tsx`, in the `attention` block:

```ts
    { id: 'garden-keeper',  nameKey: 'game.gardenKeeper',  icon: '🌻', imageSrc: '/placeholders/games/garden-keeper.svg' },
```

Create `public/placeholders/games/garden-keeper.svg` in the style of the neighbouring tiles. Open `public/placeholders/games/train-yard.svg` first and match its viewBox and general weight:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 120 120" width="120" height="120" role="img" aria-label="Garden Keeper">
  <rect width="120" height="120" rx="16" fill="#9AD0EC"/>
  <rect y="58" width="120" height="62" fill="#4E8C3A"/>
  <ellipse cx="60" cy="92" rx="52" ry="26" fill="#67451F"/>
  <g>
    <rect x="57" y="60" width="6" height="30" rx="3" fill="#3F7A2E"/>
    <circle cx="60" cy="56" r="9" fill="#FFB43C"/>
    <circle cx="60" cy="56" r="4" fill="#8C5A18"/>
  </g>
  <g>
    <rect x="33" y="72" width="5" height="20" rx="2.5" fill="#3F7A2E"/>
    <circle cx="35.5" cy="69" r="7" fill="#F07FB4"/>
  </g>
  <g>
    <rect x="83" y="74" width="5" height="18" rx="2.5" fill="#3F7A2E"/>
    <circle cx="85.5" cy="71" r="7" fill="#57A8E4"/>
  </g>
  <circle cx="60" cy="56" r="17" fill="none" stroke="#8FD65C" stroke-width="4" stroke-dasharray="80 27" transform="rotate(-90 60 56)"/>
</svg>
```

- [ ] **Step 4: Verify the wiring end to end**

Run: `npm run build`
Expected: no errors.

Run: `npm run dev`, then:
- The home screen shows a Garden Keeper tile under attention, with the tile art and the translated name.
- Tapping it loads the game inside `GameShell`, with the shell's title bar and level tag above the game's own HUD.
- Finishing a round returns to a fresh round rather than a blank screen.
- Play two rounds, one deliberately well and one deliberately badly, and confirm the level tag in the shell moves between rounds. That confirms the performance ratio is reaching `adjustDifficulty`.

- [ ] **Step 5: Commit**

```bash
git add src/components/GameShell.tsx src/session/SessionManager.tsx src/screens/DailyQuestionnaire.tsx src/screens/HomeScreen.tsx public/placeholders/games/garden-keeper.svg
git commit -m "feat: register garden keeper in the app"
```

---

### Task 9: Verification and release

**Files:**
- Modify: `package.json`
- Modify: `CLAUDE.md`

- [ ] **Step 1: Run the full test suite**

Run: `npm test`
Expected: PASS. The Garden Keeper suites add roughly 45 tests to the existing Picture Postcard ones. If any pre-existing suite fails, stop and report it rather than working around it.

- [ ] **Step 2: Check the lint count did not move**

Run:

```bash
npm run lint 2>&1 | tail -5
```

Expected: the same 38 errors as before this work. If the number rose, fix the new ones. Do not touch the pre-existing ones.

- [ ] **Step 3: Run the build**

Run: `npm run build`
Expected: completes with no TypeScript or Vite errors.

- [ ] **Step 4: Full manual smoke test**

Run `npm run dev` and confirm every item:

- A full session works: care home → profile → questionnaire → three categories, with Garden Keeper reachable in the attention slot.
- All three endings reachable: reach the target, run the clock to zero, and lose three hearts.
- Tapping a seed, a dried plant and a distractor each produce the right toast, and only the distractor costs a heart.
- Background the tab mid-round, return, and confirm the clock re-syncs immediately and no plant that expired while hidden was counted as dried.
- Switch the language to Hindi, then Kannada, and check the intro card, the end card, all three toasts and the progress label. Nothing may overflow its card or run off the board.
- Set the OS to reduce motion (Windows: Settings → Accessibility → Visual effects → Animation effects off) and confirm no insect moves, the halo does not pulse, and the sprouted plant is still obviously the target.
- Session resume works: start a session, refresh the page, and confirm the Resume button appears.
- No console errors during a full round.

- [ ] **Step 5: Bump the version**

In `package.json`, change `"version": "1.5.0"` to `"version": "1.6.0"`. A new game is a minor bump.

Note the working tree may already carry an uncommitted bump to 1.5.0 from other in-flight work. If so, 1.6.0 still applies, and the earlier bump belongs to whoever committed that work.

- [ ] **Step 6: Correct the stale note in CLAUDE.md**

`CLAUDE.md` says "No test suite exists yet." That has not been true since the Picture Postcard tests landed, and this work adds three more suites. Replace that line with:

```markdown
Tests run with vitest (`npm test`). Suites live in `src/**/__tests__/*.test.ts` and run in
the node environment, so they cover pure logic - geometry, models, scoring - not rendering.
```

- [ ] **Step 7: Commit**

```bash
git add package.json CLAUDE.md
git commit -m "chore: release garden keeper (v1.6.0)"
```

---

## Notes for the reviewer

Three things are worth extra attention in review, because they are the places where a wrong implementation still looks right on screen:

1. **The resume path.** If `resume` scores a hidden window as dried, nothing visible breaks; the resident is just quietly marked down for a window they never saw. The test `forgives a window the player never saw` in Task 3 is the guard.
2. **`onLevelComplete` firing more than once.** `GameShell` calls `adjustDifficulty` on every call, so a double fire moves a resident's difficulty twice for one round. The `reported` ref in Task 7 is the guard.
3. **Timer teardown.** Four timers are armed per round. Any one of them surviving unmount keeps dispatching into a dead component; the round-end timer surviving would end the *next* round early.
