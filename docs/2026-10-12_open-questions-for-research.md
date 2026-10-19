# Open Questions for the Research Team

**Date**: 2026-10-12
**Content Type**: Research questions

This merges the open questions from four analysis docs into one list, with duplicates removed:

- `docs/scoring-implementation-analysis.md` (2026-09-30), cited below as **[Scoring]**
- `docs/2026-10-08_game-grading-review.md`, cited as **[Grading]**
- `docs/2026-10-08_skill-coverage-by-game.md`, cited as **[Skills]**
- `docs/2026-10-12_free-choice-vs-prescription.md`, cited as **[Choice]**

The sections run from the broadest decisions to the narrowest, because the later answers depend on the earlier ones.
Section A blocks almost everything else.

## A. Study design and the prescription

1. **What does the study claim: a dose per cognitive domain, or engagement with training in general?**
   This decides how much residents can choose, what counts as treatment, and how strict the rest of the answers need to be.
   [Choice]
2. **How much can residents choose and still count as "prescribed"?**
   The options run from the current fixed trio, through picking a game within each category or choosing the order, to full free choice.
   Should choice vs a fixed plan be its own randomised study arm?
   [Choice]
3. **What is the dose?**
   Real time on task varies by game and by player speed.
   Is the dose minutes per domain, rounds, or something else?
   [Grading]
4. **Which rounds count toward the dose and the outcomes?**
   Free Play rounds, and any rounds reached by resident choice, currently feed difficulty exactly like prescribed rounds.
   Should they count toward the dose, the measured outcomes, or neither?
   [Grading, Choice]
5. **What counts as a "session" for scoring?**
   A game visit is several short rounds, the score card shows once per visit, and a day has three games.
   "Compared with last time" and `session_no` could mean the last round, the last visit or the last day.
   [Scoring]

## B. Skills each game claims

6. **Should the skill labels follow the mechanics, or should the mechanics change to fit the labels?**
   Market Memory is a recognition task labelled Recall.
   Train Yard is a paired-association task labelled Sequences, and order never matters in it.
   [Skills, Scoring]
7. **For claimed skills that no mechanic trains, should we build a mechanic or drop the skill from that game?**
   These are Retention and Association (Market Memory), Patterns (Train Yard), Sequencing (Serve the Guests) and Cognitive Flexibility (Clear the Way).
   [Skills]
8. **Should skills the games already train, but don't claim, be added?**
   Train Yard trains Association.
   Garden Keeper trains Response Time and Sustained Attention, and that data is nearly free.
   [Skills]
9. **Which is the ninth game?**
   The spec maps eight games, including Luggage Sorting, which doesn't exist, and Word Search, which is Free Play only.
   The rotation has six games.
   [Scoring]

## C. Scoring formulas

10. **What are the formulas the spec leaves undefined?**
    The spec itself names Task Switching and Cognitive Flexibility.
    Association, Patterns, and Decision-Making and Sequencing in Serve the Guests also have no formula.
    Retention needs a delay that no game has.
    [Scoring, Skills]
11. **How should Planning be measured in a real-time game?**
    The spec's "optimal ÷ actual actions" needs an optimal count, and Serve the Guests has none.
    [Skills, Scoring]
12. **How should games that always end successfully be scored: by time, by hint use, or by adding a limit?**
    Spot Focus and Clear the Way always read 100% on their main skill.
    [Skills, Grading]
13. **Does the 1.0-3.0 s response-time range apply to every game, and is the median the agreed measure?**
    No game logs per-response times yet, and Garden Keeper logs a mean.
    [Scoring, Grading]
14. **How should hinted rounds be treated?**
    A hint that shows the answer mid-recall makes that round invalid as a recall measure.
    Exclude these rounds, flag them, or penalise hints?
    [Grading, Skills]
15. **Should scores from different games be combined into a domain score, and on what common basis?**
    Each game's formula is ad hoc today, so averaging them would not mean anything.
    [Grading]

## D. Dynamic difficulty

16. **How should scores account for dynamic difficulty?**
    Adaptive difficulty pushes everyone toward a similar success rate, so raw accuracy stays flat while players improve.
    Store difficulty alongside scores, adjust scores for it, or both?
    This is the biggest methodological question.
    [Scoring]
17. **Should difficulty rules be shared across games or set per game?**
    Penalties differ by game with no research basis: a hint costs 0.05 in Market Memory and 0.15 in Clear the Way.
    "Level 5" means something different in each game.
    [Grading]
18. **Should every game be able to fail a round?**
    Four of the six games always count a round as completed, so their difficulty can only rise during a day, even for a struggling resident.
    [Grading]
19. **How fast should levels decay over missed days, and may a resident see their level drop?**
    The current 0.8 warm-up visibly lowers "Last time: level n", which conflicts with the score card's rule of never framing a result as a drop.
    [Grading]
20. **Should the difficulty rules be versioned as part of the treatment?**
    Today any retune silently changes the dose mid-study, and events don't record which version a resident got.
    [Grading]

## E. What residents see

21. **Should Serve the Guests keep its on-screen points?**
    It is the only game that shows a number score, the points reward speed that grading ignores, and they may conflict with the score card's words-not-numbers rule.
    [Grading]

## F. Data and ethics

22. **Where does research data live?**
    Today it goes only to Amplitude, and difficulty history is device-only and lost on a "Clear & reset".
    Is Firestore with real researcher logins acceptable, and is a data-handling agreement needed?
    [Scoring, Grading]
23. **How and where is consent captured?**
    There is no consent step anywhere in the app.
    [Grading]

## Not questions: fixes we can make now

These came up in the same docs but need no research input:

- Fix difficulty carry-over so it uses the last day the game was played, not only yesterday (`src/lib/db.ts:197`).
  The decay rate itself is question 19.
- Send each event's original time, not the time it was flushed, and use local dates for the day boundary (`src/lib/analytics.ts:47`).
- Tag every round as `prescribed`, `chosen` or `free-play`.
- Keep debug rounds out of the resident's identity.
