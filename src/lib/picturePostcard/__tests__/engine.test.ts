import 'fake-indexeddb/auto';
import { describe, it, expect, vi, beforeEach } from 'vitest';

const setDocMock = vi.fn().mockResolvedValue(undefined);
const getDocMock = vi.fn().mockResolvedValue({ exists: () => false });
vi.mock('firebase/firestore', () => ({
  doc: vi.fn(() => 'docref'),
  setDoc: (...a: unknown[]) => setDocMock(...a),
  getDoc: (...a: unknown[]) => getDocMock(...a),
}));
vi.mock('../../firebase', () => ({ db: {} }));

import { loadEngine, commitTrial, markSceneUsed, hydrateFromFirestore } from '../engine';
import { getPpEngine, getPpPair, getDifficultyState, putPpEngine } from '../../db';
import { freshEngineRow } from '../engineCore';
import { todayISO } from '../../dates';

beforeEach(() => { setDocMock.mockClear(); getDocMock.mockClear(); });

describe('engine persistence', () => {
  it('loadEngine creates a fresh row and applies session start', async () => {
    const row = await loadEngine('u1', 12345);
    expect(row.currentLevel).toBe(1);
    expect(row.sessionStamp).toBe(12345);
    expect((await getPpEngine('u1'))?.sessionStamp).toBe(12345);
  });
  it('commitTrial persists engine row, derived DifficultyState, and pushes to Firestore', async () => {
    const row = await loadEngine('u2', 1);
    const { row: after } = await commitTrial(row, { correct: true, omission: false, kind: 'counted' });
    expect((await getPpEngine('u2'))?.trialsThisSession).toBe(after.trialsThisSession);
    const ds = await getDifficultyState('u2', 'picture-postcard', todayISO());
    expect(ds?.score).toBeCloseTo(after.currentLevel / 100);
    expect(setDocMock).toHaveBeenCalledTimes(1);
  });
  it('markSceneUsed records session scene and 30-day pair history', async () => {
    const row = await loadEngine('u3', 1);
    const after = await markSceneUsed(row, 'park', [1, 4]);
    expect(after.scenesThisSession).toContain('park');
    expect((await getPpPair('u3', 'park', 4))?.lastUsedDate).toBe(todayISO());
  });
  it('hydrateFromFirestore adopts a newer remote row only', async () => {
    await putPpEngine({ ...freshEngineRow('u4'), currentLevel: 3, updatedAt: 100 });
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...freshEngineRow('u4'), currentLevel: 9, updatedAt: 200, trialHistory: undefined }),
    });
    await hydrateFromFirestore('u4');
    const row = await getPpEngine('u4');
    expect(row?.currentLevel).toBe(9);
    expect(row?.trialHistory).toEqual([]);
    getDocMock.mockResolvedValueOnce({
      exists: () => true,
      data: () => ({ ...freshEngineRow('u4'), currentLevel: 1, updatedAt: 50 }),
    });
    await hydrateFromFirestore('u4');
    expect((await getPpEngine('u4'))?.currentLevel).toBe(9); // older remote ignored
  });
});
