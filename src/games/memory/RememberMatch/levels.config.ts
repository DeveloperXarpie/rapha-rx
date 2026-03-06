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
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      gridRows: 2,
      gridCols: 3,
      previewDurationMs: 45000,
      quizQuestions: 2,
      cardImageSet: 'familiar_objects',
    } satisfies RememberMatchParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      gridRows: 3,
      gridCols: 4,
      previewDurationMs: 30000,
      quizQuestions: 3,
      cardImageSet: 'animals_and_objects',
    } satisfies RememberMatchParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      gridRows: 4,
      gridCols: 4,
      previewDurationMs: 20000,
      quizQuestions: 4,
      cardImageSet: 'abstract_patterns',
    } satisfies RememberMatchParams,
  },
];
