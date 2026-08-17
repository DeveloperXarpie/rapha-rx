import { useSyncExternalStore } from 'react';

/**
 * True when the OS asks for reduced motion.
 *
 * Subscribing rather than reading into state in an effect keeps the first render correct
 * and avoids the cascading re-render that `setState` inside an effect causes.
 *
 * TrainYard carries its own private copy of this subscription; folding it onto this hook is
 * a separate tidy-up.
 */
const QUERY = '(prefers-reduced-motion: reduce)';

function subscribe(onChange: () => void) {
  const mq = window.matchMedia(QUERY);
  mq.addEventListener('change', onChange);
  return () => mq.removeEventListener('change', onChange);
}

function getSnapshot() {
  return window.matchMedia(QUERY).matches;
}

/** Server/prerender has no media queries; assume motion is fine and let the client correct it. */
function getServerSnapshot() {
  return false;
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getSnapshot, getServerSnapshot);
}
