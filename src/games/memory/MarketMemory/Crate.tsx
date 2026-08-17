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
  reduced: boolean;
  /** Receives the board-space tap point so the caller can float a toast there. */
  onTap: (index: number, x: number, y: number) => void;
}

export default function Crate({ item, index, picked, hinted, reduced, onTap }: CrateProps) {
  const box = crateBox(index);
  const border = picked ? COLOURS.greenPick : hinted ? COLOURS.amber : COLOURS.woodDark;

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
        cursor: 'pointer',
        background: `linear-gradient(180deg, ${COLOURS.woodLight} 0%, ${COLOURS.woodDark} 100%)`,
        border: `5px solid ${border}`,
        borderBottom: `7px solid ${picked ? COLOURS.greenEdge : COLOURS.woodDarker}`,
        borderRadius: 14,
        boxSizing: 'border-box',
        opacity: picked ? 0.82 : 1,
        transform: reduced || !picked ? 'translateY(0)' : 'translateY(-5px)',
        transition: `transform 220ms ${EASE_SETTLE}, opacity 220ms linear, border-color 220ms linear`,
        animation: hinted && !reduced ? 'mm-glow 2000ms ease-in-out infinite' : undefined,
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'flex-end',
        gap: 2,
        fontFamily: "'Baloo 2', sans-serif",
      }}
    >
      <Product item={item} size={78} />
      <span style={{ fontSize: 19, fontWeight: 700, color: COLOURS.creamLight, lineHeight: 1.1, paddingBottom: 4 }}>
        {item.name}
      </span>
      {picked && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', right: -8, top: -8, width: 34, height: 34, borderRadius: '50%',
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
