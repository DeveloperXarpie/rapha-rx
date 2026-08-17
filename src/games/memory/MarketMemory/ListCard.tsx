import { LIST_CARD } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';

interface ListCardProps {
  items: Item[];
  /** Blanks the rows. Set only once the blind has landed. */
  covered: boolean;
  reduced: boolean;
}

export default function ListCard({ items, covered, reduced }: ListCardProps) {
  return (
    <div style={{
      position: 'absolute', left: LIST_CARD.left, top: LIST_CARD.top, width: LIST_CARD.width,
      zIndex: 6, background: COLOURS.creamLight, border: `4px solid ${COLOURS.creamBorder}`,
      borderRadius: 18, overflow: 'hidden', fontFamily: "'Baloo 2', sans-serif",
    }}>
      <div style={{
        background: COLOURS.purple, color: COLOURS.creamLight, fontSize: 27, fontWeight: 800,
        textAlign: 'center', padding: '10px 0', borderBottom: `5px solid ${COLOURS.purpleEdge}`,
      }}>
        Shopping list
      </div>

      <div style={{ padding: '12px 16px', display: 'flex', flexDirection: 'column', gap: 8, minHeight: 120 }}>
        {items.map((it, i) => (
          <div
            key={it.id}
            style={{
              display: 'flex', alignItems: 'center', gap: 14, height: 64,
              opacity: covered ? 0 : 1,
              transition: 'opacity 120ms linear',
              animation: reduced ? `mm-fade 300ms ease ${i * 90}ms both` : `mm-slidein 300ms cubic-bezier(.22,.61,.36,1) ${i * 90}ms both`,
            }}
          >
            <Product item={it} size={60} />
            <span style={{ fontSize: 30, fontWeight: 700, color: COLOURS.ink }}>{it.name}</span>
          </div>
        ))}
      </div>

      <div style={{
        background: COLOURS.cream, borderTop: `3px solid ${COLOURS.creamBorder}`,
        textAlign: 'center', padding: '8px 0', fontSize: 20, fontWeight: 700, color: COLOURS.inkSoft,
        opacity: covered ? 0 : 1, transition: 'opacity 120ms linear',
      }}>
        Find these items!
      </div>
    </div>
  );
}
