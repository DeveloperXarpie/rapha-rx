export interface LevelConfig {
  id: 'level_1' | 'level_2' | 'level_3' | 'level_4' | 'level_5';
  labelKey: string;
  params: Record<string, unknown>;
}

export interface LevelResult {
  levelId: string;
  durationSeconds: number;
  completed: boolean;
  metrics: Record<string, unknown>;
}

/**
 * One stay in a game: from its board to leaving it. GameRouter mints the id on mount
 * and counts rounds, because the game and GameShell remount every round. Optional, so
 * games that do not care ignore it.
 */
export interface GameVisit {
  id: string;
  /** 0 for the visit's first round. */
  round: number;
}
