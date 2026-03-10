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
