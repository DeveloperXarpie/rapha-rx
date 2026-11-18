# Redesign v2 Plan 1: Session Engine and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date**: 2026-11-18
**Content Type**: Implementation plan

**Goal:** Replace the daily three-game rotation with v2's core loop: Memory open at the start of each day, the next category unlocking after 10 minutes of board time in the current one, free choice of game within open categories, and a new Home with locked and completed popups.

**Architecture:** All rules live in one pure, unit-tested module, `src/lib/sessionLedger.ts`, which replaces `src/lib/sessionPlan.ts`. The store keeps the per-day ledger and persists it as today. The ticker moves from `SessionManager` (every second inside `/app/*`) into `GameShell` (only while a board is on screen), and the threshold check stays at level end, so a level always finishes before a category unlocks.

**Tech Stack:** React 18 + TypeScript, Zustand (persist), Dexie, i18next, Vitest (node environment, pure modules only).

**Spec:** `docs/redesign-v2/FINAL_SPEC.md` sections 5 (Stream A) and 6 (Stream B). Mock 1 is page 1 of `docs/App Flow changes finale.pdf`.

**Branch:** `feat/app-flow-redesign` (owner decision, 2026-11-18). Do not create a new branch.

## Roadmap: the other v2 plans

This is plan 1 of the v2 workstreams. The rest are written when their inputs land.

| Plan | Stream | Waiting on |
|---|---|---|
| 1 (this) | A Session engine, B Home and popups | Nothing |
| 2 | Game changes: losable rounds with Replay (D20), Tiffin points removed (D23), the small capture changes (7.1a) | Owner confirmation of 7.1a and C20; thresholds |
| 3 | D Difficulty ladders | Anchor levels, X1, X2, X6 |
| 4 | C Scoring: scorecard skill cards, 10-minute summary | Scoring formula decision, C3, C4, C5, C6 |
| 5 | E Research data (event log) | Section 9 scope |
| 6 | F Copy ("Tiffin", "prescription") | C8; can fold into plan 2 |
| 7 | Baggage Sort | Game design |

## Decisions this plan makes

Taken in conversation on 2026-11-18, or chosen here where the spec is open. Each spec gap is marked; the plan does not close the spec question, it picks an interim behaviour that is easy to change.

| Topic | Behaviour in this plan | Source |
|---|---|---|
| What counts as a minute (Q2) | Only time with a game board mounted (`GameShell`), the exit dialog closed, the tab visible, and not a debug round. | Owner, 2026-11-18 |
| Garden Keeper | Not offered on Home. Attention shows Spot Focus only until Baggage Sort exists. Left in Free Play as today (C18 still open). | Owner, 2026-11-18 (D15) |
| Branch | Commit to `feat/app-flow-redesign`. | Owner, 2026-11-18 |
| When the scorecard shows (C6) | Only when a level ends past the threshold, as today. | Interim |
| Empty tile slots in Mock 1 (C7) | Not drawn. | Interim |
| Free Play access (Q4) | A Free Play button on Home once all three categories are complete, as today. | Interim |
| After the third category (C4) | Scorecard, then the existing day summary, then Home. The per-category summary is plan 4. | Interim |
| Education screen | Shown once a day, before the first game the resident opens. | Interim; matches "same as it currently is" |
| Completed-category popup copy (6.4) | "You have finished this today." with Proceed and Back. | Interim proposal |
| Day boundary | The UTC date, as everywhere else in the app (`src/lib/dates.ts`). | Existing convention |

## Global Constraints

- Category session length: `CATEGORY_SESSION_SECONDS = 600` (D1), one exported constant, tunable.
- Unlock order: memory, attention, executive (D6). The code id for Planning is `executive`.
- Unlocks reset every day; each day starts with only Memory open (D2).
- Play in a completed category credits nothing (D3).
- A level crossing the threshold finishes first; then the category completes (D4).
- Free Play stays unrestricted and unscored (D5).
- Splash, signup and sign-in are untouched (D7).
- Every new player-facing string goes into `public/locales/{en,hi,kn}/common.json`, is under 10 words (D10), and is read with a fallback: `t('key', 'English')`.
- Touch targets at least 80 px (`src/styles/tokens.ts`).
- Layout must work in the portrait column on a 360 px phone and a tablet (D21).
- Motion respects `useReducedMotion()` (`src/lib/useReducedMotion.ts`).
- Dexie: the new session fields are not indexed, so no `.version()` bump; never edit existing versions.
- Release: one minor bump to `1.36.0` in the final task. Lint gate is "no new errors" against the baseline of **31 errors, 1 warning** (2026-11-18).

## Review Focus

1. **Refresh mid-category.** A resident at 7 minutes who refreshes must not restart at 0. Seconds persist to localStorage on every tick (Zustand persist) and to Dexie every 10 s. Test: `normalizeSession` keeps `secondsInCurrentCategory` from a same-day row (Task 1).
2. **Old saved sessions.** Rows and localStorage written by v1.35 carry `plannedGames`, `sessionStarted`, `focusCategory` and lack the new fields. They must load without a crash and keep their progress. Test: `normalizeSession` on a v1.35-shaped object (Task 1).
3. **Crossing the threshold outside the active category.** A long round in a completed category, or in Free Play, must never unlock anything. Test: `shouldCompleteCategory` returns false for a non-active category at 900 s (Task 1).
4. **A second completion.** Two level-ends past the threshold (double tap, a re-render) must complete one category, not two. Test: `completeCategory` is a no-op for a category that is not active (Task 1).
6. **A saved v1.35 session in localStorage.** A reload restores the store from localStorage without calling `setActiveProfile`, so the persist `merge` must normalise it or Home's first render crashes. (Added after the plan review.)
5. **A new day while the app stays open.** A tablet left on Home overnight must reset at the next visit to Home or the next return to the tab. Test: `normalizeSession` with yesterday's date returns a fresh day (Task 1), and `ensureToday` runs on `SessionManager` mount and on `visibilitychange` (Task 4).

---

### Task 1: The session ledger

**Files:**
- Create: `src/lib/sessionLedger.ts`
- Create: `src/lib/__tests__/sessionLedger.test.ts`
- Delete: `src/lib/sessionPlan.ts`, `src/lib/__tests__/sessionPlan.test.ts` (their imports are moved in Tasks 3-5)

**Interfaces:**
- Produces (all exported from `src/lib/sessionLedger.ts`):
  - `CATEGORY_ORDER: GameCategory[]` = `['memory', 'attention', 'executive']`
  - `CATEGORY_SESSION_SECONDS = 600`
  - `type CategoryStatus = 'completed' | 'active' | 'locked'`
  - `activeCategory(completed: string[]): GameCategory | null`: the first category in order not in `completed`; `null` when all three are done.
  - `categoryStatus(category: GameCategory, completed: string[]): CategoryStatus`
  - `isDayComplete(completed: string[]): boolean`
  - `creditsTime(gameCategory: GameCategory, completed: string[]): boolean`: true only for the active category.
  - `shouldCompleteCategory(args: { gameCategory: GameCategory; completed: string[]; seconds: number }): boolean`
  - `completeCategory(completed: string[], category: GameCategory): string[]`: appends only if `category` is the active one; otherwise returns `completed` unchanged (same reference).
  - `type TileAction = 'play' | 'locked' | 'completed'`
  - `tileAction(category: GameCategory, completed: string[]): TileAction`
  - `pendingUnlock(completed: string[], unlocksSeen: string[]): GameCategory | null`: the active category if it is not in `unlocksSeen`, else `null`.
  - `afterScoreCard(completed: string[]): '/app/summary' | '/app/home'`
  - `interface LedgerSession { date: string; categoriesCompleted: string[]; currentCategory: GameCategory | null; currentGameId: string | null; secondsInCurrentCategory: number; sessionStartedAt: number | null; gamesPlayed: string[]; unlocksSeen: string[]; educationSeen: boolean }`
  - `freshSession(today: string): LedgerSession`: Memory active, `unlocksSeen: ['memory']`, everything else empty, zero or false.
  - `normalizeSession(raw: unknown, today: string): LedgerSession`

- [ ] **Step 1: Write the failing tests**

```ts
describe('activeCategory / categoryStatus', () => {
  it('starts on memory', () => expect(activeCategory([])).toBe('memory'));
  it('moves in fixed order', () => expect(activeCategory(['memory'])).toBe('attention'));
  it('is null once all three are done', () =>
    expect(activeCategory(['memory', 'attention', 'executive'])).toBeNull());
  it('locks everything after the active one', () => {
    expect(categoryStatus('memory', ['memory'])).toBe('completed');
    expect(categoryStatus('attention', ['memory'])).toBe('active');
    expect(categoryStatus('executive', ['memory'])).toBe('locked');
  });
});

describe('shouldCompleteCategory', () => {
  it('fires at exactly 600 s in the active category', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: [], seconds: 600 })).toBe(true));
  it('does not fire at 599 s', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: [], seconds: 599 })).toBe(false));
  it('never fires for a completed category (D3)', () =>
    expect(shouldCompleteCategory({ gameCategory: 'memory', completed: ['memory'], seconds: 900 })).toBe(false));
  it('never fires once the day is done', () =>
    expect(shouldCompleteCategory({ gameCategory: 'executive', completed: ['memory', 'attention', 'executive'], seconds: 900 })).toBe(false));
});

describe('completeCategory', () => {
  it('appends the active category', () =>
    expect(completeCategory(['memory'], 'attention')).toEqual(['memory', 'attention']));
  it('ignores a category that is not active', () => {
    const done = ['memory'];
    expect(completeCategory(done, 'memory')).toBe(done);
    expect(completeCategory(done, 'executive')).toBe(done);
  });
});

describe('tileAction', () => {
  it('maps status to the tap result', () => {
    expect(tileAction('memory', [])).toBe('play');
    expect(tileAction('attention', [])).toBe('locked');
    expect(tileAction('memory', ['memory'])).toBe('completed');
  });
});

describe('pendingUnlock', () => {
  it('reports a newly active category once', () => {
    expect(pendingUnlock(['memory'], ['memory'])).toBe('attention');
    expect(pendingUnlock(['memory'], ['memory', 'attention'])).toBeNull();
  });
  it('never reports memory on a fresh day', () => expect(pendingUnlock([], ['memory'])).toBeNull());
  it('is null when the day is done', () =>
    expect(pendingUnlock(['memory', 'attention', 'executive'], ['memory'])).toBeNull());
});

describe('afterScoreCard', () => {
  it('goes home mid-day', () => expect(afterScoreCard(['memory'])).toBe('/app/home'));
  it('goes to the summary after the third', () =>
    expect(afterScoreCard(['memory', 'attention', 'executive'])).toBe('/app/summary'));
});

describe('normalizeSession', () => {
  const TODAY = '2026-11-18';
  it('starts a fresh day for a missing or stale session', () => {
    expect(normalizeSession(undefined, TODAY)).toEqual(freshSession(TODAY));
    expect(normalizeSession({ ...freshSession('2026-11-17'), categoriesCompleted: ['memory'] }, TODAY))
      .toEqual(freshSession(TODAY));
  });
  it('keeps same-day progress', () => {
    const s = normalizeSession({ ...freshSession(TODAY), secondsInCurrentCategory: 420 }, TODAY);
    expect(s.secondsInCurrentCategory).toBe(420);
  });
  it('reads a v1.35 session without losing progress', () => {
    const old = {
      date: TODAY, sessionStarted: true, plannedGames: ['market-memory', 'spot-focus', 'serve-guests'],
      focusCategory: null, categoriesCompleted: ['memory'], currentCategory: 'attention',
      currentGameId: 'spot-focus', secondsInCurrentCategory: 75, sessionStartedAt: 1,
    };
    const s = normalizeSession(old, TODAY);
    expect(s.categoriesCompleted).toEqual(['memory']);
    expect(s.currentCategory).toBe('attention');
    expect(s.secondsInCurrentCategory).toBe(75);
    expect(s.gamesPlayed).toEqual([]);
    expect(s.unlocksSeen).toEqual(['memory', 'attention']);
    expect(s.educationSeen).toBe(true);
    expect('plannedGames' in s).toBe(false);
  });
});
```

- [ ] **Step 2: Run to verify they fail**

Run: `npx vitest run src/lib/__tests__/sessionLedger.test.ts`
Expected: FAIL, module not found.

- [ ] **Step 3: Implement `src/lib/sessionLedger.ts`**

`normalizeSession` rules:
- Not an object, or `date !== today`: return `freshSession(today)`.
- Otherwise copy only the `LedgerSession` fields, defaulting missing ones from `freshSession(today)`.
- `currentCategory` is always recomputed as `activeCategory(categoriesCompleted)`.
- A v1.35 row has no `unlocksSeen`. Default it to every category that is already open (`completed` plus the active one), so an old session never replays an unlock it already went through.
- A v1.35 row has no `educationSeen`. Default it to `sessionStarted === true`.

- [ ] **Step 4: Run to verify they pass**

Run: `npx vitest run src/lib/__tests__/sessionLedger.test.ts`
Expected: PASS.

- [ ] **Step 5: Do not commit yet.** `sessionPlan.ts` still has importers, so the build is red until Task 5. Tasks 1-5 land as one commit.

---

### Task 2: Which games the daily session offers

**Files:**
- Modify: `src/lib/gameCatalog.ts`
- Modify: `src/lib/__tests__/gameCatalog.test.ts`

**Interfaces:**
- Produces: `inDailySession: boolean` on `GameCatalogEntry`; `sessionGamesByCategory(category: GameCategory): GameCatalogEntry[]` in declaration order.
- `marquee` keeps its current meaning (commissioned art, board anchoring in `GameShell`). Do not reuse it for this.

- [ ] **Step 1: Write the failing test**

```ts
it('offers five games in the daily session, without Garden Keeper', () => {
  expect(sessionGamesByCategory('memory').map((g) => g.id)).toEqual(['market-memory', 'train-yard']);
  expect(sessionGamesByCategory('attention').map((g) => g.id)).toEqual(['spot-focus']);
  expect(sessionGamesByCategory('executive').map((g) => g.id)).toEqual(['serve-guests', 'clear-the-way']);
  expect(getGame('garden-keeper')!.marquee).toBe(true);
});
```

- [ ] **Step 2: Run, expect FAIL** (`npx vitest run src/lib/__tests__/gameCatalog.test.ts`).
- [ ] **Step 3: Implement.** `marquee()` sets `inDailySession: true`, `extra()` sets `false`, and the `garden-keeper` entry overrides it to `false`, with a comment pointing at FINAL_SPEC D15. Delete `marqueeByCategory` (its only caller was `pickTrio`).
- [ ] **Step 4: Run, expect PASS.**

---

### Task 3: The store holds the ledger

**Files:**
- Modify: `src/store/index.ts`
- Modify: `src/lib/db.ts` (the `SessionState` interface only)
- Delete: `src/lib/resumeSession.ts` (Home no longer offers Continue)

**Interfaces:**
- Consumes: everything from Task 1.
- Produces: `CurrentSession` becomes `LedgerSession`, re-exported from the store as `CurrentSession` so existing imports compile.
  New actions on `AppState`, replacing `startSession`, `setFocusCategory`, `markCategoryComplete`, `setCurrentCategory`, `markSessionStarted` and `tickCategory`:
  - `ensureToday(): void`: `normalizeSession(current, todayISO())`; persist if anything changed.
  - `creditSecond(gameId: string, gameCategory: GameCategory): void`: no-op unless `creditsTime(...)`. Adds 1 second, adds `gameId` to `gamesPlayed` if missing, and sets `sessionStartedAt` on the first credited second. Persists to Dexie when the new total is a multiple of 10 or `gameId` was just added.
  - `completeActiveCategory(gameCategory: GameCategory): void`: `completeCategory(...)`. If the result is unchanged, return. Otherwise zero the seconds, recompute `currentCategory`, persist.
  - `markUnlockSeen(category: GameCategory): void`
  - `markEducationSeen(): void`
  - `setCurrentGame(gameId: string)`: kept as is.
  - `devCompleteCategory(): Promise<void>`: completes the active category and awaits the write, so smoke tests skip the 10 minutes.
  - `devCompleteToday` and `devResetToday` are kept, rewritten on `freshSession`.
- `setActiveProfile` loads today's row through `normalizeSession` instead of its spread-over-defaults code.
- `persistSession` writes every `LedgerSession` field. Keep the warning comment about hand-copied fields.

- [ ] **Step 1: Update `SessionState` in `db.ts`.** Add the optional `gamesPlayed`, `unlocksSeen` and `educationSeen`. Keep `plannedGames`, `sessionStarted` and `focusCategory` as optional, marked deprecated: old rows still carry them and `normalizeSession` ignores them. No `.version()` change, because none of these fields is indexed.
- [ ] **Step 2: Rewrite the session slice** to the interface above. `todayISO` comes from `src/lib/dates.ts` (delete the store's private copy).
- [ ] **Step 3: Type-check what compiles so far:** `npx tsc -p tsconfig.app.json --noEmit`. Errors are expected only in `SessionManager`, `GameShell`, `HomeScreen`, `ScoreCard`, `SessionSummary` and `ChromeGallery`, which Tasks 4-6 fix.

---

### Task 4: Board-time ticker and threshold

**Files:**
- Modify: `src/components/GameShell.tsx`
- Modify: `src/session/SessionManager.tsx`
- Modify: `src/screens/GameIntro.tsx` (only the `sessionComplete` read, if its name changes)

**Interfaces:**
- Consumes: `creditSecond`, `completeActiveCategory`, `shouldCompleteCategory`, `isDayComplete`.
- Produces: `SessionContextValue` shrinks to `{ userId: string; sessionComplete: boolean }`. `triggerRotation`, `secondsInCurrentCategory` and `plannedGames` leave the context. `ROTATION_THRESHOLD_SECONDS` is deleted.

- [ ] **Step 1: SessionManager.**
  - Delete the interval, the frozen-ref debug logic and `triggerRotation`.
  - On mount, call `ensureToday()`. Also call it on every `visibilitychange` to `visible`.
  - Keep providing the context.
- [ ] **Step 2: GameShell ticker.** One `setInterval(…, 1000)` effect, alive while `!debug && !showExitConfirm`. Each tick calls `creditSecond(gameId, gameCategory)` only when `document.visibilityState === 'visible'`.
  Comment the Q2 decision at the effect, with the date, so it is obvious where to change it.
- [ ] **Step 3: Threshold at level end.** In `finishLevel`, read the latest session with `useAppStore.getState()`, not the render-time value, so a stale closure cannot miss the crossing.
  If `!debug && shouldCompleteCategory({ gameCategory, completed, seconds })`, call `completeActiveCategory(gameCategory)` and `navigate(`/app/game/${gameId}/score`)`. Otherwise call `onLevelComplete(result)`.
- [ ] **Step 4: `session_interrupted` analytics.** Read the seconds from the store snapshot in the handlers, instead of from the removed context field.

---

### Task 5: Score card unlock message and day summary

**Files:**
- Modify: `src/screens/ScoreCard.tsx`
- Modify: `src/screens/SessionSummary.tsx`
- Modify: `src/screens/dev/ChromeGallery.tsx` (any `ScoreCardView` call site gets the new prop)
- Modify: `public/locales/{en,hi,kn}/common.json`

**Interfaces:**
- Consumes: `afterScoreCard`, `pendingUnlock`, `CATEGORY_ORDER`.
- Produces: `ScoreCardView` takes a new optional prop, `unlocked?: GameCategory | null`.

- [ ] **Step 1: ScoreCard.**
  - `unlocked = pendingUnlock(session.categoriesCompleted, session.unlocksSeen)`. When set, show a banner above Continue reading `scoreCard.unlocked`.
  - Do not mark the unlock seen here: Home does that after it plays the animation (Task 6). A refresh on the card therefore keeps the banner.
  - Continue goes to `afterScoreCard(session.categoriesCompleted)`.
- [ ] **Step 2: SessionSummary.** List `session.gamesPlayed` grouped by `CATEGORY_ORDER` (each game's category from `getGame`) instead of `plannedGames`. Import `CATEGORY_ORDER` from `sessionLedger`.
- [ ] **Step 3: Copy.** `scoreCard.unlocked` uses the category's existing name key (`category.attention`, `category.planning`):

| Key | en | hi | kn |
|---|---|---|---|
| `scoreCard.unlocked` | `{{category}} is now unlocked!` | `{{category}} अब खुल गया है!` | `{{category}} ಈಗ ತೆರೆದಿದೆ!` |

- [ ] **Step 4: Build.** Run `npm run build`. Expected: only `HomeScreen` errors remain.

---

### Task 6: The new Home

**Files:**
- Create: `src/components/chrome/CategoryPanel.tsx`
- Create: `src/components/chrome/HomePopup.tsx`
- Rewrite: `src/screens/HomeScreen.tsx`
- Modify: `src/screens/EducationScreen.tsx` (call `markEducationSeen` on Continue)
- Modify: `src/screens/dev/ChromeGallery.tsx` (one sample of each new component in all three states)
- Modify: `public/locales/{en,hi,kn}/common.json`

**Interfaces:**
- Consumes: `categoryStatus`, `tileAction`, `pendingUnlock`, `isDayComplete`, `CATEGORY_ORDER`, `sessionGamesByCategory`, `tileArt`, `markUnlockSeen`, `setCurrentGame`, `devCompleteCategory`.
- Produces:
  - `CategoryPanel({ category: GameCategory; status: CategoryStatus; games: GameCatalogEntry[]; unlocking: boolean; onTileTap: (gameId: string) => void; onUnlockAnimationEnd: () => void })`
  - `HomePopup({ message: string; actions: { label: string; onClick: () => void; variant?: 'green' | 'secondary' }[] })`, built on the same overlay markup as GameShell's exit dialog.

- [ ] **Step 1: CategoryPanel**, per Mock 1:
  - A heading bar, with a lock icon on the panel when `locked`.
  - The game tiles centred, each with its name below: tile art from `tileArt(game)`, at least 80 px.
  - Locked tiles render greyed (`grayscale(0.9)`, opacity 0.5, as the old ANOTHER DAY strip did) but stay tappable, so the locked popup can show.
  - When `unlocking` is true and motion is allowed: the lock scales and fades out over about 400 ms, then each tile bounces in with `staggerDelay` from `transitions.ts`, then `onUnlockAnimationEnd` fires. With reduced motion it fires at once.
- [ ] **Step 2: HomeScreen.**
  - Keep the header and greeting. The subtitle becomes `home.prompt`, or `home.sessionComplete` when the day is done.
  - Below them, one `CategoryPanel` per `CATEGORY_ORDER` entry.
  - `unlocking` is true for the panel whose category equals `pendingUnlock(...)`. Its `onUnlockAnimationEnd` calls `markUnlockSeen`.
  - A tile tap switches on `tileAction`:
    - `play`: `setCurrentGame(id)`, then go fullscreen (`fullscreen.arm()` and `enter()`, inside the tap, as now). Navigate to `/app/education` if `!educationSeen`, otherwise to `/app/game/${id}/intro`.
    - `locked`: show the locked popup with one OK button.
    - `completed`: show the completed popup with Proceed (plays the game, as `play` does) and Back (closes the popup).
  - When the day is done, show a Free Play button under the panels (the existing green `Button`, same width as today).
  - Keep the version label and the dev shortcuts. Add `dev: finish category`, which calls `devCompleteCategory` and runs through the existing `handleDevAction` refresh.
  - Delete the Start Session and Continue branches, `checkForResumableSession`, `getLastLevels` and the ANOTHER DAY strip.
- [ ] **Step 3: Copy.** Reuse an existing key for OK, Proceed or Back wherever the locale files already have one; add only what is missing:

| Key | en | hi | kn |
|---|---|---|---|
| `home.prompt` | What would you like to play today? | आज आप क्या खेलना चाहेंगे? | ಇಂದು ನೀವು ಏನು ಆಡಲು ಬಯಸುತ್ತೀರಿ? |
| `home.panel.memory` | Boost Your MEMORY | अपनी याददाश्त बढ़ाएँ | ನಿಮ್ಮ ಸ್ಮರಣೆಯನ್ನು ಹೆಚ್ಚಿಸಿ |
| `home.panel.attention` | Build Your FOCUS | अपना ध्यान मज़बूत करें | ನಿಮ್ಮ ಗಮನವನ್ನು ಬಲಪಡಿಸಿ |
| `home.panel.executive` | Strengthen Your PLANNING | अपनी योजना-शक्ति मज़बूत करें | ನಿಮ್ಮ ಯೋಜನಾ ಶಕ್ತಿಯನ್ನು ಬಲಪಡಿಸಿ |
| `home.locked` | Play the assigned games. | पहले दिए गए खेल खेलें। | ಮೊದಲು ನೀಡಿದ ಆಟಗಳನ್ನು ಆಡಿ. |
| `home.completed` | You have finished this today. | आज आपने यह पूरा कर लिया है। | ಇಂದು ನೀವು ಇದನ್ನು ಮುಗಿಸಿದ್ದೀರಿ. |
| `btn.proceed` | Proceed | आगे बढ़ें | ಮುಂದುವರಿಸಿ |
| `btn.back` | Back | वापस | ಹಿಂದೆ |
| `btn.ok` | OK | ठीक है | ಸರಿ |

The Hindi and Kannada strings need a native speaker's review before release; list them in the smoke-test notes.

- [ ] **Step 4: Build and lint.** Run `npm run build` (expect PASS) and `npm run lint` (expect at most 31 errors and 1 warning).

---

### Task 7: Docs, version and gates

**Files:**
- Modify: `CLAUDE.md` (the "Session flow" section and the `/app/home` route note)
- Modify: `package.json` (`"version": "1.36.0"`)
- Modify: `docs/redesign-v2/README.md` (section 4: Stream A and B in progress, plan link)

- [ ] **Step 1: Rewrite CLAUDE.md "Session flow"** to describe the ledger.
  - Memory opens each day.
  - Only board time counts.
  - At 600 s a level-end completes the category, then: score card with the unlock banner, then Home, where the unlock animation plays.
  - Garden Keeper is out of the daily session.
  - The rules live in `sessionLedger.ts`.
  - Drop every mention of `pickTrio`, rotation and resume.
- [ ] **Step 2: Run every gate.** Run `npm test`, `npm run build` and `npm run lint`. Expected: tests pass, the build passes, lint has at most 31 errors and 1 warning.
- [ ] **Step 3: Commit** (no co-author line, per the user's global rules):

```bash
git add src public/locales CLAUDE.md package.json docs/redesign-v2/README.md docs/superpowers/plans/2026-11-18-redesign-v2-session-engine-home.md
git commit -m "feat(v2): category unlocks by board minutes, free choice of game, new Home"
```

- [ ] **Step 4: Hand over the smoke test** (the user runs it; no agent browser driving). Checklist:
  1. On a fresh day, Home shows Memory open, and Attention and Planning locked and greyed.
  2. Tapping a locked tile shows "Play the assigned games."
  3. The first game of the day goes through Education; the second does not.
  4. Use `dev: finish category`, or play 10 minutes. The next level end shows the score card with "Attention is now unlocked!"; Continue goes Home, where the lock animates away.
  5. Tapping a Memory game now shows the completed popup. Proceed plays it, and its time does not count.
  6. Refresh mid-category: the minutes are kept.
  7. After all three categories: score card, then the day summary listing the games played, then Home with Free Play.
  8. Garden Keeper is absent from Home and present in Free Play.
  9. Phone width (360 px) and a tablet both fit.
  10. No console errors.
