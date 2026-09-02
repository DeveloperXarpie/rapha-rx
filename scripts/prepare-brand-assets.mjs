/**
 * Regenerates every public/ derivative of the app-flow-redesign art from the
 * committed sources in assets-src/. Idempotent - safe to re-run.
 *
 * Splash art is the reason this script exists rather than a plain copy. The
 * sources are 540x960 and 1080x1920 PNGs at 1-4 MB each; six of those is a ~7 MB
 * payload on care-home wifi the app already assumes is usually offline. WebP at
 * 540x960 lands around a tenth of that with no visible loss at the size the
 * screens actually render.
 */
import { mkdir, copyFile, readdir } from 'node:fs/promises';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import sharp from 'sharp';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const SRC = join(ROOT, 'assets-src', 'app-flow-redesign');
const OUT = join(ROOT, 'public');

const SPLASH_WIDTH = 540;
const SPLASH_HEIGHT = 960;
const SPLASH_QUALITY = 82;

/** Copied as-is: already web-sized, and PNG transparency is load-bearing. */
const COPY = [
  ['brand/logo-launch.png', 'brand/logo-launch.png'],
  ['brand/logo-navy.png', 'brand/logo-navy.png'],
  ['brand/logo-onblue.png', 'brand/logo-onblue.png'],
  ['brand/tree-glyph.png', 'brand/tree-glyph.png'],
  ['brand/leaf.png', 'brand/leaf.png'],
  ['category/ic-memory.png', 'category/ic-memory.png'],
  ['category/ic-attention.png', 'category/ic-attention.png'],
  ['category/ic-planning.png', 'category/ic-planning.png'],
  ['games/game-shopping.png', 'games/tile-shopping.png'],
  ['games/game-station.png', 'games/tile-station.png'],
  ['games/game-spot.png', 'games/tile-spot.png'],
  ['games/game-garden.png', 'games/tile-garden.png'],
  ['games/game-tiffen.png', 'games/tile-tiffen.png'],
  ['games/game-freeme.png', 'games/tile-freeme.png'],
];

/** Downscaled and re-encoded to WebP. */
const SPLASH = [
  ['games/splash-shopping.png', 'games/splash-shopping.webp'],
  ['games/splash-spot.png', 'games/splash-spot.webp'],
  ['games/splash-tiffen.png', 'games/splash-tiffen.webp'],
  ['games/GameSplashscreen_StationMaster.png', 'games/splash-station.webp'],
  ['games/GameSplashscreen_GardenKeeper.png', 'games/splash-garden.webp'],
  ['games/GameSplashscreen_FreeMe.png', 'games/splash-freeme.webp'],
];

async function ensureDirs() {
  for (const d of ['brand', 'category', 'games']) {
    await mkdir(join(OUT, d), { recursive: true });
  }
}

async function run() {
  await ensureDirs();

  for (const [from, to] of COPY) {
    await copyFile(join(SRC, from), join(OUT, to));
    console.log(`copy  ${to}`);
  }

  for (const [from, to] of SPLASH) {
    const info = await sharp(join(SRC, from))
      .resize(SPLASH_WIDTH, SPLASH_HEIGHT, { fit: 'cover' })
      .webp({ quality: SPLASH_QUALITY })
      .toFile(join(OUT, to));
    console.log(`webp  ${to}  ${(info.size / 1024).toFixed(0)} KB`);
  }

  const written = await readdir(join(OUT, 'games'));
  const missing = [...COPY, ...SPLASH]
    .map(([, to]) => to)
    .filter((p) => p.startsWith('games/'))
    .filter((p) => !written.includes(p.slice('games/'.length)));
  if (missing.length) {
    console.error('missing outputs:', missing);
    process.exit(1);
  }
}

run().catch((err) => {
  console.error(err);
  process.exit(1);
});
