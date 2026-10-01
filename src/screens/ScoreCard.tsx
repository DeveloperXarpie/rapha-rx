import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { getGame, type GameCatalogEntry } from '../lib/gameCatalog';
import { SKILLS } from '../lib/gameSkills';
import { afterScoreCard } from '../lib/sessionPlan';
import {
  comparisonKey, getScoreCard, mainWordKey, type ScoreCardData,
} from '../lib/scoreCard';
import GameCardFrame from '../components/chrome/GameCardFrame';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

interface ViewProps {
  game: GameCatalogEntry;
  data: ScoreCardData;
  onContinue: () => void;
  onClose: () => void;
}

/**
 * How the game went, in words only - never a number, band or arrow. Every line
 * that needs a score renders only when there is one, so with today's empty
 * placeholder the card is the title, the thank-you and Continue.
 */
export function ScoreCardView({ game, data, onContinue, onClose }: ViewProps) {
  const { t } = useTranslation();
  const word = mainWordKey(data.primary);
  const compare = comparisonKey(data.primary, data.previous);

  return (
    <GameCardFrame art={game.splash ?? ''} onClose={onClose}>
      {game.tile && (
        <img
          src={game.tile}
          alt={t(game.nameKey, '')}
          style={{ width: 132, height: 132, objectFit: 'contain', flexShrink: 0 }}
        />
      )}

      <div role="status" className="flex-1 flex flex-col items-center justify-center" style={{ gap: 18 }}>
        <h1 style={{ fontSize: 30, fontWeight: 600, lineHeight: 1.25 }}>
          {t('scoreCard.title', 'Well done!')}
        </h1>

        {word && (
          <p style={{ color: BRAND.cyanBright, fontSize: 38, fontWeight: 800, lineHeight: 1.15, textWrap: 'balance' }}>
            {t(word, '')}
          </p>
        )}

        {compare && (
          <p style={{ fontSize: 22, lineHeight: 1.35, textWrap: 'pretty' }}>{t(compare, '')}</p>
        )}

        {data.bestSkill && (
          <p style={{ fontSize: 21, lineHeight: 1.35 }}>
            {t('scoreCard.bestSkill', 'You did especially well at')}
            <br />
            <span style={{ color: BRAND.skill, fontWeight: 700, textTransform: 'uppercase' }}>
              {t(SKILLS[data.bestSkill].nameKey, '')}
            </span>
          </p>
        )}

        <p style={{ fontSize: 22, lineHeight: 1.35 }}>
          {t('scoreCard.thanks', 'Thank you for playing today.')}
        </p>
      </div>

      <div style={{ paddingTop: 24 }}>
        <Button variant="green" size="md" onClick={onContinue} style={{ minWidth: 200 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </GameCardFrame>
  );
}

/**
 * Shown once after each session game, when rotation moves the session on. By
 * then the session already points at the next game, so Continue reads the
 * destination from it - see afterScoreCard.
 */
export default function ScoreCard() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const session = useAppStore((s) => s.currentSession);

  const game = gameId ? getGame(gameId) : undefined;
  const valid = !!game?.splash;

  useEffect(() => {
    if (!valid) navigate('/app/home', { replace: true });
  }, [valid, navigate]);

  if (!valid || !game) return null;

  return (
    <ScoreCardView
      game={game}
      data={getScoreCard(game.id)}
      onContinue={() => navigate(afterScoreCard({
        categoriesCompleted: session.categoriesCompleted,
        currentGameId: session.currentGameId,
      }))}
      // No session_interrupted here: the game is finished, and the session is
      // already saved at the next one, so Home offers Continue.
      onClose={() => navigate('/app/home')}
    />
  );
}
