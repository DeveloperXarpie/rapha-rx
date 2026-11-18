import { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import * as fullscreen from '../lib/fullscreen';
import { DEBUG_LEVELS_PATH } from '../lib/debugLevels';
import { getGame, sessionGamesByCategory } from '../lib/gameCatalog';
import {
  CATEGORY_ORDER, categoryStatus, isDayComplete, pendingUnlock, tapOutcome,
} from '../lib/sessionLedger';
import { todayISO } from '../lib/dates';
import ScreenBlue from '../components/chrome/ScreenBlue';
import CategoryPanel from '../components/chrome/CategoryPanel';
import HomePopup from '../components/chrome/HomePopup';
import ScreenTransition from '../components/chrome/ScreenTransition';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';
import { version } from '../../package.json';

// Taps on the version label needed to reveal the session shortcuts in a
// production build. Deliberately more than a resident would ever land on.
const DEV_UNLOCK_TAPS = 5;

/** Matches the session summary's primary green button. */
const PRIMARY_ACTION = { minWidth: 262, maxWidth: '100%' } as const;

type Popup = { kind: 'locked' } | { kind: 'completed'; gameId: string } | null;

/*
 * v2 Home (FINAL_SPEC section 6, Mock 1). The resident picks any game in an open
 * category; there is no Start Session or Continue any more. What is open, done or
 * locked comes from sessionLedger.ts.
 */
export default function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile           = useAppStore((s) => s.activeProfile);
  const session           = useAppStore((s) => s.currentSession);
  const ensureToday       = useAppStore((s) => s.ensureToday);
  const setCurrentGame    = useAppStore((s) => s.setCurrentGame);
  const markUnlockSeen    = useAppStore((s) => s.markUnlockSeen);
  const devCompleteCategory = useAppStore((s) => s.devCompleteCategory);
  const devCompleteToday  = useAppStore((s) => s.devCompleteToday);
  const devResetToday     = useAppStore((s) => s.devResetToday);

  const [popup, setPopup] = useState<Popup>(null);
  const [versionTaps, setVersionTaps] = useState(0);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';
  const completed = session.categoriesCompleted;
  const dayDone = isDayComplete(completed);
  const unlocking = pendingUnlock(completed, session.unlocksSeen);

  // SessionManager mounts once per page load, so arriving here is the other
  // chance to notice a new day on a tablet left open overnight.
  useEffect(() => { ensureToday(); }, [ensureToday]);

  const onUnlockAnimationEnd = useCallback(() => {
    if (unlocking) markUnlockSeen(unlocking);
  }, [unlocking, markUnlockSeen]);

  /*
   * Fullscreen has to start inside the tap: a browser grants it only from a user
   * gesture, so a mount or route-change effect would be refused. AppShell keeps
   * it from there on - see its re-entry listener.
   */
  function openGame(gameId: string) {
    setPopup(null);
    ensureToday();
    setCurrentGame(gameId);
    fullscreen.arm();
    void fullscreen.enter();
    // Education shows once a day, before the first game; it continues to this
    // game's intro through currentGameId. Read after ensureToday, so a new day
    // shows it again.
    const { educationSeen } = useAppStore.getState().currentSession;
    navigate(educationSeen ? `/app/game/${gameId}/intro` : '/app/education');
  }

  /*
   * Judged against today's ledger, not the one rendered: a tablet left on Home
   * overnight still shows yesterday until something re-renders it.
   */
  function handleTileTap(gameId: string) {
    const game = getGame(gameId);
    if (!game) return;
    const action = tapOutcome(useAppStore.getState().currentSession, todayISO(), game.category);
    ensureToday();
    if (action === 'play') openGame(gameId);
    else if (action === 'locked') setPopup({ kind: 'locked' });
    else setPopup({ kind: 'completed', gameId });
  }

  function enterFreePlay() {
    ensureToday();
    // A new day since the screen was drawn: Free Play is closed again.
    if (!isDayComplete(useAppStore.getState().currentSession.categoriesCompleted)) return;
    fullscreen.arm();
    void fullscreen.enter();
    navigate('/app/free-play');
  }

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning', 'Good Morning');
    if (hour < 17) return t('greeting.afternoon', 'Good Afternoon');
    return t('greeting.evening', 'Good Evening');
  }

  return (
    <ScreenBlue>
      <ScreenTransition name="homeToIntro">
        {/* Header */}
        <div
          style={{
            position: 'relative', display: 'flex', alignItems: 'flex-start',
            justifyContent: 'space-between', padding: '16px 20px 0',
          }}
        >
          <img src="/brand/logo-white.png" alt={t('app.name')} style={{ width: 136 }} />
          <button
            onClick={() => navigate('/app/settings')}
            aria-label={t('nav.settings')}
            style={{
              display: 'flex', flexDirection: 'column', alignItems: 'center',
              justifyContent: 'center', gap: 2,
              color: '#FFFFFF', minHeight: 80, minWidth: 80,
            }}
          >
            <span style={{ fontSize: 52, lineHeight: 1 }} aria-hidden="true">&#9881;</span>
            <span
              className="font-baloo"
              style={{ fontSize: 15, fontWeight: 700, letterSpacing: '0.1em' }}
            >
              {t('nav.settings', 'SETTINGS').toUpperCase()}
            </span>
          </button>
        </div>

        {/* Greeting */}
        <div style={{ position: 'relative', padding: '12px 20px 0', textAlign: 'center' }}>
          <p className="font-baloo" style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </p>
          <p className="font-baloo" style={{ fontSize: 18, fontWeight: 600, color: BRAND.cyan }}>
            {dayDone
              ? t('home.sessionComplete', "Today's workout is complete.")
              : t('home.prompt', 'What would you like to play today?')}
          </p>
        </div>

        {/* One panel per category, in unlock order (D6) */}
        <div
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            gap: 14, padding: '0 20px', marginTop: 20,
          }}
        >
          {CATEGORY_ORDER.map((category) => (
            <CategoryPanel
              key={category}
              category={category}
              status={categoryStatus(category, completed)}
              games={sessionGamesByCategory(category)}
              unlocking={unlocking === category}
              onTileTap={handleTileTap}
              onUnlockAnimationEnd={onUnlockAnimationEnd}
            />
          ))}
        </div>

        {/*
         * `marginTop: auto` pins this to the bottom only while there is spare
         * room; paddingTop is the floor that cannot collapse.
         */}
        <div style={{ position: 'relative', margin: 'auto 20px 30px', paddingTop: 24 }}>
          {dayDone && (
            <div style={{ display: 'flex', justifyContent: 'center' }}>
              <Button variant="green" style={PRIMARY_ACTION} onClick={enterFreePlay}>
                {t('home.freePlay', 'Free Play')}
              </Button>
            </div>
          )}

          <button
            onClick={() => setVersionTaps((n) => n + 1)}
            style={{
              display: 'block', margin: '10px auto 0', fontSize: 10,
              color: 'rgba(255,255,255,0.45)',
            }}
          >
            v{version}
          </button>

          {/* Session shortcuts. Shown outright in dev; in production they stay
              hidden until the version label is tapped DEV_UNLOCK_TAPS times, so
              a resident cannot reach them by accident. */}
          {(import.meta.env.DEV || versionTaps >= DEV_UNLOCK_TAPS) && (
            <div style={{ display: 'flex', flexWrap: 'wrap', justifyContent: 'center', gap: 12, paddingTop: 10 }}>
              {[
                { label: 'dev: finish category', run: () => void devCompleteCategory() },
                { label: 'dev: complete today', run: () => void devCompleteToday() },
                { label: 'dev: reset today', run: () => void devResetToday() },
                { label: 'dev: levels', run: () => navigate(DEBUG_LEVELS_PATH) },
              ].map((d) => (
                <button
                  key={d.label}
                  onClick={d.run}
                  className="font-mono"
                  style={{ fontSize: 12, color: '#FFE9A8', border: '1px dashed #FFE9A8', borderRadius: 4, padding: '4px 10px' }}
                >
                  {d.label}
                </button>
              ))}
            </div>
          )}
        </div>
      </ScreenTransition>

      {popup?.kind === 'locked' && (
        <HomePopup
          message={t('home.locked', 'Play the assigned games.')}
          actions={[{ label: t('btn.ok', 'OK'), onClick: () => setPopup(null) }]}
        />
      )}
      {popup?.kind === 'completed' && (
        <HomePopup
          message={t('home.completed', 'You have finished this today.')}
          actions={[
            { label: t('btn.proceed', 'Proceed'), onClick: () => openGame(popup.gameId) },
            { label: t('btn.back', 'Back'), onClick: () => setPopup(null), variant: 'secondary' },
          ]}
        />
      )}
    </ScreenBlue>
  );
}
