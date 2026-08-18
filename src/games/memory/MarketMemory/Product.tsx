import { useState } from 'react';
import { spriteFor, type Item } from './items';
import { COLOURS, GROUP_TINT } from './palette';

interface ProductProps {
  item: Item;
  /** Stage size in design px. 92 on a shelf, 74 in a cart slot, 68 in the list. */
  size: number;
}

/**
 * The item's artwork.
 *
 * If the sprite fails to load - a bad deploy, a cold cache on a flaky connection - it
 * falls back to a panel tinted by the item's group with its name across it. That is
 * deliberately generic rather than a per-item drawing: the round only has to stay
 * readable and completable, and the name plate the caller renders is what the player
 * actually reads to tell twins apart.
 */
export default function Product({ item, size }: ProductProps) {
  const [failed, setFailed] = useState(false);

  if (failed) {
    return (
      <div
        aria-hidden="true"
        style={{
          width: size, height: size,
          background: GROUP_TINT[item.group],
          border: `${Math.max(2, size * 0.04)}px solid ${COLOURS.creamBorder}`,
          borderRadius: size * 0.16,
          boxSizing: 'border-box',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          padding: size * 0.08,
          textAlign: 'center', lineHeight: 1.05,
          fontFamily: "'Baloo 2', sans-serif",
          fontSize: size * 0.19, fontWeight: 800, color: '#FFFFFF',
          textShadow: '0 2px 0 rgba(40,26,10,.5)',
          overflow: 'hidden',
        }}
      >
        {item.name}
      </div>
    );
  }

  return (
    <img
      src={spriteFor(item)}
      alt=""
      aria-hidden="true"
      draggable={false}
      onError={() => setFailed(true)}
      style={{ width: size, height: size, objectFit: 'contain', display: 'block' }}
    />
  );
}
