import { create } from 'zustand';
import { persist } from 'zustand/middleware';
import type { UserProfile, SessionState } from '../lib/db';
import { upsertSessionState, upsertUserProfile, getSessionState } from '../lib/db';
import type { GameCategory, Language, TextSize } from '../styles/tokens';
import { todayISO } from '../lib/dates';
import { track } from '../lib/analytics';
import {
  CATEGORY_ORDER, activeCategory, completeCategory, creditsTime, freshSession,
  normalizeSession, type LedgerSession,
} from '../lib/sessionLedger';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface UserSettings {
  language: Language;
  textSize: TextSize;
  soundEnabled: boolean;
}

/** The day's ledger. The rules that read and change it live in sessionLedger.ts. */
export type CurrentSession = LedgerSession;

interface AppState {
  // User slice
  activeProfile: UserProfile | null;
  setActiveProfile: (profile: UserProfile) => void;
  clearProfile: () => void;

  // Session slice
  currentSession: CurrentSession;
  /** Rolls the ledger over to a fresh day when its date is stale (D2). */
  ensureToday: () => void;
  /** One second of board time. Credits nothing outside the open category (D3). */
  creditSecond: (gameId: string, gameCategory: GameCategory) => void;
  /** Completes the open category if `gameCategory` is it; otherwise does nothing. */
  completeActiveCategory: (gameCategory: GameCategory) => void;
  markUnlockSeen: (category: GameCategory) => void;
  markEducationSeen: () => void;
  setCurrentGame: (gameId: string) => void;

  // Session shortcuts. Shown outright in dev; in a production build HomeScreen
  // keeps them hidden until the version label is tapped five times, so they ship
  // in the bundle but stay out of a resident's way.
  devCompleteCategory: () => Promise<void>;
  devCompleteToday: () => Promise<void>;
  devResetToday: () => Promise<void>;

  // Settings slice
  settings: UserSettings;
  updateSetting: <K extends keyof UserSettings>(key: K, value: UserSettings[K]) => void;
}

const defaultSettings: UserSettings = {
  language: 'en',
  textSize: 'normal',
  soundEnabled: true,
};

/** Board seconds between Dexie writes; localStorage (Zustand persist) gets every tick. */
const PERSIST_EVERY_SECONDS = 10;

// Helper — persist session to Dexie (called from actions, not part of interface)
// Returns the write promise so callers that need the write to land before reading
// back (the dev helpers) can await it. Normal actions ignore it.
function persistSession(userId: string | undefined, state: CurrentSession): Promise<void> {
  if (!userId) return Promise.resolve();
  const dbState: SessionState = {
    userId,
    // This literal hand-copies every field. Anything missing from it is
    // silently dropped on every write, and a refresh would then lose it.
    date: state.date,
    categoriesCompleted: state.categoriesCompleted,
    currentCategory: state.currentCategory,
    currentGameId: state.currentGameId,
    secondsInCurrentCategory: state.secondsInCurrentCategory,
    sessionStartedAt: state.sessionStartedAt,
    gamesPlayed: state.gamesPlayed,
    unlocksSeen: state.unlocksSeen,
    educationSeen: state.educationSeen,
  };
  return upsertSessionState(dbState).catch(() => {});
}

// ─── Store ────────────────────────────────────────────────────────────────────

export const useAppStore = create<AppState>()(
  persist(
    (set, get) => {
      /** Sets the session and writes it to Dexie. */
      const commit = (updated: CurrentSession) => {
        set({ currentSession: updated });
        return persistSession(get().activeProfile?.userId, updated);
      };

      /** The session with the open category completed, or null when nothing changes. */
      const withCompleted = (prev: CurrentSession, category: GameCategory): CurrentSession | null => {
        const completed = completeCategory(prev.categoriesCompleted, category);
        if (completed === prev.categoriesCompleted) return null;
        return {
          ...prev,
          categoriesCompleted: completed,
          currentCategory: activeCategory(completed),
          secondsInCurrentCategory: 0,
        };
      };

      return {
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
        const existing = await getSessionState(profile.userId, today);
        set({ currentSession: normalizeSession(existing, today) });
      },

      clearProfile: () => {
        set({ activeProfile: null, currentSession: freshSession(todayISO()) });
      },

      // Session slice
      currentSession: freshSession(todayISO()),

      ensureToday: () => {
        const prev = get().currentSession;
        if (prev.date !== todayISO()) void commit(freshSession(todayISO()));
      },

      creditSecond: (gameId, gameCategory) => {
        // A tablet left on a board past midnight must credit the new day, not
        // yesterday's ledger. A string compare per second is cheap.
        get().ensureToday();
        const prev = get().currentSession;
        if (!creditsTime(gameCategory, prev.categoriesCompleted)) return;
        const firstPlay = !prev.gamesPlayed.includes(gameId);
        const updated: CurrentSession = {
          ...prev,
          secondsInCurrentCategory: prev.secondsInCurrentCategory + 1,
          gamesPlayed: firstPlay ? [...prev.gamesPlayed, gameId] : prev.gamesPlayed,
          sessionStartedAt: prev.sessionStartedAt ?? Date.now(),
        };
        if (firstPlay || updated.secondsInCurrentCategory % PERSIST_EVERY_SECONDS === 0) {
          void commit(updated);
        } else {
          set({ currentSession: updated });
        }
      },

      completeActiveCategory: (gameCategory) => {
        const prev = get().currentSession;
        const next = withCompleted(prev, gameCategory);
        if (!next) return;
        // Was `category_rotated`, fired from GameIntro on every intro; with free
        // choice of game that logged a fake rotation per tile tap.
        track('category_completed', {
          category: gameCategory,
          secondsInCategory: prev.secondsInCurrentCategory,
          gamesPlayed: prev.gamesPlayed,
        });
        void commit(next);
      },

      markUnlockSeen: (category) => {
        const prev = get().currentSession;
        if (prev.unlocksSeen.includes(category)) return;
        void commit({ ...prev, unlocksSeen: [...prev.unlocksSeen, category] });
      },

      markEducationSeen: () => {
        const prev = get().currentSession;
        if (prev.educationSeen) return;
        void commit({ ...prev, educationSeen: true });
      },

      setCurrentGame: (gameId) => {
        void commit({ ...get().currentSession, currentGameId: gameId });
      },

      // ─── Session shortcuts ─────────────────────────────────────────────────
      // Each awaits the Dexie write, because the store rehydrates from Dexie on
      // profile load and a state-only change would not survive a refresh.

      /** Completes the open category without playing ten minutes. */
      devCompleteCategory: async () => {
        const prev = get().currentSession;
        const active = activeCategory(prev.categoriesCompleted);
        const next = active ? withCompleted(prev, active) : null;
        if (next) await commit(next);
      },

      // Marks today as fully done so Home shows Free Play without playing.
      devCompleteToday: async () => {
        await commit({
          ...freshSession(todayISO()),
          categoriesCompleted: [...CATEGORY_ORDER],
          currentCategory: null,
          unlocksSeen: [...CATEGORY_ORDER],
          educationSeen: true,
          sessionStartedAt: Date.now(),
        });
      },

      // The inverse, so a fresh day stays testable after devCompleteToday.
      devResetToday: async () => {
        await commit(freshSession(todayISO()));
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
      };
    },
    {
      name: 'brain-training-store',
      partialize: (state) => ({
        activeProfile: state.activeProfile,
        settings: state.settings,
        currentSession: state.currentSession,
      }),
      /*
       * A reload restores the profile from here, so setActiveProfile never runs and
       * this is the only normalisation a saved session gets before Home renders.
       * Without it a v1.35 session (no unlocksSeen) crashes Home's first render,
       * and yesterday's session flashes up before any effect could reset it.
       */
      merge: (persisted, current) => {
        const p = (persisted ?? {}) as Partial<AppState>;
        return {
          ...current,
          ...p,
          currentSession: normalizeSession(p.currentSession, todayISO()),
        };
      },
    },
  ),
);
