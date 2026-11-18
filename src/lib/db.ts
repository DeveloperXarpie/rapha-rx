import Dexie from 'dexie';
import type { Table } from 'dexie';
import type { Language, DifficultyLevel } from '../styles/tokens';

export interface UserProfile {
  userId: string;           // UUID
  firstName: string;
  lastName: string;
  nickname?: string | null;
  careHomeId: string;
  language: Language;
  createdAt: number;
  lastSeenAt?: number;
  soundEnabled: boolean;
  textSize: 'normal' | 'large' | 'xlarge';
}

export interface SessionState {
  id?: number;              // auto-increment
  userId: string;
  date: string;             // ISO date YYYY-MM-DD
  categoriesCompleted: string[];
  currentCategory: string | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  sessionStartedAt: number | null;
  /*
   * v2 ledger fields (src/lib/sessionLedger.ts). None is indexed, so they need no
   * Dexie version bump. A row written before v1.36 lacks them; normalizeSession
   * fills them in.
   */
  gamesPlayed?: string[];
  unlocksSeen?: string[];
  educationSeen?: boolean;
  /** @deprecated v1.35 rotation fields. Old rows still carry them; nothing reads them. */
  sessionStarted?: boolean;
  /** @deprecated See sessionStarted. */
  plannedGames?: string[];
  /** @deprecated See sessionStarted. */
  focusCategory?: 'memory' | 'attention' | 'executive' | null;
}

export interface GameProgress {
  id?: number;
  userId: string;
  gameId: string;
  currentLevelId: DifficultyLevel;
  consecutiveCompletions: number;
  consecutiveIncompletes: number;
  hasBeenPromptedForLevel: boolean;
  /**
   * The level this game last reached, for Home's "Last time: level n".
   *
   * Stored rather than derived. getTodayDifficulty looks like the obvious
   * source but is not: it is async, it writes on a cache miss (so rendering
   * Home would create difficulty rows for unplayed games), and on a fresh day
   * it returns yesterday's peak decayed by the warm-up factor rather than the
   * level actually reached.
   *
   * Not indexed, so no Dexie version bump.
   */
  lastLevel?: number;
  lastPlayedISO?: string;
}

export interface DifficultyState {
  id?: number;
  userId: string;
  gameId: string;
  date: string;              // ISO YYYY-MM-DD — resets daily
  score: number;             // 0.0 → 1.0
  peakScore: number;         // highest score reached this day
  roundsPlayed: number;
  /*
   * Ladder games (src/lib/ladders) keep their numbered level here instead of `score`.
   * Not indexed, so no Dexie version bump. A row per day is what makes every game
   * restart at level 1 each day (DIFFICULTY_RULES X2).
   */
  level?: number;
  failStreak?: number;
}

/**
 * One round that counted for a category session (plan 4), kept so skill scores can be
 * computed for today and for the previous session. `metrics` is the game's own
 * LevelResult.metrics, unchanged.
 */
export interface RoundRecord {
  id?: number;
  userId: string;
  date: string;
  category: 'memory' | 'attention' | 'executive';
  gameId: string;
  at: number;
  metrics: Record<string, unknown>;
}

export interface PendingEvent {
  id?: number;
  eventName: string;
  eventProps: Record<string, unknown>;
  queuedAt: number;
}

export interface PpTrialRecord {
  correct: boolean;
  di: number;
  isWarmup: boolean;
  isConfidence: boolean;
}

export interface PpEngineRow {
  userId: string;
  currentLevel: number;
  di: number;
  countedTrialsInLevel: number;
  correctCountedInLevel: number;
  trialHistory: PpTrialRecord[];      // rolling last 20
  starsByLevel: Record<number, 1 | 2 | 3>;
  consecutiveCorrect: number;
  consecutiveErrors: number;
  streak: number;
  frustrationGuardUsedInLevel: number;
  sessionStamp: number | null;        // sessionStartedAt ms; practice fallback: Date.parse(todayISO())
  trialsThisSession: number;
  prevSessionTrials: number;          // for adaptive warm-up count (spec SS3.3)
  scenesThisSession: string[];
  tipCardL41Shown: boolean;
  /** Onboarding card for the photo levels. Not indexed, so no Dexie version bump is
   *  needed - the ppEngine store is declared as 'userId' and nothing else. Existing
   *  rows read undefined, which is falsy, so returning players see it once. */
  tipCardPhotoShown?: boolean;
  lastPlayedDate: string;             // ISO date (UTC)
  updatedAt: number;
}

export interface PpPairHistoryRow {
  key: string;                        // `${userId}|${sceneId}:${changeClass}`
  userId: string;
  lastUsedDate: string;               // ISO date (UTC)
}

class BrainTrainingDB extends Dexie {
  userProfile!: Table<UserProfile, string>;
  sessionState!: Table<SessionState, number>;
  gameProgress!: Table<GameProgress, number>;
  difficultyState!: Table<DifficultyState, number>;
  pendingEvents!: Table<PendingEvent, number>;
  roundLog!: Table<RoundRecord, number>;
  ppEngine!: Table<PpEngineRow, string>;
  ppPairHistory!: Table<PpPairHistoryRow, string>;

  constructor() {
    super('BrainTrainingDB');
    this.version(1).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      pendingEvents:'++id, queuedAt',
    });
    this.version(2).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      difficultyState: '++id, userId, gameId, date, [userId+gameId], [userId+gameId+date]',
      pendingEvents:'++id, queuedAt',
    });
    this.version(3).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      difficultyState: '++id, userId, gameId, date, [userId+gameId], [userId+gameId+date]',
      pendingEvents:'++id, queuedAt',
      ppEngine: 'userId',
      ppPairHistory: 'key, userId',
    });
    // Plan 4: the round log behind skill scores.
    this.version(4).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      difficultyState: '++id, userId, gameId, date, [userId+gameId], [userId+gameId+date]',
      pendingEvents:'++id, queuedAt',
      ppEngine: 'userId',
      ppPairHistory: 'key, userId',
      roundLog: '++id, userId, [userId+date+category], [userId+category+date]',
    });
  }
}

export const appDb = new BrainTrainingDB();

// Helpers
export async function getUserProfile(userId: string): Promise<UserProfile | undefined> {
  return appDb.userProfile.get(userId);
}

export async function upsertUserProfile(profile: UserProfile): Promise<void> {
  await appDb.userProfile.put(profile);
}

export async function getSessionState(userId: string, date: string): Promise<SessionState | undefined> {
  return appDb.sessionState.where('[userId+date]').equals([userId, date]).first();
}

export async function upsertSessionState(state: SessionState): Promise<void> {
  const existing = await getSessionState(state.userId, state.date);
  if (existing?.id) {
    await appDb.sessionState.put({ ...state, id: existing.id });
  } else {
    await appDb.sessionState.add(state);
  }
}

export async function getGameProgress(userId: string, gameId: string): Promise<GameProgress | undefined> {
  return appDb.gameProgress.where('[userId+gameId]').equals([userId, gameId]).first();
}

export async function upsertGameProgress(progress: GameProgress): Promise<void> {
  const existing = await getGameProgress(progress.userId, progress.gameId);
  if (existing?.id) {
    await appDb.gameProgress.update(existing.id, progress);
  } else {
    await appDb.gameProgress.add(progress);
  }
}

export async function getDifficultyState(userId: string, gameId: string, date: string): Promise<DifficultyState | undefined> {
  return appDb.difficultyState.where('[userId+gameId+date]').equals([userId, gameId, date]).first();
}

export async function getYesterdayDifficultyState(userId: string, gameId: string): Promise<DifficultyState | undefined> {
  const yesterday = new Date();
  yesterday.setDate(yesterday.getDate() - 1);
  const dateStr = yesterday.toISOString().split('T')[0];
  return getDifficultyState(userId, gameId, dateStr);
}

export async function upsertDifficultyState(state: DifficultyState): Promise<void> {
  const existing = await getDifficultyState(state.userId, state.gameId, state.date);
  if (existing?.id) {
    await appDb.difficultyState.update(existing.id, state);
  } else {
    await appDb.difficultyState.add(state);
  }
}

export async function getLastCompletedSession(userId: string): Promise<SessionState | undefined> {
  const today = new Date().toISOString().split('T')[0];
  const sessions = await appDb.sessionState
    .where('userId')
    .equals(userId)
    .toArray();
  // Filter to completed sessions (all 3 categories done) before today, sort by date descending
  const completed = sessions
    .filter((s) => s.categoriesCompleted.length >= 3 && s.date < today)
    .sort((a, b) => b.date.localeCompare(a.date));
  return completed[0];
}

export async function getProfilesByCareHome(careHomeId: string): Promise<UserProfile[]> {
  return appDb.userProfile.where('careHomeId').equals(careHomeId).toArray();
}

export async function getPpEngine(userId: string): Promise<PpEngineRow | undefined> {
  return appDb.ppEngine.get(userId);
}

export async function putPpEngine(row: PpEngineRow): Promise<void> {
  await appDb.ppEngine.put(row);
}

function ppPairKey(userId: string, sceneId: string, changeClass: number): string {
  return `${userId}|${sceneId}:${changeClass}`;
}

export async function getPpPair(userId: string, sceneId: string, changeClass: number): Promise<PpPairHistoryRow | undefined> {
  return appDb.ppPairHistory.get(ppPairKey(userId, sceneId, changeClass));
}

export async function putPpPair(userId: string, sceneId: string, changeClass: number, lastUsedDate: string): Promise<void> {
  await appDb.ppPairHistory.put({ key: ppPairKey(userId, sceneId, changeClass), userId, lastUsedDate });
}

export async function getPpPairsForUser(userId: string): Promise<PpPairHistoryRow[]> {
  return appDb.ppPairHistory.where('userId').equals(userId).toArray();
}

// ─── Round log (plan 4) ───────────────────────────────────────────────────────

export async function addRound(r: RoundRecord): Promise<void> {
  await appDb.roundLog.add(r);
}

export async function getRounds(
  userId: string, date: string, category: RoundRecord['category'],
): Promise<RoundRecord[]> {
  return appDb.roundLog.where('[userId+date+category]').equals([userId, date, category]).sortBy('at');
}

/** Every round of the latest day before `beforeDate` that had rounds in this category. */
export async function getPreviousSessionRounds(
  userId: string, category: RoundRecord['category'], beforeDate: string,
): Promise<RoundRecord[]> {
  const earlier = await appDb.roundLog
    .where('[userId+category+date]')
    .between([userId, category, ''], [userId, category, beforeDate], true, false)
    .toArray();
  if (earlier.length === 0) return [];
  const last = earlier.reduce((d, r) => (r.date > d ? r.date : d), '');
  return earlier.filter((r) => r.date === last).sort((a, b) => a.at - b.at);
}
