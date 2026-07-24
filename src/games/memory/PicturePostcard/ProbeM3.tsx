import { useMemo, useState } from 'react';
import { useTranslation } from 'react-i18next';
import type { M3Option, TrialSpec } from '../../../lib/contentGenerators/picturePostcard';
import type { MachineState } from './trialMachine';
import { getScene } from './scenes';
import { SPRITES } from './sprites';
import { HintButton } from './ProbeSpatial';

// ─── Types ────────────────────────────────────────────────────────────────────

export interface ProbeM3Props {
  trial: TrialSpec;
  machine: MachineState;
  onResponse: (correctChangeIndex: number | null) => void;
  onHint: () => void;
  hintsLeft: number;
}

// ─── Fallback copy ────────────────────────────────────────────────────────────
// Mirrors the M3_QUESTION_NAME classes in the generator (1 removal, 2 addition,
// 4 colour, 5 substitution) — only colour/substitution interpolate {{object}},
// per spec SS4.2.

function questionFallback(changeClass: number): string {
  switch (changeClass) {
    case 1: return 'What is missing from the picture?';
    case 2: return 'What was added to the picture?';
    case 4: return 'What colour is the {{object}} now?';
    case 5: return 'Which {{object}} do you see now?';
    default: return 'What changed?';
  }
}

// ─── Scaffold ladder (spec SS4.3) ──────────────────────────────────────────────
// Tier 2 -> 1 wrong option dimmed total (player-wrong + scaffold combined); tier 3
// -> 2 wrong dimmed total (leaving correct + 1 wrong). Dimming is monotonic: once a
// card is dimmed (by a wrong tap OR by the scaffold) it must never come back — so
// scaffold picks are accumulated (topped up as the tier rises), never recomputed
// from scratch, otherwise a later wrong tap landing on an index the scaffold
// hadn't chosen could "free up" a card the scaffold had already dimmed.

/** How many wrong options the scaffold should top up to, given the current tier. */
function scaffoldTargetCount(tier: MachineState['scaffoldTier']): number {
  return tier >= 3 ? 2 : tier >= 2 ? 1 : 0;
}

/** First eligible wrong option indices (by index order), skipping anything already dimmed. */
function pickWrongIndices(options: M3Option[], alreadyDimmed: ReadonlySet<number>, count: number): number[] {
  const picked: number[] = [];
  for (let i = 0; i < options.length && picked.length < count; i++) {
    if (options[i].correct || alreadyDimmed.has(i)) continue;
    picked.push(i);
  }
  return picked;
}

// ─── Component ────────────────────────────────────────────────────────────────
// Spec SS4.2 (M3 recognition matrix) + SS4.3 (M3 scaffold ladder). Tier 4
// (re-exposure + reveal) is feedback-phase work owned by Task 16, not rendered
// here — by the time scaffoldTier reaches 4 the machine has already resolved out
// of the 'probe' phase, so index.tsx stops mounting this component.

export default function ProbeM3({ trial, machine, onResponse, onHint, hintsLeft }: ProbeM3Props) {
  const { t } = useTranslation();
  // Tracked separately per the brief (both render identically as "dimmed"): wrongly-tapped
  // options vs. scaffold-assisted ones. Both sets only ever grow.
  const [playerDimmed, setPlayerDimmed] = useState<Set<number>>(new Set());
  const [scaffoldDimmed, setScaffoldDimmed] = useState<Set<number>>(new Set());
  // "Adjusting state during render" (react.dev's documented alternative to a
  // setState-in-effect derived-state pattern — also required here since
  // set-state-in-effect is an eslint error in this repo's config): mirror the two
  // inputs the scaffold top-up reacts to, and only recompute when either actually
  // changed since the last render that synced them.
  const [syncedTier, setSyncedTier] = useState(machine.scaffoldTier);
  const [syncedPlayerCount, setSyncedPlayerCount] = useState(0);

  const options = useMemo(() => trial.m3Question?.options ?? [], [trial.m3Question]);
  const probedChange = trial.changes[0];

  const categoryLabel = useMemo(() => {
    if (!probedChange) return '';
    const scene = getScene(trial.sceneId);
    const slot = scene.slots.find((s) => s.id === probedChange.slotId);
    return slot ? t(`pp.category.${slot.category}`, slot.category) : '';
  }, [trial.sceneId, probedChange, t]);

  // Top up the scaffold set as the tier rises (or a player tap changes what's still
  // needed). Never removes — only adds enough new (not-already-dimmed) wrong options
  // to bring the combined total up to the tier's target.
  if (options.length > 0 && (machine.scaffoldTier !== syncedTier || playerDimmed.size !== syncedPlayerCount)) {
    const target = scaffoldTargetCount(machine.scaffoldTier);
    const combined = playerDimmed.size + scaffoldDimmed.size;
    if (combined < target) {
      const alreadyDimmed = new Set<number>([...playerDimmed, ...scaffoldDimmed]);
      const toAdd = pickWrongIndices(options, alreadyDimmed, target - combined);
      if (toAdd.length > 0) {
        const next = new Set(scaffoldDimmed);
        toAdd.forEach((i) => next.add(i));
        setScaffoldDimmed(next);
      }
    }
    setSyncedTier(machine.scaffoldTier);
    setSyncedPlayerCount(playerDimmed.size);
  }

  if (!trial.m3Question || !probedChange) return null;

  const questionText = t(trial.m3Question.questionKey, questionFallback(probedChange.changeClass), {
    object: categoryLabel,
  });

  function handleChoice(index: number) {
    const option = options[index];
    if (!option || playerDimmed.has(index) || scaffoldDimmed.has(index)) return;
    if (option.correct) {
      onResponse(0);
      return;
    }
    setPlayerDimmed((prev) => {
      const next = new Set(prev);
      next.add(index);
      return next;
    });
    onResponse(null);
  }

  return (
    <div className="flex-1 flex flex-col gap-6 p-6">
      <p className="text-h2 font-semibold text-body-text text-center">{questionText}</p>

      <div className="flex-1 grid grid-cols-2 gap-4 max-w-md w-full mx-auto content-center">
        {options.map((option, i) => {
          const dimmed = playerDimmed.has(i) || scaffoldDimmed.has(i);
          const entry = SPRITES[option.spriteId];
          const spriteLabel = entry ? t(`pp.sprite.${entry.label}`, entry.label) : option.spriteId;
          return (
            <button
              key={i}
              type="button"
              onClick={() => handleChoice(i)}
              disabled={dimmed}
              aria-disabled={dimmed}
              aria-label={spriteLabel}
              className={`min-w-[96px] min-h-[96px] p-4 rounded-2xl border-2 flex items-center justify-center bg-white shadow-sm transition-all ${
                dimmed
                  ? 'opacity-40 grayscale border-gray-200 cursor-not-allowed'
                  : 'border-gray-300 active:scale-95'
              }`}
            >
              <div style={{ width: 112, height: 112 }}>
                {entry && <entry.Component fill={option.fill} />}
              </div>
            </button>
          );
        })}
      </div>

      <div className="px-4 py-3 flex justify-center">
        <HintButton hintsLeft={hintsLeft} onHint={onHint} label={t('pp.hint', 'Hint')} />
      </div>
    </div>
  );
}
