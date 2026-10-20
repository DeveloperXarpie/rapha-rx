/**
 * Photographs every flow screen - everything a resident sees that is not a game
 * board - and writes them up as one page, docs/flow-screens/index.html, in the
 * order a resident meets them.
 *
 * Run against a dev or preview server:
 *   npm run dev
 *   npm run shots                      # -> docs/flow-screens/
 *   node scripts/screenshot-flow.mjs <outDir> [baseUrl]
 *
 * Playwright is a devDependency and its browser must be installed once:
 *   npx playwright install chromium
 *
 * Like scripts/portrait-smoke.mjs, this has to live inside the project tree for
 * the playwright import to resolve.
 *
 * Each sequence below gets a fresh browser context, so localStorage and Dexie
 * start empty unless the sequence seeds them. Steps within a sequence share one
 * page, which is how the resumable Home and the Sign in match are reached: both
 * need state the app itself wrote to Dexie, which seeding localStorage cannot do.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'docs/flow-screens';
const BASE = process.argv[3] ?? 'http://localhost:5173';
const IMG_DIR = 'img';

/** The handoff's canvas. Everything is designed against this. */
const VIEWPORT = { width: 360, height: 780 };

const USER_ID = 'shot-user';
const TODAY = new Date().toISOString().split('T')[0];
const YESTERDAY = new Date(Date.now() - 86_400_000).toISOString().split('T')[0];

const ALL_DONE = ['memory', 'attention', 'executive'];
const PLANNED = ['market-memory', 'spot-focus', 'serve-guests'];
const MARQUEE = ['market-memory', 'train-yard', 'spot-focus', 'garden-keeper', 'serve-guests', 'clear-the-way'];

/** The launch gate holds for 2000 ms; everything after it wants that gone. */
const BOOT_MS = 2600;
/** Long enough for a ScreenTransition to finish after an in-page step. */
const SETTLE_MS = 900;

/**
 * A signed-in profile, so the protected screens render without walking signup.
 * Mirrors the store's persisted shape - see store/index.ts partialize:
 * activeProfile, settings, currentSession. `fresh` leaves yesterday's session in
 * place, so Home starts today's itself, exactly as it does for a real resident.
 */
function seed({ fresh = false, categoriesCompleted = [], currentCategory = 'memory', currentGameId = 'market-memory' } = {}) {
  return {
    state: {
      activeProfile: {
        userId: USER_ID, firstName: 'Meera', lastName: '', nickname: 'Meera',
        careHomeId: 'dr-dominic-benjamin', language: 'en',
        createdAt: Date.now(), lastSeenAt: Date.now(),
        soundEnabled: false, textSize: 'normal',
      },
      settings: { language: 'en', textSize: 'normal', soundEnabled: false },
      currentSession: fresh
        ? {
            date: YESTERDAY, sessionStarted: false, plannedGames: [],
            focusCategory: null, categoriesCompleted: [], currentCategory: null,
            currentGameId: null, secondsInCurrentCategory: 0, sessionStartedAt: null,
          }
        : {
            date: TODAY, sessionStarted: true, plannedGames: PLANNED,
            focusCategory: currentCategory, categoriesCompleted, currentCategory,
            currentGameId, secondsInCurrentCategory: 0, sessionStartedAt: Date.now(),
          },
    },
    version: 0,
  };
}

const settle = (page, ms = SETTLE_MS) => page.waitForTimeout(ms);

async function open(page, path, ms = BOOT_MS) {
  await page.goto(BASE + path, { waitUntil: 'networkidle' });
  await settle(page, ms);
}

/**
 * The page is built from these. `stage` groups the cards; a step with `variant`
 * is drawn as a thumbnail under the card it names rather than as a card of its own.
 */
const SEQUENCES = [
  {
    steps: [
      {
        slug: 'launch', stage: 'Start-up', title: 'Launch',
        route: 'any cold start', source: 'LaunchScreen via AppBootGate',
        note: 'Plain white brand frame held until i18n and Dexie are ready, for at least 2 s.',
        // Not open(): waiting for networkidle outlasts the 2 s hold, and the
        // frame is gone by the time the shot is taken.
        run: async (page) => {
          await page.goto(BASE + '/', { waitUntil: 'domcontentloaded' });
          await settle(page, 700);
        },
      },
      {
        slug: 'splash', stage: 'Start-up', title: 'Splash',
        route: '/', source: 'SplashScreen',
        note: 'The way in. Get Started goes to signup, Sign in to the name lookup.',
        run: (page) => settle(page, BOOT_MS),
      },
    ],
  },
  {
    steps: [
      {
        slug: 'signup', stage: 'Joining', title: 'Sign up',
        route: '/signup', source: 'SignupScreen, details step',
        note: 'Name, age and prescriber. Age is checked but never stored. Continue appears once a prescriber is chosen.',
        run: (page) => open(page, '/signup'),
      },
      {
        slug: 'signup-picker', stage: 'Joining', title: 'Prescriber picker',
        route: '/signup (sheet)', source: 'PrescriberPicker',
        note: 'Modal sheet shared with Settings, so the two lists cannot drift apart.',
        run: async (page) => {
          await page.fill('#signup-name', 'Meera');
          await page.fill('#signup-age', '72');
          await page.getByRole('button', { name: 'Prescribed by' }).click();
          await settle(page);
        },
      },
      {
        slug: 'signup-filled', stage: 'Joining', title: 'Sign up, filled in',
        route: '/signup', source: 'SignupScreen, details step',
        note: 'The chosen prescriber shows under the button and Continue appears.',
        run: async (page) => {
          await page.getByRole('dialog').getByRole('button').first().click();
          await settle(page);
        },
      },
      {
        slug: 'signup-confirm', stage: 'Joining', title: 'Welcome',
        route: '/signup', source: 'SignupScreen, confirm step',
        note: 'Confirms name and prescriber with a live clock. Next creates the profile, or signs in to an existing one with the same name.',
        run: async (page) => {
          await page.getByRole('button', { name: 'Continue' }).click();
          await settle(page);
        },
      },
      {
        slug: 'signin', stage: 'Joining', title: 'Sign in',
        route: '/signin', source: 'SignInScreen',
        note: 'Matches a typed name against every profile on the device, by first name or nickname.',
        run: async (page) => {
          await page.getByRole('button', { name: 'Next' }).click();
          await page.waitForURL('**/app/home');
          await open(page, '/signin');
          await page.getByRole('textbox').fill('Mee');
          await settle(page);
        },
      },
    ],
  },
  {
    seed: seed({ fresh: true }),
    steps: [
      {
        slug: 'home-start', stage: 'Home', title: 'Home, new day',
        route: '/app/home', source: 'HomeScreen',
        note: 'Arriving starts the session, so the three games shown are the three that will be played. The greyed strip is the marquee games not picked today.',
        run: (page) => open(page, '/app/home'),
      },
      {
        slug: 'home-continue', stage: 'Home', title: 'Home, session under way',
        route: '/app/home', source: 'HomeScreen',
        note: 'Continue returns to the intro of the game in play.',
        run: (page) => open(page, '/app/home'),
      },
    ],
  },
  {
    seed: seed({ categoriesCompleted: ALL_DONE }),
    steps: [
      {
        slug: 'home-done', stage: 'Home', title: 'Home, day complete',
        route: '/app/home', source: 'HomeScreen',
        note: 'Once all three categories are done the primary action becomes Free Play.',
        run: (page) => open(page, '/app/home'),
      },
    ],
  },
  {
    seed: seed(),
    steps: [
      {
        slug: 'education', stage: 'Before each game', title: 'Keep Your Brain Active',
        route: '/app/education', source: 'EducationScreen',
        note: 'Shown once at the start of a session. Purely informational.',
        run: (page) => open(page, '/app/education'),
      },
      {
        slug: 'intro', stage: 'Before each game', title: 'Game intro',
        route: '/app/game/:gameId/intro', source: 'GameIntro',
        note: 'Before every session game, and every Free Play game with a skill mapping. Names the domain and the skills it trains, then waits for Continue.',
        run: (page) => open(page, '/app/game/market-memory/intro'),
      },
      {
        slug: 'title', stage: 'Before each game', title: 'Game title',
        route: '/app/game/:gameId/title', source: 'GameTitleScreen',
        note: 'The game\'s splash art with a real PLAY button. One per marquee game - all six are below.',
        run: (page) => open(page, '/app/game/market-memory/title'),
      },
      ...MARQUEE.map((id) => ({
        slug: `title-${id}`, variant: 'title', title: id,
        run: (page) => open(page, `/app/game/${id}/title`),
      })),
    ],
  },
  {
    seed: seed(),
    steps: [
      {
        slug: 'exit-confirm', stage: 'During any game', title: 'Leave this game?',
        route: '/app/game/:gameId (dialog)', source: 'GameShell',
        note: 'The exit button in the corner of every board asks first. Leaving goes back to Home, which then offers Continue.',
        run: async (page) => {
          await open(page, '/app/game/market-memory', 3500);
          await page.getByRole('button', { name: 'Exit' }).click();
          await settle(page);
        },
      },
    ],
  },
  {
    seed: seed(),
    context: { viewport: { width: 780, height: 360 }, hasTouch: true, isMobile: true },
    steps: [
      {
        slug: 'rotate', stage: 'During any game', title: 'Turn upright',
        route: 'any /app route, landscape', source: 'RotateDevice',
        note: 'Covers the app on a sideways touch device. The screen underneath stays mounted, so a round in progress is not lost.',
        landscape: true,
        run: (page) => open(page, '/app/home'),
      },
    ],
  },
  {
    seed: seed({ categoriesCompleted: ['memory'], currentCategory: 'attention', currentGameId: 'spot-focus' }),
    steps: [
      {
        slug: 'score', stage: 'After a game', title: 'Score card',
        route: '/app/game/:gameId/score', source: 'ScoreCard',
        note: 'After each session game, when the session moves on. Words only, never a number. Scoring is not built yet, so today it is the title, the thank-you and Continue.',
        run: (page) => open(page, '/app/game/market-memory/score'),
      },
    ],
  },
  {
    seed: seed({ categoriesCompleted: ALL_DONE }),
    steps: [
      {
        slug: 'summary', stage: 'After a game', title: 'Session summary',
        route: '/app/summary', source: 'SessionSummary',
        note: 'After the third game. Lists the games played with the level reached in each.',
        run: (page) => open(page, '/app/summary'),
      },
      {
        slug: 'free-play', stage: 'Anytime', title: 'Free Play',
        route: '/app/free-play', source: 'FreePlayScreen',
        note: 'The whole library, open only once the day\'s session is complete.',
        run: (page) => open(page, '/app/free-play'),
      },
    ],
  },
  {
    seed: seed(),
    steps: [
      {
        slug: 'settings', stage: 'Anytime', title: 'Settings',
        route: '/app/settings', source: 'SettingsScreen',
        note: 'Language, text size, sound, prescriber and Switch Profile. Reached from the gear on Home.',
        run: (page) => open(page, '/app/settings'),
      },
      {
        slug: 'offline', stage: 'Anytime', title: 'Offline banner',
        route: '/app/home', source: 'AppShell',
        note: 'Shown above any non-game screen while the device is offline. Hidden on game routes.',
        run: async (page, ctx) => {
          await open(page, '/app/home');
          await ctx.setOffline(true);
          await settle(page);
        },
      },
    ],
  },
];

const STAGES = ['Start-up', 'Joining', 'Home', 'Before each game', 'During any game', 'After a game', 'Anytime'];

/** Console noise that is expected locally - see the smoke-test notes. */
const NOISE = /PLACEHOLDER_KEY|Amplitude|firestore|Firebase|net::ERR|400|403|ERR_INTERNET_DISCONNECTED|WebSocket|\[vite\]/i;

mkdirSync(join(OUT, IMG_DIR), { recursive: true });
const browser = await chromium.launch();
const shots = [];
let failures = 0;

for (const seq of SEQUENCES) {
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2, ...seq.context });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));

  if (seq.seed) {
    // Only on the first load. A seed re-applied on every navigation would undo
    // what the app writes, and the resumable Home is made of exactly that.
    await page.addInitScript((s) => {
      if (!sessionStorage.getItem('shot-seeded')) {
        localStorage.setItem('brain-training-store', s);
        sessionStorage.setItem('shot-seeded', '1');
      }
    }, JSON.stringify(seq.seed));
  }

  for (const step of seq.steps) {
    errors.length = 0;
    try {
      await step.run(page, ctx);
      await page.screenshot({ path: join(OUT, IMG_DIR, `${step.slug}.jpg`), type: 'jpeg', quality: 82 });
      shots.push(step);
      const noise = errors.filter((e) => !NOISE.test(e));
      console.log(`${step.slug.padEnd(28)} ${noise.length ? 'CONSOLE ERRORS: ' + noise.slice(0, 2).join(' | ') : 'ok'}`);
    } catch (e) {
      failures += 1;
      console.log(`${step.slug.padEnd(28)} FAILED: ${String(e).split('\n')[0]}`);
    }
  }
  await ctx.close();
}

await browser.close();

writeFileSync(join(OUT, 'index.html'), renderPage(shots));
console.log(`\n${shots.length} screens -> ${join(OUT, 'index.html')}`);
if (failures) {
  console.log(`${failures} step(s) failed`);
  process.exitCode = 1;
}

function renderPage(list) {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a checkout */ }
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const img = (slug, alt) =>
    `<img src="${IMG_DIR}/${slug}.jpg" alt="${esc(alt)}" loading="lazy" data-full>`;

  let n = 0;
  const sections = STAGES.map((stage) => {
    const cards = list.filter((s) => s.stage === stage).map((s) => {
      n += 1;
      const variants = list.filter((v) => v.variant === s.slug);
      return `
      <article class="card${s.landscape ? ' wide' : ''}">
        <figure class="shot">${img(s.slug, s.title)}</figure>
        <div class="meta">
          <h3><span class="num">${n}</span>${esc(s.title)}</h3>
          <p class="route"><code>${esc(s.route)}</code></p>
          <p>${esc(s.note)}</p>
          <p class="src">${esc(s.source)}</p>
        </div>
        ${variants.length ? `<div class="variants">${variants.map((v) => `
          <figure>${img(v.slug, v.title)}<figcaption>${esc(v.title)}</figcaption></figure>`).join('')}
        </div>` : ''}
      </article>`;
    }).join('');
    return cards ? `
    <section>
      <h2>${esc(stage)}</h2>
      <div class="grid">${cards}
      </div>
    </section>` : '';
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Flow Screens</title>
<!-- Generated by scripts/screenshot-flow.mjs. Edit that, not this. -->
<style>
  :root {
    --bg: #f5f6f8; --surface: #ffffff; --text: #1b2438; --muted: #5d6780;
    --line: #dde2ea; --accent: #2a66b8; --chip: #eaf1fb;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #10141c; --surface: #1a202b; --text: #e8ecf3; --muted: #9aa5b8;
      --line: #2b3342; --accent: #7fb0ff; --chip: #1f2b3f;
    }
  }
  :root[data-theme="dark"] {
    --bg: #10141c; --surface: #1a202b; --text: #e8ecf3; --muted: #9aa5b8;
    --line: #2b3342; --accent: #7fb0ff; --chip: #1f2b3f;
  }
  * { box-sizing: border-box; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  header, main { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
  header { padding-top: 32px; padding-bottom: 8px; }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.01em; }
  header p { margin: 0; color: var(--muted); max-width: 70ch; }
  header .stamp { margin-top: 8px; font-size: 13px; }
  h2 {
    font-size: 13px; text-transform: uppercase; letter-spacing: 0.12em;
    color: var(--muted); margin: 36px 0 14px; padding-bottom: 8px;
    border-bottom: 1px solid var(--line);
  }
  .grid { display: grid; grid-template-columns: repeat(auto-fill, minmax(230px, 1fr)); gap: 20px; }
  .card {
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    overflow: hidden; display: flex; flex-direction: column;
  }
  .card.wide { grid-column: span 2; }
  @media (max-width: 520px) { .card.wide { grid-column: auto; } }
  .shot { margin: 0; background: var(--chip); padding: 14px; display: flex; justify-content: center; }
  .shot img {
    width: 100%; max-width: 260px; height: auto; border-radius: 10px; cursor: zoom-in;
    box-shadow: 0 4px 14px rgba(0, 0, 0, 0.18);
  }
  .wide .shot img { max-width: 100%; }
  .meta { padding: 12px 14px 14px; }
  .meta h3 { font-size: 16px; margin: 0 0 4px; display: flex; align-items: center; gap: 8px; }
  .num {
    flex: none; width: 22px; height: 22px; border-radius: 50%; background: var(--accent);
    color: var(--surface); font-size: 12px; display: grid; place-items: center;
  }
  .meta p { margin: 6px 0 0; font-size: 14px; }
  .route code { font-size: 12.5px; color: var(--accent); background: var(--chip); padding: 1px 6px; border-radius: 6px; }
  .src { color: var(--muted); font-size: 12.5px !important; }
  .variants {
    display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px;
    padding: 0 14px 14px; border-top: 1px solid var(--line); padding-top: 12px;
  }
  .variants figure { margin: 0; text-align: center; }
  .variants img { width: 100%; height: auto; border-radius: 6px; cursor: zoom-in; }
  .variants figcaption { font-size: 11px; color: var(--muted); overflow-wrap: anywhere; }
  footer { max-width: 1280px; margin: 40px auto; padding: 0 16px; color: var(--muted); font-size: 13px; }
  dialog { border: 0; padding: 0; background: transparent; max-width: 96vw; max-height: 96vh; }
  dialog::backdrop { background: rgba(0, 0, 0, 0.8); }
  dialog img { display: block; max-width: 96vw; max-height: 94vh; border-radius: 12px; }
</style>
</head>
<body>
<header>
  <h1>Flow screens</h1>
  <p>Every screen a resident sees outside the game boards, in the order they meet them.
  Captured from the running app at the 360 × 780 design canvas. Tap a screen to enlarge it.</p>
  <p class="stamp">v${esc(version)}${commit ? ` · ${esc(commit)}` : ''} · captured ${when} UTC</p>
</header>
<main>${sections}
</main>
<footer>Regenerate with <code>npm run dev</code> then <code>npm run shots</code>.
Not shown: the dev-only <code>/dev/chrome</code> gallery and the hidden level jumper.</footer>
<dialog id="zoom"><img alt=""></dialog>
<script>
  const zoom = document.getElementById('zoom');
  document.querySelectorAll('img[data-full]').forEach((el) => el.addEventListener('click', () => {
    zoom.querySelector('img').src = el.src;
    zoom.querySelector('img').alt = el.alt;
    zoom.showModal();
  }));
  zoom.addEventListener('click', () => zoom.close());
</script>
</body>
</html>
`;
}
