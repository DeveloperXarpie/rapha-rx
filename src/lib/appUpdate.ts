import { registerSW } from 'virtual:pwa-register';
import { UPDATE_CHECK_INTERVAL_MS } from './updatePolicy';

/*
 * The service worker side of shipping a new build to a tablet that never closes
 * the app. The browser only looks for a new worker on a full page load, and a
 * single-page app never does one, so this asks on a timer and whenever the app
 * comes back to the foreground. A new build then downloads and waits; it takes
 * over only when AppUpdater calls applyUpdate() from a safe screen.
 *
 * In `npm run dev` the plugin stubs registerSW out, so none of this runs there.
 */

let updateReady = false;
let takeOver: (() => Promise<void>) | undefined;
const listeners = new Set<() => void>();

export function registerAppUpdates(): void {
  const updateSW = registerSW({
    immediate: true,
    onNeedRefresh() {
      updateReady = true;
      listeners.forEach((notify) => notify());
    },
    onRegisteredSW(_swUrl, registration) {
      if (!registration) return;
      const check = () => {
        if (!navigator.onLine || registration.installing) return;
        // A failed check (wifi drop, server hiccup) is retried by the next one.
        registration.update().catch(() => {});
      };
      setInterval(check, UPDATE_CHECK_INTERVAL_MS);
      document.addEventListener('visibilitychange', () => {
        if (document.visibilityState === 'visible') check();
      });
    },
  });
  // Tells the waiting worker to take over; the plugin reloads the page once it has.
  takeOver = () => updateSW(true);
}

export function subscribeUpdateReady(notify: () => void): () => void {
  listeners.add(notify);
  return () => listeners.delete(notify);
}

export function isUpdateReady(): boolean {
  return updateReady;
}

export function applyUpdate(): void {
  void takeOver?.();
}
