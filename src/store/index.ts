import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, SessionState } from '../lib/db';
import { upsertSessionState, upsertUserProfile, getSessionState } from '../lib/db';
import type { Language, TextSize } from '../styles/tokens';

function todayISO(): string {
  return new Date().toISOString().split('T')[0];
}

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSettings {
  language: Language;
  textSize: TextSize;
  soundEnabled: boolean;
}

export interface CurrentSession {
  date: string;
  questionnaireCompleted: boolean;
  focusCategory: 'memory' | 'attention' | 'executive' | null;
  categoriesCompleted: string[];
  currentCategory: string | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  sessionStartedAt: number | null;
}

interface AppState {
  // User slice
  activeProfile: UserProfile | null;
  setActiveProfile: (profile: UserProfile) => void;
  clearProfile: () => void;

  // Session slice
  currentSession: CurrentSession;
  startSession: () => void;
  setFocusCategory: (cat: 'memory' | 'attention' | 'executive') => void;
  markCategoryComplete: (cat: string) => void;
  setCurrentGame: (gameId: string) => void;
  setCurrentCategory: (category: string) => void;
  markQuestionnaireComplete: () => void;
  restoreSession: (state: CurrentSession) => void;
  tickCategory: () => void;

  // Settings slice
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

const defaultSession: CurrentSession = {
  date: todayISO(),
  questionnaireCompleted: false,
  focusCategory: null,
  categoriesCompleted: [],
  currentCategory: null,
  currentGameId: null,
  secondsInCurrentCategory: 0,
  sessionStartedAt: null,
};

const defaultSettings: UserSettings = {
  language: 'en',
  textSize: 'normal',
  soundEnabled: true,
};

// Helper — persist session to Dexie (called from actions, not part of interface)
function persistSession(userId: string | undefined, state: CurrentSession) {
  if (!userId) return;
  const dbState: SessionState = {
    userId,
    date: state.date,
    questionnaireCompleted: state.questionnaireCompleted,
    focusCategory: state.focusCategory,
    categoriesCompleted: state.categoriesCompleted,
    currentCategory: state.currentCategory,
    currentGameId: state.currentGameId,
    secondsInCurrentCategory: state.secondsInCurrentCategory,
    sessionStartedAt: state.sessionStartedAt,
  };
  upsertSessionState(dbState).catch(() => {});
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      // User slice
      activeProfile: null,

      setActiveProfile: async (profile) => {
        set({ activeProfile: profile });
        set({
          settings: {
            language: profile.language ?? 'en',
            textSize: profile.textSize ?? 'normal',
            soundEnabled: profile.soundEnabled ?? true,
          },
        });

        const today = todayISO();
        const existingSession = await getSessionState(profile.userId, today);
        if (existingSession) {
          const { id, userId, ...sessionData } = existingSession as any;
          set({ currentSession: sessionData });
        } else {
          set({ currentSession: { ...defaultSession, date: today } });
        }
      },

      clearProfile: () => {
        set({ activeProfile: null, currentSession: { ...defaultSession, date: todayISO() } });
      },

      // Session slice
      currentSession: { ...defaultSession },

      startSession: () => {
        const today = todayISO();
        const updated: CurrentSession = {
          ...defaultSession,
          date: today,
          sessionStartedAt: Date.now(),
        };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      setFocusCategory: (cat) => {
        const updated = { ...get().currentSession, focusCategory: cat, currentCategory: cat };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      markCategoryComplete: (cat) => {
        const prev = get().currentSession;
        const updated = {
          ...prev,
          categoriesCompleted: prev.categoriesCompleted.includes(cat)
            ? prev.categoriesCompleted
            : [...prev.categoriesCompleted, cat],
          secondsInCurrentCategory: 0,
        };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      setCurrentGame: (gameId) => {
        const updated = { ...get().currentSession, currentGameId: gameId };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      setCurrentCategory: (category) => {
        const updated = {
          ...get().currentSession,
          currentCategory: category,
          secondsInCurrentCategory: 0,
        };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      markQuestionnaireComplete: () => {
        const updated = { ...get().currentSession, questionnaireCompleted: true };
        set({ currentSession: updated });
        persistSession(get().activeProfile?.userId, updated);
      },

      restoreSession: (state) => {
        set({ currentSession: state });
      },

      tickCategory: () => {
        const prev = get().currentSession;
        set({
          currentSession: {
            ...prev,
            secondsInCurrentCategory: prev.secondsInCurrentCategory + 1,
          },
        });
      },

      // Settings slice
      settings: { ...defaultSettings },

      updateSetting: (key, value) => {
        const updated = { ...get().settings, [key]: value };
        set({ settings: updated });

        const profile = get().activeProfile;
        if (profile) {
          const updatedProfile: UserProfile = {
            ...profile,
            language: updated.language,
            textSize: updated.textSize,
            soundEnabled: updated.soundEnabled,
          };
          set({ activeProfile: updatedProfile });
          upsertUserProfile(updatedProfile).catch(() => {});
        }
      },
    }),
    {
      name: 'brain-training-store',
      partialize: (state) => ({
        activeProfile: state.activeProfile,
        settings: state.settings,
        currentSession: state.currentSession,
      }),
    },
  ),
);
