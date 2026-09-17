import { useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { allByCategory, getGame } from '../lib/gameCatalog';
import { UI_UNDO } from '../lib/uiKit';
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
          className="shrink-0 transition-transform active:scale-95"
          style={{
            width: 52, height: 52,
            filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35))',
          }}
        >
          <img src={UI_UNDO} alt="" aria-hidden="true" className="w-full h-full" draggable={false} />
        </button>
        <div>
          {/*
            Up again on the Sep-17 review, which arrowed at all three of the words on
            this screen that are not a game's name. The subtitle in particular was
            being read as a caption on the title rather than as an instruction.
          */}
          <h1 className="font-baloo" style={{ fontSize: 34, fontWeight: 800, color: '#FFFFFF' }}>
            {t('freePlay.title', 'Free Play')}
          </h1>
          <p className="font-baloo" style={{ fontSize: 24, fontWeight: 700, color: BRAND.cyan }}>
            {t('freePlay.subtitle', 'Choose any game you would like to play.')}
          </p>
        </div>
      </div>

      <div style={{ position: 'relative', padding: '18px 20px 40px' }}>
        {SECTIONS.map(({ category, labelKey, fallback }) => (
          <section key={category} style={{ marginBottom: 26 }}>
            {/*
              The section heading. Bigger and bolder on the Sep-10 review, and bigger
              and bolder again on Sep-17: at 14/700 it read as a label on the tiles
              below it rather than as the divider between three separate shelves, and
              at 20 it still was not carrying across a room. Tracking keeps coming down
              as the size goes up - .12em was holding a small word open, and a 26px word
              does not need it at all.
            */}
            <p
              className="font-baloo"
              style={{
                fontSize: 26, fontWeight: 800, letterSpacing: '0.05em',
                color: BRAND.cyanBright, marginBottom: 14,
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
