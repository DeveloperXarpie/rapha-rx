import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './lib/i18n';
import { initAnalytics } from './lib/analytics';
import { registerAppUpdates } from './lib/appUpdate';
import App from './App';
import AppBootGate from './components/AppBootGate';

// Apply stored text size preference before paint
const stored = localStorage.getItem('brain-training-store');
if (stored) {
  try {
    const state = JSON.parse(stored);
    const textSize = state?.state?.settings?.textSize ?? 'normal';
    document.documentElement.classList.add(`text-size-${textSize}`);
  } catch {
    document.documentElement.classList.add('text-size-normal');
  }
} else {
  document.documentElement.classList.add('text-size-normal');
}

initAnalytics();
registerAppUpdates();

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="h-full bg-app-bg flex items-center justify-center">
        <p className="text-h3 text-caption-text">Loading...</p>
      </div>
    }>
      <AppBootGate>
        <App />
      </AppBootGate>
    </Suspense>
  </StrictMode>,
);
