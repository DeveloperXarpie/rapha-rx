import { useReducedMotion } from '../../lib/useReducedMotion';
import { SCORE_UI } from '../../styles/tokens';

/*
 * The scorecard's accolade (amends 2026-11-23, page 3): the word in a badge over a
 * field of confetti. The confetti is laid out once from a fixed seed, so it is the
 * same picture every time and never jumps on a re-render.
 */

const COLOURS = ['#E5484D', '#F5C23A', '#3FB6F2', '#5BD16B', '#A06BF2', '#F28BA8', '#F59A3A'];
const PIECES = 46;
const STREAMERS = 4;

interface Piece {
  x: number; y: number; turn: number; w: number; h: number; colour: string; delay: number;
}

function seeded(seed: number) {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 4294967296;
    return s / 4294967296;
  };
}

const rand = seeded(23112026);
const PIECE_LAYOUT: Piece[] = Array.from({ length: PIECES }, () => {
  const square = rand() < 0.35;
  return {
    x: rand() * 96 + 2,
    y: rand() * 92 + 4,
    turn: Math.round(rand() * 360),
    w: square ? 6 : 4,
    h: square ? 6 : 11,
    colour: COLOURS[Math.floor(rand() * COLOURS.length)],
    delay: Math.round(rand() * 500),
  };
});
const STREAMER_LAYOUT = Array.from({ length: STREAMERS }, (_, i) => ({
  x: [12, 70, 84, 22][i],
  y: [14, 4, 62, 78][i],
  turn: Math.round(rand() * 60) - 30,
  colour: COLOURS[[4, 4, 2, 0][i]],
  delay: Math.round(rand() * 500),
}));

export default function Accolade({ word }: { word: string }) {
  const reduced = useReducedMotion();
  const fall = (delay: number) =>
    reduced ? undefined : `confetti-in 700ms ease-out ${delay}ms both`;

  return (
    <div
      style={{
        position: 'relative', flex: 1, minHeight: 150, width: '100%',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}
    >
      <div aria-hidden="true" style={{ position: 'absolute', inset: 0, pointerEvents: 'none' }}>
        {PIECE_LAYOUT.map((p, i) => (
          <span
            key={i}
            style={{
              position: 'absolute', left: `${p.x}%`, top: `${p.y}%`,
              width: p.w, height: p.h, borderRadius: 1.5, background: p.colour,
              transform: `rotate(${p.turn}deg)`,
              ['--confetti-turn' as string]: `${p.turn}deg`,
              animation: fall(p.delay),
            }}
          />
        ))}
        {STREAMER_LAYOUT.map((s, i) => (
          <svg
            key={`s${i}`}
            width="18" height="44" viewBox="0 0 18 44"
            style={{
              position: 'absolute', left: `${s.x}%`, top: `${s.y}%`,
              transform: `rotate(${s.turn}deg)`,
              ['--confetti-turn' as string]: `${s.turn}deg`,
              animation: fall(s.delay),
            }}
          >
            <path
              d="M9 2 C 16 8, 2 14, 9 20 S 2 32, 9 38"
              fill="none" stroke={s.colour} strokeWidth="3.5" strokeLinecap="round"
            />
          </svg>
        ))}
      </div>

      <p
        role="status"
        className="font-baloo"
        style={{
          position: 'relative',
          padding: '4px 22px 2px',
          borderRadius: 18,
          background: SCORE_UI.accoladeInk,
          border: `4px solid ${SCORE_UI.accoladeRim}`,
          boxShadow: `0 0 0 4px ${SCORE_UI.accoladeEdge}, 0 8px 14px rgba(4, 10, 40, 0.45)`,
          color: SCORE_UI.accolade,
          fontSize: 'clamp(26px, 8vw, 34px)',
          fontWeight: 800,
          letterSpacing: '0.06em',
          lineHeight: 1.25,
          textAlign: 'center',
          textShadow: `0 3px 0 ${SCORE_UI.accoladeEdge}`,
          transform: 'skewX(-8deg)',
          animation: reduced ? undefined : 'accolade-pop 520ms ease-out 450ms both',
        }}
      >
        {word.toUpperCase()}
      </p>
    </div>
  );
}
