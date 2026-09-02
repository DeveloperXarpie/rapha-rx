# App Flow Redesign — Design

Date: 2026-09-02

Source: `App flow redesign clarification/design_handoff_app_flow_redesign/README.md` (the handoff), plus
the sibling `App flow redesign clarification/Assets/` folder.

Revision 2, after a code-grounded review. The findings that changed the design are recorded inline as
"Correction" notes so the reasoning is not lost.

## Goal

Replace the resident-facing chrome of Rapha-Mind with the new blue-gradient visual language, restructure
the flow (launch screen, per-category intros, per-game title screens, merged home), and replace the
existing Practice Mode with a designed free-play library. Game boards are out of scope: only the chrome
around them changes.

The handoff README is the fidelity authority for colours, gradients, type, radii, shadows and spacing.
This document records the decisions the handoff left open, the mapping onto the existing codebase, and
the phasing.

## Decisions taken

| # | Question | Decision |
|---|---|---|
| 1 | Which repo games are the six named games? | `market-memory` = Shopping List, `train-yard` = Station Master, `spot-focus` = Spot Focus, `garden-keeper` = Garden Keeper, `serve-guests` = Tiffen Time, `clear-the-way` = Free Me |
| 2 | What happens to the other nine games? | They stay playable, reachable only from the free-play library once the day's session is complete |
| 3 | Care home vs prescriber | Prescriber **is** the care home. `UserProfile.careHomeId` is kept as the storage field and relabelled "prescriber" throughout the UI |
| 4 | Prescriber names | Placeholder list, in one exported config array, trivially swappable |
| 5 | Game boards | Unchanged |
| 6 | "Last time: level {n}" source | A new non-indexed `lastLevel` / `lastPlayedISO` pair on the existing `gameProgress` row. See "Last level" below |
| 7 | Session trio | Three games, one per category, chosen at random per session, never repeating the previous session's game for that category |
| 8 | The strip of three non-playing marquee games | Kept, relabelled **"ANOTHER DAY"** — with a random trio, "UNLOCKS LATER" would be untrue |
| 9 | Free-play library | Replaces the existing Practice Mode. Reached from Home once today's session is complete |
| 10 | Tile art for the nine non-marquee games | Category icon on a white rounded chip |
| 11 | Settings and prescriber | A prescriber row that opens the same picker modal used at signup |
| 12 | Where Education sits | Between Home's Start Session and the first category intro, so it plays before every session as the handoff requires |
| 13 | Session length copy | The 2-minute-per-category threshold is unchanged; Home's duration line is derived from it and reads "about 6 minutes", not the handoff's "30 minutes" |

### Deliberately unresolved

- Real prescriber names. Placeholder data ships; swapping the array is a one-line change.
- Whether the free-play library should be reachable before the session is complete. It is not, matching
  today's Practice Mode gating.
- Whether the 2-minute category threshold is the right therapeutic dose. Decision 13 makes the copy match
  the code rather than the reverse, because changing the dose needs clinical sign-off, not a redesign.

## Architecture

Three forks were considered and settled before design.

**Visual system - additive, not a replacement.** The new palette is appended to `src/styles/tokens.ts` as
a `BRAND` block; the existing `COLORS` and `TYPOGRAPHY` are untouched, because fifteen shipped game boards
draw on them and boards are out of scope. `Button` gains two new variants, `green` and `blue`; the existing
`primary` / `secondary` / `ghost` variants keep working for in-board UI. The repo carries two colour
systems for a while, which is honest: chrome and board genuinely are two systems.

The alternatives - rewriting the tokens wholesale, or standing up a parallel `v2` route tree behind a flag
- were rejected as, respectively, an unplanned re-QA of fifteen games and an unnecessary doubling of
surface area given the phasing already provides checkpoints.

**Routing - real routes, not a phase machine.** `/app/rotation` is replaced by `/app/intro/:category`, and
`/app/game/:gameId/title` is added. Each screen is its own file, deep-linkable, and owns exactly one timer
with a clear unmount. Folding a `phase: 'title' | 'playing'` state into `GameRouter` was rejected:
`GameRouter` already carries the whole registry plus content generation, and a back press mid-title would
be ambiguous.

**Trio selection - decided once, at session start.** Home must display the three games before the session
begins, so `session.plannedGames` is computed and persisted by `startSession()`. `triggerRotation` reads
the next planned game rather than calling `pickGame`. Deciding lazily would let Home show a trio the
session then contradicts.

### New and changed modules

```
src/styles/tokens.ts              BRAND block appended (colours, category palette, radii, shadows)
src/styles/index.css              Baloo 2 weights 400,500 added to the existing font import
                                  (Baloo 2 is already the UI font at 600/700/800)

src/components/ui/Button.tsx      + variant 'green' | 'blue'
src/components/chrome/
  ScreenBlue.tsx                  blue radial gradient + wave overlay + overflow-x guard
  WaveOverlay.tsx                 the decorative bottom wave, pointer-events: none, aria-hidden
  GameRow.tsx                     Home's 74px-icon game row
  GameTile.tsx                    free-play library tile
  CategoryBadge.tsx               132px white rounded badge holding a category icon
  ProgressBar.tsx                 the 2s linear intro bar, reduced-motion aware
  ScreenTransition.tsx            the handoff's motion table, one place. See "Transitions"

src/lib/gameCatalog.ts            single source of truth: gameId -> display key, category,
                                  icon asset, splash asset, marquee flag
src/lib/prescribers.ts            placeholder prescriber list, reconciling the three existing
                                  care-home name lists
src/lib/sessionPlan.ts            pickTrio(): random, no repeat of the previous session per category
src/lib/lastLevel.ts              read/write the per-game lastLevel on gameProgress

src/screens/LaunchScreen.tsx      NEW
src/screens/SplashScreen.tsx      NEW (replaces CareHomeSelector's entry step)
src/screens/SignupFlow.tsx        restyled, age field removed, prescriber picker and the
                                  Confirmation step added as internal steps of this component
src/screens/SignInScreen.tsx      NEW (replaces ProfileSelector)
src/screens/EducationScreen.tsx   the existing DailyQuestionnaire, restyled and re-sited,
                                  stripped of its session-starting responsibilities
src/screens/HomeScreen.tsx        rebuilt
src/screens/CategoryIntro.tsx     NEW (replaces RotationScreen)
src/screens/GameTitleScreen.tsx   NEW
src/screens/FreePlayScreen.tsx    NEW (replaces Home's inline Practice Mode)
src/screens/SessionSummary.tsx    restyled + reads plannedGames instead of hardcoded gameIds
src/screens/SettingsScreen.tsx    restyled + prescriber row

deleted: src/screens/RotationScreen.tsx, src/screens/CareHomeSelector.tsx,
         src/screens/ProfileSelector.tsx, src/screens/DailyQuestionnaire.tsx
```

`src/components/AppShell.tsx` loses its header entirely. The new Home carries its own header (navy logo
left, SETTINGS control right) and every other screen is full-bleed. Language switching, currently in the
AppShell header, already exists in `SettingsScreen.tsx:69-89`, so nothing is lost. `AppShell` is reduced to
the text-size effect, the offline banner, the scroll container and `RotateDevice`.

Two things about `AppShell` that the first revision missed and that the implementation must handle:

- `AppShell.tsx:32` is `useMatch('/app/game/:gameId')`, an **exact** match, so the new
  `/app/game/:gameId/title` route would not match and the full-bleed title screen would inherit
  `overflow-y-auto` and the offline banner. The match must become a prefix test covering both routes, and
  the same treatment must extend to `/app/intro/:category`.
- `AppShell.tsx:49` puts `bg-app-bg` on the root and wraps the outlet in a `flex-1 min-h-0 flex flex-col`
  main. Every new full-bleed gradient screen has to fill that flex child, and `bg-app-bg` has to stop
  showing through at the edges.

**GameShell's in-board chrome** (title banner, category tag, level tag, close control, `GameShell.tsx:141-172`)
is **not** restyled. The handoff's screen inventory nominally lists screens 9/11/13 as touching `GameShell`,
but the substance of those rows is the new game title screen, which is a separate route. Leaving the board
chrome alone is the decision that keeps "boards are out of scope" true.

### Data flow

`gameCatalog.ts` is the join point. It is the only place that knows a `gameId` maps to a display key, to
`tile-shopping.png`, to `splash-shopping.png` and to the memory category, and it carries the `marquee`
flag. Home, the free-play grid, the game title screen, the summary and `pickTrio` all read from it.

It also **replaces** the two stale, duplicated `GAME_BY_CATEGORY` maps at `SessionManager.tsx:8-12` and
`DailyQuestionnaire.tsx:9-13`, neither of which lists `serve-guests` or `clear-the-way` — two of the six
games decision 1 makes marquee. Both maps and both copies of `pickGame` are deleted; `gameCatalog` plus
`pickTrio` is the only game-selection path afterwards.

`sessionPlan.pickTrio(previousTrio)` is pure: given the previous session's trio it returns the next one,
one marquee game per category, never repeating the previous session's game for that category.

## State changes

### `plannedGames`

`CurrentSession` and the Dexie `SessionState` both gain `plannedGames: string[]` — three gameIds in
memory / attention / executive play order.

**Correction (was wrong in revision 1):** this needs **no Dexie version bump**. `.stores()` declares
indexes only, and `sessionState` is indexed as `'++id, userId, date, [userId+date]'` (`db.ts:122`). The
codebase already documents this precedent at `db.ts:82-84`. Adding a `.version(4)` block for a
non-indexed field would be cargo cult.

What *does* need editing, and was missing entirely from revision 1: `persistSession`
(`store/index.ts:78-92`) hand-copies nine named fields into `dbState`. A `plannedGames` added to
`CurrentSession` but not to that literal is silently dropped on every write, and resume would quietly
return the wrong trio.

`pickTrio` is called by `startSession()` (`store/index.ts:129-143`) — and specifically **after** its
early-return guard at `:134`, so resuming an in-progress session never re-rolls the trio.

**Correction:** revision 1 specified a fallback that picked a game "on the fly" when `plannedGames` was
empty, which re-created the exact lazy-selection problem the design rejected. It is replaced: a session
row with an empty `plannedGames` (a pre-migration resume) has `pickTrio` run **once**, for the whole
remaining trio, and the result written back immediately. The session then behaves identically to a fresh
one.

### Session start and the `questionnaireCompleted` flag

**Correction.** Revision 1 called `DailyQuestionnaire` a restyle-and-re-site. It is not: it is the screen
that *starts the session*. `DailyQuestionnaire.tsx:37-53` sets the category, picks the game, calls
`markQuestionnaireComplete`, fires `session_workout_started`, and navigates straight into the first game,
bypassing Home entirely. And `questionnaireCompleted` is load-bearing in three places:
`resumeSession.ts:17` (resume returns null without it), `store/index.ts:134` (guards an in-progress
session from being wiped), and `DailyQuestionnaire.tsx:30-35` (self-redirect if already set).

Under decision 12 Education plays before every session, so it cannot own a once-per-day flag. The
responsibilities are redistributed:

- `startSession()` becomes the single session-start point. It sets `sessionStartedAt`, computes
  `plannedGames`, sets `currentCategory` to `memory` and `currentGameId` to `plannedGames[0]`, and fires
  `session_workout_started`.
- `questionnaireCompleted` is **renamed** to `sessionStarted` across `CurrentSession`, `SessionState`,
  `persistSession`, `resumeSession.ts` and the store guard. Same non-indexed field semantics, so again no
  Dexie version bump; the rename is mechanical and must be done in one commit.
- `EducationScreen` becomes purely informational: it renders copy and a "Let's Begin" button that
  navigates to `/app/intro/memory`. It sets no flags and picks no games, so visiting it twice is harmless.
- Home's Start Session button calls `startSession()` then navigates to `/app/education`.

### Last level

**Correction.** Revision 1 said "derived from the existing `DifficultyState` via `getTodayDifficulty` /
`scoreToLevel`, no new persisted state". All three parts were wrong. `getTodayDifficulty`
(`dynamicDifficulty.ts:26`) is async and Dexie-backed, so Home cannot derive anything synchronously; it
**writes** on a cache miss, so merely rendering Home would create today's difficulty rows for three
unplayed games and move the warm-up seeding earlier; and on a fresh day it returns
`yesterday.peakScore * 0.8`, a warm-up-decayed score, not the level the resident last reached.

Instead: `GameProgress` (`db.ts`) gains two non-indexed fields, `lastLevel?: number` and
`lastPlayedISO?: string`. No Dexie version bump, same precedent as `tipCardPhotoShown`. `GameShell` writes
them at the point it already calls `adjustDifficulty`. `src/lib/lastLevel.ts` exposes a batched
`getLastLevels(userId, gameIds)`, which Home and the free-play grid call in a single effect with a loading
state, in the same shape `SessionSummary.tsx:27-37` already uses. A game with no `lastLevel` renders no
level line rather than a zero.

### Not added

- `bootstrapped` is not a store field. The launch screen is local state in an `AppBootGate` wrapper in
  `App.tsx` that resolves when i18n is ready and the Dexie handle opens, with a 1200 ms minimum dwell.
  Nothing else reads it.
- `session.introShownAt` from the handoff is not added. The existing `firedRef` guard in `RotationScreen`
  is the pattern the handoff itself endorses, and it needs no persisted timestamp. Recorded here as a
  deliberate divergence.
- `unlockedGames` is not added. The marquee six are a constant in `gameCatalog.ts`; the "ANOTHER DAY"
  strip is the marquee six minus `plannedGames`.

## Flow

```
Launch  --auto, boot + min 1200ms-->  Splash
Splash  --Get Started-->  Signup: name -> prescriber -> confirmation  --Next-->  Home
Splash  --Sign in------>  Sign-in                                     --Sign in-->  Home

Home  --Start Session-->  Education  --Lets Begin-->  Category intro: memory
      --SETTINGS------->  Settings   --back-------->  Home
      --Free Play------>  Free-play library      (only once today's session is complete)
      --Resume--------->  Category intro for the in-progress category

Category intro --auto 2000ms--> Game title --PLAY--> board
board --category complete (2 min elapsed)--> next category intro
                                        --after the third--> Session summary
board --level complete, under 2 min--> another round of the same game, no title screen

Session summary --Back to Home--> Home
Game title --close--> Home (abandons the session)

Free-play library --tile--> Game title --PLAY--> board --level complete--> Free-play library
Free-play library --back--> Home
```

**Correction.** Revision 1 read as one completion per category. `ROTATION_THRESHOLD_SECONDS` is 120
(`GameShell.tsx:36`): a level completion under two minutes starts another round of the same game
(`GameRouter.tsx:252-259` bumps `gameKey`) and rotation only fires past the threshold. Consequences now
designed for:

- The game title screen shows **once per category**, on the way in from the category intro, not before
  every round. Repeat rounds go straight back to the board.
- Home's duration copy is derived from the threshold (decision 13).
- Free play needs a change in `triggerRotation`, not just in `GameShell`. With all three categories
  complete, the ticker keeps running, and after 120 s a free-play round would hit `triggerRotation`,
  find `allDone` and navigate to `/app/summary`. `triggerRotation` must return without navigating when the
  session is already complete, leaving the free-play round to end via `onLevelComplete` back to the library.

**Correction.** Revision 1 named `GameShell` as the risk site for "three destinations". It is not the
site: `GameShell.finishLevel` (`GameShell.tsx:113-120`) only chooses between `triggerRotation()` and
another round; every destination decision lives in `SessionManager.triggerRotation`
(`SessionManager.tsx:61-97`). That function is where the free-play branch and the `plannedGames` lookup
both land, and it is the risk site.

### Routes

```
/                       SplashScreen          (AppBootGate renders LaunchScreen above the router)
/signup                 SignupFlow            (name -> prescriber -> confirmation, internal steps)
/signin                 SignInScreen
/app/education          EducationScreen
/app/home               HomeScreen
/app/intro/:category    CategoryIntro         (replaces /app/rotation)
/app/game/:gameId/title GameTitleScreen
/app/game/:gameId       GameRouter
/app/free-play          FreePlayScreen
/app/summary            SessionSummary
/app/settings           SettingsScreen
```

`/app/questionnaire` redirects to `/app/education`, and `/app/rotation` to `/app/home`, so a bookmarked
or service-worker-cached URL does not dead-end.

**Correction.** `/login/:careHomeId` is **not** removed in phase 2. It is the only sign-in path for
existing profiles until `SignInScreen` lands, and revision 1 deleted it a phase early. It survives, with
`ProfileSelector`, until phase 3.

`HomeScreen.tsx:108-110`'s `handleResumeSession` currently navigates to `/app/rotation`. Phase 2 rewires it
to `/app/intro/:currentCategory`; revision 1 smoke-tested resume without designing it.

## Transitions

**Correction.** Revision 1 mentioned only reduced-motion collapse. The handoff specifies eight transitions
with explicit durations and easings, and React Router provides none of them. This is real work and it is
budgeted in phase 2, in one place: `src/components/chrome/ScreenTransition.tsx`, a wrapper that reads the
route it is entering and applies the matching motion from a single table.

| Transition | Motion |
|---|---|
| Launch to Splash | 250 ms cross-fade |
| Onboarding step to step | 220 ms horizontal slide, `cubic-bezier(0.22,0.61,0.36,1)` |
| Home to Category intro | 300 ms fade + 1.02 to 1.0 scale on the incoming screen |
| Category intro to Game title | 350 ms cross-fade, fired by the 2 s timer |
| Game title to board | 250 ms fade |
| Board complete to next intro | 300 ms fade |
| Last board to Summary | 400 ms fade; summary rows stagger 60 ms apart, 12px rise + fade |
| Category intro progress bar | width 0 to 100%, 2000 ms linear, no delay |

All collapse to instant cuts under `prefers-reduced-motion`.

## Timers

Two auto-advancing screens, both of which must not fire twice and must not fire after unmount:

- `CategoryIntro` — 2000 ms, then navigate to the game title screen.
- `LaunchScreen` — resolves on boot completion or 1200 ms, whichever is later.

Both use the `firedRef` guard the current `RotationScreen` already uses, plus a `clearTimeout` in the
effect cleanup. The intro's progress bar is a CSS transition on `width`, not a JS ticker, so a backgrounded
tab cannot desynchronise the bar from the navigation.

Under `prefers-reduced-motion` the bar renders full and static for the same 2000 ms.

## Accessibility

- Minimum hit target 44px; all primary buttons are 58-68px tall.
- Focus-visible: 3px `#FFFFFF` outline at 2px offset on both button variants.
- The wave overlay carries `pointer-events: none` (the handoff's preferred fix) and `aria-hidden`.
- Category intro screens announce via `role="status"`, so a screen reader hears the category name before
  the auto-advance.
- Existing text-size scaling (`html.text-size-*`) must keep working: the new screens use `rem`-relative
  sizes for body copy, and fixed `px` only for the decorative lockups the handoff specifies in px.

## i18n

Every string goes through `react-i18next` in the existing `common` namespace (`i18n.ts:13-16`), added to
`public/locales/{en,hi,kn}/common.json`. Keys are namespaced by screen: `launch.*`, `splash.*`, `signup.*`,
`signin.*`, `education.*`, `home.*`, `intro.memory.*`, `gameTitle.*`, `freePlay.*`, `summary.*`,
`settings.*`.

Game display names live in the catalog as translation keys, not literals.

The handoff's fixed pixel widths on buttons ("size the button so the label never wraps") do not survive
Hindi and Kannada. New buttons take a `min-width` from the handoff and grow from there, with
`white-space: nowrap` dropped in favour of a two-line-tolerant flex layout. A deliberate divergence.

## Assets

Brand and category art comes from `design_handoff_app_flow_redesign/assets/`; game icon and splash art
comes from the sibling `Assets/` folder, which is the only source that has all six marquee games rather
than the handoff bundle's three.

```
public/brand/     logo-launch.png logo-navy.png logo-onblue.png tree-glyph.png leaf.png
                  <- design_handoff_app_flow_redesign/assets/
public/category/  ic-memory.png ic-attention.png ic-planning.png
                  <- design_handoff_app_flow_redesign/assets/
public/games/     tile-{shopping,station,spot,garden,tiffen,freeme}.png
                  <- Assets/UI_icon_*.png
                  splash-{shopping,station,spot,garden,tiffen,freeme}.png
                  <- Assets/GameSplashscreen_*.png
```

The handoff also names `game-{shopping,station,spot,garden,tiffen,freeme}.png` at 240px as the Home tiles.
Those exist for only some games in the handoff bundle. Phase 1 compares them against `Assets/UI_icon_*`
and, if they are the same art, prefers the handoff bundle's; if they differ, `Assets/` wins because it is
complete. Whichever is chosen, all six come from one source so the Home rows are visually consistent.

The `__MACOSX/._*` resource-fork files are not copied. Legacy `tile-*.png` and `icon-brain.png` are not
copied; they are superseded.

## Phasing

Each phase ends green: no new lint errors, `npm run build` clean, manually smoke-tested, version bumped.

**Phase 1 - design system.** Tokens, fonts, `Button` green/blue variants, `ScreenBlue`, `WaveOverlay`,
`CategoryBadge`, `ProgressBar`, `GameRow`, `GameTile`, `ScreenTransition`, `gameCatalog.ts`, assets copied
into `public/`. No screen changes; verified against a throwaway scratch route removed before the phase
closes. Nothing user-visible ships.

**Phase 2 - session flow.** `LaunchScreen`, `EducationScreen`, `HomeScreen`, `CategoryIntro`,
`GameTitleScreen`, `FreePlayScreen`, `SessionSummary`; `sessionPlan.ts`, `lastLevel.ts`; the
`questionnaireCompleted` to `sessionStarted` rename; `plannedGames` through the store, `persistSession`
and `resumeSession`; the `triggerRotation` rewrite including the free-play branch; routing changes;
`AppShell` header removal and its route-match fix; `RotationScreen` and `DailyQuestionnaire` deleted.
`/login/:careHomeId`, `CareHomeSelector` and `ProfileSelector` all survive this phase untouched.

**Correction.** `FreePlayScreen` moves from phase 3 into phase 2. Rebuilding Home deletes the shipped
Practice Mode (`HomeScreen.tsx:231-255`), so shipping the replacement in a later phase would mean a
release with a feature missing. Its `practice_game_started` event name is kept so the existing metric
stays continuous.

**Phase 3 - onboarding and settings.** `SplashScreen`, `SignupFlow` restyle with the age field removed and
the prescriber picker plus confirmation step added, `SignInScreen`, `prescribers.ts`, `SettingsScreen`
restyle with the prescriber row; `CareHomeSelector`, `ProfileSelector` and `/login/:careHomeId` deleted;
`/` switched from `CareHomeSelector` to `SplashScreen`.

Between phase 2 and phase 3 a resident signs in through the old care-home screens and lands in the new
flow. That is visually inconsistent but fully working: the old screens navigate to `/app/home`, which is
the new Home, and Education is reached from Home's Start Session rather than from any entry screen.

`prescribers.ts` must reconcile three existing, differently-shaped lists — `CARE_HOME_NAMES` duplicated in
`ProfileSelector.tsx:13` and `SettingsScreen.tsx:9`, and `LOCATIONS` in `CareHomeSelector.tsx:12-18` — or
existing profiles' `careHomeId` values stop resolving to a name.

`SignInScreen` matches on name across all profiles, but the only existing query is care-home-scoped
(`getProfilesByCareHome`, `db.ts:202`). Phase 3 adds a `getAllProfiles` or name-matching helper.

## Testing

No test suite exists in this repo, so verification is the manual protocol from `CLAUDE.md`, tightened:

- `npm run lint` — must not add errors. There are 38 pre-existing errors; the gate is "no new ones".
- `npm run build` — clean.
- Manual smoke, per phase:
  - Cold start shows Launch for at least 1200 ms, then the next screen. No flash.
  - Start a session; confirm Home's three rows are the three games actually played, in order, and that
    the "ANOTHER DAY" strip holds the other three marquee games.
  - Confirm the Home duration line matches `ROTATION_THRESHOLD_SECONDS * 3`.
  - Refresh mid-session; confirm resume returns to the same trio and the same category, via
    `/app/intro/:category`.
  - Complete a round in under two minutes; confirm a second round of the **same** game starts with no
    title screen, and that rotation only happens past two minutes.
  - Each category intro holds 2 s, animates the bar, and advances once. Navigate away mid-intro and
    confirm no stale navigation fires.
  - The close control on a game title screen returns to Home and abandons the session.
  - Complete all three categories; confirm the summary rows report the games from `plannedGames`, not a
    hardcoded set, and that Home then offers Free Play.
  - Play a free-play game for over two minutes; confirm it does **not** bounce to the summary, and that
    finishing returns to the library.
  - Reduced-motion on: every transition is an instant cut, the intro bar is static, timing unchanged.
  - Text size large and xlarge, in `en`, `hi` and `kn`: no clipped or overflowing button labels.
  - Phase 2 only: sign in through the surviving old care-home screens and confirm the new Home loads.
  - No console errors throughout.

## Risks

- **`SessionManager.triggerRotation`** is the single highest-risk function. It gains the `plannedGames`
  lookup, the free-play early return, and the `/app/intro/:category` destination, replacing logic that was
  previously spread across it, `GameShell` and `DailyQuestionnaire`.
- **The `questionnaireCompleted` to `sessionStarted` rename** touches the store, Dexie's `SessionState`,
  `persistSession` and `resumeSession`. A partial rename silently breaks resume, which is invisible until
  a resident refreshes mid-session. It must land in one commit and be smoke-tested against a session
  created before the rename.
- **`persistSession`'s hand-copied field list** (`store/index.ts:78-92`) drops any `CurrentSession` field
  not named in it. Both new fields have to be added there.
- **A mutable prescriber** (decision 11) makes `careHomeId` changeable post-signup, which re-buckets the
  resident's Amplitude cohort (`analytics.ts:32-35`) and moves them between `getProfilesByCareHome` result
  sets. The handoff listed this as undesigned. It is accepted, and the change should fire an explicit
  analytics event so the cohort move is traceable rather than silent.
- **Removing the AppShell header** removes the only language switcher outside Settings. If field feedback
  says residents used it there, it comes back as a Settings-reachable control, not as restored chrome.
- **Fixed-px layout from a 360x780 design canvas** on care-home tablets. Anything that must not scale is
  called out in px in the handoff; everything else uses relative units.
