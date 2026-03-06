import type { LevelConfig } from '../../types';

interface MorningRoutineParams {
  cardCount: number;
  decisionBranchEnabled: boolean;
  disruptionEventEnabled: boolean;
  routineContext:
    | 'doctor_appointment'
    | 'temple_visit'
    | 'family_visit'
    | 'market_trip'
    | 'yoga_session';
}

export const levels: LevelConfig[] = [
  {
    id: 'easy',
    labelKey: 'level.easy',
    params: {
      cardCount: 5,
      decisionBranchEnabled: false,
      disruptionEventEnabled: false,
      routineContext: 'temple_visit',
    } satisfies MorningRoutineParams,
  },
  {
    id: 'medium',
    labelKey: 'level.medium',
    params: {
      cardCount: 6,
      decisionBranchEnabled: true,
      disruptionEventEnabled: false,
      routineContext: 'doctor_appointment',
    } satisfies MorningRoutineParams,
  },
  {
    id: 'hard',
    labelKey: 'level.hard',
    params: {
      cardCount: 8,
      decisionBranchEnabled: true,
      disruptionEventEnabled: true,
      routineContext: 'market_trip',
    } satisfies MorningRoutineParams,
  },
];
