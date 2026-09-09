---
name: senior-brain-app-game-design
description: >
  Use this skill whenever building, editing, or reviewing any component, game, screen, or utility
  for the Senior Brain Training App. Triggers on: new mini-game implementation, game level config,
  UI component creation, game shell/wrapper, analytics event wiring, i18n string addition, login/profile
  screen, session flow, questionnaire, rotation screen, settings screen, or any app code touching design
  tokens, accessibility, or game state. If a task involves ANY file in this project, consult this skill first.
---

# Senior Brain Training App — Claude Code Design & Build Skill

> **Always read this skill before writing any code for this project.**
> It encodes every design, accessibility, architecture, and analytics decision from the PRD.

---

## 1. Design System Tokens

Use these exact values. Never hardcode colours, font sizes, or spacing.

```ts
// src/styles/tokens.ts  (import from here, never inline)
export const COLORS = {
  primaryBlue:   '#2A66B8',
  emeraldGreen:  '#3BB78F',   // success states
  alertRed:      '#E74C3C',   // errors (use ONLY as a last resort, never with buzz/flash)
  darkGrey:      '#333333',   // body text
  accentPurple:  '#9C5FA8',   // highlights, CTAs
  accentAmber:   '#C9BA2E',   // warnings
  appBg:         '#F4F5F7',
  cardBg:        '#FFFFFF',
  hoverState:    '#F0F3FF',
  bodyText:      '#222222',
  captionText:   '#757575',
} as const;

export const TYPOGRAPHY = {
  h1:      { size: '36px', weight: 700, lineHeight: '44px' },
  h2:      { size: '28px', weight: 600, lineHeight: '36px' },
  h3:      { size: '22px', weight: 500, lineHeight: '30px' },
  body:    { size: '16px', weight: 400, lineHeight: '24px' },
  button:  { size: '16px', weight: 600, lineHeight: '24px' },
  caption: { size: '14px', weight: 500, lineHeight: '20px' },
  small:   { size: '12px', weight: 400, lineHeight: '16px' },
} as const;

export const SPACING = {
  // Tablet-optimised touch targets — these are MINIMUMS, go larger for game elements
  touchTargetMin:    '80px',   // minimum for ALL interactive elements (tablet context)
  gameCardMin:       '80px',   // card/grid cells in memory + attention games
  gameCardLarge:    '120px',   // Focus Filter tiles (2x2 grid, more space available)
  sequenceButton:   '120px',   // Sequence Repeat colour buttons (4 on screen)
  cardPad:           '24px',
  sectionGap:        '32px',
} as const;

export const FONT_FAMILY = "'Inter', sans-serif";
// Must support: Latin, Devanagari (Hindi), Kannada Unicode ranges
// Google Fonts import: Inter + Noto Sans Devanagari + Noto Sans Kannada
```

**Tailwind config equivalents:**
- `text-primary` → `#2A66B8`
- `text-success` → `#3BB78F`
- `bg-app` → `#F4F5F7`
- All game tap targets: `min-h-[80px] min-w-[80px]` as baseline; see §2 for per-game overrides

---

## 2. Accessibility & Tablet Touch Rules (Non-Negotiable)

This app runs on shared iPads and Android tablets in care homes. Every component MUST satisfy:

### Universal rules
- [ ] All body text: `font-size >= 16px`; captions >= 14px; never go below 12px
- [ ] Contrast: WCAG AA minimum (4.5:1) — never use `captionText` on `appBg` alone without size bump
- [ ] **NO visible timers anywhere in the app — absolute rule, no exceptions, no settings toggle**
  - All timing via `useRef` / `setTimeout` in background only; never rendered to DOM
- [ ] **NO scores displayed to users at any point in MVP — absolute rule**
  - Progress shown as encouragement messages only: "Well done!", "You're improving!", "Great focus today!"
- [ ] `aria-label` on all icon-only buttons
- [ ] `role="main"` on game canvas; `role="status"` on progress/level displays

### Error feedback rules — varies by game (read carefully)
These are NOT uniform. Follow the per-game rule from this table exactly:

| Game | Wrong tap behaviour |
|------|-------------------|
| Remember & Match | Cards flip back with soft neutral tone — no red, no shake |
| Shopping List Recall | Wrong item: no response at all — cell does not react |
| Sequence Repeat | Sequence resets; calm "Let's try again!" message — no shake |
| **Spot & Focus** | **Zero response — scene does not react at all** |
| **Target Tap** | **Zero response — cell does not change in any way** |
| Focus Filter | Tile wobbles softly back into place — no sound, no red |
| Morning Routine Quest | Card wobbles back to tray with a friendly prompt |
| Recipe Builder | Button dims only — no red, no sound |
| Garden Planner | Plant fades away gently — no negative sound, no counter |

> **Default fallback** (if a game is not listed above): soft grey overlay + gentle wobble (CSS only). Never a buzzer. Never a red flash. Never a wrong-answer counter shown to user.

### Per-game minimum touch target sizes (tablet-optimised)
These override `touchTargetMin` for game elements specifically:

| Game | Element | Minimum size |
|------|---------|-------------|
| Remember & Match | Card cells | 100×100px |
| Shopping List Recall | Recall shelf tiles | 80×80px |
| Sequence Repeat | Colour buttons | 120×120px |
| Spot & Focus | Difference tap zones | 60px diameter circles |
| Target Tap | Grid cells | 100×100px |
| Focus Filter | Category tiles | 140×140px |
| Morning Routine Quest | Drag cards + drop zones | 80px height minimum |
| Recipe Builder | Choice option buttons | Full width, 70px tall |
| Garden Planner | Grid cells | 100×100px |

---

## 3. Game Shell — Standard Interface

Every mini-game MUST wrap its content in `<GameShell>`. Never build a game without it.

```tsx
// src/components/GameShell.tsx
interface GameShellProps {
  gameId: string;           // e.g. 'remember-match', 'shopping-list-recall'
  gameCategory: 'memory' | 'attention' | 'executive';
  levelConfig: LevelConfig; // injected from game's levels.config.ts (see §5)
  onLevelComplete: (result: LevelResult) => void;
  onExit: () => void;       // back to session manager
  children: React.ReactNode;
}

// No scores in MVP. LevelResult tracks completion and behaviour only.
interface LevelResult {
  levelId: string;                              // matches LevelConfig.id
  durationSeconds: number;                      // measured silently in background
  completed: boolean;
  metrics: Record<string, unknown>;             // game-specific — see §7
}
```

GameShell is responsible for:
- Rendering the top bar: game name (translated), level label (translated), exit button
- Firing `game_started` and `level_completed` Amplitude events — no score in payload
- Measuring session duration invisibly — never rendering a timer to the DOM
- Calling `onLevelComplete` with a `LevelResult`
- Checking if 10-minute category threshold is reached at level end and calling `SessionManager.triggerRotation()`

---

## 4. Game Phase System

Every game has named phases specific to its flow. Use `useGamePhase` — not a generic 4-state hook.

```ts
// src/hooks/useGamePhase.ts
function useGamePhase<T extends string>(
  phases: T[],
  onPhaseChange?: (phase: T) => void,
): {
  currentPhase: T;
  advance: () => void;        // move to next phase in sequence
  goTo: (phase: T) => void;  // jump to a specific phase (e.g. restart)
  phaseStartedAt: number;    // Date.now() when phase started — NEVER render this value
}
```

### Phase sequences per game — implement exactly as defined here

```
Remember & Match:     preview → matching → celebration → quiz → summary
Shopping List Recall: study → distractor_gap → recall → bonus_sort* → summary
                      (* bonus_sort: Hard only)
Sequence Repeat:      demonstration → repeat → result → [loop back to demonstration] → summary
Spot & Focus:         scene_intro → find_differences → completion
Target Tap:           target_announcement → play_grid → between_round* → summary
                      (* between_round: 3-second break, repeats between each round)
Focus Filter:         question → feedback → [loop N questions] → summary
Morning Routine Quest: scenario_intro → placement → decision_branch* → disruption* → completion
                       (* Medium/Hard only respectively)
Recipe Builder:        recipe_intro → step_selection → ingredient_decision* → completion
                       (* Medium/Hard only)
Garden Planner:        garden_intro → planting → weather_event* → completion
                       (* Medium/Hard only)
```

### Distractor gap pattern (Shopping List Recall — `distractor_gap` phase only)
- Show either: a simple arithmetic question OR a breathing prompt ("Take a slow breath in... and out")
- Must be skippable — show a large "I'm Ready" button at all times
- Must not look like a game or have any scoring component
- Auto-advances after 15 seconds if user does not interact
- Log neutrally: `track('distractor_skipped', { gameId })` if skipped — not a negative event

---

## 5. Level Configuration System

**Each game's difficulty parameters live in a single config file — not in component code.**
This makes levels fully adjustable without touching game logic.

```ts
// src/games/[category]/[GameName]/levels.config.ts

interface LevelConfig {
  id: 'easy' | 'medium' | 'hard';
  labelKey: string;       // i18n key, e.g. 'level.easy'
  params: GameParams;     // game-specific shape — defined below
}

export const levels: LevelConfig[] = [
  { id: 'easy',   labelKey: 'level.easy',   params: { ... } },
  { id: 'medium', labelKey: 'level.medium', params: { ... } },
  { id: 'hard',   labelKey: 'level.hard',   params: { ... } },
];
```

### Per-game parameter shapes (all values are defaults — configurable)

**Remember & Match**
```ts
interface RememberMatchParams {
  gridRows: number;           // easy: 2 | medium: 3 | hard: 4
  gridCols: number;           // easy: 3 | medium: 4 | hard: 4
  previewDurationMs: number;  // easy: 45000 | medium: 30000 | hard: 20000
  quizQuestions: number;      // easy: 2 | medium: 3 | hard: 4
  cardImageSet: 'familiar_objects' | 'animals_and_objects' | 'abstract_patterns';
}
```

**Shopping List Recall**
```ts
interface ShoppingListParams {
  itemCount: number;               // easy: 4 | medium: 5 | hard: 7
  studyDurationMs: number;         // easy: 30000 | medium: 25000 | hard: 20000
  distractorGapEnabled: boolean;   // easy: false | medium: true | hard: true
  recallFieldSize: number;         // easy: 8 | medium: 10 | hard: 14
  bonusSortEnabled: boolean;       // easy: false | medium: false | hard: true
  itemPool: 'south_indian_groceries'; // always this for Bangalore MVP
}
```

**Sequence Repeat**
```ts
interface SequenceRepeatParams {
  startingLength: number;       // easy: 2 | medium: 3 | hard: 4
  colourCount: number;          // easy: 3 | medium: 4 | hard: 4
  playbackSpeedMs: number;      // ms per colour flash: easy: 800 | medium: 600 | hard: 400
  audioEnabled: boolean;        // easy: true | medium: true | hard: false (visual-only)
  maxLength: number;            // session ends when reached: easy: 6 | medium: 8 | hard: 10
}
```

**Spot & Focus**
```ts
interface SpotFocusParams {
  differenceCount: number;    // easy: 3 | medium: 5 | hard: 7
  changeType: 'bold' | 'medium' | 'subtle';
  sceneSet: 'kitchen' | 'garden' | 'living_room' | 'market_stall';
  hintsEnabled: false;        // always false — hints removed from MVP
}
```

**Target Tap**
```ts
interface TargetTapParams {
  gridRows: number;              // easy: 2 | medium: 3 | hard: 4
  gridCols: number;              // easy: 4 | medium: 4 | hard: 4
  targetTypes: number;           // easy: 1 | medium: 1 | hard: 2
  distractorTypes: number;       // easy: 2 | medium: 3 | hard: 3
  gridRefreshMs: number;         // easy: 8000 | medium: 10000 | hard: 12000
  roundCount: number;            // easy: 3 | medium: 4 | hard: 5
  roundDurationMs: number;       // 30000 for all levels
  targetSimilarity: 'distinct' | 'shared_colour' | 'shared_colour_and_shape';
}
```

**Focus Filter**
```ts
interface FocusFilterParams {
  questionCount: number;      // easy: 4 | medium: 5 | hard: 7
  outlierType: 'obvious' | 'subtle' | 'overlapping_category';
  categoryLabelVisible: 'always' | 'intro_only' | 'never';
  // easy: always | medium: intro_only | hard: never
  categoryPool: 'south_indian_food' | 'animals' | 'household_tools' | 'garden_plants';
}
```

**Morning Routine Quest**
```ts
interface MorningRoutineParams {
  cardCount: number;                   // easy: 5 | medium: 6 | hard: 8
  decisionBranchEnabled: boolean;      // easy: false | medium: true | hard: true
  disruptionEventEnabled: boolean;     // easy: false | medium: false | hard: true
  routineContext: 'doctor_appointment' | 'temple_visit' | 'family_visit' | 'market_trip' | 'yoga_session';
}
```

**Recipe Builder**
```ts
interface RecipeBuilderParams {
  stepCount: number;                      // easy: 4 | medium: 5 | hard: 7
  ingredientDecisionEnabled: boolean;     // easy: false | medium: true | hard: true
  midRecipeModificationEnabled: boolean;  // easy: false | medium: false | hard: true
  optionCount: number;                    // easy: 2 | medium: 2 | hard: 3
  recipe: SouthIndianRecipe;
}

type SouthIndianRecipe =
  | 'idli_sambar' | 'upma' | 'poha' | 'pongal'
  | 'rava_dosa' | 'chapati_sabzi'
  | 'rasam' | 'avial' | 'rava_kesari';
```

**Garden Planner**
```ts
interface GardenPlannerParams {
  gridSize: 3 | 4;                      // easy/medium: 3 | hard: 4
  plantCount: number;                   // easy: 3 | medium: 4 | hard: 5
  toolStepCount: number;                // easy: 0 | medium: 1 | hard: 2
  weatherEventEnabled: boolean;         // easy: false | medium: true | hard: true
  sunRuleEnabled: boolean;              // easy: false | medium: false | hard: true
  plantPool: 'indian_household_plants'; // always this for MVP
}
```

### Adaptive difficulty rule (all games)
- **Promote:** After 3 consecutive completions at current level → prompt "Ready for a bigger challenge?" — user can accept or stay
- **Step back:** After 3 consecutive non-completions → silently move to easier config. Never announce this. No negative framing.
- **Manual override:** Settings screen (§10) lets user or caregiver lock a preferred difficulty

---

## 6. Regional Content — Bangalore MVP (South Indian Defaults)

Never default to Western examples. All content must use South Indian / Bangalore-appropriate items.

**Shopping List Recall — item pool:**
- Vegetables: ಟೊಮೇಟೊ (Tomato), ಆಲೂಗಡ್ಡೆ (Potato), ಬೆಂಡೆಕಾಯಿ (Lady's finger), ಬದನೆಕಾಯಿ (Brinjal), ಕ್ಯಾರೆಟ್ (Carrot)
- Groceries: ಅಕ್ಕಿ (Rice), ತೊಗರಿ ಬೇಳೆ (Toor dal), ಸಾಸಿವೆ (Mustard seeds), ಅರಿಶಿನ (Turmeric), ಉಪ್ಪು (Salt)
- Fruits: ಬಾಳೆಹಣ್ಣು (Banana), ಮಾವಿನ ಹಣ್ಣು (Mango), ಸಪೋಟ (Sapota), ಪೇರಲ (Guava)
- Dairy/Other: ಮೊಸರು (Curd), ತುಪ್ಪ (Ghee), ಬೆಲ್ಲ (Jaggery), ಎಣ್ಣೆ (Oil)

**Recipe Builder — approved recipes only:**

| Recipe | Difficulty | Steps |
|--------|-----------|-------|
| Idli + Sambar | Easy | 4 |
| Upma | Easy | 4 |
| Poha (Aval Upkari) | Easy | 4 |
| Rava Dosa | Medium | 5 |
| Pongal | Medium | 5 |
| Chapati + Sabzi | Medium | 5 |
| Rasam | Hard | 7 |
| Avial | Hard | 7 |
| Rava Kesari | Hard | 7 |

Never use: scrambled eggs, omelette, toast, butter-based Western recipes.
Ingredient substitution decisions should use Indian pantry swaps: e.g. "No ghee — use oil?", "No curry leaves — skip or add?"

**Morning Routine Quest — routine contexts:**
- Doctor appointment (local government hospital)
- Temple visit (neighbourhood temple — common daily routine)
- Family visit day (children/grandchildren visiting)
- Market trip (local sabzi mandi)
- Yoga / pranayama session in care home garden

**Garden Planner — plant pool (Indian household only):**
- ತುಳಸಿ (Tulsi) — tall, back row
- ಬೇವು (Neem) — tall, back row
- ಚೆಂಡು ಹೂ (Marigold) — medium
- ದಾಸವಾಳ (Hibiscus) — medium
- ಕರಿಬೇವು (Curry leaf) — medium
- ಮಲ್ಲಿಗೆ (Jasmine) — low/climbing
- ಅಲೋ ವೇರಾ (Aloe vera) — low, needs direct sun
- ಶಂಖಪುಷ್ಪ (Butterfly pea) — climbing, needs support

**Focus Filter — category pools:**
- Food: Indian items. Tricky outliers: tomato (fruit/vegetable), peanut (legume not nut), coconut (fruit not nut)
- Animals: Crow, sparrow, squirrel, cow, buffalo, peacock, pigeon — familiar to South India
- Tools: ಒರಳು (grinding stone), ತವಾ (tawa), ಕುಕ್ಕರ್ (pressure cooker), ಕಲಶ (ladle), ಜಲ್ಲಿಕಾ (colander)
- Plants: Same pool as Garden Planner above

---

## 7. Analytics — Required Events

Every game MUST fire these Amplitude events. Always import `track` from `src/lib/analytics.ts`.

```ts
// No score fields anywhere — removed from MVP
track('game_started',         { gameId, gameCategory, levelId })
track('level_completed',      { gameId, levelId, durationSeconds, completed: true,  metrics: {...} })
track('level_not_completed',  { gameId, levelId, durationSeconds, completed: false, metrics: {...} })
track('session_interrupted',  { gameId, levelId, timeInSessionSeconds })  // on window beforeunload
track('distractor_skipped',   { gameId })  // Shopping List Recall distractor_gap phase only
// No hint_used event — hints are removed from all games in MVP
```

Game-specific `metrics` object (nested inside `level_completed` / `level_not_completed`):

```ts
// Remember & Match
{ flipAttempts: number, quizCorrect: number, quizTotal: number }

// Shopping List Recall
{ itemsRecalled: number, totalItems: number, falsePositives: number, bonusSortCompleted: boolean }

// Sequence Repeat
{ peakSequenceLength: number, totalErrors: number }

// Spot & Focus
{ differencesFound: number, totalDifferences: number, falseTaps: number }

// Target Tap
{ targetHits: number, totalTargets: number, distractorTaps: number }

// Focus Filter
{ firstAttemptCorrect: number, totalQuestions: number, avgResponseTimeMs: number }

// Morning Routine Quest
{ firstAttemptPlacements: number, totalCards: number, decisionCorrect: boolean | null }

// Recipe Builder
{ firstChoiceCorrect: number, totalSteps: number, ingredientDecisionCorrect: boolean | null }

// Garden Planner
{ firstPlacementCorrect: number, totalPlants: number, weatherAdaptationCorrect: boolean | null }
```

Rules:
- Attach `userId` and `careHomeId` as Amplitude user properties at login — not per event
- Never surface raw metric values to the user — analytics backend only

---

## 8. Offline & Persistence

Use `src/lib/db.ts` (Dexie.js). Never use `localStorage` for game progress or session state.

```ts
db.userProfile    // { userId, firstName, lastName, nickname, careHomeId, language, difficultyOverride }
db.sessionState   // { userId, date, currentCategory, currentGameId, secondsInCategory, categoriesDone[] }
db.gameProgress   // { userId, gameId, currentLevelId, consecutiveCompletions, consecutiveIncompletes }
db.pendingEvents  // queued Amplitude events for offline flush when connection restores
```

Rules:
- Write to IndexedDB first, then sync to Firestore (offline-first)
- Write `gameProgress` immediately on every level complete or not-complete
- Write `sessionState` after every phase transition — not just at level end — for full resumability
- No score history stored — only level progression and completion booleans

---

## 9. Session Flow Architecture

`src/session/SessionManager.tsx` owns all rotation logic. Games must NOT implement rotation internally.

```
login → questionnaire (first session of day only)
→ game (category A, random from 3)
→ [10 min elapsed, checked at level end] → rotation screen
→ game (category B, random from remaining 2)
→ [10 min elapsed, checked at level end] → rotation screen
→ game (category C, the remaining one)
→ session summary screen (encouragement only — no scores)
```

```ts
interface SessionContext {
  userId: string;
  currentCategory: 'memory' | 'attention' | 'executive';
  currentGameId: string;
  secondsInCurrentCategory: number;    // tracked silently, NEVER rendered
  categoriesCompletedToday: string[];
  triggerRotation: () => void;          // called by GameShell at level end if ≥10 min elapsed
}
```

---

## 10. Settings Screen

Accessible via a gear icon on the home/lobby screen. NOT accessible during active gameplay.

```ts
interface UserSettings {
  language: 'en' | 'hi' | 'kn';
  textSize: 'normal' | 'large' | 'xlarge';      // bumps all font sizes by 1–2 steps app-wide
  soundEnabled: boolean;                          // master sound on/off
  difficultyOverride: 'easy' | 'medium' | 'hard' | 'auto';
  // 'auto' = adaptive system (default); explicit choice locks all games to that level
}
```

Settings screen sections:
1. **My Preferences** — Language selector, Text size (Normal / Large / Extra Large), Sound on/off toggle
2. **Game Difficulty** — Easy / Medium / Hard / Let the app decide (default: auto)
3. **My Profile** — Display name / nickname (editable), Care home (read-only), Switch profile button
4. **About** — App version, care home contact info placeholder

UX rules:
- Settings save immediately on change — no "Save" button
- All controls: minimum 80px touch targets, large label text
- Language change re-renders the settings screen immediately in the new locale
- Fire `track('settings_changed', { setting, newValue })` on every change
- No "Reset progress" or "Delete account" on this screen — destructive actions are post-MVP admin only

---

## 11. Component Checklist

Before submitting any component:

- [ ] Design tokens from `src/styles/tokens.ts` — no hardcoded hex/px values
- [ ] Touch targets meet per-game minimums from §2 table (not just a blanket 48px)
- [ ] All text ≥ 16px (captions ≥ 14px)
- [ ] **No visible timer anywhere — absolute rule, no exceptions**
- [ ] **No scores displayed to user anywhere — absolute rule**
- [ ] Error feedback follows the per-game rule from §2 table exactly
- [ ] No hint system — hints are removed from MVP entirely
- [ ] Wrapped in `<GameShell>` with correct `levelConfig` prop
- [ ] Uses `useGamePhase` with the correct phase sequence for this game (§4)
- [ ] Level parameters sourced from `levels.config.ts` — no hardcoded values in component
- [ ] Fires Amplitude events via `track()` with correct `metrics` object (§7)
- [ ] All user-facing strings use `t()` — no hardcoded English anywhere
- [ ] Content uses South Indian / Bangalore defaults (§6)
- [ ] Writes to IndexedDB on level complete/not-complete (§8)

---

## 12. File Structure Reference

```
src/
├── components/
│   ├── GameShell.tsx
│   ├── RotationScreen.tsx
│   ├── SessionSummary.tsx       # Encouragement only — no scores
│   ├── SettingsScreen.tsx       # See §10
│   └── ui/                     # Button, Card, Avatar, Badge, Toggle
├── games/
│   ├── memory/
│   │   ├── RememberMatch/       { index.tsx, levels.config.ts }
│   │   ├── ShoppingListRecall/  { index.tsx, levels.config.ts }
│   │   └── SequenceRepeat/      { index.tsx, levels.config.ts }
│   ├── attention/
│   │   ├── SpotFocus/           { index.tsx, levels.config.ts }
│   │   ├── TargetTap/           { index.tsx, levels.config.ts }
│   │   └── FocusFilter/         { index.tsx, levels.config.ts }
│   └── executive/
│       ├── MorningRoutineQuest/ { index.tsx, levels.config.ts }
│       ├── RecipeBuilder/       { index.tsx, levels.config.ts }
│       └── GardenPlanner/       { index.tsx, levels.config.ts }
├── hooks/
│   ├── useGamePhase.ts          # Phase state machine
│   └── useSession.ts
├── lib/
│   ├── analytics.ts             # Amplitude wrapper — always use track() from here
│   ├── db.ts                    # Dexie IndexedDB
│   └── firebase.ts              # Firestore sync
├── session/
│   └── SessionManager.tsx
├── styles/
│   └── tokens.ts
└── locales/
    ├── en/ { common.json + one file per game }
    ├── hi/
    └── kn/
```

---

*Skill version: 1.1 | App: Senior Brain Training App MVP | Market: Bangalore, India*
*Changes from v1.0: tablet touch targets, per-game error feedback table, phase system replaces generic hook,*
*configurable level system with per-game param shapes, scores removed globally, hints removed globally,*
*South Indian content expanded with Kannada labels, settings screen defined, distractor gap pattern documented*
