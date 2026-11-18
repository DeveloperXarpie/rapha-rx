# Redesign v2: Difficulty and Game Design Progress

**Date**: 2026-11-18
**Content Type**: Progress report (discussion record)
**Branch**: `feat/app-flow-redesign` (v1.35.7)
**Covers**: the 2026-11-18 session that folded the owner's answers on the difficulty design notes into the v2 docs.

This file records how the discussion went and where it ended.
The decisions themselves live in the docs below; if this file and they ever disagree, they win.

| Doc | What changed in this session |
|---|---|
| `FINAL_SPEC.md` | D15-D24 added; section 7.1a added; C9-C12 and C17 resolved; C18 and C20 added. |
| `DIFFICULTY_RULES.md` | Owner answers folded into every game section; decision log O1-O30 in section 6. |
| `README.md` | Game list, decision ranges and open items brought up to date. |
| `2026-11-12_difficulty-design-notes.md.pdf` | The owner's written answers on the design notes. The source of O1-O29. |

---

## 1. How the session went

1. Pulled four commits the owner had pushed from another machine (v2 spec, rules, ladders, game-screens page, Oct-20 copy fixes).
2. Read the owner's answers, written as inline notes in the design-notes PDF, and compared them with `DIFFICULTY_RULES.md`.
   Five limits had changed and about 30 questions were answered; Garden Keeper's five questions were not.
3. Raised the points where answers clashed with other rules (a score threshold vs a difficulty-weighted score, 40% differences, 8 stations vs memory span, two skills per game).
   The owner settled them in a follow-up and removed Garden Keeper from the six.
4. Folded everything into `DIFFICULTY_RULES.md`, then into `FINAL_SPEC.md`.
5. **Skills, three rounds:**
   - Round 1: the answers left three games with one measurable skill (Retention, Sequence, Sequencing had no data source). Logged as C17.
   - Round 2: the owner pointed to the measurement framework (`docs/scoring and end/Game Performance Measurement Format.docx`). Claude proposed replacement skills from it, and they were written in as D24.
   - Round 3: **the owner rejected replacing skills**. Skill names and measures stay exactly as drafted; only small changes to existing games are allowed, to capture what a game cannot measure today. D24 was rewritten to say so, and section 7.1a now lists the small changes.

**Lesson for later sessions**: the draft's skills table is fixed.
When a measure has no data source, propose the smallest change to the existing game that produces it; do not swap the skill or redefine the measure.

## 2. Where things stand

### Games in scope

| Category | Games |
|---|---|
| Memory | Shopping List (`market-memory`), Station Master (`train-yard`) |
| Attention | Spot Focus (`spot-focus`), **Baggage Sort** (new, not designed; replaces Garden Keeper) |
| Planning | Tiffin Time (`serve-guests`), Free Me (`clear-the-way`) |

Garden Keeper gets no changes and is not part of the core prescription.

### Decided (owner, 2026-11-18)

Shared:

- A failed round turns Continue into **Replay**; the resident replays the level.
- Clear and fail use each game's own measure (share recalled, found, served), not the difficulty-weighted skill score.
- Generator games build a fresh round from the level's settings every play; Free Me picks at random from a level pool.
- Phone and tablet both supported.

Per game:

| Game | Decisions |
|---|---|
| Shopping List | Misses allowed, decided by the Recall threshold. Hints heavily limited (max 1); a hinted round scores half. 6 items until new cart art. Simple, translated item names before the top levels. |
| Station Master | Up to 8 stations with new colours and close-hue sets (owner supplying art). Hearts as a heart with a number, down to 1. Up at 75% in 2 of the last 3 rounds; down after 2 lost rounds in a row. **Work waits for the art style and designs.** |
| Spot Focus | Board up to 6 x 3; differences from 1 to 40% of cards. "I can't find it" button after a delay, no time limit. Response speed = median gap between finds. More twin pairs to be commissioned. Mahjong idea is art only. |
| Tiffin Time | Spelled "Tiffin". Guest types (Impatient, Middle, Patient). Guests per round up to 18. The game keeps choosing the guest. On-screen points removed. Clear rule and tightest patience are Claude's proposals, to balance later. |
| Free Me | **Worked on last.** Random pick from the level pool. Restart = not cleared. No move ceiling. Planning counts moves since the last restart. Hint unlock varies by level. 6 x 6 cap for now. More puzzles and visual variety. |

### Small changes that capture skills (FINAL_SPEC 7.1a, proposed)

| Skill | Small change |
|---|---|
| Retention (Shopping List) | **Second trip**: the last round of a visit shows no list and asks for the first list's items, reusing the shelf and cart. |
| Sequence (Station Master) | **Staggered arrival**: trains pull in one at a time during study; dispatch order is scored, not enforced. |
| Sequencing (Tiffin Time) | **Numbered dishes**: multi-dish orders show dishes numbered 1-3; serving in that order counts. Scored, not enforced. |
| Decision-making (Tiffin Time) | Guest types, plus logging which dish is cooked first. |
| Response speed (Spot Focus) | Log each find; first find timed from the board's first paint, later finds from the previous one. |
| Sustained attention, Self-control (Baggage Sort) | Design requirements: fixed-length round in thirds; "don't tap" items that appear and leave. |

### Open

| # | Question | Where |
|---|---|---|
| C18 | Does Garden Keeper stay in Free Play unchanged, or leave the app? | FINAL_SPEC 13 |
| C20 | Second trip asks at the end of the visit, not the session: is a few rounds' delay acceptable? What about a one-round visit? | FINAL_SPEC 13 |
| - | Confirm the three small changes in 7.1a. | FINAL_SPEC 7.1a |
| - | Spot Focus "6 x 3": assumed 3 columns by 6 rows. | DIFFICULTY_RULES 3.3 |
| - | Starting thresholds, heart maximum, give-up delay, patience multipliers, hint ratios. | DIFFICULTY_RULES 3.x open questions |
| X1, X2, X6 | Ladder movement rule, overnight behaviour, ladder-to-score mapping. | DIFFICULTY_RULES 2.1 |
| - | Anchor levels in `DIFFICULTY_LADDERS.xlsx` (the sheet predates these answers and needs regenerating). | README |
| - | Scoring: personal-trend headline vs bands; per-game bar on the same score. | README 4 |

## 3. Next steps

1. Write the v2 implementation plan (`docs/superpowers/plans/2026-11-18-redesign-v2.md`), sequenced so that work blocked on owner input or art comes last.
2. Start with what is unblocked and independent of the open questions: the difficulty carry-over bug, the session engine (Stream A) and the copy changes (Stream F).
3. Regenerate `DIFFICULTY_LADDERS.xlsx` from the updated rules once the anchors arrive.
