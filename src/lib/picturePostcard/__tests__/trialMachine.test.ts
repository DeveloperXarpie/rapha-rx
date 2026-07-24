import { describe, it, expect } from 'vitest';
import { initialState, reduce } from '../../../games/memory/PicturePostcard/trialMachine';
import type { TrialSpec } from '../../contentGenerators/picturePostcard';

const trial: TrialSpec = {
  sceneId: 'park', probeMode: 'M2',
  changes: [{ changeClass: 1, slotId: 'park-bicycle' }],
  lurePlacements: [], params: { objects: 8, encodeMs: 6000, delayMs: 2000, changes: 1, lureLevel: 0 },
  softTimerMs: 60000, interference: false,
};
const tick = (s: ReturnType<typeof initialState>, ms: number) => reduce(s, trial, { type: 'TICK', ms });

describe('trial machine', () => {
  it('walks ready -> encoding -> retention -> probe on timers', () => {
    let s = initialState(trial);
    expect(s.phase).toBe('ready');
    s = tick(s, 1500);
    expect(s.phase).toBe('encoding');
    expect(s.msLeftInPhase).toBe(6000);
    s = tick(s, 6000);
    expect(s.phase).toBe('retention');
    s = tick(s, 2000);
    expect(s.phase).toBe('probe');
  });
  it('pause freezes timers and counts interruptions', () => {
    let s = tick(initialState(trial), 1500); // encoding
    s = reduce(s, trial, { type: 'PAUSE' });
    s = tick(s, 10000);
    expect(s.phase).toBe('encoding');
    expect(s.interruptions).toBe(1);
    s = reduce(s, trial, { type: 'RESUME' });
    s = tick(s, 6000);
    expect(s.phase).toBe('retention');
  });
  it('soft-timer expiry resolves as omission', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000); // probe
    s = tick(s, 60000);
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: false, omission: true });
  });
  it('scaffold ladder: 6s -> tier 1, wrong tap -> tier 2, 2 wrong -> 3, 3 wrong -> 4 resolves', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000);
    s = tick(s, 6000);
    expect(s.scaffoldTier).toBe(1);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(2);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(3);
    expect(s.autoScaffoldTiersAboveTier1).toBe(2);
    s = reduce(s, trial, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.scaffoldTier).toBe(4);
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: false, omission: false });
    expect(s.autoScaffoldTiersAboveTier1).toBe(3);
  });
  it('hint jumps to tier 3 without auto-scaffold cost', () => {
    let s = tick(tick(tick(initialState(trial), 1500), 6000), 2000);
    s = reduce(s, trial, { type: 'HINT' });
    expect(s.scaffoldTier).toBe(3);
    expect(s.hintsUsed).toBe(1);
    expect(s.autoScaffoldTiersAboveTier1).toBe(0);
  });
  it('hint is ignored outside the probe phase', () => {
    // during 'ready'
    let s = reduce(initialState(trial), trial, { type: 'HINT' });
    expect(s.hintsUsed).toBe(0);
    expect(s.scaffoldTier).toBe(0);

    // after resolving to 'feedback' via soft-timer expiry
    s = tick(tick(tick(initialState(trial), 1500), 6000), 2000); // probe
    s = tick(s, 60000); // feedback (omission)
    expect(s.phase).toBe('feedback');
    s = reduce(s, trial, { type: 'HINT' });
    expect(s.hintsUsed).toBe(0);
    expect(s.scaffoldTier).toBe(0);
  });
  it('correct response resolves; multi-change waits for all', () => {
    const two: TrialSpec = { ...trial, changes: [trial.changes[0], { changeClass: 3, slotId: 'park-dog' }] };
    let s = tick(tick(tick(initialState(two), 1500), 6000), 2000);
    s = reduce(s, two, { type: 'RESPONSE', correctChangeIndex: 0 });
    expect(s.phase).toBe('probe');
    s = reduce(s, two, { type: 'RESPONSE', correctChangeIndex: 1 });
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: true, omission: false });
  });
  it('M3 trial resolves on its single probed answer, even with multiple changes', () => {
    const m3: TrialSpec = {
      ...trial,
      probeMode: 'M3',
      changes: [trial.changes[0], { changeClass: 3, slotId: 'park-dog' }],
    };
    let s = tick(tick(tick(initialState(m3), 1500), 6000), 2000); // probe

    // a wrong response first still escalates and does not resolve
    s = reduce(s, m3, { type: 'RESPONSE', correctChangeIndex: null });
    expect(s.phase).toBe('probe');
    expect(s.wrongResponses).toBe(1);

    s = reduce(s, m3, { type: 'RESPONSE', correctChangeIndex: 0 });
    expect(s.phase).toBe('feedback');
    expect(s.outcome).toEqual({ correct: true, omission: false });
  });
});
