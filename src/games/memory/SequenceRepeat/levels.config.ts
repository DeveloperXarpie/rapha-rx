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
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      startingLength: 2,
      colourCount: 3,
      playbackSpeedMs: 800,
      audioEnabled: true,
      maxLength: 6,
    } satisfies SequenceRepeatParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      startingLength: 3,
      colourCount: 4,
      playbackSpeedMs: 600,
      audioEnabled: true,
      maxLength: 8,
    } satisfies SequenceRepeatParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      startingLength: 4,
      colourCount: 4,
      playbackSpeedMs: 400,
      audioEnabled: false,
      maxLength: 10,
    } satisfies SequenceRepeatParams,
  },
];
