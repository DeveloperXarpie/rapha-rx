import { BOARD_H, BOARD_W } from './geometry';
import { BUILDINGS, COLOURS } from './palette';

const STALL_GOODS = [
  { left: 22,  bottom: 214, w: 46, h: 30, c: '#D0453C' },
  { left: 78,  bottom: 214, w: 46, h: 30, c: '#E8912B' },
  { left: 134, bottom: 214, w: 46, h: 30, c: '#7B4EA8' },
  { left: 190, bottom: 214, w: 46, h: 30, c: '#5AA83F' },
  { left: 50,  bottom: 172, w: 60, h: 28, c: '#D9483A' },
  { left: 574, bottom: 214, w: 46, h: 30, c: '#F7F5EF' },
  { left: 630, bottom: 214, w: 46, h: 30, c: '#F2D97A' },
  { left: 686, bottom: 214, w: 46, h: 30, c: '#D9A860' },
  { left: 742, bottom: 214, w: 40, h: 30, c: '#E4D2AC' },
  { left: 640, bottom: 172, w: 60, h: 28, c: '#DCB070' },
];

function Stall({ side, label, stripe, stripeEdge }: { side: 'left' | 'right'; label: string; stripe: string; stripeEdge: string }) {
  const awningLeft = side === 'left' ? -14 : BOARD_W - 286;
  const counterLeft = side === 'left' ? 6 : BOARD_W - 268;
  return (
    <>
      <div style={{
        position: 'absolute', left: awningLeft, top: 196, width: 300, height: 62,
        background: `repeating-linear-gradient(90deg, ${stripe} 0 34px, ${COLOURS.stallCream} 34px 68px)`,
        borderBottom: `5px solid ${stripeEdge}`,
      }} />
      <div style={{
        position: 'absolute', left: counterLeft, top: 258, width: 262, height: 300,
        background: `linear-gradient(180deg, ${COLOURS.woodDark}, ${COLOURS.woodDarker})`,
      }} />
      <div style={{
        position: 'absolute', left: counterLeft + 46, top: 286, width: 170, height: 44,
        background: COLOURS.signPlate, border: `3px solid ${COLOURS.woodDark}`, borderRadius: 8,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 20, fontWeight: 800, letterSpacing: '.06em', color: COLOURS.inkSign,
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
      {BUILDINGS.map((c, i) => (
        <div key={i} style={{ position: 'absolute', left: 40 + i * 190, top: 40 + (i % 2) * 22, width: 150, height: 130 - (i % 2) * 18, background: c }} />
      ))}
      <div style={{
        position: 'absolute', left: 0, top: 96, width: BOARD_W, height: 96,
        background: `linear-gradient(180deg, ${COLOURS.street}, ${COLOURS.streetBot})`,
      }} />
      <Stall side="left"  label="FRESH FRUITS"   stripe={COLOURS.stallRed}  stripeEdge={COLOURS.stallRedEdge} />
      <Stall side="right" label="BAKERY & DAIRY" stripe={COLOURS.stallBlue} stripeEdge={COLOURS.stallBlueEdge} />
      {STALL_GOODS.map((g, i) => (
        <div key={i} style={{
          position: 'absolute', left: g.left, top: BOARD_H - g.bottom - 340, width: g.w, height: g.h,
          background: g.c, borderRadius: 6, boxShadow: 'inset 0 -6px 0 rgba(0,0,0,.14)',
        }} />
      ))}
    </div>
  );
}
