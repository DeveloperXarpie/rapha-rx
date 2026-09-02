# App Flow Redesign — Phase 2 (Session Flow) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the resident's session flow with the redesigned one — launch, education, home, three category intros, three game title screens, free play and summary — driven by a trio of games decided once at session start.

**Architecture:** State first, then routing, then screens. Tasks 1-3 move every decision that used to be scattered across `DailyQuestionnaire`, `GameShell` and `SessionManager` into two pure, tested modules (`sessionPlan.ts`, `lastLevel.ts`), so the seven screens that follow are presentation over settled data. Onboarding is untouched: the old care-home screens still sign residents in and now land them on the new Home.

**Tech Stack:** React 18, TypeScript, Vite 7, Tailwind 3, react-router-dom 6, Zustand, Dexie, i18next, vitest (node environment).

**Spec:** `docs/superpowers/specs/2026-09-02-app-flow-redesign-design.md`

**Phase 1 (complete):** `docs/superpowers/plans/2026-09-02-app-flow-redesign-phase-1.md` — provides `gameCatalog.ts`, `BRAND`/`CATEGORY_BRAND`, `brand.css`, `Button` green/blue, and `chrome/{ScreenBlue,WaveOverlay,CategoryBadge,ProgressBar,GameRow,GameTile,ScreenTransition,transitions}`.

## Global Constraints

- **Version bump every commit**, per `CLAUDE.md`. Phase 2 is a patch series on 1.18.0, closing at **1.19.0**.
- **`npm run lint` must not add errors.** Baseline is 38 errors + 1 warning; the gate is no new ones.
- **`npm test` must pass.** Baseline 33 files / 356 tests.
- **`npm run build` must pass** (`tsc -b && vite build`).
- **Never use an em dash.** Plain dash only.
- **Do not add a `Co-Authored-By` trailer** naming an agent.
- **Every user-visible string goes through `t()`** with a fallback, and gets a real key in all three of `public/locales/{en,hi,kn}/common.json`. Keys are flat and dot-separated (the file has 513 such keys already). Hindi and Kannada are currently 100% translated - do not regress that by adding English-only values.
- **`executive` is always the category key.** "Planning" is a display label only.
- **The marquee six** (from `gameCatalog.ts`, confirmed against the art): `market-memory` Shopping List, `train-yard` Station Master, `spot-focus` Spot Focus, `garden-keeper` Garden Keeper, `serve-guests` Tiffen Time, `clear-the-way` Free Me.
- **`ROTATION_THRESHOLD_SECONDS` is 120** (`GameShell.tsx:36`) and does **not** change. A category runs repeated rounds of one game until two minutes elapse, then rotates. Home's duration copy is derived from it.
- **Onboarding is out of scope.** `CareHomeSelector`, `ProfileSelector`, `SignupFlow` and `/login/:careHomeId` must all still work at the end of this phase.
- **Game boards are out of scope.** `GameShell`'s in-board chrome is not restyled.

## Decisions made during planning

Two things the spec assumed turned out to be false when the art was inspected. Both were put to the user and settled:

1. **Game title screens are the supplied art, not a rebuild.** `splash-*.webp` is a finished screen: it already contains the logo lockup, tagline, the cream "scientifically designed game" panel and a painted PLAY button. There is no clean background plate, so the handoff's "build these as real screens" is not buildable without new art. **Decision: ship the art as-is with a real, full-size transparent button positioned over the painted PLAY**, so the control is focusable, has an accessible name and shows a focus ring. Accepted limitation: the text on these six screens stays English in all three languages.
2. **Tile art carries painted English game names.** `GameRow` renders the localised name beside it, so a Hindi row shows both. **Decision: accepted** - it matches how `serve-guests` already paints an English title into its own board.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/sessionPlan.ts` | `pickTrio` and `nextStep` - every "which game, what next" decision, pure and tested |
| `src/lib/__tests__/sessionPlan.test.ts` | Tests for the above |
| `src/lib/lastLevel.ts` | Read and write the per-game last level on `gameProgress` |
| `src/lib/__tests__/lastLevel.test.ts` | Tests for the above |
| `src/components/AppBootGate.tsx` | Holds `LaunchScreen` until boot resolves, minimum 1200 ms |
| `src/screens/LaunchScreen.tsx` | White brand frame on cold start |
| `src/screens/EducationScreen.tsx` | "Keep Your Brain Active", before every session |
| `src/screens/CategoryIntro.tsx` | Per-category 2 s intro, replaces `RotationScreen` |
| `src/screens/GameTitleScreen.tsx` | Full-bleed splash art with a real PLAY control |
| `src/screens/FreePlayScreen.tsx` | Free-play grid, replaces Home's inline Practice Mode |

**Modified:**

| File | Change |
|---|---|
| `src/store/index.ts` | `plannedGames`; `questionnaireCompleted` renamed `sessionStarted`; `startSession` owns trio + first game; `persistSession` carries both new fields |
| `src/lib/db.ts` | `SessionState.plannedGames`; `GameProgress.lastLevel`/`lastPlayedISO`. Both non-indexed, no version bump |
| `src/lib/resumeSession.ts` | Reads `sessionStarted` |
| `src/session/SessionManager.tsx` | `triggerRotation` delegates to `nextStep`; stale `GAME_BY_CATEGORY` and `pickGame` deleted |
| `src/components/GameShell.tsx` | Writes `lastLevel`; free-play completion returns to the library |
| `src/components/AppShell.tsx` | Header removed; route match becomes a prefix test covering intro/title routes |
| `src/screens/HomeScreen.tsx` | Rebuilt |
| `src/screens/SessionSummary.tsx` | Restyled; reads `plannedGames` instead of hardcoded gameIds |
| `src/App.tsx` | New routes and redirects |
| `public/locales/{en,hi,kn}/common.json` | New keys |

**Deleted:** `src/screens/RotationScreen.tsx`, `src/screens/DailyQuestionnaire.tsx`

**Deliberate divergence from the writing-plans default:** for the seven screens, this plan gives the exact handoff spec (elements, tokens, sizes, copy), the component contract, the i18n keys and the verification - and full code only for the non-obvious parts (timers, guards, data flow, the store surgery). Transcribing seven screens of layout JSX into the plan and then again into the repo is duplicated work, and the handoff README is already the pixel authority. Every task still ends in an independently verifiable deliverable.

---

### Task 1: Session state - the trio and the flag rename

The riskiest change in the phase, done first and alone. `questionnaireCompleted` is load-bearing in three places and a partial rename silently breaks resume, which is invisible until a resident refreshes mid-session.

**Files:**
- Create: `src/lib/sessionPlan.ts`, `src/lib/__tests__/sessionPlan.test.ts`
- Modify: `src/lib/db.ts`, `src/store/index.ts`, `src/lib/resumeSession.ts`, `package.json`

**Interfaces:**
- Consumes: `marqueeByCategory`, `GameCatalogEntry` from `src/lib/gameCatalog.ts`.
- Produces:
  - `const CATEGORY_ORDER: GameCategory[]` = `['memory', 'attention', 'executive']`
  - `function pickTrio(previous?: string[] | null, rng?: () => number): string[]` - one marquee gameId per category in `CATEGORY_ORDER`, never repeating the same category's entry from `previous`.
  - `CurrentSession.plannedGames: string[]` and `CurrentSession.sessionStarted: boolean`
  - Tasks 3, 7, 8 and 10 all read `plannedGames`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/sessionPlan.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { pickTrio, CATEGORY_ORDER } from '../sessionPlan';
import { getGame } from '../gameCatalog';

describe('pickTrio', () => {
  it('returns one marquee game per category, in play order', () => {
    const trio = pickTrio(null);
    expect(trio).toHaveLength(3);
    trio.forEach((id, i) => {
      const g = getGame(id);
      expect(g, `${id} is in the catalog`).toBeDefined();
      expect(g!.marquee).toBe(true);
      expect(g!.category).toBe(CATEGORY_ORDER[i]);
    });
  });

  it('never repeats the previous session game for the same category', () => {
    const first = pickTrio(null);
    for (let i = 0; i < 40; i++) {
      const next = pickTrio(first);
      next.forEach((id, slot) => expect(id).not.toBe(first[slot]));
    }
  });

  it('is deterministic given an rng', () => {
    // Each category has exactly two marquee games; 0 picks the first, 0.99 the second.
    expect(pickTrio(null, () => 0)).toEqual(['market-memory', 'spot-focus', 'serve-guests']);
    expect(pickTrio(null, () => 0.99)).toEqual(['train-yard', 'garden-keeper', 'clear-the-way']);
  });

  it('ignores a previous trio that names games no longer marquee', () => {
    const trio = pickTrio(['remember-match', 'word-search', 'recipe-builder']);
    expect(trio).toHaveLength(3);
    trio.forEach((id) => expect(getGame(id)!.marquee).toBe(true));
  });

  it('tolerates a short or empty previous trio', () => {
    expect(pickTrio([])).toHaveLength(3);
    expect(pickTrio(['market-memory'])).toHaveLength(3);
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/sessionPlan.test.ts`
Expected: FAIL, cannot resolve `../sessionPlan`.

- [ ] **Step 3: Write `sessionPlan.ts`**

```ts
import { marqueeByCategory } from './gameCatalog';
import type { GameCategory } from '../styles/tokens';

/** The order categories are played in, and the order plannedGames is indexed by. */
export const CATEGORY_ORDER: GameCategory[] = ['memory', 'attention', 'executive'];

/**
 * Chooses the three games for a session: one marquee game per category, never
 * repeating the game that category ran last session.
 *
 * Pure, and takes its rng, so the caller can make it deterministic in a test.
 * Called once by startSession - deciding lazily at each rotation would let Home
 * display a trio the session then contradicts.
 */
export function pickTrio(
  previous?: string[] | null,
  rng: () => number = Math.random,
): string[] {
  return CATEGORY_ORDER.map((category, slot) => {
    const options = marqueeByCategory(category);
    const last = previous?.[slot];
    // Filtering can empty the list if a category ever drops to one marquee game,
    // so fall back to the unfiltered set rather than returning undefined.
    const fresh = options.filter((g) => g.id !== last);
    const pool = fresh.length > 0 ? fresh : options;
    return pool[Math.floor(rng() * pool.length)].id;
  });
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/sessionPlan.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 5: Add the two fields to Dexie's types**

In `src/lib/db.ts`, add to `SessionState`:

```ts
  /**
   * The three gameIds this session will play, memory/attention/executive.
   * Not indexed, so this needs no Dexie version bump - same as tipCardPhotoShown.
   * An older row reads undefined; the store treats that as "not yet planned".
   */
  plannedGames?: string[];
```

and rename its `questionnaireCompleted` to `sessionStarted` **in the same edit**:

```ts
  /**
   * Set by startSession. Was `questionnaireCompleted` until the redesign, when
   * the questionnaire screen became an information screen shown before every
   * session and so could no longer own a once-per-day flag.
   */
  sessionStarted: boolean;
```

Do **not** add a `.version(4)` block. `.stores()` declares indexes only, and neither field is indexed.

- [ ] **Step 6: Rename and extend the store**

In `src/store/index.ts`, all in one edit:

1. `CurrentSession`: rename `questionnaireCompleted: boolean` to `sessionStarted: boolean`; add `plannedGames: string[]`.
2. `defaultSession`: rename the key, add `plannedGames: []`.
3. `persistSession`'s `dbState` literal: rename the key and **add `plannedGames: state.plannedGames`**. This literal hand-copies every field; anything missing from it is dropped on every write.
4. `AppState`: rename the `markQuestionnaireComplete` action to `markSessionStarted` (keep it - `devCompleteToday` and the summary rely on the flag).
5. `startSession` becomes the single session-start point:

```ts
      startSession: () => {
        const today = todayISO();
        const existing = get().currentSession;

        // Don't wipe an in-progress session for today, and never re-roll its trio.
        if (existing.date === today && existing.sessionStarted) return;

        const updated: CurrentSession = {
          ...defaultSession,
          date: today,
          sessionStarted: true,
          sessionStartedAt: Date.now(),
          plannedGames: pickTrio(existing.plannedGames),
          currentCategory: CATEGORY_ORDER[0],
          currentGameId: null,
        };
        updated.currentGameId = updated.plannedGames[0];
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },
```

   Note `startSession` now sets `sessionStarted` itself, which `DailyQuestionnaire` used to do. That screen is deleted in Task 7; until then it calls `markSessionStarted`, which is harmless.

6. `devCompleteToday`: rename `questionnaireCompleted: true` to `sessionStarted: true`, and give it a trio if it has none, so the dev shortcut produces a session the new screens can render:

```ts
          plannedGames: prev.plannedGames?.length ? prev.plannedGames : pickTrio(null),
```

7. Add the import: `import { pickTrio, CATEGORY_ORDER } from '../lib/sessionPlan';`

8. `setActiveProfile` spreads a Dexie row into `currentSession`. A row written before this task has no `plannedGames`, so normalise it there:

```ts
        if (existingSession) {
          const { id, userId, ...sessionData } = existingSession as any;
          set({ currentSession: { ...defaultSession, ...sessionData,
                                  plannedGames: sessionData.plannedGames ?? [] } });
        } else {
```

- [ ] **Step 7: Rename in `resumeSession.ts`**

`src/lib/resumeSession.ts:17` reads `state.questionnaireCompleted`. Change to `state.sessionStarted`.

- [ ] **Step 8: Find every remaining reference**

Run:

```bash
grep -rn "questionnaireCompleted\|markQuestionnaireComplete" src/ || echo "clean"
```

Expected: only `src/screens/DailyQuestionnaire.tsx` (deleted in Task 7). Update it to call `markSessionStarted` so the app still builds.

- [ ] **Step 9: Verify**

```bash
npm run lint && npm test && npm run build
```

Expected: 38 errors, 361 tests (356 + 5), clean build.

Then `npm run dev`, and with a profile signed in: start a session, and in DevTools confirm `localStorage['brain-training-store']` holds a `currentSession.plannedGames` array of three marquee ids and `sessionStarted: true`. Refresh and confirm the Resume button still appears.

- [ ] **Step 10: Commit**

Bump to `1.18.1`.

```bash
git add src/lib/sessionPlan.ts src/lib/__tests__/sessionPlan.test.ts src/lib/db.ts \
        src/store/index.ts src/lib/resumeSession.ts src/screens/DailyQuestionnaire.tsx package.json
git commit -m "feat(session): plan the trio at session start, rename the started flag

startSession now picks one marquee game per category, never repeating the
previous session's game for that category, and stores the result so Home can
show the three games it is actually about to play.

questionnaireCompleted becomes sessionStarted. The questionnaire screen is
becoming an information screen shown before every session, so it can no
longer own a once-per-day flag - and that flag gates resume.

No Dexie version bump: .stores() declares indexes only and neither new field
is indexed. persistSession's hand-copied field list does need both, or they
are dropped on every write."
```

---

### Task 2: Last level

**Files:**
- Create: `src/lib/lastLevel.ts`, `src/lib/__tests__/lastLevel.test.ts`
- Modify: `src/lib/db.ts`, `src/components/GameShell.tsx`, `package.json`

**Interfaces:**
- Produces:
  - `async function recordLastLevel(userId: string, gameId: string, level: number): Promise<void>`
  - `async function getLastLevels(userId: string, gameIds: string[]): Promise<Record<string, number>>` - omits games never played, so a caller renders no level line rather than "level 0".
  - Tasks 8 and 9 consume `getLastLevels`.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/lastLevel.test.ts`. The repo already uses `fake-indexeddb` for Dexie tests - follow `src/lib/picturePostcard/__tests__/db.test.ts` for the import shape.

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import 'fake-indexeddb/auto';
import { appDb } from '../db';
import { recordLastLevel, getLastLevels } from '../lastLevel';

const USER = 'u1';

describe('lastLevel', () => {
  beforeEach(async () => {
    await appDb.gameProgress.clear();
  });

  it('returns nothing for a user who has never played', async () => {
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({});
  });

  it('records and reads back a level', async () => {
    await recordLastLevel(USER, 'market-memory', 7);
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({ 'market-memory': 7 });
  });

  it('overwrites rather than appending, so one row per user and game', async () => {
    await recordLastLevel(USER, 'market-memory', 3);
    await recordLastLevel(USER, 'market-memory', 9);
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({ 'market-memory': 9 });
    const rows = await appDb.gameProgress.where('[userId+gameId]').equals([USER, 'market-memory']).toArray();
    expect(rows).toHaveLength(1);
  });

  it('omits games with no level and keeps the ones that have it', async () => {
    await recordLastLevel(USER, 'spot-focus', 4);
    const got = await getLastLevels(USER, ['spot-focus', 'serve-guests']);
    expect(got).toEqual({ 'spot-focus': 4 });
  });

  it('does not leak another user rows', async () => {
    await recordLastLevel('other', 'spot-focus', 5);
    expect(await getLastLevels(USER, ['spot-focus'])).toEqual({});
  });
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `npx vitest run src/lib/__tests__/lastLevel.test.ts`
Expected: FAIL, cannot resolve `../lastLevel`.

- [ ] **Step 3: Add the fields to `GameProgress`**

In `src/lib/db.ts`, add to `GameProgress`:

```ts
  /**
   * The level this game last reached, for Home's "Last time: level n".
   *
   * Stored rather than derived. getTodayDifficulty looks like the obvious
   * source but is not: it is async, it writes on a cache miss (so rendering
   * Home would create difficulty rows for unplayed games), and on a fresh day
   * it returns yesterday's peak decayed by the warm-up factor rather than the
   * level actually reached.
   *
   * Not indexed, so no Dexie version bump.
   */
  lastLevel?: number;
  lastPlayedISO?: string;
```

- [ ] **Step 4: Write `lastLevel.ts`**

```ts
import { appDb } from './db';

/**
 * Records the level a game reached. Called by GameShell wherever it already
 * calls adjustDifficulty, so it stays in step with the difficulty system
 * without reading through it.
 */
export async function recordLastLevel(userId: string, gameId: string, level: number): Promise<void> {
  const existing = await appDb.gameProgress.where('[userId+gameId]').equals([userId, gameId]).first();
  const lastPlayedISO = new Date().toISOString().split('T')[0];
  if (existing?.id != null) {
    await appDb.gameProgress.update(existing.id, { lastLevel: level, lastPlayedISO });
    return;
  }
  await appDb.gameProgress.add({
    userId,
    gameId,
    currentLevelId: 'level_1',
    consecutiveCompletions: 0,
    consecutiveIncompletes: 0,
    hasBeenPromptedForLevel: false,
    lastLevel: level,
    lastPlayedISO,
  });
}

/**
 * Batched read for Home and the free-play grid. Games never played are absent
 * from the result rather than present as 0 - a resident who has not played a
 * game should not be told they reached nothing.
 */
export async function getLastLevels(
  userId: string, gameIds: string[],
): Promise<Record<string, number>> {
  const rows = await appDb.gameProgress.where('userId').equals(userId).toArray();
  const wanted = new Set(gameIds);
  const out: Record<string, number> = {};
  for (const r of rows) {
    if (wanted.has(r.gameId) && typeof r.lastLevel === 'number') out[r.gameId] = r.lastLevel;
  }
  return out;
}
```

- [ ] **Step 5: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/lastLevel.test.ts`
Expected: PASS, 5 tests.

- [ ] **Step 6: Write it from GameShell**

`GameShell.tsx` already computes `newDifficultyScore` from `adjustDifficulty` around line 95. Immediately after that block, record the level. `scoreToLevel` is already imported from `../lib/dynamicDifficulty` in `GameRouter`; import it here too.

```ts
      // Keep Home's "Last time: level n" in step with the difficulty system
      // without reading through getTodayDifficulty, which writes on a cache miss.
      if (profile) {
        void recordLastLevel(profile.userId, gameId, scoreToLevel(updated.score));
      }
```

Fire-and-forget is deliberate and matches how the surrounding analytics and Firestore writes already behave; a failed write costs a level label, not a round.

- [ ] **Step 7: Verify**

```bash
npm run lint && npm test && npm run build
```

Expected: 38 errors, 366 tests, clean build.

Then in the app, play one round of any game, and confirm in DevTools (Application, IndexedDB, BrainTrainingDB, gameProgress) that the row for that gameId now has `lastLevel` and `lastPlayedISO`.

- [ ] **Step 8: Commit**

Bump to `1.18.2`.

```bash
git add src/lib/lastLevel.ts src/lib/__tests__/lastLevel.test.ts src/lib/db.ts \
        src/components/GameShell.tsx package.json
git commit -m "feat(session): store the level each game last reached

Home needs 'Last time: level n'. getTodayDifficulty looks like the source
but is not: it is async, it writes on a cache miss - so rendering Home would
create difficulty rows for three unplayed games - and on a fresh day it
returns yesterday's peak decayed by the warm-up factor, not the level the
resident actually reached.

Two non-indexed fields on gameProgress instead, written where GameShell
already adjusts difficulty. Games never played are absent from the read
rather than zero, so Home renders no level line for them."
```

---

### Task 3: Rotation

Every destination decision moves into one tested function. This is the highest-risk function in the phase.

**Files:**
- Modify: `src/lib/sessionPlan.ts`, `src/lib/__tests__/sessionPlan.test.ts`, `src/session/SessionManager.tsx`, `package.json`

**Interfaces:**
- Produces:
  - `type NextStep = { kind: 'intro'; category: GameCategory; gameId: string } | { kind: 'summary' } | { kind: 'stay' }`
  - `function nextStep(args: { currentCategory: string | null; categoriesCompleted: string[]; plannedGames: string[] }): NextStep`
  - `'stay'` means the session is already complete, so the caller must not navigate. That is the free-play case: the category ticker keeps running after a session ends, and without this a free-play round crossing two minutes would fire rotation and bounce the resident to the summary.

- [ ] **Step 1: Write the failing tests**

Append to `src/lib/__tests__/sessionPlan.test.ts`:

```ts
import { nextStep } from '../sessionPlan';

const TRIO = ['market-memory', 'spot-focus', 'serve-guests'];

describe('nextStep', () => {
  it('advances memory to attention', () => {
    expect(nextStep({ currentCategory: 'memory', categoriesCompleted: [], plannedGames: TRIO }))
      .toEqual({ kind: 'intro', category: 'attention', gameId: 'spot-focus' });
  });

  it('advances attention to executive', () => {
    expect(nextStep({ currentCategory: 'attention', categoriesCompleted: ['memory'], plannedGames: TRIO }))
      .toEqual({ kind: 'intro', category: 'executive', gameId: 'serve-guests' });
  });

  it('goes to the summary after the third category', () => {
    expect(nextStep({ currentCategory: 'executive', categoriesCompleted: ['memory', 'attention'], plannedGames: TRIO }))
      .toEqual({ kind: 'summary' });
  });

  it('stays put when the session is already complete, so free play is not hijacked', () => {
    expect(nextStep({
      currentCategory: null,
      categoriesCompleted: ['memory', 'attention', 'executive'],
      plannedGames: TRIO,
    })).toEqual({ kind: 'stay' });
  });

  it('stays put during a free-play round after a completed session', () => {
    expect(nextStep({
      currentCategory: 'memory',
      categoriesCompleted: ['memory', 'attention', 'executive'],
      plannedGames: TRIO,
    })).toEqual({ kind: 'stay' });
  });

  it('plans a trio on the fly when a pre-migration session has none', () => {
    const step = nextStep({ currentCategory: 'memory', categoriesCompleted: [], plannedGames: [] });
    expect(step.kind).toBe('intro');
    if (step.kind === 'intro') {
      expect(step.category).toBe('attention');
      expect(getGame(step.gameId)!.marquee).toBe(true);
    }
  });
});
```

- [ ] **Step 2: Run to verify failure**

Run: `npx vitest run src/lib/__tests__/sessionPlan.test.ts`
Expected: FAIL, `nextStep` is not exported.

- [ ] **Step 3: Implement `nextStep`**

Append to `src/lib/sessionPlan.ts`:

```ts
export type NextStep =
  | { kind: 'intro'; category: GameCategory; gameId: string }
  | { kind: 'summary' }
  /** The session is already done. The caller must not navigate. */
  | { kind: 'stay' };

/**
 * Decides what happens when a category finishes. The only place that decision
 * lives - it used to be split across DailyQuestionnaire, GameShell and
 * SessionManager, with two of them holding stale copies of the game list.
 *
 * `stay` exists for free play. The per-category ticker keeps running once a
 * session is complete, so a free-play round crossing the two-minute threshold
 * would otherwise fire rotation, find every category done and throw the
 * resident into the session summary.
 */
export function nextStep(args: {
  currentCategory: string | null;
  categoriesCompleted: string[];
  plannedGames: string[];
}): NextStep {
  const { currentCategory, categoriesCompleted, plannedGames } = args;

  const alreadyDone = CATEGORY_ORDER.every((c) => categoriesCompleted.includes(c));
  if (alreadyDone) return { kind: 'stay' };

  const completed = currentCategory && !categoriesCompleted.includes(currentCategory)
    ? [...categoriesCompleted, currentCategory]
    : categoriesCompleted;

  const next = CATEGORY_ORDER.find((c) => !completed.includes(c));
  if (!next) return { kind: 'summary' };

  // A session started before plannedGames existed has none. Plan the whole trio
  // once rather than picking a single game lazily, so the rest of the session
  // behaves like a fresh one.
  const trio = plannedGames.length === 3 ? plannedGames : pickTrio(null);
  return { kind: 'intro', category: next, gameId: trio[CATEGORY_ORDER.indexOf(next)] };
}
```

- [ ] **Step 4: Run to verify pass**

Run: `npx vitest run src/lib/__tests__/sessionPlan.test.ts`
Expected: PASS, 11 tests.

- [ ] **Step 5: Rewrite `triggerRotation`**

In `src/session/SessionManager.tsx`: delete `ALL_CATEGORIES`, `GAME_BY_CATEGORY` and `pickGame` entirely (both were stale - neither listed `serve-guests` or `clear-the-way`), and replace `triggerRotation`:

```ts
  const triggerRotation = useCallback(() => {
    if (!profile) return;

    const step = nextStep({
      currentCategory: session.currentCategory,
      categoriesCompleted: session.categoriesCompleted,
      plannedGames: session.plannedGames,
    });

    // Free play after a completed session. Nothing to rotate into; the game's
    // own onLevelComplete takes the resident back to the library.
    if (step.kind === 'stay') return;

    if (session.currentCategory) markCategoryComplete(session.currentCategory);

    if (step.kind === 'summary') {
      navigate('/app/summary');
      return;
    }

    setCurrentCategory(step.category);
    setCurrentGame(step.gameId);
    navigate(`/app/intro/${step.category}`);
  }, [profile, session, markCategoryComplete, setCurrentCategory, setCurrentGame, navigate]);
```

Also add `plannedGames` to the `SessionContextValue` interface and to `value`, so screens can read it from the context rather than reaching into the store.

- [ ] **Step 6: Verify**

```bash
npm run lint && npm test && npm run build
```

Expected: 38 errors, 372 tests, clean build. The build will still pass because `/app/intro/:category` does not exist yet - React Router matches at runtime, not compile time. That route arrives in Task 4, and until then a rotation lands on the `*` fallback. This is the one task in the phase whose deliverable is not independently exercisable in the browser; its gate is the tests.

- [ ] **Step 7: Commit**

Bump to `1.18.3`.

```bash
git add src/lib/sessionPlan.ts src/lib/__tests__/sessionPlan.test.ts \
        src/session/SessionManager.tsx package.json
git commit -m "feat(session): one tested function decides what follows a category

triggerRotation now delegates to nextStep. Both stale GAME_BY_CATEGORY maps
go with it - neither listed serve-guests or clear-the-way, so two of the six
games the redesign makes marquee were unreachable by rotation.

nextStep has a third outcome the old code did not: stay. The per-category
ticker keeps running after a session completes, so a free-play round
crossing two minutes used to fire rotation, find every category done and
throw the resident into the session summary."
```

---

### Task 4: Routing, the launch gate, and AppShell

**Files:**
- Create: `src/screens/LaunchScreen.tsx`, `src/components/AppBootGate.tsx`
- Modify: `src/App.tsx`, `src/components/AppShell.tsx`, `src/main.tsx`, locales, `package.json`

**Interfaces:**
- Produces: the route table below, and `AppBootGate` wrapping `<App/>`'s router.

- [ ] **Step 1: Build `LaunchScreen`**

Per the handoff section 1: full-bleed `#FFFFFF`, centred `/brand/logo-launch.png` at `width: 258px`, no controls, no text. `aria-busy="true"` on the container and a visually-hidden `t('launch.loading', 'Loading')` so a screen reader is not met with silence.

- [ ] **Step 2: Build `AppBootGate`**

```tsx
/**
 * Holds the launch screen until the app is genuinely usable, then hands over.
 *
 * Boot is "i18n ready and Dexie open". The 1200 ms floor is from the handoff
 * and exists so a fast boot does not flash the logo; the gate resolves on
 * whichever finishes last.
 *
 * Local state rather than a store field: nothing else in the app needs to know
 * the app has booted.
 */
const MIN_DWELL_MS = 1200;

export default function AppBootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const floor = new Promise((r) => setTimeout(r, MIN_DWELL_MS));
    const boot = Promise.all([
      i18n.isInitialized ? Promise.resolve() : new Promise((r) => i18n.on('initialized', r)),
      appDb.open().catch(() => undefined),
    ]);
    Promise.all([floor, boot]).then(() => { if (!cancelled) setReady(true); });
    return () => { cancelled = true; };
  }, []);

  if (!ready) return <LaunchScreen />;
  return <ScreenTransition name="launchToSplash">{children}</ScreenTransition>;
}
```

`appDb.open()` is swallowed on failure deliberately: Dexie retries lazily on first use, and blocking the whole app on a private-browsing IndexedDB refusal would be worse than continuing.

- [ ] **Step 3: Wrap the app**

In `src/main.tsx`, wrap `<App />` in `<AppBootGate>`. Note `main.tsx` already has a loading state for i18n suspense - `AppBootGate` sits outside it so the white brand frame is the first paint.

- [ ] **Step 4: Routes**

In `src/App.tsx`, inside the `SessionManager` layout route:

```tsx
<Route path="/app/home"                element={<HomeScreen />} />
<Route path="/app/education"           element={<EducationScreen />} />
<Route path="/app/intro/:category"     element={<CategoryIntro />} />
<Route path="/app/game/:gameId/title"  element={<GameTitleScreen />} />
<Route path="/app/game/:gameId"        element={<GameRouter />} />
<Route path="/app/free-play"           element={<FreePlayScreen />} />
<Route path="/app/summary"             element={<SessionSummary />} />
<Route path="/app/settings"            element={<SettingsScreen />} />
{/* Bookmarks and service-worker-cached URLs from before the redesign. */}
<Route path="/app/questionnaire"       element={<Navigate to="/app/education" replace />} />
<Route path="/app/rotation"            element={<Navigate to="/app/home" replace />} />
<Route path="/app"                     element={<Navigate to="/app/home" replace />} />
```

`/`, `/signup` and `/login/:careHomeId` are unchanged - onboarding is phase 3.

- [ ] **Step 5: AppShell**

Two changes:

1. Delete the `<header>` block entirely (`AppShell.tsx:52-84`) and the now-unused `LANGS`, `changeLang`, `navigate` and `t` bindings. Language switching already exists in `SettingsScreen.tsx:69-89`.
2. `AppShell.tsx:32` is `useMatch('/app/game/:gameId')`, an exact match, so `/app/game/:gameId/title` would not match it and the full-bleed title screen would inherit `overflow-y-auto` plus the offline banner. Replace with a test covering every full-bleed route:

```tsx
/*
 * Full-bleed routes own their own scrolling and paint to the edges: the board,
 * the game title art, and the category intro. useMatch is exact, so each has to
 * be named - a title route would not match '/app/game/:gameId'.
 */
const { pathname } = useLocation();
const fullBleed =
  /^\/app\/game\//.test(pathname) || /^\/app\/intro\//.test(pathname);
```

and use `fullBleed` wherever `inGame` was used.

- [ ] **Step 6: i18n**

Add to all three locale files: `launch.loading`.

- [ ] **Step 7: Verify**

```bash
npm run lint && npm test && npm run build
```

Expected: 38 errors, 372 tests, clean build. Screens not yet written (Task 5-10) must be stubbed or this step fails - create each as a one-line placeholder returning `null` and fill them in their own task.

Then in the browser: a cold load shows the white logo screen for at least 1200 ms; `/app/questionnaire` and `/app/rotation` both redirect; the app header is gone from Home and Settings; Settings still switches language.

- [ ] **Step 8: Commit**

Bump to `1.18.4`. Message: routing skeleton, launch gate, AppShell header removal, noting the exact-match bug the prefix test fixes.

---

### Task 5: CategoryIntro

Replaces `RotationScreen`. Handoff sections 8, 10 and 12.

**Files:**
- Create: `src/screens/CategoryIntro.tsx`
- Delete: `src/screens/RotationScreen.tsx`
- Modify: locales, `package.json`

**Spec** (all values from the handoff; `CATEGORY_BRAND` in `tokens.ts` already carries the per-category colours and gradient):

| Element | Spec |
|---|---|
| Background | `CATEGORY_BRAND[category].gradient` |
| Watermark | `/brand/logo-navy.png`, 108px, `opacity: 0.16`, `margin-top: 26px` |
| Badge | `<CategoryBadge category={category} size={132} />` |
| Title | "Train Your" in 700 `#2A2140` (memory) / `#17253F` (others), category name below in `CATEGORY_BRAND[category].accent`. 24-27px, line-height 1.2 |
| Body | 19-20px / 500, line-height 1.4, margin `18-26px 20-26px 0`, `text-wrap: pretty`, colour `CATEGORY_BRAND[category].label` |
| Practice band | full width, `CATEGORY_BRAND[category].band`, white 16px/700, padding `16px 22px`, `margin-top: auto` |
| Progress | `<ProgressBar durationMs={2000} color={accent} trackColor="rgba(...,0.16)" running />` inside `padding: 40px 60px 56px` |
| Loading label | `t('intro.starting')`, 16px/700, letter-spacing 0.08em |

- [ ] **Step 1: Build the screen with a guarded timer**

```tsx
const INTRO_MS = 2000;

export default function CategoryIntro() {
  const { category } = useParams<{ category: string }>();
  const session = useAppStore((s) => s.currentSession);
  const navigate = useNavigate();
  const firedRef = useRef(false);

  const gameId = session.currentGameId;

  useEffect(() => {
    if (firedRef.current) return;
    if (!category || !gameId) { navigate('/app/home', { replace: true }); return; }
    firedRef.current = true;
    const id = setTimeout(() => navigate(`/app/game/${gameId}/title`), INTRO_MS);
    // Clearing on unmount is what stops a backgrounded intro firing a stale
    // navigation after the resident has already gone somewhere else.
    return () => clearTimeout(id);
  }, [category, gameId, navigate]);
  ...
}
```

The `firedRef` guard is the pattern `RotationScreen` already used; keep it. Note the effect both guards and cleans up - `firedRef` stops a re-render restarting the timer, `clearTimeout` stops an unmounted one firing.

- [ ] **Step 2: Announce it**

Wrap the title and body in `role="status"` so a screen reader hears which category is coming before the screen advances itself.

- [ ] **Step 3: Fire the analytics the old screen fired**

`RotationScreen` fired `category_rotated` with `fromCategory`, `toCategory`, `secondsPlayed`. Keep that event and its shape, inside the same `firedRef` guard, so the existing metric stays continuous.

- [ ] **Step 4: Delete `RotationScreen.tsx`** and remove its import from `App.tsx`.

- [ ] **Step 5: i18n**

Nine keys per language: `intro.trainYour`, `intro.starting`, and per category `intro.<cat>.name`, `intro.<cat>.body`, `intro.<cat>.band`. English copy is given verbatim in the handoff's per-category table; translate for hi and kn.

- [ ] **Step 6: Verify**

Lint, test, build. Then: from Home start a session, complete a category, and confirm the intro shows for 2 s with the bar filling, then lands on the game title route. Navigate away mid-intro (browser back) and confirm no stale navigation fires afterwards. With reduced motion on, confirm the bar is static and the hold is still 2 s.

- [ ] **Step 7: Commit.** Bump to `1.18.5`.

---

### Task 6: GameTitleScreen

**Files:**
- Create: `src/screens/GameTitleScreen.tsx`
- Modify: locales, `package.json`

**Spec.** Full-bleed `splash` art from `gameCatalog`, `object-fit: cover`, centred. Per the planning decision, the art already contains the logo, tagline, info panel and a painted PLAY button, so this screen adds only two real controls:

- **PLAY** - a transparent button positioned over the painted one, at least 44px tall, with `aria-label={t('gameTitle.play', 'Play')}` and a visible `:focus-visible` ring. Navigates to `/app/game/:gameId`.
- **Close** - top-right, 34px circle, `border: 1px solid rgba(255,255,255,0.6)`, `background: rgba(10,20,40,0.45)`, white glyph, `aria-label={t('gameTitle.close', 'Close')}`.

The painted PLAY sits at roughly 72% of the art's height and spans the middle 60% of its width. Position the real button in percentages of the image box, not pixels, so it tracks the art at any viewport.

**A game with no splash art** (the nine non-marquee games, reachable from free play) must not render a broken screen: when `game.splash` is null, skip this screen entirely and navigate straight to the board.

- [ ] **Step 1: Build the screen**, with the art in a `position: relative` box and both controls absolutely positioned inside it, so the button tracks the art rather than the viewport.

- [ ] **Step 2: Handle the exits.** Close returns to `/app/home`. It abandons the session, so fire the existing `session_interrupted` event rather than inventing a new one.

- [ ] **Step 3: Redirect when there is no art**, in an effect guarded by a ref, before first paint.

- [ ] **Step 4: i18n.** `gameTitle.play`, `gameTitle.close`.

- [ ] **Step 5: Verify.** Lint, test, build. Then: reach a title screen through a session, confirm the art fills the screen with no letterboxing at 360x780, that tabbing reveals a focus ring on PLAY, that PLAY starts the board and close returns Home. Then enter a non-marquee game from free play (Task 9) and confirm it skips straight to the board.

- [ ] **Step 6: Commit.** Bump to `1.18.6`. The message must record why the screen is art rather than composed UI, and that the English text is a known limitation.

---

### Task 7: EducationScreen

Replaces `DailyQuestionnaire`, stripped of session-starting.

**Files:**
- Create: `src/screens/EducationScreen.tsx`
- Delete: `src/screens/DailyQuestionnaire.tsx`
- Modify: locales, `package.json`

**Spec.** `ScreenBlue`. Heading `t('education.title', 'Keep Your Brain Active')`, three short body lines, the last being "Play, enjoy, and keep your brain active." Green **Let's Begin** button, 176x58, navigating to `/app/intro/memory`.

> The handoff specifies "three short lines of body copy" but only gives the last one. The first two are written here and should be reviewed: "A few minutes of daily practice helps keep your mind sharp." / "Today's games train your memory, attention and planning." Flag them for the client rather than treating them as final.

- [ ] **Step 1: Build the screen.** It sets no flags and picks no games - `startSession()` did all of that in Task 1 - so visiting it twice is harmless and it needs no redirect guard.

- [ ] **Step 2: Delete `DailyQuestionnaire.tsx`**, remove its import and route from `App.tsx` (the `/app/questionnaire` redirect from Task 4 stays).

- [ ] **Step 3: i18n.** `education.title`, `education.line1`, `education.line2`, `education.line3`, and reuse the existing `btn.letsBegin`.

- [ ] **Step 4: Verify.** Lint, test, build. Then confirm Start Session goes Home to Education to the memory intro, and that going back to Education a second time in the same day still works and does not restart the session.

- [ ] **Step 5: Commit.** Bump to `1.18.7`.

---

### Task 8: HomeScreen

**Files:**
- Modify: `src/screens/HomeScreen.tsx`, locales, `package.json`

**Spec** (handoff section 7), on `ScreenBlue`, top to bottom:

1. **Header** - `/brand/logo-navy.png` at 118px left; right a settings control, gear glyph 26px over "SETTINGS" at 10px/700/`0.1em`, both white, stacked and centred. Padding `16px 20px 0`.
2. **Greeting** - `t('home.greeting')` with the existing time-of-day logic (`getGreeting()` already exists in this file, keep it) at 22px/700 white; below it the duration line at 17px/600 `BRAND.cyan`.
3. **Today's three games** - `plannedGames.map` to `<GameRow>`, `gap: 14px`, `padding: 0 20px`, starting 22px below the greeting. Levels from `getLastLevels`.
4. **ANOTHER DAY** - `border-top: 1px solid rgba(255,255,255,0.16)`, 14px padding above; label `t('home.anotherDay')` at 11px/700/`0.12em`/`BRAND.muted`; below it the marquee six minus `plannedGames` at 40px, `border-radius: 10px`, `filter: grayscale(0.9); opacity: 0.5`.
5. **Start Session** - green, full width less 20px margins, 66px min-height, `margin: auto 20px 30px`.

**Behaviour:**

- The duration line is **derived**: `t('home.duration', { minutes: (ROTATION_THRESHOLD_SECONDS * 3) / 60 })`. Export `ROTATION_THRESHOLD_SECONDS` from `GameShell.tsx` rather than duplicating 120 here. The handoff's "30 minutes" is wrong for a 6-minute session; the copy follows the code.
- Before the session is started: the three rows are today's planned trio. `plannedGames` is empty until `startSession` runs, so on a fresh day compute a preview with `pickTrio(previousTrio)` **for display only** and pass the same value into `startSession` - or simpler and preferred: call `startSession()` on mount when there is no session for today, so Home always has a real trio. Choose the latter; it removes a whole class of "preview disagrees with reality" bug.
- After the session completes: Start Session is replaced by a green **Free Play** button to `/app/free-play`, and the three rows show as done. This replaces the inline Practice Mode block.
- Resume: `handleResumeSession` navigates to `/app/intro/${session.currentCategory}`, not `/app/rotation`.
- **Keep the dev shortcuts.** `HomeScreen` currently reveals `devCompleteToday`/`devResetToday` after five taps on the version label. That is how the whole session flow gets tested; carry it into the rebuild unchanged.

- [ ] **Step 1: Rebuild the screen.** Delete the local `GAME_BY_CATEGORY`, `CATEGORY_ICONS`, `CATEGORY_LABEL_KEYS` and the Practice Mode block; all four are superseded by `gameCatalog` and `FreePlayScreen`.

- [ ] **Step 2: Load levels** in one effect via `getLastLevels(userId, [...plannedGames])`, with a loading state, mirroring the shape `SessionSummary.tsx:27-37` already uses.

- [ ] **Step 3: i18n.** `home.duration`, `home.anotherDay`, `home.lastLevel` (used by `GameRow`, added in phase 1 with only a fallback), `home.freePlay`, plus `game.<id>.name` for all fifteen games. The existing name keys are camelCase (`game.marketMemory`); the catalog uses `game.market-memory.name`. Add the new keys; leave the old ones in place, since `HomeScreen` is not the only reader.

- [ ] **Step 4: Verify.** Lint, test, build. Then: Home shows three rows matching what the session plays, in order; the "ANOTHER DAY" strip holds the other three greyed; the duration line reads 6 minutes; Start Session goes to Education; after `devCompleteToday`, Free Play appears; resume after a refresh returns to the right intro.

- [ ] **Step 5: Commit.** Bump to `1.18.8`.

---

### Task 9: FreePlayScreen

Replaces Home's inline Practice Mode. Not in the handoff - designed in the spec.

**Files:**
- Create: `src/screens/FreePlayScreen.tsx`
- Modify: locales, `package.json`

**Spec.** `ScreenBlue`. A back control to `/app/home`, a heading, then three sections - Memory, Attention, Planning - each a `repeat(3, 1fr)` grid of `<GameTile>` with `gap: 12px`, from `allByCategory(category)`. Tapping a tile with splash art goes to `/app/game/:gameId/title`; without art, straight to `/app/game/:gameId`.

**Behaviour:**

- Gated on the session being complete, matching today's Practice Mode. Reaching it otherwise redirects to `/app/home`.
- Fire the **existing** `practice_game_started` event with `{ gameId }` so the shipped metric stays continuous. Do not rename it.
- A free-play game must not enter the rotation. Task 3's `nextStep` returns `stay`, so `triggerRotation` does nothing; the game's `onLevelComplete` path in `GameRouter` continues to start another round. Add: when the session is complete, `GameShell`'s exit returns to `/app/free-play` rather than `/app/home`.

- [ ] **Step 1: Build the screen.**
- [ ] **Step 2: Wire the two entry paths** (title screen vs straight to board) off `getGame(id).splash`.
- [ ] **Step 3: Route the exit.** In `GameShell.confirmExit`, choose the destination from whether all three categories are complete.
- [ ] **Step 4: i18n.** `freePlay.title`, `freePlay.subtitle`, `btn.back`, plus `category.memory`, `category.attention`, `category.planning` (used by `GameRow` from phase 1 with fallbacks only).
- [ ] **Step 5: Verify.** Lint, test, build. Then: after `devCompleteToday`, open Free Play, confirm all fifteen games appear grouped by category with the nine art-less ones showing the category-icon chip; start one, play past two minutes, and confirm it does **not** jump to the summary; exit and confirm it returns to the library.
- [ ] **Step 6: Commit.** Bump to `1.18.9`.

---

### Task 10: SessionSummary

**Files:**
- Modify: `src/screens/SessionSummary.tsx`, locales, `package.json`

**Spec** (handoff section 14), on `ScreenBlue`: `/brand/logo-navy.png` at 140px; `t('summary.title', { name })` 28px/700 white; subtitle 18px/600 `BRAND.cyan`; three result rows `gap: 12px`, `background: BRAND.surfaceStrong`, radius 18, padding `12px 16px`, gap 14 - each with `<CategoryBadge size={52}>`, the category name 18px/700 `BRAND.cyanBright` over "Level {n} reached" 15px/600 `BRAND.lime`, and a check glyph 22px `BRAND.lime` right; "See you tomorrow!" 20px/700 white; green **Back to Home** 262x60, `margin: auto 0 40px`.

**Behaviour:**

- **Correction to the existing screen:** `SessionSummary.tsx:9-12` hardcodes one representative gameId per category (`remember-match`, `spot-focus`, `morning-routine-quest`) to look up levels, so it currently reports levels for games that were not played. Read `plannedGames` instead, and levels via `getLastLevels`.
- Rows stagger in 60 ms apart using `staggerDelay` from `chrome/transitions`, 12px rise plus fade, collapsing under reduced motion.
- Keep the existing `session_ended` event and its `firedRef` guard exactly as they are.

- [ ] **Step 1: Rebuild the screen.**
- [ ] **Step 2: Replace `CATEGORY_INFO`** with `plannedGames` + `getLastLevels`.
- [ ] **Step 3: i18n.** `summary.subtitle`, `summary.levelReached`, `summary.seeYouTomorrow`; reuse `summary.title` and `btn.backHome`.
- [ ] **Step 4: Verify.** Lint, test, build. Then complete a full session and confirm the three rows name the games actually played with their levels, the rows stagger in, and Back to Home works.
- [ ] **Step 5: Commit.** Bump to `1.18.10`.

---

### Task 11: Close the phase

- [ ] **Step 1: i18n audit.**

```bash
node -e "
const en=require('./public/locales/en/common.json');
const hi=require('./public/locales/hi/common.json');
const kn=require('./public/locales/kn/common.json');
const ek=Object.keys(en);
console.log('en',ek.length,'hi',Object.keys(hi).length,'kn',Object.keys(kn).length);
console.log('missing hi:',ek.filter(k=>!(k in hi)));
console.log('missing kn:',ek.filter(k=>!(k in kn)));
console.log('untranslated hi:',ek.filter(k=>hi[k]===en[k]).length,'(4 at baseline)');
"
```

Expected: equal counts, no missing keys, untranslated count still 4.

- [ ] **Step 2: Dead reference sweep.**

```bash
grep -rn "questionnaireCompleted\|RotationScreen\|DailyQuestionnaire\|app/rotation\|app/questionnaire" src/ \
  | grep -v "Navigate to=" || echo "clean"
```

- [ ] **Step 3: Full manual smoke**, the list from the spec's Testing section, in `en`, `hi` and `kn`, and at text sizes normal and xlarge.

- [ ] **Step 4: Verify the CSS diff** against the phase 1 build the way phase 1 did, to see exactly what changed visually and confirm nothing in the game boards did.

- [ ] **Step 5: Commit.** Set version to `1.19.0` - phase 2 adds screens, a minor bump.

---

## Self-Review

**Spec coverage.** Every phase 2 item in the spec maps to a task: `LaunchScreen` (4), `EducationScreen` (7), `HomeScreen` (8), `CategoryIntro` (5), `GameTitleScreen` (6), `FreePlayScreen` (9), `SessionSummary` (10), `sessionPlan.ts` (1, 3), `lastLevel.ts` (2), the `sessionStarted` rename (1), `plannedGames` through store/persist/resume (1), the `triggerRotation` rewrite including the free-play branch (3), routing (4), AppShell header removal and its route-match fix (4), `RotationScreen` and `DailyQuestionnaire` deleted (5, 7).

**Ordering.** Tasks 1-3 are pure state and are tested rather than eyeballed. Task 4 opens the routes, and 5-10 fill them. Task 3 is the one task not exercisable in the browser on its own; its gate is 11 unit tests, and Task 4 makes it reachable.

**Deferred to phase 3, correctly:** `SplashScreen`, `SignupFlow`, `SignInScreen`, `prescribers.ts`, `SettingsScreen`, and deletion of `CareHomeSelector` / `ProfileSelector` / `/login/:careHomeId`.

**Type consistency.** `pickTrio` and `CATEGORY_ORDER` are defined in Task 1 and consumed in Tasks 3 and 8. `nextStep`/`NextStep` are defined in Task 3 and consumed only by `SessionManager`. `getLastLevels` is defined in Task 2 and consumed in Tasks 8, 9 and 10. `recordLastLevel` is defined in Task 2 and called only from `GameShell`. `plannedGames` and `sessionStarted` are introduced in Task 1 and read in 3, 8, 9, 10. `staggerDelay` and `ScreenTransition` come from phase 1. No name drifts.

**Version sequence.** 1.18.1 through 1.18.10, closing at 1.19.0.
