import type { CSSProperties } from 'react';
import type { Effect, Tick } from './effectModel';
import { COLOURS } from './styles';

const centred: CSSProperties = {
  position: 'absolute',
  transform: 'translate(-50%,-50%)',
  pointerEvents: 'none',
  zIndex: 8,
};

export function EffectView({ fx, reduced }: { fx: Effect; reduced: boolean }) {
  if (fx.kind === 'bloom') {
    return (
      <div
        style={{
          ...centred,
          left: fx.x, top: fx.y,
          width: 190, height: 190, borderRadius: '50%',
          border: '9px solid rgba(255,224,131,.95)',
          boxShadow: '0 0 0 14px rgba(255,224,131,.16)',
          animation: reduced
            ? 'ty-dip 780ms ease-out both'
            : 'ty-bloom 780ms cubic-bezier(.33,1,.68,1) both',
        }}
      />
    );
  }

  if (fx.kind === 'dip') {
    return (
      <div
        style={{
          ...centred,
          left: fx.x, top: fx.y,
          width: 150, height: 150, borderRadius: '50%',
          background: 'radial-gradient(circle, rgba(31,41,55,.34) 0%, rgba(31,41,55,.15) 46%, rgba(31,41,55,0) 72%)',
          animation: 'ty-dip 800ms ease-in-out both',
        }}
      >
        <div
          style={{
            position: 'absolute',
            inset: '30%',
            background:
              `linear-gradient(45deg, transparent 42%, ${COLOURS.crossRed} 42%, ${COLOURS.crossRed} 58%, transparent 58%),` +
              `linear-gradient(-45deg, transparent 42%, ${COLOURS.crossRed} 42%, ${COLOURS.crossRed} 58%, transparent 58%)`,
            filter: 'drop-shadow(0 2px 3px rgba(255,255,255,.9))',
          }}
        />
      </div>
    );
  }

  return (
    <div
      style={{
        ...centred,
        transform: undefined, // the keyframes own transform; see styles.tsx
        left: fx.x, top: fx.y,
        width: fx.w,
        height: fx.round ? fx.w : fx.h,
        background: fx.colour,
        borderRadius: fx.round ? '50%' : 2,
        boxShadow: '0 1px 2px rgba(31,41,55,.2)',
        animation: reduced
          ? `ty-dip 800ms ease-out ${fx.delay.toFixed(0)}ms both`
          : `ty-confetti 1100ms ease-out ${fx.delay.toFixed(0)}ms both`,
        ['--dx' as string]: `${fx.dx.toFixed(1)}px`,
        ['--dy' as string]: `${fx.dy.toFixed(1)}px`,
        ['--rot' as string]: `${fx.rot.toFixed(0)}deg`,
      }}
    />
  );
}

/** The floating message at the tunnel mouth. Carries the only wrong-dispatch words. */
export function TickView({ tick, reduced }: { tick: Tick; reduced: boolean }) {
  return (
    <div
      style={{
        position: 'absolute',
        left: tick.x,
        top: tick.y,
        zIndex: 9,
        pointerEvents: 'none',
        transform: 'translate(-50%, 0)',
        fontFamily: "'Baloo 2', sans-serif",
        fontSize: 30,
        fontWeight: 800,
        color: COLOURS.error,
        textShadow: '0 2px 10px rgba(255,255,255,.95)',
        whiteSpace: 'nowrap',
        animation: reduced
          ? 'ty-rise-ro 1250ms cubic-bezier(.33,1,.68,1) both'
          : 'ty-rise 1250ms cubic-bezier(.33,1,.68,1) both',
      }}
    >
      {tick.label}
    </div>
  );
}
