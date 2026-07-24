import type { SceneDef } from './types';
import { park } from './park';

export const SCENES: SceneDef[] = [park];

export function getScene(id: string): SceneDef {
  const s = SCENES.find((sc) => sc.id === id);
  if (!s) throw new Error(`Unknown scene: ${id}`);
  return s;
}
export * from './types';
