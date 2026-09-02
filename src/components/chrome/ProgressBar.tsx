import { useEffect, useState } from 'react';
import { useReducedMotion } from '../../lib/useReducedMotion';

interface Props {
  durationMs: number;
  color: string;
  trackColor: string;
  /** Flip to true to start the fill. Ignored under reduced motion. */
  running: boolean;
}

/**
 * The intro screen's loading bar.
 *
 * The fill is a CSS width transition, not a JS ticker, deliberately: the bar is
 * decorative and the navigation is driven by its own timer, so a backgrounded
 * tab throttling rAF cannot desynchronise the two.
 *
 * Under reduced motion the bar renders full and static. The caller's timer is
 * unchanged, so the screen still holds for the same duration.
 */
export default function ProgressBar({ durationMs, color, trackColor, running }: Props) {
  const reduced = useReducedMotion();
  const [filled, setFilled] = useState(false);

  useEffect(() => {
    if (!running || reduced) return;
    // One frame at 0% so the transition has something to animate from.
    const id = requestAnimationFrame(() => setFilled(true));
    return () => cancelAnimationFrame(id);
  }, [running, reduced]);

  const width = reduced || filled ? '100%' : '0%';

  return (
    <div
      role="progressbar"
      aria-hidden="true"
      style={{ height: 10, borderRadius: 9999, background: trackColor, overflow: 'hidden' }}
    >
      <div
        style={{
          height: '100%', width, background: color, borderRadius: 9999,
          transition: reduced ? 'none' : `width ${durationMs}ms linear`,
        }}
      />
    </div>
  );
}
