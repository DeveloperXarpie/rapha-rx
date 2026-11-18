import { describe, it, expect } from 'vitest';
import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_SKILLS, SCORED_SKILLS, SKILLS, DOMAIN_KEY, skillsFor } from '../gameSkills';
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

  // The session games follow FINAL_SPEC 7.1 (D24: the owner fixed these two skills per
  // game); the rest keep the Format doc's mapping until they are specified.
  it('matches FINAL_SPEC 7.1 for the session games', () => {
    expect(skillsFor('market-memory')).toEqual(['recall', 'retention']);
    expect(skillsFor('train-yard')).toEqual(['sequences', 'association']);
    expect(skillsFor('spot-focus')).toEqual(['selectiveAttention', 'responseTime']);
    expect(skillsFor('serve-guests')).toEqual(['sequencing', 'decisionMaking']);
    expect(skillsFor('clear-the-way')).toEqual(['planning', 'problemSolving']);
    for (const id of Object.keys(SCORED_SKILLS)) expect(skillsFor(id), id).toEqual(SCORED_SKILLS[id]);
  });

  it('keeps the Format doc mapping for the games outside the session', () => {
    expect(skillsFor('garden-keeper')).toEqual(['selectiveAttention', 'accuracy']);
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
