/**
 * Whether a round was cleared or failed (FINAL_SPEC D20), and whether it moves the
 * difficulty score.
 *
 * Each game judges its round on its own raw measure, never on the difficulty-weighted
 * skill score, so a threshold means the same at every level. The values are the
 * owner's accepted starting points (2026-11-18), to be tuned after playtests.
 * A failed round turns the game's round-end button into Replay.
 */
export type RoundOutcome = 'clear' | 'hold' | 'fail';

export const THRESHOLDS = {
  /** Shopping List fails under this share recalled, clears at this share with no wrong pick. */
  marketMemoryFailBelow: 0.5,
  marketMemoryClearAt: 0.8,
  /** Spot Focus fails when the resident gives up having found under this share... */
  spotFocusGiveUpFailBelow: 0.5,
  /** ...or when wrong taps exceed this many times the number of differences. */
  spotFocusWrongTapFactor: 2,
  /** Spot Focus clears with every difference found and at most this many wrong taps per difference. */
  spotFocusClearWrongTapFactor: 1,
  /** Tiffin Time fails under this share served or at this many walkouts... */
  serveGuestsFailBelow: 0.6,
  serveGuestsWalkoutFail: 3,
  /** ...and clears at this share served with at most this many walkouts. */
  serveGuestsClearAt: 0.8,
  serveGuestsClearMaxWalkouts: 1,
} as const;

const ratio = (part: number, whole: number) => (whole > 0 ? part / whole : 1);

/**
 * Three outcomes, as DIFFICULTY_RULES defines for each game: clear (the level may move
 * up), hold (repeat the level), fail (Replay, repeat the level).
 */
export function marketMemoryOutcome(m: { correct: number; listLength: number; wrong: number }): RoundOutcome {
  const recalled = ratio(m.correct, m.listLength);
  if (recalled < THRESHOLDS.marketMemoryFailBelow) return 'fail';
  return recalled >= THRESHOLDS.marketMemoryClearAt && m.wrong === 0 ? 'clear' : 'hold';
}

export function spotFocusOutcome(m: {
  found: number; total: number; falseTaps: number; gaveUp: boolean;
}): RoundOutcome {
  const gaveUpEarly = m.gaveUp && ratio(m.found, m.total) < THRESHOLDS.spotFocusGiveUpFailBelow;
  const tooManyWrong = m.falseTaps > THRESHOLDS.spotFocusWrongTapFactor * m.total;
  if (gaveUpEarly || tooManyWrong) return 'fail';
  const allFound = !m.gaveUp && m.found >= m.total;
  return allFound && m.falseTaps <= THRESHOLDS.spotFocusClearWrongTapFactor * m.total ? 'clear' : 'hold';
}

export function serveGuestsOutcome(m: {
  itemsServed: number; itemsRequested: number; walkouts: number;
}): RoundOutcome {
  const served = ratio(m.itemsServed, m.itemsRequested);
  if (served < THRESHOLDS.serveGuestsFailBelow || m.walkouts >= THRESHOLDS.serveGuestsWalkoutFail) {
    return 'fail';
  }
  return served >= THRESHOLDS.serveGuestsClearAt && m.walkouts <= THRESHOLDS.serveGuestsClearMaxWalkouts
    ? 'clear' : 'hold';
}

/*
 * The games whose failed round replays the same level (owner, 2026-11-18). Station
 * Master and Garden Keeper already report losses and keep today's step-down until
 * plan 3's ladder movement rule (DIFFICULTY_RULES X1) replaces both.
 */
const SAME_LEVEL_ON_FAIL = new Set(['market-memory', 'spot-focus', 'serve-guests']);

export function keepsLevelOnFail(gameId: string): boolean {
  return SAME_LEVEL_ON_FAIL.has(gameId);
}

/**
 * Whether this round moves the difficulty score. The plan-2 games move only on a clear
 * (a hold or a fail repeats the level); the others keep today's rule. Shopping List's
 * second trip never moves it.
 */
export function shouldAdjustDifficulty(args: {
  gameId: string; completed: boolean; outcome: RoundOutcome | undefined; secondTrip: boolean;
}): boolean {
  if (args.secondTrip) return false;
  if (!keepsLevelOnFail(args.gameId)) return true;
  return args.outcome === 'clear';
}
