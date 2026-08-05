import { getDifficultyState, getYesterdayDifficultyState, upsertDifficultyState } from './db';
import type { DifficultyState } from './db';

// ─── Constants ────────────────────────────────────────────────────────────────

const PROMOTION_STEP = 0.05;
const DEMOTION_STEP = 0.08;
const DAILY_WARMUP_FACTOR = 0.8;  // returning users start at 80% of yesterday's peak

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Score → User-Friendly Level (1–10) ───────────────────────────────────────

export function scoreToLevel(score: number): number {
  return Math.max(1, Math.min(10, Math.ceil(score * 10) || 1));
}

export function scoreLevelLabel(score: number): string {
  return `Level ${scoreToLevel(score)}`;
}

// ─── Get or initialise today's difficulty state ───────────────────────────────

export async function getTodayDifficulty(userId: string, gameId: string): Promise<DifficultyState> {
  const today = todayISO();
  const existing = await getDifficultyState(userId, gameId, today);
  if (existing) return existing;

  // First round today — check yesterday for warm-up baseline
  const yesterday = await getYesterdayDifficultyState(userId, gameId);
  const baseline = yesterday ? yesterday.peakScore * DAILY_WARMUP_FACTOR : 0;

  const fresh: DifficultyState = {
    userId,
    gameId,
    date: today,
    score: Math.min(baseline, 0.9),  // never start above 0.9
    peakScore: 0,
    roundsPlayed: 0,
  };
  await upsertDifficultyState(fresh);
  return fresh;
}

// ─── Adjust difficulty after a round ──────────────────────────────────────────

export interface RoundPerformance {
  completed: boolean;
  /** 0.0 (poor) to 1.0 (perfect) — game-specific metric */
  performanceRatio: number;
}

export async function adjustDifficulty(
  userId: string,
  gameId: string,
  performance: RoundPerformance,
): Promise<DifficultyState> {
  const state = await getTodayDifficulty(userId, gameId);

  let newScore = state.score;

  if (performance.completed) {
    // performanceMultiplier: 0.5 (poor) to 1.5 (perfect)
    const multiplier = 0.5 + performance.performanceRatio;
    newScore += PROMOTION_STEP * multiplier;
  } else {
    newScore -= DEMOTION_STEP;
  }

  newScore = Math.max(0, Math.min(1, newScore));

  const updated: DifficultyState = {
    ...state,
    score: newScore,
    peakScore: Math.max(state.peakScore, newScore),
    roundsPlayed: state.roundsPlayed + 1,
  };

  await upsertDifficultyState(updated);
  return updated;
}

// ─── Parameter interpolation ──────────────────────────────────────────────────

/** Linearly interpolate between min and max based on difficulty score (0–1) */
export function lerp(min: number, max: number, score: number): number {
  return min + (max - min) * score;
}

/** Interpolate and round to integer */
export function lerpInt(min: number, max: number, score: number): number {
  return Math.round(lerp(min, max, score));
}

// ─── Per-game param generators ────────────────────────────────────────────────

export interface RememberMatchDynamicParams {
  gridRows: number;
  gridCols: number;
  totalPairs: number;
  previewDurationMs: number;
  quizQuestions: number;
}

export function getRememberMatchParams(score: number): RememberMatchDynamicParams {
  const totalPairs = lerpInt(3, 8, score);
  // Layout: find a grid that fits the pairs (totalCards = totalPairs * 2)
  const totalCards = totalPairs * 2;
  let cols: number, rows: number;
  if (totalCards <= 6) { cols = 3; rows = 2; }
  else if (totalCards <= 8) { cols = 4; rows = 2; }
  else if (totalCards <= 12) { cols = 4; rows = 3; }
  else { cols = 4; rows = 4; }

  return {
    gridRows: rows,
    gridCols: cols,
    totalPairs,
    previewDurationMs: Math.round(lerp(60000, 12000, score)),
    quizQuestions: lerpInt(1, 4, score),
  };
}

export interface SpotFocusDynamicParams {
  gridCols: number;
  gridRows: number;
  differenceCount: number;
  changeSubtlety: 'bold' | 'medium' | 'subtle';
}

export function getSpotFocusParams(score: number): SpotFocusDynamicParams {
  const differenceCount = lerpInt(2, 7, score);
  const gridCols = score < 0.4 ? 3 : 4;
  const gridRows = 3;
  const changeSubtlety: 'bold' | 'medium' | 'subtle' =
    score < 0.3 ? 'bold' : score < 0.7 ? 'medium' : 'subtle';

  return { gridCols, gridRows, differenceCount, changeSubtlety };
}

export interface MorningRoutineDynamicParams {
  cardCount: number;
  decisionBranchEnabled: boolean;
  disruptionEventEnabled: boolean;
}

export function getMorningRoutineParams(score: number): MorningRoutineDynamicParams {
  return {
    cardCount: lerpInt(4, 8, score),
    decisionBranchEnabled: score >= 0.35,
    disruptionEventEnabled: score >= 0.7,
  };
}

export interface WordSearchDynamicParams {
  gridRows: number;
  gridCols: number;
  wordCount: number;
  allowDiagonal: boolean;
  allowBackwards: boolean;
}

export function getWordSearchParams(score: number): WordSearchDynamicParams {
  return {
    gridRows: lerpInt(5, 8, score),
    gridCols: lerpInt(6, 8, score),
    wordCount: lerpInt(3, 5, score),
    allowDiagonal: score >= 0.3,
    allowBackwards: score >= 0.7,
  };
}

export interface ShoppingListDynamicParams {
  itemCount: number;
  studyDurationMs: number;
  distractorGapEnabled: boolean;
  recallFieldSize: number;
  bonusSortEnabled: boolean;
  itemPool: 'south_indian_groceries';
}

export function getShoppingListParams(score: number): ShoppingListDynamicParams {
  return {
    itemCount: lerpInt(4, 8, score),
    studyDurationMs: Math.round(lerp(35000, 15000, score)),
    distractorGapEnabled: score >= 0.35,
    recallFieldSize: lerpInt(10, 18, score),
    bonusSortEnabled: score >= 0.7,
    itemPool: 'south_indian_groceries',
  };
}

export interface SequenceRepeatDynamicParams {
  startingLength: number;
  colourCount: number;
  playbackSpeedMs: number;
  audioEnabled: boolean;
  maxLength: number;
}

export function getSequenceRepeatParams(score: number): SequenceRepeatDynamicParams {
  return {
    startingLength: lerpInt(2, 5, score),
    colourCount: score < 0.5 ? 3 : 4,
    playbackSpeedMs: Math.round(lerp(900, 350, score)),
    audioEnabled: score < 0.7,
    maxLength: lerpInt(5, 12, score),
  };
}

export interface FocusFilterDynamicParams {
  questionCount: number;
  outlierType: 'obvious' | 'subtle' | 'overlapping_category';
  categoryLabelVisible: 'always' | 'intro_only' | 'never';
  categoryPool: 'south_indian_food' | 'animals' | 'household_tools' | 'garden_plants';
}

const FOCUS_FILTER_POOLS = [
  'south_indian_food', 'animals', 'household_tools', 'garden_plants',
] as const;

export function getFocusFilterParams(score: number): FocusFilterDynamicParams {
  return {
    questionCount: lerpInt(3, 8, score),
    outlierType: score < 0.35 ? 'obvious' : score < 0.7 ? 'subtle' : 'overlapping_category',
    categoryLabelVisible: score < 0.3 ? 'always' : score < 0.65 ? 'intro_only' : 'never',
    categoryPool: FOCUS_FILTER_POOLS[Math.floor(score * 4) % 4],
  };
}

type SouthIndianRecipe =
  | 'idli_sambar' | 'upma' | 'poha' | 'pongal'
  | 'rava_dosa' | 'chapati_sabzi'
  | 'rasam' | 'avial' | 'rava_kesari';

export interface RecipeBuilderDynamicParams {
  recipe: SouthIndianRecipe;
  stepCount: number;
  ingredientDecisionEnabled: boolean;
  midRecipeModificationEnabled: boolean;
  optionCount: number;
  /** Controls how much text is shown on tray cards during gameplay */
  cardDetail: 'full' | 'label' | 'emoji';
}

const RECIPE_STEPS: Record<SouthIndianRecipe, number> = {
  idli_sambar: 4, upma: 5, poha: 4, pongal: 5,
  rava_dosa: 5, chapati_sabzi: 5,
  rasam: 7, avial: 7, rava_kesari: 7,
};

function pickRandom<T>(arr: T[]): T {
  return arr[Math.floor(Math.random() * arr.length)];
}

export function getRecipeBuilderParams(score: number): RecipeBuilderDynamicParams {
  const recipe: SouthIndianRecipe = score < 0.33
    ? pickRandom(['idli_sambar', 'upma', 'poha', 'pongal'] as const)
    : score < 0.66
    ? pickRandom(['rava_dosa', 'chapati_sabzi'] as const)
    : pickRandom(['rasam', 'avial', 'rava_kesari'] as const);

  return {
    recipe,
    stepCount: RECIPE_STEPS[recipe],
    ingredientDecisionEnabled: score >= 0.35,
    midRecipeModificationEnabled: score >= 0.7,
    optionCount: score < 0.5 ? 2 : 3,
    cardDetail: score < 0.35 ? 'full' : score < 0.65 ? 'label' : 'emoji',
  };
}

const ALL_GARDEN_ACTIVITY_IDS = [
  'plant_seed', 'water_garden', 'weed_bed', 'harvest_veg',
  'collect_flowers', 'make_bouquet', 'compost_waste',
  'repot_plant', 'market_stall', 'save_seeds',
];

export interface GardenSequencerDynamicParams {
  activityIds: string[];
  anchorFirstStep: boolean;
}

export function getGardenSequencerParams(score: number): GardenSequencerDynamicParams {
  // Pool size: more activities available at higher scores (more variety / harder to predict)
  const poolSize = lerpInt(3, ALL_GARDEN_ACTIVITY_IDS.length, score);
  const shuffled = [...ALL_GARDEN_ACTIVITY_IDS].sort(() => Math.random() - 0.5);
  return {
    activityIds: shuffled.slice(0, poolSize),
    anchorFirstStep: score < 0.4,
  };
}

export interface TrainYardDynamicParams {
  /** How long the station names stay visible before the blind drops. */
  signMs: number;
  /** How long the blind is held down between the names going and the dispatch starting. */
  retentionHoldMs: number;
  /** Swaps the four distinct hues for four close warm ones. */
  similarColours: boolean;
  lives: number;
}

export function getTrainYardParams(score: number): TrainYardDynamicParams {
  return {
    signMs: Math.round(lerp(8000, 3000, score)),
    retentionHoldMs: Math.round(lerp(1500, 4000, score)),
    similarColours: score >= 0.6,
    lives: 3,
  };
}
