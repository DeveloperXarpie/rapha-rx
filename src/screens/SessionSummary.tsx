import { useEffect, useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { getLastLevels } from '../lib/lastLevel';
import { getGame } from '../lib/gameCatalog';
import { CATEGORY_ORDER } from '../lib/sessionPlan';
import ScreenBlue from '../components/chrome/ScreenBlue';
import CategoryBadge from '../components/chrome/CategoryBadge';
import { staggerDelay } from '../components/chrome/transitions';
import { useReducedMotion } from '../lib/useReducedMotion';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';
import type { GameCategory } from '../styles/tokens';

const CATEGORY_LABEL_KEY: Record<GameCategory, string> = {
  memory:    'category.memory',
  attention: 'category.attention',
  executive: 'category.planning',
};
const CATEGORY_FALLBACK: Record<GameCategory, string> = {
  memory: 'Memory', attention: 'Attention', executive: 'Planning',
};

export default function SessionSummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const reduced = useReducedMotion();
  const profile  = useAppStore((s) => s.activeProfile);
  const session  = useAppStore((s) => s.currentSession);
  const firedRef = useRef(false);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';
  const planned = session.plannedGames ?? [];

  /*
   * Levels for the games actually played. This screen used to hold a hardcoded
   * representative gameId per category - remember-match, spot-focus,
   * morning-routine-quest - and so reported levels for games the resident had
   * not touched.
   */
  const [levels, setLevels] = useState<Record<string, number>>({});

  useEffect(() => {
    if (!profile || planned.length === 0) return;
    getLastLevels(profile.userId, planned).then(setLevels);
  }, [profile, planned.join(',')]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    if (firedRef.current) return;
    firedRef.current = true;
    track('session_ended', {
      totalDurationSeconds: session.sessionStartedAt
        ? Math.floor((Date.now() - session.sessionStartedAt) / 1000)
        : 0,
      gamesPlayed: session.categoriesCompleted.length,
      categoriesCompleted: 3,
    });
  }, [session]);

  return (
    <ScreenBlue>
      <div
        style={{
          position: 'relative', flex: 1, minHeight: 0, display: 'flex',
          flexDirection: 'column', alignItems: 'center', padding: '24px 20px 0',
          textAlign: 'center',
        }}
      >
        <img src="/brand/logo-white.png" alt="" aria-hidden="true" style={{ width: 162 }} />

        <h1
          className="font-baloo"
          style={{ marginTop: 16, fontSize: 28, fontWeight: 700, color: '#FFFFFF' }}
        >
          {t('summary.title', 'Well done, {{name}}', { name: firstName })}
        </h1>
        <p
          className="font-baloo"
          style={{ marginTop: 6, fontSize: 18, fontWeight: 600, color: BRAND.cyan }}
        >
          {t('summary.subtitle', "You finished today's three games.")}
        </p>

        <div
          style={{
            width: '100%', display: 'flex', flexDirection: 'column',
            gap: 12, marginTop: 24,
          }}
        >
          {planned.map((gameId, i) => {
            const game = getGame(gameId);
            const category = game?.category ?? CATEGORY_ORDER[i];
            const level = levels[gameId];
            return (
              <div
                key={gameId}
                style={{
                  display: 'flex', alignItems: 'center', gap: 14,
                  background: BRAND.surfaceStrong, borderRadius: 18, padding: '12px 16px',
                  textAlign: 'left',
                  // Rows rise and fade in 60 ms apart, per the handoff.
                  animation: reduced
                    ? undefined
                    : `summary-row-in 320ms ease ${staggerDelay(i)}ms both`,
                }}
              >
                <CategoryBadge category={category} size={52} />
                <div style={{ flex: 1, minWidth: 0 }}>
                  <p
                    className="font-baloo"
                    style={{ fontSize: 18, fontWeight: 700, color: BRAND.cyanBright }}
                  >
                    {t(CATEGORY_LABEL_KEY[category], CATEGORY_FALLBACK[category])}
                  </p>
                  {level !== undefined && (
                    <p
                      className="font-baloo"
                      style={{ fontSize: 15, fontWeight: 600, color: BRAND.lime }}
                    >
                      {t('summary.levelReached', 'Level {{level}} reached', { level })}
                    </p>
                  )}
                </div>
                <span aria-hidden="true" style={{ fontSize: 22, color: BRAND.lime }}>&#10003;</span>
              </div>
            );
          })}
        </div>

        <p
          className="font-baloo"
          style={{ marginTop: 26, fontSize: 20, fontWeight: 700, color: '#FFFFFF' }}
        >
          {t('summary.seeYouTomorrow', 'See you tomorrow!')}
        </p>
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: 'auto 0 40px' }}>
        <Button variant="green" onClick={() => navigate('/app/home')} style={{ minWidth: 262 }}>
          {t('btn.backHome', 'Back to Home')}
        </Button>
      </div>
    </ScreenBlue>
  );
}
