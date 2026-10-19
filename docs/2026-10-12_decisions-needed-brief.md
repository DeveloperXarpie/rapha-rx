# Rapha Rx: Decisions Needed from Research

**Date**: 2026-10-12
**Content Type**: Briefing

## How the app works today

- Each day a resident plays three games: one each for **memory**, **attention** and **executive function**.
  The app picks the games, about two minutes each.
- After that, they can play any game freely.
- Difficulty adjusts itself: it rises when a resident does well and drops when they fail.
- Each round's results are recorded, but no skill scores are calculated or stored yet.

| Game | Domain | What the resident does |
|---|---|---|
| Market Memory | Memory | Studies a shopping list, then picks the items from a shelf |
| Train Yard | Memory | Learns which colour train goes to which station, then sends them |
| Spot Focus | Attention | Finds the differences between two pictures |
| Garden Keeper | Attention | Waters thirsty flowers quickly, ignoring wilted ones and pests |
| Serve the Guests | Executive | Cooks and serves dishes to waiting guests |
| Clear the Way | Executive | Slides blocks to free a fish |

## What we found

- **Several skill labels don't match the games.**
  Market Memory is labelled "Recall", but picking from a shelf tests recognition.
  Train Yard is labelled "Sequences", but the order never matters.
  Five other skills a game claims to train aren't actually trained by anything in that game.
- **Only 3 of the 17 skills the games claim can be scored today.**
  Two games can't be failed, so their main score is always 100%.
- **Adjusting difficulty hides improvement.**
  The app keeps each resident at a similar success rate, so raw scores stay flat even as they get better.
- **Each game grades by its own rules.**
  Scores and levels can't be compared or combined across games.
- **The dose isn't defined.**
  Time played varies, and free play currently counts the same as prescribed play.

## Decisions needed

### 1. The study (decide these first)

1. **Is the claim about a set dose per domain, or about engagement in general?**
2. **Can residents choose their games?**
   Options: a fixed plan (today), choosing between two games in each domain, choosing the order, or any game.
   More choice helps engagement but weakens control over the dose.
   Should this be tested as a study arm?
3. **What is the dose:** minutes per domain, number of rounds, or something else?
4. **Does free play count** toward the dose and the results?
5. **What is a "session"** when comparing with last time: one round, one game visit, or one day?

### 2. Skills

6. **Should the labels change to match the games, or the games change to match the labels?**
7. **For claimed skills no game trains**, should we add a game feature or drop the claim?
8. **Should we add skills the games already train** but don't claim (for example, reaction speed in Garden Keeper)?
9. **The spec lists 8 games, and one of them doesn't exist.** We have 6. Which games are in scope?

### 3. Scoring

10. **We need formulas for these skills:** Task Switching, Cognitive Flexibility, Association, Patterns, Decision-Making, Sequencing, and delayed Retention.
11. **How do we score games that always end in success:** by time, by hints used, or by adding a limit?
12. **Does the 1-3 second reaction-time standard apply to every game?**
13. **Do rounds where the resident used a hint count?**
14. **Should scores combine into one score per domain?** If so, the games need a common scoring basis.

### 4. Difficulty

15. **How should scores account for automatic difficulty?** This is the biggest methodological question.
16. **Should all games use the same difficulty rules,** including being able to fail a round?
17. **How much should progress fade after missed days**, and should residents ever see their level go down?
18. **Should changes to the difficulty rules be versioned** as a change to the treatment?

### 5. Data and ethics

19. **Where should research data be stored?** Today it goes only to an analytics service and the tablet.
20. **How is consent collected?** The app has no consent step yet.

## Already in hand (no decision needed)

- Fixing a bug that resets residents' progress on most days.
- Fixing incorrect timestamps on results recorded while offline.
- Recording whether each round was prescribed or free play.
