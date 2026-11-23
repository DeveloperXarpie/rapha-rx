import type { ServeGuestsDynamicParams } from '../dynamicDifficulty';
import { fillLadder, type Anchor, type FieldSpec } from './fill';

/**
 * Tiffin Time's ladder (DIFFICULTY_RULES 3.5). Anchors are the rules doc's sample levels in
 * full since plan 3b, which added seats, counter size, the smallest order, the cook band and
 * the respawn gap. Provisional until the owner sets them in the ladder sheet.
 */
export const LENGTH = 30;

type Row = ServeGuestsDynamicParams;

const row = (
  seats: number, counterSize: number, [minItemsPerGuest, maxItemsPerGuest]: [number, number],
  guestsPerRound: number, [patienceBaseS, patiencePerItemS]: [number, number],
  [impatient, , patient]: [number, number, number], readyWindowS: number,
  cookBand: Row['cookBand'], [respawnMinS, respawnMaxS]: [number, number],
): Row => ({
  seats, counterSize, minItemsPerGuest, maxItemsPerGuest, guestsPerRound, patienceBaseS,
  patiencePerItemS, guestMix: { impatient, patient }, readyWindowS, cookBand, respawnMinS, respawnMaxS,
});

// Columns as in the rules doc's sample table: seats, counter, items (min-max), guests,
// patience base / per item, mix (Impatient / Middle / Patient), ready window, cook band,
// respawn gap.
export const ANCHORS: Anchor<Row>[] = [
  { level: 1,  values: row(2, 3, [1, 1], 6,  [40, 10], [0, 1, 0],         16, 'short', [2.5, 4]) },
  { level: 8,  values: row(3, 4, [1, 2], 8,  [34, 9],  [0, 1, 0],         14, 'mid',   [1.5, 3]) },
  { level: 15, values: row(4, 5, [1, 2], 8,  [30, 9],  [0.2, 0.6, 0.2],   12, 'all',   [1.2, 2.6]) },
  { level: 23, values: row(4, 6, [1, 3], 10, [26, 9],  [0.3, 0.4, 0.3],   11, 'all',   [0.9, 2.3]) },
  { level: 30, values: row(4, 6, [2, 3], 12, [22, 8],  [0.4, 0.3, 0.3],   9,  'long',  [0.9, 2.3]) },
];

export const SPEC: { [K in keyof ServeGuestsDynamicParams]: FieldSpec } = {
  seats: { kind: 'step', step: 1 },
  counterSize: { kind: 'step', step: 1 },
  minItemsPerGuest: { kind: 'switch' },
  maxItemsPerGuest: { kind: 'switch' },
  cookBand: { kind: 'switch' },
  respawnMinS: { kind: 'step', step: 0.1 },
  respawnMaxS: { kind: 'step', step: 0.1 },
  guestsPerRound: { kind: 'step', step: 1 },
  patienceBaseS: { kind: 'step', step: 1 },
  patiencePerItemS: { kind: 'step', step: 1 },
  readyWindowS: { kind: 'step', step: 1 },
  guestMix: { kind: 'step', step: 0.05 },
};

export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
