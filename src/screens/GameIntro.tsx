import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { getGame, type GameCatalogEntry } from '../lib/gameCatalog';
import { DOMAIN_KEY, GAME_SKILLS, SKILLS, skillsFor } from '../lib/gameSkills';
import GameCardFrame from '../components/chrome/GameCardFrame';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

interface ViewProps {
  game: GameCatalogEntry;
  onContinue: () => void;
  onClose: () => void;
}

/**
 * What the game trains: its domain, then each skill with its one-line description,
 * primary first. Separate from the screen so the chrome gallery can render it.
 */
export function GameIntroView({ game, onContinue, onClose }: ViewProps) {
  const { t } = useTranslation();
  const skills = skillsFor(game.id);
  const domain = GAME_SKILLS[game.id]?.category ?? game.category;

  return (
    <GameCardFrame art={game.splash ?? ''} onClose={onClose}>
      {game.tile && (
        <img
          src={game.tile}
          alt={t(game.nameKey, '')}
          style={{ width: 132, height: 132, objectFit: 'contain', flexShrink: 0 }}
        />
      )}

      <h1 style={{ marginTop: 18, fontSize: 28, lineHeight: 1.25, fontWeight: 500 }}>
        {t('gameIntro.improves', 'This game improves your')}
        <br />
        <span style={{ color: BRAND.cyanBright, fontWeight: 800, textTransform: 'uppercase' }}>
          {t(DOMAIN_KEY[domain], '')}
        </span>
      </h1>

      <ul style={{ listStyle: 'none', margin: '26px 0 0', padding: 0 }}>
        {skills.map((id) => (
          <li key={id} style={{ marginTop: 20 }}>
            <p style={{ color: BRAND.skill, fontSize: 23, fontWeight: 600, textTransform: 'uppercase' }}>
              {t(SKILLS[id].nameKey, '')}
            </p>
            <p style={{ marginTop: 2, fontSize: 20, lineHeight: 1.35, textWrap: 'pretty' }}>
              {t(SKILLS[id].lineKey, '')}
            </p>
          </li>
        ))}
      </ul>

      <div style={{ marginTop: 'auto', paddingTop: 28 }}>
        <Button variant="green" size="md" onClick={onContinue} style={{ minWidth: 200 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </GameCardFrame>
  );
}

/**
 * The screen before each session game, in place of the old category intro. It
 * waits for Continue rather than a timer: four skill lines are more than anyone
 * reads in two seconds. Continue goes on to the game's title screen.
 */
export default function GameIntro() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const session = useAppStore((s) => s.currentSession);
  const trackedRef = useRef(false);

  const game = gameId ? getGame(gameId) : undefined;
  const valid = !!game && !!GAME_SKILLS[game.id];

  useEffect(() => {
    if (!valid) navigate('/app/home', { replace: true });
  }, [valid, navigate]);

  // Fires once per arrival. The event moved here with the screen it came from.
  useEffect(() => {
    if (trackedRef.current || !valid || !game) return;
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
      onContinue={() => navigate(`/app/game/${game.id}/title`)}
      onClose={() => {
        track('session_interrupted', { gameId: game.id, levelId: 'intro', timeInSessionSeconds: 0 });
        navigate('/app/home');
      }}
    />
  );
}
