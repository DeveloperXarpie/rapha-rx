import type { SceneDef } from './types';
import { park } from './park';
import { marketIndian } from './marketIndian';
import { templeStreet } from './templeStreet';
import { teaStall } from './teaStall';
import { seaside } from './seaside';
import { kitchen } from './kitchen';
import { garden } from './garden';
import { cafe } from './cafe';
import { postOffice } from './postOffice';

export const SCENES: SceneDef[] = [park, marketIndian, templeStreet, teaStall, seaside, kitchen, garden, cafe, postOffice];

export function getScene(id: string): SceneDef {
  const s = SCENES.find((sc) => sc.id === id);
  if (!s) throw new Error(`Unknown scene: ${id}`);
  return s;
}
export * from './types';
