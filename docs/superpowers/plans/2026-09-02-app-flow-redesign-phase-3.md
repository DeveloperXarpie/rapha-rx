# App Flow Redesign — Phase 3 (Onboarding and Settings) Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restyle the way in - splash, name and prescriber, confirmation, sign-in - and Settings, onto the redesigned visual language, and retire the dead onboarding code.

**Architecture:** One screen file per step, replacing `CareHomeSelector`'s four internal steps. Prescriber replaces care home in the UI while `UserProfile.careHomeId` stays the storage field, so nothing in Dexie, Firestore or Amplitude changes shape.

**Tech Stack:** React 18, TypeScript, Vite 7, Tailwind 3, react-router-dom 6, Zustand, Dexie, i18next, vitest.

**Spec:** `docs/superpowers/specs/2026-09-02-app-flow-redesign-design.md`

**Phases 1-2 (complete):** provide `gameCatalog`, `BRAND`/`CATEGORY_BRAND`, `brand.css`, `Button` green/blue, the `chrome/*` components, the `.app-root` portrait column, and the whole session flow.

## Global Constraints

- **Version bump every commit.** Phase 3 is a patch series on 1.19.3, closing at **1.20.0**.
- **`npm run lint` must not add errors.** Baseline is 37 errors + 1 warning.
- **`npm test` must pass.** Baseline 36 files / 378 tests.
- **`npm run build` must pass.**
- **Never use an em dash.** Plain dash only.
- **Do not add a `Co-Authored-By` trailer** naming an agent.
- **Every user-visible string goes through `t()`** and gets a real key in all three of `public/locales/{en,hi,kn}/common.json`. Currently 558 keys each, 4 untranslated in hi - do not regress that.
- **`careHomeId` remains the storage field.** "Prescriber" is a UI label only. No Dexie migration, no change to the Amplitude user property, no change to the Firestore document shape.

## What the codebase actually looks like (corrections to the spec)

Three things the spec and the phase 2 plan asserted turned out to be wrong, found by reading the code:

1. **`SignupFlow` and `ProfileSelector` are dead code.** Nothing navigates to `/signup` or `/login/:careHomeId` except `ProfileSelector` linking to itself. The spec called `/login/:careHomeId` "the only sign-in path for existing profiles" and phase 2 preserved it on that basis; it was never reachable. Both files and both routes are deleted here as dead code, not migrated.
2. **`CareHomeSelector` is the entire live onboarding flow**, a 371-line file with four internal steps - `landing`, `signup`, `login`, `welcome` - which map one-to-one onto handoff screens 2, 3, 5 and 4. The handoff's "Confirmation" screen already exists as the `welcome` step, live clock and all.
3. **A name-across-all-profiles lookup already exists.** `CareHomeSelector` reads `appDb.userProfile.toArray()` and matches on `firstName`/`nickname`. The spec said phase 3 would need to add a `getAllProfiles` helper. It does not.

A fourth, which the spec did predict: **there are three incompatible care-home lists.** `CareHomeSelector`'s `LOCATIONS` uses ids like `silver-meadows`; `SettingsScreen` and `ProfileSelector` each hold a `CARE_HOME_NAMES` map using entirely different ids like `asha-indiranagar`. A profile created through the live flow has a `silver-meadows`-style id that Settings cannot resolve to a name today. `prescribers.ts` must carry both id families or existing profiles lose their label.

## File Structure

**Created:**

| File | Responsibility |
|---|---|
| `src/lib/prescribers.ts` | The prescriber list and id-to-name resolution, reconciling all three existing lists |
| `src/lib/__tests__/prescribers.test.ts` | Tests, including that every legacy id still resolves |
| `src/components/chrome/AppFrame.tsx` | The `.app-frame` / `.app-root` wrapper, so public routes get the portrait column too |
| `src/components/chrome/PrescriberPicker.tsx` | The modal sheet, shared by signup and Settings |
| `src/screens/SplashScreen.tsx` | Handoff screen 2 |
| `src/screens/SignupScreen.tsx` | Handoff screens 3 and 4, as two internal steps |
| `src/screens/SignInScreen.tsx` | Handoff screen 5 |

**Modified:** `src/App.tsx`, `src/components/AppShell.tsx` (use `AppFrame`), `src/screens/SettingsScreen.tsx`, locales, `package.json`

**Deleted:** `src/screens/CareHomeSelector.tsx`, `src/screens/SignupFlow.tsx`, `src/screens/ProfileSelector.tsx`

---

### Task 1: Prescribers, and the shared app frame

**Files:** create `src/lib/prescribers.ts`, `src/lib/__tests__/prescribers.test.ts`, `src/components/chrome/AppFrame.tsx`; modify `src/components/AppShell.tsx`, `package.json`

**Interfaces:**
- `interface Prescriber { id: string; name: string; site?: string }`
- `const PRESCRIBERS: Prescriber[]` - the ones offered at signup
- `function prescriberName(id: string): string` - resolves current AND legacy ids; returns the id itself for an unknown one rather than an empty string, so a label is never blank
- `<AppFrame>{children}</AppFrame>`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { PRESCRIBERS, prescriberName } from '../prescribers';

/*
 * Three lists existed before this module: CareHomeSelector's LOCATIONS
 * (silver-meadows and friends), and a different CARE_HOME_NAMES map duplicated
 * in SettingsScreen and ProfileSelector (asha-indiranagar and friends). Real
 * profiles carry ids from the first family. Both must keep resolving or a
 * resident's prescriber row goes blank.
 */
const LEGACY_LOCATION_IDS = [
  'silver-meadows', 'golden-years', 'serenity-haven', 'sunrise-elder',
  'graceful-living', 'evergreen-senior', 'my-residence',
];
const LEGACY_CARE_HOME_IDS = [
  'asha-indiranagar', 'vatsalya-koramangala', 'prayag-jayanagar',
];

describe('prescribers', () => {
  it('offers at least one prescriber to choose from', () => {
    expect(PRESCRIBERS.length).toBeGreaterThan(0);
  });

  it('gives every offered prescriber a unique id and a non-empty name', () => {
    const ids = PRESCRIBERS.map((p) => p.id);
    expect(new Set(ids).size).toBe(ids.length);
    for (const p of PRESCRIBERS) expect(p.name.trim()).not.toBe('');
  });

  it('resolves every id it offers', () => {
    for (const p of PRESCRIBERS) expect(prescriberName(p.id)).toBe(p.name);
  });

  it('still resolves every legacy id, so existing profiles keep a label', () => {
    for (const id of [...LEGACY_LOCATION_IDS, ...LEGACY_CARE_HOME_IDS]) {
      expect(prescriberName(id), id).not.toBe('');
      expect(prescriberName(id), id).not.toBe(id);
    }
  });

  it('falls back to the id rather than an empty label for an unknown id', () => {
    expect(prescriberName('not-a-real-id')).toBe('not-a-real-id');
  });
});
```

- [ ] **Step 2: Run it to verify it fails.** `npx vitest run src/lib/__tests__/prescribers.test.ts`

- [ ] **Step 3: Write `prescribers.ts`.** `PRESCRIBERS` holds the placeholder list (the prototype's Dr. Dominic Benjamin, BBH plus the two invented names), clearly marked as placeholder with a one-line note that swapping the array is the whole change. A separate `LEGACY_NAMES` map carries both retired id families, and `prescriberName` checks `PRESCRIBERS` first, then `LEGACY_NAMES`, then returns the id.

- [ ] **Step 4: Run the tests to verify they pass.**

- [ ] **Step 5: Write `AppFrame.tsx`** - `<div className="app-frame"><div className="app-root bg-app-bg flex flex-col">{children}</div></div>`, with a comment saying it exists so public routes get the same portrait column as the rest of the app, which they did not while the wrapper lived inside `AppShell`.

- [ ] **Step 6: Use it in `AppShell`**, replacing the inline wrapper. No behaviour change; verify by eye that Home is unmoved.

- [ ] **Step 7: Verify.** Lint, test, build. Expected 37 errors, 383 tests.

- [ ] **Step 8: Commit.** Bump to `1.19.4`.

---

### Task 2: Splash, signup and confirmation

**Files:** create `src/screens/SplashScreen.tsx`, `src/screens/SignupScreen.tsx`, `src/components/chrome/PrescriberPicker.tsx`; modify `src/App.tsx`, locales, `package.json`

**Splash** (handoff screen 2), on `ScreenBlue variant="splash"` inside `AppFrame`:
`/brand/logo-onblue.png` at 215px centred; tagline 21px/500 `BRAND.cyan`; **Get Started** blue button 258x68 with `/brand/tree-glyph.png` at 34px leading, to `/signup`; then "Already a Member?" at 17px `BRAND.cyan` and a **Sign in** blue button 234x62 to `/signin`.

**Signup** (handoff screens 3 and 4) as two internal steps in one component:

- *Details:* a name field, then a full-width 62px blue **Prescribed by** button with a caret, opening `PrescriberPicker`. Below it a hint at 17px `BRAND.cyan` - `t('signup.tapToChoose')` or the chosen name. A green **Continue** button (190x58) appears only once a prescriber is chosen. **The age field is gone**, along with the 60-78 validation.
- *Confirmation:* the entered name and prescriber, a live clock at 19px `BRAND.cyan` ticking each minute, and a green **Next** (200x62) that creates the profile and goes to `/app/home`.

**Profile creation** is lifted from `CareHomeSelector.handleSignupSubmit` unchanged in substance: `ensureAnonymousAuth`, look for an existing profile with that name at that prescriber, otherwise create one with `careHomeId: <prescriberId>`, write to Dexie, best-effort write to Firestore, then `setActiveProfile`, `setUserProperties`, and the `profile_created` and `session_started` events. Keep every event name and payload.

**PrescriberPicker:** a white card, radius 16, listing prescribers as white rows (`border: 2px solid #D3DBEA`, radius 16, min-height 62, label 19px `#1B2438`). Dismissable by backdrop and by Escape; focus moves into the sheet on open and returns to the trigger on close; `role="dialog"` with `aria-modal`.

- [ ] **Step 1: Build `PrescriberPicker`.**
- [ ] **Step 2: Build `SplashScreen`.**
- [ ] **Step 3: Build `SignupScreen`** with both steps, using `ScreenTransition name="onboardingStep"` between them.
- [ ] **Step 4: Route them.** `/` to `SplashScreen`, `/signup` to `SignupScreen`.
- [ ] **Step 5: i18n.** `splash.tagline`, `btn.getStarted`, `splash.alreadyMember`, `signup.name`, `signup.prescribedBy`, `signup.tapToChoose`, `signup.confirmTitle`, `signup.nameError`, `signup.failed`, and reuse `btn.continue` / `btn.next`.
- [ ] **Step 6: Verify.** Lint, test, build; then create a brand new profile end to end and confirm it lands on the new Home with a session planned, and that the Dexie `userProfile` row carries the chosen prescriber as `careHomeId`.
- [ ] **Step 7: Commit.** Bump to `1.19.5`.

---

### Task 3: Sign-in

**Files:** create `src/screens/SignInScreen.tsx`; modify `src/App.tsx`, locales, `package.json`

**Spec** (handoff screen 5), on `ScreenBlue`: a name field; help line `t('signin.help')` at 17px `BRAND.cyan`; a white card (radius 20) of matched profiles as full-width 66px rows divided by `1px solid rgba(16,35,126,0.12)`, label 21px `#10237E`; a blue **Sign in** button 200x62.

**Behaviour** is lifted from `CareHomeSelector`'s `login` step: read `appDb.userProfile.toArray()`, filter on `firstName`/`nickname` containing the typed text, and on selection run the existing `executeLogin` - `ensureAnonymousAuth`, stamp `lastSeenAt`, Dexie write, best-effort Firestore write, `setActiveProfile`, `setUserProperties`, `session_started`. Then go to `/app/home`.

Show a clear empty state when nothing matches, rather than the current bare error string.

- [ ] **Step 1: Build the screen.**
- [ ] **Step 2: Route it** at `/signin`.
- [ ] **Step 3: i18n.** `signin.title`, `signin.help`, `signin.noMatch`, `btn.signIn`.
- [ ] **Step 4: Verify.** Sign in as a profile created in Task 2 and confirm it reaches Home with that profile active.
- [ ] **Step 5: Commit.** Bump to `1.19.6`.

---

### Task 4: Settings, and retiring the dead screens

**Files:** modify `src/screens/SettingsScreen.tsx`, `src/App.tsx`, locales, `package.json`; delete `CareHomeSelector.tsx`, `SignupFlow.tsx`, `ProfileSelector.tsx`

**Settings** keeps its structure and moves onto `ScreenBlue`: a back control, Language and Text Size as pill selectors, Sound as a toggle, and the blue sign-out button. Its local `CARE_HOME_NAMES` is deleted in favour of `prescriberName`.

**The prescriber row** shows the current prescriber and opens `PrescriberPicker`. On change: write the profile through `upsertUserProfile`, update `setUserProperties`, and fire a new `prescriber_changed` event carrying `{ from, to }`.

> **Recorded risk, from the spec.** Making the prescriber editable makes `careHomeId` mutable after signup, which re-buckets the resident's Amplitude cohort and moves them between `getProfilesByCareHome` result sets. The user chose an editable row knowing this; the explicit event is so the move is traceable rather than silent. If study cohorts must be immutable, this row becomes read-only and nothing else changes.

- [ ] **Step 1: Restyle Settings and add the prescriber row.**
- [ ] **Step 2: Delete the three dead screens** and their routes and imports.
- [ ] **Step 3: Confirm nothing references them.** `grep -rn "CareHomeSelector\|ProfileSelector\|SignupFlow\|CARE_HOME_NAMES\|LOCATIONS" src/`
- [ ] **Step 4: i18n.** `settings.prescriber`, `settings.changePrescriber`.
- [ ] **Step 5: Verify.** Lint, test, build; then change language, text size and sound and confirm each still applies; change the prescriber and confirm the Dexie row updates; sign out and confirm it lands on the splash.
- [ ] **Step 6: Commit.** Bump to `1.19.7`.

---

### Task 5: Close the phase

- [ ] **Step 1: i18n audit** - equal key counts across the three files, none missing, untranslated still 4.
- [ ] **Step 2: Dead reference sweep** across the whole redesign: no `questionnaireCompleted`, `RotationScreen`, `DailyQuestionnaire`, `CareHomeSelector`, `ProfileSelector`, `SignupFlow`, `CARE_HOME_NAMES`, `/app/rotation`, `/app/questionnaire`, `/login/`.
- [ ] **Step 3: Full manual smoke** of the whole redesigned flow, in `en`, `hi` and `kn`, at text sizes normal and xlarge: new profile, session end to end, free play, settings, sign out, sign back in, resume mid-session.
- [ ] **Step 4: Update `CLAUDE.md`** - the route table in it still lists `/login/:careHomeId`, `/app/questionnaire` and `/app/rotation`, and the screen list is stale.
- [ ] **Step 5: Commit** at `1.20.0`.

---

## Self-Review

**Spec coverage.** Every phase 3 item maps to a task: `SplashScreen` (2), signup restyle with the age gate removed and the prescriber picker added (2), `SignInScreen` (3), `prescribers.ts` (1), `SettingsScreen` restyle plus prescriber row (4), deletion of the old entry screens and `/login/:careHomeId` (4).

**Scope corrections carried into the tasks.** `SignupFlow` and `ProfileSelector` are deleted as dead code rather than migrated; the confirmation screen is a restyle of an existing `welcome` step rather than something new; no `getAllProfiles` helper is needed. `AppFrame` is added because public routes render outside `AppShell` and so never picked up the portrait column - a gap phase 2 left behind.

**Type consistency.** `Prescriber`, `PRESCRIBERS` and `prescriberName` are defined in Task 1 and consumed in Tasks 2, 3 and 4. `PrescriberPicker` is defined in Task 2 and reused in Task 4. `AppFrame` is defined in Task 1 and used by `AppShell` and every public screen.

**Version sequence.** 1.19.4 through 1.19.7, closing at 1.20.0.
