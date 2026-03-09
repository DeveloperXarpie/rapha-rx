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
  questionnaireCompleted: boolean;
  focusCategory: 'memory' | 'attention' | 'executive' | null;
  categoriesCompleted: string[];
  currentCategory: string | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  sessionStartedAt: number | null;
}

export interface GameProgress {
  id?: number;
  userId: string;
  gameId: string;
  currentLevelId: DifficultyLevel;
  consecutiveCompletions: number;
  consecutiveIncompletes: number;
  hasBeenPromptedForLevel: boolean;
}

export interface PendingEvent {
  id?: number;
  eventName: string;
  eventProps: Record<string, unknown>;
  queuedAt: number;
}

class BrainTrainingDB extends Dexie {
  userProfile!: Table<UserProfile, string>;
  sessionState!: Table<SessionState, number>;
  gameProgress!: Table<GameProgress, number>;
  pendingEvents!: Table<PendingEvent, number>;

  constructor() {
    super('BrainTrainingDB');
    this.version(1).stores({
      userProfile:  'userId, careHomeId, createdAt',
      sessionState: '++id, userId, date, [userId+date]',
      gameProgress: '++id, userId, gameId, [userId+gameId]',
      pendingEvents:'++id, queuedAt',
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

export async function getProfilesByCareHome(careHomeId: string): Promise<UserProfile[]> {
  return appDb.userProfile.where('careHomeId').equals(careHomeId).toArray();
}
