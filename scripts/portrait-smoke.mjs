/**
 * Portrait fit smoke test.
 *
 * Drives each v1 game at the three binding viewport sizes and asserts the two things the
 * portrait work is actually about: the page does not scroll, and the board fits inside
 * the play box. Then checks the landscape gate covers the app without unmounting it.
 *
 * Run against a preview or dev server:
 *   npm run build && npx vite preview --port 4173
 *   SMOKE_BASE=http://localhost:4173 npm run smoke:portrait
 *
 * Playwright is available transitively rather than declared, which is why this is a
 * script rather than a test suite. It also has to live inside the project tree for that
 * import to resolve.
 */
import { chromium } from 'playwright';

const BASE = process.env.SMOKE_BASE ?? 'http://localhost:4173';

const VIEWPORTS = [
  { name: 'phone-360', width: 360, height: 640 },
  { name: 'phone-390', width: 390, height: 844 },
  { name: 'tablet-768', width: 768, height: 1024 },
];

// Serve the Guests is absent deliberately: its portrait build is a separate plan, blocked
// on the missing DISPOSE button in the new sprite sheet.
const GAMES = [
  { id: 'train-yard', category: 'memory' },
  { id: 'market-memory', category: 'memory' },
  { id: 'garden-keeper', category: 'attention' },
  { id: 'spot-focus', category: 'attention' },
  { id: 'clear-the-way', category: 'executive' },
];

const today = new Date().toISOString().slice(0, 10);

/**
 * `settings` is its own object under `state`, matching the store's partialize. Putting
 * language/textSize/soundEnabled at the root of `state` is silently ignored, which makes
 * a test look like it proved something it did not.
 */
function seed(gameId, category) {
  return {
    state: {
      activeProfile: {
        userId: 'smoke-user', firstName: 'Smoke', lastName: 'Test',
        careHomeId: 'smoke-home', language: 'en', createdAt: Date.now(),
        soundEnabled: false, textSize: 'normal',
      },
      currentSession: {
        date: today, questionnaireCompleted: true, focusCategory: category,
        categoriesCompleted: [], currentCategory: category, currentGameId: gameId,
        secondsInCurrentCategory: 0, sessionStartedAt: Date.now(),
      },
      settings: { language: 'en', textSize: 'normal', soundEnabled: false },
    },
    version: 0,
  };
}

const failures = [];
const browser = await chromium.launch();

for (const vp of VIEWPORTS) {
  for (const game of GAMES) {
    const context = await browser.newContext({
      viewport: { width: vp.width, height: vp.height },
      deviceScaleFactor: 2,
      isMobile: true,
      hasTouch: true,
    });
    const page = await context.newPage();

    // A ResizeObserver feedback loop is the specific failure the stage hook's two-div
    // split exists to prevent, so it is a failure here, not noise.
    const roNoise = [];
    page.on('console', (m) => { if (/ResizeObserver/i.test(m.text())) roNoise.push(m.text()); });
    page.on('pageerror', (e) => { if (/ResizeObserver/i.test(String(e))) roNoise.push(String(e)); });

    await page.addInitScript(
      ([key, value]) => window.localStorage.setItem(key, value),
      ['brain-training-store', JSON.stringify(seed(game.id, game.category))],
    );

    await page.goto(`${BASE}/app/game/${game.id}`, { waitUntil: 'networkidle' });

    // Every one of these games renders a loading node while its sprites decode. Measuring
    // before that resolves measures an empty box and passes for the wrong reason.
    await page.waitForSelector('[data-testid="play-box"] *', { timeout: 15000 });
    await page.waitForTimeout(2500);

    // Resize while mounted, then back: a stale observer shows up here and nowhere else.
    await page.setViewportSize({ width: vp.width - 20, height: vp.height - 20 });
    await page.waitForTimeout(500);
    await page.setViewportSize({ width: vp.width, height: vp.height });
    await page.waitForTimeout(800);

    const result = await page.evaluate(() => {
      const doc = document.documentElement;
      const playBox = document.querySelector('[data-testid="play-box"]');
      if (!playBox) return { noPlayBox: true };
      const box = playBox.getBoundingClientRect();

      // The deepest painted content inside the play box, whatever the game renders.
      let lowest = box.top;
      let widest = box.left;
      for (const el of playBox.querySelectorAll('*')) {
        const r = el.getBoundingClientRect();
        if (r.width === 0 || r.height === 0) continue;
        if (r.bottom > lowest) lowest = r.bottom;
        if (r.right > widest) widest = r.right;
      }

      return {
        docScrolls: doc.scrollHeight > doc.clientHeight + 1,
        boxW: Math.round(box.width),
        boxH: Math.round(box.height),
        overflowY: Math.round(lowest - box.bottom),
        overflowX: Math.round(widest - box.right),
      };
    });

    const label = `${vp.name} / ${game.id}`;

    if (result.noPlayBox) {
      failures.push(`${label}: no [data-testid="play-box"] found - GameShell lost its test id`);
    } else {
      if (result.docScrolls) failures.push(`${label}: the document scrolls`);
      if (result.boxH <= 0) failures.push(`${label}: play box has no height`);
      // 1px of tolerance for subpixel rounding.
      if (result.overflowY > 1) failures.push(`${label}: content overflows the play box by ${result.overflowY}px vertically`);
      if (result.overflowX > 1) failures.push(`${label}: content overflows the play box by ${result.overflowX}px horizontally`);
      if (roNoise.length > 0) failures.push(`${label}: ResizeObserver loop - the stage ref is on a scaled element`);

      if (!result.docScrolls && result.overflowY <= 1 && result.overflowX <= 1 && roNoise.length === 0) {
        console.log(`ok   ${label.padEnd(30)} play box ${result.boxW}x${result.boxH}`);
      }
    }

    await context.close();
  }
}

// The landscape gate: it must appear, and it must not unmount the app beneath it.
{
  const context = await browser.newContext({
    viewport: { width: 844, height: 390 },
    isMobile: true,
    hasTouch: true,
  });
  const page = await context.newPage();
  await page.addInitScript(
    ([key, value]) => window.localStorage.setItem(key, value),
    ['brain-training-store', JSON.stringify(seed('train-yard', 'memory'))],
  );
  await page.goto(`${BASE}/app/game/train-yard`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(2500);

  const gateVisible = await page.locator('.rotate-gate').isVisible();
  const appStillMounted = (await page.locator('main').count()) > 0;

  if (!gateVisible) failures.push('landscape: the rotate gate did not appear');
  if (!appStillMounted) failures.push('landscape: the app unmounted behind the gate');
  if (gateVisible && appStillMounted) console.log('ok   landscape                       gate shown, app still mounted');

  await context.close();
}

// The gate must stay off desktop, or development is impossible.
{
  const context = await browser.newContext({ viewport: { width: 1440, height: 900 } });
  const page = await context.newPage();
  await page.goto(`${BASE}/`, { waitUntil: 'networkidle' });
  await page.waitForTimeout(1200);
  const gate = page.locator('.rotate-gate');
  const shown = (await gate.count()) > 0 && (await gate.isVisible());
  if (shown) failures.push('desktop: the rotate gate fired on a fine pointer');
  else console.log('ok   desktop landscape              gate correctly hidden');
  await context.close();
}

await browser.close();

if (failures.length > 0) {
  console.error(`\n${failures.length} failure(s):`);
  for (const f of failures) console.error(`  FAIL ${f}`);
  process.exit(1);
}
console.log('\nAll portrait fit checks passed.');
