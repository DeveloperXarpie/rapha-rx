import { useEffect, useState, type ReactNode } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { TRANSITIONS, type TransitionName } from './transitions';

/**
 * Animates its children in on mount, using the named entry from the motion
 * table in ./transitions.
 *
 * Every transition collapses to an instant cut under reduced motion. Nothing
 * here gates navigation, so a collapsed transition never changes how long a
 * screen is on screen.
 */
export default function ScreenTransition({
  name, children,
}: { name: TransitionName; children: ReactNode }) {
  const reduced = useReducedMotion();
  const spec = TRANSITIONS[name];
  const [entered, setEntered] = useState(false);

  useEffect(() => {
    if (reduced) return;
    const id = requestAnimationFrame(() => setEntered(true));
    return () => cancelAnimationFrame(id);
  }, [reduced]);

  if (reduced) return <>{children}</>;

  return (
    <div
      style={{
        flex: '1 1 auto',
        minHeight: 0,
        display: 'flex',
        flexDirection: 'column',
        opacity: entered ? 1 : 0,
        transform: entered ? 'none' : spec.from,
        transition: `opacity ${spec.durationMs}ms ${spec.easing}, transform ${spec.durationMs}ms ${spec.easing}`,
      }}
    >
      {children}
    </div>
  );
}
