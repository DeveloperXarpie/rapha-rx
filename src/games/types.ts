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
