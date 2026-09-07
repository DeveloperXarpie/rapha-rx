import { BY_ID, GROUPS, ITEMS, type Group } from './items';

export const CRATE_COUNT = 16;

/**
 * How much of the shelf a single-group round must be able to fill for that group to
 * qualify. It used to be `listLength + 2`, which was fine on a 12-crate shelf: the
 * smallest eligible group, spices at 8, filled 8 of 12 and the tier read as categorical.
 * On a bigger shelf the same group fills a third of it and the rest is backfilled at
 * random, so the hardest tier quietly became the easiest to tell apart.
 *
 * Requiring a group to cover most of the shelf keeps the tier meaning what it says.
 */
const CATEGORY_SHELF_SHARE = 0.6;

export interface BuildRoundParams {
  listLength: number;
  similarPackaging: boolean;
  listCategory: boolean;
}

export interface Round {
  /** Target item ids. */
  list: string[];
  /** Twelve item ids in grid order. */
  crates: string[];
}

function shuffled<T>(arr: readonly T[], rng: () => number): T[] {
  const out = [...arr];
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(rng() * (i + 1));
    [out[i], out[j]] = [out[j], out[i]];
  }
  return out;
}

/**
 * How many items a group needs before it may carry a single-group round.
 *
 * Exported so the catalogue tests can assert against the real rule. They used to mirror
 * it as a local constant, which went stale the moment the rule changed and left the
 * suite green while guarding nothing.
 */
export function categoryGroupMinimum(listLength: number): number {
  return Math.max(listLength, Math.ceil(CRATE_COUNT * CATEGORY_SHELF_SHARE));
}

/** The groups large enough to fill a single-group shelf at this list length. */
export function eligibleGroups(listLength: number): Group[] {
  const needed = categoryGroupMinimum(listLength);
  return GROUPS.filter((g) => ITEMS.filter((it) => it.group === g).length >= needed);
}

function poolFor(p: BuildRoundParams, rng: () => number) {
  if (!p.listCategory) return ITEMS;
  const eligible = eligibleGroups(p.listLength);
  // Unreachable with the shipped curve; degrade rather than fail if it is ever retuned.
  if (eligible.length === 0) return ITEMS;
  const group = shuffled(eligible, rng)[0];
  return ITEMS.filter((it) => it.group === group);
}

export function buildRound(p: BuildRoundParams, rng: () => number = Math.random): Round {
  const pool = poolFor(p, rng);
  const list = shuffled(pool, rng).slice(0, p.listLength).map((it) => it.id);

  const chosen: string[] = [...list];
  const add = (id: string) => {
    if (chosen.length < CRATE_COUNT && !chosen.includes(id)) chosen.push(id);
  };

  // The twin outranks group homogeneity: it is the mechanic, so it is admitted even
  // when listCategory put it outside the pool.
  if (p.similarPackaging) list.forEach((id) => add(BY_ID[id].twin));

  shuffled(pool, rng).forEach((it) => add(it.id));
  // Only does work when listCategory narrowed the pool; the full 21 cannot run dry.
  if (chosen.length < CRATE_COUNT) shuffled(ITEMS, rng).forEach((it) => add(it.id));

  return { list, crates: shuffled(chosen, rng) };
}

export interface RoundScore {
  correct: string[];
  wrong: string[];
  missed: string[];
  perfect: boolean;
}

/**
 * There is no life count here. The hearts system is gone, and these three counts are
 * what the effectiveness calculation reads - a round now ends only when the player
 * presses DONE, never because they ran out of attempts.
 */
export function scoreRound(list: string[], picked: string[]): RoundScore {
  const correct = picked.filter((id) => list.includes(id));
  const wrong = picked.filter((id) => !list.includes(id));
  const missed = list.filter((id) => !picked.includes(id));
  return {
    correct,
    wrong,
    missed,
    perfect: wrong.length === 0 && missed.length === 0,
  };
}

export type RowStatus = 'correct' | 'missed' | 'wrong';

export interface ResultRow {
  id: string;
  status: RowStatus;
}

/**
 * The rows the result card marks up, one per item.
 *
 * Ordered as the shopping list was written - collected or not - and then the items
 * brought back that were never on it. That way the resident reads their own list being
 * checked off rather than an audit of their cart, and the extras land at the end where
 * they read as extras.
 */
export function resultRows(list: string[], picked: string[]): ResultRow[] {
  const onList: ResultRow[] = list.map((id) => ({
    id,
    status: picked.includes(id) ? 'correct' : 'missed',
  }));
  // Pick order, so a row's position matches the order the player put things in the cart.
  const extras: ResultRow[] = picked
    .filter((id) => !list.includes(id))
    .map((id) => ({ id, status: 'wrong' }));

  return [...onList, ...extras];
}
