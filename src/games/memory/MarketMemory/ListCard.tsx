import { CLIPBOARD, LIST_ROW_H, LIST_RULE_Y, listStartBand } from './geometry';
import { listRowStyles } from './listRowStyles';
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
  /*
   * Rows sit in the bands between the clipboard's printed rules rather than in a
   * flex column centred on the paper. Centring at an unrelated row height is what
   * put a name across a printed line - the Sep-9 review's "alignment issue".
   */
  const startBand = listStartBand(items.length);

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

      {items.map((it, i) => {
        const style = listRowStyles(i, covered, reduced);
        // The band's own top, relative to the clipboard sprite this sits inside.
        const bandTop = LIST_RULE_Y[Math.min(startBand + i, LIST_RULE_Y.length - 2)] - CLIPBOARD.top;
        return (
          // Two elements, not one: the outer owns the entrance animation and the inner
          // owns the blanking. See listRowStyles for why they cannot be the same node.
          <div
            key={it.id}
            style={{
              position: 'absolute',
              left: 42, right: 34,
              top: bandTop, height: LIST_ROW_H,
              ...style.entrance,
            }}
          >
            <div style={{
              display: 'flex', alignItems: 'center', gap: 18, height: '100%',
              ...style.content,
            }}>
              <Product item={it} size={LIST_ROW_H - 14} />
              <span style={{
                fontSize: 30, fontWeight: 700, color: COLOURS.ink,
                // The name is the row's own; it must not run over the next item's art.
                whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
              }}>
                {it.name}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
}
