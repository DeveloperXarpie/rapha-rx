# Redesign v2: Overview and Where We Are

**Date**: 2026-11-18
**Branch**: `feat/app-flow-redesign` (v1.35.7)
**Purpose**: a single entry point for picking up the v2 redesign on any machine.
It explains what v2 is, maps the documents, and lists what is decided, what is open and what is next.

The detail lives in the linked docs.
This file only summarises them; if the two ever disagree, the linked doc wins.

---

## 1. What redesign v2 is

Redesign v2 changes how a resident's daily session works, how play is scored, and how each game gets harder.
It builds on the September app-flow redesign (`docs/superpowers/specs/2026-09-02-app-flow-redesign-design.md`), which is what the app runs today.

The base input is the product owner's draft, `docs/App Flow changes finale.pdf`, with three mocks: Home (Mock 1), the per-game scorecard (Mock 2) and the 10-minute summary (Mock 3).

The six games in scope, two per category:

| Category | Games (player name, code id) |
|---|---|
| Memory | Shopping List (`market-memory`), Station Master (`train-yard`) |
| Attention | Spot Focus (`spot-focus`), Baggage Sort (new, not yet designed) |
| Planning | Tiffin Time (`serve-guests`), Free Me (`clear-the-way`) |

Garden Keeper (`garden-keeper`) left the core six on 2026-11-18 and gets no changes; Baggage Sort replaces it (`DIFFICULTY_RULES.md` section 3.4).

### The core changes

1. **Unlocking by minutes played.**
   Each day starts with only Memory unlocked.
   After 10 minutes of play in a category, across any of its games, the next one unlocks: Memory, then Attention, then Planning.
   A full day is 30 minutes.
   Unlocks reset every day.
2. **Free choice within a category.**
   The resident picks any game in an unlocked category, instead of the app choosing one.
3. **Scoring.**
   Twelve skills, two per game, each with one measure the app computes itself.
   There is a scorecard after a game and a summary after each 10-minute category session, with numeric scores and up or down arrows.
4. **Curated difficulty ladders.**
   The continuous 0-1 difficulty score is replaced by a numbered level ladder per game.
   It is defined in a spreadsheet, with hard and soft guardrails and per-game curation rules.
5. **Copy.**
   "Prescription" is removed from the app.
   "Prescriptive games" becomes "scientifically designed".
6. **Free Play stays.**
   It is unrestricted and ignores scoring.

The work splits into six streams: A session engine, B Home and popups, C scoring, D difficulty and levels, E research data, F copy (`FINAL_SPEC.md` section 3).

## 2. Document map

All paths are relative to the repo root.

### Redesign v2 (this folder)

| File | What it is | Status |
|---|---|---|
| `docs/redesign-v2/FINAL_SPEC.md` | The spec. Holds only confirmed decisions (D1-D24), each tagged with its source. Conflicts and open questions are in section 13. | Draft, partly _TBD_ |
| `docs/redesign-v2/DIFFICULTY_RULES.md` | How the level ladders work: shared rules S1-S9, shared decisions X1-X6, per-game parameters, curation rules, clear and fail rules, measurement gaps. | Draft; owner answers of 2026-11-18 folded in, decision log in section 6 |
| `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx` | The level sheet, one tab per game. Yellow cells are input. The owner fills the anchor levels, and Claude fills the levels in between. | Waiting on anchor levels |
| `docs/redesign-v2/research/2026-11-11_difficulty-studies.md` | Six code studies, one per game, with file and line references. The engineering detail behind the rules doc. | Reference |
| `docs/redesign-v2/research/2026-11-12_difficulty-design-notes.md` | A game-designer rewrite of the studies: what the player feels at each step. Written for presenting in a meeting. | Reference |

### Supporting material elsewhere

| File | What it is |
|---|---|
| `docs/App Flow changes finale.pdf` | The owner's base draft with the three mocks. |
| `docs/game-screens/index.html` | One card per difficulty dial from the design notes, with screenshots at levels forced via `?debugLevel=1-10`. Dashed cards mark dials not built yet. Open it in a browser. |
| `scripts/screenshot-games.mjs` | Regenerates `docs/game-screens/`. `ONLY=slug,...` re-shoots single shots. There is no npm script for it yet. |
| `docs/2026-10-08_skill-coverage-by-game.md` | Which skills each game really trains. Background for C10 and C11. |
| `docs/2026-10-12_open-questions-for-research.md` | Research questions. v2 answers A2, A3, A4, B6 and B7 (not yet marked there). |
| `docs/2026-10-12_decisions-needed-brief.md` | The October decision brief. |
| `docs/2026-10-16_level-capacity-by-game.md` | Earlier level-capacity analysis. The difficulty studies corrected it in places. |
| `docs/scoring-implementation-analysis.md`, `docs/2026-10-08_game-grading-review.md` | Earlier scoring analysis. |

## 3. How the spec is being written

These are working rules agreed in earlier sessions:

- The spec holds **only confirmed decisions**, each tagged **[Chat]** or **[Draft]**.
  Everything else is _TBD_.
- Contradictions between inputs (for example, text rules vs mocks) go in a conflicts table instead of being resolved silently.
- "Ignore this" means **defer**: the item moves to the Deferred table, not out of the doc.
- Flawed logic in a draft gets a reasoned replacement proposal, not silent acceptance.
- Numbers in the difficulty docs are playtest starting points.
  None has been tested with residents.

## 4. Where things stand

### Decided (FINAL_SPEC section 2)

D1-D14 cover: 10-minute category sessions (tunable), daily reset, no credit for play in a completed category, finishing the level before unlocking, Free Play kept, fixed unlock order, pre-Home screens unchanged, two skills per game, median response speed, messages in Kannada, Hindi and English under 10 words, "prescription" removed, numeric scores and red down arrows in the summary, and the summary showing only the skills of games played (2 or 4 rings).

D15-D23 (owner, 2026-11-18) cover: Garden Keeper replaced by Baggage Sort, no new Retention, Sequence or Sequencing mechanics, Tiffin guest types, the "Tiffin" spelling, Replay on a failed round, phone and tablet, the Spot Focus "I can't find it" button and response speed, and no Tiffin points. D24 keeps every skill and measure as drafted and adds small game changes to capture the ones the games cannot produce today (FINAL_SPEC 7.1a): Shopping List second trip, Station Master staggered arrival, Tiffin Time numbered dishes.

### Open: scoring (stream C)

The draft's 10-band summary scoring (0-19 ... 100) was agreed to be flawed.
A replacement was proposed on 2026-11-11 but is **not approved and not in the spec**:

1. Normalise each measure to 0-1 (response speed: 1.0 s = 1, 3.0 s = 0; ratios capped at 1).
2. Skill score = 100 x clamp(d + k x (m - target), 0, 1), where d is difficulty (0-1), k is about 0.4 and target is the success rate difficulty settles at. Rounds are weighted by duration.
3. Category score = minutes-weighted mean over the games played.
4. Arrows compare each skill with its last score, with a 3-point dead zone.
   The headline word is a personal trend (first time / up / steady / down) instead of the bands.

Two decisions are needed: a personal-trend headline vs absolute bands, and whether the per-game 1-5 bar uses the same skill score.
With a ladder, d would become level / max level (X6).

### Open: difficulty (stream D)

- The anchor levels in `DIFFICULTY_LADDERS.xlsx`.
- Shared decisions X1-X6: ladder movement, what happens overnight, phone vs tablet, hints, lives, how the ladder feeds scoring.
- Per-game open questions in `DIFFICULTY_RULES.md` section 3.
- Two Free Me measurement gaps, explained but not decided: leaving mid-puzzle is not logged, and the move count runs through a restart.

### Open: spec (FINAL_SPEC section 13)

C5-C8, C14-C16, C18, C20, Q3, Q4. (Q2 answered: only board time counts.)
C17 (games left with one skill) was resolved by D24: skills unchanged, captured by small game changes.
Deferred by the owner: C3, C4.

## 5. Problems noticed, not yet fixed or ticketed

From the game-screens screenshots:

- Garden Keeper: the "Level N" pill covers the watering progress label in the top bar. (Low priority now that the game has left the core six.)
- Free Me: Reset and Hint buttons render as faint blank shapes. Whether they are disabled or still fading in has not been checked.
- Spot Focus: "Find differences here" runs off the right edge at 360 px.
- Code smell: `screenshot-games.mjs` duplicates the seed and console-noise filter from `screenshot-flow.mjs`.

Fixes the October docs unblocked, none done yet:

- **Difficulty carry-over** (recommended first, affects residents now): `getYesterdayDifficultyState` in `src/lib/db.ts` only looks at yesterday, so a skipped day resets progress.
- Offline analytics events carry the flush time instead of the event time (`src/lib/analytics.ts`).
- Tag rounds by source. "prescribed" needs renaming per D11.
- Keep debug rounds out of the resident's identity.

## 6. Repo and branch notes (discussion of 2026-11-18)

- All work since August lives on `feat/app-flow-redesign`.
  `main` is 74 commits behind it (last updated 2026-08-25, v1.13.0) and has nothing the branch lacks.
- **On a new machine**, `git clone` opens `main`, which is the old August code.
  Run `git checkout feat/app-flow-redesign` right after cloning.
- Main being stale is not urgent, but it carries three risks:
  1. A fresh clone lands on old code (above).
  2. If Vercel's production branch is `main` (Vercel's default, not yet verified), a push or merge to `main` would auto-deploy August code to residents.
  3. The only copy of the recent history is a feature branch, so deleting it would be costly.
- Proposed housekeeping, not yet approved:
  - Merge `feat/app-flow-redesign` into `main` before v2 coding starts, then cut `feat/redesign-v2` (the branch FINAL_SPEC names).
  - Move the xlsx build script into the repo.
    It was kept in `%TEMP%\claude-ladders\build.py` and may be gone; the workbook can be rebuilt from the rules doc.
  - Mark the research questions v2 answers in `docs/2026-10-12_open-questions-for-research.md`.
  - Add an npm script for `screenshot-games.mjs`.

## 6a. Implementation status

- **Plan 1, session engine and Home (Streams A and B)**: implemented in v1.36.0 on `feat/app-flow-redesign`; awaiting the owner's smoke test.
  Plan: `docs/superpowers/plans/2026-11-18-redesign-v2-session-engine-home.md` (also lists the later plans and what each waits on).

## 7. Suggested next steps

1. Decide on the merge to `main` and the v2 branch.
2. Fill the anchor levels and answer X1-X6, so the ladders can be completed.
3. Make the two scoring decisions, so section 7 of the spec can be written.
4. Meanwhile, the difficulty carry-over fix is independent and helps residents now.
