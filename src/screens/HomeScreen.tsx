import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { checkForResumableSession } from '../lib/resumeSession';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { SessionState } from '../lib/db';

const CATEGORY_ICONS: Record<string, string> = {
  memory:    '🧠',
  attention: '🎯',
  executive: '🗂️',
};

function getGreeting(): string {
  const hour = new Date().getHours();
  if (hour < 12) return 'greeting.morning';
  if (hour < 17) return 'greeting.afternoon';
  return 'greeting.evening';
}

const GAME_BY_CATEGORY: Record<string, string[]> = {
  memory:    ['remember-match'],
  attention: ['spot-focus'],
  executive: ['morning-routine-quest'],
};

function pickGame(category: string): string {
  const games = GAME_BY_CATEGORY[category] ?? [];
  return games[Math.floor(Math.random() * games.length)];
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile    = useAppStore((s) => s.activeProfile);
  const session    = useAppStore((s) => s.currentSession);
  const startSession       = useAppStore((s) => s.startSession);
  const setCurrentGame     = useAppStore((s) => s.setCurrentGame);

  const [resumeState, setResumeState] = useState<SessionState | null>(null);
  const [checkingResume, setCheckingResume] = useState(true);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';

  useEffect(() => {
    if (!profile) return;
    checkForResumableSession(profile.userId).then((state) => {
      setResumeState(state);
      setCheckingResume(false);
    });
  }, [profile]);

  function handleStartSession() {
    startSession();
    if (session.questionnaireCompleted) {
      // Already done questionnaire today — pick a game from focus category
      const category = session.focusCategory ?? 'memory';
      const gameId = pickGame(category);
      setCurrentGame(gameId);
      navigate(`/app/game/${gameId}`);
    } else {
      navigate('/app/questionnaire');
    }
  }

  function handleResume() {
    if (!resumeState) return;
    track('session_resumed', {
      secondsGap: resumeState.sessionStartedAt
        ? Math.floor((Date.now() - resumeState.sessionStartedAt) / 1000)
        : 0,
      gameId: resumeState.currentGameId ?? '',
    });
    navigate(`/app/game/${resumeState.currentGameId}`);
  }

  const allCategories = ['memory', 'attention', 'executive'];
  const allDone = allCategories.every((c) => session.categoriesCompleted.includes(c));
  const todayDone = session.date === new Date().toISOString().split('T')[0];

  if (checkingResume) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 max-w-2xl mx-auto w-full">
      {/* Greeting */}
      <div className="mb-10">
        <h2 className="text-h1 font-bold text-body-text mb-2">
          {t(getGreeting())}, {firstName}!
        </h2>
        <p className="text-h3 text-caption-text">{t('home.subtitle', "Let's train your brain today!")}</p>
      </div>

      {/* Resume banner */}
      {resumeState && !allDone && (
        <Card className="mb-8 bg-blue-50 border-primary-blue border-2">
          <p className="text-h3 font-bold text-primary-blue mb-2">
            {t('home.resume.title', { name: firstName })}
          </p>
          <p className="text-body-md text-body-text mb-6">{t('home.resume.message')}</p>
          <div className="flex gap-4 flex-wrap">
            <Button onClick={handleResume}>{t('btn.continue')}</Button>
            <Button variant="ghost" onClick={handleStartSession}>{t('btn.startFresh')}</Button>
          </div>
        </Card>
      )}

      {/* Today's progress */}
      {todayDone && session.categoriesCompleted.length > 0 && (
        <Card className="mb-8">
          <p className="text-h3 font-semibold text-body-text mb-4">Today's progress:</p>
          <div className="flex gap-4 flex-wrap">
            {session.categoriesCompleted.map((cat) => (
              <div key={cat} className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                <span className="text-body-md font-semibold text-emerald-green">
                  {t(`game.category.${cat}`)}
                </span>
                <span className="text-emerald-green">✓</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main CTA */}
      {allDone && todayDone ? (
        <Card className="text-center py-12">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-h2 font-bold text-body-text mb-2">{t('home.sessionComplete')}</p>
          <p className="text-h3 text-caption-text">{t('summary.seeYou')}</p>
        </Card>
      ) : (
        <Button fullWidth size="lg" onClick={handleStartSession} className="text-h2">
          {t('btn.startSession')}
        </Button>
      )}

      {/* Settings link */}
      <div className="mt-8 text-center">
        <button
          onClick={() => navigate('/app/settings')}
          className="text-body-md text-caption-text underline"
        >
          {t('nav.settings', 'Settings')}
        </button>
      </div>
    </div>
  );
}
