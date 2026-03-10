import { useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import type { GeneratedRoutineContent, GeneratedStep } from '../../../lib/contentGenerators/morningRoutine';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
  generatedContent?: GeneratedRoutineContent;
}

type Phase = 'scenario_intro' | 'placement' | 'decision_branch' | 'disruption' | 'completion';
const PHASES: Phase[] = ['scenario_intro', 'placement', 'decision_branch', 'disruption', 'completion'];

// ── Component ────────────────────────────────────────────────────────────────

export default function MorningRoutineQuest({ levelConfig, onLevelComplete, generatedContent }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASES);

  // Use generated content or a minimal fallback
  const routineContent = useMemo<GeneratedRoutineContent>(() => {
    if (generatedContent) return generatedContent;
    // Minimal fallback
    return {
      emoji: '🌅',
      title: 'Morning Routine',
      contextDescription: 'Help plan your morning.',
      steps: [
        { id: 'wake', emoji: '🌅', label: 'Wake up', subLabel: 'Start the morning', correctPosition: 1 },
        { id: 'brush', emoji: '🪥', label: 'Brush teeth', subLabel: 'Fresh and clean', correctPosition: 2 },
        { id: 'breakfast', emoji: '🍽️', label: 'Eat breakfast', subLabel: 'Idli or upma', correctPosition: 3 },
        { id: 'chai', emoji: '☕', label: 'Drink chai', subLabel: 'Sit and relax', correctPosition: 4 },
      ],
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const cardCount = routineContent.steps.length;

  const [trayCards, setTrayCards] = useState<GeneratedStep[]>(() =>
    [...routineContent.steps].sort(() => Math.random() - 0.5)
  );
  const [slots, setSlots] = useState<(GeneratedStep | null)[]>(() => Array(cardCount).fill(null));
  const [selectedCard, setSelectedCard] = useState<GeneratedStep | null>(null);
  const [wobbling, setWobbling] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [firstAttemptPlacements, setFirstAttemptPlacements] = useState(0);
  const [decisionAnswer, setDecisionAnswer] = useState<'A' | 'B' | null>(null);
  const [, setDisruptionDone] = useState(false);

  const triedRef = useRef<Set<string>>(new Set());
  const startedAt = useRef(Date.now());

  const handleCardTap = useCallback((card: GeneratedStep) => {
    if (selectedCard?.id === card.id) {
      setSelectedCard(null);
    } else {
      setSelectedCard(card);
    }
  }, [selectedCard]);

  const handleSlotTap = useCallback((slotNumber: number) => {
    if (!selectedCard) return;
    if (slots[slotNumber - 1] !== null) return;

    const attemptKey = `${selectedCard.id}-${slotNumber}`;
    const isFirstAttempt = !triedRef.current.has(attemptKey);
    triedRef.current.add(attemptKey);

    if (selectedCard.correctPosition === slotNumber) {
      if (isFirstAttempt) {
        setFirstAttemptPlacements(prev => prev + 1);
      }
      const newSlots = [...slots];
      newSlots[slotNumber - 1] = selectedCard;
      setSlots(newSlots);
      setTrayCards(prev => prev.filter(c => c.id !== selectedCard.id));
      setSelectedCard(null);
      setFeedbackMsg(null);

      if (newSlots.every(s => s !== null)) {
        setTimeout(() => {
          if (routineContent.decisionBranch) {
            goTo('decision_branch');
          } else {
            goTo('completion');
          }
        }, 800);
      }
    } else {
      setWobbling(selectedCard.id);
      setFeedbackMsg(t('morning-routine.placement.wrongFeedback', 'Try placing that one differently!'));
      setSelectedCard(null);
      setTimeout(() => {
        setWobbling(null);
      }, 600);
      setTimeout(() => {
        setFeedbackMsg(null);
      }, 1800);
    }
  }, [selectedCard, slots, goTo, routineContent.decisionBranch, t]);

  function handleDecision(choice: 'A' | 'B') {
    setDecisionAnswer(choice);
    setTimeout(() => {
      if (routineContent.disruptionEvent) {
        advance(); // goes to disruption
      } else {
        goTo('completion');
      }
    }, 600);
  }

  function handleComplete() {
    const decisionCorrect =
      decisionAnswer === null ? null :
      decisionAnswer === routineContent.decisionBranch?.correctOption;

    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        firstAttemptPlacements,
        totalCards: cardCount,
        decisionCorrect,
      },
    });
  }

  // ── scenario_intro ─────────────────────────────────────────────────────────

  if (currentPhase === 'scenario_intro') {
    return (
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg min-h-screen">
        <span className="text-7xl" aria-hidden="true">{routineContent.emoji}</span>
        <h2 className="text-h2 font-bold text-body-text">
          {t(routineContent.title)}
        </h2>
        <p className="text-h3 text-caption-text">
          {t('morning-routine.intro.subtitle', 'Help arrange the morning steps in the right order')}
        </p>
        <p className="text-body-md text-body-text max-w-md">
          {t(routineContent.contextDescription)}
        </p>
        <div className="w-full max-w-sm mt-2">
          <Button fullWidth onClick={advance}>
            {t('morning-routine.intro.begin', "Let's Begin!")}
          </Button>
        </div>
      </div>
    );
  }

  // ── placement ─────────────────────────────────────────────────────────────

  if (currentPhase === 'placement') {
    return (
      <div role="main" className="flex-1 flex flex-col items-start p-4 gap-4 bg-app-bg min-h-screen">
        <style>{`@keyframes wobble { 0%,100%{transform:rotate(0deg)} 20%{transform:rotate(-8deg)} 40%{transform:rotate(8deg)} 60%{transform:rotate(-5deg)} 80%{transform:rotate(5deg)} }`}</style>

        {/* Instruction */}
        <p
          role="status"
          className="text-body-md text-body-text text-center w-full px-2"
        >
          {selectedCard
            ? t(
                'morning-routine.placement.instructionSelected',
                "Now tap the step number where '{{label}}' belongs",
                { label: selectedCard ? t(selectedCard.label) : '' }
              )
            : t(
                'morning-routine.placement.instruction',
                'Tap a card, then tap the step number where it belongs'
              )}
        </p>

        {/* Slots area */}
        <div className="flex gap-2 flex-wrap justify-center w-full">
          {slots.map((card, i) => (
            <div
              key={i}
              onClick={() => handleSlotTap(i + 1)}
              className={[
                'relative flex flex-col items-center justify-center min-h-[96px] min-w-[96px] rounded-2xl border-2',
                card
                  ? 'bg-emerald-green/10 border-emerald-green'
                  : 'bg-app-bg border-dashed border-gray-300',
                selectedCard && !card ? 'border-primary-blue cursor-pointer' : '',
                'p-2 text-center transition-all',
              ]
                .filter(Boolean)
                .join(' ')}
              aria-label={`Step ${i + 1}${card ? ': ' + card.label : ' - empty'}`}
            >
              <span className="text-[1rem] text-caption-text font-bold mb-1">
                {t('morning-routine.placement.stepLabel', 'Step {{number}}', { number: i + 1 })}
              </span>
              {card ? (
                <>
                  <span className="text-4xl" aria-hidden="true">{card.emoji}</span>
                  <span className="text-[0.9rem] leading-tight text-body-text font-semibold mt-1">{t(card.label)}</span>
                </>
              ) : (
                <span className="text-[1rem] text-gray-300" aria-hidden="true">?</span>
              )}
            </div>
          ))}
        </div>

        {/* Feedback message */}
        {feedbackMsg && (
          <div
            className="bg-accent-amber/10 border border-accent-amber rounded-xl px-4 py-3 text-body-md text-body-text text-center w-full"
            role="status"
          >
            {feedbackMsg}
          </div>
        )}

        {/* Tray area */}
        <div className="flex gap-2 flex-wrap justify-center w-full mt-2">
          {trayCards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardTap(card)}
              style={wobbling === card.id ? { animation: 'wobble 0.5s ease-in-out' } : undefined}
              className={[
                'flex flex-col items-center justify-center min-h-[96px] min-w-[96px] rounded-2xl p-3 transition-all',
                'bg-card-bg shadow-sm border-2',
                selectedCard?.id === card.id
                  ? 'border-primary-blue bg-hover-state'
                  : 'border-gray-200 hover:border-primary-blue',
              ].join(' ')}
              aria-label={card.label}
              aria-pressed={selectedCard?.id === card.id}
            >
              <span className="text-[3rem] leading-none" aria-hidden="true">{card.emoji}</span>
              <span className="text-[1rem] text-body-text font-semibold mt-1 text-center leading-tight">{t(card.label)}</span>
              <span className="text-[0.9rem] text-caption-text mt-0.5 text-center leading-tight">{t(card.subLabel)}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── decision_branch ────────────────────────────────────────────────────────

  if (currentPhase === 'decision_branch') {
    if (!routineContent.decisionBranch) {
      goTo('completion');
      return null;
    }
    return (
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-app-bg text-center">
        <span className="text-6xl" aria-hidden="true">{routineContent.emoji}</span>
        <p className="text-h3 font-semibold text-body-text max-w-md">
          {t(routineContent.decisionBranch.prompt)}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button fullWidth onClick={() => handleDecision('A')}>
            {t(routineContent.decisionBranch.optionA)}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => handleDecision('B')}>
            {t(routineContent.decisionBranch.optionB)}
          </Button>
        </div>
      </div>
    );
  }

  // ── disruption ─────────────────────────────────────────────────────────────

  if (currentPhase === 'disruption') {
    if (!routineContent.disruptionEvent) {
      goTo('completion');
      return null;
    }
    return (
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-app-bg text-center">
        <span className="text-5xl" aria-hidden="true">⚠️</span>
        <p className="text-h2 font-bold text-body-text">
          {t(routineContent.disruptionEvent.notification)}
        </p>
        <p className="text-h3 text-caption-text max-w-md">
          {t(routineContent.disruptionEvent.prompt)}
        </p>
        <Button fullWidth onClick={() => { setDisruptionDone(true); goTo('completion'); }}>
          {t('morning-routine.disruption.understood', 'I understand — continue!')}
        </Button>
      </div>
    );
  }

  // ── completion ─────────────────────────────────────────────────────────────

  return (
    <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg min-h-screen">
      <span className="text-7xl" aria-hidden="true">{routineContent.emoji}🙏</span>
      <h2 className="text-h2 font-bold text-body-text">
        {t('morning-routine.completion.title', 'Wonderful! All steps are done!')}
      </h2>
      <p className="text-h3 text-caption-text">
        {t('morning-routine.completion.message', 'You planned your morning perfectly!')}
      </p>

      {/* Completed order summary */}
      <div className="flex gap-2 flex-wrap justify-center w-full max-w-lg mt-2">
        {slots.map((card, i) =>
          card ? (
            <div
              key={card.id}
              className="flex flex-col items-center justify-center min-h-[96px] min-w-[96px] rounded-2xl border-2 bg-emerald-green/10 border-emerald-green p-2 text-center"
            >
              <span className="text-[1rem] text-caption-text font-bold mb-1">
                {t('morning-routine.placement.stepLabel', 'Step {{number}}', { number: i + 1 })}
              </span>
              <span className="text-4xl" aria-hidden="true">{card.emoji}</span>
              <span className="text-[0.9rem] leading-tight text-body-text font-semibold mt-1">{t(card.label)}</span>
            </div>
          ) : null
        )}
      </div>

      <div className="w-full max-w-sm mt-2">
        <Button fullWidth onClick={handleComplete}>
          {t('morning-routine.completion.continue', 'Continue')}
        </Button>
      </div>
    </div>
  );
}
