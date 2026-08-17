import { COLOURS } from './palette';
import { CONFETTI_MS, TOAST_MS, type Effect } from './effectModel';
import { EASE_OUT } from './styles';

export function EffectView({ effect, reduced }: { effect: Effect; reduced: boolean }) {
  if (effect.kind === 'toast') {
    return (
      <div
        style={{
          position: 'absolute', left: effect.x, top: effect.y, zIndex: 9,
          transform: 'translate(-50%, 0)', pointerEvents: 'none',
          background: COLOURS.creamLight, border: `3px solid ${COLOURS.creamBorder}`,
          borderRadius: 12, padding: '6px 14px',
          fontFamily: "'Baloo 2', sans-serif", fontSize: 22, fontWeight: 700, color: COLOURS.ink,
          animation: `${reduced ? 'mm-rise-ro' : 'mm-rise'} ${TOAST_MS}ms ease-out both`,
        }}
      >
        {effect.text}
      </div>
    );
  }

  return (
    <div
      style={{
        position: 'absolute', left: effect.x, top: effect.y, zIndex: 9, pointerEvents: 'none',
        width: effect.w, height: effect.h,
        background: effect.colour,
        borderRadius: effect.round ? '50%' : 2,
        // Units live on the values; calc() inside the keyframe consumes them as-is.
        ['--dx' as string]: `${effect.dx}px`,
        ['--dy' as string]: `${effect.dy}px`,
        ['--rot' as string]: `${effect.rot}deg`,
        animation: reduced
          ? `mm-fade ${CONFETTI_MS}ms ease ${effect.delay}ms both`
          : `mm-confetti ${CONFETTI_MS}ms ${EASE_OUT} ${effect.delay}ms both`,
      }}
    />
  );
}
