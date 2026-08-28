import { StrictMode, Suspense } from 'react';
import { createRoot } from 'react-dom/client';
import './styles/index.css';
import './lib/i18n';
import { initAnalytics } from './lib/analytics';
import { applyTextSizeClass } from './lib/textSize';
import App from './App';

// Apply stored text size preference before paint. `applyTextSizeClass` tolerates any
// shape, which matters here: this reads the raw localStorage blob before the store has
// hydrated or validated anything.
const stored = localStorage.getItem('brain-training-store');
let storedTextSize: unknown;
if (stored) {
  try {
    storedTextSize = JSON.parse(stored)?.state?.settings?.textSize;
  } catch {
    storedTextSize = undefined;
  }
}
applyTextSizeClass(storedTextSize);

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
