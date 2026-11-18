import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { getGame, type GameCatalogEntry } from '../lib/gameCatalog';
import { SKILLS } from '../lib/gameSkills';
import { afterScoreCard, pendingUnlock } from '../lib/sessionLedger';
import {
  comparisonKey, getScoreCard, mainWordKey, type ScoreCardData,
} from '../lib/scoreCard';
import GameCardFrame from '../components/chrome/GameCardFrame';
import { Button } from '../components/ui/Button';
import { BRAND, type GameCategory } from '../styles/tokens';

/** The category's existing display name key, for the unlock banner. */
const CATEGORY_NAME: Record<GameCategory, { key: string; fallback: string }> = {
  memory:    { key: 'category.memory',    fallback: 'Cognitive Memory' },
  attention: { key: 'category.attention', fallback: 'Attention' },
  executive: { key: 'category.planning',  fallback: 'Planning' },
};

interface ViewProps {
  game: GameCatalogEntry;
  data: ScoreCardData;
  /** The category this game's ten minutes just opened, if Home has not shown it yet. */
  unlocked?: GameCategory | null;
  onContinue: () => void;
  onClose: () => void;
}

/**
 * How the game went, in words only - never a number, band or arrow. Every line
 * that needs a score renders only when there is one, so with today's empty
 * placeholder the card is the title, the thank-you and Continue.
 */
export function ScoreCardView({ game, data, unlocked, onContinue, onClose }: ViewProps) {
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

      {unlocked && (
        <p
          role="status"
          className="font-baloo"
          style={{
            marginTop: 16, padding: '10px 18px', borderRadius: 16,
            background: BRAND.surfaceStrong, color: BRAND.lime,
            fontSize: 22, fontWeight: 700, lineHeight: 1.3, textAlign: 'center',
          }}
        >
          {t('scoreCard.unlocked', '{{category}} is now unlocked!', {
            category: t(CATEGORY_NAME[unlocked].key, CATEGORY_NAME[unlocked].fallback),
          })}
        </p>
      )}

      <div style={{ paddingTop: 24 }}>
        <Button variant="green" size="md" onClick={onContinue} style={{ minWidth: 200 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </GameCardFrame>
  );
}

/**
 * Shown when a level ends past the category's ten minutes. The category is
 * already complete by then, so the unlock banner and Continue both read from the
 * session, and a refresh on the card keeps them. Home marks the unlock seen once
 * it has played the animation, not here.
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
      unlocked={pendingUnlock(session.categoriesCompleted, session.unlocksSeen)}
      onContinue={() => navigate(afterScoreCard(session.categoriesCompleted))}
      // No session_interrupted here: the game is finished, and the session is
      // already saved at the next one, so Home offers Continue.
      onClose={() => navigate('/app/home')}
    />
  );
}
