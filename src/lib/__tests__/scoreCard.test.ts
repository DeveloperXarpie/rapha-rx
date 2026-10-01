import { describe, it, expect } from 'vitest';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import {
  getScoreCard, mainWordKey, comparisonKey, MAIN_WORDS, COMPARISON_KEYS,
} from '../scoreCard';

describe('getScoreCard', () => {
  it('is an empty placeholder until the scoring system exists', () => {
    expect(getScoreCard('market-memory')).toEqual({ primary: null, previous: null, bestSkill: null });
  });
});

describe('mainWordKey', () => {
  it.each([
    [100, 'scoreCard.word.excellent'],
    [90, 'scoreCard.word.excellent'],
    [89, 'scoreCard.word.doingGreat'],
    [75, 'scoreCard.word.doingGreat'],
    [74, 'scoreCard.word.goodWork'],
    [60, 'scoreCard.word.goodWork'],
    [59, 'scoreCard.word.niceEffort'],
    [40, 'scoreCard.word.niceEffort'],
    [39, 'scoreCard.word.keepPractising'],
    [0, 'scoreCard.word.keepPractising'],
  ])('maps %i to %s', (score, key) => {
    expect(mainWordKey(score)).toBe(key);
  });

  it('shows nothing when there is no score', () => {
    expect(mainWordKey(null)).toBeNull();
  });
});

describe('comparisonKey', () => {
  it('shows nothing when there is no score this time', () => {
    expect(comparisonKey(null, 70)).toBeNull();
  });

  it('calls a first game a lovely start', () => {
    expect(comparisonKey(70, null)).toBe(COMPARISON_KEYS.first);
  });

  it('uses the doc thresholds: 3 or more is a change, within 2 is steady', () => {
    expect(comparisonKey(73, 70)).toBe(COMPARISON_KEYS.better);
    expect(comparisonKey(72, 70)).toBe(COMPARISON_KEYS.steady);
    expect(comparisonKey(68, 70)).toBe(COMPARISON_KEYS.steady);
    expect(comparisonKey(67, 70)).toBe(COMPARISON_KEYS.lower);
  });
});

describe('score card copy', () => {
  it.each(['en', 'hi', 'kn'])('has every key in %s', (lng) => {
    const s: Record<string, string> = JSON.parse(
      readFileSync(join(process.cwd(), 'public/locales', lng, 'common.json'), 'utf8'),
    );
    const keys = [
      ...MAIN_WORDS.map((w) => w.key),
      ...Object.values(COMPARISON_KEYS),
      'scoreCard.title', 'scoreCard.bestSkill', 'scoreCard.thanks',
      'gameIntro.improves',
    ];
    for (const key of keys) expect(s[key], `${lng} ${key}`).toBeTruthy();
  });
});
