import { useEffect, useRef, useState } from 'react';
import { useTranslation } from 'react-i18next';
import { useAppStore } from '../../../store';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import { loadEngine, markSceneUsed, markTipShown, commitTrial } from '../../../lib/picturePostcard/engine';
import { nextTrialKind, trialDi } from '../../../lib/picturePostcard/engineCore';
import type { TrialKind, LevelOutcome } from '../../../lib/picturePostcard/engineCore';
import { getLevelDef, effectiveParams } from '../../../lib/picturePostcard/ladder';
import { roundScore, speedBonus } from '../../../lib/picturePostcard/scoring';
import { emitTrialCompleted, emitTrialAbandoned, emitLevelCompleted } from '../../../lib/picturePostcard/telemetry';
import { generateTrial } from '../../../lib/contentGenerators/picturePostcard';
import type { TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import { getPpPairsForUser } from '../../../lib/db';
import type { PpEngineRow, PpPairHistoryRow } from '../../../lib/db';
import { todayISO } from '../../../lib/dates';
import { initialState, reduce } from './trialMachine';
import type { MachineState } from './trialMachine';
import SceneView from './SceneView';
import InterferenceTask from './InterferenceTask';
import ProbeSpatial from './ProbeSpatial';
import ProbeM3 from './ProbeM3';
import FeedbackView from './FeedbackView';
import StarCard from './StarCard';
import { changeCentre } from './geometry';
import { getScene } from './scenes';

// ─── Types ────────────────────────────────────────────────────────────────────

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// spec A1 — interference mini-task can be globally disabled without touching call sites.
export const interferenceEnabled = true;

const TICK_MS = 100;
const COUNTED_TRIAL_DOTS = 10;
const HINTS_PER_LEVEL = 3;

interface ProbeTapLogEntry {
  xNorm: number | null; // null for choice-based probes (M3) — there's no tap coordinate
  yNorm: number | null;
  errorDistanceNorm: number | null; // distance from tap to the probed change's slot centre, in scene-normalised units; null for M3
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
  if (mode === 'M2') return "You'll tap every thing that changed";
  return "You'll choose the answer from a set of pictures";
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
  const [starOutcome, setStarOutcome] = useState<(LevelOutcome & { level: number }) | null>(null);

  // Hint budget is 3 per LEVEL, not per trial. This component currently completes the
  // level (via onLevelComplete) after a single trial, so a fresh ref per mount already
  // gives the right "3 per level" behaviour today — see task-14-report.md for the
  // multi-trial-per-level persistence caveat this leaves for a future task.
  const hintBudgetRef = useRef(HINTS_PER_LEVEL);
  // Every probe response, correct or not, for telemetry.
  const tapLogRef = useRef<ProbeTapLogEntry[]>([]);
  // Spec SS2.3 ordering contract — the normal commit path and the abandonment
  // cleanup are mutually exclusive; whoever flips this ref owns the commit.
  const committedRef = useRef(false);
  // Latest values for the unmount cleanup (refs, so cleanup sees current state).
  const machineRef = useRef<MachineState | null>(null);
  const rowRef = useRef<PpEngineRow | null>(null);
  const kindRef = useRef<TrialKind | null>(null);
  const diRef = useRef(0);
  // Soft-timer remainder at the moment the probe resolved (for speedBonus).
  const lastProbeRemainingRef = useRef(0);
  const resultRef = useRef<LevelResult | null>(null);
  const levelAttemptIdRef = useRef('');

  useEffect(() => {
    machineRef.current = machine;
    rowRef.current = row;
    kindRef.current = kind;
  }, [machine, row, kind]);

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

      diRef.current = di;
      levelAttemptIdRef.current = `${userId}:${loadedRow.currentLevel}:${startedAt.current}`;
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

  // ── Abandonment path (spec SS2.3): x-exit / unmount mid-trial ──────────────
  // Ready/encoding/retention exits leave no staircase effect; probe/feedback
  // exits are committed (best-effort, not awaited) as omissions so the x button
  // can never be a free trial-reroll.
  useEffect(() => {
    return () => {
      if (committedRef.current) return;
      const m = machineRef.current;
      const r = rowRef.current;
      const k = kindRef.current;
      if (!m || !r || !k) return;
      emitTrialAbandoned({
        level: r.currentLevel,
        trialIndex: r.countedTrialsInLevel,
        phase: m.phase,
        effectiveDI: diRef.current,
      });
      if (m.phase === 'probe' || m.phase === 'feedback') {
        committedRef.current = true;
        void commitTrial(r, { correct: false, omission: true, kind: k });
      }
    };
  }, []);

  // ── 100ms machine clock ─────────────────────────────────────────────────────
  useEffect(() => {
    if (!trial || showTip) return;
    const id = setInterval(() => {
      setMachine((prev) => (prev ? reduce(prev, trial, { type: 'TICK', ms: TICK_MS }) : prev));
    }, TICK_MS);
    return () => clearInterval(id);
  }, [trial, showTip]);

  // Track the soft-timer remainder while the probe runs so scoring can use the
  // value at the moment of resolution (msLeftInPhase is Infinity when no timer).
  useEffect(() => {
    if (machine?.phase === 'probe' && Number.isFinite(machine.msLeftInPhase)) {
      lastProbeRemainingRef.current = machine.msLeftInPhase;
    }
  }, [machine]);

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

  // ── M3 probe wiring (spec SS4.2-4.3) ────────────────────────────────────────
  // Choice-based, so there's no tap coordinate — log null coords/errorDistanceNorm
  // to keep the telemetry shape uniform across probe modes.
  function handleM3Response(correctChangeIndex: number | null) {
    if (!trial || !machine || machine.phase !== 'probe') return;

    tapLogRef.current.push({ xNorm: null, yNorm: null, errorDistanceNorm: null, correctChangeIndex });

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

  // ── Scoring for the trial that just resolved (pure; spec SS6) ──────────────
  function computeTrialScore(m: MachineState, r: PpEngineRow, tr: TrialSpec): number {
    return roundScore({
      changesFound: m.foundChangeIds.length,
      responded: !(m.outcome?.omission ?? false),
      speedBonus: speedBonus(tr.softTimerMs, lastProbeRemainingRef.current),
      streak: r.streak,
      hintsUsed: m.hintsUsed,
      autoScaffoldTiersAboveTier1: m.autoScaffoldTiersAboveTier1,
    });
  }

  // ── The ordering contract (spec SS2.3) ──────────────────────────────────────
  // Feedback window elapsed -> await commitTrial -> emit telemetry -> star card
  // (level complete) or onLevelComplete. NEVER onLevelComplete before the commit
  // resolves; the star card waits for an explicit Continue tap.
  async function handleFeedbackDone() {
    if (committedRef.current) return;
    if (!row || !kind || !trial || !machine?.outcome) return;
    committedRef.current = true;

    const outcome = machine.outcome;
    const score = computeTrialScore(machine, row, trial);
    const preCommitLevel = row.currentLevel;
    const preCommitTrialIndex = row.countedTrialsInLevel;

    const { levelOutcome } = await commitTrial(row, {
      correct: outcome.correct,
      omission: outcome.omission,
      kind,
    });

    const lastTap = tapLogRef.current[tapLogRef.current.length - 1];
    emitTrialCompleted({
      levelAttemptId: levelAttemptIdRef.current,
      trialIndex: preCommitTrialIndex,
      level: preCommitLevel,
      effectiveDI: diRef.current,
      sceneId: trial.sceneId,
      objects: trial.params.objects,
      encodeMs: trial.params.encodeMs,
      delayMs: trial.params.delayMs,
      changeType: trial.changes.map((c) => c.changeClass),
      probeMode: trial.probeMode,
      lureLevel: trial.params.lureLevel,
      correct: outcome.correct,
      omission: outcome.omission,
      responseLatencyMs: machine.msSinceProbeStart,
      tapCoordinates: tapLogRef.current.map((e) => ({ xNorm: e.xNorm, yNorm: e.yNorm })),
      errorDistanceNorm: lastTap?.errorDistanceNorm ?? null,
      scaffoldTierReached: machine.scaffoldTier,
      hintsUsed: machine.hintsUsed,
      isWarmup: kind === 'warmup',
      isConfidence: kind === 'confidence',
      interruptions: machine.interruptions,
      roundScore: score,
    });

    resultRef.current = {
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: outcome.correct,
      metrics: {
        correct: outcome.correct,
        omission: outcome.omission,
        errorDistanceNorm: lastTap?.errorDistanceNorm ?? null,
        hintsUsed: machine.hintsUsed,
        scaffoldTierReached: machine.scaffoldTier,
        roundScore: score,
        ppLevel: preCommitLevel,
        probeMode: trial.probeMode,
      },
    };

    if (levelOutcome) {
      setStarOutcome({ ...levelOutcome, level: preCommitLevel });
    } else if (resultRef.current) {
      onLevelComplete(resultRef.current);
    }
  }

  function handleStarContinue() {
    if (!starOutcome || !resultRef.current || !machine) return;
    emitLevelCompleted({
      stars: starOutcome.stars,
      accuracy: starOutcome.accuracy,
      level: starOutcome.level,
      hintsUsed: machine.hintsUsed,
      hintsUnused: Math.max(0, HINTS_PER_LEVEL - machine.hintsUsed),
    });
    onLevelComplete(resultRef.current);
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

  // ── Star card (level complete) takes over the whole body ───────────────────

  if (starOutcome) {
    return (
      <div className="flex-1 flex flex-col">
        {header}
        <StarCard
          stars={starOutcome.stars}
          correctCount={Math.round(starOutcome.accuracy * COUNTED_TRIAL_DOTS)}
          level={starOutcome.level}
          onContinue={handleStarContinue}
        />
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
      <div className="flex-1 flex flex-col gap-4 p-4 items-center">
        <div className="w-full max-w-2xl flex flex-col gap-4">
          <SceneView scene={scene} visibleSlotIds={trial.visibleSlotIds ?? []} className="scene-board" />
          <div className="w-full h-4 rounded-full bg-gray-200 overflow-hidden">
            <div className="h-full bg-primary-blue" style={{ width: `${pct}%` }} />
          </div>
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
      return (
        <ProbeM3
          trial={trial}
          machine={machine}
          onResponse={handleM3Response}
          onHint={handleHint}
          hintsLeft={Math.max(0, hintBudgetRef.current - machine.hintsUsed)}
        />
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
    if (!trial || !machine || !row) return null;
    return (
      <FeedbackView
        scene={getScene(trial.sceneId)}
        trial={trial}
        machine={machine}
        paused={machine.paused}
        scoreDelta={computeTrialScore(machine, row, trial)}
        onDone={handleFeedbackDone}
      />
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
