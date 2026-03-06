import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track } from '../lib/analytics';
import { Toggle } from '../components/ui/Toggle';
import pkg from '../../package.json';
import type { DifficultyOverride, Language, TextSize } from '../styles/tokens';

const CARE_HOME_NAMES: Record<string, string> = {
  'asha-indiranagar':     'Asha Care Home, Indiranagar',
  'vatsalya-koramangala': 'Vatsalya Senior Living, Koramangala',
  'prayag-jayanagar':     'Prayag Care Centre, Jayanagar',
};

export default function SettingsScreen() {
  const { t, i18n } = useTranslation();
  const navigate    = useNavigate();
  const profile     = useAppStore((s) => s.activeProfile);
  const settings    = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);
  const clearProfile  = useAppStore((s) => s.clearProfile);

  function changeSetting<K extends keyof typeof settings>(key: K, value: (typeof settings)[K]) {
    updateSetting(key, value);
    track('settings_changed', { setting: key, newValue: value });
    if (key === 'language') {
      i18n.changeLanguage(value as string);
    }
    if (key === 'textSize') {
      document.documentElement.className = document.documentElement.className
        .replace(/\btext-size-\w+\b/g, '')
        .trim();
      document.documentElement.classList.add(`text-size-${value}`);
    }
  }

  const LANGS: { code: Language; label: string }[] = [
    { code: 'en', label: 'English' },
    { code: 'hi', label: 'हिंदी' },
    { code: 'kn', label: 'ಕನ್ನಡ' },
  ];
  const TEXT_SIZES: { code: TextSize; key: string }[] = [
    { code: 'normal', key: 'settings.textSize.normal' },
    { code: 'large',  key: 'settings.textSize.large'  },
    { code: 'xlarge', key: 'settings.textSize.xlarge' },
  ];
  const DIFFICULTIES: { code: DifficultyOverride; key: string }[] = [
    { code: 'easy',   key: 'settings.difficulty.easy'   },
    { code: 'medium', key: 'settings.difficulty.medium' },
    { code: 'hard',   key: 'settings.difficulty.hard'   },
    { code: 'auto',   key: 'settings.difficulty.auto'   },
  ];

  function handleSwitchProfile() {
    clearProfile();
    navigate('/');
  }

  return (
    <div className="flex-1 flex flex-col p-6 max-w-2xl mx-auto w-full gap-8">
      <h2 className="text-h1 font-bold text-body-text">{t('settings.title')}</h2>

      {/* ── My Preferences ──────────────────────────────────── */}
      <section className="bg-card-bg rounded-3xl p-6 shadow-sm space-y-6">
        <h3 className="text-h2 font-semibold text-body-text">{t('settings.preferences')}</h3>

        {/* Language */}
        <div>
          <p className="text-body-md font-semibold mb-4">{t('settings.language')}</p>
          <div className="flex gap-3 flex-wrap">
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => changeSetting('language', code)}
                className={`min-h-[80px] px-6 py-3 rounded-2xl text-h3 font-semibold border-2 transition-colors
                  ${settings.language === code
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-card-bg text-body-text border-gray-200 hover:border-primary-blue'
                  }`}
                aria-pressed={settings.language === code}
              >
                {label}
              </button>
            ))}
          </div>
        </div>

        {/* Text Size */}
        <div>
          <p className="text-body-md font-semibold mb-4">{t('settings.textSize')}</p>
          <div className="flex gap-3 flex-wrap">
            {TEXT_SIZES.map(({ code, key }) => (
              <button
                key={code}
                onClick={() => changeSetting('textSize', code)}
                className={`min-h-[80px] px-6 py-3 rounded-2xl text-h3 font-semibold border-2 transition-colors
                  ${settings.textSize === code
                    ? 'bg-primary-blue text-white border-primary-blue'
                    : 'bg-card-bg text-body-text border-gray-200 hover:border-primary-blue'
                  }`}
                aria-pressed={settings.textSize === code}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </div>

        {/* Sound */}
        <Toggle
          label={t('settings.sound')}
          checked={settings.soundEnabled}
          onChange={(v) => changeSetting('soundEnabled', v)}
          ariaLabel={t('settings.sound')}
        />
      </section>

      {/* ── Game Difficulty ──────────────────────────────────── */}
      <section className="bg-card-bg rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-h2 font-semibold text-body-text">{t('settings.difficulty')}</h3>
        <div className="flex flex-col gap-4">
          {DIFFICULTIES.map(({ code, key }) => (
            <button
              key={code}
              onClick={() => changeSetting('difficultyOverride', code)}
              className={`min-h-[80px] w-full px-6 py-4 rounded-2xl text-h3 font-semibold border-2 transition-colors text-left flex items-center gap-4
                ${settings.difficultyOverride === code
                  ? 'bg-hover-state border-primary-blue text-primary-blue'
                  : 'bg-card-bg border-gray-200 text-body-text hover:border-primary-blue'
                }`}
              aria-pressed={settings.difficultyOverride === code}
            >
              {settings.difficultyOverride === code && (
                <span className="text-emerald-green text-2xl">✓</span>
              )}
              {t(key)}
            </button>
          ))}
        </div>
      </section>

      {/* ── My Profile ──────────────────────────────────── */}
      <section className="bg-card-bg rounded-3xl p-6 shadow-sm space-y-4">
        <h3 className="text-h2 font-semibold text-body-text">{t('settings.profile')}</h3>
        {profile && (
          <>
            <div>
              <p className="text-h3 font-semibold text-body-text">
                {profile.firstName} {profile.lastName}
              </p>
              {profile.nickname && (
                <p className="text-body-md text-caption-text">"{profile.nickname}"</p>
              )}
            </div>
            <div>
              <p className="text-caption font-semibold text-caption-text uppercase tracking-wide mb-1">
                {t('settings.profile.careHome')}
              </p>
              <p className="text-body-md text-body-text">
                {CARE_HOME_NAMES[profile.careHomeId] ?? profile.careHomeId}
              </p>
            </div>
          </>
        )}
        <button
          onClick={handleSwitchProfile}
          className="min-h-[80px] w-full rounded-2xl border-2 border-gray-200 text-h3 font-semibold text-body-text
                     hover:border-primary-blue hover:text-primary-blue transition-colors px-6 py-4 text-left"
        >
          {t('btn.switchProfile')}
        </button>
      </section>

      {/* ── About ──────────────────────────────────── */}
      <section className="bg-card-bg rounded-3xl p-6 shadow-sm space-y-3">
        <h3 className="text-h2 font-semibold text-body-text">{t('settings.about')}</h3>
        <p className="text-body-md text-body-text">{t('app.name')} v{pkg.version}</p>
        <p className="text-body-md text-caption-text">{t('settings.about.contact')}</p>
      </section>
    </div>
  );
}
