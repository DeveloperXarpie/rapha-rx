import { BLIND, BOARD_W } from './geometry';
import { COLOURS, EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the blind. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover. The scene never crossfades: a physical cover moves, and the signs
 * blank underneath it.
 *
 * It is always mounted and parks fully off the top of the board, and it starts below the
 * instruction banner so the caption stays readable throughout.
 */
export default function Blind({ down, progress, label, reduced }: BlindProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: BLIND.top,
        width: BOARD_W,
        height: BLIND.height,
        zIndex: 10,
        pointerEvents: down ? 'auto' : 'none',
        background: `repeating-linear-gradient(180deg, ${COLOURS.blindSlatA} 0px, ${COLOURS.blindSlatA} 26px, ${COLOURS.blindSlatB} 26px, ${COLOURS.blindSlatB} 52px)`,
        borderBottom: `9px solid ${COLOURS.signWood}`,
        boxShadow: '0 16px 30px -12px rgba(20,48,79,.45)',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced ? 'opacity 540ms linear' : `transform 540ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'flex-end',
        alignItems: 'center',
        gap: 18,
        paddingBottom: 38,
      }}
    >
      <div
        style={{
          fontFamily: "'Baloo 2', sans-serif",
          fontSize: 26,
          fontWeight: 700,
          letterSpacing: '.06em',
          color: COLOURS.brownMid,
        }}
      >
        {label}
      </div>
      <div style={{ display: 'flex', gap: 12 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 16,
              height: 16,
              borderRadius: '50%',
              background: progress * 5 > i ? COLOURS.brownMid : 'rgba(107,83,52,.28)',
              transition: 'background 160ms linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
