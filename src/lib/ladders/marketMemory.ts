import type { MarketMemoryDynamicParams } from '../dynamicDifficulty';
import { MARKET_MEMORY } from './anchors.generated';
import { fillLadder, type Anchor } from './fill';
import { MARKET_MEMORY_SHEET } from './sheet';

/**
 * Shopping List's ladder (DIFFICULTY_RULES 3.1). The anchors come from the ladder sheet
 * through `npm run ladders:import`; today they are the rules doc's sample levels, until the
 * owner sets their own. `delayedRetrieval` is never read by the game, so it stays off.
 */
export const LENGTH = MARKET_MEMORY.length;
export const ANCHORS: Anchor<MarketMemoryDynamicParams>[] = MARKET_MEMORY.anchors;
export const SPEC = MARKET_MEMORY_SHEET.spec;
export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
