/**
 * Board animations, injected as a scoped <style> element. The `ctw-` prefix keeps these
 * keyframes from colliding with the other games'. Colours live in `skin.ts`.
 */

import { SKIN } from './skin';

/**
 * `reduced` strips the decorative loops - the exit's beacon and the drifting bubbles -
 * and shortens the escape to a jump cut. The hint pulse survives as a static ring: it
 * carries information rather than decorating, so removing it would remove the answer.
 */
export function ClearTheWayStyles({ reduced }: { reduced: boolean }) {
  const css = `
.ctw-exit-glow { animation: ctw-exit-glow 2.2s ease-in-out infinite; }
.ctw-hint { animation: ctw-hint 1.1s ease-in-out infinite; }
.ctw-freed { animation: ctw-freed .5s ease-out; }
.ctw-drift { animation: ctw-drift 9s linear infinite; }

@keyframes ctw-exit-glow {
  0%, 100% { opacity: .55; filter: drop-shadow(0 0 6px ${SKIN.exitGlow}); }
  50% { opacity: 1; filter: drop-shadow(0 0 18px ${SKIN.exitGlow}); }
}
@keyframes ctw-hint {
  0%, 100% { box-shadow: 0 0 0 0 rgba(255,255,255,.9), 0 0 0 0 ${SKIN.exitGlow}; }
  50% { box-shadow: 0 0 0 4px rgba(255,255,255,.9), 0 0 22px 8px ${SKIN.exitGlow}; }
}
@keyframes ctw-freed {
  0% { transform: scale(.7); opacity: 0; }
  60% { transform: scale(1.08); opacity: 1; }
  100% { transform: scale(1); opacity: 1; }
}
@keyframes ctw-drift {
  0% { transform: translateY(0) scale(1); opacity: 0; }
  15% { opacity: .5; }
  100% { transform: translateY(-260px) scale(1.3); opacity: 0; }
}
${reduced ? `
.ctw-exit-glow, .ctw-freed, .ctw-drift { animation: none; }
.ctw-drift { opacity: 0; }
.ctw-exit-glow { opacity: 1; filter: drop-shadow(0 0 12px ${SKIN.exitGlow}); }
.ctw-hint { animation: none; box-shadow: 0 0 0 4px rgba(255,255,255,.9), 0 0 18px 6px ${SKIN.exitGlow}; }
` : ''}
`;
  return <style>{css}</style>;
}
