import { BLIND } from './geometry';
import { COLOURS } from './palette';
import { BLIND_MS, EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the cover. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover, and the only thing on screen during the walk to the shop.
 *
 * It spans the whole board (see BLIND in geometry.ts), so the backdrop, the shelf and
 * the clipboard are all free to change underneath it without the resident watching them
 * do it. That is why it carries the caption and the hold dots: while it is down there is
 * no other UI to read.
 *
 * It moves fast on purpose. The cover is an opaque screen rather than something to
 * watch, so the only time the resident spends here is the retention hold itself.
 */
export default function Blind({ down, progress, label, reduced }: BlindProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: BLIND.left,
        top: BLIND.top,
        width: BLIND.width,
        height: BLIND.height,
        zIndex: 8,
        pointerEvents: down ? 'auto' : 'none',
        background: `linear-gradient(180deg, ${COLOURS.navyHudTop} 0%, ${COLOURS.navyHudBot} 100%)`,
        boxSizing: 'border-box',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced
          ? `opacity ${BLIND_MS}ms linear`
          : `transform ${BLIND_MS}ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <div style={{
        fontSize: 38, fontWeight: 800, letterSpacing: '.06em', color: COLOURS.creamLight,
        textAlign: 'center', padding: '0 48px',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: progress * 5 > i ? COLOURS.amber : 'rgba(143,196,206,.3)',
              transition: 'background 160ms linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
