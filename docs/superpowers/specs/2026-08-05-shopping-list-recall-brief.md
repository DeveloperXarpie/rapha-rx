# Shopping List Recall - game design brief

Status: brief for redesign. Describes the game as it exists today (v1.4.0),
the contracts a redesign must keep, and the problems worth solving.

Audience: designer working on a visual + logic redesign and building prototypes.

## 1. Product context

The app is a daily brain-training session for residents of care homes, played on a
shared tablet, usually with a carer nearby. Players are older adults, many with mild
cognitive impairment. A session is three games drawn from three categories
(memory, attention, executive), roughly two minutes per category.

Shopping List Recall is a **memory** game. It is one of five in that category
(`remember-match`, `shopping-list-recall`, `sequence-repeat`, `picture-postcard`,
`train-yard`).

Design constraints that come from the audience, not from this game:

- Minimum touch target 80px. Tap only. No drag as the sole input, no long-press, no
  double-tap, no timed gestures.
- Copy in English, Hindi and Kannada. Hindi and Kannada render in Noto Sans and run
  visually longer than English; layouts must not assume English string widths.
- Large type. The scale is `text-h1` … `text-body`, `text-caption`, `text-small`,
  defined in `src/styles/tokens.ts`.
- No failure states that read as failure. The game never blocks progress; the worst
  outcome is a lower score and a gentler next round.
- The item vocabulary is deliberately South Indian household groceries. The pool is
  meant to be familiar and nameable to the residents.

## 2. Files to share

Share these, in this order. The first group is the game; everything after it is
context the redesign has to fit into.

### Core - the game itself

| File | Why |
|---|---|
| `src/games/memory/ShoppingListRecall/index.tsx` | The whole game. ~400 lines, all five phases, the item pool, the layout, the scoring. This is the single most important file. |
| `src/games/memory/ShoppingListRecall/levels.config.ts` | Static level definitions. **Dead code** - nothing imports it. Share it anyway: it records the original hand-authored difficulty intent before dynamic difficulty replaced it. |
| `src/games/memory/ShoppingListRecall.ts` | One-line re-export barrel. Share only for completeness. |

### Integration - the contracts the redesign must satisfy

| File | What to point at |
|---|---|
| `src/components/GameShell.tsx` | The wrapper every game renders inside: header, exit confirmation, difficulty adjustment, analytics, rotation. Two things matter: the `GameShellProps` / `LevelResult` contract at the top, and `computePerformanceRatio`, specifically the `shopping-list-recall` branch (~line 242) that turns metrics into a 0-1 performance number. |
| `src/lib/dynamicDifficulty.ts` | `getShoppingListParams(score)` (~line 184) - how a 0-1 difficulty score becomes the five gameplay parameters. Also `adjustDifficulty` for how the score moves between rounds. |
| `src/screens/GameRouter.tsx` | The game registry and the `shopping-list-recall` branch (~line 113) that builds `levelConfig` per round. Shows that this game generates its own content in-component rather than using `src/lib/contentGenerators/`. |
| `src/games/types.ts` | `LevelConfig` and `LevelResult`. Twelve lines. |

### Shared UI and assets

| File | Why |
|---|---|
| `src/components/AssetPanel.tsx` | The tile that renders every grocery item - icon well plus label. Any visual redesign of an item card starts here, and it is shared with `focus-filter`. |
| `src/lib/assets/catalog.ts` | The asset registry. Items register as emoji tokens today; `AssetDefinition` already supports `imageSrc`, which is the path to real artwork. |
| `src/styles/tokens.ts` | Colour names, typography scale, touch target minimum. |
| `public/placeholders/games/shopping-list-recall.svg` | The tile art on the home screen. |

### Reference - how a recent redesign was specified here

| File | Why |
|---|---|
| `docs/superpowers/specs/2026-08-04-train-yard-design.md` | The Train Yard design spec. The most recent game built in this codebase and the closest thing to a house style for a game design document: art direction, phase timings, difficulty table, metric definitions, reduced-motion handling. Useful as a target format for the Shopping List redesign spec. |
| `src/games/memory/TrainYard/` | The most recently built game. Worth sharing `sprites.ts` and `styles.tsx` specifically - they show the pattern for real raster art plus a preload gate (`src/lib/useImagesReady.ts`), which is where Shopping List should go if it moves off emoji. |

### Do not bother sharing

`public/locales/*/common.json` - there is nothing in them for this game. See §5.

## 3. Current behaviour

### Phase machine

```
study ──► gap (optional) ──► recall ──► bonus_sort (optional) ──► completion
              2s fixed                        │                        │
                                              └────────────────────────┴──► onLevelComplete
```

**study** - Shows `itemCount` grocery items in a 2-column grid, each an emoji plus an
English label. A progress bar drains over `studyDurationMs`. An "I'm Ready!" button
skips ahead. When the bar empties, it advances automatically.

**gap** - A 2-second interstitial: a brain emoji and "Now recall the list!". Only shown
when `distractorGapEnabled`. It is a pause, not a distractor task, despite the name.

**recall** - Shows `recallFieldSize` items in a 2-column grid: all the study items plus
distractors drawn from the rest of the pool, shuffled. The player taps to toggle any
number of them, then presses "Check My Memory". Selections are then locked and colour
coded: green + ✓ for a correct hit, amber + ✗ for a false positive, greyed + ○ for a
missed target. A score card shows `hits / itemCount` plus the false positive count.

**bonus_sort** - Only when `bonusSortEnabled`. Re-shows the study items and asks
"Which of these items are vegetables?". Same tap-toggle-check-reveal pattern. All-or-nothing:
a perfect set earns a "Perfect!" line, anything else earns nothing.

**completion** - A closing card with the same `hits / itemCount` figure again and one of
three messages keyed off 100% / ≥70% / below.

Note: the bonus round path calls `completeLevel` from the bonus screen, so **players who
reach the bonus round never see the completion screen**. The two paths end differently.

### Item pool

Twenty fixed items in `RAW_GROCERY_POOL`, tagged with one of five categories:

| Category | Items |
|---|---|
| vegetables | tomato, onion, potato, brinjal, carrot, cucumber |
| fresh | coconut, banana, lemon, mango |
| dry | rice, dal, coconut oil, salt |
| dairy | milk, butter |
| spices | ginger, coriander, tamarind, mustard seeds |

Every item is an emoji token registered into the asset catalog at module load. The
`category` field is used for exactly one thing: the bonus sort round.

### Difficulty parameters

Driven by a single 0-1 `score`, linearly interpolated:

| Param | score 0.0 | score 1.0 | Effect |
|---|---|---|---|
| `itemCount` | 4 | 8 | Items to memorise |
| `studyDurationMs` | 35000 | 15000 | Study time |
| `distractorGapEnabled` | false | true | Flips on at score ≥ 0.35 |
| `recallFieldSize` | 10 | 18 | Total tiles in the recall grid |
| `bonusSortEnabled` | false | true | Flips on at score ≥ 0.70 |

The score seeds each day from yesterday's peak × 0.8, moves +0.05 × performance on a
good round and −0.08 on a bad one.

### Metrics and scoring

The game reports:

```
itemsRecalled       hits against the study set
totalItems          itemCount
falsePositives      selections that were not in the study set
bonusSortCompleted  boolean, true only on a perfect bonus sort
```

`computePerformanceRatio` turns these into:

```
recallRatio    = itemsRecalled / totalItems
precisionRatio = max(0, 1 - falsePositives / totalItems)
performance    = (recallRatio + precisionRatio) / 2
```

`bonusSortCompleted` is reported but **not used** in the ratio.

## 4. What the redesign should preserve

These are hard contracts. Break them and the game stops working inside the app.

1. **Props in:** `{ levelConfig, onLevelComplete }`. `levelConfig.params` carries whatever
   `getShoppingListParams` returns.
2. **Call `onLevelComplete` exactly once**, with `completed`, `durationSeconds` and a
   `metrics` object. Any change to the metric names requires a matching change to the
   `shopping-list-recall` branch of `computePerformanceRatio`.
3. **A single 0-1 difficulty score drives everything.** A redesign can change which
   parameters that score maps to, but it cannot ask for a per-player configuration screen.
4. **The game must fit a ~2 minute category slot** and be interruptible - `GameShell`
   can rotate the player out after a round completes.
5. **One round per mount.** Content is built once in `useState(() => buildContent(p))`.
   Multi-round designs need a rethink of where round state lives.
6. **Tap-only, 80px minimum targets, three languages.**

## 5. Problems worth solving

Ordered roughly by how much they hurt.

**The game is English-only in practice.** There are zero `shopping-list.*` keys in any of
`en`, `hi` or `kn` — every string falls through to its inline English fallback. Worse, the
twenty item labels ("Tomato", "Mustard Seeds") are plain string literals that never pass
through `t()` at all, so they cannot be translated even if the keys existed. For a South
Indian care home audience this is close to a functional failure, not a polish item. Item
naming is central to a shopping game, so this belongs in the redesign, not in a follow-up.

**Emoji as the art direction.** Several tokens are poor semantic matches — 🫘 for dal, 🫙 for
coconut oil, 🌰 for tamarind, 🫛 for mustard seeds — and emoji render differently on every
platform, so what a resident sees is not what was designed. The two most recent games
(Picture Postcard, Train Yard) both moved to commissioned raster art with a preload gate.
Shopping List is the strongest remaining candidate to follow.

**Precision is barely punished.** A player who taps every tile in the recall grid gets
`recallRatio = 1.0` and `precisionRatio ≈ 0`, for a performance of 0.5 — a middling result
for a strategy involving no memory at all. At the top of the difficulty curve the recall
grid holds 18 of the 20 pool items, so "select everything" is close to optimal play.

**The distractor pool is too small.** Twenty items total. At `itemCount 8` / `recallFieldSize 18`
the grid contains almost the entire vocabulary, so distractors stop being distractors and
the task degrades from recall to recognition-of-absence.

**The bonus round can be unwinnable.** `allCorrect` requires `vegIds.size > 0`, but the study
set is drawn at random from a pool that is only 6/20 vegetables. Roughly 2.4% of top-level
rounds present a bonus challenge with no correct answer, which no amount of play can pass.
It also asks the same question ("which are vegetables?") every single time.

**Two score screens in a row.** The recall phase already shows `hits / itemCount` in a card;
the completion phase shows the identical figure again. And players who reach the bonus round
skip the completion screen entirely, so the ending is inconsistent across difficulty levels.

**The category data is nearly unused.** Every item carries a category, but categorisation —
the single most effective memory strategy for a list — is never taught, modelled or
rewarded except in the optional bonus round. The study phase presents a flat shuffled grid.
There is an obvious redesign here: group the study list by aisle, and the game starts
teaching a strategy rather than just testing raw span.

**No shop.** The theme is a shopping list, but nothing on screen is a shop, a basket, or an
aisle. Study and recall use the same 2-column tile grid, so the two phases are visually
indistinguishable. This is the biggest untapped source of both delight and comprehension.

**Difficulty moves on one axis.** Item count up and study time down happen together, so the
curve gets steep fast and there is no way to give a player more items with more time, or
fewer items under pressure.

**Code smells to mention in passing** (not design work, but they will be touched):
the study countdown `useEffect` has no dependency array and re-subscribes on every render;
`levels.config.ts` is dead; the 2-second `gap` phase is named for a distractor task it does
not implement.

## 6. Prototype scope

A useful prototype should answer:

1. What does the shop look like? Is the study phase a list, a basket, an aisle, a counter?
2. Does grouping by category during study measurably help, and can it be made visible
   without being read as the answer key?
3. What replaces or reforms the recall grid so that "tap everything" stops being viable —
   a fixed selection budget, a basket with a capacity, a per-item confirm?
4. Does the game need real art, and if so, twenty items or a larger vocabulary?
5. What is the single ending screen?

Deliverable format: follow `docs/superpowers/specs/2026-08-04-train-yard-design.md`. A spec
with phase timings, a difficulty parameter table, explicit metric definitions, art direction
and a localisation plan is directly implementable; a mockup alone is not.
