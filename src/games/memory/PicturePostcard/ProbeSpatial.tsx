import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppliedChange, TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import type { SceneDef } from './scenes';
import type { MachineState } from './trialMachine';
import SceneView from './SceneView';
import { changeBBox } from './geometry';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProbeSpatialProps {
  trial: TrialSpec;
  scene: SceneDef;
  machine: MachineState;
  onResponse: (correctChangeIndex: number | null, tap: { xNorm: number; yNorm: number }) => void;
  onHint: () => void;
  hintsLeft: number;
}

// ─── Presentational bits ─────────────────────────────────────────────────────

function FoundMarker({ bbox }: { bbox: { x: number; y: number; w: number; h: number } }) {
  const pad = 0.15;
  return (
    <div
      className="absolute pointer-events-none rounded-full border-4 border-emerald-green/60"
      style={{
        left: `${(bbox.x - bbox.w * pad) * 100}%`,
        top: `${(bbox.y - bbox.h * pad) * 100}%`,
        width: `${bbox.w * (1 + 2 * pad) * 100}%`,
        height: `${bbox.h * (1 + 2 * pad) * 100}%`,
      }}
    />
  );
}

// Exported so ProbeM3 (Task 15) can reuse the identical hint affordance rather than
// duplicating it.
export function HintButton({ hintsLeft, onHint, label }: { hintsLeft: number; onHint: () => void; label: string }) {
  const enabled = hintsLeft > 0;
  return (
    <button
      type="button"
      onClick={onHint}
      disabled={!enabled}
      aria-disabled={!enabled}
      aria-label={label}
      className={`min-w-[96px] min-h-[96px] px-6 rounded-2xl flex items-center gap-2 justify-center text-btn font-semibold shadow-sm transition-transform border ${
        enabled
          ? 'bg-accent-purple text-white border-purple-800 active:scale-95'
          : 'bg-gray-200 text-gray-400 border-gray-300 cursor-not-allowed'
      }`}
    >
      <span aria-hidden="true" className="text-2xl leading-none">💡</span>
      <span>{label}</span>
      <span
        className={`min-w-[28px] h-7 px-2 rounded-full flex items-center justify-center text-caption font-bold ${
          enabled ? 'bg-white/25 text-white' : 'bg-gray-300 text-gray-500'
        }`}
      >
        {hintsLeft}
      </span>
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────
// Spec SS4.2-4.3 — the M2 probe view (tap-in-place on the modified scene alone),
// with the tier-1..3 spatial scaffold ladder. Tier 4 (peek/reveal) is
// feedback-phase work owned by Task 16, not rendered here.

export default function ProbeSpatial({ trial, scene, machine, onResponse, onHint, hintsLeft }: ProbeSpatialProps) {
  const { t } = useTranslation();

  const firstUnfoundChange = useMemo(
    () => trial.changes.find((_, i) => !machine.foundChangeIds.includes(i)),
    [trial.changes, machine.foundChangeIds],
  );
  const scaffoldTargetSlotId = firstUnfoundChange?.slotId;

  const tier = machine.scaffoldTier;
  const dimNonTargets = tier >= 1;
  const vignetteSlotId = tier >= 2 ? scaffoldTargetSlotId : undefined;
  const pulseSlotId = tier >= 3 ? scaffoldTargetSlotId : undefined;

  const foundMarkers = useMemo(
    () => machine.foundChangeIds
      .map((i) => trial.changes[i])
      .filter((c): c is AppliedChange => !!c)
      .map((c) => changeBBox(scene, c))
      .filter((b): b is NonNullable<typeof b> => !!b),
    [machine.foundChangeIds, trial.changes, scene],
  );

  function resolveTap(tappedSlotId: string | null, pos: { xNorm: number; yNorm: number }) {
    const idx = tappedSlotId ? trial.changes.findIndex((c) => c.slotId === tappedSlotId) : -1;
    onResponse(idx === -1 ? null : idx, pos);
  }

  const hintButton = (
    <div className="px-4 py-3 flex justify-center">
      <HintButton hintsLeft={hintsLeft} onHint={onHint} label={t('pp.hint', 'Hint')} />
    </div>
  );

  // M2 — modified scene only. The original is never on screen during the probe;
  // it was shown in the encoding phase and must be recalled from memory.
  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <p className="text-h2 font-semibold text-body-text text-center">
        {t('pp.probe.m2', 'Tap where the change happened.')}
      </p>

      <div className="flex-1 flex items-center justify-center">
        <div className="relative w-full max-w-2xl mx-auto">
          <SceneView
            scene={scene}
            modifications={trial.changes}
            lures={trial.lurePlacements}
            visibleSlotIds={trial.visibleSlotIds ?? []}
            onSlotTap={resolveTap}
            dimNonTargets={dimNonTargets}
            dimExemptSlotId={scaffoldTargetSlotId}
            vignetteSlotId={vignetteSlotId}
            pulseSlotId={pulseSlotId}
            className="scene-board"
          />
          {foundMarkers.map((bbox, i) => <FoundMarker key={i} bbox={bbox} />)}
        </div>
      </div>

      {hintButton}
    </div>
  );
}
