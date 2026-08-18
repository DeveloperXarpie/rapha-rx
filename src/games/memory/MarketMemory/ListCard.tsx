import { CLIPBOARD, CLIPBOARD_PAPER } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { UI_CLIPBOARD } from './sprites';
import { EASE_SETTLE } from './styles';

interface ListCardProps {
  items: Item[];
  /** Blanks the rows. Set only once the cover has landed. */
  covered: boolean;
  /** Slides the whole board off once shopping starts. */
  leaving: boolean;
  reduced: boolean;
}

/**
 * The shopping list on its clipboard.
 *
 * The clipboard is a single sprite with its own header and rules already painted in, so
 * the rows are positioned against the measured paper rectangle inside it rather than
 * against the sprite's own edges.
 */
export default function ListCard({ items, covered, leaving, reduced }: ListCardProps) {
  const rowH = Math.min(120, CLIPBOARD_PAPER.height / Math.max(items.length, 1));

  return (
    <div
      style={{
        position: 'absolute',
        left: CLIPBOARD.left,
        top: CLIPBOARD.top,
        width: CLIPBOARD.width,
        height: CLIPBOARD.height,
        zIndex: 6,
        fontFamily: "'Baloo 2', sans-serif",
        opacity: leaving ? 0 : 1,
        transform: leaving && !reduced ? 'translateY(-90px) scale(.94)' : 'translateY(0) scale(1)',
        transition: `opacity 400ms linear, transform 400ms ${EASE_SETTLE}`,
        pointerEvents: 'none',
      }}
    >
      <img
        src={UI_CLIPBOARD}
        alt=""
        aria-hidden="true"
        draggable={false}
        style={{ width: '100%', height: '100%', display: 'block' }}
      />

      <div style={{
        position: 'absolute',
        left: CLIPBOARD_PAPER.left - CLIPBOARD.left,
        top: CLIPBOARD_PAPER.top - CLIPBOARD.top,
        width: CLIPBOARD_PAPER.width,
        height: CLIPBOARD_PAPER.height,
        display: 'flex', flexDirection: 'column', alignItems: 'stretch',
        // Centred, so a three-item list does not leave two thirds of the page blank.
        justifyContent: 'center',
        padding: '0 14px', boxSizing: 'border-box',
      }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 18, height: rowH,
              opacity: covered ? 0 : 1,
              transition: 'opacity 120ms linear',
              animation: reduced
                ? `mm-fade 300ms ease ${i * 90}ms both`
                : `mm-slidein 300ms ${EASE_SETTLE} ${i * 90}ms both`,
            }}
          >
            <Product item={it} size={Math.min(78, rowH - 12)} />
            <span style={{ fontSize: 30, fontWeight: 700, color: COLOURS.ink }}>{it.name}</span>
          </div>
        ))}
      </div>
    </div>
  );
}
