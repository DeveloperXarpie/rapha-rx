import type { LevelConfig } from '../../types';

interface ShoppingListParams {
  itemCount: number;
  studyDurationMs: number;
  distractorGapEnabled: boolean;
  recallFieldSize: number;
  bonusSortEnabled: boolean;
  itemPool: 'south_indian_groceries';
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      itemCount: 4,
      studyDurationMs: 30000,
      distractorGapEnabled: false,
      recallFieldSize: 8,
      bonusSortEnabled: false,
      itemPool: 'south_indian_groceries',
    } satisfies ShoppingListParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      itemCount: 5,
      studyDurationMs: 25000,
      distractorGapEnabled: true,
      recallFieldSize: 10,
      bonusSortEnabled: false,
      itemPool: 'south_indian_groceries',
    } satisfies ShoppingListParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      itemCount: 7,
      studyDurationMs: 20000,
      distractorGapEnabled: true,
      recallFieldSize: 14,
      bonusSortEnabled: true,
      itemPool: 'south_indian_groceries',
    } satisfies ShoppingListParams,
  },
];
