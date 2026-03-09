import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { v4 as uuidv4 } from 'uuid';
import { collection, setDoc, doc, getDocs, query, where } from 'firebase/firestore';
import { db as firestoreDb, ensureAnonymousAuth } from '../lib/firebase';
import { upsertUserProfile, getProfilesByCareHome } from '../lib/db';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import { Button } from '../components/ui/Button';
import { Card } from '../components/ui/Card';
import type { UserProfile } from '../lib/db';

const CARE_HOMES = [
  { id: 'asha-indiranagar',       key: 'carehome.asha'     },
  { id: 'vatsalya-koramangala',   key: 'carehome.vatsalya' },
  { id: 'prayag-jayanagar',       key: 'carehome.prayag'   },
];

export default function SignupFlow() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [careHomeId, setCareHomeId] = useState('');
  const [nickname, setNickname] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  async function handleStep1() {
    if (!firstName.trim() || !lastName.trim()) {
      setError('Please enter your first and last name.');
      return;
    }
    setError('');
    setStep(2);
  }

  async function handleStep2(selectedCareHome: string) {
    setCareHomeId(selectedCareHome);
    setLoading(true);
    try {
      // Check for name collision in local DB
      const existing = await getProfilesByCareHome(selectedCareHome);
      const collision = existing.some(
        (p) =>
          p.firstName.toLowerCase() === firstName.trim().toLowerCase() &&
          p.lastName.toLowerCase() === lastName.trim().toLowerCase(),
      );
      if (collision) {
        setStep(3);
      } else {
        await createProfile(selectedCareHome, undefined);
      }
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function handleStep3() {
    if (!nickname.trim()) {
      setError('Please enter a nickname.');
      return;
    }
    setError('');
    setLoading(true);
    try {
      await createProfile(careHomeId, nickname.trim());
    } catch {
      setError('Something went wrong. Please try again.');
    } finally {
      setLoading(false);
    }
  }

  async function createProfile(care: string, nick: string | undefined) {
    await ensureAnonymousAuth();

    const profile: UserProfile = {
      userId: uuidv4(),
      firstName: firstName.trim(),
      lastName: lastName.trim(),
      nickname: nick ?? null,
      careHomeId: care,
      language: 'en',
      createdAt: Date.now(),
      lastSeenAt: Date.now(),
      soundEnabled: true,
      textSize: 'normal',
    };

    await upsertUserProfile(profile);

    // Sync to Firestore
    try {
      await setDoc(doc(firestoreDb, 'users', profile.userId), profile);
      console.log('[Firebase] Profile written to Firestore:', profile.userId);
    } catch (err) {
      console.error('[Firebase] Firestore write failed:', err);
    }

    setActiveProfile(profile);
    setUserProperties(profile.userId, profile.careHomeId, profile.language);
    track('profile_created', { careHomeId: care, language: profile.language });

    navigate('/app/home');
  }

  return (
    <div className="min-h-screen bg-app-bg flex flex-col items-center justify-center p-8">
      <div className="w-full max-w-lg">
        {/* Step indicators */}
        <div className="flex gap-3 mb-10 justify-center">
          {[1, 2, 3].map((s) => (
            <div
              key={s}
              className={`w-3 h-3 rounded-full transition-colors ${
                s === step ? 'bg-primary-blue' : s < step ? 'bg-emerald-green' : 'bg-gray-300'
              }`}
            />
          ))}
        </div>

        {step === 1 && (
          <div>
            <h1 className="text-h1 font-bold text-body-text mb-10">{t('signup.step1.title')}</h1>
            {error && <p className="text-alert-red text-body-md mb-4">{error}</p>}
            <div className="space-y-6">
              <div>
                <label className="block text-h3 font-semibold mb-3">{t('signup.step1.firstName')}</label>
                <input
                  className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-h3 focus:border-primary-blue focus:outline-none"
                  placeholder={t('signup.step1.firstNamePlaceholder')}
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-h3 font-semibold mb-3">{t('signup.step1.lastName')}</label>
                <input
                  className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-h3 focus:border-primary-blue focus:outline-none"
                  placeholder={t('signup.step1.lastNamePlaceholder')}
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleStep1()}
                />
              </div>
              <Button fullWidth onClick={handleStep1}>
                {t('btn.next')} →
              </Button>
            </div>
          </div>
        )}

        {step === 2 && (
          <div>
            <h1 className="text-h1 font-bold text-body-text mb-10">{t('signup.step2.title')}</h1>
            {error && <p className="text-alert-red text-body-md mb-4">{error}</p>}
            <div className="space-y-5">
              {CARE_HOMES.map((home) => (
                <Card
                  key={home.id}
                  onClick={() => !loading && handleStep2(home.id)}
                  className="min-h-[100px] flex items-center"
                >
                  <div className="flex items-center gap-5 w-full">
                    <div className="text-4xl">🏠</div>
                    <p className="text-h3 font-semibold">{t(home.key)}</p>
                    <div className="ml-auto text-2xl text-caption-text">›</div>
                  </div>
                </Card>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div>
            <h1 className="text-h1 font-bold text-body-text mb-4">{t('signup.step3.title')}</h1>
            <p className="text-h3 text-caption-text mb-10">{t('signup.step3.message')}</p>
            {error && <p className="text-alert-red text-body-md mb-4">{error}</p>}
            <div className="space-y-6">
              <div>
                <label className="block text-h3 font-semibold mb-3">{t('signup.step3.nickname')}</label>
                <input
                  className="w-full border-2 border-gray-200 rounded-2xl px-6 py-4 text-h3 focus:border-primary-blue focus:outline-none"
                  placeholder={t('signup.step3.nicknamePlaceholder')}
                  value={nickname}
                  onChange={(e) => setNickname(e.target.value)}
                  autoFocus
                />
              </div>
              <Button fullWidth onClick={handleStep3} disabled={loading}>
                {loading ? 'Creating...' : t('signup.complete')}
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
