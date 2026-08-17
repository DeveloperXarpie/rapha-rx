import { BLIND } from './geometry';
import { COLOURS } from './palette';
import { EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the blind. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover. The scene never crossfades under normal motion: a physical cover
 * moves, and the list blanks underneath it once it has landed.
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
        background: `repeating-linear-gradient(180deg, ${COLOURS.blindSlatA} 0 26px, ${COLOURS.blindSlatB} 26px 30px)`,
        border: `5px solid ${COLOURS.woodDark}`,
        borderRadius: 12,
        boxSizing: 'border-box',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced ? 'opacity 540ms linear' : `transform 540ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 20,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <div style={{ fontSize: 26, fontWeight: 700, letterSpacing: '.06em', color: COLOURS.inkSign }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 16, height: 16, borderRadius: '50%',
              background: progress * 5 > i ? COLOURS.woodDark : 'rgba(107,83,52,.28)',
              transition: 'background 160ms linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
