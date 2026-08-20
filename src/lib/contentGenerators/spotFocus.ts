/**
 * Content generator for Spot Focus.
 *
 * The order here is the opposite of the version this replaces, and that is the point.
 * The old generator filled the grid from a themed emoji bank and then hunted for
 * differences among whatever landed, which is structurally why `changeSubtlety` could
 * never be honoured: by the time the tier was consulted the cells were already
 * committed. It also meant the round could quietly come up short, promising six
 * differences and building five.
 *
 * This picks the difference-bearing items first, at the tier the engine asked for, and
 * fills the rest of the board around them.
 */

import {
  BY_ID,
  ITEMS,
  familyMembers,
  type SpotItem,
  type Subtlety,
} from '../../games/attention/SpotFocus/items';
import type { SpotFocusDynamicParams } from '../dynamicDifficulty';

export interface SceneCell {
  id: string;
  labelKey: string;
  isDifference?: true;
}

export interface GeneratedScene {
  originalRows: SceneCell[][];
  modifiedRows: SceneCell[][];
  differenceCount: number;
  /** Differences that had to drop to a bolder tier. Zero on a healthy catalogue. */
  fallbacksUsed: number;
}

/** Bolder is the direction we degrade in: a difference stays findable, just easier. */
const BOLDER: Record<Subtlety, Subtlety | null> = {
  subtle: 'medium',
  medium: 'bold',
  bold: null,
};

function shuffle<T>(arr: readonly T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** The family members that count as a medium swap: kin, but not the near-identical twin. */
const mediumKin = (item: SpotItem): SpotItem[] =>
  familyMembers(item.family).filter((k) => k.id !== item.id && k.id !== item.twin);

/**
 * Whether the catalogue can build a difference of this tier out of this item.
 *
 * Checked before an item is chosen, not after. Choosing first and asking later is how
 * a subtle round ends up full of bold swaps: most items have no twin, so most draws
 * would fail and fall through to a bolder tier.
 */
function eligible(item: SpotItem, tier: Subtlety): boolean {
  if (tier === 'subtle') return Boolean(item.twin);
  if (tier === 'medium') return mediumKin(item).length > 0;
  return true;
}

/** What `item` becomes at `tier`, or null if this particular draw cannot be built. */
function swapFor(item: SpotItem, tier: Subtlety, usedFamilies: Set<string>): SpotItem | null {
  if (tier === 'subtle') {
    return item.twin ? BY_ID.get(item.twin) ?? null : null;
  }
  if (tier === 'medium') {
    const kin = mediumKin(item);
    return kin.length ? shuffle(kin)[0] : null;
  }
  // Its own family is excluded as well as the families already on the board. Without
  // that an item can be drawn as its own replacement, producing a cell flagged as a
  // difference that is identical on both sides.
  const outsiders = ITEMS.filter(
    (k) => k.family !== item.family && !usedFamilies.has(k.family),
  );
  return outsiders.length ? shuffle(outsiders)[0] : null;
}

const cellOf = (item: SpotItem): SceneCell => ({ id: item.id, labelKey: item.labelKey });

export function generateSpotFocusContent(params: SpotFocusDynamicParams): GeneratedScene {
  const { gridRows, gridCols, differenceCount, changeSubtlety } = params;
  const total = gridRows * gridCols;
  const wanted = Math.min(differenceCount, total);

  const usedFamilies = new Set<string>();
  const originals: SpotItem[] = [];
  const swaps = new Map<string, SpotItem>();
  let fallbacksUsed = 0;

  // 1. The difference-bearing cells first, so the tier decides which items are eligible
  //    rather than the other way round. The whole pool is swept at the requested tier
  //    before dropping to a bolder one, so a single awkward draw never drags the round
  //    down a tier: only genuinely running out of eligible items does.
  let tier: Subtlety | null = changeSubtlety;
  while (tier && swaps.size < wanted) {
    for (const candidate of shuffle(ITEMS)) {
      if (swaps.size === wanted) break;
      if (usedFamilies.has(candidate.family)) continue;
      if (!eligible(candidate, tier)) continue;

      const replacement = swapFor(candidate, tier, usedFamilies);
      if (!replacement) continue;

      originals.push(candidate);
      swaps.set(candidate.id, replacement);
      usedFamilies.add(candidate.family);
      // A bold swap brings in an outsider, whose family is now spoken for too.
      usedFamilies.add(replacement.family);
      if (tier !== changeSubtlety) fallbacksUsed++;
    }
    tier = BOLDER[tier];
  }

  // 2. Fill the rest, keeping one family to a board so no object appears twice.
  for (const candidate of shuffle(ITEMS)) {
    if (originals.length === total) break;
    if (usedFamilies.has(candidate.family)) continue;
    originals.push(candidate);
    usedFamilies.add(candidate.family);
  }

  // 3. Shuffle placement so the differences are not always the first cells.
  const placed = shuffle(originals);

  const originalRows: SceneCell[][] = [];
  const modifiedRows: SceneCell[][] = [];
  for (let r = 0; r < gridRows; r++) {
    const origRow: SceneCell[] = [];
    const modRow: SceneCell[] = [];
    for (let c = 0; c < gridCols; c++) {
      const item = placed[r * gridCols + c];
      origRow.push(cellOf(item));
      const swap = swaps.get(item.id);
      modRow.push(swap ? { ...cellOf(swap), isDifference: true } : cellOf(item));
    }
    originalRows.push(origRow);
    modifiedRows.push(modRow);
  }

  return { originalRows, modifiedRows, differenceCount: swaps.size, fallbacksUsed };
}
