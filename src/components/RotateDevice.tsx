import { useTranslation } from 'react-i18next';

/**
 * Asks the resident to turn the device upright.
 *
 * Rendered as a sibling that covers the app, never as a wrapper that replaces it. A
 * resident who tilts a tablet mid-round must not lose the round, so the app underneath
 * stays mounted and keeps its state; only the view is covered.
 *
 * Visibility is decided entirely in CSS (see `.rotate-gate` in styles/index.css), not by
 * a resize listener, so it cannot flicker, cannot miss an event, and costs nothing while
 * the device is upright.
 *
 * The tone is deliberately gentle. On iPad this fires whenever a tablet is picked up
 * sideways, which is an ordinary thing to do and not a mistake to be scolded for.
 */
export default function RotateDevice() {
  const { t } = useTranslation();

  return (
    <div className="rotate-gate" role="status" aria-live="polite">
      <div aria-hidden className="text-6xl">📱</div>
      <h2 className="text-h2 font-bold text-primary-blue">
        {t('rotate.title', 'Please turn your device upright')}
      </h2>
      <p className="text-body-md text-caption-text max-w-sm">
        {t('rotate.body', 'This app works best standing tall. Your progress is safe.')}
      </p>
    </div>
  );
}
