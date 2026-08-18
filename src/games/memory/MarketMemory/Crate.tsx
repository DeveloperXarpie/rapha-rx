import { CRATE_H, CRATE_W, crateBox } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { EASE_SETTLE } from './styles';

interface CrateProps {
  item: Item;
  index: number;
  picked: boolean;
  hinted: boolean;
  /** The shelf is on screen from the first frame, but only live during `shopping`. */
  interactive: boolean;
  reduced: boolean;
  /** Receives the board-space tap point so the caller can float a toast there. */
  onTap: (index: number, x: number, y: number) => void;
}

const PLATE_H = 38;

/**
 * One item standing on the painted shelf, with its name on a plate beneath it.
 *
 * The plate is not decoration. Twins share a silhouette and a colour family on purpose -
 * five bowls of split pulses differ only in shade - so the name is the only reliable way
 * to tell them apart, and it has to hold contrast against the wood behind it.
 */
export default function Crate({ item, index, picked, hinted, interactive, reduced, onTap }: CrateProps) {
  const box = crateBox(index);

  return (
    <button
      type="button"
      onClick={() => onTap(index, box.left + CRATE_W / 2, box.top)}
      aria-pressed={picked}
      aria-label={item.name}
      style={{
        position: 'absolute',
        left: box.left,
        top: box.top,
        width: CRATE_W,
        height: CRATE_H,
        zIndex: 5,
        padding: 0,
        background: 'transparent',
        border: 'none',
        cursor: interactive ? 'pointer' : 'default',
        transform: reduced || !picked ? 'translateY(0)' : 'translateY(-6px)',
        transition: `transform 220ms ${EASE_SETTLE}, opacity 220ms linear`,
        opacity: picked ? 0.55 : 1,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <div
        style={{
          position: 'relative',
          display: 'flex', alignItems: 'flex-end', justifyContent: 'center',
          borderRadius: 14,
          padding: 2,
          // The hint glows the item itself; there is no crate frame to outline any more.
          boxShadow: hinted ? `0 0 0 5px ${COLOURS.amber}` : 'none',
          animation: hinted && !reduced ? 'mm-glow 2000ms ease-in-out infinite' : undefined,
        }}
      >
        <Product item={item} size={CRATE_H - PLATE_H - 8} />
      </div>

      <span style={{
        width: '100%',
        background: COLOURS.creamLight,
        border: `3px solid ${picked ? COLOURS.greenPick : COLOURS.creamBorder}`,
        borderRadius: 9,
        boxSizing: 'border-box',
        height: PLATE_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 4px',
        fontSize: 18, fontWeight: 700, color: COLOURS.ink, letterSpacing: '.01em',
        lineHeight: 1,
        whiteSpace: 'nowrap', overflow: 'hidden',
      }}>
        {item.name}
      </span>

      {picked && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', right: -6, top: -6, width: 34, height: 34, borderRadius: '50%',
            background: COLOURS.greenPick, color: '#FFFFFF', fontSize: 20, fontWeight: 800,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            border: `3px solid ${COLOURS.greenEdge}`,
            animation: 'mm-fade 180ms ease both',
          }}
        >
          ✓
        </span>
      )}
    </button>
  );
}
