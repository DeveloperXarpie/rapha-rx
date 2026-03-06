import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useTranslation } from 'react-i18next';
import { getProfilesByCareHome, upsertUserProfile } from '../lib/db';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb } from '../lib/firebase';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import { Avatar } from '../components/ui/Avatar';
import type { UserProfile } from '../lib/db';

const CARE_HOME_NAMES: Record<string, string> = {
  'asha-indiranagar':     'Asha Care Home, Indiranagar',
  'vatsalya-koramangala': 'Vatsalya Senior Living, Koramangala',
  'prayag-jayanagar':     'Prayag Care Centre, Jayanagar',
};

export default function ProfileSelector() {
  const { careHomeId } = useParams<{ careHomeId: string }>();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [profiles, setProfiles] = useState<UserProfile[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!careHomeId) return;
    getProfilesByCareHome(careHomeId).then((p) => {
      setProfiles(p);
      setLoading(false);
    });
  }, [careHomeId]);

  async function handleSelect(profile: UserProfile) {
    const updated: UserProfile = { ...profile, lastSeenAt: Date.now() };
    await upsertUserProfile(updated);

    try {
      await setDoc(doc(firestoreDb, 'users', profile.userId), { lastSeenAt: Date.now() }, { merge: true });
    } catch {
      // Offline
    }

    setActiveProfile(updated);
    setUserProperties(updated.userId, updated.careHomeId, updated.language);
    track('session_started', { userId: updated.userId, careHomeId: updated.careHomeId, language: updated.language });
    navigate('/app/home');
  }

  const filtered = profiles.filter((p) => {
    const q = search.toLowerCase();
    return (
      p.firstName.toLowerCase().includes(q) ||
      p.lastName.toLowerCase().includes(q) ||
      (p.nickname?.toLowerCase() ?? '').includes(q)
    );
  });

  return (
    <div className="min-h-screen bg-app-bg flex flex-col p-8">
      <button
        onClick={() => navigate('/')}
        className="text-body-md text-primary-blue mb-6 self-start"
        aria-label="Back"
      >
        ← Back
      </button>

      <h1 className="text-h1 font-bold text-body-text mb-2">{t('login.title')}</h1>
      <p className="text-h3 text-caption-text mb-8">{CARE_HOME_NAMES[careHomeId ?? ''] ?? careHomeId}</p>

      {profiles.length > 8 && (
        <input
          className="mb-8 w-full max-w-md border-2 border-gray-200 rounded-2xl px-6 py-4 text-h3 focus:border-primary-blue focus:outline-none"
          placeholder={t('login.search')}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      )}

      {loading ? (
        <div className="flex-1 flex items-center justify-center text-h3 text-caption-text">Loading...</div>
      ) : filtered.length === 0 ? (
        <div className="flex-1 flex flex-col items-center justify-center gap-6">
          <p className="text-h3 text-caption-text">No profiles found.</p>
          <button
            onClick={() => navigate('/signup')}
            className="text-primary-blue text-h3 font-semibold underline"
          >
            {t('btn.createProfile')}
          </button>
        </div>
      ) : (
        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-5">
          {filtered.map((profile) => (
            <button
              key={profile.userId}
              onClick={() => handleSelect(profile)}
              className="flex flex-col items-center gap-4 bg-card-bg rounded-3xl p-6 min-h-[160px] shadow-sm
                         hover:bg-hover-state active:scale-95 transition-all duration-150 border-2 border-transparent
                         hover:border-primary-blue"
            >
              <Avatar firstName={profile.firstName} lastName={profile.lastName} size="lg" />
              <div className="text-center">
                <p className="text-h3 font-semibold text-body-text leading-tight">
                  {profile.nickname ?? `${profile.firstName} ${profile.lastName}`}
                </p>
                {!profile.nickname && (
                  <p className="text-caption text-caption-text">{profile.firstName}</p>
                )}
              </div>
            </button>
          ))}

          {/* Add new profile shortcut */}
          <button
            onClick={() => navigate('/signup')}
            className="flex flex-col items-center gap-4 bg-card-bg rounded-3xl p-6 min-h-[160px] shadow-sm
                       hover:bg-hover-state active:scale-95 transition-all duration-150 border-2 border-dashed border-gray-300
                       hover:border-primary-blue"
          >
            <div className="w-28 h-28 rounded-full bg-gray-100 flex items-center justify-center text-5xl text-caption-text">
              +
            </div>
            <p className="text-caption text-caption-text font-medium text-center">New Profile</p>
          </button>
        </div>
      )}
    </div>
  );
}
