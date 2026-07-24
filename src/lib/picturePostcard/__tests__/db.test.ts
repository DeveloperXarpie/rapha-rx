import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  appDb, getPpEngine, putPpEngine, getPpPair, putPpPair, getPpPairsForUser,
} from '../../db';
import type { PpEngineRow } from '../../db';

function freshRow(userId: string): PpEngineRow {
  return {
    userId, currentLevel: 1, di: 0, countedTrialsInLevel: 0, correctCountedInLevel: 0,
    trialHistory: [], starsByLevel: {}, consecutiveCorrect: 0, consecutiveErrors: 0,
    streak: 0, frustrationGuardUsedInLevel: 0, sessionStamp: null, trialsThisSession: 0,
    prevSessionTrials: 0, scenesThisSession: [], tipCardL41Shown: false,
    lastPlayedDate: '2026-07-24', updatedAt: 1,
  };
}

describe('pp Dexie tables', () => {
  it('ppEngine put is an atomic upsert keyed by userId', async () => {
    await putPpEngine(freshRow('u1'));
    await putPpEngine({ ...freshRow('u1'), currentLevel: 7 });
    const row = await getPpEngine('u1');
    expect(row?.currentLevel).toBe(7);
    expect(await appDb.ppEngine.count()).toBe(1);
  });
  it('ppPairHistory round-trips and scopes by user', async () => {
    await putPpPair('u1', 'park', 4, '2026-07-01');
    await putPpPair('u1', 'park', 4, '2026-07-20'); // overwrite
    await putPpPair('u2', 'park', 4, '2026-07-05');
    expect((await getPpPair('u1', 'park', 4))?.lastUsedDate).toBe('2026-07-20');
    expect(await getPpPairsForUser('u1')).toHaveLength(1);
  });
});
