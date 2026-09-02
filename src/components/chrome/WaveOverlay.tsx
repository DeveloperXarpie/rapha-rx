/**
 * The decorative bottom wave. Always last in DOM order within its screen, and
 * always pointer-events: none - the handoff's prototype had this element eating
 * every click on the buttons beneath it.
 */
export default function WaveOverlay({ tall = false }: { tall?: boolean }) {
  return <div className={`wave-overlay${tall ? ' wave-overlay--tall' : ''}`} aria-hidden="true" />;
}
