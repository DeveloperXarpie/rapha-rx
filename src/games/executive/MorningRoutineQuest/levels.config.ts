import type { LevelConfig } from '../../types';

interface MorningRoutineParams {
  cardCount: number;
  decisionBranchEnabled: boolean;
  disruptionEventEnabled: boolean;
}

export const levels: LevelConfig[] = [
  {
    // Very easy: 4 cards, simple routine, no decision or disruption
    id: 'level_1',
    labelKey: 'level.1',
    params: {
      cardCount: 4,
      decisionBranchEnabled: false,
      disruptionEventEnabled: false,
    } satisfies MorningRoutineParams,
  },
  {
    // Easy: 5 cards, slightly longer routine, no decision or disruption
    id: 'level_2',
    labelKey: 'level.2',
    params: {
      cardCount: 5,
      decisionBranchEnabled: false,
      disruptionEventEnabled: false,
    } satisfies MorningRoutineParams,
  },
  {
    // Medium: 6 cards, decision branch introduced
    id: 'level_3',
    labelKey: 'level.3',
    params: {
      cardCount: 6,
      decisionBranchEnabled: true,
      disruptionEventEnabled: false,
    } satisfies MorningRoutineParams,
  },
  {
    // Medium-hard: 6 cards, decision branch, longer context
    id: 'level_4',
    labelKey: 'level.4',
    params: {
      cardCount: 6,
      decisionBranchEnabled: true,
      disruptionEventEnabled: false,
    } satisfies MorningRoutineParams,
  },
  {
    // Hard: 8 cards, decision branch + disruption event
    id: 'level_5',
    labelKey: 'level.5',
    params: {
      cardCount: 8,
      decisionBranchEnabled: true,
      disruptionEventEnabled: true,
    } satisfies MorningRoutineParams,
  },
];
