import { BOARD_H, BOARD_W } from './geometry';
import { COLOURS } from './palette';

/** Building blocks behind the street band. Transcribed from the prototype. */
const BUILDING_BLOCKS = [
  { left:  40, top: 60, w: 150, h: 136, fill: '#C7A98A' },
  { left: 250, top: 84, w: 120, h: 112, fill: '#D3B694' },
  { left: 470, top: 52, w: 168, h: 144, fill: '#C2A283' },
  { left: 660, top: 92, w: 128, h: 104, fill: '#D0B291' },
];

/**
 * Goods dressing the two counters. These are absolute board coordinates from the
 * prototype, not derived: the counters run y 258-558, and every block sits inside them.
 */
const STALL_GOODS = [
  { x:  26, y: 336, w: 100, h: 74, r:  '8px', fill: '#C64438' },
  { x: 138, y: 336, w: 100, h: 74, r:  '8px', fill: '#8BB94C' },
  { x:  26, y: 424, w: 100, h: 62, r:  '8px', fill: '#E8A93A' },
  { x: 138, y: 424, w: 100, h: 62, r:  '8px', fill: '#7B4EA8' },
  { x:  26, y: 498, w: 212, h: 50, r:  '8px', fill: '#5C3A18' },
  { x: 562, y: 336, w: 212, h: 40, r: '20px', fill: '#C99A5E' },
  { x: 562, y: 386, w: 100, h: 46, r: '10px', fill: '#D6A868' },
  { x: 674, y: 386, w: 100, h: 46, r: '10px', fill: '#CFA05F' },
  { x: 562, y: 442, w: 212, h: 44, r:  '8px', fill: '#EDE7D6' },
  { x: 562, y: 498, w: 212, h: 50, r:  '8px', fill: '#5C3A18' },
];

function Stall({ side, label, stripe, stripeEdge }: {
  side: 'left' | 'right'; label: string; stripe: string; stripeEdge: string;
}) {
  // The awning overhangs the board edge by 14px on its own side.
  const edge = side === 'left' ? { left: -14 } : { right: -14 };
  const counterEdge = side === 'left' ? { left: 6 } : { right: 6 };
  const signEdge = side === 'left' ? { left: 20 } : { right: 20 };

  return (
    <>
      <div style={{
        position: 'absolute', ...edge, top: 196, width: 300, height: 62,
        background: `repeating-linear-gradient(90deg, ${stripe} 0 34px, ${COLOURS.stallCream} 34px 68px)`,
        borderRadius: '0 0 10px 10px',
        borderBottom: `5px solid ${stripeEdge}`,
      }} />
      <div style={{
        position: 'absolute', ...counterEdge, top: 258, width: 262, height: 300,
        background: `linear-gradient(180deg, ${COLOURS.woodDark} 0%, ${COLOURS.woodDarker} 100%)`,
        borderRadius: 4,
      }} />
      <div style={{
        position: 'absolute', ...signEdge, top: 274, width: 234, height: 46,
        background: COLOURS.signPlate, border: `3px solid ${COLOURS.woodDark}`,
        boxSizing: 'border-box', borderRadius: 6,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 22, fontWeight: 800, letterSpacing: '.08em', color: COLOURS.inkSign,
      }}>{label}</div>
    </>
  );
}

/** Sky, street, buildings and the two market stalls. Decoration only, never interactive. */
export default function Backdrop() {
  return (
    <div style={{ position: 'absolute', inset: 0, zIndex: 0, pointerEvents: 'none', overflow: 'hidden' }}>
      <div style={{
        position: 'absolute', left: 0, top: 0, width: BOARD_W, height: BOARD_H,
        background: `linear-gradient(180deg, ${COLOURS.skyTop} 0px, ${COLOURS.skyBot} 190px, ${COLOURS.groundTop} 191px, ${COLOURS.groundMid} 300px, ${COLOURS.groundBot} ${BOARD_H}px)`,
      }} />

      {/* Street band first, then the buildings standing on it - painting order matters. */}
      <div style={{
        position: 'absolute', left: 0, top: 96, width: BOARD_W, height: 96,
        background: `linear-gradient(180deg, ${COLOURS.street} 0%, ${COLOURS.streetBot} 100%)`,
      }} />

      {BUILDING_BLOCKS.map((b, i) => (
        <div key={i} style={{
          position: 'absolute', left: b.left, top: b.top, width: b.w, height: b.h,
          background: b.fill, borderRadius: '6px 6px 0 0',
        }} />
      ))}

      <Stall side="left"  label="FRESH FRUITS"   stripe={COLOURS.stallRed}  stripeEdge={COLOURS.stallRedEdge} />
      <Stall side="right" label="BAKERY & DAIRY" stripe={COLOURS.stallBlue} stripeEdge={COLOURS.stallBlueEdge} />

      {STALL_GOODS.map((g, i) => (
        <div key={i} style={{
          position: 'absolute', left: g.x, top: g.y, width: g.w, height: g.h,
          borderRadius: g.r, background: g.fill,
          boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.14)',
        }} />
      ))}
    </div>
  );
}
