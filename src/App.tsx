import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import SplashScreen from './screens/SplashScreen';
import SignupScreen from './screens/SignupScreen';
import SignInScreen from './screens/SignInScreen';
import AppShell from './components/AppShell';
import HomeScreen from './screens/HomeScreen';
import EducationScreen from './screens/EducationScreen';
import GameRouter from './screens/GameRouter';
import CategoryIntro from './screens/CategoryIntro';
import GameTitleScreen from './screens/GameTitleScreen';
import SessionSummary from './screens/SessionSummary';
import FreePlayScreen from './screens/FreePlayScreen';
import SettingsScreen from './screens/SettingsScreen';
import RequireProfile from './components/RequireProfile';
import SessionManager from './session/SessionManager';
import ChromeGallery from './screens/dev/ChromeGallery';
import DebugLevels from './screens/dev/DebugLevels';
import { DEBUG_LEVELS_PATH } from './lib/debugLevels';
import AppUpdater from './components/AppUpdater';

export default function App() {
  return (
    <BrowserRouter>
      <AppUpdater />
      <Routes>
        {/* Public routes */}
        <Route path="/"       element={<SplashScreen />} />
        <Route path="/signup" element={<SignupScreen />} />
        <Route path="/signin" element={<SignInScreen />} />
        {/* Retired with the redesign; it was never reachable in any case. */}
        <Route path="/login/:careHomeId" element={<Navigate to="/signin" replace />} />

        {/* Protected routes — require active profile */}
        <Route element={<RequireProfile />}>
          {/* App shell provides persistent header */}
          <Route element={<AppShell />}>
            {/* Session manager provides session context + ticker */}
            <Route element={<SessionManager />}>
              <Route path="/app/home"                element={<HomeScreen />} />
              <Route path="/app/education"           element={<EducationScreen />} />
              <Route path="/app/intro/:category"     element={<CategoryIntro />} />
              <Route path="/app/game/:gameId/title"  element={<GameTitleScreen />} />
              <Route path="/app/game/:gameId"        element={<GameRouter />} />
              <Route path="/app/free-play"           element={<FreePlayScreen />} />
              <Route path="/app/summary"             element={<SessionSummary />} />
              <Route path="/app/settings"            element={<SettingsScreen />} />

              {/* Debug level jumper. Unlike /dev/chrome this ships, so the levels
                  can be checked on the tablet itself; Home only offers the way in
                  after the version label is tapped five times. */}
              <Route path={DEBUG_LEVELS_PATH}         element={<DebugLevels />} />

              {/* Bookmarks, and URLs the service worker cached before the redesign. */}
              <Route path="/app/questionnaire"       element={<Navigate to="/app/education" replace />} />
              <Route path="/app/rotation"            element={<Navigate to="/app/home" replace />} />
              <Route path="/app"                     element={<Navigate to="/app/home" replace />} />
            </Route>
          </Route>
        </Route>

        {/* DEV-only chrome harness. Tree-shaken out of production by the env guard. */}
        {import.meta.env.DEV && (
          <Route path="/dev/chrome" element={<ChromeGallery />} />
        )}

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
