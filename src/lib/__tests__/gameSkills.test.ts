import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { GAME_SKILLS, SKILLS, DOMAIN_KEY, skillsFor } from '../gameSkills';
import { marqueeGames } from '../gameCatalog';

const LOCALES = ['en', 'hi', 'kn'] as const;
const strings = (lng: string): Record<string, string> =>
  JSON.parse(readFileSync(join(process.cwd(), 'public/locales', lng, 'common.json'), 'utf8'));

describe('gameSkills', () => {
  it('covers exactly the six games in the daily rotation', () => {
    expect(Object.keys(GAME_SKILLS).sort())
      .toEqual(marqueeGames().map((g) => g.id).sort());
  });

  it('matches the Format doc: primary skill first, then the secondaries', () => {
    expect(skillsFor('market-memory')).toEqual(['recall', 'recognition', 'retention', 'association']);
    expect(skillsFor('train-yard')).toEqual(['sequences', 'recall', 'patterns']);
    expect(skillsFor('spot-focus')).toEqual(['selectiveAttention', 'responseTime']);
    expect(skillsFor('garden-keeper')).toEqual(['selectiveAttention', 'accuracy']);
    expect(skillsFor('serve-guests')).toEqual(['planning', 'decisionMaking', 'sequencing']);
    expect(skillsFor('clear-the-way')).toEqual(['problemSolving', 'planning', 'cognitiveFlexibility']);
  });

  it('only names skills from the same domain as the game', () => {
    for (const [id, g] of Object.entries(GAME_SKILLS)) {
      for (const skill of [g.primary, ...g.secondary]) {
        expect(SKILLS[skill].category, `${id} / ${skill}`).toBe(g.category);
      }
    }
  });

  it('returns no skills for a game outside the rotation', () => {
    expect(skillsFor('word-search')).toEqual([]);
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
