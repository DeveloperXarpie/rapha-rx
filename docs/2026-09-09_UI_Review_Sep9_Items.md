# UI Review (Sep-9) - Extracted Action List

**Date**: 2026-09-09
**Content Type**: Analysis / Action List

Source: `assets-src/Sep-9/UI_review.pdf` (9 pages, external reviewer).
Supplied assets: `assets-src/Sep-9/`.
Branch the screenshots were taken from: `feat/app-flow-redesign` (screenshot footer reads v1.25.1; branch is now 1.27.1).

In the PDF, the left-hand screenshot is the current build and the right-hand
screenshot is the reviewer's target mock. Red arrows carry the notes.

---

## Supplied assets

| File | Size | What it is | Replaces |
|---|---|---|---|
| `ui_close_x.png` | 40x40 | Navy circle, white X | Grey rounded-square close button in `GameShell` |
| `ui_icon_hint_.png` | 72x64 | Yellow bulb in navy ring + green count badge | MarketMemory hint button |
| `ui_icon_undo.png` | 38x38 | Yellow circle, blue back/undo arrow | Free Play back arrow; cart undo |
| `ui_panel_selection.png` | 99x99 | Pale blue-grey rounded square, dashed border | Cart slots; Cart-checked result tiles |
| `ui_panel_texthold.png` | 191x42 | White rounded pill | Level chip; instruction banner |
| `ui_text panel_01.png` | 136x179 | White panel with navy header bar | MY CART panel; Cart-checked dialog |
| `image (4).png` | 1003x1568 | Wider Shopping List splash, no PLAY button | `public/games/splash-shopping.webp` |
| `Undo` | 512x512 PSD | Source file for `ui_icon_undo.png` | - |

Current splashes are 540x960 (9:16, 0.5625). The replacement is 0.64 aspect,
which is what "replace with a wider asset" means - the 9:16 art pillarboxes in
the portrait column.

---

## Page 1 - Home screen (`src/screens/HomeScreen.tsx`)

1. **Settings gear - scale up.** Icon and its "SETTINGS" label are too small.
2. **Centralise the greeting.** "Good morning, JOSHI" (and presumably the
   "Today's Workout takes 6 minutes." subtitle) is left-aligned; centre it.
3. **Game row text size larger.** Two arrows: the category label ("MEMORY") and
   the last-level line ("Last time: level 1"). Both need a larger type size.
   Lives in `src/components/chrome/GameRow.tsx`.
4. **"ANOTHER DAY" icons too small.** The three secondary game icons under the
   divider need to be scaled up.

## Page 2 - Free Play (`src/screens/FreePlayScreen.tsx`)

5. **Replace the back-arrow asset** with `ui_icon_undo.png` (yellow circle, blue
   arrow) in place of the current flat circle-with-arrow.
6. **Scale up the header** - "Free Play" title and the "Choose any game you would
   like to play." subtitle.
7. **Scale up the category headers** - "MEMORY", "ATTENTION", etc.

## Pages 3, 4, 8 - Game title screen (`src/screens/GameTitleScreen.tsx`)

8. **Replace splash art with a wider asset.** Current 540x960 art leaves blue
   bars down both sides. Target is 1280x2000. Shopping List art is supplied;
   Station Master is shown on page 8 but **not supplied** (see Q1).
9. **Restyle the PLAY button** to match the 'READY' art-button style shown on
   page 3 - the glossy bevelled green button, not the current flatter one.

## Page 5 - Shopping List, memorise phase (`src/games/memory/MarketMemory`)

Shell-level items 10-12 live in `src/components/GameShell.tsx` and affect
**every game**, not just this one.

10. **Level chip restyle + reposition.** Small yellow pill top-left becomes a
    wide white pill (`ui_panel_texthold`), centred at the top.
11. **Close button restyle.** Grey rounded square becomes the navy circle
    (`ui_close_x`), and it grows.
12. **Drop the dark navy header bar.** In the mock the chrome floats directly
    over the game art; there is no bar behind it.
13. **Hint/lives icon moves off the top-centre.** On page 6's mock it reappears
    on the MY CART bar (see item 19).
14. **Alignment issue** (arrow on "Carrots"). The item rows sit on the ruled
    lines rather than between them; icon and label baselines do not line up.
15. **READY button larger** - wider and taller than current.

## Page 6 - Shopping List, collect phase (`src/games/memory/MarketMemory`)

16. **Instruction banner restyle.** Cream rounded box with dark text becomes a
    white pill with bold navy text. Copy also changes: "Collect those items,
    then press DONE." -> "Remember & Collect Items".
17. **MY CART panel goes white.** Currently a cream body under a navy bar;
    target is the `ui_text panel_01` treatment - navy header bar, white body.
18. **Cart slots restyle** to `ui_panel_selection` - pale blue-grey fill with a
    dashed blue border, replacing the cream/dashed slots.
19. **Hint button relocates** onto the top-left of the MY CART bar, using
    `ui_icon_hint_.png` with its green remaining-count badge.
20. **Undo button added** on the cart, using `ui_icon_undo.png` (small yellow
    circle sitting on the first filled slot).
21. **"Creme background can be this colour."** Two arrows - one to a shelf item
    label ("Kabuli Chana"), one to the cart slot area. Reading: the cream fills
    used for shelf labels and the cart move to the new pale palette. See Q4.

## Page 7 - Cart checked dialog (`src/games/memory/MarketMemory`)

22. **Dialog panel goes white** (from cream), with a tighter rounded shape.
23. **Result items become tiles** - `ui_panel_selection` dashed tiles holding the
    item art, with a green tick or red X badge on the corner. The per-item text
    labels ("Grapes", "Eggs", "Groundnut Oil") are dropped.
24. **Show correct as well as wrong.** Current dialog marks only the misses with
    red X; the mock shows green ticks for correct picks alongside.
25. **"Next round" -> "Next Round"** (title case), on a larger green button.

## Page 9 - Station Master / Train Yard (`src/games/memory/TrainYard`)

26. **Hearts move to the top-left**, sitting above the board next to the centred
    level pill. Same shell chrome changes as items 10-12.
27. **Drop the dark header bar** (as item 12).
28. **Instruction banner restyle** to the white pill with bold navy text. Copy in
    the mock: "Remember the colour of each Station".
29. **Station signs show colours, not city names.** Current: UDUPI / BIDAR /
    BELAGAVI / HASSAN (`src/games/memory/TrainYard/palette.ts`). Mock: RED /
    BLUE / GREEN / YELLOW STATION. This is a gameplay change, not a skin. See Q2.
30. **RESET button absent** from the mock. Currently a real scored mechanic
    (`resetsRef` feeds `computePerformanceRatio`). See Q3.
31. **Coloured triangle markers** under each train at the bottom of the mock,
    which the current board does not have.
32. **Reviewer note on lives**: "We have 3 lives, which is like a handicap, also
    ensuring that the player does not drop out of the game." Reads as an
    endorsement of the existing hearts rather than a change request. See Q5.

---

## Cross-cutting

- Items 10, 11, 12 are `GameShell` changes and will land on all 15 games at once.
  Every game's `useStageFit` board measures the play box, so removing the header
  bar changes available height everywhere - worth a portrait-fit check
  (`npm run smoke:portrait`) after.
- Items 1-7 are pure sizing/alignment on redesign screens.
- "Level 88" in the mocks is placeholder text, not a spec.

## Answers received (2026-09-09)

- **Q1 - splash art.** These two games only, for now.
- **Q2 - station names.** Ignore completely. Station names stay as they are, and
  so does the "learn the station names" copy. Item 29 dropped.
- **Q3 - RESET.** Ignore. RESET stays. Item 30 dropped.
- **Q4 - cream palette.** Replace the cream behind the item names with the light
  blue from the new MY CART row, and apply that colour to the MY CART panel too.
- **Q5 - lives.** Keep the hearts as they are; restyle their colours to suit.

## Correction made during implementation

The first reading of items 12/26/27 was "remove the dark header bar". Zooming
into the top strip of the pages 5, 6 and 9 mocks shows that is wrong: all three
keep a full-width chrome strip and the board art still starts below it. What
changes is its colour - deep navy becomes the kit's near-white. The bar was
therefore repainted, not removed.

That distinction mattered structurally. Train Yard's `CANVAS_H` is
`HUD_H + BOARD_H`; dropping the 96px bar would have taken its canvas ratio from
0.627 to 0.678, past the 0.64 portrait-column cap that
`src/lib/__tests__/portraitColumn.test.ts` holds, and the column would have
started shrinking the board on tablets.

## Fix after first smoke test

The title-screen PLAY button came out misshapen, from two mistakes in the same
change:

- `border-radius: 22%/34%` on `.btn-green-kit`. A percentage radius resolves per
  axis, so that drew an ellipse that bulged on a wide button rather than the
  kit's rounded rect. The class no longer sets a radius at all; a caller that
  wants the kit's corner passes a length in container units, because the corner
  is a fraction of the button's HEIGHT and no percentage can express that.
- The rect was carried over from the old 540x960 art. On the re-cut 1003x1568
  splashes the same 57% width gave a 2.8:1 button against the READY art's 1.8:1,
  which is what made it look flat and oversized. Both re-cut games now use
  42% x 12.2% - about 2.2:1 - with the radius at 22% of the height.

## Items not carried out, and why

- **Item 31 - triangle markers under the trains.** A mock-only difference on
  page 9 with no annotation against it, and not covered by any answer above.
- **Item 24 - show correct as well as wrong.** Already the behaviour: the card
  filters only `missed` rows, so green ticks already appear. The page 7
  screenshot is a round where all three picks happened to be wrong.

## Judgement calls worth a look

- **Result tiles lost their printed names.** The page 7 mock shows art plus a
  verdict badge and no label. The names now ride on each tile's `aria-label`
  instead, so assistive tech keeps them, but a sighted resident who does not
  recognise an item's art no longer gets told what it was. Say the word and the
  labels come back.
- **Train Yard's instruction banner** was repainted to the kit's pale plate to
  match Market Memory's caption, and its brain badge and copy were both kept.
  The page 9 mock shows a plain pill with neither, but that difference was not
  annotated and the copy change was tied to the station rename that Q2 dropped.
- **The Free Play and title-screen close buttons** were left alone. The review
  only re-cut the in-game one.
