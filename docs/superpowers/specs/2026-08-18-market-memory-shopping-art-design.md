# Market Memory - shopping art rework - design spec

Date: 2026-08-18
Status: approved, ready for implementation planning
Supersedes the presentation layer of `2026-08-17-market-memory-design.md`. That spec's
mechanics (twins, blind, hearts, hints, scoring) stand unchanged except where stated here.
Source art: `assets-src/ShoppingList/`

## 1. What changes and why

Market Memory currently draws every pixel in CSS: the store, the crates, the products.
It now runs on a commissioned raster art set, and the flow gains a **journey**: the
player reads the shopping list at home, the list is covered, they travel to the store,
and the cover lifts on a blank list in the shop. The memory mechanic is unchanged - the
change is that the scene now tells the player why the list went away.

`shopping-list-recall` is untouched by this work.

## 2. Target

| | |
|---|---|
| Game id | `market-memory` |
| Category | `memory` |
| Directory | `src/games/memory/MarketMemory/` |
| Art source | `assets-src/ShoppingList/` |
| Art output | `public/shop-assets/` |

## 3. Asset pipeline

New `scripts/slice_shopping_assets.py`, following `scripts/slice_garden_assets.py` and
`scripts/slice_cook_assets.py`. It writes to `public/shop-assets/` and prints the measured
crop boxes so the geometry constants in section 4 are derived from the image, never
eyeballed.

### 3.1 Item sprites

`items-2.png` is 1536 x 1024 RGBA and **already alpha-cut** - the rainbow is transparent
(corner pixels have alpha 0). The items sit on a regular 10 x 6 grid, cells of
153.6 x 170.67 px.

Slicing is **per grid cell**, then trimmed to the alpha bounding box within that cell.
It is deliberately not per connected component: component analysis finds 62 blobs for 60
items, because the halved onion and the sliced orange each split in two. Cell cropping
merges those correctly.

Output: `public/shop-assets/item-<id>.png`, 60 files, roughly 150 px on the long edge.

### 3.2 Item naming

`ShoppingList_items.docx` names the sheet row by row. It is not authoritative: its row 1
lists eleven names for a row of ten, double-listing garlic, which genuinely belongs to
row 3. The script emits a manifest of `(row, col) -> crop box -> id` and the ids are
verified against the rendered sheet before the pool is authored.

### 3.3 UI kit

Sliced as individually named sprites, not a spritesheet:

| Sprite | Source |
|---|---|
| Clipboard frame, lined paper, SHOPPING LIST header plate, READY button | `ui-kit2.png` |
| MY CART panel, HINT badge, DONE button | `ui-kit-1.png` |

`list-asset.png` is the blank clipboard in situ and is the visual reference for the
reveal; the clipboard itself comes from the kit so it carries clean alpha rather than a
rounded crop out of a background.

### 3.4 Backgrounds

`bg-home.png` and `bg-store.png` are 941 x 1672, fully opaque and painterly. They are
re-encoded as **JPEG** - roughly 200 KB each against ~2 MB as PNG. Precedent:
`public/garden-assets/board.jpg`.

Output: `public/shop-assets/bg-home.jpg`, `public/shop-assets/bg-store.jpg`.

## 4. Canvas and geometry

The art is 941 x 1672, ratio 0.563. The current canvas is 800 x 1276, ratio 0.627. The
canvas becomes **800 x 1422** so the backgrounds fill it edge to edge with no
letterboxing and no crop.

`HUD_H` stays 96 and overlays the top of the background rather than sitting above it -
both backgrounds are full-bleed.

Re-derived in `geometry.ts` against the new height and against where `bg-store.jpg`
actually paints its shelves: `COL_X`, `ROW_Y`, `CART`, `LIST_CARD`, `BLIND`, `CAPTION`,
`BASKET`, `HINT_BTN`.

Shelf stays at **12 items**, 4 columns x 3 rows, on the top three shelves of the store
art. The bottom shelf sits behind the cart panel. `CRATE_COUNT` is unchanged.

Item name plates stay. `Crate.tsx` already draws them and they are what makes the
lookalike-twin mechanic fair rather than cruel.

## 5. Phase machine

Current: `encoding -> retention -> shopping -> roundEnd | outOfHearts`.

New:

| Phase | Scene | Behaviour |
|---|---|---|
| `encoding` | home | Clipboard shows `listLength` rows of sprite + name. Caption panel above it. **READY** button below. No countdown. |
| `covering` | home | Cover slides down over the clipboard, 540 ms. List blanks underneath 40 ms after it lands. |
| `travel` | home -> store | Backgrounds crossfade under the cover. Retention dots fill over `retentionMs`. |
| `revealing` | store | Cover lifts, 540 ms, showing the blank clipboard. |
| `shopping` | store | Clipboard slides off over ~400 ms. Shelf becomes interactive, cart and HINT enable. |
| `roundEnd` / `outOfHearts` | store | Unchanged. |

`covering`, `travel` and `revealing` replace the single `retention` phase. They are three
named phases rather than one with sub-timers because the scene differs in each and the
existing code already keys presentation off `phase`.

Every transition stays on a `setTimeout` against a deadline, never on a display ticker.
That is warning 1 of the original spec and it is what keeps a backgrounded tab from
deadlocking. `clearPhaseTimer` must continue to kill both the phase timeout and the
retention dot interval.

The blind must still land before the list blanks (warning 3) - `BLIND_MS + ARM_MS`.

### 5.1 READY

READY is the only exit from `encoding`. There is no countdown; the list stays up until
the player taps. This is a deliberate change from the current auto-advance after
`listSeconds` and it removes an encoding-difficulty axis - see section 7 for how that
axis is replaced.

### 5.2 Cover art

The kit contains no cover asset. The existing CSS `Blind` component is kept but restyled
from wooden slats to the kit's cream-on-navy palette so it does not clash with the new
art. Its geometry, timing and reduced-motion behaviour are unchanged.

### 5.3 DONE

`SUBMIT` becomes `DONE`, using the kit's button art. The i18n key `mm.submit` keeps its
name; only the default string and the art change. Everything behind the button - scoring,
the result card, hearts, `commit` - is unchanged.

## 6. Item pool

`items.ts` grows from 21 hand-drawn items to all 60 sheet items. The `Item` type becomes:

```ts
interface Item {
  id: string;
  name: string;
  group: Group;
  /** The lookalike this item seeds as a decoy. */
  twin: string;
  /** Path under public/shop-assets/. */
  sprite: string;
}
```

The `shape`, `body`, `dark`, `accent`, `leaf`, `label` and `emoji` fields are removed,
along with the `Shape` type. See section 8 for what that costs and how it is covered.

Groups are re-cut for the Indian pool:

`produce` | `greens` | `spices` | `pulses` | `dairy` | `packaged` | `household`

Every group must hold at least `listLengthMax + CATEGORY_MARGIN` = 8 items, so the
`listCategory` mechanic never falls through to the degrade path. The 60-item sheet
clears this comfortably in all seven groups.

Twins are hand-authored per item. The pulse bowls are the strongest pairs the game has
had: toor dal / masoor dal, kala chana / urad dal, kabuli chana / white chana. The
packaged row supplies the rest: milk / curd, atta / maida, sunflower oil / groundnut oil.

The module-load `registerAsset` calls that publish item emojis to the asset catalog are
removed with the `emoji` field. Nothing outside this game reads the `mm-<id>` asset ids.

`buildRound` and `scoreRound` are pool-agnostic and unchanged.

## 7. Difficulty

`listSeconds` no longer gates anything and leaves both `MarketMemoryParams` and
`getMarketMemoryParams`. `MM.listMsEasy` and `MM.listMsHard` are deleted.

The encoding-pressure it carried moves into the retention hold: `retentionMs` becomes a
curve rather than a constant.

| Param | Before | After |
|---|---|---|
| `listLength` | 3 -> 6 | unchanged |
| `listSeconds` | 9000 -> 3500 | removed |
| `retentionMs` | flat 1500 | 1500 -> 4000, `delayedBonusMs` still added on top |
| `similarPackaging` | at 0.25 | unchanged |
| `delayedRetrieval` | at 0.55 | unchanged |
| `listCategory` | at 0.75 | unchanged |
| `lives`, `hints` | 3, 2 | unchanged |

A new `studyMs` metric records how long the player actually held the list open. It is
telemetry only. `computePerformanceRatio` for `market-memory` uses `correct`, `wrong`,
`listLength` and `hintsUsed` - no timing - so it needs no change.

## 8. Fallback and robustness

`Product.tsx` shrinks to a generic component. It renders `<img src={item.sprite}>`; on
the image's `error` event it swaps to a tinted panel in the item's group colour with the
item name across it.

This is a deliberate step down from per-item CSS art. Full-fidelity fallback would mean
hand-authoring shape and colour metadata for all 60 sprites and keeping it in sync with
art it duplicates, for a path that only runs when a bundled asset 404s. The generic panel
plus the always-visible name plate keeps the board readable and the round completable,
which is what the fallback is for.

`Backdrop.tsx` is deleted; `bg-store.jpg` replaces it.

Background images are preloaded during `encoding` so the crossfade to the store in
`travel` never lands on an unpainted rectangle.

## 9. Files touched

| File | Change |
|---|---|
| `scripts/slice_shopping_assets.py` | New. Slices items, UI kit, backgrounds; prints crop boxes. |
| `public/shop-assets/` | New. 60 item sprites, ~7 UI sprites, 2 background JPEGs. |
| `src/games/memory/MarketMemory/items.ts` | Rewritten: 60 items, new `Item` shape, new groups. |
| `src/games/memory/MarketMemory/geometry.ts` | New canvas height; all furniture boxes re-derived. |
| `src/games/memory/MarketMemory/index.tsx` | New phase machine, background crossfade, READY, preload. |
| `src/games/memory/MarketMemory/Product.tsx` | Reduced to sprite + generic error fallback. |
| `src/games/memory/MarketMemory/Backdrop.tsx` | Deleted. |
| `src/games/memory/MarketMemory/Crate.tsx` | Restyled: the item stands on the painted shelf with a name plate beneath it, rather than inside a CSS wooden crate. Picked, hinted and reduced-motion states are kept. |
| `src/games/memory/MarketMemory/Blind.tsx` | Restyled to the kit palette. |
| `src/games/memory/MarketMemory/ListCard.tsx` | Clipboard art instead of CSS card. |
| `src/games/memory/MarketMemory/CartStrip.tsx` | Cart panel and DONE button art. |
| `src/games/memory/MarketMemory/palette.ts` | Wood colours out, kit colours in. |
| `src/games/memory/MarketMemory/Scene.tsx` | New. The two backdrops, stacked, with the store fading up over the home. |
| `src/games/memory/MarketMemory/sprites.ts` | New. Backdrop and UI art paths, plus the preload set. |
| `src/lib/dynamicDifficulty.ts` | `listSeconds` removed, `retentionMs` becomes a curve. |
| `package.json` | Minor version bump. |

The locale files are **not** touched. `public/locales/*/common.json` holds no `mm.*` keys
at all - the game has always run on the inline `t()` fallbacks - so the new and changed
strings follow that same convention rather than introducing a partly-translated state.

`src/screens/GameRouter.tsx` and `src/components/GameShell.tsx` need no change.

## 10. Testing

`src/games/memory/MarketMemory/__tests__/` already exists.

- **`sprites.test.ts`** - new, in the style of `GardenKeeper/__tests__/sprites.test.ts`.
  Every item's `sprite` path resolves to a file on disk; all 60 ids are unique; every
  `twin` resolves to a real id.
- **`round.test.ts`** - extended. Every group holds at least
  `listLengthMax + CATEGORY_MARGIN` items, so `poolFor` never hits its degrade branch.
- **Manual smoke test**, per the project release protocol: play a full round end to end,
  confirm the home-to-store crossfade lands cleanly, confirm READY is the only exit from
  encoding, confirm session resume still works, confirm no console errors.

## 11. Deliberate deviations from the mockups

- **No timer, no score in the HUD.** Hearts only, as today. The bar is rebuilt in CSS in
  the kit's navy style rather than sliced, because the raster HUD has its text baked in.
  A countdown and a points system would both be new mechanics.
- **No per-slot ticks and crosses on the cart.** `ui-main.png` shows them; the reveal
  flow is staying as it is, so the result card continues to carry the correct / wrong /
  missed breakdown. This is the one place the shipped screen will visibly differ from the
  mockup.
- **Cart holds `listLength` slots (3-6), not the mockup's 10.** Slot width already scales
  with list length in `slotWidth()`.
- **Shelf holds 12, not the mockup's 19.** Larger touch targets for the audience;
  distractor pressure comes from the twin mechanic, not from count.

## 12. Found during implementation

- **The sheet holds 62 items, not 60.** Rows run 10/10/10/10/10/12; `ShoppingList_items.docx`
  is right about row 6 and wrong about row 1. The grid slicing this spec first proposed
  would have cut row 6 in half, so the script uses connected-component labelling with
  small fragments merged into the nearest item instead.
- **The HINT tile and cart panel could not be used as art.** Both have live counts painted
  into them - a "2" on the tile, "0/10" on the tray - so they are drawn in CSS from the
  kit's palette. Only the clipboard, READY and DONE are raster UI.
- **The board was rendering off-centre.** The canvas wrapper used `margin: 0 auto` on an
  800px child, and auto margins collapse to zero once the child overflows its parent, so
  the board sat to the right of the viewport and clipped. Pre-existing, but the taller
  canvas made it worse, so the wrapper now centres with flex.

## 13. Out of scope

- `items-1.png` is not used. Only `items-2.png` seeds the pool, as instructed.
- `shopping-list-recall` is not modified or retired.
- No change to session flow, rotation, difficulty persistence or Firestore sync.
