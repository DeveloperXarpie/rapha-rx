import type { LevelConfig } from '../../types';

interface RememberMatchParams {
  gridRows: number;
  gridCols: number;
  previewDurationMs: number;
  quizQuestions: number;
  cardImageSet: 'familiar_objects' | 'animals_and_objects' | 'abstract_patterns';
}

export const levels: LevelConfig[] = [
  {
    // Very easy: 3 pairs, long preview, 1 quiz question
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      gridRows: 2,
      gridCols: 3,
      previewDurationMs: 60000,
      quizQuestions: 1,
      cardImageSet: 'familiar_objects',
    } satisfies RememberMatchParams,
  },
  {
    // Easy: 3 pairs, standard preview, 2 quiz questions
    id: 'level_2',
    labelKey: 'level.2',
    params: {
      gridRows: 2,
      gridCols: 3,
      previewDurationMs: 45000,
      quizQuestions: 2,
      cardImageSet: 'familiar_objects',
    } satisfies RememberMatchParams,
  },
  {
    // Medium: 6 pairs, shorter preview, 3 quiz questions
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      gridRows: 3,
      gridCols: 4,
      previewDurationMs: 30000,
      quizQuestions: 3,
      cardImageSet: 'animals_and_objects',
    } satisfies RememberMatchParams,
  },
  {
    // Medium-hard: 6 pairs, brief preview, 3 quiz questions
    id: 'level_4',
    labelKey: 'level.4',
    params: {
      gridRows: 3,
      gridCols: 4,
      previewDurationMs: 20000,
      quizQuestions: 3,
      cardImageSet: 'animals_and_objects',
    } satisfies RememberMatchParams,
  },
  {
    // Hard: 8 pairs, very brief preview, 4 quiz questions
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      gridRows: 4,
      gridCols: 4,
      previewDurationMs: 15000,
      quizQuestions: 4,
      cardImageSet: 'abstract_patterns',
    } satisfies RememberMatchParams,
  },
];
