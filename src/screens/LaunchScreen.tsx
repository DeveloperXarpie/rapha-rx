/**
 * The brand frame shown on every cold start, before anything else paints.
 *
 * Deliberately white rather than the app's blue wash: it is the last thing that
 * renders before the resident sees the product, and the handoff makes it the
 * one moment of plain brand.
 */
export default function LaunchScreen() {
  return (
    <div
      className="flex-1 min-h-0 flex items-center justify-center"
      style={{ background: '#FFFFFF' }}
      aria-busy="true"
    >
      <img
        src="/brand/logo-blue.png"
        alt=""
        aria-hidden="true"
        style={{ width: 292, maxWidth: '80%', height: 'auto' }}
      />
      {/* A screen reader should not meet silence while the app boots. */}
      <span className="sr-only">Loading</span>
    </div>
  );
}
