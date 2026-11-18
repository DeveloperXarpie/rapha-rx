import type { MarketMemoryDynamicParams } from '../dynamicDifficulty';
import { fillLadder, type Anchor, type FieldSpec } from './fill';

/**
 * Shopping List's ladder (DIFFICULTY_RULES 3.1). Anchors are the rules doc's sample
 * levels, provisional until the owner sets them in the ladder sheet (2026-11-18).
 * `delayedRetrieval` is never read by the game, so it stays off.
 */
export const LENGTH = 20;

const row = (listLength: number, retentionMs: number, twins: boolean, category: boolean, hints: number):
  MarketMemoryDynamicParams => ({
  listLength, retentionMs, similarPackaging: twins, delayedRetrieval: false, listCategory: category, hints,
});

export const ANCHORS: Anchor<MarketMemoryDynamicParams>[] = [
  { level: 1, values: row(3, 1500, false, false, 1) },
  { level: 5, values: row(4, 2500, true, false, 1) },
  { level: 10, values: row(5, 3000, true, false, 1) },
  { level: 15, values: row(5, 5500, true, true, 1) },
  { level: 20, values: row(6, 6500, true, true, 0) },
];

export const SPEC: { [K in keyof MarketMemoryDynamicParams]: FieldSpec } = {
  listLength: { kind: 'step', step: 1 },
  retentionMs: { kind: 'step', step: 500 },
  similarPackaging: { kind: 'switch' },
  delayedRetrieval: { kind: 'switch' },
  listCategory: { kind: 'switch' },
  hints: { kind: 'switch' },
};

export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
