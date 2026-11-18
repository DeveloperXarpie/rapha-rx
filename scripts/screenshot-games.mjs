/**
 * Photographs each marquee game's board and every difficulty dial named in
 * docs/redesign-v2/research/2026-11-12_difficulty-design-notes.md, and writes
 * them up as one page, docs/game-screens/index.html, for walking through the
 * difficulty design in a meeting. scripts/screenshot-flow.mjs covers everything
 * outside the boards.
 *
 * Run against a dev or preview server:
 *   npm run dev
 *   node scripts/screenshot-games.mjs [outDir] [baseUrl]
 *
 * Levels are forced with the debug level jumper's `?debugLevel=1-10` query
 * param (src/lib/debugLevels.ts), which maps a level onto the difficulty score
 * every game reads. Debug rounds never touch the resident's real difficulty.
 * Dials the design notes propose but the game does not have yet are drawn as
 * "not in the game yet" tiles, so the gap is visible in the meeting too.
 */
import { chromium } from 'playwright';
import { execSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const OUT = process.argv[2] ?? 'docs/game-screens';
const BASE = process.argv[3] ?? 'http://localhost:5173';
const IMG_DIR = 'img';
const VIEWPORT = { width: 360, height: 780 };
const BOOT_MS = 3500;

const TODAY = new Date().toISOString().split('T')[0];

/** Same persisted shape as screenshot-flow.mjs's seed(): a signed-in profile mid-session. */
const SEED = JSON.stringify({
  state: {
    activeProfile: {
      userId: 'shot-user', firstName: 'Meera', lastName: '', nickname: 'Meera',
      careHomeId: 'dr-dominic-benjamin', language: 'en',
      createdAt: Date.now(), lastSeenAt: Date.now(),
      soundEnabled: false, textSize: 'normal',
    },
    settings: { language: 'en', textSize: 'normal', soundEnabled: false },
    currentSession: {
      date: TODAY, sessionStarted: true,
      plannedGames: ['market-memory', 'spot-focus', 'serve-guests'],
      focusCategory: 'memory', categoriesCompleted: [], currentCategory: 'memory',
      currentGameId: 'market-memory', secondsInCurrentCategory: 0, sessionStartedAt: Date.now(),
    },
  },
  version: 0,
});

const wait = (page, ms) => page.waitForTimeout(ms);

/** Opens a game's board at a debug level (1-10). */
async function open(page, id, level, ms = BOOT_MS) {
  await page.goto(`${BASE}/app/game/${id}?debugLevel=${level}`, { waitUntil: 'networkidle' });
  await wait(page, ms);
}

// ─── Per-game helpers ─────────────────────────────────────────────────────────

/** Shopping List: from the list to the shelf. Cover, cart travel, the hold, the reveal. */
async function mmToShelf(page) {
  await page.getByRole('button', { name: 'READY' }).click();
  await wait(page, 10000);
}

/**
 * Station Master: wait out study and hold, then send the nominated train to
 * stations in turn until one takes it. Leaves one station filled (coloured), and
 * usually a heart or two gone, which is exactly the giveaway the notes describe.
 */
async function tyFillOneStation(page) {
  await wait(page, 13000);
  const greyCount = () => page.evaluate(() =>
    [...document.querySelectorAll('[data-board] img')].filter((i) => i.style.filter.includes('grayscale')).length);
  const before = await greyCount();
  for (let attempt = 0; attempt < 4; attempt += 1) {
    const greys = await page.evaluateHandle(() =>
      [...document.querySelectorAll('[data-board] img')]
        .filter((i) => i.style.filter.includes('grayscale'))
        .map((i) => i.parentElement));
    const target = await greys.evaluateHandle((els, n) => els[n], attempt);
    await target.asElement()?.click();
    await wait(page, 3600);
    if ((await greyCount()) < before) return;
  }
}

/** Tiffen Time: start cooking the first dish on the counter. */
async function sgCookFirst(page) {
  await page.locator('[aria-label^="Prepare "]').first().click();
}

/** Garden Keeper: past the how-to card and into the round. */
async function gkStart(page, ms) {
  await page.getByRole('button', { name: 'Start' }).click();
  await wait(page, ms);
}

// ─── The page's content ───────────────────────────────────────────────────────

/**
 * Each dial mirrors a row of a "What makes it harder" table in the design notes.
 * A shot either runs its own steps (`run`) or points at one already taken (`ref`).
 * A dial with no shots is drawn as "not in the game yet".
 */
const GAMES = [
  {
    id: 'market-memory', name: 'Shopping List', domain: 'Memory', skills: 'Recall, Retention',
    fantasy: 'Read a shopping list, walk to the market, and pick the right items off the shelves.',
    board: { slug: 'mm-board', caption: 'The shelf, level 1', run: async (p) => { await open(p, 'market-memory', 1); await mmToShelf(p); } },
    dials: [
      {
        name: 'List length', range: '3 items → 6 items',
        feel: 'More to hold in mind. Six is the most the cart can show.',
        shots: [
          { slug: 'mm-list-l1', caption: 'Level 1: 3 items', run: (p) => open(p, 'market-memory', 1) },
          { slug: 'mm-list-l10', caption: 'Level 10: 6 items', run: (p) => open(p, 'market-memory', 10) },
        ],
      },
      {
        name: 'Wait before shopping', range: '1.5 s → 6.5 s',
        feel: 'The list is covered and the cart travels. This hold is the whole time pressure; the list itself is untimed.',
        shots: [
          {
            slug: 'mm-wait', caption: 'The cover and the cart on its way',
            run: async (p) => { await open(p, 'market-memory', 10); await p.getByRole('button', { name: 'READY' }).click(); await wait(p, 2200); },
          },
        ],
      },
      {
        name: 'Twins on the shelf', range: 'off → on',
        feel: 'Every list item has a look-alike on the shelf. You must remember exactly what was listed.',
        shots: [
          { ref: 'mm-board', caption: 'Level 1: no twins' },
          { slug: 'mm-twins', caption: 'Level 3: twins on', run: async (p) => { await open(p, 'market-memory', 3); await mmToShelf(p); } },
        ],
      },
      {
        name: 'One-aisle lists', range: 'off → on',
        feel: 'Every item comes from one group, such as produce, so they blur together.',
        shots: [
          { slug: 'mm-aisle-list', caption: 'Level 8: a one-aisle list', run: (p) => open(p, 'market-memory', 8) },
          { slug: 'mm-aisle-shelf', caption: 'Level 8: its shelf', run: async (p) => { await open(p, 'market-memory', 8); await mmToShelf(p); } },
        ],
      },
      {
        name: 'How close the twins are', range: 'loose → very close',
        feel: 'The closest twins are the pulses, which differ only in colour. Proposed, not built.',
        shots: [],
      },
      {
        name: 'Hints', range: '2 → 0',
        feel: 'Each hint highlights one remaining list item on the shelf for 3 seconds. The bulb sits on the left of the cart.',
        shots: [
          {
            slug: 'mm-hint', caption: 'A hint highlighting a list item on the shelf',
            run: async (p) => { await open(p, 'market-memory', 1); await mmToShelf(p); await p.getByRole('button', { name: 'HINT' }).click(); await wait(p, 700); },
          },
        ],
      },
    ],
  },
  {
    id: 'train-yard', name: 'Station Master', domain: 'Memory', skills: 'Association, Sequence',
    fantasy: 'You are the station master, sending each train to its own platform.',
    board: { slug: 'ty-board', caption: 'Sending trains home, level 1', run: async (p) => { await open(p, 'train-yard', 1); await wait(p, 13000); } },
    dials: [
      {
        name: 'Stations', range: '3 → 4 (5 with new art)',
        feel: 'One more pairing to hold. The game always uses 4 today; 3 and 5 are proposed.',
        shots: [{ ref: 'ty-board', caption: 'Always 4 stations today' }],
      },
      {
        name: 'Study time', range: 'about 9 s → about 3 s',
        feel: 'The coloured stations and their names, before they go grey. The player cannot skip ahead.',
        shots: [
          { slug: 'ty-study-l1', caption: 'Level 1: about 7.8 s to study', run: (p) => open(p, 'train-yard', 1) },
        ],
      },
      {
        name: 'Pause before sending', range: '1.5 s → 4 s',
        feel: 'The blind is down and the pairings must be held in mind.',
        shots: [
          { slug: 'ty-pause', caption: 'The blind down', run: async (p) => { await open(p, 'train-yard', 1); await wait(p, 4900); } },
        ],
      },
      {
        name: 'Stations reveal when filled', range: 'on → off',
        feel: 'A filled station turns back to colour and cannot be chosen again, which gives away the last answers. Today it is always on.',
        shots: [{ slug: 'ty-filled', caption: 'One station filled and coloured', run: async (p) => { await open(p, 'train-yard', 1); await tyFillOneStation(p); } }],
      },
      {
        name: 'Similar colours', range: 'off → on',
        feel: 'Close warm hues in place of four distinct ones. Tests eyesight as much as memory.',
        shots: [
          { ref: 'ty-study-l1', caption: 'Level 1: distinct colours' },
          // Study is only about 4.8 s at level 7, so a full boot wait would miss it.
          { slug: 'ty-similar', caption: 'Level 7: similar colours', run: (p) => open(p, 'train-yard', 7, 1500) },
        ],
      },
      {
        name: 'Hearts', range: '3 → 2 (maybe 1)',
        feel: 'Fewer mistakes before the round ends. Top left of the board.',
        shots: [{ ref: 'ty-filled', caption: 'Hearts after a miss or two' }],
      },
    ],
  },
  {
    id: 'spot-focus', name: 'Spot Focus', domain: 'Attention', skills: 'Selective attention, Response speed',
    fantasy: 'A spot-the-difference board: two panels side by side, find what changed.',
    board: { slug: 'sf-l1', caption: 'Level 1', run: (p) => open(p, 'spot-focus', 1) },
    dials: [
      {
        name: 'Number of differences', range: '2 → 6',
        feel: 'More to find. Above about 40% of the cells, random tapping starts to work; today\'s top level has 7 of 12.',
        shots: [
          { ref: 'sf-l1', caption: 'Level 1: 2 of 9 cells' },
          { slug: 'sf-l5', caption: 'Level 5: 4 of 12 cells', run: (p) => open(p, 'spot-focus', 5) },
          { slug: 'sf-l10', caption: 'Level 10: 7 of 12 cells', run: (p) => open(p, 'spot-focus', 10) },
        ],
      },
      {
        name: 'How subtle the change is', range: 'bold → subtle',
        feel: 'Bold swaps in another family, medium a relative, subtle a near twin.',
        shots: [
          { ref: 'sf-l1', caption: 'Level 1: bold' },
          { ref: 'sf-l5', caption: 'Level 5: medium' },
          { ref: 'sf-l10', caption: 'Level 10: subtle' },
        ],
      },
      {
        name: 'Board size', range: '3 × 3 → 4 × 4',
        feel: 'More to scan, and smaller cards on a phone. Today the board stops at 4 × 3.',
        shots: [
          { ref: 'sf-l1', caption: 'Level 1: 3 × 3' },
          { ref: 'sf-l5', caption: 'Level 5: 4 × 3' },
        ],
      },
      { name: 'Mixed subtlety', range: 'one level per board → mixed', feel: 'A board that eases in with mostly bold and one subtle. Proposed, not built.', shots: [] },
      { name: 'Time limit', range: 'none → 90 s', feel: 'Needed so "how many did you find" can vary. Proposed, not built.', shots: [] },
    ],
  },
  {
    id: 'garden-keeper', name: 'Garden Keeper', domain: 'Attention', skills: 'Sustained attention, Self-control',
    fantasy: 'Tend a garden: water the flowers when they get thirsty, and leave the wilted plants and pests alone.',
    board: { slug: 'gk-l1', caption: 'Level 1, a few seconds in', run: async (p) => { await open(p, 'garden-keeper', 1); await gkStart(p, 5000); } },
    dials: [
      {
        name: 'How to play', range: '',
        feel: 'The legend every round opens with: what to water and what to leave alone.',
        shots: [{ slug: 'gk-intro', caption: 'The how-to card', run: (p) => open(p, 'garden-keeper', 1) }],
      },
      {
        name: 'Plants in the garden', range: '12 → 24 (30 at most)',
        feel: 'More to watch.',
        shots: [
          { ref: 'gk-l1', caption: 'Level 1: 12 plants' },
          { slug: 'gk-l10', caption: 'Level 10: 23 plants', run: async (p) => { await open(p, 'garden-keeper', 10); await gkStart(p, 5000); } },
        ],
      },
      {
        name: 'Share of hazards', range: '25% → 55%',
        feel: 'More wilted plants and pests that must not be tapped.',
        shots: [
          { ref: 'gk-l1', caption: 'Level 1: 3 hazards' },
          { ref: 'gk-l10', caption: 'Level 10: about 12 hazards' },
        ],
      },
      {
        name: 'Pace, window and thirsty at once', range: '3 s → 1.2 s; 6 s → 2.8 s; 1 → 3',
        feel: 'How often a flower gets thirsty, how long it waits for water, and how many at once. Timing, so a still only hints at it.',
        shots: [{ ref: 'gk-l10', caption: 'Level 10: up to 3 thirsty at once' }],
      },
      {
        name: 'Hearts', range: '3 → 3',
        feel: 'Top right of the bar. They cap the mistakes the game can record.',
        shots: [{ ref: 'gk-l1', caption: 'Three hearts in the top bar' }],
      },
    ],
  },
  {
    id: 'serve-guests', name: 'Tiffen Time', domain: 'Planning', skills: 'Sequencing, Decision-making',
    fantasy: 'Run a tiffin counter: cook what the guests ordered and serve them before they lose patience.',
    board: { slug: 'sg-l1', caption: 'Level 1', run: async (p) => { await open(p, 'serve-guests', 1); await wait(p, 6000); } },
    dials: [
      {
        name: 'Guests at once and counter size', range: '2 → 4 guests; 3 → 6 dishes',
        feel: 'The game always seats 4 guests and lays out 6 dishes today; the smaller starts are proposed.',
        shots: [{ ref: 'sg-l1', caption: '4 guests, 6 dishes' }],
      },
      {
        name: 'Dishes per order', range: '1 → 3',
        feel: 'Bigger orders. Look at the speech bubbles.',
        shots: [
          { ref: 'sg-l1', caption: 'Level 1: 1 dish each' },
          { slug: 'sg-l5', caption: 'Level 5: up to 2', run: async (p) => { await open(p, 'serve-guests', 5); await wait(p, 6000); } },
          { slug: 'sg-l10', caption: 'Level 10: up to 3', run: async (p) => { await open(p, 'serve-guests', 10); await wait(p, 6000); } },
        ],
      },
      {
        name: 'Patience', range: 'generous → tight',
        feel: 'The bar under each order. Today it is set only by order size.',
        shots: [{ slug: 'sg-patience', caption: 'Bars running down, 20 s in', run: async (p) => { await open(p, 'serve-guests', 1); await wait(p, 20000); } }],
      },
      { name: 'Uneven patience', range: 'none → some guests in a hurry', feel: 'A real "who first?" question. Proposed, not built.', shots: [] },
      {
        name: 'Cooking times', range: 'short dishes → long dishes',
        feel: 'Long cooks force planning ahead. A cook cannot be hurried.',
        shots: [{ slug: 'sg-cooking', caption: 'A dish cooking', run: async (p) => { await open(p, 'serve-guests', 1); await sgCookFirst(p); await wait(p, 1200); } }],
      },
      {
        name: 'How long a ready dish lasts', range: '16 s → 9 s',
        feel: 'A ready dish glows to be served, then burns if left. Today it lasts 11 s at every level.',
        shots: [
          {
            slug: 'sg-ready', caption: 'Ready to serve',
            run: async (p) => { await open(p, 'serve-guests', 1); await sgCookFirst(p); await p.locator('[aria-label^="Serve "]').first().waitFor({ timeout: 12000 }); await wait(p, 500); },
          },
          {
            slug: 'sg-burnt', caption: 'Left too long: burnt',
            run: async (p) => { await open(p, 'serve-guests', 1); await sgCookFirst(p); await p.locator('[aria-label^="Throw away the burnt"]').first().waitFor({ timeout: 30000 }); await wait(p, 500); },
          },
        ],
      },
    ],
  },
  {
    id: 'clear-the-way', name: 'Free Me', domain: 'Planning', skills: 'Planning, Problem-solving',
    fantasy: 'A sliding-block puzzle: slide the obstacles aside to free the fish.',
    board: { slug: 'ctw-t1', caption: 'Tier 1', run: (p) => open(p, 'clear-the-way', 1) },
    dials: [
      {
        name: 'Board size', range: '4 × 4 → 6 × 6',
        feel: 'More moves available each turn. 6 × 6 is the largest that fits a phone.',
        shots: [
          { ref: 'ctw-t1', caption: 'Tier 1 (level 1): 4 × 4' },
          { slug: 'ctw-t2', caption: 'Tier 2 (level 3): 5 × 5', run: (p) => open(p, 'clear-the-way', 3) },
          { slug: 'ctw-t3', caption: 'Tier 3 (level 5): 6 × 6', run: (p) => open(p, 'clear-the-way', 5) },
        ],
      },
      {
        name: 'Fewest moves and moves before the fish can move', range: '2 → 15-16; 1 → 10+',
        feel: 'How far ahead you must think, and how long a chain you untangle before you see progress.',
        shots: [
          { ref: 'ctw-t1', caption: 'Tier 1: 2-3 moves' },
          { slug: 'ctw-t4', caption: 'Tier 4 (level 7)', run: (p) => open(p, 'clear-the-way', 7) },
          { slug: 'ctw-t5', caption: 'Tier 5 (level 10): 10-13 moves', run: (p) => open(p, 'clear-the-way', 10) },
        ],
      },
      {
        name: 'How tightly packed', range: 'about 45% → about 75% full',
        feel: 'Fewer escape routes. The hardest puzzles come from packing, not size.',
        shots: [
          { ref: 'ctw-t1', caption: 'Tier 1' },
          { ref: 'ctw-t5', caption: 'Tier 5' },
        ],
      },
      {
        name: 'Small single-cell blocks', range: 'up to 3 → none',
        feel: 'Hard to drag, and they let players sidestep the intended chain.',
        shots: [{ ref: 'ctw-t1', caption: 'Single-cell blocks on a small board' }],
      },
      { name: 'Exit side', range: 'right → any side', feel: 'Supported by the code but never shown or tested.', shots: [] },
    ],
  },
];

/** Console noise that is expected locally - same list as screenshot-flow.mjs. */
const NOISE = /PLACEHOLDER_KEY|Amplitude|firestore|Firebase|net::ERR|400|403|ERR_INTERNET_DISCONNECTED|WebSocket|\[vite\]/i;

// ─── Capture ──────────────────────────────────────────────────────────────────

const only = process.env.ONLY ? new Set(process.env.ONLY.split(',')) : null;
mkdirSync(join(OUT, IMG_DIR), { recursive: true });
const browser = await chromium.launch();
const taken = new Set();
let failures = 0;

const jobs = GAMES.flatMap((g) => [g.board, ...g.dials.flatMap((d) => d.shots)]).filter((s) => s.run);

for (const shot of jobs) {
  if (only && !only.has(shot.slug)) { taken.add(shot.slug); continue; }
  const ctx = await browser.newContext({ viewport: VIEWPORT, deviceScaleFactor: 2 });
  const page = await ctx.newPage();
  const errors = [];
  page.on('console', (m) => { if (m.type() === 'error') errors.push(m.text()); });
  page.on('pageerror', (e) => errors.push(String(e)));
  await page.addInitScript((s) => localStorage.setItem('brain-training-store', s), SEED);
  try {
    await shot.run(page);
    await page.screenshot({ path: join(OUT, IMG_DIR, `${shot.slug}.jpg`), type: 'jpeg', quality: 82 });
    taken.add(shot.slug);
    const noise = errors.filter((e) => !NOISE.test(e));
    console.log(`${shot.slug.padEnd(16)} ${noise.length ? 'CONSOLE ERRORS: ' + noise.slice(0, 2).join(' | ') : 'ok'}`);
  } catch (e) {
    failures += 1;
    console.log(`${shot.slug.padEnd(16)} FAILED: ${String(e).split('\n')[0]}`);
  }
  await ctx.close();
}

await browser.close();
writeFileSync(join(OUT, 'index.html'), renderPage());
console.log(`\n${taken.size} shots -> ${join(OUT, 'index.html')}`);
if (failures) {
  console.log(`${failures} shot(s) failed`);
  process.exitCode = 1;
}

// ─── Page ─────────────────────────────────────────────────────────────────────

function renderPage() {
  const { version } = JSON.parse(readFileSync('package.json', 'utf8'));
  let commit = '';
  try { commit = execSync('git rev-parse --short HEAD').toString().trim(); } catch { /* not a checkout */ }
  const when = new Date().toISOString().slice(0, 16).replace('T', ' ');
  const esc = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
  const fig = (slug, caption) => taken.has(slug)
    ? `<figure><img src="${IMG_DIR}/${slug}.jpg" alt="${esc(caption)}" loading="lazy" data-full><figcaption>${esc(caption)}</figcaption></figure>`
    : `<figure class="missing"><div>Not captured</div><figcaption>${esc(caption)}</figcaption></figure>`;

  const toc = GAMES.map((g) => `<a href="#${g.id}">${esc(g.name)}</a>`).join('');

  const sections = GAMES.map((g) => {
    const dials = g.dials.map((d) => {
      const built = d.shots.length > 0;
      return `
        <article class="dial${built ? '' : ' unbuilt'}">
          <header>
            <h3>${esc(d.name)}</h3>
            ${d.range ? `<p class="range">${esc(d.range)}</p>` : ''}
          </header>
          <p class="feel">${esc(d.feel)}</p>
          ${built
            ? `<div class="shots n${d.shots.length}">${d.shots.map((s) => fig(s.slug ?? s.ref, s.caption)).join('')}</div>`
            : '<div class="placeholder">Not in the game yet</div>'}
        </article>`;
    }).join('');
    return `
  <section id="${g.id}">
    <div class="game-head">
      <div class="board">${fig(g.board.slug, g.board.caption)}</div>
      <div class="intro">
        <p class="domain">${esc(g.domain)}</p>
        <h2>${esc(g.name)}</h2>
        <p class="skills">${esc(g.skills)}</p>
        <p class="fantasy">${esc(g.fantasy)}</p>
        <p class="route"><code>/app/game/${esc(g.id)}?debugLevel=1-10</code></p>
      </div>
    </div>
    <div class="dials">${dials}
    </div>
  </section>`;
  }).join('');

  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Game Difficulty Screens</title>
<!-- Generated by scripts/screenshot-games.mjs. Edit that, not this. -->
<style>
  :root {
    --bg: #f5f6f8; --surface: #ffffff; --text: #1b2438; --muted: #5d6780;
    --line: #dde2ea; --accent: #2a66b8; --chip: #eaf1fb; --warn: #9a6400; --warn-bg: #fff6e5;
  }
  @media (prefers-color-scheme: dark) {
    :root:not([data-theme="light"]) {
      --bg: #10141c; --surface: #1a202b; --text: #e8ecf3; --muted: #9aa5b8;
      --line: #2b3342; --accent: #7fb0ff; --chip: #1f2b3f; --warn: #f0bf6a; --warn-bg: #2a2416;
    }
  }
  :root[data-theme="dark"] {
    --bg: #10141c; --surface: #1a202b; --text: #e8ecf3; --muted: #9aa5b8;
    --line: #2b3342; --accent: #7fb0ff; --chip: #1f2b3f; --warn: #f0bf6a; --warn-bg: #2a2416;
  }
  * { box-sizing: border-box; }
  html { scroll-behavior: smooth; }
  body {
    margin: 0; background: var(--bg); color: var(--text);
    font: 15px/1.5 system-ui, -apple-system, "Segoe UI", Roboto, sans-serif;
  }
  .wrap { max-width: 1280px; margin: 0 auto; padding: 0 16px; }
  .page-head { padding: 32px 0 8px; }
  h1 { font-size: 28px; margin: 0 0 6px; letter-spacing: -0.01em; }
  .page-head p { margin: 0 0 6px; color: var(--muted); max-width: 75ch; }
  .stamp { font-size: 13px; }
  nav {
    position: sticky; top: 0; z-index: 5; background: var(--bg);
    border-bottom: 1px solid var(--line); padding: 10px 0; margin-bottom: 8px;
    display: flex; gap: 8px; flex-wrap: wrap;
  }
  nav a {
    color: var(--accent); text-decoration: none; font-size: 14px; font-weight: 600;
    background: var(--chip); padding: 4px 12px; border-radius: 999px;
  }
  section { padding: 28px 0 12px; border-bottom: 1px solid var(--line); scroll-margin-top: 56px; }
  .game-head { display: flex; gap: 24px; align-items: flex-start; margin-bottom: 20px; flex-wrap: wrap; }
  .board figure { width: 200px; }
  .intro { flex: 1; min-width: 240px; }
  .domain { margin: 0; font-size: 12px; text-transform: uppercase; letter-spacing: 0.12em; color: var(--muted); }
  h2 { font-size: 26px; margin: 0; }
  .skills { color: var(--accent); font-weight: 600; margin: 2px 0 10px; }
  .fantasy { margin: 0 0 10px; max-width: 60ch; }
  .route code { font-size: 12.5px; color: var(--accent); background: var(--chip); padding: 1px 6px; border-radius: 6px; }
  .dials { display: grid; grid-template-columns: repeat(auto-fill, minmax(300px, 1fr)); gap: 16px; }
  .dial {
    background: var(--surface); border: 1px solid var(--line); border-radius: 14px;
    padding: 14px; display: flex; flex-direction: column; gap: 8px;
  }
  .dial h3 { font-size: 16px; margin: 0; }
  .range { margin: 2px 0 0; font-size: 13px; font-weight: 600; color: var(--accent); }
  .feel { margin: 0; font-size: 14px; color: var(--muted); }
  .shots { display: grid; gap: 8px; margin-top: auto; }
  .shots.n1 { grid-template-columns: minmax(0, 150px); }
  .shots.n2 { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .shots.n3 { grid-template-columns: repeat(3, minmax(0, 1fr)); }
  figure { margin: 0; }
  figure img {
    width: 100%; height: auto; display: block; border-radius: 8px; cursor: zoom-in;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.16);
  }
  figcaption { font-size: 12px; color: var(--muted); margin-top: 4px; text-align: center; }
  figure.missing div {
    aspect-ratio: 360 / 780; display: grid; place-items: center; border-radius: 8px;
    border: 1px dashed var(--line); color: var(--muted); font-size: 12px;
  }
  .dial.unbuilt { border-style: dashed; }
  .placeholder {
    margin-top: auto; padding: 18px 12px; text-align: center; border-radius: 10px;
    background: var(--warn-bg); color: var(--warn); font-weight: 600; font-size: 13px;
  }
  footer { padding: 32px 0 48px; color: var(--muted); font-size: 13px; }
  dialog { border: 0; padding: 0; background: transparent; max-width: 96vw; max-height: 96vh; }
  dialog::backdrop { background: rgba(0, 0, 0, 0.8); }
  dialog img { display: block; max-width: 96vw; max-height: 94vh; border-radius: 12px; }
</style>
</head>
<body>
<div class="wrap">
  <div class="page-head">
    <h1>Game difficulty screens</h1>
    <p>Each of the six daily-session games, and every difficulty dial from the design notes
    (<code>docs/redesign-v2/research/2026-11-12_difficulty-design-notes.md</code>), shown at the levels where it changes.
    Dashed cards are dials the notes propose that the game does not have yet.</p>
    <p>Levels are today's 1-10 scale, forced with the debug level jumper, at the 360 × 780 design canvas.
    Timing dials are shown by the phase they control. Tap any screen to enlarge it.</p>
    <p class="stamp">v${esc(version)}${commit ? ` · ${esc(commit)}` : ''} · captured ${when} UTC</p>
  </div>
  <nav>${toc}</nav>
  ${sections}
  <footer>Regenerate with <code>npm run dev</code> then <code>node scripts/screenshot-games.mjs</code>.
  Everything outside the boards is in <code>docs/flow-screens/</code>.</footer>
</div>
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
