import { useEffect } from 'react';
import { Outlet, useNavigate, useMatch } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import RotateDevice from './RotateDevice';

type Lang = 'en' | 'hi' | 'kn';
const LANGS: { code: Lang; label: string }[] = [
  { code: 'en', label: 'EN' },
  { code: 'hi', label: 'हि' },
  { code: 'kn', label: 'ಕ' },
];

export default function AppShell() {
  const { t, i18n } = useTranslation();
  const navigate = useNavigate();
  const settings = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);
  const isOnline = useOnlineStatus();

  /*
   * Chrome is the largest single lever on board size at 360px wide, and none of what the
   * app header offers is something a resident does mid-round: they are not switching
   * language or opening settings while guests walk out. Both remain one tap away from
   * Home, Rotation and Settings. Hiding the header returns 80px, and the offline banner
   * another 48px - and offline is the normal case on care-home wifi, not an edge case.
   *
   * The component stays mounted either way, so the text-size effect below keeps running.
   */
  const inGame = useMatch('/app/game/:gameId') !== null;

  useEffect(() => {
    const html = document.documentElement;
    html.className = html.className.replace(/\btext-size-\w+\b/g, '').trim();
    html.classList.add(`text-size-${settings.textSize}`);
  }, [settings.textSize]);

  function changeLang(lang: Lang) {
    const from = settings.language;
    if (from === lang) return;
    i18n.changeLanguage(lang);
    updateSetting('language', lang);
    track('language_changed', { fromLang: from, toLang: lang });
  }

  return (
    <div className="app-root bg-app-bg flex flex-col">
      {/* Top bar. Absent on a game route, where the board needs the 80px more than the
          resident needs a language switcher mid-round. `sticky` is gone with it: main
          owns the scroll now, so the header never had anything to stick against. */}
      {!inGame && (
      <header className="bg-card-bg shadow-sm flex-none px-6 py-4 flex items-center justify-between">
        <h1 className="text-h2 font-bold text-primary-blue">{t('app.name')}</h1>

        <div className="flex items-center gap-3">
          {/* Language toggle */}
          <div className="flex rounded-xl overflow-hidden border border-gray-200" role="group" aria-label="Language selector">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => changeLang(code)}
                className={`px-4 py-2 text-body-md font-semibold transition-colors min-h-[44px] min-w-[44px]
                  ${settings.language === code
                    ? 'bg-primary-blue text-white'
                    : 'bg-card-bg text-caption-text hover:bg-hover-state'
                  }`}
                aria-label={`Switch to ${code}`}
                aria-pressed={settings.language === code}
              >
                {label}
              </button>
            ))}
          </div>

          {/* Settings */}
          <button
            onClick={() => navigate('/app/settings')}
            className="w-12 h-12 rounded-xl flex items-center justify-center hover:bg-hover-state transition-colors text-2xl"
            aria-label={t('nav.settings')}
          >
            ⚙️
          </button>
        </div>
      </header>
      )}

      {/* Offline banner. Also hidden in a game: it carries no action, and it is visible
          on Home before the round starts. */}
      {!isOnline && !inGame && (
        <div className="bg-accent-amber/20 border-b border-accent-amber flex-none px-6 py-3 text-center" role="status">
          <p className="text-body-md text-amber-800 font-medium">{t('offline.banner')}</p>
        </div>
      )}

      {/* Main content */}
      {/*
        `min-h-0` is load-bearing. A flex child defaults to `min-height: auto`, which lets
        its content push it taller than its parent - the same content-sizing bug the play
        box exists to kill, one level up.

        The scroll lives here rather than on the document, because .app-root is a fixed
        height box now: without it, a screen taller than the viewport (Settings is 1322px
        at 360px wide) simply paints below the fold with no way to reach it. Task 5 makes
        this conditional, so a game route gets `overflow-hidden` instead.
      */}
      <main
        className={`flex-1 min-h-0 flex flex-col ${inGame ? 'overflow-hidden' : 'overflow-y-auto'}`}
        role="main"
      >
        <Outlet />
      </main>

      {/* A cover, not a replacement: the app above stays mounted and keeps its state, so
          tilting a tablet mid-round does not cost the resident the round. */}
      <RotateDevice />
    </div>
  );
}
