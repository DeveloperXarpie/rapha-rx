import { db as firestoreDb } from './firebase';
import { doc, setDoc } from 'firebase/firestore';
import { appDb, getGameProgress, upsertGameProgress } from './db';
import type { DifficultyLevel } from '../styles/tokens';

export async function getCurrentLevel(
  userId: string,
  gameId: string,
): Promise<DifficultyLevel> {
  // Check for manual override in settings
  const profile = await appDb.userProfile.get(userId);
  const override = profile?.difficultyOverride;
  if (override && override !== 'auto') {
    return override as DifficultyLevel;
  }

  const progress = await getGameProgress(userId, gameId);
  if (!progress) return 'easy';
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
    currentLevelId: 'easy' as DifficultyLevel,
    consecutiveCompletions: 0,
    consecutiveIncompletes: 0,
    hasBeenPromptedForLevel: false,
  };

  if (completed) {
    current.consecutiveCompletions += 1;
    current.consecutiveIncompletes = 0;

    // Promote after 3 consecutive completions (only if not already hard)
    if (
      current.consecutiveCompletions >= 3 &&
      current.currentLevelId !== 'hard' &&
      current.hasBeenPromptedForLevel
    ) {
      const next: DifficultyLevel =
        current.currentLevelId === 'easy' ? 'medium' : 'hard';
      current.currentLevelId = next;
      current.consecutiveCompletions = 0;
      current.hasBeenPromptedForLevel = false;
    }
  } else {
    current.consecutiveIncompletes += 1;
    current.consecutiveCompletions = 0;

    // Step back silently after 3 consecutive non-completions
    if (
      current.consecutiveIncompletes >= 3 &&
      current.currentLevelId !== 'easy'
    ) {
      const prev: DifficultyLevel =
        current.currentLevelId === 'hard' ? 'medium' : 'easy';
      current.currentLevelId = prev;
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
  return (
    progress.consecutiveCompletions >= 3 &&
    progress.currentLevelId !== 'hard' &&
    !progress.hasBeenPromptedForLevel
  );
}

export async function markPrompted(userId: string, gameId: string): Promise<void> {
  const progress = await getGameProgress(userId, gameId);
  if (!progress) return;
  progress.hasBeenPromptedForLevel = true;
  await upsertGameProgress(progress);
}
