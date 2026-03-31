import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

// ─── Types ────────────────────────────────────────────────────────────────────

interface RecipeStep {
  id: string;
  emoji: string;
  label: string;     // short: 1–2 words — shown on tray cards at medium difficulty
  subLabel: string;  // full context — shown at easy difficulty and always on intro/completion
  correctPosition: number;
}

interface RecipeDecision {
  prompt: string;
  optionA: string;
  optionB: string;
  optionC?: string;
  correctOption: 'A' | 'B' | 'C';
}

interface RecipeDefinition {
  emoji: string;
  name: string;
  description: string;
  steps: RecipeStep[];
  ingredientDecision?: RecipeDecision;
  midModification?: RecipeDecision;
}

// ─── Recipe data ──────────────────────────────────────────────────────────────

const RECIPES: Record<string, RecipeDefinition> = {
  idli_sambar: {
    emoji: '🍽️',
    name: 'Idli Sambar',
    description: 'Prepare soft idlis with hot sambar — a classic South Indian breakfast.',
    steps: [
      { id: 'soak',  emoji: '💧', label: 'Soak',  subLabel: 'Soak rice and dal in water',   correctPosition: 1 },
      { id: 'grind', emoji: '⚙️', label: 'Grind', subLabel: 'Grind into smooth batter',     correctPosition: 2 },
      { id: 'steam', emoji: '♨️', label: 'Steam', subLabel: 'Steam in idli vessel, 10 min', correctPosition: 3 },
      { id: 'serve', emoji: '🥘', label: 'Serve', subLabel: 'Serve with hot sambar',        correctPosition: 4 },
    ],
  },

  upma: {
    emoji: '🥣',
    name: 'Upma',
    description: 'Make a hearty savoury upma — a filling South Indian breakfast.',
    steps: [
      { id: 'roast',  emoji: '🔥', label: 'Roast',   subLabel: 'Dry roast rava until golden',  correctPosition: 1 },
      { id: 'temper', emoji: '🌿', label: 'Temper',  subLabel: 'Fry mustard and curry leaves', correctPosition: 2 },
      { id: 'vegs',   emoji: '🥕', label: 'Veggies', subLabel: 'Add onion, carrot, peas',      correctPosition: 3 },
      { id: 'water',  emoji: '💧', label: 'Boil',    subLabel: 'Add water and bring to boil',  correctPosition: 4 },
      { id: 'mix',    emoji: '🥣', label: 'Add rava', subLabel: 'Stir rava in slowly',          correctPosition: 5 },
    ],
  },

  poha: {
    emoji: '🍚',
    name: 'Poha',
    description: 'Prepare light and fluffy poha — quick and nourishing.',
    steps: [
      { id: 'rinse',  emoji: '💧', label: 'Rinse',  subLabel: 'Rinse poha and drain well',      correctPosition: 1 },
      { id: 'temper', emoji: '🌿', label: 'Temper', subLabel: 'Fry mustard and curry leaves',   correctPosition: 2 },
      { id: 'onion',  emoji: '🧅', label: 'Onion',  subLabel: 'Sauté onion until soft',         correctPosition: 3 },
      { id: 'mix',    emoji: '🥣', label: 'Mix',    subLabel: 'Add poha, turmeric and salt',    correctPosition: 4 },
    ],
  },

  pongal: {
    emoji: '🍲',
    name: 'Pongal',
    description: 'Cook a comforting pongal — creamy rice and lentils with spices.',
    steps: [
      { id: 'wash',   emoji: '💧', label: 'Wash',   subLabel: 'Wash rice and moong dal',       correctPosition: 1 },
      { id: 'cook',   emoji: '♨️', label: 'Cook',   subLabel: 'Pressure cook together',        correctPosition: 2 },
      { id: 'temper', emoji: '🌿', label: 'Temper', subLabel: 'Fry cumin, pepper, cashews',    correctPosition: 3 },
      { id: 'mix',    emoji: '🥣', label: 'Mix',    subLabel: 'Stir tempering into pongal',    correctPosition: 4 },
      { id: 'serve',  emoji: '🥘', label: 'Serve',  subLabel: 'Serve hot with coconut chutney',correctPosition: 5 },
    ],
  },

  rava_dosa: {
    emoji: '🫓',
    name: 'Rava Dosa',
    description: 'Make crispy rava dosas — a South Indian breakfast favourite.',
    steps: [
      { id: 'mix',    emoji: '🥣', label: 'Mix',    subLabel: 'Mix rava and rice flour',         correctPosition: 1 },
      { id: 'batter', emoji: '💧', label: 'Batter', subLabel: 'Add water — thin consistency',   correctPosition: 2 },
      { id: 'season', emoji: '🌿', label: 'Season', subLabel: 'Add onion and curry leaves',     correctPosition: 3 },
      { id: 'heat',   emoji: '🔥', label: 'Heat',   subLabel: 'Heat griddle with a little oil', correctPosition: 4 },
      { id: 'cook',   emoji: '🍳', label: 'Cook',   subLabel: 'Pour batter and cook crispy',    correctPosition: 5 },
    ],
    ingredientDecision: {
      prompt: 'You have run out of rava at home. What can you use instead?',
      optionA: 'Rice flour',
      optionB: 'Maida (plain flour)',
      optionC: 'Wheat flour',
      correctOption: 'A',
    },
  },

  chapati_sabzi: {
    emoji: '🫓',
    name: 'Chapati & Sabzi',
    description: 'Roll soft chapatis and pair with a simple vegetable sabzi.',
    steps: [
      { id: 'knead', emoji: '🤲', label: 'Knead',  subLabel: 'Knead wheat flour into soft dough', correctPosition: 1 },
      { id: 'rest',  emoji: '⏳', label: 'Rest',   subLabel: 'Let dough rest 20 minutes',          correctPosition: 2 },
      { id: 'roll',  emoji: '🫓', label: 'Roll',   subLabel: 'Roll into thin round circles',       correctPosition: 3 },
      { id: 'cook',  emoji: '🔥', label: 'Cook',   subLabel: 'Cook on hot griddle both sides',     correctPosition: 4 },
      { id: 'serve', emoji: '🥘', label: 'Serve',  subLabel: 'Serve hot with sabzi',               correctPosition: 5 },
    ],
    ingredientDecision: {
      prompt: 'You have no wheat flour at home. What can you use for chapati?',
      optionA: 'Ragi flour',
      optionB: 'Rice flour',
      optionC: 'Corn flour',
      correctOption: 'A',
    },
  },

  rasam: {
    emoji: '🫕',
    name: 'Rasam',
    description: 'Prepare a tangy, comforting rasam — perfect with steamed rice.',
    steps: [
      { id: 'soak',    emoji: '💧', label: 'Soak',    subLabel: 'Soak tamarind in warm water',        correctPosition: 1 },
      { id: 'squeeze', emoji: '🫙', label: 'Squeeze', subLabel: 'Extract and strain tamarind juice',  correctPosition: 2 },
      { id: 'tomato',  emoji: '🍅', label: 'Tomato',  subLabel: 'Add tomatoes, cook until soft',      correctPosition: 3 },
      { id: 'boil',    emoji: '♨️', label: 'Boil',    subLabel: 'Add tamarind water, bring to boil',  correctPosition: 4 },
      { id: 'spice',   emoji: '🌶️',label: 'Spice',   subLabel: 'Add rasam powder and salt',          correctPosition: 5 },
      { id: 'dal',     emoji: '🫘', label: 'Dal',     subLabel: 'Add cooked dal, stir and simmer',    correctPosition: 6 },
      { id: 'temper',  emoji: '🌿', label: 'Temper',  subLabel: 'Add mustard and curry leaves',       correctPosition: 7 },
    ],
    ingredientDecision: {
      prompt: 'You have no tamarind at home. What gives a similar tangy taste in rasam?',
      optionA: 'Raw mango juice',
      optionB: 'Plain water',
      optionC: 'Coconut milk',
      correctOption: 'A',
    },
    midModification: {
      prompt: 'You added too much water to the rasam. What would you do?',
      optionA: 'Boil on high heat to reduce',
      optionB: 'Add more rasam powder only',
      optionC: 'Add more tamarind water',
      correctOption: 'A',
    },
  },

  avial: {
    emoji: '🥘',
    name: 'Avial',
    description: 'Prepare a traditional avial — mixed vegetables with coconut and curd.',
    steps: [
      { id: 'chop',   emoji: '🔪', label: 'Chop',    subLabel: 'Chop vegetables into even pieces', correctPosition: 1 },
      { id: 'cook',   emoji: '♨️', label: 'Cook',    subLabel: 'Cook with turmeric and water',      correctPosition: 2 },
      { id: 'grind',  emoji: '⚙️', label: 'Grind',   subLabel: 'Grind coconut with cumin',          correctPosition: 3 },
      { id: 'coconut',emoji: '🥥', label: 'Coconut', subLabel: 'Mix coconut paste into vegetables', correctPosition: 4 },
      { id: 'curd',   emoji: '🫙', label: 'Curd',    subLabel: 'Stir in fresh curd gently',         correctPosition: 5 },
      { id: 'temper', emoji: '🌿', label: 'Temper',  subLabel: 'Add curry leaf tempering',          correctPosition: 6 },
      { id: 'serve',  emoji: '🍽️', label: 'Serve',   subLabel: 'Serve with rice and sambar',        correctPosition: 7 },
    ],
    ingredientDecision: {
      prompt: 'You have no fresh coconut. What can you use in avial?',
      optionA: 'Desiccated coconut',
      optionB: 'Milk',
      optionC: 'Groundnut powder',
      correctOption: 'A',
    },
    midModification: {
      prompt: 'The avial has become too watery. What would you do?',
      optionA: 'Cook on low heat to reduce',
      optionB: 'Add more curd',
      optionC: 'Add more coconut paste',
      correctOption: 'A',
    },
  },

  rava_kesari: {
    emoji: '🍮',
    name: 'Rava Kesari',
    description: 'Make a sweet, fragrant rava kesari — a festive South Indian dessert.',
    steps: [
      { id: 'roast',    emoji: '🔥', label: 'Roast',    subLabel: 'Roast rava in ghee until golden', correctPosition: 1 },
      { id: 'boil',     emoji: '💧', label: 'Boil',     subLabel: 'Boil water separately',           correctPosition: 2 },
      { id: 'add_rava', emoji: '🥣', label: 'Add rava', subLabel: 'Pour rava in, stir quickly',      correctPosition: 3 },
      { id: 'sugar',    emoji: '🍬', label: 'Sugar',    subLabel: 'Add sugar and stir well',         correctPosition: 4 },
      { id: 'colour',   emoji: '🌼', label: 'Colour',   subLabel: 'Add saffron or food colour',      correctPosition: 5 },
      { id: 'nuts',     emoji: '🥜', label: 'Nuts',     subLabel: 'Add cashews and raisins',         correctPosition: 6 },
      { id: 'serve',    emoji: '🍮', label: 'Serve',    subLabel: 'Serve warm, topped with ghee',    correctPosition: 7 },
    ],
    ingredientDecision: {
      prompt: 'You have no saffron. What gives a similar yellow colour to kesari?',
      optionA: 'A pinch of turmeric',
      optionB: 'A pinch of pepper',
      optionC: 'A pinch of red chilli',
      correctOption: 'A',
    },
    midModification: {
      prompt: 'The kesari has lumps forming. What would you do?',
      optionA: 'Stir quickly on low heat',
      optionB: 'Add cold water',
      optionC: 'Add more sugar',
      correctOption: 'A',
    },
  },
};

function getRecipe(levelConfig: LevelConfig): RecipeDefinition {
  const name = (levelConfig.params as Record<string, unknown>).recipe as string | undefined;
  return RECIPES[name ?? 'idli_sambar'] ?? RECIPES['idli_sambar'];
}

// ─── Phases ───────────────────────────────────────────────────────────────────

type Phase = 'recipe_intro' | 'step_ordering' | 'step_complete' | 'ingredient_decision' | 'mid_modification' | 'completion';
const PHASE_LIST: Phase[] = ['recipe_intro', 'step_ordering', 'step_complete', 'ingredient_decision', 'mid_modification', 'completion'];

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Decision button ──────────────────────────────────────────────────────────

function DecisionButton({
  label,
  selected,
  onClick,
}: {
  label: string;
  selected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={[
        'w-full min-h-[70px] rounded-2xl border-2 px-5 py-3',
        'text-body-md font-semibold text-left transition-all active:scale-[0.98]',
        selected
          ? 'bg-primary-blue text-white border-primary-blue'
          : 'bg-card-bg text-body-text border-gray-200 hover:border-primary-blue',
      ].join(' ')}
    >
      {label}
    </button>
  );
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeBuilder({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASE_LIST);
  const startedAt = useRef(Date.now());

  const [recipe] = useState(() => getRecipe(levelConfig));
  const p = levelConfig.params as Record<string, unknown>;
  const cardCount = recipe.steps.length;
  const cardDetail = (p.cardDetail as string) ?? 'full';
  const optionCount = (p.optionCount as number) ?? 2;

  const [trayCards, setTrayCards] = useState<RecipeStep[]>(() =>
    [...recipe.steps].sort(() => Math.random() - 0.5),
  );
  const [slots, setSlots] = useState<(RecipeStep | null)[]>(() => Array(cardCount).fill(null));
  const [nextSlotIndex, setNextSlotIndex] = useState(0);
  const [dimmedCardId, setDimmedCardId] = useState<string | null>(null);

  const [firstChoiceCorrect, setFirstChoiceCorrect] = useState(0);
  const [ingredientAnswer, setIngredientAnswer] = useState<'A' | 'B' | 'C' | null>(null);
  const [midAnswer, setMidAnswer] = useState<'A' | 'B' | 'C' | null>(null);

  // Track slots where a wrong attempt was already made (so first-attempt bonus isn't awarded)
  const slotAttempted = useRef<Set<number>>(new Set());

  const handleCardTap = useCallback((card: RecipeStep) => {
    if (slots[nextSlotIndex] !== null) return;

    if (card.correctPosition === nextSlotIndex + 1) {
      const isFirstAttempt = !slotAttempted.current.has(nextSlotIndex);
      if (isFirstAttempt) setFirstChoiceCorrect(n => n + 1);

      const next = [...slots];
      next[nextSlotIndex] = card;
      setSlots(next);
      setTrayCards(prev => prev.filter(c => c.id !== card.id));
      setNextSlotIndex(nextSlotIndex + 1);

      if (next.every(s => s !== null)) {
        setTimeout(() => goTo('step_complete'), 600);
      }
    } else {
      // Wrong — dim card briefly only, per spec: no message, no wobble
      slotAttempted.current.add(nextSlotIndex);
      setDimmedCardId(card.id);
      setTimeout(() => setDimmedCardId(null), 400);
    }
  }, [slots, nextSlotIndex, goTo]);

  function handleReset() {
    setSlots(Array(cardCount).fill(null));
    setTrayCards([...recipe.steps].sort(() => Math.random() - 0.5));
    setNextSlotIndex(0);
    setDimmedCardId(null);
    setFirstChoiceCorrect(0);
    slotAttempted.current = new Set();
  }

  function handleIngredientDecision(choice: 'A' | 'B' | 'C') {
    setIngredientAnswer(choice);
    setTimeout(() => {
      if (p.midRecipeModificationEnabled && recipe.midModification) {
        advance();
      } else {
        goTo('completion');
      }
    }, 600);
  }

  function handleMidDecision(choice: 'A' | 'B' | 'C') {
    setMidAnswer(choice);
    setTimeout(() => goTo('completion'), 600);
  }

  function handleComplete() {
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        firstChoiceCorrect,
        totalSteps: cardCount,
        ingredientDecisionCorrect:
          ingredientAnswer === null ? null :
          ingredientAnswer === recipe.ingredientDecision?.correctOption,
        midModificationCorrect:
          midAnswer === null ? null :
          midAnswer === recipe.midModification?.correctOption,
      },
    });
  }

  // ── Recipe intro — show steps in order, full detail, so user can study ────

  if (currentPhase === 'recipe_intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-5 text-center bg-app-bg">
        <span className="text-7xl">{recipe.emoji}</span>
        <h2 className="game-title-banner game-title-banner-compact text-center">{recipe.name}</h2>
        <p className="text-h3 text-caption-text max-w-md">{recipe.description}</p>

        <div className="flex flex-col gap-2 w-full max-w-sm text-left">
          {recipe.steps.map((step, i) => (
            <div
              key={step.id}
              className="flex items-center gap-3 bg-card-bg rounded-2xl px-4 py-3 border border-gray-100 shadow-sm"
            >
              <span className="text-caption-text font-bold w-5 flex-shrink-0">{i + 1}</span>
              <span className="text-2xl">{step.emoji}</span>
              <span className="text-body-md text-body-text">{step.subLabel}</span>
            </div>
          ))}
        </div>

        <p className="text-body-md text-caption-text">
          {t('recipe-builder.intro.instruction', 'Remember the order — then arrange the steps!')}
        </p>
        <div className="w-full max-w-sm">
          <Button fullWidth onClick={advance}>
            {t('recipe-builder.intro.begin', "Let's Cook!")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step ordering — single tap places in the next slot ────────────────────

  if (currentPhase === 'step_ordering') {
    return (
      <div className="flex-1 flex flex-col p-5 gap-4 bg-[#FAFAF8]">

        <div className="flex items-center justify-between">
          <p className="text-body-md text-caption-text">
            {t('recipe-builder.placement.instruction', 'Tap the steps in the correct order')}
          </p>
          <button
            onClick={handleReset}
            className="text-body-md text-caption-text border border-gray-200 rounded-xl
                       px-3 py-1 hover:bg-gray-50 active:bg-gray-100 transition-colors"
          >
            {t('btn.startOver', 'Start over')}
          </button>
        </div>

        {/* Slots — vertical column, active slot highlighted */}
        <div className="flex flex-col gap-2 w-full max-w-md mx-auto">
          {slots.map((card, i) => (
            <div
              key={i}
              className={[
                'flex items-center gap-3 min-h-[64px] rounded-2xl border-2 px-4 transition-all',
                card
                  ? 'bg-emerald-green/10 border-emerald-green'
                  : i === nextSlotIndex
                  ? 'bg-primary-blue/5 border-primary-blue border-dashed'
                  : 'bg-white border-gray-200',
              ].join(' ')}
            >
              <span className={`text-body-md font-bold w-6 text-center flex-shrink-0 ${card ? 'text-emerald-green' : 'text-caption-text'}`}>
                {i + 1}
              </span>
              {card ? (
                <>
                  <span className="text-2xl">{card.emoji}</span>
                  <span className="text-body-md font-semibold text-body-text flex-1">{card.subLabel}</span>
                  <span className="text-emerald-green font-bold">✓</span>
                </>
              ) : i === nextSlotIndex ? (
                <span className="text-body-md text-primary-blue">
                  {t('recipe-builder.slot.active', 'Tap a card below')}
                </span>
              ) : (
                <span className="text-body-md text-gray-300">—</span>
              )}
            </div>
          ))}
        </div>

        {/* Tray cards */}
        <div className="flex gap-3 flex-wrap justify-center w-full mt-auto pt-2">
          {trayCards.map(card => {
            const isDimmed = dimmedCardId === card.id;
            return (
              <button
                key={card.id}
                onClick={() => handleCardTap(card)}
                aria-label={card.subLabel}
                className={[
                  'flex flex-col items-center justify-center rounded-2xl border-2 p-3',
                  'bg-card-bg shadow-sm transition-all active:scale-95',
                  cardDetail === 'emoji' ? 'min-w-[80px] min-h-[80px]' : 'min-w-[100px] min-h-[96px]',
                  isDimmed
                    ? 'border-gray-200 opacity-40 pointer-events-none'
                    : 'border-gray-200 hover:border-primary-blue',
                ].join(' ')}
              >
                <span className="text-4xl">{card.emoji}</span>
                {cardDetail !== 'emoji' && (
                  <span className="text-sm font-semibold text-body-text mt-1 text-center leading-tight">
                    {card.label}
                  </span>
                )}
                {cardDetail === 'full' && (
                  <span className="text-xs text-caption-text mt-0.5 text-center leading-tight">
                    {card.subLabel}
                  </span>
                )}
              </button>
            );
          })}
        </div>
      </div>
    );
  }

  // ── Step complete — celebrate before moving to decision phases ────────────

  if (currentPhase === 'step_complete') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-7xl">{recipe.emoji}</span>
        <h2 className="text-h2 font-bold text-body-text">
          {t('recipe-builder.step_complete.title', 'Well done!')}
        </h2>
        <p className="text-h3 text-caption-text max-w-md">
          {t('recipe-builder.step_complete.message', 'You arranged all the cooking steps correctly.')}
        </p>
        <div className="w-full max-w-sm">
          <Button
            fullWidth
            onClick={() =>
              p.ingredientDecisionEnabled && recipe.ingredientDecision
                ? advance()
                : goTo('completion')
            }
          >
            {t('btn.continue', 'Continue')}
          </Button>
        </div>
      </div>
    );
  }

  // ── Ingredient decision ───────────────────────────────────────────────────

  if (currentPhase === 'ingredient_decision') {
    const dec = recipe.ingredientDecision!;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-5xl">🛒</span>
        <p className="text-h2 font-semibold text-body-text max-w-md leading-snug">{dec.prompt}</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <DecisionButton label={dec.optionA} selected={ingredientAnswer === 'A'} onClick={() => handleIngredientDecision('A')} />
          <DecisionButton label={dec.optionB} selected={ingredientAnswer === 'B'} onClick={() => handleIngredientDecision('B')} />
          {dec.optionC && optionCount >= 3 && (
            <DecisionButton label={dec.optionC} selected={ingredientAnswer === 'C'} onClick={() => handleIngredientDecision('C')} />
          )}
        </div>
      </div>
    );
  }

  // ── Mid-recipe scenario — neutral framing, no "Oops!" ────────────────────

  if (currentPhase === 'mid_modification') {
    const mod = recipe.midModification!;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-5xl">🍳</span>
        <p className="text-h2 font-semibold text-body-text max-w-md leading-snug">{mod.prompt}</p>
        <p className="text-body-md text-caption-text">
          {t('recipe-builder.mid.cue', 'What would you do?')}
        </p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <DecisionButton label={mod.optionA} selected={midAnswer === 'A'} onClick={() => handleMidDecision('A')} />
          <DecisionButton label={mod.optionB} selected={midAnswer === 'B'} onClick={() => handleMidDecision('B')} />
          {mod.optionC && optionCount >= 3 && (
            <DecisionButton label={mod.optionC} selected={midAnswer === 'C'} onClick={() => handleMidDecision('C')} />
          )}
        </div>
      </div>
    );
  }

  // ── Completion ────────────────────────────────────────────────────────────

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
      <span className="text-7xl">{recipe.emoji}🙏</span>
      <h2 className="text-h2 font-bold text-body-text">
        {t('recipe-builder.completion.title', 'Wonderful cooking!')}
      </h2>
      <p className="text-h3 text-caption-text">
        {t('recipe-builder.completion.message', 'You prepared the recipe in the right order.')}
      </p>

      {/* Summary — vertical, always full detail */}
      <div className="flex flex-col gap-2 w-full max-w-sm">
        {slots.map((card, i) => card ? (
          <div
            key={card.id}
            className="flex items-center gap-3 bg-emerald-green/10 border border-emerald-green/30
                       rounded-2xl px-4 py-3"
          >
            <span className="text-caption-text font-bold w-5 text-center flex-shrink-0">{i + 1}</span>
            <span className="text-2xl">{card.emoji}</span>
            <span className="text-body-md font-semibold text-body-text text-left">{card.subLabel}</span>
          </div>
        ) : null)}
      </div>

      <div className="w-full max-w-sm mt-2">
        <Button fullWidth onClick={handleComplete}>
          {t('recipe-builder.completion.continue', 'Continue')}
        </Button>
      </div>
    </div>
  );
}
