# Garden Keeper - game design brief

Date: 2026-08-07
Game id: `garden-keeper`
Category: attention
Status: brief for design. No code exists yet.

Audience: designer working on the visual direction and a playable prototype.
Source reference: the Garden Keeper concept page (two mockups, "Attention & Focus 3").

## 1. Product context

The app is a daily brain-training session for residents of care homes, played on a shared
tablet with a carer usually nearby.
Players are older adults, many with mild cognitive impairment.
A session is three games drawn from three categories (memory, attention, executive), roughly
two minutes per category.

Garden Keeper is an **attention** game.
It joins `spot-focus`, `focus-filter` and `word-search` in that category.

Constraints that come from the audience, not from this game:

- Minimum touch target 80px. Tap only. No drag, no long-press, no double-tap, no timed gestures.
- Copy in English, Hindi and Kannada. Hindi and Kannada render in Noto Sans and run visually
  longer than English, so layouts must not assume English string widths.
- Large type, from the `text-h1` … `text-small` scale in `src/styles/tokens.ts`.
- No failure state that reads as failure. The worst outcome is a lower score and a gentler
  next round.
- The garden should read as a familiar South Indian home garden, not a European cottage bed.

## 2. The mechanic

The player tends a garden bed.
Water droplet markers appear above individual plants over the course of the round.
The player taps a marked plant to water it.

**Droplets only ever appear on healthy flowers.** The marker is always truthful.
The garden is also full of weeds, insects and poisonous plants, and none of them ever carries a
droplet.
They exist to make the droplets hard to find, and hard to keep finding for ninety seconds.

This makes the demand:

| Skill | Where it lives |
|---|---|
| Selective attention | Finding a small droplet in a dense, visually noisy bed |
| Sustained attention | Holding that search quality for the full round, not the first fifteen seconds |
| Vigilance | Droplets expire, so the search has to be continuous rather than a single sweep |
| Response inhibition | Suppressing the pull of the most salient thing on screen - a crawling caterpillar, a ladybird, a lurid carnivorous plant - none of which is ever the answer |

Difficulty makes distractors **more attention-grabbing**, not more deceptive.
The game never lies to the player. That is a deliberate choice for this audience: a marker that
sometimes means "don't" would read as unfair rather than challenging.

### Outcomes

| Event | Effect |
|---|---|
| Tap a droplet-marked flower | Watered. Progress +1. Watering can pours, flower blooms. |
| Tap anything else | Wrong tap. One heart lost. |
| Droplet expires unwatered | Miss. No heart lost. The flower wilts for a beat so the player sees what they missed, then recovers. |

Inattention costs less than impulsivity.
That asymmetry is intentional and should survive prototyping.

### Round shape

Water the target count before the clock runs out.

- Target reached → round complete.
- Clock expires or hearts reach zero → round ends, scored on what was watered.

Both endings use the same closing card. One ending screen, not two.

## 3. Screen

The mockups show a phone-shaped layout; the app runs on a tablet in portrait.
Assume a single scaled design canvas as Train Yard does, not a fluid layout.

**Keep from the mockups:**

- The soil bed with plants laid out in loose rows, not a visible grid
- Droplet markers floating above plants
- The gardener character and the instruction banner, at least for the opening seconds
- The three-chip legend: water this / avoid this / poisonous
- The `WATERED 12 / 20` progress counter
- The watering can as the pour affordance
- Hearts and the countdown clock

**Drop from the mockups:**

- **Score** (`1,350` + star). The app has no score anywhere. The difficulty engine already
  measures performance, and a visible score invites comparison between residents.
- **Pause**. `GameShell` owns exit and confirmation.
- **Hint** and its charge badge. No existing game has assists, and the answer here is "look
  harder", which a hint would simply give away.
- **Level pill**. `GameShell` renders a level tag already.

Hearts and the countdown are the two HUD elements that survive, and the countdown is new to this
codebase - no existing game has one. It is justified here because vigilance without a deadline is
just search.

**Timing constraint worth designing around.** The category slot is about two minutes and
`GameShell` rotates the player out after a round completes.
The round countdown must be roughly 75-90 seconds, not the mockup's 1:25 followed by further
levels within the same sitting.
One mount is one round.

**Legend chips.** Three chips of dense English text in a corner will not survive translation into
Kannada at this type size.
Treat the legend as a design problem: it may want to be an opening card that the player
dismisses, rather than persistent chrome.

## 4. Difficulty: two axes

The app drives every game from a single 0-1 score, but that score should map onto two independent
pressures so the curve can go wide before it goes fast.

**Axis A - search load.** How hard a droplet is to find.

- Number of plants in the bed
- Ratio of distractors to flowers
- Visual similarity between flower species (colour variety narrows)

**Axis B - time pressure.** How long you have to find it.

- Droplet spawn rate
- Droplet lifetime before it expires
- Number of droplets live at once

Draft mapping, for the prototype to argue with:

| Param | score 0.0 | score 1.0 |
|---|---|---|
| `plantCount` | 12 | 24 |
| `distractorRatio` | 0.25 | 0.55 |
| `targetCount` | 8 | 20 |
| `spawnIntervalMs` | 3000 | 1200 |
| `dropletLifetimeMs` | 6000 | 2800 |
| `maxConcurrentDroplets` | 1 | 3 |
| `roundDurationMs` | 90000 | 90000 (fixed) |
| `lives` | 3 | 3 (fixed) |

`targetCount` must stay achievable at the given spawn rate and duration, or the round is
unwinnable by arithmetic rather than by attention. That relationship is a constraint the
prototype has to verify, not a free parameter.

**Weather, day/night and extra distractions** from the reference page are layered onto Axis B as
ambient visual noise, not as separate mechanics.
They should be gated behind a `prefers-reduced-motion` check and behind a difficulty threshold,
and they must never obscure a droplet - noise that hides the target converts a search task into a
luck task.

## 5. Metrics

The game reports on completion:

```
watered           droplets successfully collected
targetCount       the round's goal
falseTaps         taps on anything not carrying a droplet
misses            droplets that expired unwatered
meanReactionMs    mean time from droplet appearing to it being tapped
livesLeft
```

`meanReactionMs` is the interesting one for this game and has no precedent in the codebase -
it is the cleanest available measure of sustained attention decay, and worth logging even if the
first version of the performance ratio ignores it.

Performance ratio should weight completion against precision, roughly:

```
hitRatio       = watered / targetCount
precisionRatio = watered / (watered + falseTaps)     // 1.0 when falseTaps is 0
performance    = (hitRatio + precisionRatio) / 2
```

Note the failure mode to design against: if tapping is cheap, a player can tap everywhere.
`falseTaps` costing hearts is the primary defence, and the prototype should confirm three hearts
is tight enough to make spamming non-viable at low difficulty.

## 6. Art direction

Follow Picture Postcard and Train Yard: commissioned raster art, extracted into alpha-trimmed
PNGs by a committed script, with a `useImagesReady` preload gate before the round starts.
The round is timed, so a decode running inside the countdown silently steals seconds from the
player.

Asset set:

- **Flowers** - five or six species, several colours each. These are the targets and must read as
  targets at a glance.
- **Weeds** - green, leafy, deliberately similar in silhouette to unflowered plants.
- **Insects** - bee, ladybird, snail, caterpillar. These are the movers and carry most of the
  distraction load.
- **Poisonous** - mushroom, carnivorous plant. The most visually loud things on screen, and never
  correct.
- **Bed plate** - the soil, fence, border flowers, painted as one plate the way Train Yard's
  grass is, with the interactive plants layered over it.
- **Droplet marker**, **watering can**, **heart**.

The droplet marker carries the entire game.
It must be legible against every plant it can sit on, at tablet distance, for an older eye.
Prototype it against the busiest possible bed before anything else is finalised.

Insect movement should be a slow idle crawl, not a fast dart.
Fast movement in peripheral vision is the single easiest way to make this game feel stressful
rather than absorbing.

## 7. Localisation

Everything through `t()` with an English fallback, keyed under `gk.*`.
This is the failure mode Shopping List Recall shipped with - hardcoded English item labels that
could not be translated even in principle - so it needs to be right from the first commit.

Strings needed:

| Key | English |
|---|---|
| `gk.instruction` | Water only the healthy flowers |
| `gk.legend.water` | Water this |
| `gk.legend.avoid` | Avoid this |
| `gk.legend.poison` | Poisonous |
| `gk.progress` | Watered {{done}} / {{total}} |
| `gk.roundComplete` | Garden watered |
| `gk.outOfHearts` | Let's try again |
| `gk.timeUp` | Time's up |
| `gk.next` | Next round |

The plants themselves are never named, which keeps the vocabulary burden near zero.
If naming is added later it becomes a much larger localisation surface.

## 8. Integration contracts

Hard constraints from the app. Breaking any of them stops the game working.

1. **Props in:** `{ levelConfig, onLevelComplete }`, where `levelConfig.params` carries the
   difficulty parameters.
2. **Call `onLevelComplete` exactly once**, with `completed`, `durationSeconds` and `metrics`.
3. **One round per mount.** Content is built once at mount; `GameShell` remounts for the next
   round.
4. **A single 0-1 difficulty score drives everything.** No per-player configuration.
5. **Tap only, 80px minimum targets, three languages.**
6. **`prefers-reduced-motion` respected**, with a prop override for testing.

Files that will need touching when this is built:
`src/screens/GameRouter.tsx` (registry + params), `src/lib/dynamicDifficulty.ts`
(`getGardenKeeperParams`), `src/components/GameShell.tsx` (`computePerformanceRatio` case),
`src/session/SessionManager.tsx` and `src/screens/DailyQuestionnaire.tsx` (both hold their own
copy of the rotation pool - a duplication worth consolidating separately),
`src/screens/HomeScreen.tsx`, and the three `public/locales/*/common.json` files.

## 9. What the prototype should answer

1. Is the droplet marker findable in a dense bed, at tablet distance, by an older eye? This is
   the make-or-break question and everything else is secondary to it.
2. Does a 90 second round with a live countdown feel absorbing or stressful for this audience?
   The countdown is new to this app and is the riskiest borrowed element.
3. At what plant count does the bed stop being a garden and start being a wall of clutter?
4. Are three hearts tight enough to stop tap-spamming, and loose enough that a slow, careful
   player never sees the out-of-hearts card?
5. Do the ambient weather and day/night effects add atmosphere without ever obscuring a droplet?
6. What is the resting state between droplets - does the garden feel alive when there is nothing
   to do, or does it feel like the game has stopped?

Deliverable format: a spec following `docs/superpowers/specs/2026-08-04-train-yard-design.md`,
with phase timings, a difficulty parameter table, explicit metric definitions, art direction and
a localisation plan. A mockup alone is not implementable.

## 10. Open questions

- **Does the bed change during a round?** Assumed static: the same plants for the whole ninety
  seconds, only droplets appearing and expiring. Plants arriving mid-round would add a second
  source of change and probably too much.
- **Is there a wave structure?** Assumed no - one continuous round against one clock.
- **Does the gardener character stay on screen?** Assumed he introduces the round and then
  withdraws, since he occupies space the bed wants.
