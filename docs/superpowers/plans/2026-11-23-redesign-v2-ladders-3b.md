# Redesign v2 Plan 3b (part 1): Tiffin Time and Spot Focus Ladder Settings

**Date**: 2026-11-23
**Content Type**: Implementation plan

**Goal:** Give the Tiffin Time and Spot Focus ladders the settings plan 3a left out because they needed layout work. Then set both ladders' anchor levels to the rules doc's samples in full.

- **Tiffin Time:** seats (2 to 4), counter size (3 to 6), a minimum dishes per order, cook bands, and the gap before a new guest arrives.
- **Spot Focus:** bold, medium and subtle differences mixed on one board.

**Not in this part, and why:**
- **The spreadsheet importer:** the owner has not filled the sheet, so the importer would carry over only my sample values. It waits until someone edits the sheet.
- **Shopping List crate count:** needs an art decision for empty crate slots.
- **Shopping List twin closeness:** needs a closeness tag on each of the 62 items.
- **Shopping List study timer:** has no sample values in the rules doc yet.

**Spec:** `docs/redesign-v2/DIFFICULTY_RULES.md` 3.3 and 3.5 (parameters, curation rules, sample levels).

**Branch:** `feat/app-flow-redesign`. Commits carry no co-author line. The user asked to go ahead without further questions (2026-11-23), so the calls below are mine and are recorded here.

## Decisions this plan makes

| Topic | Behaviour | Source |
|---|---|---|
| Fewer seats | Each seat stays 235 px wide (the 4-seat width), and the occupied seats are centred on the counter. Stretching 2 seats across the board would leave each guest alone in a wide gap. | My call |
| Smaller counter | Cards keep their 3-column size. A part-filled last row is centred, and the card block is centred vertically in the tray. Larger cards would stretch the card art. | My call |
| Cook bands | `short`: cook time 4.5 s or less (8 dishes). `mid`: 6 s or less (17). `all`: all 22. `long`: all 22, but dishes of 6 s or more are dealt at double weight. The sample's "short + mid" is `mid`. Every band has at least 6 dishes, so any counter size can be dealt. | DIFFICULTY_RULES 3.5, my mapping |
| Band raises patience | Not applied. The rules doc's own samples do not follow this coupling, so the ladder keeps the sample patience values. Flagged for the playtest. | Sample table |
| Respawn gap | `respawnMinS` and `respawnMaxS`, from the sample (2.5-4 at L1, 0.9-2.3 from L23). | DIFFICULTY_RULES 3.5 |
| Guests per round | At least 2 x seats, so L1 uses the sample's 6 guests with 2 seats. | Coupled rule 3.5 |
| Tiffin, one axis per step | Not enforced, as in 3a: the samples change several axes between anchors. Only the hard limits, the coupled rules and "never easier" are tested. | Unchanged from 3a |
| Spot Focus tiers | `mediumCount` and `subtleCount`; the rest of the differences are bold. The generator builds subtle first, then medium, then bold, each falling back to the next bolder tier only if the catalogue runs out. | DIFFICULTY_RULES 3.3 |
| Spot Focus "harder" | A step is harder on the tier axis when the subtle count or the non-bold count rises. A new difference that arrives at a non-bold tier counts as two changes. At most 2 differences move up a tier per step. | DIFFICULTY_RULES 3.3 |
| Free Play and other non-ladder callers | The 0-1 score functions return today's board: 4 seats, a 6-dish counter, all dishes, today's respawn gap; one tier per board for Spot Focus. | Unchanged behaviour |
| Ladder version | `LADDER_VERSION` goes to `0.2`, because the values change. | DIFFICULTY_RULES S9 |

## Tasks (TDD, inline)

1. **Tiffin model:** `RoundConfig` gains `seats`, `counterSize`, `minItems`, `cookBand`, `respawnMin` and `respawnMax`. `dealCounter` honours the band and size, `makeGuest` draws min..max dishes, and `tick` loops over the configured seats. Tests in `model.test.ts`.
2. **Tiffin geometry and view:** seat and card positions become functions of the counts, and the view passes the config through.
3. **Tiffin ladder:** add the new fields to the params and anchors, set the anchors to the full sample, and add guardrail tests:
   - seats 2-4;
   - counter at least maxItems + 1, and at most 6;
   - guests at least 2 x seats;
   - minItems no more than maxItems;
   - the band order and the respawn range never get easier.
4. **Spot Focus generator:** mixed tiers. Tests cover the new counts, and every ladder level must build with no fallback.
5. **Spot Focus ladder:** sample tiers, extra anchors wherever the curation tests name a level, and the tier guardrails.
6. **Docs, version and checks:** bump `LADDER_VERSION` and `package.json` to 1.41.0, then update the rules doc, the README and the progress doc. Lint must show no new errors and the build must pass.

## Review focus

1. A 2-seat round must never spawn into seats 3 and 4 (`tick` reads `config.seats`).
2. A 3-dish counter with `maxItems` 2 must never produce a 3-dish order, and every order must be servable.
3. The `long` band must deal 6 distinct dishes.
4. Spot Focus at 3x6 with 6 subtle differences must build every round without a fallback.
