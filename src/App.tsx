import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import CareHomeSelector from './screens/CareHomeSelector';
import SignupFlow from './screens/SignupFlow';
import ProfileSelector from './screens/ProfileSelector';
import AppShell from './components/AppShell';
import HomeScreen from './screens/HomeScreen';
import DailyQuestionnaire from './screens/DailyQuestionnaire';
import GameRouter from './screens/GameRouter';
import RotationScreen from './screens/RotationScreen';
import SessionSummary from './screens/SessionSummary';
import SettingsScreen from './screens/SettingsScreen';
import RequireProfile from './components/RequireProfile';
import SessionManager from './session/SessionManager';

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
              <Route path="/app/home"           element={<HomeScreen />} />
              <Route path="/app/questionnaire"  element={<DailyQuestionnaire />} />
              <Route path="/app/game/:gameId"   element={<GameRouter />} />
              <Route path="/app/rotation"       element={<RotationScreen />} />
              <Route path="/app/summary"        element={<SessionSummary />} />
              <Route path="/app/settings"       element={<SettingsScreen />} />
              <Route path="/app"                element={<Navigate to="/app/home" replace />} />
            </Route>
          </Route>
        </Route>

        {/* Fallback */}
        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </BrowserRouter>
  );
}
