import { useRef, useState, useMemo, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

interface StepCard {
  id: string;
  emoji: string;
  label: string;
  subLabel: string;
  correctPosition: number;
}

interface DecisionBranch {
  prompt: string;
  optionA: string;
  optionB: string;
  correctOption: 'A' | 'B';
}

interface DisruptionEvent {
  notification: string;
  prompt: string;
  affectedCardId: string;
  newPosition: number;
}

interface RoutineContext {
  id: string;
  emoji: string;
  title: string;
  contextDescription: string;
  steps: StepCard[];
  decisionBranch?: DecisionBranch;
  disruptionEvent?: DisruptionEvent;
}

// ── Easy contexts ────────────────────────────────────────────────────────────

const TEMPLE_VISIT: RoutineContext = {
  id: 'temple_visit',
  emoji: '🛕',
  title: 'Getting Ready for the Temple',
  contextDescription: 'Today you are visiting the neighbourhood temple for morning puja.',
  steps: [
    { id: 'wake',      emoji: '🌅', label: 'Wake up',            subLabel: 'Start the morning',    correctPosition: 1 },
    { id: 'freshen',   emoji: '🪥', label: 'Freshen up',          subLabel: 'Brush and wash face',  correctPosition: 2 },
    { id: 'breakfast', emoji: '🍽️', label: 'Eat breakfast',       subLabel: 'Idli or upma',         correctPosition: 3 },
    { id: 'dress',     emoji: '👗', label: 'Wear clean clothes',  subLabel: 'Traditional dress',    correctPosition: 4 },
    { id: 'temple',    emoji: '🛕', label: 'Walk to temple',      subLabel: 'Nearby neighbourhood', correctPosition: 5 },
  ],
};

const YOGA_SESSION: RoutineContext = {
  id: 'yoga_session',
  emoji: '🧘',
  title: 'Yoga in the Garden',
  contextDescription: 'Yoga class starts at 7am in the care home garden — help get ready in time!',
  steps: [
    { id: 'wake',      emoji: '🌅', label: 'Wake up early',     subLabel: 'Before sunrise',          correctPosition: 1 },
    { id: 'freshen',   emoji: '🪥', label: 'Freshen up',         subLabel: 'Wash face quickly',       correctPosition: 2 },
    { id: 'yogacloth', emoji: '👕', label: 'Wear yoga clothes',  subLabel: 'Comfortable outfit',      correctPosition: 3 },
    { id: 'water',     emoji: '💧', label: 'Drink water',        subLabel: 'Stay hydrated',           correctPosition: 4 },
    { id: 'garden',    emoji: '🌳', label: 'Go to the garden',   subLabel: 'Yoga mat ready',          correctPosition: 5 },
  ],
};

const EASY_CONTEXTS: RoutineContext[] = [TEMPLE_VISIT, YOGA_SESSION];

// ── Very easy contexts (level_1 — 4 steps only) ──────────────────────────────

const MORNING_WASH: RoutineContext = {
  id: 'morning_wash',
  emoji: '🌅',
  title: 'Morning Wash',
  contextDescription: 'A simple morning routine before a relaxing day at home.',
  steps: [
    { id: 'wake',      emoji: '🌅', label: 'Wake up',       subLabel: 'Open your eyes',   correctPosition: 1 },
    { id: 'brush',     emoji: '🪥', label: 'Brush teeth',   subLabel: 'Fresh and clean',  correctPosition: 2 },
    { id: 'breakfast', emoji: '🍽️', label: 'Eat breakfast', subLabel: 'Idli with chutney', correctPosition: 3 },
    { id: 'relax',     emoji: '☕', label: 'Drink chai',    subLabel: 'Sit and relax',    correctPosition: 4 },
  ],
};

const GARDEN_WALK: RoutineContext = {
  id: 'garden_walk',
  emoji: '🌳',
  title: 'Morning Garden Walk',
  contextDescription: 'Help plan a simple morning walk in the care home garden.',
  steps: [
    { id: 'wake',   emoji: '🌅', label: 'Wake up',       subLabel: 'Rise and shine',  correctPosition: 1 },
    { id: 'water',  emoji: '💧', label: 'Drink water',   subLabel: 'Stay hydrated',   correctPosition: 2 },
    { id: 'shoes',  emoji: '👟', label: 'Wear shoes',    subLabel: 'Comfortable pair', correctPosition: 3 },
    { id: 'walk',   emoji: '🚶', label: 'Go for a walk', subLabel: 'In the garden',   correctPosition: 4 },
  ],
};

const VERY_EASY_CONTEXTS: RoutineContext[] = [MORNING_WASH, GARDEN_WALK];

// ── Medium contexts ──────────────────────────────────────────────────────────

const DOCTOR_APPOINTMENT: RoutineContext = {
  id: 'doctor_appointment',
  emoji: '🏥',
  title: 'Getting Ready for the Doctor',
  contextDescription: 'Help Amma get ready for her checkup at the district hospital at 10am!',
  steps: [
    { id: 'wake',    emoji: '🌅', label: 'Wake up',              subLabel: 'Early morning',        correctPosition: 1 },
    { id: 'freshen', emoji: '🪥', label: 'Freshen up',            subLabel: 'Brush and bathe',      correctPosition: 2 },
    { id: 'meds',    emoji: '💊', label: 'Take morning medicine', subLabel: 'As prescribed',        correctPosition: 3 },
    { id: 'dress',   emoji: '👗', label: 'Wear clean clothes',   subLabel: 'Comfortable dress',    correctPosition: 4 },
    { id: 'docs',    emoji: '📋', label: 'Collect documents',    subLabel: 'Health records, card', correctPosition: 5 },
    { id: 'leave',   emoji: '🚶', label: 'Leave for hospital',   subLabel: 'On time',              correctPosition: 6 },
  ],
  decisionBranch: {
    prompt: 'The hospital is 3 km away. How will Amma travel?',
    optionA: '🛺 Auto-rickshaw (faster)',
    optionB: '🚶 Walk slowly (30 min)',
    correctOption: 'A',
  },
};

const FAMILY_VISIT: RoutineContext = {
  id: 'family_visit',
  emoji: '👨‍👩‍👧‍👦',
  title: 'Family is Coming!',
  contextDescription: 'The grandchildren are coming for lunch — help prepare for their visit!',
  steps: [
    { id: 'wake',    emoji: '🌅', label: 'Wake up',           subLabel: 'Early start',       correctPosition: 1 },
    { id: 'freshen', emoji: '🪥', label: 'Freshen up',         subLabel: 'Bath and ready',    correctPosition: 2 },
    { id: 'clean',   emoji: '🧹', label: 'Tidy the room',      subLabel: 'Make it welcoming', correctPosition: 3 },
    { id: 'cook',    emoji: '🍳', label: 'Prepare food',       subLabel: 'Sambar and rice',   correctPosition: 4 },
    { id: 'dress',   emoji: '👗', label: 'Wear nice clothes',  subLabel: 'For the occasion',  correctPosition: 5 },
    { id: 'wait',    emoji: '🪑', label: 'Wait at the door',   subLabel: 'Welcome them',      correctPosition: 6 },
  ],
  decisionBranch: {
    prompt: "The grandchildren say they want to eat! There's not enough sambar. What to do?",
    optionA: '🍲 Make more sambar quickly',
    optionB: '📞 Order from nearby restaurant',
    correctOption: 'A',
  },
};

const MEDIUM_CONTEXTS: RoutineContext[] = [DOCTOR_APPOINTMENT, FAMILY_VISIT];

// ── Hard context ─────────────────────────────────────────────────────────────

const MARKET_TRIP: RoutineContext = {
  id: 'market_trip',
  emoji: '🛒',
  title: 'Morning Market Trip',
  contextDescription: 'Help plan the morning trip to the local sabzi mandi — everything must be done before it gets too hot!',
  steps: [
    { id: 'wake',      emoji: '🌅', label: 'Wake up early',         subLabel: 'Before 6am',         correctPosition: 1 },
    { id: 'freshen',   emoji: '🪥', label: 'Freshen up',             subLabel: 'Quick wash',         correctPosition: 2 },
    { id: 'breakfast', emoji: '🍽️', label: 'Light breakfast',        subLabel: 'Idli or bread',      correctPosition: 3 },
    { id: 'list',      emoji: '📝', label: 'Write shopping list',    subLabel: 'What is needed',     correctPosition: 4 },
    { id: 'bag',       emoji: '🛍️', label: 'Take cloth bags',        subLabel: 'Eco-friendly',       correctPosition: 5 },
    { id: 'money',     emoji: '💵', label: 'Take money/wallet',      subLabel: 'Check the amount',   correctPosition: 6 },
    { id: 'shoes',     emoji: '👡', label: 'Wear comfortable shoes', subLabel: 'Walking distance',   correctPosition: 7 },
    { id: 'leave',     emoji: '🚶', label: 'Leave for market',       subLabel: 'Before 7am',         correctPosition: 8 },
  ],
  decisionBranch: {
    prompt: 'The vegetable prices are high today. What to do?',
    optionA: '🥬 Buy less but fresh vegetables',
    optionB: '🏠 Come back tomorrow',
    correctOption: 'A',
  },
  disruptionEvent: {
    notification: '⚠️ News: The main market is closing early today due to a local event!',
    prompt: 'The market closes at 8am. You need to leave even earlier — move "Leave for market" to Step 6!',
    affectedCardId: 'leave',
    newPosition: 6,
  },
};

const HARD_CONTEXTS: RoutineContext[] = [MARKET_TRIP];

// ── Phase definition ─────────────────────────────────────────────────────────

type Phase = 'scenario_intro' | 'placement' | 'decision_branch' | 'disruption' | 'completion';
const PHASES: Phase[] = ['scenario_intro', 'placement', 'decision_branch', 'disruption', 'completion'];

// ── Component ────────────────────────────────────────────────────────────────

export default function MorningRoutineQuest({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASES);

  const routineContext = useMemo<RoutineContext>(() => {
    const pool =
      levelConfig.id === 'level_5'                                  ? HARD_CONTEXTS      :
      levelConfig.id === 'level_3' || levelConfig.id === 'level_4'  ? MEDIUM_CONTEXTS    :
      levelConfig.id === 'level_1'                                  ? VERY_EASY_CONTEXTS :
                                                                       EASY_CONTEXTS;
    return pool[Math.floor(Math.random() * pool.length)];
  }, []); // eslint-disable-line react-hooks/exhaustive-deps -- stable per mount

  const cardCount = levelConfig.params.cardCount as number;

  const [trayCards, setTrayCards] = useState<StepCard[]>(() =>
    [...routineContext.steps].sort(() => Math.random() - 0.5)
  );
  const [slots, setSlots] = useState<(StepCard | null)[]>(() => Array(cardCount).fill(null));
  const [selectedCard, setSelectedCard] = useState<StepCard | null>(null);
  const [wobbling, setWobbling] = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [firstAttemptPlacements, setFirstAttemptPlacements] = useState(0);
  const [decisionAnswer, setDecisionAnswer] = useState<'A' | 'B' | null>(null);
  const [, setDisruptionDone] = useState(false);

  const triedRef = useRef<Set<string>>(new Set());
  const startedAt = useRef(Date.now());

  const handleCardTap = useCallback((card: StepCard) => {
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
          if (levelConfig.params.decisionBranchEnabled) {
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
  }, [selectedCard, slots, goTo, levelConfig.params.decisionBranchEnabled, t]);

  function handleDecision(choice: 'A' | 'B') {
    setDecisionAnswer(choice);
    setTimeout(() => {
      if (levelConfig.params.disruptionEventEnabled) {
        advance(); // goes to disruption
      } else {
        goTo('completion');
      }
    }, 600);
  }

  function handleComplete() {
    const decisionCorrect =
      decisionAnswer === null ? null :
      decisionAnswer === routineContext.decisionBranch?.correctOption;

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
        <span className="text-7xl" aria-hidden="true">{routineContext.emoji}</span>
        <h2 className="text-h2 font-bold text-body-text">
          {routineContext.title}
        </h2>
        <p className="text-h3 text-caption-text">
          {t('morning-routine.intro.subtitle', 'Help arrange the morning steps in the right order')}
        </p>
        <p className="text-body-md text-body-text max-w-md">
          {routineContext.contextDescription}
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
                { label: selectedCard.label }
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
                'relative flex flex-col items-center justify-center min-h-[80px] min-w-[80px] rounded-2xl border-2',
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
              <span className="text-caption text-caption-text font-bold mb-1">
                {t('morning-routine.placement.stepLabel', 'Step {{number}}', { number: i + 1 })}
              </span>
              {card ? (
                <>
                  <span className="text-3xl" aria-hidden="true">{card.emoji}</span>
                  <span className="text-small text-body-text font-semibold mt-1">{card.label}</span>
                </>
              ) : (
                <span className="text-caption text-gray-300" aria-hidden="true">?</span>
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
                'flex flex-col items-center justify-center min-h-[80px] min-w-[80px] rounded-2xl p-3 transition-all',
                'bg-card-bg shadow-sm border-2',
                selectedCard?.id === card.id
                  ? 'border-primary-blue bg-hover-state'
                  : 'border-gray-200 hover:border-primary-blue',
              ].join(' ')}
              aria-label={card.label}
              aria-pressed={selectedCard?.id === card.id}
            >
              <span className="text-4xl" aria-hidden="true">{card.emoji}</span>
              <span className="text-caption text-body-text font-semibold mt-1 text-center leading-tight">{card.label}</span>
              <span className="text-small text-caption-text mt-0.5 text-center">{card.subLabel}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── decision_branch ────────────────────────────────────────────────────────

  if (currentPhase === 'decision_branch') {
    return (
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-app-bg text-center">
        <span className="text-6xl" aria-hidden="true">{routineContext.emoji}</span>
        <p className="text-h3 font-semibold text-body-text max-w-md">
          {routineContext.decisionBranch!.prompt}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button fullWidth onClick={() => handleDecision('A')}>
            {routineContext.decisionBranch!.optionA}
          </Button>
          <Button variant="secondary" fullWidth onClick={() => handleDecision('B')}>
            {routineContext.decisionBranch!.optionB}
          </Button>
        </div>
      </div>
    );
  }

  // ── disruption ─────────────────────────────────────────────────────────────

  if (currentPhase === 'disruption') {
    return (
      <div role="main" className="flex-1 flex flex-col items-center justify-center p-8 gap-6 bg-app-bg text-center">
        <span className="text-5xl" aria-hidden="true">⚠️</span>
        <p className="text-h2 font-bold text-body-text">
          {routineContext.disruptionEvent!.notification}
        </p>
        <p className="text-h3 text-caption-text max-w-md">
          {routineContext.disruptionEvent!.prompt}
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
      <span className="text-7xl" aria-hidden="true">{routineContext.emoji}🙏</span>
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
              className="flex flex-col items-center justify-center min-h-[80px] min-w-[80px] rounded-2xl border-2 bg-emerald-green/10 border-emerald-green p-2 text-center"
            >
              <span className="text-caption text-caption-text font-bold mb-1">
                {t('morning-routine.placement.stepLabel', 'Step {{number}}', { number: i + 1 })}
              </span>
              <span className="text-3xl" aria-hidden="true">{card.emoji}</span>
              <span className="text-small text-body-text font-semibold mt-1">{card.label}</span>
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
