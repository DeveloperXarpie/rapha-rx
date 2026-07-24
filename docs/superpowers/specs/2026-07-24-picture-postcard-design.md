# Picture Postcard - Design Spec

- **Date**: 2026-07-24
- **Content Type**: Design Spec
- **Source documents**: `docs/GDD_01_Picture_Postcard.md.pdf` (GDD v1.0), `docs/postcard_ui_mock.png`
- **Status**: Reviewed by two design-review agents (architecture lens + GDD-fidelity/UX lens); findings incorporated.

Picture Postcard is a change-detection and location-binding memory trainer for older adults (60-80): study an illustrated scene, the scene is masked, a modified version returns, and the player detects/localises/recalls what changed. This spec adapts the standalone GDD to this app's architecture (rotation-based sessions, GameShell contract, Dexie persistence, sprite-based content).

## 1. Decisions log

Product-owner decisions (settled before this spec):

| # | Decision |
|---|----------|
| D1 | The GDD's 100-level ladder + DI staircase is implemented faithfully as a game-local engine. The app's 0-1 difficulty score is not the authority for this game. |
| D2 | Trials are the unit of play. The app's category rotation may interrupt between trials. The GDD's dedicated Home / level-intro / weekly Brain Map screens are dropped. |
| D3 | Art is composed sprite scenes (flat illustrated backgrounds + positioned object sprites), not painterly AI art like the mock. |
| D4 | No hearts/lives. The mock's 3 hearts contradict the GDD's no-failure non-negotiable; the GDD wins. |
| D5 | MVP scope: Tiers 1-5 (levels 1-50), probe modes M1-M3, change classes 1-7. Deferred: M4, M5, classes 8-10, ambient motion, Tiers 6-10, gentle mode. |

Assumptions made during spec review (flag to PO if wrong):

| # | Assumption | Rationale |
|---|-----------|-----------|
| A1 | Interference micro-task starts at **Tier 5** (L41), behind a config flag `interferenceEnabled`. | GDD self-contradicts (SS3 says Tier 6, SS5 tier table says Tier 5). Tier table wins; the flag supports the GDD's own pilot question 2 and, if Tier 6 turns out correct, disabling it costs nothing. |
| A2 | Level progression is **Firestore-restorable**: one-time hydration read at profile selection, then fire-and-forget writes. | Losing a persistent 1-100 progression to an IndexedDB clear or device swap is far worse than losing the existing daily-reset difficulty. This is a new pattern for the codebase and is specified in SS8.3. |
| A3 | Sprites are a **self-hosted SVG set** (Twemoji/Noto-style, bundled), never font-rendered emoji. | Font emoji cannot express colour/scale/mirror changes deterministically across devices (see SS5.2). |
| A4 | The RotationScreen "achievement echo" (showing the just-earned stars) is deferred. | Nice-to-have; the in-game star card (SS4.5) is the achievement signal for MVP. |

## 2. Integration architecture

### 2.1 Registration touch points

The game id is `picture-postcard`, category `memory`, component at `src/games/memory/PicturePostcard/index.tsx`. The category->game lists are duplicated across the codebase; **all** of these must be updated:

1. `GAME_REGISTRY` in `src/screens/GameRouter.tsx`
2. `GAME_BY_CATEGORY` in `src/session/SessionManager.tsx` (rotation picker)
3. `GAME_BY_CATEGORY` in `src/screens/DailyQuestionnaire.tsx` (first-game picker)
4. `GAME_BY_CATEGORY` in `src/screens/HomeScreen.tsx` (home tiles: needs icon, imageSrc, nameKey)
5. `SessionSummary.tsx` memory-game mapping check
6. i18n keys in all three `public/locales/{en,hi,kn}/translation.json`

### 2.2 Content generation pattern

`GameRouter.generateContentForGame` gets a trivial case returning `generatedContent: undefined` (the existing self-generating pattern used by ShoppingListRecall, SequenceRepeat, FocusFilter). The component loads engine state and generates its trial **in-component on mount** - the engine requires async Dexie reads (current level, DI, scene history) that cannot flow through GameRouter's synchronous `useMemo`.

### 2.3 Engine commit ordering (contract rule)

`GameShell.finishLevel` drops the `LevelResult` and navigates immediately when the rotation threshold is reached; GameRouter otherwise remounts everything via `gameKey`. Therefore:

- **All engine writes complete before `onLevelComplete` is invoked.** `await engine.recordTrial(...)` (and, on trial 10, level-advance commit) happens inside the game component before the callback. No engine writes downstream of the callback or in unmount cleanup.
- Star card sequencing: commit level result -> show star card -> player taps Continue -> `onLevelComplete`. Rotation then fires after the card, never instead of it.
- The x-exit path (`GameShell.confirmExit`) navigates with no callback into the game: an abandoned mid-trial leaves no trial record. The engine must tolerate this (next mount simply generates a fresh trial).

### 2.4 Single difficulty writer

The engine is the sole adaptive authority for this game:

- `GameShell` **skips** the generic `adjustDifficulty` call for `gameId === 'picture-postcard'`. Instead, after each trial the engine writes a derived display score `currentLevel / 100` via `upsertDifficultyState` so `SessionSummary` and any score consumers keep working.
- The GameShell top-bar level badge (`scoreLevelLabel`) is **suppressed** for this game - the game renders its own header (ladder level + trial-progress dots, SS7). Two conflicting level numbers on one screen is unacceptable for this audience.
- A `computePerformanceRatio` case is still added (accuracy x error-distance x hint penalty) because `LevelResult.metrics` feeds analytics, but its output does not drive adaptation.

## 3. Difficulty engine

Module: `src/lib/picturePostcard/engine.ts` (pure logic) + persistence in Dexie (SS8).

### 3.1 Ladder

100 level definitions generated at module load by a pure function implementing the GDD SS4.3 curves and SS5 tier table:

```
objects   = round(5 + 13 * (n/100)^0.85)      // 5 -> 18
encodeMs  = round(8000 - 5000 * (n/100)^0.70) // 8000 -> 3000
delayMs   = round(500 + 9500 * (n/100)^1.20)  // 500 -> 10000
changes   = 1 + floor(n/28)                   // 1 -> 4
lureLevel = floor(n/26)                       // 0 -> 3
```

Plus per-level `changeTypeWeights` (respecting first-appearance levels: class 1 at L1, 2 at L4, 3 at L11, 4 at L15, 5 at L21, 6 at L33, 7 at L41), `probeModeWeights` per tier table (T1: M1; T2: M1/M2; T3: M2; T4: M2/M3; T5: M3), `softTimerMs` (none/none/60s/60s/45s), `interference` (Tier 5+, A1), and `adaptiveClamp` (+-2 levels). Unit tests validate the GDD SS14 checks: tier entry/exit values match the table; no change class before its first-appearance level; clamp bounds +-2 throughout.

### 3.2 Within-level staircase

Continuous Difficulty Index (DI) targeting ~79% accuracy: 3 consecutive correct -> +1 step; 1 incorrect -> -1 step (-2 if DI above nominal). One step = 8% of the delta between adjacent levels' parameter vectors. Steps adjust, in priority order: `delayMs -> encodeMs -> lureLevel -> objects`. DI clamps to nominal +-2 level-equivalents.

### 3.3 Counted trials (deviation from GDD, review finding)

Because a 10-trial level spans 2-4 daily sessions under rotation, warm-up and confidence trials would otherwise dominate a level's accuracy basis. Therefore:

- **Warm-up trials** (first two of each session, at carry -2 steps) and **confidence trials** (frustration guard, at nominal -4) **do not count** toward the level's 10 trials or its accuracy. They run normally, feed the staircase seeding, and are flagged `isWarmup` / `isConfidence` in telemetry.
- A level completes after **10 counted trials**; stars (3/2/1 at >=90/70/50%) and the <50% repeat-at-minus-1-step decision use counted trials only. The star card and trial-progress dots likewise show counted trials only.

### 3.4 Cross-session semantics

- At session start (detected via `sessionStartedAt` stamp change, SS8.1): DI initialises to the rolling mean of the last 20 trials minus one step, **superseding** the in-level staircase position.
- All consecutive-run counters reset at session start: the 3-correct promotion run, the 3-error frustration trigger, and the score streak.
- The frustration-guard budget (max twice per level) persists with the level across sessions.
- **Return-after-absence** (GDD SS11): if `lastPlayedDate` is 7+ days ago, DI opens at rolling mean minus 3 steps for the first level played after return. Never comment on the absence.
- Day boundaries use the codebase's existing UTC `todayISO()` convention. Extract the (currently 4x-duplicated) helper into `src/lib/dates.ts` and use it for all engine date fields; the 30-day anti-repetition window is a date-string comparison, not millisecond arithmetic.

### 3.5 Frustration guard

3 consecutive incorrect counted-or-uncounted trials within a session -> one confidence trial at nominal -4, then staircase resumes from nominal -2. Fires at most twice per level. Unannounced.

## 4. Round loop

Five phases inside the game component (state machine, one trial per GameShell mount):

1. **Ready** (1.5 s): card showing trial number ("Trial 7 of 10"), and **the probe type to expect** (icon + short label, e.g. "You'll tap what changed") - probe foreknowledge is what makes strategic encoding trainable in mixed-probe tiers.
2. **Encoding** (`encodeMs`): full scene + slim depleting bar (neutral colour, no red, no ticking). **Pause during encoding masks the scene**; the encode timer resumes from where it stopped (pause is never penalised, but an unmasked pause is unlimited free encoding).
3. **Retention** (`delayMs`): neutral pattern mask. Tier 5+ (config flag, A1): interference micro-task per SS4.4.
4. **Probe**: one of M1/M2/M3 (SS4.2). Soft timer per tier table: expiry resolves the trial as an omission - no countdown audio, no visual escalation.
5. **Feedback** (<=2 s): correct -> soft ring bloom on the target + score tick. Incorrect/omission -> the correct region is revealed and the original scene re-shown for 1.2 s with the change annotated; this corrective re-exposure is **non-skippable**.

### 4.2 Probe modes (MVP)

- **M1** - both scenes visible (mock layout), tap what differs in the modified scene. Multi-change trials (`changes` >= 2, from L28): all changes must be found; found-marks persist; round resolves when all found or soft timer expires.
- **M2** - modified scene only; tap where the missing/changed object was. Hit = within 1.5x the slot's visual bounds; overlapping hit regions resolve by nearest centroid.
- **M3** - neither scene; 4-option image multiple choice ("What colour was the bicycle?"), options generated from the slot's variant set.

Tap handling (M1/M2): pointer-up position with small movement tolerance (tremor). `tapCoordinates[]` and `errorDistancePx` (tap to true-target centroid, plus scene-width-normalised variant) are logged on **every** tap trial regardless of hit/miss - `errorDistancePx` is one of the GDD's four primary research endpoints.

### 4.3 Scaffolding

Silent, escalating, never before 6 s (premature help destroys the training effect). Spatial ladder (M1/M2):

| Tier | Trigger | Assistance |
|---|---|---|
| 1 | 6 s no response | Non-target regions desaturate 8% |
| 2 | 12 s, or 1 wrong tap | Target quadrant gains a soft warm vignette (luminance + warmth, not hue-only) |
| 3 | 2 wrong taps | Target pulses at 25% opacity, twice, 0.4 s |
| 4 | 3 wrong taps | 0.75 s peek at original scene, then annotated reveal |

**M3 ladder** (review finding - Tier 5 is M3-dominant and the spatial ladder is meaningless there):

| Tier | Trigger | Assistance |
|---|---|---|
| 1 | 6 s no response | (nothing - parity with spatial tier 1) |
| 2 | 12 s, or 1 wrong choice | One wrong option dims |
| 3 | 2 wrong choices | Two wrong options dim (binary choice remains) |
| 4 | 3rd wrong choice | 0.75 s re-exposure of original scene, then annotated answer |

**Hint button**: 3 per level, non-refillable, jumps straight to tier 3 of the active ladder. Costs 30 points, never progress. Unused hints convert to bonus points at level end.

### 4.4 Interference micro-task (Tier 5+, flag `interferenceEnabled`)

"Tap the larger circle": two circles, size ratio >= 1.5:1, both >= 96 dp hit area, high contrast, positions randomised. A new prompt every ~2.5 s for the duration of `delayMs` (a single tap leaves rehearsal time and defeats the purpose). Responses never feed the staircase, score, or accuracy - the task exists purely to block rehearsal.

### 4.5 Star card and level transitions

After the 10th counted trial commits: full-screen in-game card with stars (1-3), counted-trial accuracy, one warm personalised sentence, and a large Continue button. **No auto-dismiss**; `onLevelComplete` fires only on the Continue tap (SS2.3), so rotation can never swallow it. Below 50%: no "failed" framing - card says the level will be revisited, content regenerates at -1 step, stars are never lost.

### 4.6 Teaching layer

One-time **strategy tip card at L41** (~20 s, dismissible): teaches prioritised encoding / gist-plus-detail chunking, the explicit pedagogical counterpart to the encoding-time collapse. Shown once ever (flag in engine state), before the first L41 trial.

## 5. Content system

### 5.1 Scene format

Scenes are TS data in `src/games/memory/PicturePostcard/scenes/`, generator in `src/lib/contentGenerators/picturePostcard.ts`.

A scene: `id`, `theme`, layered background (simple illustrated SVG/CSS composition - sky, ground, 2-3 large set-pieces), and **20+ object slots**, each:

```ts
{
  id: string;
  category: string;           // for M3 questions and substitution
  bbox: { x, y, w, h };       // scene-normalised coordinates
  salience: 1 | 2 | 3;
  centrality: 1 | 2 | 3;
  spriteId: string;           // base sprite
  variants: {
    colours: string[];        // >=2 alternate fills (class 4, M3 options)
    alternate: string;        // same-category different sprite (class 5)
    mirrorable: boolean;      // class 7 eligibility (see 5.2)
    scales: [0.8, 1.25];      // class 6
  };
  altPositions: [Point, Point]; // class 3 translocation targets
  lures: [string, string, string]; // sprite ids ordered by similarity (lureLevel 1-3)
}
```

### 5.2 Sprites (A3)

Self-hosted SVG sprite set (Twemoji/Noto-style, bundled), registered through the existing asset catalog and rendered as `<img>`/inline SVG - **never font emoji glyphs**. This guarantees: deterministic cross-device rendering (font emoji vary by OS - a "change" authored on one tablet may be invisible on another, violating the GDD's no-ambiguous-art rule); recolour via SVG fill substitution (class 4 and M3 colour options); reliable mirroring gated by a per-asset `mirrorable: boolean` (many objects are visually symmetric - mirror changes are only ever assigned to visibly asymmetric sprites); scale changes as-is.

**Build-time validation** (unit test over the scene library): every change class a level can assign must be expressible by the slots it can target - no colour change on a single-colour-variant slot, no mirror on a non-mirrorable slot, `lures` present wherever `lureLevel >= 1` trials can occur.

### 5.3 Trial generation

Given the level's effective (DI-shifted) parameters: pick a scene (no repeat within session; scene x change-class pairing no repeat within 30 days, SS8.2); select target slot(s) weighted by salience/centrality appropriate to the change class; apply `changes` modifications sampled from `changeTypeWeights` (classes 1-7: removal, addition, translocation, colour, substitution, scale, orientation); place near-lures per `lureLevel` with a hard constraint: **lure centroid separation from the target must exceed the sum of both hit radii** so a tremor-displaced tap can never flip a correct intention into a lure hit. Multi-change trials never stack two changes on the same slot.

### 5.4 Initial library

8 scenes; at least 3 regionally Indian (market, temple street, tea stall) alongside park, seaside, kitchen, garden, cafe. Warm, populated, everyday; no children as focal subjects, no brand-like signage, no dense text. The format is the contract - library growth is pure content addition.

## 6. Scoring

```
roundScore = 100 x changesFound
           + speedBonus (0-40, Tier 3+ only, from soft-timer remainder)
           x streakMultiplier (x1.0 / x1.2 / x1.5 at streaks 3 / 5 / 8, resets at session start)
           - 30 per hint used
           - 15 per scaffold tier auto-triggered above tier 1
```

Floor of 10 for any completed trial; never negative. Unused hints -> bonus at level end. No leaderboards; comparison only against the player's own history. Score feeds `LevelResult.metrics` (SS2.4).

## 7. UI

Layout follows the mock's structure with these deliberate deltas:

- **No hearts** (D4). Top bar: score + level number only.
- **No Replay button** - re-showing the encoding scene on demand voids the retention probe. The only sanctioned re-exposure is error feedback (and scaffold tier 4).
- The mock's dashed-circle annotation appears **only** in feedback/scaffold-4, never during the probe.
- The mock's level rail becomes a **10-dot counted-trial progress rail** ("trial 7 of 10") - with levels spanning days, players need to see where they are.
- Game-internal header shows ladder level ("Level 12"); the GameShell 0-1 badge is suppressed (SS2.4).

Type: all in-game text >= `text-h3` (22 px); instructions and probe prompts >= `text-h2` (28 px). Never `text-body`/`text-caption` in-game (app tokens are below the GDD's >=20 sp body / >=26 sp instruction baseline). Touch targets >= 80 px per app standard (>= GDD's 64/96 dp). No meaning in hue alone; no flashing above 3 Hz. All strings via `t()` with English fallbacks; keys added to en/hi/kn.

## 8. Persistence

### 8.1 Dexie (new `.version()` block; never mutate existing versions)

**Table `ppEngine`** - primary key `userId`, one row per user, written via `put()` (atomic upsert; the get-then-add pattern used elsewhere is not acceptable on a per-trial hot path):

```ts
{
  userId: string;
  currentLevel: number;          // 1-100
  di: number;                    // continuous, level-equivalent units
  countedTrialsInLevel: number;
  correctCountedInLevel: number;
  trialHistory: TrialRecord[];   // rolling last 20 (correct, di, isWarmup, isConfidence)
  starsByLevel: Record<number, 1|2|3>;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  streak: number;
  frustrationGuardUsedInLevel: number;  // 0-2
  sessionStamp: string | null;   // sessionStartedAt of last-seen session
  trialsThisSession: number;     // for warm-up flagging; reset on stamp change
  scenesThisSession: string[];   // anti-repetition; reset on stamp change
  tipCardL41Shown: boolean;
  lastPlayedDate: string;        // ISO date (UTC), for absence detection
  updatedAt: number;
}
```

Session-scoped fields live here (reset when `sessionStamp` changes), **not** in the Zustand `CurrentSession`/Dexie `SessionState` - those shapes stay untouched (their persist/restore mapping silently drops unknown fields).

**Table `ppPairHistory`** - primary key `[userId+pairKey]` where `pairKey = sceneId:changeClass`; value `{ lastUsedDate }`. 30-day window checked by ISO-date-string comparison.

### 8.2 Anti-repetition

No scene repeats within a session (`scenesThisSession`); no scene x change-class pairing within 30 days (`ppPairHistory`). If constraints exhaust the library (8 scenes, early days), relax the 30-day rule first, then the within-session rule; never block a trial.

### 8.3 Firestore restore (A2 - new pattern)

- After each trial: fire-and-forget `setDoc` of the `ppEngine` row (minus bulky history) to Firestore, wrapped in try/catch like `gameProgress` sync.
- At profile selection: one-time hydration read; if the remote row's `updatedAt` is newer than local (or local is absent), adopt remote. Local Dexie remains the runtime source of truth; failure to reach Firestore never blocks play.

## 9. Telemetry

Per-trial event `pp_trial_completed` through the existing analytics/pendingEvents pipeline, with: `levelAttemptId` (fresh id per level attempt - groups trials into levels downstream, since gameKey remounts make each trial look like a separate game), `trialIndex`, `level`, `effectiveDI`, `sceneId`, `objects`, `encodeMs`, `delayMs`, `changeType`, `probeMode`, `lureLevel`, `correct`, `omission`, `responseLatencyMs`, `tapCoordinates[]`, `errorDistancePx`, `errorDistanceNorm` (scene-width-normalised), `scaffoldTierReached`, `hintsUsed`, `isWarmup`, `isConfidence`, `roundScore`. Level completion additionally emits `pp_level_completed` (stars, counted accuracy, level, hints used/unused).

## 10. Deferred scope (follow-up spec; no rework required)

M4 drag-back reconstruction, M5 cross-session probes, change classes 8-10, ambient motion, Tiers 6-10 content, gentle mode (4-up/1-down), weekly Brain Map, RotationScreen achievement echo (A4), reminder scheduling (GDD SS11). The ladder generator already emits all 100 levels; the scene format already carries everything classes 8-10 need.

## 11. Pre-existing issues surfaced during review (raised separately - not fixed in this feature)

1. `todayISO()` duplicated 4x (`store/index.ts`, `resumeSession.ts`, `dynamicDifficulty.ts`, `db.ts` inline) - this feature extracts a shared helper for its own use; migrating the other callers is a separate cleanup.
2. `flushPendingEvents` fires-and-clears without awaiting success - queued analytics can be lost on flaky reconnect (`src/lib/analytics.ts:41-50`).
3. Category->game lists duplicated across 5 files (SS2.1) - should be centralised in one module.
4. Existing Dexie upsert helpers are non-atomic get-then-add (`db.ts:131-138`).
