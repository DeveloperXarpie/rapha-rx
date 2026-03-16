import { useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

// ─── Recipe definitions ───────────────────────────────────────────────────────

interface RecipeStep {
  id: string;
  emoji: string;
  label: string;
  subLabel: string;
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

const RECIPES: Record<string, RecipeDefinition> = {
  idli_sambar: {
    emoji: '🍽️',
    name: 'Idli Sambar',
    description: 'Prepare a classic South Indian breakfast — soft idlis with hot sambar.',
    steps: [
      { id: 'soak',  emoji: '💧', label: 'Soak rice and dal',  subLabel: 'Rinse and soak for 4 hours',  correctPosition: 1 },
      { id: 'grind', emoji: '⚙️',  label: 'Grind the batter',  subLabel: 'Until smooth and fluffy',     correctPosition: 2 },
      { id: 'steam', emoji: '♨️',  label: 'Steam the idlis',   subLabel: 'In idli vessel, 10 min',      correctPosition: 3 },
      { id: 'serve', emoji: '🥘',  label: 'Serve with sambar', subLabel: 'Hot with coconut chutney',    correctPosition: 4 },
    ],
  },

  rava_dosa: {
    emoji: '🫓',
    name: 'Rava Dosa',
    description: 'Make crispy rava dosas — a South Indian breakfast favourite.',
    steps: [
      { id: 'mix',    emoji: '🥣',  label: 'Mix rava and rice flour', subLabel: 'In a large bowl',            correctPosition: 1 },
      { id: 'batter', emoji: '💧',  label: 'Add water and mix',       subLabel: 'Thin, pouring consistency',  correctPosition: 2 },
      { id: 'season', emoji: '🌿',  label: 'Add onion and spices',    subLabel: 'Curry leaves and cumin',     correctPosition: 3 },
      { id: 'heat',   emoji: '🔥',  label: 'Heat the griddle',        subLabel: 'Add a little oil',           correctPosition: 4 },
      { id: 'cook',   emoji: '🍳',  label: 'Pour and cook dosa',      subLabel: 'Until crispy and golden',    correctPosition: 5 },
    ],
    ingredientDecision: {
      prompt: 'You have run out of rava (semolina) at home. What can you use instead?',
      optionA: 'Rice flour',
      optionB: 'Maida (plain flour)',
      correctOption: 'A',
    },
  },

  rasam: {
    emoji: '🫕',
    name: 'Rasam',
    description: 'Prepare a comforting, tangy rasam — perfect with steamed rice.',
    steps: [
      { id: 'soak',    emoji: '💧',  label: 'Soak tamarind',          subLabel: 'In warm water, 15 min',        correctPosition: 1 },
      { id: 'squeeze', emoji: '🫙',  label: 'Extract tamarind juice', subLabel: 'Squeeze out and strain',       correctPosition: 2 },
      { id: 'tomato',  emoji: '🍅',  label: 'Add tomatoes to pot',    subLabel: 'Cook until soft',              correctPosition: 3 },
      { id: 'boil',    emoji: '♨️',  label: 'Add tamarind water',     subLabel: 'Bring to boil',                correctPosition: 4 },
      { id: 'powder',  emoji: '🌶️', label: 'Add rasam powder',       subLabel: 'And salt to taste',            correctPosition: 5 },
      { id: 'dal',     emoji: '🫘',  label: 'Add cooked dal',         subLabel: 'Stir and simmer',              correctPosition: 6 },
      { id: 'temper',  emoji: '🌿',  label: 'Add tempering',          subLabel: 'Mustard seeds, curry leaves',  correctPosition: 7 },
    ],
    ingredientDecision: {
      prompt: 'You have no tamarind at home. What gives a similar tangy taste?',
      optionA: 'Raw mango juice',
      optionB: 'Plain water',
      correctOption: 'A',
    },
    midModification: {
      prompt: 'You accidentally added too much water! What do you do?',
      optionA: 'Boil on high heat to reduce the liquid',
      optionB: 'Add more rasam powder only',
      correctOption: 'A',
    },
  },

  // Extra recipes for any future level configs
  upma: {
    emoji: '🥣',
    name: 'Upma',
    description: 'Make a delicious savoury upma — a hearty South Indian breakfast.',
    steps: [
      { id: 'roast',  emoji: '🔥', label: 'Dry roast rava',    subLabel: 'Until light golden',    correctPosition: 1 },
      { id: 'temper', emoji: '🌿', label: 'Prepare tempering', subLabel: 'Mustard, curry leaves', correctPosition: 2 },
      { id: 'vegs',   emoji: '🥕', label: 'Add vegetables',    subLabel: 'Onion, carrot, peas',   correctPosition: 3 },
      { id: 'water',  emoji: '💧', label: 'Add water and boil',subLabel: 'Bring to a boil',       correctPosition: 4 },
      { id: 'mix',    emoji: '🥣', label: 'Add rava and stir', subLabel: 'Stir to avoid lumps!',  correctPosition: 5 },
    ],
  },

  poha: {
    emoji: '🍚',
    name: 'Poha',
    description: 'Prepare light and fluffy poha — quick and nourishing.',
    steps: [
      { id: 'rinse',  emoji: '💧', label: 'Rinse the poha',    subLabel: 'Drain well',                    correctPosition: 1 },
      { id: 'temper', emoji: '🌿', label: 'Prepare tempering', subLabel: 'Mustard seeds, curry leaves',   correctPosition: 2 },
      { id: 'onion',  emoji: '🧅', label: 'Add onion',         subLabel: 'Sauté until soft',              correctPosition: 3 },
      { id: 'mix',    emoji: '🥣', label: 'Mix in poha',       subLabel: 'Add turmeric and salt',         correctPosition: 4 },
    ],
  },
};

function getRecipe(levelConfig: LevelConfig): RecipeDefinition {
  const name = (levelConfig.params as Record<string, unknown>).recipe as string | undefined;
  return RECIPES[name ?? 'idli_sambar'] ?? RECIPES['idli_sambar'];
}

// ─── Phases ───────────────────────────────────────────────────────────────────

type Phase = 'recipe_intro' | 'step_ordering' | 'ingredient_decision' | 'mid_modification' | 'completion';
const PHASE_LIST: Phase[] = ['recipe_intro', 'step_ordering', 'ingredient_decision', 'mid_modification', 'completion'];

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Component ────────────────────────────────────────────────────────────────

export default function RecipeBuilder({ levelConfig, onLevelComplete }: Props) {
  const { t }                       = useTranslation();
  const { currentPhase, advance, goTo } = useGamePhase<Phase>(PHASE_LIST);
  const startedAt                   = useRef(Date.now());

  const [recipe]    = useState(() => getRecipe(levelConfig));
  const p           = levelConfig.params as Record<string, unknown>;
  const cardCount   = recipe.steps.length;

  const [trayCards, setTrayCards]   = useState<RecipeStep[]>(() =>
    [...recipe.steps].sort(() => Math.random() - 0.5),
  );
  const [slots, setSlots]           = useState<(RecipeStep | null)[]>(() => Array(cardCount).fill(null));
  const [selectedCard, setSelected] = useState<RecipeStep | null>(null);
  const [wobbling, setWobbling]     = useState<string | null>(null);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [firstChoiceCorrect, setFirstChoiceCorrect] = useState(0);
  const [ingredientAnswer, setIngredientAnswer]     = useState<'A' | 'B' | 'C' | null>(null);
  const [midAnswer, setMidAnswer]                   = useState<'A' | 'B' | 'C' | null>(null);

  const triedRef = useRef<Set<string>>(new Set());

  const handleCardTap = useCallback((card: RecipeStep) => {
    setSelected(prev => prev?.id === card.id ? null : card);
  }, []);

  const handleSlotTap = useCallback((slotNumber: number) => {
    if (!selectedCard) return;
    if (slots[slotNumber - 1] !== null) return;

    const key     = `${selectedCard.id}-${slotNumber}`;
    const isFirst = !triedRef.current.has(key);
    triedRef.current.add(key);

    if (selectedCard.correctPosition === slotNumber) {
      if (isFirst) setFirstChoiceCorrect(n => n + 1);
      const next = [...slots];
      next[slotNumber - 1] = selectedCard;
      setSlots(next);
      setTrayCards(prev => prev.filter(c => c.id !== selectedCard.id));
      setSelected(null);
      setFeedbackMsg(null);

      if (next.every(s => s !== null)) {
        setTimeout(() => {
          if (p.ingredientDecisionEnabled && recipe.ingredientDecision) {
            goTo('ingredient_decision');
          } else {
            goTo('completion');
          }
        }, 700);
      }
    } else {
      setWobbling(selectedCard.id);
      setFeedbackMsg(t('recipe-builder.placement.wrong', 'That step goes somewhere else. Try again!'));
      setSelected(null);
      setTimeout(() => setWobbling(null), 600);
      setTimeout(() => setFeedbackMsg(null), 2000);
    }
  }, [selectedCard, slots, p.ingredientDecisionEnabled, recipe.ingredientDecision, goTo, t]);

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
    const ingredientCorrect =
      ingredientAnswer === null ? null :
      ingredientAnswer === recipe.ingredientDecision?.correctOption;
    const midCorrect =
      midAnswer === null ? null :
      midAnswer === recipe.midModification?.correctOption;

    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        firstChoiceCorrect,
        totalSteps: cardCount,
        ingredientDecisionCorrect: ingredientCorrect,
        midModificationCorrect: midCorrect,
      },
    });
  }

  // ── Recipe intro ──────────────────────────────────────────────────────────────
  if (currentPhase === 'recipe_intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-7xl">{recipe.emoji}</span>
        <h2 className="game-title-banner game-title-banner-compact text-center">{recipe.name}</h2>
        <p className="text-h3 text-caption-text max-w-md">{recipe.description}</p>
        <p className="text-body-md text-caption-text">
          {t('recipe-builder.intro.instruction', 'Arrange the cooking steps in the correct order')}
        </p>
        <div className="w-full max-w-sm mt-2">
          <Button fullWidth className="btn-ready" onClick={advance}>
            {t('recipe-builder.intro.begin', "Let's Cook!")}
          </Button>
        </div>
      </div>
    );
  }

  // ── Step ordering ─────────────────────────────────────────────────────────────
  if (currentPhase === 'step_ordering') {
    return (
      <div className="flex-1 flex flex-col p-4 gap-4 bg-[#FAFAF8]">
        <style>{`@keyframes wobble{0%,100%{transform:rotate(0)}20%{transform:rotate(-8deg)}40%{transform:rotate(8deg)}60%{transform:rotate(-5deg)}80%{transform:rotate(5deg)}}`}</style>

        <p className="text-body-md text-body-text text-center w-full" role="status">
          {selectedCard
            ? t('recipe-builder.placement.selected', "Now tap the step number where '{{label}}' belongs", { label: selectedCard.label })
            : t('recipe-builder.placement.instruction', 'Tap a card, then tap the step number where it belongs')}
        </p>

        {/* Slots */}
        <div className="flex gap-2 flex-wrap justify-center w-full">
          {slots.map((card, i) => (
            <div
              key={i}
              onClick={() => handleSlotTap(i + 1)}
              className={[
                'flex flex-col items-center justify-center min-h-[96px] min-w-[96px]',
                'rounded-2xl border-2 p-2 text-center transition-all',
                card
                  ? 'bg-emerald-green/10 border-emerald-green'
                  : 'bg-app-bg border-dashed border-gray-300',
                selectedCard && !card ? 'border-primary-blue cursor-pointer' : '',
              ].filter(Boolean).join(' ')}
              aria-label={`Step ${i + 1}${card ? ': ' + card.label : ' — empty'}`}
            >
              <span className="text-sm text-caption-text font-bold mb-1">
                {t('recipe-builder.step', 'Step {{n}}', { n: i + 1 })}
              </span>
              {card ? (
                <>
                  <span className="text-3xl">{card.emoji}</span>
                  <span className="text-xs text-body-text font-semibold mt-1 leading-tight text-center">{card.label}</span>
                </>
              ) : (
                <span className="text-2xl text-gray-300">?</span>
              )}
            </div>
          ))}
        </div>

        {/* Feedback */}
        {feedbackMsg && (
          <div className="bg-accent-amber/10 border border-accent-amber rounded-xl px-4 py-3
                          text-body-md text-body-text text-center w-full" role="status">
            {feedbackMsg}
          </div>
        )}

        {/* Tray */}
        <div className="flex gap-2 flex-wrap justify-center w-full mt-2">
          {trayCards.map(card => (
            <button
              key={card.id}
              onClick={() => handleCardTap(card)}
              style={wobbling === card.id ? { animation: 'wobble 0.5s ease-in-out' } : undefined}
              className={[
                'flex flex-col items-center justify-center min-h-[96px] min-w-[96px]',
                'rounded-2xl p-3 transition-all bg-card-bg shadow-sm border-2',
                selectedCard?.id === card.id
                  ? 'border-primary-blue bg-hover-state'
                  : 'border-gray-200 hover:border-primary-blue',
              ].join(' ')}
              aria-pressed={selectedCard?.id === card.id}
              aria-label={card.label}
            >
              <span className="text-4xl">{card.emoji}</span>
              <span className="text-sm text-body-text font-semibold mt-1 text-center leading-tight">{card.label}</span>
              <span className="text-xs text-caption-text mt-0.5 text-center leading-tight">{card.subLabel}</span>
            </button>
          ))}
        </div>
      </div>
    );
  }

  // ── Ingredient decision ───────────────────────────────────────────────────────
  if (currentPhase === 'ingredient_decision') {
    const dec = recipe.ingredientDecision!;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-5xl">🛒</span>
        <p className="text-h3 font-semibold text-body-text max-w-md">{dec.prompt}</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button
            fullWidth
            variant={ingredientAnswer === 'A' ? 'primary' : 'secondary'}
            onClick={() => handleIngredientDecision('A')}
          >
            {dec.optionA}
          </Button>
          <Button
            fullWidth
            variant={ingredientAnswer === 'B' ? 'primary' : 'secondary'}
            onClick={() => handleIngredientDecision('B')}
          >
            {dec.optionB}
          </Button>
          {dec.optionC && (
            <Button
              fullWidth
              variant={ingredientAnswer === 'C' ? 'primary' : 'secondary'}
              onClick={() => handleIngredientDecision('C')}
            >
              {dec.optionC}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Mid-recipe modification ───────────────────────────────────────────────────
  if (currentPhase === 'mid_modification') {
    const mod = recipe.midModification!;
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
        <span className="text-5xl">⚠️</span>
        <h2 className="text-h2 font-bold text-body-text">Oops!</h2>
        <p className="text-h3 text-caption-text max-w-md">{mod.prompt}</p>
        <div className="flex flex-col gap-4 w-full max-w-sm">
          <Button
            fullWidth
            variant={midAnswer === 'A' ? 'primary' : 'secondary'}
            onClick={() => handleMidDecision('A')}
          >
            {mod.optionA}
          </Button>
          <Button
            fullWidth
            variant={midAnswer === 'B' ? 'primary' : 'secondary'}
            onClick={() => handleMidDecision('B')}
          >
            {mod.optionB}
          </Button>
          {mod.optionC && (
            <Button
              fullWidth
              variant={midAnswer === 'C' ? 'primary' : 'secondary'}
              onClick={() => handleMidDecision('C')}
            >
              {mod.optionC}
            </Button>
          )}
        </div>
      </div>
    );
  }

  // ── Completion ────────────────────────────────────────────────────────────────
  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center bg-app-bg">
      <span className="text-7xl">{recipe.emoji}🙏</span>
      <h2 className="text-h2 font-bold text-body-text">
        {t('recipe-builder.completion.title', 'Wonderful cooking!')}
      </h2>
      <p className="text-h3 text-caption-text">
        {t('recipe-builder.completion.message', 'You prepared the recipe in the right order.')}
      </p>

      {/* Summary row */}
      <div className="flex gap-2 flex-wrap justify-center w-full max-w-lg">
        {slots.map((card, i) => card ? (
          <div
            key={card.id}
            className="flex flex-col items-center justify-center min-h-[80px] min-w-[80px]
                       rounded-2xl border-2 bg-emerald-green/10 border-emerald-green p-2 text-center"
          >
            <span className="text-xs text-caption-text font-bold mb-1">Step {i + 1}</span>
            <span className="text-3xl">{card.emoji}</span>
            <span className="text-xs text-body-text font-semibold mt-1 leading-tight">{card.label}</span>
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
