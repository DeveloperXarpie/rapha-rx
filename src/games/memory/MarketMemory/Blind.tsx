import { BLIND } from './geometry';
import { COLOURS } from './palette';
import { UI_TRAVEL, UI_TRAVEL_ASPECT } from './sprites';
import { BLIND_MS, EASE_SETTLE } from './styles';

/**
 * The travel plate, in board pixels. 640 of the canvas's 800 leaves 80px of cover
 * either side, which is the same gutter the caption plate keeps.
 */
const ART_W = 640;
const ART_H = Math.round(ART_W / UI_TRAVEL_ASPECT);

/** The halo behind it. Wider than the art so it reads as light, not as a plate. */
const HALO = Math.round(ART_W * 1.05);

interface BlindProps {
  down: boolean;
  /** Progress through the hold, 0-1. Fills the dots; it does not move the cover. */
  progress: number;
  label: string;
  reduced: boolean;
}

/**
 * The retention cover, and the only thing on screen during the walk to the shop.
 *
 * It spans the whole board (see BLIND in geometry.ts), so the backdrop, the shelf and
 * the clipboard are all free to change underneath it without the resident watching them
 * do it. That is why it carries the caption and the hold dots: while it is down there is
 * no other UI to read.
 *
 * It moves fast on purpose. The cover is an opaque screen rather than something to
 * watch, so the only time the resident spends here is the retention hold itself.
 *
 * The Sep-10 review found the flat gradient it used to be, and asked for the car and
 * the shopfront above the caption. The art earns its place beyond decoration: it is
 * the only thing on screen that says WHY the list has gone away, which is the story
 * the retention hold is telling.
 */
export default function Blind({ down, progress, label, reduced }: BlindProps) {
  return (
    <div
      style={{
        position: 'absolute',
        left: BLIND.left,
        top: BLIND.top,
        width: BLIND.width,
        height: BLIND.height,
        zIndex: 8,
        pointerEvents: down ? 'auto' : 'none',
        background: `linear-gradient(180deg, ${COLOURS.navyHudTop} 0%, ${COLOURS.navyHudBot} 100%)`,
        boxSizing: 'border-box',
        transformOrigin: 'top center',
        transform: reduced ? 'translateY(0)' : `translateY(${down ? 0 : -BLIND.lift}px)`,
        opacity: reduced ? (down ? 1 : 0) : 1,
        transition: reduced
          ? `opacity ${BLIND_MS}ms linear`
          : `transform ${BLIND_MS}ms ${EASE_SETTLE}`,
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'center',
        alignItems: 'center',
        gap: 24,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      {/*
        Art and halo in one box so the halo stays centred on the art at any size.
        Both are decorative - the caption below carries the meaning - so the image is
        aria-hidden and the cover is read by the caption alone.
      */}
      <div style={{
        position: 'relative', width: ART_W, height: ART_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div
          aria-hidden="true"
          style={{
            position: 'absolute', width: HALO, height: HALO, borderRadius: '50%',
            background: 'radial-gradient(circle, rgba(143,196,206,.34) 0%, rgba(143,196,206,.10) 58%, rgba(143,196,206,0) 72%)',
          }}
        />
        <img
          src={UI_TRAVEL}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{
            position: 'relative', width: '100%', height: '100%',
            objectFit: 'contain', display: 'block',
          }}
        />
      </div>

      <div style={{
        fontSize: 38, fontWeight: 800, letterSpacing: '.06em', color: COLOURS.creamLight,
        textAlign: 'center', padding: '0 48px',
      }}>
        {label}
      </div>
      <div style={{ display: 'flex', gap: 14 }}>
        {[0, 1, 2, 3, 4].map((i) => (
          <div
            key={i}
            style={{
              width: 18, height: 18, borderRadius: '50%',
              background: progress * 5 > i ? COLOURS.amber : 'rgba(143,196,206,.3)',
              transition: 'background 160ms linear',
            }}
          />
        ))}
      </div>
    </div>
  );
}
