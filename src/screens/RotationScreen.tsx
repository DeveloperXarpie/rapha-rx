import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { useEffect, useRef } from 'react';

const CATEGORY_INFO: Record<string, { icon: string; labelKey: string }> = {
  memory:    { icon: '🧠', labelKey: 'game.category.memory' },
  attention: { icon: '🎯', labelKey: 'game.category.attention' },
  executive: { icon: '🗂️', labelKey: 'game.category.executive' },
};

export default function RotationScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session = useAppStore((s) => s.currentSession);
  const firedRef = useRef(false);

  const nextCategory = session.currentCategory;
  const nextGameId   = session.currentGameId;
  const info         = nextCategory ? CATEGORY_INFO[nextCategory] : null;

  useEffect(() => {
    if (firedRef.current || !nextCategory) return;
    firedRef.current = true;
    // Get previous category (last in completed before current)
    const completed = session.categoriesCompleted;
    const fromCategory = completed[completed.length - 1] ?? 'unknown';
    track('category_rotated', {
      fromCategory,
      toCategory: nextCategory,
      secondsPlayed: session.secondsInCurrentCategory,
    });
  }, [nextCategory, session]);

  function handleLetsGo() {
    if (!nextGameId) {
      navigate('/app/home');
      return;
    }
    navigate(`/app/game/${nextGameId}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full text-center">
      <div className="text-7xl mb-6">🔄</div>
      <h2 className="text-h1 font-bold text-body-text mb-4">{t('rotation.title')}</h2>
      <p className="text-h3 text-caption-text mb-12">{t('rotation.message')}</p>

      {info && (
        <div className="bg-card-bg rounded-3xl p-8 shadow-sm mb-12 w-full">
          <p className="text-body-md text-caption-text mb-4">{t('rotation.next')}</p>
          <div className="flex items-center justify-center gap-5">
            <span className="text-5xl">{info.icon}</span>
            <p className="text-h2 font-bold text-body-text">{t(info.labelKey)}</p>
          </div>
        </div>
      )}

      <Button fullWidth onClick={handleLetsGo}>
        {t('btn.letsgo')}
      </Button>
    </div>
  );
}
