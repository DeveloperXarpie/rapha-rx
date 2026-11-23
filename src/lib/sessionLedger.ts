import type { GameCategory } from '../styles/tokens';

/**
 * The rules of the v2 daily loop (FINAL_SPEC sections 5 and 6), in one pure module.
 *
 * Each day starts with Memory open. Ten minutes of board time in the open category
 * completes it and opens the next, in a fixed order (D1, D2, D6). Play in a completed
 * category credits nothing (D3). Everything here is pure so the store, GameShell,
 * Home and the score card all read the same answer - the old rotation spread this
 * decision across four files and two of them drifted.
 */

/** Unlock order (D6). The code id for Planning is `executive`. */
export const CATEGORY_ORDER: GameCategory[] = ['memory', 'attention', 'executive'];

/** Board time that completes a category (D1). Tunable. */
export const CATEGORY_SESSION_SECONDS = 600;

export type CategoryStatus = 'completed' | 'active' | 'locked';
export type TileAction = 'play' | 'locked' | 'completed';

/** The one category that is open and not yet done, or null once the day is done. */
export function activeCategory(completed: string[]): GameCategory | null {
  return CATEGORY_ORDER.find((c) => !completed.includes(c)) ?? null;
}

export function categoryStatus(category: GameCategory, completed: string[]): CategoryStatus {
  if (completed.includes(category)) return 'completed';
  return activeCategory(completed) === category ? 'active' : 'locked';
}

export function isDayComplete(completed: string[]): boolean {
  return activeCategory(completed) === null;
}

/** Only board time in the open category counts toward its ten minutes. */
export function creditsTime(gameCategory: GameCategory, completed: string[]): boolean {
  return activeCategory(completed) === gameCategory;
}

export function shouldCompleteCategory(args: {
  gameCategory: GameCategory;
  completed: string[];
  seconds: number;
}): boolean {
  return creditsTime(args.gameCategory, args.completed)
    && args.seconds >= CATEGORY_SESSION_SECONDS;
}

/**
 * Completes `category` only if it is the open one. Anything else returns the same
 * array, so a second level-end past the threshold cannot complete two categories.
 */
export function completeCategory(completed: string[], category: GameCategory): string[] {
  return activeCategory(completed) === category ? [...completed, category] : completed;
}

export function tileAction(category: GameCategory, completed: string[]): TileAction {
  const status = categoryStatus(category, completed);
  return status === 'active' ? 'play' : status;
}

/** The open category, if Home has not yet played its unlock animation. */
export function pendingUnlock(completed: string[], unlocksSeen: string[]): GameCategory | null {
  const active = activeCategory(completed);
  return active && !unlocksSeen.includes(active) ? active : null;
}

/**
 * Where the score card's Continue goes: the 10-minute summary of the category just
 * completed (C4: scorecard, summary, Home; owner 2026-11-19).
 */
export function afterScoreCard(completed: string[]): string {
  const last = completed[completed.length - 1];
  return last ? `/app/category-summary/${last}` : '/app/home';
}

export interface LedgerSession {
  date: string;
  categoriesCompleted: string[];
  /** Always activeCategory(categoriesCompleted); stored for readers of the saved row. */
  currentCategory: GameCategory | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  sessionStartedAt: number | null;
  /** Games that earned credited time today, in first-played order. */
  gamesPlayed: string[];
  /** Categories whose unlock Home has already shown. Memory is open from the start. */
  unlocksSeen: string[];
  /** The Education screen shows once a day, before the first game. */
  educationSeen: boolean;
}

export function freshSession(today: string): LedgerSession {
  return {
    date: today,
    categoriesCompleted: [],
    currentCategory: CATEGORY_ORDER[0],
    currentGameId: null,
    secondsInCurrentCategory: 0,
    sessionStartedAt: null,
    gamesPlayed: [],
    unlocksSeen: [CATEGORY_ORDER[0]],
    educationSeen: false,
  };
}

const isStringArray = (v: unknown): v is string[] =>
  Array.isArray(v) && v.every((x) => typeof x === 'string');

/**
 * Any saved session - today's, yesterday's, or a v1.35 row with plannedGames and
 * sessionStarted - becomes a valid LedgerSession for `today`. A stale date is a new
 * day (D2). Only LedgerSession fields are copied, so retired fields drop out.
 */
export function normalizeSession(raw: unknown, today: string): LedgerSession {
  const fresh = freshSession(today);
  if (!raw || typeof raw !== 'object') return fresh;
  const r = raw as Record<string, unknown>;
  if (r.date !== today) return fresh;

  const completed = isStringArray(r.categoriesCompleted)
    ? CATEGORY_ORDER.filter((c) => (r.categoriesCompleted as string[]).includes(c))
    : [];
  const active = activeCategory(completed);
  // A v1.35 row has no unlocksSeen: count every category already open as seen,
  // so an old session never replays an unlock it went through.
  const opened = active ? [...completed, active] : [...completed];

  return {
    date: today,
    categoriesCompleted: completed,
    currentCategory: active,
    currentGameId: typeof r.currentGameId === 'string' ? r.currentGameId : null,
    secondsInCurrentCategory: typeof r.secondsInCurrentCategory === 'number'
      ? r.secondsInCurrentCategory : 0,
    sessionStartedAt: typeof r.sessionStartedAt === 'number' ? r.sessionStartedAt : null,
    gamesPlayed: isStringArray(r.gamesPlayed) ? r.gamesPlayed : [],
    unlocksSeen: isStringArray(r.unlocksSeen) ? r.unlocksSeen : opened,
    educationSeen: typeof r.educationSeen === 'boolean'
      ? r.educationSeen : r.sessionStarted === true,
  };
}

/**
 * What a tile tap does, judged against today's ledger. Home can still be showing
 * yesterday's state on a tablet left open overnight; deciding from the raw session
 * would open yesterday's categories and credit nothing (final review I1).
 */
export function tapOutcome(raw: unknown, today: string, category: GameCategory): TileAction {
  return tileAction(category, normalizeSession(raw, today).categoriesCompleted);
}
