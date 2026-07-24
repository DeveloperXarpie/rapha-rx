import { describe, it, expect } from 'vitest';
import {
  freshEngineRow, beginSession, warmupCount, nextTrialKind, trialDi, applyTrialResult,
} from '../engineCore';
import { DI_STEP } from '../ladder';
import { todayISO, isoDaysAgo } from '../../dates';

const correct = { correct: true, omission: false, kind: 'counted' as const };
const wrong = { correct: false, omission: false, kind: 'counted' as const };

describe('staircase (spec SS3.2)', () => {
  it('3 consecutive correct raise DI by one step', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, correct).row;
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBe(0);
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBeCloseTo(DI_STEP);
  });
  it('one incorrect drops DI one step, two steps when DI > 0', () => {
    let r = { ...freshEngineRow('u'), di: 0 };
    r = applyTrialResult(r, wrong).row;
    expect(r.di).toBeCloseTo(-DI_STEP);
    r = { ...freshEngineRow('u'), di: 0.4 };
    r = applyTrialResult(r, wrong).row;
    expect(r.di).toBeCloseTo(0.4 - 2 * DI_STEP);
  });
  it('DI clamps at +-2.0', () => {
    let r = { ...freshEngineRow('u'), di: 1.99, consecutiveCorrect: 2 };
    r = applyTrialResult(r, correct).row;
    expect(r.di).toBe(2.0);
  });
  it('omission counts as incorrect for the staircase', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, { correct: false, omission: true, kind: 'counted' }).row;
    expect(r.di).toBeCloseTo(-DI_STEP);
    expect(r.consecutiveErrors).toBe(1);
  });
});

describe('counted trials and level completion (spec SS3.3)', () => {
  it('only counted trials advance the level counter', () => {
    let r = freshEngineRow('u');
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'warmup' }).row;
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'confidence' }).row;
    expect(r.countedTrialsInLevel).toBe(0);
    r = applyTrialResult(r, correct).row;
    expect(r.countedTrialsInLevel).toBe(1);
  });
  it.each([
    [9, 3], [7, 2], [5, 1],
  ])('%i/10 correct earns %i stars and advances', (nCorrect, stars) => {
    let r = freshEngineRow('u');
    let outcome = null;
    for (let i = 0; i < 10; i++) {
      const res = applyTrialResult(r, i < nCorrect ? correct : wrong);
      r = res.row; outcome = res.levelOutcome ?? outcome;
    }
    expect(outcome).toMatchObject({ stars, advanced: true });
    expect(r.currentLevel).toBe(2);
    expect(r.countedTrialsInLevel).toBe(0);
    expect(r.starsByLevel[1]).toBe(stars);
  });
  it('below 50% repeats the level at -1 step', () => {
    let r = freshEngineRow('u');
    let outcome = null;
    for (let i = 0; i < 10; i++) {
      const res = applyTrialResult(r, i < 4 ? correct : wrong);
      r = res.row; outcome = res.levelOutcome ?? outcome;
    }
    expect(outcome).toMatchObject({ stars: 0, advanced: false });
    expect(r.currentLevel).toBe(1);
    expect(r.di).toBeLessThanOrEqual(-DI_STEP);
  });
});

describe('frustration guard (spec SS3.5)', () => {
  it('3 consecutive errors queue a confidence trial, max twice per level', () => {
    let r = freshEngineRow('u');
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    expect(nextTrialKind(r)).toBe('confidence');
    expect(trialDi(r, 'confidence')).toBeCloseTo(-4 * DI_STEP);
    r = applyTrialResult(r, { correct: true, omission: false, kind: 'confidence' }).row;
    expect(r.frustrationGuardUsedInLevel).toBe(1);
    expect(r.di).toBeCloseTo(-2 * DI_STEP); // staircase resumes from nominal -2
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    r = applyTrialResult(r, { correct: false, omission: false, kind: 'confidence' }).row;
    expect(r.frustrationGuardUsedInLevel).toBe(2);
    for (let i = 0; i < 3; i++) r = applyTrialResult(r, wrong).row;
    expect(nextTrialKind(r)).not.toBe('confidence'); // budget exhausted
  });
});

describe('sessions (spec SS3.4)', () => {
  it('beginSession is a no-op for the same stamp and resets runs for a new one', () => {
    let r = freshEngineRow('u');
    r = beginSession(r, 1000);
    r = { ...r, consecutiveErrors: 2, streak: 5, trialsThisSession: 7, scenesThisSession: ['park'] };
    expect(beginSession(r, 1000)).toBe(r);
    const r2 = beginSession(r, 2000);
    expect(r2.consecutiveErrors).toBe(0);
    expect(r2.streak).toBe(0);
    expect(r2.trialsThisSession).toBe(0);
    expect(r2.scenesThisSession).toEqual([]);
    expect(r2.prevSessionTrials).toBe(7);
  });
  it('adaptive warm-up count: 2 if prev session had >= 6 trials, else 1', () => {
    const r = freshEngineRow('u');
    expect(warmupCount({ ...r, prevSessionTrials: 6 })).toBe(2);
    expect(warmupCount({ ...r, prevSessionTrials: 5 })).toBe(1);
    expect(nextTrialKind({ ...r, prevSessionTrials: 0, trialsThisSession: 0 })).toBe('warmup');
    expect(nextTrialKind({ ...r, prevSessionTrials: 0, trialsThisSession: 1 })).toBe('counted');
  });
  it('new-session DI = rolling mean of history minus one step; minus three after 7+ days away', () => {
    const hist = Array.from({ length: 20 }, () => ({ correct: true, di: 0.5, isWarmup: false, isConfidence: false }));
    let r = { ...freshEngineRow('u'), trialHistory: hist, lastPlayedDate: todayISO(), sessionStamp: 1 };
    expect(beginSession(r, 2).di).toBeCloseTo(0.5 - DI_STEP);
    r = { ...r, lastPlayedDate: isoDaysAgo(8) };
    expect(beginSession(r, 3).di).toBeCloseTo(0.5 - 3 * DI_STEP);
  });
  it('warmup trials run at DI minus two steps', () => {
    const r = { ...freshEngineRow('u'), di: 0.5 };
    expect(trialDi(r, 'warmup')).toBeCloseTo(0.5 - 2 * DI_STEP);
    expect(trialDi(r, 'counted')).toBeCloseTo(0.5);
  });
});
