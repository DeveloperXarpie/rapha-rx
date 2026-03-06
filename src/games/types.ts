export interface LevelConfig {
  id: 'easy' | 'medium' | 'hard';
  labelKey: string;
  params: Record<string, unknown>;
}

export interface LevelResult {
  levelId: string;
  durationSeconds: number;
  completed: boolean;
  metrics: Record<string, unknown>;
}
