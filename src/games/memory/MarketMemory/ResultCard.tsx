import { BY_ID } from './items';
import { COLOURS } from './palette';
import Product from './Product';
import type { ResultRow, RowStatus } from './round';
import { EASE_SETTLE } from './styles';

/** Stagger between consecutive badges landing, so the card reads as a check-through. */
const BADGE_STAGGER_MS = 60;
const TILE = 118;

interface Labels {
  title: string;
  action: string;
}

interface ResultCardProps {
  rows: ResultRow[];
  perfect: boolean;
  labels: Labels;
  reduced: boolean;
  onContinue: () => void;
}

const BADGE: Record<RowStatus, { glyph: string; bg: string; edge: string }> = {
  correct: { glyph: '\u2713', bg: COLOURS.greenPick, edge: COLOURS.greenEdge },
  wrong:   { glyph: '\u2715', bg: COLOURS.redDeep,   edge: '#8E2721'          },
  missed:  { glyph: '?',      bg: COLOURS.amber,     edge: COLOURS.amberEdge  },
};

/**
 * The end-of-round card: the shopping list marked up item by item.
 *
 * It replaced a one-line count ("2 of 3 right, 1 not on the list, 1 missed"), which told
 * the resident how they did without telling them *what* they got wrong - useless as
 * feedback for a memory exercise, where the whole value is knowing which item slipped.
 *
 * The badge sits on the artwork rather than beside it so the item and its verdict are one
 * thing to look at. Badges land staggered, in row order, so the card plays as the list
 * being checked off rather than as a verdict appearing all at once.
 */
export default function ResultCard({ rows, perfect, labels, reduced, onContinue }: ResultCardProps) {
  // Four across holds the widest round - a six-item list plus six wrong picks - in three
  // rows without the card outgrowing the board.
  const columns = Math.min(4, Math.max(1, rows.length));

  return (
    <>
      <div style={{ position: 'absolute', inset: 0, zIndex: 9, background: 'rgba(11,44,56,.55)' }} />
      <div style={{
        position: 'absolute', left: '50%', top: '50%', zIndex: 10, width: 640,
        background: COLOURS.creamLight, border: `5px solid ${COLOURS.creamBorder}`, borderRadius: 22,
        padding: '32px 28px', textAlign: 'center',
        animation: `mm-cardin 260ms ${EASE_SETTLE} both`,
      }}>
        <div style={{
          fontSize: 46, fontWeight: 800,
          color: perfect ? COLOURS.greenResult : COLOURS.purple,
        }}>
          {labels.title}
        </div>

        <div
          role="list"
          style={{
            display: 'grid',
            gridTemplateColumns: `repeat(${columns}, ${TILE}px)`,
            justifyContent: 'center',
            gap: '18px 20px',
            margin: '26px 0 28px',
          }}
        >
          {rows.map((row, i) => {
            const item = BY_ID[row.id];
            const badge = BADGE[row.status];
            return (
              <div
                key={row.id}
                role="listitem"
                style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 4 }}
              >
                <div style={{ position: 'relative' }}>
                  <Product item={item} size={TILE - 28} />
                  <span
                    aria-hidden="true"
                    style={{
                      position: 'absolute', right: -10, top: -10,
                      width: 42, height: 42, borderRadius: '50%',
                      background: badge.bg, border: `3px solid ${badge.edge}`, boxSizing: 'border-box',
                      color: '#FFFFFF', fontSize: 24, fontWeight: 800, lineHeight: 1,
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                      // mm-pop, not mm-cardin: mm-cardin carries a centring translate
                      // that would drag the badge off its corner. See styles.tsx.
                      animation: reduced
                        ? `mm-fade 200ms ease ${i * BADGE_STAGGER_MS}ms both`
                        : `mm-pop 260ms ${EASE_SETTLE} ${i * BADGE_STAGGER_MS}ms both`,
                    }}
                  >
                    {badge.glyph}
                  </span>
                </div>
                <span style={{
                  fontSize: 17, fontWeight: 700, lineHeight: 1.1, color: COLOURS.ink,
                  maxWidth: TILE, overflowWrap: 'break-word',
                }}>
                  {item.name}
                </span>
              </div>
            );
          })}
        </div>

        <button
          type="button"
          onClick={onContinue}
          style={{
            background: COLOURS.green, border: 'none', borderBottom: `7px solid ${COLOURS.greenEdge}`,
            borderRadius: 16, padding: '14px 40px',
            fontFamily: "'Baloo 2', sans-serif", fontSize: 34, fontWeight: 800, color: '#FFFFFF',
            cursor: 'pointer',
          }}
        >
          {labels.action}
        </button>
      </div>
    </>
  );
}
