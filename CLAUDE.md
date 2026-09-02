# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Commands

All commands run from `brain-training-app/`:

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
/app/intro/:category     → CategoryIntro        │ → AppShell
/app/game/:gameId/title  → GameTitleScreen      │   → SessionManager
/app/game/:gameId        → GameRouter           │
/app/free-play           → FreePlayScreen       │
/app/summary             → SessionSummary       │
/app/settings            → SettingsScreen      ─┘
```

`AppBootGate` (in `main.tsx`) holds `LaunchScreen` above the router until i18n and
Dexie are ready, with a 1200 ms minimum. `/login/:careHomeId`, `/app/questionnaire`
and `/app/rotation` survive only as redirects for cached URLs.

`RequireProfile` redirects unauthenticated users to `/`. `SessionManager` is a layout route that provides `SessionContext` (category timer, rotation logic) to all `/app/*` routes via `useSessionContext()`.

### Session flow
1. `startSession()` is the single session-start point. It sets `sessionStarted`, and picks
   `plannedGames` via `pickTrio()` — one marquee game per category, never repeating the
   previous session's game for that category. `HomeScreen` calls it on arrival, so the three
   rows it shows are the three games the session will actually play.
2. Home → Education → `/app/intro/memory`. Each `CategoryIntro` holds 2 s and advances itself
   to the game's title screen, then the board.
3. `SessionManager` ticks `secondsInCurrentCategory` every second. A level completed under
   `ROTATION_THRESHOLD_SECONDS` (120) starts **another round of the same game**; past it,
   `triggerRotation()` delegates to `nextStep()` in `src/lib/sessionPlan.ts`, which returns
   the next category intro, the summary, or `stay`. `stay` is the free-play case: the ticker
   keeps running after a session completes, and without it a long free-play round would
   bounce the resident into the summary.
4. A partially complete session is resumable via `checkForResumableSession()`; Home offers
   Continue, returning to `/app/intro/:currentCategory`.
5. Once all three categories are done, Home offers Free Play (`/app/free-play`) — the
   library that replaced the old inline Practice Mode.

### State (`src/store/index.ts`)
Single Zustand store with `persist` middleware (localStorage key `brain-training-store`). Three slices:
- **user** — `activeProfile` (UserProfile)
- **session** — `currentSession` (CurrentSession): category progress, game in play, per-category timer. Every mutation also writes to Dexie via `persistSession()`.
- **settings** — language, textSize, soundEnabled

### Persistence (`src/lib/db.ts`)
Dexie (IndexedDB) database `BrainTrainingDB` with tables: `userProfile`, `sessionState`, `gameProgress`, `difficultyState`, `pendingEvents`. Schema versioning is in the `BrainTrainingDB` constructor — always add a new `.version()` block when changing the schema; never mutate existing versions.

### Dynamic difficulty (`src/lib/dynamicDifficulty.ts`)
Each game has a `DifficultyState` record (score 0.0–1.0) per user per day. `getTodayDifficulty()` seeds from yesterday's peak × 0.8 warmup factor. `adjustDifficulty()` promotes (+0.05 × performance multiplier) or demotes (−0.08) after each round. `GameShell` calls this on every `onLevelComplete`. Game-specific `computePerformanceRatio()` is in `src/components/GameShell.tsx` — add a case there whenever a new game is added.

### Game system
- **Registry** in `src/screens/GameRouter.tsx` — maps `gameId` strings to React components + category.
- **Content generation** — most games have a generator in `src/lib/contentGenerators/` that takes difficulty params and returns randomised content. Called once per round (keyed by `gameKey`).
- **Game interface** — every game component receives `{ levelConfig: LevelConfig, onLevelComplete: (result: LevelResult) => void, generatedContent? }`. Call `onLevelComplete` with `completed`, `durationSeconds`, and a `metrics` object. Metrics must match what `computePerformanceRatio` expects for that `gameId`.
- **GameShell** (`src/components/GameShell.tsx`) — wraps every game; handles the exit confirmation, calls `adjustDifficulty`, fires analytics, and decides whether to rotate or continue.

### Games by category
| Category | Games |
|---|---|
| memory | remember-match, shopping-list-recall, sequence-repeat |
| attention | spot-focus, focus-filter, word-search |
| executive | morning-routine-quest, recipe-builder, garden-sequencer |

Each game lives in `src/games/<category>/<GameName>/index.tsx` with a `levels.config.ts` (mostly unused now that dynamic difficulty drives params).

### i18n
`src/lib/i18n.ts` — i18next with `i18next-http-backend` loading JSON files from `public/locales/<lang>/translation.json`. Supported languages: `en`, `hi`, `kn`. Use the `t()` hook with a fallback string: `t('key', 'Fallback text')`.

### Game catalog (`src/lib/gameCatalog.ts`)
The one map from `gameId` to display key, category and art. Six games are `marquee` —
they have commissioned tile and splash art and are the only ones the daily session draws
from; the other nine are reachable from Free Play and fall back to their category icon.
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
Deployed on Firebase Hosting. `firebase.json` at the repo root configures a catch-all SPA rewrite to `index.html`. `vite.config.ts` sets `navigateFallback: '/index.html'` in Workbox so the service worker also handles SPA navigation correctly.

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
```bash
npm run build
firebase deploy --only hosting
```

### Bug tracking
Open bugs are tracked in a Google Sheet (ID: `1xgnKsCiOv8Dl0CZ0R7OxhenS2jzoQfFpB2k-UIKAxWg`) accessible via the Google Sheets MCP tool.
