import type { TrialSpec } from '../../../lib/contentGenerators/picturePostcard';

export type Phase = 'ready' | 'encoding' | 'retention' | 'probe' | 'feedback' | 'starCard';

export interface MachineState {
  phase: Phase;
  paused: boolean;
  msLeftInPhase: number;          // ready/encoding/retention countdown; probe = soft-timer remainder (Infinity when null)
  foundChangeIds: number[];       // indices into trial.changes (M2 multi-change)
  wrongResponses: number;         // wrong taps (M1/M2) or wrong choices (M3)
  scaffoldTier: 0 | 1 | 2 | 3 | 4;
  autoScaffoldTiersAboveTier1: number; // for scoring
  hintsUsed: number;
  msSinceProbeStart: number;
  outcome: null | { correct: boolean; omission: boolean };
  interruptions: number;
}

export type MachineEvent =
  | { type: 'TICK'; ms: number }
  | { type: 'PAUSE' } | { type: 'RESUME' }
  | { type: 'RESPONSE'; correctChangeIndex: number | null } // null = wrong tap/choice
  | { type: 'HINT' }
  | { type: 'FEEDBACK_DONE' };

const READY_MS = 1500;

export function initialState(trial: TrialSpec): MachineState {
  void trial;
  return {
    phase: 'ready',
    paused: false,
    msLeftInPhase: READY_MS,
    foundChangeIds: [],
    wrongResponses: 0,
    scaffoldTier: 0,
    autoScaffoldTiersAboveTier1: 0,
    hintsUsed: 0,
    msSinceProbeStart: 0,
    outcome: null,
    interruptions: 0,
  };
}

/** Resolves to 'feedback' with the given outcome. */
function resolve(state: MachineState, outcome: { correct: boolean; omission: boolean }): MachineState {
  return { ...state, phase: 'feedback', outcome };
}

/**
 * Advances the countdown-based phases (ready/encoding/retention) by `ms`.
 * A tick that overshoots the remaining time in the phase is clamped: any surplus
 * beyond the boundary is discarded rather than rolled into the next phase. This is
 * an intentional simplification (the brief permits it) - the real UI ticks at 100ms
 * granularity so surplus never exceeds 100ms in practice.
 */
function advanceTimedPhase(state: MachineState, trial: TrialSpec, ms: number): MachineState {
  const remaining = state.msLeftInPhase - ms;
  if (remaining > 0) {
    return { ...state, msLeftInPhase: remaining };
  }
  if (state.phase === 'ready') {
    return { ...state, phase: 'encoding', msLeftInPhase: trial.params.encodeMs };
  }
  if (state.phase === 'encoding') {
    return { ...state, phase: 'retention', msLeftInPhase: trial.params.delayMs };
  }
  // retention -> probe
  const softTimerMs = trial.softTimerMs ?? Infinity;
  return {
    ...state,
    phase: 'probe',
    msLeftInPhase: softTimerMs,
    msSinceProbeStart: 0,
  };
}

/**
 * Evaluates the scaffold ladder (spec SS4.3); tier only ever increases. Checked
 * highest-tier-first so a single reduce that jumps straight to a wrongResponses-driven
 * trigger (e.g. tier 4) short-circuits without also "passing through" lower tiers.
 */
function applyScaffoldTriggers(state: MachineState): MachineState {
  let next = state;

  if (next.scaffoldTier < 4 && next.wrongResponses >= 3) {
    return resolve(
      { ...next, scaffoldTier: 4, autoScaffoldTiersAboveTier1: next.autoScaffoldTiersAboveTier1 + 1 },
      { correct: false, omission: false },
    );
  }
  if (next.scaffoldTier < 3 && next.wrongResponses >= 2) {
    next = { ...next, scaffoldTier: 3, autoScaffoldTiersAboveTier1: next.autoScaffoldTiersAboveTier1 + 1 };
  }
  if (next.scaffoldTier < 2 && (next.msSinceProbeStart >= 12000 || next.wrongResponses >= 1)) {
    next = { ...next, scaffoldTier: 2, autoScaffoldTiersAboveTier1: next.autoScaffoldTiersAboveTier1 + 1 };
  }
  const hasResponded = next.foundChangeIds.length > 0 || next.wrongResponses > 0;
  if (next.scaffoldTier < 1 && next.msSinceProbeStart >= 6000 && !hasResponded) {
    next = { ...next, scaffoldTier: 1 };
  }
  return next;
}

/** Advances the probe soft-timer; expiry resolves the trial as an omission. */
function advanceProbe(state: MachineState, ms: number): MachineState {
  const msSinceProbeStart = state.msSinceProbeStart + ms;
  const remaining = state.msLeftInPhase === Infinity ? Infinity : state.msLeftInPhase - ms;

  if (remaining !== Infinity && remaining <= 0) {
    return resolve(
      { ...state, msSinceProbeStart, msLeftInPhase: 0 },
      { correct: false, omission: true },
    );
  }

  return { ...state, msSinceProbeStart, msLeftInPhase: remaining };
}

function reduceInner(state: MachineState, trial: TrialSpec, event: MachineEvent): MachineState {
  switch (event.type) {
    case 'TICK': {
      if (state.paused) return state;
      if (state.phase === 'ready' || state.phase === 'encoding' || state.phase === 'retention') {
        return advanceTimedPhase(state, trial, event.ms);
      }
      if (state.phase === 'probe') {
        return advanceProbe(state, event.ms);
      }
      return state;
    }

    case 'PAUSE': {
      if (state.paused) return state;
      return { ...state, paused: true, interruptions: state.interruptions + 1 };
    }

    case 'RESUME': {
      if (!state.paused) return state;
      return { ...state, paused: false };
    }

    case 'RESPONSE': {
      if (state.phase !== 'probe') return state;

      if (event.correctChangeIndex === null) {
        return { ...state, wrongResponses: state.wrongResponses + 1 };
      }

      if (state.foundChangeIds.includes(event.correctChangeIndex)) return state; // already counted, ignore

      const foundChangeIds = [...state.foundChangeIds, event.correctChangeIndex];
      if (foundChangeIds.length >= trial.changes.length) {
        return resolve({ ...state, foundChangeIds }, { correct: true, omission: false });
      }
      return { ...state, foundChangeIds };
    }

    case 'HINT': {
      if (state.phase !== 'probe') return state;
      const scaffoldTier = Math.max(state.scaffoldTier, 3) as MachineState['scaffoldTier'];
      return { ...state, scaffoldTier, hintsUsed: state.hintsUsed + 1 };
    }

    case 'FEEDBACK_DONE': {
      // Terminal from the machine's perspective; the component decides star card vs
      // onLevelComplete and applies a direct phase override to 'starCard' if needed.
      return state;
    }

    default:
      return state;
  }
}

export function reduce(state: MachineState, trial: TrialSpec, event: MachineEvent): MachineState {
  const next = reduceInner(state, trial, event);
  // Scaffold triggers are re-evaluated on every reduce while the trial is in the
  // probe phase (spec SS4.3), so a wrong tap / elapsed time is picked up immediately
  // regardless of which event carried it.
  return next.phase === 'probe' ? applyScaffoldTriggers(next) : next;
}
