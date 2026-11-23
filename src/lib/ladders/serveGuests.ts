import type { ServeGuestsDynamicParams } from '../dynamicDifficulty';
import { SERVE_GUESTS } from './anchors.generated';
import { fillLadder, type Anchor } from './fill';
import { SERVE_GUESTS_SHEET } from './sheet';

/**
 * Tiffin Time's ladder (DIFFICULTY_RULES 3.5): seats, counter, order size, guests,
 * patience, guest mix, ready window, cook band and respawn gap. The anchors come from the
 * ladder sheet through `npm run ladders:import`; today they are the rules doc's sample
 * levels, until the owner sets their own.
 */
export const LENGTH = SERVE_GUESTS.length;
export const ANCHORS: Anchor<ServeGuestsDynamicParams>[] = SERVE_GUESTS.anchors;
export const SPEC = SERVE_GUESTS_SHEET.spec;
export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
