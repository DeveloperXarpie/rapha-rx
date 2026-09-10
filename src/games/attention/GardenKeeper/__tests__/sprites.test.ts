import { describe, it, expect } from 'vitest';
import { FLOWER_SPECIES } from '../palette';
import {
  ALL_SPRITE_URLS, FURNITURE_URLS, SPROUT_URL, bloomUrl, spriteUrl, spriteUrlsFor, wiltedUrl,
} from '../sprites';

/**
 * The set of sprites that actually exist on disk.
 *
 * Enumerated with Vite's own glob rather than node:fs: `tsconfig.app.json` restricts
 * ambient types to `vite/client` precisely so app code cannot reach for Node APIs, and
 * widening that for one test would be the wrong trade.
 */
const ON_DISK = new Set(
  Object.keys(import.meta.glob('/public/garden-assets/*.{png,jpg}')).map((p) => p.replace('/public', '')),
);

describe('sprite catalogue', () => {
  it('resolves every catalogued URL to a file that actually exists', () => {
    // The single failure this catches is the one that matters: a rename in the slicing
    // script that silently leaves the board painting broken images.
    for (const url of ALL_SPRITE_URLS) {
      expect(ON_DISK.has(url), `missing sprite: ${url}`).toBe(true);
    }
  });

  it('covers all ten species in both states, plus the sprout', () => {
    expect(ALL_SPRITE_URLS).toHaveLength(FLOWER_SPECIES.length * 2 + 1);
    expect(ALL_SPRITE_URLS).toContain(SPROUT_URL);
    for (const s of FLOWER_SPECIES) {
      expect(ALL_SPRITE_URLS).toContain(bloomUrl(s));
      expect(ALL_SPRITE_URLS).toContain(wiltedUrl(s));
    }
  });
});

describe('spriteUrl', () => {
  it('shows a bare sprout while dormant, whatever the species', () => {
    expect(spriteUrl('flower', 'rose', 'seed')).toBe(SPROUT_URL);
    expect(spriteUrl('flower', 'peony', 'seed')).toBe(SPROUT_URL);
  });

  it('shows the species in bloom while it is waterable', () => {
    expect(spriteUrl('flower', 'rose', 'sprouted')).toBe('/garden-assets/rose-bloom.png');
  });

  it('keeps a watered flower in bloom, not back at a sprout', () => {
    // Watering extends the flower's life. Dropping it to the sprout bitmap would show
    // the player their correct tap undoing itself.
    expect(spriteUrl('flower', 'rose', 'thriving')).toBe('/garden-assets/rose-bloom.png');
  });

  it('shows the species wilted once its window closed', () => {
    expect(spriteUrl('flower', 'rose', 'dried')).toBe('/garden-assets/rose-wilted.png');
  });

  it('always shows a distractor wilted, whatever stage it is nominally in', () => {
    // Distractors never cycle, so no stage of theirs may ever produce a bloom - that
    // would present an untappable plant as a target and cost the player a heart.
    for (const stage of ['seed', 'sprouted', 'thriving', 'dried'] as const) {
      expect(spriteUrl('wilted', 'daisy', stage)).toBe('/garden-assets/daisy-wilted.png');
    }
  });
});

describe('spriteUrlsFor', () => {
  it('never builds a sprite URL for a pest', () => {
    // Pests are CSS primitives; `bee-wilted.png` does not exist. Preloading one would
    // fire a 404 and, worse, hold the round start on a file that can never arrive.
    const urls = spriteUrlsFor([
      { kind: 'flower', species: 'rose' },
      { kind: 'weed', species: 'weedA' },
      { kind: 'insect', species: 'bee' },
      { kind: 'poison', species: 'mushroom' },
    ]);
    for (const url of urls) expect(ON_DISK).toContain(url);
    for (const url of urls) {
      expect(url).not.toMatch(/weedA|bee|mushroom/);
    }
  });

  it('preloads only what the bed can show', () => {
    const urls = spriteUrlsFor([
      { kind: 'flower', species: 'rose' },
      { kind: 'wilted', species: 'lily' },
    ]);
    expect(urls).toContain(SPROUT_URL);
    expect(urls).toContain('/garden-assets/rose-bloom.png');
    expect(urls).toContain('/garden-assets/rose-wilted.png');
    expect(urls).toContain('/garden-assets/lily-wilted.png');
    // A distractor never blooms, so its bloom bitmap is dead weight at load time.
    expect(urls).not.toContain('/garden-assets/lily-bloom.png');
  });

  it('deduplicates repeated species', () => {
    const urls = spriteUrlsFor([
      { kind: 'flower', species: 'rose' },
      { kind: 'flower', species: 'rose' },
    ]);
    expect(new Set(urls).size).toBe(urls.length);
  });

  it('resolves everything it returns to a real file', () => {
    const urls = spriteUrlsFor(FLOWER_SPECIES.map((species) => ({ kind: 'flower' as const, species })));
    for (const url of urls) expect(ON_DISK.has(url), `missing sprite: ${url}`).toBe(true);
  });
});

describe('board furniture', () => {
  it('resolves every furniture URL to a file that actually exists', () => {
    for (const url of FURNITURE_URLS) {
      expect(ON_DISK.has(url), `missing furniture: ${url}`).toBe(true);
    }
  });

  it('preloads the furniture alongside the bed, so the board cannot paint half-dressed', () => {
    const urls = spriteUrlsFor([{ kind: 'flower', species: 'rose' }]);
    for (const url of FURNITURE_URLS) expect(urls).toContain(url);
  });
});
