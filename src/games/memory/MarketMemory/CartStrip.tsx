import { CART, CART_HEADER_H, CART_PAD, DONE_BTN, SLOT_GAP, slotWidth } from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { UI_DONE } from './sprites';
import { EASE_SETTLE } from './styles';

interface CartStripProps {
  /** One entry per list slot; null is an empty slot. */
  slots: (Item | null)[];
  listLength: number;
  /** False once the round is scored: the slots stop being removable, so the hint goes. */
  interactive: boolean;
  submitEnabled: boolean;
  cartLabel: string;
  submitLabel: string;
  reduced: boolean;
  /** Label for a filled slot, e.g. "Remove Toor Dal". Takes the item name. */
  removeLabel: (name: string) => string;
  onRemove: (slot: number) => void;
  onSubmit: () => void;
}

/**
 * The cart tray and the DONE button.
 *
 * The tray is CSS rather than the kit's panel art: that art has "0/10" painted into its
 * header and ten slots printed on its face, and both the count and the slot count change
 * with the list length. The colours come from the same palette so it sits with the rest.
 */
export default function CartStrip({
  slots, listLength, interactive, submitEnabled, cartLabel, submitLabel, removeLabel, reduced, onRemove, onSubmit,
}: CartStripProps) {
  const w = slotWidth(listLength);
  const filled = slots.filter(Boolean).length;
  const slotH = CART.height - CART_HEADER_H - CART_PAD * 2;

  return (
    <>
      <div style={{
        position: 'absolute', left: CART.left, top: CART.top, width: CART.width, height: CART.height,
        zIndex: 7, boxSizing: 'border-box',
        background: `linear-gradient(180deg, ${COLOURS.woodLight} 0%, ${COLOURS.woodDark} 100%)`,
        border: `6px solid ${COLOURS.woodDarker}`,
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: "'Baloo 2', sans-serif",
        // The tray only mounts once the clipboard has cleared the board, so it arrives
        // on its own rather than popping in behind something else.
        animation: 'mm-fade 300ms ease both',
      }}>
        <div style={{
          height: CART_HEADER_H, boxSizing: 'border-box',
          background: COLOURS.navyPlate, borderBottom: `4px solid ${COLOURS.navyPlateEdge}`,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.06em',
        }}>
          {cartLabel}
          <span style={{
            position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
            background: COLOURS.creamLight, border: `2px solid ${COLOURS.creamBorder}`,
            borderRadius: 9, padding: '2px 12px',
            fontSize: 22, fontWeight: 800, color: COLOURS.inkSign, letterSpacing: 0,
          }}>
            {filled}/{listLength}
          </span>
        </div>

        <div style={{
          height: CART.height - CART_HEADER_H, boxSizing: 'border-box',
          padding: CART_PAD, background: COLOURS.cream,
          display: 'flex', gap: SLOT_GAP, alignItems: 'center', justifyContent: 'center',
        }}>
          {slots.map((it, i) => (
            <button
              key={i}
              type="button"
              disabled={!it}
              onClick={() => it && onRemove(i)}
              aria-label={it ? removeLabel(it.name) : undefined}
              style={{
                position: 'relative',
                width: w, height: slotH, flex: '0 0 auto', padding: 0,
                background: it ? COLOURS.creamSlot : 'rgba(255,255,255,.35)',
                border: it ? `4px solid ${COLOURS.creamBorder}` : `4px dashed ${COLOURS.slotDash}`,
                borderRadius: 14, boxSizing: 'border-box',
                cursor: it ? 'pointer' : 'default',
                display: 'flex', alignItems: 'center', justifyContent: 'center',
                // `overflow: visible` is the default, but the badge below hangs outside
                // the slot and this is the one place that would be easy to clip later.
                overflow: 'visible',
              }}
            >
              {/*
                The entrance animation is on this inner wrapper, not on the button. Both
                mm-fade and mm-slidein end on `opacity: 1` with fill `both`, so a button
                carrying either could never afterwards be dimmed - see styles.tsx.
              */}
              {it && (
                <div style={{
                  display: 'flex', alignItems: 'center', justifyContent: 'center',
                  width: '100%', height: '100%',
                  animation: reduced ? 'mm-fade 240ms ease both' : `mm-slidein 240ms ${EASE_SETTLE} both`,
                }}>
                  <Product item={it} size={Math.min(w, slotH) - 20} />
                </div>
              )}

              {/*
                The undo hint. A filled slot has always been removable by tapping it, but
                nothing said so - the resident had to tap one to find out, which is a poor
                thing to learn by experiment when the tap is destructive. Same badge
                language as the tick on a picked crate, so it reads as a control.
              */}
              {it && interactive && (
                <span
                  aria-hidden="true"
                  style={{
                    position: 'absolute', right: -8, top: -8,
                    width: 34, height: 34, borderRadius: '50%',
                    background: COLOURS.amber, border: `3px solid ${COLOURS.amberEdge}`,
                    boxSizing: 'border-box',
                    color: '#FFFFFF', fontSize: 20, fontWeight: 800, lineHeight: 1,
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                  }}
                >
                  &#8630;
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {/*
        The entrance fade lives on the wrapper and the disabled dimming on the button.
        Putting both on one element does not work: `mm-fade` runs with fill `both`, so its
        final `opacity: 1` outranks the declaration and the button never dims.
      */}
      <div style={{
        position: 'absolute',
        left: DONE_BTN.left, top: DONE_BTN.top, width: DONE_BTN.width, height: DONE_BTN.height,
        zIndex: 7,
        animation: 'mm-fade 300ms ease both',
      }}>
        <button
          type="button"
          onClick={onSubmit}
          disabled={!submitEnabled}
          aria-label={submitLabel}
          style={{
            width: '100%', height: '100%',
            padding: 0, border: 'none', background: 'transparent',
            opacity: submitEnabled ? 1 : 0.5,
            filter: submitEnabled ? 'none' : 'grayscale(.55)',
            cursor: submitEnabled ? 'pointer' : 'default',
            transition: 'opacity 200ms linear, filter 200ms linear',
          }}
        >
          <img
            src={UI_DONE}
            alt=""
            aria-hidden="true"
            draggable={false}
            style={{ width: '100%', height: '100%', display: 'block' }}
          />
        </button>
      </div>
    </>
  );
}
