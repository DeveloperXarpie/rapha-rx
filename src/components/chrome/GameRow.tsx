import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';
import { BRAND } from '../../styles/tokens';
import type { GameCategory } from '../../styles/tokens';

const CATEGORY_LABEL_KEY: Record<GameCategory, string> = {
  memory:    'category.memory',
  attention: 'category.attention',
  executive: 'category.planning',
};

const CATEGORY_FALLBACK: Record<GameCategory, string> = {
  memory: 'MEMORY', attention: 'ATTENTION', executive: 'PLANNING',
};

interface Props {
  game: GameCatalogEntry;
  /** Null or undefined renders no level line, rather than "level 0". */
  lastLevel?: number | null;
  onClick?: () => void;
}

/** One of Home's three "today's games" rows. */
export default function GameRow({ game, lastLevel, onClick }: Props) {
  const { t } = useTranslation();
  const Tag = onClick ? 'button' : 'div';

  return (
    <Tag
      onClick={onClick}
      className="w-full text-left"
      style={{
        background: BRAND.surface,
        borderRadius: 20,
        padding: '12px 16px 12px 12px',
        display: 'flex',
        alignItems: 'center',
        gap: 14,
      }}
    >
      <img
        src={tileArt(game)}
        alt=""
        aria-hidden="true"
        width={74}
        height={74}
        style={{ width: 74, height: 74, borderRadius: 16, flexShrink: 0, objectFit: 'cover' }}
      />
      <div style={{ minWidth: 0 }}>
        <p
          className="font-baloo"
          style={{ fontSize: 14, fontWeight: 700, letterSpacing: '0.12em', color: BRAND.cyan }}
        >
          {t(CATEGORY_LABEL_KEY[game.category], CATEGORY_FALLBACK[game.category]).toUpperCase()}
        </p>
        <p className="font-baloo" style={{ fontSize: 21, fontWeight: 700, color: '#FFFFFF' }}>
          {t(game.nameKey, game.id)}
        </p>
        {lastLevel != null && (
          <p className="font-baloo" style={{ fontSize: 18, fontWeight: 700, color: BRAND.lime }}>
            {t('home.lastLevel', 'Last time: level {{level}}', { level: lastLevel })}
          </p>
        )}
      </div>
    </Tag>
  );
}
