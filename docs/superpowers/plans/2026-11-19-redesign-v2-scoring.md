# Redesign v2 Plan 4: Scoring Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Date**: 2026-11-19
**Content Type**: Implementation plan

**Goal:** Score each skill from the rounds a resident plays in a category session. Show the per-game scorecard (Mock 2: two skill cards with a band word and a 5-segment bar) when a category completes. Follow it with the 10-minute summary (Mock 3: a ring per skill with "n of 100", the change since last session, and a headline word), then Home.

**Architecture:**
- **Round log:** every round that counts for the category session is written to a new Dexie table, `roundLog`.
- **Pure scoring:** everything that decides a number is pure and node-tested. It turns a list of rounds into skill scores, bands and the summary.
- **Screens:** the scorecard and the summary screen read today's rounds and those of the previous session, then render.

**Tech Stack:** React 18 + TypeScript, Dexie, i18next, Vitest (node environment, pure modules only).

**Spec:** `docs/redesign-v2/FINAL_SPEC.md` sections 7.1-7.6, D8-D14 and D24. The mocks are on pages 3 and 4 of `docs/App Flow changes finale.pdf`. Score formulas come from `docs/scoring and end/Game Performance Measurement Format.docx`.

**Branch:** `feat/app-flow-redesign`. Commits carry no co-author line.

## Decisions this plan makes

| Topic | Behaviour | Source |
|---|---|---|
| Score formula (C3) | Measure only: each skill's measure from 7.1 as a 0-100 whole number, capped at 100. Difficulty is not mixed in. | Owner, 2026-11-19 |
| Summary headline | Absolute bands: the spec's 10-band table (7.2) applied to the average of the skills shown. | Owner, 2026-11-19 |
| When the scorecard shows (C6) | Only at category completion, for the game being played then, scored over that game's rounds in this category session. | Owner, 2026-11-19 |
| Order at the threshold (C4) | Scorecard (with the unlock banner), then the 10-minute summary, then Home. After the third category the summary goes to Home, and Home offers Free Play. The interim day summary from plan 1 is retired. | Owner, 2026-11-19 |
| Which rounds count | Rounds credited to the open category (`creditsTime`), not debug. Second-trip rounds count for Retention only. The same rule as the 10 minutes (D3, D5). | D3, D5 |
| Skills per game | FINAL_SPEC 7.1, as shipped in this order: Shopping List recall, retention; Station Master sequences, association; Spot Focus selectiveAttention, responseTime; Tiffin sequencing, decisionMaking; Free Me planning, problemSolving. The game intro's skill list (`GAME_SKILLS`, from the framework) is aligned to the same table. | D24: skill names fixed by the owner |
| Skills with no data yet | Station Master's Sequence (staggered arrival waits for art) and Retention on a visit with no second trip have no score. Their card and ring are left out, not shown as 0. | Interim |
| Response speed range | Spot Focus: median gap between finds mapped 2 s = 100 to 20 s = 0, linear and clamped. The framework's 1-3 s range was set for reaction-time tasks; spot-the-difference gaps are far longer. Provisional, for research to tune. | Framework open question; this plan |
| Scorecard band (5 levels) | The framework's bands, 0-39 / 40-59 / 60-74 / 75-89 / 90-100, give levels 1-5 and the spec's 7.2 words (Fighting Spirit ... Pure Excellence). The bar fills to the level. | 7.2 words, framework bands |
| Scorecard message (C5) | "Thank you for playing today." Instead, when the game's first skill rose by 3 or more points since the last session: "You have improved steadily." plus "Keep playing to build on it." The mock's line is 11 words; D10 caps messages at 10. | Interim |
| "Since last session" (C16) | The same category's most recent earlier day with logged rounds. The ring shows the change: a green up arrow and "+6", a red down arrow and "-4", or no arrow and "0". The mock's "88" was a placeholder. | D12, D13 |
| History metrics, weekly stars, demographic comparison | Not built (contents TBD, C14 and C15 open). | Spec TBD |
| Skill colours | Mock 3's: Recall green, Retention yellow, Sequence cyan, Association pink. The others reuse that palette in the order shown. | Mock 3 |

## Global Constraints

- **Players see no numbers except on the 10-minute summary** (D12, 7.6). The scorecard shows band words and bars only.
- **Every new string** goes into en, hi and kn, is under 10 words, and is read with a fallback.
- **Dexie:** a new `.version(4)` block repeats every v3 table and adds `roundLog: '++id, userId, [userId+date+category], [userId+category+date]'`. Never edit versions 1-3.
- **Touch targets** at least 80 px; reduced motion respected (ring fill animation).
- **Release:** a minor bump to `1.39.0`. Lint must show no new errors against **28 errors, 1 warning**. The two known sessionLedger tests (30 s timer) are the only allowed failures.

## Review Focus

1. **A category with no countable rounds** of the game on the scorecard (for example the threshold crossed during a round of a different game). The card shows the thank-you line and no skill cards, and never crashes. Test: `skillScores(gameId, [])` returns `{}` (Task 2).
2. **No previous session.** The rings show no arrow and the scorecard uses the thank-you line. Test: `ringChange(72, null)` returns `null` (Task 3).
3. **Divide by zero.** Tiffin's Sequencing with no multi-dish orders, Decision-making with no choices, Spot Focus with no finds. Each gives no score, never NaN or 0. Tests in Task 2.
4. **Retention over 100** (the second trip recalls more than the first round): capped at 100. Test in Task 2.
5. **Rounds from Free Play, a completed category or a debug probe** never enter the log. Test: `countsForSession` (Task 1).

---

### Task 1: Round log

**Files:**
- Create: `src/lib/scoring/roundLog.ts`, `src/lib/scoring/__tests__/roundLog.test.ts`
- Modify: `src/lib/db.ts` (version 4, `RoundRecord`, `addRound`, `getRounds`)
- Modify: `src/components/GameShell.tsx` (log in `handleLevelComplete`)

**Interfaces:**
- `RoundRecord { id?: number; userId: string; date: string; category: GameCategory; gameId: string; at: number; metrics: Record<string, unknown> }`
- db.ts:
  - `addRound(r: RoundRecord): Promise<void>`
  - `getRounds(userId, date, category): Promise<RoundRecord[]>`
  - `getPreviousSessionRounds(userId, category, beforeDate): Promise<RoundRecord[]>`: every round on the latest date before `beforeDate` that has rounds in this category.
- roundLog.ts (pure): `countsForSession(args: { gameCategory: GameCategory; completed: string[]; debug: boolean }): boolean` is `!debug && creditsTime(gameCategory, completed)`.
- **GameShell:** before `finishLevel`, read the session snapshot. When `countsForSession` holds, fire and forget `addRound({ userId, date: session.date, category: gameCategory, gameId, at: Date.now(), metrics })`. This runs before the category completes, so the crossing round counts.

- [ ] **Steps.**
  - Failing test: `countsForSession` is true for the open category, false for a completed one, false once the day is done, and false for debug.
  - Implement it.
  - Add the v4 schema and the helpers.
  - Wire GameShell.
  - Run `npx tsc -b`.

### Task 2: Skill measures

**Files:**
- Create: `src/lib/scoring/measures.ts`, `src/lib/scoring/__tests__/measures.test.ts`
- Modify: `src/lib/gameSkills.ts` (`SCORED_SKILLS`, and `GAME_SKILLS` aligned to it)

**Interfaces:**
- `SCORED_SKILLS: Record<string, [SkillId, SkillId]>`, per the decisions table.
- `skillScores(gameId: string, rounds: { metrics: Record<string, unknown> }[]): Partial<Record<SkillId, number>>`, with each value a whole number 0-100 and keys present only when there is data.

**Formulas, pooled across the rounds** (sum of numerators over sum of denominators, unless stated):

| Game | Skill | Measure |
|---|---|---|
| market-memory | recall | Σcorrect / ΣlistLength x 100, over non-second-trip rounds |
| market-memory | retention | mean of `retention` over second-trip rounds, each capped at 100 |
| train-yard | association | ΣfirstTryCorrect / ΣtotalTrains x 100 |
| train-yard | sequences | no data yet (omitted) |
| spot-focus | selectiveAttention | ΣdifferencesFound / ΣtotalDifferences x 100 |
| spot-focus | responseTime | median of every round's find gaps (first from 0); mapped 2000 ms = 100 to 20000 ms = 0 |
| serve-guests | sequencing | ΣordersInOrder / ΣordersMultiDish x 100 |
| serve-guests | decisionMaking | ΣurgentChoices / ΣchoiceOpportunities x 100 |
| clear-the-way | planning | mean of min(1, minMoves / movesUsed) x 100 |
| clear-the-way | problemSolving | share of rounds with hintsUsed = 0 and resets = 0, x 100 |

- [ ] **Step 1: Failing tests**, one per row, with small hand-computed round lists. Include:
  - Empty input gives `{}`.
  - Zero denominators omit the skill.
  - Retention of 140 is capped at 100.
  - Gaps from `[1000, 3000, 4000]` give a median of 1000, which scores 100.
  - A median of 11000 ms scores 50.
  - `GAME_SKILLS['train-yard'].primary === 'sequences'` and `skillsFor('train-yard')` equals `SCORED_SKILLS['train-yard']`.
- [ ] **Steps 2-4: FAIL, implement, PASS.** Reuse `medianFindGapMs` from `SpotFocus/timing.ts`, extended to accept the gap lists of several rounds.

### Task 3: Bands, change and summary

**Files:**
- Create: `src/lib/scoring/summary.ts`, `src/lib/scoring/__tests__/summary.test.ts`
- Modify: `src/lib/scoreCard.ts` (replace the placeholder and its word table), `src/lib/__tests__/scoreCard.test.ts`

**Interfaces:**
- `skillBand(score: number): 1 | 2 | 3 | 4 | 5` (thresholds 40 / 60 / 75 / 90)
- `BAND_WORD_KEYS = ['score.band.1', ..., 'score.band.5']`. English: Fighting Spirit, Steady Growth, Good Potential, Rising Confidence, Pure Excellence.
- `headlineKey(average: number): string`. The 10 bands of 7.2: `summary.headline.0` (0-19), `.20` (20-29), ..., `.90` (90-99), `.100` (100).
- `ringChange(current: number, previous: number | null): { delta: number; dir: 'up' | 'down' | 'none' } | null`
- `categorySummary(category: GameCategory, today: RoundRecord[], previous: RoundRecord[]): { rings: { skill: SkillId; score: number; change: ReturnType<typeof ringChange> }[]; average: number | null; headlineKey: string | null }`
  - Games appear in first-played order and skills in `SCORED_SKILLS` order (D14).
  - A skill's previous value comes from the same game's rounds in `previous`.
- `scoreCardData(gameId: string, today: RoundRecord[], previous: RoundRecord[]): { cards: { skill: SkillId; score: number; band: number }[]; improved: boolean }`
  - `improved` is true when the first card's score rose by 3 or more.

- [ ] **Step 1: Failing tests:**
  - Band edges: 39 gives 1, 40 gives 2, 89 gives 4, 90 gives 5.
  - Headline edges: 19 gives `.0`, 20 gives `.20`, 99 gives `.90`, 100 gives `.100`.
  - `ringChange(72, 66)` is `{ delta: 6, dir: 'up' }`; `(58, 62)` is down; `(58, 58)` is none; `(72, null)` is null.
  - A summary with Shopping List and Train Yard rounds lists recall, retention (when present) and association in order, averaged.
  - An empty summary has no rings and a null headline.
  - `scoreCardData` gives `improved` for 70 against 66, and no `improved` for 68 against 66.
- [ ] **Steps 2-4: FAIL, implement, PASS.** Retire the old scoreCard tests that covered the framework word table and the placeholder.

### Task 4: Scorecard screen (Mock 2)

**Files:** Modify `src/screens/ScoreCard.tsx`, `src/screens/dev/ChromeGallery.tsx` and the locales.

- [ ] **Layout.**
  - **Above the cards:** the tile art and the category label.
  - **One card per scored skill:**
    - The skill name, from `SKILLS[skill].nameKey`.
    - The band word, right-aligned in the skill's colour.
    - A 5-segment bar filled to the band, coloured per the decisions table.
  - **Below the cards:**
    - The message: the thank-you line, or "You have improved steadily." plus "Keep playing to build on it."
    - The unlock banner (plan 1).
    - Continue, which goes to `/app/category-summary/:category`.
- [ ] **Loading.** Read `getRounds(today, category)` and `getPreviousSessionRounds`, filter to this game, and call `scoreCardData`. Render the frame at once and fill the cards when the read lands, so the card never blanks.
- [ ] **Gallery:** Mock 2's two states, using sample rounds.

### Task 5: 10-minute summary screen (Mock 3)

**Files:**
- Create: `src/screens/CategorySummary.tsx`, `src/components/chrome/SkillRing.tsx`
- Modify: `src/App.tsx` (the `/app/category-summary/:category` route; `/app/summary` redirects to Home), `src/lib/sessionLedger.ts` (`afterScoreCard` returns the summary route for the completed category), `src/screens/ScoreCard.tsx`
- Delete: `src/screens/SessionSummary.tsx`
- Modify: the locales

**Interfaces:**
- `afterScoreCard(completed: string[]): string` returns `/app/category-summary/${completed[completed.length - 1]}`, and `/app/home` when nothing is complete. Update the sessionLedger tests.
- `SkillRing({ label: string; score: number; colour: string; change: { delta: number; dir: 'up' | 'down' | 'none' } | null })`:
  - The ring's arc fills to `score`.
  - The centre shows "72" over "of 100".
  - Below the ring: an arrow and "+6 since last session". Green for up, red for down (D13).

- [ ] **Layout.**
  - Title: `summary.your.<category>` ("YOUR MEMORY" / "YOUR FOCUS" / "YOUR PLANNING"), with the subtitle "Performance today".
  - A 2-column grid of rings.
  - The headline word.
  - Continue, which goes to Home.
- [ ] **Day-end analytics.** When the day is complete, fire `session_ended` here, once, as SessionSummary did (with the real `categoriesCompleted` count).
- [ ] **Run** `npx tsc -b` and the sessionLedger tests (`afterScoreCard` updated).

### Task 6: Copy, docs, version, gates, commit

- [ ] **Locale keys** (en, hi, kn):
  - `score.band.1-5`
  - `summary.headline.*` (the 10 words of 7.2)
  - `summary.your.memory|attention|executive`
  - `summary.performanceToday`
  - `summary.ofHundred`
  - `summary.sinceLast` (`{{delta}} since last session`)
  - `scoreCard.improved` ("You have improved steadily.")
  - `scoreCard.keepGoing` ("Keep playing to build on it.")
- [ ] **Docs:**
  - CLAUDE.md: the scoring section.
  - FINAL_SPEC: C3, C4, C5, C6 and C16 resolved, as recorded in this plan.
  - README status.
  - `package.json` to `1.39.0`.
- [ ] **Gates:**
  - `npm test`: everything passes except the 2 known tests.
  - `npm run build`.
  - `npm run lint`: at most 28 errors.
- [ ] **Commit:** `feat(v2): skill scores, the per-game scorecard and the 10-minute summary`.
- [ ] **Smoke test** (the user runs it):
  1. Play a Memory session to the threshold (30 s timer). The scorecard shows Recall (and Retention when a second trip ran) with band words and bars, and no numbers.
  2. Continue: the summary shows rings with "of 100", no arrows the first day, and a headline word.
  3. Continue: Home with the next category unlocking.
  4. Use `dev: reset today` to replay. Change the device date to tomorrow, or wait for the UTC day, and play again: arrows appear.
  5. The game intro's skill list matches the scorecard.
