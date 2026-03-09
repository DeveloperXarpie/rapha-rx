import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { v4 as uuidv4 } from 'uuid';
import { doc, setDoc } from 'firebase/firestore';
import { db as firestoreDb, ensureAnonymousAuth } from '../lib/firebase';
import { getProfilesByCareHome, upsertUserProfile, appDb } from '../lib/db';
import { useAppStore } from '../store';
import { track, setUserProperties } from '../lib/analytics';
import type { UserProfile } from '../lib/db';

const LOCATIONS = [
  { id: 'silver-meadows', name: 'Silver Meadows Senior Living', city: 'Bangalore' },
  { id: 'golden-years',   name: 'Golden Years Care Home', city: 'Bangalore' },
  { id: 'serenity-haven', name: 'Serenity Haven Senior Care', city: 'Bangalore' },
  { id: 'sunrise-elder',  name: 'Sunrise Elder Care Residence', city: 'Bangalore' },
  { id: 'graceful-living',name: 'Graceful Living Senior Home', city: 'Bangalore' },
  { id: 'evergreen-senior',name:'Evergreen Senior Care Centre', city: 'Bangalore' },
  { id: 'my-residence',   name: 'My Residence in Bangalore', city: 'Bangalore' },
];

export default function CareHomeSelector() {
  const navigate = useNavigate();
  const setActiveProfile = useAppStore((s) => s.setActiveProfile);

  const [step, setStep] = useState<'landing' | 'signup' | 'login' | 'welcome'>('landing');

  // Generic form state
  const [fullName, setFullName] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Signup Specific
  const [age, setAge] = useState('');
  const [locationId, setLocationId] = useState(LOCATIONS[0].id);

  // Login Specific
  const [allProfiles, setAllProfiles] = useState<UserProfile[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  
  // Welcome Specific
  const [currentUser, setCurrentUser] = useState<{ profile: UserProfile; location: typeof LOCATIONS[0] } | null>(null);
  const [currentTime, setCurrentTime] = useState(new Date());

  // Refs for closing autocomplete when clicking outside
  const autocompleteRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (step === 'welcome') {
      const timer = setInterval(() => setCurrentTime(new Date()), 60000);
      return () => clearInterval(timer);
    }
  }, [step]);

  useEffect(() => {
    if (step === 'login') {
      appDb.userProfile.toArray().then(setAllProfiles);
    }
  }, [step]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (autocompleteRef.current && !autocompleteRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLandingAction = (goToLogin: boolean) => {
    setFullName('');
    setError('');
    setStep(goToLogin ? 'login' : 'signup');
  };

  const executeLogin = async (profile: UserProfile) => {
    setLoading(true);
    await ensureAnonymousAuth();
    
    const updated: UserProfile = { ...profile, lastSeenAt: Date.now() };
    await upsertUserProfile(updated);
    try {
      await setDoc(doc(firestoreDb, 'users', profile.userId), updated);
    } catch (err) {}
    
    setActiveProfile(updated);
    setUserProperties(updated.userId, updated.careHomeId, updated.language);
    track('session_started', { userId: updated.userId, careHomeId: updated.careHomeId });
    
    const locObj = LOCATIONS.find(l => l.id === profile.careHomeId) || LOCATIONS[0];
    setCurrentUser({ profile: updated, location: locObj });
    setStep('welcome');
    setLoading(false);
  };

  const handleLoginSubmit = async () => {
    if (!fullName.trim()) {
      setError('Please type your name.');
      return;
    }
    setError('');
    const matchedProfile = allProfiles.find(
      (p) => p.firstName.toLowerCase() === fullName.trim().toLowerCase() ||
             (p.nickname && p.nickname.toLowerCase() === fullName.trim().toLowerCase())
    );

    if (matchedProfile) {
      await executeLogin(matchedProfile);
    } else {
      setError(`No profile found for "${fullName.trim()}"`);
    }
  };

  const handleSignupSubmit = async () => {
    if (!fullName.trim() || !age.trim()) {
      setError('Please provide your name and age.');
      return;
    }
    const ageNum = parseInt(age, 10);
    if (isNaN(ageNum) || ageNum < 60 || ageNum > 78) {
      setError('Age must be between 60 - 78 years.');
      return;
    }

    setLoading(true);
    setError('');
    
    try {
      await ensureAnonymousAuth();
      const profiles = await getProfilesByCareHome(locationId);
      let matchedProfile = profiles.find((p) => p.firstName.toLowerCase() === fullName.trim().toLowerCase());

      if (!matchedProfile) {
        const profile: UserProfile = {
          userId: uuidv4(),
          firstName: fullName.trim(),
          lastName: '',
          nickname: fullName.trim(),
          careHomeId: locationId,
          language: 'en',
          createdAt: Date.now(),
          lastSeenAt: Date.now(),
          soundEnabled: true,
          textSize: 'normal',
        };
        await upsertUserProfile(profile);
        try {
          await setDoc(doc(firestoreDb, 'users', profile.userId), profile);
        } catch (e) {
          console.warn('Firestore write failed', e);
        }
        matchedProfile = profile;
        track('profile_created', { careHomeId: locationId, language: profile.language });
      }

      await executeLogin(matchedProfile);
    } catch (err) {
      console.error(err);
      setError('Something went wrong. Please try again.');
      setLoading(false);
    }
  };

  // Autocomplete filtering
  const matchingProfiles = allProfiles.filter(p => {
    const search = fullName.toLowerCase();
    return search && (p.firstName.toLowerCase().includes(search) || p.nickname?.toLowerCase().includes(search));
  });

  if (step === 'welcome' && currentUser) {
    return (
      <div className="min-h-screen bg-[#060A18] flex flex-col items-center justify-between p-8 text-white">
        <div className="flex flex-col items-center mt-12 w-full max-w-md">
          <img src="/brain_logo.png" alt="RAPHA-Rx Logo" className="w-[100px] h-[100px] object-contain mb-8 mix-blend-screen" />
          
          <h2 className="text-[#88B04B] text-[40px] font-medium mb-12">Welcome</h2>
          
          <div className="w-full text-center border-b border-white/20 pb-4 mb-4">
            <h1 className="text-[36px] font-normal">{currentUser.profile.nickname || currentUser.profile.firstName}</h1>
          </div>
          
          <h3 className="text-[20px] font-bold text-center mt-6">{currentUser.location.name}</h3>
          <p className="text-[18px] text-center mt-2">{currentUser.location.city}</p>
        </div>

        <div className="w-full max-w-md flex flex-col items-center mb-10">
          <button 
            onClick={() => navigate('/app/home')}
            className="w-full max-w-[280px] min-h-[80px] bg-[#A3B899] text-[#1A2E20] text-[24px] font-semibold rounded-full mb-12 hover:bg-[#8CA282] active:scale-95 transition-all"
            aria-label="Proceed to home screen"
          >
            Next
          </button>
          
          <div className="text-center text-[#4C84E3] text-[20px] mb-8 font-medium space-y-2">
            <p>{currentTime.toLocaleTimeString('en-US', { hour: 'numeric', minute: '2-digit', hour12: true })}</p>
            <p>{currentTime.toLocaleDateString('en-US', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'login') {
    return (
      <div className="min-h-screen bg-[#060A18] flex flex-col items-center px-6 py-8 text-white">
        <button 
          className="self-start text-white/50 text-2xl font-bold min-h-[80px] min-w-[80px] flex items-center mb-4" 
          onClick={() => setStep('landing')}
          aria-label="Back to landing"
        >
          ←
        </button>
        <img src="/brain_logo.png" alt="RAPHA-Rx Logo" className="w-[100px] h-[100px] object-contain mb-16 mix-blend-screen drop-shadow-md" />

        <div className="w-full max-w-sm flex flex-col items-center">
          <div className="w-full relative" ref={autocompleteRef}>
            <input 
              type="text"
              placeholder="Type Your Full Name..."
              className="w-full min-h-[80px] bg-[#DDE2D3] text-[#1A2E20] text-center rounded-sm font-semibold text-[22px] px-4 focus:outline-none placeholder-[#1A2E20]/60 shadow-inner"
              value={fullName}
              onChange={(e) => {
                setFullName(e.target.value);
                setShowSuggestions(true);
                setError('');
              }}
              onFocus={() => setShowSuggestions(true)}
              aria-label="Full Name"
            />
            {showSuggestions && matchingProfiles.length > 0 && (
              <div className="absolute z-20 w-full mt-2 bg-[#DDE2D3] rounded-sm shadow-xl max-h-[300px] overflow-y-auto">
                {matchingProfiles.map(p => (
                  <button
                    key={p.userId}
                    className="w-full text-center text-[#1A2E20] min-h-[80px] text-[20px] font-semibold border-b border-[#1A2E20]/10 hover:bg-[#c7cdbc] last:border-none px-4"
                    onClick={() => {
                      setFullName(p.nickname || p.firstName);
                      setShowSuggestions(false);
                    }}
                  >
                    {p.nickname || p.firstName}
                  </button>
                ))}
              </div>
            )}
          </div>
          
          {error && <p className="text-red-400 text-[18px] mt-4 text-center">{error}</p>}

          <div className="pt-16 w-full flex justify-center">
            <button 
              onClick={handleLoginSubmit}
              disabled={loading}
              className="w-full max-w-[200px] min-h-[80px] bg-[#A3B899] text-[#1A2E20] text-[22px] font-semibold rounded-full hover:bg-[#8CA282] transition-colors disabled:opacity-50"
              aria-label="Done with login"
            >
              DONE
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (step === 'signup') {
    return (
      <div className="min-h-screen bg-[#060A18] flex flex-col items-center px-6 py-6 text-white overflow-y-auto">
        <button 
          className="self-start text-white/50 text-2xl font-bold min-h-[80px] min-w-[80px] flex items-center -ml-2 mb-2" 
          onClick={() => setStep('landing')}
          aria-label="Back to landing"
        >
          ←
        </button>
        <img src="/brain_logo.png" alt="RAPHA-Rx Logo" className="w-[100px] h-[100px] object-contain mb-10 mix-blend-screen drop-shadow-md" />

        <div className="w-full max-w-sm space-y-10 flex flex-col items-center text-center">
          
          <div className="w-full">
            <input 
              type="text"
              placeholder="Type Your Full Name..."
              className="w-full min-h-[80px] bg-[#DDE2D3] text-[#1A2E20] text-center rounded-sm font-semibold text-[22px] px-4 focus:outline-none placeholder-[#1A2E20]/60 shadow-inner"
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              aria-label="Full Name"
            />
          </div>

          <div className="w-full relative">
            <input 
              type="number"
              placeholder="Type Your Age"
              className="w-full min-h-[80px] bg-[#DDE2D3] text-[#1A2E20] text-center rounded-sm font-semibold text-[22px] px-4 focus:outline-none placeholder-[#1A2E20]/60 shadow-inner mb-2"
              value={age}
              onChange={(e) => setAge(e.target.value)}
              aria-label="Age"
            />
            <p className="text-[#4C84E3] text-[16px] font-medium mt-1">(60 - 78 years Only)</p>
          </div>

          <div className="w-full text-center">
            <select
              value={locationId}
              onChange={(e) => setLocationId(e.target.value)}
              className="w-full min-h-[80px] bg-[#DDE2D3] text-[#1A2E20] text-center rounded-sm font-semibold text-[20px] px-4 appearance-none focus:outline-none shadow-inner"
              style={{ backgroundImage: `url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' fill='%231A2E20' viewBox='0 0 24 24'%3E%3Cpath d='M7 10l5 5 5-5z'/%3E%3C/svg%3E")`, backgroundRepeat: 'no-repeat', backgroundPosition: 'right 16px center', backgroundSize: '32px' }}
              aria-label="Select Your Location"
            >
              <option value="" disabled>Select Your Location</option>
              {LOCATIONS.map(loc => (
                <option key={loc.id} value={loc.id}>
                  {loc.name}
                </option>
              ))}
            </select>
          </div>

          {error && <p className="text-red-400 text-[18px]">{error}</p>}

          <div className="pt-4 w-full flex justify-center">
            <button 
              onClick={handleSignupSubmit}
              disabled={loading}
              className="w-full max-w-[200px] min-h-[80px] bg-[#A3B899] text-[#1A2E20] text-[22px] font-semibold rounded-full hover:bg-[#8CA282] transition-colors disabled:opacity-50"
              aria-label="Proceed to next step"
            >
              {loading ? 'Wait...' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Landing
  return (
    <div className="min-h-screen bg-[#060A18] flex flex-col items-center justify-center p-8 text-white">
      <div className="flex flex-col items-center text-center">
        <h1 className="font-serif text-[48px] font-bold tracking-wide mb-14 drop-shadow-md" aria-label="RAPHA-Rx">
          <span className="text-[#4C84E3]">RAPHA-</span>
          <span className="text-[#88B04B]">Rx</span>
        </h1>
        
        <div className="relative mb-14">
          <div className="absolute inset-0 bg-blue-500/20 blur-[50px] rounded-full"></div>
          <img src="/brain_logo.png" alt="RAPHA-Rx Logo" className="w-[300px] h-[300px] object-contain relative z-10 mix-blend-screen" />
        </div>

        <p className="text-[#88B04B] text-[26px] font-serif mb-[90px]">Restore Your Mind</p>

        <div className="flex flex-col gap-8 w-full max-w-md items-center">
          <button 
            onClick={() => handleLandingAction(false)}
            className="w-full max-w-[320px] min-h-[80px] bg-[#A3B899] text-[#1A2E20] text-[24px] font-semibold rounded-full hover:bg-[#8CA282] active:scale-95 transition-all shadow-lg"
          >
            Get Started
          </button>
          
          <button 
            onClick={() => handleLandingAction(true)}
            className="w-full max-w-[320px] min-h-[80px] bg-[#DDE2D3] text-[#1A2E20] text-[20px] font-medium rounded-full hover:bg-[#c7cdbc] active:scale-95 transition-all"
          >
            Already a member? Sign in
          </button>
        </div>
      </div>
    </div>
  );
}
