# App Flow Redesign — Phase 1 (Design System) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Land the new visual system — brand assets, tokens, fonts, the two glossy button variants and the six shared chrome components — with nothing user-visible changed, so phase 2 can rebuild screens against a finished palette.

**Architecture:** Additive. The new palette is appended to `src/styles/tokens.ts` as a `BRAND` block; the existing `COLORS` / `TYPOGRAPHY` are untouched because fifteen shipped game boards draw on them. The handoff's chrome is heavy multi-layer gradients and inset shadows, which read badly as Tailwind arbitrary values, so it lives in a new `src/styles/brand.css` under `@layer components` and is consumed by class name. `Button` gains `green` and `blue` variants beside its existing three. A DEV-only gallery route renders every new component for visual verification.

**Tech Stack:** React 18, TypeScript, Vite 7, Tailwind 3, vitest (node environment), sharp (new devDependency, build-time only).

**Spec:** `docs/superpowers/specs/2026-09-02-app-flow-redesign-design.md`

**Design handoff (fidelity authority):** `App flow redesign clarification/design_handoff_app_flow_redesign/README.md`

## Global Constraints

- **Version bump every commit.** `CLAUDE.md` requires it. Every task's commit bumps the `patch` in `package.json`. Phase 1 is a patch series on 1.17.1.
- **`npm run lint` must not add errors.** There are 38 pre-existing errors; the gate is "no new ones", not "zero".
- **`npm run build` must pass** (`tsc -b && vite build`).
- **`npm test` must pass.** 32 files / 349 tests green at the start of this phase. It runs in the **`node`** environment with **no DOM library**, and only matches `src/**/__tests__/**/*.test.ts`. Pure modules get real tests; React components cannot be unit-tested here and are verified visually on the gallery route.
- **No user-visible change in this phase.** No existing screen, route or game may change behaviour. The gallery route is `import.meta.env.DEV`-only.
- **Never use an em dash** in code, comments, copy or commit messages. Use a plain dash.
- **Do not add a `Co-Authored-By` trailer** naming an agent to commit messages.
- **Category naming:** the handoff calls the third category "Planning". The codebase calls it `executive` and that is not changing. `executive` is always the key; "Planning" is only ever a display label behind a translation key.
- **The six marquee gameIds**, fixed for this whole redesign:
  `market-memory` (Shopping List, memory), `train-yard` (Station Master, memory),
  `spot-focus` (Spot Focus, attention), `garden-keeper` (Garden Keeper, attention),
  `serve-guests` (Tiffen Time, executive), `clear-the-way` (Free Me, executive).
- **Asset provenance:** raw art is committed under `assets-src/` (repo convention, see `.gitignore:36`). `design_handoff_*/` is gitignored and must never be committed. Shipped derivatives go in `public/`.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `assets-src/app-flow-redesign/` | Committed source art. Brand, category and game art at original size |
| `scripts/prepare-brand-assets.mjs` | One command that regenerates every `public/` derivative from `assets-src/`. Idempotent |
| `public/brand/`, `public/category/`, `public/games/` | Shipped derivatives |
| `src/lib/gameCatalog.ts` | The only map from `gameId` to display key, category, art paths and marquee flag |
| `src/lib/__tests__/gameCatalog.test.ts` | Tests for the above, including that every art path exists on disk |
| `src/styles/brand.css` | Every new chrome class. Gradients, bevels, inset shadows, the wave |
| `src/components/chrome/ScreenBlue.tsx` | The blue-gradient page frame, with the wave and the overflow guard |
| `src/components/chrome/WaveOverlay.tsx` | The decorative bottom wave alone |
| `src/components/chrome/CategoryBadge.tsx` | 132px white rounded badge holding a category icon |
| `src/components/chrome/ProgressBar.tsx` | The 2 s linear intro bar, reduced-motion aware |
| `src/components/chrome/GameRow.tsx` | Home's 74px-icon game row |
| `src/components/chrome/GameTile.tsx` | Free-play library tile |
| `src/components/chrome/ScreenTransition.tsx` | The handoff's motion table, in one place |
| `src/screens/dev/ChromeGallery.tsx` | DEV-only visual harness for all of the above |

**Modified:**

| File | Change |
|---|---|
| `src/styles/tokens.ts` | Append `BRAND` and `CATEGORY_BRAND`. Nothing removed |
| `src/styles/index.css` | Add Baloo 2 weights 400,500 to the existing font import; import `brand.css` |
| `src/components/ui/Button.tsx` | Add `green` and `blue` variants beside `primary`/`secondary`/`ghost` |
| `src/App.tsx` | Add the DEV-only `/dev/chrome` route |
| `package.json` | Add `sharp` devDependency and an `assets:brand` script; version bumps |
| `CLAUDE.md` | Correct the stale "No test suite exists yet" line |

**Deliberate deviation from the spec:** the spec called the gallery a "throwaway scratch route removed before the phase closes". It is kept instead, gated behind `import.meta.env.DEV` so it is tree-shaken out of production builds. Phases 2 and 3 need exactly this harness to check the same components under three languages and three text sizes, and rebuilding it twice is waste. Recorded here so the divergence is visible.

---

### Task 1: Brand assets into the repo and into `public/`

The handoff bundle is gitignored (`.gitignore:40`, `design_handoff_*/`), so the art must be relocated into `assets-src/` to survive. Two sources: the bundle holds web-sized brand, category and 240px game tiles; the sibling `Assets/` folder holds 1254px icons and 1080x1920 splash art, and is the only source with all six games.

Splash art must be converted. Six screens at 540x960 PNG is roughly 7 MB, on tablets whose wifi the codebase already treats as usually offline (`AppShell.tsx:86`). WebP at the same dimensions is roughly a tenth of that.

**Files:**
- Create: `assets-src/app-flow-redesign/{brand,category,games}/`
- Create: `scripts/prepare-brand-assets.mjs`
- Create: `public/brand/`, `public/category/`, `public/games/`
- Modify: `package.json` (add `sharp` devDependency, `assets:brand` script, version bump)

**Interfaces:**
- Consumes: nothing.
- Produces: the exact `public/` paths Task 2's catalog references:
  - `/brand/logo-launch.png`, `/brand/logo-navy.png`, `/brand/logo-onblue.png`, `/brand/tree-glyph.png`, `/brand/leaf.png`
  - `/category/ic-memory.png`, `/category/ic-attention.png`, `/category/ic-planning.png`
  - `/games/tile-{shopping,station,spot,garden,tiffen,freeme}.png`
  - `/games/splash-{shopping,station,spot,garden,tiffen,freeme}.webp`

- [ ] **Step 1: Confirm the source folder is present and unpack the two sources**

Run, from the repo root:

```bash
ls "App flow redesign clarification/Assets"
ls "App flow redesign clarification/design_handoff_app_flow_redesign/assets"
```

Expected: the first lists six `GameSplashscreen_*.png` and six `UI_icon_*.png`; the second lists `logo-*.png`, `ic-*.png`, `game-*.png`, three `splash-*.png`, `leaf.png`, `tree-glyph.png`.

If either is missing, stop: the art has not been dropped into the working copy and nothing below can run.

- [ ] **Step 2: Copy source art into `assets-src/`**

The bundle's `game-*.png` (240x240) are already the web-sized derivatives of `Assets/UI_icon_*` (1254x1254), so both are kept: the small ones ship, the large ones are the archive.

```bash
mkdir -p assets-src/app-flow-redesign/brand \
         assets-src/app-flow-redesign/category \
         assets-src/app-flow-redesign/games

SRC_BUNDLE="App flow redesign clarification/design_handoff_app_flow_redesign/assets"
SRC_RAW="App flow redesign clarification/Assets"

cp "$SRC_BUNDLE"/logo-launch.png "$SRC_BUNDLE"/logo-navy.png \
   "$SRC_BUNDLE"/logo-onblue.png "$SRC_BUNDLE"/tree-glyph.png \
   "$SRC_BUNDLE"/leaf.png                     assets-src/app-flow-redesign/brand/
cp "$SRC_BUNDLE"/ic-memory.png "$SRC_BUNDLE"/ic-attention.png \
   "$SRC_BUNDLE"/ic-planning.png              assets-src/app-flow-redesign/category/
cp "$SRC_BUNDLE"/game-*.png                   assets-src/app-flow-redesign/games/
cp "$SRC_BUNDLE"/splash-shopping.png "$SRC_BUNDLE"/splash-spot.png \
   "$SRC_BUNDLE"/splash-tiffen.png            assets-src/app-flow-redesign/games/
cp "$SRC_RAW"/GameSplashscreen_StationMaster.png \
   "$SRC_RAW"/GameSplashscreen_GardenKeeper.png \
   "$SRC_RAW"/GameSplashscreen_FreeMe.png     assets-src/app-flow-redesign/games/
```

Do **not** copy `icon-brain.png` or the legacy `tile-*.png`; the spec supersedes them. Do not copy anything from `__MACOSX/`.

- [ ] **Step 3: Add sharp**

```bash
npm install --save-dev sharp
```

Expected: installs a prebuilt binary, no compiler needed. Confirm with `node -e "require('sharp');console.log('ok')"` printing `ok`.

- [ ] **Step 4: Write the asset script**

Create `scripts/prepare-brand-assets.mjs`:

```js
/**
 * Regenerates every public/ derivative of the app-flow-redesign art from the
 * committed sources in assets-src/. Idempotent - safe to re-run.
 *
 * Splash art is the reason this script exists rather than a plain copy. The
 * sources are 540x960 and 1080x1920 PNGs at 1-4 MB each; six of those is a ~7 MB
 * payload on care-home wifi the app already assumes is usually offline. WebP at
 * 540x960 lands around a tenth of that with no visible loss at the size the
 * screens actually render.
 */
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-src', 'app-flow-redesign');
const OUT = join(ROOT, 'public');

const SPLASH_WIDTH = 540;
const SPLASH_HEIGHT = 960;
const SPLASH_QUALITY = 82;

/** Copied as-is: already web-sized, and PNG transparency is load-bearing. */
const COPY = [
  ['brand/logo-launch.png', 'brand/logo-launch.png'],
  ['brand/logo-navy.png', 'brand/logo-navy.png'],
  ['brand/logo-onblue.png', 'brand/logo-onblue.png'],
  ['brand/tree-glyph.png', 'brand/tree-glyph.png'],
  ['brand/leaf.png', 'brand/leaf.png'],
  ['category/ic-memory.png', 'category/ic-memory.png'],
  ['category/ic-attention.png', 'category/ic-attention.png'],
  ['category/ic-planning.png', 'category/ic-planning.png'],
  ['games/game-shopping.png', 'games/tile-shopping.png'],
  ['games/game-station.png', 'games/tile-station.png'],
  ['games/game-spot.png', 'games/tile-spot.png'],
  ['games/game-garden.png', 'games/tile-garden.png'],
  ['games/game-tiffen.png', 'games/tile-tiffen.png'],
  ['games/game-freeme.png', 'games/tile-freeme.png'],
];

/** Downscaled and re-encoded to WebP. */
const SPLASH = [
  ['games/splash-shopping.png', 'games/splash-shopping.webp'],
  ['games/splash-spot.png', 'games/splash-spot.webp'],
  ['games/splash-tiffen.png', 'games/splash-tiffen.webp'],
  ['games/GameSplashscreen_StationMaster.png', 'games/splash-station.webp'],
  ['games/GameSplashscreen_GardenKeeper.png', 'games/splash-garden.webp'],
  ['games/GameSplashscreen_FreeMe.png', 'games/splash-freeme.webp'],
];

async function ensureDirs() {
  for (const d of ['brand', 'category', 'games']) {
    await mkdir(join(OUT, d), { recursive: true });
  }
}

async function run() {
  await ensureDirs();

  for (const [from, to] of COPY) {
    await copyFile(join(SRC, from), join(OUT, to));
    console.log(`copy  ${to}`);
  }

  for (const [from, to] of SPLASH) {
    const info = await sharp(join(SRC, from))
      .resize(SPLASH_WIDTH, SPLASH_HEIGHT, { fit: 'cover' })
      .webp({ quality: SPLASH_QUALITY })
      .toFile(join(OUT, to));
    console.log(`webp  ${to}  ${(info.size / 1024).toFixed(0)} KB`);
  }

  const written = await readdir(join(OUT, 'games'));
  const missing = [...COPY, ...SPLASH]
    .map(([, to]) => to)
    .filter((p) => p.startsWith('games/'))
    .filter((p) => !written.includes(p.slice('games/'.length)));
  if (missing.length) {
    console.error('missing outputs:', missing);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
```

- [ ] **Step 5: Add the npm script and bump the version**

In `package.json`, add to `"scripts"`:

```json
"assets:brand": "node scripts/prepare-brand-assets.mjs"
```

and set `"version": "1.17.2"`.

- [ ] **Step 6: Run it and check the payload**

```bash
npm run assets:brand
du -sh public/games public/brand public/category
```

Expected: 20 lines of `copy`/`webp` output with no errors, and each `webp` line reporting well under 200 KB. If any splash lands over 250 KB, drop `SPLASH_QUALITY` to 75 and re-run rather than shipping it.

- [ ] **Step 7: Confirm nothing ignored got committed**

```bash
git status --short
git check-ignore -v assets-src/app-flow-redesign/brand/leaf.png || echo "assets-src is tracked - correct"
```

Expected: `assets-src/app-flow-redesign/` and `public/{brand,category,games}/` show as untracked additions; the `check-ignore` prints the "correct" line. The `App flow redesign clarification/` folder must **not** be staged in the next step.

- [ ] **Step 8: Commit**

```bash
git add assets-src/app-flow-redesign public/brand public/category public/games \
        scripts/prepare-brand-assets.mjs package.json package-lock.json
git commit -m "feat(assets): the app-flow-redesign brand, category and game art

Source art lands in assets-src/ per repo convention, since the handoff
bundle folder is gitignored. scripts/prepare-brand-assets.mjs regenerates
every public/ derivative from it.

Splash art is converted to WebP at 540x960 rather than copied. Six 540x960
PNGs is around 7 MB, which is the wrong payload for tablets the app already
assumes are usually offline."
```

---

### Task 2: The game catalog

One module that owns the `gameId` to art/label/category mapping. It replaces the two stale, duplicated `GAME_BY_CATEGORY` maps at `SessionManager.tsx:8-12` and `DailyQuestionnaire.tsx:9-13` — but only in phase 2. This task **adds** the catalog and leaves both stale maps in place, because deleting them changes session behaviour and phase 1 ships no behaviour change.

**Files:**
- Create: `src/lib/gameCatalog.ts`
- Create: `src/lib/__tests__/gameCatalog.test.ts`
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: the `public/` paths produced by Task 1.
- Produces:
  - `type GameCatalogEntry = { id: string; category: GameCategory; nameKey: string; tile: string | null; splash: string | null; marquee: boolean }`
  - `const GAME_CATALOG: Record<string, GameCatalogEntry>`
  - `function getGame(id: string): GameCatalogEntry | undefined`
  - `function marqueeGames(): GameCatalogEntry[]`
  - `function marqueeByCategory(category: GameCategory): GameCatalogEntry[]`
  - `function categoryIcon(category: GameCategory): string`
  - Tasks 6 and 7 (`GameRow`, `GameTile`) consume `GameCatalogEntry` directly.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/gameCatalog.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  GAME_CATALOG, getGame, marqueeGames, marqueeByCategory, categoryIcon,
} from '../gameCatalog';

const PUBLIC = join(process.cwd(), 'public');
const asFile = (webPath: string) => join(PUBLIC, webPath.replace(/^\//, ''));

describe('gameCatalog', () => {
  it('names exactly the six marquee games from the spec', () => {
    expect(marqueeGames().map((g) => g.id).sort()).toEqual([
      'clear-the-way', 'garden-keeper', 'market-memory',
      'serve-guests', 'spot-focus', 'train-yard',
    ]);
  });

  it('gives each category exactly two marquee games', () => {
    expect(marqueeByCategory('memory').map((g) => g.id)).toEqual(['market-memory', 'train-yard']);
    expect(marqueeByCategory('attention').map((g) => g.id)).toEqual(['spot-focus', 'garden-keeper']);
    expect(marqueeByCategory('executive').map((g) => g.id)).toEqual(['serve-guests', 'clear-the-way']);
  });

  it('gives every marquee game both a tile and a splash', () => {
    for (const g of marqueeGames()) {
      expect(g.tile, `${g.id} tile`).toBeTruthy();
      expect(g.splash, `${g.id} splash`).toBeTruthy();
    }
  });

  it('gives every non-marquee game no art, so the grid falls back to the category icon', () => {
    const rest = Object.values(GAME_CATALOG).filter((g) => !g.marquee);
    expect(rest.length).toBeGreaterThan(0);
    for (const g of rest) {
      expect(g.tile, `${g.id} tile`).toBeNull();
      expect(g.splash, `${g.id} splash`).toBeNull();
    }
  });

  it('points every art path at a file that actually exists', () => {
    for (const g of marqueeGames()) {
      expect(existsSync(asFile(g.tile!)), `missing ${g.tile}`).toBe(true);
      expect(existsSync(asFile(g.splash!)), `missing ${g.splash}`).toBe(true);
    }
    for (const c of ['memory', 'attention', 'executive'] as const) {
      expect(existsSync(asFile(categoryIcon(c))), `missing icon for ${c}`).toBe(true);
    }
  });

  it('uses a translation key for every display name, never a literal', () => {
    for (const g of Object.values(GAME_CATALOG)) {
      expect(g.nameKey, `${g.id} nameKey`).toMatch(/^game\.[a-z0-9-]+\.name$/);
    }
  });

  it('resolves a known game and returns undefined for an unknown one', () => {
    expect(getGame('market-memory')?.category).toBe('memory');
    expect(getGame('no-such-game')).toBeUndefined();
  });
});
```

- [ ] **Step 2: Run it to make sure it fails**

Run: `npx vitest run src/lib/__tests__/gameCatalog.test.ts`
Expected: FAIL — cannot resolve `../gameCatalog`.

- [ ] **Step 3: Write the catalog**

Create `src/lib/gameCatalog.ts`:

```ts
import type { GameCategory } from '../styles/tokens';

/**
 * The single map from a gameId to how it is presented: display key, category,
 * and art. Home, the free-play grid, the game title screen, the session summary
 * and the trio picker all read from here.
 *
 * The handoff calls the third category "Planning". The store and the game
 * registry call it `executive` and that is not changing, so `executive` is the
 * key everywhere and "Planning" only ever appears behind a translation key.
 *
 * `marquee` marks the six games with commissioned art that the daily session
 * draws from. Everything else is reachable from free play only, and renders
 * with its category icon rather than bespoke art.
 */
export interface GameCatalogEntry {
  id: string;
  category: GameCategory;
  /** i18n key, `game.<id>.name`. Never a literal - see the i18n rule in the spec. */
  nameKey: string;
  /** Home row / free-play tile art, or null to fall back to the category icon. */
  tile: string | null;
  /** Full-bleed game title screen art, or null when the game has none. */
  splash: string | null;
  marquee: boolean;
}

const CATEGORY_ICONS: Record<GameCategory, string> = {
  memory:    '/category/ic-memory.png',
  attention: '/category/ic-attention.png',
  executive: '/category/ic-planning.png',
};

function marquee(
  id: string, category: GameCategory, art: string,
): GameCatalogEntry {
  return {
    id,
    category,
    nameKey: `game.${id}.name`,
    tile: `/games/tile-${art}.png`,
    splash: `/games/splash-${art}.webp`,
    marquee: true,
  };
}

function extra(id: string, category: GameCategory): GameCatalogEntry {
  return { id, category, nameKey: `game.${id}.name`, tile: null, splash: null, marquee: false };
}

/**
 * Keys match src/screens/GameRouter.tsx's GAME_REGISTRY exactly. A game in the
 * registry but missing here renders with no name and no art, so the two lists
 * must be changed together.
 */
export const GAME_CATALOG: Record<string, GameCatalogEntry> = {
  // The six with commissioned art, two per category.
  'market-memory':        marquee('market-memory',       'memory',    'shopping'),
  'train-yard':           marquee('train-yard',          'memory',    'station'),
  'spot-focus':           marquee('spot-focus',          'attention', 'spot'),
  'garden-keeper':        marquee('garden-keeper',       'attention', 'garden'),
  'serve-guests':         marquee('serve-guests',        'executive', 'tiffen'),
  'clear-the-way':        marquee('clear-the-way',       'executive', 'freeme'),

  // Free play only.
  'remember-match':       extra('remember-match',        'memory'),
  'picture-postcard':     extra('picture-postcard',      'memory'),
  'shopping-list-recall': extra('shopping-list-recall',  'memory'),
  'sequence-repeat':      extra('sequence-repeat',       'memory'),
  'word-search':          extra('word-search',           'attention'),
  'focus-filter':         extra('focus-filter',          'attention'),
  'morning-routine-quest':extra('morning-routine-quest', 'executive'),
  'recipe-builder':       extra('recipe-builder',        'executive'),
  'garden-sequencer':     extra('garden-sequencer',      'executive'),
};

/** Declaration order, which is the order the marquee games are offered in. */
const ORDER = Object.keys(GAME_CATALOG);

export function getGame(id: string): GameCatalogEntry | undefined {
  return GAME_CATALOG[id];
}

export function marqueeGames(): GameCatalogEntry[] {
  return ORDER.map((id) => GAME_CATALOG[id]).filter((g) => g.marquee);
}

export function marqueeByCategory(category: GameCategory): GameCatalogEntry[] {
  return marqueeGames().filter((g) => g.category === category);
}

export function allByCategory(category: GameCategory): GameCatalogEntry[] {
  return ORDER.map((id) => GAME_CATALOG[id]).filter((g) => g.category === category);
}

export function categoryIcon(category: GameCategory): string {
  return CATEGORY_ICONS[category];
}

/** Tile art if the game has any, otherwise its category icon. */
export function tileArt(game: GameCatalogEntry): string {
  return game.tile ?? CATEGORY_ICONS[game.category];
}
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/lib/__tests__/gameCatalog.test.ts`
Expected: PASS, 7 tests.

Then run the whole suite to confirm nothing regressed:

Run: `npm test`
Expected: 33 files passed, 356 tests passed.

- [ ] **Step 5: Verify the catalog covers the registry**

Run:

```bash
node -e "
const src = require('fs').readFileSync('src/screens/GameRouter.tsx','utf8');
const reg = [...src.matchAll(/^\s*'([a-z-]+)':\s*\{\s*component:/gm)].map(m=>m[1]);
const cat = require('fs').readFileSync('src/lib/gameCatalog.ts','utf8');
const missing = reg.filter(id => !cat.includes(\"'\"+id+\"'\"));
console.log('registry:', reg.length, 'missing from catalog:', missing);
"
```

Expected: `registry: 15 missing from catalog: []`.

- [ ] **Step 6: Commit**

Bump `"version"` to `1.17.3`, then:

```bash
git add src/lib/gameCatalog.ts src/lib/__tests__/gameCatalog.test.ts package.json
git commit -m "feat(chrome): the game catalog

One map from gameId to display key, category and art, covering all fifteen
registered games. The six with commissioned art are flagged marquee; the
rest render with their category icon in free play.

The two stale GAME_BY_CATEGORY maps in SessionManager and DailyQuestionnaire
are left alone here. Both omit serve-guests and clear-the-way, which this
catalog makes marquee, but replacing them changes session behaviour and
phase 1 ships none."
```

---

### Task 3: Brand tokens, fonts, screen chrome CSS and the DEV gallery

The first task with something to look at, so it also stands up the gallery route every later task verifies on.

**Files:**
- Modify: `src/styles/tokens.ts` (append only)
- Create: `src/styles/brand.css`
- Modify: `src/styles/index.css:1` (font weights) and its imports
- Create: `src/screens/dev/ChromeGallery.tsx`
- Modify: `src/App.tsx` (DEV-only route)
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: Task 1's asset paths, Task 2's `categoryIcon`.
- Produces:
  - `BRAND` and `CATEGORY_BRAND` from `src/styles/tokens.ts`
  - `type CategoryBrand = { accent: string; band: string; label: string; gradient: string; icon: string }`
  - CSS classes `.screen-blue`, `.screen-blue--splash`, `.wave-overlay`, `.font-baloo`
  - The gallery at `/dev/chrome`, which Tasks 4-7 each append a section to.

- [ ] **Step 1: Append the brand tokens**

Add to the **end** of `src/styles/tokens.ts`. Change nothing above it — `COLORS` and `TYPOGRAPHY` are load-bearing for fifteen game boards.

```ts
/* ─── App flow redesign (2026-09) ──────────────────────────────────────────────
 * The chrome palette. Deliberately separate from COLORS above, which the game
 * boards use and which this redesign does not touch. Two palettes is the honest
 * shape here: chrome and board are two systems.
 * Source of truth: the design handoff README, "Design tokens".
 */
export const BRAND = {
  /** Radial screen background stops, outermost first. */
  screen:       ['#45CFEE', '#2A86DE', '#1B5AD0', '#0E2AA8'],
  navy:         '#10237E',
  /** Home / summary row surfaces. */
  surface:       'rgba(9,26,140,0.5)',
  surfaceStrong: 'rgba(9,26,140,0.55)',
  card:          'rgba(255,255,255,0.94)',
  wave:          'rgba(6,18,140,0.4)',
  /** Secondary text on blue. */
  cyan:          '#6FE8FF',
  /** Row headings on blue. */
  cyanBright:    '#57E7FF',
  /** Muted labels, e.g. the "another day" strip. */
  muted:         '#8FB8E8',
  /** Level and success figures. */
  lime:          '#C6F87A',
} as const;

export interface CategoryBrand {
  /** Title word, progress fill, icon accent. */
  accent: string;
  /** The full-width practice band behind white text. */
  band: string;
  /** Body copy on the pastel intro background. */
  label: string;
  /** The intro screen's vertical pastel wash. */
  gradient: string;
  icon: string;
}

/*
 * Keyed by the store's category ids. The handoff calls `executive` "Planning";
 * that name lives only in the i18n bundle, never as a key.
 */
export const CATEGORY_BRAND: Record<GameCategory, CategoryBrand> = {
  memory: {
    accent:   '#7E4A9D',
    band:     '#7E4A9D',
    label:    '#46345F',
    gradient: 'linear-gradient(180deg, #F8E7D6 0%, #EBDCF0 26%, #D5C2EC 52%, #BCA7E6 72%, #A895DE 100%)',
    icon:     '/category/ic-memory.png',
  },
  attention: {
    accent:   '#1668C4',
    band:     '#1C6BB0',
    label:    '#1B3A5E',
    gradient: 'linear-gradient(180deg, #FAF0DE 0%, #E4EEF9 26%, #C3DBF5 52%, #A2C6EF 72%, #8AB6EA 100%)',
    icon:     '/category/ic-attention.png',
  },
  executive: {
    accent:   '#2E7D4F',
    band:     '#2E7D4F',
    label:    '#1E4A32',
    gradient: 'linear-gradient(180deg, #FAF2DC 0%, #E8F3DE 26%, #CBE9CB 52%, #A9DCBB 72%, #92D2B2 100%)',
    icon:     '/category/ic-planning.png',
  },
};
```

- [ ] **Step 2: Add the Baloo 2 weights**

`src/styles/index.css:1` currently requests `Baloo+2:wght@600;700;800`. The handoff uses 400 and 500 as well. Replace only the `Baloo+2` segment of that one URL:

```
family=Baloo+2:wght@400;500;600;700;800
```

Leave every other family in the URL untouched.

- [ ] **Step 3: Write the chrome CSS**

Create `src/styles/brand.css`:

```css
/*
 * App flow redesign chrome. These are multi-layer gradients, bevel border-box
 * fills and stacked inset shadows; as Tailwind arbitrary values they are
 * unreadable and unmaintainable, so they live here and are used by class name.
 * Values are verbatim from the design handoff README.
 */

@layer components {
  .font-baloo {
    font-family: 'Baloo 2', 'Noto Sans Devanagari', 'Noto Sans Kannada', sans-serif;
  }

  /* ─── Screen background ─────────────────────────────────────────────────── */

  .screen-blue {
    position: relative;
    overflow-x: hidden;
    background: radial-gradient(
      120% 60% at 50% -6%,
      #45CFEE 0%, #2A86DE 34%, #1B5AD0 62%, #0E2AA8 100%
    );
  }

  /* The splash screen alone uses a taller, differently-stopped wash. */
  .screen-blue--splash {
    background: radial-gradient(
      120% 68% at 50% -8%,
      #45CFEE 0%, #2A86DE 30%, #1B5AD0 58%, #0E2AA8 100%
    );
  }

  /*
   * The decorative bottom wave. `pointer-events: none` is not cosmetic: the
   * handoff's own prototype had this element swallowing every button click
   * beneath it, and the README names this as the preferred fix over sprinkling
   * `position: relative` on each button.
   */
  .wave-overlay {
    position: absolute;
    left: -10%;
    right: -10%;
    bottom: 0;
    height: 120px;
    border-radius: 50% 50% 0 0 / 75px 75px 0 0;
    background: rgba(6, 18, 140, 0.4);
    pointer-events: none;
  }

  .wave-overlay--tall { height: 140px; }

  /* ─── Buttons ───────────────────────────────────────────────────────────── */

  .btn-brand {
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12px;
    border-radius: 34px;
    border: 5px solid transparent;
    font-family: 'Baloo 2', 'Noto Sans Devanagari', 'Noto Sans Kannada', sans-serif;
    letter-spacing: 0.01em;
    transition: transform 80ms ease, box-shadow 80ms ease;
    /*
     * The handoff sizes each button in px so the label never wraps. That does
     * not survive Hindi or Kannada, so the px figure becomes a floor and the
     * button grows. See the i18n note in the spec.
     */
    padding-inline: 22px;
  }

  .btn-brand:focus-visible {
    outline: 3px solid #FFFFFF;
    outline-offset: 2px;
  }

  .btn-brand:disabled {
    filter: grayscale(0.7);
    opacity: 0.5;
  }

  .btn-green {
    background:
      linear-gradient(180deg, #8FC93F 0%, #6EB22B 44%, #4C8916 100%) padding-box,
      linear-gradient(180deg, #F6E183 0%, #D8AE3E 38%, #9A6A1E 100%) border-box;
    color: #F7F2E0;
    font-weight: 800;
    text-shadow:
      0 3px 0 #2E5C10,
      0 -2px 0 rgba(46, 92, 16, 0.5),
      2px 0 0 rgba(46, 92, 16, 0.5),
      -2px 0 0 rgba(46, 92, 16, 0.5);
    box-shadow:
      inset 0 0 0 2px rgba(255, 255, 255, 0.22),
      inset 0 4px 8px rgba(255, 255, 255, 0.28),
      inset 0 -8px 12px rgba(30, 62, 8, 0.35),
      0 10px 18px rgba(0, 0, 0, 0.42);
  }

  .btn-blue {
    background:
      linear-gradient(180deg, #6FB4F5 0%, #3B84E8 52%, #2258CE 100%) padding-box,
      linear-gradient(180deg, #FFFFFF 0%, #F2F6FC 55%, #C9D8EE 100%) border-box;
    color: #FFFFFF;
    font-weight: 700;
    text-shadow: 0 3px 3px rgba(8, 32, 105, 0.55);
    box-shadow:
      inset 0 4px 10px rgba(255, 255, 255, 0.3),
      inset 0 -8px 12px rgba(10, 40, 120, 0.3),
      0 10px 18px rgba(0, 0, 0, 0.38);
  }

  .btn-green:not(:disabled):active { transform: translateY(3px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.42); }
  .btn-blue:not(:disabled):active  { transform: translateY(3px); box-shadow: 0 4px 8px rgba(0, 0, 0, 0.38); }
}

@media (prefers-reduced-motion: reduce) {
  .btn-brand { transition: none; }
  .btn-green:not(:disabled):active,
  .btn-blue:not(:disabled):active { transform: none; }
}
```

- [ ] **Step 4: Import it**

In `src/styles/index.css`, after the three `@tailwind` directives (so `@layer components` resolves), add:

```css
@import './brand.css';
```

Note: CSS `@import` must precede other rules, but PostCSS with Tailwind hoists these correctly. If the build warns about import order, move the line directly beneath the existing Google Fonts `@import` at line 1 instead.

- [ ] **Step 5: Create the gallery**

Create `src/screens/dev/ChromeGallery.tsx`:

```tsx
/**
 * DEV-only visual harness for the redesign chrome. Not reachable in a
 * production build - App.tsx gates the route on import.meta.env.DEV.
 *
 * Kept rather than thrown away after phase 1 (a deliberate divergence from the
 * spec, recorded in the plan): phases 2 and 3 need exactly this surface to
 * check the same components under three languages and three text sizes.
 */
import { BRAND, CATEGORY_BRAND } from '../../styles/tokens';
import type { GameCategory } from '../../styles/tokens';

const CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section style={{ padding: '20px' }}>
      <h2 className="font-baloo" style={{ color: '#fff', fontSize: 21, fontWeight: 700, marginBottom: 12 }}>
        {title}
      </h2>
      {children}
    </section>
  );
}

export default function ChromeGallery() {
  return (
    <div className="screen-blue" style={{ minHeight: '100%' }}>
      <Section title="Brand palette">
        <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
          {[...BRAND.screen, BRAND.navy, BRAND.cyan, BRAND.cyanBright, BRAND.muted, BRAND.lime].map((c) => (
            <div key={c} style={{ width: 72 }}>
              <div style={{ height: 44, borderRadius: 10, background: c, border: '1px solid rgba(255,255,255,0.3)' }} />
              <p style={{ color: '#fff', fontSize: 10, marginTop: 4 }}>{c}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section title="Category palette">
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {CATEGORIES.map((c) => {
            const b = CATEGORY_BRAND[c];
            return (
              <div key={c} style={{ background: b.gradient, borderRadius: 16, padding: 12 }}>
                <p className="font-baloo" style={{ color: b.accent, fontWeight: 700, fontSize: 19 }}>{c}</p>
                <p style={{ color: b.label, fontSize: 15 }}>label colour on the category wash</p>
                <div style={{ background: b.band, color: '#fff', fontWeight: 700, fontSize: 16, padding: '10px 14px', borderRadius: 10, marginTop: 8 }}>
                  practice band
                </div>
              </div>
            );
          })}
        </div>
      </Section>

      {/* Tasks 4-7 append their sections here. */}

      <div className="wave-overlay" aria-hidden="true" />
    </div>
  );
}
```

- [ ] **Step 6: Wire the DEV route**

In `src/App.tsx`, add the import and the guarded route. Place the route **before** the `path="*"` fallback:

```tsx
import ChromeGallery from './screens/dev/ChromeGallery';
```

```tsx
{/* DEV-only chrome harness. Tree-shaken out of production by the env guard. */}
{import.meta.env.DEV && (
  <Route path="/dev/chrome" element={<ChromeGallery />} />
)}
```

- [ ] **Step 7: Verify**

```bash
npm run build
npm run lint
npm test
```

Expected: build clean, no new lint errors (still 38), 356 tests pass.

Then `npm run dev` and open `http://localhost:5173/dev/chrome`. Confirm by eye:
- the background is a blue radial wash, brightest at the top centre;
- the wave sits across the bottom;
- all three category washes render, each with its own accent, label and band colour;
- headings render in Baloo 2 (rounded, noticeably not Inter).

Then confirm the gallery is genuinely excluded from production:

```bash
npm run build && grep -rl "ChromeGallery" dist/assets/ || echo "not in the production bundle - correct"
```

Expected: the "correct" line.

- [ ] **Step 8: Commit**

Bump `"version"` to `1.17.4`, then:

```bash
git add src/styles/tokens.ts src/styles/brand.css src/styles/index.css \
        src/screens/dev/ChromeGallery.tsx src/App.tsx package.json
git commit -m "feat(chrome): brand tokens, chrome CSS and a DEV gallery

BRAND and CATEGORY_BRAND are appended to tokens.ts; COLORS and TYPOGRAPHY
are untouched, because fifteen shipped boards draw on them and boards are
out of scope for this redesign.

The screen wash, wave and button bevels live in brand.css rather than as
Tailwind arbitrary values - they are multi-layer gradients and stacked
inset shadows, and inline they are unreadable. The wave carries
pointer-events: none, which the handoff calls out as the fix for its own
prototype swallowing button clicks.

/dev/chrome renders it all, gated on import.meta.env.DEV."
```

---

### Task 4: The green and blue button variants

**Files:**
- Modify: `src/components/ui/Button.tsx`
- Modify: `src/screens/dev/ChromeGallery.tsx`
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: `.btn-brand`, `.btn-green`, `.btn-blue` from Task 3.
- Produces: `<Button variant="green" | "blue" leading={...} trailing={...} />`. `leading`/`trailing` are `ReactNode` slots. `green` supplies the two flanking leaves by default; pass `leading={null}` to suppress them. Tasks in phases 2 and 3 use these for every Continue, Next, Let's Begin, Start Session, Back to Home, PLAY, Get Started, Sign-in and sign-out button.

- [ ] **Step 1: Extend Button**

Replace `src/components/ui/Button.tsx` with:

```tsx
import React from 'react';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary' | 'ghost' | 'green' | 'blue';
  size?: 'md' | 'lg';
  fullWidth?: boolean;
  /**
   * Glyph before the label. `green` defaults to a leaf; pass null to suppress.
   * Ignored by the three legacy variants.
   */
  leading?: React.ReactNode;
  /** Glyph after the label. `green` defaults to a mirrored leaf. */
  trailing?: React.ReactNode;
}

const LEAF = '/brand/leaf.png';

function Leaf({ mirrored = false }: { mirrored?: boolean }) {
  return (
    <img
      src={LEAF}
      alt=""
      aria-hidden="true"
      width={30}
      height={30}
      style={{ width: 30, height: 30, flexShrink: 0, transform: mirrored ? 'scaleX(-1)' : undefined }}
    />
  );
}

export function Button({
  variant = 'primary',
  size = 'lg',
  fullWidth = false,
  className = '',
  leading,
  trailing,
  children,
  ...rest
}: ButtonProps) {
  const isBrand = variant === 'green' || variant === 'blue';

  if (isBrand) {
    /*
     * The handoff gives each brand button a fixed px width so the label never
     * wraps. Hindi and Kannada do not fit those widths, so min-height is honoured
     * and width is left to grow. See the i18n divergence in the spec.
     */
    const lead = leading === undefined && variant === 'green' ? <Leaf /> : leading;
    const trail = trailing === undefined && variant === 'green' ? <Leaf mirrored /> : trailing;

    return (
      <button
        className={`btn-brand btn-${variant} ${fullWidth ? 'w-full' : ''} ${className}`}
        style={{ minHeight: size === 'lg' ? 66 : 58, fontSize: size === 'lg' ? 21 : 19 }}
        {...rest}
      >
        {lead}
        <span>{children}</span>
        {trail}
      </button>
    );
  }

  const base =
    'inline-flex items-center justify-center font-semibold rounded-2xl transition-all duration-150 active:scale-95 cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed';
  const sizeClass = size === 'lg' ? 'min-h-[80px] px-8 py-4 text-btn' : 'min-h-[56px] px-6 py-3 text-body-md';
  const widthClass = fullWidth ? 'w-full' : '';

  const variantClass = {
    primary:   'bg-primary-blue text-white hover:bg-blue-700',
    secondary: 'bg-card-bg text-primary-blue border-2 border-primary-blue hover:bg-hover-state',
    ghost:     'text-primary-blue hover:bg-hover-state',
  }[variant];

  return (
    <button
      className={`${base} ${sizeClass} ${widthClass} ${variantClass} ${className}`}
      {...rest}
    >
      {children}
    </button>
  );
}
```

- [ ] **Step 2: Add the gallery section**

In `ChromeGallery.tsx`, add the import:

```tsx
import { Button } from '../../components/ui/Button';
```

and replace the `{/* Tasks 4-7 append their sections here. */}` comment with:

```tsx
<Section title="Buttons">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <Button variant="green">Start Session</Button>
    <Button variant="green" size="md">Let&apos;s Begin</Button>
    <Button variant="green" disabled>Disabled</Button>
    <Button variant="blue" leading={<img src="/brand/tree-glyph.png" alt="" aria-hidden="true" width={34} height={34} />}>
      Get Started
    </Button>
    <Button variant="blue" size="md">Sign in</Button>
    <Button variant="blue" fullWidth trailing={<span style={{ fontSize: 15 }}>&#9660;</span>}>
      Prescribed by
    </Button>
    <p style={{ color: '#fff', fontSize: 15 }}>Legacy variants, unchanged:</p>
    <Button variant="primary" size="md">Primary</Button>
    <Button variant="secondary" size="md">Secondary</Button>
  </div>
</Section>

{/* Tasks 5-7 append their sections here. */}
```

- [ ] **Step 3: Verify**

```bash
npm run build
npm run lint
npm test
```

Expected: build clean, no new lint errors, 356 tests pass.

Then on `/dev/chrome` confirm by eye:
- the green button has a gold bevel border, a leaf either side, and embossed cream text;
- pressing it moves it down about 3px and the shadow tightens;
- the disabled one is desaturated and does not move on press;
- tabbing to a button draws a white outline;
- the blue button has a white bevel and the tree glyph sits left of "Get Started";
- the two legacy variants look exactly as they do elsewhere in the app.

Then confirm nothing else regressed: open `/` and `/app/settings` and confirm every existing button is unchanged.

- [ ] **Step 4: Commit**

Bump `"version"` to `1.17.5`, then:

```bash
git add src/components/ui/Button.tsx src/screens/dev/ChromeGallery.tsx package.json
git commit -m "feat(chrome): green and blue button variants

Added beside the existing primary/secondary/ghost, which are untouched so
in-board UI keeps working. The green variant supplies its flanking leaves
by default and the blue takes an optional leading glyph.

The handoff's fixed px widths become a min-height only: those widths do not
fit the Hindi or Kannada labels."
```

---

### Task 5: ScreenBlue, WaveOverlay, CategoryBadge and ProgressBar

Four small presentational components. They ship together because none is independently useful and a reviewer would accept or reject the set.

**Files:**
- Create: `src/components/chrome/ScreenBlue.tsx`, `WaveOverlay.tsx`, `CategoryBadge.tsx`, `ProgressBar.tsx`
- Modify: `src/screens/dev/ChromeGallery.tsx`
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: Task 3's CSS classes and `CATEGORY_BRAND`; Task 2's `categoryIcon`; the existing `useReducedMotion` at `src/lib/useReducedMotion.ts`.
- Produces:
  - `<ScreenBlue variant?: 'default' | 'splash'; className?: string; children>` — a full-height flex column with the wash and the wave already in place.
  - `<WaveOverlay tall?: boolean />`
  - `<CategoryBadge category: GameCategory; size?: number />`
  - `<ProgressBar durationMs: number; color: string; trackColor: string; running: boolean />`
  - Phase 2's `CategoryIntro` composes all four.

- [ ] **Step 1: WaveOverlay**

Create `src/components/chrome/WaveOverlay.tsx`:

```tsx
/**
 * The decorative bottom wave. Always last in DOM order within its screen, and
 * always pointer-events: none - the handoff's prototype had this element eating
 * every click on the buttons beneath it.
 */
export default function WaveOverlay({ tall = false }: { tall?: boolean }) {
  return <div className={`wave-overlay${tall ? ' wave-overlay--tall' : ''}`} aria-hidden="true" />;
}
```

- [ ] **Step 2: ScreenBlue**

Create `src/components/chrome/ScreenBlue.tsx`:

```tsx
import type { ReactNode } from 'react';
import WaveOverlay from './WaveOverlay';

interface Props {
  /** `splash` uses the taller, differently-stopped wash and the taller wave. */
  variant?: 'default' | 'splash';
  className?: string;
  children: ReactNode;
}

/**
 * The standard blue page frame: radial wash, bottom wave, horizontal overflow
 * clipped so the wave's -10% inset cannot produce sideways scroll.
 *
 * It is a flex column filling its parent, because AppShell renders every screen
 * inside `flex-1 min-h-0 flex flex-col` and a screen that does not fill it
 * leaves AppShell's own bg-app-bg showing at the edges.
 */
export default function ScreenBlue({ variant = 'default', className = '', children }: Props) {
  return (
    <div
      className={`screen-blue${variant === 'splash' ? ' screen-blue--splash' : ''} flex-1 min-h-0 flex flex-col ${className}`}
    >
      {children}
      <WaveOverlay tall={variant === 'splash'} />
    </div>
  );
}
```

- [ ] **Step 3: CategoryBadge**

Create `src/components/chrome/CategoryBadge.tsx`:

```tsx
import { categoryIcon } from '../../lib/gameCatalog';
import type { GameCategory } from '../../styles/tokens';

/**
 * The white rounded badge holding a category icon. 132px on the intro screens,
 * 52px as the summary row chip.
 */
export default function CategoryBadge({
  category, size = 132,
}: { category: GameCategory; size?: number }) {
  const radius = Math.round(size * (34 / 132));
  const icon = Math.round(size * (104 / 132));
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius,
        background: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(42,33,64,0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img src={categoryIcon(category)} alt="" aria-hidden="true" width={icon} height={icon} style={{ width: icon, height: icon }} />
    </div>
  );
}
```

- [ ] **Step 4: ProgressBar**

Create `src/components/chrome/ProgressBar.tsx`:

```tsx
import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';

interface Props {
  durationMs: number;
  color: string;
  trackColor: string;
  /** Flip to true to start the fill. Ignored under reduced motion. */
  running: boolean;
}

/**
 * The intro screen's loading bar.
 *
 * The fill is a CSS width transition, not a JS ticker, deliberately: the bar is
 * decorative and the navigation is driven by its own timer, so a backgrounded
 * tab throttling rAF cannot desynchronise the two.
 *
 * Under reduced motion the bar renders full and static. The caller's timer is
 * unchanged, so the screen still holds for the same duration.
 */
export default function ProgressBar({ durationMs, color, trackColor, running }: Props) {
  const reduced = useReducedMotion();
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!running || reduced) return;
    // One frame at 0% so the transition has something to animate from.
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [running, reduced]);

  const width = reduced ? '100%' : filled ? '100%' : '0%';

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      style={{ height: 10, borderRadius: 9999, background: trackColor, overflow: 'hidden' }}
    >
      <div
        style={{
          height: '100%', width, background: color, borderRadius: 9999,
          transition: reduced ? 'none' : `width ${durationMs}ms linear`,
        }}
      />
    </div>
  );
}
```

- [ ] **Step 5: Add the gallery section**

In `ChromeGallery.tsx` add:

```tsx
import { useState } from 'react';
import CategoryBadge from '../../components/chrome/CategoryBadge';
import ProgressBar from '../../components/chrome/ProgressBar';
```

and replace `{/* Tasks 5-7 append their sections here. */}` with:

```tsx
<Section title="Category badges and progress">
  <div style={{ display: 'flex', gap: 12, alignItems: 'center', marginBottom: 16 }}>
    {CATEGORIES.map((c) => <CategoryBadge key={c} category={c} size={88} />)}
    <CategoryBadge category="memory" size={52} />
  </div>
  <ProgressDemo />
</Section>

{/* Tasks 6-7 append their sections here. */}
```

and add this component above `ChromeGallery`:

```tsx
function ProgressDemo() {
  const [run, setRun] = useState(0);
  return (
    <div>
      {CATEGORIES.map((c) => (
        <div key={`${c}-${run}`} style={{ marginBottom: 10 }}>
          <ProgressBar
            durationMs={2000}
            color={CATEGORY_BRAND[c].accent}
            trackColor="rgba(255,255,255,0.16)"
            running
          />
        </div>
      ))}
      <button onClick={() => setRun((r) => r + 1)} style={{ color: '#fff', fontSize: 15, textDecoration: 'underline' }}>
        replay
      </button>
    </div>
  );
}
```

- [ ] **Step 6: Verify**

```bash
npm run build
npm run lint
npm test
```

Expected: build clean, no new lint errors, 356 tests pass.

On `/dev/chrome`, confirm:
- three white badges with their category icons, plus one small 52px chip;
- the three bars fill left to right over two seconds and "replay" restarts them;
- with the OS set to reduce motion (Windows: Settings, Accessibility, Visual effects, Animation effects off), reload and confirm the bars render **already full** with no animation.

- [ ] **Step 7: Commit**

Bump `"version"` to `1.17.6`, then:

```bash
git add src/components/chrome/ src/screens/dev/ChromeGallery.tsx package.json
git commit -m "feat(chrome): ScreenBlue, WaveOverlay, CategoryBadge, ProgressBar

ScreenBlue fills its parent flex child so AppShell's bg-app-bg cannot show
through at the edges.

ProgressBar's fill is a CSS width transition rather than a JS ticker, so a
backgrounded tab cannot desynchronise the bar from the navigation timer
that actually drives the intro screen."
```

---

### Task 6: GameRow and GameTile

**Files:**
- Create: `src/components/chrome/GameRow.tsx`, `src/components/chrome/GameTile.tsx`
- Modify: `src/screens/dev/ChromeGallery.tsx`
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: Task 2's `GameCatalogEntry` and `tileArt`; Task 3's `BRAND`.
- Produces:
  - `<GameRow game: GameCatalogEntry; lastLevel?: number | null; onClick?: () => void />` — Home's row. Renders no level line when `lastLevel` is null or undefined.
  - `<GameTile game: GameCatalogEntry; onClick: () => void />` — the free-play grid tile.
  - Phase 2's `HomeScreen` and `FreePlayScreen` consume these.

- [ ] **Step 1: GameRow**

Create `src/components/chrome/GameRow.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';
import { BRAND } from '../../styles/tokens';
import type { GameCategory } from '../../styles/tokens';

const CATEGORY_LABEL_KEY: Record<GameCategory, string> = {
  memory:    'category.memory',
  attention: 'category.attention',
  executive: 'category.planning',
};

const CATEGORY_FALLBACK: Record<GameCategory, string> = {
  memory: 'MEMORY', attention: 'ATTENTION', executive: 'PLANNING',
};

interface Props {
  game: GameCatalogEntry;
  /** Null or undefined renders no level line, rather than "level 0". */
  lastLevel?: number | null;
  onClick?: () => void;
}

/** One of Home's three "today's games" rows. */
export default function GameRow({ game, lastLevel, onClick }: Props) {
  const { t } = useTranslation();
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className="w-full text-left"
      style={{
        background: BRAND.surface,
        borderRadius: 20,
        padding: '12px 16px 12px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <img
        src={tileArt(game)}
        alt=""
        aria-hidden="true"
        width={74}
        height={74}
        style={{ width: 74, height: 74, borderRadius: 16, flexShrink: 0, objectFit: 'cover' }}
      />
      <div style={{ minWidth: 0 }}>
        <p
          className="font-baloo"
          style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.12em', color: BRAND.cyan }}
        >
          {t(CATEGORY_LABEL_KEY[game.category], CATEGORY_FALLBACK[game.category]).toUpperCase()}
        </p>
        <p className="font-baloo" style={{ fontSize: 21, fontWeight: 700, color: '#FFFFFF' }}>
          {t(game.nameKey, game.id)}
        </p>
        {lastLevel != null && (
          <p className="font-baloo" style={{ fontSize: 15, fontWeight: 700, color: BRAND.lime }}>
            {t('home.lastLevel', 'Last time: level {{level}}', { level: lastLevel })}
          </p>
        )}
      </div>
    </Tag>
  );
}
```

- [ ] **Step 2: GameTile**

Create `src/components/chrome/GameTile.tsx`:

```tsx
import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';

/**
 * A free-play grid tile. Games with no commissioned art fall back to their
 * category icon, which sits on a white chip so it reads as a deliberate tier
 * rather than a broken image.
 */
export default function GameTile({
  game, onClick,
}: { game: GameCatalogEntry; onClick: () => void }) {
  const { t } = useTranslation();
  const hasArt = game.tile !== null;

  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'center' }}>
      <div
        style={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 16,
          background: hasArt ? 'transparent' : '#FFFFFF',
          boxShadow: '0 10px 20px rgba(4,14,80,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={tileArt(game)}
          alt=""
          aria-hidden="true"
          style={hasArt
            ? { width: '100%', height: '100%', objectFit: 'cover' }
            : { width: '64%', height: '64%', objectFit: 'contain' }}
        />
      </div>
      <p
        className="font-baloo"
        style={{ fontSize: 15, fontWeight: 700, color: '#FFFFFF', marginTop: 8, lineHeight: 1.2 }}
      >
        {t(game.nameKey, game.id)}
      </p>
    </button>
  );
}
```

- [ ] **Step 3: Add the gallery section**

In `ChromeGallery.tsx` add:

```tsx
import GameRow from '../../components/chrome/GameRow';
import GameTile from '../../components/chrome/GameTile';
import { marqueeGames, GAME_CATALOG } from '../../lib/gameCatalog';
```

and replace `{/* Tasks 6-7 append their sections here. */}` with:

```tsx
<Section title="Game rows">
  <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
    <GameRow game={GAME_CATALOG['market-memory']} lastLevel={12} />
    <GameRow game={GAME_CATALOG['spot-focus']} lastLevel={3} />
    <GameRow game={GAME_CATALOG['serve-guests']} />
  </div>
</Section>

<Section title="Game tiles">
  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
    {marqueeGames().slice(0, 3).map((g) => <GameTile key={g.id} game={g} onClick={() => {}} />)}
    {['remember-match', 'word-search', 'recipe-builder'].map((id) => (
      <GameTile key={id} game={GAME_CATALOG[id]} onClick={() => {}} />
    ))}
  </div>
</Section>

{/* Task 7 appends its section here. */}
```

- [ ] **Step 4: Verify**

```bash
npm run build
npm run lint
npm test
```

Expected: build clean, no new lint errors, 356 tests pass.

On `/dev/chrome`, confirm:
- three rows on a translucent navy surface, each with 74px rounded art, an all-caps cyan category label, a white game name, and a lime level line — except the third, which has **no** level line;
- six tiles: three with full-bleed game art, three with a category icon centred on a white chip;
- every game name renders (a missing i18n key would show the raw gameId, which is the intended fallback but should be noted for the phase-2 i18n task).

- [ ] **Step 5: Commit**

Bump `"version"` to `1.17.7`, then:

```bash
git add src/components/chrome/GameRow.tsx src/components/chrome/GameTile.tsx \
        src/screens/dev/ChromeGallery.tsx package.json
git commit -m "feat(chrome): GameRow and GameTile

GameRow omits the level line entirely when there is no last level, rather
than printing level 0 - a resident who has not played a game should not be
told they reached nothing.

GameTile falls back to the category icon on a white chip for the nine games
with no commissioned art, so the placeholder tier reads as deliberate."
```

---

### Task 7: ScreenTransition

The handoff specifies eight transitions with explicit durations and easings, and React Router provides none. One component owns the whole table so phase 2 wires motion by naming a transition rather than reinventing it per screen.

**Files:**
- Create: `src/components/chrome/ScreenTransition.tsx`
- Modify: `src/screens/dev/ChromeGallery.tsx`
- Modify: `package.json` (version bump)

**Interfaces:**
- Consumes: `useReducedMotion` from `src/lib/useReducedMotion.ts`.
- Produces:
  - `type TransitionName = 'launchToSplash' | 'onboardingStep' | 'homeToIntro' | 'introToTitle' | 'titleToBoard' | 'boardToIntro' | 'boardToSummary'`
  - `<ScreenTransition name: TransitionName; children />`
  - `function staggerDelay(index: number): number` — the summary's 60 ms row stagger.
  - Phase 2's screens wrap their content in this.

- [ ] **Step 1: Write ScreenTransition**

Create `src/components/chrome/ScreenTransition.tsx`:

```tsx
import { useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';

export type TransitionName =
  | 'launchToSplash'
  | 'onboardingStep'
  | 'homeToIntro'
  | 'introToTitle'
  | 'titleToBoard'
  | 'boardToIntro'
  | 'boardToSummary';

interface Spec {
  durationMs: number;
  easing: string;
  /** Starting transform. Omitted means a plain cross-fade. */
  from?: string;
}

/**
 * The handoff's motion table, verbatim and in one place. Screens name a
 * transition rather than each inventing its own timing, which is the only way
 * eight hand-specified durations stay consistent across three phases.
 */
const TRANSITIONS: Record<TransitionName, Spec> = {
  launchToSplash: { durationMs: 250, easing: 'ease' },
  onboardingStep: { durationMs: 220, easing: 'cubic-bezier(0.22,0.61,0.36,1)', from: 'translateX(24px)' },
  homeToIntro:    { durationMs: 300, easing: 'ease',  from: 'scale(1.02)' },
  introToTitle:   { durationMs: 350, easing: 'ease' },
  titleToBoard:   { durationMs: 250, easing: 'ease' },
  boardToIntro:   { durationMs: 300, easing: 'ease' },
  boardToSummary: { durationMs: 400, easing: 'ease' },
};

/** The summary's rows rise and fade in 60 ms apart. */
export const STAGGER_STEP_MS = 60;

export function staggerDelay(index: number): number {
  return index * STAGGER_STEP_MS;
}

/**
 * Animates its children in on mount. Every transition collapses to an instant
 * cut under reduced motion; nothing here gates navigation, so a collapsed
 * transition never changes how long a screen is on screen.
 */
export default function ScreenTransition({
  name, children,
}: { name: TransitionName; children: ReactNode }) {
  const reduced = useReducedMotion();
  const spec = TRANSITIONS[name];
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  if (reduced) return <>{children}</>;

  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : spec.from,
        transition: `opacity ${spec.durationMs}ms ${spec.easing}, transform ${spec.durationMs}ms ${spec.easing}`,
      }}
    >
      {children}
    </div>
  );
}
```

- [ ] **Step 2: Add the gallery section**

In `ChromeGallery.tsx` add:

```tsx
import ScreenTransition, { type TransitionName, staggerDelay } from '../../components/chrome/ScreenTransition';
```

and replace `{/* Task 7 appends its section here. */}` with:

```tsx
<Section title="Transitions">
  <TransitionDemo />
</Section>
```

and add above `ChromeGallery`:

```tsx
const TRANSITION_NAMES: TransitionName[] = [
  'launchToSplash', 'onboardingStep', 'homeToIntro',
  'introToTitle', 'titleToBoard', 'boardToIntro', 'boardToSummary',
];

function TransitionDemo() {
  const [name, setName] = useState<TransitionName>('homeToIntro');
  const [run, setRun] = useState(0);
  return (
    <div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginBottom: 12 }}>
        {TRANSITION_NAMES.map((n) => (
          <button
            key={n}
            onClick={() => { setName(n); setRun((r) => r + 1); }}
            style={{
              color: '#fff', fontSize: 11, padding: '6px 10px', borderRadius: 8,
              background: n === name ? 'rgba(255,255,255,0.3)' : 'rgba(255,255,255,0.12)',
            }}
          >
            {n}
          </button>
        ))}
      </div>
      <ScreenTransition key={`${name}-${run}`} name={name}>
        <div style={{ background: 'rgba(9,26,140,0.5)', borderRadius: 18, padding: 20 }}>
          <p className="font-baloo" style={{ color: '#fff', fontSize: 19, fontWeight: 700 }}>{name}</p>
          {[0, 1, 2].map((i) => (
            <p key={i} style={{ color: '#C6F87A', fontSize: 15, marginTop: 6 }}>
              row {i}, stagger {staggerDelay(i)}ms
            </p>
          ))}
        </div>
      </ScreenTransition>
    </div>
  );
}
```

- [ ] **Step 3: Verify**

```bash
npm run build
npm run lint
npm test
```

Expected: build clean, no new lint errors, 356 tests pass.

On `/dev/chrome`, confirm each of the seven buttons replays a visibly different entrance: `onboardingStep` slides in from the right, `homeToIntro` scales down slightly as it fades, the rest are plain fades of noticeably different lengths.

With OS reduced motion on, reload and confirm the panel appears instantly with no fade for every name.

- [ ] **Step 4: Commit**

Bump `"version"` to `1.17.8`, then:

```bash
git add src/components/chrome/ScreenTransition.tsx src/screens/dev/ChromeGallery.tsx package.json
git commit -m "feat(chrome): ScreenTransition

The handoff specifies eight transitions with explicit durations and easings
and React Router supplies none. One table, named by the screens, is the only
way those stay consistent across three phases.

Nothing here gates navigation, so collapsing every transition under reduced
motion never changes how long a screen is on screen."
```

---

### Task 8: Close the phase

**Files:**
- Modify: `CLAUDE.md`
- Modify: `package.json` (version bump to 1.18.0)

- [ ] **Step 1: Correct the stale testing claim**

`CLAUDE.md` says "No test suite exists yet." under the Commands block. That is wrong: `npm test` runs vitest over 33 files. Replace that line with:

```markdown
`npm test` runs the vitest suite (`vitest run`). It uses the **node** environment
with no DOM library, and only collects `src/**/__tests__/**/*.test.ts` - so pure
modules are unit-tested and React components are not. Verify components by hand,
or on the DEV-only chrome gallery at `/dev/chrome`.
```

Also add to the Pre-commit checklist, between "Lint" and "Build":

```markdown
1.5. **Test** — `npm test` must pass.
```

- [ ] **Step 2: Full verification sweep**

```bash
npm run lint
npm test
npm run build
```

Expected: 38 lint errors (unchanged), 356 tests pass, build clean.

Then `npm run dev` and check that phase 1 shipped no user-visible change:
- `/` renders the care home selector exactly as before;
- start a session and play one round of any game; the board, its buttons and the header are unchanged;
- `/app/settings` is unchanged;
- no new console errors.

Then confirm the production bundle is clean of dev-only code:

```bash
npm run build
grep -rl "ChromeGallery\|dev/chrome" dist/assets/ || echo "gallery excluded - correct"
du -sh public/games
```

Expected: the "correct" line, and `public/games` well under 3 MB.

- [ ] **Step 3: Commit**

Set `"version"` to `1.18.0` — phase 1 adds new modules, which is a minor bump under the repo's release protocol.

```bash
git add CLAUDE.md package.json
git commit -m "docs: correct the stale no-test-suite claim, close redesign phase 1

npm test runs 33 vitest files. The suite is node-environment with no DOM
library, so the distinction that matters to a contributor is which things
are unit-testable and which need the chrome gallery."
```

- [ ] **Step 4: Hand back**

Phase 1 is complete when: no screen behaviour changed, `/dev/chrome` renders every new component, and lint, test and build are all green. Phase 2 (session flow) is the next plan and should be written against the same spec.

---

## Self-Review

**Spec coverage.** Every phase 1 item in the spec's phasing section maps to a task: tokens and fonts (Task 3), `Button` green/blue (Task 4), `ScreenBlue`/`WaveOverlay`/`CategoryBadge`/`ProgressBar` (Task 5), `GameRow`/`GameTile` (Task 6), `ScreenTransition` (Task 7), `gameCatalog.ts` (Task 2), assets into `public/` (Task 1). The spec's "verified against a throwaway scratch route" is covered by Task 3 with the deviation recorded.

**Deferred to later phases, correctly.** `prescribers.ts`, `sessionPlan.ts` and `lastLevel.ts` are named in the spec's module table but belong to phases 2 and 3; none is a phase 1 deliverable.

**Two corrections this plan makes to the spec, both recorded in the affected task:**
- The spec left open whether Home tiles come from the handoff bundle or from `Assets/`. Settled in Task 1: the bundle's `game-*.png` are already the 240px derivatives of `Assets/UI_icon_*` and all six exist, so the bundle wins and the raw art is archived.
- The spec did not anticipate the splash payload. Task 1 converts to WebP; six 540x960 PNGs would be roughly 7 MB.

**Type consistency check.** `GameCatalogEntry` is defined in Task 2 and consumed by name in Tasks 6 and 7's interface blocks. `tileArt` and `categoryIcon` are defined in Task 2 and used in Tasks 5 and 6. `CATEGORY_BRAND` / `CategoryBrand` are defined in Task 3 and used in Tasks 5's gallery section. `.btn-brand`/`.btn-green`/`.btn-blue` are defined in Task 3 and consumed in Task 4. `useReducedMotion` is the existing export at `src/lib/useReducedMotion.ts:29` in both Tasks 5 and 7. No name drifts.

**Version sequence.** 1.17.2 (Task 1), .3 (2), .4 (3), .5 (4), .6 (5), .7 (6), .8 (7), 1.18.0 (8). Each commit bumps exactly once, as `CLAUDE.md` requires.
