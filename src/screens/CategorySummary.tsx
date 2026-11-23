import { useEffect, useRef, useState } from 'react';
import { Navigate, useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { getPreviousSessionRounds, getRecentSessionRounds, getRounds } from '../lib/db';
import { SKILLS, YOUR_DOMAIN } from '../lib/gameSkills';
import { CATEGORY_ORDER, isDayComplete } from '../lib/sessionLedger';
import {
  categorySummary, historyMetrics, HISTORY_SESSIONS,
  type CategorySummary as Summary, type HistoryMetrics as History,
} from '../lib/scoring/summary';
import { skillColour } from '../lib/scoring/colours';
import SkillRing from '../components/chrome/SkillRing';
import HistoryMetrics from '../components/chrome/HistoryMetrics';
import { Button } from '../components/ui/Button';
import { SCORE_UI, type GameCategory } from '../styles/tokens';

const EMPTY: Summary = { rings: [], average: null, headlineKey: null };
const NO_HISTORY: History = { dates: [], rows: [] };

/**
 * The 10-minute summary (FINAL_SPEC 7.5, Mock 3), after the scorecard of a completed
 * category and before Home (C4). One ring per skill of the games played in this
 * category session (D14), with numbers and the change since the last session (D12,
 * D13), the History Metrics expander (the last 7 sessions of each skill) and the
 * headline word for the average (7.2's ten bands). Weekly stars wait on the spec (C14).
 */
export default function CategorySummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const { category } = useParams<{ category: string }>();
  const userId = useAppStore((s) => s.activeProfile?.userId);
  const session = useAppStore((s) => s.currentSession);
  const [summary, setSummary] = useState<Summary>(EMPTY);
  const [history, setHistory] = useState<History>(NO_HISTORY);
  const endedRef = useRef(false);

  const valid = CATEGORY_ORDER.includes(category as GameCategory);
  const cat = category as GameCategory;

  useEffect(() => {
    if (!valid || !userId) return;
    let live = true;
    Promise.all([
      getRounds(userId, session.date, cat),
      getPreviousSessionRounds(userId, cat, session.date),
      getRecentSessionRounds(userId, cat, session.date, HISTORY_SESSIONS),
    ]).then(([today, previous, recent]) => {
      if (!live) return;
      const next = categorySummary(today, previous);
      setSummary(next);
      setHistory(historyMetrics(recent, next.rings.map((r) => r.skill)));
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
    // A flat navy screen, as in the amends mock (p4), rather than the blue wash.
    <div
      className="flex-1 min-h-0 flex flex-col"
      style={{ background: SCORE_UI.summaryBg, color: '#FFFFFF' }}
    >
      <div
        style={{
          position: 'relative', flex: 1, minHeight: 0, display: 'flex', flexDirection: 'column',
          alignItems: 'center', padding: '24px 20px 0', textAlign: 'center', overflowY: 'auto',
        }}
      >
        <h1 style={{ fontSize: 32, fontWeight: 800, lineHeight: 1.15, color: '#FFFFFF' }}>
          {t(YOUR_DOMAIN[cat].key, YOUR_DOMAIN[cat].fallback)}
        </h1>
        <p style={{ fontSize: 24, fontWeight: 700, color: SCORE_UI.label }}>
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

        <HistoryMetrics history={history} today={session.date} />

        {summary.headlineKey && (
          <p
            className="font-baloo"
            style={{ marginTop: 22, fontSize: 24, fontWeight: 800, color: SCORE_UI.headline }}
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
    </div>
  );
}
