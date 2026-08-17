# Market Memory Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add `market-memory`, a memory-category game in which a shopping list is shown, covered by a wooden blind, and then collected from a twelve-crate market shelf seeded with lookalike decoys.

**Architecture:** A self-contained module at `src/games/memory/MarketMemory/`, built on the fixed 800x1276 design canvas that Train Yard already uses, scaled to the viewport with one transform. All round logic (crate composition, scoring) lives in a React-free `round.ts` so it can be unit-tested; the React tree is presentation plus a `setTimeout`-driven phase machine. Difficulty arrives through `levelConfig.params` from `getMarketMemoryParams(score)`.

**Tech Stack:** React 18, TypeScript, Vite, Vitest (node environment, no DOM), i18next, inline styles plus a `<style>` keyframe block. No new dependencies.

**Spec:** `docs/superpowers/specs/2026-08-17-market-memory-design.md`. Where this plan and the spec disagree, the spec wins - stop and raise it.

**Reference implementation:** `src/games/memory/TrainYard/` is the structural precedent for every file here. Read it before starting.

## Global Constraints

- Game id is exactly `market-memory`. Category `memory`.
- Design canvas is 800 wide: HUD 800x96, board 800x1180, total 800x1276.
- Font `'Baloo 2', sans-serif` throughout the canvas. Nothing below 17px.
- Button shape language: radius 12-18px, flat fill, 5-7px solid bottom border in a darker shade of the fill. **No box-shadows for depth.**
- z-index order is load-bearing and was a defect fix in a previous game: scenery 0-1, crates 5, controls 6-7, blind 8, modal overlay 9, modal card 10.
- All user-facing strings use `t('mm.<key>', 'English fallback')`. English fallbacks only; no locale JSON edits.
- `EASE_SETTLE` is `cubic-bezier(.22,.61,.36,1)`.
- **Lint baseline is 38 errors, 1 warning.** `npm run lint` cannot be a clean gate. The gate is: no new errors attributable to files this plan touches.
- **Vitest is available** (`npm test` runs `vitest run`) with node environment and no jsdom. Pure-logic tests only; do not write component tests.
- Do not modify `shopping-list-recall`, and do not fix the `serve-guests` rotation defect noted in the spec. Both are out of scope.
- Every task commits. Do not bump `package.json` until Task 9.

## File Structure

| File | Responsibility |
|---|---|
| `src/games/memory/MarketMemory/items.ts` | The 21-item catalogue, `BY_ID` lookup, `registerAsset` calls |
| `src/games/memory/MarketMemory/round.ts` | Pure `buildRound` and `scoreRound`. No React. |
| `src/games/memory/MarketMemory/__tests__/round.test.ts` | Unit tests for the above |
| `src/games/memory/MarketMemory/geometry.ts` | Canvas constants, crate grid, fixed element boxes |
| `src/games/memory/MarketMemory/palette.ts` | Colour tokens |
| `src/games/memory/MarketMemory/styles.tsx` | Keyframes, `EASE_SETTLE`, `MarketMemoryStyles` |
| `src/games/memory/MarketMemory/Product.tsx` | Shape-keyed CSS packaging wrapping the emoji glyph |
| `src/games/memory/MarketMemory/Crate.tsx` | One shelf crate |
| `src/games/memory/MarketMemory/ListCard.tsx` | Shopping-list card |
| `src/games/memory/MarketMemory/Blind.tsx` | Retention cover |
| `src/games/memory/MarketMemory/CartStrip.tsx` | Cart block, slots, SUBMIT |
| `src/games/memory/MarketMemory/Backdrop.tsx` | Sky, street, buildings, two stalls. Decoration only. |
| `src/games/memory/MarketMemory/effects.tsx` | Confetti and floating toast |
| `src/games/memory/MarketMemory/effectModel.ts` | Effect types, `nextFxId`, `makeConfetti` |
| `src/games/memory/MarketMemory/index.tsx` | Phase machine, layout, modals |
| `src/lib/dynamicDifficulty.ts` | Add `MarketMemoryDynamicParams`, `getMarketMemoryParams` |
| `src/lib/__tests__/marketMemoryParams.test.ts` | Unit tests for the curve |
| `src/components/GameShell.tsx` | `computePerformanceRatio` case |
| `src/screens/GameRouter.tsx` | Import, registry entry, generator branch |
| `src/screens/HomeScreen.tsx` | Tile |
| `src/session/SessionManager.tsx` | Rotation entry |
| `src/screens/DailyQuestionnaire.tsx` | Rotation entry |
| `public/placeholders/games/market-memory.svg` | Tile art |

---

### Task 1: Item catalogue

**Files:**
- Create: `src/games/memory/MarketMemory/items.ts`

**Interfaces:**
- Consumes: `registerAsset` from `src/lib/assets/catalog.ts`, signature `registerAsset(def: { assetId: string; token?: string; imageSrc?: string }): string`
- Produces: `type Shape`, `type Group`, `interface Item`, `ITEMS: Item[]`, `BY_ID: Record<string, Item>`, `GROUPS: Group[]`

- [ ] **Step 1: Write the catalogue**

Colours and twin pairings are transcribed verbatim from the prototype at `design_handoff_market_memory/market-memory-src.dc.html` lines 224-246. Do not invent values.

`emoji` is `undefined` for the eight items with no distinct glyph. That is a designed state, not an omission: those render as packaging plus name.

```ts
import { registerAsset } from '../../../lib/assets/catalog';

export type Group = 'produce' | 'dairy' | 'bakery' | 'pantry';

export type Shape =
  | 'round' | 'cluster' | 'carton' | 'cup' | 'box'
  | 'bag' | 'pouch' | 'jar' | 'bottle' | 'loaf' | 'buns';

export interface Item {
  id: string;
  name: string;
  group: Group;
  shape: Shape;
  /** Packaging fill. */
  body: string;
  /** Darker shade for the bottom border and shading. */
  dark: string;
  /** Cap, lid or label-band colour. */
  accent?: string;
  /** Leaf colour on produce. */
  leaf?: string;
  /** Short text printed on the packaging label band. */
  label?: string;
  /** The lookalike this item seeds as a decoy. Deliberately asymmetric in places. */
  twin: string;
  /** Undefined where no distinct emoji exists; packaging plus name carries it. */
  emoji?: string;
}

export const ITEMS: Item[] = [
  { id: 'apples',   name: 'Apples',   group: 'produce', shape: 'round',   body: '#D0453C', dark: '#A32F28', leaf: '#5AA83F', twin: 'tomatoes', emoji: '🍎' },
  { id: 'tomatoes', name: 'Tomatoes', group: 'produce', shape: 'round',   body: '#D9483A', dark: '#AB3126', leaf: '#4E9636', twin: 'apples',   emoji: '🍅' },
  { id: 'oranges',  name: 'Oranges',  group: 'produce', shape: 'round',   body: '#E8912B', dark: '#B96C16', leaf: '#5AA83F', twin: 'apples',   emoji: '🍊' },
  { id: 'grapes',   name: 'Grapes',   group: 'produce', shape: 'cluster', body: '#7B4EA8', dark: '#5A3480', leaf: '#4E9636', twin: 'plums',    emoji: '🍇' },
  { id: 'plums',    name: 'Plums',    group: 'produce', shape: 'cluster', body: '#8A4E9E', dark: '#653679', leaf: '#4E9636', twin: 'grapes' },
  { id: 'milk',     name: 'Milk',     group: 'dairy',   shape: 'carton',  body: '#F7F5EF', dark: '#D2CEC0', accent: '#3D7CC9', label: 'MILK',   twin: 'cream',   emoji: '🥛' },
  { id: 'cream',    name: 'Cream',    group: 'dairy',   shape: 'carton',  body: '#F7F5EF', dark: '#D2CEC0', accent: '#6FA8D8', label: 'CREAM',  twin: 'milk' },
  { id: 'yogurt',   name: 'Yogurt',   group: 'dairy',   shape: 'cup',     body: '#FBFAF6', dark: '#D9D4C6', accent: '#D0453C', label: 'YOG',    twin: 'butter' },
  { id: 'butter',   name: 'Butter',   group: 'dairy',   shape: 'box',     body: '#F2D97A', dark: '#C9AE4B', accent: '#8C6D1F', label: 'BUTTER', twin: 'yogurt',  emoji: '🧈' },
  { id: 'bread',    name: 'Bread',    group: 'bakery',  shape: 'loaf',    body: '#D9A860', dark: '#B0803C', twin: 'buns',   emoji: '🍞' },
  { id: 'buns',     name: 'Buns',     group: 'bakery',  shape: 'buns',    body: '#DCB070', dark: '#B4864A', twin: 'bread' },
  { id: 'rice',     name: 'Rice',     group: 'pantry',  shape: 'bag',     body: '#E4D2AC', dark: '#BFA97F', accent: '#3D7CC9', label: 'RICE',   twin: 'sugar',   emoji: '🍚' },
  { id: 'sugar',    name: 'Sugar',    group: 'pantry',  shape: 'bag',     body: '#CFE0B4', dark: '#A6BC86', accent: '#5AA83F', label: 'SUGAR',  twin: 'flour' },
  { id: 'flour',    name: 'Flour',    group: 'pantry',  shape: 'bag',     body: '#EEE3C8', dark: '#C6B893', accent: '#B0803C', label: 'FLOUR',  twin: 'rice' },
  { id: 'pasta',    name: 'Pasta',    group: 'pantry',  shape: 'box',     body: '#C63A31', dark: '#992821', accent: '#F5D778', label: 'PASTA',  twin: 'cereal',  emoji: '🍝' },
  { id: 'cereal',   name: 'Cereal',   group: 'pantry',  shape: 'box',     body: '#2F6BA8', dark: '#234F7C', accent: '#F5D778', label: 'FLAKES', twin: 'pasta',   emoji: '🥣' },
  { id: 'chips',    name: 'Chips',    group: 'pantry',  shape: 'pouch',   body: '#EFC13C', dark: '#C39718', accent: '#8C6D1F', label: 'CHIPS',  twin: 'cereal',  emoji: '🍟' },
  { id: 'jam',      name: 'Jam',      group: 'pantry',  shape: 'jar',     body: '#B93A34', dark: '#8C2823', accent: '#FBEFD5', label: 'JAM',    twin: 'honey' },
  { id: 'honey',    name: 'Honey',    group: 'pantry',  shape: 'jar',     body: '#DE9C22', dark: '#B07714', accent: '#FBEFD5', label: 'HONEY',  twin: 'jam',     emoji: '🍯' },
  { id: 'oil',      name: 'Oil',      group: 'pantry',  shape: 'bottle',  body: '#E8B830', dark: '#B78F17', accent: '#FBEFD5', label: 'OIL',    twin: 'vinegar' },
  { id: 'vinegar',  name: 'Vinegar',  group: 'pantry',  shape: 'bottle',  body: '#9C5B2E', dark: '#75411F', accent: '#FBEFD5', label: 'VIN',    twin: 'oil' },
];

export const BY_ID: Record<string, Item> = Object.fromEntries(ITEMS.map((it) => [it.id, it]));

export const GROUPS: Group[] = ['produce', 'dairy', 'bakery', 'pantry'];

// Registered at module load, matching how the other games publish their art.
ITEMS.forEach((it) => {
  if (it.emoji) registerAsset({ assetId: `mm-${it.id}`, token: it.emoji });
});
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning `items.ts`. (Other pre-existing errors may appear; ignore those.)

- [ ] **Step 3: Commit**

```bash
git add src/games/memory/MarketMemory/items.ts
git commit -m "feat(market-memory): item catalogue with twin pairings"
```

---

### Task 2: Round logic, test-first

This is the only real logic in the game. It gets real tests.

**Files:**
- Create: `src/games/memory/MarketMemory/round.ts`
- Test: `src/games/memory/MarketMemory/__tests__/round.test.ts`

**Interfaces:**
- Consumes: `ITEMS`, `BY_ID`, `GROUPS`, `Item`, `Group` from `./items`
- Produces:
  - `interface BuildRoundParams { listLength: number; similarPackaging: boolean; listCategory: boolean }`
  - `interface Round { list: string[]; crates: string[] }`
  - `buildRound(p: BuildRoundParams, rng?: () => number): Round`
  - `interface RoundScore { correct: string[]; wrong: string[]; missed: string[]; livesLost: number; perfect: boolean }`
  - `scoreRound(list: string[], picked: string[]): RoundScore`
  - `CRATE_COUNT = 12`

- [ ] **Step 1: Write the failing tests**

`rng` is injected so the tests are deterministic. Production callers omit it and get `Math.random`.

```ts
import { describe, it, expect } from 'vitest';
import { buildRound, scoreRound, CRATE_COUNT } from '../round';
import { BY_ID, ITEMS } from '../items';

/** Deterministic stand-in for Math.random: cycles a fixed sequence. */
function seededRng(seed = 1) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

describe('buildRound', () => {
  it('produces exactly 12 unique crates', () => {
    const r = buildRound({ listLength: 4, similarPackaging: true, listCategory: false }, seededRng());
    expect(r.crates).toHaveLength(CRATE_COUNT);
    expect(new Set(r.crates).size).toBe(CRATE_COUNT);
  });

  it('produces a list of the requested length', () => {
    const r = buildRound({ listLength: 5, similarPackaging: true, listCategory: false }, seededRng(7));
    expect(r.list).toHaveLength(5);
    expect(new Set(r.list).size).toBe(5);
  });

  it('always makes the list a subset of the crates', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: false }, seededRng(seed));
      r.list.forEach((id) => expect(r.crates).toContain(id));
    }
  });

  it('seeds every target twin when similarPackaging is on', () => {
    for (let seed = 1; seed <= 50; seed++) {
      const r = buildRound({ listLength: 4, similarPackaging: true, listCategory: false }, seededRng(seed));
      // 4 targets + at most 4 twins is 8, comfortably under 12, so every twin must fit.
      r.list.forEach((id) => expect(r.crates).toContain(BY_ID[id].twin));
    }
  });

  it('does not deliberately seed twins when similarPackaging is off', () => {
    // Twins can still appear as random filler, so assert on the aggregate rather than
    // on any single round: seeding off must produce strictly fewer twin-pairs on average.
    const count = (similarPackaging: boolean) => {
      let total = 0;
      for (let seed = 1; seed <= 60; seed++) {
        const r = buildRound({ listLength: 3, similarPackaging, listCategory: false }, seededRng(seed));
        total += r.list.filter((id) => r.crates.includes(BY_ID[id].twin)).length;
      }
      return total;
    };
    expect(count(false)).toBeLessThan(count(true));
  });

  it('draws targets from a single group when listCategory is on', () => {
    for (let seed = 1; seed <= 40; seed++) {
      const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(seed));
      const groups = new Set(r.list.map((id) => BY_ID[id].group));
      expect(groups.size).toBe(1);
    }
  });

  it('fills most of the shelf from the chosen group when listCategory is on', () => {
    const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(3));
    const group = BY_ID[r.list[0]].group;
    const sameGroup = r.crates.filter((id) => BY_ID[id].group === group).length;
    // Pantry is the only qualifying group at listLength 6 and has 10 members.
    expect(sameGroup).toBeGreaterThanOrEqual(10);
  });

  it('never returns an id that is not in the catalogue', () => {
    const known = new Set(ITEMS.map((i) => i.id));
    const r = buildRound({ listLength: 6, similarPackaging: true, listCategory: true }, seededRng(11));
    r.crates.forEach((id) => expect(known.has(id)).toBe(true));
  });
});

describe('scoreRound', () => {
  it('partitions picks into correct, wrong and missed', () => {
    const s = scoreRound(['milk', 'jam', 'rice'], ['milk', 'cream', 'jam']);
    expect(s.correct).toEqual(['milk', 'jam']);
    expect(s.wrong).toEqual(['cream']);
    expect(s.missed).toEqual(['rice']);
  });

  it('marks a perfect round and costs no lives', () => {
    const s = scoreRound(['milk', 'jam'], ['jam', 'milk']);
    expect(s.perfect).toBe(true);
    expect(s.livesLost).toBe(0);
  });

  it('caps the wrong-pick penalty at 2 hearts', () => {
    const s = scoreRound(['milk'], ['cream', 'jam', 'honey', 'oil']);
    // 3+ wrong caps at 2, plus 1 for having missed something.
    expect(s.livesLost).toBe(3);
  });

  it('charges exactly one heart for any number of misses', () => {
    const s = scoreRound(['milk', 'jam', 'rice', 'oil'], ['milk']);
    expect(s.livesLost).toBe(1);
  });

  it('handles an empty pick set', () => {
    const s = scoreRound(['milk', 'jam'], []);
    expect(s.correct).toEqual([]);
    expect(s.missed).toEqual(['milk', 'jam']);
    expect(s.livesLost).toBe(1);
    expect(s.perfect).toBe(false);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/games/memory/MarketMemory`
Expected: FAIL, cannot resolve `../round`.

- [ ] **Step 3: Implement `round.ts`**

The `listLength + 2` qualifying rule is deliberate and documented in spec section 9.2. A `listLength * 2` rule demands 12 members at `listLength` 6, which no group has, so `listCategory` would silently disable itself exactly where it is meant to bite. Do not "simplify" it back.

```ts
import { BY_ID, GROUPS, ITEMS, type Group } from './items';

export const CRATE_COUNT = 12;

/** Group must cover the targets plus at least two same-group decoys. */
const CATEGORY_MARGIN = 2;

export interface BuildRoundParams {
  listLength: number;
  similarPackaging: boolean;
  listCategory: boolean;
}

export interface Round {
  /** Target item ids. */
  list: string[];
  /** Twelve item ids in grid order. */
  crates: string[];
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

function poolFor(p: BuildRoundParams, rng: () => number) {
  if (!p.listCategory) return ITEMS;
  const eligible: Group[] = GROUPS.filter(
    (g) => ITEMS.filter((it) => it.group === g).length >= p.listLength + CATEGORY_MARGIN,
  );
  // Unreachable with the shipped curve; degrade rather than fail if it is ever retuned.
  if (eligible.length === 0) return ITEMS;
  const group = shuffled(eligible, rng)[0];
  return ITEMS.filter((it) => it.group === group);
}

export function buildRound(p: BuildRoundParams, rng: () => number = Math.random): Round {
  const pool = poolFor(p, rng);
  const list = shuffled(pool, rng).slice(0, p.listLength).map((it) => it.id);

  const chosen: string[] = [...list];
  const add = (id: string) => {
    if (chosen.length < CRATE_COUNT && !chosen.includes(id)) chosen.push(id);
  };

  // The twin outranks group homogeneity: it is the mechanic, so it is admitted even
  // when listCategory put it outside the pool.
  if (p.similarPackaging) list.forEach((id) => add(BY_ID[id].twin));

  shuffled(pool, rng).forEach((it) => add(it.id));
  // Only does work when listCategory narrowed the pool; the full 21 cannot run dry.
  if (chosen.length < CRATE_COUNT) shuffled(ITEMS, rng).forEach((it) => add(it.id));

  return { list, crates: shuffled(chosen, rng) };
}

export interface RoundScore {
  correct: string[];
  wrong: string[];
  missed: string[];
  livesLost: number;
  perfect: boolean;
}

export function scoreRound(list: string[], picked: string[]): RoundScore {
  const correct = picked.filter((id) => list.includes(id));
  const wrong = picked.filter((id) => !list.includes(id));
  const missed = list.filter((id) => !picked.includes(id));
  return {
    correct,
    wrong,
    missed,
    livesLost: Math.min(2, wrong.length) + (missed.length > 0 ? 1 : 0),
    perfect: wrong.length === 0 && missed.length === 0,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/games/memory/MarketMemory`
Expected: PASS, 13 tests.

- [ ] **Step 5: Commit**

```bash
git add src/games/memory/MarketMemory/round.ts src/games/memory/MarketMemory/__tests__/round.test.ts
git commit -m "feat(market-memory): crate composition and scoring, with tests"
```

---

### Task 3: Difficulty curve, test-first

**Files:**
- Modify: `src/lib/dynamicDifficulty.ts` (append, next to `getServeGuestsParams`)
- Test: `src/lib/__tests__/marketMemoryParams.test.ts`

**Interfaces:**
- Consumes: the existing `lerp` and `lerpInt` helpers already exported from `dynamicDifficulty.ts` (`lerpInt` is `Math.round(lerp(...))`)
- Produces: `interface MarketMemoryDynamicParams { listLength: number; listSeconds: number; retentionMs: number; similarPackaging: boolean; delayedRetrieval: boolean; listCategory: boolean; lives: number; hints: number }` and `getMarketMemoryParams(score: number): MarketMemoryDynamicParams`

- [ ] **Step 1: Write the failing tests**

```ts
import { describe, it, expect } from 'vitest';
import { getMarketMemoryParams } from '../dynamicDifficulty';

describe('getMarketMemoryParams', () => {
  it('starts gentle at score 0', () => {
    const p = getMarketMemoryParams(0);
    expect(p.listLength).toBe(3);
    expect(p.listSeconds).toBe(9000);
    expect(p.similarPackaging).toBe(false);
    expect(p.delayedRetrieval).toBe(false);
    expect(p.listCategory).toBe(false);
  });

  it('reaches full difficulty at score 1', () => {
    const p = getMarketMemoryParams(1);
    expect(p.listLength).toBe(6);
    expect(p.listSeconds).toBe(3500);
    expect(p.similarPackaging).toBe(true);
    expect(p.delayedRetrieval).toBe(true);
    expect(p.listCategory).toBe(true);
  });

  it('adds the delayed-retrieval hold only when that axis is on', () => {
    expect(getMarketMemoryParams(0).retentionMs).toBe(1500);
    expect(getMarketMemoryParams(1).retentionMs).toBe(4000);
  });

  it('keeps lives and hints fixed across the whole curve', () => {
    for (const s of [0, 0.25, 0.5, 0.75, 1]) {
      expect(getMarketMemoryParams(s).lives).toBe(3);
      expect(getMarketMemoryParams(s).hints).toBe(2);
    }
  });

  it('never shortens the list or lengthens the encoding as score rises', () => {
    let prevLen = 0;
    let prevSecs = Infinity;
    for (let s = 0; s <= 1.0001; s += 0.05) {
      const p = getMarketMemoryParams(Math.min(1, s));
      expect(p.listLength).toBeGreaterThanOrEqual(prevLen);
      expect(p.listSeconds).toBeLessThanOrEqual(prevSecs);
      prevLen = p.listLength;
      prevSecs = p.listSeconds;
    }
  });

  it('keeps listCategory satisfiable: a group exists with listLength + 2 members', () => {
    // Pantry has 10. If listLength ever exceeds 8 this axis silently disables itself.
    const p = getMarketMemoryParams(1);
    expect(p.listLength + 2).toBeLessThanOrEqual(10);
  });

  it('clamps out-of-range scores', () => {
    expect(getMarketMemoryParams(-1).listLength).toBe(3);
    expect(getMarketMemoryParams(2).listLength).toBe(6);
  });
});
```

- [ ] **Step 2: Run the tests to verify they fail**

Run: `npm test -- src/lib/__tests__/marketMemoryParams`
Expected: FAIL, `getMarketMemoryParams is not a function`.

- [ ] **Step 3: Append the implementation to `src/lib/dynamicDifficulty.ts`**

Add at the end of the file, after `getServeGuestsParams`:

```ts
export interface MarketMemoryDynamicParams {
  /** Targets on the shopping list. */
  listLength: number;
  /** How long the list stays visible before the blind drops. */
  listSeconds: number;
  /** How long the blind is held down, delayed-retrieval bonus already folded in. */
  retentionMs: number;
  /** Seed each target's lookalike twin as a decoy. */
  similarPackaging: boolean;
  /** Lengthens the covered hold. */
  delayedRetrieval: boolean;
  /** Draw targets and most filler from a single product group. */
  listCategory: boolean;
  lives: number;
  hints: number;
}

/**
 * Every threshold lives here so the curve can be retuned from one place after play-testing.
 * See docs/superpowers/specs/2026-08-17-market-memory-design.md section 9.
 */
const MM = {
  listLengthMin: 3,
  listLengthMax: 6,
  listMsEasy: 9000,
  listMsHard: 3500,
  retentionBaseMs: 1500,
  delayedBonusMs: 2500,
  similarPackagingAt: 0.25,
  delayedRetrievalAt: 0.55,
  listCategoryAt: 0.75,
  lives: 3,
  hints: 2,
} as const;

export function getMarketMemoryParams(score: number): MarketMemoryDynamicParams {
  const s = Math.max(0, Math.min(1, score));
  const delayedRetrieval = s >= MM.delayedRetrievalAt;
  return {
    listLength: lerpInt(MM.listLengthMin, MM.listLengthMax, s),
    listSeconds: lerpInt(MM.listMsEasy, MM.listMsHard, s),
    retentionMs: MM.retentionBaseMs + (delayedRetrieval ? MM.delayedBonusMs : 0),
    similarPackaging: s >= MM.similarPackagingAt,
    delayedRetrieval,
    listCategory: s >= MM.listCategoryAt,
    lives: MM.lives,
    hints: MM.hints,
  };
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npm test -- src/lib/__tests__/marketMemoryParams`
Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add src/lib/dynamicDifficulty.ts src/lib/__tests__/marketMemoryParams.test.ts
git commit -m "feat(market-memory): difficulty curve with tests"
```

---

### Task 4: Geometry, palette and keyframes

Static scaffolding, no behaviour. Every value comes from spec sections 5, 6 and 13.

**Files:**
- Create: `src/games/memory/MarketMemory/geometry.ts`
- Create: `src/games/memory/MarketMemory/palette.ts`
- Create: `src/games/memory/MarketMemory/styles.tsx`

**Interfaces:**
- Produces:
  - geometry: `HUD_H`, `BOARD_W`, `BOARD_H`, `CANVAS_W`, `CANVAS_H`, `COL_X`, `ROW_Y`, `CRATE_W`, `CRATE_H`, `interface Box`, `crateBox(i: number): Box`, `CAPTION`, `BASKET`, `HINT_BTN`, `LIST_CARD`, `BLIND`, `CART`, `CART_BLOCK_W`, `SUBMIT_W`, `SLOT_GAP`, `slotWidth(listLength: number): number`
  - palette: `COLOURS`, `BUILDINGS`, `CONFETTI_COLOURS` (all const)
  - styles: `KEYFRAMES`, `EASE_SETTLE`, `EASE_OUT`, `MarketMemoryStyles()`

- [ ] **Step 1: Write `geometry.ts`**

```ts
/**
 * Board geometry in the handoff's fixed 800px design-pixel space. The whole game lays out
 * at these coordinates and scales to the viewport with a single transform.
 */

export const HUD_H = 96;
export const BOARD_W = 800;
export const BOARD_H = 1180;
export const CANVAS_W = BOARD_W;
export const CANVAS_H = HUD_H + BOARD_H;

// ─── Shelf grid ───────────────────────────────────────────────────────────────

export const COL_X = [24, 216, 408, 600];
export const ROW_Y = [584, 726, 868];
export const CRATE_W = 176;
export const CRATE_H = 128;

export interface Box { left: number; top: number; width: number; height: number }

/** Crate i sits at column i % 4, row floor(i / 4). */
export function crateBox(i: number): Box {
  return {
    left: COL_X[i % 4],
    top: ROW_Y[Math.floor(i / 4)],
    width: CRATE_W,
    height: CRATE_H,
  };
}

// ─── Fixed furniture ──────────────────────────────────────────────────────────

export const CAPTION   = { left: 150, top: 16, width: 500 };
export const BASKET    = { left: 16, top: 122 };
export const HINT_BTN  = { right: 16, top: 122, width: 132, height: 108 };
export const LIST_CARD = { left: 232, top: 196, width: 336 };
export const BLIND     = { left: 224, top: 188, width: 352, height: 360, lift: 560 };
export const CART      = { left: 20, top: 1006, width: 760, height: 156 };

export const CART_BLOCK_W = 112;
export const SUBMIT_W = 172;
export const SLOT_GAP = 10;

/**
 * Slots shrink with list length so the strip always fits its 760px. The three widths are
 * fixed by the handoff rather than computed, because the computed value drifts a pixel or
 * two off the design at some lengths.
 */
export function slotWidth(listLength: number): number {
  if (listLength <= 4) return 100;
  if (listLength === 5) return 82;
  return 68;
}
```

- [ ] **Step 2: Write `palette.ts`**

```ts
/** Colour tokens transcribed from the handoff. See spec section 6. */
export const COLOURS = {
  navyDeep:     '#14304F',
  navyHudTop:   '#2C5580',
  navyHudBot:   '#1E3E63',
  navyLabel:    '#9FC0DE',

  skyTop:       '#A9D2EE',
  skyBot:       '#C6E1F1',
  groundTop:    '#D9C0A0',
  groundMid:    '#C99A6B',
  groundBot:    '#C08F60',

  woodDark:     '#8A5A34',
  woodDarker:   '#6E4526',
  woodLight:    '#A9743F',

  cream:        '#FBEFD5',
  creamLight:   '#FFF9EA',
  creamSlot:    '#FFF7E2',
  creamBorder:  '#C9A76B',
  slotDash:     '#C0A377',

  ink:          '#4A3A22',
  inkSoft:      '#5C4A2E',
  inkSign:      '#5C3A18',

  amber:        '#F0A92B',
  amberEdge:    '#C8821A',
  gold:         '#F5C33B',
  goldSoft:     '#FFE38A',
  goldConfetti: '#EDBB2A',

  green:        '#59A93C',
  greenPick:    '#5AA83F',
  greenEdge:    '#3C7A26',
  greenResult:  '#3F7E2B',
  greenMuted:   '#8FA987',

  red:          '#D7443C',
  redDeep:      '#C13A33',

  purple:       '#5B3E8E',
  purpleEdge:   '#402A69',

  blindSlatA:   '#C9A76B',
  blindSlatB:   '#B8945A',

  stallRed:     '#D24B42',
  stallRedEdge: '#A9352E',
  stallBlue:    '#2F6BA8',
  stallBlueEdge:'#234F7C',
  stallCream:   '#FBF3E4',
  signPlate:    '#C9A76B',
  street:       '#C9B79C',
  streetBot:    '#B29C7E',
} as const;

export const BUILDINGS = ['#C7A98A', '#D3B694', '#C2A283', '#D0B291'] as const;

export const CONFETTI_COLOURS = ['#EDBB2A', '#F5D778', '#D7443C', '#3D7CC9', '#FFFFFF', '#5AA83F'] as const;
```

- [ ] **Step 3: Write `styles.tsx`**

```tsx
/**
 * Keyframes rendered as an inline <style> block, matching how Train Yard ships its
 * animations.
 *
 * Trap preserved from the prototype: mm-cardin and mm-confetti bake their centring
 * translate into every keyframe and run with fill-mode `both`, so the animation owns
 * `transform` for the element's whole life. Centring those elements any other way throws
 * them to the top-left corner. Confetti custom properties carry their units on the
 * values, not inside the calc().
 */
export const KEYFRAMES = `
@keyframes mm-fade { from { opacity: 0; } to { opacity: 1; } }

@keyframes mm-slidein {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes mm-cardin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.92); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes mm-glow {
  0%   { box-shadow: 0 0 0 0 rgba(255,214,102,0); }
  50%  { box-shadow: 0 0 0 14px rgba(255,214,102,.5); }
  100% { box-shadow: 0 0 0 0 rgba(255,214,102,0); }
}

@keyframes mm-rise {
  0%   { opacity: 0; transform: translate(-50%, 8px); }
  25%  { opacity: 1; }
  75%  { opacity: 1; transform: translate(-50%, -26px); }
  100% { opacity: 0; transform: translate(-50%, -40px); }
}

@keyframes mm-rise-ro { 0% { opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }

@keyframes mm-confetti {
  0%   { opacity: 0; transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(.6); }
  14%  { opacity: 1; transform: translate(-50%,-50%) translate(calc(var(--dx) * .18), calc(var(--dy) * .34)) rotate(calc(var(--rot) * .2)) scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(.9); }
}
`;

export const EASE_SETTLE = 'cubic-bezier(.22,.61,.36,1)';
export const EASE_OUT = 'cubic-bezier(.33,1,.68,1)';

export function MarketMemoryStyles() {
  return <style>{KEYFRAMES}</style>;
}
```

- [ ] **Step 4: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning `geometry.ts`, `palette.ts` or `styles.tsx`.

- [ ] **Step 5: Commit**

```bash
git add src/games/memory/MarketMemory/geometry.ts src/games/memory/MarketMemory/palette.ts src/games/memory/MarketMemory/styles.tsx
git commit -m "feat(market-memory): geometry, palette and keyframes"
```

---

### Task 5: Product packaging renderer

The piece that makes the mechanic work. Twins share a `shape`, so they share a silhouette; the emoji is a small secondary mark and the name is the reliable cue.

**Files:**
- Create: `src/games/memory/MarketMemory/Product.tsx`

**Interfaces:**
- Consumes: `Item` from `./items`, `COLOURS` from `./palette`
- Produces: `export default function Product({ item, size }: { item: Item; size: number }): JSX.Element`

- [ ] **Step 1: Write `Product.tsx`**

Every dimension is expressed in units of `size / 100` so one definition renders at 78, 62 and 60px with no separate crops.

```tsx
import type { Item } from './items';
import { COLOURS } from './palette';

interface ProductProps {
  item: Item;
  /** Stage height in design px. 78 on a crate, 62 in a cart slot, 60 in the list. */
  size: number;
}

/**
 * A product is drawn as CSS packaging with the item's emoji sitting on its label area.
 *
 * Twins share a shape and a colour family on purpose: the shelf must not be solvable by
 * silhouette. Eight of the twenty-one items have no distinct emoji, and those are exactly
 * the twins (Cream, Sugar, Flour, Jam...), so the glyph can never be the primary signal.
 * The name text rendered by the caller is what the player actually reads.
 */
export default function Product({ item, size }: ProductProps) {
  const u = size / 100;
  const { body, dark, accent, leaf } = item;

  // Shared shell: fill, darker bottom edge, no drop shadow (see the button shape language).
  const shell = (w: number, h: number, radius: string): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: 0,
    transform: 'translateX(-50%)',
    width: w * u,
    height: h * u,
    background: body,
    borderRadius: radius,
    borderBottom: `${Math.max(2, 6 * u)}px solid ${dark}`,
    boxSizing: 'border-box',
  });

  const glyph = (fontSize: number, bottom: number): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: bottom * u,
    transform: 'translateX(-50%)',
    fontSize: fontSize * u,
    lineHeight: 1,
    pointerEvents: 'none',
  });

  const band = (w: number, h: number, bottom: number): React.CSSProperties => ({
    position: 'absolute',
    left: '50%',
    bottom: bottom * u,
    transform: 'translateX(-50%)',
    width: w * u,
    height: h * u,
    background: accent ?? COLOURS.creamLight,
    borderRadius: 2 * u,
  });

  const layers: React.ReactNode[] = [];

  switch (item.shape) {
    case 'round':
      layers.push(<div key="b" style={{ ...shell(72, 72, '50%'), borderBottom: 'none', boxShadow: `inset 0 ${-8 * u}px 0 ${dark}` }} />);
      if (leaf) layers.push(<div key="l" style={{ position: 'absolute', left: '54%', bottom: 68 * u, width: 20 * u, height: 12 * u, background: leaf, borderRadius: `${10 * u}px ${2 * u}px` }} />);
      break;

    case 'cluster':
      [[-18, 0], [0, 6], [18, 0], [-9, 26], [9, 26]].forEach(([dx, dy], i) => {
        layers.push(<div key={`c${i}`} style={{ position: 'absolute', left: `calc(50% + ${dx * u}px)`, bottom: (8 + dy) * u, transform: 'translateX(-50%)', width: 26 * u, height: 26 * u, background: i % 2 ? dark : body, borderRadius: '50%' }} />);
      });
      if (leaf) layers.push(<div key="l" style={{ position: 'absolute', left: '50%', bottom: 62 * u, transform: 'translateX(-50%)', width: 18 * u, height: 11 * u, background: leaf, borderRadius: `${9 * u}px ${2 * u}px` }} />);
      break;

    case 'carton':
      layers.push(<div key="b" style={shell(52, 82, `${6 * u}px`)} />);
      // The gable that makes a carton read as a carton at 60px.
      layers.push(<div key="g" style={{ position: 'absolute', left: '50%', bottom: 76 * u, transform: 'translateX(-50%)', width: 0, height: 0, borderLeft: `${26 * u}px solid transparent`, borderRight: `${26 * u}px solid transparent`, borderBottom: `${16 * u}px solid ${body}` }} />);
      layers.push(<div key="a" style={band(52, 16, 34)} />);
      break;

    case 'cup':
      layers.push(<div key="b" style={{ ...shell(54, 58, `${4 * u}px ${4 * u}px ${14 * u}px ${14 * u}px`), clipPath: 'polygon(6% 0, 94% 0, 86% 100%, 14% 100%)' }} />);
      layers.push(<div key="a" style={{ ...band(58, 12, 52), borderRadius: 3 * u }} />);
      break;

    case 'box':
      layers.push(<div key="b" style={shell(60, 76, `${5 * u}px`)} />);
      layers.push(<div key="a" style={band(60, 18, 30)} />);
      break;

    case 'bag':
      layers.push(<div key="b" style={shell(58, 74, `${16 * u}px ${16 * u}px ${5 * u}px ${5 * u}px`)} />);
      layers.push(<div key="a" style={band(58, 16, 28)} />);
      break;

    case 'pouch':
      layers.push(<div key="b" style={shell(62, 70, `${5 * u}px ${5 * u}px ${18 * u}px ${18 * u}px`)} />);
      layers.push(<div key="a" style={band(62, 14, 32)} />);
      break;

    case 'jar':
      layers.push(<div key="b" style={shell(54, 62, `${8 * u}px`)} />);
      layers.push(<div key="k" style={{ position: 'absolute', left: '50%', bottom: 60 * u, transform: 'translateX(-50%)', width: 44 * u, height: 14 * u, background: dark, borderRadius: 4 * u }} />);
      layers.push(<div key="a" style={band(54, 18, 22)} />);
      break;

    case 'bottle':
      layers.push(<div key="b" style={shell(44, 60, `${6 * u}px`)} />);
      layers.push(<div key="n" style={{ position: 'absolute', left: '50%', bottom: 58 * u, transform: 'translateX(-50%)', width: 18 * u, height: 24 * u, background: body }} />);
      layers.push(<div key="k" style={{ position: 'absolute', left: '50%', bottom: 80 * u, transform: 'translateX(-50%)', width: 22 * u, height: 10 * u, background: dark, borderRadius: 3 * u }} />);
      layers.push(<div key="a" style={band(44, 16, 20)} />);
      break;

    case 'loaf':
      layers.push(<div key="b" style={shell(74, 52, `${26 * u}px ${26 * u}px ${6 * u}px ${6 * u}px`)} />);
      break;

    case 'buns':
      [[-20, 0], [20, 0], [0, 26]].forEach(([dx, dy], i) => {
        layers.push(<div key={`u${i}`} style={{ position: 'absolute', left: `calc(50% + ${dx * u}px)`, bottom: (6 + dy) * u, transform: 'translateX(-50%)', width: 34 * u, height: 26 * u, background: body, borderRadius: `${16 * u}px ${16 * u}px ${5 * u}px ${5 * u}px`, borderBottom: `${Math.max(2, 4 * u)}px solid ${dark}`, boxSizing: 'border-box' }} />);
      });
      break;
  }

  return (
    <div style={{ position: 'relative', width: size, height: size }} aria-hidden="true">
      {layers}
      {item.emoji && <div style={glyph(item.shape === 'round' || item.shape === 'cluster' ? 34 : 26, item.shape === 'round' ? 20 : 40)}>{item.emoji}</div>}
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning `Product.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/games/memory/MarketMemory/Product.tsx
git commit -m "feat(market-memory): shape-keyed product packaging renderer"
```

---

### Task 6: Board pieces

Four presentational components plus the backdrop. No timers, no phase logic - all state arrives as props.

**Files:**
- Create: `src/games/memory/MarketMemory/Backdrop.tsx`
- Create: `src/games/memory/MarketMemory/Crate.tsx`
- Create: `src/games/memory/MarketMemory/ListCard.tsx`
- Create: `src/games/memory/MarketMemory/Blind.tsx`
- Create: `src/games/memory/MarketMemory/CartStrip.tsx`

**Interfaces:**
- Consumes: `Item`/`BY_ID` from `./items`, `Product` from `./Product`, geometry and palette exports from Task 4
- Produces:
  - `Backdrop(): JSX.Element`
  - `Crate({ item, index, picked, hinted, reduced, onTap }: { item: Item; index: number; picked: boolean; hinted: boolean; reduced: boolean; onTap: (index: number, x: number, y: number) => void })`
  - `ListCard({ items, covered, reduced }: { items: Item[]; covered: boolean; reduced: boolean })`
  - `Blind({ down, progress, label, reduced }: { down: boolean; progress: number; label: string; reduced: boolean })`
  - `CartStrip({ slots, listLength, submitEnabled, cartLabel, submitLabel, reduced, onRemove, onSubmit }: { slots: (Item | null)[]; listLength: number; submitEnabled: boolean; cartLabel: string; submitLabel: string; reduced: boolean; onRemove: (slot: number) => void; onSubmit: () => void })`

- [ ] **Step 1: Write `Backdrop.tsx`**

Pure decoration. It must never take taps, so the whole tree carries `pointerEvents: 'none'` and sits at z-index 0.

```tsx
import { BOARD_H, BOARD_W } from './geometry';
import { BUILDINGS, COLOURS } from './palette';

const STALL_GOODS = [
  { left: 22,  bottom: 214, w: 46, h: 30, c: '#D0453C' },
  { left: 78,  bottom: 214, w: 46, h: 30, c: '#E8912B' },
  { left: 134, bottom: 214, w: 46, h: 30, c: '#7B4EA8' },
  { left: 190, bottom: 214, w: 46, h: 30, c: '#5AA83F' },
  { left: 50,  bottom: 172, w: 60, h: 28, c: '#D9483A' },
  { left: 574, bottom: 214, w: 46, h: 30, c: '#F7F5EF' },
  { left: 630, bottom: 214, w: 46, h: 30, c: '#F2D97A' },
  { left: 686, bottom: 214, w: 46, h: 30, c: '#D9A860' },
  { left: 742, bottom: 214, w: 40, h: 30, c: '#E4D2AC' },
  { left: 640, bottom: 172, w: 60, h: 28, c: '#DCB070' },
];

function Stall({ side, label, stripe, stripeEdge }: { side: 'left' | 'right'; label: string; stripe: string; stripeEdge: string }) {
  const awningLeft = side === 'left' ? -14 : BOARD_W - 286;
  const counterLeft = side === 'left' ? 6 : BOARD_W - 268;
  return (
    <>
      <div style={{
        position: 'absolute', left: awningLeft, top: 196, width: 300, height: 62,
        background: `repeating-linear-gradient(90deg, ${stripe} 0 34px, ${COLOURS.stallCream} 34px 68px)`,
        borderBottom: `5px solid ${stripeEdge}`,
      }} />
      <div style={{
        position: 'absolute', left: counterLeft, top: 258, width: 262, height: 300,
        background: `linear-gradient(180deg, ${COLOURS.woodDark}, ${COLOURS.woodDarker})`,
      }} />
      <div style={{
        position: 'absolute', left: counterLeft + 46, top: 286, width: 170, height: 44,
        background: COLOURS.signPlate, border: `3px solid ${COLOURS.woodDark}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, letterSpacing: '.06em', color: COLOURS.inkSign,
      }}>{label}</div>
    </>
  );
}

/** Sky, street, buildings and the two market stalls. Decoration only, never interactive. */
export default function Backdrop() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: BOARD_W, height: BOARD_H,
        background: `linear-gradient(180deg, ${COLOURS.skyTop} 0px, ${COLOURS.skyBot} 190px, ${COLOURS.groundTop} 191px, ${COLOURS.groundMid} 300px, ${COLOURS.groundBot} ${BOARD_H}px)`,
      }} />
      {BUILDINGS.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: 40 + i * 190, top: 40 + (i % 2) * 22, width: 150, height: 130 - (i % 2) * 18, background: c }} />
      ))}
      <div style={{
        position: 'absolute', left: 0, top: 96, width: BOARD_W, height: 96,
        background: `linear-gradient(180deg, ${COLOURS.street}, ${COLOURS.streetBot})`,
      }} />
      <Stall side="left"  label="FRESH FRUITS"   stripe={COLOURS.stallRed}  stripeEdge={COLOURS.stallRedEdge} />
      <Stall side="right" label="BAKERY & DAIRY" stripe={COLOURS.stallBlue} stripeEdge={COLOURS.stallBlueEdge} />
      {STALL_GOODS.map((g, i) => (
        <div key={i} style={{
          position: 'absolute', left: g.left, top: BOARD_H - g.bottom - 340, width: g.w, height: g.h,
          background: g.c, borderRadius: 6, boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.14)',
        }} />
      ))}
    </div>
  );
}
```

- [ ] **Step 2: Write `Crate.tsx`**

Four things change together on a pick - border colour, lift, opacity and the tick badge - so colour is never the only signal. Do not reduce this to a colour change.

```tsx
import { CRATE_H, CRATE_W, crateBox } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { EASE_SETTLE } from './styles';

interface CrateProps {
  item: Item;
  index: number;
  picked: boolean;
  hinted: boolean;
  reduced: boolean;
  /** Receives the board-space tap point so the caller can float a toast there. */
  onTap: (index: number, x: number, y: number) => void;
}

export default function Crate({ item, index, picked, hinted, reduced, onTap }: CrateProps) {
  const box = crateBox(index);
  const border = picked ? COLOURS.greenPick : hinted ? COLOURS.amber : COLOURS.woodDark;

  return (
    <button
      type="button"
      onClick={() => onTap(index, box.left + CRATE_W / 2, box.top)}
      aria-pressed={picked}
      aria-label={item.name}
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: CRATE_W,
        height: CRATE_H,
        zIndex: 5,
        padding: 0,
        cursor: 'pointer',
        background: `linear-gradient(180deg, ${COLOURS.woodLight} 0%, ${COLOURS.woodDark} 100%)`,
        border: `5px solid ${border}`,
        borderBottom: `7px solid ${picked ? COLOURS.greenEdge : COLOURS.woodDarker}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        opacity: picked ? 0.82 : 1,
        transform: reduced || !picked ? 'translateY(0)' : 'translateY(-5px)',
        transition: `transform 220ms ${EASE_SETTLE}, opacity 220ms linear, border-color 220ms linear`,
        animation: hinted && !reduced ? 'mm-glow 2000ms ease-in-out infinite' : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <Product item={item} size={78} />
      <span style={{ fontSize: 19, fontWeight: 700, color: COLOURS.creamLight, lineHeight: 1.1, paddingBottom: 4 }}>
        {item.name}
      </span>
      {picked && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', right: -8, top: -8, width: 34, height: 34, borderRadius: '50%',
            background: COLOURS.greenPick, color: '#FFFFFF', fontSize: 20, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${COLOURS.greenEdge}`,
            animation: 'mm-fade 180ms ease both',
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
```

- [ ] **Step 3: Write `ListCard.tsx`**

`covered` blanks the rows. The caller sets it only after the blind has landed - see the phase machine in Task 8.

```tsx
import { LIST_CARD } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';

interface ListCardProps {
  items: Item[];
  /** Blanks the rows. Set only once the blind has landed. */
  covered: boolean;
  reduced: boolean;
}

export default function ListCard({ items, covered, reduced }: ListCardProps) {
  return (
    <div style={{
      position: 'absolute', left: LIST_CARD.left, top: LIST_CARD.top, width: LIST_CARD.width,
      zIndex: 6, background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`,
      borderRadius: 18, overflow: 'hidden', fontFamily: "'Baloo 2', sans-serif",
    }}>
      <div style={{
        background: COLOURS.purple, color: COLOURS.creamLight, fontSize: 27, fontWeight: 800,
        textAlign: 'center', padding: '10px 0', borderBottom: `5px solid ${COLOURS.purpleEdge}`,
      }}>
        Shopping list
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, height: 64,
              opacity: covered ? 0 : 1,
              transition: 'opacity 120ms linear',
              animation: reduced ? `mm-fade 300ms ease ${i * 90}ms both` : `mm-slidein 300ms cubic-bezier(.22,.61,.36,1) ${i * 90}ms both`,
            }}
          >
            <Product item={it} size={60} />
            <span style={{ fontSize: 30, fontWeight: 700, color: COLOURS.ink }}>{it.name}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: COLOURS.cream, borderTop: `3px solid ${COLOURS.creamBorder}`,
        textAlign: 'center', padding: '8px 0', fontSize: 20, fontWeight: 700, color: COLOURS.inkSoft,
        opacity: covered ? 0 : 1, transition: 'opacity 120ms linear',
      }}>
        Find these items!
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Write `Blind.tsx`**

Adapted from `TrainYard/Blind.tsx`, resized to cover the list card and given the handoff's slat gradient.

```tsx
import { BLIND } from './geometry';
import { COLOURS } from './palette';
import { EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the blind. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover. The scene never crossfades under normal motion: a physical cover
 * moves, and the list blanks underneath it once it has landed.
 */
export default function Blind({ down, progress, label, reduced }: BlindProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: BLIND.left,
        top: BLIND.top,
        width: BLIND.width,
        height: BLIND.height,
        zIndex: 8,
        pointerEvents: down ? 'auto' : 'none',
        background: `repeating-linear-gradient(180deg, ${COLOURS.blindSlatA} 0 26px, ${COLOURS.blindSlatB} 26px 30px)`,
        border: `5px solid ${COLOURS.woodDark}`,
        borderRadius: 12,
        boxSizing: 'border-box',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced ? 'opacity 540ms linear' : `transform 540ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.06em', color: COLOURS.inkSign }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: progress * 5 > i ? COLOURS.woodDark : 'rgba(107,83,52,.28)',
              transition: 'background 160ms linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
```

- [ ] **Step 5: Write `CartStrip.tsx`**

```tsx
import { CART, CART_BLOCK_W, SLOT_GAP, SUBMIT_W, slotWidth } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { EASE_SETTLE } from './styles';

interface CartStripProps {
  /** One entry per list slot; null is an empty slot. */
  slots: (Item | null)[];
  listLength: number;
  submitEnabled: boolean;
  cartLabel: string;
  submitLabel: string;
  reduced: boolean;
  onRemove: (slot: number) => void;
  onSubmit: () => void;
}

export default function CartStrip({
  slots, listLength, submitEnabled, cartLabel, submitLabel, reduced, onRemove, onSubmit,
}: CartStripProps) {
  const w = slotWidth(listLength);

  return (
    <div style={{
      position: 'absolute', left: CART.left, top: CART.top, width: CART.width, height: CART.height,
      zIndex: 7, display: 'flex', alignItems: 'center', gap: SLOT_GAP,
      fontFamily: "'Baloo 2', sans-serif",
    }}>
      <div style={{
        width: CART_BLOCK_W, height: 124, flex: '0 0 auto',
        background: COLOURS.purple, borderBottom: `6px solid ${COLOURS.purpleEdge}`, borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        fontSize: 22, fontWeight: 800, color: COLOURS.creamLight, padding: 6, boxSizing: 'border-box',
      }}>
        {cartLabel}
      </div>

      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', gap: SLOT_GAP, justifyContent: 'center' }}>
        {slots.map((it, i) => (
          <button
            key={i}
            type="button"
            disabled={!it}
            onClick={() => it && onRemove(i)}
            aria-label={it ? it.name : undefined}
            style={{
              width: w, height: 124, flex: '0 0 auto', padding: 0,
              background: it ? COLOURS.creamSlot : 'transparent',
              border: it ? `4px solid ${COLOURS.creamBorder}` : `4px dashed ${COLOURS.slotDash}`,
              borderRadius: 14, boxSizing: 'border-box',
              cursor: it ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: it ? (reduced ? 'mm-fade 240ms ease both' : `mm-slidein 240ms ${EASE_SETTLE} both`) : undefined,
            }}
          >
            {it && <Product item={it} size={62} />}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!submitEnabled}
        style={{
          width: SUBMIT_W, height: 124, flex: '0 0 auto',
          background: submitEnabled ? COLOURS.green : COLOURS.greenMuted,
          // `border` must come first: the shorthand would otherwise wipe out borderBottom.
          border: 'none',
          borderBottom: `7px solid ${submitEnabled ? COLOURS.greenEdge : '#7A9273'}`,
          borderRadius: 16,
          fontSize: 34, fontWeight: 800, color: '#FFFFFF',
          fontFamily: "'Baloo 2', sans-serif",
          cursor: submitEnabled ? 'pointer' : 'default',
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning any of the five new files.

- [ ] **Step 7: Commit**

```bash
git add src/games/memory/MarketMemory/Backdrop.tsx src/games/memory/MarketMemory/Crate.tsx src/games/memory/MarketMemory/ListCard.tsx src/games/memory/MarketMemory/Blind.tsx src/games/memory/MarketMemory/CartStrip.tsx
git commit -m "feat(market-memory): backdrop, crates, list card, blind and cart strip"
```

---

### Task 7: Effects

**Files:**
- Create: `src/games/memory/MarketMemory/effectModel.ts`
- Create: `src/games/memory/MarketMemory/effects.tsx`

**Interfaces:**
- Consumes: `CONFETTI_COLOURS` from `./palette`
- Produces:
  - `type Effect = Confetti | Toast` where `interface Confetti { kind: 'confetti'; id: number; x: number; y: number; dx: number; dy: number; rot: number; w: number; h: number; round: boolean; colour: string; delay: number }` and `interface Toast { kind: 'toast'; id: number; x: number; y: number; text: string }`
  - `nextFxId(): number`
  - `CONFETTI_MS = 1150`, `TOAST_MS = 900`, `REAP_PAD_MS = 120`
  - `makeConfetti(x: number, y: number): Confetti[]`
  - `makeToast(x: number, y: number, text: string): Toast`
  - `lifetime(e: Effect): number`
  - `EffectView({ effect, reduced }: { effect: Effect; reduced: boolean })`

- [ ] **Step 1: Write `effectModel.ts`**

Effects are keyed by a monotonic sequence. Never key them by index: overlapping confetti bursts would recycle DOM nodes mid-animation.

```ts
import { CONFETTI_COLOURS } from './palette';

export interface Confetti {
  kind: 'confetti';
  id: number;
  x: number; y: number;
  dx: number; dy: number;
  rot: number;
  w: number; h: number;
  round: boolean;
  colour: string;
  delay: number;
}

export interface Toast {
  kind: 'toast';
  id: number;
  x: number; y: number;
  text: string;
}

export type Effect = Confetti | Toast;

export const CONFETTI_MS = 1150;
export const TOAST_MS = 900;
/** Reap a little after the animation ends so nothing pops mid-frame. */
export const REAP_PAD_MS = 120;

let FX_SEQ = 0;
export function nextFxId(): number {
  FX_SEQ += 1;
  return FX_SEQ;
}

const PIECES = 16;

export function makeConfetti(x: number, y: number): Confetti[] {
  return Array.from({ length: PIECES }, (_, i) => {
    const angle = (i / PIECES) * Math.PI * 2 + (Math.random() - 0.5) * 0.45;
    const radius = 90 + Math.random() * 80;
    return {
      kind: 'confetti' as const,
      id: nextFxId(),
      x, y,
      dx: Math.cos(angle) * radius,
      dy: Math.sin(angle) * radius * 0.7 - 30,
      rot: (Math.random() - 0.5) * 320,
      w: 10 + Math.random() * 7,
      h: 6 + Math.random() * 6,
      round: i % 3 === 0,
      colour: CONFETTI_COLOURS[i % CONFETTI_COLOURS.length],
      delay: Math.random() * 90,
    };
  });
}

export function makeToast(x: number, y: number, text: string): Toast {
  return { kind: 'toast', id: nextFxId(), x, y, text };
}

export function lifetime(e: Effect): number {
  return (e.kind === 'confetti' ? CONFETTI_MS + e.delay : TOAST_MS) + REAP_PAD_MS;
}
```

- [ ] **Step 2: Write `effects.tsx`**

The confetti custom properties carry their units on the values, not inside the `calc()`. Getting this wrong makes the whole burst sit still.

```tsx
import { COLOURS } from './palette';
import { CONFETTI_MS, TOAST_MS, type Effect } from './effectModel';
import { EASE_OUT } from './styles';

export function EffectView({ effect, reduced }: { effect: Effect; reduced: boolean }) {
  if (effect.kind === 'toast') {
    return (
      <div
        style={{
          position: 'absolute', left: effect.x, top: effect.y, zIndex: 9,
          transform: 'translate(-50%, 0)', pointerEvents: 'none',
          background: COLOURS.creamLight, border: `3px solid ${COLOURS.creamBorder}`,
          borderRadius: 12, padding: '6px 14px',
          fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 700, color: COLOURS.ink,
          animation: `${reduced ? 'mm-rise-ro' : 'mm-rise'} ${TOAST_MS}ms ease-out both`,
        }}
      >
        {effect.text}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', left: effect.x, top: effect.y, zIndex: 9, pointerEvents: 'none',
        width: effect.w, height: effect.h,
        background: effect.colour,
        borderRadius: effect.round ? '50%' : 2,
        // Units live on the values; calc() inside the keyframe consumes them as-is.
        ['--dx' as string]: `${effect.dx}px`,
        ['--dy' as string]: `${effect.dy}px`,
        ['--rot' as string]: `${effect.rot}deg`,
        animation: reduced
          ? `mm-fade ${CONFETTI_MS}ms ease ${effect.delay}ms both`
          : `mm-confetti ${CONFETTI_MS}ms ${EASE_OUT} ${effect.delay}ms both`,
      }}
    />
  );
}
```

- [ ] **Step 3: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning `effectModel.ts` or `effects.tsx`.

- [ ] **Step 4: Commit**

```bash
git add src/games/memory/MarketMemory/effectModel.ts src/games/memory/MarketMemory/effects.tsx
git commit -m "feat(market-memory): confetti and toast effects"
```

---

### Task 8: The phase machine

The three implementation warnings in spec section 12 all live here. They describe defects that were actually hit in the previous two games. Read them before writing a line.

**Files:**
- Create: `src/games/memory/MarketMemory/index.tsx`

**Interfaces:**
- Consumes: everything from Tasks 1-7, `useReducedMotion` from `src/lib/useReducedMotion.ts`, `LevelResult` from `src/components/GameShell`, `LevelConfig` from `src/games/types`
- Produces: `export default function MarketMemory({ levelConfig, onLevelComplete }: { levelConfig: LevelConfig; onLevelComplete: (result: LevelResult) => void }): JSX.Element`

- [ ] **Step 1: Write `index.tsx`**

```tsx
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { LevelResult } from '../../../components/GameShell';
import type { LevelConfig } from '../../types';
import { useReducedMotion } from '../../../lib/useReducedMotion';

import Backdrop from './Backdrop';
import Blind from './Blind';
import CartStrip from './CartStrip';
import Crate from './Crate';
import ListCard from './ListCard';
import { EffectView } from './effects';
import { lifetime, makeConfetti, makeToast, type Effect } from './effectModel';
import {
  BASKET, BOARD_H, BOARD_W, CANVAS_H, CANVAS_W, CAPTION, HINT_BTN, HUD_H,
} from './geometry';
import { BY_ID, type Item } from './items';
import { COLOURS } from './palette';
import { buildRound, scoreRound, type RoundScore } from './round';
import { EASE_SETTLE, MarketMemoryStyles } from './styles';

// ─── Timings ──────────────────────────────────────────────────────────────────

const BLIND_MS = 540;
/** The blind must land before the list blanks, or the player watches the rows vanish. */
const ARM_MS = 40;
const DOT_TICK_MS = 120;
const HINT_MS = 3000;

// ─── Params ───────────────────────────────────────────────────────────────────

interface MarketMemoryParams {
  listLength: number;
  listSeconds: number;
  retentionMs: number;
  similarPackaging: boolean;
  delayedRetrieval: boolean;
  listCategory: boolean;
  lives: number;
  hints: number;
}

const DEFAULT_PARAMS: MarketMemoryParams = {
  listLength: 4,
  listSeconds: 6000,
  retentionMs: 1500,
  similarPackaging: true,
  delayedRetrieval: false,
  listCategory: false,
  lives: 3,
  hints: 2,
};

type Phase = 'encoding' | 'retention' | 'shopping' | 'roundEnd' | 'outOfHearts';

interface MarketMemoryProps {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

export default function MarketMemory({ levelConfig, onLevelComplete }: MarketMemoryProps) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();

  const params = useMemo<MarketMemoryParams>(
    () => ({ ...DEFAULT_PARAMS, ...(levelConfig.params as unknown as Partial<MarketMemoryParams>) }),
    [levelConfig.params],
  );

  /**
   * Frozen in a lazy initialiser. A re-render must never reshuffle the round underneath
   * the player.
   */
  const [round] = useState(() => buildRound({
    listLength: params.listLength,
    similarPackaging: params.similarPackaging,
    listCategory: params.listCategory,
  }));

  const [phase, setPhase] = useState<Phase>('encoding');
  const [picked, setPicked] = useState<string[]>([]);
  const [covered, setCovered] = useState(false);
  const [blindDown, setBlindDown] = useState(false);
  const [retentionPct, setRetentionPct] = useState(0);
  const [lives, setLives] = useState(params.lives);
  const [hintsLeft, setHintsLeft] = useState(params.hints);
  const [peek, setPeek] = useState<string | null>(null);
  const [effects, setEffects] = useState<Effect[]>([]);
  const [result, setResult] = useState<RoundScore | null>(null);

  // Refs, so a callback fired seconds later never reads a stale closure.
  const phaseTimer = useRef<number | null>(null);
  const dotTimer = useRef<number | null>(null);
  const hintTimer = useRef<number | null>(null);
  const reapTimers = useRef<number[]>([]);
  const pickedRef = useRef<string[]>([]);
  const committedRef = useRef(false);
  const mountedAt = useRef(Date.now());
  const shoppingAt = useRef(0);
  const firstPickAt = useRef(0);
  const hintsUsedRef = useRef(0);
  const pickOrderRef = useRef<string[]>([]);

  useEffect(() => { pickedRef.current = picked; }, [picked]);

  /**
   * Warning 2 from the spec: kills both the pending phase timeout and the retention dot
   * interval. Missing either leaves an old timer to fire a stale transition mid-round.
   */
  const clearPhaseTimer = useCallback(() => {
    if (phaseTimer.current !== null) { window.clearTimeout(phaseTimer.current); phaseTimer.current = null; }
    if (dotTimer.current !== null) { window.clearInterval(dotTimer.current); dotTimer.current = null; }
  }, []);

  const later = useCallback((fn: () => void, ms: number) => {
    clearPhaseTimer();
    phaseTimer.current = window.setTimeout(fn, ms);
  }, [clearPhaseTimer]);

  useEffect(() => () => {
    clearPhaseTimer();
    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    reapTimers.current.forEach((id) => window.clearTimeout(id));
  }, [clearPhaseTimer]);

  const pushEffects = useCallback((fx: Effect[]) => {
    setEffects((prev) => [...prev, ...fx]);
    fx.forEach((f) => {
      const id = window.setTimeout(() => {
        // Reap by object identity. Filtering by id lets a stale reaper delete a live effect.
        setEffects((prev) => prev.filter((e) => e !== f));
      }, lifetime(f));
      reapTimers.current.push(id);
    });
  }, []);

  // ─── Phase schedule ─────────────────────────────────────────────────────────
  //
  // Warning 1 from the spec: every transition runs on a setTimeout against a deadline,
  // never on a display ticker. A ticker-driven machine deadlocks on a backgrounded tab.

  useEffect(() => {
    if (phase !== 'encoding') return;
    later(() => setPhase('retention'), params.listSeconds);
  }, [phase, params.listSeconds, later]);

  useEffect(() => {
    if (phase !== 'retention') return;

    setBlindDown(true);

    // Warning 3: blank the list only once the blind has landed.
    const armId = window.setTimeout(() => setCovered(true), BLIND_MS + ARM_MS);
    reapTimers.current.push(armId);

    const holdStart = Date.now() + BLIND_MS;
    dotTimer.current = window.setInterval(() => {
      const pct = (Date.now() - holdStart) / params.retentionMs;
      setRetentionPct(Math.max(0, Math.min(1, pct)));
    }, DOT_TICK_MS);

    phaseTimer.current = window.setTimeout(() => {
      if (dotTimer.current !== null) { window.clearInterval(dotTimer.current); dotTimer.current = null; }
      setRetentionPct(1);
      setBlindDown(false);
      phaseTimer.current = window.setTimeout(() => {
        shoppingAt.current = Date.now();
        setPhase('shopping');
      }, BLIND_MS);
    }, BLIND_MS + params.retentionMs);

    return () => { /* clearPhaseTimer runs on unmount and on the next transition */ };
  }, [phase, params.retentionMs]);

  // ─── Interaction ────────────────────────────────────────────────────────────

  const handleCrateTap = useCallback((index: number, x: number, y: number) => {
    if (phase !== 'shopping') return;
    const id = round.crates[index];

    if (pickedRef.current.includes(id)) {
      setPicked((prev) => prev.filter((p) => p !== id));
      return;
    }
    if (pickedRef.current.length >= round.list.length) {
      pushEffects([makeToast(x, y, t('mm.basketFull', 'Basket full'))]);
      return;
    }
    if (firstPickAt.current === 0) firstPickAt.current = Date.now();
    pickOrderRef.current.push(id);
    setPicked((prev) => [...prev, id]);
  }, [phase, round, pushEffects, t]);

  const handleRemove = useCallback((slot: number) => {
    if (phase !== 'shopping') return;
    setPicked((prev) => prev.filter((_, i) => i !== slot));
  }, [phase]);

  const handleHint = useCallback(() => {
    if (phase !== 'shopping' || hintsLeft <= 0) return;
    const remaining = round.list.filter((id) => !pickedRef.current.includes(id));
    if (remaining.length === 0) return;

    hintsUsedRef.current += 1;
    setHintsLeft((h) => h - 1);
    setPeek(remaining[Math.floor(Math.random() * remaining.length)]);

    if (hintTimer.current !== null) window.clearTimeout(hintTimer.current);
    hintTimer.current = window.setTimeout(() => setPeek(null), HINT_MS);
  }, [phase, hintsLeft, round.list]);

  const handleSubmit = useCallback(() => {
    if (phase !== 'shopping' || picked.length === 0) return;
    clearPhaseTimer();

    const score = scoreRound(round.list, picked);
    setResult(score);

    if (score.correct.length > 0) pushEffects(makeConfetti(400, 1000));

    const remaining = lives - score.livesLost;
    setLives(Math.max(0, remaining));
    setPhase(remaining <= 0 ? 'outOfHearts' : 'roundEnd');
  }, [phase, picked, round.list, lives, clearPhaseTimer, pushEffects]);

  const commit = useCallback((completed: boolean) => {
    if (committedRef.current) return;
    committedRef.current = true;
    const score = result ?? scoreRound(round.list, picked);
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.round((Date.now() - mountedAt.current) / 1000),
      completed,
      metrics: {
        correct: score.correct.length,
        wrong: score.wrong.length,
        missed: score.missed.length,
        listLength: round.list.length,
        hintsUsed: hintsUsedRef.current,
        timeToFirstPickMs: firstPickAt.current ? firstPickAt.current - shoppingAt.current : null,
        timeToSubmitMs: Date.now() - shoppingAt.current,
        pickOrder: [...pickOrderRef.current],
      },
    });
  }, [result, round.list, picked, levelConfig.id, onLevelComplete]);

  // ─── Presentation ───────────────────────────────────────────────────────────

  const wrapRef = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);

  useEffect(() => {
    function measure() {
      const el = wrapRef.current;
      if (!el) return;
      const rect = el.getBoundingClientRect();
      // Width comes from the layout; height cannot, because this sits inside a flex column
      // that sizes to its content. Measuring against the viewport avoids that circularity.
      const availH = Math.max(360, window.innerHeight - rect.top - 16);
      setScale(Math.min(rect.width / CANVAS_W, availH / CANVAS_H));
    }
    measure();
    const ro = new ResizeObserver(measure);
    if (wrapRef.current) ro.observe(wrapRef.current);
    window.addEventListener('resize', measure);
    return () => { ro.disconnect(); window.removeEventListener('resize', measure); };
  }, []);

  const listItems: Item[] = round.list.map((id) => BY_ID[id]);
  const slots: (Item | null)[] = Array.from({ length: round.list.length }, (_, i) =>
    picked[i] ? BY_ID[picked[i]] : null);

  const caption = phase === 'encoding'
    ? t('mm.caption.encoding', 'Remember the items from the list.')
    : phase === 'retention'
      ? t('mm.caption.retention', 'The list is covered now.')
      : t('mm.caption.shopping', 'Find and collect only those items, then press SUBMIT.');

  const card = phase === 'roundEnd' || phase === 'outOfHearts' ? phase : null;

  return (
    <div ref={wrapRef} style={{ width: '100%', height: CANVAS_H * scale, overflow: 'hidden' }}>
      <MarketMemoryStyles />
      <div style={{
        width: CANVAS_W, height: CANVAS_H, margin: '0 auto',
        transform: `scale(${scale})`, transformOrigin: 'top center',
        position: 'relative', fontFamily: "'Baloo 2', sans-serif", userSelect: 'none',
      }}>
        {/* HUD */}
        <div style={{
          position: 'absolute', left: 0, top: 0, width: CANVAS_W, height: HUD_H,
          background: `linear-gradient(180deg, ${COLOURS.navyHudTop} 0%, ${COLOURS.navyHudBot} 100%)`,
          borderBottom: `4px solid ${COLOURS.navyDeep}`,
          display: 'flex', alignItems: 'center', gap: 14, padding: '0 18px',
        }}>
          <div style={{ display: 'flex', gap: 10 }}>
            {[0, 1, 2].map((i) => (
              <span key={i} style={{
                fontSize: 34, lineHeight: 1,
                opacity: i < lives ? 1 : 0.22,
                filter: i < lives ? 'none' : 'grayscale(1)',
                transition: 'opacity 300ms linear',
              }}>❤️</span>
            ))}
          </div>
          <span aria-live="polite" style={{ fontSize: 17, fontWeight: 700, letterSpacing: '.12em', color: COLOURS.navyLabel }}>
            {t('mm.hearts', 'HEARTS')}
          </span>
        </div>

        {/* Board */}
        <div style={{ position: 'absolute', left: 0, top: HUD_H, width: BOARD_W, height: BOARD_H, overflow: 'hidden' }}>
          <Backdrop />

          <div style={{
            position: 'absolute', left: CAPTION.left, top: CAPTION.top, width: CAPTION.width, zIndex: 6,
            background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`, borderRadius: 16,
            padding: '10px 16px', textAlign: 'center',
            fontSize: 27, fontWeight: 700, color: COLOURS.ink,
            transition: 'opacity 260ms ease',
          }}>
            {caption}
          </div>

          <div style={{
            position: 'absolute', left: BASKET.left, top: BASKET.top, zIndex: 7,
            background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`, borderRadius: 14,
            padding: '8px 14px', fontSize: 22, fontWeight: 700, color: COLOURS.ink,
          }}>
            {t('mm.basket', 'Basket')} {picked.length}/{round.list.length}
          </div>

          <button
            type="button"
            onClick={handleHint}
            disabled={phase !== 'shopping' || hintsLeft <= 0}
            style={{
              position: 'absolute', right: HINT_BTN.right, top: HINT_BTN.top,
              width: HINT_BTN.width, height: HINT_BTN.height, zIndex: 7,
              background: COLOURS.amber, border: 'none', borderBottom: `7px solid ${COLOURS.amberEdge}`,
              borderRadius: 16, fontFamily: "'Baloo 2', sans-serif",
              fontSize: 26, fontWeight: 800, color: '#FFFFFF',
              opacity: phase !== 'shopping' || hintsLeft <= 0 ? 0.55 : 1,
              cursor: phase === 'shopping' && hintsLeft > 0 ? 'pointer' : 'default',
            }}
          >
            {t('mm.hint', 'HINT')} {hintsLeft}
          </button>

          {(phase === 'encoding' || phase === 'retention') && (
            <ListCard items={listItems} covered={covered} reduced={reduced} />
          )}

          <Blind
            down={blindDown}
            progress={retentionPct}
            label={t('mm.listCovered', 'LIST COVERED')}
            reduced={reduced}
          />

          {phase === 'shopping' && round.crates.map((id, i) => (
            <Crate
              key={id}
              item={BY_ID[id]}
              index={i}
              picked={picked.includes(id)}
              hinted={peek === id}
              reduced={reduced}
              onTap={handleCrateTap}
            />
          ))}

          {phase === 'shopping' && (
            <CartStrip
              slots={slots}
              listLength={round.list.length}
              submitEnabled={picked.length > 0}
              cartLabel={t('mm.myCart', 'MY CART')}
              submitLabel={t('mm.submit', 'SUBMIT')}
              reduced={reduced}
              onRemove={handleRemove}
              onSubmit={handleSubmit}
            />
          )}

          {effects.map((e) => <EffectView key={e.id} effect={e} reduced={reduced} />)}

          {card && result && (
            <>
              <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(20,48,79,.55)' }} />
              <div style={{
                position: 'absolute', left: '50%', top: '50%', zIndex: 10, width: 600,
                background: COLOURS.creamLight, border: `5px solid ${COLOURS.creamBorder}`, borderRadius: 22,
                padding: '32px 28px', textAlign: 'center',
                animation: `mm-cardin 260ms ${EASE_SETTLE} both`,
              }}>
                <div style={{
                  fontSize: 46, fontWeight: 800,
                  color: card === 'outOfHearts'
                    ? COLOURS.redDeep
                    : result.perfect ? COLOURS.greenResult : COLOURS.purple,
                }}>
                  {card === 'outOfHearts'
                    ? t('mm.gameOver', 'Market closed')
                    : result.perfect
                      ? t('mm.perfect', 'Whole list, exactly right')
                      : t('mm.checked', 'Basket checked')}
                </div>
                <p style={{ fontSize: 27, fontWeight: 500, color: COLOURS.inkSoft, margin: '16px 0 24px' }}>
                  {t('mm.summary', '{{correct}} of {{total}} right, {{wrong}} not on the list, {{missed}} missed.', {
                    correct: result.correct.length,
                    total: round.list.length,
                    wrong: result.wrong.length,
                    missed: result.missed.length,
                  })}
                </p>
                <button
                  type="button"
                  onClick={() => commit(card === 'roundEnd')}
                  style={{
                    background: COLOURS.green, border: 'none', borderBottom: `7px solid ${COLOURS.greenEdge}`,
                    borderRadius: 16, padding: '14px 40px',
                    fontFamily: "'Baloo 2', sans-serif", fontSize: 34, fontWeight: 800, color: '#FFFFFF',
                    cursor: 'pointer',
                  }}
                >
                  {card === 'roundEnd' ? t('mm.next', 'Next round') : t('mm.retry', 'Try again')}
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc --noEmit -p tsconfig.app.json`
Expected: no errors mentioning `MarketMemory/index.tsx`.

- [ ] **Step 3: Commit**

```bash
git add src/games/memory/MarketMemory/index.tsx
git commit -m "feat(market-memory): phase machine and board layout"
```

---

### Task 9: Registration, smoke test and release

The game is unreachable until this task. It ends with a real play-through, not a build.

**Files:**
- Modify: `src/screens/GameRouter.tsx`
- Modify: `src/components/GameShell.tsx`
- Modify: `src/screens/HomeScreen.tsx`
- Modify: `src/session/SessionManager.tsx`
- Modify: `src/screens/DailyQuestionnaire.tsx`
- Create: `public/placeholders/games/market-memory.svg`
- Modify: `package.json`

- [ ] **Step 1: Register in `src/screens/GameRouter.tsx`**

Add to the difficulty import block (which already imports `getServeGuestsParams`):

```ts
  getServeGuestsParams, getMarketMemoryParams,
```

Add with the other game imports:

```ts
import MarketMemory from '../games/memory/MarketMemory';
```

Add to `GAME_REGISTRY`, after the `train-yard` line:

```ts
  'market-memory':          { component: MarketMemory,       category: 'memory'    },
```

Add to `generateContentForGame`, alongside the other branches:

```ts
  if (gameId === 'market-memory') {
    const params = getMarketMemoryParams(score);
    return {
      levelConfig: { id: levelId, labelKey: `level.${level}`, params: params as unknown as Record<string, unknown> },
      generatedContent: undefined,
    };
  }
```

- [ ] **Step 2: Add the performance ratio in `src/components/GameShell.tsx`**

Insert before the `// Default for non-dynamic games` comment:

```ts
  if (gameId === 'market-memory') {
    // Wrong picks are penalised harder than misses: picking a twin is the specific
    // failure this game measures, whereas a miss is ordinary forgetting.
    const correct    = (m.correct    as number) ?? 0;
    const wrong      = (m.wrong      as number) ?? 0;
    const listLength = (m.listLength as number) ?? 4;
    const hintsUsed  = (m.hintsUsed  as number) ?? 0;
    const ratio = correct / Math.max(1, listLength) - wrong * 0.15 - hintsUsed * 0.05;
    return Math.max(0, Math.min(1, ratio));
  }
```

- [ ] **Step 3: Add the HomeScreen tile**

In `src/screens/HomeScreen.tsx`, add to the `memory` array after the `train-yard` entry:

```ts
    { id: 'market-memory',        nameKey: 'game.marketMemory',       icon: '🧺', imageSrc: '/placeholders/games/market-memory.svg' },
```

- [ ] **Step 4: Add to both rotation lists**

In `src/session/SessionManager.tsx`:

```ts
  memory:    ['remember-match', 'shopping-list-recall', 'sequence-repeat', 'picture-postcard', 'train-yard', 'market-memory'],
```

In `src/screens/DailyQuestionnaire.tsx`, add `'market-memory'` to the end of its `memory` array in the same way.

- [ ] **Step 5: Create the tile placeholder**

Create `public/placeholders/games/market-memory.svg`:

```svg
<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 200 140" width="200" height="140" role="img" aria-label="Market Memory">
  <rect width="200" height="140" fill="#C6E1F1"/>
  <rect y="78" width="200" height="62" fill="#C99A6B"/>
  <rect x="12" y="30" width="176" height="20" fill="#D24B42"/>
  <rect x="12" y="30" width="176" height="20" fill="url(#s)"/>
  <defs>
    <pattern id="s" width="34" height="20" patternUnits="userSpaceOnUse">
      <rect width="17" height="20" fill="#FBF3E4"/>
    </pattern>
  </defs>
  <rect x="12" y="50" width="176" height="5" fill="#A9352E"/>
  <rect x="30" y="86" width="42" height="32" rx="6" fill="#A9743F" stroke="#8A5A34" stroke-width="4"/>
  <rect x="80" y="86" width="42" height="32" rx="6" fill="#A9743F" stroke="#8A5A34" stroke-width="4"/>
  <rect x="130" y="86" width="42" height="32" rx="6" fill="#A9743F" stroke="#8A5A34" stroke-width="4"/>
  <circle cx="51" cy="100" r="9" fill="#D0453C"/>
  <rect x="92" y="92" width="18" height="20" rx="3" fill="#F7F5EF"/>
  <rect x="142" y="92" width="18" height="20" rx="3" fill="#DE9C22"/>
</svg>
```

- [ ] **Step 6: Run the full check**

```bash
npm test
npx tsc --noEmit -p tsconfig.app.json
npm run lint
npm run build
```

Expected:
- `npm test` PASSES, including the 20 new tests from Tasks 2 and 3.
- `tsc` reports no errors in any `MarketMemory` file.
- `npm run lint` reports **38 errors, 1 warning** - the exact pre-existing baseline. Any increase is yours; fix it.
- `npm run build` completes with no TypeScript or Vite errors.

- [ ] **Step 7: Manual smoke test**

Run `npm run dev` and open `http://localhost:5173`. Select a care home and profile, answer the questionnaire, then open Market Memory from the home screen. Verify each of these:

1. The shopping list appears with rows sliding in one after another, roughly 90ms apart.
2. The blind **drops** over the list, and the rows are still visible until it has fully landed. If you can see the rows vanish through the drop, warning 3 has been violated.
3. Five dots fill left to right while the blind is down, then it lifts.
4. Twelve crates are live. Each shows packaging, an emoji where one exists, and the item name in text.
5. Tapping a crate lifts it, turns its border green, dims it and adds a tick badge, and fills the next cart slot.
6. Tapping a picked crate, or its filled cart slot, removes it.
7. Filling the basket then tapping another crate floats a "Basket full" toast and takes no pick.
8. HINT glows an uncollected target's crate for about 3 seconds and decrements. It disables at 0.
9. SUBMIT is grey with nothing picked and green with at least one pick.
10. Submitting shows the result card with correct counts, and confetti fires if anything was right.
11. "Next round" starts a fresh round with a different shelf arrangement.
12. Refresh the page mid-session and confirm the Resume Session button appears on the home screen.
13. No errors in the browser console at any point.

Then set the OS to reduce motion (Windows: Settings, Accessibility, Visual effects, Animation effects off) and reload. Verify the blind cross-fades rather than dropping, and that the phase timing is unchanged.

- [ ] **Step 8: Bump the version**

New game, so this is a **minor** bump. `package.json` currently reads `1.5.0` in the working tree.

```json
  "version": "1.6.0",
```

- [ ] **Step 9: Commit**

```bash
git add src/screens/GameRouter.tsx src/components/GameShell.tsx src/screens/HomeScreen.tsx src/session/SessionManager.tsx src/screens/DailyQuestionnaire.tsx public/placeholders/games/market-memory.svg package.json
git commit -m "feat: Market Memory game (v1.6.0)"
```

---

## Notes for the implementer

- **Do not add the game to `public/locales/*/common.json`.** Every in-game string uses `t(key, fallback)`, so English works with no locale entry, and Hindi and Kannada are explicitly out of scope.
- **The HomeScreen tile name needs no locale key either**, although every other game has one. `HomeScreen.tsx:251` calls `t(game.nameKey, <id-derived fallback>)`, and the fallback derives "Market Memory" from the id `market-memory`, which is exactly the wanted string. Adding `"game.marketMemory"` to `en/common.json` would be harmless but is deliberately left out of scope; do not treat its absence as a bug.
- **The lint baseline is 38 errors.** Do not "fix" the pre-existing ones; that is unrelated code and out of scope. Only ensure you add none.
- **If `npm run build` fails on an unrelated pre-existing error**, stop and report it rather than fixing it.
- The working tree already contains substantial uncommitted work from other features (ServeTheGuests, cook assets, locale edits). **Stage only the files each task lists.** Never use `git add -A` or `git commit -a`.
