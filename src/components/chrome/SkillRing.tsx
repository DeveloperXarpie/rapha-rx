import { useTranslation } from 'react-i18next';
import type { RingChange } from '../../lib/scoring/summary';
import { useReducedMotion } from '../../lib/useReducedMotion';
import { BRAND } from '../../styles/tokens';

const SIZE = 132;
const STROKE = 14;
const R = (SIZE - STROKE) / 2;
const C = 2 * Math.PI * R;

/**
 * One skill on the 10-minute summary (Mock 3): its name, a ring filled to the score,
 * "72 of 100" in the middle, and the change since the last session below - a green
 * up arrow or a red down arrow (D12, D13). The only screen that shows numbers.
 */
export default function SkillRing({ label, score, colour, change }: {
  label: string; score: number; colour: string; change: RingChange | null;
}) {
  const { t } = useTranslation();
  const reduced = useReducedMotion();
  const filled = Math.max(0, Math.min(100, score)) / 100;

  return (
    <div
      style={{
        background: BRAND.surfaceStrong, borderRadius: 20, padding: '12px 8px 14px',
        display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 6,
      }}
    >
      <p className="font-baloo" style={{ fontSize: 16, fontWeight: 800, letterSpacing: '0.06em' }}>
        {label.toUpperCase()}
      </p>
      <div style={{ position: 'relative', width: SIZE, height: SIZE }}>
        <svg width={SIZE} height={SIZE} viewBox={`0 0 ${SIZE} ${SIZE}`} aria-hidden="true">
          <circle cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke="rgba(255,255,255,0.18)" strokeWidth={STROKE} />
          <circle
            cx={SIZE / 2} cy={SIZE / 2} r={R} fill="none" stroke={colour} strokeWidth={STROKE}
            strokeLinecap="round" strokeDasharray={C} strokeDashoffset={C * (1 - filled)}
            transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}
            style={{ transition: reduced ? undefined : 'stroke-dashoffset 700ms ease' }}
          />
        </svg>
        <div
          style={{
            position: 'absolute', inset: 0, display: 'flex', flexDirection: 'column',
            alignItems: 'center', justifyContent: 'center', lineHeight: 1,
          }}
        >
          <span style={{ fontSize: 36, fontWeight: 800 }}>{score}</span>
          <span style={{ fontSize: 13, marginTop: 4, color: BRAND.muted }}>
            {t('summary.ofHundred', 'of 100')}
          </span>
        </div>
      </div>
      {change && (
        <p style={{ fontSize: 14, fontWeight: 700, color: colour, textAlign: 'center' }}>
          {change.dir === 'up' && <span style={{ color: '#5BD16B' }} aria-hidden="true">▲ </span>}
          {change.dir === 'down' && <span style={{ color: '#E5484D' }} aria-hidden="true">▼ </span>}
          {t('summary.sinceLast', '{{delta}} since last session', {
            delta: change.delta > 0 ? `+${change.delta}` : String(change.delta),
          })}
        </p>
      )}
    </div>
  );
}
