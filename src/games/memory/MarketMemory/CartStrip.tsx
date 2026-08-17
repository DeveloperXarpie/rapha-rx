import { CART, CART_BLOCK_W, SLOT_GAP, SUBMIT_W, slotWidth } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { EASE_SETTLE } from './styles';

interface CartStripProps {
  /** One entry per list slot; null is an empty slot. */
  slots: (Item | null)[];
  listLength: number;
  submitEnabled: boolean;
  cartLabel: string;
  submitLabel: string;
  reduced: boolean;
  onRemove: (slot: number) => void;
  onSubmit: () => void;
}

export default function CartStrip({
  slots, listLength, submitEnabled, cartLabel, submitLabel, reduced, onRemove, onSubmit,
}: CartStripProps) {
  const w = slotWidth(listLength);

  return (
    <div style={{
      position: 'absolute', left: CART.left, top: CART.top, width: CART.width, height: CART.height,
      zIndex: 7, display: 'flex', alignItems: 'center', gap: SLOT_GAP,
      fontFamily: "'Baloo 2', sans-serif",
    }}>
      <div style={{
        width: CART_BLOCK_W, height: 124, flex: '0 0 auto',
        background: COLOURS.purple, borderBottom: `6px solid ${COLOURS.purpleEdge}`, borderRadius: 16,
        display: 'flex', alignItems: 'center', justifyContent: 'center', textAlign: 'center',
        fontSize: 22, fontWeight: 800, color: COLOURS.creamLight, padding: 6, boxSizing: 'border-box',
      }}>
        {cartLabel}
      </div>

      <div style={{ flex: '1 1 auto', minWidth: 0, display: 'flex', gap: SLOT_GAP, justifyContent: 'center' }}>
        {slots.map((it, i) => (
          <button
            key={i}
            type="button"
            disabled={!it}
            onClick={() => it && onRemove(i)}
            aria-label={it ? it.name : undefined}
            style={{
              width: w, height: 124, flex: '0 0 auto', padding: 0,
              background: it ? COLOURS.creamSlot : 'transparent',
              border: it ? `4px solid ${COLOURS.creamBorder}` : `4px dashed ${COLOURS.slotDash}`,
              borderRadius: 14, boxSizing: 'border-box',
              cursor: it ? 'pointer' : 'default',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              animation: it ? (reduced ? 'mm-fade 240ms ease both' : `mm-slidein 240ms ${EASE_SETTLE} both`) : undefined,
            }}
          >
            {it && <Product item={it} size={62} />}
          </button>
        ))}
      </div>

      <button
        type="button"
        onClick={onSubmit}
        disabled={!submitEnabled}
        style={{
          width: SUBMIT_W, height: 124, flex: '0 0 auto',
          background: submitEnabled ? COLOURS.green : COLOURS.greenMuted,
          // `border` must come first: the shorthand would otherwise wipe out borderBottom.
          border: 'none',
          borderBottom: `7px solid ${submitEnabled ? COLOURS.greenEdge : '#7A9273'}`,
          borderRadius: 16,
          fontSize: 34, fontWeight: 800, color: '#FFFFFF',
          fontFamily: "'Baloo 2', sans-serif",
          cursor: submitEnabled ? 'pointer' : 'default',
        }}
      >
        {submitLabel}
      </button>
    </div>
  );
}
