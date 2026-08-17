/**
 * Board keyframes, injected as a scoped <style> element rather than added to the global
 * stylesheet: they are only meaningful inside this board, and the `sg-` prefix keeps them
 * from colliding with the other games' animations.
 *
 * Colours live in `palette.ts`.
 */

/**
 * `reduced` drops the looping ready-glow and the shake to a still frame. Motion that only
 * decorates is removed; motion that carries state - the patience and cook bars - is a CSS
 * width transition rather than an animation, so it survives untouched.
 */
export function ServeTheGuestsStyles({ reduced }: { reduced: boolean }) {
  const css = `
.sg-nudge { animation: sg-nudge .45s ease; }
.sg-pop { animation: sg-pop .3s ease-out; }
.sg-float { animation: sg-float 1.2s ease-out forwards; }
.sg-glow { animation: sg-glow 1.6s ease-in-out infinite; }
@keyframes sg-nudge {
  0%,100% { transform: translateX(0) }
  20% { transform: translateX(-9px) }
  40% { transform: translateX(9px) }
  60% { transform: translateX(-6px) }
  80% { transform: translateX(4px) }
}
@keyframes sg-pop {
  0% { transform: scale(.6); opacity: 0 }
  60% { transform: scale(1.15); opacity: 1 }
  100% { transform: scale(1); opacity: 1 }
}
@keyframes sg-float {
  0% { transform: translate(-50%, 0); opacity: 1 }
  100% { transform: translate(-50%, -70px); opacity: 0 }
}
@keyframes sg-glow {
  0%,100% { box-shadow: 0 4px 0 #2f7d32, 0 0 0 0 rgba(120,220,90,0) }
  50% { box-shadow: 0 4px 0 #2f7d32, 0 0 22px 6px rgba(120,220,90,.55) }
}
${reduced ? `
.sg-nudge, .sg-pop, .sg-float, .sg-glow { animation: none; }
.sg-float { opacity: 1; transform: translate(-50%, -35px); }
.sg-glow { box-shadow: 0 4px 0 #2f7d32, 0 0 18px 5px rgba(120,220,90,.5); }
` : ''}
`;
  return <style>{css}</style>;
}
