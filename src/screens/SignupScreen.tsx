import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb, ensureAnonymousAuth } from '../lib/firebase';
import { findOrCreateProfile } from '../lib/profiles';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import { prescriberName } from '../lib/prescribers';
import AppFrame from '../components/chrome/AppFrame';
import ScreenBlue from '../components/chrome/ScreenBlue';
import ScreenTransition from '../components/chrome/ScreenTransition';
import PrescriberPicker from '../components/chrome/PrescriberPicker';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

/*
 * The age field the old signup carried is gone, along with its 60-78
 * validation. The handoff removes the age gate outright.
 */
export default function SignupScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [step, setStep] = useState<'details' | 'confirm'>('details');
  const [name, setName] = useState('');
  const [prescriberId, setPrescriberId] = useState<string | null>(null);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [now, setNow] = useState(new Date());

  // The confirmation screen carries a live clock, per the handoff.
  useEffect(() => {
    if (step !== 'confirm') return;
    const id = setInterval(() => setNow(new Date()), 60_000);
    return () => clearInterval(id);
  }, [step]);

  function handleContinue() {
    if (!name.trim()) {
      setError(t('signup.nameError', 'Please type your name.'));
      return;
    }
    setError('');
    setStep('confirm');
  }

  /*
   * The duplicate-name rule lives in lib/profiles.ts and is tested there: a
   * name that already exists under this prescriber signs in to that profile
   * rather than making a second one. Residents do not remember whether they
   * have signed up before, and two profiles for one person splits their
   * progress and their study data in half.
   */
  async function handleCreate() {
    if (!prescriberId) return;
    setLoading(true);
    setError('');

    try {
      await ensureAnonymousAuth();
      const { profile, created } = await findOrCreateProfile(name, prescriberId);

      try {
        await setDoc(doc(firestoreDb, 'users', profile.userId), profile);
      } catch {
        // Offline is the normal case on care-home wifi. Dexie is the source
        // of truth; the sync catches up later.
      }

      if (created) {
        track('profile_created', { careHomeId: prescriberId, language: profile.language });
      }

      setActiveProfile(profile);
      setUserProperties(profile.userId, profile.careHomeId, profile.language);
      track('session_started', { userId: profile.userId, careHomeId: profile.careHomeId });

      navigate('/app/home');
    } catch {
      setError(t('signup.failed', 'Something went wrong. Please try again.'));
      setLoading(false);
    }
  }

  const label = { color: BRAND.cyan, fontSize: 17 } as const;

  return (
    <AppFrame>
      <ScreenBlue>
        <ScreenTransition key={step} name="onboardingStep">
          <div
            style={{
              position: 'relative', flex: 1, minHeight: 0, display: 'flex',
              flexDirection: 'column', alignItems: 'center', justifyContent: 'center',
              padding: '0 24px', textAlign: 'center',
            }}
          >
            <img src="/brand/logo-onblue.png" alt="" aria-hidden="true" style={{ width: 150, marginBottom: 22 }} />

            {step === 'details' ? (
              <>
                <label className="font-baloo" style={label} htmlFor="signup-name">
                  {t('signup.name', 'Your Name')}
                </label>
                <input
                  id="signup-name"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  autoComplete="given-name"
                  className="font-baloo"
                  style={{
                    width: '100%', maxWidth: 320, minHeight: 62, marginTop: 8,
                    borderRadius: 16, border: '2px solid #D3DBEA', background: '#FFFFFF',
                    color: '#1B2438', fontSize: 19, padding: '0 16px', textAlign: 'center',
                  }}
                />

                <div style={{ width: '100%', maxWidth: 320, marginTop: 18 }}>
                  <Button
                    variant="blue"
                    fullWidth
                    size="md"
                    onClick={() => setPickerOpen(true)}
                    trailing={<span aria-hidden="true" style={{ fontSize: 15 }}>&#9660;</span>}
                  >
                    {t('signup.prescribedBy', 'Prescribed by')}
                  </Button>
                </div>

                <p className="font-baloo" style={{ ...label, marginTop: 10 }}>
                  {prescriberId
                    ? prescriberName(prescriberId)
                    : t('signup.tapToChoose', 'Tap to choose')}
                </p>

                {error && (
                  <p role="alert" className="font-baloo" style={{ marginTop: 12, fontSize: 17, color: '#FFD5D5' }}>
                    {error}
                  </p>
                )}

                {prescriberId && (
                  <div style={{ marginTop: 24 }}>
                    <Button variant="green" size="md" onClick={handleContinue} style={{ minWidth: 190 }}>
                      {t('btn.continue', 'Continue')}
                    </Button>
                  </div>
                )}
              </>
            ) : (
              <>
                <h1 className="font-baloo" style={{ fontSize: 26, fontWeight: 700, color: '#FFFFFF' }}>
                  {t('signup.confirmTitle', 'Welcome')}
                </h1>
                <p className="font-baloo" style={{ marginTop: 12, fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}>
                  {name.trim()}
                </p>
                <p className="font-baloo" style={{ marginTop: 6, fontSize: 19, color: BRAND.cyan }}>
                  {prescriberId ? prescriberName(prescriberId) : ''}
                </p>

                <p className="font-baloo" style={{ marginTop: 20, fontSize: 19, color: BRAND.cyan }}>
                  {now.toLocaleTimeString(undefined, { hour: 'numeric', minute: '2-digit' })}
                  {' · '}
                  {now.toLocaleDateString(undefined, { day: 'numeric', month: 'long', year: 'numeric' })}
                </p>

                {error && (
                  <p role="alert" className="font-baloo" style={{ marginTop: 12, fontSize: 17, color: '#FFD5D5' }}>
                    {error}
                  </p>
                )}

                <div style={{ marginTop: 26 }}>
                  <Button
                    variant="green"
                    size="md"
                    onClick={handleCreate}
                    disabled={loading}
                    style={{ minWidth: 200, minHeight: 62 }}
                  >
                    {t('btn.next', 'Next')}
                  </Button>
                </div>
              </>
            )}
          </div>
        </ScreenTransition>

        {pickerOpen && (
          <PrescriberPicker
            selectedId={prescriberId}
            onSelect={setPrescriberId}
            onClose={() => setPickerOpen(false)}
          />
        )}
      </ScreenBlue>
    </AppFrame>
  );
}
