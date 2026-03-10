/**
 * Procedural content generator for RememberMatch.
 * Produces a unique set of pairs + auto-constructed quiz questions each round.
 */

import type { RememberMatchDynamicParams } from '../../lib/dynamicDifficulty';

// ── Large themed emoji bank ──────────────────────────────────────────────────

interface EmojiItem {
  key: string;
  emoji: string;
  label: string;
  category: string;
}

const EMOJI_BANK: EmojiItem[] = [
  // Familiar household
  { key: 'kettle',   emoji: '🫖', label: 'Tea Kettle',      category: 'kitchen' },
  { key: 'cup',      emoji: '☕', label: 'Tea Cup',          category: 'kitchen' },
  { key: 'pot',      emoji: '🫕', label: 'Cooking Pot',      category: 'kitchen' },
  { key: 'cooker',   emoji: '🍲', label: 'Pressure Cooker',  category: 'kitchen' },
  { key: 'spoon',    emoji: '🥄', label: 'Serving Spoon',    category: 'kitchen' },
  { key: 'salt',     emoji: '🧂', label: 'Salt',             category: 'kitchen' },
  { key: 'bowl',     emoji: '🥣', label: 'Bowl',             category: 'kitchen' },
  { key: 'jar',      emoji: '🫙', label: 'Pickle Jar',       category: 'kitchen' },

  // Fruits and food
  { key: 'coconut',  emoji: '🥥', label: 'Coconut',    category: 'food' },
  { key: 'banana',   emoji: '🍌', label: 'Banana',     category: 'food' },
  { key: 'mango',    emoji: '🥭', label: 'Mango',      category: 'food' },
  { key: 'rice',     emoji: '🍚', label: 'Rice',       category: 'food' },
  { key: 'tomato',   emoji: '🍅', label: 'Tomato',     category: 'food' },
  { key: 'onion',    emoji: '🧅', label: 'Onion',      category: 'food' },
  { key: 'lime',     emoji: '🍋', label: 'Lime',       category: 'food' },
  { key: 'apple',    emoji: '🍎', label: 'Apple',      category: 'food' },
  { key: 'grapes',   emoji: '🍇', label: 'Grapes',     category: 'food' },
  { key: 'orange',   emoji: '🍊', label: 'Orange',     category: 'food' },

  // Flowers and plants
  { key: 'marigold', emoji: '🌺', label: 'Marigold',   category: 'nature' },
  { key: 'jasmine',  emoji: '🌸', label: 'Jasmine',    category: 'nature' },
  { key: 'tulsi',    emoji: '🌿', label: 'Tulsi',      category: 'nature' },
  { key: 'rose',     emoji: '🌹', label: 'Rose',       category: 'nature' },
  { key: 'sunflower',emoji: '🌻', label: 'Sunflower',  category: 'nature' },
  { key: 'lotus',    emoji: '🪷', label: 'Lotus',      category: 'nature' },
  { key: 'tulip',    emoji: '🌷', label: 'Tulip',      category: 'nature' },
  { key: 'seedling', emoji: '🌱', label: 'Seedling',   category: 'nature' },

  // Animals
  { key: 'sparrow',  emoji: '🐦', label: 'Sparrow',    category: 'animal' },
  { key: 'peacock',  emoji: '🦚', label: 'Peacock',    category: 'animal' },
  { key: 'cow',      emoji: '🐄', label: 'Cow',        category: 'animal' },
  { key: 'cat',      emoji: '🐈', label: 'Cat',        category: 'animal' },
  { key: 'dog',      emoji: '🐕', label: 'Dog',        category: 'animal' },
  { key: 'parrot',   emoji: '🦜', label: 'Parrot',     category: 'animal' },
  { key: 'butterfly',emoji: '🦋', label: 'Butterfly',  category: 'animal' },
  { key: 'elephant', emoji: '🐘', label: 'Elephant',   category: 'animal' },

  // Cultural / objects
  { key: 'diya',     emoji: '🪔', label: 'Diya',       category: 'object' },
  { key: 'bell',     emoji: '🔔', label: 'Temple Bell', category: 'object' },
  { key: 'umbrella', emoji: '☂️', label: 'Umbrella',    category: 'object' },
  { key: 'clock',    emoji: '🕰️', label: 'Clock',       category: 'object' },
  { key: 'book',     emoji: '📚', label: 'Books',       category: 'object' },
  { key: 'lamp',     emoji: '💡', label: 'Lamp',        category: 'object' },
  { key: 'bag',      emoji: '👜', label: 'Bag',         category: 'object' },
  { key: 'remote',   emoji: '📱', label: 'Remote',      category: 'object' },
];

// ── Shuffle helper ───────────────────────────────────────────────────────────

function shuffle<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

// ── Generated content types ─────────────────────────────────────────────────

export interface GeneratedPair {
  pairKey: string;
  emoji: string;
  label: string;
}

export interface GeneratedQuizQuestion {
  question: string;
  options: string[];
  correctAnswer: string;
}

export interface GeneratedRememberMatchContent {
  pairs: GeneratedPair[];
  quizQuestions: GeneratedQuizQuestion[];
  gridRows: number;
  gridCols: number;
  previewDurationMs: number;
}

// ── Main generator ──────────────────────────────────────────────────────────

export function generateRememberMatchContent(params: RememberMatchDynamicParams): GeneratedRememberMatchContent {
  // Pick random items for pairs
  const shuffledBank = shuffle(EMOJI_BANK);
  const selectedItems = shuffledBank.slice(0, params.totalPairs);
  const unusedItems = shuffledBank.slice(params.totalPairs);

  const pairs: GeneratedPair[] = selectedItems.map((item) => ({
    pairKey: item.key,
    emoji: item.emoji,
    label: item.label,
  }));

  // Auto-construct quiz questions from selected pairs + distractors
  const quizQuestions: GeneratedQuizQuestion[] = [];
  const quizItems = shuffle(selectedItems).slice(0, params.quizQuestions);

  for (const item of quizItems) {
    // Pick 3 distractors from the same category first, then random
    const sameCategoryDistractors = shuffle(
      unusedItems.filter((u) => u.category === item.category && u.key !== item.key)
    );
    const otherDistractors = shuffle(
      unusedItems.filter((u) => u.category !== item.category)
    );
    const distractorPool = [...sameCategoryDistractors, ...otherDistractors];
    const distractors = distractorPool.slice(0, 3);

    const correctAnswer = `${item.emoji} ${item.label}`;
    const options = shuffle([
      correctAnswer,
      ...distractors.map((d) => `${d.emoji} ${d.label}`),
    ]);

    quizQuestions.push({
      question: 'Which of these was in the game?',
      options,
      correctAnswer,
    });
  }

  return {
    pairs,
    quizQuestions,
    gridRows: params.gridRows,
    gridCols: params.gridCols,
    previewDurationMs: params.previewDurationMs,
  };
}
