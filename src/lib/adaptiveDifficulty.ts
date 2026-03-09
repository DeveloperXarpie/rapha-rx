import { db as firestoreDb } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { getGameProgress, upsertGameProgress } from './db';
import type { DifficultyLevel } from '../styles/tokens';

const LEVELS: DifficultyLevel[] = ['level_1', 'level_2', 'level_3', 'level_4', 'level_5'];

export async function getCurrentLevel(
  userId: string,
  gameId: string,
): Promise<DifficultyLevel> {
  const progress = await getGameProgress(userId, gameId);
  if (!progress) return 'level_1';
  return progress.currentLevelId;
}

export async function recordCompletion(
  userId: string,
  gameId: string,
  completed: boolean,
): Promise<void> {
  const existing = await getGameProgress(userId, gameId);
  const current = existing ?? {
    userId,
    gameId,
    currentLevelId: 'level_1' as DifficultyLevel,
    consecutiveCompletions: 0,
    consecutiveIncompletes: 0,
    hasBeenPromptedForLevel: false,
  };

  const currentIdx = LEVELS.indexOf(current.currentLevelId);

  if (completed) {
    current.consecutiveCompletions += 1;
    current.consecutiveIncompletes = 0;

    // Promote after 3 consecutive completions (only if not already at top level)
    if (
      current.consecutiveCompletions >= 3 &&
      currentIdx < LEVELS.length - 1 &&
      current.hasBeenPromptedForLevel
    ) {
      current.currentLevelId = LEVELS[currentIdx + 1];
      current.consecutiveCompletions = 0;
      current.hasBeenPromptedForLevel = false;
    }
  } else {
    current.consecutiveIncompletes += 1;
    current.consecutiveCompletions = 0;

    // Step back silently after 3 consecutive non-completions
    if (current.consecutiveIncompletes >= 3 && currentIdx > 0) {
      current.currentLevelId = LEVELS[currentIdx - 1];
      current.consecutiveIncompletes = 0;
      current.hasBeenPromptedForLevel = false;
    }
  }

  await upsertGameProgress(current);

  // Sync to Firestore
  try {
    const docRef = doc(firestoreDb, 'gameProgress', `${userId}_${gameId}`);
    await setDoc(docRef, current, { merge: true });
  } catch {
    // Offline — Firestore will sync when reconnected
  }
}

export async function shouldPrompt(userId: string, gameId: string): Promise<boolean> {
  const progress = await getGameProgress(userId, gameId);
  if (!progress) return false;
  const currentIdx = LEVELS.indexOf(progress.currentLevelId);
  return (
    progress.consecutiveCompletions >= 3 &&
    currentIdx < LEVELS.length - 1 &&
    !progress.hasBeenPromptedForLevel
  );
}

export async function markPrompted(userId: string, gameId: string): Promise<void> {
  const progress = await getGameProgress(userId, gameId);
  if (!progress) return;
  progress.hasBeenPromptedForLevel = true;
  await upsertGameProgress(progress);
}
