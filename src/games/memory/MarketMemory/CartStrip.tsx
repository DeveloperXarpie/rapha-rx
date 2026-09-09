import {
  CART, CART_HEADER_H, CART_PAD, DONE_BTN, HINT_BADGE, HINT_BTN, SLOT_GAP, slotWidth,
} from './geometry';
import type { Item } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import { UI_DONE } from './sprites';
import { UI_HINT, UI_UNDO } from '../../../lib/uiKit';
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
  /** HINT, which straddles the cart's top-left corner. */
  hintsLeft: number;
  hintEnabled: boolean;
  hintLabel: string;
  onHint: () => void;
}

/**
 * The cart tray and the DONE button.
 *
 * The tray is CSS rather than the kit's panel art: that art has "0/10" painted into its
 * header and ten slots printed on its face, and both the count and the slot count change
 * with the list length. The colours come from the same palette so it sits with the rest.
 */
export default function CartStrip({
  slots, listLength, interactive, submitEnabled, cartLabel, submitLabel, removeLabel, reduced,
  onRemove, onSubmit, hintsLeft, hintEnabled, hintLabel, onHint,
}: CartStripProps) {
  const w = slotWidth(listLength);
  const filled = slots.filter(Boolean).length;
  const slotH = CART.height - CART_HEADER_H - CART_PAD * 2;

  return (
    <>
      <div style={{
        position: 'absolute', left: CART.left, top: CART.top, width: CART.width, height: CART.height,
        zIndex: 7, boxSizing: 'border-box',
        // The wooden tray frame goes with the cream: the Sep-9 kit's cart is a clean
        // panel, so the frame is a thin edge of the header's own navy instead.
        background: COLOURS.panel,
        border: `4px solid ${COLOURS.panelInk}`,
        borderRadius: 20,
        overflow: 'hidden',
        fontFamily: "'Baloo 2', sans-serif",
        // The tray only mounts once the clipboard has cleared the board, so it arrives
        // on its own rather than popping in behind something else.
        animation: 'mm-fade 300ms ease both',
      }}>
        {/* The kit's titled panel: navy bar, pale body. See `ui_text panel_01.png`. */}
        <div style={{
          height: CART_HEADER_H, boxSizing: 'border-box',
          background: COLOURS.panelInk,
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          fontSize: 28, fontWeight: 800, color: '#FFFFFF', letterSpacing: '.06em',
        }}>
          {cartLabel}
          {/* Plain on the bar rather than on a plate of its own, per the Sep-9 mock. */}
          <span style={{
            position: 'absolute', right: 18, top: '50%', transform: 'translateY(-50%)',
            fontSize: 26, fontWeight: 800, color: '#FFFFFF', letterSpacing: 0,
          }}>
            {filled}/{listLength}
          </span>
        </div>

        <div style={{
          height: CART.height - CART_HEADER_H, boxSizing: 'border-box',
          padding: CART_PAD, background: COLOURS.panel,
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
                background: COLOURS.slotFill,
                border: `4px dashed ${COLOURS.slotBorder}`,
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
                thing to learn by experiment when the tap is destructive. The badge is the
                kit's undo icon, sized and placed like the tick on a picked crate so it
                reads as a control.
              */}
              {it && interactive && (
                <img
                  src={UI_UNDO}
                  alt=""
                  aria-hidden="true"
                  draggable={false}
                  style={{
                    position: 'absolute', right: -8, top: -8,
                    width: 34, height: 34,
                    display: 'block', pointerEvents: 'none',
                  }}
                />
              )}
            </button>
          ))}
        </div>
      </div>

      {/*
        HINT, straddling the cart's top-left corner where the Sep-9 review put it.

        A sibling of the tray rather than a child of it: the tray clips to its own
        rounded corners, and the disc is meant to hang outside them.
      */}
      <button
        type="button"
        onClick={onHint}
        disabled={!hintEnabled}
        aria-label={hintLabel}
        style={{
          position: 'absolute',
          left: HINT_BTN.left, top: HINT_BTN.top,
          width: HINT_BTN.width, height: HINT_BTN.height,
          zIndex: 8, padding: 0, border: 'none', background: 'transparent',
          opacity: hintEnabled ? 1 : 0.45,
          cursor: hintEnabled ? 'pointer' : 'default',
          animation: 'mm-fade 300ms ease both',
        }}
      >
        <img
          src={UI_HINT}
          alt=""
          aria-hidden="true"
          draggable={false}
          style={{ width: '100%', height: '100%', display: 'block' }}
        />
        {/*
          The count sits on the green badge painted into the art, so it is placed
          from HINT_BADGE's measured fractions rather than pinned to a corner.
        */}
        <span
          aria-hidden="true"
          style={{
            position: 'absolute',
            left: `${HINT_BADGE.cx * 100}%`,
            top: `${HINT_BADGE.cy * 100}%`,
            transform: 'translate(-50%, -50%)',
            fontSize: HINT_BTN.width * HINT_BADGE.d * 0.72,
            fontWeight: 800, lineHeight: 1, color: '#FFFFFF',
            fontFamily: "'Baloo 2', sans-serif",
          }}
        >
          {hintsLeft}
        </span>
      </button>

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
