import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { getGame, type GameCatalogEntry } from '../lib/gameCatalog';
import { DOMAIN_KEY, SKILLS } from '../lib/gameSkills';
import { afterScoreCard, pendingUnlock } from '../lib/sessionLedger';
import { getPreviousSessionRounds, getRounds } from '../lib/db';
import { BAND_WORD_KEYS, scoreCardData, type ScoreCardData } from '../lib/scoring/summary';
import { skillColour } from '../lib/scoring/colours';
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

/** Five pills, filled up to the band, in the skill's colour (Mock 2). */
function BandBar({ band, colour }: { band: number; colour: string }) {
  return (
    <div style={{ display: 'flex', gap: 8, marginTop: 10 }} aria-hidden="true">
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          style={{
            flex: 1, height: 22, borderRadius: 11,
            background: n <= band ? colour : 'rgba(255,255,255,0.18)',
          }}
        />
      ))}
    </div>
  );
}

/**
 * The per-game scorecard (FINAL_SPEC 7.4, Mock 2), shown when a category completes.
 * One card per scored skill with its band word and a 5-segment bar - words and bars
 * only, never a number (7.6). A skill with nothing to judge yet has no card.
 */
export function ScoreCardView({ game, data, unlocked, onContinue, onClose }: ViewProps) {
  const { t } = useTranslation();

  return (
    <GameCardFrame art={game.splash ?? ''} onClose={onClose}>
      {game.tile && (
        <img
          src={game.tile}
          alt={t(game.nameKey, '')}
          style={{ width: 120, height: 120, objectFit: 'contain', flexShrink: 0 }}
        />
      )}
      <p
        className="font-baloo"
        style={{ marginTop: 8, fontSize: 18, fontWeight: 700, letterSpacing: '0.18em', color: BRAND.cyan }}
      >
        {t(DOMAIN_KEY[game.category], game.category).toUpperCase()}
      </p>

      <div role="status" className="flex-1 flex flex-col" style={{ gap: 14, width: '100%', marginTop: 16 }}>
        {data.cards.map((card) => {
          const colour = skillColour(card.skill);
          return (
            <div
              key={card.skill}
              style={{ background: BRAND.surfaceStrong, borderRadius: 20, padding: '14px 18px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800 }}>{t(SKILLS[card.skill].nameKey, card.skill)}</span>
                <span style={{ fontSize: 19, fontWeight: 700, color: colour, textAlign: 'right' }}>
                  {t(BAND_WORD_KEYS[card.band], '')}
                </span>
              </div>
              <BandBar band={card.band} colour={colour} />
            </div>
          );
        })}

        <div className="flex-1 flex flex-col items-center justify-center" style={{ textAlign: 'center', gap: 8 }}>
          {data.improved ? (
            <>
              <p style={{ fontSize: 24, fontWeight: 800, lineHeight: 1.3 }}>
                {t('scoreCard.improved', 'You have improved steadily.')}
              </p>
              <p style={{ fontSize: 20, lineHeight: 1.35 }}>
                {t('scoreCard.keepGoing', 'Keep playing to build on it.')}
              </p>
            </>
          ) : (
            <p style={{ fontSize: 22, lineHeight: 1.35 }}>
              {t('scoreCard.thanks', 'Thank you for playing today.')}
            </p>
          )}
        </div>
      </div>

      {unlocked && (
        <p
          role="status"
          className="font-baloo"
          style={{
            marginTop: 12, padding: '10px 18px', borderRadius: 16,
            background: BRAND.surfaceStrong, color: BRAND.lime,
            fontSize: 22, fontWeight: 700, lineHeight: 1.3, textAlign: 'center',
          }}
        >
          {t('scoreCard.unlocked', '{{category}} is now unlocked!', {
            category: t(CATEGORY_NAME[unlocked].key, CATEGORY_NAME[unlocked].fallback),
          })}
        </p>
      )}

      <div style={{ paddingTop: 20 }}>
        <Button variant="green" size="md" onClick={onContinue} style={{ minWidth: 200 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </GameCardFrame>
  );
}

const EMPTY: ScoreCardData = { cards: [], improved: false };

/**
 * Shown when a level ends past the category's ten minutes (C6, owner 2026-11-19). The
 * category is already complete, so the unlock banner and Continue read the session;
 * the skill cards read today's logged rounds for this game and the previous session's.
 * The frame renders at once and the cards fill in when the read lands.
 */
export default function ScoreCard() {
  const navigate = useNavigate();
  const { gameId } = useParams<{ gameId: string }>();
  const session = useAppStore((s) => s.currentSession);
  const userId = useAppStore((s) => s.activeProfile?.userId);
  const [data, setData] = useState<ScoreCardData>(EMPTY);

  const game = gameId ? getGame(gameId) : undefined;
  const valid = !!game?.splash;

  useEffect(() => {
    if (!valid) navigate('/app/home', { replace: true });
  }, [valid, navigate]);

  useEffect(() => {
    if (!game || !userId) return;
    let live = true;
    Promise.all([
      getRounds(userId, session.date, game.category),
      getPreviousSessionRounds(userId, game.category, session.date),
    ]).then(([today, previous]) => {
      if (live) setData(scoreCardData(game.id, today, previous));
    }).catch(() => { /* no scores; the card still thanks and continues */ });
    return () => { live = false; };
  }, [game, userId, session.date]);

  if (!valid || !game) return null;

  return (
    <ScoreCardView
      game={game}
      data={data}
      unlocked={pendingUnlock(session.categoriesCompleted, session.unlocksSeen)}
      onContinue={() => navigate(afterScoreCard(session.categoriesCompleted))}
      // The X goes where Continue goes: closing the card must not skip the category's
      // 10-minute summary, the only screen with the numbers (final review). No
      // session_interrupted here: the game is finished and the session saved.
      onClose={() => navigate(afterScoreCard(session.categoriesCompleted))}
    />
  );
}
