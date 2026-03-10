import React, { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';
import type { GameCategory } from '../styles/tokens';

const ALL_CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

const GAME_BY_CATEGORY: Record<GameCategory, string[]> = {
  memory:    ['remember-match'],
  attention: ['spot-focus'],
  executive: ['morning-routine-quest'],
};

function pickGame(category: GameCategory, excludeGameId?: string): string {
  const games = GAME_BY_CATEGORY[category].filter((g) => g !== excludeGameId);
  return games[Math.floor(Math.random() * games.length)] ?? GAME_BY_CATEGORY[category][0];
}

// ─── Context ──────────────────────────────────────────────────────────────────

interface SessionContextValue {
  userId: string;
  currentCategory: string | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  categoriesCompletedToday: string[];
  triggerRotation: () => void;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be inside SessionManager');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

export default function SessionManager() {
  const navigate = useNavigate();
  const profile              = useAppStore((s) => s.activeProfile);
  const session              = useAppStore((s) => s.currentSession);
  const tickCategory         = useAppStore((s) => s.tickCategory);
  const markCategoryComplete = useAppStore((s) => s.markCategoryComplete);
  const setCurrentGame       = useAppStore((s) => s.setCurrentGame);
  const setCurrentCategory   = useAppStore((s) => s.setCurrentCategory);

  // Silent 1-second tick — never rendered
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    intervalRef.current = setInterval(() => {
      tickCategory();
    }, 1000);
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [tickCategory]);

  const triggerRotation = useCallback(() => {
    if (!profile) return;
    const current = session.currentCategory as GameCategory | null;

    // Mark current category as complete
    if (current) {
      markCategoryComplete(current);
    }

    const nowCompleted = current
      ? [...session.categoriesCompleted, current]
      : session.categoriesCompleted;

    // All 3 done? → summary
    const allDone = ALL_CATEGORIES.every((c) => nowCompleted.includes(c));
    if (allDone) {
      navigate('/app/summary');
      return;
    }

    // Pick next category
    const next = ALL_CATEGORIES.find((c) => !nowCompleted.includes(c)) ?? null;
    if (!next) {
      navigate('/app/summary');
      return;
    }

    // Navigate to rotation screen (next category stored in session before navigating)
    setCurrentCategory(next);
    const nextGame = pickGame(next, session.currentGameId ?? undefined);
    setCurrentGame(nextGame);

    navigate('/app/rotation');
  }, [
    profile, session, markCategoryComplete, setCurrentCategory,
    setCurrentGame, navigate,
  ]);

  const value: SessionContextValue = {
    userId: profile?.userId ?? '',
    currentCategory: session.currentCategory,
    currentGameId: session.currentGameId,
    secondsInCurrentCategory: session.secondsInCurrentCategory,
    categoriesCompletedToday: session.categoriesCompleted,
    triggerRotation,
  };

  return (
    <SessionContext.Provider value={value}>
      <Outlet />
    </SessionContext.Provider>
  );
}
