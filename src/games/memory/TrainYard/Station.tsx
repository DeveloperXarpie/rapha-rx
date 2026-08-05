import { stationBox } from './geometry';
import type { PaletteEntry } from './palette';
import { STATION_SIGN, STATION_SPRITES } from './sprites';
import { EASE_OUT } from './styles';

interface StationProps {
  column: number;
  paletteIndex: number;
  colour: PaletteEntry;
  name: string;
  /** Roof colour and name are visible: during encoding, or once this station's train is home. */
  revealed: boolean;
  /** A train is selected and this station is still open - pulse and take taps. */
  inviting: boolean;
  interactive: boolean;
  reduced: boolean;
  onPick: () => void;
}

/**
 * Roof colour is the answer, and it is baked into the raster art, so a coloured building
 * cannot be on screen during dispatch. The hidden state greys the same sprite out; the
 * reveal is a filter transition on the handoff's 420ms curve.
 */
export default function Station({
  column, paletteIndex, colour, name, revealed, inviting, interactive, reduced, onPick,
}: StationProps) {
  const box = stationBox(column, paletteIndex);
  const sprite = STATION_SPRITES[paletteIndex];

  const tint = revealed ? (colour.filter || 'none') : 'grayscale(1) brightness(.96)';
  const base = 'drop-shadow(0 6px 8px rgba(31,41,55,.28))';

  const sign = {
    left: box.width * STATION_SIGN.x0,
    top: box.height * STATION_SIGN.y0,
    width: box.width * (STATION_SIGN.x1 - STATION_SIGN.x0),
    height: box.height * (STATION_SIGN.y1 - STATION_SIGN.y0),
  };

  // The plate is about 85 design pixels wide. Longer names step down a size rather than
  // overflow, and nothing drops below the handoff's 17px floor.
  const nameSize = name.length > 6 ? 17 : 20;

  return (
    <div
      onPointerUp={interactive ? onPick : undefined}
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: box.width,
        height: box.height,
        zIndex: 3,
        cursor: interactive ? 'pointer' : 'default',
        animation: inviting && !reduced ? 'ty-invite 2200ms ease-in-out infinite' : undefined,
        filter: inviting && reduced
          ? `${base} drop-shadow(0 0 12px rgba(255,214,102,.9))`
          : inviting ? undefined : base,
      }}
    >
      <img
        src={sprite.src}
        alt=""
        draggable={false}
        style={{
          width: '100%',
          height: '100%',
          display: 'block',
          filter: tint,
          transition: `filter 420ms ${EASE_OUT}`,
        }}
      />

      {/* Sign text, overlaid on the plate painted into the building art. */}
      <div
        style={{
          position: 'absolute',
          ...sign,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          textAlign: 'center',
          lineHeight: 1,
          fontFamily: "'Baloo 2', sans-serif",
          fontWeight: 800,
          textTransform: 'uppercase',
          letterSpacing: '.01em',
          fontSize: revealed ? nameSize : 28,
          color: revealed ? '#FBEFD5' : '#EFE6D2',
          textShadow: '0 2px 3px rgba(0,0,0,.55)',
          transition: 'color 320ms cubic-bezier(.33,1,.68,1)',
          pointerEvents: 'none',
        }}
      >
        {revealed ? name : '?'}
      </div>
    </div>
  );
}
