import type { SpotFocusDynamicParams } from '../dynamicDifficulty';
import { SPOT_FOCUS } from './anchors.generated';
import { fillLadder, type Anchor } from './fill';
import { SPOT_FOCUS_SHEET } from './sheet';

/**
 * Spot Focus's ladder (DIFFICULTY_RULES 3.3), phone-safe: 3 columns, up to 6 rows,
 * differences at most 40% of the cards, bold / medium / subtle mixed on one board.
 *
 * The anchors come from the ladder sheet through `npm run ladders:import`. The rules doc's
 * samples are levels 1, 6, 12, 18 and 24; even steps between them made two things harder
 * at once, so every level is an anchor, each changing one thing (the sheet's notes say why
 * where a level breathes or repeats).
 */
export const LENGTH = SPOT_FOCUS.length;
export const ANCHORS: Anchor<SpotFocusDynamicParams>[] = SPOT_FOCUS.anchors;
export const SPEC = SPOT_FOCUS_SHEET.spec;
export const LADDER = fillLadder(ANCHORS, LENGTH, SPEC);
