import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import CategoryBadge from '../components/chrome/CategoryBadge';
import ProgressBar from '../components/chrome/ProgressBar';
import { CATEGORY_BRAND } from '../styles/tokens';
import type { GameCategory } from '../styles/tokens';

/** How long the intro holds before advancing itself. From the handoff. */
const INTRO_MS = 2000;

const CATEGORIES: GameCategory[] = ['memory', 'attention', 'executive'];

/** "Train Your" sits darker on the memory wash than on the other two. */
const HEADING_COLOR: Record<GameCategory, string> = {
  memory: '#2A2140',
  attention: '#17253F',
  executive: '#17253F',
};

const NAME_KEY: Record<GameCategory, string> = {
  memory: 'intro.memory.name',
  attention: 'intro.attention.name',
  executive: 'intro.planning.name',
};
const BODY_KEY: Record<GameCategory, string> = {
  memory: 'intro.memory.body',
  attention: 'intro.attention.body',
  executive: 'intro.planning.body',
};
const BAND_KEY: Record<GameCategory, string> = {
  memory: 'intro.memory.band',
  attention: 'intro.attention.band',
  executive: 'intro.planning.band',
};

/**
 * The screen between two games. Replaces the old RotationScreen, which had a
 * button; this one holds for two seconds and advances itself.
 */
export default function CategoryIntro() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const session = useAppStore((s) => s.currentSession);
  const firedRef = useRef(false);

  const cat = CATEGORIES.includes(category as GameCategory)
    ? (category as GameCategory)
    : null;
  const gameId = session.currentGameId;

  useEffect(() => {
    // The guard stops a re-render restarting the timer; the cleanup stops an
    // unmounted screen firing a stale navigation after the resident has moved
    // on. Both are needed, and the old RotationScreen only had the first.
    if (firedRef.current) return;

    if (!cat || !gameId) {
      navigate('/app/home', { replace: true });
      return;
    }
    firedRef.current = true;

    // The event the old rotation screen fired. Kept, and kept in shape, so the
    // existing metric stays continuous across the redesign.
    const completed = session.categoriesCompleted;
    track('category_rotated', {
      fromCategory: completed[completed.length - 1] ?? 'unknown',
      toCategory: cat,
      secondsPlayed: session.secondsInCurrentCategory,
    });

    const id = setTimeout(() => navigate(`/app/game/${gameId}/title`), INTRO_MS);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [cat, gameId, navigate]);

  if (!cat) return null;

  const brand = CATEGORY_BRAND[cat];

  return (
    <div
      className="flex-1 min-h-0 flex flex-col items-center"
      style={{ background: brand.gradient, overflowX: 'hidden' }}
    >
      <img
        src="/brand/logo-navy.png"
        alt=""
        aria-hidden="true"
        style={{ width: 108, opacity: 0.16, marginTop: 26 }}
      />

      <div style={{ marginTop: 18 }}>
        <CategoryBadge category={cat} size={132} />
      </div>

      {/* Announced, so a screen reader hears the category before the screen
          advances itself two seconds later. */}
      <div role="status" style={{ textAlign: 'center' }}>
        <h1
          className="font-baloo"
          style={{
            marginTop: 18, fontSize: 26, lineHeight: 1.2, fontWeight: 700,
            color: HEADING_COLOR[cat],
          }}
        >
          {t('intro.trainYour', 'Train Your')}
          <br />
          <span style={{ color: brand.accent }}>{t(NAME_KEY[cat], cat.toUpperCase())}</span>
        </h1>

        <p
          className="font-baloo"
          style={{
            margin: '18px 22px 0', fontSize: 19, lineHeight: 1.4, fontWeight: 500,
            color: brand.label, textWrap: 'pretty',
          }}
        >
          {t(BODY_KEY[cat], '')}
        </p>
      </div>

      <div
        className="font-baloo"
        style={{
          marginTop: 'auto', width: '100%', background: brand.band,
          color: '#FFFFFF', fontSize: 16, fontWeight: 700, padding: '16px 22px',
          textAlign: 'center',
        }}
      >
        {t(BAND_KEY[cat], '')}
      </div>

      <div style={{ width: '100%', padding: '40px 60px 56px' }}>
        <ProgressBar
          durationMs={INTRO_MS}
          color={brand.accent}
          trackColor="rgba(255,255,255,0.35)"
          running
        />
        <p
          className="font-baloo"
          style={{
            marginTop: 12, textAlign: 'center', fontSize: 16, fontWeight: 700,
            letterSpacing: '0.08em', color: brand.label,
          }}
        >
          {t('intro.starting', 'STARTING...')}
        </p>
      </div>
    </div>
  );
}
