/**
 * The handoff's motion table, verbatim and in one place. Screens name a
 * transition rather than each inventing its own timing, which is the only way
 * eight hand-specified durations stay consistent across three phases.
 *
 * Data, not a component, so it lives beside ScreenTransition rather than inside
 * it - a component file that also exports helpers breaks React Fast Refresh.
 */

export type TransitionName =
  | 'launchToSplash'
  | 'onboardingStep'
  | 'homeToIntro'
  | 'introToTitle'
  | 'titleToBoard'
  | 'boardToIntro'
  | 'boardToSummary';

export interface TransitionSpec {
  durationMs: number;
  easing: string;
  /** Starting transform. Omitted means a plain cross-fade. */
  from?: string;
}

export const TRANSITIONS: Record<TransitionName, TransitionSpec> = {
  launchToSplash: { durationMs: 250, easing: 'ease' },
  onboardingStep: { durationMs: 220, easing: 'cubic-bezier(0.22,0.61,0.36,1)', from: 'translateX(24px)' },
  homeToIntro:    { durationMs: 300, easing: 'ease',  from: 'scale(1.02)' },
  introToTitle:   { durationMs: 350, easing: 'ease' },
  titleToBoard:   { durationMs: 250, easing: 'ease' },
  boardToIntro:   { durationMs: 300, easing: 'ease' },
  boardToSummary: { durationMs: 400, easing: 'ease' },
};

/** The summary's rows rise and fade in 60 ms apart. */
export const STAGGER_STEP_MS = 60;

export function staggerDelay(index: number): number {
  return index * STAGGER_STEP_MS;
}
