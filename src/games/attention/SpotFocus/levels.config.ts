import type { LevelConfig } from '../../types';

interface SpotFocusParams {
  differenceCount: number;
  changeType: 'bold' | 'medium' | 'subtle';
  sceneSet: 'kitchen' | 'garden' | 'living_room' | 'market_stall';
  hintsEnabled: false;
}

export const levels: LevelConfig[] = [
  {
    // Very easy: kitchen, find 2 out of 3 differences, bold changes
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      differenceCount: 2,
      changeType: 'bold',
      sceneSet: 'kitchen',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    // Easy: kitchen, find all 3 differences, bold changes
    id: 'level_2',
    labelKey: 'level.2',
    params: {
      differenceCount: 3,
      changeType: 'bold',
      sceneSet: 'kitchen',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    // Medium: garden, find 4 out of 5 differences, medium changes
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      differenceCount: 4,
      changeType: 'medium',
      sceneSet: 'garden',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    // Medium-hard: garden, find all 5 differences, medium changes
    id: 'level_4',
    labelKey: 'level.4',
    params: {
      differenceCount: 5,
      changeType: 'medium',
      sceneSet: 'garden',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    // Hard: living room, find all 7 differences, subtle changes
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      differenceCount: 7,
      changeType: 'subtle',
      sceneSet: 'living_room',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
];
