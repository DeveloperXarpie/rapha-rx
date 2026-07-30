import type { PpEngineRow } from '../db';
import { DI_STEP, DI_CLAMP } from './ladder';
import { todayISO, daysBetweenISO } from '../dates';

export type TrialKind = 'counted' | 'warmup' | 'confidence';

const COUNTED_PER_LEVEL = 10;
const HISTORY_CAP = 20;

function clampDi(di: number): number {
  return Math.min(DI_CLAMP, Math.max(-DI_CLAMP, di));
}

export function freshEngineRow(userId: string): PpEngineRow {
  return {
    userId, currentLevel: 1, di: 0,
    countedTrialsInLevel: 0, correctCountedInLevel: 0,
    trialHistory: [], starsByLevel: {},
    consecutiveCorrect: 0, consecutiveErrors: 0, streak: 0,
    frustrationGuardUsedInLevel: 0,
    sessionStamp: null, trialsThisSession: 0, prevSessionTrials: 0,
    scenesThisSession: [], tipCardL41Shown: false, tipCardPhotoShown: false,
    lastPlayedDate: todayISO(), updatedAt: Date.now(),
  };
}

export function beginSession(row: PpEngineRow, sessionStamp: number): PpEngineRow {
  if (row.sessionStamp === sessionStamp) return row;
  const mean = row.trialHistory.length
    ? row.trialHistory.reduce((a, t) => a + t.di, 0) / row.trialHistory.length
    : 0;
  const absent = daysBetweenISO(row.lastPlayedDate, todayISO()) >= 7;
  return {
    ...row,
    di: clampDi(mean - (absent ? 3 : 1) * DI_STEP),
    consecutiveCorrect: 0, consecutiveErrors: 0, streak: 0,
    prevSessionTrials: row.trialsThisSession,
    trialsThisSession: 0, scenesThisSession: [],
    sessionStamp,
  };
}

export function warmupCount(row: PpEngineRow): number {
  return row.prevSessionTrials >= 6 ? 2 : 1;
}

export function pendingConfidence(row: PpEngineRow): boolean {
  return row.consecutiveErrors >= 3 && row.frustrationGuardUsedInLevel < 2;
}

export function nextTrialKind(row: PpEngineRow): TrialKind {
  if (pendingConfidence(row)) return 'confidence';
  if (row.trialsThisSession < warmupCount(row)) return 'warmup';
  return 'counted';
}

export function trialDi(row: PpEngineRow, kind: TrialKind): number {
  if (kind === 'confidence') return clampDi(-4 * DI_STEP);
  if (kind === 'warmup') return clampDi(row.di - 2 * DI_STEP);
  return clampDi(row.di);
}

export interface TrialResultOpts {
  correct: boolean;
  omission: boolean;
  kind: TrialKind;
}

export interface LevelOutcome {
  stars: 0 | 1 | 2 | 3;
  accuracy: number;
  advanced: boolean;
}

export function applyTrialResult(
  row: PpEngineRow,
  opts: TrialResultOpts,
): { row: PpEngineRow; levelOutcome: LevelOutcome | null } {
  const succeeded = opts.correct && !opts.omission;
  const r: PpEngineRow = { ...row, updatedAt: Date.now(), lastPlayedDate: todayISO() };

  // staircase
  if (succeeded) {
    r.consecutiveCorrect = row.consecutiveCorrect + 1;
    r.consecutiveErrors = 0;
    r.streak = row.streak + 1;
    if (r.consecutiveCorrect % 3 === 0) r.di = clampDi(row.di + DI_STEP);
  } else {
    r.consecutiveCorrect = 0;
    r.consecutiveErrors = row.consecutiveErrors + 1;
    r.streak = 0;
    r.di = clampDi(row.di - (row.di > 0 ? 2 : 1) * DI_STEP);
  }

  // confidence trial resolution (spec SS3.5: staircase resumes from nominal -2)
  if (opts.kind === 'confidence') {
    r.frustrationGuardUsedInLevel = row.frustrationGuardUsedInLevel + 1;
    r.consecutiveErrors = 0;
    r.di = clampDi(-2 * DI_STEP);
  }

  r.trialsThisSession = row.trialsThisSession + 1;
  r.trialHistory = [...row.trialHistory, {
    correct: succeeded, di: trialDi(row, opts.kind),
    isWarmup: opts.kind === 'warmup', isConfidence: opts.kind === 'confidence',
  }].slice(-HISTORY_CAP);

  // level bookkeeping (counted trials only)
  let levelOutcome: LevelOutcome | null = null;
  if (opts.kind === 'counted') {
    r.countedTrialsInLevel = row.countedTrialsInLevel + 1;
    r.correctCountedInLevel = row.correctCountedInLevel + (succeeded ? 1 : 0);
    if (r.countedTrialsInLevel >= COUNTED_PER_LEVEL) {
      const accuracy = r.correctCountedInLevel / COUNTED_PER_LEVEL;
      const stars: 0 | 1 | 2 | 3 = accuracy >= 0.9 ? 3 : accuracy >= 0.7 ? 2 : accuracy >= 0.5 ? 1 : 0;
      const advanced = stars >= 1;
      if (advanced) {
        r.starsByLevel = { ...row.starsByLevel, [row.currentLevel]: stars as 1 | 2 | 3 };
        r.currentLevel = Math.min(100, row.currentLevel + 1);
      } else {
        r.di = clampDi(Math.min(r.di, -DI_STEP));
      }
      r.countedTrialsInLevel = 0;
      r.correctCountedInLevel = 0;
      r.frustrationGuardUsedInLevel = 0;
      levelOutcome = { stars, accuracy, advanced };
    }
  }

  return { row: r, levelOutcome };
}
