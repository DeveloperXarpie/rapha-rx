import { describe, it, expect } from 'vitest';
import { existsSync } from 'node:fs';
import { join } from 'node:path';
import {
  GAME_CATALOG, getGame, marqueeGames, marqueeByCategory, categoryIcon,
} from '../gameCatalog';

const PUBLIC = join(process.cwd(), 'public');
const asFile = (webPath: string) => join(PUBLIC, webPath.replace(/^\//, ''));

describe('gameCatalog', () => {
  it('names exactly the six marquee games from the spec', () => {
    expect(marqueeGames().map((g) => g.id).sort()).toEqual([
      'clear-the-way', 'garden-keeper', 'market-memory',
      'serve-guests', 'spot-focus', 'train-yard',
    ]);
  });

  it('gives each category exactly two marquee games', () => {
    expect(marqueeByCategory('memory').map((g) => g.id)).toEqual(['market-memory', 'train-yard']);
    expect(marqueeByCategory('attention').map((g) => g.id)).toEqual(['spot-focus', 'garden-keeper']);
    expect(marqueeByCategory('executive').map((g) => g.id)).toEqual(['serve-guests', 'clear-the-way']);
  });

  it('gives every marquee game both a tile and a splash', () => {
    for (const g of marqueeGames()) {
      expect(g.tile, `${g.id} tile`).toBeTruthy();
      expect(g.splash, `${g.id} splash`).toBeTruthy();
    }
  });

  it('gives every non-marquee game no art, so the grid falls back to the category icon', () => {
    const rest = Object.values(GAME_CATALOG).filter((g) => !g.marquee);
    expect(rest.length).toBeGreaterThan(0);
    for (const g of rest) {
      expect(g.tile, `${g.id} tile`).toBeNull();
      expect(g.splash, `${g.id} splash`).toBeNull();
    }
  });

  it('points every art path at a file that actually exists', () => {
    for (const g of marqueeGames()) {
      expect(existsSync(asFile(g.tile!)), `missing ${g.tile}`).toBe(true);
      expect(existsSync(asFile(g.splash!)), `missing ${g.splash}`).toBe(true);
    }
    for (const c of ['memory', 'attention', 'executive'] as const) {
      expect(existsSync(asFile(categoryIcon(c))), `missing icon for ${c}`).toBe(true);
    }
  });

  it('uses a translation key for every display name, never a literal', () => {
    for (const g of Object.values(GAME_CATALOG)) {
      expect(g.nameKey, `${g.id} nameKey`).toMatch(/^game\.[a-z0-9-]+\.name$/);
    }
  });

  it('resolves a known game and returns undefined for an unknown one', () => {
    expect(getGame('market-memory')?.category).toBe('memory');
    expect(getGame('no-such-game')).toBeUndefined();
  });
});
