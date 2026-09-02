import { createContext, useContext, useEffect, useRef, useCallback } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { useAppStore } from '../store';
import { nextStep } from '../lib/sessionPlan';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SessionContextValue {
  userId: string;
  currentCategory: string | null;
  currentGameId: string | null;
  secondsInCurrentCategory: number;
  categoriesCompletedToday: string[];
  /** The three gameIds this session plays, in CATEGORY_ORDER. */
  plannedGames: string[];
  /** True once all three categories are done - i.e. any round now is free play. */
  sessionComplete: boolean;
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

    const step = nextStep({
      currentCategory: session.currentCategory,
      categoriesCompleted: session.categoriesCompleted,
      plannedGames: session.plannedGames,
    });

    /*
     * Free play after a completed session. There is nothing to rotate into, and
     * navigating would drop the resident into the summary they have already
     * seen - the per-category ticker keeps running once a session ends, so a
     * free-play round crossing two minutes lands here.
     */
    if (step.kind === 'stay') return;

    if (session.currentCategory) markCategoryComplete(session.currentCategory);

    if (step.kind === 'summary') {
      navigate('/app/summary');
      return;
    }

    setCurrentCategory(step.category);
    setCurrentGame(step.gameId);
    navigate(`/app/intro/${step.category}`);
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
    plannedGames: session.plannedGames,
    sessionComplete: ['memory', 'attention', 'executive']
      .every((c) => session.categoriesCompleted.includes(c)),
    triggerRotation,
  };

  return (
    <SessionContext.Provider value={value}>
      <Outlet />
    </SessionContext.Provider>
  );
}
