import { useEffect } from 'react';
import { Outlet, useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

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
    <div className="min-h-screen bg-app-bg flex flex-col">
      {/* Top bar */}
      <header className="bg-card-bg shadow-sm px-6 py-4 flex items-center justify-between sticky top-0 z-10">
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

      {/* Offline banner */}
      {!isOnline && (
        <div className="bg-accent-amber/20 border-b border-accent-amber px-6 py-3 text-center" role="status">
          <p className="text-body-md text-amber-800 font-medium">{t('offline.banner')}</p>
        </div>
      )}

      {/* Main content */}
      <main className="flex-1 flex flex-col" role="main">
        <Outlet />
      </main>
    </div>
  );
}
