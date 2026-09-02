import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CareHomeSelector from './screens/CareHomeSelector';
import SignupFlow from './screens/SignupFlow';
import ProfileSelector from './screens/ProfileSelector';
import AppShell from './components/AppShell';
import HomeScreen from './screens/HomeScreen';
import EducationScreen from './screens/EducationScreen';
import GameRouter from './screens/GameRouter';
import CategoryIntro from './screens/CategoryIntro';
import GameTitleScreen from './screens/GameTitleScreen';
import SessionSummary from './screens/SessionSummary';
import SettingsScreen from './screens/SettingsScreen';
import RequireProfile from './components/RequireProfile';
import SessionManager from './session/SessionManager';
import ChromeGallery from './screens/dev/ChromeGallery';

export default function App() {
  return (
    <BrowserRouter>
      <Routes>
        {/* Public routes */}
        <Route path="/" element={<CareHomeSelector />} />
        <Route path="/signup" element={<SignupFlow />} />
        <Route path="/login/:careHomeId" element={<ProfileSelector />} />

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
              <Route path="/app/summary"             element={<SessionSummary />} />
              <Route path="/app/settings"            element={<SettingsScreen />} />

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
