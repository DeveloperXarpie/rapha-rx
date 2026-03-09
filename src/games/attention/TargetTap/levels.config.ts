import type { LevelConfig } from '../../types';

interface TargetTapParams {
  gridRows: number;
  gridCols: number;
  targetTypes: number;
  distractorTypes: number;
  gridRefreshMs: number;
  roundCount: number;
  roundDurationMs: number;
  targetSimilarity: 'distinct' | 'shared_colour' | 'shared_colour_and_shape';
}

export const levels: LevelConfig[] = [
  {
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      gridRows: 2,
      gridCols: 4,
      targetTypes: 1,
      distractorTypes: 2,
      gridRefreshMs: 8000,
      roundCount: 3,
      roundDurationMs: 30000,
      targetSimilarity: 'distinct',
    } satisfies TargetTapParams,
  },
  {
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      gridRows: 3,
      gridCols: 4,
      targetTypes: 1,
      distractorTypes: 3,
      gridRefreshMs: 10000,
      roundCount: 4,
      roundDurationMs: 30000,
      targetSimilarity: 'shared_colour',
    } satisfies TargetTapParams,
  },
  {
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      gridRows: 4,
      gridCols: 4,
      targetTypes: 2,
      distractorTypes: 3,
      gridRefreshMs: 12000,
      roundCount: 5,
      roundDurationMs: 30000,
      targetSimilarity: 'shared_colour_and_shape',
    } satisfies TargetTapParams,
  },
];
