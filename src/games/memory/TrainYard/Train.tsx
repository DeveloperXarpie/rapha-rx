import { pathFor, TRAIN_H, TRAIN_W } from './geometry';
import type { PaletteEntry } from './palette';
import { TRAIN_SPRITES } from './sprites';
import { EASE_OUT, EASE_SETTLE, EASE_TRAVEL } from './styles';

export type TrainStatus = 'lane' | 'arm' | 'run' | 'back' | 'done';

export const RUN_MS = 2300;
export const BACK_MS = 1800;

interface TrainProps {
  lane: number;
  paletteIndex: number;
  colour: PaletteEntry;
  status: TrainStatus;
  target: number | null;
  selected: boolean;
  nudged: boolean;
  interactive: boolean;
  reduced: boolean;
  onPick: () => void;
}

/**
 * A train rides offset-path along its whole route, so it stays on drawn rails corner to
 * corner.
 *
 * The `arm` status is load-bearing: it commits the new path with no offset-distance
 * transition, and `run` - one frame later - adds the transition and flips the distance to
 * 100%. Setting both in the same commit gives the browser nothing to interpolate from and
 * the train teleports. A waiting train's path is its own lane to its own column, so every
 * candidate route shares a start point and the swap on arming is invisible.
 */
export default function Train({
  lane, paletteIndex, colour, status, target, selected, nudged, interactive, reduced, onPick,
}: TrainProps) {
  const sprite = TRAIN_SPRITES[paletteIndex];
  const routeTo = target ?? lane;
  const moving = status === 'run' || status === 'back';
  const distance = status === 'run' || status === 'done' ? 100 : 0;

  const baseShadow = 'drop-shadow(0 6px 8px rgba(31,41,55,.22))';
  const wrapperFilter = nudged
    ? `${baseShadow} drop-shadow(0 0 12px rgba(255,224,131,.95))`
    : selected
      ? 'drop-shadow(0 8px 14px rgba(31,41,55,.32))'
      : baseShadow;

  return (
    <div
      style={{
        position: 'absolute',
        left: 0,
        top: 0,
        width: TRAIN_W,
        height: TRAIN_H,
        offsetPath: `path("${pathFor(lane, routeTo)}")`,
        offsetRotate: 'auto 90deg',
        offsetAnchor: '50% 50%',
        offsetDistance: `${distance}%`,
        transition:
          (moving ? `offset-distance ${status === 'run' ? RUN_MS : BACK_MS}ms ${status === 'run' ? EASE_TRAVEL : EASE_OUT}, ` : '') +
          'opacity 500ms linear 200ms',
        opacity: status === 'done' ? 0 : 1,
        zIndex: status === 'lane' || status === 'arm' ? 6 : 1,
        filter: wrapperFilter,
        cursor: interactive ? 'pointer' : 'default',
      }}
    >
      {/* Tap pad, wider than the sprite. The whole board scales down to fit the viewport,
          and the locomotive alone is a thin target once it does. */}
      {interactive && (
        <div
          onPointerUp={onPick}
          style={{ position: 'absolute', left: -16, top: -12, right: -16, bottom: -12, zIndex: 1 }}
        />
      )}

      {/* Scale and bob share an element, as in the prototype: a bobbing train rides at
          scale 1 because the animation owns `transform` while it runs. */}
      <div
        style={{
          position: 'absolute',
          inset: 0,
          transformOrigin: '50% 70%',
          transform: selected ? 'scale(1.08)' : 'scale(1)',
          transition: `transform 220ms ${EASE_SETTLE}`,
          animation: selected && !reduced ? 'ty-bob 1500ms ease-in-out infinite' : undefined,
        }}
      >
        <img
          src={sprite.src}
          alt=""
          draggable={false}
          style={{ width: '100%', height: '100%', display: 'block', filter: colour.filter || undefined }}
        />

        {/* Steam, only while the train is actually pulling. */}
        <div
          style={{
            position: 'absolute',
            left: TRAIN_W * 0.5,
            top: -4,
            opacity: status === 'run' ? 1 : 0,
            transition: 'opacity 300ms linear',
            pointerEvents: 'none',
          }}
        >
          {[15, 11, 17].map((size, i) => (
            <div
              key={i}
              style={{
                position: 'absolute',
                left: -size / 2,
                width: size,
                height: size,
                borderRadius: '50%',
                background: 'rgba(255,255,255,.85)',
                animation: status === 'run' && !reduced
                  ? `ty-steam 1900ms ease-out ${i * 620}ms infinite`
                  : undefined,
                opacity: reduced ? 0 : undefined,
              }}
            />
          ))}
        </div>

        {/* Selection ring. The nudge pulse runs here; the nudge glow runs on the wrapper. */}
        <div
          style={{
            position: 'absolute',
            left: -9, top: -9, right: -9, bottom: -9,
            border: `5px solid ${COLOUR_RING}`,
            borderRadius: 26,
            opacity: selected ? 1 : nudged ? 0.6 : 0,
            transition: 'opacity 200ms linear',
            animation: nudged && !selected && !reduced ? 'ty-nudge 2000ms ease-in-out infinite' : undefined,
            pointerEvents: 'none',
            boxShadow: selected ? `0 0 0 2px ${colour.dark}33` : undefined,
          }}
        />
      </div>
    </div>
  );
}

const COLOUR_RING = '#FFE083';
