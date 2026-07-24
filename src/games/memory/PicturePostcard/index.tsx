import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import { loadEngine, markSceneUsed, markTipShown } from '../../../lib/picturePostcard/engine';
import { nextTrialKind, trialDi } from '../../../lib/picturePostcard/engineCore';
import type { TrialKind } from '../../../lib/picturePostcard/engineCore';
import { getLevelDef, effectiveParams } from '../../../lib/picturePostcard/ladder';
import { generateTrial } from '../../../lib/contentGenerators/picturePostcard';
import type { AppliedChange, TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import { getPpPairsForUser } from '../../../lib/db';
import type { PpEngineRow, PpPairHistoryRow } from '../../../lib/db';
import { todayISO } from '../../../lib/dates';
import { initialState, reduce } from './trialMachine';
import type { MachineState } from './trialMachine';
import SceneView from './SceneView';
import InterferenceTask from './InterferenceTask';
import ProbeSpatial from './ProbeSpatial';
import { getScene } from './scenes';
import type { SceneDef } from './scenes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// spec A1 — interference mini-task can be globally disabled without touching call sites.
export const interferenceEnabled = true;

const TICK_MS = 100;
const PROBE_PLACEHOLDER_MS = 1000; // Task 15 replaces this with the real M3 UI; M1/M2 are real as of Task 14.
const COUNTED_TRIAL_DOTS = 10;
const HINTS_PER_LEVEL = 3;

interface ProbeTapLogEntry {
  xNorm: number;
  yNorm: number;
  errorDistanceNorm: number | null; // distance from tap to the probed change's slot centre, in scene-normalised units
  correctChangeIndex: number | null;
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

/** `${userId}|${sceneId}:${changeClass}` -> the generator's pairHistory shape. */
function toPairHistoryEntry(row: PpPairHistoryRow): { sceneId: string; changeClass: number; lastUsedDate: string } {
  const afterUser = row.key.slice(row.key.indexOf('|') + 1);
  const sep = afterUser.lastIndexOf(':');
  return {
    sceneId: afterUser.slice(0, sep),
    changeClass: Number(afterUser.slice(sep + 1)),
    lastUsedDate: row.lastUsedDate,
  };
}

function probeExpectFallback(mode: TrialSpec['probeMode']): string {
  if (mode === 'M1') return "You'll tap the one thing that changed";
  if (mode === 'M2') return "You'll tap every thing that changed";
  return "You'll choose the answer from a set of pictures";
}

/**
 * Scene-normalised centre of a change's target — mirrors SceneView's own per-class
 * placement rules (Task 13) / ProbeSpatial's module-private changeBBox (Task 14) so
 * error-distance telemetry lines up with what's actually painted.
 */
function changeCentre(scene: SceneDef, change: AppliedChange): { x: number; y: number } | null {
  const slot = scene.slots.find((s) => s.id === change.slotId);
  if (!slot) return null;
  const bbox = (change.changeClass === 2 || change.changeClass === 3) && change.newPosition
    ? { x: change.newPosition.x, y: change.newPosition.y, w: slot.bbox.w, h: slot.bbox.h }
    : slot.bbox;
  return { x: bbox.x + bbox.w / 2, y: bbox.y + bbox.h / 2 };
}

function DotGridMask() {
  return (
    <div className="relative w-full max-w-xl mx-auto" style={{ aspectRatio: '4 / 3' }}>
      <svg width="100%" height="100%" viewBox="0 0 100 75" className="rounded-2xl bg-[#EEF1F6]" preserveAspectRatio="none">
        <defs>
          <pattern id="pp-retention-dot-grid" width="6" height="6" patternUnits="userSpaceOnUse">
            <circle cx="3" cy="3" r="1.1" fill="#C7CEDD" />
          </pattern>
        </defs>
        <rect width="100" height="75" fill="url(#pp-retention-dot-grid)" />
      </svg>
    </div>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function PicturePostcard({ levelConfig, onLevelComplete }: Props) {
  void levelConfig; // this game drives its own level via the picture-postcard ladder engine, not GameShell's dynamic difficulty

  const { t } = useTranslation();
  const activeProfile = useAppStore((s) => s.activeProfile);
  const currentSession = useAppStore((s) => s.currentSession);
  const startedAt = useRef(Date.now());

  const [row, setRow] = useState<PpEngineRow | null>(null);
  const [kind, setKind] = useState<TrialKind | null>(null);
  const [trial, setTrial] = useState<TrialSpec | null>(null);
  const [machine, setMachine] = useState<MachineState | null>(null);
  const [showTip, setShowTip] = useState(false);
  const [loadFailed, setLoadFailed] = useState(false);

  // Hint budget is 3 per LEVEL, not per trial. This component currently completes the
  // level (via onLevelComplete) after a single trial, so a fresh ref per mount already
  // gives the right "3 per level" behaviour today — see task-14-report.md for the
  // multi-trial-per-level persistence caveat this leaves for a future task.
  const hintBudgetRef = useRef(HINTS_PER_LEVEL);
  // Every probe tap, correct or not, for Task 16's telemetry.
  const tapLogRef = useRef<ProbeTapLogEntry[]>([]);

  // ── Mount: load engine state, generate one trial, seed the machine ─────────
  useEffect(() => {
    let cancelled = false;

    async function mount() {
      const userId = activeProfile?.userId;
      if (!userId) return;

      const sessionStamp = currentSession?.sessionStartedAt ?? Date.parse(todayISO());
      const loadedRow = await loadEngine(userId, sessionStamp);
      if (cancelled) return;

      const tipNeeded = loadedRow.currentLevel === 41 && !loadedRow.tipCardL41Shown;

      const trialKind = nextTrialKind(loadedRow);
      const di = trialDi(loadedRow, trialKind);
      const levelDef = getLevelDef(loadedRow.currentLevel);
      const params = effectiveParams(loadedRow.currentLevel, di);

      const pairHistoryRaw = await getPpPairsForUser(userId);
      if (cancelled) return;
      const pairHistory = pairHistoryRaw.map(toPairHistoryEntry);

      const newTrial = generateTrial({
        levelDef,
        params,
        scenesThisSession: loadedRow.scenesThisSession,
        pairHistory,
      });

      const updatedRow = await markSceneUsed(
        loadedRow,
        newTrial.sceneId,
        newTrial.changes.map((c) => c.changeClass),
      );
      if (cancelled) return;

      setRow(updatedRow);
      setKind(trialKind);
      setTrial(newTrial);
      setMachine(initialState(newTrial));
      setShowTip(tipNeeded);
    }

    mount().catch(() => {
      if (!cancelled) setLoadFailed(true);
    });

    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── 100ms machine clock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!trial || showTip) return;
    const id = setInterval(() => {
      setMachine((prev) => (prev ? reduce(prev, trial, { type: 'TICK', ms: TICK_MS }) : prev));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [trial, showTip]);

  // ── Probe placeholder (M3 only): auto-resolve correct once ~1s of unpaused probe
  // time has elapsed (Task 15 replaces this with the real M3 UI). Driven off the
  // machine's own msSinceProbeStart rather than a wall-clock setTimeout so it stays
  // correct across pause/resume: that counter only advances on unpaused TICKs, so a
  // pause mid-placeholder can't cause the auto-resolve to fire (or get silently
  // dropped) while the scene is masked. M1/M2 are real interactive UI as of Task 14
  // and must never be auto-resolved by this timer.
  const phase = machine?.phase;
  const msSinceProbeStart = machine?.msSinceProbeStart ?? 0;
  useEffect(() => {
    if (!trial || phase !== 'probe' || trial.probeMode !== 'M3' || msSinceProbeStart < PROBE_PLACEHOLDER_MS) return;
    setMachine((prev) => {
      if (!prev || prev.phase !== 'probe') return prev;
      let next = prev;
      for (let i = 0; i < trial.changes.length; i++) {
        next = reduce(next, trial, { type: 'RESPONSE', correctChangeIndex: i });
      }
      return next;
    });
  }, [trial, phase, msSinceProbeStart]);

  function togglePause() {
    if (!trial) return;
    setMachine((prev) => (prev ? reduce(prev, trial, { type: prev.paused ? 'RESUME' : 'PAUSE' }) : prev));
  }

  // ── M1/M2 probe wiring (spec SS4.2-4.3) ─────────────────────────────────────
  function handleProbeResponse(correctChangeIndex: number | null, tap: { xNorm: number; yNorm: number }) {
    if (!trial || !machine || machine.phase !== 'probe') return;

    // "The probed change" for telemetry: the tapped change itself when correct,
    // otherwise whichever change the scaffold ladder is currently nudging toward.
    const probedIndex = correctChangeIndex ?? trial.changes.findIndex((_, i) => !machine.foundChangeIds.includes(i));
    const probedChange = probedIndex >= 0 ? trial.changes[probedIndex] : undefined;
    const centre = probedChange ? changeCentre(getScene(trial.sceneId), probedChange) : null;
    const errorDistanceNorm = centre ? Math.hypot(tap.xNorm - centre.x, tap.yNorm - centre.y) : null;

    tapLogRef.current.push({ xNorm: tap.xNorm, yNorm: tap.yNorm, errorDistanceNorm, correctChangeIndex });

    setMachine((prev) => (prev ? reduce(prev, trial, { type: 'RESPONSE', correctChangeIndex }) : prev));
  }

  function handleHint() {
    if (!trial || !machine || machine.phase !== 'probe') return;
    if (machine.hintsUsed >= hintBudgetRef.current) return;
    setMachine((prev) => (prev ? reduce(prev, trial, { type: 'HINT' }) : prev));
  }

  async function dismissTip() {
    if (!row) return;
    const updated = await markTipShown(row);
    setRow(updated);
    setShowTip(false);
  }

  function handleContinue() {
    if (!row || !trial) return;
    onLevelComplete({
      levelId: `level_${row.currentLevel}`,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        correct: machine?.outcome?.correct ?? false,
        omission: machine?.outcome?.omission ?? false,
        probeMode: trial.probeMode,
      },
    });
  }

  // ── Loading / error states ──────────────────────────────────────────────────

  if (loadFailed) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <p className="text-h3 text-caption-text">{t('pp.loadError', 'Could not load this game. Please try again.')}</p>
      </div>
    );
  }

  if (!row || !trial || !machine || !kind) {
    return (
      <div className="flex-1 flex items-center justify-center p-8">
        <p className="text-h3 text-caption-text">{t('pp.loading', 'Loading…')}</p>
      </div>
    );
  }

  // ── Header (present on every screen, including the tip card and pause) ─────

  const header = (
    <div className="flex items-center justify-between gap-4 px-2 py-3">
      <h2 className="text-h2 font-semibold text-body-text">
        {t('pp.level', 'Level {{n}}', { n: row.currentLevel })}
      </h2>
      <div className="flex gap-1.5" aria-label={t('pp.trialRail', 'Level progress')}>
        {Array.from({ length: COUNTED_TRIAL_DOTS }).map((_, i) => (
          <span
            key={i}
            className={`w-3 h-3 rounded-full ${i < row.countedTrialsInLevel ? 'bg-emerald-green' : 'bg-gray-200'}`}
          />
        ))}
      </div>
      <button
        type="button"
        onClick={togglePause}
        className="min-w-[96px] min-h-[96px] rounded-2xl bg-white border border-gray-200 flex items-center justify-center text-3xl shadow-sm active:scale-95 transition-transform"
        aria-label={machine.paused ? t('btn.resume', 'Resume') : t('pp.pause', 'Pause')}
      >
        {machine.paused ? '▶' : '⏸'}
      </button>
    </div>
  );

  // ── L41 one-time tip card, shown before the trial starts ───────────────────

  if (showTip) {
    return (
      <div className="flex-1 flex flex-col">
        {header}
        <div className="flex-1 flex items-center justify-center p-6">
          <div className="card max-w-md w-full flex flex-col gap-6 items-center p-8 text-center">
            <p className="text-h3 text-body-text">
              {t(
                'pp.tip.l41',
                "From here on, you'll pick your answer from a small set of pictures instead of tapping directly on the scene. Take your time - there's no rush.",
              )}
            </p>
            <button type="button" onClick={dismissTip} className="btn-primary w-full min-h-[96px] min-w-[96px]">
              {t('btn.continue', 'Continue')}
            </button>
          </div>
        </div>
      </div>
    );
  }

  // ── Phase bodies ─────────────────────────────────────────────────────────────

  function renderReady() {
    if (!trial) return null;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="card max-w-md w-full flex flex-col gap-4 items-center p-8">
          <h3 className="text-h2 font-bold text-body-text">{t('pp.ready.title', 'Look carefully')}</h3>
          {kind === 'counted' && (
            <p className="text-h3 text-caption-text">
              {t('pp.trialOf', 'Trial {{i}} of 10', { i: row!.countedTrialsInLevel + 1 })}
            </p>
          )}
          <p className="text-h3 text-body-text">
            {t(`pp.probe.expect.${trial.probeMode}`, probeExpectFallback(trial.probeMode))}
          </p>
        </div>
      </div>
    );
  }

  function renderEncoding() {
    if (!trial || !machine) return null;
    const scene = getScene(trial.sceneId);
    const pct = trial.params.encodeMs > 0
      ? Math.max(0, Math.min(100, (machine.msLeftInPhase / trial.params.encodeMs) * 100))
      : 0;
    return (
      <div className="flex-1 flex flex-col gap-4 p-4">
        <SceneView scene={scene} visibleSlotIds={trial.visibleSlotIds ?? []} className="scene-board" />
        <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
          <div className="h-full bg-primary-blue" style={{ width: `${pct}%` }} />
        </div>
      </div>
    );
  }

  function renderRetention() {
    if (!trial) return null;
    if (trial.interference && interferenceEnabled) {
      return <InterferenceTask />;
    }
    return (
      <div className="flex-1 flex items-center justify-center p-4">
        <DotGridMask />
      </div>
    );
  }

  function renderProbe() {
    if (!trial || !machine) return null;

    if (trial.probeMode === 'M3') {
      // Task 15 replaces this with the real recognition-choice UI.
      return (
        <div className="flex-1 flex flex-col items-center justify-center gap-4 p-6 text-center">
          <p className="text-h2 font-semibold text-body-text">{t('pp.probe.placeholder', 'What changed?')}</p>
          <p className="text-h3 text-caption-text">{t('pp.probe.placeholderHint', 'Resolving…')}</p>
        </div>
      );
    }

    return (
      <ProbeSpatial
        trial={trial}
        scene={getScene(trial.sceneId)}
        machine={machine}
        onResponse={handleProbeResponse}
        onHint={handleHint}
        hintsLeft={Math.max(0, hintBudgetRef.current - machine.hintsUsed)}
      />
    );
  }

  function renderFeedback() {
    if (!machine) return null;
    const correct = machine.outcome?.correct ?? false;
    return (
      <div className="flex-1 flex flex-col items-center justify-center gap-6 p-6 text-center">
        <div className="card max-w-md w-full flex flex-col gap-4 items-center p-8">
          <span className="text-6xl" aria-hidden="true">{correct ? '✅' : '➖'}</span>
          <h3 className="text-h2 font-bold text-body-text">
            {correct ? t('pp.feedback.correct', 'Nicely spotted') : t('pp.feedback.tryNext', "Let's keep going")}
          </h3>
          <button type="button" onClick={handleContinue} className="btn-primary w-full min-h-[96px] min-w-[96px]">
            {t('btn.continue', 'Continue')}
          </button>
        </div>
      </div>
    );
  }

  const phaseBody = machine.phase === 'ready' ? renderReady()
    : machine.phase === 'encoding' ? renderEncoding()
    : machine.phase === 'retention' ? renderRetention()
    : machine.phase === 'probe' ? renderProbe()
    : renderFeedback();

  return (
    <div className="flex-1 flex flex-col">
      {header}
      <div className="flex-1 flex flex-col relative">
        {phaseBody}
        {machine.paused && (
          <div className="absolute inset-0 z-50 flex items-center justify-center bg-app-bg">
            <p className="text-h2 font-semibold text-body-text text-center px-8">
              {t('pp.paused', 'Paused - take your time')}
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
