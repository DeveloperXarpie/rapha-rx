/*
 * Where a waiting app update may take over. Taking over reloads the page, so it
 * is only allowed on screens that hold nothing a reload would lose: never a
 * board mid-round, an intro counting down, or a half-typed signup form.
 * Everything not listed here waits, and a session always comes back through
 * Home or the summary.
 */
const SAFE_PATHS: ReadonlySet<string> = new Set([
  '/',
  '/app/home',
  '/app/summary',
  '/app/free-play',
]);

/** How often an open app asks the server for a new build. */
export const UPDATE_CHECK_INTERVAL_MS = 60 * 60 * 1000;

export function isSafeToUpdate(pathname: string): boolean {
  // A trailing slash is the same screen to the router, so it is to us too.
  const path = pathname.length > 1 ? pathname.replace(/\/+$/, '') : pathname;
  return SAFE_PATHS.has(path);
}
