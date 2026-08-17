import { BY_ID, GROUPS, ITEMS, type Group } from './items';

export const CRATE_COUNT = 12;

/** Group must cover the targets plus at least two same-group decoys. */
const CATEGORY_MARGIN = 2;

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

function poolFor(p: BuildRoundParams, rng: () => number) {
  if (!p.listCategory) return ITEMS;
  const eligible: Group[] = GROUPS.filter(
    (g) => ITEMS.filter((it) => it.group === g).length >= p.listLength + CATEGORY_MARGIN,
  );
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
  livesLost: number;
  perfect: boolean;
}

export function scoreRound(list: string[], picked: string[]): RoundScore {
  const correct = picked.filter((id) => list.includes(id));
  const wrong = picked.filter((id) => !list.includes(id));
  const missed = list.filter((id) => !picked.includes(id));
  return {
    correct,
    wrong,
    missed,
    livesLost: Math.min(2, wrong.length) + (missed.length > 0 ? 1 : 0),
    perfect: wrong.length === 0 && missed.length === 0,
  };
}
