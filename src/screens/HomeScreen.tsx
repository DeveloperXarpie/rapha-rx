import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { checkForResumableSession } from '../lib/resumeSession';
import * as fullscreen from '../lib/fullscreen';
import { getLastLevels } from '../lib/lastLevel';
import { getGame, marqueeGames, tileArt } from '../lib/gameCatalog';
import { ROTATION_THRESHOLD_SECONDS } from '../components/GameShell';
import ScreenBlue from '../components/chrome/ScreenBlue';
import GameRow from '../components/chrome/GameRow';
import ScreenTransition from '../components/chrome/ScreenTransition';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';
import { version } from '../../package.json';

// Taps on the version label needed to reveal the session shortcuts in a
// production build. Deliberately more than a resident would ever land on.
const DEV_UNLOCK_TAPS = 5;

const CATEGORY_COUNT = 3;

/** Matches the session summary's primary green button. */
const PRIMARY_ACTION = { minWidth: 262, maxWidth: '100%' } as const;

export default function HomeScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const profile          = useAppStore((s) => s.activeProfile);
  const session          = useAppStore((s) => s.currentSession);
  const startSession     = useAppStore((s) => s.startSession);
  const devCompleteToday = useAppStore((s) => s.devCompleteToday);
  const devResetToday    = useAppStore((s) => s.devResetToday);

  const [isResumable, setIsResumable] = useState(false);
  const [lastLevels, setLastLevels] = useState<Record<string, number>>({});
  const [refreshKey, setRefreshKey] = useState(0);
  const [versionTaps, setVersionTaps] = useState(0);

  const firstName = profile?.nickname ?? profile?.firstName ?? '';

  const todayISO = new Date().toISOString().split('T')[0];
  const allDone = ['memory', 'attention', 'executive']
    .every((c) => session.categoriesCompleted.includes(c));
  const todayDone = session.date === todayISO && allDone;

  /*
   * Home has to show the three games before the session starts, so it starts
   * the session on arrival rather than previewing a trio it might contradict.
   * startSession is idempotent for today - it returns early once sessionStarted
   * is set - so this neither re-rolls the trio nor wipes progress on a revisit.
   */
  useEffect(() => {
    if (!profile) return;
    if (session.date !== todayISO || !session.sessionStarted) startSession();
  }, [profile, session.date, session.sessionStarted, todayISO, startSession]);

  useEffect(() => {
    if (!profile) return;
    checkForResumableSession(profile.userId).then((r) => setIsResumable(!!r));
  }, [profile, refreshKey]);

  const planned = session.plannedGames ?? [];

  useEffect(() => {
    if (!profile || planned.length === 0) return;
    getLastLevels(profile.userId, planned).then(setLastLevels);
  }, [profile, planned.join(','), refreshKey]); // eslint-disable-line react-hooks/exhaustive-deps

  /*
   * The three taps below are the only places a session begins, and each one goes
   * fullscreen on the way in. It has to happen here rather than in AppShell: a browser
   * grants fullscreen only from inside a user gesture, so a mount or route-change effect
   * would simply be refused. AppShell keeps it from there on - see the re-entry listener.
   */
  function enterSession(to: string) {
    fullscreen.arm();
    void fullscreen.enter();
    navigate(to);
  }

  function handleStartSession() {
    startSession();
    enterSession('/app/education');
  }

  function handleResumeSession() {
    // Back into the intro for whichever category was in play. The old rotation
    // screen this used to target is gone.
    enterSession(`/app/intro/${session.currentCategory ?? 'memory'}`);
  }

  // Re-runs the lookups once the Dexie write lands, so the screen reflects the
  // new session state without a manual refresh.
  async function handleDevAction(action: () => Promise<void>) {
    await action();
    setRefreshKey((k) => k + 1);
  }

  function getGreeting(): string {
    const hour = new Date().getHours();
    if (hour < 12) return t('greeting.morning', 'Good Morning');
    if (hour < 17) return t('greeting.afternoon', 'Good Afternoon');
    return t('greeting.evening', 'Good Evening');
  }

  /*
   * Derived, not the handoff's hardcoded "30 minutes". A category rotates after
   * ROTATION_THRESHOLD_SECONDS, so three of them is the real session length -
   * currently six minutes. If the therapeutic dose changes, this follows it.
   */
  const minutes = Math.round((ROTATION_THRESHOLD_SECONDS * CATEGORY_COUNT) / 60);

  // The marquee games not chosen for today. Not locked - just not today's -
  // which is why the strip says ANOTHER DAY rather than the handoff's
  // UNLOCKS LATER.
  const anotherDay = marqueeGames().filter((g) => !planned.includes(g.id));

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

        {/* Greeting. Centred per the Sep-9 review; the logo and settings above it
            keep the header's own left/right split. */}
        <div style={{ position: 'relative', padding: '12px 20px 0', textAlign: 'center' }}>
          <p className="font-baloo" style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {getGreeting()}{firstName ? `, ${firstName}` : ''}
          </p>
          <p className="font-baloo" style={{ fontSize: 18, fontWeight: 600, color: BRAND.cyan }}>
            {todayDone
              ? t('home.sessionComplete', "Today's workout is complete.")
              : t('home.duration', "Today's Workout takes {{minutes}} minutes.", { minutes })}
          </p>
        </div>

        {/* Today's three games */}
        <div
          style={{
            position: 'relative', display: 'flex', flexDirection: 'column',
            gap: 14, padding: '0 20px', marginTop: 22,
          }}
        >
          {planned.map((id) => {
            const game = getGame(id);
            if (!game) return null;
            return <GameRow key={id} game={game} lastLevel={lastLevels[id] ?? null} />;
          })}
        </div>

        {/* The other three marquee games */}
        {anotherDay.length > 0 && (
          <div
            style={{
              position: 'relative', margin: '18px 20px 0', paddingTop: 14,
              borderTop: '1px solid rgba(255,255,255,0.16)',
            }}
          >
            <p
              className="font-baloo"
              style={{ fontSize: 13, fontWeight: 700, letterSpacing: '0.12em', color: BRAND.muted }}
            >
              {t('home.anotherDay', 'ANOTHER DAY')}
            </p>
            <div style={{ display: 'flex', gap: 12, marginTop: 10 }}>
              {anotherDay.map((g) => (
                <img
                  key={g.id}
                  src={tileArt(g)}
                  alt=""
                  aria-hidden="true"
                  width={60}
                  height={60}
                  style={{
                    width: 60, height: 60, borderRadius: 14,
                    filter: 'grayscale(0.9)', opacity: 0.5,
                  }}
                />
              ))}
            </div>
          </div>
        )}

        {/* Primary action */}
        {/*
         * `marginTop: auto` pins this to the bottom only while there is spare
         * room. Once the content is taller than the screen it collapses to
         * zero and the button lands flush against the strip above it, which is
         * what it did on a 480px-wide window. paddingTop is the floor that
         * cannot collapse.
         */}
        <div style={{ position: 'relative', margin: 'auto 20px 30px', paddingTop: 24 }}>
          {/*
           * Centred at the handoff's fixed width rather than stretched. Home was
           * the one screen asking a brand button for fullWidth, so on anything
           * wider than a phone its primary action grew to the whole column while
           * the summary's and the splash's stayed at ~260px.
           */}
          <div style={{ display: 'flex', justifyContent: 'center' }}>
            {todayDone ? (
              <Button variant="green" style={PRIMARY_ACTION} onClick={() => enterSession('/app/free-play')}>
                {t('home.freePlay', 'Free Play')}
              </Button>
            ) : isResumable ? (
              <Button variant="green" style={PRIMARY_ACTION} onClick={handleResumeSession}>
                {t('btn.continue', 'Continue')}
              </Button>
            ) : (
              <Button variant="green" style={PRIMARY_ACTION} onClick={handleStartSession}>
                {t('btn.startSession', 'Start Session')}
              </Button>
            )}
          </div>

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
            <div style={{ display: 'flex', justifyContent: 'center', gap: 12, paddingTop: 10 }}>
              <button
                onClick={() => handleDevAction(devCompleteToday)}
                className="font-mono"
                style={{ fontSize: 12, color: '#FFE9A8', border: '1px dashed #FFE9A8', borderRadius: 4, padding: '4px 10px' }}
              >
                dev: complete today
              </button>
              <button
                onClick={() => handleDevAction(devResetToday)}
                className="font-mono"
                style={{ fontSize: 12, color: '#FFE9A8', border: '1px dashed #FFE9A8', borderRadius: 4, padding: '4px 10px' }}
              >
                dev: reset today
              </button>
            </div>
          )}
        </div>
      </ScreenTransition>
    </ScreenBlue>
  );
}
