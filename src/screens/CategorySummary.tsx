import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { getPreviousSessionRounds, getRounds } from '../lib/db';
import { SKILLS } from '../lib/gameSkills';
import { CATEGORY_ORDER, isDayComplete } from '../lib/sessionLedger';
import { categorySummary, type CategorySummary as Summary } from '../lib/scoring/summary';
import { skillColour } from '../lib/scoring/colours';
import ScreenBlue from '../components/chrome/ScreenBlue';
import SkillRing from '../components/chrome/SkillRing';
import { Button } from '../components/ui/Button';
import { BRAND, type GameCategory } from '../styles/tokens';

const TITLE: Record<GameCategory, { key: string; fallback: string }> = {
  memory:    { key: 'summary.your.memory',    fallback: 'YOUR MEMORY' },
  attention: { key: 'summary.your.attention', fallback: 'YOUR FOCUS' },
  executive: { key: 'summary.your.executive', fallback: 'YOUR PLANNING' },
};

const EMPTY: Summary = { rings: [], average: null, headlineKey: null };

/**
 * The 10-minute summary (FINAL_SPEC 7.5, Mock 3), after the scorecard of a completed
 * category and before Home (C4). One ring per skill of the games played in this
 * category session (D14), with numbers and the change since the last session (D12,
 * D13), and the headline word for the average (7.2's ten bands). History metrics and
 * weekly stars wait on the spec (C14).
 */
export default function CategorySummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const userId = useAppStore((s) => s.activeProfile?.userId);
  const session = useAppStore((s) => s.currentSession);
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const endedRef = useRef(false);

  const valid = CATEGORY_ORDER.includes(category as GameCategory);
  const cat = category as GameCategory;

  useEffect(() => {
    if (!valid || !userId) return;
    let live = true;
    Promise.all([
      getRounds(userId, session.date, cat),
      getPreviousSessionRounds(userId, cat, session.date),
    ]).then(([today, previous]) => {
      if (live) setSummary(categorySummary(today, previous));
    }).catch(() => { /* no rings; Continue still works */ });
    return () => { live = false; };
  }, [valid, userId, cat, session.date]);

  // The day ends here now that the interim day summary is retired (C4).
  useEffect(() => {
    if (endedRef.current || !isDayComplete(session.categoriesCompleted)) return;
    endedRef.current = true;
    track('session_ended', {
      totalDurationSeconds: session.sessionStartedAt
        ? Math.floor((Date.now() - session.sessionStartedAt) / 1000) : 0,
      gamesPlayed: session.gamesPlayed.length,
      categoriesCompleted: session.categoriesCompleted.length,
    });
  }, [session]);

  if (!valid) return <Navigate to="/app/home" replace />;

  return (
    <ScreenBlue>
      <div
        style={{
          position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '24px 20px 0', textAlign: 'center', overflowY: 'auto',
        }}
      >
        <h1 className="font-baloo" style={{ fontSize: 30, fontWeight: 800, color: '#FFFFFF' }}>
          {t(TITLE[cat].key, TITLE[cat].fallback)}
        </h1>
        <p className="font-baloo" style={{ fontSize: 18, fontWeight: 600, color: BRAND.cyan }}>
          {t('summary.performanceToday', 'Performance today')}
        </p>

        <div
          style={{
            display: 'grid', gridTemplateColumns: 'repeat(2, minmax(0, 1fr))', gap: 12,
            width: '100%', maxWidth: 380, marginTop: 20,
          }}
        >
          {summary.rings.map((ring) => (
            <SkillRing
              key={ring.skill}
              label={t(SKILLS[ring.skill].nameKey, ring.skill)}
              score={ring.score}
              colour={skillColour(ring.skill)}
              change={ring.change}
            />
          ))}
        </div>

        {summary.headlineKey && (
          <p
            className="font-baloo"
            style={{ marginTop: 22, fontSize: 24, fontWeight: 800, color: BRAND.lime }}
          >
            {t(summary.headlineKey, '')}
          </p>
        )}
      </div>

      <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', margin: 'auto 0 32px', paddingTop: 16 }}>
        <Button variant="green" onClick={() => navigate('/app/home')} style={{ minWidth: 262 }}>
          {t('btn.continue', 'Continue')}
        </Button>
      </div>
    </ScreenBlue>
  );
}
