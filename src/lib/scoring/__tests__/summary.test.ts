import { describe, it, expect } from 'vitest';
import { skillBand, headlineKey, ringChange, categorySummary, scoreCardData, accoladeKey, historyMetrics } from '../summary';
import type { RoundRecord } from '../../db';

const round = (gameId: string, metrics: Record<string, unknown>, at = 0): RoundRecord =>
  ({ userId: 'u', date: '2026-11-19', category: 'memory', gameId, at, metrics });

describe('skillBand (5 levels, FINAL_SPEC 7.2)', () => {
  it('uses the framework bands', () => {
    expect([0, 39, 40, 59, 60, 74, 75, 89, 90, 100].map(skillBand)).toEqual([1, 1, 2, 2, 3, 3, 4, 4, 5, 5]);
  });
});

describe('headlineKey (10 bands, FINAL_SPEC 7.2)', () => {
  it('maps each band edge', () => {
    expect(headlineKey(0)).toBe('summary.headline.0');
    expect(headlineKey(19)).toBe('summary.headline.0');
    expect(headlineKey(20)).toBe('summary.headline.20');
    expect(headlineKey(55)).toBe('summary.headline.50');
    expect(headlineKey(99)).toBe('summary.headline.90');
    expect(headlineKey(100)).toBe('summary.headline.100');
  });
});

describe('ringChange (D12, D13)', () => {
  it('reports the change and its direction', () => {
    expect(ringChange(72, 66)).toEqual({ delta: 6, dir: 'up' });
    expect(ringChange(58, 62)).toEqual({ delta: -4, dir: 'down' });
    expect(ringChange(58, 58)).toEqual({ delta: 0, dir: 'none' });
  });
  it('has nothing to compare on a first session', () => expect(ringChange(72, null)).toBeNull());
});

describe('categorySummary (D14)', () => {
  it('shows the skills of the games played, in play order, averaged', () => {
    const today = [
      round('train-yard', { firstTryCorrect: 3, totalTrains: 4 }, 1),
      round('market-memory', { correct: 2, listLength: 4 }, 2),
    ];
    const previous = [round('train-yard', { firstTryCorrect: 2, totalTrains: 4 })];
    const s = categorySummary(today, previous);
    expect(s.rings.map((r) => [r.skill, r.score])).toEqual([['association', 75], ['recall', 50]]);
    expect(s.rings[0].change).toEqual({ delta: 25, dir: 'up' });
    expect(s.rings[1].change).toBeNull();
    expect(s.average).toBe(63);
    expect(s.headlineKey).toBe('summary.headline.60');
  });
  it('is empty with no rounds', () =>
    expect(categorySummary([], [])).toEqual({ rings: [], average: null, headlineKey: null }));
});

describe('accoladeKey (six words, amends 2026-11-23)', () => {
  it('maps the average onto the five bands, with Champion! kept for a perfect game', () => {
    expect([0, 39, 40, 59, 60, 74, 75, 89, 90, 99, 100].map(accoladeKey)).toEqual([
      'scoreCard.accolade.1', 'scoreCard.accolade.1',
      'scoreCard.accolade.2', 'scoreCard.accolade.2',
      'scoreCard.accolade.3', 'scoreCard.accolade.3',
      'scoreCard.accolade.4', 'scoreCard.accolade.4',
      'scoreCard.accolade.5', 'scoreCard.accolade.5',
      'scoreCard.accolade.6',
    ]);
  });
  it('rounds the average first, as the summary does', () => {
    expect(accoladeKey(99.5)).toBe('scoreCard.accolade.6');
    expect(accoladeKey(89.4)).toBe('scoreCard.accolade.4');
  });
});

describe('scoreCardData (Mock 2, amends 2026-11-23)', () => {
  it('gives a card per scored skill with its band, and an accolade for the average', () => {
    const d = scoreCardData('train-yard', [round('train-yard', { firstTryCorrect: 3, totalTrains: 4 })]);
    expect(d.cards).toEqual([{ skill: 'association', score: 75, band: 4 }]);
    expect(d.accoladeKey).toBe('scoreCard.accolade.4');
  });
  it('averages both skills for the accolade', () => {
    const d = scoreCardData('market-memory', [round('market-memory', { correct: 7, listLength: 10 })]);
    expect(d.cards).toEqual([{ skill: 'recall', score: 70, band: 3 }]);
    expect(d.accoladeKey).toBe('scoreCard.accolade.3');
  });
  it('has no cards and no accolade for a game with no rounds', () =>
    expect(scoreCardData('spot-focus', [])).toEqual({ cards: [], accoladeKey: null }));
});

describe('historyMetrics (7.5, owner 2026-11-23)', () => {
  const on = (date: string, gameId: string, metrics: Record<string, unknown>): RoundRecord =>
    ({ ...round(gameId, metrics), date });

  it('scores each skill per session date, oldest first, null where not played', () => {
    const rounds = [
      on('2026-11-20', 'train-yard', { firstTryCorrect: 2, totalTrains: 4 }),
      on('2026-11-21', 'market-memory', { correct: 3, listLength: 4 }),
      on('2026-11-22', 'train-yard', { firstTryCorrect: 3, totalTrains: 4 }),
      on('2026-11-22', 'train-yard', { firstTryCorrect: 4, totalTrains: 4 }),
    ];
    expect(historyMetrics(rounds, ['association'])).toEqual({
      dates: ['2026-11-20', '2026-11-21', '2026-11-22'],
      rows: [{ skill: 'association', scores: [50, null, 88] }],
    });
  });

  it('keeps only the latest sessions', () => {
    const rounds = ['01', '02', '03', '04'].map((d) =>
      on(`2026-11-${d}`, 'train-yard', { firstTryCorrect: 1, totalTrains: 4 }));
    expect(historyMetrics(rounds, ['association'], 2).dates).toEqual(['2026-11-03', '2026-11-04']);
  });

  it('is empty with no rounds', () =>
    expect(historyMetrics([], ['association'])).toEqual({ dates: [], rows: [{ skill: 'association', scores: [] }] }));
});

import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { BAND_WORD_KEYS } from '../summary';

describe('scoring copy', () => {
  const keys = [
    ...Object.values(BAND_WORD_KEYS),
    ...[0, 20, 30, 40, 50, 60, 70, 80, 90, 100].map((n) => `summary.headline.${n}`),
    'summary.your.memory', 'summary.your.attention', 'summary.your.executive',
    'summary.performanceToday', 'summary.ofHundred', 'summary.sinceLast',
    'scoreCard.thanks', 'scoreCard.outOfFive',
    'summary.history.title', 'summary.history.subtitle', 'summary.history.today',
    'summary.history.firstTime', 'summary.history.notPlayed',
    ...[1, 2, 3, 4, 5, 6].map((n) => `scoreCard.accolade.${n}`),
  ];
  it.each(['en', 'hi', 'kn'])('has every key in %s', (lng) => {
    const strings = JSON.parse(readFileSync(join(process.cwd(), 'public/locales', lng, 'common.json'), 'utf8'));
    for (const k of keys) expect(strings[k], `${lng}: ${k}`).toBeTruthy();
  });
});
