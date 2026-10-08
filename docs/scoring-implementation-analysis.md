# Game Performance Scoring - Implementation Analysis

**Date**: 2026-09-30
**Content Type**: Analysis

Source specs, both in `docs/scoring and end/`:
- "Game performance measurement - 01 2.docx" - the Rapha Cognitive Performance Measurement Framework v1.0.
- "Game Performance Measurement Format.docx" - the developer spec (SJ, 2026-09-28).

Summary: the display side is built.
The measurement side is not.
About half the spec's skill scores cannot be computed from what the six rotation games record today.
Four decisions have to come from the research team before a full implementation.

## What we have

| Piece | State |
|---|---|
| The 18-skill list, each game's primary and secondary skills | Done, `src/lib/gameSkills.ts` |
| Pre-game card ("This game improves your...", skill lines) | Done, `src/screens/GameIntro.tsx`, follows the mock |
| After-game card, score-to-word table, ±3-point comparison line | Done, `src/lib/scoreCard.ts`, unit-tested |
| The hook where scoring plugs in | `getScoreCard()` exists but always returns empty, so the card shows only the lines that need no score |
| Per-round telemetry | Every game sends a `metrics` object to `GameShell`. It goes to Amplitude and feeds dynamic difficulty. It is never stored as a score record. |
| A pseudonymous participant ID | `userId` is a UUID |

## What we don't have

- **Storage for results.** No Dexie table holds "participant, game, skill, score, session", so the spec's list of fields to log has nowhere to go.
- **A researcher view.** Nothing exists, and auth is anonymous-only, so there is no login for it to sit behind.
- **The welcome line** on the pre-game card ("Welcome back! Last time you did great"). Not built yet.
- **Telemetry for most skills.** Per game, against the spec's skills:

| Game | Can score today | Can't score yet |
|---|---|---|
| Market Memory (Shopping List) | Recall (correct ÷ list length); arguably Recognition (wrong twin picks) | Retention: no game has a delayed recall. Association: no marker defined. |
| Train Yard (Station Master) | First-try accuracy | Sequences (the spec's primary): the game tests which station each train goes to, not order. Patterns: undefined. |
| Spot Focus | Found ÷ total, false taps | Response Time: no timestamps per tap. The game also always ends with everything found, so the score is nearly always 100. |
| Garden Keeper | Selective Attention (watered ÷ targets), Accuracy, distractor errors | Only a mean reaction time is recorded; the spec says median. That's a small change. |
| Serve the Guests (Tiffen Time) | Items served ÷ requested | Planning needs an "optimal actions" count, and a real-time game doesn't have one. Decision-Making and Sequencing have no telemetry. |
| Clear the Way (Free Me - Fish Box) | Planning (`minMoves ÷ movesUsed`), which fits the spec exactly | Problem-Solving: the puzzle can't be failed, so "% solved" is always 100. Cognitive Flexibility has no formula. |

## Blockers (questions for the research team)

1. **What counts as a "session"?**
   A game visit is several short rounds, the score card appears once per game at rotation, and a day has three games.
   "Compared with last time" and `session_no` could mean the last round, the last visit or the last day.
   Everything downstream depends on this.
2. **Dynamic difficulty skews every score.**
   Dynamic difficulty is designed to push each player toward the same success rate.
   So raw accuracy stays roughly flat while the player gets better, and the week-over-week change score the framework is built for would show little change.
   Scores need the difficulty stored alongside them at minimum, and probably adjusted for it.
   The spec does not mention this; it is the biggest methodological problem.
3. **Undefined formulas.**
   Named in the spec itself: Task Switching, Cognitive Flexibility, whether the 1.0-3.0 s response-time range applies to all games.
   Also undefined: Association, Patterns, and Decision-Making and Sequencing in Serve the Guests.
   Retention also needs a delay that no game has.
4. **Where research data lives.**
   Today metrics reach Amplitude only as analytics events.
   A PhD study usually needs a controlled store, consent and a data-handling agreement.
   Whether Firestore with real researcher auth is acceptable is an ethics and infrastructure decision.

## Mismatches between the spec and the app

- It maps 8 games, including Luggage Sorting and Word Search, but the rotation has 6.
  Word Search is free-play only, and Luggage Sorting doesn't exist.
  The spec asks the same question itself: which is the ninth game?
- It calls Train Yard a Sequences game, but its mechanic tests recall.
- Its after-game buttons are "Play again · Home"; the app deliberately uses Continue only (a decision made on 2026-09-29).

## Pros and cons of building it now

**Pros**
- The card and word logic are finished, so real scores would show up right away.
- Logging raw telemetry now starts the baseline clock early, and the spec's `formula_version` field means scores can be recomputed later.
- Several skills can be scored today with no new game work: Market Memory Recall, Garden Keeper Selective Attention and Accuracy, Clear the Way Planning.

**Cons and risks**
- Scores computed before blockers 1 and 2 are settled may not be comparable with later ones.
  That matters because longitudinal change is the whole point.
- Primary skills that are always 100 (Spot Focus, Clear the Way's Problem-Solving) make the main word always "Excellent!".
  Harmless for residents, useless as data.
- "Best skill" needs at least two scored skills per game, and most games would have one.
- Adding telemetry to Spot Focus, Train Yard and Serve the Guests touches six games' internals.
  That's real regression surface, and each needs a smoke test.

## Recommendation

- **Phase 1 (unblocked):** a new Dexie table for per-round records, holding raw metrics, difficulty, formula version and a completed/incomplete flag.
  Compute only the skills that are well-defined today, and let the card fall back to its no-score lines for the rest.
- **Phase 2:** wait for the research team's answers on the four blockers, then add the missing telemetry per game and the researcher view.
