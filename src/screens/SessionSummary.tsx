import { useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';

const CATEGORY_INFO: Record<string, { icon: string; labelKey: string }> = {
  memory:    { icon: '🧠', labelKey: 'game.category.memory' },
  attention: { icon: '🎯', labelKey: 'game.category.attention' },
  executive: { icon: '🗂️', labelKey: 'game.category.executive' },
};

export default function SessionSummary() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile  = useAppStore((s) => s.activeProfile);
  const session  = useAppStore((s) => s.currentSession);
  const firedRef = useRef(false);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';

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
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full text-center">
      <div className="text-8xl mb-6">🎉</div>
      <h2 className="text-h1 font-bold text-body-text mb-3">
        {t('summary.title', { name: firstName })}
      </h2>
      <p className="text-h3 text-caption-text mb-10">{t('summary.completed')}</p>

      {/* Categories completed */}
      <div className="w-full mb-10">
        <p className="text-body-md font-semibold text-caption-text mb-5">{t('summary.categories.title')}</p>
        <div className="flex flex-col gap-4">
          {['memory', 'attention', 'executive'].map((cat) => {
            const info = CATEGORY_INFO[cat];
            const done = session.categoriesCompleted.includes(cat);
            return (
              <div
                key={cat}
                className={`flex items-center gap-5 rounded-2xl px-6 py-5 ${
                  done ? 'bg-green-50 border-2 border-emerald-green' : 'bg-gray-50 border-2 border-gray-200'
                }`}
              >
                <span className="text-4xl">{info.icon}</span>
                <p className="text-h3 font-semibold text-body-text">{t(info.labelKey)}</p>
                {done && <span className="ml-auto text-emerald-green text-3xl">✓</span>}
              </div>
            );
          })}
        </div>
      </div>

      <p className="text-h2 font-semibold text-accent-purple mb-10">{t('summary.seeYou')}</p>

      <Button fullWidth onClick={() => navigate('/app/home')}>
        {t('btn.backHome')}
      </Button>
    </div>
  );
}
