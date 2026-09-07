/**
 * Keyframes rendered as an inline <style> block, matching how Train Yard ships its
 * animations.
 *
 * Trap preserved from the prototype: mm-cardin and mm-confetti bake their centring
 * translate into every keyframe and run with fill-mode `both`, so the animation owns
 * `transform` for the element's whole life. Centring those elements any other way throws
 * them to the top-left corner. Confetti custom properties carry their units on the
 * values, not inside the calc().
 *
 * The same trap applies to `opacity`, and it has bitten twice. mm-fade and mm-slidein
 * both end on `opacity: 1` and both run with fill `both`, so an element carrying either
 * of them can never afterwards be dimmed or hidden by an `opacity` declaration - the
 * animation outranks it in the cascade, permanently. It cost us a shopping list that
 * stayed readable under the retention cover and a DONE button that never dimmed when
 * disabled. Whenever an element needs both an entrance and a state-driven opacity, use
 * two elements: the outer animates, the inner sets opacity. See `listRowStyles.ts`.
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

/*
 * The result badge landing on an item. Scale and opacity only - deliberately no
 * translate, so it can be positioned by its corner offsets like any other badge. Using
 * mm-cardin here instead would drag it half its own size up and left forever, because
 * that animation bakes a centring translate into every keyframe.
 */
@keyframes mm-pop {
  from { opacity: 0; transform: scale(.5); }
  60%  { opacity: 1; transform: scale(1.12); }
  to   { opacity: 1; transform: scale(1); }
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

/**
 * How long the retention cover takes to fall and to lift.
 *
 * Lives here rather than in index.tsx because Blind.tsx has to animate for exactly as
 * long as the phase schedule waits for it. It was 540ms in two places that had no way of
 * staying in step, and the walk to the shop was over a second of animation on either
 * side of the retention hold. The cover is opaque and full-board now, so there is nothing
 * to watch during the move: the resident only pays the hold itself.
 */
export const BLIND_MS = 120;
export const EASE_OUT = 'cubic-bezier(.33,1,.68,1)';

export function MarketMemoryStyles() {
  return <style>{KEYFRAMES}</style>;
}
