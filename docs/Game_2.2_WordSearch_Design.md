# Game 2.2 — Word Search
**Category:** Attention Deficits | **Session:** 2–4 min

*(Note: This game replaces the previous "Target Tap" to provide better cognitive alignment with sustained attention goals and reduced overlap with "Spot & Focus" over continuous spatial scanning.)*

---

## Game Summary

| Field | Detail |
| :--- | :--- |
| **Game Type** | Themed Word Search (South Indian / Bangalore Context) |
| **Mechanism** | Sustained attention, visual scanning, working memory through continuous feature detection. |
| **Evidence** | Regular text/word puzzles maintain cognitive reserve. Case studies indicate improved MOCA scores with regular play in mild dementia populations. |

---

## Gameplay Flow

* **Phase 1 — Topic Introduction:** A cheerful, large-text category card (e.g., "South Indian Fruits" or "Temple Items") appears briefly to set the semantic context.
* **Phase 2 — Play Grid:** A clear, high-contrast grid of letters appears. A target word list is displayed either above or beside the grid. All words are locally relevant (e.g., in English/Kannada depending on localization).
* **Phase 3 — Selection:** Player highlights words by tapping and dragging across letters.
  * **Correct Selection:** The word highlights in a soft, non-glaring green (e.g., `#E8F5E9`), a satisfying soft chime plays, and the word is crossed off the target list with a checkmark.
  * **Incorrect/Incomplete Selection:** The highlight fades away instantly and silently. *Crucial:* Absolutely no red flashes, no buzzers, and no error counter incremented visibly. 
* **Phase 4 — Completion:** When all words are found, the grid pulses gold gently. An encouragement message ("Great focus! You found them all.") appears. No timers or scores are shown.

---

## Difficulty Levels & Dynamic Parameters

In adherence to the `dynamicDifficulty.ts` architecture, parameters will scale seamlessly between scores of `0.0` (Easy) and `1.0` (Hard). 

**Proposed `WordSearchDynamicParams` structure:**
```typescript
export interface WordSearchDynamicParams {
  gridRows: number;
  gridCols: number;
  wordCount: number;
  allowDiagonal: boolean;
  allowBackwards: boolean;
}
```

**Interpolation Logic (Level Table):**

| Level | Grid Size | Words | Diagonal Allowed | Backwards Allowed |
| :--- | :--- | :--- | :--- | :--- |
| **Easy** (Score < 0.3) | 5×5 or 6×6 | 3 | No | No |
| **Medium** (Score 0.3 - 0.7)| 7×7 | 4 | Yes | No |
| **Hard** (Score > 0.7) | 8×8 | 5 | Yes | Yes (Subtle config) |

---

## Tablet UX Rules (Adhering to MVP v1.1)

1. **Touch Targets:** Individual letter cells must be a minimum of **80×80px** to ensure comfortable swipe/drag paths for arthritic hands. Generous hitboxes around line-drawing paths must be implemented.
2. **Timers:** No timer is displayed on the screen at any point. The duration is tracked silently in the background.
3. **Typography:** Fonts must be highly legible, sans-serif, and respect the App's "Text Size" accessibility settings (Normal/Large/Extra Large). 
4. **Color Palette:** Grid uses warm, high-contrast, low-glare tones. No pure white backgrounds (`#FFFFFF`) to avoid eye fatigue—prefer off-white/cream tones.
5. **Localization:** South Indian vocabulary pool will be used (e.g., "IDLI", "DOSA", "TULSI", "LOTUS").

---

## Analytics Reference (Backend Only — Never Shown to User)

All metrics below are for analytics dashboards and algorithm tuning only.

| Key Metrics Logged | Description |
| :--- | :--- |
| `wordsFound` | Number of words correctly identified (usually maxed if completed). |
| `totalWords` | Total words in the puzzle round. |
| `falseDrags` | Number of times a swipe/drag was initiated and released without matching a valid target word. |
| `durationSeconds` | Total time spent from grid appearance to final word completion. |
| `performanceRatio` | Custom calculation feeding `adjustDifficulty` (e.g., heavily weighting low `falseDrags` and reasonable completion time). |
