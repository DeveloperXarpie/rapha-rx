import { describe, it, expect } from 'vitest';
import { SPRITES, getSprite } from '../../../games/memory/PicturePostcard/sprites';

const REQUIRED = [
  'bench','bicycle','dog','cat','kite','lamp','fountain','tree','flowerpot','teapot',
  'cup','basket','umbrella','boat','bucket','wateringcan','broom','pot','stool','flag',
  'drum','garland','radio','bird',
];

describe('sprite registry', () => {
  it('contains every required sprite with capability flags', () => {
    for (const id of REQUIRED) {
      const s = SPRITES[id];
      expect(s, `missing sprite ${id}`).toBeDefined();
      expect(typeof s.mirrorable).toBe('boolean');
      expect(typeof s.Component).toBe('function');
      expect(s.label.length).toBeGreaterThan(0);
    }
  });
  it('getSprite throws on unknown ids', () => {
    expect(() => getSprite('nonexistent')).toThrow();
  });
  it('mirrorable flags: bicycle yes, fountain no', () => {
    expect(getSprite('bicycle').mirrorable).toBe(true);
    expect(getSprite('fountain').mirrorable).toBe(false);
  });
});
