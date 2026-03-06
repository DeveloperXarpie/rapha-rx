import type { LevelConfig } from '../../types';

interface SpotFocusParams {
  differenceCount: number;
  changeType: 'bold' | 'medium' | 'subtle';
  sceneSet: 'kitchen' | 'garden' | 'living_room' | 'market_stall';
  hintsEnabled: false;
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      differenceCount: 3,
      changeType: 'bold',
      sceneSet: 'kitchen',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      differenceCount: 5,
      changeType: 'medium',
      sceneSet: 'garden',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      differenceCount: 7,
      changeType: 'subtle',
      sceneSet: 'market_stall',
      hintsEnabled: false,
    } satisfies SpotFocusParams,
  },
];
