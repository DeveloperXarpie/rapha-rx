import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { getLastCompletedSession } from '../lib/db';
import { track } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { SessionState } from '../lib/db';
import type { GameCategory } from '../styles/tokens';

const CATEGORY_ICONS: Record<string, string> = {
  memory:    '🧠',
  attention: '🎯',
  executive: '🗂️',
};

const CATEGORY_LABEL_KEYS: Record<string, string> = {
  memory:    'game.category.memory',
  attention: 'game.category.attention',
  executive: 'game.category.executive',
};

const GAME_BY_CATEGORY: Record<GameCategory, { id: string; nameKey: string; icon: string }[]> = {
  memory: [
    { id: 'remember-match', nameKey: 'game.rememberMatch', icon: '🃏' },
  ],
  attention: [
    { id: 'spot-focus', nameKey: 'game.spotFocus', icon: '👁️' },
  ],
  executive: [
    { id: 'morning-routine-quest', nameKey: 'game.morningRoutine', icon: '☀️' },
  ],
};

function formatSessionDate(dateStr: string): string {
  const sessionDate = new Date(dateStr + 'T00:00:00');
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const yesterday = new Date(today);
  yesterday.setDate(yesterday.getDate() - 1);

  if (sessionDate.getTime() === yesterday.getTime()) {
    return 'Yesterday';
  }
  return sessionDate.toLocaleDateString('en-US', { day: 'numeric', month: 'long' });
}

function formatDuration(startedAt: number | null): string {
  if (!startedAt) return '';
  // Estimate ~30 min sessions since we don't store end time
  return '~30 min';
}

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile    = useAppStore((s) => s.activeProfile);
  const session    = useAppStore((s) => s.currentSession);
  const startSession = useAppStore((s) => s.startSession);

  const [previousSession, setPreviousSession] = useState<SessionState | null>(null);
  const [loading, setLoading] = useState(true);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';

  // Check for previous completed sessions
  useEffect(() => {
    if (!profile) { setLoading(false); return; }
    getLastCompletedSession(profile.userId).then((s) => {
      setPreviousSession(s ?? null);
      setLoading(false);
    });
  }, [profile]);

  function handleStartSession() {
    startSession();
    navigate('/app/questionnaire');
  }

  function handlePracticeGame(gameId: string) {
    track('practice_game_started', { gameId });
    navigate(`/app/game/${gameId}`);
  }

  const allCategories = ['memory', 'attention', 'executive'];
  const allDone = allCategories.every((c) => session.categoriesCompleted.includes(c));
  const todayDone = session.date === new Date().toISOString().split('T')[0] && allDone;

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning', 'Good Morning');
    if (hour < 17) return t('greeting.afternoon', 'Good Afternoon');
    return t('greeting.evening', 'Good Evening');
  }

  if (loading) {
    return (
      <div className="flex-1 flex items-center justify-center">
        <p className="text-h3 text-caption-text">Loading...</p>
      </div>
    );
  }

  return (
    <div className="flex-1 flex flex-col p-8 max-w-2xl mx-auto w-full">
      {/* Greeting */}
      <div className="mb-8">
        <h2 className="text-h1 font-bold text-body-text mb-2">
          {getGreeting()}, {firstName}!
        </h2>
        <p className="text-h3 text-caption-text">{t('home.subtitle', "Let's train your brain today!")}</p>
      </div>

      {/* Previous Session Summary — only for returning users */}
      {previousSession && !todayDone && (
        <Card className="mb-8 bg-gradient-to-br from-blue-50 to-purple-50 border border-primary-blue/20">
          <div className="flex items-center gap-3 mb-4">
            <span className="text-3xl">📊</span>
            <div>
              <p className="text-h3 font-bold text-body-text">
                {t('home.previousSession.title', 'Your Last Session')}
              </p>
              <p className="text-body-md text-caption-text">
                {formatSessionDate(previousSession.date)} • {formatDuration(previousSession.sessionStartedAt)}
              </p>
            </div>
          </div>
          <div className="flex gap-3 flex-wrap mb-4">
            {allCategories.map((cat) => {
              const done = previousSession.categoriesCompleted.includes(cat);
              return (
                <div
                  key={cat}
                  className={`flex items-center gap-2 rounded-xl px-4 py-3 ${
                    done ? 'bg-green-50 border border-emerald-green/30' : 'bg-gray-50 border border-gray-200'
                  }`}
                >
                  <span className="text-xl">{CATEGORY_ICONS[cat]}</span>
                  <span className={`text-body-md font-semibold ${done ? 'text-emerald-green' : 'text-caption-text'}`}>
                    {t(CATEGORY_LABEL_KEYS[cat])}
                  </span>
                  {done && <span className="text-emerald-green">✓</span>}
                </div>
              );
            })}
          </div>
          {previousSession.categoriesCompleted.length >= 3 && (
            <p className="text-body-md text-accent-purple font-semibold">
              🌟 {t('home.previousSession.allDone', 'Great work! You trained all 3 areas.')}
            </p>
          )}
        </Card>
      )}

      {/* Today's progress (if session in progress but not finished) */}
      {session.date === new Date().toISOString().split('T')[0] && session.categoriesCompleted.length > 0 && !todayDone && (
        <Card className="mb-8">
          <p className="text-h3 font-semibold text-body-text mb-4">
            {t('home.progress', "Today's progress:")}
          </p>
          <div className="flex gap-4 flex-wrap">
            {session.categoriesCompleted.map((cat) => (
              <div key={cat} className="flex items-center gap-2 bg-green-50 rounded-xl px-4 py-3">
                <span className="text-2xl">{CATEGORY_ICONS[cat]}</span>
                <span className="text-body-md font-semibold text-emerald-green">
                  {t(CATEGORY_LABEL_KEYS[cat])}
                </span>
                <span className="text-emerald-green">✓</span>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Main CTA */}
      {todayDone ? (
        <Card className="text-center py-12 mb-8">
          <p className="text-5xl mb-4">🎉</p>
          <p className="text-h2 font-bold text-body-text mb-2">{t('home.sessionComplete', "Today's session is complete!")}</p>
          <p className="text-h3 text-caption-text">{t('home.practiceBelow', 'You can practise any game below.')}</p>
        </Card>
      ) : (
        <Button fullWidth size="lg" onClick={handleStartSession} className="text-h2 mb-8">
          {t('btn.startSession', 'Start Session')}
        </Button>
      )}

      {/* Practice Mode — only visible after completing today's session */}
      {todayDone && (
        <div className="mb-8">
          <h3 className="text-h2 font-bold text-body-text mb-6">
            {t('home.practiceMode', '🎮 Practice Mode')}
          </h3>
          <p className="text-body-md text-caption-text mb-6">
            {t('home.practiceDesc', 'Choose any game to practise and sharpen your skills.')}
          </p>
          {(Object.entries(GAME_BY_CATEGORY) as [GameCategory, typeof GAME_BY_CATEGORY[GameCategory]][]).map(([category, games]) => (
            <div key={category} className="mb-6">
              <div className="flex items-center gap-2 mb-3">
                <span className="text-2xl">{CATEGORY_ICONS[category]}</span>
                <p className="text-h3 font-semibold text-body-text">{t(CATEGORY_LABEL_KEYS[category])}</p>
              </div>
              <div className="grid grid-cols-1 gap-3">
                {games.map((game) => (
                  <button
                    key={game.id}
                    onClick={() => handlePracticeGame(game.id)}
                    className="w-full min-h-[80px] bg-card-bg rounded-2xl px-6 py-4 flex items-center gap-4
                               border-2 border-transparent hover:border-primary-blue hover:bg-hover-state
                               active:scale-[0.98] transition-all duration-150 shadow-sm text-left"
                  >
                    <span className="text-3xl">{game.icon}</span>
                    <span className="text-h3 font-semibold text-body-text">
                      {t(game.nameKey, game.id.split('-').map(w => w.charAt(0).toUpperCase() + w.slice(1)).join(' '))}
                    </span>
                    <span className="ml-auto text-2xl text-caption-text">›</span>
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Settings link */}
      <div className="mt-auto pt-4 text-center">
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
