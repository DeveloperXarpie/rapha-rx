# Portrait Mode Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make every v1 screen and game fit a portrait viewport from 360x640 up to iPad Pro, with no scrolling inside a game board and no game needing to know the height of the app chrome.

**Architecture:** One root box of `100dvh` with safe-area padding, and a `flex-1 min-h-0 overflow-hidden` chain down to a play box that has a real, measurable height. Games then measure their own container instead of reaching for `window.innerHeight` and subtracting a guess at the chrome. The fit arithmetic lives in one pure function; the DOM measurement lives in one pair of hooks; six games consume them.

**Tech Stack:** React 19, TypeScript 5.9, Vite 7, Tailwind 3.4, react-router-dom 7, vite-plugin-pwa 1.2, Vitest 4 (node environment), Playwright (available transitively, not a declared dependency).

**Spec:** `docs/superpowers/specs/2026-08-28-portrait-mode-design.md`

## Execution status

**Paused after Task 5**, on branch `feat/portrait-mode`, to deal with a pre-existing
accessibility bug found during Task 5's verification (see below). Resume at Task 7.

| Task | Commit | Version | Outcome |
|---|---|---|---|
| 1. Root box | `fcdf178` | 1.13.1 | `.app-root` measures exactly the viewport height; nothing above `main` scrolls |
| 2. Fit arithmetic | `92b0698` | 1.13.2 | 6 tests, written first |
| 3. Stage hooks | `b0d80c2` | 1.13.3 | compiles; no consumer yet |
| 4. Play-box contract | `65c3c2e` | 1.13.4 | play box has a real height: 442px at 360x640 |
| 5. Chrome budget | `9bcd6e1` | 1.14.0 | play box 578px, a 31% gain against the 23% predicted |

347 tests pass, `tsc -b` clean, lint unchanged at 38 errors and 1 warning.

**Plan correction applied during execution.** Task 1's fixed-height root left Settings
unreachable: it measures 1322px inside a 640px box, with `overflow: visible` and no
scrollbar. `main` now takes scroll ownership in Task 1 Step 4b, and Task 5 Step 2b makes it
conditional on the route. Task 4 Step 1 and Task 10 Step 3 became confirmation-only as a
result.

**One verification step could not be completed.** Task 5, Step 5, check 5 (the game bar
grows at text size Extra Large) is unverifiable: `text-size-large` and `text-size-xlarge`
are absent from the compiled CSS, so nothing grows. `AppShell.tsx:36` builds the class as
`` `text-size-${settings.textSize}` ``, so neither literal appears in any source file and
Tailwind's content scanner drops both rules. Confirmed in `dist/assets/index-BqpugNJZ.css`,
built from `main` before this branch existed:

```
text-size-normal   1     <- survives only because main.tsx:16,19 contains the literal
text-size-large    0
text-size-xlarge   0
```

This is pre-existing and is being handled as separate work. It also means spec section 5.2's
figures (a ~70px bar and a ~110px budget at Extra Large) describe a feature that does not
currently function; those numbers need rechecking once it does.

## Global Constraints

- **Portrait only.** Landscape is not a supported layout at any size.
- **Device envelope:** 360x640 CSS px minimum, up to 1024x1366. 360px wide is the binding constraint.
- **v1 games (the only ones in scope):** Train Yard, Market Memory, Spot Focus, Garden Keeper, Serve the Guests, Clear the Way. The other nine games stay registered and reachable but are not touched except where explicitly noted.
- **A game may never scroll.** It fits or it scales down. Non-game screens may scroll, and own that scrolling themselves.
- **Never observe an element whose size you set.** Stage refs attach to the play box, never to the scaled wrapper. See Task 3.
- **Every commit bumps `version` in `package.json`** per `CLAUDE.md`. Current version is `1.13.0`; each task below states its target version.
- **`npm run lint` currently fails with 38 pre-existing errors.** It is not a clean gate. The rule for this work is that the error count must not rise. Do not fix unrelated lint errors.
- **`npx vitest run` must be green before every commit.**
- **No em dashes in any copy, comment, or commit message.** Use a plain dash.
- **i18n:** locale files are `public/locales/<lng>/common.json` (namespace `common`), flat dot-separated keys, 511 keys currently, and all three languages must stay in sync. Note `CLAUDE.md` says `translation.json`; that is out of date and this plan does not fix it.

---

## Scope note: Serve the Guests is deliberately excluded

Spec phase 9 (Serve the Guests portrait) is **not** in this plan. It is blocked on section 7.5 item 1: the portrait sprite sheet supplies MAKE, SERVE and COOKING but no DISPOSE button, while `model.ts:47` declares four dish states and `sprites.ts:152` maps `burnt` to `btn-dispose.png`. Writing bite-sized steps for that work now would mean inventing the resolution.

Once the five asset questions in spec section 7.5 are answered, Serve the Guests gets its own plan. Everything in this plan is a prerequisite for it and none of it is blocked by it.

Spec phase 10's smoke script is included here, covering the five games this plan finishes. Serve the Guests is added to it by its own plan.

---

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/fitScale.ts` | The pure fit arithmetic. No DOM. Node-testable. |
| `src/lib/__tests__/fitScale.test.ts` | Its tests. |
| `src/hooks/useStageFit.ts` | `useStageFit` and `useStageScale`. The only place a `ResizeObserver` is created for board sizing. |
| `src/components/RotateDevice.tsx` | The landscape gate. |
| `scripts/portrait-smoke.mjs` | Playwright driver asserting fit at three viewport sizes. |

**Modified:**

| File | Change |
|---|---|
| `index.html` | `viewport-fit=cover` |
| `src/styles/index.css` | `.app-root` and `.rotate-gate` classes |
| `src/components/AppShell.tsx` | Root box, play-box chain, hide chrome on game routes, mount `RotateDevice` |
| `src/components/GameShell.tsx` | `h-full` wrapper, bounded play box, slimmer bar |
| `vite.config.ts` | Manifest `orientation: 'portrait-primary'` |
| `src/games/memory/TrainYard/index.tsx` | Adopt `useStageScale` |
| `src/games/attention/GardenKeeper/index.tsx` | Adopt `useStageScale` |
| `src/games/memory/MarketMemory/index.tsx` | Adopt `useStageScale` |
| `src/games/executive/ClearTheWay/index.tsx` | Adopt `useStageFit` |
| `src/games/executive/ClearTheWay/geometry.ts` | Narrow-screen `MIN_CELL` |
| `src/games/executive/ClearTheWay/__tests__/geometry.test.ts` | Cover it |
| `src/games/attention/SpotFocus/index.tsx` | Vertical stacking |
| `src/games/attention/SpotFocus/Scene.tsx` | Remove the `100vh` assumption |
| `src/screens/CareHomeSelector.tsx`, `ProfileSelector.tsx`, `SignupFlow.tsx` | Scroll ownership |
| `src/games/executive/MorningRoutineQuest/index.tsx`, `src/main.tsx` | Remove `min-h-screen` |
| `public/locales/{en,hi,kn}/common.json` | Rotate-gate copy |

---

### Task 1: Viewport plumbing and the root box

Establishes `100dvh`, safe-area insets and `viewport-fit=cover`, and removes the viewport-height assertions that nested components make. Nothing measures anything yet; this only stops the root from lying about its height.

**Files:**
- Modify: `index.html:5`
- Modify: `src/styles/index.css` (add to the `@layer components` block)
- Modify: `src/components/AppShell.tsx:37`
- Modify: `src/games/executive/MorningRoutineQuest/index.tsx:139,163,304`
- Modify: `src/main.tsx:27`
- Modify: `package.json` (version)

**Interfaces:**
- Consumes: nothing.
- Produces: the `.app-root` CSS class, applied by `AppShell`. Task 4 builds the flex chain inside it.

- [ ] **Step 1: Add `viewport-fit=cover` to the viewport meta**

In `index.html`, replace line 5:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no" />
```

with:

```html
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no, viewport-fit=cover" />
```

Without `viewport-fit=cover`, `env(safe-area-inset-*)` resolves to zero and the next step does nothing.

- [ ] **Step 2: Add the `.app-root` class**

In `src/styles/index.css`, inside the existing `@layer components { ... }` block, add at the top of the block (immediately after the opening brace, before `.btn-primary`):

```css
  /*
   * The single fixed-height box the whole app lives in.
   *
   * `100vh` first, then `100dvh`, so browsers without `dvh` keep the old behaviour and
   * everything else tracks the real viewport as the mobile toolbar animates in and out.
   * A plain `100vh` box is sized for a viewport that shrinks the moment the user scrolls,
   * which puts the bottom of a game board underneath the toolbar.
   *
   * The safe-area padding is taken here, once, so nothing further down has to know a
   * notch or a home indicator exists.
   */
  .app-root {
    height: 100vh;
    height: 100dvh;
    padding-top: env(safe-area-inset-top);
    padding-bottom: env(safe-area-inset-bottom);
    padding-left: env(safe-area-inset-left);
    padding-right: env(safe-area-inset-right);
  }
```

Then, in the `@layer base { ... }` block (the one that already holds the `html.text-size-*`
rules), add:

```css
  /*
   * A definite height all the way down to #root, so that `h-full` resolves for anything
   * rendered outside .app-root - the loading state in main.tsx, and the public routes
   * (care home selector, signup, profile selector), which are not inside AppShell.
   *
   * This has to land in the same commit as the first `h-full` that depends on it. A
   * `h-full` whose ancestors have no definite height collapses to nothing.
   */
  html, body, #root { height: 100%; }
```

- [ ] **Step 3: Apply it in AppShell**

In `src/components/AppShell.tsx`, replace line 37:

```tsx
    <div className="min-h-screen bg-app-bg flex flex-col">
```

with:

```tsx
    <div className="app-root bg-app-bg flex flex-col">
```

- [ ] **Step 4: Remove the nested viewport-height assertions**

In `src/games/executive/MorningRoutineQuest/index.tsx`, remove the ` min-h-screen` token from the `className` on lines 139, 163 and 304, leaving the rest of each class list untouched. For example line 139:

```tsx
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg min-h-screen">
```

becomes:

```tsx
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
```

In `src/main.tsx` line 27, change `min-h-screen` to `h-full`:

```tsx
      <div className="h-full bg-app-bg flex items-center justify-center">
```

**Do not touch `CareHomeSelector.tsx`, `ProfileSelector.tsx` or `SignupFlow.tsx` in this task.** Those screens need the replacement scroll owner that Task 10 supplies, and `CareHomeSelector.tsx:268` currently pairs `min-h-screen` with `overflow-y-auto`. Removing it here would break them for the duration of the plan.

- [ ] **Step 4b: Give `main` scroll ownership immediately**

`.app-root` is now a fixed-height box, so any screen taller than the viewport paints below
the fold with no way to reach it. Settings measures 1322px at 360px wide inside a 640px root.
This must land in the same commit as the fixed-height root, not nine tasks later.

In `src/components/AppShell.tsx`, replace:

```tsx
      <main className="flex-1 flex flex-col" role="main">
```

with:

```tsx
      {/*
        `min-h-0` is load-bearing. A flex child defaults to `min-height: auto`, which lets
        its content push it taller than its parent - the same content-sizing bug the play
        box exists to kill, one level up.

        The scroll lives here rather than on the document, because .app-root is a fixed
        height box now: without it, a screen taller than the viewport (Settings is 1322px
        at 360px wide) simply paints below the fold with no way to reach it. Task 5 makes
        this conditional, so a game route gets `overflow-hidden` instead.
      */}
      <main className="flex-1 min-h-0 overflow-y-auto flex flex-col" role="main">
```

This is safe for games: their boards still measure `window.innerHeight` until Task 7, and
`GameShell`'s own `h-full` resolves against a `main` that now has a definite height.

- [ ] **Step 5: Verify the build and tests**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, all existing tests pass. No behaviour change is expected yet beyond the root becoming a fixed-height box.

- [ ] **Step 6: Verify manually**

Run `npm run dev`, open `http://localhost:5173` in a narrow browser window, walk to `/app/home`. Expected: the app renders as before. The page should not have gained a scrollbar at desktop size.

- [ ] **Step 7: Bump version and commit**

Set `"version": "1.13.1"` in `package.json`.

```bash
git add index.html src/styles/index.css src/components/AppShell.tsx src/games/executive/MorningRoutineQuest/index.tsx src/main.tsx package.json
git commit -m "feat(layout): give the app one fixed-height root box"
```

---

### Task 2: The fit arithmetic

A pure function, extracted so the one piece of real logic in this work is testable in the existing node-environment Vitest setup. The hooks in Task 3 are a thin DOM wrapper over it.

**Files:**
- Create: `src/lib/fitScale.ts`
- Create: `src/lib/__tests__/fitScale.test.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing.
- Produces: `fitScale(boxW: number, boxH: number, canvasW: number, canvasH: number): number`. Task 3 consumes it.

- [ ] **Step 1: Write the failing test**

Create `src/lib/__tests__/fitScale.test.ts`:

```ts
import { describe, it, expect } from 'vitest';
import { fitScale } from '../fitScale';

describe('fitScale', () => {
  it('takes the tighter of the two dimensions', () => {
    // A 800x1280 canvas in a 360x552 box: 360/800 = 0.45, 552/1280 = 0.43125.
    expect(fitScale(360, 552, 800, 1280)).toBeCloseTo(0.43125, 5);
    // The same canvas in a box that is tall for its width is width-bound instead.
    expect(fitScale(360, 4000, 800, 1280)).toBeCloseTo(0.45, 5);
  });

  it('returns exactly 1 when the canvas already fits the box', () => {
    expect(fitScale(800, 1280, 800, 1280)).toBe(1);
  });

  it('scales up when the box is larger than the canvas', () => {
    expect(fitScale(1600, 2560, 800, 1280)).toBeCloseTo(2, 5);
  });

  it('returns 0 for a box that has not been measured yet', () => {
    // The observer can fire with a zero box during mount. Callers render a loading
    // state on 0 rather than dividing by it.
    expect(fitScale(0, 0, 800, 1280)).toBe(0);
    expect(fitScale(360, 0, 800, 1280)).toBe(0);
    expect(fitScale(0, 552, 800, 1280)).toBe(0);
  });

  it('returns 0 for a canvas with no area, rather than Infinity', () => {
    expect(fitScale(360, 552, 0, 1280)).toBe(0);
    expect(fitScale(360, 552, 800, 0)).toBe(0);
  });

  it('never returns a negative scale', () => {
    expect(fitScale(-10, 552, 800, 1280)).toBe(0);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/lib/__tests__/fitScale.test.ts`
Expected: FAIL, "Failed to resolve import ../fitScale".

- [ ] **Step 3: Write the implementation**

Create `src/lib/fitScale.ts`:

```ts
/**
 * Uniform fit: the largest scale at which a `canvasW x canvasH` design canvas fits
 * inside a `boxW x boxH` box, preserving aspect ratio.
 *
 * A canvas is height-bound whenever `canvasW / canvasH` is less than `boxW / boxH`.
 * Every portrait board in this app is height-bound on a 360x552 play box.
 *
 * Returns 0 rather than a garbage number for any non-positive input. A ResizeObserver
 * can legitimately fire with a zero box during mount, and 0 is the signal callers use
 * to keep rendering their loading state instead of drawing a collapsed board.
 */
export function fitScale(boxW: number, boxH: number, canvasW: number, canvasH: number): number {
  if (boxW <= 0 || boxH <= 0 || canvasW <= 0 || canvasH <= 0) return 0;
  return Math.min(boxW / canvasW, boxH / canvasH);
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `npx vitest run src/lib/__tests__/fitScale.test.ts`
Expected: PASS, 6 tests.

- [ ] **Step 5: Bump version and commit**

Set `"version": "1.13.2"` in `package.json`.

```bash
git add src/lib/fitScale.ts src/lib/__tests__/fitScale.test.ts package.json
git commit -m "feat(layout): the uniform fit arithmetic, in one tested place"
```

---

### Task 3: The stage hooks

The single `ResizeObserver` for board sizing. Replaces six divergent copies of the same measure-and-guess effect.

**Files:**
- Create: `src/hooks/useStageFit.ts`
- Modify: `package.json`

**Interfaces:**
- Consumes: `fitScale` from Task 2.
- Produces:
  - `useStageFit(): [(el: HTMLElement | null) => void, StageBox]` where `StageBox = { width: number; height: number }`
  - `useStageScale(canvasW: number, canvasH: number): [(el: HTMLElement | null) => void, StageScale]` where `StageScale = { scale: number; width: number; height: number; box: StageBox }`
  - Tasks 7, 8, 9 and 11 consume these.

- [ ] **Step 1: Write the hooks**

Create `src/hooks/useStageFit.ts`:

```ts
import { useCallback, useEffect, useRef, useState } from 'react';
import { fitScale } from '../lib/fitScale';

export interface StageBox {
  width: number;
  height: number;
}

export interface StageScale {
  scale: number;
  /** The board's rendered size, i.e. the canvas multiplied by `scale`. */
  width: number;
  height: number;
  box: StageBox;
}

/**
 * The honest size of the play box.
 *
 * Attach the returned ref to an element whose height comes from its PARENT, never from
 * its own content: in practice a `w-full h-full` div directly inside GameShell's play
 * box. Attaching it to the scaled wrapper instead closes a feedback loop - observe,
 * resize, observe - which browsers report as "ResizeObserver loop completed with
 * undelivered notifications" and which can visibly oscillate.
 *
 * This replaces the per-game effects that measured `window.innerHeight - rect.top`
 * minus a hardcoded guess at the app chrome. Four of the six v1 games carried a
 * byte-identical copy of that guess, and all of them went stale whenever the chrome
 * changed.
 */
export function useStageFit(): [(el: HTMLElement | null) => void, StageBox] {
  const [box, setBox] = useState<StageBox>({ width: 0, height: 0 });
  const elRef = useRef<HTMLElement | null>(null);
  const roRef = useRef<ResizeObserver | null>(null);

  const measure = useCallback(() => {
    const el = elRef.current;
    if (!el) return;
    const rect = el.getBoundingClientRect();
    // A zero box means the element is not laid out yet. Keep the previous value rather
    // than collapsing a board that is already on screen.
    if (rect.width <= 0 || rect.height <= 0) return;
    setBox((prev) =>
      prev.width === rect.width && prev.height === rect.height
        ? prev
        : { width: rect.width, height: rect.height },
    );
  }, []);

  /*
   * A ref callback rather than `useEffect(..., [])`, because every one of these games
   * renders a loading node while its sprites decode and mounts the real element only
   * afterwards. A mount-time `observe(ref.current)` runs against null and never
   * re-attaches; today only the window resize listener rescues those games.
   */
  const ref = useCallback(
    (el: HTMLElement | null) => {
      roRef.current?.disconnect();
      roRef.current = null;
      elRef.current = el;
      if (!el) return;
      const ro = new ResizeObserver(measure);
      ro.observe(el);
      roRef.current = ro;
      measure();
    },
    [measure],
  );

  useEffect(() => {
    // Some browsers fire orientationchange without a matching resize on the observed
    // element. The app is portrait-locked, but the gate in RotateDevice unmounts nothing,
    // so the box behind it still has to be right when the device comes back upright.
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('orientationchange', measure);
      roRef.current?.disconnect();
      roRef.current = null;
    };
  }, [measure]);

  return [ref, box];
}

/**
 * `useStageFit` plus the uniform fit of a fixed design canvas into that box.
 *
 * `scale` is 0 until the box has been measured. Callers already render a loading state
 * while sprites decode, which covers that frame.
 */
export function useStageScale(
  canvasW: number,
  canvasH: number,
): [(el: HTMLElement | null) => void, StageScale] {
  const [ref, box] = useStageFit();
  const scale = fitScale(box.width, box.height, canvasW, canvasH);
  return [ref, { scale, width: canvasW * scale, height: canvasH * scale, box }];
}
```

- [ ] **Step 2: Verify it compiles**

Run: `npx tsc -b`
Expected: no errors. Nothing consumes the hooks yet.

There is no unit test for this task. Vitest runs `environment: 'node'` with `include: ['src/**/__tests__/**/*.test.ts']` (see `vitest.config.ts`), so there is no DOM and no `ResizeObserver` to test against. The arithmetic is already covered by Task 2; the DOM behaviour is covered by the Playwright script in Task 12. Do not add jsdom for this.

- [ ] **Step 3: Bump version and commit**

Set `"version": "1.13.3"` in `package.json`.

```bash
git add src/hooks/useStageFit.ts package.json
git commit -m "feat(layout): one stage-measuring hook for every board"
```

---

### Task 4: The play-box contract

Makes the play area a bounded box so a game can measure it honestly. This is the root-cause fix.

Ships together with Task 5. Task 4 alone bounds the play box while the old 192px of chrome still sits inside it, which works but looks worse than today. Do not deploy between the two.

**Files:**
- Modify: `src/components/AppShell.tsx:80-83`
- Modify: `src/components/GameShell.tsx:136,161`
- Modify: `package.json`

**Interfaces:**
- Consumes: `.app-root` from Task 1.
- Produces: a `flex-1 min-h-0 overflow-hidden` play box inside `GameShell`. Tasks 7, 8, 9 and 11 attach their stage refs to a `w-full h-full` child of it.

- [ ] **Step 1: Confirm `main` is already bounded**

`main` became `flex-1 min-h-0 overflow-y-auto flex flex-col` in Task 1, Step 4b. No change
here. Task 5 makes the overflow conditional on the route.

- [ ] **Step 2: Bound the play box in GameShell**

In `src/components/GameShell.tsx`, replace line 136:

```tsx
    <div className="flex flex-col min-h-full">
```

with:

```tsx
    <div className="flex flex-col h-full">
```

Then replace line 161:

```tsx
      <div className="flex-1 flex flex-col p-4">
```

with:

```tsx
      {/*
        The play box. It has a real height, because every level above it does, so a game
        can measure this box instead of reaching for `window.innerHeight` and subtracting
        a guess at the chrome. `overflow-hidden` is the contract: a game fits or it scales
        down, it never scrolls.
      */}
      <div data-testid="play-box" className="flex-1 min-h-0 overflow-hidden flex flex-col p-4">
```

`data-testid` is not decoration. Task 12's smoke script has to find this exact element to
assert against, and a structural selector like `main > div > div:nth-child(2)` would silently
start matching the wrong node the next time anyone adds a div to `GameShell`. A smoke test
that passes because it found nothing is worse than no smoke test.

- [ ] **Step 3: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass.

- [ ] **Step 4: Verify manually that games still render**

Run `npm run dev` and open a v1 game. Use the localStorage seed from `scripts/portrait-smoke.mjs` if it exists yet, or navigate through the UI.

Expected at this point: boards still render, because they are all still measuring against `window.innerHeight`. They may be sized slightly differently. What must NOT happen is a collapsed or zero-height board. If a board disappears, the flex chain has a missing `min-h-0` somewhere between `.app-root` and the play box.

- [ ] **Step 5: Bump version and commit**

Set `"version": "1.13.4"` in `package.json`.

```bash
git add src/components/AppShell.tsx src/components/GameShell.tsx package.json
git commit -m "fix(layout): give the play area a height of its own"
```

---

### Task 5: The chrome budget

Takes chrome from ~192px to ~88px on a game route, which is about 23% more board on a 360x640 phone. Ships with Task 4.

**Files:**
- Modify: `src/components/AppShell.tsx` (imports, and lines 37-78)
- Modify: `src/components/GameShell.tsx:137-158`
- Modify: `package.json`

**Interfaces:**
- Consumes: the bounded chain from Task 4.
- Produces: nothing new. Subsequent tasks simply get a larger play box.

- [ ] **Step 1: Detect the game route in AppShell**

In `src/components/AppShell.tsx`, change the router import on line 2:

```tsx
import { Outlet, useNavigate } from 'react-router-dom';
```

to:

```tsx
import { Outlet, useNavigate, useMatch } from 'react-router-dom';
```

Then add this immediately after `const isOnline = useOnlineStatus();` (line 20):

```tsx
  /*
   * Chrome is the largest single lever on board size at 360px wide, and none of what the
   * app header offers is something a resident does mid-round: they are not switching
   * language or opening settings while guests walk out. Both remain one tap away from
   * Home, Rotation and Settings. Hiding the header returns 80px, and the offline banner
   * another 48px - and offline is the normal case on care-home wifi, not an edge case.
   *
   * The component stays mounted either way, so the text-size effect below keeps running.
   */
  const inGame = useMatch('/app/game/:gameId') !== null;
```

- [ ] **Step 2: Make the header and banner conditional**

In `src/components/AppShell.tsx`, wrap the header. Replace line 39:

```tsx
      <header className="bg-card-bg shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
```

with:

```tsx
      {!inGame && (
      <header className="bg-card-bg shadow-sm px-6 py-4 flex items-center justify-between">
```

Note the removal of `sticky top-0 z-10`: once `main` owns no scroll, sticky positioning is inert, and leaving it in falsely suggests the header moves.

Then close that conditional. Replace line 70:

```tsx
      </header>
```

with:

```tsx
      </header>
      )}
```

Then gate the offline banner. Replace line 73:

```tsx
      {!isOnline && (
```

with:

```tsx
      {!isOnline && !inGame && (
```

- [ ] **Step 2b: Make `main`'s overflow conditional**

Task 1 gave `main` `overflow-y-auto` unconditionally so that tall screens stayed reachable.
Now that the route is known, a game gets `overflow-hidden` instead: a game never scrolls,
every other route may.

Replace the `<main>` opening tag with:

```tsx
      <main
        className={`flex-1 min-h-0 flex flex-col ${inGame ? 'overflow-hidden' : 'overflow-y-auto'}`}
        role="main"
      >
```

- [ ] **Step 3: Slim the GameShell bar**

In `src/components/GameShell.tsx`, replace line 137:

```tsx
      <div className="panel-surface px-6 py-4 flex items-center gap-4">
```

with:

```tsx
      {/*
        Target 56px rather than 80px. This is the only chrome on a game route now, so the
        padding it spends comes straight out of the board.
      */}
      <div className="panel-surface flex-none px-4 py-2 flex items-center gap-3">
```

Replace lines 144-146, dropping the category tag on narrow screens. The game's own title already says what is being played:

```tsx
        <span className="shell-tag shell-tag-category">
          {t(CATEGORY_LABEL_KEYS[gameCategory] ?? '')}
        </span>
```

with:

```tsx
        <span className="shell-tag shell-tag-category hidden sm:inline-flex">
          {t(CATEGORY_LABEL_KEYS[gameCategory] ?? '')}
        </span>
```

Replace the exit button's className on line 154:

```tsx
          className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-hover-state transition-colors text-xl text-caption-text border border-gray-200 bg-white/70"
```

with:

```tsx
          /*
           * 44x44 rather than 48x48. Above the WCAG 2.5.5 minimum but deliberately below
           * this app's own 80px touch-min token: exit ends a round, and it should not be
           * easy to hit by accident. This exception applies to exit and nothing else.
           */
          className="w-11 h-11 shrink-0 rounded-xl flex items-center justify-center hover:bg-hover-state transition-colors text-xl text-caption-text border border-gray-200 bg-white/70"
```

- [ ] **Step 4: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass.

- [ ] **Step 5: Verify manually at 360px**

Run `npm run dev`, open devtools, set the device toolbar to a 360x640 viewport.

Check all of:
1. On `/app/home` the app header and language switcher are present.
2. On `/app/game/<any v1 game>` the app header is gone and only the game bar shows.
3. The game bar holds its title on one line and shows no category tag.
4. Navigating back to Home restores the header.
5. In Settings, set text size to Extra Large, then open a game. The bar grows taller and the board shrinks. Nothing clips.

- [ ] **Step 6: Bump version and commit**

Set `"version": "1.14.0"` in `package.json`.

```bash
git add src/components/AppShell.tsx src/components/GameShell.tsx package.json
git commit -m "feat(layout): spend the chrome budget on the board instead"
```

---

### Task 6: Orientation

Two layers: the manifest for installed PWAs, and a CSS-driven gate for browser tabs where the Screen Orientation API cannot lock without fullscreen.

**Files:**
- Modify: `vite.config.ts:11-23`
- Modify: `src/styles/index.css`
- Create: `src/components/RotateDevice.tsx`
- Modify: `src/components/AppShell.tsx`
- Modify: `public/locales/en/common.json`, `public/locales/hi/common.json`, `public/locales/kn/common.json`
- Modify: `package.json`

**Interfaces:**
- Consumes: nothing from earlier tasks.
- Produces: `<RotateDevice />`, a default export taking no props.

- [ ] **Step 1: Declare portrait in the manifest**

In `vite.config.ts`, add the `orientation` field to the manifest object, after `display: 'standalone',` on line 17:

```ts
        display: 'standalone',
        orientation: 'portrait-primary',
```

Note this is authoritative on Android when installed to the home screen. **iPadOS ignores it**, which is why step 2 exists.

- [ ] **Step 2: Add the gate's CSS**

In `src/styles/index.css`, inside the `@layer components` block, after `.app-root`, add:

```css
  /*
   * The landscape gate.
   *
   * Driven by a media query rather than a JS resize listener, so it cannot flicker or
   * miss an event, and so it costs nothing while the device is upright.
   *
   * `pointer: coarse` is the guard that keeps this off desktop browsers, whose windows
   * are almost always wider than tall - without it `npm run dev` on a laptop would show
   * nothing but this card. It is a touch-device gate, which is exactly the audience the
   * portrait lock is for.
   */
  .rotate-gate { display: none; }

  @media (orientation: landscape) and (pointer: coarse) {
    .rotate-gate {
      position: fixed;
      inset: 0;
      z-index: 100;
      display: flex;
      flex-direction: column;
      align-items: center;
      justify-content: center;
      gap: 1rem;
      padding: 2rem;
      text-align: center;
      background: #F4F5F7;
    }
  }
```

- [ ] **Step 3: Write the component**

Create `src/components/RotateDevice.tsx`:

```tsx
import { useTranslation } from 'react-i18next';

/**
 * Asks the resident to turn the device upright.
 *
 * Rendered as a sibling that covers the app, never as a wrapper that replaces it. A
 * resident who tilts a tablet mid-round must not lose the round, so the app underneath
 * stays mounted and keeps its state; only the view is covered.
 *
 * The tone is deliberately gentle. On iPad this fires whenever a tablet is picked up
 * sideways, which is an ordinary thing to do and not a mistake to be scolded for.
 */
export default function RotateDevice() {
  const { t } = useTranslation();

  return (
    <div className="rotate-gate" role="status" aria-live="polite">
      <div aria-hidden className="text-6xl">📱</div>
      <h2 className="text-h2 font-bold text-primary-blue">
        {t('rotate.title', 'Please turn your device upright')}
      </h2>
      <p className="text-body-md text-caption-text max-w-sm">
        {t('rotate.body', 'This app works best standing tall. Your progress is safe.')}
      </p>
    </div>
  );
}
```

- [ ] **Step 4: Mount it in AppShell**

In `src/components/AppShell.tsx`, add the import after the `useOnlineStatus` import (line 6):

```tsx
import RotateDevice from './RotateDevice';
```

Then render it as the last child inside the `.app-root` div, immediately after the closing `</main>` tag:

```tsx
      </main>

      {/* A cover, not a replacement: the app above stays mounted and keeps its state. */}
      <RotateDevice />
    </div>
```

- [ ] **Step 5: Add the copy in all three languages**

Add two keys to each of the three locale files. They are flat, dot-separated keys in a single JSON object, alongside the existing `offline.banner`.

`public/locales/en/common.json`:

```json
  "rotate.title": "Please turn your device upright",
  "rotate.body": "This app works best standing tall. Your progress is safe.",
```

`public/locales/hi/common.json`:

```json
  "rotate.title": "कृपया अपना डिवाइस सीधा करें",
  "rotate.body": "यह ऐप सीधी स्थिति में सबसे अच्छा चलता है। आपकी प्रगति सुरक्षित है।",
```

`public/locales/kn/common.json`:

```json
  "rotate.title": "ದಯವಿಟ್ಟು ನಿಮ್ಮ ಸಾಧನವನ್ನು ನೇರವಾಗಿ ಇರಿಸಿ",
  "rotate.body": "ಈ ಅಪ್ಲಿಕೇಶನ್ ನೇರವಾಗಿದ್ದಾಗ ಉತ್ತಮವಾಗಿ ಕೆಲಸ ಮಾಡುತ್ತದೆ. ನಿಮ್ಮ ಪ್ರಗತಿ ಸುರಕ್ಷಿತವಾಗಿದೆ.",
```

- [ ] **Step 6: Verify the locale files stayed in sync**

Run:

```bash
node -e "const fs=require('fs');const ks=['en','hi','kn'].map(l=>Object.keys(JSON.parse(fs.readFileSync('public/locales/'+l+'/common.json','utf8'))));console.log(ks.map(k=>k.length));const [a,b,c]=ks;const miss=a.filter(k=>!b.includes(k)||!c.includes(k));console.log('missing in hi/kn:',miss)"
```

Expected: three equal counts (513 each), and `missing in hi/kn: []`.

- [ ] **Step 7: Verify the build and the gate**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass.

Run `npm run dev`. In devtools, enable the device toolbar (which sets `pointer: coarse`), pick a phone, and rotate it to landscape. Expected: the rotate card covers the screen. Rotate back: the app is exactly as it was, mid-round state intact.

Then disable the device toolbar and make the desktop window wider than tall. Expected: **no** rotate card, because a mouse is `pointer: fine`.

- [ ] **Step 8: Bump version and commit**

Set `"version": "1.15.0"` in `package.json`.

```bash
git add vite.config.ts src/styles/index.css src/components/RotateDevice.tsx src/components/AppShell.tsx public/locales package.json
git commit -m "feat(layout): keep the app upright"
```

---

### Task 7: Train Yard onto the stage hook

First game onto the contract. Its board is the simplest to eyeball, which is why it goes first. Its *code* is not the model to copy: it carries the ref defect described in Task 3.

**Files:**
- Modify: `src/games/memory/TrainYard/index.tsx:326-341,371`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useStageScale` from Task 3, the play box from Task 4.
- Produces: the wrapper pattern that Tasks 8, 9 and 11 repeat.

- [ ] **Step 1: Import the hook**

In `src/games/memory/TrainYard/index.tsx`, add near the other local imports:

```tsx
import { useStageScale } from '../../../hooks/useStageFit';
```

- [ ] **Step 2: Replace the measure effect**

Delete the whole block at lines 326-341, which is the `wrapRef` declaration, the `scale` state and the `useEffect` containing `measure`, `ResizeObserver` and the window listener. Note `CANVAS_H` here is `HUD_H (96) + BOARD_H (1180)` = **1276**, not 1180; the hook takes the canvas, not the board.

Replace it with:

```tsx
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H);
```

Remove the now-unused `useRef` / `useLayoutEffect` / `useEffect` imports only if nothing else in the file uses them. Check before deleting; `npx tsc -b` will tell you.

- [ ] **Step 3: Restructure the wrapper**

Replace line 371:

```tsx
    <div ref={wrapRef} style={{ width: '100%', height: CANVAS_H * scale, overflow: 'hidden' }}>
```

with:

```tsx
    /*
     * Two divs, and the split matters. The outer one is the stage: `w-full h-full`, so
     * its size comes from the play box above and never from the board below. That is the
     * element the observer watches. The inner one carries the scale. Observing the scaled
     * element instead would close an observe-resize-observe loop.
     */
    <div ref={stageRef} className="w-full h-full overflow-hidden">
```

Then, in the inner `<div>` that follows (the one with `width: CANVAS_W, height: CANVAS_H, transform`), change `transform: \`scale(${scale})\`` to `transform: \`scale(${stage.scale})\``.

- [ ] **Step 4: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass. If `tsc` reports unused imports, remove them.

- [ ] **Step 5: Verify at three viewport sizes**

Run `npm run dev` and open Train Yard at 360x640, 390x844 and 768x1024 in the device toolbar.

Expected at 360x640: the board is roughly 346px wide and centred, the page does not scroll, and the bottom of the board is visible. The canvas is 800x1276, so `fitScale(360, 552, 800, 1276)` is about 0.433.

Resize the window while the board is on screen. Expected: it rescales smoothly, and the console shows no "ResizeObserver loop completed with undelivered notifications" warning. That warning means the ref went on the wrong div; go back to step 3.

- [ ] **Step 6: Bump version and commit**

Set `"version": "1.15.1"` in `package.json`.

```bash
git add src/games/memory/TrainYard/index.tsx package.json
git commit -m "refactor(train-yard): measure the play box instead of the viewport"
```

---

### Task 8: Garden Keeper and Market Memory onto the stage hook

Two games, identical change, identical to Task 7. They are one task because neither is independently interesting to review.

**Files:**
- Modify: `src/games/attention/GardenKeeper/index.tsx:531-547,573`
- Modify: `src/games/memory/MarketMemory/index.tsx:283-301,323`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useStageScale` from Task 3.
- Produces: nothing new.

- [ ] **Step 1: Convert Garden Keeper**

In `src/games/attention/GardenKeeper/index.tsx`, add the import:

```tsx
import { useStageScale } from '../../../hooks/useStageFit';
```

Delete the `wrapRef` declaration, the `scale` state and the `useEffect` containing `measure` (lines 531-547 in the current file, ending at `}, []);`). Replace with:

```tsx
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H);
```

Replace the wrapper at line 573. The existing comment above it describes the old approach and is now wrong, so replace the comment too:

```tsx
    // Same stage wrapper as every other board: an unscaled `w-full h-full` div that the
    // observer watches, and a scaled child inside it.
    <div ref={stageRef} className="w-full h-full overflow-hidden">
```

Then change `transform: \`scale(${scale})\`` to `transform: \`scale(${stage.scale})\`` in the inner div.

Garden Keeper's canvas is 800x1280 (`geometry.ts:6-7`).

- [ ] **Step 2: Convert Market Memory**

In `src/games/memory/MarketMemory/index.tsx`, add the same import:

```tsx
import { useStageScale } from '../../../hooks/useStageFit';
```

Delete the `wrapRef` declaration at line 283, the `scale` state, and the `useEffect` at lines 285-301. Replace with:

```tsx
  const [stageRef, stage] = useStageScale(CANVAS_W, CANVAS_H);
```

At line 323, change `ref={wrapRef}` to `ref={stageRef}` and give that div `className="w-full h-full overflow-hidden"`, removing any inline `width`/`height`/`overflow` style it carries. Change the inner scaled div's `transform` to use `stage.scale`.

Market Memory's canvas is 800x1422 (`geometry.ts:15-16`).

- [ ] **Step 3: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass. Remove any imports `tsc` now reports as unused.

- [ ] **Step 4: Verify both at 360x640**

Run `npm run dev`. Open each game at 360x640.

Expected: Garden Keeper about 345px wide (scale ~0.431), Market Memory about 311px wide (scale ~0.388). Neither page scrolls. No ResizeObserver warning in the console.

Market Memory is the most height-bound board in the set. Check its HUD text is still legible at 0.39 and note it if not; that is a follow-up, not a blocker for this task.

- [ ] **Step 5: Bump version and commit**

Set `"version": "1.15.2"` in `package.json`.

```bash
git add src/games/attention/GardenKeeper/index.tsx src/games/memory/MarketMemory/index.tsx package.json
git commit -m "refactor(garden-keeper,market-memory): measure the play box instead of the viewport"
```

---

### Task 9: Clear the Way

Different from the three scaled boards: it sizes cells from the available box rather than scaling a canvas. It also has a measured overflow to fix.

At 6 columns (the largest grid in `levels.ts`) and `MIN_CELL = 56`, `boardMetrics` gives `wall = round(56 * 0.35) = 20` and `boardW = 6 * 56 + 40 = 376px`, which is 16px wider than a 360px viewport. `MIN_CELL` is a hard `Math.max` floor, so the board cannot shrink to fit. Lowering the floor to 52 gives `6 * 52 + 2 * round(52 * 0.35) = 312 + 36 = 348px`, which fits.

**Files:**
- Modify: `src/games/executive/ClearTheWay/geometry.ts:13`
- Modify: `src/games/executive/ClearTheWay/__tests__/geometry.test.ts`
- Modify: `src/games/executive/ClearTheWay/index.tsx:99-118`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useStageFit` from Task 3.
- Produces: `MIN_CELL` is now 52.

- [ ] **Step 1: Write the failing test**

In `src/games/executive/ClearTheWay/__tests__/geometry.test.ts`, add a new `describe` block at the end of the file:

```ts
describe('the largest board on the narrowest supported screen', () => {
  // The widest grid any level declares (see levels.ts), on a 360px phone.
  const WIDEST: LevelDef = {
    id: 'test-widest',
    tier: 5,
    cols: 6,
    rows: 6,
    exit: { side: 'right', index: 2 },
    layout: ['......', '......', 'KK....', '......', '......', '......'],
    minMoves: 1,
    dependencyDepth: 0,
  };

  it('fits inside a 360px viewport', () => {
    // 360px screen, minus GameShell's p-4 on both sides.
    const m = boardMetrics(parseLevel(WIDEST), 328, 552);
    expect(m.boardW).toBeLessThanOrEqual(360);
  });
});
```

- [ ] **Step 2: Run the test to verify it fails**

Run: `npx vitest run src/games/executive/ClearTheWay/__tests__/geometry.test.ts`
Expected: FAIL. `boardW` is 376, which is greater than 360.

- [ ] **Step 3: Lower the floor**

In `src/games/executive/ClearTheWay/geometry.ts`, replace lines 9-13:

```ts
/**
 * A 1x1 block at the smallest cell is 56px, under the app's 80px touch-target minimum.
 * That floor is unavoidable on a 7x7 grid on a narrow tablet; the mitigation is to keep
 * 1x1 pieces out of the large boards rather than to shrink the target.
 */
export const MIN_CELL = 56;
```

with:

```ts
/**
 * A 1x1 block at the smallest cell is 52px, under the app's 80px touch-target minimum.
 * That floor is unavoidable on the widest grid on the narrowest supported phone; the
 * mitigation is to keep 1x1 pieces out of the large boards rather than to shrink the
 * target.
 *
 * It was 56, which put the widest board (6 columns) at 6*56 + 2*round(56*0.35) = 376px,
 * i.e. 16px wider than a 360px phone with no way to shrink, since this is a hard floor.
 * 52 gives 348px and fits. The alternative was capping the grid at 5 columns on narrow
 * screens, which would have changed the difficulty curve rather than the pixels.
 */
export const MIN_CELL = 52;
```

- [ ] **Step 4: Run the tests to verify they pass**

Run: `npx vitest run src/games/executive/ClearTheWay/__tests__/geometry.test.ts`
Expected: PASS, including the pre-existing `clamps between the touch-target floor and the ceiling` test, which asserts `boardMetrics(board, 40, 40).cell` equals `MIN_CELL` and so follows the constant automatically.

- [ ] **Step 5: Adopt the hook**

In `src/games/executive/ClearTheWay/index.tsx`, add the import:

```tsx
import { useStageFit } from '../../../hooks/useStageFit';
```

Delete the `frameRef` declaration, the `avail` state and the whole `useLayoutEffect` at lines 99-118. Replace with:

```tsx
  const [stageRef, avail] = useStageFit();
```

`boardMetrics(start, avail.w, avail.h)` on the next line becomes:

```tsx
  const metrics = useMemo(() => boardMetrics(start, avail.width, avail.height), [start, avail]);
```

Note the property rename: the hook returns `{ width, height }`, not `{ w, h }`.

Then change the wrapper div's `ref={frameRef}` to `ref={stageRef}` and give it `className="w-full h-full overflow-hidden"`.

If `CHROME_H` is now unreferenced, delete the constant.

- [ ] **Step 6: Verify the build and the board**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, all tests pass.

Run `npm run dev` and open Clear the Way at 360x640. Expected: the board fits within the screen with no horizontal scroll, on the largest level you can reach. No ResizeObserver warning.

- [ ] **Step 7: Bump version and commit**

Set `"version": "1.15.3"` in `package.json`.

```bash
git add src/games/executive/ClearTheWay package.json
git commit -m "fix(clear-the-way): fit the widest board on the narrowest phone"
```

---

### Task 10: Non-game screens take ownership of their scrolling

These screens legitimately exceed a 640px viewport. Under the contract they scroll themselves rather than pushing `main`.

**Files:**
- Modify: `src/screens/CareHomeSelector.tsx:172,206,268,339`
- Modify: `src/screens/ProfileSelector.tsx:68`
- Modify: `src/screens/SignupFlow.tsx:115`
- Modify: `package.json`

**Interfaces:**
- Consumes: the bounded `main` from Task 4.
- Produces: nothing.

- [ ] **Step 1: Convert CareHomeSelector**

In `src/screens/CareHomeSelector.tsx`, replace `min-h-screen` with `h-full overflow-y-auto` on each of lines 172, 206, 268 and 339.

For example line 172:

```tsx
      <div className="min-h-screen bg-[#060A18] flex flex-col items-center justify-between p-8 text-white">
```

becomes:

```tsx
      <div className="h-full overflow-y-auto bg-[#060A18] flex flex-col items-center justify-between p-8 text-white">
```

Line 268 already carries `overflow-y-auto`; there, just swap `min-h-screen` for `h-full` and leave the existing `overflow-y-auto` in place rather than duplicating it.

Note this screen is outside `AppShell`, so `h-full` resolves against `#root`. Step 4 makes that work.

- [ ] **Step 2: Convert ProfileSelector and SignupFlow**

`src/screens/ProfileSelector.tsx` line 68:

```tsx
    <div className="h-full overflow-y-auto bg-app-bg flex flex-col p-8">
```

`src/screens/SignupFlow.tsx` line 115:

```tsx
    <div className="h-full overflow-y-auto bg-app-bg flex flex-col items-center justify-center p-8">
```

Leave `ProfileSelector.tsx:102` alone. It is already `grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5` and needs no change; an earlier draft of the spec wrongly claimed otherwise.

- [ ] **Step 3: Confirm the in-shell screens already have a scroll owner**

`HomeScreen`, `SettingsScreen`, `RotationScreen`, `SessionSummary` and `DailyQuestionnaire`
render inside `AppShell`'s `main`, which took conditional scroll ownership in Task 5, Step 2b.
No change here; this task only covers the three public routes outside `AppShell`.

- [ ] **Step 4: Confirm `h-full` resolves for the public routes**

`CareHomeSelector`, `SignupFlow` and `ProfileSelector` are not inside `AppShell`, so their `h-full` needs a definite height on their ancestors. That rule (`html, body, #root { height: 100%; }`) was added in Task 1, Step 2. Confirm it is present in `src/styles/index.css` rather than adding it again.

- [ ] **Step 5: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass.

- [ ] **Step 6: Verify every non-game screen at 360x640**

Run `npm run dev` at a 360x640 viewport and visit, in order: `/` (care home selector, including its search dropdown), `/signup`, a `/login/:careHomeId` profile list, then `/app/home`, `/app/settings`, `/app/rotation` and `/app/summary`.

Expected for each: content is reachable by scrolling where it exceeds the viewport, nothing is clipped or cut off, and the app header stays fixed at the top rather than scrolling away.

- [ ] **Step 7: Bump version and commit**

Set `"version": "1.15.4"` in `package.json`.

```bash
git add src/screens/CareHomeSelector.tsx src/screens/ProfileSelector.tsx src/screens/SignupFlow.tsx src/components/AppShell.tsx src/styles/index.css package.json
git commit -m "fix(layout): let the non-game screens own their scrolling"
```

---

### Task 11: Spot Focus stacks vertically

The first real redesign. Spot Focus renders its two scenes side by side (`panel * 2 + PANEL_GAP` at `index.tsx:91`), which at 360px means up to 8 card columns across a 328px content width, roughly 41px per card, in a game whose whole premise is comparing fine detail.

**Files:**
- Modify: `src/games/attention/SpotFocus/index.tsx:29-31,70-103,189-193`
- Modify: `src/games/attention/SpotFocus/Scene.tsx:36-48`
- Modify: `package.json`

**Interfaces:**
- Consumes: `useStageFit` from Task 3.
- Produces: nothing.

- [ ] **Step 1: Remove the viewport assumption from Scene**

In `src/games/attention/SpotFocus/Scene.tsx`, delete the final paragraph of the doc comment (lines 36-42, beginning "The 12rem in the min-height is GameShell's chrome"), since the condition it describes no longer exists.

Replace line 48:

```tsx
      className="flex min-h-[calc(100vh-12rem)] flex-1 flex-col items-center gap-3 bg-cover bg-center bg-no-repeat px-4 py-3"
```

with:

```tsx
      className="flex h-full min-h-0 flex-col items-center gap-3 bg-cover bg-center bg-no-repeat px-4 py-3"
```

The backdrop now fills the play box because the play box has a height, which is what the deleted comment was working around.

- [ ] **Step 2: Stack the two panels**

In `src/games/attention/SpotFocus/index.tsx`, replace the board container at lines 189-193:

```tsx
      <div
        ref={boardRef}
        className="flex w-full gap-3 md:gap-4"
        style={{ maxWidth: maxBoardWidth }}
      >
```

with:

```tsx
      {/*
        Stacked, not side by side. Two 3-to-4 column grids across a 328px content width
        gave roughly 41px cards, which is unreadable for a game about spotting small
        differences. Stacking sizes the cards off the height budget instead, and the
        comparison becomes an up-down glance rather than left-right.
      */}
      <div
        ref={stageRef}
        className="flex w-full min-h-0 flex-1 flex-col gap-2 md:gap-3"
        style={{ maxWidth: boardWidth }}
      >
```

- [ ] **Step 3: Replace the measurement**

Add the import:

```tsx
import { useStageFit } from '../../../hooks/useStageFit';
```

Delete the `boardRef` declaration, the `maxBoardWidth` state and the whole `useLayoutEffect` at lines 76-103. Replace with:

```tsx
  const [stageRef, stageBox] = useStageFit();

  /*
   * Cards are 3:4 and sized by width, and the two panels now sit one above the other, so
   * each gets half the height. Work back from that to the width the board may take.
   */
  const boardWidth = useMemo(() => {
    if (stageBox.height <= 0) return undefined;
    const perPanel = (stageBox.height - PANEL_GAP) / 2;
    const cardHeight = (perPanel - GAP * (gridRows - 1) - PANEL_PADDING * 2) / gridRows;
    const cardWidth = (cardHeight * 3) / 4;
    const panel = cardWidth * gridCols + GAP * (gridCols - 1) + PANEL_PADDING * 2;
    return Math.max(0, Math.round(Math.min(panel, stageBox.width)));
  }, [stageBox, gridRows, gridCols]);
```

Ensure `useMemo` is imported from React.

- [ ] **Step 4: Delete the constants the stacking makes wrong**

At `src/games/attention/SpotFocus/index.tsx:21-31`, delete these three, which all describe the old side-by-side, viewport-measured layout:

```ts
/** Breathing room kept below the board, so it never sits flush to the viewport edge. */
const BOARD_FOOTER = 24;
/** The ribbon label and its gap, which sit inside the measured box above the cards. */
const RIBBON_H = 56;
/** Never shrink past this, however short the window; scrolling beats unreadable. */
const MIN_BOARD_WIDTH = 420;
```

`MIN_BOARD_WIDTH` in particular is now a direct contradiction of the contract: it says "scrolling beats unreadable" and forces a 420px board onto a 360px screen. Under the play-box contract the board fits or it scales; it does not scroll.

Keep `GAP`, `PANEL_PADDING` and `PANEL_GAP`, which the new calculation uses.

- [ ] **Step 5: Verify the build**

Run: `npx tsc -b && npx vitest run`
Expected: build succeeds, tests pass.

- [ ] **Step 6: Verify at 360x640 and on a real device**

Run `npm run dev` and open Spot Focus at 360x640.

Expected: the two scenes are stacked, the page does not scroll, both grids are fully visible at once, and the cards are noticeably larger than 41px.

Then check it on an actual phone or tablet. The up-down comparison is a real change to how the game reads and only a person can judge whether it works. Record the verdict; if it reads badly, that is a design conversation, not a bug in this task.

- [ ] **Step 7: Bump version and commit**

Set `"version": "1.16.0"` in `package.json`.

```bash
git add src/games/attention/SpotFocus package.json
git commit -m "feat(spot-focus): stack the two scenes for portrait"
```

---

### Task 12: The portrait smoke script

Two assertions per game at three viewport sizes. These catch essentially every regression this work is about.

**Files:**
- Create: `scripts/portrait-smoke.mjs`
- Modify: `package.json` (script entry and version)

**Interfaces:**
- Consumes: all previous tasks.
- Produces: `npm run smoke:portrait`.

- [ ] **Step 1: Write the script**

Playwright resolves from `node_modules/.bin/playwright` transitively even though it is not in `devDependencies`, and the driver must live inside the project root for the import to resolve.

Create `scripts/portrait-smoke.mjs`:

```js
/**
 * Portrait fit smoke test.
 *
 * Drives each v1 game at the three binding viewport sizes and asserts the two things the
 * portrait work is actually about: the page does not scroll, and the board fits inside
 * the play box.
 *
 * Run against a dev server: `npm run dev` in one terminal, this in another.
 *
 * Playwright is available transitively rather than declared, which is why this is a
 * script rather than a test suite.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:5173';

const VIEWPORTS = [
  { name: 'phone-360',  width: 360,  height: 640 },
  { name: 'phone-390',  width: 390,  height: 844 },
  { name: 'tablet-768', width: 768,  height: 1024 },
];

// Serve the Guests is absent deliberately: its portrait build is a separate plan.
const GAMES = ['train-yard', 'garden-keeper', 'market-memory', 'clear-the-way', 'spot-focus'];

const today = new Date().toISOString().slice(0, 10);

function seed(gameId) {
  return {
    state: {
      activeProfile: {
        userId: 'smoke-user', firstName: 'Smoke', lastName: 'Test',
        careHomeId: 'smoke-home', language: 'en', createdAt: Date.now(),
        soundEnabled: false, textSize: 'normal',
      },
      currentSession: {
        date: today, questionnaireCompleted: true, focusCategory: 'memory',
        categoriesCompleted: [], currentCategory: 'memory', currentGameId: gameId,
        secondsInCurrentCategory: 0, sessionStartedAt: Date.now(),
      },
      language: 'en', textSize: 'normal', soundEnabled: false,
    },
    version: 0,
  };
}

const failures = [];

const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  for (const gameId of GAMES) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      ['brain-training-store', JSON.stringify(seed(gameId))],
    );

    await page.goto(`${BASE}/app/game/${gameId}`, { waitUntil: 'networkidle' });

    // Every one of these games renders a loading node while its sprites decode. Measuring
    // before that resolves measures an empty box and passes for the wrong reason.
    await page.waitForTimeout(2500);

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const playBox = document.querySelector('[data-testid="play-box"]');
      const box = playBox?.getBoundingClientRect() ?? null;
      const child = playBox?.firstElementChild?.getBoundingClientRect() ?? null;
      return {
        docScrolls: doc.scrollHeight > doc.clientHeight + 1,
        playBox: box && { w: box.width, h: box.height },
        board: child && { w: child.width, h: child.height },
      };
    });

    const label = `${vp.name} / ${gameId}`;

    if (result.docScrolls) {
      failures.push(`${label}: the document scrolls`);
    }
    if (!result.playBox || result.playBox.h <= 0) {
      failures.push(`${label}: play box has no height (found ${JSON.stringify(result.playBox)})`);
    } else if (result.board) {
      if (result.board.w > result.playBox.w + 1 || result.board.h > result.playBox.h + 1) {
        failures.push(
          `${label}: board ${result.board.w}x${result.board.h} overflows play box ` +
          `${result.playBox.w}x${result.playBox.h}`,
        );
      } else {
        console.log(`ok  ${label}: board ${Math.round(result.board.w)}x${Math.round(result.board.h)}`);
      }
    }

    await context.close();
  }
}

// The landscape gate: it must appear, and it must not unmount the app beneath it.
{
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ['brain-training-store', JSON.stringify(seed('train-yard'))],
  );
  await page.goto(`${BASE}/app/game/train-yard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const gateVisible = await page.locator('.rotate-gate').isVisible();
  const appStillMounted = (await page.locator('main').count()) > 0;

  if (!gateVisible) failures.push('landscape: the rotate gate did not appear');
  if (!appStillMounted) failures.push('landscape: the app unmounted behind the gate');
  if (gateVisible && appStillMounted) console.log('ok  landscape: gate shown, app still mounted');

  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('\nAll portrait fit checks passed.');
```

- [ ] **Step 2: Add the npm script**

In `package.json`, add to `scripts`:

```json
    "smoke:portrait": "node scripts/portrait-smoke.mjs"
```

- [ ] **Step 3: Run it and confirm it passes**

In one terminal: `npm run dev`
In another: `npm run smoke:portrait`

Expected: 16 `ok` lines (5 games x 3 viewports, plus the landscape check) and "All portrait fit checks passed."

If the script reports "play box has no height" for every game, the `data-testid="play-box"` attribute added in Task 4 is missing. Restore it rather than loosening the assertion.

- [ ] **Step 4: Confirm it can actually fail**

Temporarily change one viewport's height to `320` and re-run. Expected: failures are reported and the process exits non-zero. Revert the change.

A check that has never been seen to fail has not been verified.

- [ ] **Step 5: Bump version and commit**

Set `"version": "1.16.1"` in `package.json`.

```bash
git add scripts/portrait-smoke.mjs package.json
git commit -m "test(layout): assert portrait fit across the v1 games"
```

---

## Final verification

After Task 12, run the full checklist from `CLAUDE.md`:

- [ ] `npx vitest run` is green.
- [ ] `npm run build` completes with no TypeScript or Vite errors.
- [ ] `npm run lint` error count has not risen above the 38 pre-existing errors. Record the count.
- [ ] `npm run smoke:portrait` passes.
- [ ] Manual: start a session, refresh the page, confirm the Resume button appears. The smoke script seeds `localStorage` directly and bypasses Dexie, so it cannot cover session resume.
- [ ] Manual on a real phone and a real tablet: the `GameShell` title on one line in `hi` and `kn` at text size Extra Large on a 360px screen; the Spot Focus up-down comparison; the rotate gate's tone on an iPad picked up sideways.

## Follow-ups this plan deliberately leaves open

1. **Serve the Guests portrait.** Blocked on the five asset questions in spec section 7.5, item 1 (the missing DISPOSE button) hardest. Needs its own plan.
2. **`text-size-*` has no effect inside the scaled canvases.** None of the four scaled games uses rem inside its design canvas, so a resident who needs larger text gets it everywhere except the game they are playing. Spec section 5.2 names this; it is an accessibility gap that deserves a decision.
3. **The 38 pre-existing lint errors.** Untouched here on purpose.
4. **`CLAUDE.md` says the locale files are `translation.json`.** They are `common.json`. A one-line docs fix, out of scope for this plan.
5. **The nine non-v1 games are unaudited.** `RememberMatch/index.tsx:366` uses `min-h-full` and will break under the contract in the same way the `min-h-screen` screens did; whoever surfaces that game next should start there.
