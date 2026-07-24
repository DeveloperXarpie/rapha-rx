import { useMemo } from 'react';
import { useTranslation } from 'react-i18next';
import type { AppliedChange, TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import type { SceneDef } from './scenes';
import type { MachineState } from './trialMachine';
import SceneView from './SceneView';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProbeSpatialProps {
  trial: TrialSpec;
  scene: SceneDef;
  machine: MachineState;
  onResponse: (correctChangeIndex: number | null, tap: { xNorm: number; yNorm: number }) => void;
  onHint: () => void;
  hintsLeft: number;
}

// ─── Geometry helpers ───────────────────────────────────────────────────────
// Mirrors SceneView's own per-class placement rules (Task 13) so the "found" ring
// markers line up with what's actually painted. Kept module-private (not exported)
// so this stays a components-only file for react-refresh; index.tsx has its own
// copy of the same centre calc for Task 16's error-distance telemetry.

/** Scene-normalised bbox a given change occupies on the MODIFIED scene. */
function changeBBox(scene: SceneDef, change: AppliedChange): { x: number; y: number; w: number; h: number } | null {
  const slot = scene.slots.find((s) => s.id === change.slotId);
  if (!slot) return null;
  if ((change.changeClass === 2 || change.changeClass === 3) && change.newPosition) {
    return { x: change.newPosition.x, y: change.newPosition.y, w: slot.bbox.w, h: slot.bbox.h };
  }
  return slot.bbox;
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
// Spec SS4.2-4.3 — M1 (single-change "spot the difference" across two stacked
// scenes) and M2 (tap-in-place on the modified scene alone) probe views, with the
// tier-1..3 spatial scaffold ladder. Tier 4 (peek/reveal) is feedback-phase work
// owned by Task 16, not rendered here.

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

  if (trial.probeMode === 'M1') {
    return (
      <div className="flex-1 flex flex-col gap-4 p-4 overflow-y-auto">
        <p className="text-h2 font-semibold text-body-text text-center">
          {t('pp.probe.m1', 'Find what changed in the postcard.')}
        </p>

        <div className="flex flex-col gap-2">
          <p className="text-body-md text-center">
            <span className="scene-ribbon-blue">{t('pp.probe.m1.remember', 'Remember')}</span>
          </p>
          <SceneView scene={scene} visibleSlotIds={trial.visibleSlotIds ?? []} className="scene-board" />
        </div>

        <div className="flex flex-col gap-2">
          <p className="text-body-md text-center">
            <span className="scene-ribbon-red">{t('pp.probe.m1.whatChanged', 'What changed?')}</span>
          </p>
          <div className="relative">
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

  // M2 — modified scene only.
  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <p className="text-h2 font-semibold text-body-text text-center">
        {t('pp.probe.m2', 'Tap where the change happened.')}
      </p>

      <div className="flex-1 flex items-center">
        <div className="relative w-full">
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
