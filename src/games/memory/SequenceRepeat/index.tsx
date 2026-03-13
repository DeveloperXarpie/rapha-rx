import { useState, useEffect, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface SequenceRepeatParams {
  startingLength: number;
  colourCount: number;
  playbackSpeedMs: number;
  audioEnabled: boolean;
  maxLength: number;
}

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Phase sequence (design spec §4) ─────────────────────────────────────────
// intro → demonstration → repeat → result → [loop to demonstration] → summary

type Phase = 'intro' | 'demonstration' | 'repeat' | 'result' | 'summary';
const PHASES: Phase[] = ['intro', 'demonstration', 'repeat', 'result', 'summary'];

// ─── Fruit & vegetable pads ───────────────────────────────────────────────────

const ITEMS = [
  { label: 'Mango',    emoji: '🥭', bg: 'bg-yellow-100', lit: 'bg-yellow-300', border: 'border-yellow-400' },
  { label: 'Tomato',   emoji: '🍅', bg: 'bg-red-100',    lit: 'bg-red-300',    border: 'border-red-400'   },
  { label: 'Brinjal',  emoji: '🍆', bg: 'bg-purple-100', lit: 'bg-purple-300', border: 'border-purple-400'},
  { label: 'Coconut',  emoji: '🥥', bg: 'bg-amber-100',  lit: 'bg-amber-300',  border: 'border-amber-400' },
  { label: 'Banana',   emoji: '🍌', bg: 'bg-lime-100',   lit: 'bg-lime-300',   border: 'border-lime-400'  },
  { label: 'Broccoli', emoji: '🥦', bg: 'bg-green-100',  lit: 'bg-green-300',  border: 'border-green-400' },
];

function sleep(ms: number): Promise<void> {
  return new Promise((r) => setTimeout(r, ms));
}

function randColour(count: number): number {
  return Math.floor(Math.random() * count);
}

function makeSequence(length: number, colourCount: number): number[] {
  return Array.from({ length }, () => randColour(colourCount));
}

// ─── Component ────────────────────────────────────────────────────────────────

type ResultType = 'error' | 'round_success' | 'complete';

export default function SequenceRepeat({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const p = levelConfig.params as unknown as SequenceRepeatParams;
  const startedAt = useRef(Date.now());
  const items = ITEMS.slice(0, p.colourCount);

  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASES);

  const [sequence, setSequence] = useState<number[]>(() =>
    makeSequence(p.startingLength, p.colourCount),
  );
  const sequenceRef = useRef(sequence);

  // Increments each time we want to (re)start a demonstration run
  const [roundKey, setRoundKey] = useState(0);

  const [highlighted, setHighlighted]   = useState<number | null>(null);
  const [playerInput, setPlayerInput]   = useState<number[]>([]);
  const [peakLength, setPeakLength]     = useState(p.startingLength);
  const [totalErrors, setTotalErrors]   = useState(0);
  const [resultType, setResultType]     = useState<ResultType>('error');

  // ── Demonstration playback ────────────────────────────────────────────────
  // Fires whenever phase becomes 'demonstration' OR roundKey increments
  useEffect(() => {
    if (currentPhase !== 'demonstration') return;
    let cancelled = false;
    const seq = sequenceRef.current;

    async function run() {
      setHighlighted(null);
      await sleep(p.playbackSpeedMs);
      for (const idx of seq) {
        if (cancelled) return;
        setHighlighted(idx);
        await sleep(p.playbackSpeedMs);
        if (cancelled) return;
        setHighlighted(null);
        await sleep(Math.round(p.playbackSpeedMs * 0.5));
      }
      if (!cancelled) {
        setPlayerInput([]);
        advance(); // → 'repeat'
      }
    }

    run();
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, roundKey]);

  // ── Auto-advance from result phase ────────────────────────────────────────
  // Spec: "calm 'Let's try again!' message" then loop back — handled automatically
  useEffect(() => {
    if (currentPhase !== 'result' || resultType === 'complete') return;
    const id = setTimeout(() => {
      if (resultType === 'error') {
        // Reset sequence back to startingLength
        const reset = makeSequence(p.startingLength, p.colourCount);
        sequenceRef.current = reset;
        setSequence(reset);
      } else {
        // Grow sequence by 1
        const grown = [...sequenceRef.current, randColour(p.colourCount)];
        sequenceRef.current = grown;
        setSequence(grown);
      }
      setRoundKey((k) => k + 1);
      goTo('demonstration');
    }, 2500); // 2.5 s pause on result screen before looping
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, resultType]);

  // ── Pad tap handler ───────────────────────────────────────────────────────
  function handlePadTap(idx: number) {
    if (currentPhase !== 'repeat') return;

    // Flash the tapped pad
    setHighlighted(idx);
    setTimeout(() => setHighlighted(null), 280);

    const seq = sequenceRef.current;
    const pos = playerInput.length;

    if (idx !== seq[pos]) {
      // Wrong tap — spec §2: "Sequence resets; calm 'Let's try again!' message — no shake"
      setTotalErrors((e) => e + 1);
      setResultType('error');
      advance(); // → 'result'
      return;
    }

    const newInput = [...playerInput, idx];
    setPlayerInput(newInput);

    if (newInput.length === seq.length) {
      // Completed this round
      const newPeak = Math.max(peakLength, seq.length);
      setPeakLength(newPeak);

      if (seq.length >= p.maxLength) {
        // Reached max — player wins!
        setResultType('complete');
        setTimeout(() => advance(), 1200); // → 'result' (then manually go to summary)
      } else {
        setResultType('round_success');
        setTimeout(() => advance(), 1200); // → 'result' (auto-advances, grows sequence, loops)
      }
    }
  }

  // ── Phase: intro ──────────────────────────────────────────────────────────

  if (currentPhase === 'intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
        <span className="text-7xl">🍎</span>
        <div>
          <h2 className="text-h1 font-bold text-body-text">
            {t('sequence-repeat.intro.title', 'Watch & Repeat!')}
          </h2>
          <p className="text-h3 text-caption-text mt-3">
            {t(
              'sequence-repeat.intro.subtitle',
              'Watch the fruits and vegetables light up, then tap them in the same order',
            )}
          </p>
        </div>

        {/* Preview pads — 120×120px per spec §2 */}
        <div className="flex gap-4 justify-center flex-wrap">
          {items.map((c, i) => (
            <div
              key={i}
              className={`w-[120px] h-[120px] rounded-2xl ${c.bg} border-4 ${c.border}
                          flex items-center justify-center shadow-md`}
            >
              <span className="text-4xl pointer-events-none">{c.emoji}</span>
            </div>
          ))}
        </div>

        <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-gray-100 w-full max-w-sm text-left">
          <p className="text-body-md text-caption-text font-semibold mb-2">
            {t('sequence-repeat.intro.howto', 'How to play:')}
          </p>
          <ul className="text-body-md text-caption-text space-y-1">
            <li>• {t('sequence-repeat.intro.step1', 'Watch the sequence flash')}</li>
            <li>• {t('sequence-repeat.intro.step2', 'Tap the colours in the same order')}</li>
            <li>• {t('sequence-repeat.intro.step3', "Each correct round the sequence grows — keep going!")}</li>
          </ul>
        </div>

        <button onClick={advance} className="btn-primary w-full max-w-sm">
          {t('btn.startGame', 'Start!')}
        </button>
      </div>
    );
  }

  // ── Phase: demonstration & repeat ─────────────────────────────────────────

  if (currentPhase === 'demonstration' || currentPhase === 'repeat') {
    return (
      <div className="flex-1 flex flex-col items-center gap-6 p-6 bg-[#FAFAF8]">
        {/* Phase label */}
        <div className="text-center">
          {currentPhase === 'demonstration' ? (
            <p className="text-h3 font-semibold text-body-text">
              👁️ {t('sequence-repeat.play.watching', 'Watch carefully…')}
            </p>
          ) : (
            <p className="text-h3 font-semibold text-body-text">
              👆 {t('sequence-repeat.play.yourturn', 'Your turn! Tap the same colours')}
            </p>
          )}
        </div>

        {/* Input progress dots */}
        {currentPhase === 'repeat' && (
          <div className="flex gap-2" role="status" aria-label="Progress">
            {sequenceRef.current.map((_, i) => (
              <div
                key={i}
                className={`w-4 h-4 rounded-full border-2 ${
                  i < playerInput.length
                    ? 'bg-emerald-green border-emerald-green'
                    : 'bg-gray-200 border-gray-300'
                }`}
              />
            ))}
          </div>
        )}

        {/* Colour pads — 120×120px minimum per spec §2 */}
        <div className="grid grid-cols-2 gap-5 w-full max-w-sm mt-4">
          {items.map((c, i) => {
            const isLit = highlighted === i;
            return (
              <button
                key={i}
                onPointerDown={() => handlePadTap(i)}
                disabled={currentPhase === 'demonstration'}
                aria-label={c.label}
                className={`
                  min-w-[120px] min-h-[120px] rounded-3xl border-4 flex flex-col
                  items-center justify-center gap-2 select-none
                  transition-all duration-100
                  ${isLit
                    ? `${c.lit} ${c.border} scale-95 shadow-lg`
                    : `${c.bg} ${c.border} shadow-md`}
                  ${currentPhase === 'demonstration'
                    ? 'cursor-default opacity-90'
                    : 'cursor-pointer hover:opacity-90 active:scale-95'}
                `}
              >
                <span className="text-4xl pointer-events-none">{c.emoji}</span>
                <span className="text-body-md font-bold text-white/90 pointer-events-none">
                  {c.label}
                </span>
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Phase: result ─────────────────────────────────────────────────────────

  if (currentPhase === 'result') {
    if (resultType === 'complete') {
      // Max length reached — player wins
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <span className="text-7xl">🏆</span>
          <h2 className="text-h1 font-bold text-body-text">
            {t('sequence-repeat.result.complete', 'Amazing! You did it!')}
          </h2>
          <p className="text-h3 text-caption-text">
            {t('sequence-repeat.result.completeDesc', 'You completed the full sequence. Outstanding!')}
          </p>
          <button onClick={advance} className="btn-primary w-full max-w-sm mt-4">
            {t('btn.continue', 'Continue')}
          </button>
        </div>
      );
    }

    if (resultType === 'error') {
      // Spec §2: "Sequence resets; calm 'Let's try again!' message — no shake"
      return (
        <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
          <span className="text-7xl">🍎</span>
          <h2 className="text-h2 font-bold text-body-text">
            {t('sequence-repeat.result.tryAgain', "Let's try again!")}
          </h2>
          <p className="text-h3 text-caption-text">
            {t('sequence-repeat.result.tryAgainDesc', "Watch the sequence and give it another go")}
          </p>
          <p className="text-body-md text-caption-text">
            {t('sequence-repeat.result.starting', 'Starting a fresh sequence…')}
          </p>
        </div>
      );
    }

    // round_success
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
        <span className="text-7xl">✨</span>
        <h2 className="text-h2 font-bold text-body-text">
          {t('sequence-repeat.result.roundWon', 'Well done!')}
        </h2>
        <p className="text-h3 text-caption-text">
          {t('sequence-repeat.result.nextRound', 'The sequence is growing — watch carefully!')}
        </p>
      </div>
    );
  }

  // ── Phase: summary — encouragement only, NO score numbers (spec §2) ───────

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
      <span className="text-7xl">{peakLength >= p.maxLength ? '🏆' : '🍎'}</span>
      <h2 className="text-h1 font-bold text-body-text">
        {peakLength >= p.maxLength
          ? t('sequence-repeat.summary.perfect', "Outstanding memory! You're a champion!")
          : peakLength > p.startingLength
          ? t('sequence-repeat.summary.great', 'Great effort! You improved with every round!')
          : t('sequence-repeat.summary.good', 'Good try! Keep practising — you will get there!')}
      </h2>
      <button
        onClick={() =>
          onLevelComplete({
            levelId: levelConfig.id,
            durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
            completed: true,
            metrics: { peakSequenceLength: peakLength, maxLength: p.maxLength, totalErrors },
          })
        }
        className="btn-primary w-full max-w-sm mt-4"
      >
        {t('btn.continue', 'Continue')}
      </button>
    </div>
  );
}
