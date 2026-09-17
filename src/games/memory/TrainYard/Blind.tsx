import { BLIND, BOARD_W } from './geometry';
import { COLOURS, EASE_SETTLE } from './styles';

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Drives the lamps. */
  progress: number;
  /** Spoken, not printed. See the note below. */
  label: string;
  reduced: boolean;
}

/**
 * Where the crossing is in its count, from the hold's progress.
 *
 * Red, then dark, then green, then the barrier lifts - a crossing counting down to
 * letting the trains through, which is the same thing the five dots used to say and the
 * same thing the hold actually is. It is progressive rather than a flashing alternation
 * for that reason: a resident watching it should be able to tell how much longer they
 * have to hold the colours in mind, and something that merely blinks says nothing about
 * how far along it is.
 */
type Stage = 'red' | 'dark' | 'green';

function stageFor(progress: number): Stage {
  if (progress < 0.4) return 'red';
  if (progress < 0.75) return 'dark';
  return 'green';
}

/** Diameter of a signal lamp, and of the bezel around it. */
const LAMP = 84;
const BEZEL = 10;

/**
 * The retention cover. The scene never crossfades: a physical thing moves across the
 * board, and the signs blank underneath it.
 *
 * The Sep-17 review re-skinned it from a beige window blind to what it always wanted to
 * be in a railway yard - a level-crossing barrier. Maroon board, hazard stripes top and
 * bottom, and two signal lamps that count the hold down from red through dark to green.
 *
 * The "SIGNS COVERED" caption went with the blind. It is still here as an `sr-only`
 * line, because a resident using a screen reader has nothing else to tell them the yard
 * has just been covered: the lamps are the sighted cue and this is its counterpart.
 *
 * It is always mounted and parks fully off the top of the board, and it starts below the
 * instruction panel so the caption stays readable throughout.
 */
export default function Blind({ down, progress, label, reduced }: BlindProps) {
  const stage = stageFor(progress);

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
        background: `linear-gradient(180deg, ${COLOURS.barrierBoard} 0%, ${COLOURS.barrierBoardDeep} 58%, ${COLOURS.barrierBoard} 100%)`,
        boxShadow: '0 16px 30px -12px rgba(20,48,79,.55), inset 0 0 44px rgba(0,0,0,.34)',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced ? 'opacity 540ms linear' : `transform 540ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        alignItems: 'center',
        overflow: 'hidden',
      }}
    >
      <span className="sr-only" aria-live="polite">{down ? label : ''}</span>

      <HazardStripe />

      <div style={{ display: 'flex', gap: 96, alignItems: 'center' }}>
        <Lamp lit={stage === 'red'} colour={COLOURS.signalRed} />
        <Lamp lit={stage === 'green'} colour={COLOURS.signalGreen} />
      </div>

      <HazardStripe flip />
    </div>
  );
}

/**
 * The yellow-and-black warning band. Drawn rather than sliced: it is a 45 degree
 * repeating gradient, which is exactly what the painted version is, and it stretches to
 * any board width without a sprite having to tile cleanly.
 */
function HazardStripe({ flip = false }: { flip?: boolean }) {
  return (
    <div
      aria-hidden
      style={{
        width: '100%',
        height: 30,
        flex: '0 0 30px',
        background: `repeating-linear-gradient(${flip ? -45 : 45}deg, ${COLOURS.hazardYellow} 0 24px, ${COLOURS.hazardDark} 24px 48px)`,
        boxShadow: flip
          ? 'inset 0 3px 0 rgba(0,0,0,.35)'
          : 'inset 0 -3px 0 rgba(0,0,0,.35)',
      }}
    />
  );
}

/**
 * One signal lamp in its bezel.
 *
 * Both lamps are dark through the middle of the hold, which is the count's "black"
 * step. The transition is a short one rather than an instant switch - a signal lamp has
 * a filament - but it is short enough that the three steps still read as three steps.
 */
function Lamp({ lit, colour }: { lit: boolean; colour: string }) {
  return (
    <div
      aria-hidden
      style={{
        width: LAMP + BEZEL * 2,
        height: LAMP + BEZEL * 2,
        borderRadius: '50%',
        background: COLOURS.barrierBezel,
        boxShadow: 'inset 0 3px 6px rgba(0,0,0,.5), 0 3px 7px rgba(0,0,0,.4)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div
        style={{
          width: LAMP,
          height: LAMP,
          borderRadius: '50%',
          // The unlit state is the lamp's glass, not a hole: a dark disc that keeps its
          // own shading, so the pair reads as two lamps throughout the count.
          background: lit ? colour : COLOURS.signalOff,
          boxShadow: lit
            ? `0 0 26px 6px ${colour}`
            : 'inset 0 -6px 12px rgba(0,0,0,.45)',
          transition: 'background 220ms linear, box-shadow 220ms linear',
        }}
      />
    </div>
  );
}
