/**
 * Keyframes, transcribed from the handoff prototype. Rendered as an inline <style> block,
 * which is how the other games in this app ship their animations.
 *
 * Two traps preserved from the prototype: ty-cardin, ty-bloom and ty-confetti bake their
 * centring translate into every keyframe and run with fill-mode `both`, so the animation
 * owns `transform` for the element's whole life - centring those elements any other way
 * throws them to the top-left corner. And the confetti custom properties carry their units
 * on the values, not inside the calc().
 */
export const KEYFRAMES = `
@keyframes ty-fade { from { opacity: 0; } to { opacity: 1; } }

@keyframes ty-slidein {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes ty-cardin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.92); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes ty-bloom {
  0%   { transform: translate(-50%,-50%) scale(.5); opacity: 0; }
  22%  { opacity: .95; }
  100% { transform: translate(-50%,-50%) scale(1.5); opacity: 0; }
}

@keyframes ty-dip { 0% { opacity: 0; } 35% { opacity: 1; } 100% { opacity: 0; } }

@keyframes ty-rise {
  0%   { opacity: 0; transform: translate(-50%, 8px); }
  25%  { opacity: 1; }
  75%  { opacity: 1; transform: translate(-50%, -26px); }
  100% { opacity: 0; transform: translate(-50%, -40px); }
}

@keyframes ty-rise-ro { 0% { opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }

@keyframes ty-nudge {
  0%   { opacity: .25; transform: scale(.97); }
  50%  { opacity: .9;  transform: scale(1.03); }
  100% { opacity: .25; transform: scale(.97); }
}

@keyframes ty-bob {
  0%   { transform: translateY(0); }
  50%  { transform: translateY(-7px); }
  100% { transform: translateY(0); }
}

/* The handoff pulses a halo on the sign plate. The plate is painted into the station art
   here, so the invite pulses a glow around the whole building instead. */
@keyframes ty-invite {
  0%   { filter: drop-shadow(0 6px 8px rgba(31,41,55,.28)) drop-shadow(0 0 0 rgba(255,214,102,0)); }
  50%  { filter: drop-shadow(0 6px 8px rgba(31,41,55,.28)) drop-shadow(0 0 14px rgba(255,214,102,.95)); }
  100% { filter: drop-shadow(0 6px 8px rgba(31,41,55,.28)) drop-shadow(0 0 0 rgba(255,214,102,0)); }
}

@keyframes ty-steam {
  0%   { opacity: 0; transform: translate(0,0) scale(.5); }
  25%  { opacity: .6; }
  100% { opacity: 0; transform: translate(26px,-34px) scale(1.6); }
}

@keyframes ty-confetti {
  0%   { opacity: 0; transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(.6); }
  14%  { opacity: 1; transform: translate(-50%,-50%) translate(calc(var(--dx) * .18), calc(var(--dy) * .34)) rotate(calc(var(--rot) * .2)) scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(.9); }
}

`;

export const EASE_SETTLE = 'cubic-bezier(.22,.61,.36,1)';
export const EASE_OUT = 'cubic-bezier(.33,1,.68,1)';
export const EASE_TRAVEL = 'cubic-bezier(.42,0,.2,1)';

export const COLOURS = {
  navyDeep: '#14304F',
  navyPanelEdge: '#0F2A47',
  cream: '#FBEFD5',
  creamBorder: '#C9A76B',
  /*
    The level-crossing barrier, sampled off the Sep-17 mockup. It replaced the beige
    blind, and `blindSlatA`, `blindSlatB` and `signWood` went with it - the last of
    those was the blind's bottom rail and had no other caller.
  */
  barrierBoard: '#5A1C1D',
  barrierBoardDeep: '#4A1617',
  barrierBezel: '#241214',
  hazardYellow: '#FFFC1E',
  hazardDark: '#1C1418',
  signalRed: '#F52C22',
  signalGreen: '#19F231',
  signalOff: '#1A2025',
  amber: '#F0A92B',
  amberEdge: '#C8821A',
  brownText: '#4A3A22',
  brownMid: '#6B5334',
  brownSoft: '#5C4A2E',
  gold: '#FFE083',
  success: '#2E6B45',
  error: '#B23A2E',
  crossRed: '#C0392B',
} as const;

export function TrainYardStyles() {
  return <style>{KEYFRAMES}</style>;
}
