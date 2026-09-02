import { useEffect } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { useOnlineStatus } from '../hooks/useOnlineStatus';
import RotateDevice from './RotateDevice';
import AppFrame from './chrome/AppFrame';

export default function AppShell() {
  const { t } = useTranslation();
  const settings = useAppStore((s) => s.settings);
  const isOnline = useOnlineStatus();

  /*
   * Full-bleed routes paint to the edges and own their own scrolling: the game
   * board, the game title art, and the category intro. useMatch is exact, so
   * '/app/game/:gameId' would not have covered '/app/game/:gameId/title' and the
   * title art would have inherited the scroll container and the offline banner.
   *
   * The app header that used to live here is gone with the redesign. Home now
   * carries its own, and every other screen is full-bleed. Language switching
   * moved with it - it already exists in Settings.
   */
  const { pathname } = useLocation();
  const fullBleed = /^\/app\/(game|intro)\//.test(pathname);

  useEffect(() => {
    const html = document.documentElement;
    html.className = html.className.replace(/\btext-size-\w+\b/g, '').trim();
    html.classList.add(`text-size-${settings.textSize}`);
  }, [settings.textSize]);


  return (
    <AppFrame>
      {/* Offline banner. Also hidden in a game: it carries no action, and it is visible
          on Home before the round starts. */}
      {!isOnline && !fullBleed && (
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
        className={`flex-1 min-h-0 flex flex-col ${fullBleed ? 'overflow-hidden' : 'overflow-y-auto'}`}
        role="main"
      >
        <Outlet />
      </main>

      {/* A cover, not a replacement: the app above stays mounted and keeps its state, so
          tilting a tablet mid-round does not cost the resident the round. */}
      <RotateDevice />
    </AppFrame>
  );
}
