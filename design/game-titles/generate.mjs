// Generates game title cards via the OpenAI image API.
//   node design/game-titles/generate.mjs stylelock
//   node design/game-titles/generate.mjs batch <styleId> [gameId ...]
import fs from 'node:fs';
import path from 'node:path';

const HERE = path.dirname(new URL(import.meta.url).pathname.replace(/^\/([A-Za-z]:)/, '$1'));
const ROOT = path.resolve(HERE, '../..');
const OUT = path.join(HERE, 'out');
fs.mkdirSync(OUT, { recursive: true });

for (const line of fs.readFileSync(path.join(ROOT, '.env'), 'utf8').split(/\r?\n/)) {
  const m = line.match(/^([A-Z0-9_]+)=(.*)$/);
  if (m) process.env[m[1]] = m[2].trim();
}
const KEY = process.env.OPENAI_API_KEY;
if (!KEY) throw new Error('OPENAI_API_KEY missing from .env');

const MODEL = 'gpt-image-2';
const SIZE = '1024x1536';

// --- Style directions --------------------------------------------------------
// Every card shares this frame so the set reads as one family.
const COMMON = `Portrait mobile game title card, 2:3 aspect. Composition: a bold game
logo occupying the top third, a single friendly hero character in the middle, and
themed props scattered along the bottom. No app store UI, no device frame, no border,
no watermark, no extra words beyond the specified title.`;

const STYLES = {
  // A: the reference deck's look, dialled for an older audience
  warm: `${COMMON}
Style: warm hand-painted casual-game illustration. Soft rounded 3D lettering with a
thick cream outline and a gentle drop shadow. Sunlit pastel palette - cream, sage
green, warm coral, sky blue. Generous negative space, uncluttered, calm. The character
is a cheerful, dignified older adult, expressive and kind, never cartoonishly infantile.
High contrast between the title text and the background behind it so it stays readable.`,

  // B: flatter, more graphic, cleaner on a slide
  storybook: `${COMMON}
Style: modern flat storybook illustration with a subtle paper grain. Chunky geometric
sans-serif title in a solid colour block with a crisp offset shadow, no bevel. Limited
palette of five confident colours. Clean shapes, minimal detail, strong silhouette. The
character is a warm older adult drawn with simple confident lines. Reads clearly even
when shrunk to a small tile.`,

  // C: closest to the portfolio reference - glossy and high-energy
  glossy: `${COMMON}
Style: polished 3D casual-mobile art, glossy and vibrant, in the style of a top-grossing
puzzle game store listing. Beveled extruded title lettering with a gold rim and a bright
inner glow. Saturated candy palette, volumetric light rays, soft bokeh sparkle. Rendered
character with big friendly eyes - a warm older adult. Rich but never visually noisy.`,
};

// --- Games -------------------------------------------------------------------
const GAMES = {
  'remember-match':       { title: 'Remember Match',      scene: 'a grid of face-down picture cards with two flipped up showing matching cheerful symbols. Props: playing-card tiles.' },
  'shopping-list-recall': { title: 'Shopping List Recall', scene: 'the hero holding a paper shopping list beside a market stall. Props: bread, a milk bottle, apples, a wicker basket.' },
  'sequence-repeat':      { title: 'Sequence Repeat',     scene: 'four large glowing coloured pads lighting up in order. Props: colour buttons, musical notes.' },
  'picture-postcard':     { title: 'Picture Postcard',    scene: 'the hero at a village post office holding a scenic postcard. Props: stamps, envelopes, a red post box.' },
  'train-yard':           { title: 'Train Yard',          scene: 'a friendly steam train being assembled on branching tracks. Props: carriages, signal lamps, a station clock.' },
  'market-memory':        { title: 'Market Memory',       scene: 'a bustling fruit and vegetable market stall with a basket being filled. Props: tomatoes, bananas, a woven basket.' },
  'spot-focus':           { title: 'Spot Focus',          scene: 'the hero pointing at the one odd item in a busy but tidy scene. Props: a magnifying glass, a wooden signboard.' },
  'word-search':          { title: 'Word Search',         scene: 'a large letter grid with one word ringed in a bright colour. Props: a pencil, letter tiles.' },
  'focus-filter':         { title: 'Focus Filter',        scene: 'one clear item in sharp focus while distractions blur around it. Props: a funnel, sorted shapes.' },
  'garden-keeper':        { title: 'Garden Keeper',       scene: 'the hero watering a flower bed and spotting one wilting bloom. Props: a watering can, sunflowers, a trowel.' },
  'morning-routine-quest':{ title: 'Morning Routine',     scene: 'a sunny bedroom with the morning steps laid out in order. Props: a toothbrush, a kettle, slippers, an alarm clock.' },
  'recipe-builder':       { title: 'Recipe Builder',      scene: 'the hero cooking at a kitchen counter following ordered steps. Props: a mixing bowl, a wooden spoon, vegetables.' },
  'garden-sequencer':     { title: 'Garden Sequencer',    scene: 'planting steps in sequence - seed, sprout, flower - along a garden bed. Props: a seed packet, a sprouting pot.' },
  'serve-guests':         { title: 'Serve the Guests',    scene: 'the hero carrying a tray to a table of happy seated guests. Props: teacups, a teapot, a cake stand.' },
  'clear-the-way':        { title: 'Clear the Way',       scene: 'a bright aquarium where fish are guided along a clear path. Props: colourful fish, coral, bubbles.' },
};

function buildPrompt(style, game) {
  return `${STYLES[style]}

Subject: ${game.scene}

The title text must read exactly "${game.title}" - spelled precisely, correctly kerned,
every letter well formed, and no other text anywhere in the image.`;
}

async function generate(prompt, label) {
  const res = await fetch('https://api.openai.com/v1/images/generations', {
    method: 'POST',
    headers: { Authorization: `Bearer ${KEY}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ model: MODEL, prompt, size: SIZE, quality: 'high', n: 1 }),
  });
  const json = await res.json();
  if (json.error) throw new Error(`${label}: ${json.error.message}`);
  const d = json.data[0];
  const buf = d.b64_json
    ? Buffer.from(d.b64_json, 'base64')
    : Buffer.from(await (await fetch(d.url)).arrayBuffer());
  const file = path.join(OUT, `${label}.png`);
  fs.writeFileSync(file, buf);
  console.log(`  wrote ${label}.png (${(buf.length / 1024).toFixed(0)} KB)`);
  return file;
}

const [mode, ...rest] = process.argv.slice(2);

if (mode === 'stylelock') {
  const game = GAMES['remember-match'];
  console.log('Style lock on Remember Match, three directions:');
  await Promise.all(
    Object.keys(STYLES).map((s) =>
      generate(buildPrompt(s, game), `stylelock-${s}`).catch((e) => console.log('  FAILED ' + e.message)),
    ),
  );
} else if (mode === 'batch') {
  const [style, ...ids] = rest;
  if (!STYLES[style]) throw new Error(`unknown style "${style}" - pick one of ${Object.keys(STYLES).join(', ')}`);
  const targets = ids.length ? ids : Object.keys(GAMES);
  console.log(`Batch in style "${style}": ${targets.length} cards`);
  for (const id of targets) {
    if (!GAMES[id]) { console.log(`  skip unknown game ${id}`); continue; }
    await generate(buildPrompt(style, GAMES[id]), `${id}-${style}`).catch((e) => console.log('  FAILED ' + e.message));
  }
} else if (mode === 'prompts') {
  // Writes every prompt to a markdown file for pasting into ChatGPT by hand,
  // for when the API account cannot be billed.
  const style = rest[0] || 'warm';
  if (!STYLES[style]) throw new Error(`unknown style "${style}" - pick one of ${Object.keys(STYLES).join(', ')}`);
  const lines = [
    `# Game title card prompts - style: ${style}`,
    '',
    `Paste each block into ChatGPT and ask for a ${SIZE} portrait image.`,
    `Save the result as \`design/game-titles/out/<game-id>-${style}.png\`.`,
    '',
    '## Style lock (do this one first)',
    '',
    'Generate the three blocks below, pick the direction you like, then use that',
    'style for all fifteen. The style paragraph is identical in every prompt, which',
    'is what keeps the set looking like one family.',
    '',
  ];
  for (const s of Object.keys(STYLES)) {
    lines.push(`### Direction: ${s}`, '', '```', buildPrompt(s, GAMES['remember-match']), '```', '');
  }
  lines.push('## All fifteen cards', '');
  for (const [id, game] of Object.entries(GAMES)) {
    lines.push(`### ${game.title}  \`${id}-${style}.png\``, '', '```', buildPrompt(style, game), '```', '');
  }
  const file = path.join(HERE, `prompts-${style}.md`);
  fs.writeFileSync(file, lines.join('\n'), 'utf8');
  console.log(`wrote ${path.relative(ROOT, file)}`);
} else {
  console.log('usage: generate.mjs stylelock | batch <style> [gameId ...] | prompts [style]');
}
