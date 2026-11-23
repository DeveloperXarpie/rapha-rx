import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { getGame, type GameCatalogEntry } from '../lib/gameCatalog';
import { SKILLS, YOUR_DOMAIN } from '../lib/gameSkills';
import { afterScoreCard, pendingUnlock } from '../lib/sessionLedger';
import { getRounds } from '../lib/db';
import { BAND_WORD_KEYS, scoreCardData, type ScoreCardData } from '../lib/scoring/summary';
import { skillColour } from '../lib/scoring/colours';
import GameCardFrame from '../components/chrome/GameCardFrame';
import Accolade from '../components/chrome/Accolade';
import { Button } from '../components/ui/Button';
import { BRAND, SCORE_UI, type GameCategory } from '../styles/tokens';

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

/** The skill bar: "3/5" in a disc, then five pills filled up to the band (amends p3). */
function BandBar({ band, colour }: { band: number; colour: string }) {
  const { t } = useTranslation();
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
      <span
        style={{
          flexShrink: 0, minWidth: 48, height: 48, borderRadius: 24, padding: '0 6px',
          background: SCORE_UI.disc, color: '#FFFFFF',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 20, fontWeight: 800,
        }}
      >
        {t('scoreCard.outOfFive', '{{band}}/5', { band })}
      </span>
      {[1, 2, 3, 4, 5].map((n) => (
        <span
          key={n}
          aria-hidden="true"
          style={{
            flex: 1, height: 22, borderRadius: 11,
            background: n <= band ? colour : SCORE_UI.pillOff,
          }}
        />
      ))}
    </div>
  );
}

/**
 * The per-game scorecard (FINAL_SPEC 7.4 as amended 2026-11-23), shown when a
 * category completes. One card per scored skill with its band word, "n/5" and a
 * 5-segment bar, then an accolade for the average over confetti. A skill with
 * nothing to judge yet has no card; with no cards at all the card just thanks.
 */
export function ScoreCardView({ game, data, unlocked, onContinue, onClose }: ViewProps) {
  const { t } = useTranslation();
  const title = YOUR_DOMAIN[game.category];

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
        style={{ marginTop: 8, fontSize: 18, fontWeight: 700, letterSpacing: '0.12em', color: SCORE_UI.label }}
      >
        {t(title.key, title.fallback)}
      </p>

      <div className="flex-1 flex flex-col" style={{ gap: 12, width: '100%', marginTop: 14 }}>
        {data.cards.map((card) => {
          const colour = skillColour(card.skill);
          return (
            <div
              key={card.skill}
              style={{ background: SCORE_UI.card, borderRadius: 20, padding: '12px 16px 14px' }}
            >
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
                <span style={{ fontSize: 24, fontWeight: 800, textAlign: 'left' }}>
                  {t(SKILLS[card.skill].nameKey, card.skill)}
                </span>
                <span style={{ fontSize: 19, fontWeight: 700, color: colour, textAlign: 'right' }}>
                  {t(BAND_WORD_KEYS[card.band], '')}
                </span>
              </div>
              <BandBar band={card.band} colour={colour} />
            </div>
          );
        })}

        {data.accoladeKey ? (
          <Accolade word={t(data.accoladeKey, '')} />
        ) : (
          <div role="status" className="flex-1 flex items-center justify-center" style={{ textAlign: 'center' }}>
            <p style={{ fontSize: 22, lineHeight: 1.35 }}>
              {t('scoreCard.thanks', 'Thank you for playing today.')}
            </p>
          </div>
        )}
      </div>

      {unlocked && (
        <p
          role="status"
          className="font-baloo"
          style={{
            marginTop: 12, padding: '10px 18px', borderRadius: 16,
            background: SCORE_UI.card, color: BRAND.lime,
            fontSize: 22, fontWeight: 700, lineHeight: 1.3, textAlign: 'center',
          }}
        >
          {t('scoreCard.unlocked', '{{category}} is now unlocked!', {
            category: t(CATEGORY_NAME[unlocked].key, CATEGORY_NAME[unlocked].fallback),
          })}
        </p>
      )}

      <div style={{ paddingTop: 16 }}>
        <Button variant="green" size="md" onClick={onContinue} style={{ minWidth: 200 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </GameCardFrame>
  );
}

const EMPTY: ScoreCardData = { cards: [], accoladeKey: null };

/**
 * Shown when a level ends past the category's ten minutes (C6, owner 2026-11-19). The
 * category is already complete, so the unlock banner and Continue read the session;
 * the skill cards and the accolade read today's logged rounds for this game.
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
    getRounds(userId, session.date, game.category).then((today) => {
      if (live) setData(scoreCardData(game.id, today));
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
