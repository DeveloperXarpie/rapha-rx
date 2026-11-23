# Verification List: Work of 2026-11-23

**Date**: 2026-11-23
**Content Type**: Verification checklist

Everything built on 2026-11-23, for the user to go through and come back with feedback.
All of it is on `feat/app-flow-redesign`, committed, and none of it has been checked in the running app yet.

| Version | Commit | What |
|---|---|---|
| v1.40.0 | `bfd81a0` | The owner's amends of 2026-11-23, History Metrics, the 10-minute timer back to 600 s, the Station Master flow pages |
| v1.41.0 | `599dbf5` | Plan 3b part 1: Tiffin seats, counter, order size, cook bands, guest gap; mixed Spot Focus tiers |
| v1.42.0 | this commit | Plan 3b part 2: the difficulty ladder spreadsheet importer |

**Before you start:**
- Run `npm run dev` and use a phone-sized window (360-412 px wide) as well as a tablet one.
- **The 10-minute timer is real again (600 s).** A category completes only after 10 minutes of board time, so allow about 10 minutes for each category's end-of-session checks.
- **Debug rounds don't count toward the 10 minutes.** These are rounds started from the debug level jumper (Home's dev strip, behind five taps on the version label).
- **To check screens without playing,** open `/dev/chrome`: it has the scorecards, popups and History Metrics.
- **For each item,** note pass, fail or a change you want, and write your feedback in the Feedback column.

---

## 1. Scorecard after a game (v1.40.0, amends page 3)

Shown when a game ends past the category's 10 minutes. Also in `/dev/chrome`, under "Score cards".

| # | Check | Expected | Feedback |
|---|---|---|---|
| 1.1 | Heading | The game tile, then "YOUR MEMORY", "YOUR FOCUS" or "YOUR PLANNING" in light blue capitals | |
| 1.2 | Skill cards | One card per scored skill: skill name on the left, band word on the right in the skill's colour | |
| 1.3 | "n/5" bar | A dark disc with "3/5" (etc.), then five pills filled up to the band in the skill's colour | |
| 1.4 | Accolade | One word in a yellow badge over confetti. Confetti falls in, the badge pops (no motion with reduced motion on) | |
| 1.5 | Accolade ranges | Average of the cards: 0-39 Keep Going, 40-59 Strong Effort, 60-74 Great Game, 75-89 Excellent Play, 90-99 Outstanding, 100 Champion! (the gallery has a Champion sample) | |
| 1.6 | Nothing scored | "Thank you for playing today." instead of the accolade | |
| 1.7 | Unlock banner | "Attention is now unlocked!" (or Planning) under the cards, when a category just opened | |
| 1.8 | Continue and X | Both go to the 10-minute summary, never straight to Home | |
| 1.9 | Station Master | Only the Association card shows. Sequences is not scored yet; this is expected and on hold with Station Master | |

## 2. 10-minute summary (v1.40.0, amends page 4)

| # | Check | Expected | Feedback |
|---|---|---|---|
| 2.1 | Look | Flat navy screen (no blue wash), "YOUR MEMORY" and "Performance today" | |
| 2.2 | Rings | A ring per skill of each game played: score "of 100", and a green up or red down arrow with the change since the last session (the number has no minus sign; the arrow says which way) | |
| 2.3 | Headline | The word for the average in pale yellow, e.g. "Strong Performance" | |
| 2.4 | HISTORY METRICS bar | Lavender bar under the rings with a chevron, closed at first | |
| 2.5 | Open it | Each skill as a row of bars over the last 7 sessions of this category, score above each bar, dates along the bottom, Today on the right and solid, older bars lighter, "-" where a skill was not played | |
| 2.6 | First session | "Your history starts today. Come back tomorrow!" | |
| 2.7 | Scrolling | Opening it scrolls the panel into view; with 4 skills the screen scrolls and Continue stays reachable | |
| 2.8 | Bar height | 52 px, as in the mock. **Decide:** keep it, or raise it to the app's 80 px touch minimum | |
| 2.9 | Continue | Goes to Home | |

## 3. Home (v1.40.0, amends page 1)

| # | Check | Expected | Feedback |
|---|---|---|---|
| 3.1 | Four slots per row | Each category row has 4 slots: the games from slot 2, empty placeholders labelled with the category ("Memory", "Attention", "Planning") | |
| 3.2 | Captions | Game names in small capitals under the tiles | |
| 3.3 | Lock | The lock sits before the heading text, e.g. "🔒 Strengthen Your PLANNING". **Check on a narrow phone:** does the heading wrap to two lines? | |
| 3.4 | Unlock animation | After a category completes, the lock animates away once. **Check:** does the heading shift sideways when the lock goes? | |
| 3.5 | Garden Keeper | Not on Home (Focus shows Spot Focus). The amends mock shows it; the build keeps decision D15 until the owner says otherwise | |

## 4. Popups (v1.40.0, amends page 6)

| # | Check | Expected | Feedback |
|---|---|---|---|
| 4.1 | Locked game | Tap a game in a locked row: lavender popup "Play the assigned games." with a lime **Continue** | |
| 4.2 | Finished game | Tap a game in a completed row: "You have finished this today." with lime **Proceed** and an outlined **Back** | |
| 4.3 | Exit a game | The X during a game: the same lavender popup, lime "Yes, exit" and outlined "Keep playing" | |
| 4.4 | Lime button | Lime face, blue rim, white text with a dark green outline, as on the style sheet | |

## 5. Station Master flow pages (v1.40.0)

Open the two files in a browser:
- `docs/flows/2026-11-23_flow-game-to-game.html`
- `docs/flows/2026-11-23_flow-end-of-10-minutes.html`

| # | Check | Expected | Feedback |
|---|---|---|---|
| 5.1 | Game to game | First game of the day, a round ending inside 10 minutes, switching games, a locked tile | |
| 5.2 | End of 10 minutes | The round that crosses 10:00, scorecard, summary (with HISTORY METRICS), Home with Focus unlocked, the day-complete Home | |
| 5.3 | Accuracy | Each screen matches what the app does, and the notes on what is not built (Sequences card, weekly stars) are right | |

## 6. Tiffin Time difficulty (v1.41.0)

Reach levels with the debug level jumper. Each level's settings are in `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx`, "Tiffin Time" tab.

| # | Check | Expected | Feedback |
|---|---|---|---|
| 6.1 | Level 1 | 2 guests at once, standing side by side in the middle; 3 dishes in one row, centred in the tray; 6 guests in the round; quick dishes only; one dish per order | |
| 6.2 | Levels 4-8 | 3 guests at once; a 4- or 5-dish counter with the short second row centred; orders of up to 2 dishes from level 8 | |
| 6.3 | Level 15 | 4 guests, 5 dishes, the whole menu, some Impatient and Patient guests | |
| 6.4 | Level 30 | 4 guests, 6 dishes, every order 2 or 3 dishes, slow dishes common, 12 guests | |
| 6.5 | Time between guests | A seat stays empty about 2.5-4 s at level 1, about 1-2 s at the top | |
| 6.6 | Feel | Too easy or too hard anywhere? (The patience values are still the rules doc's proposal; a slower cook band does not add patience yet, flagged for the playtest) | |

## 7. Spot Focus difficulty (v1.41.0)

| # | Check | Expected | Feedback |
|---|---|---|---|
| 7.1 | Mixed boards | One board can mix bold (a different object), medium (another of the same family) and subtle (the near-twin) differences | |
| 7.2 | Level 18 | 3 x 5 board, 5 differences: 2 medium, 3 subtle | |
| 7.3 | Level 24 | 3 x 6 board, 7 differences: 1 medium, 6 subtle. Fits a phone? Cards readable? | |
| 7.4 | Breathers | Levels 7, 13 and 19 grow the board and drop a difference; level 5 repeats level 6. Acceptable? | |
| 7.5 | Count | The difference count shown always matches what is on the board | |

## 8. Ladder spreadsheet importer (v1.42.0)

For whoever edits the ladders. Close the workbook in Excel before running either command.

| # | Check | Expected | Feedback |
|---|---|---|---|
| 8.1 | Open the sheet | `docs/redesign-v2/DIFFICULTY_LADDERS.xlsx` opens; tabs in order: How to use, Shopping List, Station Master, Spot Focus, Garden Keeper, Tiffin Time, Free Me | |
| 8.2 | Ladder tabs | A guardrail block at the top (unit, min, max, step, direction, notes), then one row per level with Level, Source, the settings and Notes; yellow input cells; filled rows in grey text | |
| 8.3 | Formatting | Drop-downs on Source and on Tiffin's cookBand; red for a value outside its limits; amber for an easier or too-big step | |
| 8.4 | Untouched tabs | Station Master, Garden Keeper and Free Me look exactly as before | |
| 8.5 | How to use | Explains owner / claude / filled and how to hand the sheet back | |
| 8.6 | Import a change | Set one level's Source to `owner` and change a value, save, close, run `npm run ladders:import`: it names the game and the new anchors, runs the rule tests, and refreshes the filled rows | |
| 8.7 | Refused change | Change a `filled` row without setting it to `owner`: the import names the row and writes nothing | |
| 8.8 | Undo after testing | `git checkout src/lib/ladders/anchors.generated.ts docs/redesign-v2/DIFFICULTY_LADDERS.xlsx` | |

## 9. Session and regressions

| # | Check | Expected | Feedback |
|---|---|---|---|
| 9.1 | Resume | Start a game, refresh mid-round: Resume works | |
| 9.2 | Console | No console errors through a full Memory category | |
| 9.3 | Languages | Switch to Hindi and Kannada: the new scorecard, accolade, History Metrics and Home slot labels read well. These are Claude's translations and need a native speaker | |
| 9.4 | Other games | Shopping List and the Free Play games still start and finish | |

---

## Open decisions to bring back

1. **History Metrics bar height:** 52 px, as in the mock, or 80 px for touch (2.8).
2. **Accolade ranges** (1.5): you kept them on 2026-11-23. They still need the owner's confirmation.
3. **Weekly stars (C14):** on hold until the owner says what counts as a session.
4. **Garden Keeper on Home** (3.5): against D15. This is the owner's call.
5. **Station Master:** the Sequences card, ladder and Replay are on hold, waiting on art.
6. **Shopping List ladder settings:** crate count (needs empty-slot art), twin closeness (needs a tag per item), study timer (needs values).
