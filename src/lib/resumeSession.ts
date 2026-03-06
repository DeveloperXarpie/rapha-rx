import { getSessionState } from './db';
import type { SessionState } from './db';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

export async function checkForResumableSession(userId: string): Promise<SessionState | null> {
  const today = todayISO();
  const state = await getSessionState(userId, today);
  if (!state) return null;

  const allCategories = ['memory', 'attention', 'executive'];
  const allDone = allCategories.every((c) => state.categoriesCompleted.includes(c));

  if (allDone) return null; // session fully complete
  if (!state.questionnaireCompleted) return null; // hasn't really started

  return state;
}
