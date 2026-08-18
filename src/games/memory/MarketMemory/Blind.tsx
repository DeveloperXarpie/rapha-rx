import { BLIND } from './geometry';
import { COLOURS } from './palette';
import { EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the cover. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover. The scene never crossfades under normal motion: a physical cover
 * moves, and the list blanks underneath it once it has landed.
 *
 * It also spans the walk to the shop - the background changes behind it while it is
 * down - so it has to read as an opaque object, not as a veil.
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
        border: `6px solid ${COLOURS.navyDeep}`,
        borderRadius: 22,
        boxSizing: 'border-box',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced ? 'opacity 540ms linear' : `transform 540ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <div style={{
        fontSize: 30, fontWeight: 800, letterSpacing: '.06em', color: COLOURS.creamLight,
        textAlign: 'center', padding: '0 24px',
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
