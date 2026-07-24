import { useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import type { TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import type { SceneDef } from './scenes';
import type { MachineState } from './trialMachine';
import SceneView from './SceneView';
import { changeBBox, annotationBBox } from './geometry';

// Spec SS4.1 phase 5 — feedback is immediate and NON-SKIPPABLE. Correct: soft
// ring bloom on the found change(s) + score tick. Incorrect/omission: 1.2 s
// corrective re-exposure of the ORIGINAL scene with the change annotated — this
// is the learning event; there are deliberately no tap targets here.

const FEEDBACK_MS = 1200;
const TICK_MS = 100;

export interface FeedbackViewProps {
  scene: SceneDef;
  trial: TrialSpec;
  machine: MachineState;
  paused: boolean;
  scoreDelta: number;
  onDone: () => void;
}

function RingMarker({ bbox, variant }: { bbox: { x: number; y: number; w: number; h: number }; variant: 'bloom' | 'reveal' }) {
  const pad = 0.2;
  return (
    <div
      className={`absolute pointer-events-none rounded-full ${
        variant === 'bloom'
          ? 'border-4 border-emerald-green/70 animate-pulse'
          : 'border-4 border-dashed border-primary-blue'
      }`}
      style={{
        left: `${(bbox.x - bbox.w * pad) * 100}%`,
        top: `${(bbox.y - bbox.h * pad) * 100}%`,
        width: `${bbox.w * (1 + 2 * pad) * 100}%`,
        height: `${bbox.h * (1 + 2 * pad) * 100}%`,
      }}
    />
  );
}

export default function FeedbackView({ scene, trial, machine, paused, scoreDelta, onDone }: FeedbackViewProps) {
  const { t } = useTranslation();
  const correct = machine.outcome?.correct ?? false;

  // Pause-aware, non-skippable window: counts down only while unpaused, fires once.
  const remainingRef = useRef(FEEDBACK_MS);
  const doneRef = useRef(false);
  const pausedRef = useRef(paused);
  const onDoneRef = useRef(onDone);

  useEffect(() => {
    pausedRef.current = paused;
    onDoneRef.current = onDone;
  }, [paused, onDone]);

  useEffect(() => {
    const id = setInterval(() => {
      if (pausedRef.current || doneRef.current) return;
      remainingRef.current -= TICK_MS;
      if (remainingRef.current <= 0) {
        doneRef.current = true;
        clearInterval(id);
        onDoneRef.current();
      }
    }, TICK_MS);
    return () => clearInterval(id);
  }, []);

  if (correct) {
    const foundBBoxes = machine.foundChangeIds
      .map((i) => trial.changes[i])
      .filter((c): c is NonNullable<typeof c> => !!c)
      .map((c) => changeBBox(scene, c))
      .filter((b): b is NonNullable<typeof b> => !!b);

    return (
      <div className="flex-1 flex flex-col gap-4 p-4">
        <div className="flex items-center justify-center gap-4">
          <h3 className="text-h2 font-bold text-body-text">{t('pp.feedback.correct', 'Well spotted!')}</h3>
          <span className="text-h2 font-bold text-emerald-green">+{scoreDelta}</span>
        </div>
        <div className="relative w-full max-w-2xl mx-auto">
          <SceneView
            scene={scene}
            modifications={trial.changes}
            lures={trial.lurePlacements}
            visibleSlotIds={trial.visibleSlotIds ?? []}
            className="scene-board"
          />
          {foundBBoxes.map((bbox, i) => <RingMarker key={i} bbox={bbox} variant="bloom" />)}
        </div>
      </div>
    );
  }

  // Corrective re-exposure: the ORIGINAL scene with the (first unfound) change annotated.
  const revealChange = trial.changes.find((_, i) => !machine.foundChangeIds.includes(i)) ?? trial.changes[0];
  const revealBBox = revealChange ? annotationBBox(scene, revealChange, 'original') : null;

  return (
    <div className="flex-1 flex flex-col gap-4 p-4">
      <h3 className="text-h2 font-bold text-body-text text-center">
        {t('pp.feedback.reveal', 'Here is what changed')}
      </h3>
      <div className="relative w-full max-w-2xl mx-auto">
        <SceneView
          scene={scene}
          visibleSlotIds={trial.visibleSlotIds ?? []}
          className="scene-board"
        />
        {revealBBox && <RingMarker bbox={revealBBox} variant="reveal" />}
      </div>
    </div>
  );
}
