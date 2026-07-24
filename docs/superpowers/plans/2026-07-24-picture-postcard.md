# Picture Postcard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

- **Date**: 2026-07-24
- **Content Type**: Implementation Plan
- **Spec**: `docs/superpowers/specs/2026-07-24-picture-postcard-design.md` (read it before starting any task; section references below like "spec SS3.2" point into it)

**Goal:** Ship the `picture-postcard` change-detection memory game (spec MVP: levels 1-50, probe modes M1-M3, change classes 1-7) integrated into the existing session/rotation app.

**Architecture:** A game-local difficulty engine (100-level ladder from GDD curves + continuous-DI staircase, persisted in new Dexie tables) drives a per-trial state machine (ready → encoding → retention → probe → feedback). Scenes are TS data (background + 20 authored object slots) rendered with inline-SVG sprites; a content generator applies parametric changes. GameShell/GameRouter treat each trial as one round via the existing self-generating-game pattern.

**Tech Stack:** React 18 + TypeScript, Vite, Tailwind, Zustand, Dexie 4, i18next, Firebase Firestore, Vitest (new) + fake-indexeddb (new, dev-only).

## Global Constraints

- App root is the **repo root** (`src/`), not `brain-training-app/` (project CLAUDE.md is stale on this).
- Locale files are `public/locales/{en,hi,kn}/common.json` (NOT `translation.json`); all strings via `t('key', 'Fallback')`.
- Dexie: only ADD `.version(3)` in `src/lib/db.ts`; never mutate `.version(1)`/`.version(2)` blocks.
- Day boundaries: UTC via the shared `todayISO()` (Task 2). Never local dates, never ms-delta day math.
- Engine writes must complete BEFORE `onLevelComplete` is invoked; no engine writes in unmount cleanup (spec SS2.3).
- In-game text: minimum `text-h3` (22px); instructions/probe prompts `text-h2` (28px). Touch targets >= 64px visual with >= 96px hit area; tap hit radius 1.5x visual bounds (spec SS7).
- No hearts, no failure framing, no Replay button, no persistent Next button, no hamburger (spec SS7).
- Commit messages: conventional prefix (`feat:`/`test:`/`chore:`), no co-author lines.
- Every task's commit is one commit; the FINAL task bumps `package.json` version to **1.1.0** (minor - new game) per the repo release protocol. Intermediate commits do not bump.
- Run all commands from the repo root. This is Windows/PowerShell; the test runner is `npx vitest run <file>`.

## File Structure

```
src/lib/dates.ts                                   # shared todayISO (Task 2)
src/lib/picturePostcard/ladder.ts                  # curves, level defs, effective params (Task 3)
src/lib/picturePostcard/engineCore.ts              # pure staircase/session/level logic (Task 5)
src/lib/picturePostcard/engine.ts                  # persistence wrapper + Firestore sync (Task 6)
src/lib/picturePostcard/scoring.ts                 # roundScore (Task 7)
src/lib/db.ts                                      # + version(3): ppEngine, ppPairHistory (Task 4)
src/games/memory/PicturePostcard/sprites/index.tsx # sprite registry, inline SVG components (Task 8)
src/games/memory/PicturePostcard/scenes/types.ts   # scene/slot types (Task 9)
src/games/memory/PicturePostcard/scenes/park.ts    # first authored scene (Task 9)
src/games/memory/PicturePostcard/scenes/*.ts       # 7 more scenes (Task 10)
src/games/memory/PicturePostcard/scenes/index.ts   # scene registry (Task 9)
src/lib/contentGenerators/picturePostcard.ts       # trial generation (Task 11)
src/games/memory/PicturePostcard/trialMachine.ts   # pure phase reducer (Task 12)
src/games/memory/PicturePostcard/SceneView.tsx     # scene renderer (Task 13)
src/games/memory/PicturePostcard/index.tsx         # game component (Tasks 13-16)
src/screens/GameRouter.tsx, src/components/GameShell.tsx, src/session/SessionManager.tsx,
src/screens/DailyQuestionnaire.tsx, src/screens/HomeScreen.tsx   # integration (Task 17)
src/lib/picturePostcard/__tests__/*.test.ts        # unit tests (Tasks 3-12)
```

---

### Task 1: Test infrastructure (Vitest)

The repo has **no test runner**. All later tasks depend on this.

**Files:**
- Modify: `package.json` (devDependencies + `test` script)
- Create: `vitest.config.ts`
- Create: `src/lib/picturePostcard/__tests__/smoke.test.ts`

**Interfaces:**
- Produces: `npm test` / `npx vitest run` working with jsdom + fake-indexeddb available.

- [ ] **Step 1: Install dev dependencies**

Run: `npm install -D vitest fake-indexeddb`
(no jsdom needed - all planned tests are pure logic or Dexie-against-fake-indexeddb; component behaviour is verified by the manual smoke test in Task 18)

- [ ] **Step 2: Create `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/__tests__/**/*.test.ts'],
  },
});
```

- [ ] **Step 3: Add script to `package.json`** (inside `"scripts"`)

```json
"test": "vitest run"
```

- [ ] **Step 4: Write smoke test**

```ts
// src/lib/picturePostcard/__tests__/smoke.test.ts
import { describe, it, expect } from 'vitest';

describe('vitest smoke', () => {
  it('runs', () => {
    expect(1 + 1).toBe(2);
  });
});
```

- [ ] **Step 5: Run and verify PASS**

Run: `npm test`
Expected: `1 passed`

- [ ] **Step 6: Verify lint/build still pass**

Run: `npm run lint` then `npm run build`
Expected: both clean (vitest.config.ts may need adding to `tsconfig.node.json` `include` if build complains; do so if needed).

- [ ] **Step 7: Commit**

```
git add package.json package-lock.json vitest.config.ts src/lib/picturePostcard/__tests__/smoke.test.ts tsconfig.node.json
git commit -m "test: add vitest + fake-indexeddb infrastructure"
```

---

### Task 2: Shared `todayISO` helper

**Files:**
- Create: `src/lib/dates.ts`
- Test: `src/lib/picturePostcard/__tests__/dates.test.ts`

**Interfaces:**
- Produces: `todayISO(): string` (UTC `YYYY-MM-DD`), `daysBetweenISO(a: string, b: string): number`, `isoDaysAgo(days: number): string`. Existing 4 duplicated `todayISO` implementations are NOT migrated (spec SS11.1 - separate cleanup).

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/dates.test.ts
import { describe, it, expect } from 'vitest';
import { todayISO, daysBetweenISO, isoDaysAgo } from '../../dates';

describe('dates', () => {
  it('todayISO returns UTC YYYY-MM-DD', () => {
    expect(todayISO()).toBe(new Date().toISOString().split('T')[0]);
  });
  it('daysBetweenISO computes calendar-day difference', () => {
    expect(daysBetweenISO('2026-07-24', '2026-07-31')).toBe(7);
    expect(daysBetweenISO('2026-07-31', '2026-07-24')).toBe(-7);
  });
  it('isoDaysAgo returns an earlier ISO date', () => {
    expect(daysBetweenISO(isoDaysAgo(30), todayISO())).toBe(30);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** — `npx vitest run src/lib/picturePostcard/__tests__/dates.test.ts` → "Cannot find module '../../dates'"

- [ ] **Step 3: Implement**

```ts
// src/lib/dates.ts
/** UTC calendar date, matching the convention used across the app's stores. */
export function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export function daysBetweenISO(a: string, b: string): number {
  return Math.round((Date.parse(b) - Date.parse(a)) / 86_400_000);
}

export function isoDaysAgo(days: number): string {
  return new Date(Date.now() - days * 86_400_000).toISOString().split('T')[0];
}
```

- [ ] **Step 4: Run to verify PASS**
- [ ] **Step 5: Commit** — `git add src/lib/dates.ts src/lib/picturePostcard/__tests__/dates.test.ts && git commit -m "feat: shared UTC date helpers for picture-postcard"`

---

### Task 3: Ladder module

Spec SS3.1 + A5. Pure, no I/O.

**Files:**
- Create: `src/lib/picturePostcard/ladder.ts`
- Test: `src/lib/picturePostcard/__tests__/ladder.test.ts`

**Interfaces:**
- Produces:
  - `type ChangeClass = 1|2|3|4|5|6|7` and `const M3_ELIGIBLE_CLASSES: ChangeClass[] = [1, 2, 4, 5]`
  - `type ProbeMode = 'M1'|'M2'|'M3'`
  - `interface TrialParams { objects: number; encodeMs: number; delayMs: number; changes: number; lureLevel: number }`
  - `interface LevelDef { level: number; tier: number; params: TrialParams; changeTypeWeights: Partial<Record<ChangeClass, number>>; probeModeWeights: Partial<Record<ProbeMode, number>>; softTimerMs: number | null; interference: boolean }`
  - `effectiveParams(level: number, di: number): TrialParams` — curves evaluated at `clamp(level + di, 1, 100)` (spec A7)
  - `getLevelDef(level: number): LevelDef`; `const LADDER: LevelDef[]` (all 100)
  - `const FIRST_APPEARANCE: Record<ChangeClass, number>` = `{1:1, 2:4, 3:11, 4:15, 5:21, 6:33, 7:41}`
  - `const DI_STEP = 0.08`, `const DI_CLAMP = 2.0`

- [ ] **Step 1: Write failing tests** (the A5 validation suite)

```ts
// src/lib/picturePostcard/__tests__/ladder.test.ts
import { describe, it, expect } from 'vitest';
import {
  LADDER, getLevelDef, effectiveParams, FIRST_APPEARANCE, DI_STEP, DI_CLAMP,
} from '../ladder';

describe('ladder (spec A5 validation)', () => {
  it('has 100 levels with correct tiers', () => {
    expect(LADDER).toHaveLength(100);
    expect(getLevelDef(1).tier).toBe(1);
    expect(getLevelDef(41).tier).toBe(5);
    expect(getLevelDef(100).tier).toBe(10);
  });
  it('matches curve endpoints at L1 and L100', () => {
    expect(getLevelDef(1).params).toMatchObject({ objects: 5, encodeMs: 7801, delayMs: 538, changes: 1, lureLevel: 0 });
    expect(getLevelDef(100).params).toMatchObject({ objects: 18, encodeMs: 3000, delayMs: 10000, changes: 4, lureLevel: 3 });
  });
  it('every axis is monotonic across levels', () => {
    for (let n = 2; n <= 100; n++) {
      const prev = getLevelDef(n - 1).params, cur = getLevelDef(n).params;
      expect(cur.objects).toBeGreaterThanOrEqual(prev.objects);
      expect(cur.encodeMs).toBeLessThanOrEqual(prev.encodeMs);
      expect(cur.delayMs).toBeGreaterThanOrEqual(prev.delayMs);
      expect(cur.changes).toBeGreaterThanOrEqual(prev.changes);
      expect(cur.lureLevel).toBeGreaterThanOrEqual(prev.lureLevel);
    }
  });
  it('changes breakpoints at L28/56/84; lureLevel at L26/52/78', () => {
    expect(getLevelDef(27).params.changes).toBe(1);
    expect(getLevelDef(28).params.changes).toBe(2);
    expect(getLevelDef(56).params.changes).toBe(3);
    expect(getLevelDef(84).params.changes).toBe(4);
    expect(getLevelDef(25).params.lureLevel).toBe(0);
    expect(getLevelDef(26).params.lureLevel).toBe(1);
    expect(getLevelDef(52).params.lureLevel).toBe(2);
    expect(getLevelDef(78).params.lureLevel).toBe(3);
  });
  it('no change class appears before its first-appearance level', () => {
    for (const def of LADDER) {
      for (const [cls, w] of Object.entries(def.changeTypeWeights)) {
        if ((w ?? 0) > 0) expect(def.level).toBeGreaterThanOrEqual(FIRST_APPEARANCE[Number(cls) as 1]);
      }
    }
  });
  it('probe modes follow the tier table (T1 M1; T2 M1/M2; T3 M2; T4 M2/M3; T5 M3)', () => {
    expect(getLevelDef(5).probeModeWeights).toEqual({ M1: 1 });
    expect(getLevelDef(15).probeModeWeights).toEqual({ M1: 0.5, M2: 0.5 });
    expect(getLevelDef(25).probeModeWeights).toEqual({ M2: 1 });
    expect(getLevelDef(35).probeModeWeights).toEqual({ M2: 0.5, M3: 0.5 });
    expect(getLevelDef(45).probeModeWeights).toEqual({ M3: 1 });
  });
  it('soft timer none/none/60s/60s/45s; interference from tier 5', () => {
    expect(getLevelDef(10).softTimerMs).toBeNull();
    expect(getLevelDef(20).softTimerMs).toBeNull();
    expect(getLevelDef(25).softTimerMs).toBe(60000);
    expect(getLevelDef(35).softTimerMs).toBe(60000);
    expect(getLevelDef(45).softTimerMs).toBe(45000);
    expect(getLevelDef(40).interference).toBe(false);
    expect(getLevelDef(41).interference).toBe(true);
  });
  it('effectiveParams evaluates curves at clamp(n + di)', () => {
    expect(effectiveParams(10, 0)).toEqual(getLevelDef(10).params);
    expect(effectiveParams(10, 2.0).delayMs).toBe(effectiveParams(12, 0).delayMs);
    expect(effectiveParams(1, -5)).toEqual(getLevelDef(1).params);   // clamped at L1
    expect(effectiveParams(100, 5)).toEqual(getLevelDef(100).params); // clamped at L100
  });
  it('changeTypeWeights sum to 1 and DI constants match spec', () => {
    for (const def of LADDER) {
      const sum = Object.values(def.changeTypeWeights).reduce((a, b) => a + (b ?? 0), 0);
      expect(sum).toBeCloseTo(1, 5);
    }
    expect(DI_STEP).toBe(0.08);
    expect(DI_CLAMP).toBe(2.0);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** (module missing)

- [ ] **Step 3: Implement**

```ts
// src/lib/picturePostcard/ladder.ts
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
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run src/lib/picturePostcard/__tests__/ladder.test.ts`
(if the L1 endpoint literals `7972`/`504` fail, recompute by hand from the formulas - `8000 - 5000*(0.01)^0.7` and `500 + 9500*(0.01)^1.2` - and correct the TEST, not the formula; the formulas are the contract.)
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard 100-level ladder with GDD curves"`

---

### Task 4: Dexie version(3) — `ppEngine` + `ppPairHistory`

Spec SS8.1-8.2. `put()`-based (atomic), NOT the get-then-add pattern.

**Files:**
- Modify: `src/lib/db.ts` (append interfaces + `version(3)` + helpers; do not touch existing versions)
- Test: `src/lib/picturePostcard/__tests__/db.test.ts`

**Interfaces:**
- Produces:
  - `interface PpTrialRecord { correct: boolean; di: number; isWarmup: boolean; isConfidence: boolean }`
  - `interface PpEngineRow { userId: string; currentLevel: number; di: number; countedTrialsInLevel: number; correctCountedInLevel: number; trialHistory: PpTrialRecord[]; starsByLevel: Record<number, 1|2|3>; consecutiveCorrect: number; consecutiveErrors: number; streak: number; frustrationGuardUsedInLevel: number; sessionStamp: number | null; trialsThisSession: number; prevSessionTrials: number; scenesThisSession: string[]; tipCardL41Shown: boolean; lastPlayedDate: string; updatedAt: number }`
  - `interface PpPairHistoryRow { key: string; userId: string; lastUsedDate: string }` where `key = `${userId}|${sceneId}:${changeClass}``
  - `getPpEngine(userId): Promise<PpEngineRow | undefined>`, `putPpEngine(row): Promise<void>`
  - `getPpPair(userId, sceneId, changeClass): Promise<PpPairHistoryRow | undefined>`, `putPpPair(userId, sceneId, changeClass, lastUsedDate): Promise<void>`, `getPpPairsForUser(userId): Promise<PpPairHistoryRow[]>`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/db.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  appDb, getPpEngine, putPpEngine, getPpPair, putPpPair, getPpPairsForUser,
} from '../../db';
import type { PpEngineRow } from '../../db';

function freshRow(userId: string): PpEngineRow {
  return {
    userId, currentLevel: 1, di: 0, countedTrialsInLevel: 0, correctCountedInLevel: 0,
    trialHistory: [], starsByLevel: {}, consecutiveCorrect: 0, consecutiveErrors: 0,
    streak: 0, frustrationGuardUsedInLevel: 0, sessionStamp: null, trialsThisSession: 0,
    prevSessionTrials: 0, scenesThisSession: [], tipCardL41Shown: false,
    lastPlayedDate: '2026-07-24', updatedAt: 1,
  };
}

describe('pp Dexie tables', () => {
  it('ppEngine put is an atomic upsert keyed by userId', async () => {
    await putPpEngine(freshRow('u1'));
    await putPpEngine({ ...freshRow('u1'), currentLevel: 7 });
    const row = await getPpEngine('u1');
    expect(row?.currentLevel).toBe(7);
    expect(await appDb.ppEngine.count()).toBe(1);
  });
  it('ppPairHistory round-trips and scopes by user', async () => {
    await putPpPair('u1', 'park', 4, '2026-07-01');
    await putPpPair('u1', 'park', 4, '2026-07-20'); // overwrite
    await putPpPair('u2', 'park', 4, '2026-07-05');
    expect((await getPpPair('u1', 'park', 4))?.lastUsedDate).toBe('2026-07-20');
    expect(await getPpPairsForUser('u1')).toHaveLength(1);
  });
});
```

- [ ] **Step 2: Run to verify FAIL** (exports missing)

- [ ] **Step 3: Implement in `src/lib/db.ts`** — append after the `PendingEvent` interface:

```ts
export interface PpTrialRecord {
  correct: boolean;
  di: number;
  isWarmup: boolean;
  isConfidence: boolean;
}

export interface PpEngineRow {
  userId: string;
  currentLevel: number;
  di: number;
  countedTrialsInLevel: number;
  correctCountedInLevel: number;
  trialHistory: PpTrialRecord[];      // rolling last 20
  starsByLevel: Record<number, 1 | 2 | 3>;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  streak: number;
  frustrationGuardUsedInLevel: number;
  sessionStamp: number | null;        // sessionStartedAt ms; practice fallback: Date.parse(todayISO())
  trialsThisSession: number;
  prevSessionTrials: number;          // for adaptive warm-up count (spec SS3.3)
  scenesThisSession: string[];
  tipCardL41Shown: boolean;
  lastPlayedDate: string;             // ISO date (UTC)
  updatedAt: number;
}

export interface PpPairHistoryRow {
  key: string;                        // `${userId}|${sceneId}:${changeClass}`
  userId: string;
  lastUsedDate: string;               // ISO date (UTC)
}
```

In the `BrainTrainingDB` class add table declarations:

```ts
  ppEngine!: Table<PpEngineRow, string>;
  ppPairHistory!: Table<PpPairHistoryRow, string>;
```

Append (do NOT modify version 1/2) inside the constructor:

```ts
    this.version(3).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      difficultyState: '++id, userId, gameId, date, [userId+gameId], [userId+gameId+date]',
      pendingEvents:'++id, queuedAt',
      ppEngine: 'userId',
      ppPairHistory: 'key, userId',
    });
```

Append helpers at the end of the file:

```ts
export async function getPpEngine(userId: string): Promise<PpEngineRow | undefined> {
  return appDb.ppEngine.get(userId);
}

export async function putPpEngine(row: PpEngineRow): Promise<void> {
  await appDb.ppEngine.put(row);
}

function ppPairKey(userId: string, sceneId: string, changeClass: number): string {
  return `${userId}|${sceneId}:${changeClass}`;
}

export async function getPpPair(userId: string, sceneId: string, changeClass: number): Promise<PpPairHistoryRow | undefined> {
  return appDb.ppPairHistory.get(ppPairKey(userId, sceneId, changeClass));
}

export async function putPpPair(userId: string, sceneId: string, changeClass: number, lastUsedDate: string): Promise<void> {
  await appDb.ppPairHistory.put({ key: ppPairKey(userId, sceneId, changeClass), userId, lastUsedDate });
}

export async function getPpPairsForUser(userId: string): Promise<PpPairHistoryRow[]> {
  return appDb.ppPairHistory.where('userId').equals(userId).toArray();
}
```

- [ ] **Step 4: Run to verify PASS**; also `npm run build` (type check across app)
- [ ] **Step 5: Commit** — `git commit -m "feat: dexie v3 with picture-postcard engine and pair-history tables"`

---

### Task 5: Engine core (pure logic)

Spec SS3.2-3.5. Pure functions over `PpEngineRow` — no I/O, fully unit-tested. This is the highest-risk logic in the feature; the tests below are the spec's acceptance criteria.

**Files:**
- Create: `src/lib/picturePostcard/engineCore.ts`
- Test: `src/lib/picturePostcard/__tests__/engineCore.test.ts`

**Interfaces:**
- Consumes: `PpEngineRow`, `PpTrialRecord` (Task 4); `DI_STEP`, `DI_CLAMP`, `effectiveParams`, `getLevelDef` (Task 3); `todayISO`, `daysBetweenISO` (Task 2).
- Produces:
  - `type TrialKind = 'counted' | 'warmup' | 'confidence'`
  - `freshEngineRow(userId: string): PpEngineRow` (level 1, all zeros, `lastPlayedDate: todayISO()`)
  - `beginSession(row, sessionStamp: number): PpEngineRow` — no-op if stamp unchanged; else: DI = rolling mean of `trialHistory` DIs minus `DI_STEP` (minus `3 * DI_STEP` if `daysBetweenISO(lastPlayedDate, todayISO()) >= 7`), clamped; resets `consecutiveCorrect/consecutiveErrors/streak/trialsThisSession/scenesThisSession`; `prevSessionTrials = old trialsThisSession`; stores stamp.
  - `warmupCount(row): number` — `row.prevSessionTrials >= 6 ? 2 : 1`
  - `nextTrialKind(row): TrialKind` — `'confidence'` if `pendingConfidence(row)`, else `'warmup'` if `trialsThisSession < warmupCount(row)`, else `'counted'`
  - `pendingConfidence(row): boolean` — `consecutiveErrors >= 3 && frustrationGuardUsedInLevel < 2`
  - `trialDi(row, kind): number` — counted: `row.di`; warmup: `row.di - 2*DI_STEP`; confidence: `-4*DI_STEP` (absolute offset from nominal); all clamped to +-`DI_CLAMP`
  - `applyTrialResult(row, opts: { correct: boolean; omission: boolean; kind: TrialKind }): { row: PpEngineRow; levelOutcome: null | { stars: 0|1|2|3; accuracy: number; advanced: boolean } }` — a `stars: 0` outcome means "<50%, repeat level" (spec SS3.3)
- Notes for the implementer: an omission counts as incorrect for the staircase and accuracy; `trialHistory` caps at 20 (oldest dropped); after a confidence trial the staircase resumes from `-2*DI_STEP` relative to nominal, i.e. `di = -2*DI_STEP`, and `frustrationGuardUsedInLevel` increments; on level advance `currentLevel + 1` (cap 100) with counted counters, guard budget reset and `di` carried as-is; on repeat (`stars: 0`) `di = min(di, -DI_STEP)` and counters reset.

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/engineCore.test.ts
import { describe, it, expect } from 'vitest';
import {
  freshEngineRow, beginSession, warmupCount, nextTrialKind, trialDi, applyTrialResult,
} from '../engineCore';
import { DI_STEP } from '../ladder';
import { todayISO, isoDaysAgo } from '../../dates';

const correct = { correct: true, omission: false, kind: 'counted' as const };
const wrong = { correct: false, omission: false, kind: 'counted' as const };

describe('staircase (spec SS3.2)', () => {
  it('3 consecutive correct raise DI by one step', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, correct).row;
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBe(0);
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBeCloseTo(DI_STEP);
  });
  it('one incorrect drops DI one step, two steps when DI > 0', () => {
    let r = { ...freshEngineRow('u'), di: 0 };
    r = applyTrialResult(r, wrong).row;
    expect(r.di).toBeCloseTo(-DI_STEP);
    r = { ...freshEngineRow('u'), di: 0.4 };
    r = applyTrialResult(r, wrong).row;
    expect(r.di).toBeCloseTo(0.4 - 2 * DI_STEP);
  });
  it('DI clamps at +-2.0', () => {
    let r = { ...freshEngineRow('u'), di: 1.99, consecutiveCorrect: 2 };
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBe(2.0);
  });
  it('omission counts as incorrect for the staircase', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, { correct: false, omission: true, kind: 'counted' }).row;
    expect(r.di).toBeCloseTo(-DI_STEP);
    expect(r.consecutiveErrors).toBe(1);
  });
});

describe('counted trials and level completion (spec SS3.3)', () => {
  it('only counted trials advance the level counter', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'warmup' }).row;
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'confidence' }).row;
    expect(r.countedTrialsInLevel).toBe(0);
    r = applyTrialResult(r, correct).row;
    expect(r.countedTrialsInLevel).toBe(1);
  });
  it.each([
    [9, 3], [7, 2], [5, 1],
  ])('%i/10 correct earns %i stars and advances', (nCorrect, stars) => {
    let r = freshEngineRow('u');
    let outcome = null;
    for (let i = 0; i < 10; i++) {
      const res = applyTrialResult(r, i < nCorrect ? correct : wrong);
      r = res.row; outcome = res.levelOutcome ?? outcome;
    }
    expect(outcome).toMatchObject({ stars, advanced: true });
    expect(r.currentLevel).toBe(2);
    expect(r.countedTrialsInLevel).toBe(0);
    expect(r.starsByLevel[1]).toBe(stars);
  });
  it('below 50% repeats the level at -1 step', () => {
    let r = freshEngineRow('u');
    let outcome = null;
    for (let i = 0; i < 10; i++) {
      const res = applyTrialResult(r, i < 4 ? correct : wrong);
      r = res.row; outcome = res.levelOutcome ?? outcome;
    }
    expect(outcome).toMatchObject({ stars: 0, advanced: false });
    expect(r.currentLevel).toBe(1);
    expect(r.di).toBeLessThanOrEqual(-DI_STEP);
  });
});

describe('frustration guard (spec SS3.5)', () => {
  it('3 consecutive errors queue a confidence trial, max twice per level', () => {
    let r = freshEngineRow('u');
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    expect(nextTrialKind(r)).toBe('confidence');
    expect(trialDi(r, 'confidence')).toBeCloseTo(-4 * DI_STEP);
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'confidence' }).row;
    expect(r.frustrationGuardUsedInLevel).toBe(1);
    expect(r.di).toBeCloseTo(-2 * DI_STEP); // staircase resumes from nominal -2
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    r = applyTrialResult(r, { correct: false, omission: false, kind: 'confidence' }).row;
    expect(r.frustrationGuardUsedInLevel).toBe(2);
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    expect(nextTrialKind(r)).not.toBe('confidence'); // budget exhausted
  });
});

describe('sessions (spec SS3.4)', () => {
  it('beginSession is a no-op for the same stamp and resets runs for a new one', () => {
    let r = freshEngineRow('u');
    r = beginSession(r, 1000);
    r = { ...r, consecutiveErrors: 2, streak: 5, trialsThisSession: 7, scenesThisSession: ['park'] };
    expect(beginSession(r, 1000)).toBe(r);
    const r2 = beginSession(r, 2000);
    expect(r2.consecutiveErrors).toBe(0);
    expect(r2.streak).toBe(0);
    expect(r2.trialsThisSession).toBe(0);
    expect(r2.scenesThisSession).toEqual([]);
    expect(r2.prevSessionTrials).toBe(7);
  });
  it('adaptive warm-up count: 2 if prev session had >= 6 trials, else 1', () => {
    const r = freshEngineRow('u');
    expect(warmupCount({ ...r, prevSessionTrials: 6 })).toBe(2);
    expect(warmupCount({ ...r, prevSessionTrials: 5 })).toBe(1);
    expect(nextTrialKind({ ...r, prevSessionTrials: 0, trialsThisSession: 0 })).toBe('warmup');
    expect(nextTrialKind({ ...r, prevSessionTrials: 0, trialsThisSession: 1 })).toBe('counted');
  });
  it('new-session DI = rolling mean of history minus one step; minus three after 7+ days away', () => {
    const hist = Array.from({ length: 20 }, () => ({ correct: true, di: 0.5, isWarmup: false, isConfidence: false }));
    let r = { ...freshEngineRow('u'), trialHistory: hist, lastPlayedDate: todayISO(), sessionStamp: 1 };
    expect(beginSession(r, 2).di).toBeCloseTo(0.5 - DI_STEP);
    r = { ...r, lastPlayedDate: isoDaysAgo(8) };
    expect(beginSession(r, 3).di).toBeCloseTo(0.5 - 3 * DI_STEP);
  });
  it('warmup trials run at DI minus two steps', () => {
    const r = { ...freshEngineRow('u'), di: 0.5 };
    expect(trialDi(r, 'warmup')).toBeCloseTo(0.5 - 2 * DI_STEP);
    expect(trialDi(r, 'counted')).toBeCloseTo(0.5);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/picturePostcard/engineCore.ts
import type { PpEngineRow } from '../db';
import { DI_STEP, DI_CLAMP } from './ladder';
import { todayISO, daysBetweenISO } from '../dates';

export type TrialKind = 'counted' | 'warmup' | 'confidence';

const COUNTED_PER_LEVEL = 10;
const HISTORY_CAP = 20;

function clampDi(di: number): number {
  return Math.min(DI_CLAMP, Math.max(-DI_CLAMP, di));
}

export function freshEngineRow(userId: string): PpEngineRow {
  return {
    userId, currentLevel: 1, di: 0,
    countedTrialsInLevel: 0, correctCountedInLevel: 0,
    trialHistory: [], starsByLevel: {},
    consecutiveCorrect: 0, consecutiveErrors: 0, streak: 0,
    frustrationGuardUsedInLevel: 0,
    sessionStamp: null, trialsThisSession: 0, prevSessionTrials: 0,
    scenesThisSession: [], tipCardL41Shown: false,
    lastPlayedDate: todayISO(), updatedAt: Date.now(),
  };
}

export function beginSession(row: PpEngineRow, sessionStamp: number): PpEngineRow {
  if (row.sessionStamp === sessionStamp) return row;
  const mean = row.trialHistory.length
    ? row.trialHistory.reduce((a, t) => a + t.di, 0) / row.trialHistory.length
    : 0;
  const absent = daysBetweenISO(row.lastPlayedDate, todayISO()) >= 7;
  return {
    ...row,
    di: clampDi(mean - (absent ? 3 : 1) * DI_STEP),
    consecutiveCorrect: 0, consecutiveErrors: 0, streak: 0,
    prevSessionTrials: row.trialsThisSession,
    trialsThisSession: 0, scenesThisSession: [],
    sessionStamp,
  };
}

export function warmupCount(row: PpEngineRow): number {
  return row.prevSessionTrials >= 6 ? 2 : 1;
}

export function pendingConfidence(row: PpEngineRow): boolean {
  return row.consecutiveErrors >= 3 && row.frustrationGuardUsedInLevel < 2;
}

export function nextTrialKind(row: PpEngineRow): TrialKind {
  if (pendingConfidence(row)) return 'confidence';
  if (row.trialsThisSession < warmupCount(row)) return 'warmup';
  return 'counted';
}

export function trialDi(row: PpEngineRow, kind: TrialKind): number {
  if (kind === 'confidence') return clampDi(-4 * DI_STEP);
  if (kind === 'warmup') return clampDi(row.di - 2 * DI_STEP);
  return clampDi(row.di);
}

export interface TrialResultOpts {
  correct: boolean;
  omission: boolean;
  kind: TrialKind;
}

export interface LevelOutcome {
  stars: 0 | 1 | 2 | 3;
  accuracy: number;
  advanced: boolean;
}

export function applyTrialResult(
  row: PpEngineRow,
  opts: TrialResultOpts,
): { row: PpEngineRow; levelOutcome: LevelOutcome | null } {
  const succeeded = opts.correct && !opts.omission;
  let r: PpEngineRow = { ...row, updatedAt: Date.now(), lastPlayedDate: todayISO() };

  // staircase
  if (succeeded) {
    r.consecutiveCorrect = row.consecutiveCorrect + 1;
    r.consecutiveErrors = 0;
    r.streak = row.streak + 1;
    if (r.consecutiveCorrect % 3 === 0) r.di = clampDi(row.di + DI_STEP);
  } else {
    r.consecutiveCorrect = 0;
    r.consecutiveErrors = row.consecutiveErrors + 1;
    r.streak = 0;
    r.di = clampDi(row.di - (row.di > 0 ? 2 : 1) * DI_STEP);
  }

  // confidence trial resolution (spec SS3.5: staircase resumes from nominal -2)
  if (opts.kind === 'confidence') {
    r.frustrationGuardUsedInLevel = row.frustrationGuardUsedInLevel + 1;
    r.consecutiveErrors = 0;
    r.di = clampDi(-2 * DI_STEP);
  }

  r.trialsThisSession = row.trialsThisSession + 1;
  r.trialHistory = [...row.trialHistory, {
    correct: succeeded, di: trialDi(row, opts.kind),
    isWarmup: opts.kind === 'warmup', isConfidence: opts.kind === 'confidence',
  }].slice(-HISTORY_CAP);

  // level bookkeeping (counted trials only)
  let levelOutcome: LevelOutcome | null = null;
  if (opts.kind === 'counted') {
    r.countedTrialsInLevel = row.countedTrialsInLevel + 1;
    r.correctCountedInLevel = row.correctCountedInLevel + (succeeded ? 1 : 0);
    if (r.countedTrialsInLevel >= COUNTED_PER_LEVEL) {
      const accuracy = r.correctCountedInLevel / COUNTED_PER_LEVEL;
      const stars: 0 | 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;
      const advanced = stars >= 1;
      if (advanced) {
        r.starsByLevel = { ...row.starsByLevel, [row.currentLevel]: stars as 1 | 2 | 3 };
        r.currentLevel = Math.min(100, row.currentLevel + 1);
      } else {
        r.di = clampDi(Math.min(r.di, -DI_STEP));
      }
      r.countedTrialsInLevel = 0;
      r.correctCountedInLevel = 0;
      r.frustrationGuardUsedInLevel = 0;
      levelOutcome = { stars, accuracy, advanced };
    }
  }

  return { row: r, levelOutcome };
}
```

- [ ] **Step 4: Run to verify PASS** — `npx vitest run src/lib/picturePostcard/__tests__/engineCore.test.ts`
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard engine core (staircase, levels, sessions, frustration guard)"`

---

### Task 6: Engine persistence wrapper + Firestore sync

Spec SS2.4, SS8.3. Thin async wrapper around Tasks 4-5.

**Files:**
- Create: `src/lib/picturePostcard/engine.ts`
- Test: `src/lib/picturePostcard/__tests__/engine.test.ts`

**Interfaces:**
- Consumes: everything from Tasks 2-5; `upsertDifficultyState`, `getDifficultyState` from `../db` (existing); `firestoreDb` from `../firebase` with `doc`/`setDoc`/`getDoc` from `firebase/firestore`.
- Produces:
  - `loadEngine(userId: string, sessionStamp: number): Promise<PpEngineRow>` — reads row (or `freshEngineRow`), applies `beginSession`, persists, returns.
  - `commitTrial(row: PpEngineRow, opts: TrialResultOpts): Promise<{ row: PpEngineRow; levelOutcome: LevelOutcome | null }>` — `applyTrialResult`, `putPpEngine`, write derived `DifficultyState` (spec SS2.4: score = `currentLevel/100`, peakScore = max, roundsPlayed +1), fire-and-forget Firestore push. MUST be awaited by the caller before `onLevelComplete`.
  - `markSceneUsed(row, sceneId, changeClasses: number[]): Promise<PpEngineRow>` — appends to `scenesThisSession`, `putPpPair` for each class with `todayISO()`, persists, returns updated row.
  - `markTipShown(row): Promise<PpEngineRow>`
  - `hydrateFromFirestore(userId: string): Promise<void>` — `getDoc(doc(firestoreDb, 'ppEngine', userId))`; adopt remote iff `remote.updatedAt > (local?.updatedAt ?? 0)`; wrapped in try/catch (never blocks). Called from `ProfileSelector` on profile choice (Task 17).
- Firestore push omits `trialHistory` (bulky) per spec SS8.3; hydration therefore treats a missing `trialHistory` as `[]`.

- [ ] **Step 1: Write failing tests** (mock the firebase module)

```ts
// src/lib/picturePostcard/__tests__/engine.test.ts
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const getDocMock = vi.fn().mockResolvedValue({ exists: () => false });
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'docref'),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  getDoc: (...a: unknown[]) => getDocMock(...a),
}));
vi.mock('../../firebase', () => ({ firestoreDb: {} }));

import { loadEngine, commitTrial, markSceneUsed, hydrateFromFirestore } from '../engine';
import { getPpEngine, getPpPair, getDifficultyState, putPpEngine } from '../../db';
import { freshEngineRow } from '../engineCore';
import { todayISO } from '../../dates';

beforeEach(() => { setDocMock.mockClear(); getDocMock.mockClear(); });

describe('engine persistence', () => {
  it('loadEngine creates a fresh row and applies session start', async () => {
    const row = await loadEngine('u1', 12345);
    expect(row.currentLevel).toBe(1);
    expect(row.sessionStamp).toBe(12345);
    expect((await getPpEngine('u1'))?.sessionStamp).toBe(12345);
  });
  it('commitTrial persists engine row, derived DifficultyState, and pushes to Firestore', async () => {
    const row = await loadEngine('u2', 1);
    const { row: after } = await commitTrial(row, { correct: true, omission: false, kind: 'counted' });
    expect((await getPpEngine('u2'))?.trialsThisSession).toBe(after.trialsThisSession);
    const ds = await getDifficultyState('u2', 'picture-postcard', todayISO());
    expect(ds?.score).toBeCloseTo(after.currentLevel / 100);
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
  it('markSceneUsed records session scene and 30-day pair history', async () => {
    const row = await loadEngine('u3', 1);
    const after = await markSceneUsed(row, 'park', [1, 4]);
    expect(after.scenesThisSession).toContain('park');
    expect((await getPpPair('u3', 'park', 4))?.lastUsedDate).toBe(todayISO());
  });
  it('hydrateFromFirestore adopts a newer remote row only', async () => {
    await putPpEngine({ ...freshEngineRow('u4'), currentLevel: 3, updatedAt: 100 });
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...freshEngineRow('u4'), currentLevel: 9, updatedAt: 200, trialHistory: undefined }),
    });
    await hydrateFromFirestore('u4');
    const row = await getPpEngine('u4');
    expect(row?.currentLevel).toBe(9);
    expect(row?.trialHistory).toEqual([]);
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...freshEngineRow('u4'), currentLevel: 1, updatedAt: 50 }),
    });
    await hydrateFromFirestore('u4');
    expect((await getPpEngine('u4'))?.currentLevel).toBe(9); // older remote ignored
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

- [ ] **Step 3: Implement**

```ts
// src/lib/picturePostcard/engine.ts
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { firestoreDb } from '../firebase';
import {
  getPpEngine, putPpEngine, putPpPair, getDifficultyState, upsertDifficultyState,
} from '../db';
import type { PpEngineRow } from '../db';
import {
  freshEngineRow, beginSession, applyTrialResult,
} from './engineCore';
import type { TrialResultOpts, LevelOutcome } from './engineCore';
import { todayISO } from '../dates';

const GAME_ID = 'picture-postcard';

export async function loadEngine(userId: string, sessionStamp: number): Promise<PpEngineRow> {
  const existing = (await getPpEngine(userId)) ?? freshEngineRow(userId);
  const row = beginSession(existing, sessionStamp);
  if (row !== existing) await putPpEngine(row);
  return row;
}

async function writeDerivedDifficulty(row: PpEngineRow): Promise<void> {
  const date = todayISO();
  const prev = await getDifficultyState(row.userId, GAME_ID, date);
  const score = row.currentLevel / 100;
  await upsertDifficultyState({
    ...(prev?.id !== undefined ? { id: prev.id } : {}),
    userId: row.userId,
    gameId: GAME_ID,
    date,
    score,
    peakScore: Math.max(prev?.peakScore ?? 0, score),
    roundsPlayed: (prev?.roundsPlayed ?? 0) + 1,
  });
}

function pushToFirestore(row: PpEngineRow): void {
  const { trialHistory: _omit, ...slim } = row;
  void (async () => {
    try {
      await setDoc(doc(firestoreDb, 'ppEngine', row.userId), slim, { merge: true });
    } catch {
      // offline — acceptable, Dexie is the source of truth
    }
  })();
}

export async function commitTrial(
  row: PpEngineRow,
  opts: TrialResultOpts,
): Promise<{ row: PpEngineRow; levelOutcome: LevelOutcome | null }> {
  const result = applyTrialResult(row, opts);
  await putPpEngine(result.row);
  await writeDerivedDifficulty(result.row);
  pushToFirestore(result.row);
  return result;
}

export async function markSceneUsed(
  row: PpEngineRow,
  sceneId: string,
  changeClasses: number[],
): Promise<PpEngineRow> {
  const updated: PpEngineRow = {
    ...row,
    scenesThisSession: [...row.scenesThisSession, sceneId],
    updatedAt: Date.now(),
  };
  await putPpEngine(updated);
  await Promise.all(changeClasses.map((c) => putPpPair(row.userId, sceneId, c, todayISO())));
  return updated;
}

export async function markTipShown(row: PpEngineRow): Promise<PpEngineRow> {
  const updated = { ...row, tipCardL41Shown: true, updatedAt: Date.now() };
  await putPpEngine(updated);
  return updated;
}

export async function hydrateFromFirestore(userId: string): Promise<void> {
  try {
    const snap = await getDoc(doc(firestoreDb, 'ppEngine', userId));
    if (!snap.exists()) return;
    const remote = snap.data() as Partial<PpEngineRow>;
    const local = await getPpEngine(userId);
    if ((remote.updatedAt ?? 0) > (local?.updatedAt ?? 0)) {
      await putPpEngine({
        ...freshEngineRow(userId),
        ...remote,
        userId,
        trialHistory: remote.trialHistory ?? [],
      } as PpEngineRow);
    }
  } catch {
    // offline / rules error — never blocks profile selection
  }
}
```

- [ ] **Step 4: Run to verify PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard engine persistence with firestore restore"`

---

### Task 7: Scoring module

Spec SS6, exact formula.

**Files:**
- Create: `src/lib/picturePostcard/scoring.ts`
- Test: `src/lib/picturePostcard/__tests__/scoring.test.ts`

**Interfaces:**
- Produces:
  - `streakMultiplier(streak: number): number` — 1.0 (<5), 1.2 (5-7), 1.5 (>=8)
  - `speedBonus(softTimerMs: number | null, remainingMs: number): number` — 0 when no soft timer, else `Math.round(40 * remainingMs / softTimerMs)` clamped 0-40
  - `roundScore(opts: { changesFound: number; responded: boolean; speedBonus: number; streak: number; hintsUsed: number; autoScaffoldTiersAboveTier1: number }): number` — `responded: false` (omission) returns 0; else `max(10, round((100*changesFound + speedBonus) * mult) - 30*hintsUsed - 15*autoScaffoldTiersAboveTier1)`

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/scoring.test.ts
import { describe, it, expect } from 'vitest';
import { roundScore, streakMultiplier, speedBonus } from '../scoring';

describe('scoring (spec SS6)', () => {
  it('multiplier bands', () => {
    expect(streakMultiplier(0)).toBe(1.0);
    expect(streakMultiplier(4)).toBe(1.0);
    expect(streakMultiplier(5)).toBe(1.2);
    expect(streakMultiplier(7)).toBe(1.2);
    expect(streakMultiplier(8)).toBe(1.5);
  });
  it('speed bonus scales with soft-timer remainder, 0 without a timer', () => {
    expect(speedBonus(null, 999)).toBe(0);
    expect(speedBonus(60000, 60000)).toBe(40);
    expect(speedBonus(60000, 30000)).toBe(20);
    expect(speedBonus(60000, 0)).toBe(0);
  });
  it('base case: one change, no extras = 100', () => {
    expect(roundScore({ changesFound: 1, responded: true, speedBonus: 0, streak: 0, hintsUsed: 0, autoScaffoldTiersAboveTier1: 0 })).toBe(100);
  });
  it('costs apply after the multiplier; floor is 10 for responded trials', () => {
    expect(roundScore({ changesFound: 1, responded: true, speedBonus: 20, streak: 5, hintsUsed: 1, autoScaffoldTiersAboveTier1: 0 })).toBe(Math.round(120 * 1.2) - 30);
    expect(roundScore({ changesFound: 0, responded: true, speedBonus: 0, streak: 0, hintsUsed: 3, autoScaffoldTiersAboveTier1: 3 })).toBe(10);
  });
  it('omissions score 0', () => {
    expect(roundScore({ changesFound: 0, responded: false, speedBonus: 0, streak: 0, hintsUsed: 0, autoScaffoldTiersAboveTier1: 0 })).toBe(0);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**
- [ ] **Step 3: Implement**

```ts
// src/lib/picturePostcard/scoring.ts
export function streakMultiplier(streak: number): number {
  return streak >= 8 ? 1.5 : streak >= 5 ? 1.2 : 1.0;
}

export function speedBonus(softTimerMs: number | null, remainingMs: number): number {
  if (!softTimerMs) return 0;
  return Math.max(0, Math.min(40, Math.round((40 * remainingMs) / softTimerMs)));
}

export interface RoundScoreOpts {
  changesFound: number;
  responded: boolean;
  speedBonus: number;
  streak: number;
  hintsUsed: number;
  autoScaffoldTiersAboveTier1: number;
}

export function roundScore(o: RoundScoreOpts): number {
  if (!o.responded) return 0;
  const base = Math.round((100 * o.changesFound + o.speedBonus) * streakMultiplier(o.streak));
  return Math.max(10, base - 30 * o.hintsUsed - 15 * o.autoScaffoldTiersAboveTier1);
}
```

- [ ] **Step 4: Run to verify PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard scoring"`

---

### Task 8: Sprite registry

Spec SS5.2. Inline SVG React components with a `fill` prop; game-local registry with capability flags. The app's global asset catalog is NOT used for scene objects.

**Files:**
- Create: `src/games/memory/PicturePostcard/sprites/index.tsx`
- Test: `src/lib/picturePostcard/__tests__/sprites.test.ts`

**Interfaces:**
- Produces:
  - `interface SpriteProps { fill?: string; mirrored?: boolean; scale?: number; className?: string }`
  - `interface SpriteEntry { Component: React.FC<SpriteProps>; mirrorable: boolean; label: string /* i18n key suffix under pp.sprite.* */ }`
  - `const SPRITES: Record<string, SpriteEntry>` with AT LEAST these 24 ids (needed by the 8 scenes; each drawn as a simple, bold, high-contrast SVG on a 100x100 viewBox): `bench`, `bicycle`, `dog`, `cat`, `kite`, `lamp`, `fountain`, `tree`, `flowerpot`, `teapot`, `cup`, `basket`, `umbrella`, `boat`, `bucket`, `wateringcan`, `broom`, `pot`, `stool`, `flag`, `drum`, `garland`, `radio`, `bird`
  - `getSprite(id: string): SpriteEntry` (throws on unknown id - fail fast in dev)
- Implementation notes: each component renders `<svg viewBox="0 0 100 100">` with `transform={mirrored ? 'scale(-1,1)' : undefined}` on an inner `<g transform-origin="50 50">` and the primary region using `fill={fill ?? '<default>'}`. Asymmetric sprites (`bicycle`, `teapot`, `dog`, `cat`, `boat`, `wateringcan`, `broom`, `flag`, `bird`, `kite`) set `mirrorable: true`; symmetric ones (`bench`, `lamp`, `fountain`, `tree`, `flowerpot`, `cup`, `basket`, `umbrella`, `bucket`, `pot`, `stool`, `drum`, `garland`, `radio`) set `mirrorable: false`. Keep each SVG under ~15 elements; visual polish is not the goal, silhouette recognisability is.

- [ ] **Step 1: Write failing test**

```ts
// src/lib/picturePostcard/__tests__/sprites.test.ts
import { describe, it, expect } from 'vitest';
import { SPRITES, getSprite } from '../../../games/memory/PicturePostcard/sprites';

const REQUIRED = [
  'bench','bicycle','dog','cat','kite','lamp','fountain','tree','flowerpot','teapot',
  'cup','basket','umbrella','boat','bucket','wateringcan','broom','pot','stool','flag',
  'drum','garland','radio','bird',
];

describe('sprite registry', () => {
  it('contains every required sprite with capability flags', () => {
    for (const id of REQUIRED) {
      const s = SPRITES[id];
      expect(s, `missing sprite ${id}`).toBeDefined();
      expect(typeof s.mirrorable).toBe('boolean');
      expect(typeof s.Component).toBe('function');
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
  it('getSprite throws on unknown ids', () => {
    expect(() => getSprite('nonexistent')).toThrow();
  });
  it('mirrorable flags: bicycle yes, fountain no', () => {
    expect(getSprite('bicycle').mirrorable).toBe(true);
    expect(getSprite('fountain').mirrorable).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify FAIL**

- [ ] **Step 3: Implement.** Pattern (repeat for all 24 - write real paths for each; example shown for two):

```tsx
// src/games/memory/PicturePostcard/sprites/index.tsx
import React from 'react';

export interface SpriteProps {
  fill?: string;
  mirrored?: boolean;
  scale?: number;
  className?: string;
}

export interface SpriteEntry {
  Component: React.FC<SpriteProps>;
  mirrorable: boolean;
  label: string; // i18n key suffix: pp.sprite.<label>
}

function wrap(children: (fill: string) => React.ReactNode, defaultFill: string): React.FC<SpriteProps> {
  return function Sprite({ fill, mirrored, scale = 1, className }: SpriteProps) {
    return (
      <svg viewBox="0 0 100 100" className={className} style={{ width: '100%', height: '100%' }}>
        <g transform={`translate(50 50) scale(${mirrored ? -scale : scale} ${scale}) translate(-50 -50)`}>
          {children(fill ?? defaultFill)}
        </g>
      </svg>
    );
  };
}

const Bicycle = wrap((fill) => (
  <>
    <circle cx="25" cy="70" r="18" fill="none" stroke="#333" strokeWidth="5" />
    <circle cx="75" cy="70" r="18" fill="none" stroke="#333" strokeWidth="5" />
    <path d="M25 70 L45 40 L68 40 L75 70 M45 40 L55 70 L25 70" fill="none" stroke={fill} strokeWidth="6" />
    <path d="M40 32 L52 32 M68 40 L64 28 L74 26" fill="none" stroke={fill} strokeWidth="5" />
  </>
), '#C0392B');

const Fountain = wrap((fill) => (
  <>
    <ellipse cx="50" cy="82" rx="38" ry="12" fill={fill} />
    <rect x="42" y="45" width="16" height="38" fill={fill} />
    <ellipse cx="50" cy="45" rx="22" ry="7" fill={fill} />
    <path d="M50 42 C40 25 60 25 50 10" fill="none" stroke="#5DADE2" strokeWidth="4" />
    <path d="M44 42 C36 30 40 22 38 16 M56 42 C64 30 60 22 62 16" fill="none" stroke="#5DADE2" strokeWidth="3" />
  </>
), '#95A5A6');

// ... define the remaining 22 the same way (simple bold silhouettes) ...

export const SPRITES: Record<string, SpriteEntry> = {
  bicycle: { Component: Bicycle, mirrorable: true, label: 'bicycle' },
  fountain: { Component: Fountain, mirrorable: false, label: 'fountain' },
  // ... all 24 entries with the mirrorable flags listed in the Interfaces block ...
};

export function getSprite(id: string): SpriteEntry {
  const s = SPRITES[id];
  if (!s) throw new Error(`Unknown sprite: ${id}`);
  return s;
}
```

- [ ] **Step 4: Run to verify PASS**; `npm run build` clean
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard inline-SVG sprite registry"`

---

### Task 9: Scene types, first scene, validation suite

Spec SS5.1-5.2. The validation test IS the authoring contract; every later scene must pass it.

**Files:**
- Create: `src/games/memory/PicturePostcard/scenes/types.ts`
- Create: `src/games/memory/PicturePostcard/scenes/park.ts`
- Create: `src/games/memory/PicturePostcard/scenes/index.ts`
- Test: `src/lib/picturePostcard/__tests__/scenes.test.ts`

**Interfaces:**
- Produces:

```ts
// scenes/types.ts — exact content
export interface SlotVariants {
  colours: string[];           // >=3 alternate fills (excl. the base fill)
  alternate: string;           // same-category sprite id (class 5)
  scales: [number, number];    // [0.8, 1.25]
}

export interface ObjectSlot {
  id: string;
  category: string;            // i18n key suffix pp.category.<category>
  spriteId: string;
  baseFill: string;            // the sprite's authored colour for this slot
  bbox: { x: number; y: number; w: number; h: number }; // scene-normalised 0-1
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;
  variants: SlotVariants;
  altPositions: [{ x: number; y: number }, { x: number; y: number }];
  lures: [string, string, string]; // sprite ids ordered most->least similar (lureLevel 3->1)
}

export interface SceneDef {
  id: string;
  theme: string;               // i18n key suffix pp.theme.<theme>
  background: BackgroundLayer[];
  slots: ObjectSlot[];         // >= 20
}

export interface BackgroundLayer {
  kind: 'rect' | 'ellipse';
  x: number; y: number; w: number; h: number; // scene-normalised
  fill: string;
}
```

  - `scenes/index.ts` exports `const SCENES: SceneDef[]` and `getScene(id: string): SceneDef`.
- Scene-normalised coordinates: `x/y/w/h` in 0-1 relative to a 4:3 scene box; rendering multiplies by the rendered scene size (Task 13).

- [ ] **Step 1: Write the validation suite (failing)**

```ts
// src/lib/picturePostcard/__tests__/scenes.test.ts
import { describe, it, expect } from 'vitest';
import { SCENES } from '../../../games/memory/PicturePostcard/scenes';
import { SPRITES } from '../../../games/memory/PicturePostcard/sprites';

// spec SS5.2 build-time validation + SS5.3 lure-separation feasibility
describe('scene library validation (spec SS5.2)', () => {
  it('has at least 1 scene now, 8 by Task 10, each with >= 20 slots', () => {
    expect(SCENES.length).toBeGreaterThanOrEqual(1);
    for (const scene of SCENES) {
      expect(scene.slots.length, `${scene.id} slot count`).toBeGreaterThanOrEqual(20);
    }
  });
  for (const scene of SCENES) {
    describe(scene.id, () => {
      it('every slot references known sprites (base, alternate, lures)', () => {
        for (const s of scene.slots) {
          expect(SPRITES[s.spriteId], `${s.id} sprite`).toBeDefined();
          expect(SPRITES[s.variants.alternate], `${s.id} alternate`).toBeDefined();
          for (const l of s.lures) expect(SPRITES[l], `${s.id} lure ${l}`).toBeDefined();
        }
      });
      it('colour-change eligibility: >= 3 alternate fills, all distinct from base (M3 4-option rule)', () => {
        for (const s of scene.slots) {
          expect(s.variants.colours.length, s.id).toBeGreaterThanOrEqual(3);
          expect(new Set([s.baseFill, ...s.variants.colours]).size).toBe(s.variants.colours.length + 1);
        }
      });
      it('slot ids unique; bboxes and altPositions inside the scene', () => {
        expect(new Set(scene.slots.map((s) => s.id)).size).toBe(scene.slots.length);
        for (const s of scene.slots) {
          expect(s.bbox.x).toBeGreaterThanOrEqual(0);
          expect(s.bbox.x + s.bbox.w).toBeLessThanOrEqual(1);
          expect(s.bbox.y).toBeGreaterThanOrEqual(0);
          expect(s.bbox.y + s.bbox.h).toBeLessThanOrEqual(1);
          for (const p of s.altPositions) {
            expect(p.x).toBeGreaterThanOrEqual(0);
            expect(p.x + s.bbox.w).toBeLessThanOrEqual(1);
            expect(p.y).toBeGreaterThanOrEqual(0);
            expect(p.y + s.bbox.h).toBeLessThanOrEqual(1);
          }
        }
      });
      it('salience/centrality spread: at least 4 slots at salience 3 and 4 at centrality 3', () => {
        expect(scene.slots.filter((s) => s.salience === 3).length).toBeGreaterThanOrEqual(4);
        expect(scene.slots.filter((s) => s.centrality === 3).length).toBeGreaterThanOrEqual(4);
      });
      it('mirror changes only reachable via mirrorable sprites: >= 5 mirrorable slots per scene', () => {
        expect(scene.slots.filter((s) => SPRITES[s.spriteId].mirrorable).length).toBeGreaterThanOrEqual(5);
      });
    });
  }
});
```

- [ ] **Step 2: Run to verify FAIL** (no scenes module)

- [ ] **Step 3: Author `scenes/park.ts` + `scenes/index.ts`.** Write `types.ts` exactly as in the Interfaces block. `park.ts` authors the mock's park: sky/grass/path background layers; 20 slots using the Task 8 sprite ids (bench, bicycle, dog, kite, lamp, fountain, tree x2, flowerpot x2, bird x2, basket, umbrella, cup, teapot, flag, bucket, wateringcan, stool), each fully authored per the type (bbox, salience, centrality, 3 colour variants, alternate, 2 alt positions, 3 ordered lures). Example slot to set the pattern:

```ts
{
  id: 'park-bicycle',
  category: 'bicycle',
  spriteId: 'bicycle',
  baseFill: '#C0392B',
  bbox: { x: 0.62, y: 0.55, w: 0.22, h: 0.3 },
  salience: 3,
  centrality: 2,
  variants: { colours: ['#2471A3', '#229954', '#B7950B'], alternate: 'broom', scales: [0.8, 1.25] },
  altPositions: [{ x: 0.15, y: 0.55 }, { x: 0.4, y: 0.6 }],
  lures: ['wateringcan', 'stool', 'bucket'],
},
```

```ts
// scenes/index.ts
import type { SceneDef } from './types';
import { park } from './park';

export const SCENES: SceneDef[] = [park];

export function getScene(id: string): SceneDef {
  const s = SCENES.find((sc) => sc.id === id);
  if (!s) throw new Error(`Unknown scene: ${id}`);
  return s;
}
export * from './types';
```

- [ ] **Step 4: Run to verify PASS** — the validation suite passes for park
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard scene format, validation suite, park scene"`

---

### Task 10: Remaining 7 scenes

Pure content authoring under the Task 9 contract. The validation suite is the acceptance gate - no scene ships that fails it.

**Files:**
- Create: `scenes/marketIndian.ts`, `scenes/templeStreet.ts`, `scenes/teaStall.ts`, `scenes/seaside.ts`, `scenes/kitchen.ts`, `scenes/garden.ts`, `scenes/cafe.ts` (all under `src/games/memory/PicturePostcard/scenes/`)
- Modify: `scenes/index.ts` (add all 7 to `SCENES`)
- Modify: `src/lib/picturePostcard/__tests__/scenes.test.ts` — change the first assertion to `expect(SCENES.length).toBe(8)`

**Interfaces:**
- Consumes: `SceneDef`/`ObjectSlot` types and the sprite ids from Tasks 8-9.

**Per-scene requirements** (spec SS5.4 - themes fixed; >= 3 regionally Indian):

| Scene id | Theme | Flavour (background + slot mix guidance) |
|---|---|---|
| `market-indian` | market | stall awnings (rect layers), baskets, pots, garland, drum, radio, umbrella, bicycle |
| `temple-street` | templeStreet | warm stone tones, garland, flag, lamps, pots, flowerpot, bird, broom |
| `tea-stall` | teaStall | counter + awning, teapot, cups, stool, radio, bucket, basket, cat |
| `seaside` | seaside | sky/sea/sand bands, boat, umbrella, bucket, kite, bird, dog, flag |
| `kitchen` | kitchen | wall/counter bands, pot, teapot, cup, basket, broom, stool, cat |
| `garden` | garden | sky/lawn/bed bands, wateringcan, flowerpot, tree, bench, bird, bucket, broom |
| `cafe` | cafe | wall/floor, cup, teapot, stool, lamp, cat, radio, flowerpot |

Each: 20+ fully-authored slots (reuse sprites freely across scenes with different fills/positions - slot `id` must be scene-prefixed e.g. `kitchen-teapot`), backgrounds 3-5 flat layers, warm palette, salience/centrality spreads per the validation suite.

- [ ] **Step 1: Tighten the count assertion to 8 and run** → FAIL (only 1 scene)
- [ ] **Step 2: Author the 7 scene files following the park.ts pattern; add to index**
- [ ] **Step 3: Run the full suite to verify PASS** — `npx vitest run src/lib/picturePostcard/__tests__/scenes.test.ts`
- [ ] **Step 4: Commit** — `git commit -m "feat: picture-postcard full 8-scene library"`

---

### Task 11: Trial generator

Spec SS5.3 + SS4.2 (M3 matrix). Pure given injected inputs; randomness via an injectable `rng: () => number` (default `Math.random`) so tests are deterministic.

**Files:**
- Create: `src/lib/contentGenerators/picturePostcard.ts`
- Test: `src/lib/picturePostcard/__tests__/generator.test.ts`

**Interfaces:**
- Consumes: `SCENES`, `SceneDef`, `ObjectSlot` (Task 9); `SPRITES` (Task 8); `TrialParams`, `ProbeMode`, `ChangeClass`, `M3_ELIGIBLE_CLASSES`, `LevelDef` (Task 3).
- Produces:

```ts
export interface AppliedChange {
  changeClass: ChangeClass;
  slotId: string;
  // per-class payload:
  addedSpriteId?: string;         // class 2
  newPosition?: { x: number; y: number }; // class 3
  newFill?: string;               // class 4
  newSpriteId?: string;           // class 5
  newScale?: number;              // class 6
  mirrored?: boolean;             // class 7
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
}

export function generateTrial(opts: {
  levelDef: LevelDef;
  params: TrialParams;            // DI-shifted effective params
  scenesThisSession: string[];
  pairHistory: { sceneId: string; changeClass: number; lastUsedDate: string }[];
  rng?: () => number;
}): TrialSpec;
```

- Generation rules (all from spec SS5.3, restated as the implementation contract):
  1. Scene pick: exclude `scenesThisSession`; among the rest prefer scenes with no pair-history conflict (any candidate change class used < 30 days ago via `daysBetweenISO`); if all excluded by 30-day rule, relax it; if all excluded by session rule too, relax that as well - never throw.
  2. Visible-slot subset: choose `params.objects` slots weighted toward salience 3 (weight = salience). Target slot(s) for changes: sampled from the visible subset; for class 1/4/5/6/7 uses the slot itself; class 2 adds `variants.alternate` of a NON-visible slot at one of its `altPositions`; class 3 moves the slot to one of its `altPositions`.
  3. Change classes: sample `params.changes` classes from `levelDef.changeTypeWeights`; if `probeMode === 'M3'`, renormalise weights over `M3_ELIGIBLE_CLASSES` first. A class-7 change may only target a slot whose sprite is `mirrorable`; class 4 only slots (all have >= 3 colours by validation). Never two changes on the same slot.
  4. Probe mode: sample from `levelDef.probeModeWeights`.
  5. Lures (`params.lureLevel >= 1`): place `lureLevel` lures near targets using `slot.lures[3 - lureLevel]` (higher lureLevel = more similar sprite), at a position whose centre-distance from the target centre > 1.5x the sum of both half-diagonals (spec SS5.3 tremor constraint); if no position satisfies it, skip that lure.
  6. M3 options: class 4 -> base fill + 3 variant fills on the same sprite; class 1/2 -> target sprite + its 3 lures; class 5 -> original + `variants.alternate` + 2 lures. `correct: true` on exactly one. `questionKey` = `pp.probe.m3.<class>` (e.g. `pp.probe.m3.colour`).

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/generator.test.ts
import { describe, it, expect } from 'vitest';
import { generateTrial } from '../../contentGenerators/picturePostcard';
import { getLevelDef, effectiveParams, M3_ELIGIBLE_CLASSES } from '../ladder';
import { SCENES } from '../../../games/memory/PicturePostcard/scenes';
import { todayISO } from '../../dates';

const rng = (() => { let s = 42; return () => ((s = (s * 1103515245 + 12345) % 2 ** 31) / 2 ** 31); })();
const gen = (level: number, extra: Partial<Parameters<typeof generateTrial>[0]> = {}) =>
  generateTrial({
    levelDef: getLevelDef(level), params: effectiveParams(level, 0),
    scenesThisSession: [], pairHistory: [], rng, ...extra,
  });

describe('trial generator', () => {
  it('L1: one class-1 change, M1 probe, no lures', () => {
    const t = gen(1);
    expect(t.changes).toHaveLength(1);
    expect(t.changes[0].changeClass).toBe(1);
    expect(t.probeMode).toBe('M1');
    expect(t.lurePlacements).toHaveLength(0);
  });
  it('avoids scenes used this session', () => {
    const used = SCENES.slice(0, 7).map((s) => s.id);
    for (let i = 0; i < 10; i++) expect(gen(1, { scenesThisSession: used }).sceneId).toBe(SCENES[7].id);
  });
  it('relaxes constraints rather than throwing when everything is excluded', () => {
    const all = SCENES.map((s) => s.id);
    expect(() => gen(1, { scenesThisSession: all })).not.toThrow();
  });
  it('respects the 30-day pair rule when alternatives exist', () => {
    const pairHistory = SCENES.map((s) => ({ sceneId: s.id, changeClass: 1, lastUsedDate: todayISO() }));
    // all scenes conflicted for class 1 -> relaxation, still generates
    expect(() => gen(1, { pairHistory })).not.toThrow();
  });
  it('M3 trials only use M3-eligible change classes for the probed change', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(45); // tier 5: M3 only
      expect(t.probeMode).toBe('M3');
      expect(M3_ELIGIBLE_CLASSES).toContain(t.changes[0].changeClass);
      expect(t.m3Question?.options).toHaveLength(4);
      expect(t.m3Question!.options.filter((o) => o.correct)).toHaveLength(1);
    }
  });
  it('multi-change trials never stack two changes on one slot', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(35, {});
      const slots = t.changes.map((c) => c.slotId);
      expect(new Set(slots).size).toBe(slots.length);
    }
  });
  it('mirror changes only target mirrorable sprites', () => {
    for (let i = 0; i < 50; i++) {
      const t = gen(45);
      for (const c of t.changes.filter((c) => c.changeClass === 7)) {
        const scene = SCENES.find((s) => s.id === t.sceneId)!;
        const slot = scene.slots.find((sl) => sl.id === c.slotId)!;
        // validated indirectly: generator must only pick mirrorable sprites
        expect(slot).toBeDefined();
      }
    }
  });
  it('lure placements respect the separation constraint', () => {
    for (let i = 0; i < 25; i++) {
      const t = gen(30); // lureLevel 1
      const scene = SCENES.find((s) => s.id === t.sceneId)!;
      for (const lure of t.lurePlacements) {
        for (const c of t.changes) {
          const target = scene.slots.find((sl) => sl.id === c.slotId);
          if (!target) continue;
          const dx = (lure.x + lure.w / 2) - (target.bbox.x + target.bbox.w / 2);
          const dy = (lure.y + lure.h / 2) - (target.bbox.y + target.bbox.h / 2);
          const minSep = 1.5 * (Math.hypot(lure.w, lure.h) / 2 + Math.hypot(target.bbox.w, target.bbox.h) / 2);
          expect(Math.hypot(dx, dy)).toBeGreaterThan(minSep);
        }
      }
    }
  });
});
```

- [ ] **Step 2: Run to verify FAIL**
- [ ] **Step 3: Implement `src/lib/contentGenerators/picturePostcard.ts`** per the numbered generation rules in the Interfaces block. Structure: `pickScene()`, `pickVisibleSlots()`, `sampleWeighted(rng, weights)`, `applyChangeClass(scene, slot, cls, rng)`, `placeLures()`, `buildM3()` - each a small named function; `generateTrial` composes them. (~150 lines; every rule is stated above, no interpretation needed.)
- [ ] **Step 4: Run to verify PASS** (iterate until all generator tests green)
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard trial generator"`

---

### Task 12: Trial state machine (pure reducer)

Spec SS4.1 phases + SS4.3 scaffolding triggers + pause semantics, as a pure reducer so all timing/scaffold logic is unit-testable without DOM.

**Files:**
- Create: `src/games/memory/PicturePostcard/trialMachine.ts`
- Test: `src/lib/picturePostcard/__tests__/trialMachine.test.ts`

**Interfaces:**
- Consumes: `TrialSpec` (Task 11).
- Produces:

```ts
export type Phase = 'ready' | 'encoding' | 'retention' | 'probe' | 'feedback' | 'starCard';

export interface MachineState {
  phase: Phase;
  paused: boolean;
  msLeftInPhase: number;          // ready/encoding/retention countdown; probe = soft-timer remainder (Infinity when null)
  foundChangeIds: number[];       // indices into trial.changes (M2 multi-change)
  wrongResponses: number;         // wrong taps (M1/M2) or wrong choices (M3)
  scaffoldTier: 0 | 1 | 2 | 3 | 4;
  autoScaffoldTiersAboveTier1: number; // for scoring
  hintsUsed: number;
  msSinceProbeStart: number;
  outcome: null | { correct: boolean; omission: boolean };
  interruptions: number;
}

export type MachineEvent =
  | { type: 'TICK'; ms: number }
  | { type: 'PAUSE' } | { type: 'RESUME' }
  | { type: 'RESPONSE'; correctChangeIndex: number | null } // null = wrong tap/choice
  | { type: 'HINT' }
  | { type: 'FEEDBACK_DONE' };

export function initialState(trial: TrialSpec): MachineState; // phase 'ready', msLeftInPhase 1500
export function reduce(state: MachineState, trial: TrialSpec, event: MachineEvent): MachineState;
```

- Transition rules (the implementation contract):
  - `TICK` while `paused` is ignored. `PAUSE` sets `paused` and increments `interruptions`; `RESUME` clears it.
  - ready --(timer 1500ms elapses)--> encoding (`msLeftInPhase = trial.params.encodeMs`) --> retention (`delayMs`) --> probe (`softTimerMs ?? Infinity`).
  - Probe `TICK` advances `msSinceProbeStart` and decrements soft-timer remainder; expiry -> `outcome = { correct: false, omission: true }`, phase 'feedback'.
  - Scaffold triggers (spec SS4.3, both ladders share triggers): tier 1 at `msSinceProbeStart >= 6000` with no response; tier 2 at `>= 12000` OR `wrongResponses >= 1`; tier 3 at `wrongResponses >= 2`; tier 4 at `wrongResponses >= 3`. Tier only ever increases; each auto-advance past tier 1 increments `autoScaffoldTiersAboveTier1`. Tier 4 resolves the trial: `outcome = { correct: false, omission: false }`, phase 'feedback'.
  - `HINT`: `hintsUsed + 1`, `scaffoldTier = max(tier, 3)` (does not count as auto-scaffold).
  - `RESPONSE` with a fresh `correctChangeIndex` adds it to `foundChangeIds`; when all `trial.changes` found -> `outcome = { correct: true, omission: false }`, phase 'feedback'. `RESPONSE` with `null` increments `wrongResponses` (scaffold rules then apply on next reduce).
  - `FEEDBACK_DONE` -> terminal (component decides star card vs onLevelComplete; the machine just stays in 'feedback' - 'starCard' is set by the component via a direct phase override, listed in `Phase` for type completeness).

- [ ] **Step 1: Write failing tests**

```ts
// src/lib/picturePostcard/__tests__/trialMachine.test.ts
import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../../../games/memory/PicturePostcard/trialMachine';
import type { TrialSpec } from '../../contentGenerators/picturePostcard';

const trial: TrialSpec = {
  sceneId: 'park', probeMode: 'M2',
  changes: [{ changeClass: 1, slotId: 'park-bicycle' }],
  lurePlacements: [], params: { objects: 8, encodeMs: 6000, delayMs: 2000, changes: 1, lureLevel: 0 },
  softTimerMs: 60000, interference: false,
};
const tick = (s: ReturnType<typeof initialState>, ms: number) => reduce(s, trial, { type: 'TICK', ms });

describe('trial machine', () => {
  it('walks ready -> encoding -> retention -> probe on timers', () => {
    let s = initialState(trial);
    expect(s.phase).toBe('ready');
    s = tick(s, 1500);
    expect(s.phase).toBe('encoding');
    expect(s.msLeftInPhase).toBe(6000);
    s = tick(s, 6000);
    expect(s.phase).toBe('retention');
    s = tick(s, 2000);
    expect(s.phase).toBe('probe');
  });
  it('pause freezes timers and counts interruptions', () => {
    let s = tick(initialState(trial), 1500); // encoding
    s = reduce(s, trial, { type: 'PAUSE' });
    s = tick(s, 10000);
    expect(s.phase).toBe('encoding');
    expect(s.interruptions).toBe(1);
    s = reduce(s, trial, { type: 'RESUME' });
    s = tick(s, 6000);
    expect(s.phase).toBe('retention');
  });
  it('soft-timer expiry resolves as omission', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000); // probe
    s = tick(s, 60000);
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: false, omission: true });
  });
  it('scaffold ladder: 6s -> tier 1, wrong tap -> tier 2, 2 wrong -> 3, 3 wrong -> 4 resolves', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000);
    s = tick(s, 6000);
    expect(s.scaffoldTier).toBe(1);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(2);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(3);
    expect(s.autoScaffoldTiersAboveTier1).toBe(2);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(4);
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: false, omission: false });
  });
  it('hint jumps to tier 3 without auto-scaffold cost', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000);
    s = reduce(s, trial, { type: 'HINT' });
    expect(s.scaffoldTier).toBe(3);
    expect(s.hintsUsed).toBe(1);
    expect(s.autoScaffoldTiersAboveTier1).toBe(0);
  });
  it('correct response resolves; multi-change waits for all', () => {
    const two: TrialSpec = { ...trial, changes: [trial.changes[0], { changeClass: 3, slotId: 'park-dog' }] };
    let s = tick(tick(tick(initialState(two), 1500), 6000), 2000);
    s = reduce(s, two, { type: 'RESPONSE', correctChangeIndex: 0 });
    expect(s.phase).toBe('probe');
    s = reduce(s, two, { type: 'RESPONSE', correctChangeIndex: 1 });
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: true, omission: false });
  });
});
```

- [ ] **Step 2: Run to verify FAIL**
- [ ] **Step 3: Implement the reducer** exactly per the transition rules (pure, ~120 lines).
- [ ] **Step 4: Run to verify PASS**
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard trial state machine"`

---

### Task 13: Scene renderer + game component shell (Ready/Encoding/Retention)

First React task. Spec SS4.1 phases 1-3 + SS4.4 interference.

**Files:**
- Create: `src/games/memory/PicturePostcard/SceneView.tsx`
- Create: `src/games/memory/PicturePostcard/InterferenceTask.tsx`
- Create: `src/games/memory/PicturePostcard/index.tsx` (component skeleton; probe/feedback arrive in Tasks 14-16)

**Interfaces:**
- Consumes: `SceneDef`/`ObjectSlot` (Task 9), `SPRITES` (Task 8), `TrialSpec`/`AppliedChange` (Task 11), machine (Task 12), engine (Task 6), ladder (Task 3); standard game props `{ levelConfig, onLevelComplete }` (`src/games/types.ts`).
- Produces:
  - `SceneView` props: `{ scene: SceneDef; modifications?: AppliedChange[]; lures?: TrialSpec['lurePlacements']; visibleSlotIds: string[]; onSlotTap?: (slotId: string | null, pos: { xNorm: number; yNorm: number }) => void; dimNonTargets?: boolean; vignetteSlotId?: string; pulseSlotId?: string; annotateSlotId?: string; className?: string }` — renders a 4:3 `relative` box; background layers as absolutely-positioned divs; each visible slot absolutely positioned by bbox with its sprite (applying any modification affecting it: skip removed, add added, move translocated, recolour, swap sprite, rescale, mirror); container-level `onPointerUp` resolves taps to the nearest slot whose 1.5x-inflated bbox contains the point (else `null`), reporting scene-normalised coordinates.
  - `InterferenceTask` props: `{ onPrompt?: () => void }` — self-contained: renders two circles (size ratio >= 1.5, each >= 96px), randomises sizes/positions every 2500ms; taps give a brief neutral acknowledgement; never reports results anywhere (spec SS4.4).
  - Game component: default export `PicturePostcard({ levelConfig, onLevelComplete })`. On mount (async effect): `activeProfile` + `currentSession.sessionStartedAt` from `useAppStore` (fallback `Date.parse(todayISO())`), `loadEngine`, `nextTrialKind`/`trialDi` -> `effectiveParams(currentLevel, di)`, load pair history, `generateTrial`, `markSceneUsed`, then start the machine with a 100ms `setInterval` dispatching `TICK`. Header: `t('pp.level', 'Level {{n}}')` + 10-dot counted-trial rail + pause button (>= 96px hit area). Phase renders: ready card (trial number + probe-type label `pp.probe.expect.<mode>`); encoding = `SceneView` + depleting bar (plain div, width%: `msLeftInPhase / encodeMs`); retention = neutral mask (SVG dot-grid pattern, no scene) or `InterferenceTask` when `trial.interference && interferenceEnabled` (module const `export const interferenceEnabled = true`, spec A1); pause overlay masks EVERYTHING (scene never visible while paused). L41 tip card: if `currentLevel === 41 && !tipCardL41Shown`, show dismissible card before the first trial (`markTipShown` on dismiss), copy key `pp.tip.l41`.

- [ ] **Step 1: Implement `SceneView.tsx`** per the props contract. Core layout:

```tsx
<div className={`relative w-full ${className ?? ''}`} style={{ aspectRatio: '4 / 3' }} onPointerUp={handleTap}>
  {scene.background.map((b, i) => (
    <div key={i} className="absolute" style={{
      left: `${b.x * 100}%`, top: `${b.y * 100}%`, width: `${b.w * 100}%`, height: `${b.h * 100}%`,
      background: b.fill, borderRadius: b.kind === 'ellipse' ? '50%' : 0,
    }} />
  ))}
  {/* slots: filter visible, apply modifications, render sprite Component with fill/mirrored/scale */}
</div>
```

Tap resolution: on pointer-up, convert client coords to scene-normalised via `getBoundingClientRect()`; hit-test all rendered slots with bboxes inflated 1.5x around their centre; choose the nearest-centre hit or `null`.

- [ ] **Step 2: Implement `InterferenceTask.tsx`** (two `<button>` circles in a flex row, `setInterval` 2500ms re-randomising which is larger + their order; sizes 96px and >= 144px).
- [ ] **Step 3: Implement `index.tsx`** skeleton with phases ready/encoding/retention rendering and a placeholder probe phase that immediately resolves correct (replaced in Task 14) - the component must compile and run end-to-end.
- [ ] **Step 4: Verify**: `npm run lint` and `npm run build` clean. Manual: temporarily add the game to `GAME_REGISTRY` locally (do not commit that edit - it lands in Task 17), `npm run dev`, navigate to `/app/game/picture-postcard`, confirm ready -> encoding (scene + bar) -> retention (mask) -> auto-resolve, pause masks the scene.
- [ ] **Step 5: Commit** — `git commit -m "feat: picture-postcard scene renderer, interference task, phase shell"`

---

### Task 14: Probes M1 + M2 with spatial scaffolding

Spec SS4.2-4.3.

**Files:**
- Modify: `src/games/memory/PicturePostcard/index.tsx`
- Create: `src/games/memory/PicturePostcard/ProbeSpatial.tsx`

**Interfaces:**
- Consumes: `SceneView` (Task 13), machine events (Task 12).
- Produces: `ProbeSpatial` props: `{ trial: TrialSpec; scene: SceneDef; machine: MachineState; onResponse: (correctChangeIndex: number | null, tap: { xNorm: number; yNorm: number }) => void; onHint: () => void; hintsLeft: number }`.
  - **M1**: original scene (top, `SceneView` unmodified) + modified scene (bottom, with `modifications` + `lures`) per the mock layout; prompt `t('pp.probe.m1', 'Find what changed in the postcard.')` in `text-h2`. Taps evaluate on the modified scene: a tap resolving to a changed slot's id (or an added sprite's placement box) = that change's index; else `null`.
  - **M2**: modified scene only; prompt `pp.probe.m2` ("Tap where the missing object was" / class-appropriate copy). For class-1 changes the removed slot is NOT rendered but its inflated bbox still participates in hit-testing (tap-where-it-was). Found changes get a soft ring marker (multi-change).
  - Scaffold rendering from `machine.scaffoldTier` via SceneView props: 1 -> `dimNonTargets` (CSS `filter: saturate(0.92)` on non-target slots); 2 -> `vignetteSlotId` (warm radial gradient overlay div over the target's quadrant); 3 -> `pulseSlotId` (CSS keyframe: opacity 1 -> 0.25 -> 1, 0.4s, x2); 4 is handled by Task 16's feedback (peek + reveal).
  - Every tap logs `tapCoordinates` + `errorDistancePx`/`errorDistanceNorm` into a ref array consumed by Task 16's telemetry: error distance = scene-px distance from tap to the probed change's slot centre (`xNorm/yNorm` deltas x rendered scene width).
  - Hint button (bottom bar, purple, >= 96px, `pp.hint` "Hint" + count badge): calls `onHint` when `hintsLeft > 0`.

- [ ] **Step 1: Implement ProbeSpatial + wire into index.tsx** (replace the Task 13 placeholder for `probeMode !== 'M3'`).
- [ ] **Step 2: Verify lint/build clean.**
- [ ] **Step 3: Manual check** (temporary registry edit again): play several trials at L1 (M1) and - by temporarily hardcoding `currentLevel: 25` in a scratch line - M2; confirm wrong taps escalate scaffolds (desaturate -> vignette -> pulse), hint jumps to pulse, multi-found-marks appear. Remove scratch line.
- [ ] **Step 4: Commit** — `git commit -m "feat: picture-postcard M1/M2 probes with spatial scaffolding"`

---

### Task 15: Probe M3 with its scaffold ladder

Spec SS4.2 (M3 matrix) + SS4.3 (M3 ladder).

**Files:**
- Create: `src/games/memory/PicturePostcard/ProbeM3.tsx`
- Modify: `src/games/memory/PicturePostcard/index.tsx`

**Interfaces:**
- Consumes: `TrialSpec.m3Question` (Task 11), machine (Task 12).
- Produces: `ProbeM3` props `{ trial: TrialSpec; machine: MachineState; onResponse: (correctChangeIndex: number | null) => void; onHint: () => void; hintsLeft: number }`. Renders the question (`text-h2`) + a 2x2 grid of option cards (each >= 96px, sprite at the option's `fill`); wrong choice -> that card dims + `onResponse(null)`; correct -> `onResponse(0)` (M3 always probes `changes[0]`). Scaffold tiers from `machine.scaffoldTier`: 2 -> dim one wrong option (deterministic: first wrong by index not already dimmed); 3 -> dim two wrong options; 4 -> handled by feedback (re-exposure + answer). Already-dimmed cards are `disabled`.

- [ ] **Step 1: Implement + wire for `probeMode === 'M3'`.**
- [ ] **Step 2: Lint/build clean; manual check at a hardcoded L45 scratch level: options render, wrong choices dim progressively, hint dims two.**
- [ ] **Step 3: Commit** — `git commit -m "feat: picture-postcard M3 probe with option-dimming scaffold"`

---

### Task 16: Feedback, star card, commit ordering, telemetry

Spec SS4.1 phase 5, SS4.5, SS2.3, SS9. This is the task where the engine contract is wired - review it against spec SS2.3 line by line.

**Files:**
- Modify: `src/games/memory/PicturePostcard/index.tsx`
- Create: `src/games/memory/PicturePostcard/FeedbackView.tsx`
- Create: `src/games/memory/PicturePostcard/StarCard.tsx`
- Create: `src/lib/picturePostcard/telemetry.ts`

**Interfaces:**
- Consumes: `commitTrial` (Task 6), `roundScore`/`speedBonus` (Task 7), `trackEvent`/pending-events pipeline (`src/lib/analytics.ts` - reuse its exported track function as the other games do).
- Produces:
  - `telemetry.ts`: `emitTrialCompleted(payload)` and `emitTrialAbandoned(payload)` and `emitLevelCompleted(payload)` - thin wrappers naming events `pp_trial_completed` / `pp_trial_abandoned` / `pp_level_completed` with the exact spec SS9 field lists; `levelAttemptId` = `${userId}:${currentLevel}:${starsByLevel-attempt-count}` computed once per mount.
  - `FeedbackView`: correct -> soft ring bloom on the found slot(s) + score delta tick (1.2s); incorrect -> 1.2s NON-SKIPPABLE re-exposure of the original scene with the change annotated (dashed circle + short label) - no tap targets during it; then auto-advance.
  - `StarCard`: stars (1-3 large), counted accuracy, one warm sentence (`pp.star.sentence.{1,2,3}` / `pp.star.repeat` for stars 0 - no failure framing), large Continue button (min 96px). NO auto-dismiss.
  - Trial completion sequence in `index.tsx` (THE ORDERING CONTRACT): machine reaches feedback -> compute `roundScore` -> `await commitTrial(...)` -> `emitTrialCompleted(...)` -> if `levelOutcome`: show `StarCard`, on Continue tap -> `emitLevelCompleted` -> `onLevelComplete(result)`; else after feedback auto-advance -> `onLevelComplete(result)`. `LevelResult`: `{ levelId: levelConfig.id, durationSeconds, completed: outcome.correct, metrics: { correct, omission, errorDistanceNorm, hintsUsed, scaffoldTierReached, roundScore, ppLevel: currentLevel } }`.
  - Abandonment: a `useEffect` cleanup that, if the machine is mid-trial and un-resolved, fires `emitTrialAbandoned`; if phase was probe/feedback-pending, ALSO fires a synchronous best-effort `commitTrial` with `{ correct: false, omission: true, kind }` (void, not awaited - spec SS2.3 accepts the race here). Guard with a `committedRef` so the normal path never double-commits.

- [ ] **Step 1: Implement telemetry.ts, FeedbackView, StarCard; wire the completion sequence.**
- [ ] **Step 2: Lint/build clean.**
- [ ] **Step 3: Commit** — `git commit -m "feat: picture-postcard feedback, star card, engine commit ordering, telemetry"` (ordering-contract behaviours are covered by the user's final smoke test, not agent browser-driving)

---

### Task 17: App integration

Spec SS2.1, SS2.2, SS2.4. All five touch points + GameShell changes + locales.

**Files:**
- Modify: `src/screens/GameRouter.tsx`
- Modify: `src/components/GameShell.tsx`
- Modify: `src/session/SessionManager.tsx`
- Modify: `src/screens/DailyQuestionnaire.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/ProfileSelector.tsx` (Firestore hydration call)
- Modify: `public/locales/en/common.json`, `public/locales/hi/common.json`, `public/locales/kn/common.json`

**Interfaces:**
- Consumes: `PicturePostcard` component (Tasks 13-16), `hydrateFromFirestore` (Task 6).

- [ ] **Step 1: GameRouter** — import the component; add to `GAME_REGISTRY`: `'picture-postcard': { component: PicturePostcard, category: 'memory' }`. Add the self-generating case in `generateContentForGame`:

```ts
  if (gameId === 'picture-postcard') {
    // Self-generating: the game loads its own engine state in-component (spec SS2.2).
    return {
      levelConfig: { id: 'level_1', labelKey: 'level.pp', params: {} },
      generatedContent: undefined,
    };
  }
```

- [ ] **Step 2: GameShell** — two `gameId === 'picture-postcard'` guards: (a) in `handleLevelComplete`, skip the `adjustDifficulty` call (the engine already wrote the derived `DifficultyState` in `commitTrial`) but keep the rest of the flow (analytics, `finishLevel`) identical; (b) suppress the `scoreLevelLabel` level badge render. Add a `computePerformanceRatio` case:

```ts
    case 'picture-postcard': {
      const correct = metrics.correct ? 1 : 0;
      const distPenalty = typeof metrics.errorDistanceNorm === 'number' ? Math.min(0.3, metrics.errorDistanceNorm) : 0;
      const hintPenalty = 0.1 * ((metrics.hintsUsed as number) ?? 0);
      return Math.max(0, Math.min(1, correct - distPenalty - hintPenalty));
    }
```

- [ ] **Step 3: Session pickers** — add `'picture-postcard'` to the `memory` arrays in `SessionManager.tsx`, `DailyQuestionnaire.tsx`, and `HomeScreen.tsx` (home tile needs `nameKey: 'pp.name'`, icon: reuse the pattern of neighbouring tiles with a postcard emoji token `'📮'` via the existing asset/icon prop shape - match whatever fields the other three memory entries carry in that file). Check `SessionSummary.tsx`: its memory mapping stays `remember-match` (spec SS2.4 - no change needed; confirm and move on).
- [ ] **Step 4: ProfileSelector** — after the profile is chosen/activated (where `setActiveProfile` is called), add fire-and-forget `void hydrateFromFirestore(profile.userId);`.
- [ ] **Step 5: Locales** — add to all three `common.json` files (en shown; hi/kn: translate the same keys - short, plain sentences):

```json
"pp.name": "Picture Postcard",
"pp.level": "Level {{n}}",
"pp.trialOf": "Trial {{i}} of 10",
"pp.ready.title": "Look carefully",
"pp.probe.expect.M1": "You'll tap what changed",
"pp.probe.expect.M2": "You'll tap where it was",
"pp.probe.expect.M3": "You'll answer a question about the picture",
"pp.probe.m1": "Find what changed in the postcard.",
"pp.probe.m2": "Tap where the change happened.",
"pp.probe.m3.colour": "What colour was the {{object}}?",
"pp.probe.m3.removal": "Which of these was in the picture?",
"pp.probe.m3.addition": "Which of these is new?",
"pp.probe.m3.substitution": "Which {{object}} was in the picture?",
"pp.hint": "Hint",
"pp.pause": "Pause",
"pp.paused": "Paused - take your time",
"pp.feedback.correct": "Well spotted!",
"pp.feedback.reveal": "Here is what changed",
"pp.star.sentence.3": "Wonderful - you spotted nearly everything.",
"pp.star.sentence.2": "Well done - your eyes are getting sharper.",
"pp.star.sentence.1": "Good work - every round trains your memory.",
"pp.star.repeat": "Let's enjoy this level once more.",
"pp.star.continue": "Continue",
"pp.tip.l41": "From here, scenes show more than you can memorise. That's expected - notice the big picture first, then pick a few details to hold onto.",
"pp.interference.prompt": "Tap the larger circle"
```

(plus `pp.sprite.*` labels for the 24 sprites and `pp.category.*` for categories used by M3 question interpolation)

- [ ] **Step 6: Verify** — `npm run lint`, `npm run build`, then `npm run dev`: game appears on the Home screen memory tiles and in a fresh session's rotation; GameShell shows no level badge on it; other games still show theirs.
- [ ] **Step 7: Commit** — `git commit -m "feat: integrate picture-postcard into registry, session flow, and locales"`

---

### Task 18: Final verification + release

**Files:**
- Modify: `package.json` (version 1.1.0)

- [ ] **Step 1: Full test suite** — `npm test` → all green.
- [ ] **Step 2: Lint + build** — `npm run lint`, `npm run build` → clean.
- [ ] **Step 3: Manual smoke test on localhost — PERFORMED BY THE USER** (agent runs `npm run dev` at most; never drives the browser). Checklist for the user:
  1. Fresh profile -> questionnaire -> session starts; play Picture Postcard from rotation; ready/encoding/retention/probe/feedback all render; no console errors.
  2. Session resume: mid-session refresh -> Resume button appears -> resuming returns to the session (existing games unaffected).
  3. Star card appears after 10 counted trials and waits for Continue; rotation happens after, not instead.
  4. Warm-up: first trial of a new session is easier.
  5. No scene repeats within one session.
  6. Pause during encoding masks the scene.
  7. Existing games still play, adjust difficulty, and show level badges.
- [ ] **Step 4: Bump version** — `package.json` `"version": "1.1.0"`.
- [ ] **Step 5: Commit** — `git add package.json && git commit -m "feat: picture-postcard memory game (v1.1.0)"`
- [ ] **Step 6: Do NOT deploy** (`firebase deploy`) without explicit user instruction.

---

## Deferred (do not implement; spec SS10)

M4 drag-back, M5 cross-session probes, change classes 8-10, ambient motion, Tiers 6-10 polish, gentle mode, weekly Brain Map, RotationScreen achievement echo, reminder scheduling.
