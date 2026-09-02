import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { allByCategory, getGame } from '../lib/gameCatalog';
import ScreenBlue from '../components/chrome/ScreenBlue';
import GameTile from '../components/chrome/GameTile';
import { BRAND } from '../styles/tokens';
import type { GameCategory } from '../styles/tokens';

const SECTIONS: { category: GameCategory; labelKey: string; fallback: string }[] = [
  { category: 'memory',    labelKey: 'category.memory',    fallback: 'Memory' },
  { category: 'attention', labelKey: 'category.attention', fallback: 'Attention' },
  { category: 'executive', labelKey: 'category.planning',  fallback: 'Planning' },
];

/**
 * The free-play library. Replaces the Practice Mode block that used to live
 * inline at the bottom of Home, and keeps its practice_game_started event so
 * the shipped metric stays continuous.
 *
 * Gated on the day's session being complete, exactly as Practice Mode was.
 */
export default function FreePlayScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.currentSession);

  const allDone = ['memory', 'attention', 'executive']
    .every((c) => session.categoriesCompleted.includes(c));

  useEffect(() => {
    if (!allDone) navigate('/app/home', { replace: true });
  }, [allDone, navigate]);

  if (!allDone) return null;

  function handlePlay(gameId: string) {
    track('practice_game_started', { gameId });
    // Games with commissioned art get their title screen; the rest have none,
    // so sending them there would only bounce straight back.
    const hasSplash = Boolean(getGame(gameId)?.splash);
    navigate(hasSplash ? `/app/game/${gameId}/title` : `/app/game/${gameId}`);
  }

  return (
    <ScreenBlue>
      <div
        style={{
          position: 'relative', display: 'flex', alignItems: 'center',
          gap: 12, padding: '16px 20px 0',
        }}
      >
        <button
          onClick={() => navigate('/app/home')}
          aria-label={t('btn.back', 'Back')}
          style={{
            width: 44, height: 44, borderRadius: '50%',
            border: '1px solid rgba(255,255,255,0.5)',
            background: 'rgba(10,20,40,0.35)', color: '#FFFFFF',
            fontSize: 20, lineHeight: 1,
            display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}
        >
          &#8592;
        </button>
        <div>
          <h1 className="font-baloo" style={{ fontSize: 22, fontWeight: 700, color: '#FFFFFF' }}>
            {t('freePlay.title', 'Free Play')}
          </h1>
          <p className="font-baloo" style={{ fontSize: 15, fontWeight: 600, color: BRAND.cyan }}>
            {t('freePlay.subtitle', 'Choose any game you would like to play.')}
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '18px 20px 40px' }}>
        {SECTIONS.map(({ category, labelKey, fallback }) => (
          <section key={category} style={{ marginBottom: 26 }}>
            <p
              className="font-baloo"
              style={{
                fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
                color: BRAND.cyanBright, marginBottom: 10,
              }}
            >
              {t(labelKey, fallback).toUpperCase()}
            </p>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12 }}>
              {allByCategory(category).map((game) => (
                <GameTile key={game.id} game={game} onClick={() => handlePlay(game.id)} />
              ))}
            </div>
          </section>
        ))}
      </div>
    </ScreenBlue>
  );
}
