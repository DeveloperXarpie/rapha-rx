import { useEffect, useId, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { SKILLS } from '../../lib/gameSkills';
import { skillColour } from '../../lib/scoring/colours';
import type { HistoryMetrics as History } from '../../lib/scoring/summary';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { SCORE_UI } from '../../styles/tokens';

const BAR_AREA = 56;

/** "21 Nov" in the resident's language. Session dates are UTC days (sessionLedger). */
function useDateLabel() {
  const { t, i18n } = useTranslation();
  return (date: string, today: string) => {
    if (date === today) return t('summary.history.today', 'Today');
    try {
      return new Intl.DateTimeFormat(i18n.language, { day: 'numeric', month: 'short', timeZone: 'UTC' })
        .format(new Date(`${date}T00:00:00Z`));
    } catch {
      return date.slice(5);
    }
  };
}

/**
 * The 10-minute summary's "HISTORY METRICS" expander (FINAL_SPEC 7.5; amends p4 for the
 * bar, owner 2026-11-23 for the contents). Closed by default. Open, it shows each of
 * today's skills as a row of bars, one per recent session, with the score over each
 * bar and the dates once along the bottom. Every bar carries its number, as residents
 * cannot hover; today's bar is solid and earlier ones are lighter.
 */
export default function HistoryMetrics({ history, today }: { history: History; today: string }) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const dateLabel = useDateLabel();
  const [open, setOpen] = useState(false);
  const panelId = useId();
  const panelRef = useRef<HTMLDivElement>(null);

  // The summary scrolls; opening the panel at the bottom must bring it into view.
  useEffect(() => {
    if (open) panelRef.current?.scrollIntoView({ block: 'nearest', behavior: reduced ? 'auto' : 'smooth' });
  }, [open, reduced]);

  if (history.rows.length === 0) return null;
  const firstTime = history.dates.length <= 1;
  const columns = `repeat(${history.dates.length}, minmax(0, 1fr))`;

  return (
    <div style={{ width: '100%', maxWidth: 380, marginTop: 18 }}>
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="font-baloo"
        style={{
          width: '100%', minHeight: 52, padding: '0 18px', borderRadius: 14, border: 'none',
          background: SCORE_UI.historyFace, boxShadow: `0 4px 0 ${SCORE_UI.historyEdge}`,
          color: SCORE_UI.historyInk, fontSize: 17, fontWeight: 800, letterSpacing: '0.06em',
          display: 'flex', alignItems: 'center', justifyContent: 'center', position: 'relative',
          cursor: 'pointer',
        }}
      >
        {t('summary.history.title', 'HISTORY METRICS')}
        <svg
          width="22" height="22" viewBox="0 0 22 22" aria-hidden="true"
          style={{
            position: 'absolute', right: 16,
            transform: open ? 'rotate(180deg)' : undefined,
            transition: reduced ? undefined : 'transform 200ms ease',
          }}
        >
          <path d="M4 8 L11 15 L18 8" fill="none" stroke={SCORE_UI.historyInk} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </button>

      <div
        id={panelId}
        ref={panelRef}
        hidden={!open}
        style={{
          marginTop: 14, padding: '12px 12px 10px', borderRadius: 16,
          background: SCORE_UI.ringCard, textAlign: 'left',
        }}
      >
        <p style={{ fontSize: 16, fontWeight: 700, color: SCORE_UI.label, textAlign: 'center' }}>
          {firstTime
            ? t('summary.history.firstTime', 'Your history starts today. Come back tomorrow!')
            : t('summary.history.subtitle', 'Your last {{count}} sessions', { count: history.dates.length })}
        </p>

        {!firstTime && (
          <>
            {history.rows.map((row) => {
              const colour = skillColour(row.skill);
              const name = t(SKILLS[row.skill].nameKey, row.skill);
              return (
                <div key={row.skill} style={{ marginTop: 12 }}>
                  <p style={{ display: 'flex', alignItems: 'center', gap: 8, fontSize: 17, fontWeight: 800 }}>
                    <span aria-hidden="true" style={{ width: 12, height: 12, borderRadius: 6, background: colour }} />
                    {name}
                  </p>
                  <ul
                    aria-label={name}
                    style={{
                      display: 'grid', gridTemplateColumns: columns, columnGap: 2, marginTop: 4, minHeight: BAR_AREA + 22,
                      borderBottom: `1px solid ${SCORE_UI.ringTrack}`, listStyle: 'none', padding: 0,
                    }}
                  >
                    {row.scores.map((score, i) => {
                      const date = history.dates[i];
                      const label = `${dateLabel(date, today)}: ${score ?? t('summary.history.notPlayed', 'Not played')}`;
                      return (
                        <li
                          key={date}
                          aria-label={label}
                          style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'flex-end' }}
                        >
                          <span aria-hidden="true" style={{ fontSize: 14, fontWeight: 700, color: score === null ? SCORE_UI.label : '#FFFFFF' }}>
                            {score ?? '-'}
                          </span>
                          <span
                            aria-hidden="true"
                            style={{
                              width: '60%', maxWidth: 24, marginTop: 2,
                              height: score === null ? 0 : Math.max(3, (score / 100) * BAR_AREA),
                              borderRadius: '4px 4px 0 0', background: colour,
                              opacity: date === today ? 1 : 0.6,
                            }}
                          />
                        </li>
                      );
                    })}
                  </ul>
                </div>
              );
            })}
            <div
              aria-hidden="true"
              style={{ display: 'grid', gridTemplateColumns: columns, columnGap: 2, marginTop: 6 }}
            >
              {history.dates.map((date) => (
                <span
                  key={date}
                  style={{
                    fontSize: 13, lineHeight: 1.2, textAlign: 'center', color: SCORE_UI.label,
                    fontWeight: date === today ? 800 : 600,
                  }}
                >
                  {dateLabel(date, today)}
                </span>
              ))}
            </div>
          </>
        )}
      </div>
    </div>
  );
}
