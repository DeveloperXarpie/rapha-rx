import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { GameCategory } from '../styles/tokens';

const CATEGORIES: {
  id: GameCategory;
  icon: string;
  labelKey: string;
  descKey: string;
}[] = [
  { id: 'memory',    icon: '🧠', labelKey: 'questionnaire.memory.label',    descKey: 'questionnaire.memory.desc' },
  { id: 'attention', icon: '🎯', labelKey: 'questionnaire.attention.label',  descKey: 'questionnaire.attention.desc' },
  { id: 'executive', icon: '🗂️', labelKey: 'questionnaire.executive.label', descKey: 'questionnaire.executive.desc' },
];

const GAME_BY_CATEGORY: Record<GameCategory, string[]> = {
  memory:    ['remember-match', 'shopping-list-recall', 'sequence-repeat'],
  attention: ['spot-focus', 'target-tap', 'focus-filter'],
  executive: ['morning-routine-quest', 'recipe-builder', 'garden-planner'],
};

function pickGame(category: GameCategory): string {
  const games = GAME_BY_CATEGORY[category];
  return games[Math.floor(Math.random() * games.length)];
}

export default function DailyQuestionnaire() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session                = useAppStore((s) => s.currentSession);
  const setFocusCategory       = useAppStore((s) => s.setFocusCategory);
  const markQuestionnaireComplete = useAppStore((s) => s.markQuestionnaireComplete);
  const setCurrentGame         = useAppStore((s) => s.setCurrentGame);
  const setCurrentCategory     = useAppStore((s) => s.setCurrentCategory);

  const [screen, setScreen] = useState<'intro' | 'pick'>('intro');

  if (session.questionnaireCompleted) {
    navigate('/app/home');
    return null;
  }

  function handleCategorySelect(cat: GameCategory) {
    const gameId = pickGame(cat);
    setFocusCategory(cat);
    markQuestionnaireComplete();
    setCurrentCategory(cat);
    setCurrentGame(gameId);

    track('questionnaire_completed', {
      category: cat,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    });

    navigate(`/app/game/${gameId}`);
  }

  if (screen === 'intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
        <div className="text-center mb-10">
          <div className="text-7xl mb-6">🌟</div>
          <h2 className="text-h1 font-bold text-body-text mb-4">{t('questionnaire.intro.title')}</h2>
          <p className="text-h3 text-caption-text mb-10">{t('questionnaire.intro.message')}</p>
        </div>

        <div className="w-full space-y-4 mb-10">
          {[
            { icon: '🧠', text: 'questionnaire.intro.memory' },
            { icon: '🎯', text: 'questionnaire.intro.attention' },
            { icon: '🗂️', text: 'questionnaire.intro.executive' },
          ].map(({ icon, text }) => (
            <div key={text} className="flex items-center gap-4 bg-card-bg rounded-2xl px-6 py-4">
              <span className="text-3xl">{icon}</span>
              <p className="text-body-md text-body-text">{t(text)}</p>
            </div>
          ))}
        </div>

        <Button fullWidth onClick={() => setScreen('pick')}>
          {t('btn.letsBegin')}
        </Button>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 max-w-xl mx-auto w-full">
      <h2 className="text-h1 font-bold text-body-text mb-8">{t('questionnaire.pick.title')}</h2>

      <div className="space-y-5">
        {CATEGORIES.map((cat) => (
          <button
            key={cat.id}
            onClick={() => handleCategorySelect(cat.id)}
            className="w-full min-h-[120px] bg-card-bg rounded-3xl p-6 flex items-center gap-5
                       border-2 border-transparent hover:border-primary-blue hover:bg-hover-state
                       active:scale-[0.98] transition-all duration-150 shadow-sm text-left"
          >
            <span className="text-5xl flex-shrink-0">{cat.icon}</span>
            <div>
              <p className="text-h2 font-bold text-body-text mb-1">{t(cat.labelKey)}</p>
              <p className="text-body-md text-caption-text">{t(cat.descKey)}</p>
            </div>
            <span className="ml-auto text-3xl text-caption-text">›</span>
          </button>
        ))}
      </div>
    </div>
  );
}
