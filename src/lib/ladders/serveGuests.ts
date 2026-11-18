import type { ServeGuestsDynamicParams } from '../dynamicDifficulty';
import { fillLadder, type Anchor, type FieldSpec } from './fill';

/**
 * Tiffin Time's ladder (DIFFICULTY_RULES 3.5). Seats stay at 4, so guests per round
 * start at 8 (the rules need at least twice the seats). Seats, counter size, cook
 * bands and a 2-3 dish minimum need layout work and come with plan 3b.
 */
export const LENGTH = 30;

const row = (
  maxItemsPerGuest: number, guestsPerRound: number, patienceBaseS: number, patiencePerItemS: number,
  readyWindowS: number, impatient: number, patient: number,
): ServeGuestsDynamicParams => ({
  maxItemsPerGuest, guestsPerRound, patienceBaseS, patiencePerItemS, readyWindowS,
  guestMix: { impatient, patient },
});

export const ANCHORS: Anchor<ServeGuestsDynamicParams>[] = [
  { level: 1, values: row(1, 8, 40, 10, 16, 0, 0) },
  { level: 8, values: row(2, 8, 34, 9, 14, 0, 0) },
  { level: 15, values: row(2, 8, 30, 9, 12, 0.2, 0.2) },
  { level: 23, values: row(3, 10, 26, 9, 11, 0.3, 0.3) },
  { level: 30, values: row(3, 12, 22, 8, 9, 0.4, 0.3) },
];

export const SPEC: { [K in keyof ServeGuestsDynamicParams]: FieldSpec } = {
  maxItemsPerGuest: { kind: 'switch' },
  guestsPerRound: { kind: 'step', step: 1 },
  patienceBaseS: { kind: 'step', step: 1 },
  patiencePerItemS: { kind: 'step', step: 1 },
  readyWindowS: { kind: 'step', step: 1 },
  guestMix: { kind: 'step', step: 0.05 },
};

export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
