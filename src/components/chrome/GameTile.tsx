import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';

/**
 * A free-play grid tile. Games with no commissioned art fall back to their
 * category icon, which sits on a white chip so it reads as a deliberate tier
 * rather than a broken image.
 */
export default function GameTile({
  game, onClick,
}: { game: GameCatalogEntry; onClick: () => void }) {
  const { t } = useTranslation();
  const hasArt = game.tile !== null;

  return (
    <button onClick={onClick} style={{ width: '100%', textAlign: 'center' }}>
      <div
        style={{
          width: '100%', aspectRatio: '1 / 1', borderRadius: 16,
          background: hasArt ? 'transparent' : '#FFFFFF',
          boxShadow: '0 10px 20px rgba(4,14,80,0.28)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          overflow: 'hidden',
        }}
      >
        <img
          src={tileArt(game)}
          alt=""
          aria-hidden="true"
          style={hasArt
            ? { width: '100%', height: '100%', objectFit: 'cover' }
            : { width: '64%', height: '64%', objectFit: 'contain' }}
        />
      </div>
      <p
        className="font-baloo"
        /*
         * 17, up from 15, per the Sep-10 review. Longer names wrap to two lines in the
         * three-column grid at this size, which is why the grid's rows are free to
         * stretch rather than being a fixed height.
         */
        style={{ fontSize: 17, fontWeight: 700, color: '#FFFFFF', marginTop: 8, lineHeight: 1.2 }}
      >
        {t(game.nameKey, game.id)}
      </p>
    </button>
  );
}
