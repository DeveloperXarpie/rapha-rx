import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { getGame, playRoute, tileArt, type GameCatalogEntry } from '../lib/gameCatalog';
import { useSessionContext } from '../session/SessionManager';
import { DOMAIN_KEY, GAME_SKILLS, SKILLS, skillsFor } from '../lib/gameSkills';
import ScreenBlue from '../components/chrome/ScreenBlue';
import { Button } from '../components/ui/Button';
import { UI_UNDO } from '../lib/uiKit';
import { BRAND } from '../styles/tokens';

interface ViewProps {
  game: GameCatalogEntry;
  onContinue: () => void;
  onBack: () => void;
}

/** The skill tiles' own aspect, so a row reserves their height before they load. */
const TILE_W = 104;
const TILE_H = Math.round(TILE_W * (226 / 288));

/**
 * What the game trains: its domain, then each skill with its tile and one-line
 * description, primary first. Laid out to the final info-screen mock
 * (docs/info-screen/ui_refined.png): the game's logo, a pale band naming the domain,
 * one row per skill, Continue. Separate from the screen so the chrome gallery can
 * render it.
 *
 * The page scrolls as a whole if the copy outgrows it (a Kannada list of four on a
 * short phone), so Continue is never pinned over a skill line.
 */
export function GameIntroView({ game, onContinue, onBack }: ViewProps) {
  const { t } = useTranslation();
  const skills = skillsFor(game.id);
  const domain = GAME_SKILLS[game.id]?.category ?? game.category;

  return (
    <ScreenBlue>
      <div
        className="flex-1 flex flex-col items-center"
        style={{ position: 'relative', zIndex: 1, padding: '16px 20px 28px' }}
      >
        <button
          onClick={onBack}
          aria-label={t('btn.back', 'Back')}
          className="transition-transform active:scale-95"
          style={{
            position: 'absolute', top: 16, left: 20, width: 56, height: 56,
            filter: 'drop-shadow(0 3px 6px rgba(0, 0, 0, 0.35))',
          }}
        >
          <img src={UI_UNDO} alt="" aria-hidden="true" className="w-full h-full" draggable={false} />
        </button>

        {/* Category icon for a Free Play game with no commissioned art. */}
        <img
          src={tileArt(game)}
          alt={t(game.nameKey, '')}
          draggable={false}
          style={{
            width: 150, height: 150, objectFit: 'contain', flexShrink: 0,
            filter: 'drop-shadow(0 6px 12px rgba(0, 0, 0, 0.35))',
          }}
        />

        <h1
          className="font-baloo"
          style={{
            alignSelf: 'stretch', marginTop: 18, padding: '12px 16px',
            background: BRAND.card, borderRadius: 24,
            boxShadow: '0 6px 16px rgba(8, 26, 52, 0.3)',
            color: BRAND.navy, textAlign: 'center', lineHeight: 1.2,
          }}
        >
          <span style={{ display: 'block', fontSize: 24, fontWeight: 600 }}>
            {t('gameIntro.improves', 'This game improves your')}
          </span>
          <span style={{ display: 'block', fontSize: 32, fontWeight: 800, textWrap: 'balance' }}>
            {t(DOMAIN_KEY[domain], '')}
          </span>
        </h1>

        <ul style={{ alignSelf: 'stretch', listStyle: 'none', margin: '16px 0 0', padding: 0 }}>
          {skills.map((id) => (
            <li
              key={id}
              style={{
                display: 'flex', alignItems: 'center', gap: 16, marginTop: 12,
                padding: '10px 14px', borderRadius: 24,
                background: BRAND.surface,
                border: '2px solid rgba(111, 232, 255, 0.3)',
              }}
            >
              <img
                src={SKILLS[id].icon}
                alt=""
                aria-hidden="true"
                draggable={false}
                width={TILE_W}
                height={TILE_H}
                style={{ width: TILE_W, height: TILE_H, flexShrink: 0 }}
              />
              <div style={{ minWidth: 0 }}>
                <p className="font-baloo" style={{ color: BRAND.skill, fontSize: 26, fontWeight: 800, lineHeight: 1.15 }}>
                  {t(SKILLS[id].nameKey, '')}
                </p>
                <p style={{ marginTop: 2, color: '#FFFFFF', fontSize: 19, lineHeight: 1.35, textWrap: 'pretty' }}>
                  {t(SKILLS[id].lineKey, '')}
                </p>
              </div>
            </li>
          ))}
        </ul>

        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          <Button variant="green" size="lg" onClick={onContinue} style={{ minWidth: 260 }}>
            {t('btn.continue', 'Continue')}
          </Button>
        </div>
      </div>
    </ScreenBlue>
  );
}

/**
 * The screen before each game, in place of the old category intro: every session
 * game, and every Free Play game that has a skill mapping. It waits for Continue
 * rather than a timer: four skill lines are more than anyone reads in two seconds.
 * Continue goes on to the game's title screen.
 *
 * Free Play is the session-complete case - a session's own intros all come before
 * its last category is done - and there Back returns to the library, and neither
 * the rotation nor the interruption event fires.
 */
export default function GameIntro() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const session = useAppStore((s) => s.currentSession);
  const { sessionComplete: freePlay } = useSessionContext();
  const trackedRef = useRef(false);

  const game = gameId ? getGame(gameId) : undefined;
  const valid = !!game && !!GAME_SKILLS[game.id];

  useEffect(() => {
    if (!valid) navigate(freePlay ? '/app/free-play' : '/app/home', { replace: true });
  }, [valid, freePlay, navigate]);

  // Fires once per arrival. The event moved here with the screen it came from.
  useEffect(() => {
    if (trackedRef.current || !valid || !game || freePlay) return;
    trackedRef.current = true;
    const completed = session.categoriesCompleted;
    track('category_rotated', {
      fromCategory: completed[completed.length - 1] ?? 'unknown',
      toCategory: game.category,
      secondsPlayed: session.secondsInCurrentCategory,
    });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [valid, game]);

  if (!valid || !game) return null;

  return (
    <GameIntroView
      game={game}
      onContinue={() => navigate(playRoute(game))}
      onBack={() => {
        if (freePlay) {
          navigate('/app/free-play');
          return;
        }
        track('session_interrupted', { gameId: game.id, levelId: 'intro', timeInSessionSeconds: 0 });
        navigate('/app/home');
      }}
    />
  );
}
