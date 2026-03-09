import type { LevelConfig } from '../../types';

interface FocusFilterParams {
  questionCount: number;
  outlierType: 'obvious' | 'subtle' | 'overlapping_category';
  categoryLabelVisible: 'always' | 'intro_only' | 'never';
  categoryPool: 'south_indian_food' | 'animals' | 'household_tools' | 'garden_plants';
}

export const levels: LevelConfig[] = [
  {
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      questionCount: 4,
      outlierType: 'obvious',
      categoryLabelVisible: 'always',
      categoryPool: 'south_indian_food',
    } satisfies FocusFilterParams,
  },
  {
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      questionCount: 5,
      outlierType: 'subtle',
      categoryLabelVisible: 'intro_only',
      categoryPool: 'animals',
    } satisfies FocusFilterParams,
  },
  {
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      questionCount: 7,
      outlierType: 'overlapping_category',
      categoryLabelVisible: 'never',
      categoryPool: 'household_tools',
    } satisfies FocusFilterParams,
  },
];
