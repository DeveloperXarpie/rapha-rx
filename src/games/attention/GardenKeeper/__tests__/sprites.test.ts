import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { resolve } from 'node:path';
import { FLOWER_SPECIES } from '../palette';
import { ALL_SPRITE_URLS, SPROUT_URL, bloomUrl, spriteUrl, spriteUrlsFor, wiltedUrl } from '../sprites';

/** A sprite URL is served from public/, so it maps to public/<path> on disk. */
function onDisk(url: string): string {
  return resolve(__dirname, '../../../../../public', url.replace(/^\//, ''));
}

describe('sprite catalogue', () => {
  it('resolves every catalogued URL to a file that actually exists', () => {
    // The single failure this catches is the one that matters: a rename in the slicing
    // script that silently leaves the board painting broken images.
    for (const url of ALL_SPRITE_URLS) {
      expect(existsSync(onDisk(url)), `missing sprite: ${url}`).toBe(true);
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

  it('shows the species wilted once its window closed', () => {
    expect(spriteUrl('flower', 'rose', 'dried')).toBe('/garden-assets/rose-wilted.png');
  });

  it('always shows a distractor wilted, whatever stage it is nominally in', () => {
    // Distractors never cycle, so no stage of theirs may ever produce a bloom - that
    // would present an untappable plant as a target and cost the player a heart.
    for (const stage of ['seed', 'sprouted', 'dried'] as const) {
      expect(spriteUrl('wilted', 'daisy', stage)).toBe('/garden-assets/daisy-wilted.png');
    }
  });
});

describe('spriteUrlsFor', () => {
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
    for (const url of urls) expect(existsSync(onDisk(url)), `missing sprite: ${url}`).toBe(true);
  });
});
