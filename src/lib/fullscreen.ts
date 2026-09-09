/**
 * The one place in the app that touches the Fullscreen API.
 *
 * A session runs fullscreen so the resident sees the board and nothing else - no
 * URL bar, no bookmarks, no tab strip. Two facts shape everything here:
 *
 * 1. A browser only grants fullscreen from a user gesture. It cannot be requested
 *    on mount or on a route change, so entry is pinned to the taps on Home that
 *    start a session.
 * 2. No page can hold a browser in fullscreen. Escape on desktop and a swipe from
 *    the top edge on Android always let go. That is why `arm()` exists: while
 *    armed, AppShell re-requests on the resident's next tap, so falling out is
 *    silently undone rather than scolded.
 *
 * Every call is safe on a browser without the API. Android Chrome and desktop -
 * the two targets - both implement the unprefixed standard, so there is no
 * webkit-prefixed branch. iOS Safari has no Fullscreen API at all; there the
 * calls no-op and the app runs exactly as before, just with the URL bar showing.
 */

/**
 * The slice of `document` this module uses. Structural, not the DOM lib's type,
 * because the test suite runs in node with no DOM available.
 */
export interface FullscreenDoc {
  documentElement: { requestFullscreen?: () => Promise<void> };
  fullscreenElement: unknown;
  exitFullscreen?: () => Promise<void>;
}

/**
 * Evaluated per call, never at module load, so importing this file in a node test
 * does not reach for a `document` that is not there.
 */
function activeDoc(): FullscreenDoc {
  return document as unknown as FullscreenDoc;
}

/** True when the browser implements the Fullscreen API. */
export function isSupported(doc: FullscreenDoc = activeDoc()): boolean {
  return typeof doc.documentElement.requestFullscreen === 'function';
}

/** True when the page is currently painted fullscreen. */
export function isFullscreen(doc: FullscreenDoc = activeDoc()): boolean {
  return doc.fullscreenElement != null;
}

/**
 * Requests fullscreen for the whole page. MUST be called from within a user
 * gesture; outside one the browser refuses and the rejection is swallowed.
 *
 * A refusal is never an error worth surfacing - the session has to start either
 * way, and a resident who cannot see why a tap failed is worse off than one who
 * simply keeps their URL bar.
 */
export async function enter(doc: FullscreenDoc = activeDoc()): Promise<void> {
  if (!isSupported(doc) || isFullscreen(doc)) return;
  try {
    await doc.documentElement.requestFullscreen!();
  } catch {
    // Refused: a stale gesture, a permissions policy, or an embedding iframe.
  }
}

/** Hands the browser chrome back. A no-op when the page is not fullscreen. */
export async function exit(doc: FullscreenDoc = activeDoc()): Promise<void> {
  if (!isSupported(doc) || !isFullscreen(doc)) return;
  try {
    await doc.exitFullscreen!();
  } catch {
    // Nothing useful to do; the resident is leaving the session regardless.
  }
}

/*
 * Module state, deliberately not in the Zustand store: this must not persist. A
 * reload arrives with no gesture behind it, and a persisted "armed" would claim a
 * fullscreen the browser never granted.
 */
let armed = false;

/** Marks the session as wanting fullscreen, enabling re-entry on the next tap. */
export function arm(): void {
  armed = true;
}

/** Stops re-entry. Called when the resident leaves the app routes. */
export function disarm(): void {
  armed = false;
}

/** Whether re-entry on the next tap is active. */
export function isArmed(): boolean {
  return armed;
}
