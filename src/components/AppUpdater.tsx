import { useEffect, useSyncExternalStore } from 'react';
import { useLocation } from 'react-router-dom';
import { applyUpdate, isUpdateReady, subscribeUpdateReady } from '../lib/appUpdate';
import { isSafeToUpdate } from '../lib/updatePolicy';

/*
 * Lets a downloaded update take over the moment the app is on a screen that a
 * reload cannot hurt. Mid-round it waits, and the resident finishes undisturbed;
 * the update lands when they next reach Home or the summary.
 */
export default function AppUpdater() {
  const { pathname } = useLocation();
  const ready = useSyncExternalStore(subscribeUpdateReady, isUpdateReady);

  useEffect(() => {
    if (ready && isSafeToUpdate(pathname)) applyUpdate();
  }, [ready, pathname]);

  return null;
}
