import { track } from '../analytics';

// Spec SS9 — thin wrappers so the game component never hand-builds event names.

export interface TrialCompletedPayload {
  levelAttemptId: string;
  trialIndex: number;
  level: number;
  effectiveDI: number;
  sceneId: string;
  objects: number;
  encodeMs: number;
  delayMs: number;
  changeType: number[]; // all applied change classes, probed first
  probeMode: string;
  lureLevel: number;
  correct: boolean;
  omission: boolean;
  responseLatencyMs: number;
  tapCoordinates: { xNorm: number | null; yNorm: number | null }[];
  errorDistanceNorm: number | null;
  scaffoldTierReached: number;
  hintsUsed: number;
  isWarmup: boolean;
  isConfidence: boolean;
  interruptions: number;
  roundScore: number;
}

export interface TrialAbandonedPayload {
  level: number;
  trialIndex: number;
  phase: string;
  effectiveDI: number;
}

export interface LevelCompletedPayload {
  stars: number;
  accuracy: number;
  level: number;
  hintsUsed: number;
  hintsUnused: number;
}

export function emitTrialCompleted(payload: TrialCompletedPayload): void {
  void track('pp_trial_completed', { ...payload });
}

export function emitTrialAbandoned(payload: TrialAbandonedPayload): void {
  void track('pp_trial_abandoned', { ...payload });
}

export function emitLevelCompleted(payload: LevelCompletedPayload): void {
  void track('pp_level_completed', { ...payload });
}
