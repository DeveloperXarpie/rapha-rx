import 'fake-indexeddb/auto';
import { describe, it, expect, beforeEach } from 'vitest';
import { appDb } from '../db';
import { recordLastLevel, getLastLevels } from '../lastLevel';

const USER = 'u1';

describe('lastLevel', () => {
  beforeEach(async () => {
    await appDb.gameProgress.clear();
  });

  it('returns nothing for a user who has never played', async () => {
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({});
  });

  it('records and reads back a level', async () => {
    await recordLastLevel(USER, 'market-memory', 7);
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({ 'market-memory': 7 });
  });

  it('overwrites rather than appending, so one row per user and game', async () => {
    await recordLastLevel(USER, 'market-memory', 3);
    await recordLastLevel(USER, 'market-memory', 9);
    expect(await getLastLevels(USER, ['market-memory'])).toEqual({ 'market-memory': 9 });
    const rows = await appDb.gameProgress
      .where('[userId+gameId]').equals([USER, 'market-memory']).toArray();
    expect(rows).toHaveLength(1);
  });

  it('omits games with no level and keeps the ones that have it', async () => {
    await recordLastLevel(USER, 'spot-focus', 4);
    const got = await getLastLevels(USER, ['spot-focus', 'serve-guests']);
    expect(got).toEqual({ 'spot-focus': 4 });
  });

  it('does not leak another user rows', async () => {
    await recordLastLevel('other', 'spot-focus', 5);
    expect(await getLastLevels(USER, ['spot-focus'])).toEqual({});
  });

  it('preserves an existing progress row rather than replacing it', async () => {
    await appDb.gameProgress.add({
      userId: USER, gameId: 'train-yard', currentLevelId: 'level_3',
      consecutiveCompletions: 4, consecutiveIncompletes: 1, hasBeenPromptedForLevel: true,
    });
    await recordLastLevel(USER, 'train-yard', 6);
    const row = await appDb.gameProgress
      .where('[userId+gameId]').equals([USER, 'train-yard']).first();
    expect(row!.currentLevelId).toBe('level_3');
    expect(row!.consecutiveCompletions).toBe(4);
    expect(row!.lastLevel).toBe(6);
  });
});
