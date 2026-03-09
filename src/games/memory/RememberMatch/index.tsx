import { useEffect, useMemo, useRef, useState, useCallback } from 'react';
import { useTranslation } from 'react-i18next';
import { Button } from '../../../components/ui/Button';
import { useGamePhase } from '../../../hooks/useGamePhase';
import type { LevelConfig } from '../../types';
import type { LevelResult } from '../../../components/GameShell';

interface Props {
  levelConfig: LevelConfig;
  onLevelComplete: (result: LevelResult) => void;
}

// ─── Data types ──────────────────────────────────────────────────────────────

interface PairItem {
  pairKey: string;
  emoji: string;
  label: string;
}

interface QuizQuestion {
  question: string;
  options: string[];  // first is always the correct one (shuffled before rendering)
  correctAnswer: string;
}

interface CardPool {
  pairs: PairItem[];
  quizQuestions: QuizQuestion[];
}

// ─── Content pools ───────────────────────────────────────────────────────────

const EASY_POOLS: CardPool[] = [
  {
    pairs: [
      { pairKey: 'kettle',   emoji: '🫖', label: 'Tea Kettle' },
      { pairKey: 'coconut',  emoji: '🥥', label: 'Coconut'   },
      { pairKey: 'marigold', emoji: '🌺', label: 'Marigold'  },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🥥 Coconut', '🥭 Mango', '🍋 Lemon', '🍎 Apple'], correctAnswer: '🥥 Coconut' },
      { question: 'Which of these was in the game?', options: ['🌺 Marigold', '🌹 Rose', '🌻 Sunflower', '🌷 Tulip'], correctAnswer: '🌺 Marigold' },
    ],
  },
  {
    pairs: [
      { pairKey: 'diya',    emoji: '🪔', label: 'Diya'    },
      { pairKey: 'banana',  emoji: '🍌', label: 'Banana'  },
      { pairKey: 'sparrow', emoji: '🐦', label: 'Sparrow' },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🪔 Diya', '💡 Bulb', '🕯️ Candle', '🔦 Torch'], correctAnswer: '🪔 Diya' },
      { question: 'Which of these was in the game?', options: ['🍌 Banana', '🥭 Mango', '🍊 Orange', '🍇 Grapes'], correctAnswer: '🍌 Banana' },
    ],
  },
  {
    pairs: [
      { pairKey: 'rice',    emoji: '🍚', label: 'Rice'    },
      { pairKey: 'jasmine', emoji: '🌸', label: 'Jasmine' },
      { pairKey: 'cow',     emoji: '🐄', label: 'Cow'     },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🍚 Rice', '🍞 Bread', '🌾 Wheat', '🫓 Roti'], correctAnswer: '🍚 Rice' },
      { question: 'Which of these was in the game?', options: ['🌸 Jasmine', '🌹 Rose', '🌻 Sunflower', '🌺 Marigold'], correctAnswer: '🌸 Jasmine' },
    ],
  },
];

const MEDIUM_POOLS: CardPool[] = [
  {
    pairs: [
      { pairKey: 'kettle',   emoji: '🫖', label: 'Tea Kettle' },
      { pairKey: 'coconut',  emoji: '🥥', label: 'Coconut'   },
      { pairKey: 'marigold', emoji: '🌺', label: 'Marigold'  },
      { pairKey: 'diya',     emoji: '🪔', label: 'Diya'      },
      { pairKey: 'banana',   emoji: '🍌', label: 'Banana'    },
      { pairKey: 'sparrow',  emoji: '🐦', label: 'Sparrow'   },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🫖 Tea Kettle', '☕ Coffee Cup', '🥤 Cold Drink', '🍶 Flask'], correctAnswer: '🫖 Tea Kettle' },
      { question: 'Which of these was in the game?', options: ['🪔 Diya', '💡 Bulb', '🕯️ Candle', '🔦 Torch'], correctAnswer: '🪔 Diya' },
      { question: 'Which of these was in the game?', options: ['🐦 Sparrow', '🦚 Peacock', '🐓 Rooster', '🦆 Duck'], correctAnswer: '🐦 Sparrow' },
    ],
  },
  {
    pairs: [
      { pairKey: 'rice',    emoji: '🍚', label: 'Rice'    },
      { pairKey: 'jasmine', emoji: '🌸', label: 'Jasmine' },
      { pairKey: 'cow',     emoji: '🐄', label: 'Cow'     },
      { pairKey: 'tulsi',   emoji: '🌿', label: 'Tulsi'   },
      { pairKey: 'mango',   emoji: '🥭', label: 'Mango'   },
      { pairKey: 'peacock', emoji: '🦚', label: 'Peacock' },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🥭 Mango', '🍎 Apple', '🍊 Orange', '🍋 Lemon'], correctAnswer: '🥭 Mango' },
      { question: 'Which of these was in the game?', options: ['🌿 Tulsi', '🌵 Cactus', '🌴 Palm', '🍀 Clover'], correctAnswer: '🌿 Tulsi' },
      { question: 'Which of these was in the game?', options: ['🦚 Peacock', '🦜 Parrot', '🐓 Rooster', '🦢 Swan'], correctAnswer: '🦚 Peacock' },
    ],
  },
];

const HARD_POOLS: CardPool[] = [
  {
    pairs: [
      { pairKey: 'kettle',   emoji: '🫖', label: 'Tea Kettle' },
      { pairKey: 'coconut',  emoji: '🥥', label: 'Coconut'   },
      { pairKey: 'marigold', emoji: '🌺', label: 'Marigold'  },
      { pairKey: 'diya',     emoji: '🪔', label: 'Diya'      },
      { pairKey: 'tulsi',    emoji: '🌿', label: 'Tulsi'     },
      { pairKey: 'mango',    emoji: '🥭', label: 'Mango'     },
      { pairKey: 'peacock',  emoji: '🦚', label: 'Peacock'   },
      { pairKey: 'jasmine',  emoji: '🌸', label: 'Jasmine'   },
    ],
    quizQuestions: [
      { question: 'Which of these was in the game?', options: ['🥥 Coconut', '🍌 Banana', '🍇 Grapes', '🍊 Orange'], correctAnswer: '🥥 Coconut' },
      { question: 'Which of these was in the game?', options: ['🪔 Diya', '💡 Bulb', '🕯️ Candle', '🔦 Torch'], correctAnswer: '🪔 Diya' },
      { question: 'Which of these was in the game?', options: ['🦚 Peacock', '🦜 Parrot', '🐓 Rooster', '🦢 Swan'], correctAnswer: '🦚 Peacock' },
      { question: 'Which of these was in the game?', options: ['🌸 Jasmine', '🌹 Rose', '🌻 Sunflower', '🌷 Tulip'], correctAnswer: '🌸 Jasmine' },
    ],
  },
];

// ─── Card generation (stable on mount) ──────────────────────────────────────

function buildShuffledCards(pairs: PairItem[]) {
  const cards = pairs.flatMap((item) => [
    { id: `${item.pairKey}-a`, pairKey: item.pairKey, emoji: item.emoji, label: item.label },
    { id: `${item.pairKey}-b`, pairKey: item.pairKey, emoji: item.emoji, label: item.label },
  ]);
  return [...cards].sort(() => Math.random() - 0.5);
}

// ─── Sub-components ──────────────────────────────────────────────────────────

interface CardProps {
  id: string;
  emoji: string;
  label: string;
  faceUp: boolean;
  matched: boolean;
  onClick?: () => void;
  interactive: boolean;
}

function MemoryCard({ emoji, label, faceUp, matched, onClick, interactive }: CardProps) {
  const baseClasses =
    'min-w-[100px] min-h-[100px] rounded-2xl flex flex-col items-center justify-center gap-2 transition-all duration-200 select-none';

  if (matched) {
    return (
      <div
        className={`${baseClasses} bg-card-bg border-4 border-emerald-green`}
        aria-label={label}
      >
        <span className="text-5xl">{emoji}</span>
        <span className="text-body-md text-body-text font-medium text-center px-1">{label}</span>
      </div>
    );
  }

  if (faceUp) {
    return (
      <div
        className={`${baseClasses} bg-card-bg border-2 border-gray-200`}
        aria-label={label}
      >
        <span className="text-5xl">{emoji}</span>
        <span className="text-body-md text-body-text font-medium text-center px-1">{label}</span>
      </div>
    );
  }

  // Face-down (matching phase)
  return (
    <button
      className={`${baseClasses} bg-primary-blue text-white ${interactive ? 'cursor-pointer active:scale-95' : 'cursor-default'}`}
      onClick={interactive ? onClick : undefined}
      aria-label={label}
    >
      <span className="text-4xl font-bold">?</span>
    </button>
  );
}

// ─── Main component ──────────────────────────────────────────────────────────

export default function RememberMatch({ levelConfig, onLevelComplete }: Props) {
  const { t } = useTranslation();
  const startedAt = useRef(Date.now());
  const params = levelConfig.params;

  const PHASES = ['preview', 'matching', 'celebration', 'quiz', 'summary'] as const;
  type Phase = typeof PHASES[number];
  const { currentPhase, advance } = useGamePhase<Phase>([...PHASES]);

  // ── Pool selection — pick once per mount ────────────────────────────────
  const pool = useMemo<CardPool>(() => {
    const pools =
      levelConfig.id === 'level_5'                                  ? HARD_POOLS   :
      levelConfig.id === 'level_3' || levelConfig.id === 'level_4'  ? MEDIUM_POOLS :
                                                                       EASY_POOLS;
    return pools[Math.floor(Math.random() * pools.length)];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ── Dynamic values derived from pool and params ─────────────────────────
  const totalPairs = pool.pairs.length;
  const gridCols   = params.gridCols as number;
  const quizCount  = Math.min(params.quizQuestions as number, pool.quizQuestions.length);

  // ── Stable card order — never re-shuffle after mount ────────────────────
  const [cards] = useState(() => buildShuffledCards(pool.pairs));

  const [matched, setMatched]           = useState<Set<string>>(new Set());
  const [flipped, setFlipped]           = useState<string[]>([]);
  const [flipAttempts, setFlipAttempts] = useState(0);
  const [lockBoard, setLockBoard]       = useState(false);
  const [quizIndex, setQuizIndex]       = useState(0);
  const [quizCorrect, setQuizCorrect]   = useState(0);
  const [shuffledOptions, setShuffledOptions] = useState<string[]>([]);

  // ── PREVIEW: auto-advance after previewDurationMs ───────────────────────
  useEffect(() => {
    if (currentPhase !== 'preview') return;
    const ms = params.previewDurationMs as number;
    const timer = setTimeout(advance, ms);
    return () => clearTimeout(timer);
  // advance is stable (useCallback inside useGamePhase); intentionally omit
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  // ── CELEBRATION: auto-advance after 1800ms ───────────────────────────────
  useEffect(() => {
    if (currentPhase !== 'celebration') return;
    const timer = setTimeout(advance, 1800);
    return () => clearTimeout(timer);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase]);

  // ── Shuffle quiz options once per question ───────────────────────────────
  useEffect(() => {
    if (currentPhase === 'quiz') {
      const q = pool.quizQuestions[quizIndex];
      setShuffledOptions([...q.options].sort(() => Math.random() - 0.5));
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [currentPhase, quizIndex]);

  // ── Card tap handler ─────────────────────────────────────────────────────
  const handleCardTap = useCallback((cardId: string, pairKey: string) => {
    if (lockBoard) return;
    if (matched.has(pairKey)) return;
    if (flipped.includes(cardId)) return;

    const nextFlipped = [...flipped, cardId];
    setFlipAttempts((n) => n + 1);

    if (nextFlipped.length === 1) {
      setFlipped(nextFlipped);
      return;
    }

    // Two cards face-up — evaluate
    setFlipped(nextFlipped);

    const firstId   = nextFlipped[0];
    const firstCard = cards.find((c) => c.id === firstId);

    if (firstCard?.pairKey === pairKey) {
      // Match!
      const nextMatched = new Set(matched);
      nextMatched.add(pairKey);
      setMatched(nextMatched);
      setFlipped([]);
      if (nextMatched.size === totalPairs) {
        advance();
      }
    } else {
      // Mismatch — flip back after delay
      setLockBoard(true);
      setTimeout(() => {
        setFlipped([]);
        setLockBoard(false);
      }, 1000);
    }
  }, [lockBoard, matched, flipped, cards, advance, totalPairs]);

  // ── Quiz answer handler ──────────────────────────────────────────────────
  function handleQuizAnswer(option: string) {
    const q = pool.quizQuestions[quizIndex];
    if (option === q.correctAnswer) {
      setQuizCorrect((n) => n + 1);
    }

    const isLast = quizIndex >= quizCount - 1;
    if (isLast) {
      advance();
    } else {
      setQuizIndex((i) => i + 1);
    }
  }

  // ── Complete handler ─────────────────────────────────────────────────────
  function handleComplete() {
    onLevelComplete({
      levelId:         levelConfig.id,
      durationSeconds: Math.floor((Date.now() - startedAt.current) / 1000),
      completed:       true,
      metrics:         {
        flipAttempts,
        quizCorrect,
        quizTotal: quizCount,
      },
    });
  }

  // ─── Render helpers ───────────────────────────────────────────────────────

  function renderCardGrid(allFaceUp: boolean) {
    return (
      <div
        className="grid gap-4 w-full max-w-xl mx-auto"
        style={{ gridTemplateColumns: `repeat(${gridCols}, minmax(0, 1fr))` }}
      >
        {cards.map((card) => {
          const isMatched = matched.has(card.pairKey);
          const isFaceUp  = allFaceUp || isMatched || flipped.includes(card.id);
          return (
            <MemoryCard
              key={card.id}
              id={card.id}
              emoji={card.emoji}
              label={card.label}
              faceUp={isFaceUp}
              matched={isMatched}
              interactive={!allFaceUp && !lockBoard && !isMatched && !flipped.includes(card.id)}
              onClick={() => handleCardTap(card.id, card.pairKey)}
            />
          );
        })}
      </div>
    );
  }

  // ─── Phase renders ────────────────────────────────────────────────────────

  function renderPreview() {
    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <p className="text-h3 font-medium text-body-text text-center">
          {t('remember-match.phase.preview.instruction', 'Study the pairs carefully')}
        </p>
        {renderCardGrid(true)}
        <Button fullWidth onClick={advance}>
          {t('remember-match.phase.preview.ready', "I'm Ready!")}
        </Button>
      </div>
    );
  }

  function renderMatching() {
    const foundCount = matched.size;

    return (
      <div className="flex flex-col items-center gap-8 w-full">
        <p className="text-h3 font-medium text-body-text text-center">
          {t('remember-match.phase.matching.instruction', 'Tap the cards to find the matching pairs')}
        </p>

        {renderCardGrid(false)}

        <p
          role="status"
          aria-live="polite"
          className="text-body-md text-caption-text text-center"
        >
          {t(
            'remember-match.phase.matching.progress',
            '{{found}} of {{total}} pairs found',
            { found: foundCount, total: totalPairs },
          )}
        </p>
      </div>
    );
  }

  function renderCelebration() {
    return (
      <div className="flex flex-col items-center justify-center gap-6 w-full">
        <span className="text-8xl" aria-hidden="true">🎉</span>
        <p className="text-h2 font-bold text-body-text text-center">
          {t('remember-match.phase.celebration.message', 'Well done! You found all the pairs!')}
        </p>
      </div>
    );
  }

  function renderQuiz() {
    const q = pool.quizQuestions[quizIndex];

    return (
      <div className="flex flex-col items-center gap-8 w-full max-w-md mx-auto">
        <p className="text-h3 font-medium text-body-text text-center">
          {t('remember-match.phase.quiz.question', q.question)}
        </p>

        <div className="flex flex-col gap-4 w-full">
          {shuffledOptions.map((option) => (
            <Button
              key={option}
              variant="secondary"
              fullWidth
              onClick={() => handleQuizAnswer(option)}
            >
              {t(`remember-match.quiz.option.${quizIndex}.${option}`, option)}
            </Button>
          ))}
        </div>
      </div>
    );
  }

  function renderSummary() {
    return (
      <div className="flex flex-col items-center justify-center gap-8 w-full max-w-md mx-auto">
        <p className="text-h2 font-bold text-body-text text-center">
          {t('remember-match.phase.summary.message', 'Great memory! You\'re improving! 🌟')}
        </p>
        <Button fullWidth onClick={handleComplete}>
          {t('remember-match.phase.summary.cta', 'Continue')}
        </Button>
      </div>
    );
  }

  // ─── Root render ──────────────────────────────────────────────────────────

  return (
    <div
      role="main"
      className="flex-1 flex flex-col items-center justify-center p-6 gap-8 bg-app-bg min-h-full"
    >
      {currentPhase === 'preview'     && renderPreview()}
      {currentPhase === 'matching'    && renderMatching()}
      {currentPhase === 'celebration' && renderCelebration()}
      {currentPhase === 'quiz'        && renderQuiz()}
      {currentPhase === 'summary'     && renderSummary()}
    </div>
  );
}
