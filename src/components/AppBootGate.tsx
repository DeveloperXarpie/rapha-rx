import { useEffect, useState, type ReactNode } from 'react';
import i18n from '../lib/i18n';
import { appDb } from '../lib/db';
import LaunchScreen from '../screens/LaunchScreen';
import { useReducedMotion } from '../lib/useReducedMotion';
import { TRANSITIONS } from './chrome/transitions';

/**
 * Holds the launch screen until the app is genuinely usable, then hands over.
 *
 * Boot is "i18n ready and Dexie open". The 2000 ms floor exists so a fast boot
 * does not flash the logo, and matches the two seconds every other transition
 * screen holds for; the gate resolves on whichever of the two finishes last.
 *
 * Local state rather than a store field: nothing else in the app needs to know
 * that the app has booted.
 */
const MIN_DWELL_MS = 2000;

export default function AppBootGate({ children }: { children: ReactNode }) {
  const [ready, setReady] = useState(false);
  const reduced = useReducedMotion();

  useEffect(() => {
    let cancelled = false;

    const floor = new Promise<void>((resolve) => { setTimeout(resolve, MIN_DWELL_MS); });

    const i18nReady = i18n.isInitialized
      ? Promise.resolve()
      : new Promise<void>((resolve) => { i18n.on('initialized', () => resolve()); });

    /*
     * A failed open is swallowed on purpose. Dexie retries lazily on first use,
     * and blocking the whole app on a private-browsing IndexedDB refusal would
     * be a worse outcome than carrying on without persistence.
     */
    const dbReady = appDb.open().then(() => undefined).catch(() => undefined);

    Promise.all([floor, i18nReady, dbReady]).then(() => {
      if (!cancelled) setReady(true);
    });

    return () => { cancelled = true; };
  }, []);

  if (!ready) {
    return (
      <div style={{ height: '100%', display: 'flex', flexDirection: 'column' }}>
        <LaunchScreen />
      </div>
    );
  }

  /*
   * Its own fade rather than ScreenTransition: this wrapper sits outside the
   * router, directly under #root, which is not a flex container - a `flex: 1`
   * child there has no height to claim and the whole app collapses. Height is
   * stated explicitly instead.
   */
  return (
    <div
      style={{
        height: '100%',
        animation: reduced
          ? undefined
          : `boot-fade-in ${TRANSITIONS.launchToSplash.durationMs}ms ${TRANSITIONS.launchToSplash.easing}`,
      }}
    >
      {children}
    </div>
  );
}
