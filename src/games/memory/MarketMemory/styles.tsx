/**
 * Keyframes rendered as an inline <style> block, matching how Train Yard ships its
 * animations.
 *
 * Trap preserved from the prototype: mm-cardin and mm-confetti bake their centring
 * translate into every keyframe and run with fill-mode `both`, so the animation owns
 * `transform` for the element's whole life. Centring those elements any other way throws
 * them to the top-left corner. Confetti custom properties carry their units on the
 * values, not inside the calc().
 */
export const KEYFRAMES = `
@keyframes mm-fade { from { opacity: 0; } to { opacity: 1; } }

@keyframes mm-slidein {
  from { opacity: 0; transform: translateY(10px); }
  to   { opacity: 1; transform: translateY(0); }
}

@keyframes mm-cardin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.92); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes mm-glow {
  0%   { box-shadow: 0 0 0 0 rgba(255,214,102,0); }
  50%  { box-shadow: 0 0 0 14px rgba(255,214,102,.5); }
  100% { box-shadow: 0 0 0 0 rgba(255,214,102,0); }
}

@keyframes mm-rise {
  0%   { opacity: 0; transform: translate(-50%, 8px); }
  25%  { opacity: 1; }
  75%  { opacity: 1; transform: translate(-50%, -26px); }
  100% { opacity: 0; transform: translate(-50%, -40px); }
}

@keyframes mm-rise-ro { 0% { opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }

@keyframes mm-confetti {
  0%   { opacity: 0; transform: translate(-50%,-50%) translate(0,0) rotate(0deg) scale(.6); }
  14%  { opacity: 1; transform: translate(-50%,-50%) translate(calc(var(--dx) * .18), calc(var(--dy) * .34)) rotate(calc(var(--rot) * .2)) scale(1); }
  70%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--dx), var(--dy)) rotate(var(--rot)) scale(.9); }
}
`;

export const EASE_SETTLE = 'cubic-bezier(.22,.61,.36,1)';
export const EASE_OUT = 'cubic-bezier(.33,1,.68,1)';

export function MarketMemoryStyles() {
  return <style>{KEYFRAMES}</style>;
}
