import { categoryIcon } from '../../lib/gameCatalog';
import type { GameCategory } from '../../styles/tokens';

/**
 * The white rounded badge holding a category icon. 132px on the intro screens,
 * 52px as the summary row chip.
 */
export default function CategoryBadge({
  category, size = 132,
}: { category: GameCategory; size?: number }) {
  const radius = Math.round(size * (34 / 132));
  const icon = Math.round(size * (104 / 132));
  return (
    <div
      style={{
        width: size, height: size, borderRadius: radius,
        background: '#FFFFFF',
        boxShadow: '0 8px 20px rgba(42,33,64,0.16)',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        flexShrink: 0,
      }}
    >
      <img
        src={categoryIcon(category)}
        alt=""
        aria-hidden="true"
        width={icon}
        height={icon}
        style={{ width: icon, height: icon }}
      />
    </div>
  );
}
