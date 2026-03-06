import type { LevelConfig } from '../../types';

interface GardenPlannerParams {
  gridSize: 3 | 4;
  plantCount: number;
  toolStepCount: number;
  weatherEventEnabled: boolean;
  sunRuleEnabled: boolean;
  plantPool: 'indian_household_plants';
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      gridSize: 3,
      plantCount: 3,
      toolStepCount: 0,
      weatherEventEnabled: false,
      sunRuleEnabled: false,
      plantPool: 'indian_household_plants',
    } satisfies GardenPlannerParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      gridSize: 3,
      plantCount: 4,
      toolStepCount: 1,
      weatherEventEnabled: true,
      sunRuleEnabled: false,
      plantPool: 'indian_household_plants',
    } satisfies GardenPlannerParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      gridSize: 4,
      plantCount: 5,
      toolStepCount: 2,
      weatherEventEnabled: true,
      sunRuleEnabled: true,
      plantPool: 'indian_household_plants',
    } satisfies GardenPlannerParams,
  },
];
