import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_SKILLS, SKILLS, DOMAIN_KEY, skillsFor } from '../gameSkills';
import { getGame, marqueeGames } from '../gameCatalog';

const LOCALES = ['en', 'hi', 'kn'] as const;
const strings = (lng: string): Record<string, string> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/locales', lng, 'common.json'), 'utf8'));

describe('gameSkills', () => {
  it('covers every game in the daily rotation', () => {
    for (const g of marqueeGames()) expect(GAME_SKILLS[g.id], g.id).toBeDefined();
  });

  it('maps only games that exist, in their own category', () => {
    for (const [id, g] of Object.entries(GAME_SKILLS)) {
      expect(getGame(id)?.category, id).toBe(g.category);
    }
  });

  it('matches the Format doc: primary skill first, then the secondaries', () => {
    expect(skillsFor('market-memory')).toEqual(['recall', 'recognition', 'retention', 'association']);
    expect(skillsFor('train-yard')).toEqual(['sequences', 'recall', 'patterns']);
    expect(skillsFor('spot-focus')).toEqual(['selectiveAttention', 'responseTime']);
    expect(skillsFor('garden-keeper')).toEqual(['selectiveAttention', 'accuracy']);
    expect(skillsFor('serve-guests')).toEqual(['planning', 'decisionMaking', 'sequencing']);
    expect(skillsFor('clear-the-way')).toEqual(['problemSolving', 'planning', 'cognitiveFlexibility']);
    expect(skillsFor('word-search')).toEqual(['sustainedAttention', 'concentration']);
  });

  it('only names skills from the same domain as the game', () => {
    for (const [id, g] of Object.entries(GAME_SKILLS)) {
      for (const skill of [g.primary, ...g.secondary]) {
        expect(SKILLS[skill].category, `${id} / ${skill}`).toBe(g.category);
      }
    }
  });

  it('has a tile on disk for every skill', () => {
    for (const [id, skill] of Object.entries(SKILLS)) {
      expect(existsSync(join(process.cwd(), 'public', skill.icon)), id).toBe(true);
    }
  });

  it('returns no skills for a game the Format doc does not map', () => {
    expect(skillsFor('focus-filter')).toEqual([]);
  });

  it.each(LOCALES)('has every skill name, line and domain heading in %s', (lng) => {
    const s = strings(lng);
    for (const skill of Object.values(SKILLS)) {
      expect(s[skill.nameKey], `${lng} ${skill.nameKey}`).toBeTruthy();
      expect(s[skill.lineKey], `${lng} ${skill.lineKey}`).toBeTruthy();
    }
    for (const key of Object.values(DOMAIN_KEY)) {
      expect(s[key], `${lng} ${key}`).toBeTruthy();
    }
  });
});
