import { useRef, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import type { GameCategory } from '../styles/tokens';

const GAME_BY_CATEGORY: Record<GameCategory, string[]> = {
  memory:    ['remember-match', 'shopping-list-recall', 'sequence-repeat'],
  attention: ['spot-focus', 'word-search', 'focus-filter'],
  executive: ['morning-routine-quest', 'recipe-builder', 'garden-sequencer'],
};

function pickGame(category: GameCategory): string {
  const games = GAME_BY_CATEGORY[category];
  return games[Math.floor(Math.random() * games.length)];
}

export default function DailyQuestionnaire() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const session                   = useAppStore((s) => s.currentSession);
  const markQuestionnaireComplete = useAppStore((s) => s.markQuestionnaireComplete);
  const setCurrentGame            = useAppStore((s) => s.setCurrentGame);
  const setCurrentCategory        = useAppStore((s) => s.setCurrentCategory);
  const navigatingRef = useRef(false);

  // Guard: if questionnaire already done for today, redirect to home (only on mount)
  useEffect(() => {
    if (session.questionnaireCompleted && !navigatingRef.current) {
      navigate('/app/home', { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function handleLetsBegin() {
    navigatingRef.current = true;
    // Always start with Memory category, pick a random memory game
    const firstCategory: GameCategory = 'memory';
    const gameId = pickGame(firstCategory);

    setCurrentCategory(firstCategory);
    setCurrentGame(gameId);
    markQuestionnaireComplete();

    track('session_workout_started', {
      firstGame: gameId,
      dayOfWeek: new Date().toLocaleDateString('en-US', { weekday: 'long' }),
    });

    navigate(`/app/game/${gameId}`);
  }

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 max-w-xl mx-auto w-full">
      <div className="text-center mb-6">
        <div className="text-6xl mb-3">🧠</div>
        <h2 className="text-h1 font-bold text-body-text mb-2">
          {t('questionnaire.intro.title', "Your Daily Brain Workout")}
        </h2>
        <p className="text-h3 text-caption-text">
          {t('questionnaire.intro.message', "Today's session will exercise three key areas of your brain.")}
        </p>
      </div>

      <div className="w-full space-y-3 mb-8">
        {[
          { icon: '🧠', num: '1', label: t('game.category.memory', 'Memory'), desc: t('questionnaire.intro.memory', 'Remember and recall patterns') },
          { icon: '🎯', num: '2', label: t('game.category.attention', 'Attention'), desc: t('questionnaire.intro.attention', 'Focus and filter information') },
          { icon: '🗂️', num: '3', label: t('game.category.executive', 'Executive Function'), desc: t('questionnaire.intro.executive', 'Plan, organise and problem-solve') },
        ].map(({ icon, num, label, desc }) => (
          <div key={num} className="flex items-center gap-4 bg-card-bg rounded-2xl px-5 py-4 shadow-sm">
            <div className="flex items-center justify-center w-10 h-10 rounded-full bg-primary-blue text-white font-bold text-body-md flex-shrink-0">
              {num}
            </div>
            <span className="text-3xl flex-shrink-0">{icon}</span>
            <div>
              <p className="text-h3 font-semibold text-body-text leading-tight mb-1">{label}</p>
              <p className="text-body-md text-caption-text leading-snug">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <p className="text-body-md text-caption-text text-center mb-8">
        {t('questionnaire.intro.duration', '~10 minutes per area • 30 minutes total')}
      </p>

      <Button fullWidth onClick={handleLetsBegin}>
        {t('btn.letsBegin', "Let's Begin")}
      </Button>
    </div>
  );
}
