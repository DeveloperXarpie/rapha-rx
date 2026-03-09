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
    id: 'level_1',
    labelKey: 'level.1',
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
    id: 'level_3',
    labelKey: 'level.3',
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
    id: 'level_5',
    labelKey: 'level.5',
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
