import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './lib/i18n';
import { initAnalytics } from './lib/analytics';
import App from './App';

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

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <Suspense fallback={
      <div className="min-h-screen bg-app-bg flex items-center justify-center">
        <p className="text-h3 text-caption-text">Loading...</p>
      </div>
    }>
      <App />
    </Suspense>
  </StrictMode>,
);
