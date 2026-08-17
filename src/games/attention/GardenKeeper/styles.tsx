/**
 * Keyframes for Garden Keeper, rendered as an inline <style> block, as the other games do.
 *
 * The countdown ring is a conic gradient driven by a CSS custom property rather than an
 * animation, because its progress has to come from the same wall-clock deadline the
 * reducer scores against. An animation would drift from that deadline whenever the tab is
 * throttled, and the player would see a ring that disagrees with whether the tap counted.
 */
export const KEYFRAMES = `
@keyframes gk-fade { from { opacity: 0; } to { opacity: 1; } }

@keyframes gk-sprout {
  0%   { opacity: 0; transform: translate(-50%, -100%) scale(.55); }
  60%  { opacity: 1; transform: translate(-50%, -100%) scale(1.08); }
  100% { opacity: 1; transform: translate(-50%, -100%) scale(1); }
}

@keyframes gk-sprout-ro { from { opacity: 0; } to { opacity: 1; } }

@keyframes gk-droop {
  0%   { transform: translate(-50%, -100%) scale(1) rotate(0deg); }
  100% { transform: translate(-50%, -100%) scale(.94) rotate(-3deg); }
}

@keyframes gk-splash {
  0%   { opacity: 0; transform: translate(-50%, -50%) scale(.4); }
  30%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%, -50%) scale(1.6); }
}

@keyframes gk-shake {
  0%, 100% { transform: translate(-50%, -100%) translateX(0); }
  20%      { transform: translate(-50%, -100%) translateX(-7px); }
  50%      { transform: translate(-50%, -100%) translateX(6px); }
  80%      { transform: translate(-50%, -100%) translateX(-3px); }
}

@keyframes gk-rise {
  0%   { opacity: 0; transform: translate(-50%, 6px); }
  25%  { opacity: 1; }
  75%  { opacity: 1; transform: translate(-50%, -28px); }
  100% { opacity: 0; transform: translate(-50%, -42px); }
}

@keyframes gk-rise-ro { 0% { opacity: 0; } 25% { opacity: 1; } 75% { opacity: 1; } 100% { opacity: 0; } }

@keyframes gk-cardin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.92); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes gk-ringin {
  from { opacity: 0; transform: translate(-50%,-50%) scale(.72); }
  to   { opacity: 1; transform: translate(-50%,-50%) scale(1); }
}

@keyframes gk-halo {
  0%   { transform: translate(-50%,-50%) scale(1);    opacity: .85; }
  50%  { transform: translate(-50%,-50%) scale(1.07); opacity: 1; }
  100% { transform: translate(-50%,-50%) scale(1);    opacity: .85; }
}

@keyframes gk-watered {
  0%   { transform: translate(-50%, -100%) scale(1); }
  40%  { transform: translate(-50%, -100%) scale(1.12); }
  100% { transform: translate(-50%, -100%) scale(1); }
}

/* The can tips in, pours, and lifts away. Rotation is baked into every frame with the
   centring translate, so the animation owns transform for the element's whole life.

   The rotation is negative because the can's spout is on its left: counter-clockwise
   tips the spout down to pour. Positive lifts the spout and dips the handle, which is
   the can pouring out of its own back. */
@keyframes gk-pour {
  0%   { opacity: 0; transform: translate(-50%,-50%) rotate(6deg) scale(.82); }
  22%  { opacity: 1; transform: translate(-50%,-50%) rotate(-26deg) scale(1); }
  62%  { opacity: 1; transform: translate(-50%,-50%) rotate(-30deg) scale(1); }
  100% { opacity: 0; transform: translate(-50%,-56%) rotate(-10deg) scale(.94); }
}

/* A droplet leaving the spout: falls along its own vector, stretching slightly as it
   goes, the way a falling drop reads. */
@keyframes gk-fall {
  0%   { opacity: 0; transform: translate(-50%,-50%) translate(0,0) scaleY(.8); }
  18%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; transform: translate(-50%,-50%) translate(var(--fx), var(--fy)) scaleY(1.5); }
}

@keyframes gk-fall-ro {
  0%   { opacity: 0; }
  25%  { opacity: 1; }
  75%  { opacity: 1; }
  100% { opacity: 0; }
}

@keyframes gk-pour-ro {
  0%   { opacity: 0; transform: translate(-50%,-50%); }
  25%  { opacity: 1; transform: translate(-50%,-50%); }
  70%  { opacity: 1; transform: translate(-50%,-50%); }
  100% { opacity: 0; transform: translate(-50%,-50%); }
}

@keyframes gk-star {
  0%   { opacity: 0; transform: translate(-50%,-50%) scale(.4); }
  35%  { opacity: 1; transform: translate(-50%,-50%) scale(1.15); }
  70%  { opacity: 1; transform: translate(-50%,-50%) scale(1); }
  100% { opacity: 0; transform: translate(-50%,-90%) scale(1); }
}

@keyframes gk-star-ro {
  0%   { opacity: 0; transform: translate(-50%,-50%); }
  35%  { opacity: 1; transform: translate(-50%,-50%); }
  70%  { opacity: 1; transform: translate(-50%,-50%); }
  100% { opacity: 0; transform: translate(-50%,-50%); }
}

@keyframes gk-pulse {
  0%   { box-shadow: 0 0 0 0 rgba(126,217,87,0); }
  50%  { box-shadow: 0 0 0 12px rgba(126,217,87,.45); }
  100% { box-shadow: 0 0 0 0 rgba(126,217,87,0); }
}
`;

export const EASE = 'cubic-bezier(.22,.61,.36,1)';
export const EASE_OUT = 'cubic-bezier(.33,1,.68,1)';

export function GardenKeeperStyles() {
  return <style>{KEYFRAMES}</style>;
}
