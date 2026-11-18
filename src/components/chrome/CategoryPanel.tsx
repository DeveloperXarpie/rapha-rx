import { useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { tileArt, type GameCatalogEntry } from '../../lib/gameCatalog';
import type { CategoryStatus } from '../../lib/sessionLedger';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { staggerDelay } from './transitions';
import { BRAND, type GameCategory } from '../../styles/tokens';

const HEADING: Record<GameCategory, { key: string; fallback: string }> = {
  memory:    { key: 'home.panel.memory',    fallback: 'Boost Your MEMORY' },
  attention: { key: 'home.panel.attention', fallback: 'Build Your FOCUS' },
  executive: { key: 'home.panel.executive', fallback: 'Strengthen Your PLANNING' },
};

const TILE = 96;
const LOCK_MS = 400;
const BOUNCE_MS = 520;

interface Props {
  category: GameCategory;
  status: CategoryStatus;
  games: GameCatalogEntry[];
  /** Play the unlock animation now (FINAL_SPEC 5.3). */
  unlocking: boolean;
  onTileTap: (gameId: string) => void;
  onUnlockAnimationEnd: () => void;
}

/**
 * One category on Home, per Mock 1: a heading bar over the category's games.
 *
 * A locked panel greys its tiles but keeps them tappable, so Home can explain why
 * they are locked (6.2). Mock 1's empty side slots are not drawn (C7 open).
 */
export default function CategoryPanel({
  category, status, games, unlocking, onTileTap, onUnlockAnimationEnd,
}: Props) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const animate = unlocking && !reduced;
  const showLock = status === 'locked' || animate;

  // The animation's end is a timer rather than animationend events: the panel
  // must report completion even when a tile's image never loads.
  useEffect(() => {
    if (!unlocking) return;
    if (reduced) { onUnlockAnimationEnd(); return; }
    const total = LOCK_MS + staggerDelay(Math.max(0, games.length - 1)) + BOUNCE_MS;
    const id = setTimeout(onUnlockAnimationEnd, total);
    return () => clearTimeout(id);
  }, [unlocking, reduced, games.length, onUnlockAnimationEnd]);

  const heading = HEADING[category];
  const locked = status === 'locked';

  return (
    <section
      aria-label={t(heading.key, heading.fallback)}
      style={{
        position: 'relative', borderRadius: 18, background: BRAND.surfaceStrong,
        padding: '0 0 14px', overflow: 'hidden',
      }}
    >
      <h2
        className="font-baloo"
        style={{
          background: 'rgba(4,14,80,0.45)', color: '#FFFFFF', textAlign: 'center',
          fontSize: 19, fontWeight: 700, letterSpacing: '0.04em', padding: '8px 12px',
        }}
      >
        {t(heading.key, heading.fallback)}
      </h2>

      {showLock && (
        <span
          aria-hidden="true"
          style={{
            position: 'absolute', top: 6, right: 12, fontSize: 24, lineHeight: 1,
            animation: animate ? `home-lock-off ${LOCK_MS}ms ease forwards` : undefined,
          }}
        >
          &#128274;
        </span>
      )}

      <div style={{ display: 'flex', justifyContent: 'center', gap: 18, paddingTop: 12 }}>
        {games.map((game, i) => (
          <button
            key={game.id}
            onClick={() => onTileTap(game.id)}
            aria-disabled={locked || undefined}
            style={{ width: TILE, minHeight: 80, textAlign: 'center' }}
          >
            <img
              src={tileArt(game)}
              alt=""
              aria-hidden="true"
              width={TILE}
              height={TILE}
              style={{
                width: TILE, height: TILE, borderRadius: 16,
                boxShadow: locked ? 'none' : '0 8px 16px rgba(4,14,80,0.3)',
                filter: locked ? 'grayscale(0.9)' : undefined,
                opacity: locked ? 0.5 : 1,
                animation: animate
                  ? `home-tile-bounce ${BOUNCE_MS}ms ease ${LOCK_MS + staggerDelay(i)}ms both`
                  : undefined,
              }}
            />
            <p
              className="font-baloo"
              style={{
                fontSize: 15, fontWeight: 700, lineHeight: 1.2, marginTop: 6,
                color: locked ? BRAND.muted : '#FFFFFF',
              }}
            >
              {t(game.nameKey, game.id)}
            </p>
          </button>
        ))}
      </div>
    </section>
  );
}
