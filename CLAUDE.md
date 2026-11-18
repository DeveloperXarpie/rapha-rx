# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from the repo root, which is where `package.json`, `src/` and
`vite.config.ts` live. There is no `brain-training-app/` subdirectory.

```bash
npm run dev       # start dev server (localhost:5173)
npm run build     # production build (outputs to dist/)
npm run lint      # ESLint
npm run preview   # preview the production build locally
```

`npm test` runs the vitest suite (`vitest run`). It uses the **node** environment
with no DOM library, and only collects `src/**/__tests__/**/*.test.ts` - so pure
modules are unit-tested and React components are not. Verify components by hand,
or on the DEV-only chrome gallery at `/dev/chrome`.

Tests live in their own TypeScript project (`tsconfig.test.json`) so they can use
node built-ins; the app project keeps browser-only types.

## Architecture

### Stack
React 18 + TypeScript, Vite, Tailwind CSS, Zustand, Dexie (IndexedDB), i18next, Firebase (Auth + Firestore for sync), Amplitude (analytics), VitePWA (Workbox).

### Route structure (`src/App.tsx`)
```
/                        → SplashScreen
/signup                  → SignupScreen        (name + prescriber, then confirmation)
/signin                  → SignInScreen
/app/home                → HomeScreen          ─┐
/app/education           → EducationScreen      │ wrapped in RequireProfile
/app/game/:gameId/intro  → GameIntro            │ → AppShell
/app/game/:gameId/title  → GameTitleScreen      │   → SessionManager
/app/game/:gameId        → GameRouter           │
/app/game/:gameId/score  → ScoreCard            │
/app/free-play           → FreePlayScreen       │
/app/category-summary/:category → CategorySummary │
/app/settings            → SettingsScreen      ─┘
```

`AppBootGate` (in `main.tsx`) holds `LaunchScreen` above the router until i18n and
Dexie are ready, with a 2000 ms minimum. `/login/:careHomeId`, `/app/questionnaire`,
`/app/rotation` and `/app/intro/:category` survive only as redirects for cached URLs.

`RequireProfile` redirects unauthenticated users to `/`. `SessionManager` is a layout route that rolls the ledger over to a new day and provides `SessionContext` (`userId`, `sessionComplete`) to all `/app/*` routes via `useSessionContext()`.

### Session flow (redesign v2, since v1.36.0)
The rules live in one pure, tested module: `src/lib/sessionLedger.ts`. Spec:
`docs/redesign-v2/FINAL_SPEC.md` sections 5 and 6.
1. Each day starts with only Memory open; Attention and Planning are locked (unlock order
   memory, attention, executive). Unlocks reset daily. `ensureToday()` rolls the ledger over,
   called from `SessionManager` (mount and tab return), `HomeScreen` and every credited second.
2. Home shows one `CategoryPanel` per category. The resident taps any game in the open
   category. A locked tile shows "Play the assigned games."; a tile in a completed category
   offers Proceed or Back, and that play credits nothing. The first game of the day goes
   through Education (`educationSeen`), then `/app/game/:gameId/intro` → title → board.
3. Only **board time** counts: `GameShell` runs the ticker (`creditSecond`) while the board is
   mounted, the exit dialog is closed, the tab is visible and the round is not a debug probe.
   A level ending at or past `CATEGORY_SESSION_SECONDS` (600) completes the open category
   and shows the `ScoreCard` with an unlock banner; otherwise the next round starts. A level
   always finishes before the category completes.
4. Home plays the unlock animation once (`unlocksSeen`). After the third category the score
   card goes to that category's 10-minute summary, then Home (which offers Free Play once all
   three are done).
5. Garden Keeper is out of the daily session (FINAL_SPEC D15), so Attention shows Spot Focus
   until Baggage Sort exists; it is still in Free Play.
6. Saved sessions from before v1.36 (with `plannedGames`/`sessionStarted`) are converted by
   `normalizeSession()`, both from Dexie and, via the persist `merge`, from localStorage.

### Scoring (`src/lib/scoring/`, since v1.39.0)
Rounds that count for a category session (the same rule as the 10 minutes, `countsForSession`)
are written to the Dexie `roundLog` table by `GameShell` before the category can complete.
`measures.ts` turns rounds into skill scores per FINAL_SPEC 7.1 (`SCORED_SKILLS` in
`gameSkills.ts`, two per game), measure only, 0-100; a skill with nothing to judge is left out.
`summary.ts` gives the scorecard's cards (5 bands, words and bars only, no numbers) and the
10-minute summary's rings (numbers, change since the last session of that category, the 7.2
ten-band headline). Spot Focus response speed maps 2 s = 100 to 20 s = 0, provisionally.

### State (`src/store/index.ts`)
Single Zustand store with `persist` middleware (localStorage key `brain-training-store`). Three slices:
- **user** — `activeProfile` (UserProfile)
- **session** — `currentSession` (the `LedgerSession` from `sessionLedger.ts`): categories done, board seconds in the open category, games played, unlocks shown. Mutations write to Dexie via `persistSession()`; the per-second tick writes every 10 s.
- **settings** — language, textSize, soundEnabled

### Persistence (`src/lib/db.ts`)
Dexie (IndexedDB) database `BrainTrainingDB` with tables: `userProfile`, `sessionState`, `gameProgress`, `difficultyState`, `pendingEvents`. Schema versioning is in the `BrainTrainingDB` constructor — always add a new `.version()` block when changing the schema; never mutate existing versions.

### Difficulty ladders (`src/lib/ladders/`, since v1.38.0)
Shopping List, Spot Focus and Tiffin Time play from a numbered ladder instead of the 0-1
score (DIFFICULTY_RULES). Each game file holds anchor levels; `fillLadder` fills the rest
and `ladders.test.ts` holds every guardrail - a broken rule is fixed with another anchor,
never a clamp. A resident starts every game at level 1 each day (the UTC date, so 05:30
IST), goes up one on a clear and down one after two fails in a row (`movement.ts`). The
level lives on today's `difficultyState` row (`level`, `failStreak`). Bump
`LADDER_VERSION` whenever a value changes; rounds log it. Station Master and Free Me get
ladders later; the other games keep the score below.

### Dynamic difficulty (`src/lib/dynamicDifficulty.ts`)
Each game has a `DifficultyState` record (score 0.0–1.0) per user per day. `getTodayDifficulty()` seeds from yesterday's peak × 0.8 warmup factor. `adjustDifficulty()` promotes (+0.05 × performance multiplier) or demotes (−0.08) after each round. `GameShell` calls this on every `onLevelComplete`. Game-specific `computePerformanceRatio()` is in `src/components/GameShell.tsx` — add a case there whenever a new game is added.

### Game system
- **Registry** in `src/screens/GameRouter.tsx` — maps `gameId` strings to React components + category.
- **Content generation** — most games have a generator in `src/lib/contentGenerators/` that takes difficulty params and returns randomised content. Called once per round (keyed by `gameKey`).
- **Game interface** — every game component receives `{ levelConfig: LevelConfig, onLevelComplete: (result: LevelResult) => void, generatedContent? }`. Call `onLevelComplete` with `completed`, `durationSeconds`, and a `metrics` object. Metrics must match what `computePerformanceRatio` expects for that `gameId`.
- **Round outcome** (`src/lib/roundOutcome.ts`, since v1.37.0) — Shopping List, Spot Focus and Tiffin Time judge each round clear / hold / fail on their own measure. A fail shows Replay on the game's round-end card; these three move difficulty only on a clear. Station Master and Garden Keeper keep the old step-down. Shopping List's second trip (`MarketMemory/secondTrip.ts`) runs when Memory completes during a visit of 2+ rounds; `GameRouter` passes each round a `visit` (`{ id, round }`).
- **GameShell** (`src/components/GameShell.tsx`) — wraps every game; handles the exit confirmation, calls `adjustDifficulty`, fires analytics, runs the board-time ticker, and decides whether the level completes its category or the next round starts.

### Games by category
| Category | Games |
|---|---|
| memory | remember-match, shopping-list-recall, sequence-repeat |
| attention | spot-focus, focus-filter, word-search |
| executive | morning-routine-quest, recipe-builder, garden-sequencer |

Each game lives in `src/games/<category>/<GameName>/index.tsx` with a `levels.config.ts` (mostly unused now that dynamic difficulty drives params).

### i18n
`src/lib/i18n.ts` — i18next with `i18next-http-backend`. There is one namespace, `common`,
so the load path `/locales/{{lng}}/{{ns}}.json` resolves to
`public/locales/<lang>/common.json`. Supported languages: `en`, `hi`, `kn`. Use the `t()`
hook with a fallback string: `t('key', 'Fallback text')`.

These files are precached and revisioned with each build (the `globPatterns` entry in
`vite.config.ts`), so a copy change ships with the code that needs it.

### Game catalog (`src/lib/gameCatalog.ts`)
The one map from `gameId` to display key, category and art. Six games are `marquee` —
they have commissioned tile and splash art. `inDailySession` marks the ones Home offers
(the marquee games minus Garden Keeper); the other nine are reachable from Free Play and
fall back to their category icon.
Adding a game means an entry here **and** in `GameRouter`'s registry.

### Layout
The whole app sits in an upright column: `.app-root` in `src/styles/index.css`, capped at
`64dvh` so it fills any portrait viewport and only binds on desktop or a 4:3 tablet. The
number clears the widest board canvas, so `fitScale` still binds every board by height and
none of them shrink — `src/lib/__tests__/portraitColumn.test.ts` holds that invariant.
`AppFrame` applies it, and both `AppShell` and the public routes use it.

### Assets (`src/lib/assets/catalog.ts`)
Assets (emoji tokens or image srcs) are registered via `registerAsset()` and resolved at render time via `resolveAsset()`. Games call `registerAsset` at module load time. First registration wins on collision.

### Design tokens (`src/styles/tokens.ts`)
Tailwind is extended with named colours (`primary-blue`, `emerald-green`, etc.) matching `COLORS`. Typography scale: `text-h1` through `text-body`, `text-caption`, `text-small`. Minimum touch target: 80px. Inter + Noto Sans for Devanagari/Kannada.

### Firebase
`src/lib/firebase.ts` — Firestore (offline-persistent) and anonymous Auth. Auth is only required at signup/login screens. `adaptiveDifficulty.ts` syncs `gameProgress` to Firestore after local writes, but the sync is fire-and-forget (wrapped in try/catch). The primary source of truth is Dexie.

### Hosting
Deployed on **Vercel**, not Firebase. Production is `https://rapha-rx.vercel.app`, from the
Vercel project `developersuperhuge-2100s-projects/rapha-rx` wired to the GitHub repo.

**Pushing is not deploying.** Every push, on any branch, builds a Preview deployment
automatically. Production is a separate manual "Promote to Production" in the Vercel
dashboard. A commit can be pushed, green, and still not be live. That is exactly how
v1.30.1 sat in Preview for days while residents were served v1.30.0 - and v1.30.1 was the
commit that fixed the update mechanism, so the bug kept itself alive.

`firebase.json` is **not used for hosting**. Firebase is Auth and Firestore only. The
rewrites and `Cache-Control` headers in that file have never applied to anything; Vercel's
own defaults cover the cache side (`sw.js` is served `public, max-age=0, must-revalidate`).

Known gap: there is no `vercel.json`, so there is no server-side SPA rewrite. A cold deep
link returns 404 - `https://rapha-rx.vercel.app/app/home` does today. It is invisible in
normal use because residents land on `/` and React Router takes over client-side, and
because once the service worker is installed Workbox's `navigateFallback: '/index.html'`
(set in `vite.config.ts`) serves the shell for navigations. A first-time visitor opening or
refreshing a deep link still gets the 404.

## Release Protocol

Every commit — including bug fixes — must include a version bump in `package.json`. Use semantic versioning:
- **patch** (1.0.x) — bug fixes, copy changes, minor tweaks
- **minor** (1.x.0) — new features, new games, new screens
- **major** (x.0.0) — breaking changes, major architecture changes

### Pre-commit checklist
1. **Lint** — `npm run lint` must not add errors. There is a standing backlog of
   pre-existing errors, so the gate is "no new ones", not zero. Check the count
   before and after your change.
2. **Test** — `npm test` must pass.
3. **Build** — `npm run build` must complete without TypeScript or Vite errors.
4. **Manual smoke test on localhost** — run `npm run dev` and verify:
   - The affected game(s) or screen(s) work end-to-end.
   - Session resume still works (start a session, refresh the page, confirm the Resume button appears).
   - No console errors during normal gameplay.
5. **Version bump** — update `"version"` in `package.json` before committing.

### Deploying
There is no deploy command to run locally. Vercel builds from GitHub:

1. **Push the branch.** Vercel builds a Preview automatically and reports it back as the
   `Vercel` commit status, whose target URL is the build page.
2. **Smoke test the Preview URL**, not localhost. This is the only place the real service
   worker, the real headers and the real asset hashes exist together.
3. **Promote to Production** in the Vercel dashboard (Deployments, then the build, then
   "Promote to Production"). No rebuild happens; it re-points the alias. **Skip this and
   the work is not live, however green the push looked.**

After a promote, a tablet running v1.30.1 or later updates itself: `src/lib/appUpdate.ts`
checks hourly and on foreground, and `AppUpdater` lets the waiting worker take over only on
Splash, Home, Summary or Free Play (the list is in `src/lib/updatePolicy.ts`), so a resident
is never cut off mid-round.

A device still running a build **older than v1.30.1** will never update on its own. Those
builds used `registerType: 'autoUpdate'` without importing `virtual:pwa-register`, so the
worker registers and then never checks again. Such a device needs a one-time "Clear & reset"
from Chrome's site settings. Nothing you deploy can reach it before that.

### Bug tracking
Open bugs are tracked in a Google Sheet (ID: `1xgnKsCiOv8Dl0CZ0R7OxhenS2jzoQfFpB2k-UIKAxWg`) accessible via the Google Sheets MCP tool.
