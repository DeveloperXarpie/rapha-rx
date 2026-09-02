/**
 * Screenshots the redesigned flow at the design canvas size, so the screens can
 * be compared against the handoff prototype without clicking through the app by
 * hand.
 *
 * Run against a dev or preview server:
 *   npm run dev
 *   node scripts/screenshot-flow.mjs <outDir> [baseUrl]
 *
 * Playwright is a devDependency and its browser must be installed once:
 *   npx playwright install chromium
 *
 * Like scripts/portrait-smoke.mjs, this has to live inside the project tree for
 * the playwright import to resolve.
 */
import { chromium } from 'playwright';
import { mkdirSync } from 'node:fs';

const OUT = process.argv[2] ?? 'screenshots';
const BASE = process.argv[3] ?? 'http://localhost:5173';

/** The handoff's canvas. Everything is designed against this. */
const VIEWPORT = { width: 360, height: 780 };

const USER_ID = 'shot-user';
const TODAY = new Date().toISOString().split('T')[0];

/**
 * A signed-in profile with a session already planned, so the protected screens
 * render without walking signup. Mirrors the store's persisted shape - see
 * store/index.ts partialize: activeProfile, settings, currentSession.
 */
function seed({ categoriesCompleted = [], currentCategory = 'memory', currentGameId = 'market-memory' } = {}) {
  return {
    state: {
      activeProfile: {
        userId: USER_ID, firstName: 'Meera', lastName: '', nickname: 'Meera',
        careHomeId: 'dr-dominic-benjamin', language: 'en',
        createdAt: Date.now(), lastSeenAt: Date.now(),
        soundEnabled: false, textSize: 'normal',
      },
      settings: { language: 'en', textSize: 'normal', soundEnabled: false },
      currentSession: {
        date: TODAY,
        sessionStarted: true,
        plannedGames: ['market-memory', 'spot-focus', 'serve-guests'],
        focusCategory: currentCategory,
        categoriesCompleted,
        currentCategory,
        currentGameId,
        secondsInCurrentCategory: 0,
        sessionStartedAt: Date.now(),
      },
    },
    version: 0,
  };
}

const DONE = ['memory', 'attention', 'executive'];

const SHOTS = [
  { slug: '00-launch',        path: '/',                          seed: null, waitMs: 300 },
  { slug: '01-splash',        path: '/',                          seed: null },
  { slug: '02-signup',        path: '/signup',                    seed: null },
  { slug: '04-signin',        path: '/signin',                    seed: null },
  { slug: '05-education',     path: '/app/education',             seed: seed() },
  { slug: '06-home',          path: '/app/home',                  seed: seed() },
  { slug: '07-intro-memory',  path: '/app/intro/memory',          seed: seed(), freezeNav: true },
  { slug: '08-title-shopping',path: '/app/game/market-memory/title', seed: seed() },
  { slug: '09-intro-attention', path: '/app/intro/attention',     seed: seed({ categoriesCompleted: ['memory'], currentCategory: 'attention', currentGameId: 'spot-focus' }), freezeNav: true },
  { slug: '10-title-spot',    path: '/app/game/spot-focus/title', seed: seed({ currentGameId: 'spot-focus' }) },
  { slug: '11-intro-planning',path: '/app/intro/executive',       seed: seed({ categoriesCompleted: ['memory', 'attention'], currentCategory: 'executive', currentGameId: 'serve-guests' }), freezeNav: true },
  { slug: '12-title-tiffen',  path: '/app/game/serve-guests/title', seed: seed({ currentGameId: 'serve-guests' }) },
  { slug: '13-summary',       path: '/app/summary',               seed: seed({ categoriesCompleted: DONE }) },
  { slug: '14-settings',      path: '/app/settings',              seed: seed() },
  { slug: '15-free-play',     path: '/app/free-play',             seed: seed({ categoriesCompleted: DONE }) },
];

const browser = await chromium.launch();
mkdirSync(OUT, { recursive: true });

for (const shot of SHOTS) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  if (shot.seed) {
    await page.addInitScript((s) => {
      localStorage.setItem('brain-training-store', s);
    }, JSON.stringify(shot.seed));
  }

  /*
   * The category intro advances itself after 2 s. Stubbing setTimeout for that
   * delay holds it still long enough to photograph, without touching the app.
   */
  if (shot.freezeNav) {
    await page.addInitScript(() => {
      const real = window.setTimeout;
      // @ts-expect-error - deliberately narrowing the global for a screenshot run
      window.setTimeout = (fn, ms, ...rest) => (ms === 2000 ? 0 : real(fn, ms, ...rest));
    });
  }

  await page.goto(BASE + shot.path, { waitUntil: 'networkidle' });
  // The launch gate holds for 1200 ms; everything after it wants that gone.
  await page.waitForTimeout(shot.waitMs ?? 2600);

  await page.screenshot({ path: `${OUT}/${shot.slug}.png` });

  const noise = errors.filter(
    (e) => !/PLACEHOLDER_KEY|Amplitude|firestore|Firebase|net::ERR|400|403/i.test(e),
  );
  console.log(
    `${shot.slug.padEnd(22)} ${noise.length ? 'CONSOLE ERRORS: ' + noise.slice(0, 2).join(' | ') : 'ok'}`,
  );
  await ctx.close();
}

await browser.close();
