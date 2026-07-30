import { doc, setDoc, getDoc } from 'firebase/firestore';
import { db } from '../firebase';
import {
  getPpEngine, putPpEngine, putPpPair, getDifficultyState, upsertDifficultyState,
} from '../db';
import type { PpEngineRow } from '../db';
import {
  freshEngineRow, beginSession, applyTrialResult,
} from './engineCore';
import type { TrialResultOpts, LevelOutcome } from './engineCore';
import { todayISO } from '../dates';

const GAME_ID = 'picture-postcard';

export async function loadEngine(userId: string, sessionStamp: number): Promise<PpEngineRow> {
  const existing = (await getPpEngine(userId)) ?? freshEngineRow(userId);
  const row = beginSession(existing, sessionStamp);
  if (row !== existing) await putPpEngine(row);
  return row;
}

async function writeDerivedDifficulty(row: PpEngineRow): Promise<void> {
  const date = todayISO();
  const prev = await getDifficultyState(row.userId, GAME_ID, date);
  const score = row.currentLevel / 100;
  await upsertDifficultyState({
    ...(prev?.id !== undefined ? { id: prev.id } : {}),
    userId: row.userId,
    gameId: GAME_ID,
    date,
    score,
    peakScore: Math.max(prev?.peakScore ?? 0, score),
    roundsPlayed: (prev?.roundsPlayed ?? 0) + 1,
  });
}

function pushToFirestore(row: PpEngineRow): void {
  const slim: Partial<PpEngineRow> = { ...row };
  delete slim.trialHistory;
  void (async () => {
    try {
      await setDoc(doc(db, 'ppEngine', row.userId), slim, { merge: true });
    } catch {
      // offline — acceptable, Dexie is the source of truth
    }
  })();
}

export async function commitTrial(
  row: PpEngineRow,
  opts: TrialResultOpts,
): Promise<{ row: PpEngineRow; levelOutcome: LevelOutcome | null }> {
  const result = applyTrialResult(row, opts);
  await putPpEngine(result.row);
  await writeDerivedDifficulty(result.row);
  pushToFirestore(result.row);
  return result;
}

export async function markSceneUsed(
  row: PpEngineRow,
  sceneId: string,
  changeClasses: number[],
): Promise<PpEngineRow> {
  const updated: PpEngineRow = {
    ...row,
    scenesThisSession: [...row.scenesThisSession, sceneId],
    updatedAt: Date.now(),
  };
  await putPpEngine(updated);
  await Promise.all(changeClasses.map((c) => putPpPair(row.userId, sceneId, c, todayISO())));
  return updated;
}

export async function markTipShown(row: PpEngineRow): Promise<PpEngineRow> {
  const updated = { ...row, tipCardL41Shown: true, updatedAt: Date.now() };
  await putPpEngine(updated);
  return updated;
}

export async function markPhotoTipShown(row: PpEngineRow): Promise<PpEngineRow> {
  const updated: PpEngineRow = { ...row, tipCardPhotoShown: true, updatedAt: Date.now() };
  await putPpEngine(updated);
  return updated;
}

export async function hydrateFromFirestore(userId: string): Promise<void> {
  try {
    const snap = await getDoc(doc(db, 'ppEngine', userId));
    if (!snap.exists()) return;
    const remote = snap.data() as Partial<PpEngineRow>;
    const local = await getPpEngine(userId);
    if ((remote.updatedAt ?? 0) > (local?.updatedAt ?? 0)) {
      await putPpEngine({
        ...freshEngineRow(userId),
        ...remote,
        userId,
        trialHistory: remote.trialHistory ?? [],
      } as PpEngineRow);
    }
  } catch {
    // offline / rules error — never blocks profile selection
  }
}
