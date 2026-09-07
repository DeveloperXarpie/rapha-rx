import { CRATE_H, CRATE_TOP_CLEARANCE, CRATE_W, crateBox } from './geometry';
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

/*
 * The name plate gets two lines and the crate grew to hold them.
 *
 * The name is what actually carries the round - five bowls of split pulses differ only
 * in shade, so the text is the signal and the sprite is decoration - but the plate was a
 * single `nowrap` line with `overflow: hidden`, which silently centre-clipped anything
 * too long. "Vine Tomatoes" rendered as "ine Tomatoe" and "Sambar Masala" was cut at
 * both ends, at the original 18px, on the two items where reading the name matters most.
 *
 * 20px is the largest size at which no name in the catalogue clips: measured across all
 * 62 of them, the binding case is "Pomegranate", a single word that cannot wrap and
 * needs 121px of the 122px a crate has to give. Above that it clips again.
 */
const PLATE_H = 50;

/*
 * 22px, up from 20 on the old art, because the crate is 150px wide here instead of 132.
 * The binding case across all 62 names is "Pomegranate" - a single word that cannot
 * wrap - which needs 133px of the 140px a plate now has to give. It needed 133 of 122
 * before, which is why it had to be 20px then.
 */
const PLATE_FONT = 22;

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
        <Product item={item} size={CRATE_H - PLATE_H - CRATE_TOP_CLEARANCE} />
      </div>

      <span style={{
        width: '100%',
        background: COLOURS.creamLight,
        border: `3px solid ${picked ? COLOURS.greenPick : COLOURS.creamBorder}`,
        borderRadius: 9,
        boxSizing: 'border-box',
        height: PLATE_H,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        padding: '0 2px',
        fontSize: PLATE_FONT, fontWeight: 700, color: COLOURS.ink, letterSpacing: '.01em',
        lineHeight: 1.05, textAlign: 'center',
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
