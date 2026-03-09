import type { LevelConfig } from '../../types';

interface SequenceRepeatParams {
  startingLength: number;
  colourCount: number;
  playbackSpeedMs: number;
  audioEnabled: boolean;
  maxLength: number;
}

export const levels: LevelConfig[] = [
  {
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      startingLength: 2,
      colourCount: 3,
      playbackSpeedMs: 800,
      audioEnabled: true,
      maxLength: 6,
    } satisfies SequenceRepeatParams,
  },
  {
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      startingLength: 3,
      colourCount: 4,
      playbackSpeedMs: 600,
      audioEnabled: true,
      maxLength: 8,
    } satisfies SequenceRepeatParams,
  },
  {
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      startingLength: 4,
      colourCount: 4,
      playbackSpeedMs: 400,
      audioEnabled: false,
      maxLength: 10,
    } satisfies SequenceRepeatParams,
  },
];
