import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb, ensureAnonymousAuth } from '../lib/firebase';
import { appDb, upsertUserProfile } from '../lib/db';
import type { UserProfile } from '../lib/db';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import { prescriberName } from '../lib/prescribers';
import AppFrame from '../components/chrome/AppFrame';
import ScreenBlue from '../components/chrome/ScreenBlue';
import { Button } from '../components/ui/Button';
import { BRAND } from '../styles/tokens';

/**
 * Matches a name against every profile on the device. Replaces the login step
 * of the old CareHomeSelector, and keeps its lookup: profiles are matched on
 * first name or nickname, not scoped to a site.
 */
export default function SignInScreen() {
  const { t } = useTranslation();
  const navigate = useNavigate();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [name, setName] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    appDb.userProfile.toArray().then(setProfiles).catch(() => setProfiles([]));
  }, []);

  const search = name.trim().toLowerCase();
  const matches = search
    ? profiles.filter(
        (p) =>
          p.firstName.toLowerCase().includes(search) ||
          (p.nickname?.toLowerCase().includes(search) ?? false),
      )
    : [];

  async function signIn(profile: UserProfile) {
    setLoading(true);
    await ensureAnonymousAuth();

    const updated: UserProfile = { ...profile, lastSeenAt: Date.now() };
    await upsertUserProfile(updated);
    try {
      await setDoc(doc(firestoreDb, 'users', profile.userId), updated);
    } catch {
      // Best effort. Dexie is the source of truth.
    }

    setActiveProfile(updated);
    setUserProperties(updated.userId, updated.careHomeId, updated.language);
    track('session_started', { userId: updated.userId, careHomeId: updated.careHomeId });

    navigate('/app/home');
  }

  return (
    <AppFrame>
      <ScreenBlue>
        <div
          style={{
            position: 'relative', flex: 1, minHeight: 0, display: 'flex',
            flexDirection: 'column', alignItems: 'center', padding: '32px 24px 0',
            textAlign: 'center',
          }}
        >
          <img src="/brand/logo-onblue.png" alt="" aria-hidden="true" style={{ width: 150 }} />

          <h1
            className="font-baloo"
            style={{ marginTop: 20, fontSize: 24, fontWeight: 700, color: '#FFFFFF' }}
          >
            {t('signin.title', 'Sign in')}
          </h1>

          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            aria-label={t('signup.name', 'Your Name')}
            autoComplete="given-name"
            className="font-baloo"
            style={{
              width: '100%', maxWidth: 320, minHeight: 62, marginTop: 16,
              borderRadius: 16, border: '2px solid #D3DBEA', background: '#FFFFFF',
              color: '#1B2438', fontSize: 19, padding: '0 16px', textAlign: 'center',
            }}
          />

          <p className="font-baloo" style={{ marginTop: 10, fontSize: 17, color: BRAND.cyan }}>
            {t('signin.help', "We'll match your Name to your existing study profile.")}
          </p>

          {search && matches.length === 0 && (
            <p role="status" className="font-baloo" style={{ marginTop: 16, fontSize: 17, color: '#FFD5D5' }}>
              {t('signin.noMatch', 'No profile found with that name.')}
            </p>
          )}

          {matches.length > 0 && (
            <div
              style={{
                width: '100%', maxWidth: 360, marginTop: 18,
                background: '#FFFFFF', borderRadius: 20, overflow: 'hidden',
              }}
            >
              {matches.map((p, i) => (
                <button
                  key={p.userId}
                  onClick={() => signIn(p)}
                  disabled={loading}
                  className="font-baloo"
                  style={{
                    width: '100%', minHeight: 66, padding: '10px 18px', textAlign: 'left',
                    color: '#10237E', fontSize: 21, background: 'transparent',
                    borderTop: i === 0 ? 'none' : '1px solid rgba(16,35,126,0.12)',
                  }}
                >
                  {p.nickname || p.firstName}
                  <span style={{ display: 'block', fontSize: 15, color: '#5A6B99' }}>
                    {prescriberName(p.careHomeId)}
                  </span>
                </button>
              ))}
            </div>
          )}
        </div>

        <div
          style={{
            position: 'relative', display: 'flex', justifyContent: 'center',
            padding: '0 24px 40px',
          }}
        >
          <Button
            variant="blue"
            size="md"
            onClick={() => navigate('/')}
            style={{ minWidth: 200, minHeight: 62 }}
          >
            {t('btn.back', 'Back')}
          </Button>
        </div>
      </ScreenBlue>
    </AppFrame>
  );
}
