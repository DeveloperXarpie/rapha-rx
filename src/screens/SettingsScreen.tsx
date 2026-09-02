import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import { upsertUserProfile } from '../lib/db';
import { prescriberName } from '../lib/prescribers';
import ScreenBlue from '../components/chrome/ScreenBlue';
import PrescriberPicker from '../components/chrome/PrescriberPicker';
import { Toggle } from '../components/ui/Toggle';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';
import pkg from '../../package.json';
import type { Language, TextSize } from '../styles/tokens';

const CARD: React.CSSProperties = {
  position: 'relative',
  background: BRAND.surface,
  borderRadius: 20,
  padding: 16,
  marginBottom: 14,
};

export default function SettingsScreen() {
  const { t, i18n }   = useTranslation();
  const navigate      = useNavigate();
  const profile       = useAppStore((s) => s.activeProfile);
  const settings      = useAppStore((s) => s.settings);
  const updateSetting = useAppStore((s) => s.updateSetting);
  const clearProfile  = useAppStore((s) => s.clearProfile);
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [pickerOpen, setPickerOpen] = useState(false);

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

  /*
   * Changing the prescriber changes the stored careHomeId, which re-buckets the
   * resident's Amplitude cohort and moves them between getProfilesByCareHome
   * result sets. That is accepted, but it must not be silent - hence the
   * explicit event carrying both ends of the move.
   */
  async function changePrescriber(id: string) {
    if (!profile || id === profile.careHomeId) return;
    const from = profile.careHomeId;
    const updated = { ...profile, careHomeId: id };
    await upsertUserProfile(updated);
    setActiveProfile(updated);
    setUserProperties(updated.userId, id, updated.language);
    track('prescriber_changed', { from, to: id });
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

  function handleSwitchProfile() {
    clearProfile();
    navigate('/');
  }

  function pill(active: boolean): React.CSSProperties {
    return {
      minHeight: 56, padding: '0 18px', borderRadius: 16,
      fontSize: 17, fontWeight: 700,
      border: `2px solid ${active ? '#FFFFFF' : 'rgba(255,255,255,0.28)'}`,
      background: active ? 'rgba(255,255,255,0.18)' : 'transparent',
      color: '#FFFFFF',
    };
  }

  const heading: React.CSSProperties = {
    fontSize: 11, fontWeight: 700, letterSpacing: '0.12em',
    color: BRAND.cyanBright, marginBottom: 10,
  };

  return (
    <ScreenBlue>
      <div style={{ position: 'relative', overflowY: 'auto', padding: '16px 20px 40px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12, marginBottom: 18 }}>
          <button
            onClick={() => navigate(-1)}
            aria-label={t('btn.back', 'Back')}
            style={{
              width: 44, height: 44, borderRadius: '50%',
              border: '1px solid rgba(255,255,255,0.5)',
              background: 'rgba(10,20,40,0.35)', color: '#FFFFFF', fontSize: 20,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
            }}
          >
            &#8592;
          </button>
          <h1 className="font-baloo" style={{ fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
            {t('settings.title')}
          </h1>
        </div>

        <section style={CARD}>
          <p className="font-baloo" style={heading}>{t('settings.language')}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {LANGS.map(({ code, label }) => (
              <button
                key={code}
                onClick={() => changeSetting('language', code)}
                aria-pressed={settings.language === code}
                className="font-baloo"
                style={pill(settings.language === code)}
              >
                {label}
              </button>
            ))}
          </div>
        </section>

        <section style={CARD}>
          <p className="font-baloo" style={heading}>{t('settings.textSize')}</p>
          <div style={{ display: 'flex', gap: 10, flexWrap: 'wrap' }}>
            {TEXT_SIZES.map(({ code, key }) => (
              <button
                key={code}
                onClick={() => changeSetting('textSize', code)}
                aria-pressed={settings.textSize === code}
                className="font-baloo"
                style={pill(settings.textSize === code)}
              >
                {t(key)}
              </button>
            ))}
          </div>
        </section>

        <section style={CARD}>
          <Toggle
            tone="dark"
            label={t('settings.sound')}
            checked={settings.soundEnabled}
            onChange={(v) => changeSetting('soundEnabled', v)}
            ariaLabel={t('settings.sound')}
          />
        </section>

        {profile && (
          <section style={CARD}>
            <p className="font-baloo" style={heading}>{t('settings.profile')}</p>
            <p className="font-baloo" style={{ fontSize: 21, fontWeight: 700, color: '#FFFFFF' }}>
              {profile.nickname || profile.firstName}
            </p>

            <button
              onClick={() => setPickerOpen(true)}
              className="font-baloo"
              style={{
                width: '100%', minHeight: 62, marginTop: 12, textAlign: 'left',
                borderRadius: 16, border: '2px solid rgba(255,255,255,0.28)',
                background: 'transparent', color: '#FFFFFF', padding: '10px 16px',
              }}
            >
              <span style={{ display: 'block', fontSize: 13, color: BRAND.cyan }}>
                {t('settings.prescriber', 'Prescribed by')}
              </span>
              <span style={{ fontSize: 19, fontWeight: 700 }}>
                {prescriberName(profile.careHomeId)}
              </span>
            </button>
          </section>
        )}

        <div style={{ position: 'relative', display: 'flex', justifyContent: 'center', marginTop: 22 }}>
          <Button variant="blue" size="md" onClick={handleSwitchProfile} style={{ minWidth: 234 }}>
            {t('btn.switchProfile')}
          </Button>
        </div>

        <p
          className="font-baloo"
          style={{ textAlign: 'center', marginTop: 18, fontSize: 15, color: BRAND.muted }}
        >
          {t('app.name')} v{pkg.version}
        </p>
      </div>

      {pickerOpen && profile && (
        <PrescriberPicker
          selectedId={profile.careHomeId}
          onSelect={changePrescriber}
          onClose={() => setPickerOpen(false)}
        />
      )}
    </ScreenBlue>
  );
}
