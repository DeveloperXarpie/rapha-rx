import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { track } from '../lib/analytics';
import { getGame } from '../lib/gameCatalog';

/*
 * Where the painted PLAY button sits inside the supplied art, as a fraction of
 * the image box. Percentages rather than pixels so it tracks the art at any
 * viewport size.
 *
 * Measured off a rendered 360x780 screenshot, not estimated: the painted button
 * spans 69.1%-79.9% of the height and 19.4%-80.6% of the width once the art is
 * cover-fitted.
 */
const PLAY_HOTSPOT = { top: '69%', height: '11%', left: '20%', width: '60%' };

/**
 * The screen between the category intro and the board.
 *
 * This is the supplied artwork rather than composed UI, and deliberately so:
 * splash-*.webp is a finished screen - it already contains the game logo, the
 * tagline, the cream "scientifically designed game" panel and a painted PLAY
 * button. There is no clean background plate, so the handoff's "rebuild these
 * as real screens" is not buildable without new art.
 *
 * What is real: a full-size transparent button over the painted one, so the
 * control is focusable, has an accessible name and shows a focus ring; and the
 * close control. Known limitation: every word painted into the art is English,
 * in all three languages.
 */
export default function GameTitleScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();

  const game = gameId ? getGame(gameId) : undefined;
  const splash = game?.splash ?? null;

  // The nine games with no commissioned art have no title screen. Rather than
  // render an empty one, go straight to the board. No fire-once ref: a replacing
  // navigate is idempotent, and a ref here would only be one more thing to get
  // wrong under StrictMode's double mount.
  useEffect(() => {
    if (!game || !splash) {
      navigate(gameId ? `/app/game/${gameId}` : '/app/home', { replace: true });
    }
  }, [game, splash, gameId, navigate]);

  if (!game || !splash) return null;

  function handlePlay() {
    navigate(`/app/game/${gameId}`);
  }

  function handleClose() {
    // Leaving here abandons the session, which is what this event already means
    // everywhere else in the app.
    track('session_interrupted', { gameId, levelId: 'title', timeInSessionSeconds: 0 });
    navigate('/app/home');
  }

  return (
    <div
      className="flex-1 min-h-0"
      style={{ position: 'relative', overflow: 'hidden', background: '#0E2AA8' }}
    >
      <img
        src={splash}
        alt=""
        aria-hidden="true"
        style={{
          position: 'absolute', inset: 0,
          width: '100%', height: '100%', objectFit: 'cover',
        }}
      />

      <button
        onClick={handlePlay}
        aria-label={t('gameTitle.play', 'Play')}
        style={{
          position: 'absolute', ...PLAY_HOTSPOT,
          minHeight: 44, background: 'transparent', border: 'none',
          borderRadius: 16, cursor: 'pointer',
        }}
      />

      <button
        onClick={handleClose}
        aria-label={t('gameTitle.close', 'Close')}
        style={{
          position: 'absolute', top: 12, right: 12,
          width: 34, height: 34, borderRadius: '50%',
          border: '1px solid rgba(255,255,255,0.6)',
          background: 'rgba(10,20,40,0.45)',
          color: '#FFFFFF', fontSize: 18, lineHeight: 1,
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          cursor: 'pointer',
        }}
      >
        &#10005;
      </button>
    </div>
  );
}
