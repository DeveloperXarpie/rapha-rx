import { describe, it, expect } from 'vitest';
import { skillScores } from '../measures';

const r = (metrics: Record<string, unknown>) => ({ metrics });

describe('skillScores (FINAL_SPEC 7.1, measure only)', () => {
  it('scores nothing without rounds', () => expect(skillScores('market-memory', [])).toEqual({}));

  it('Shopping List: pooled recall, and retention from second trips capped at 100', () => {
    expect(skillScores('market-memory', [
      r({ correct: 3, listLength: 4 }), r({ correct: 2, listLength: 4 }),
      r({ secondTrip: true, retention: 140, correct: 9, listLength: 9 }),
    ])).toEqual({ recall: 63, retention: 100 });
  });

  it('Shopping List: no retention without a second trip', () =>
    expect(skillScores('market-memory', [r({ correct: 4, listLength: 4 })])).toEqual({ recall: 100 }));

  it('Station Master: association from first tries; no sequence data yet', () =>
    expect(skillScores('train-yard', [r({ firstTryCorrect: 3, totalTrains: 4 }), r({ firstTryCorrect: 2, totalTrains: 4 })]))
      .toEqual({ association: 63 }));

  it('Spot Focus: found share and response speed from find gaps', () => {
    expect(skillScores('spot-focus', [
      r({ differencesFound: 3, totalDifferences: 4, findTimesMs: [1000, 3000, 4000] }),
    ])).toEqual({ selectiveAttention: 75, responseTime: 100 });
    // gaps 11000 ms -> halfway between 2 s (100) and 20 s (0)
    expect(skillScores('spot-focus', [r({ differencesFound: 1, totalDifferences: 1, findTimesMs: [11000] })]).responseTime)
      .toBe(50);
  });

  it('Spot Focus: no response speed without a find', () =>
    expect(skillScores('spot-focus', [r({ differencesFound: 0, totalDifferences: 3, findTimesMs: [] })]))
      .toEqual({ selectiveAttention: 0 }));

  it('Tiffin: sequencing and decision-making, omitted when there was nothing to judge', () => {
    expect(skillScores('serve-guests', [r({ ordersInOrder: 1, ordersMultiDish: 2, urgentChoices: 3, choiceOpportunities: 4 })]))
      .toEqual({ sequencing: 50, decisionMaking: 75 });
    expect(skillScores('serve-guests', [r({ ordersInOrder: 0, ordersMultiDish: 0, urgentChoices: 0, choiceOpportunities: 0 })]))
      .toEqual({});
  });

  it('Free Me: planning efficiency and solving without help', () =>
    expect(skillScores('clear-the-way', [
      r({ minMoves: 4, movesUsed: 4, hintsUsed: 0, resets: 0 }),
      r({ minMoves: 4, movesUsed: 8, hintsUsed: 1, resets: 0 }),
    ])).toEqual({ planning: 75, problemSolving: 50 }));

  it('scores nothing for a game outside the session', () =>
    expect(skillScores('garden-keeper', [r({ watered: 9 })])).toEqual({}));
});

describe('review cases', () => {
  it('skips a second trip whose retention could not be scored', () =>
    expect(skillScores('market-memory', [r({ secondTrip: true, retention: null, correct: 0, listLength: 3 })]))
      .toEqual({}));

  it('takes find gaps within each round before pooling rounds', () =>
    // round 1 gaps 1000, 1000; round 2 gap 5000 -> median 1000 -> 100. Concatenating the
    // raw times would give a negative gap and a wrong median.
    expect(skillScores('spot-focus', [
      r({ differencesFound: 2, totalDifferences: 2, findTimesMs: [1000, 2000] }),
      r({ differencesFound: 1, totalDifferences: 1, findTimesMs: [5000] }),
    ]).responseTime).toBe(100));
});
