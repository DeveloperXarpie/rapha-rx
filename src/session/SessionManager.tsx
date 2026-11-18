import { createContext, useContext, useEffect, useMemo } from 'react';
import { Outlet } from 'react-router-dom';
import { useAppStore } from '../store';
import { isDayComplete } from '../lib/sessionLedger';

// ─── Context ──────────────────────────────────────────────────────────────────

interface SessionContextValue {
  userId: string;
  /** True once all three categories are done - any round now is free play. */
  sessionComplete: boolean;
}

const SessionContext = createContext<SessionContextValue | null>(null);

export function useSessionContext() {
  const ctx = useContext(SessionContext);
  if (!ctx) throw new Error('useSessionContext must be inside SessionManager');
  return ctx;
}

// ─── Provider ─────────────────────────────────────────────────────────────────

/*
 * The layout route for every /app/* screen. It used to own the per-second ticker
 * and the category rotation; v2 moved the ticker into GameShell (only board time
 * counts) and the unlock rules into sessionLedger.ts. What is left is rolling the
 * ledger over to a new day and telling screens whether the day is done.
 *
 * The context value is memoised and built from two primitives, so the per-second
 * ledger tick does not re-render every consumer - GameShell's ticker effect would
 * otherwise be at the mercy of a new context object each second.
 */
export default function SessionManager() {
  const userId = useAppStore((s) => s.activeProfile?.userId ?? '');
  const sessionComplete = useAppStore((s) => isDayComplete(s.currentSession.categoriesCompleted));
  const ensureToday = useAppStore((s) => s.ensureToday);

  // A layout route mounts once per page load, and a kiosk tablet whose screen
  // never sleeps fires no visibilitychange, so a minute timer catches the new day
  // and lets Home redraw on its own. HomeScreen and creditSecond check too.
  useEffect(() => {
    ensureToday();
    const onVisible = () => {
      if (document.visibilityState === 'visible') ensureToday();
    };
    document.addEventListener('visibilitychange', onVisible);
    const id = setInterval(ensureToday, 60_000);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      clearInterval(id);
    };
  }, [ensureToday]);

  const value = useMemo(() => ({ userId, sessionComplete }), [userId, sessionComplete]);

  return (
    <SessionContext.Provider value={value}>
      <Outlet />
    </SessionContext.Provider>
  );
}
