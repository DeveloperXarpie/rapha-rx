import type { LevelConfig } from '../../types';

interface FocusFilterParams {
  questionCount: number;
  outlierType: 'obvious' | 'subtle' | 'overlapping_category';
  categoryLabelVisible: 'always' | 'intro_only' | 'never';
  categoryPool: 'south_indian_food' | 'animals' | 'household_tools' | 'garden_plants';
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      questionCount: 4,
      outlierType: 'obvious',
      categoryLabelVisible: 'always',
      categoryPool: 'south_indian_food',
    } satisfies FocusFilterParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      questionCount: 5,
      outlierType: 'subtle',
      categoryLabelVisible: 'intro_only',
      categoryPool: 'animals',
    } satisfies FocusFilterParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      questionCount: 7,
      outlierType: 'overlapping_category',
      categoryLabelVisible: 'never',
      categoryPool: 'household_tools',
    } satisfies FocusFilterParams,
  },
];
