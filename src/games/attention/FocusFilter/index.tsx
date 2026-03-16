import { useState, useRef } from 'react';
import { useTranslation } from 'react-i18next';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';
import AssetPanel from '../../../components/AssetPanel';
import { registerAsset } from '../../../lib/assets/catalog';

// ─── Types ────────────────────────────────────────────────────────────────────

interface FocusFilterParams {
  questionCount: number;
  outlierType: 'obvious' | 'subtle' | 'overlapping_category';
  categoryLabelVisible: 'always' | 'intro_only' | 'never';
  categoryPool: 'south_indian_food' | 'animals' | 'household_tools' | 'garden_plants';
}

interface Question {
  pool: string;
  outlierType: string;
  categoryHint: string;
  items: { assetId: string; label: string; panelColorClass?: string }[];
  outlierIndex: number;
}

interface RawQuestion {
  pool: string;
  outlierType: string;
  categoryHint: string;
  items: { emoji: string; label: string; panelColorClass?: string }[];
  outlierIndex: number;
}

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Question Bank ────────────────────────────────────────────────────────────

const RAW_QUESTIONS: RawQuestion[] = [
  // ── south_indian_food × obvious ───────────────────────────────────────────
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'Breakfast Items',
    items: [
      { emoji: '🫓', label: 'Idli' },
      { emoji: '🥞', label: 'Dosa' },
      { emoji: '🍩', label: 'Vada' },
      { emoji: '🍔', label: 'Burger' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'Chutneys',
    items: [
      { emoji: '🥥', label: 'Coconut Chutney' },
      { emoji: '🍅', label: 'Tomato Chutney' },
      { emoji: '🌿', label: 'Mint Chutney' },
      { emoji: '☕', label: 'Coffee' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'South Indian Sweets',
    items: [
      { emoji: '🟡', label: 'Mysore Pak' },
      { emoji: '🍮', label: 'Payasam' },
      { emoji: '🍯', label: 'Halwa' },
      { emoji: '🍲', label: 'Sambar' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'Hot Drinks',
    items: [
      { emoji: '☕', label: 'Filter Coffee' },
      { emoji: '🍵', label: 'Ginger Tea' },
      { emoji: '🥛', label: 'Badam Milk' },
      { emoji: '🍲', label: 'Rasam' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'Savoury Snacks',
    items: [
      { emoji: '🧆', label: 'Murukku' },
      { emoji: '🟤', label: 'Mixture' },
      { emoji: '🥜', label: 'Masala Peanuts' },
      { emoji: '🍰', label: 'Cake' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'south_indian_food', outlierType: 'obvious',
    categoryHint: 'Rice Dishes',
    items: [
      { emoji: '🍚', label: 'Curd Rice' },
      { emoji: '🍋', label: 'Lemon Rice' },
      { emoji: '🫕', label: 'Pongal' },
      { emoji: '🍕', label: 'Pizza' },
    ],
    outlierIndex: 3,
  },

  // ── animals × subtle ─────────────────────────────────────────────────────
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Domestic Animals',
    items: [
      { emoji: '🐄', label: 'Cow' },
      { emoji: '🐐', label: 'Goat' },
      { emoji: '🐕', label: 'Dog' },
      { emoji: '🐯', label: 'Tiger' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Birds',
    items: [
      { emoji: '🐦', label: 'Crow' },
      { emoji: '🕊️', label: 'Pigeon' },
      { emoji: '🦜', label: 'Parrot' },
      { emoji: '🐟', label: 'Fish' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Water Animals',
    items: [
      { emoji: '🐟', label: 'Fish' },
      { emoji: '🦀', label: 'Crab' },
      { emoji: '🐸', label: 'Frog' },
      { emoji: '🦅', label: 'Eagle' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Farm Animals',
    items: [
      { emoji: '🐓', label: 'Hen' },
      { emoji: '🦆', label: 'Duck' },
      { emoji: '🐐', label: 'Goat' },
      { emoji: '🦁', label: 'Lion' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Animals with 4 Legs',
    items: [
      { emoji: '🐄', label: 'Cow' },
      { emoji: '🐕', label: 'Dog' },
      { emoji: '🐈', label: 'Cat' },
      { emoji: '🐍', label: 'Snake' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Animals that Swim',
    items: [
      { emoji: '🐟', label: 'Fish' },
      { emoji: '🐊', label: 'Crocodile' },
      { emoji: '🐢', label: 'Turtle' },
      { emoji: '🐦', label: 'Sparrow' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'animals', outlierType: 'subtle',
    categoryHint: 'Night Animals',
    items: [
      { emoji: '🦉', label: 'Owl' },
      { emoji: '🦇', label: 'Bat' },
      { emoji: '🐈', label: 'Cat' },
      { emoji: '🐦', label: 'Crow' },
    ],
    outlierIndex: 3,
  },

  // ── household_tools × overlapping_category ────────────────────────────────
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Kitchen Vessels',
    items: [
      { emoji: '🍳', label: 'Pan' },
      { emoji: '🥘', label: 'Wok' },
      { emoji: '🫕', label: 'Pressure Cooker' },
      { emoji: '🪣', label: 'Garden Bucket' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Indoor Cleaning',
    items: [
      { emoji: '🧹', label: 'Broom' },
      { emoji: '🧽', label: 'Sponge' },
      { emoji: '🪣', label: 'Mop Bucket' },
      { emoji: '⛏️', label: 'Garden Spade' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Repair Tools',
    items: [
      { emoji: '🔨', label: 'Hammer' },
      { emoji: '🪛', label: 'Screwdriver' },
      { emoji: '🔧', label: 'Wrench' },
      { emoji: '🔪', label: 'Chopping Knife' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Cooking Tools',
    items: [
      { emoji: '🥄', label: 'Ladle' },
      { emoji: '🫙', label: 'Spatula' },
      { emoji: '🥢', label: 'Tongs' },
      { emoji: '🧹', label: 'Broom' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Sewing / Craft Tools',
    items: [
      { emoji: '✂️', label: 'Scissors' },
      { emoji: '🪡', label: 'Needle' },
      { emoji: '🧵', label: 'Thread' },
      { emoji: '🔪', label: 'Kitchen Knife' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Measuring Tools',
    items: [
      { emoji: '⚖️', label: 'Kitchen Scale' },
      { emoji: '⏱️', label: 'Cooking Timer' },
      { emoji: '🌡️', label: 'Thermometer' },
      { emoji: '📏', label: 'Ruler' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Garden Tools',
    items: [
      { emoji: '⛏️', label: 'Spade' },
      { emoji: '🌾', label: 'Rake' },
      { emoji: '🪣', label: 'Watering Can' },
      { emoji: '🧹', label: 'Indoor Broom' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Surface Cleaning',
    items: [
      { emoji: '🧽', label: 'Sponge' },
      { emoji: '🧻', label: 'Cleaning Cloth' },
      { emoji: '🖌️', label: 'Brush' },
      { emoji: '📄', label: 'Sandpaper' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'household_tools', outlierType: 'overlapping_category',
    categoryHint: 'Sharp / Cutting Tools',
    items: [
      { emoji: '🔪', label: 'Kitchen Knife' },
      { emoji: '✂️', label: 'Scissors' },
      { emoji: '🪚', label: 'Saw' },
      { emoji: '🪡', label: 'Needle' },
    ],
    outlierIndex: 3,
  },

  // ── garden_plants (bonus) ─────────────────────────────────────────────────
  {
    pool: 'garden_plants', outlierType: 'obvious',
    categoryHint: 'Flowering Plants',
    items: [
      { emoji: '🌹', label: 'Rose' },
      { emoji: '🌸', label: 'Jasmine' },
      { emoji: '🌺', label: 'Hibiscus' },
      { emoji: '🌵', label: 'Cactus' },
    ],
    outlierIndex: 3,
  },
  {
    pool: 'garden_plants', outlierType: 'subtle',
    categoryHint: 'Indian Herbs',
    items: [
      { emoji: '🌿', label: 'Tulsi' },
      { emoji: '🌿', label: 'Mint' },
      { emoji: '🌿', label: 'Coriander' },
      { emoji: '🌴', label: 'Banana Plant' },
    ],
    outlierIndex: 3,
  },
];

// ─── Asset helpers ────────────────────────────────────────────────────────────

function toAssetId(label: string): string {
  return `item.${label.toLowerCase().replace(/&/g, ' and ').replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')}`;
}

// Optional per-asset image overrides for this game.
// Example:
// 'item.vada': '/placeholders/elements/by-game/focus-filter/vada-custom.png'
const ASSET_IMAGE_OVERRIDES: Record<string, string> = {
  'item.vada': '/placeholders/elements/by-game/focus-filter/vada.png',
};

function materializeQuestions(raw: RawQuestion[]): Question[] {
  return raw.map((q) => ({
    ...q,
    items: q.items.map((item) => {
      const assetId = toAssetId(item.label);
      registerAsset({
        assetId,
        token: item.emoji,
        imageSrc: ASSET_IMAGE_OVERRIDES[assetId],
      });
      return {
        assetId,
        label: item.label,
        panelColorClass: item.panelColorClass,
      };
    }),
  }));
}

const ALL_QUESTIONS: Question[] = materializeQuestions(RAW_QUESTIONS);

// ─── Helper ───────────────────────────────────────────────────────────────────

function buildQuestions(p: FocusFilterParams): Question[] {
  const filtered = ALL_QUESTIONS.filter(
    (q) => q.pool === p.categoryPool && q.outlierType === p.outlierType,
  );
  // Shuffle
  const shuffled = [...filtered].sort(() => Math.random() - 0.5);
  // Take up to questionCount, cycling if not enough
  const result: Question[] = [];
  for (let i = 0; i < p.questionCount; i++) {
    result.push(shuffled[i % shuffled.length]);
  }
  return result;
}

// ─── Component ────────────────────────────────────────────────────────────────

type Phase = 'intro' | 'question' | 'result' | 'summary' | 'completion';
const PHASES: Phase[] = ['intro', 'question', 'result', 'summary'];

export default function FocusFilter({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const startedAt = useRef(Date.now());
  const p = levelConfig.params as unknown as FocusFilterParams;

  const [questions] = useState(() => buildQuestions(p));
  const [phase, setPhase] = useState<Phase>('intro');
  const [currentQ, setCurrentQ] = useState(0);
  const [selectedIndex, setSelectedIndex] = useState<number | null>(null);
  const [firstAttemptCorrect, setFirstAttemptCorrect] = useState(0);
  const [responseTimes, setResponseTimes] = useState<number[]>([]);
  const [questionStartMs, setQuestionStartMs] = useState(Date.now());
  const [showCategoryHint, setShowCategoryHint] = useState(
    p.categoryLabelVisible === 'always' || p.categoryLabelVisible === 'intro_only',
  );

  const q = questions[currentQ];

  function startQuestion(idx: number) {
    setCurrentQ(idx);
    setSelectedIndex(null);
    setQuestionStartMs(Date.now());
    // Show hint on first question if intro_only, hide after that
    setShowCategoryHint(
      p.categoryLabelVisible === 'always' ||
      (p.categoryLabelVisible === 'intro_only' && idx === 0),
    );
    setPhase('question');
  }

  function handleItemTap(itemIndex: number) {
    if (phase !== 'question' || selectedIndex !== null) return;
    setSelectedIndex(itemIndex);
    setResponseTimes((prev) => [...prev, Date.now() - questionStartMs]);
    if (itemIndex === q.outlierIndex) {
      setFirstAttemptCorrect((c) => c + 1);
    }
    setPhase('result');
  }

  function handleContinue() {
    if (currentQ + 1 < questions.length) {
      startQuestion(currentQ + 1);
    } else {
      setPhase('completion');
    }
  }

  function completeGame() {
    const avgMs =
      responseTimes.length > 0
        ? Math.round(responseTimes.reduce((a, b) => a + b, 0) / responseTimes.length)
        : 0;
    onLevelComplete({
      levelId: levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed: true,
      metrics: {
        firstAttemptCorrect,
        totalQuestions: questions.length,
        avgResponseTimeMs: avgMs,
      },
    });
  }

  // ── Intro ─────────────────────────────────────────────────────────────────
  if (phase === 'intro') {
    return (
      <div className="flex-1 flex flex-col items-center justify-center p-8 gap-8 text-center">
        <span className="text-7xl">🔎</span>
        <div>
          <h2 className="game-title-banner game-title-banner-compact text-center">
            {t('focus-filter.intro.title', 'Find the Odd One Out!')}
          </h2>
          <p className="text-h3 text-caption-text mt-3">
            {t('focus-filter.intro.subtitle', 'Three items belong together. One does not. Tap the odd one!')}
          </p>
        </div>
        <div className="bg-card-bg rounded-2xl p-5 shadow-sm border border-gray-100 w-full max-w-sm text-left">
          <p className="text-body-md text-caption-text font-semibold mb-2">
            {t('focus-filter.intro.howto', 'How to play:')}
          </p>
          <ul className="text-body-md text-caption-text space-y-1">
            <li>• {t('focus-filter.intro.step1', 'Look at the 4 items shown')}</li>
            <li>• {t('focus-filter.intro.step2', '3 items belong to the same group')}</li>
            <li>• {t('focus-filter.intro.step3', 'Tap the one that does NOT belong')}</li>
          </ul>
        </div>
        <button onClick={() => startQuestion(0)} className="btn-ready w-full max-w-sm">
          {t('btn.startGame', 'Start!')}
        </button>
      </div>
    );
  }

  // ── Question ─────────────────────────────────────────────────────────────
  if (phase === 'question' || phase === 'result') {
    const isResult = phase === 'result';
    return (
      <div className="flex-1 flex flex-col items-center gap-5 p-6 bg-[#FAFAF8]">
        {/* Progress */}
        <div className="w-full max-w-lg">
          <div className="flex justify-between mb-2">
            <span className="text-body-md text-caption-text font-semibold">
              {t('focus-filter.question.progress', 'Question {{n}} of {{total}}', {
                n: currentQ + 1,
                total: questions.length,
              })}
            </span>
          </div>
          <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-blue rounded-full transition-all duration-300"
              style={{ width: `${((currentQ) / questions.length) * 100}%` }}
            />
          </div>
        </div>

        {/* Question header */}
        <div className="text-center w-full max-w-lg">
          <p className="text-h3 font-bold text-body-text">
            {t('focus-filter.question.prompt', 'Which one does NOT belong?')}
          </p>
          {showCategoryHint && !isResult && (
            <p className="text-body-md text-caption-text mt-1">
              {t('focus-filter.question.category', 'Category: {{cat}}', { cat: q.categoryHint })}
            </p>
          )}
          {isResult && (
            <p className="text-body-md text-caption-text mt-1">
              {t('focus-filter.question.category', 'Category: {{cat}}', { cat: q.categoryHint })}
            </p>
          )}
        </div>

        {/* Items grid */}
        <div className="grid grid-cols-2 gap-4 w-full max-w-lg">
          {q.items.map((item, idx) => {
            const isSelected = selectedIndex === idx;
            const isOutlier = idx === q.outlierIndex;

            let cls = 'bg-card-bg border-gray-200';
            if (isResult) {
              if (isSelected && isOutlier) cls = 'bg-green-100 border-emerald-green';
              else if (isSelected) cls = 'bg-red-50 border-red-400';
              else if (isOutlier) cls = 'bg-green-50 border-emerald-green/50';
            } else if (isSelected) {
              cls = 'bg-primary-blue/10 border-primary-blue';
            }

            return (
              <button
                key={idx}
                onClick={() => handleItemTap(idx)}
                disabled={isResult}
                className={`rounded-2xl p-4 flex flex-col items-center justify-center gap-2
                            border-2 min-h-[100px] transition-all duration-150 ${cls}`}
              >
                <AssetPanel
                  assetId={item.assetId}
                  label={item.label}
                  gameId="focus-filter"
                  panelColorClass={item.panelColorClass}
                  className="rounded-xl px-3 py-2 w-full flex flex-col items-center gap-2"
                />
                {isResult && isSelected && isOutlier && (
                  <span className="text-emerald-green text-xl font-bold">✓</span>
                )}
                {isResult && isSelected && !isOutlier && (
                  <span className="text-red-500 text-xl font-bold">✗</span>
                )}
                {isResult && !isSelected && isOutlier && (
                  <span className="text-emerald-green text-xl">✓</span>
                )}
              </button>
            );
          })}
        </div>

        {/* Result feedback */}
        {isResult && (
          <div className="w-full max-w-lg mt-auto space-y-3">
            <div
              className={`rounded-2xl p-4 text-center border ${selectedIndex === q.outlierIndex
                  ? 'bg-green-50 border-emerald-green/30'
                  : 'bg-red-50 border-red-200'
                }`}
            >
              <p className={`text-h3 font-bold ${selectedIndex === q.outlierIndex ? 'text-emerald-green' : 'text-red-600'
                }`}>
                {selectedIndex === q.outlierIndex
                  ? `🌟 ${t('focus-filter.result.correct', 'Correct!')}`
                  : `💡 ${t('focus-filter.result.incorrect', 'Not quite!')} ${q.items[q.outlierIndex].label} ${t('focus-filter.result.wasOdd', 'was the odd one out.')}`}
              </p>
            </div>
            <button onClick={handleContinue} className="btn-primary w-full">
              {currentQ + 1 < questions.length
                ? t('btn.next', 'Next Question')
                : t('btn.finish', 'See Results')}
            </button>
          </div>
        )}
      </div>
    );
  }

  // ── Completion ────────────────────────────────────────────────────────────
  const score = firstAttemptCorrect;
  const total = questions.length;
  const pct = Math.round((score / total) * 100);
  const msg =
    pct === 100
      ? t('focus-filter.completion.perfect', 'Perfect focus! Outstanding!')
      : pct >= 70
        ? t('focus-filter.completion.great', 'Great attention to detail!')
        : t('focus-filter.completion.good', 'Good effort! Keep practising.');

  return (
    <div className="flex-1 flex flex-col items-center justify-center p-8 gap-6 text-center">
      <span className="text-7xl">🔎</span>
      <h2 className="text-h1 font-bold text-body-text">{msg}</h2>
      <div className="bg-card-bg rounded-2xl p-6 shadow-sm border border-gray-100 w-full max-w-sm">
        <p className="text-h1 font-bold text-primary-blue">{score} / {total}</p>
        <p className="text-body-md text-caption-text mt-1">
          {t('focus-filter.completion.score', 'correct on first try')}
        </p>
        <div className="mt-4 h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-primary-blue rounded-full transition-all duration-500"
            style={{ width: `${pct}%` }}
          />
        </div>
      </div>
      <button onClick={completeGame} className="btn-primary w-full max-w-sm">
        {t('btn.continue', 'Continue')}
      </button>
    </div>
  );
}
